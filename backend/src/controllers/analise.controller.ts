import { Response } from "express";
import { prisma } from "../lib/prisma";
import { AuthRequest } from "../middlewares/auth";
import { registrarLog } from "../services/auditoria.service";
import {
  assinarDocumento,
  exigirSenhaAssinatura,
} from "../services/assinaturaDocumento.service";

function normalizarBrl(valor: unknown) {
  return String(valor || "0,00").trim() || "0,00";
}

function normalizarOpcao(valor: unknown) {
  return String(valor || "").trim();
}

function impactoFinanceiroDaAnalise(body: any) {
  const houveDanoPrejuizoBruto = normalizarOpcao(body.houveDanoPrejuizo);
  const houveDanoPrejuizo =
    houveDanoPrejuizoBruto === "Não"
      ? "Sem alteração"
      : houveDanoPrejuizoBruto === "Sim"
        ? "Dano/Prejuízo"
        : houveDanoPrejuizoBruto;

  if (!["Sem alteração", "Recuperado", "Dano/Prejuízo"].includes(houveDanoPrejuizo)) {
    throw Object.assign(
      new Error("Informe a situação do impacto financeiro da análise."),
      { status: 400 },
    );
  }

  if (houveDanoPrejuizo === "Sem alteração") {
    return {
      houveDanoPrejuizo,
      tipoImpactoFinanceiro: null,
      valorPrejuizo: "0,00",
      valorRecuperado: "0,00",
    };
  }

  const tipoImpactoFinanceiro = normalizarOpcao(body.tipoImpactoFinanceiro);
  if (!["Total", "Parcial"].includes(tipoImpactoFinanceiro)) {
    throw Object.assign(
      new Error("Informe se o impacto financeiro foi total ou parcial."),
      { status: 400 },
    );
  }

  const valorPrejuizo =
    houveDanoPrejuizo === "Dano/Prejuízo" ||
    tipoImpactoFinanceiro === "Parcial"
      ? normalizarBrl(body.valorPrejuizo)
      : "0,00";
  const valorRecuperado =
    houveDanoPrejuizo === "Recuperado" || tipoImpactoFinanceiro === "Parcial"
      ? normalizarBrl(body.valorRecuperado)
      : "0,00";

  return {
    houveDanoPrejuizo,
    tipoImpactoFinanceiro,
    valorPrejuizo,
    valorRecuperado,
  };
}

function statusRelatorioAposAnalise(
  concluindo: boolean,
  investigacao?: { status?: string | null } | null,
) {
  if (!concluindo) return "Em Análise";
  if (investigacao && investigacao.status !== "Concluído")
    return "Em Investigação";
  return "Aguardando Aprovação";
}

export async function iniciarAnaliseOcorrencia(
  req: AuthRequest,
  res: Response,
) {
  try {
    const { ocorrenciaId } = req.params;

    const ocorrenciaPermitida = await prisma.ocorrencia.findFirst({
      where: {
        id: Number(ocorrenciaId),
        unidade: req.unidadeAtiva,
      },
    });

    if (!ocorrenciaPermitida) {
      return res.status(404).json({ error: "Ocorrência não encontrada" });
    }

    const { analise, ocorrencia } = await prisma.$transaction(async (tx) => {
      const analiseAtual = await tx.analiseOcorrencia.upsert({
        where: {
          ocorrenciaId: Number(ocorrenciaId),
        },
        update: {},
        create: {
          ocorrenciaId: Number(ocorrenciaId),
          responsavelId: req.usuarioId!,
        },
        include: {
          responsavel: true,
          concluidoPor: true,
        },
      });

      const ocorrenciaAtual = await tx.ocorrencia.update({
        where: {
          id: Number(ocorrenciaId),
        },
        data: {
          status: "Em Análise",
        },
      });

      return { analise: analiseAtual, ocorrencia: ocorrenciaAtual };
    });

    await registrarLog({
      req,
      acao: "Início de análise",
      tipoRegistro: "AnaliseOcorrencia",
      registroId: ocorrencia.id,
      dadosNovos: { ...analise, codigo: ocorrencia.codigo },
    });

    return res.status(201).json(analise);
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ error: "Erro ao iniciar análise da ocorrência" });
  }
}

export async function atualizarAnaliseOcorrencia(
  req: AuthRequest,
  res: Response,
) {
  try {
    const { id } = req.params;
    const anterior = await prisma.analiseOcorrencia.findFirst({
      where: {
        id: Number(id),
        ocorrencia: {
          unidade: req.unidadeAtiva,
        },
      },
      include: {
        ocorrencia: {
          include: {
            investigacao: true,
          },
        },
      },
    });

    if (!anterior) {
      return res.status(404).json({ error: "Análise não encontrada" });
    }

    const status = req.body.status || anterior.status;
    const concluindo = status === "Concluído";
    const impactoFinanceiro = impactoFinanceiroDaAnalise(req.body);
    if (concluindo) await exigirSenhaAssinatura(req);

    const { analise, ocorrencia } = await prisma.$transaction(async (tx) => {
      const analiseAtual = await tx.analiseOcorrencia.update({
        where: { id: Number(id) },
        data: {
          status,
          prejuizoFinanceiro: impactoFinanceiro.valorPrejuizo,
          ...impactoFinanceiro,
          conclusaoAnalise: req.body.conclusaoAnalise,
          concluidoEm: concluindo ? new Date() : null,
          concluidoPorId: concluindo ? req.usuarioId : null,
        },
        include: {
          responsavel: true,
          concluidoPor: true,
        },
      });

      const ocorrenciaAtual = await tx.ocorrencia.update({
        where: {
          id: analiseAtual.ocorrenciaId,
        },
        data: {
          status: statusRelatorioAposAnalise(
            concluindo,
            anterior.ocorrencia.investigacao,
          ),
          fluxoStatus:
            concluindo &&
            (!anterior.ocorrencia.investigacao ||
              anterior.ocorrencia.investigacao.status === "Concluído")
              ? "Aguardando Revisao"
              : anterior.ocorrencia.fluxoStatus,
        },
      });

      return { analise: analiseAtual, ocorrencia: ocorrenciaAtual };
    });

    await registrarLog({
      req,
      acao: concluindo ? "Conclusão de análise" : "Atualização de análise",
      tipoRegistro: "AnaliseOcorrencia",
      registroId: ocorrencia.id,
      dadosAnteriores: anterior,
      dadosNovos: { ...analise, codigo: ocorrencia.codigo },
    });

    if (concluindo) {
      await assinarDocumento({
        req,
        modulo: "AnaliseOcorrencia",
        registroId: analise.id,
        codigoRegistro: ocorrencia.codigo,
        unidade: ocorrencia.unidade,
        acao: "Conclusão da análise de ocorrência",
        dados: analise,
      });
    }

    return res.json(analise);
  } catch (error) {
    console.error(error);
    const status = (error as Error & { status?: number }).status;
    if (status)
      return res.status(status).json({ error: (error as Error).message });
    return res
      .status(500)
      .json({ error: "Erro ao atualizar análise da ocorrência" });
  }
}

export async function iniciarAnaliseEvento(req: AuthRequest, res: Response) {
  try {
    const { eventoId } = req.params;

    const eventoPermitido = await prisma.evento.findFirst({
      where: {
        id: Number(eventoId),
        unidade: req.unidadeAtiva,
      },
    });

    if (!eventoPermitido) {
      return res.status(404).json({ error: "Evento não encontrado" });
    }

    const { analise, evento } = await prisma.$transaction(async (tx) => {
      const analiseAtual = await tx.analiseEvento.upsert({
        where: {
          eventoId: Number(eventoId),
        },
        update: {},
        create: {
          eventoId: Number(eventoId),
          responsavelId: req.usuarioId!,
        },
        include: {
          responsavel: true,
          concluidoPor: true,
        },
      });

      const eventoAtual = await tx.evento.update({
        where: {
          id: Number(eventoId),
        },
        data: {
          status: "Em Análise",
        },
      });

      return { analise: analiseAtual, evento: eventoAtual };
    });

    await registrarLog({
      req,
      acao: "Início de análise",
      tipoRegistro: "AnaliseEvento",
      registroId: evento.id,
      dadosNovos: { ...analise, codigo: evento.codigo },
    });

    return res.status(201).json(analise);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro ao iniciar análise do evento" });
  }
}

export async function atualizarAnaliseEvento(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const anterior = await prisma.analiseEvento.findFirst({
      where: {
        id: Number(id),
        evento: {
          unidade: req.unidadeAtiva,
        },
      },
      include: {
        evento: true,
      },
    });

    if (!anterior) {
      return res.status(404).json({ error: "Análise não encontrada" });
    }

    const status = req.body.status || anterior.status;
    const concluindo = status === "Concluído";
    const impactoFinanceiro = impactoFinanceiroDaAnalise(req.body);
    if (concluindo) await exigirSenhaAssinatura(req);

    const { analise, evento } = await prisma.$transaction(async (tx) => {
      const analiseAtual = await tx.analiseEvento.update({
        where: { id: Number(id) },
        data: {
          status,
          ...impactoFinanceiro,
          conclusaoAnalise: req.body.conclusaoAnalise,
          concluidoEm: concluindo ? new Date() : null,
          concluidoPorId: concluindo ? req.usuarioId : null,
        },
        include: {
          responsavel: true,
          concluidoPor: true,
        },
      });

      const eventoAtual = await tx.evento.update({
        where: {
          id: analiseAtual.eventoId,
        },
        data: {
          status: concluindo ? "Aguardando Aprovação" : "Em Análise",
          fluxoStatus: concluindo
            ? "Aguardando Revisao"
            : anterior.evento.fluxoStatus,
        },
      });

      return { analise: analiseAtual, evento: eventoAtual };
    });

    await registrarLog({
      req,
      acao: concluindo ? "Conclusão de análise" : "Atualização de análise",
      tipoRegistro: "AnaliseEvento",
      registroId: evento.id,
      dadosAnteriores: anterior,
      dadosNovos: { ...analise, codigo: evento.codigo },
    });

    if (concluindo) {
      await assinarDocumento({
        req,
        modulo: "AnaliseEvento",
        registroId: analise.id,
        codigoRegistro: evento.codigo,
        unidade: evento.unidade,
        acao: "Conclusão da análise de evento",
        dados: analise,
      });
    }

    return res.json(analise);
  } catch (error) {
    console.error(error);
    const status = (error as Error & { status?: number }).status;
    if (status)
      return res.status(status).json({ error: (error as Error).message });
    return res
      .status(500)
      .json({ error: "Erro ao atualizar análise do evento" });
  }
}
