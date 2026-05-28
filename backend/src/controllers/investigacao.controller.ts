import { Response } from "express";
import { prisma } from "../lib/prisma";
import { AuthRequest } from "../middlewares/auth";
import { registrarLog } from "../services/auditoria.service";

function formatarCodigo(numero: number, ano: number) {
  return `${String(numero).padStart(4, "0")}/${ano}`;
}

async function proximaNumeracaoInvestigacao(unidade: string) {
  const ano = new Date().getFullYear();
  const ultimaInvestigacao = await prisma.investigacao.findFirst({
    where: {
      ano,
      unidade,
    },
    orderBy: {
      numero: "desc",
    },
    select: {
      numero: true,
    },
  });

  const numero = (ultimaInvestigacao?.numero || 0) + 1;

  return {
    numero,
    ano,
    codigo: formatarCodigo(numero, ano),
  };
}

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

    const investigacaoExistente = await prisma.investigacao.findUnique({
      where: {
        ocorrenciaId: ocorrencia.id,
      },
      include: {
        ocorrencia: true,
        responsavel: true,
      },
    });

    if (investigacaoExistente) {
      if (investigacaoExistente.codigo) {
        return res.status(200).json(investigacaoExistente);
      }

      const numeracao = await proximaNumeracaoInvestigacao(ocorrencia.unidade);
      const investigacaoAtualizada = await prisma.investigacao.update({
        where: {
          id: investigacaoExistente.id,
        },
        data: numeracao,
        include: {
          ocorrencia: true,
          responsavel: true,
        },
      });

      return res.status(200).json(investigacaoAtualizada);
    }

    const numeracao = await proximaNumeracaoInvestigacao(ocorrencia.unidade);

    const investigacao = await prisma.investigacao.create({
      data: {
        ...numeracao,
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

    const local = req.body.local ? String(req.body.local).trim() : anterior.local;
    const localCadastro = await prisma.localTerminal.findFirst({
      where: {
        nome: local,
        unidade: req.unidadeAtiva,
        status: "Ativo",
      },
    });

    if (!localCadastro) {
      return res.status(400).json({
        error: "Selecione um local ativo cadastrado para esta unidade.",
      });
    }

    const investigacao = await prisma.investigacao.update({
      where: {
        id: Number(id),
      },
      data: {
        descricaoInvestigacao: req.body.descricaoInvestigacao,
        conclusaoFatos: req.body.conclusaoFatos,
        local: localCadastro.nome,
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

