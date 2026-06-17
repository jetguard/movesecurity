import { Response } from "express";
import { prisma } from "../lib/prisma";
import { AuthRequest } from "../middlewares/auth";
import { registrarLog } from "../services/auditoria.service";
import { assinarDocumento, exigirSenhaAssinatura } from "../services/assinaturaDocumento.service";
import { validarPinOperacional } from "../services/pinOperacional.service";

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

function statusOcorrenciaAposInvestigacao(statusInvestigacao: string, analise?: { status?: string | null } | null) {
  if (statusInvestigacao === "Anulada") {
    if (analise?.status === "Concluído") return "Aguardando Aprovação";
    if (analise) return "Em Análise";
    return "Aberto";
  }
  if (statusInvestigacao !== "Concluído") return "Em Investigação";
  if (analise?.status === "Concluído") return "Aguardando Aprovação";
  if (analise) return "Em Análise";
  return "Aberto";
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
      include: {
        analise: true,
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
        if (investigacaoExistente.status === "Anulada") {
          await validarPinOperacional(req.usuarioId!, String(req.body?.pinOperacional || ""));

          const investigacaoReaberta = await prisma.$transaction(async (tx) => {
            const reaberta = await tx.investigacao.update({
              where: { id: investigacaoExistente.id },
              data: {
                status: "Em Análise",
                fluxoStatus: "Aguardando Revisao",
              },
              include: {
                ocorrencia: true,
                responsavel: true,
              },
            });

            if (ocorrencia.status !== "Concluído" && ocorrencia.status !== "Anulado") {
              await tx.ocorrencia.update({
                where: { id: ocorrencia.id },
                data: { status: statusOcorrenciaAposInvestigacao(reaberta.status, ocorrencia.analise) },
              });
            }

            return reaberta;
          });

          await registrarLog({
            req,
            acao: `Reabertura da investigação ${investigacaoReaberta.codigo} vinculada à ocorrência ${ocorrencia.codigo}`,
            tipoRegistro: "Investigacao",
            registroId: investigacaoReaberta.id,
            dadosAnteriores: investigacaoExistente,
            dadosNovos: investigacaoReaberta,
          });

          return res.status(200).json(investigacaoReaberta);
        }

        if (ocorrencia.status !== "Concluído" && ocorrencia.status !== "Anulado") {
          await prisma.ocorrencia.update({
            where: { id: ocorrencia.id },
            data: { status: statusOcorrenciaAposInvestigacao(investigacaoExistente.status, ocorrencia.analise) },
          });
        }

        return res.status(200).json(investigacaoExistente);
      }

      const numeracao = await proximaNumeracaoInvestigacao(ocorrencia.unidade);
      const investigacaoAtualizada = await prisma.$transaction(async (tx) => {
        const atualizada = await tx.investigacao.update({
          where: {
            id: investigacaoExistente.id,
          },
          data: numeracao,
          include: {
            ocorrencia: true,
            responsavel: true,
          },
        });

        if (ocorrencia.status !== "Concluído" && ocorrencia.status !== "Anulado") {
          await tx.ocorrencia.update({
            where: { id: ocorrencia.id },
            data: { status: statusOcorrenciaAposInvestigacao(atualizada.status, ocorrencia.analise) },
          });
        }

        return atualizada;
      });

      return res.status(200).json(investigacaoAtualizada);
    }

    const numeracao = await proximaNumeracaoInvestigacao(ocorrencia.unidade);

    const investigacao = await prisma.$transaction(async (tx) => {
      const criada = await tx.investigacao.create({
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

      await tx.ocorrencia.update({
        where: { id: ocorrencia.id },
        data: { status: "Em Investigação" },
      });

      return criada;
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

export async function cancelarConversaoInvestigacao(req: AuthRequest, res: Response) {
  try {
    const { ocorrenciaId } = req.params;
    await validarPinOperacional(req.usuarioId!, String(req.body?.pinOperacional || ""));

    const ocorrencia = await prisma.ocorrencia.findFirst({
      where: {
        id: Number(ocorrenciaId),
        unidade: req.unidadeAtiva,
      },
      include: {
        analise: true,
        investigacao: {
          include: {
            responsavel: true,
          },
        },
      },
    });

    if (!ocorrencia) {
      return res.status(404).json({ error: "Ocorrência não encontrada" });
    }

    if (!ocorrencia.investigacao) {
      return res.status(404).json({ error: "Esta ocorrência não possui investigação vinculada" });
    }

    if (ocorrencia.investigacao.status === "Anulada") {
      return res.json(ocorrencia.investigacao);
    }

    const investigacaoAnulada = await prisma.$transaction(async (tx) => {
      const anulada = await tx.investigacao.update({
        where: { id: ocorrencia.investigacao!.id },
        data: {
          status: "Anulada",
          fluxoStatus: "Anulado",
        },
        include: {
          ocorrencia: true,
          responsavel: true,
        },
      });

      if (ocorrencia.status !== "Concluído" && ocorrencia.status !== "Anulado") {
        await tx.ocorrencia.update({
          where: { id: ocorrencia.id },
          data: {
            status: statusOcorrenciaAposInvestigacao("Anulada", ocorrencia.analise),
          },
        });
      }

      return anulada;
    });

    await registrarLog({
      req,
      acao: `Cancelamento da conversão para R.I ${investigacaoAnulada.codigo} vinculada à ocorrência ${ocorrencia.codigo}`,
      tipoRegistro: "Investigacao",
      registroId: investigacaoAnulada.id,
      dadosAnteriores: ocorrencia.investigacao,
      dadosNovos: investigacaoAnulada,
    });

    return res.json(investigacaoAnulada);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro ao cancelar conversão para investigação" });
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
      include: {
        ocorrencia: {
          include: {
            analise: true,
          },
        },
      },
    });

    if (!anterior) {
      return res.status(404).json({
        error: "Investigação não encontrada",
      });
    }

    if (anterior.status === "Anulada") {
      return res.status(403).json({
        error: "Esta investigação está anulada e não pode ser editada. Reabra a R.I para realizar novas alterações.",
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

    const novoStatus = req.body.status || anterior.status;
    const concluindo = novoStatus === "Concluído";
    if (concluindo && anterior.status !== "Concluído") await exigirSenhaAssinatura(req);

    const investigacao = await prisma.$transaction(async (tx) => {
      const atualizada = await tx.investigacao.update({
        where: {
          id: Number(id),
        },
        data: {
          descricaoInvestigacao: req.body.descricaoInvestigacao,
          conclusaoFatos: req.body.conclusaoFatos,
          local: localCadastro.nome,
          status: novoStatus,
          fluxoStatus: concluindo ? "Aguardando Revisao" : anterior.fluxoStatus,
        },
        include: {
          ocorrencia: true,
          responsavel: true,
        },
      });

      await tx.ocorrencia.update({
        where: { id: atualizada.ocorrenciaId },
        data: {
          status: statusOcorrenciaAposInvestigacao(novoStatus, anterior.ocorrencia.analise),
          fluxoStatus: concluindo && anterior.ocorrencia.analise?.status === "Concluído"
            ? "Aguardando Revisao"
            : anterior.ocorrencia.fluxoStatus,
        },
      });

      return atualizada;
    });

    await registrarLog({
      req,
      acao: "Atualização de investigação",
      tipoRegistro: "Investigacao",
      registroId: investigacao.id,
      dadosAnteriores: anterior,
      dadosNovos: investigacao,
    });

    if (concluindo && anterior.status !== "Concluído") {
      await assinarDocumento({
        req,
        modulo: "Investigacao",
        registroId: investigacao.id,
        codigoRegistro: investigacao.codigo || investigacao.numeroOcorrencia,
        unidade: investigacao.unidade,
        acao: "Conclusão da investigação",
        dados: investigacao,
      });
    }

    return res.json(investigacao);
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: "Erro ao atualizar investigação",
    });
  }
}

