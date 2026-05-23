import { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { AuthRequest } from "../middlewares/auth";
import { gerarRelatorioPdf } from "../services/relatorioPdf.service";

export async function criarOcorrencia(req: Request, res: Response) {
  try {
    const {
      assunto,
      local,
      natureza,
      subNatureza,
      status = "ABERTO",
      dataOcorrencia,
      relatoSeguranca,
      envolvidos,
    } = req.body;

    const arquivos = (req.files as Express.Multer.File[]) || [];

    const envolvidosFormatados =
      typeof envolvidos === "string" ? JSON.parse(envolvidos) : envolvidos;

    if (!assunto || !local || !natureza || !subNatureza || !dataOcorrencia) {
      return res.status(400).json({
        error: "Preencha todos os campos obrigatórios da ocorrência.",
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

    const ultimaOcorrencia = await prisma.ocorrencia.findFirst({
      where: { ano },
      orderBy: { numero: "desc" },
    });

    const proximoNumero = ultimaOcorrencia ? ultimaOcorrencia.numero + 1 : 1;

    const codigo = `${String(proximoNumero).padStart(4, "0")}/${ano}`;

    const ocorrencia = await prisma.ocorrencia.create({
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
        dataOcorrencia: new Date(dataOcorrencia),

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

    return res.status(201).json(ocorrencia);
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: "Erro ao criar ocorrência",
    });
  }
}

export async function listarOcorrencias(req: Request, res: Response) {
  try {
    const ocorrencias = await prisma.ocorrencia.findMany({
      orderBy: {
        createdAt: "desc",
      },
      include: {
        envolvidos: true,
        anexos: true,
      },
    });

    return res.json(ocorrencias);
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: "Erro ao listar ocorrências",
    });
  }
}

export async function buscarOcorrenciaPorId(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const ocorrencia = await prisma.ocorrencia.findUnique({
      where: {
        id: Number(id),
      },
      include: {
        envolvidos: true,
        anexos: true,
      },
    });

    if (!ocorrencia) {
      return res.status(404).json({
        error: "Ocorrência não encontrada",
      });
    }

    return res.json(ocorrencia);
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: "Erro ao buscar ocorrência",
    });
  }
}

export async function gerarPdfOcorrencia(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;

    const [ocorrencia, usuario] = await Promise.all([
      prisma.ocorrencia.findUnique({
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

    if (!ocorrencia) {
      return res.status(404).json({
        error: "Ocorrência não encontrada",
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
        tipo: "Ocorrência",
        codigo: ocorrencia.codigo,
        assunto: ocorrencia.assunto,
        local: ocorrencia.local,
        natureza: ocorrencia.natureza,
        subNatureza: ocorrencia.subNatureza,
        status: ocorrencia.status,
        data: ocorrencia.dataOcorrencia,
        relatoSeguranca: ocorrencia.relatoSeguranca,
        envolvidos: ocorrencia.envolvidos,
        anexos: ocorrencia.anexos,
      },
      usuario,
      pdfUrl
    );
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: "Erro ao gerar PDF da ocorrência",
    });
  }
}
