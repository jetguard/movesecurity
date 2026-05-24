import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { prisma } from "../lib/prisma";
import { jwtSecret } from "../config/security";

export type AuthRequest = Request & {
  usuarioId?: number;
  usuarioPerfil?: string;
  usuarioUnidade?: string | null;
  unidadeAtiva?: string;
};

type TokenPayload = {
  id: number;
};

export async function autenticarUsuario(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({
      error: "Token não informado",
    });
  }

  const [, token] = authHeader.split(" ");

  try {
    const payload = jwt.verify(token, jwtSecret()) as TokenPayload;
    const usuario = await prisma.usuario.findUnique({
      where: {
        id: payload.id,
      },
      select: {
        id: true,
        perfilAcesso: true,
        statusUsuario: true,
        unidade: true,
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

    req.usuarioId = usuario.id;
    req.usuarioPerfil = usuario.perfilAcesso;
    req.usuarioUnidade = usuario.unidade;

    const unidadeSolicitada = String(req.headers["x-unidade-ativa"] || "");
    const podeTrocarAmbiente = [
      PERFIS.SUPER_ADMIN,
      PERFIS.ADMINISTRADOR,
      PERFIS.ANALISTA,
    ].includes(usuario.perfilAcesso);

    req.unidadeAtiva =
      podeTrocarAmbiente && unidadeSolicitada
        ? unidadeSolicitada
        : usuario.unidade || "GJA-T1";

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
};

export const acessoTotal = [PERFIS.SUPER_ADMIN, PERFIS.ADMINISTRADOR];
export const acessoAnalise = [PERFIS.SUPER_ADMIN, PERFIS.ADMINISTRADOR, PERFIS.ANALISTA];
export const acessoRelatorios = [
  PERFIS.SUPER_ADMIN,
  PERFIS.ADMINISTRADOR,
  PERFIS.ANALISTA,
  PERFIS.OPERADOR,
];

