import { Request, Response } from "express";
import { prisma } from "../lib/prisma";

export async function criarOcorrencia(req: Request, res: Response) {
  try {
    const {
      assunto,
      status,
      dataOcorrencia,
      envolvidos,
    } = req.body;

    const ano = new Date().getFullYear();

    const ultimaOcorrencia = await prisma.ocorrencia.findFirst({
      where: {
        ano,
      },
      orderBy: {
        numero: "desc",
      },
    });

    const proximoNumero = ultimaOcorrencia
      ? ultimaOcorrencia.numero + 1
      : 1;

    const codigo = `${String(proximoNumero).padStart(4, "0")}/${ano}`;

    const ocorrencia = await prisma.ocorrencia.create({
      data: {
        numero: proximoNumero,
        ano,
        codigo,

        assunto,

        status,

        dataOcorrencia: new Date(dataOcorrencia),

        envolvidos: {
          create: envolvidos,
        },
      },

      include: {
        envolvidos: true,
      },
    });

    return res.status(201).json(ocorrencia);

  } catch (error) {
    return res.status(500).json({
      error: "Erro ao criar ocorrência",
    });
  }
}

export async function listarOcorrencias(
  req: Request,
  res: Response
) {
  const ocorrencias = await prisma.ocorrencia.findMany({
    orderBy: {
      createdAt: "desc",
    },

    include: {
      envolvidos: true,
    },
  });

  return res.json(ocorrencias);
}