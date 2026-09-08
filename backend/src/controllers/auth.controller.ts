import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { prisma } from "../lib/prisma";
import {
  jwtExpiresIn,
  jwtSecret,
  loginPolicy,
  sessionPolicy,
} from "../config/security";
import { AuthRequest } from "../middlewares/auth";
import { registrarLog } from "../services/auditoria.service";
import {
  normalizarUnidadesPermitidas,
  serializarUnidadesPermitidas,
} from "../config/unidades";
import { hashIdentificadorDispositivo } from "../utils/arquivoHash";
import {
  aplicarCookieCsrf,
  cookieSeguro,
  lerCookie,
  limparCookieCsrf,
} from "../utils/csrf";
import {
  gerarHashPin,
  validarFormatoPin,
  validarPinOperacional,
} from "../services/pinOperacional.service";

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

function cookieOptions(req: Request, maxAge: number) {
  return {
    httpOnly: true,
    secure: cookieSeguro(req),
    sameSite: "lax" as const,
    path: "/",
    maxAge,
  };
}

function cookieSsoOptions(req: Request, maxAge: number) {
  return {
    ...cookieOptions(req, maxAge),
    path: "/api/auth/sso",
  };
}

function criarAccessToken(usuarioId: number, sessaoId: string) {
  return jwt.sign({ id: usuarioId, sessaoId }, jwtSecret(), {
    expiresIn: jwtExpiresIn() as jwt.SignOptions["expiresIn"],
  });
}

function criarRefreshToken() {
  return crypto.randomBytes(48).toString("hex");
}

function refreshExpiraEm() {
  return new Date(Date.now() + sessionPolicy.refreshDays * 24 * 60 * 60 * 1000);
}

function aplicarCookiesSessao(
  req: Request,
  res: Response,
  accessToken: string,
  refreshToken: string,
) {
  res.cookie(
    "jetguard_access",
    accessToken,
    cookieOptions(req, 15 * 60 * 1000),
  );
  res.cookie(
    "jetguard_refresh",
    refreshToken,
    cookieOptions(req, sessionPolicy.refreshDays * 24 * 60 * 60 * 1000),
  );
  aplicarCookieCsrf(req, res);
}

function limparCookiesSessao(req: Request, res: Response) {
  res.clearCookie("jetguard_access", cookieOptions(req, 0));
  res.clearCookie("jetguard_refresh", cookieOptions(req, 0));
  limparCookieCsrf(req, res);
}

function perfilSessaoUnica(perfil?: string) {
  return perfil === "SUPER_ADMIN" || perfil === "ADMINISTRADOR";
}

const TODOS_MODULOS_ACESSO = [
  "dashboard",
  "relatorios",
  "documentos",
  "treinamentos",
  "treinamentos_criador",
  "treinamentos_criados",
  "treinamentos_visitantes",
  "operacao",
  "cftv",
  "quadra_seguranca",
  "analise_riscos",
  "plano_acao",
  "cadastros",
  "usuarios",
  "configuracoes",
  "sistema",
  "logs",
];

const ACOES_ACESSO = ["leitura", "criar", "editar", "excluir"];

type PermissaoModulo = {
  modulo: string;
  leitura: boolean;
  criar: boolean;
  editar: boolean;
  excluir: boolean;
};

function permissoesCompletas(modulos: string[]) {
  return Array.from(new Set(modulos))
    .filter((modulo) => TODOS_MODULOS_ACESSO.includes(modulo))
    .map((modulo) => ({
      modulo,
      leitura: true,
      criar: true,
      editar: true,
      excluir: true,
    }));
}

function normalizarPermissoesPerfil(valor: unknown): PermissaoModulo[] {
  const normalizarLista = (lista: unknown[]) => {
    if (lista.every((item) => typeof item === "string")) {
      return permissoesCompletas(lista.map((item) => String(item)));
    }

    return lista
      .map((item: any) => {
        const modulo = String(item?.modulo || item?.chave || "").trim();
        if (!TODOS_MODULOS_ACESSO.includes(modulo)) return null;
        const permissoes = {
          modulo,
          leitura: Boolean(item.leitura),
          criar: Boolean(item.criar),
          editar: Boolean(item.editar),
          excluir: Boolean(item.excluir),
        };
        if (permissoes.criar || permissoes.editar || permissoes.excluir) {
          permissoes.leitura = true;
        }
        return ACOES_ACESSO.some((acao) =>
          Boolean(permissoes[acao as keyof PermissaoModulo]),
        )
          ? permissoes
          : null;
      })
      .filter(Boolean) as PermissaoModulo[];
  };

  if (Array.isArray(valor)) {
    return normalizarLista(valor);
  }
  if (typeof valor === "string") {
    try {
      const parsed = JSON.parse(valor);
      return Array.isArray(parsed) ? normalizarLista(parsed) : [];
    } catch {
      return [];
    }
  }
  return [];
}

async function permissoesPerfil(codigo: string) {
  if (codigo === "SUPER_ADMIN") return permissoesCompletas(TODOS_MODULOS_ACESSO);
  const perfil = await prisma.perfilAcesso.findUnique({
    where: { codigo },
    select: { permissoesJson: true, status: true },
  });
  if (!perfil || perfil.status !== "ATIVO") return [];
  return normalizarPermissoesPerfil(perfil.permissoesJson);
}

async function encerrarSessoesAdministrativasAnteriores(usuario: {
  id: number;
  perfilAcesso: string;
}) {
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
      motivoEncerramento:
        "Sessão encerrada automaticamente por novo login administrativo.",
    },
  });
}

async function validarDispositivoAutorizado(
  req: Request,
  usuario: { id: number; perfilAcesso: string },
) {
  if (!perfilExigeDispositivo(usuario.perfilAcesso)) return null;

  try {
    const deviceId = String(
      req.body.deviceId || req.headers["x-device-id"] || "",
    ).trim();
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
      deviceId || `${usuario.id}:${userAgent}:${req.ip || "sem-ip"}`,
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

    const dispositivo = dispositivos.find(
      (item) => item.identificador === identificador,
    );
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

type UsuarioAutenticado = {
  id: number;
  nome: string;
  apelido: string | null;
  fotoPerfil: string | null;
  email: string;
  perfilAcesso: string;
  equipe: string | null;
  unidade: string | null;
  unidadesPermitidas: string | null;
  deveAlterarSenha: boolean;
  pinOperacionalHash: string | null;
};

async function criarSessaoAutenticada(
  req: Request,
  res: Response,
  usuario: UsuarioAutenticado,
  origem: "senha" | "sso",
) {
  const userAgent = String(req.headers["user-agent"] || "");
  const unidadeAtiva =
    normalizarUnidadesPermitidas(usuario.unidadesPermitidas, usuario.unidade)[0] ||
    usuario.unidade ||
    "GJA-T1";

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
  const permissoesAcoes = await permissoesPerfil(usuario.perfilAcesso);
  const permissoesModulos = permissoesAcoes.map((permissao) => permissao.modulo);

  const agora = new Date();
  await prisma.usuario.update({
    where: { id: usuario.id },
    data: { ultimoAcesso: agora },
  });

  await prisma.logAuditoria.create({
    data: {
      usuarioId: usuario.id,
      usuarioNome: usuario.nome,
      ip: req.ip,
      acao: origem === "sso" ? "Acesso corporativo SSO" : "Acesso ao sistema",
      tipoRegistro: "Auth",
      registroId: usuario.id,
      dadosNovos: JSON.stringify({
        email: usuario.email,
        origem,
        acessoEm: agora.toISOString(),
        expiraEm: jwtExpiresIn(),
        sessaoId: sessao.id,
      }),
    },
  });

  return {
    id: usuario.id,
    nome: usuario.nome,
    apelido: usuario.apelido,
    fotoPerfil: usuario.fotoPerfil,
    email: usuario.email,
    perfilAcesso: usuario.perfilAcesso,
    permissoesModulos,
    permissoesAcoes,
    equipe: usuario.equipe,
    unidade: usuario.unidade,
    unidadesPermitidas: normalizarUnidadesPermitidas(
      usuario.unidadesPermitidas,
      usuario.unidade,
    ),
    deveAlterarSenha: usuario.deveAlterarSenha,
    possuiPinOperacional: Boolean(usuario.pinOperacionalHash),
  };
}

async function obterConfiguracaoSso() {
  return prisma.configuracaoSistema.findUnique({ where: { chave: "global" } });
}

function ssoConfigurado(config: Awaited<ReturnType<typeof obterConfiguracaoSso>>) {
  if (!config?.ssoAtivo) return false;
  return Boolean(config.ssoClientId && config.ssoCallbackUrl);
}

function montarUrlAutorizacaoSso(
  config: NonNullable<Awaited<ReturnType<typeof obterConfiguracaoSso>>>,
  state: string,
  nonce: string,
) {
  const tenant = config.ssoTenantId || "common";
  const authorizationUrl =
    config.ssoAuthorizationUrl ||
    `https://login.microsoftonline.com/${encodeURIComponent(tenant)}/oauth2/v2.0/authorize`;
  const url = new URL(authorizationUrl);
  url.searchParams.set("client_id", String(config.ssoClientId));
  url.searchParams.set("response_type", "code");
  url.searchParams.set("redirect_uri", String(config.ssoCallbackUrl));
  url.searchParams.set("response_mode", "query");
  url.searchParams.set("scope", "openid profile email");
  url.searchParams.set("state", state);
  url.searchParams.set("nonce", nonce);
  return url.toString();
}

function montarUrlTokenSso(
  config: NonNullable<Awaited<ReturnType<typeof obterConfiguracaoSso>>>,
) {
  const tenant = config.ssoTenantId || "common";
  return (
    config.ssoTokenUrl ||
    `https://login.microsoftonline.com/${encodeURIComponent(tenant)}/oauth2/v2.0/token`
  );
}

function decodificarJwtSemValidar(token?: string) {
  if (!token) return {};
  try {
    const [, payload] = token.split(".");
    if (!payload) return {};
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(Buffer.from(base64, "base64").toString("utf8"));
  } catch {
    return {};
  }
}

function normalizarEmailSso(claims: Record<string, any>) {
  return String(
    claims.preferred_username ||
      claims.email ||
      claims.upn ||
      claims.unique_name ||
      "",
  )
    .trim()
    .toLowerCase();
}

function textoSso(valor: unknown) {
  return String(valor || "").trim();
}

function nomeUsuarioSso(claims: Record<string, any>, email: string) {
  const nomeCompleto = textoSso(claims.name);
  if (nomeCompleto) return nomeCompleto;

  const nomes = [claims.given_name, claims.family_name]
    .map(textoSso)
    .filter(Boolean)
    .join(" ");
  if (nomes) return nomes;

  return email.split("@")[0] || "Usuario corporativo";
}

async function criarPreCadastroSso(
  req: Request,
  email: string,
  claims: Record<string, any>,
) {
  const senhaTemporariaHash = await bcrypt.hash(
    crypto.randomBytes(32).toString("hex"),
    10,
  );
  const nome = nomeUsuarioSso(claims, email);

  const usuario = await prisma.usuario.create({
    data: {
      nome,
      email,
      senha: senhaTemporariaHash,
      perfilAcesso: "",
      statusUsuario: "INATIVO",
      somenteCadastro: true,
      deveAlterarSenha: false,
      cargo: textoSso(claims.jobTitle || claims.title) || null,
      setor: textoSso(claims.department) || null,
      empresa: "Movecta S/A",
      gruposTreinamentoJson: "[]",
    },
  });

  await prisma.logAuditoria.create({
    data: {
      usuarioId: usuario.id,
      usuarioNome: usuario.nome,
      ip: req.ip,
      acao: "Pré-cadastro criado via SSO",
      tipoRegistro: "Usuario",
      registroId: usuario.id,
      dadosNovos: JSON.stringify({
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        origem: "sso",
        statusUsuario: usuario.statusUsuario,
        somenteCadastro: usuario.somenteCadastro,
      }),
    },
  });

  return usuario;
}

function urlFrontendSso(
  req: Request,
  config?: Awaited<ReturnType<typeof obterConfiguracaoSso>>,
) {
  return (
    config?.ssoFrontendUrl ||
    process.env.FRONTEND_URL ||
    `${req.protocol}://${req.get("host")}`
  ).replace(/\/+$/, "");
}

function redirecionarLoginSso(
  req: Request,
  res: Response,
  config: Awaited<ReturnType<typeof obterConfiguracaoSso>>,
  motivo: string,
) {
  const url = new URL("/login", urlFrontendSso(req, config));
  url.searchParams.set("sso", "erro");
  url.searchParams.set("motivo", motivo);
  return res.redirect(url.toString());
}

async function registrarFalhaAuditoria(
  req: Request,
  email: string,
  motivo: string,
) {
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
      await registrarFalhaAuditoria(
        req,
        emailLogin,
        "usuário bloqueado ou inativo",
      );
      return res.status(403).json({
        error: "Usuário bloqueado ou inativo",
      });
    }

    const senhaCorreta = await bcrypt.compare(senha, usuario.senha);

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

    const usuarioSessao = await criarSessaoAutenticada(req, res, usuario, "senha");

    return res.json({
      usuario: usuarioSessao,
    });
  } catch (error) {
    console.error("Erro ao fazer login:", error);
    return res.status(500).json({
      error: "Erro ao fazer login",
    });
  }
}

export async function configuracaoSsoPublica(_req: Request, res: Response) {
  try {
    const config = await obterConfiguracaoSso();
    return res.json({
      ativo: ssoConfigurado(config),
      nomeBotao: config?.ssoNomeBotao || "Entrar com conta corporativa",
      loginLocalEmergencia: config?.ssoLoginLocalEmergencia !== false,
    });
  } catch (error) {
    console.error("Erro ao buscar configuracao publica de SSO:", error);
    return res.status(500).json({ error: "Erro ao buscar configuracao de SSO" });
  }
}

export async function iniciarSso(req: Request, res: Response) {
  try {
    const config = await obterConfiguracaoSso();
    if (!config || !ssoConfigurado(config)) {
      return res.status(400).json({ error: "SSO não configurado." });
    }

    const state = crypto.randomBytes(24).toString("hex");
    const nonce = crypto.randomBytes(24).toString("hex");
    const maxAge = 10 * 60 * 1000;

    res.cookie("movesecurity_sso_state", state, cookieSsoOptions(req, maxAge));
    res.cookie("movesecurity_sso_nonce", nonce, cookieSsoOptions(req, maxAge));

    return res.redirect(montarUrlAutorizacaoSso(config, state, nonce));
  } catch (error) {
    console.error("Erro ao iniciar SSO:", error);
    return res.status(500).json({ error: "Erro ao iniciar login corporativo" });
  }
}

export async function callbackSso(req: Request, res: Response) {
  const config = await obterConfiguracaoSso();
  try {
    if (!config || !ssoConfigurado(config)) {
      return redirecionarLoginSso(req, res, config, "SSO não configurado.");
    }

    const code = String(req.query.code || "");
    const state = String(req.query.state || "");
    const stateCookie = lerCookie(req, "movesecurity_sso_state");
    const nonceCookie = lerCookie(req, "movesecurity_sso_nonce");

    res.clearCookie("movesecurity_sso_state", cookieSsoOptions(req, 0));
    res.clearCookie("movesecurity_sso_nonce", cookieSsoOptions(req, 0));

    if (!code || !state || !stateCookie || state !== stateCookie) {
      return redirecionarLoginSso(req, res, config, "Retorno SSO inválido.");
    }

    if (!config.ssoClientSecret) {
      return redirecionarLoginSso(req, res, config, "Client secret não configurado.");
    }

    const params = new URLSearchParams({
      client_id: String(config.ssoClientId),
      client_secret: String(config.ssoClientSecret),
      grant_type: "authorization_code",
      code,
      redirect_uri: String(config.ssoCallbackUrl),
      scope: "openid profile email",
    });

    const tokenResponse = await fetch(montarUrlTokenSso(config), {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params,
    });

    if (!tokenResponse.ok) {
      const detalhe = await tokenResponse.text().catch(() => "");
      console.error("Erro no token SSO:", tokenResponse.status, detalhe);
      return redirecionarLoginSso(req, res, config, "Falha ao validar SSO.");
    }

    const tokenData = (await tokenResponse.json()) as Record<string, any>;
    const claims = decodificarJwtSemValidar(tokenData.id_token) as Record<string, any>;

    if (nonceCookie && claims.nonce && claims.nonce !== nonceCookie) {
      return redirecionarLoginSso(req, res, config, "Nonce SSO inválido.");
    }

    if (config.ssoUserInfoUrl && tokenData.access_token) {
      try {
        const userInfoResponse = await fetch(config.ssoUserInfoUrl, {
          headers: { Authorization: `Bearer ${tokenData.access_token}` },
        });
        if (userInfoResponse.ok) {
          Object.assign(claims, await userInfoResponse.json());
        }
      } catch (error) {
        console.error("Erro ao buscar userinfo SSO:", error);
      }
    }

    const email = normalizarEmailSso(claims);
    if (!email) {
      return redirecionarLoginSso(req, res, config, "E-mail corporativo não retornado.");
    }

    const dominio = String(config.ssoDominioPermitido || "").trim().toLowerCase();
    if (dominio && !email.endsWith(`@${dominio.replace(/^@/, "")}`)) {
      await registrarFalhaAuditoria(req, email, "domínio SSO não permitido");
      return redirecionarLoginSso(req, res, config, "Domínio não permitido.");
    }

    let usuario = await prisma.usuario.findUnique({
      where: { email },
    });

    if (!usuario) {
      usuario = await criarPreCadastroSso(req, email, claims);
      return redirecionarLoginSso(
        req,
        res,
        config,
        "Pré-cadastro criado. Aguarde a liberação do acesso.",
      );
    }

    if (usuario.statusUsuario !== "ATIVO" || usuario.somenteCadastro) {
      await registrarFalhaAuditoria(req, email, "usuário SSO sem acesso ativo");
      return redirecionarLoginSso(req, res, config, "Usuário sem acesso ativo.");
    }

    const usuarioSessao = await criarSessaoAutenticada(req, res, usuario, "sso");
    const destino = usuarioSessao.deveAlterarSenha ? "/alterar-senha" : "/";
    const usuarioJson = JSON.stringify(usuarioSessao).replace(/</g, "\\u003c");

    return res.type("html").send(`<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <title>MoveSecurity - Login corporativo</title>
  </head>
  <body>
    <script>
      localStorage.setItem("usuario", ${JSON.stringify(usuarioJson)});
      localStorage.setItem("jetguardUltimaAtividade", String(Date.now()));
      sessionStorage.setItem("loginInicio", String(Date.now()));
      window.location.replace(${JSON.stringify(urlFrontendSso(req, config) + destino)});
    </script>
  </body>
</html>`);
  } catch (error) {
    console.error("Erro no callback SSO:", error);
    return redirecionarLoginSso(req, res, config, "Erro no login corporativo.");
  }
}

export async function alterarSenhaObrigatoria(req: AuthRequest, res: Response) {
  try {
    const {
      senhaAtual,
      novaSenha,
      confirmarSenha,
      pinOperacional,
      confirmarPinOperacional,
    } = req.body;

    if (
      !senhaAtual ||
      !novaSenha ||
      !confirmarSenha ||
      !pinOperacional ||
      !confirmarPinOperacional
    ) {
      return res.status(400).json({ error: "Preencha todos os campos." });
    }

    if (novaSenha !== confirmarSenha) {
      return res.status(400).json({ error: "As senhas não coincidem." });
    }

    if (String(novaSenha).length < 8) {
      return res
        .status(400)
        .json({ error: "A nova senha deve possuir pelo menos 8 caracteres." });
    }

    if (pinOperacional !== confirmarPinOperacional) {
      return res
        .status(400)
        .json({ error: "Os PINs de segurança não coincidem." });
    }

    if (!validarFormatoPin(String(pinOperacional))) {
      return res
        .status(400)
        .json({
          error:
            "O PIN de segurança deve possuir exatamente 4 dígitos numéricos.",
        });
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
      return res
        .status(400)
        .json({
          error: "A nova senha deve ser diferente da senha provisória.",
        });
    }

    const atualizado = await prisma.usuario.update({
      where: { id: usuario.id },
      data: {
        senha: await bcrypt.hash(novaSenha, 10),
        deveAlterarSenha: false,
        senhaAlteradaEm: new Date(),
        pinOperacionalHash: await gerarHashPin(String(pinOperacional)),
        pinOperacionalCriadoEm: new Date(),
        pinOperacionalAtualizadoEm: new Date(),
        pinTentativasInvalidas: 0,
        pinBloqueadoAte: null,
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
        pinOperacionalHash: true,
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
        senhaAlteradaEm: atualizado.deveAlterarSenha
          ? null
          : new Date().toISOString(),
        pinOperacionalCriado: true,
      },
    });

    return res.json({
      mensagem: "Senha alterada com sucesso.",
      usuario: {
        ...atualizado,
        possuiPinOperacional: Boolean(atualizado.pinOperacionalHash),
        pinOperacionalHash: undefined,
        unidadesPermitidas: normalizarUnidadesPermitidas(
          atualizado.unidadesPermitidas,
          atualizado.unidade,
        ),
      },
    });
  } catch (error) {
    return res.status(500).json({ error: "Erro ao alterar senha" });
  }
}

export async function desbloquearSessao(req: AuthRequest, res: Response) {
  try {
    const { senha, pinOperacional } = req.body;

    if (!senha && !pinOperacional) {
      return res
        .status(400)
        .json({
          error: "Informe seu PIN operacional para desbloquear o sistema.",
        });
    }

    const usuario = await prisma.usuario.findUnique({
      where: { id: req.usuarioId },
    });

    if (!usuario) {
      return res.status(404).json({ error: "Usuario nao encontrado." });
    }

    if (usuario.pinOperacionalHash) {
      await validarPinOperacional(
        usuario.id,
        String(pinOperacional || senha || ""),
      );
    } else if (
      usuario.perfilAcesso === "SUPER_ADMIN" &&
      String(pinOperacional || senha || "").trim() === "1234"
    ) {
      await prisma.usuario.update({
        where: { id: usuario.id },
        data: {
          pinOperacionalHash: await gerarHashPin("1234"),
          pinOperacionalCriadoEm: new Date(),
          pinOperacionalAtualizadoEm: new Date(),
          pinTentativasInvalidas: 0,
          pinBloqueadoAte: null,
        },
      });
    } else {
      const senhaInformada = String(senha || "").trim();
      if (!senhaInformada) {
        return res.status(400).json({
          error:
            usuario.perfilAcesso === "SUPER_ADMIN"
              ? "PIN operacional ainda nao cadastrado. Use 1234 para recuperar o acesso e altere o PIN no perfil."
              : "PIN operacional ainda nao cadastrado. Acesse seu perfil e crie um PIN para desbloquear a sessao.",
        });
      }

      const senhaCorreta = await bcrypt.compare(senhaInformada, usuario.senha);
      if (!senhaCorreta) {
        return res.status(400).json({ error: "Senha invalida." });
      }
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
  } catch (error: any) {
    return res
      .status(error?.status || 500)
      .json({ error: error?.message || "Erro ao desbloquear sessao" });
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
            pinOperacionalHash: true,
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
        unidadesPermitidas: normalizarUnidadesPermitidas(
          sessao.usuario.unidadesPermitidas,
          sessao.usuario.unidade,
        ),
        deveAlterarSenha: sessao.usuario.deveAlterarSenha,
        possuiPinOperacional: Boolean(sessao.usuario.pinOperacionalHash),
      },
    });
  } catch (error) {
    return res.status(401).json({ error: "Erro ao renovar sessão" });
  }
}

export function emitirCsrf(req: Request, res: Response) {
  const csrfToken = aplicarCookieCsrf(req, res);
  return res.json({ csrfToken });
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
