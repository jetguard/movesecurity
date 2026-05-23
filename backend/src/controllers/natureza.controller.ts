import { Request, Response } from "express";
import { prisma } from "../lib/prisma";

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
