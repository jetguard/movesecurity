import { Response } from "express";
import { prisma } from "../lib/prisma";
import { AuthRequest } from "../middlewares/auth";

function parseDados(dadosJson?: string | null) {
  if (!dadosJson) return null;
  try {
    return JSON.parse(dadosJson);
  } catch {
    return null;
  }
}

function formatarRascunho(rascunho: {
  id: number;
  modulo: string;
  chave: string;
  unidade: string;
  dadosJson: string;
  status: string;
  ultimaAlteracao: Date;
  updatedAt: Date;
}) {
  return {
    id: rascunho.id,
    modulo: rascunho.modulo,
    chave: rascunho.chave,
    unidade: rascunho.unidade,
    status: rascunho.status,
    ultimaAlteracao: rascunho.ultimaAlteracao,
    updatedAt: rascunho.updatedAt,
    dados: parseDados(rascunho.dadosJson),
  };
}

export async function buscarRascunho(req: AuthRequest, res: Response) {
  const usuarioId = req.usuarioId;
  const modulo = String(req.query.modulo || "").trim();
  const chave = String(req.query.chave || "").trim();
  const unidade = req.unidadeAtiva || req.usuarioUnidade || "GJA-T1";

  if (!usuarioId || !modulo || !chave) {
    return res.status(400).json({ error: "Informe módulo e chave do rascunho." });
  }

  const rascunho = await prisma.rascunhoFormulario.findUnique({
    where: {
      usuarioId_modulo_chave_unidade: {
        usuarioId,
        modulo,
        chave,
        unidade,
      },
    },
  });

  return res.json(rascunho ? formatarRascunho(rascunho) : null);
}

export async function salvarRascunho(req: AuthRequest, res: Response) {
  const usuarioId = req.usuarioId;
  const modulo = String(req.body.modulo || "").trim();
  const chave = String(req.body.chave || "").trim();
  const unidade = req.unidadeAtiva || req.usuarioUnidade || "GJA-T1";

  if (!usuarioId || !modulo || !chave) {
    return res.status(400).json({ error: "Informe módulo e chave do rascunho." });
  }

  const dadosJson = JSON.stringify(req.body.dados || {});
  const agora = new Date();

  const rascunho = await prisma.rascunhoFormulario.upsert({
    where: {
      usuarioId_modulo_chave_unidade: {
        usuarioId,
        modulo,
        chave,
        unidade,
      },
    },
    create: {
      usuarioId,
      modulo,
      chave,
      unidade,
      dadosJson,
      ultimaAlteracao: agora,
    },
    update: {
      dadosJson,
      status: "EM_PREENCHIMENTO",
      ultimaAlteracao: agora,
    },
  });

  return res.json(formatarRascunho(rascunho));
}

export async function descartarRascunho(req: AuthRequest, res: Response) {
  const usuarioId = req.usuarioId;
  const id = Number(req.params.id);

  if (!usuarioId || !id) {
    return res.status(400).json({ error: "Rascunho inválido." });
  }

  const rascunho = await prisma.rascunhoFormulario.findFirst({
    where: { id, usuarioId },
  });

  if (!rascunho) {
    return res.status(404).json({ error: "Rascunho não encontrado." });
  }

  await prisma.rascunhoFormulario.delete({ where: { id } });
  return res.status(204).send();
}
