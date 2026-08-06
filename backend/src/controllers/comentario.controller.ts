import { Response } from "express";
import { prisma } from "../lib/prisma";
import { AuthRequest } from "../middlewares/auth";
import { registrarLog } from "../services/auditoria.service";

export async function listarComentarios(req: AuthRequest, res: Response) {
  const modulo = String(req.params.modulo);
  const registroId = String(req.params.registroId);
  const comentarios = await prisma.comentarioInterno.findMany({
    where: {
      modulo,
      registroId: Number(registroId),
      unidade: req.unidadeAtiva,
    },
    orderBy: { createdAt: "desc" },
    include: { autor: { select: { nome: true, apelido: true } } },
  });

  return res.json(comentarios);
}

export async function criarComentario(req: AuthRequest, res: Response) {
  try {
    const modulo = String(req.params.modulo);
    const registroId = String(req.params.registroId);
    const { comentario } = req.body;
    if (!comentario)
      return res.status(400).json({ error: "Informe o comentario." });

    const novo = await prisma.comentarioInterno.create({
      data: {
        modulo,
        registroId: Number(registroId),
        unidade: req.unidadeAtiva || "GJA-T1",
        comentario,
        autorId: req.usuarioId!,
      },
      include: { autor: { select: { nome: true, apelido: true } } },
    });

    await registrarLog({
      req,
      acao: `Comentario interno criado em ${modulo}`,
      tipoRegistro: "ComentarioInterno",
      registroId: novo.id,
      dadosNovos: novo,
    });

    return res.status(201).json(novo);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro ao criar comentario interno" });
  }
}
