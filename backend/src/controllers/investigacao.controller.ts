import { Response } from "express";
import { prisma } from "../lib/prisma";
import { AuthRequest } from "../middlewares/auth";
import { registrarLog } from "../services/auditoria.service";

export async function listarInvestigacoes(req: AuthRequest, res: Response) {
  const investigacoes = await prisma.investigacao.findMany({
    where: {
      unidade: req.unidadeAtiva,
    },
    orderBy: { createdAt: "desc" },
    include: {
      ocorrencia: {
        include: {
          envolvidos: true,
          anexos: true,
        },
      },
      responsavel: {
        select: {
          id: true,
          nome: true,
        },
      },
    },
  });

  return res.json(investigacoes);
}

export async function converterOcorrenciaParaInvestigacao(
  req: AuthRequest,
  res: Response
) {
  try {
    const { ocorrenciaId } = req.params;

    const ocorrencia = await prisma.ocorrencia.findFirst({
      where: {
        id: Number(ocorrenciaId),
        unidade: req.unidadeAtiva,
      },
    });

    if (!ocorrencia) {
      return res.status(404).json({
        error: "Ocorrência não encontrada",
      });
    }

    const investigacao = await prisma.investigacao.upsert({
      where: {
        ocorrenciaId: ocorrencia.id,
      },
      update: {},
      create: {
        ocorrenciaId: ocorrencia.id,
        titulo: ocorrencia.assunto,
        descricao: ocorrencia.relatoSeguranca || ocorrencia.assunto,
        numeroOcorrencia: ocorrencia.codigo,
        assunto: ocorrencia.assunto,
        local: ocorrencia.local,
        unidade: ocorrencia.unidade,
        natureza: ocorrencia.natureza,
        subNatureza: ocorrencia.subNatureza,
        dataOcorrencia: ocorrencia.dataOcorrencia,
        relatoSeguranca: ocorrencia.relatoSeguranca,
        responsavelId: req.usuarioId,
      },
      include: {
        ocorrencia: true,
        responsavel: true,
      },
    });

    await registrarLog({
      req,
      acao: "Conversão para investigação",
      tipoRegistro: "Investigacao",
      registroId: investigacao.id,
      dadosNovos: investigacao,
    });

    return res.status(201).json(investigacao);
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: "Erro ao converter ocorrência para investigação",
    });
  }
}

export async function atualizarInvestigacao(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const anterior = await prisma.investigacao.findFirst({
      where: {
        id: Number(id),
        unidade: req.unidadeAtiva,
      },
    });

    if (!anterior) {
      return res.status(404).json({
        error: "Investigação não encontrada",
      });
    }

    const investigacao = await prisma.investigacao.update({
      where: {
        id: Number(id),
      },
      data: {
        descricaoInvestigacao: req.body.descricaoInvestigacao,
        conclusaoFatos: req.body.conclusaoFatos,
        status: req.body.status || anterior.status,
      },
      include: {
        ocorrencia: true,
        responsavel: true,
      },
    });

    await registrarLog({
      req,
      acao: "Atualização de investigação",
      tipoRegistro: "Investigacao",
      registroId: investigacao.id,
      dadosAnteriores: anterior,
      dadosNovos: investigacao,
    });

    return res.json(investigacao);
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: "Erro ao atualizar investigação",
    });
  }
}

