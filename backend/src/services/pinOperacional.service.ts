import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma";

const PIN_REGEX = /^\d{4}$/;
const MAX_TENTATIVAS = 5;
const BLOQUEIO_MS = 10 * 60 * 1000;

export function validarFormatoPin(pin: string) {
  return PIN_REGEX.test(pin);
}

export async function gerarHashPin(pin: string) {
  if (!validarFormatoPin(pin)) {
    const erro = new Error("O PIN de segurança deve possuir exatamente 4 dígitos numéricos.");
    (erro as Error & { status?: number }).status = 400;
    throw erro;
  }

  return bcrypt.hash(pin, 10);
}

export async function validarPinOperacional(usuarioId: number, pin: string) {
  if (!validarFormatoPin(pin)) {
    const erro = new Error("Informe o PIN operacional de 4 dígitos.");
    (erro as Error & { status?: number }).status = 400;
    throw erro;
  }

  const usuario = await prisma.usuario.findUnique({
    where: { id: usuarioId },
    select: {
      id: true,
      pinOperacionalHash: true,
      pinTentativasInvalidas: true,
      pinBloqueadoAte: true,
    },
  });

  if (!usuario?.pinOperacionalHash) {
    const erro = new Error("PIN operacional ainda não cadastrado para este usuário.");
    (erro as Error & { status?: number; code?: string }).status = 400;
    (erro as Error & { status?: number; code?: string }).code = "PIN_NAO_CADASTRADO";
    throw erro;
  }

  if (usuario.pinBloqueadoAte && usuario.pinBloqueadoAte.getTime() > Date.now()) {
    const minutos = Math.ceil((usuario.pinBloqueadoAte.getTime() - Date.now()) / 60000);
    const erro = new Error(`PIN bloqueado por excesso de tentativas. Tente novamente em ${minutos} minuto(s).`);
    (erro as Error & { status?: number }).status = 429;
    throw erro;
  }

  const valido = await bcrypt.compare(pin, usuario.pinOperacionalHash);
  if (!valido) {
    const tentativas = usuario.pinTentativasInvalidas + 1;
    await prisma.usuario.update({
      where: { id: usuario.id },
      data: {
        pinTentativasInvalidas: tentativas >= MAX_TENTATIVAS ? 0 : tentativas,
        pinBloqueadoAte: tentativas >= MAX_TENTATIVAS ? new Date(Date.now() + BLOQUEIO_MS) : null,
      },
    });

    const erro = new Error(
      tentativas >= MAX_TENTATIVAS
        ? "PIN inválido. O PIN foi bloqueado temporariamente por excesso de tentativas."
        : "PIN operacional inválido."
    );
    (erro as Error & { status?: number }).status = tentativas >= MAX_TENTATIVAS ? 429 : 400;
    throw erro;
  }

  await prisma.usuario.update({
    where: { id: usuario.id },
    data: {
      pinTentativasInvalidas: 0,
      pinBloqueadoAte: null,
    },
  });

  return true;
}
