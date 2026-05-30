import { Response } from "express";
import { prisma } from "../lib/prisma";
import { AuthRequest } from "../middlewares/auth";
import { registrarLog } from "../services/auditoria.service";
import { gerarRiscoPdf } from "../services/riscoPdf.service";

const valores = { Baixa: 1, Média: 2, Alta: 3, Crítica: 4 } as Record<string, number>;

function calcularNivel(probabilidade: string, severidade: string) {
  const score = (valores[probabilidade] || 1) * (valores[severidade] || 1);
  if (score <= 3) return "Baixo";
  if (score <= 7) return "Moderado";
  if (score <= 11) return "Alto";
  return "Crítico";
}

function normalizarId(valor: unknown) {
  const numero = Number(valor);
  return Number.isFinite(numero) && numero > 0 ? numero : null;
}

function normalizarCodigo(valor: unknown) {
  return String(valor || "").trim().toUpperCase();
}

export async function buscarVinculoRisco(req: AuthRequest, res: Response) {
  try {
    const ocorrenciaCodigo = normalizarCodigo(req.query.ocorrenciaCodigo || req.query.ocorrencia);
    const eventoCodigo = normalizarCodigo(req.query.eventoCodigo || req.query.evento);
    const investigacaoCodigo = normalizarCodigo(req.query.investigacaoCodigo || req.query.investigacao);

    if (!ocorrenciaCodigo && !eventoCodigo && !investigacaoCodigo) {
      return res.status(400).json({ error: "Informe o número da ocorrência, evento ou investigação." });
    }

    if (investigacaoCodigo) {
      const investigacao = await prisma.investigacao.findFirst({
        where: {
          unidade: req.unidadeAtiva,
          OR: [
            { codigo: { equals: investigacaoCodigo } },
            { numeroOcorrencia: { equals: investigacaoCodigo } },
          ],
        },
        include: {
          ocorrencia: {
            select: { id: true, codigo: true, assunto: true, local: true, natureza: true, subNatureza: true },
          },
        },
      });

      if (!investigacao) return res.status(404).json({ error: "Investigação não encontrada para esta unidade." });

      return res.json({
        origem: "Investigação",
        codigo: investigacao.codigo || investigacao.numeroOcorrencia,
        titulo: investigacao.titulo || investigacao.assunto,
        assunto: investigacao.assunto,
        local: investigacao.local,
        natureza: investigacao.natureza,
        subNatureza: investigacao.subNatureza,
        status: investigacao.status,
        ocorrenciaId: investigacao.ocorrenciaId,
        investigacaoId: investigacao.id,
        ocorrenciaCodigo: investigacao.numeroOcorrencia,
        investigacaoCodigo: investigacao.codigo || investigacao.numeroOcorrencia,
        resumo: investigacao.descricaoInvestigacao || investigacao.ocorrencia?.assunto || "",
      });
    }

    if (ocorrenciaCodigo) {
      const ocorrencia = await prisma.ocorrencia.findFirst({
        where: { unidade: req.unidadeAtiva, codigo: { equals: ocorrenciaCodigo } },
        include: {
          investigacao: { select: { id: true, codigo: true, status: true } },
        },
      });

      if (!ocorrencia) return res.status(404).json({ error: "Ocorrência não encontrada para esta unidade." });

      return res.json({
        origem: "Ocorrência",
        codigo: ocorrencia.codigo,
        titulo: ocorrencia.assunto,
        assunto: ocorrencia.assunto,
        local: ocorrencia.local,
        natureza: ocorrencia.natureza,
        subNatureza: ocorrencia.subNatureza,
        status: ocorrencia.status,
        ocorrenciaId: ocorrencia.id,
        investigacaoId: ocorrencia.investigacao?.id || null,
        ocorrenciaCodigo: ocorrencia.codigo,
        investigacaoCodigo: ocorrencia.investigacao?.codigo || null,
        resumo: ocorrencia.relatoSeguranca || "",
      });
    }

    if (eventoCodigo) {
      const evento = await prisma.evento.findFirst({
        where: { unidade: req.unidadeAtiva, codigo: { equals: eventoCodigo } },
      });

      if (!evento) return res.status(404).json({ error: "Evento não encontrado para esta unidade." });

      return res.json({
        origem: "Evento",
        codigo: evento.codigo,
        titulo: evento.assunto,
        assunto: evento.assunto,
        local: evento.local,
        natureza: evento.natureza,
        subNatureza: evento.subNatureza,
        status: evento.status,
        eventoId: evento.id,
        eventoCodigo: evento.codigo,
        resumo: evento.relatoSeguranca || "",
      });
    }

    return res.status(400).json({ error: "Vínculo inválido." });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro ao buscar dados vinculados" });
  }
}

async function resolverVinculos(req: AuthRequest) {
  const ocorrenciaValor = normalizarCodigo(req.body.ocorrenciaId || req.body.ocorrenciaCodigo);
  const eventoValor = normalizarCodigo(req.body.eventoId || req.body.eventoCodigo);
  const investigacaoValor = normalizarCodigo(req.body.investigacaoId || req.body.investigacaoCodigo);

  const [ocorrencia, evento, investigacao] = await Promise.all([
    ocorrenciaValor && Number.isNaN(Number(ocorrenciaValor))
      ? prisma.ocorrencia.findFirst({ where: { codigo: ocorrenciaValor, unidade: req.unidadeAtiva }, select: { id: true } })
      : null,
    eventoValor && Number.isNaN(Number(eventoValor))
      ? prisma.evento.findFirst({ where: { codigo: eventoValor, unidade: req.unidadeAtiva }, select: { id: true } })
      : null,
    investigacaoValor && Number.isNaN(Number(investigacaoValor))
      ? prisma.investigacao.findFirst({ where: { codigo: investigacaoValor, unidade: req.unidadeAtiva }, select: { id: true } })
      : null,
  ]);

  return {
    ocorrenciaId: ocorrencia?.id || normalizarId(req.body.ocorrenciaId),
    eventoId: evento?.id || normalizarId(req.body.eventoId),
    investigacaoId: investigacao?.id || normalizarId(req.body.investigacaoId),
  };
}

function includeRisco() {
  return {
    responsavel: { select: { id: true, nome: true, apelido: true } },
    responsavelAcao: { select: { id: true, nome: true, apelido: true } },
    ocorrencia: { select: { id: true, codigo: true, assunto: true } },
    evento: { select: { id: true, codigo: true, assunto: true } },
    investigacao: { select: { id: true, numeroOcorrencia: true, titulo: true } },
    fotos: true,
  };
}

export async function listarRiscos(req: AuthRequest, res: Response) {
  const riscos = await prisma.analiseRisco.findMany({
    where: { unidade: req.unidadeAtiva },
    orderBy: { createdAt: "desc" },
    include: includeRisco(),
  });

  return res.json(riscos);
}

export async function criarRisco(req: AuthRequest, res: Response) {
  try {
    const arquivos = (req.files as Express.Multer.File[]) || [];
    const ano = new Date().getFullYear();
    const ultimo = await prisma.analiseRisco.findFirst({
      where: { ano, unidade: req.unidadeAtiva },
      orderBy: { numero: "desc" },
    });
    const numero = ultimo ? ultimo.numero + 1 : 1;
    const codigo = `AR${String(numero).padStart(3, "0")}/${ano}`;
    const nivelRisco = calcularNivel(req.body.probabilidade, req.body.severidade);
    const vinculos = await resolverVinculos(req);

    const risco = await prisma.analiseRisco.create({
      data: {
        numero,
        ano,
        codigo,
        dataHora: new Date(req.body.dataHora),
        responsavelId: req.usuarioId!,
        unidade: req.unidadeAtiva || req.body.unidade,
        setor: req.body.setor,
        local: req.body.local,
        tipoRisco: req.body.tipoRisco,
        naturezaRisco: req.body.naturezaRisco,
        descricaoRisco: req.body.descricaoRisco,
        possivelImpacto: req.body.possivelImpacto,
        probabilidade: req.body.probabilidade,
        severidade: req.body.severidade,
        nivelRisco,
        medidasPreventivas: req.body.medidasPreventivas,
        planoAcao: req.body.planoAcao,
        responsavelAcaoId: normalizarId(req.body.responsavelAcaoId),
        responsavelAcaoNome: req.body.responsavelAcaoNome,
        prazo: new Date(req.body.prazo),
        status: req.body.status || "Pendente",
        ocorrenciaId: vinculos.ocorrenciaId,
        eventoId: vinculos.eventoId,
        investigacaoId: vinculos.investigacaoId,
        fotos: {
          create: arquivos.map((arquivo) => ({
            nomeOriginal: arquivo.originalname,
            nomeArquivo: arquivo.filename,
            caminho: arquivo.path,
            tipo: arquivo.mimetype,
          })),
        },
      },
      include: includeRisco(),
    });

    await registrarLog({
      req,
      acao: "Criação de análise de risco",
      tipoRegistro: "AnaliseRisco",
      registroId: risco.id,
      dadosNovos: risco,
    });

    return res.status(201).json(risco);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro ao criar análise de risco" });
  }
}

export async function atualizarRisco(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const anterior = await prisma.analiseRisco.findFirst({
      where: { id: Number(id), unidade: req.unidadeAtiva },
      include: includeRisco(),
    });

    if (!anterior) return res.status(404).json({ error: "Análise de risco não encontrada" });

    const nivelRisco = calcularNivel(req.body.probabilidade, req.body.severidade);
    const vinculos = await resolverVinculos(req);
    const risco = await prisma.analiseRisco.update({
      where: { id: Number(id) },
      data: {
        dataHora: new Date(req.body.dataHora),
        unidade: req.unidadeAtiva || anterior.unidade,
        setor: req.body.setor,
        local: req.body.local,
        tipoRisco: req.body.tipoRisco,
        naturezaRisco: req.body.naturezaRisco,
        descricaoRisco: req.body.descricaoRisco,
        possivelImpacto: req.body.possivelImpacto,
        probabilidade: req.body.probabilidade,
        severidade: req.body.severidade,
        nivelRisco,
        medidasPreventivas: req.body.medidasPreventivas,
        planoAcao: req.body.planoAcao,
        responsavelAcaoId: normalizarId(req.body.responsavelAcaoId),
        responsavelAcaoNome: req.body.responsavelAcaoNome,
        prazo: new Date(req.body.prazo),
        status: req.body.status,
        ocorrenciaId: vinculos.ocorrenciaId,
        eventoId: vinculos.eventoId,
        investigacaoId: vinculos.investigacaoId,
      },
      include: includeRisco(),
    });

    await registrarLog({
      req,
      acao: risco.status === "Concluído" ? "Conclusão de análise de risco" : "Atualização de análise de risco",
      tipoRegistro: "AnaliseRisco",
      registroId: risco.id,
      dadosAnteriores: anterior,
      dadosNovos: risco,
    });

    return res.json(risco);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro ao atualizar análise de risco" });
  }
}

export async function gerarPdfRisco(req: AuthRequest, res: Response) {
  const risco = await prisma.analiseRisco.findFirst({
    where: { id: Number(req.params.id), unidade: req.unidadeAtiva },
    include: { responsavel: { select: { nome: true } } },
  });

  if (!risco) return res.status(404).json({ error: "Análise de risco não encontrada" });
  return gerarRiscoPdf(res, risco);
}

