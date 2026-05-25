import { Response } from "express";
import { prisma } from "../lib/prisma";
import { AuthRequest } from "../middlewares/auth";
import { registrarLog } from "../services/auditoria.service";

const colunasPadrao = [
  "A Fazer",
  "Em Andamento",
  "Em Analise",
  "Aguardando Terceiros",
  "Concluido",
];

async function garantirColunas(unidade: string) {
  const total = await prisma.planejamentoColuna.count({ where: { unidade } });

  if (total > 0) return;

  await prisma.planejamentoColuna.createMany({
    data: colunasPadrao.map((titulo, index) => ({
      titulo,
      unidade,
      ordem: index,
    })),
  });
}

function unidadeAtual(req: AuthRequest) {
  return req.unidadeAtiva || req.usuarioUnidade || "GJA-T1";
}

export async function listarPlanejamento(req: AuthRequest, res: Response) {
  try {
    const unidade = unidadeAtual(req);
    await garantirColunas(unidade);

    const [colunas, usuarios] = await Promise.all([
      prisma.planejamentoColuna.findMany({
        where: { unidade },
        orderBy: { ordem: "asc" },
        include: {
          cards: {
            where: { status: { not: "Arquivado" } },
            orderBy: { ordem: "asc" },
            include: {
              responsavel: {
                select: {
                  id: true,
                  nome: true,
                  apelido: true,
                  fotoPerfil: true,
                },
              },
              criadoPor: {
                select: {
                  id: true,
                  nome: true,
                  apelido: true,
                },
              },
            },
          },
        },
      }),
      prisma.usuario.findMany({
        where: {
          statusUsuario: "ATIVO",
          OR: [
            { unidade },
            { unidade: null },
          ],
        },
        orderBy: { nome: "asc" },
        select: {
          id: true,
          nome: true,
          apelido: true,
          cargo: true,
          unidade: true,
        },
      }),
    ]);

    return res.json({ colunas, usuarios, unidade });
  } catch (error) {
    return res.status(500).json({ error: "Erro ao listar planejamento" });
  }
}

export async function criarColuna(req: AuthRequest, res: Response) {
  try {
    const unidade = unidadeAtual(req);
    const { titulo } = req.body;

    if (!titulo) {
      return res.status(400).json({ error: "Informe o titulo da coluna." });
    }

    const ultima = await prisma.planejamentoColuna.findFirst({
      where: { unidade },
      orderBy: { ordem: "desc" },
    });

    const coluna = await prisma.planejamentoColuna.create({
      data: {
        titulo,
        unidade,
        ordem: (ultima?.ordem || 0) + 1,
      },
    });

    await registrarLog({
      req,
      acao: "Criacao de coluna de planejamento",
      tipoRegistro: "Planejamento",
      registroId: coluna.id,
      dadosNovos: coluna,
    });

    return res.status(201).json(coluna);
  } catch (error) {
    return res.status(500).json({ error: "Erro ao criar coluna" });
  }
}

export async function atualizarColuna(req: AuthRequest, res: Response) {
  try {
    const id = Number(req.params.id);
    const { titulo } = req.body;
    const anterior = await prisma.planejamentoColuna.findUnique({ where: { id } });

    if (!anterior || anterior.unidade !== unidadeAtual(req)) {
      return res.status(404).json({ error: "Coluna nao encontrada." });
    }

    const coluna = await prisma.planejamentoColuna.update({
      where: { id },
      data: { titulo: titulo || anterior.titulo },
    });

    await registrarLog({
      req,
      acao: "Atualizacao de coluna de planejamento",
      tipoRegistro: "Planejamento",
      registroId: coluna.id,
      dadosAnteriores: anterior,
      dadosNovos: coluna,
    });

    return res.json(coluna);
  } catch (error) {
    return res.status(500).json({ error: "Erro ao atualizar coluna" });
  }
}

export async function reordenarColunas(req: AuthRequest, res: Response) {
  try {
    const unidade = unidadeAtual(req);
    const { colunas } = req.body as { colunas: number[] };

    if (!Array.isArray(colunas)) {
      return res.status(400).json({ error: "Ordem das colunas invalida." });
    }

    await prisma.$transaction(
      colunas.map((id, ordem) =>
        prisma.planejamentoColuna.updateMany({
          where: { id: Number(id), unidade },
          data: { ordem },
        })
      )
    );

    await registrarLog({
      req,
      acao: "Reordenacao de colunas de planejamento",
      tipoRegistro: "Planejamento",
      dadosNovos: { colunas, unidade },
    });

    return res.json({ ok: true });
  } catch (error) {
    return res.status(500).json({ error: "Erro ao reordenar colunas" });
  }
}

export async function criarCard(req: AuthRequest, res: Response) {
  try {
    const unidade = unidadeAtual(req);
    const {
      titulo,
      descricao,
      prioridade,
      prazo,
      setor,
      local,
      responsavelId,
      colunaId,
      moduloVinculado,
      registroId,
      codigoRegistro,
    } = req.body;

    if (!titulo || !colunaId) {
      return res.status(400).json({ error: "Informe o titulo e a coluna do card." });
    }

    const coluna = await prisma.planejamentoColuna.findUnique({ where: { id: Number(colunaId) } });
    if (!coluna || coluna.unidade !== unidade) {
      return res.status(404).json({ error: "Coluna nao encontrada." });
    }

    const ultimo = await prisma.planejamentoCard.findFirst({
      where: { colunaId: coluna.id },
      orderBy: { ordem: "desc" },
    });

    const card = await prisma.planejamentoCard.create({
      data: {
        titulo,
        descricao,
        prioridade: prioridade || "Media",
        prazo: prazo ? new Date(prazo) : undefined,
        unidade,
        setor,
        local,
        responsavelId: responsavelId ? Number(responsavelId) : undefined,
        colunaId: coluna.id,
        moduloVinculado,
        registroId: registroId ? Number(registroId) : undefined,
        codigoRegistro,
        ordem: (ultimo?.ordem || 0) + 1,
        criadoPorId: req.usuarioId!,
      },
      include: {
        responsavel: true,
        criadoPor: true,
      },
    });

    await registrarLog({
      req,
      acao: "Criacao de card de planejamento",
      tipoRegistro: "Planejamento",
      registroId: card.id,
      dadosNovos: card,
    });

    return res.status(201).json(card);
  } catch (error) {
    return res.status(500).json({ error: "Erro ao criar card" });
  }
}

export async function atualizarCard(req: AuthRequest, res: Response) {
  try {
    const id = Number(req.params.id);
    const anterior = await prisma.planejamentoCard.findUnique({ where: { id } });

    if (!anterior || anterior.unidade !== unidadeAtual(req)) {
      return res.status(404).json({ error: "Card nao encontrado." });
    }

    const {
      titulo,
      descricao,
      prioridade,
      prazo,
      setor,
      local,
      responsavelId,
      status,
    } = req.body;

    const card = await prisma.planejamentoCard.update({
      where: { id },
      data: {
        titulo: titulo ?? anterior.titulo,
        descricao,
        prioridade: prioridade ?? anterior.prioridade,
        prazo: prazo ? new Date(prazo) : null,
        setor,
        local,
        responsavelId: responsavelId ? Number(responsavelId) : null,
        status: status ?? anterior.status,
      },
      include: {
        responsavel: true,
        criadoPor: true,
      },
    });

    await registrarLog({
      req,
      acao: "Atualizacao de card de planejamento",
      tipoRegistro: "Planejamento",
      registroId: card.id,
      dadosAnteriores: anterior,
      dadosNovos: card,
    });

    return res.json(card);
  } catch (error) {
    return res.status(500).json({ error: "Erro ao atualizar card" });
  }
}

export async function moverCard(req: AuthRequest, res: Response) {
  try {
    const id = Number(req.params.id);
    const { colunaId, ordem } = req.body;
    const anterior = await prisma.planejamentoCard.findUnique({ where: { id } });
    const coluna = await prisma.planejamentoColuna.findUnique({ where: { id: Number(colunaId) } });

    if (!anterior || !coluna || anterior.unidade !== unidadeAtual(req) || coluna.unidade !== unidadeAtual(req)) {
      return res.status(404).json({ error: "Card ou coluna nao encontrado." });
    }

    const card = await prisma.planejamentoCard.update({
      where: { id },
      data: {
        colunaId: coluna.id,
        ordem: Number(ordem || 0),
      },
    });

    await registrarLog({
      req,
      acao: "Movimentacao de card de planejamento",
      tipoRegistro: "Planejamento",
      registroId: card.id,
      dadosAnteriores: anterior,
      dadosNovos: card,
    });

    return res.json(card);
  } catch (error) {
    return res.status(500).json({ error: "Erro ao mover card" });
  }
}

export async function arquivarCard(req: AuthRequest, res: Response) {
  try {
    const id = Number(req.params.id);
    const anterior = await prisma.planejamentoCard.findUnique({ where: { id } });

    if (!anterior || anterior.unidade !== unidadeAtual(req)) {
      return res.status(404).json({ error: "Card nao encontrado." });
    }

    const card = await prisma.planejamentoCard.update({
      where: { id },
      data: { status: "Arquivado" },
    });

    await registrarLog({
      req,
      acao: "Arquivamento de card de planejamento",
      tipoRegistro: "Planejamento",
      registroId: card.id,
      dadosAnteriores: anterior,
      dadosNovos: card,
    });

    return res.json(card);
  } catch (error) {
    return res.status(500).json({ error: "Erro ao arquivar card" });
  }
}
