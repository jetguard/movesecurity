import { Response } from "express";
import { prisma } from "../lib/prisma";
import { AuthRequest } from "../middlewares/auth";
import { registrarLog } from "../services/auditoria.service";

function normalizarId(valor: unknown) {
  const numero = Number(valor);
  return Number.isFinite(numero) && numero > 0 ? numero : null;
}

export async function listarPlanosAcao(req: AuthRequest, res: Response) {
  try {
    const planos = await prisma.planoAcaoCorporativo.findMany({
      where: { unidade: req.unidadeAtiva },
      orderBy: { createdAt: "desc" },
      include: { responsavel: { select: { id: true, nome: true, apelido: true } } },
    });
    return res.json(planos);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro ao listar planos de acao" });
  }
}

export async function listarOrigensPlanoAcao(req: AuthRequest, res: Response) {
  try {
    const unidade = req.unidadeAtiva;
    const [ocorrencias, eventos, investigacoes, riscos, analisesEstrategicas] = await Promise.all([
      prisma.ocorrencia.findMany({
        where: { unidade },
        orderBy: { createdAt: "desc" },
        select: { id: true, codigo: true, assunto: true, status: true },
      }),
      prisma.evento.findMany({
        where: { unidade },
        orderBy: { createdAt: "desc" },
        select: { id: true, codigo: true, assunto: true, status: true },
      }),
      prisma.investigacao.findMany({
        where: { unidade },
        orderBy: { createdAt: "desc" },
        select: { id: true, codigo: true, titulo: true, status: true },
      }),
      prisma.analiseRisco.findMany({
        where: { unidade },
        orderBy: { createdAt: "desc" },
        select: { id: true, codigo: true, descricaoRisco: true, nivelRisco: true, status: true },
      }),
      prisma.analiseEstrategica.findMany({
        where: { unidade },
        orderBy: { createdAt: "desc" },
        select: { id: true, codigo: true, titulo: true, tipo: true, status: true },
      }),
    ]);

    return res.json({
      Ocorrencia: ocorrencias.map((item) => ({
        id: item.id,
        codigo: item.codigo,
        titulo: item.assunto,
        status: item.status,
      })),
      Evento: eventos.map((item) => ({
        id: item.id,
        codigo: item.codigo,
        titulo: item.assunto,
        status: item.status,
      })),
      Investigacao: investigacoes.map((item) => ({
        id: item.id,
        codigo: item.codigo || `R.I. ${item.id}`,
        titulo: item.titulo,
        status: item.status,
      })),
      AnaliseRisco: riscos.map((item) => ({
        id: item.id,
        codigo: item.codigo,
        titulo: item.descricaoRisco,
        status: item.status,
        complemento: item.nivelRisco,
      })),
      AnaliseEstrategica: analisesEstrategicas.map((item) => ({
        id: item.id,
        codigo: item.codigo,
        titulo: item.titulo,
        status: item.status,
        complemento: item.tipo,
      })),
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro ao listar registros de origem do plano de acao" });
  }
}

export async function criarPlanoAcao(req: AuthRequest, res: Response) {
  try {
    const { titulo, descricao, prazo } = req.body;
    if (!titulo || !descricao || !prazo) {
      return res.status(400).json({ error: "Informe titulo, descricao e prazo." });
    }

    const ano = new Date().getFullYear();
    const ultimo = await prisma.planoAcaoCorporativo.findFirst({
      where: { ano, unidade: req.unidadeAtiva },
      orderBy: { numero: "desc" },
    });
    const numero = ultimo ? ultimo.numero + 1 : 1;
    const codigo = `PA${String(numero).padStart(4, "0")}/${ano}`;
    const status = req.body.status || "Pendente";

    const plano = await prisma.planoAcaoCorporativo.create({
      data: {
        numero,
        ano,
        codigo,
        titulo,
        unidade: req.unidadeAtiva || "GJA-T1",
        origemModulo: req.body.origemModulo,
        origemId: normalizarId(req.body.origemId),
        prioridade: req.body.prioridade || "Media",
        status,
        percentual: Number(req.body.percentual || 0),
        descricao,
        acaoCorretiva: req.body.acaoCorretiva,
        acaoPreventiva: req.body.acaoPreventiva,
        responsavelId: normalizarId(req.body.responsavelId),
        responsavelNome: req.body.responsavelNome,
        prazo: new Date(prazo),
        concluidoEm: status === "Concluido" ? new Date() : null,
        evidencia: req.body.evidencia,
        comentarios: req.body.comentarios,
      },
      include: { responsavel: { select: { id: true, nome: true, apelido: true } } },
    });

    await registrarLog({ req, acao: `Criacao de plano de acao ${plano.codigo}`, tipoRegistro: "PlanoAcao", registroId: plano.id, dadosNovos: plano });
    return res.status(201).json(plano);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro ao criar plano de acao" });
  }
}

export async function atualizarPlanoAcao(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const anterior = await prisma.planoAcaoCorporativo.findFirst({ where: { id: Number(id), unidade: req.unidadeAtiva } });
    if (!anterior) return res.status(404).json({ error: "Plano de acao nao encontrado" });

    const status = req.body.status || anterior.status;
    const plano = await prisma.planoAcaoCorporativo.update({
      where: { id: Number(id) },
      data: {
        titulo: req.body.titulo,
        origemModulo: req.body.origemModulo,
        origemId: normalizarId(req.body.origemId),
        prioridade: req.body.prioridade,
        status,
        percentual: Number(req.body.percentual || 0),
        descricao: req.body.descricao,
        acaoCorretiva: req.body.acaoCorretiva,
        acaoPreventiva: req.body.acaoPreventiva,
        responsavelId: normalizarId(req.body.responsavelId),
        responsavelNome: req.body.responsavelNome,
        prazo: req.body.prazo ? new Date(req.body.prazo) : anterior.prazo,
        concluidoEm: status === "Concluido" ? new Date() : null,
        evidencia: req.body.evidencia,
        comentarios: req.body.comentarios,
      },
      include: { responsavel: { select: { id: true, nome: true, apelido: true } } },
    });

    await registrarLog({ req, acao: `Atualizacao de plano de acao ${plano.codigo}`, tipoRegistro: "PlanoAcao", registroId: plano.id, dadosAnteriores: anterior, dadosNovos: plano });
    return res.json(plano);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro ao atualizar plano de acao" });
  }
}

