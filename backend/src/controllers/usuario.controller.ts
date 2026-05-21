import { Request, Response } from "express";
import { prisma } from "../lib/prisma";

export async function listarUsuarios(req: Request, res: Response) {
  const usuarios = await prisma.usuario.findMany({
    select: {
      id: true,
      nome: true,
      email: true,
      createdAt: true,
    },
  });

  return res.json(usuarios);
}