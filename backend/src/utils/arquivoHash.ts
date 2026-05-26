import fs from "fs";
import crypto from "crypto";

export function calcularHashArquivo(caminho: string) {
  try {
    const arquivo = fs.readFileSync(caminho);
    return crypto.createHash("sha256").update(arquivo).digest("hex");
  } catch {
    return null;
  }
}

export function hashIdentificadorDispositivo(identificador: string) {
  return crypto.createHash("sha256").update(identificador).digest("hex");
}
