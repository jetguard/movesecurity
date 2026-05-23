import { Request, Response } from "express";
import { prisma } from "../lib/prisma";

export async function criarEvento(req: Request, res: Response) {
  try {
    const {
      assunto,
      status,
      dataEvento,
      envolvidos,
    } = req.body;

    const ano = new Date().getFullYear();

    const ultimoEvento = await prisma.evento.findFirst({
      where: { ano },
      orderBy: { numero: "desc" },
    });

    const proximoNumero = ultimoEvento ? ultimoEvento.numero + 1 : 1;

    const codigo = `${String(proximoNumero).padStart(4, "0")}/${ano}`;

    const evento = await prisma.evento.create({
      data: {
        numero: proximoNumero,
        ano,
        codigo,
        assunto,
        status,
        dataEvento: new Date(dataEvento),
        envolvidos: {
          create: envolvidos,
        },
      },
      include: {
        envolvidos: true,
      },
    });

    return res.status(201).json(evento);
  } catch (error) {
    return res.status(500).json({
      error: "Erro ao criar evento",
    });
  }
}

export async function listarEventos(req: Request, res: Response) {
  try {
    const eventos = await prisma.evento.findMany({
      orderBy: {
        createdAt: "desc",
      },
      include: {
        envolvidos: true,
      },
    });

    return res.json(eventos);
  } catch (error) {
    return res.status(500).json({
      error: "Erro ao listar eventos",
    });
  }
}