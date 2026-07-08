import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { prisma } from "../lib/prisma";
import { jwtSecret } from "../config/security";
import { normalizarUnidadesPermitidas, UNIDADES_SISTEMA } from "../config/unidades";

export type AuthRequest = Request & {
  usuarioId?: number;
  usuarioPerfil?: string;
  usuarioUnidade?: string | null;
  unidadeAtiva?: string;
  unidadesPermitidas?: string[];
  sessaoId?: string;
};

type TokenPayload = {
  id: number;
  sessaoId?: string;
};

function lerCookie(req: Request, nome: string) {
  const cookies = String(req.headers.cookie || "");
  return cookies
    .split(";")
    .map((item) => item.trim())
    .find((item) => item.startsWith(`${nome}=`))
    ?.slice(nome.length + 1);
}

export async function autenticarUsuario(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers.authorization;
  const cookieToken = lerCookie(req, "jetguard_access");

  if (!authHeader && !cookieToken) {
    return res.status(401).json({
      error: "Token não informado",
    });
  }

  const token = cookieToken || authHeader?.split(" ")[1] || "";

  try {
    const payload = jwt.verify(token, jwtSecret()) as TokenPayload;
    const unidadeSolicitada = String(req.headers["x-unidade-ativa"] || "");
    let unidadeSessao: string | null | undefined = null;
    const usuario = await prisma.usuario.findUnique({
      where: {
        id: payload.id,
      },
      select: {
        id: true,
        perfilAcesso: true,
        statusUsuario: true,
        unidade: true,
        unidadesPermitidas: true,
        deveAlterarSenha: true,
      },
    });

    if (!usuario) {
      return res.status(401).json({
        error: "Usuário não encontrado",
      });
    }

    if (usuario.statusUsuario !== "ATIVO") {
      return res.status(403).json({
        error: "Usuário sem acesso ao sistema",
      });
    }

    if (payload.sessaoId) {
      const sessao = await prisma.sessaoUsuario.findUnique({
        where: { id: payload.sessaoId },
        select: {
          id: true,
          usuarioId: true,
          status: true,
          unidadeAtiva: true,
        },
      });

      if (!sessao || sessao.usuarioId !== usuario.id || sessao.status !== "ATIVA") {
        return res.status(401).json({
          error: "Sessão encerrada. Faça login novamente.",
          code: "SESSAO_ENCERRADA",
        });
      }

      req.sessaoId = sessao.id;
      unidadeSessao = sessao.unidadeAtiva;

      await prisma.sessaoUsuario.update({
        where: { id: sessao.id },
        data: {
          ultimaAtividadeEm: new Date(),
          ipUltimaAtividade: req.ip,
        },
      });
    }

    req.usuarioId = usuario.id;
    req.usuarioPerfil = usuario.perfilAcesso;
    req.usuarioUnidade = usuario.unidade;

    const rotaLiberadaParaTrocaSenha = [
      "/api/auth/alterar-senha",
      "/api/auth/logout",
    ].includes(req.originalUrl);

    if (usuario.deveAlterarSenha && !rotaLiberadaParaTrocaSenha) {
      return res.status(403).json({
        error: "Alteração de senha obrigatória no primeiro acesso.",
        code: "TROCA_SENHA_OBRIGATORIA",
      });
    }

    const unidadesPermitidas =
      usuario.perfilAcesso === PERFIS.SUPER_ADMIN
        ? UNIDADES_SISTEMA
        : normalizarUnidadesPermitidas(usuario.unidadesPermitidas, usuario.unidade);
    req.unidadesPermitidas = unidadesPermitidas;

    if (unidadeSolicitada && !unidadesPermitidas.includes(unidadeSolicitada)) {
      return res.status(403).json({
        error: "Usuário não possui acesso a esta unidade",
      });
    }

    req.unidadeAtiva = unidadeSolicitada || unidadeSessao || usuario.unidade || unidadesPermitidas[0] || "GJA-T1";

    if (req.sessaoId && unidadeSolicitada) {
      await prisma.sessaoUsuario.update({
        where: { id: req.sessaoId },
        data: { unidadeAtiva: unidadeSolicitada },
      });
    }

    return next();
  } catch (error) {
    return res.status(401).json({
      error: "Token inválido",
    });
  }
}

export function autorizarPerfis(perfisPermitidos: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (req.usuarioPerfil === PERFIS.SUPER_ADMIN) {
      return next();
    }

    if (!req.usuarioPerfil || !perfisPermitidos.includes(req.usuarioPerfil)) {
      return res.status(403).json({
        error: "Acesso não autorizado para este perfil",
      });
    }

    return next();
  };
}

export const PERFIS = {
  SUPER_ADMIN: "SUPER_ADMIN",
  ADMINISTRADOR: "ADMINISTRADOR",
  ANALISTA: "ANALISTA",
  OPERADOR: "OPERADOR",
  TECNICO_MANUTENCAO: "TECNICO_MANUTENCAO",
};

export const acessoTotal = [PERFIS.SUPER_ADMIN, PERFIS.ADMINISTRADOR];
export const acessoAnalise = [PERFIS.SUPER_ADMIN, PERFIS.ADMINISTRADOR, PERFIS.ANALISTA];
export const acessoRelatorios = [
  PERFIS.SUPER_ADMIN,
  PERFIS.ADMINISTRADOR,
  PERFIS.ANALISTA,
  PERFIS.OPERADOR,
  PERFIS.TECNICO_MANUTENCAO,
];
export const acessoCftvOperacional = [
  PERFIS.SUPER_ADMIN,
  PERFIS.ADMINISTRADOR,
  PERFIS.ANALISTA,
  PERFIS.OPERADOR,
];
export const acessoManutencao = [
  PERFIS.SUPER_ADMIN,
  PERFIS.ADMINISTRADOR,
  PERFIS.TECNICO_MANUTENCAO,
];

