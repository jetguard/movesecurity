import { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { AuthRequest } from "../middlewares/auth";
import { gerarRelatorioPdf } from "../services/relatorioPdf.service";

export async function criarEvento(req: Request, res: Response) {
  try {
    const {
      assunto,
      local,
      natureza,
      subNatureza,
      status = "ABERTO",
      dataEvento,
      relatoSeguranca,
      envolvidos,
    } = req.body;

    const arquivos = (req.files as Express.Multer.File[]) || [];

    const envolvidosFormatados =
      typeof envolvidos === "string" ? JSON.parse(envolvidos) : envolvidos;

    if (!assunto || !local || !natureza || !subNatureza || !dataEvento) {
      return res.status(400).json({
        error: "Preencha todos os campos obrigatórios do evento.",
      });
    }

    if (
      !envolvidosFormatados ||
      !Array.isArray(envolvidosFormatados) ||
      envolvidosFormatados.length === 0
    ) {
      return res.status(400).json({
        error: "Informe pelo menos um envolvido.",
      });
    }

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
        local,
        natureza,
        subNatureza,
        relatoSeguranca,
        status,
        dataEvento: new Date(dataEvento),

        envolvidos: {
          create: envolvidosFormatados,
        },

        anexos: {
          create: arquivos.map((arquivo) => ({
            nomeOriginal: arquivo.originalname,
            nomeArquivo: arquivo.filename,
            caminho: arquivo.path,
            tipo: arquivo.mimetype,
          })),
        },
      },

      include: {
        envolvidos: true,
        anexos: true,
      },
    });

    return res.status(201).json(evento);
  } catch (error) {
    console.error(error);

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
        anexos: true,
      },
    });

    return res.json(eventos);
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: "Erro ao listar eventos",
    });
  }
}

export async function buscarEventoPorId(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const evento = await prisma.evento.findUnique({
      where: {
        id: Number(id),
      },
      include: {
        envolvidos: true,
        anexos: true,
      },
    });

    if (!evento) {
      return res.status(404).json({
        error: "Evento não encontrado",
      });
    }

    return res.json(evento);
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: "Erro ao buscar evento",
    });
  }
}

export async function atualizarEvento(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const {
      assunto,
      local,
      natureza,
      subNatureza,
      status = "ABERTO",
      dataEvento,
      relatoSeguranca,
      envolvidos,
    } = req.body;

    const arquivos = (req.files as Express.Multer.File[]) || [];

    const envolvidosFormatados =
      typeof envolvidos === "string" ? JSON.parse(envolvidos) : envolvidos;

    if (!assunto || !local || !natureza || !subNatureza || !dataEvento) {
      return res.status(400).json({
        error: "Preencha todos os campos obrigatórios do evento.",
      });
    }

    if (
      !envolvidosFormatados ||
      !Array.isArray(envolvidosFormatados) ||
      envolvidosFormatados.length === 0
    ) {
      return res.status(400).json({
        error: "Informe pelo menos um envolvido.",
      });
    }

    const eventoExiste = await prisma.evento.findUnique({
      where: {
        id: Number(id),
      },
    });

    if (!eventoExiste) {
      return res.status(404).json({
        error: "Evento não encontrado",
      });
    }

    const evento = await prisma.$transaction(async (tx) => {
      await tx.envolvidoEvento.deleteMany({
        where: {
          eventoId: Number(id),
        },
      });

      return tx.evento.update({
        where: {
          id: Number(id),
        },
        data: {
          assunto,
          local,
          natureza,
          subNatureza,
          relatoSeguranca,
          status,
          dataEvento: new Date(dataEvento),

          envolvidos: {
            create: envolvidosFormatados.map(({ id, eventoId, ...envolvido }) => envolvido),
          },

          anexos: {
            create: arquivos.map((arquivo) => ({
              nomeOriginal: arquivo.originalname,
              nomeArquivo: arquivo.filename,
              caminho: arquivo.path,
              tipo: arquivo.mimetype,
            })),
          },
        },
        include: {
          envolvidos: true,
          anexos: true,
        },
      });
    });

    return res.json(evento);
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: "Erro ao atualizar evento",
    });
  }
}

export async function gerarPdfEvento(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;

    const [evento, usuario] = await Promise.all([
      prisma.evento.findUnique({
        where: {
          id: Number(id),
        },
        include: {
          envolvidos: true,
          anexos: true,
        },
      }),
      prisma.usuario.findUnique({
        where: {
          id: req.usuarioId,
        },
        select: {
          nome: true,
          re: true,
          cargo: true,
          setor: true,
          empresa: true,
        },
      }),
    ]);

    if (!evento) {
      return res.status(404).json({
        error: "Evento não encontrado",
      });
    }

    if (!usuario) {
      return res.status(401).json({
        error: "Usuário não encontrado",
      });
    }

    const pdfUrl = `${req.protocol}://${req.get("host")}${req.originalUrl}`;

    return gerarRelatorioPdf(
      res,
      {
        tipo: "Evento",
        codigo: evento.codigo,
        assunto: evento.assunto,
        local: evento.local,
        natureza: evento.natureza,
        subNatureza: evento.subNatureza,
        status: evento.status,
        data: evento.dataEvento,
        relatoSeguranca: evento.relatoSeguranca,
        envolvidos: evento.envolvidos,
      },
      usuario,
      pdfUrl
    );
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: "Erro ao gerar PDF do evento",
    });
  }
}
