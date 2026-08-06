import { Response } from "express";
import { prisma } from "../lib/prisma";
import { AuthRequest } from "../middlewares/auth";
import { registrarLog } from "../services/auditoria.service";

function texto(valor: unknown) {
  return String(valor || "").trim();
}

function listaIds(valor: unknown) {
  if (Array.isArray(valor)) {
    return valor
      .map((item) => Number(item))
      .filter((item) => Number.isFinite(item) && item > 0);
  }

  return String(valor || "")
    .split(",")
    .map((item) => Number(item.trim()))
    .filter((item) => Number.isFinite(item) && item > 0);
}

function serializarIds(ids: number[]) {
  return ids.length ? ids.join(",") : null;
}

function idsDaApr(apr: { riscosIds?: string | null }) {
  return listaIds(apr.riscosIds);
}

async function enriquecerAprs(aprs: Array<any>) {
  const ids = Array.from(new Set(aprs.flatMap(idsDaApr)));
  const riscos = ids.length
    ? await prisma.riscoCatalogo.findMany({
        where: { id: { in: ids } },
        select: {
          id: true,
          codigo: true,
          nome: true,
          grauRisco: true,
          tipoRisco: true,
          local: true,
        },
      })
    : [];

  const mapa = new Map(riscos.map((risco) => [risco.id, risco]));
  return aprs.map((apr) => ({
    ...apr,
    riscos: idsDaApr(apr)
      .map((id) => mapa.get(id))
      .filter(Boolean),
  }));
}

export async function listarAprs(req: AuthRequest, res: Response) {
  const aprs = await prisma.aprOperacional.findMany({
    where: { unidade: req.unidadeAtiva },
    include: { aprovacoes: { orderBy: { createdAt: "asc" } } },
    orderBy: { createdAt: "desc" },
  });

  return res.json(await enriquecerAprs(aprs));
}

export async function criarApr(req: AuthRequest, res: Response) {
  try {
    const ano = new Date().getFullYear();
    const ultimo = await prisma.aprOperacional.findFirst({
      where: { ano, unidade: req.unidadeAtiva },
      orderBy: { numero: "desc" },
    });
    const numero = ultimo ? ultimo.numero + 1 : 1;
    const codigo = `APR-${String(numero).padStart(4, "0")}/${ano}`;
    const riscosIds = listaIds(req.body.riscosIds);
    const aprovadores = Array.isArray(req.body.aprovadores)
      ? req.body.aprovadores
      : [];

    if (
      !texto(req.body.atividade) ||
      !texto(req.body.local) ||
      !texto(req.body.perigos) ||
      !texto(req.body.controlesObrigatorios)
    ) {
      return res
        .status(400)
        .json({
          error: "Informe atividade, local, perigos e controles obrigatórios.",
        });
    }

    const apr = await prisma.aprOperacional.create({
      data: {
        numero,
        ano,
        codigo,
        unidade: req.unidadeAtiva || req.body.unidade,
        local: texto(req.body.local),
        area: texto(req.body.area) || null,
        atividade: texto(req.body.atividade),
        descricaoAtividade: texto(req.body.descricaoAtividade),
        dataPrevista: req.body.dataPrevista
          ? new Date(req.body.dataPrevista)
          : null,
        responsavelAtividade: texto(req.body.responsavelAtividade),
        equipeEnvolvida: texto(req.body.equipeEnvolvida) || null,
        empresaTerceira: texto(req.body.empresaTerceira) || null,
        riscosIds: serializarIds(riscosIds),
        perigos: texto(req.body.perigos),
        controlesObrigatorios: texto(req.body.controlesObrigatorios),
        episNecessarios: texto(req.body.episNecessarios) || null,
        permissoesNecessarias: texto(req.body.permissoesNecessarias) || null,
        nivelRisco: texto(req.body.nivelRisco) || "Moderado",
        status: texto(req.body.status) || "Rascunho",
        criadoPorId: req.usuarioId,
        criadoPorNome: texto(req.body.criadoPorNome) || null,
        aprovacoes: {
          create: aprovadores
            .map((nome: unknown) => texto(nome))
            .filter(Boolean)
            .map((usuarioNome: string) => ({
              usuarioNome,
              decisao: "Pendente",
            })),
        },
      },
      include: { aprovacoes: true },
    });

    await registrarLog({
      req,
      acao: "Criação de APR",
      tipoRegistro: "APR",
      registroId: apr.id,
      dadosNovos: apr,
    });
    return res.status(201).json((await enriquecerAprs([apr]))[0]);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro ao criar APR" });
  }
}

export async function atualizarApr(req: AuthRequest, res: Response) {
  try {
    const id = Number(req.params.id);
    const anterior = await prisma.aprOperacional.findFirst({
      where: { id, unidade: req.unidadeAtiva },
      include: { aprovacoes: true },
    });

    if (!anterior) return res.status(404).json({ error: "APR não encontrada" });

    const apr = await prisma.aprOperacional.update({
      where: { id },
      data: {
        local: texto(req.body.local) || anterior.local,
        area: texto(req.body.area) || null,
        atividade: texto(req.body.atividade) || anterior.atividade,
        descricaoAtividade:
          texto(req.body.descricaoAtividade) || anterior.descricaoAtividade,
        dataPrevista: req.body.dataPrevista
          ? new Date(req.body.dataPrevista)
          : null,
        responsavelAtividade:
          texto(req.body.responsavelAtividade) || anterior.responsavelAtividade,
        equipeEnvolvida: texto(req.body.equipeEnvolvida) || null,
        empresaTerceira: texto(req.body.empresaTerceira) || null,
        riscosIds: serializarIds(listaIds(req.body.riscosIds)),
        perigos: texto(req.body.perigos) || anterior.perigos,
        controlesObrigatorios:
          texto(req.body.controlesObrigatorios) ||
          anterior.controlesObrigatorios,
        episNecessarios: texto(req.body.episNecessarios) || null,
        permissoesNecessarias: texto(req.body.permissoesNecessarias) || null,
        nivelRisco: texto(req.body.nivelRisco) || anterior.nivelRisco,
        status: texto(req.body.status) || anterior.status,
      },
      include: { aprovacoes: { orderBy: { createdAt: "asc" } } },
    });

    await registrarLog({
      req,
      acao: "Atualização de APR",
      tipoRegistro: "APR",
      registroId: apr.id,
      dadosAnteriores: anterior,
      dadosNovos: apr,
    });
    return res.json((await enriquecerAprs([apr]))[0]);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro ao atualizar APR" });
  }
}

export async function decidirApr(req: AuthRequest, res: Response) {
  try {
    const id = Number(req.params.id);
    const decisao = texto(req.body.decisao);
    if (!["Aprovado", "Reprovado"].includes(decisao)) {
      return res.status(400).json({ error: "Decisão inválida" });
    }

    const apr = await prisma.aprOperacional.findFirst({
      where: { id, unidade: req.unidadeAtiva },
      include: { aprovacoes: true },
    });

    if (!apr) return res.status(404).json({ error: "APR não encontrada" });

    const usuario = await prisma.usuario.findUnique({
      where: { id: req.usuarioId },
      select: { nome: true, perfilAcesso: true },
    });

    const aprovacaoExistente = apr.aprovacoes.find(
      (item) =>
        item.usuarioId === req.usuarioId || item.usuarioNome === usuario?.nome,
    );
    if (aprovacaoExistente) {
      await prisma.aprAprovacao.update({
        where: { id: aprovacaoExistente.id },
        data: {
          usuarioId: req.usuarioId,
          usuarioNome: usuario?.nome || aprovacaoExistente.usuarioNome,
          perfilAcesso:
            usuario?.perfilAcesso ||
            req.usuarioPerfil ||
            aprovacaoExistente.perfilAcesso,
          decisao,
          observacao: texto(req.body.observacao) || null,
          decididoEm: new Date(),
        },
      });
    } else {
      await prisma.aprAprovacao.create({
        data: {
          aprId: apr.id,
          usuarioId: req.usuarioId,
          usuarioNome: usuario?.nome || "Usuário",
          perfilAcesso: usuario?.perfilAcesso || req.usuarioPerfil,
          decisao,
          observacao: texto(req.body.observacao) || null,
          decididoEm: new Date(),
        },
      });
    }

    const atualizada = await prisma.aprOperacional.findUnique({
      where: { id: apr.id },
      include: { aprovacoes: { orderBy: { createdAt: "asc" } } },
    });

    const aprovacoes = atualizada?.aprovacoes || [];
    const novoStatus = aprovacoes.some((item) => item.decisao === "Reprovado")
      ? "Reprovada"
      : aprovacoes.length &&
          aprovacoes.every((item) => item.decisao === "Aprovado")
        ? "Aprovada"
        : "Aguardando aprovação";

    const aprFinal = await prisma.aprOperacional.update({
      where: { id: apr.id },
      data: { status: novoStatus },
      include: { aprovacoes: { orderBy: { createdAt: "asc" } } },
    });

    await registrarLog({
      req,
      acao: `${decisao} APR`,
      tipoRegistro: "APR",
      registroId: apr.id,
      dadosNovos: aprFinal,
    });
    return res.json((await enriquecerAprs([aprFinal]))[0]);
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ error: "Erro ao registrar aprovação da APR" });
  }
}
