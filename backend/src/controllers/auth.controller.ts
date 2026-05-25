import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../lib/prisma";
import { jwtExpiresIn, jwtSecret, loginPolicy } from "../config/security";
import { AuthRequest } from "../middlewares/auth";
import { registrarLog } from "../services/auditoria.service";

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

    limparTentativas(emailLogin, req.ip);

    const token = jwt.sign(
      {
        id: usuario.id,
      },
      jwtSecret(),
      {
        expiresIn: jwtExpiresIn() as jwt.SignOptions["expiresIn"],
      }
    );

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
        }),
      },
    });

    return res.json({
      token,
      usuario: {
        id: usuario.id,
        nome: usuario.nome,
        apelido: usuario.apelido,
        fotoPerfil: usuario.fotoPerfil,
        email: usuario.email,
        perfilAcesso: usuario.perfilAcesso,
        unidade: usuario.unidade,
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
        unidade: true,
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
      usuario: atualizado,
    });
  } catch (error) {
    return res.status(500).json({ error: "Erro ao alterar senha" });
  }
}

export async function logout(req: AuthRequest, res: Response) {
  await registrarLog({
    req,
    acao: "Logout do sistema",
    tipoRegistro: "Auth",
    registroId: req.usuarioId,
  });

  return res.status(204).send();
}
