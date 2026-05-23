import { Request, Response } from "express";
import { prisma } from "../lib/prisma";

export async function listarInvestigacoes(req: Request, res: Response) {
  const investigacoes = await prisma.investigacao.findMany({
    orderBy: { createdAt: "desc" },
  });

  return res.json(investigacoes);
}