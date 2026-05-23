import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export type AuthRequest = Request & {
  usuarioId?: number;
};

type TokenPayload = {
  id: number;
};

export function autenticarUsuario(
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
    const payload = jwt.verify(token, "jetguard_secret") as TokenPayload;
    req.usuarioId = payload.id;

    return next();
  } catch (error) {
    return res.status(401).json({
      error: "Token inválido",
    });
  }
}
