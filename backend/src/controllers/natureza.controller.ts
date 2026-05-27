import { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { registrarLog } from "../services/auditoria.service";

export async function listarNaturezas(req: Request, res: Response) {
  try {
    const naturezas = await prisma.natureza.findMany({
      orderBy: {
        nome: "asc",
      },
      include: {
        subNaturezas: {
          orderBy: {
            nome: "asc",
          },
        },
      },
    });

    return res.json(naturezas);
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: "Erro ao listar naturezas",
    });
  }
}

export async function criarNatureza(req: Request, res: Response) {
  try {
    const { nome } = req.body;
    const nomeFormatado = String(nome || "").trim();

    if (!nomeFormatado) {
      return res.status(400).json({
        error: "Informe o nome da natureza.",
      });
    }

    const natureza = await prisma.natureza.create({
      data: {
        nome: nomeFormatado,
      },
      include: {
        subNaturezas: true,
      },
    });

    await registrarLog({
      req,
      acao: "Criação de natureza",
      tipoRegistro: "Natureza",
      registroId: natureza.id,
      dadosNovos: natureza,
    });

    return res.status(201).json(natureza);
  } catch (error: any) {
    if (error?.code === "P2002") {
      return res.status(400).json({
        error: "Natureza já cadastrada.",
      });
    }

    console.error(error);

    return res.status(500).json({
      error: "Erro ao cadastrar natureza",
    });
  }
}

export async function atualizarNatureza(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { nome } = req.body;
    const nomeFormatado = String(nome || "").trim();

    if (!nomeFormatado) {
      return res.status(400).json({
        error: "Informe o nome da natureza.",
      });
    }

    const anterior = await prisma.natureza.findUnique({
      where: { id: Number(id) },
      include: { subNaturezas: true },
    });

    if (!anterior) {
      return res.status(404).json({
        error: "Natureza não encontrada.",
      });
    }

    const natureza = await prisma.natureza.update({
      where: { id: Number(id) },
      data: { nome: nomeFormatado },
      include: { subNaturezas: true },
    });

    await registrarLog({
      req,
      acao: "Atualização de natureza",
      tipoRegistro: "Natureza",
      registroId: natureza.id,
      dadosAnteriores: anterior,
      dadosNovos: natureza,
    });

    return res.json(natureza);
  } catch (error: any) {
    if (error?.code === "P2002") {
      return res.status(400).json({
        error: "Natureza já cadastrada.",
      });
    }

    console.error(error);

    return res.status(500).json({
      error: "Erro ao atualizar natureza",
    });
  }
}

export async function excluirNatureza(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const anterior = await prisma.natureza.findUnique({
      where: { id: Number(id) },
      include: { subNaturezas: true },
    });

    if (!anterior) {
      return res.status(404).json({
        error: "Natureza não encontrada.",
      });
    }

    await prisma.natureza.delete({
      where: { id: Number(id) },
    });

    await registrarLog({
      req,
      acao: "Exclusão de natureza",
      tipoRegistro: "Natureza",
      registroId: anterior.id,
      dadosAnteriores: anterior,
    });

    return res.status(204).send();
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: "Erro ao excluir natureza",
    });
  }
}

export async function criarSubNatureza(req: Request, res: Response) {
  try {
    const { naturezaId } = req.params;
    const { nome } = req.body;
    const nomeFormatado = String(nome || "").trim();

    if (!nomeFormatado) {
      return res.status(400).json({
        error: "Informe o nome da subnatureza.",
      });
    }

    const subNatureza = await prisma.subNatureza.create({
      data: {
        nome: nomeFormatado,
        naturezaId: Number(naturezaId),
      },
    });

    await registrarLog({
      req,
      acao: "Criação de subnatureza",
      tipoRegistro: "Natureza",
      registroId: subNatureza.naturezaId,
      dadosNovos: subNatureza,
    });

    return res.status(201).json(subNatureza);
  } catch (error: any) {
    if (error?.code === "P2002") {
      return res.status(400).json({
        error: "Subnatureza já cadastrada para esta natureza.",
      });
    }

    if (error?.code === "P2003") {
      return res.status(404).json({
        error: "Natureza não encontrada.",
      });
    }

    console.error(error);

    return res.status(500).json({
      error: "Erro ao cadastrar subnatureza",
    });
  }
}

export async function atualizarSubNatureza(req: Request, res: Response) {
  try {
    const { subNaturezaId } = req.params;
    const { nome } = req.body;
    const nomeFormatado = String(nome || "").trim();

    if (!nomeFormatado) {
      return res.status(400).json({
        error: "Informe o nome da subnatureza.",
      });
    }

    const anterior = await prisma.subNatureza.findUnique({
      where: { id: Number(subNaturezaId) },
    });

    if (!anterior) {
      return res.status(404).json({
        error: "Subnatureza não encontrada.",
      });
    }

    const subNatureza = await prisma.subNatureza.update({
      where: { id: Number(subNaturezaId) },
      data: { nome: nomeFormatado },
    });

    await registrarLog({
      req,
      acao: "Atualização de subnatureza",
      tipoRegistro: "Natureza",
      registroId: subNatureza.naturezaId,
      dadosAnteriores: anterior,
      dadosNovos: subNatureza,
    });

    return res.json(subNatureza);
  } catch (error: any) {
    if (error?.code === "P2002") {
      return res.status(400).json({
        error: "Subnatureza já cadastrada para esta natureza.",
      });
    }

    console.error(error);

    return res.status(500).json({
      error: "Erro ao atualizar subnatureza",
    });
  }
}

export async function excluirSubNatureza(req: Request, res: Response) {
  try {
    const { subNaturezaId } = req.params;
    const anterior = await prisma.subNatureza.findUnique({
      where: { id: Number(subNaturezaId) },
    });

    if (!anterior) {
      return res.status(404).json({
        error: "Subnatureza não encontrada.",
      });
    }

    await prisma.subNatureza.delete({
      where: { id: Number(subNaturezaId) },
    });

    await registrarLog({
      req,
      acao: "Exclusão de subnatureza",
      tipoRegistro: "Natureza",
      registroId: anterior.naturezaId,
      dadosAnteriores: anterior,
    });

    return res.status(204).send();
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: "Erro ao excluir subnatureza",
    });
  }
}
