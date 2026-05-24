import { Request, Response } from "express";
import { prisma } from "../lib/prisma";

export async function listarLogs(req: Request, res: Response) {
  try {
    const logs = await prisma.logAuditoria.findMany({
      orderBy: {
        createdAt: "desc",
      },
      take: 200,
    });

    return res.json(logs);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro ao listar logs" });
  }
}

