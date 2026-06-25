import { Response } from "express";
import { prisma } from "../lib/prisma";
import { AuthRequest } from "../middlewares/auth";
import { criarUrlPublicaPdf, gerarRelatorioPdf } from "../services/relatorioPdf.service";
import { assinaturaValidaDocumento, criarUrlValidacaoAssinatura } from "../services/assinaturaDocumento.service";
import { registrarLog } from "../services/auditoria.service";
import { emitirRealtime } from "../services/realtime.service";
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

function ehImpactoOperacionalExterno(natureza?: string) {
  return String(natureza || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase() === "impacto operacional externo";
}

function prepararImpactoOperacional(valor: unknown, dataInicio: string) {
  if (!valor) return null;

  try {
    const impacto = typeof valor === "string" ? JSON.parse(valor) : valor;
    if (!impacto || typeof impacto !== "object") return null;

    const dados = impacto as {
      dataHoraTermino?: string;
      dataHoraIdentificacaoUltimoVeiculo?: string;
      dataHoraChegadaBalanca?: string;
    };
    if (
      dados.dataHoraTermino &&
      new Date(dados.dataHoraTermino).getTime() < new Date(dataInicio).getTime()
    ) {
      throw new Error("A data/hora de término não pode ser anterior ao início do impacto.");
    }
    if (
      dados.dataHoraIdentificacaoUltimoVeiculo &&
      new Date(dados.dataHoraIdentificacaoUltimoVeiculo).getTime() < new Date(dataInicio).getTime()
    ) {
      throw new Error("A data/hora de identificação da placa não pode ser anterior ao início do impacto.");
    }
    if (
      dados.dataHoraIdentificacaoUltimoVeiculo &&
      dados.dataHoraChegadaBalanca &&
      new Date(dados.dataHoraChegadaBalanca).getTime() < new Date(dados.dataHoraIdentificacaoUltimoVeiculo).getTime()
    ) {
      throw new Error("A chegada na balança não pode ser anterior à identificação da placa no final da fila.");
    }

    return JSON.stringify(impacto);
  } catch (error) {
    if (error instanceof Error && (error.message.includes("término") || error.message.includes("placa") || error.message.includes("balança"))) throw error;
    throw new Error("Os dados do impacto operacional são inválidos.");
  }
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
      acoesTomadas,
      impactoOperacional,
      envolvidos,
    } = req.body;

    const arquivos = (req.files as Express.Multer.File[]) || [];

    const envolvidosFormatados =
      typeof envolvidos === "string" ? JSON.parse(envolvidos) : envolvidos;
    const impactoOperacionalFormatado = ehImpactoOperacionalExterno(natureza)
      ? prepararImpactoOperacional(impactoOperacional, dataOcorrencia)
      : null;

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
        acoesTomadas,
        impactoOperacional: impactoOperacionalFormatado,
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

    const autor = req.usuarioId
      ? await prisma.usuario.findUnique({ where: { id: req.usuarioId }, select: { nome: true, apelido: true } })
      : null;
    emitirRealtime({
      tipo: "ocorrencia.criada",
      titulo: `Nova ocorrência ${ocorrencia.codigo}`,
      mensagem: `${autor?.apelido || autor?.nome || "Usuário"} registrou ${ocorrencia.assunto}`,
      severidade: "media",
      unidade: ocorrencia.unidade,
      link: "/ocorrencias",
      payload: { id: ocorrencia.id, codigo: ocorrencia.codigo },
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

    const ocorrenciasComAssinatura = await Promise.all(
      ocorrencias.map(async (ocorrencia) => ({
        ...ocorrencia,
        assinaturaAprovacaoValida: Boolean(await assinaturaValidaDocumento("Ocorrencia", ocorrencia.id)),
      }))
    );

    return res.json(ocorrenciasComAssinatura);
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
      status,
      dataOcorrencia,
      relatoSeguranca,
      acoesTomadas,
      impactoOperacional,
      envolvidos,
      anexosRemover,
    } = req.body;

    const arquivos = (req.files as Express.Multer.File[]) || [];

    const envolvidosFormatados =
      typeof envolvidos === "string" ? JSON.parse(envolvidos) : envolvidos;
    const impactoOperacionalFormatado = ehImpactoOperacionalExterno(natureza)
      ? prepararImpactoOperacional(impactoOperacional, dataOcorrencia)
      : null;
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

    if (ocorrenciaExiste.status === "Anulado") {
      return res.status(403).json({
        error: "Este relatório está anulado e não pode ser editado.",
      });
    }

    const assinaturaAprovacao = estaAprovado(ocorrenciaExiste)
      ? await assinaturaValidaDocumento("Ocorrencia", ocorrenciaExiste.id)
      : null;
    if (estaAprovado(ocorrenciaExiste) && assinaturaAprovacao) {
      return res.status(403).json({
        error: "Este documento está concluído e assinado eletronicamente. Não é permitido editar. Solicite a reabertura para realizar alterações.",
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
          acoesTomadas,
          impactoOperacional: impactoOperacionalFormatado,
          status: status || ocorrenciaExiste.status,
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

    const [riscos, estrategicas] = await Promise.all([
      prisma.analiseRisco.findMany({
        where: {
          unidade: ocorrencia.unidade,
          OR: [
            { ocorrenciaId: ocorrencia.id },
            ...(ocorrencia.investigacao ? [{ investigacaoId: ocorrencia.investigacao.id }] : []),
          ],
        },
        orderBy: { createdAt: "asc" },
        include: {
          responsavel: { select: { nome: true } },
        },
      }),
      prisma.analiseEstrategica.findMany({
        where: {
          unidade: ocorrencia.unidade,
          OR: [
            { ocorrenciaId: ocorrencia.id },
            ...(ocorrencia.investigacao ? [{ investigacaoId: ocorrencia.investigacao.id }] : []),
          ],
        },
        orderBy: { createdAt: "asc" },
        include: {
          responsavel: { select: { nome: true } },
        },
      }),
    ]);

    const assinaturaAprovacao = await assinaturaValidaDocumento("Ocorrencia", ocorrencia.id);
    const assinatura =
      assinaturaAprovacao ||
      (ocorrencia.analise ? await assinaturaValidaDocumento("AnaliseOcorrencia", ocorrencia.analise.id) : null) ||
      (ocorrencia.investigacao ? await assinaturaValidaDocumento("Investigacao", ocorrencia.investigacao.id) : null);
    const validacaoUrl = assinatura ? criarUrlValidacaoAssinatura(req, assinatura.token) : pdfUrl;

    return gerarRelatorioPdf(
      res,
      {
        tipo: "Ocorrência",
        codigo: ocorrencia.codigo,
        assunto: ocorrencia.assunto,
        unidade: ocorrencia.unidade,
        local: ocorrencia.local,
        natureza: ocorrencia.natureza,
        subNatureza: ocorrencia.subNatureza,
        status: ocorrencia.status,
        data: ocorrencia.dataOcorrencia,
        relatoSeguranca: ocorrencia.relatoSeguranca,
        acoesTomadas: ocorrencia.acoesTomadas,
        impactoOperacional: ocorrencia.impactoOperacional,
        envolvidos: ocorrencia.envolvidos,
        investigacao: ocorrencia.investigacao,
        analise: ocorrencia.analise,
        riscos,
        estrategicas,
        assinaturaAprovacao,
      },
      usuario,
      validacaoUrl,
      assinatura?.token
    );
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: "Erro ao gerar PDF da ocorrência",
    });
  }
}

