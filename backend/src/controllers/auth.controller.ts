import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { prisma } from "../lib/prisma";
import { jwtExpiresIn, jwtSecret, loginPolicy, sessionPolicy } from "../config/security";
import { AuthRequest } from "../middlewares/auth";
import { registrarLog } from "../services/auditoria.service";
import { normalizarUnidadesPermitidas, serializarUnidadesPermitidas } from "../config/unidades";
import { hashIdentificadorDispositivo } from "../utils/arquivoHash";

type TentativaLogin = {
  quantidade: number;
  bloqueadoAte?: number;
};

const tentativasLogin = new Map<string, TentativaLogin>();

function chaveLogin(email: string, ip?: string) {
  return `${email.toLowerCase().trim()}::${ip || "sem-ip"}`;
}

function registrarFalhaLogin(email: string, ip?: string) {
  const chave = chaveLogin(email, ip);
  const tentativa = tentativasLogin.get(chave) || { quantidade: 0 };
  const quantidade = tentativa.quantidade + 1;
  const bloqueadoAte =
    quantidade >= loginPolicy.maxAttempts
      ? Date.now() + loginPolicy.lockMinutes * 60 * 1000
      : tentativa.bloqueadoAte;

  tentativasLogin.set(chave, {
    quantidade,
    bloqueadoAte,
  });
}

function obterBloqueio(email: string, ip?: string) {
  const tentativa = tentativasLogin.get(chaveLogin(email, ip));

  if (!tentativa?.bloqueadoAte) return null;

  if (tentativa.bloqueadoAte <= Date.now()) {
    tentativasLogin.delete(chaveLogin(email, ip));
    return null;
  }

  return tentativa.bloqueadoAte;
}

function limparTentativas(email: string, ip?: string) {
  tentativasLogin.delete(chaveLogin(email, ip));
}

function perfilExigeDispositivo(perfil?: string) {
  return perfil === "OPERADOR" || perfil === "ANALISTA";
}

function sistemaDoUserAgent(userAgent: string) {
  return userAgent.includes("Windows")
    ? "Windows"
    : userAgent.includes("Mac")
      ? "macOS"
      : userAgent.includes("Linux")
        ? "Linux"
        : userAgent.includes("Android")
          ? "Android"
          : userAgent.includes("iPhone")
            ? "iOS"
            : "Nao identificado";
}

function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function cookieSeguro(req: Request) {
  return req.secure || req.headers["x-forwarded-proto"] === "https" || process.env.NODE_ENV === "production";
}

function cookieOptions(req: Request, maxAge: number) {
  return {
    httpOnly: true,
    secure: cookieSeguro(req),
    sameSite: "lax" as const,
    path: "/",
    maxAge,
  };
}

function lerCookie(req: Request, nome: string) {
  const cookies = String(req.headers.cookie || "");
  return cookies
    .split(";")
    .map((item) => item.trim())
    .find((item) => item.startsWith(`${nome}=`))
    ?.slice(nome.length + 1);
}

function criarAccessToken(usuarioId: number, sessaoId: string) {
  return jwt.sign(
    { id: usuarioId, sessaoId },
    jwtSecret(),
    { expiresIn: jwtExpiresIn() as jwt.SignOptions["expiresIn"] }
  );
}

function criarRefreshToken() {
  return crypto.randomBytes(48).toString("hex");
}

function refreshExpiraEm() {
  return new Date(Date.now() + sessionPolicy.refreshDays * 24 * 60 * 60 * 1000);
}

function aplicarCookiesSessao(req: Request, res: Response, accessToken: string, refreshToken: string) {
  res.cookie("jetguard_access", accessToken, cookieOptions(req, 15 * 60 * 1000));
  res.cookie("jetguard_refresh", refreshToken, cookieOptions(req, sessionPolicy.refreshDays * 24 * 60 * 60 * 1000));
}

function limparCookiesSessao(req: Request, res: Response) {
  res.clearCookie("jetguard_access", cookieOptions(req, 0));
  res.clearCookie("jetguard_refresh", cookieOptions(req, 0));
}

function perfilSessaoUnica(perfil?: string) {
  return perfil === "SUPER_ADMIN" || perfil === "ADMINISTRADOR";
}

async function encerrarSessoesAdministrativasAnteriores(usuario: { id: number; perfilAcesso: string }) {
  if (!perfilSessaoUnica(usuario.perfilAcesso)) return;

  await prisma.sessaoUsuario.updateMany({
    where: {
      usuarioId: usuario.id,
      status: "ATIVA",
    },
    data: {
      status: "DESCONECTADA",
      encerradaEm: new Date(),
      encerradaPor: "Sistema",
      encerradaPorId: usuario.id,
      motivoEncerramento: "Sessão encerrada automaticamente por novo login administrativo.",
    },
  });
}

async function validarDispositivoAutorizado(req: Request, usuario: { id: number; perfilAcesso: string }) {
  if (!perfilExigeDispositivo(usuario.perfilAcesso)) return null;

  try {
    const deviceId = String(req.body.deviceId || req.headers["x-device-id"] || "").trim();
    const userAgent = String(req.headers["user-agent"] || "");
    const sistema = userAgent.includes("Windows")
      ? "Windows"
      : userAgent.includes("Mac")
        ? "macOS"
        : userAgent.includes("Linux")
          ? "Linux"
          : userAgent.includes("Android")
            ? "Android"
            : userAgent.includes("iPhone")
              ? "iOS"
              : "Não identificado";

    const dispositivos = await prisma.dispositivoAutorizado.findMany({
      where: {
        usuarioId: usuario.id,
        status: "Autorizado",
      },
    });

    if (!deviceId && dispositivos.length > 0) {
      return "Dispositivo não identificado. Solicite reset de acesso ao administrador.";
    }

    const identificador = hashIdentificadorDispositivo(
      deviceId || `${usuario.id}:${userAgent}:${req.ip || "sem-ip"}`
    );

    if (dispositivos.length === 0) {
      await prisma.dispositivoAutorizado.create({
        data: {
          usuarioId: usuario.id,
          identificador,
          navegador: userAgent.slice(0, 250),
          sistema,
          ipCadastro: req.ip,
          ipUltimoAcesso: req.ip,
          ultimoAcesso: new Date(),
        },
      });
      return null;
    }

    const dispositivo = dispositivos.find((item) => item.identificador === identificador);
    if (!dispositivo) {
      return "Dispositivo não autorizado. Solicite reset de acesso ao administrador.";
    }

    await prisma.dispositivoAutorizado.update({
      where: { id: dispositivo.id },
      data: {
        ipUltimoAcesso: req.ip,
        ultimoAcesso: new Date(),
        navegador: userAgent.slice(0, 250),
        sistema,
      },
    });

    return null;
  } catch (error) {
    console.error("Erro ao validar dispositivo autorizado:", error);
    return null;
  }
}
async function registrarFalhaAuditoria(req: Request, email: string, motivo: string) {
  try {
    await prisma.logAuditoria.create({
      data: {
        usuarioNome: email || "Tentativa sem e-mail",
        ip: req.ip,
        acao: `Tentativa de login recusada: ${motivo}`,
        tipoRegistro: "Auth",
        dadosNovos: JSON.stringify({
          email,
          motivo,
          dataHora: new Date().toISOString(),
        }),
      },
    });
  } catch (error) {
    console.error("Erro ao registrar falha de login:", error);
  }
}

export async function register(req: Request, res: Response) {
  try {
    const { nome, email, senha } = req.body;

    const usuarioExiste = await prisma.usuario.findUnique({
      where: {
        email,
      },
    });

    if (usuarioExiste) {
      return res.status(400).json({
        error: "Usuário já existe",
      });
    }

    const senhaHash = await bcrypt.hash(senha, 10);

    const usuario = await prisma.usuario.create({
      data: {
        nome,
        email,
        senha: senhaHash,
        unidade: "GJA-T1",
        unidadesPermitidas: serializarUnidadesPermitidas(["GJA-T1"], "GJA-T1"),
      },
    });

    await prisma.logAuditoria.create({
      data: {
        usuarioId: usuario.id,
        usuarioNome: usuario.nome,
        ip: req.ip,
        acao: "Criação de usuário",
        tipoRegistro: "Usuario",
        registroId: usuario.id,
        dadosNovos: JSON.stringify({
          id: usuario.id,
          nome: usuario.nome,
          email: usuario.email,
        }),
      },
    });

    return res.json(usuario);

  } catch (error) {
    return res.status(500).json({
      error: "Erro ao cadastrar usuário",
    });
  }
}

export async function login(req: Request, res: Response) {
  try {
    const { email, senha } = req.body;
    const emailLogin = String(email || "");
    const bloqueadoAte = obterBloqueio(emailLogin, req.ip);

    if (bloqueadoAte) {
      const minutos = Math.ceil((bloqueadoAte - Date.now()) / 60000);
      await registrarFalhaAuditoria(req, emailLogin, "excesso de tentativas");
      return res.status(429).json({
        error: `Muitas tentativas de login. Tente novamente em ${minutos} minuto(s).`,
      });
    }

    const usuario = await prisma.usuario.findUnique({
      where: {
        email: emailLogin,
      },
    });

    if (!usuario) {
      registrarFalhaLogin(emailLogin, req.ip);
      await registrarFalhaAuditoria(req, emailLogin, "usuário não encontrado");
      return res.status(400).json({
        error: "Usuário não encontrado",
      });
    }

    if (usuario.statusUsuario !== "ATIVO") {
      await registrarFalhaAuditoria(req, emailLogin, "usuário bloqueado ou inativo");
      return res.status(403).json({
        error: "Usuário bloqueado ou inativo",
      });
    }

    const senhaCorreta = await bcrypt.compare(
      senha,
      usuario.senha
    );

    if (!senhaCorreta) {
      registrarFalhaLogin(emailLogin, req.ip);
      await registrarFalhaAuditoria(req, emailLogin, "senha inválida");
      return res.status(400).json({
        error: "Senha inválida",
      });
    }

    const erroDispositivo = await validarDispositivoAutorizado(req, usuario);
    if (erroDispositivo) {
      await registrarFalhaAuditoria(req, emailLogin, erroDispositivo);
      return res.status(403).json({
        error: erroDispositivo,
        code: "DISPOSITIVO_NAO_AUTORIZADO",
      });
    }

    limparTentativas(emailLogin, req.ip);

    const userAgent = String(req.headers["user-agent"] || "");
    const unidadeAtiva = normalizarUnidadesPermitidas(usuario.unidadesPermitidas, usuario.unidade)[0] || usuario.unidade || "GJA-T1";
    await encerrarSessoesAdministrativasAnteriores(usuario);

    const sessao = await prisma.sessaoUsuario.create({
      data: {
        usuarioId: usuario.id,
        unidadeAtiva,
        equipe: usuario.equipe,
        perfilAcesso: usuario.perfilAcesso,
        ipInicio: req.ip,
        ipUltimaAtividade: req.ip,
        navegador: userAgent.slice(0, 250),
        sistema: sistemaDoUserAgent(userAgent),
      },
    });

    const token = criarAccessToken(usuario.id, sessao.id);
    const refreshToken = criarRefreshToken();

    await prisma.sessaoUsuario.update({
      where: { id: sessao.id },
      data: {
        tokenHash: hashToken(token),
        refreshTokenHash: hashToken(refreshToken),
        refreshExpiraEm: refreshExpiraEm(),
      },
    });

    aplicarCookiesSessao(req, res, token, refreshToken);

    const agora = new Date();
    await prisma.usuario.update({
      where: {
        id: usuario.id,
      },
      data: {
        ultimoAcesso: agora,
      },
    });

    await prisma.logAuditoria.create({
      data: {
        usuarioId: usuario.id,
        usuarioNome: usuario.nome,
        ip: req.ip,
        acao: "Acesso ao sistema",
        tipoRegistro: "Auth",
        registroId: usuario.id,
        dadosNovos: JSON.stringify({
          email: usuario.email,
          acessoEm: agora.toISOString(),
          expiraEm: jwtExpiresIn(),
          sessaoId: sessao.id,
        }),
      },
    });

    return res.json({
      usuario: {
        id: usuario.id,
        nome: usuario.nome,
        apelido: usuario.apelido,
        fotoPerfil: usuario.fotoPerfil,
        email: usuario.email,
        perfilAcesso: usuario.perfilAcesso,
        equipe: usuario.equipe,
        unidade: usuario.unidade,
        unidadesPermitidas: normalizarUnidadesPermitidas(usuario.unidadesPermitidas, usuario.unidade),
        deveAlterarSenha: usuario.deveAlterarSenha,
      },
    });

  } catch (error) {
    return res.status(500).json({
      error: "Erro ao fazer login",
    });
  }
}

export async function alterarSenhaObrigatoria(req: AuthRequest, res: Response) {
  try {
    const { senhaAtual, novaSenha, confirmarSenha } = req.body;

    if (!senhaAtual || !novaSenha || !confirmarSenha) {
      return res.status(400).json({ error: "Preencha todos os campos." });
    }

    if (novaSenha !== confirmarSenha) {
      return res.status(400).json({ error: "As senhas não coincidem." });
    }

    if (String(novaSenha).length < 8) {
      return res.status(400).json({ error: "A nova senha deve possuir pelo menos 8 caracteres." });
    }

    const usuario = await prisma.usuario.findUnique({
      where: { id: req.usuarioId },
    });

    if (!usuario) {
      return res.status(404).json({ error: "Usuário não encontrado." });
    }

    const senhaCorreta = await bcrypt.compare(senhaAtual, usuario.senha);
    if (!senhaCorreta) {
      return res.status(400).json({ error: "Senha atual inválida." });
    }

    const mesmaSenha = await bcrypt.compare(novaSenha, usuario.senha);
    if (mesmaSenha) {
      return res.status(400).json({ error: "A nova senha deve ser diferente da senha provisória." });
    }

    const atualizado = await prisma.usuario.update({
      where: { id: usuario.id },
      data: {
        senha: await bcrypt.hash(novaSenha, 10),
        deveAlterarSenha: false,
        senhaAlteradaEm: new Date(),
      },
      select: {
        id: true,
        nome: true,
        apelido: true,
        fotoPerfil: true,
        email: true,
        perfilAcesso: true,
        equipe: true,
        unidade: true,
        unidadesPermitidas: true,
        deveAlterarSenha: true,
      },
    });

    await registrarLog({
      req,
      acao: "Alteração de senha no primeiro acesso",
      tipoRegistro: "Usuario",
      registroId: usuario.id,
      dadosNovos: {
        id: usuario.id,
        email: usuario.email,
        senhaAlteradaEm: atualizado.deveAlterarSenha ? null : new Date().toISOString(),
      },
    });

    return res.json({
      mensagem: "Senha alterada com sucesso.",
      usuario: {
        ...atualizado,
        unidadesPermitidas: normalizarUnidadesPermitidas(atualizado.unidadesPermitidas, atualizado.unidade),
      },
    });
  } catch (error) {
    return res.status(500).json({ error: "Erro ao alterar senha" });
  }
}

export async function desbloquearSessao(req: AuthRequest, res: Response) {
  try {
    const { senha } = req.body;

    if (!senha) {
      return res.status(400).json({ error: "Informe sua senha para desbloquear o sistema." });
    }

    const usuario = await prisma.usuario.findUnique({
      where: { id: req.usuarioId },
    });

    if (!usuario) {
      return res.status(404).json({ error: "Usuario nao encontrado." });
    }

    const senhaCorreta = await bcrypt.compare(senha, usuario.senha);
    if (!senhaCorreta) {
      return res.status(400).json({ error: "Senha invalida." });
    }

    await registrarLog({
      req,
      acao: "Desbloqueio seguro da sessao",
      tipoRegistro: "Auth",
      registroId: usuario.id,
      dadosNovos: {
        usuario: usuario.nome,
        desbloqueadoEm: new Date().toISOString(),
      },
    });

    return res.json({ mensagem: "Sessao desbloqueada com sucesso." });
  } catch (error) {
    return res.status(500).json({ error: "Erro ao desbloquear sessao" });
  }
}

export async function renovarSessao(req: Request, res: Response) {
  try {
    const refreshToken = lerCookie(req, "jetguard_refresh");
    if (!refreshToken) {
      return res.status(401).json({ error: "Refresh token não informado" });
    }

    const sessao = await prisma.sessaoUsuario.findFirst({
      where: {
        refreshTokenHash: hashToken(refreshToken),
        status: "ATIVA",
        refreshExpiraEm: { gt: new Date() },
      },
      include: {
        usuario: {
          select: {
            id: true,
            nome: true,
            apelido: true,
            fotoPerfil: true,
            email: true,
            perfilAcesso: true,
            equipe: true,
            unidade: true,
            unidadesPermitidas: true,
            statusUsuario: true,
            deveAlterarSenha: true,
          },
        },
      },
    });

    if (!sessao || sessao.usuario.statusUsuario !== "ATIVO") {
      limparCookiesSessao(req, res);
      return res.status(401).json({ error: "Sessão expirada" });
    }

    const novoAccessToken = criarAccessToken(sessao.usuarioId, sessao.id);
    const novoRefreshToken = criarRefreshToken();

    await prisma.sessaoUsuario.update({
      where: { id: sessao.id },
      data: {
        tokenHash: hashToken(novoAccessToken),
        refreshTokenHash: hashToken(novoRefreshToken),
        refreshExpiraEm: refreshExpiraEm(),
        ultimaAtividadeEm: new Date(),
        ipUltimaAtividade: req.ip,
      },
    });

    aplicarCookiesSessao(req, res, novoAccessToken, novoRefreshToken);

    return res.json({
      usuario: {
        id: sessao.usuario.id,
        nome: sessao.usuario.nome,
        apelido: sessao.usuario.apelido,
        fotoPerfil: sessao.usuario.fotoPerfil,
        email: sessao.usuario.email,
        perfilAcesso: sessao.usuario.perfilAcesso,
        equipe: sessao.usuario.equipe,
        unidade: sessao.usuario.unidade,
        unidadesPermitidas: normalizarUnidadesPermitidas(sessao.usuario.unidadesPermitidas, sessao.usuario.unidade),
        deveAlterarSenha: sessao.usuario.deveAlterarSenha,
      },
    });
  } catch (error) {
    return res.status(401).json({ error: "Erro ao renovar sessão" });
  }
}

export async function logout(req: AuthRequest, res: Response) {
  if (req.sessaoId) {
    await prisma.sessaoUsuario.updateMany({
      where: {
        id: req.sessaoId,
        status: "ATIVA",
      },
      data: {
        status: "ENCERRADA",
        tokenHash: null,
        refreshTokenHash: null,
        refreshExpiraEm: null,
        encerradaEm: new Date(),
        encerradaPor: "Usuario",
        encerradaPorId: req.usuarioId,
        motivoEncerramento: "Logout do usuario",
      },
    });
  }

  await registrarLog({
    req,
    acao: "Logout do sistema",
    tipoRegistro: "Auth",
    registroId: req.usuarioId,
  });

  limparCookiesSessao(req, res);
  return res.status(204).send();
}

