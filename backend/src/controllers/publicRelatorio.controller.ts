import { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import {
  criarUrlPublicaPdf,
  gerarRelatorioPdf,
  TipoRelatorioPublico,
  validarTokenAcessoPdf,
} from "../services/relatorioPdf.service";

const usuarioConsultaPublica = {
  nome: "JetGuard - Movecta Patrimonial",
  empresa: "Movecta S/A",
};

export async function gerarPdfPublicoRelatorio(req: Request, res: Response) {
  try {
    const tipo = req.params.tipo as TipoRelatorioPublico;
    const id = Number(req.params.id);
    const token = String(req.query.token || "");

    if (!["ocorrencias", "eventos"].includes(tipo) || !Number.isFinite(id)) {
      return res.status(404).json({ error: "Relatório não encontrado" });
    }

    if (tipo === "ocorrencias") {
      const ocorrencia = await prisma.ocorrencia.findUnique({
        where: { id },
        include: {
          envolvidos: true,
          investigacao: {
            include: {
              responsavel: { select: { nome: true } },
            },
          },
          analise: {
            include: {
              responsavel: { select: { nome: true } },
              concluidoPor: { select: { nome: true } },
            },
          },
        },
      });

      if (!ocorrencia) return res.status(404).json({ error: "Relatório não encontrado" });

      const valido = validarTokenAcessoPdf({
        tipo,
        id: ocorrencia.id,
        codigo: ocorrencia.codigo,
        unidade: ocorrencia.unidade,
        token,
      });

      if (!valido) return res.status(403).json({ error: "Token de acesso inválido" });

      const pdfUrl = criarUrlPublicaPdf(req, {
        tipo,
        id: ocorrencia.id,
        codigo: ocorrencia.codigo,
        unidade: ocorrencia.unidade,
      });

      return gerarRelatorioPdf(
        res,
        {
          tipo: "Ocorrência",
          codigo: ocorrencia.codigo,
          assunto: ocorrencia.assunto,
          local: ocorrencia.local,
          natureza: ocorrencia.natureza,
          subNatureza: ocorrencia.subNatureza,
          status: ocorrencia.status,
          data: ocorrencia.dataOcorrencia,
          relatoSeguranca: ocorrencia.relatoSeguranca,
          envolvidos: ocorrencia.envolvidos,
          investigacao: ocorrencia.investigacao,
          analise: ocorrencia.analise,
        },
        usuarioConsultaPublica,
        pdfUrl
      );
    }

    const evento = await prisma.evento.findUnique({
      where: { id },
      include: {
        envolvidos: true,
        analise: {
          include: {
            responsavel: { select: { nome: true } },
            concluidoPor: { select: { nome: true } },
          },
        },
      },
    });

    if (!evento) return res.status(404).json({ error: "Relatório não encontrado" });

    const valido = validarTokenAcessoPdf({
      tipo,
      id: evento.id,
      codigo: evento.codigo,
      unidade: evento.unidade,
      token,
    });

    if (!valido) return res.status(403).json({ error: "Token de acesso inválido" });

    const pdfUrl = criarUrlPublicaPdf(req, {
      tipo,
      id: evento.id,
      codigo: evento.codigo,
      unidade: evento.unidade,
    });

    return gerarRelatorioPdf(
      res,
      {
        tipo: "Evento",
        codigo: evento.codigo,
        assunto: evento.assunto,
        local: evento.local,
        natureza: evento.natureza,
        subNatureza: evento.subNatureza,
        status: evento.status,
        data: evento.dataEvento,
        relatoSeguranca: evento.relatoSeguranca,
        envolvidos: evento.envolvidos,
        analise: evento.analise,
      },
      usuarioConsultaPublica,
      pdfUrl
    );
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro ao gerar PDF público" });
  }
}
