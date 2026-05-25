import { Response } from "express";
import { prisma } from "../lib/prisma";
import { AuthRequest } from "../middlewares/auth";
import { registrarLog } from "../services/auditoria.service";

const TIPOS_LOCAL = ["Operacional", "Administrativo", "Acesso", "Armazenagem", "Segurança", "Outro"];
const STATUS_LOCAL = ["Ativo", "Inativo"];

function nomeMaiusculo(nome: unknown) {
  return String(nome || "").trim().toLocaleUpperCase("pt-BR");
}

function validarTipo(tipo: unknown) {
  const tipoFormatado = String(tipo || "").trim();
  return TIPOS_LOCAL.includes(tipoFormatado) ? tipoFormatado : "Outro";
}

function validarStatus(status: unknown) {
  const statusFormatado = String(status || "").trim();
  return STATUS_LOCAL.includes(statusFormatado) ? statusFormatado : "Ativo";
}

export async function listarLocais(req: AuthRequest, res: Response) {
  try {
    const somenteAtivos = req.query.status === "ativo";

    const locais = await prisma.localTerminal.findMany({
      where: {
        unidade: req.unidadeAtiva,
        ...(somenteAtivos ? { status: "Ativo" } : {}),
      },
      orderBy: [{ areaSensivel: "desc" }, { nome: "asc" }],
    });

    return res.json(locais);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro ao listar locais" });
  }
}

export async function criarLocal(req: AuthRequest, res: Response) {
  try {
    const nome = nomeMaiusculo(req.body.nome);
    if (!nome) {
      return res.status(400).json({ error: "Informe o nome do local." });
    }

    const local = await prisma.localTerminal.create({
      data: {
        nome,
        descricao: req.body.descricao || null,
        tipo: validarTipo(req.body.tipo),
        areaSensivel: Boolean(req.body.areaSensivel),
        status: validarStatus(req.body.status),
        unidade: req.unidadeAtiva || "GJA-T1",
      },
    });

    await registrarLog({
      req,
      acao: `Cadastro do local ${local.nome}`,
      tipoRegistro: "LocalTerminal",
      registroId: local.id,
      dadosNovos: local,
    });

    return res.status(201).json(local);
  } catch (error: any) {
    if (error?.code === "P2002") {
      return res.status(400).json({ error: "Já existe um local cadastrado com este nome nesta unidade." });
    }

    console.error(error);
    return res.status(500).json({ error: "Erro ao cadastrar local" });
  }
}

export async function atualizarLocal(req: AuthRequest, res: Response) {
  try {
    const anterior = await prisma.localTerminal.findFirst({
      where: {
        id: Number(req.params.id),
        unidade: req.unidadeAtiva,
      },
    });

    if (!anterior) {
      return res.status(404).json({ error: "Local não encontrado" });
    }

    const nome = nomeMaiusculo(req.body.nome);
    if (!nome) {
      return res.status(400).json({ error: "Informe o nome do local." });
    }

    const local = await prisma.localTerminal.update({
      where: { id: anterior.id },
      data: {
        nome,
        descricao: req.body.descricao || null,
        tipo: validarTipo(req.body.tipo),
        areaSensivel: Boolean(req.body.areaSensivel),
        status: validarStatus(req.body.status),
      },
    });

    await registrarLog({
      req,
      acao: `Atualização do local ${local.nome}`,
      tipoRegistro: "LocalTerminal",
      registroId: local.id,
      dadosAnteriores: anterior,
      dadosNovos: local,
    });

    return res.json(local);
  } catch (error: any) {
    if (error?.code === "P2002") {
      return res.status(400).json({ error: "Já existe um local cadastrado com este nome nesta unidade." });
    }

    console.error(error);
    return res.status(500).json({ error: "Erro ao atualizar local" });
  }
}

export async function excluirLocal(req: AuthRequest, res: Response) {
  try {
    const local = await prisma.localTerminal.findFirst({
      where: {
        id: Number(req.params.id),
        unidade: req.unidadeAtiva,
      },
    });

    if (!local) {
      return res.status(404).json({ error: "Local não encontrado" });
    }

    await prisma.localTerminal.delete({ where: { id: local.id } });

    await registrarLog({
      req,
      acao: `Exclusão do local ${local.nome}`,
      tipoRegistro: "LocalTerminal",
      registroId: local.id,
      dadosAnteriores: local,
    });

    return res.status(204).send();
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro ao excluir local" });
  }
}
