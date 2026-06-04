import { Response } from "express";
import { prisma } from "../lib/prisma";
import { AuthRequest } from "../middlewares/auth";
import { criarUrlPublicaPdf, gerarRelatorioPdf } from "../services/relatorioPdf.service";
import { assinaturaValidaDocumento, criarUrlValidacaoAssinatura } from "../services/assinaturaDocumento.service";
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

export async function criarEvento(req: AuthRequest, res: Response) {
  try {
    const {
      assunto,
      local,
      natureza,
      subNatureza,
      status = "Aberto",
      dataEvento,
      relatoSeguranca,
      acoesTomadas,
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

    if (!assunto || !local || !natureza || !subNatureza || !dataEvento) {
      return res.status(400).json({
        error: "Preencha todos os campos obrigatórios do evento.",
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

    const ultimoEvento = await prisma.evento.findFirst({
      where: { ano, unidade: req.unidadeAtiva },
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
        local: localCadastro.nome,
        unidade: req.unidadeAtiva || "GJA-T1",
        natureza,
        subNatureza,
        relatoSeguranca,
        acoesTomadas,
        status,
        fluxoStatus: "Em Elaboracao",
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
            hashArquivo: calcularHashArquivo(arquivo.path),
          })),
        },
      },

      include: {
        envolvidos: true,
        anexos: true,
        analise: true,
      },
    });

    await registrarLog({
      req,
      acao: "Criação de evento",
      tipoRegistro: "Evento",
      registroId: evento.id,
      dadosNovos: evento,
    });

    return res.status(201).json(evento);
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: "Erro ao criar evento",
    });
  }
}

export async function listarEventos(req: AuthRequest, res: Response) {
  try {
    const eventos = await prisma.evento.findMany({
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

export async function buscarEventoPorId(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;

    const evento = await prisma.evento.findFirst({
      where: {
        id: Number(id),
        unidade: req.unidadeAtiva,
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

export async function atualizarEvento(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const {
      assunto,
      local,
      natureza,
      subNatureza,
      status,
      dataEvento,
      relatoSeguranca,
      acoesTomadas,
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

    if (!assunto || !local || !natureza || !subNatureza || !dataEvento) {
      return res.status(400).json({
        error: "Preencha todos os campos obrigatórios do evento.",
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

    const eventoExiste = await prisma.evento.findFirst({
      where: {
        id: Number(id),
        unidade: req.unidadeAtiva,
      },
      include: {
        envolvidos: true,
        anexos: true,
      },
    });

    if (!eventoExiste) {
      return res.status(404).json({
        error: "Evento não encontrado",
      });
    }

    if (estaAprovado(eventoExiste) && req.usuarioPerfil !== "SUPER_ADMIN") {
      return res.status(403).json({
        error: "Evento aprovado não pode ser editado. Solicite reabertura ao Super Admin.",
      });
    }

    const evento = await prisma.$transaction(async (tx) => {
      await tx.envolvidoEvento.deleteMany({
        where: {
          eventoId: Number(id),
        },
      });

      if (Array.isArray(anexosParaRemover) && anexosParaRemover.length > 0) {
        await tx.anexoEvento.deleteMany({
          where: {
            id: {
              in: anexosParaRemover.map(Number),
            },
            eventoId: Number(id),
          },
        });
      }

      return tx.evento.update({
        where: {
          id: Number(id),
        },
        data: {
          assunto,
          local: localCadastro.nome,
          unidade: req.unidadeAtiva || eventoExiste.unidade,
          natureza,
          subNatureza,
          relatoSeguranca,
          acoesTomadas,
          status: status || eventoExiste.status,
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
              hashArquivo: calcularHashArquivo(arquivo.path),
            })),
          },
        },
        include: {
          envolvidos: true,
          anexos: true,
          analise: true,
        },
      });
    });

    await registrarLog({
      req,
      acao: "Atualização de evento",
      tipoRegistro: "Evento",
      registroId: evento.id,
      dadosAnteriores: eventoExiste,
      dadosNovos: evento,
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
      prisma.evento.findFirst({
        where: {
          id: Number(id),
          unidade: req.unidadeAtiva,
        },
        include: {
          envolvidos: true,
          anexos: true,
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

    const pdfUrl = criarUrlPublicaPdf(req, {
      tipo: "eventos",
      id: evento.id,
      codigo: evento.codigo,
      unidade: evento.unidade,
    });
    const assinatura =
      (await assinaturaValidaDocumento("Evento", evento.id)) ||
      (evento.analise ? await assinaturaValidaDocumento("AnaliseEvento", evento.analise.id) : null);
    const validacaoUrl = assinatura ? criarUrlValidacaoAssinatura(req, assinatura.token) : pdfUrl;

    return gerarRelatorioPdf(
      res,
      {
        tipo: "Evento",
        codigo: evento.codigo,
        assunto: evento.assunto,
        unidade: evento.unidade,
        local: evento.local,
        natureza: evento.natureza,
        subNatureza: evento.subNatureza,
        status: evento.status,
        data: evento.dataEvento,
        relatoSeguranca: evento.relatoSeguranca,
        acoesTomadas: evento.acoesTomadas,
        envolvidos: evento.envolvidos,
        analise: evento.analise,
      },
      usuario,
      validacaoUrl,
      assinatura?.token
    );
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: "Erro ao gerar PDF do evento",
    });
  }
}

