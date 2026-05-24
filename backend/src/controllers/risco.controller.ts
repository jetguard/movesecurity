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
        ocorrenciaId: normalizarId(req.body.ocorrenciaId),
        eventoId: normalizarId(req.body.eventoId),
        investigacaoId: normalizarId(req.body.investigacaoId),
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
        ocorrenciaId: normalizarId(req.body.ocorrenciaId),
        eventoId: normalizarId(req.body.eventoId),
        investigacaoId: normalizarId(req.body.investigacaoId),
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

