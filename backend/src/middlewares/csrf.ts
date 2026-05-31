import { NextFunction, Request, Response } from "express";
import { CSRF_COOKIE, CSRF_HEADER, lerCookie } from "../utils/csrf";

const metodosProtegidos = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const rotasIsentas = [
  "/api/auth/login",
  "/api/auth/refresh",
  "/api/auth/csrf",
  "/api/public/",
];

export function protegerCsrf(req: Request, res: Response, next: NextFunction) {
  if (!metodosProtegidos.has(req.method)) {
    return next();
  }

  if (rotasIsentas.some((rota) => req.originalUrl.startsWith(rota))) {
    return next();
  }

  const tokenCookie = lerCookie(req, CSRF_COOKIE);
  const tokenHeader = String(req.headers[CSRF_HEADER] || "");

  if (!tokenCookie || !tokenHeader || tokenCookie !== tokenHeader) {
    return res.status(403).json({
      error: "Token CSRF inválido ou ausente.",
      code: "CSRF_INVALIDO",
    });
  }

  return next();
}
