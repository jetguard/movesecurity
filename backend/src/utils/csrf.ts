import crypto from "crypto";
import { Request, Response } from "express";

export const CSRF_COOKIE = "jetguard_csrf";
export const CSRF_HEADER = "x-csrf-token";

export function cookieSeguro(req: Request) {
  return req.secure || req.headers["x-forwarded-proto"] === "https" || process.env.NODE_ENV === "production";
}

export function lerCookie(req: Request, nome: string) {
  const cookies = String(req.headers.cookie || "");
  return cookies
    .split(";")
    .map((item) => item.trim())
    .find((item) => item.startsWith(`${nome}=`))
    ?.slice(nome.length + 1);
}

export function gerarCsrfToken() {
  return crypto.randomBytes(32).toString("hex");
}

export function aplicarCookieCsrf(req: Request, res: Response, token = gerarCsrfToken()) {
  res.cookie(CSRF_COOKIE, token, {
    httpOnly: false,
    secure: cookieSeguro(req),
    sameSite: "lax",
    path: "/",
    maxAge: 24 * 60 * 60 * 1000,
  });
  return token;
}

export function limparCookieCsrf(req: Request, res: Response) {
  res.clearCookie(CSRF_COOKIE, {
    httpOnly: false,
    secure: cookieSeguro(req),
    sameSite: "lax",
    path: "/",
  });
}
