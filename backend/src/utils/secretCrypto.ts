import crypto from "crypto";
import { jwtSecret } from "../config/security";

const prefixo = "enc:v1:";

function chaveCriptografia() {
  const segredo =
    process.env.CONFIG_SECRET_KEY ||
    process.env.SMTP_SECRET_KEY ||
    jwtSecret();
  return crypto.createHash("sha256").update(segredo).digest();
}

export function criptografarSegredo(valor?: string | null) {
  const texto = String(valor || "");
  if (!texto || texto.startsWith(prefixo)) return texto;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", chaveCriptografia(), iv);
  const criptografado = Buffer.concat([
    cipher.update(texto, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return [
    prefixo,
    iv.toString("base64url"),
    tag.toString("base64url"),
    criptografado.toString("base64url"),
  ].join("");
}

export function descriptografarSegredo(valor?: string | null) {
  const texto = String(valor || "");
  if (!texto || !texto.startsWith(prefixo)) return texto;
  try {
    const [ivTexto, tagTexto, dadosTexto] = texto
      .slice(prefixo.length)
      .split(":");
    if (!ivTexto || !tagTexto || !dadosTexto) return "";
    const decipher = crypto.createDecipheriv(
      "aes-256-gcm",
      chaveCriptografia(),
      Buffer.from(ivTexto, "base64url"),
    );
    decipher.setAuthTag(Buffer.from(tagTexto, "base64url"));
    return Buffer.concat([
      decipher.update(Buffer.from(dadosTexto, "base64url")),
      decipher.final(),
    ]).toString("utf8");
  } catch {
    return "";
  }
}
