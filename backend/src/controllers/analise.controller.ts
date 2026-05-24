import { Response } from "express";
import { prisma } from "../lib/prisma";
import { AuthRequest } from "../middlewares/auth";
import { registrarLog } from "../services/auditoria.service";

function normalizarBrl(valor: unknown) {
  return String(valor || "0,00").trim() || "0,00";
}

export async function iniciarAnaliseOcorrencia(req: AuthRequest, res: Response) {
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
    return res.status(500).json({ error: "Erro ao iniciar análise da ocorrência" });
  }
}

export async function atualizarAnaliseOcorrencia(req: AuthRequest, res: Response) {
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
        ocorrencia: true,
      },
    });

    if (!anterior) {
      return res.status(404).json({ error: "Análise não encontrada" });
    }

    const status = req.body.status || anterior.status;
    const concluindo = status === "Concluído";

    const { analise, ocorrencia } = await prisma.$transaction(async (tx) => {
      const analiseAtual = await tx.analiseOcorrencia.update({
        where: { id: Number(id) },
        data: {
          status,
          prejuizoFinanceiro: normalizarBrl(req.body.prejuizoFinanceiro),
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
          status: concluindo ? "Concluído" : "Em Análise",
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

    return res.json(analise);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro ao atualizar análise da ocorrência" });
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

    const { analise, evento } = await prisma.$transaction(async (tx) => {
      const analiseAtual = await tx.analiseEvento.update({
        where: { id: Number(id) },
        data: {
          status,
          valorRecuperado: normalizarBrl(req.body.valorRecuperado),
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
          status: concluindo ? "Concluído" : "Em Análise",
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

    return res.json(analise);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro ao atualizar análise do evento" });
  }
}

