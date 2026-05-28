import { Response } from "express";
import { prisma } from "../lib/prisma";
import { AuthRequest } from "../middlewares/auth";
import { criarUrlPublicaPdf, gerarRelatorioPdf } from "../services/relatorioPdf.service";
import { registrarLog } from "../services/auditoria.service";
import { estaAprovado } from "../utils/status";
import { calcularHashArquivo } from "../utils/arquivoHash";

async function validarLocalAtivo(local: string, unidade?: string) {
  const nome = String(local || "").trim();
  if (!nome) return null;

  return prisma.localTerminal.findFirst({
    where: {
      nome,
      unidade,
      status: "Ativo",
    },
  });
}

export async function criarOcorrencia(req: AuthRequest, res: Response) {
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

    const localCadastro = await validarLocalAtivo(local, req.unidadeAtiva);
    if (!localCadastro) {
      return res.status(400).json({
        error: "Selecione um local ativo cadastrado para esta unidade.",
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
      where: { ano, unidade: req.unidadeAtiva },
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
        local: localCadastro.nome,
        unidade: req.unidadeAtiva || "GJA-T1",
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
            hashArquivo: calcularHashArquivo(arquivo.path),
          })),
        },
      },

      include: {
        envolvidos: true,
        anexos: true,
      },
    });

    await registrarLog({
      req,
      acao: "Criação de ocorrência",
      tipoRegistro: "Ocorrencia",
      registroId: ocorrencia.id,
      dadosNovos: ocorrencia,
    });

    return res.status(201).json(ocorrencia);
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: "Erro ao criar ocorrência",
    });
  }
}

export async function listarOcorrencias(req: AuthRequest, res: Response) {
  try {
    const ocorrencias = await prisma.ocorrencia.findMany({
      where: {
        unidade: req.unidadeAtiva,
      },
      orderBy: {
        createdAt: "desc",
      },
      include: {
        envolvidos: true,
        anexos: true,
        analise: true,
        investigacao: true,
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

export async function buscarOcorrenciaPorId(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;

    const ocorrencia = await prisma.ocorrencia.findFirst({
      where: {
        id: Number(id),
        unidade: req.unidadeAtiva,
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

export async function atualizarOcorrencia(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const {
      assunto,
      local,
      natureza,
      subNatureza,
      status = "ABERTO",
      dataOcorrencia,
      relatoSeguranca,
      envolvidos,
      anexosRemover,
    } = req.body;

    const arquivos = (req.files as Express.Multer.File[]) || [];

    const envolvidosFormatados =
      typeof envolvidos === "string" ? JSON.parse(envolvidos) : envolvidos;
    const anexosParaRemover =
      typeof anexosRemover === "string" && anexosRemover
        ? JSON.parse(anexosRemover)
        : [];

    if (!assunto || !local || !natureza || !subNatureza || !dataOcorrencia) {
      return res.status(400).json({
        error: "Preencha todos os campos obrigatórios da ocorrência.",
      });
    }

    const localCadastro = await validarLocalAtivo(local, req.unidadeAtiva);
    if (!localCadastro) {
      return res.status(400).json({
        error: "Selecione um local ativo cadastrado para esta unidade.",
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

    const ocorrenciaExiste = await prisma.ocorrencia.findFirst({
      where: {
        id: Number(id),
        unidade: req.unidadeAtiva,
      },
      include: {
        envolvidos: true,
        anexos: true,
        analise: true,
        investigacao: true,
      },
    });

    if (!ocorrenciaExiste) {
      return res.status(404).json({
        error: "Ocorrência não encontrada",
      });
    }

    if (estaAprovado(ocorrenciaExiste) && req.usuarioPerfil !== "SUPER_ADMIN") {
      return res.status(403).json({
        error: "Ocorrência aprovada não pode ser editada. Solicite reabertura ao Super Admin.",
      });
    }

    const ocorrencia = await prisma.$transaction(async (tx) => {
      await tx.envolvidoOcorrencia.deleteMany({
        where: {
          ocorrenciaId: Number(id),
        },
      });

      if (Array.isArray(anexosParaRemover) && anexosParaRemover.length > 0) {
        await tx.anexoOcorrencia.deleteMany({
          where: {
            id: {
              in: anexosParaRemover.map(Number),
            },
            ocorrenciaId: Number(id),
          },
        });
      }

      return tx.ocorrencia.update({
        where: {
          id: Number(id),
        },
        data: {
          assunto,
        local: localCadastro.nome,
          unidade: req.unidadeAtiva || ocorrenciaExiste.unidade,
          natureza,
          subNatureza,
          relatoSeguranca,
          status,
          dataOcorrencia: new Date(dataOcorrencia),

          envolvidos: {
            create: envolvidosFormatados.map(({ id, ocorrenciaId, ...envolvido }) => envolvido),
          },

          anexos: {
            create: arquivos.map((arquivo) => ({
              nomeOriginal: arquivo.originalname,
              nomeArquivo: arquivo.filename,
              caminho: arquivo.path,
              tipo: arquivo.mimetype,
              hashArquivo: calcularHashArquivo(arquivo.path),
            })),
          },
        },
        include: {
          envolvidos: true,
          anexos: true,
          analise: true,
          investigacao: true,
        },
      });
    });

    await registrarLog({
      req,
      acao: "Atualização de ocorrência",
      tipoRegistro: "Ocorrencia",
      registroId: ocorrencia.id,
      dadosAnteriores: ocorrenciaExiste,
      dadosNovos: ocorrencia,
    });

    return res.json(ocorrencia);
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: "Erro ao atualizar ocorrência",
    });
  }
}

export async function gerarPdfOcorrencia(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;

    const [ocorrencia, usuario] = await Promise.all([
      prisma.ocorrencia.findFirst({
        where: {
          id: Number(id),
          unidade: req.unidadeAtiva,
        },
        include: {
          envolvidos: true,
          anexos: true,
          investigacao: {
            include: {
              responsavel: {
                select: {
                  nome: true,
                },
              },
            },
          },
          analise: {
            include: {
              responsavel: {
                select: {
                  nome: true,
                },
              },
              concluidoPor: {
                select: {
                  nome: true,
                },
              },
            },
          },
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

    const pdfUrl = criarUrlPublicaPdf(req, {
      tipo: "ocorrencias",
      id: ocorrencia.id,
      codigo: ocorrencia.codigo,
      unidade: ocorrencia.unidade,
    });

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
        investigacao: ocorrencia.investigacao,
        analise: ocorrencia.analise,
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

