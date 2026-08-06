import { Response } from "express";
import { prisma } from "../lib/prisma";
import { AuthRequest } from "../middlewares/auth";
import { registrarLog } from "../services/auditoria.service";

export async function listarUsuariosMencao(req: AuthRequest, res: Response) {
  const usuarios = await prisma.usuario.findMany({
    where: {
      statusUsuario: "ATIVO",
      OR: [
        { unidade: req.unidadeAtiva },
        { unidadesPermitidas: { contains: req.unidadeAtiva } },
        { perfilAcesso: "SUPER_ADMIN" },
      ],
    },
    orderBy: { nome: "asc" },
    select: {
      id: true,
      nome: true,
      apelido: true,
      email: true,
      cargo: true,
      unidade: true,
    },
  });

  return res.json(usuarios);
}

export async function minhasMencoes(req: AuthRequest, res: Response) {
  const mencoes = await prisma.mencao.findMany({
    where: { usuarioMencionadoId: req.usuarioId },
    orderBy: { createdAt: "desc" },
    include: { autor: { select: { nome: true, apelido: true } } },
  });

  return res.json(mencoes);
}

export async function criarMencao(req: AuthRequest, res: Response) {
  try {
    const {
      modulo,
      registroId,
      codigoRegistro,
      tituloRegistro,
      usuarioMencionadoId,
      tipoMencao,
      prazo,
      observacao,
    } = req.body;
    if (
      !modulo ||
      !registroId ||
      !codigoRegistro ||
      !tituloRegistro ||
      !usuarioMencionadoId
    ) {
      return res.status(400).json({ error: "Dados da mencao incompletos." });
    }

    const mencao = await prisma.mencao.create({
      data: {
        modulo,
        registroId: Number(registroId),
        codigoRegistro,
        tituloRegistro,
        unidade: req.unidadeAtiva || "GJA-T1",
        usuarioMencionadoId: Number(usuarioMencionadoId),
        autorId: req.usuarioId,
        tipoMencao: tipoMencao || "Acompanhar",
        prazo: prazo ? new Date(prazo) : null,
        observacao,
      },
      include: {
        usuarioMencionado: { select: { nome: true, apelido: true } },
        autor: { select: { nome: true, apelido: true } },
      },
    });

    await registrarLog({
      req,
      acao: `Mencao criada em ${modulo} ${codigoRegistro}`,
      tipoRegistro: "Mencao",
      registroId: mencao.id,
      dadosNovos: mencao,
    });

    return res.status(201).json(mencao);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro ao criar mencao" });
  }
}

export async function marcarMencaoLida(req: AuthRequest, res: Response) {
  const mencao = await prisma.mencao.update({
    where: { id: Number(req.params.id) },
    data: { lidaEm: new Date(), status: "Lida" },
  });

  return res.json(mencao);
}

export async function contarMencoes(req: AuthRequest, res: Response) {
  const total = await prisma.mencao.count({
    where: { usuarioMencionadoId: req.usuarioId, lidaEm: null },
  });

  return res.json({ total });
}
