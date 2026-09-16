import crypto from "crypto";
import fs from "fs";
import path from "path";
import { Response } from "express";
import type { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { AuthRequest, PERFIS } from "../middlewares/auth";
import { enviarEmail } from "../services/email.service";
import { registrarLog } from "../services/auditoria.service";
import { validarPinOperacional } from "../services/pinOperacional.service";
import { travarSequencia } from "../utils/lockSequencia";

const STATUS = {
  AGUARDANDO_ATENDIMENTO: "Aguardando Atendimento",
  AGUARDANDO_CLASSIFICACAO: "Aguardando Classificação",
  EM_ATENDIMENTO: "Em Atendimento",
  PAUSADO: "Pausado",
  CONCLUIDO: "Concluído",
  ANULADO: "Anulado",
};

const PRIORIDADES = new Set([
  "Baixa",
  "Média",
  "Alta",
  "Crítica",
  "Não Classificada",
]);

const STATUS_VALIDOS = new Set(Object.values(STATUS));
const TOKEN_TESTE_DESENVOLVIMENTO = "teste-desenvolvimento";
const STATUS_CAMERA_CONECTADA = "Conectada";
const STATUS_CAMERA_ATIVA = "Ativa";

const includeSolicitacao = {
  criadoPor: { select: { id: true, nome: true, email: true } },
  atendente: { select: { id: true, nome: true, email: true } },
  concluidoPor: { select: { id: true, nome: true } },
  anuladoPor: { select: { id: true, nome: true } },
  anexos: { orderBy: { createdAt: "desc" as const } },
  atendimentos: {
    include: { atendente: { select: { id: true, nome: true, email: true } } },
    orderBy: { iniciadoEm: "desc" as const },
  },
};

function texto(valor: unknown) {
  return typeof valor === "string" ? valor.trim() : "";
}

function textoOpcional(valor: unknown) {
  const valorTexto = texto(valor);
  return valorTexto || null;
}

function idsNumericos(valor: unknown) {
  if (!Array.isArray(valor)) return [];
  return Array.from(
    new Set(
      valor
        .map((item) => Number(item))
        .filter((item) => Number.isInteger(item) && item > 0),
    ),
  );
}

function rotuloCameraBusca(camera: {
  numeroCamera: string;
  nomeCamera: string | null;
  localInstalado: string;
  areaMonitorada: string;
}) {
  const nome = camera.nomeCamera ? ` - ${camera.nomeCamera}` : "";
  return `Câmera ${camera.numeroCamera}${nome} | ${camera.areaMonitorada} | ${camera.localInstalado}`;
}

function normalizarStatus(valor: unknown) {
  const status = texto(valor);
  if (status === "Finalizado") return STATUS.CONCLUIDO;
  return status;
}

function dataOpcional(valor: unknown) {
  const valorTexto = texto(valor);
  if (!valorTexto) return null;
  const data = new Date(valorTexto);
  return Number.isNaN(data.getTime()) ? null : data;
}

function montarDataHora(data: Date | null, hora: string | null) {
  if (!data || !hora) return null;
  const dataIso = data.toISOString().slice(0, 10);
  const dataHora = new Date(`${dataIso}T${hora}:00`);
  return Number.isNaN(dataHora.getTime()) ? null : dataHora;
}

function validarPeriodoOcorrencia(
  dataInicial: Date | null,
  horaInicial: string | null,
  dataFinal: Date | null,
  horaFinal: string | null,
) {
  const inicio = montarDataHora(dataInicial, horaInicial);
  const fim = montarDataHora(dataFinal || dataInicial, horaFinal);

  if ((horaInicial && !dataInicial) || (horaFinal && !dataInicial)) {
    return "Informe a data da ocorrência para usar os horários.";
  }

  if (inicio && fim && fim.getTime() <= inicio.getTime()) {
    return "A data e hora final devem ser maiores que a data e hora inicial.";
  }

  return null;
}

function segundosDesde(inicio?: Date | null, fim = new Date()) {
  if (!inicio) return 0;
  return Math.max(0, Math.floor((fim.getTime() - inicio.getTime()) / 1000));
}

function protocoloImagem(numero: number, ano: number) {
  return `IMG-${ano}-${String(numero).padStart(4, "0")}`;
}

function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function urlPublica(token: string) {
  const base =
    process.env.APP_PUBLIC_URL ||
    process.env.FRONTEND_URL ||
    "https://movesecurity.movecta.com.br";
  return `${base.replace(/\/+$/, "")}/solicitacao/imagens/${token}`;
}

function tokenTesteDesenvolvimento(token: string) {
  return (
    process.env.NODE_ENV !== "production" &&
    token === TOKEN_TESTE_DESENVOLVIMENTO
  );
}

function unidadePublica(req: AuthRequest) {
  const unidadeHeader = req.headers["x-unidade-ativa"];
  return (
    (Array.isArray(unidadeHeader) ? unidadeHeader[0] : unidadeHeader) ||
    process.env.UNIDADE_ATIVA ||
    "GJA-T1"
  );
}

async function locaisPublicos(unidade: string) {
  return prisma.localTerminal.findMany({
    where: { unidade, status: "Ativo" },
    orderBy: [{ areaSensivel: "desc" }, { nome: "asc" }],
    select: {
      id: true,
      nome: true,
      tipo: true,
      status: true,
      unidade: true,
    },
  });
}

function nomeUsuario(req: AuthRequest) {
  return String((req as any).usuarioNome || "").trim();
}

async function registrarHistorico(
  tx: Prisma.TransactionClient,
  solicitacaoId: number,
  req: AuthRequest | null,
  tipoEvento: string,
  descricao: string,
  statusAnterior?: string | null,
  statusNovo?: string | null,
  dados?: unknown,
) {
  await tx.historicoSolicitacaoImagem.create({
    data: {
      solicitacaoId,
      usuarioId: req?.usuarioId || null,
      usuarioNome: req ? nomeUsuario(req) || null : null,
      tipoEvento,
      descricao,
      statusAnterior: statusAnterior || null,
      statusNovo: statusNovo || null,
      dadosJson: dados ? JSON.stringify(dados) : null,
    },
  });
}

async function proximaSequencia(tx: Prisma.TransactionClient, ano: number) {
  await travarSequencia(tx, `solicitacao-imagem-${ano}`);
  const ultima = await tx.solicitacaoImagem.findFirst({
    where: { ano },
    orderBy: { numero: "desc" },
    select: { numero: true },
  });
  return ultima ? ultima.numero + 1 : 1;
}

function anexosParaCriacao(
  solicitacaoId: number,
  arquivos: Express.Multer.File[],
  origem: string,
  usuarioId?: number,
) {
  return arquivos.map((arquivo) => ({
    solicitacaoId,
    nomeOriginal: arquivo.originalname,
    nomeArquivo: arquivo.filename,
    caminho: arquivo.path.replace(/\\/g, "/"),
    tipoArquivo: arquivo.mimetype,
    tamanho: arquivo.size,
    origem,
    enviadoPorId: usuarioId || null,
  }));
}

function anexosImagem(arquivos: Express.Multer.File[]) {
  return arquivos.filter((arquivo) => arquivo.mimetype?.startsWith("image/"));
}

function removerArquivoUpload(caminho?: string | null) {
  if (!caminho) return;
  const caminhoNormalizado = caminho.replace(/\\/g, "/");
  if (!caminhoNormalizado.startsWith("uploads/")) return;

  const raizUploads = path.resolve(process.cwd(), "uploads");
  const absoluto = path.resolve(process.cwd(), caminhoNormalizado);
  if (!absoluto.startsWith(raizUploads)) return;
  if (fs.existsSync(absoluto)) fs.rmSync(absoluto, { force: true });
}

async function buscarSolicitacaoComHistorico(
  tx: Prisma.TransactionClient,
  id: number,
) {
  return tx.solicitacaoImagem.findUniqueOrThrow({
    where: { id },
    include: {
      ...includeSolicitacao,
      historico: {
        include: { usuario: { select: { id: true, nome: true, email: true } } },
        orderBy: { createdAt: "desc" },
      },
    },
  });
}

function validarCamposBase(body: any, externo = false) {
  const titulo = texto(body.titulo);
  const solicitanteNome = texto(body.solicitanteNome || body.nome);

  if (!titulo || !solicitanteNome) {
    return "Informe o nome do solicitante e o título da solicitação.";
  }

  if (externo && !texto(body.email)) {
    return "Informe um e-mail válido para enviar a solicitação.";
  }

  return null;
}

async function validarLocalAtivo(local: string | null, unidade?: string) {
  if (!local) return null;

  return prisma.localTerminal.findFirst({
    where: {
      nome: local,
      unidade,
      status: "Ativo",
    },
    select: { nome: true },
  });
}

export async function listarSolicitacoesImagem(req: AuthRequest, res: Response) {
  try {
    const busca = texto(req.query.busca);
    const status = texto(req.query.status);
    const prioridade = texto(req.query.prioridade);

    const where: Prisma.SolicitacaoImagemWhereInput = {
      excluidoEm: null,
      unidade: req.unidadeAtiva,
    };

    if (status) {
      where.status =
        normalizarStatus(status) === STATUS.CONCLUIDO
          ? { in: [STATUS.CONCLUIDO, "Finalizado"] }
          : normalizarStatus(status);
    }
    if (prioridade) where.prioridade = prioridade;
    if (busca) {
      where.OR = [
        { protocolo: { contains: busca } },
        { titulo: { contains: busca } },
        { solicitanteNome: { contains: busca } },
        { local: { contains: busca } },
      ];
    }

    const solicitacoes = await prisma.solicitacaoImagem.findMany({
      where,
      include: includeSolicitacao,
      orderBy: { createdAt: "desc" },
      take: 250,
    });

    return res.json(solicitacoes);
  } catch (error) {
    console.error("Erro ao listar solicitações de imagens:", error);
    return res.status(500).json({ error: "Erro ao listar solicitações de imagens." });
  }
}

export async function buscarSolicitacaoImagem(req: AuthRequest, res: Response) {
  try {
    const id = Number(req.params.id);
    const solicitacao = await prisma.solicitacaoImagem.findFirst({
      where: { id, excluidoEm: null, unidade: req.unidadeAtiva },
      include: {
        ...includeSolicitacao,
        historico: {
          include: { usuario: { select: { id: true, nome: true, email: true } } },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!solicitacao) {
      return res.status(404).json({ error: "Solicitação de imagens não encontrada." });
    }

    return res.json(solicitacao);
  } catch (error) {
    console.error("Erro ao buscar solicitação de imagens:", error);
    return res.status(500).json({ error: "Erro ao buscar solicitação de imagens." });
  }
}

export async function criarSolicitacaoImagem(req: AuthRequest, res: Response) {
  try {
    const erro = validarCamposBase(req.body);
    if (erro) return res.status(400).json({ error: erro });

    const prioridade = texto(req.body.prioridade) || "Não Classificada";
    if (!PRIORIDADES.has(prioridade)) {
      return res.status(400).json({ error: "Prioridade inválida." });
    }

    const local = textoOpcional(req.body.local);
    if (local) {
      const localCadastro = await validarLocalAtivo(local, req.unidadeAtiva);
      if (!localCadastro) {
        return res.status(400).json({
          error: "Selecione um local ativo cadastrado para esta unidade.",
        });
      }
    }

    const arquivos = (req.files as Express.Multer.File[]) || [];
    const ano = new Date().getFullYear();
    const dataOcorrencia = dataOpcional(req.body.dataOcorrencia);
    const dataFinalOcorrencia =
      dataOpcional(req.body.dataFinalOcorrencia) || dataOcorrencia;
    const horaInicial = textoOpcional(req.body.horaInicial);
    const horaFinal = textoOpcional(req.body.horaFinal);
    const erroPeriodo = validarPeriodoOcorrencia(
      dataOcorrencia,
      horaInicial,
      dataFinalOcorrencia,
      horaFinal,
    );
    if (erroPeriodo) return res.status(400).json({ error: erroPeriodo });

    const solicitacao = await prisma.$transaction(async (tx) => {
      const numero = await proximaSequencia(tx, ano);
      const criada = await tx.solicitacaoImagem.create({
        data: {
          ano,
          numero,
          protocolo: protocoloImagem(numero, ano),
          unidade: req.unidadeAtiva || "GJA-T1",
          origem: "Interna",
          titulo: texto(req.body.titulo),
          solicitanteNome: texto(req.body.solicitanteNome || req.body.nome),
          solicitanteEmail: textoOpcional(req.body.email || req.body.solicitanteEmail),
          solicitanteSetor: textoOpcional(req.body.setor || req.body.solicitanteSetor),
          solicitanteCargo: textoOpcional(req.body.cargo || req.body.solicitanteCargo),
          local,
          dataOcorrencia,
          dataFinalOcorrencia,
          horaInicial,
          horaFinal,
          descricao: textoOpcional(req.body.descricao),
          prioridade,
          status: STATUS.AGUARDANDO_ATENDIMENTO,
          criadoPorId: req.usuarioId || null,
        },
      });

      if (arquivos.length) {
        await tx.anexoSolicitacaoImagem.createMany({
          data: anexosParaCriacao(criada.id, arquivos, "Interna", req.usuarioId),
        });
      }

      await registrarHistorico(
        tx,
        criada.id,
        req,
        "CRIACAO",
        `Solicitação ${criada.protocolo} criada internamente.`,
        null,
        criada.status,
      );

      return tx.solicitacaoImagem.findUniqueOrThrow({
        where: { id: criada.id },
        include: includeSolicitacao,
      });
    });

    await registrarLog({
      acao: "Criação de solicitação de imagens",
      tipoRegistro: "SolicitacaoImagem",
      registroId: solicitacao.id,
      dadosNovos: solicitacao,
      req,
    });

    return res.status(201).json(solicitacao);
  } catch (error) {
    console.error("Erro ao criar solicitação de imagens:", error);
    return res.status(500).json({ error: "Erro ao criar solicitação de imagens." });
  }
}

export async function atualizarSolicitacaoImagem(req: AuthRequest, res: Response) {
  try {
    const id = Number(req.params.id);
    const atual = await prisma.solicitacaoImagem.findFirst({
      where: { id, excluidoEm: null, unidade: req.unidadeAtiva },
    });

    if (!atual) {
      return res.status(404).json({ error: "Solicitação de imagens não encontrada." });
    }

    const novoStatus = normalizarStatus(req.body.status) || normalizarStatus(atual.status);
    const novaPrioridade = texto(req.body.prioridade) || atual.prioridade;

    if (!STATUS_VALIDOS.has(novoStatus)) {
      return res.status(400).json({ error: "Status inválido." });
    }
    if (!PRIORIDADES.has(novaPrioridade)) {
      return res.status(400).json({ error: "Prioridade inválida." });
    }
    if (novoStatus === STATUS.CONCLUIDO && !texto(req.body.descricaoConclusao)) {
      return res.status(400).json({ error: "Informe o motivo da conclusão." });
    }
    if (novoStatus === STATUS.ANULADO && !texto(req.body.motivoAnulacao)) {
      return res.status(400).json({ error: "Informe o motivo para anular." });
    }
    if (
      [STATUS.CONCLUIDO, STATUS.ANULADO].includes(novoStatus) &&
      normalizarStatus(atual.status) !== novoStatus
    ) {
      await validarPinOperacional(req.usuarioId || 0, String(req.body?.pinOperacional || ""));
    }

    const local = textoOpcional(req.body.local);
    if (local) {
      const localCadastro = await validarLocalAtivo(local, req.unidadeAtiva);
      if (!localCadastro) {
        return res.status(400).json({
          error: "Selecione um local ativo cadastrado para esta unidade.",
        });
      }
    }

    let statusFinal = novoStatus;
    if (
      atual.status === STATUS.AGUARDANDO_CLASSIFICACAO &&
      novaPrioridade !== "Não Classificada" &&
      novoStatus === STATUS.AGUARDANDO_CLASSIFICACAO
    ) {
      statusFinal = STATUS.AGUARDANDO_ATENDIMENTO;
    }

    const arquivos = (req.files as Express.Multer.File[]) || [];
    const dataOcorrencia = dataOpcional(req.body.dataOcorrencia) ?? atual.dataOcorrencia;
    const dataFinalOcorrencia =
      dataOpcional(req.body.dataFinalOcorrencia) ||
      atual.dataFinalOcorrencia ||
      dataOcorrencia;
    const horaInicial = textoOpcional(req.body.horaInicial) ?? atual.horaInicial;
    const horaFinal = textoOpcional(req.body.horaFinal) ?? atual.horaFinal;
    const erroPeriodo = validarPeriodoOcorrencia(
      dataOcorrencia,
      horaInicial,
      dataFinalOcorrencia,
      horaFinal,
    );
    if (erroPeriodo) return res.status(400).json({ error: erroPeriodo });

    const solicitacao = await prisma.$transaction(async (tx) => {
      const agora = new Date();
      let tempoFinalizadoSegundos = 0;
      const deveEncerrarAtendimentoAtivo =
        atual.status === STATUS.EM_ATENDIMENTO &&
        statusFinal !== STATUS.EM_ATENDIMENTO &&
        atual.atendenteId;

      if (deveEncerrarAtendimentoAtivo) {
        const atendimentoAtivo = await tx.atendimentoSolicitacaoImagem.findFirst({
          where: { solicitacaoId: id, atendenteId: atual.atendenteId || 0, pausadoEm: null },
          orderBy: { iniciadoEm: "desc" },
        });

        if (atendimentoAtivo) {
          tempoFinalizadoSegundos = segundosDesde(atendimentoAtivo.iniciadoEm, agora);
          await tx.atendimentoSolicitacaoImagem.update({
            where: { id: atendimentoAtivo.id },
            data: {
              pausadoEm: agora,
              tempoSegundos: tempoFinalizadoSegundos,
              motivoPausa:
                statusFinal === STATUS.CONCLUIDO
                  ? "Atendimento encerrado na finalização da solicitação."
                  : "Atendimento encerrado pela alteração de status.",
              andamento:
                statusFinal === STATUS.CONCLUIDO
                  ? texto(req.body.descricaoConclusao)
                  : texto(req.body.motivoAnulacao) || "Status alterado.",
            },
          });
        }
      }

      const atualizada = await tx.solicitacaoImagem.update({
        where: { id },
        data: {
          titulo: texto(req.body.titulo) || atual.titulo,
          solicitanteNome: texto(req.body.solicitanteNome || req.body.nome) || atual.solicitanteNome,
          solicitanteEmail: textoOpcional(req.body.email || req.body.solicitanteEmail) ?? atual.solicitanteEmail,
          solicitanteSetor: textoOpcional(req.body.setor || req.body.solicitanteSetor) ?? atual.solicitanteSetor,
          solicitanteCargo: textoOpcional(req.body.cargo || req.body.solicitanteCargo) ?? atual.solicitanteCargo,
          local: local ?? atual.local,
          dataOcorrencia,
          dataFinalOcorrencia,
          horaInicial,
          horaFinal,
          descricao: textoOpcional(req.body.descricao) ?? atual.descricao,
          prioridade: novaPrioridade,
          status: statusFinal,
          tempoTotalAtendimento:
            tempoFinalizadoSegundos > 0
              ? { increment: tempoFinalizadoSegundos }
              : undefined,
          atendimentoIniciadoEm: deveEncerrarAtendimentoAtivo
            ? null
            : atual.atendimentoIniciadoEm,
          descricaoConclusao:
            statusFinal === STATUS.CONCLUIDO
              ? texto(req.body.descricaoConclusao)
              : atual.descricaoConclusao,
          concluidoPorId: statusFinal === STATUS.CONCLUIDO ? req.usuarioId || null : atual.concluidoPorId,
          concluidoEm: statusFinal === STATUS.CONCLUIDO ? agora : atual.concluidoEm,
          motivoAnulacao:
            statusFinal === STATUS.ANULADO
              ? texto(req.body.motivoAnulacao)
              : atual.motivoAnulacao,
          anuladoPorId: statusFinal === STATUS.ANULADO ? req.usuarioId || null : atual.anuladoPorId,
          anuladoEm: statusFinal === STATUS.ANULADO ? agora : atual.anuladoEm,
        },
      });

      if (arquivos.length) {
        await tx.anexoSolicitacaoImagem.createMany({
          data: anexosParaCriacao(atualizada.id, arquivos, "Interna", req.usuarioId),
        });
      }

      await registrarHistorico(
        tx,
        id,
        req,
        atual.status === statusFinal ? "EDICAO" : "ALTERACAO_STATUS",
        atual.status === statusFinal
          ? "Dados da solicitação atualizados."
          : `Status alterado de ${atual.status} para ${statusFinal}.`,
        atual.status,
        statusFinal,
        tempoFinalizadoSegundos > 0 ? { tempoSegundos: tempoFinalizadoSegundos } : undefined,
      );

      return tx.solicitacaoImagem.findUniqueOrThrow({
        where: { id },
        include: includeSolicitacao,
      });
    });

    return res.json(solicitacao);
  } catch (error: any) {
    if (error?.status) {
      return res.status(error.status).json({ error: error.message });
    }
    console.error("Erro ao atualizar solicitação de imagens:", error);
    return res.status(500).json({ error: "Erro ao atualizar solicitação de imagens." });
  }
}

export async function iniciarAtendimentoSolicitacaoImagem(req: AuthRequest, res: Response) {
  try {
    const id = Number(req.params.id);
    const agora = new Date();
    await validarPinOperacional(req.usuarioId || 0, String(req.body?.pinOperacional || ""));

    const solicitacao = await prisma.$transaction(async (tx) => {
      const atual = await tx.solicitacaoImagem.findFirst({
        where: { id, excluidoEm: null, unidade: req.unidadeAtiva },
      });

      if (!atual) throw new Error("NAO_ENCONTRADA");
      if (![STATUS.AGUARDANDO_ATENDIMENTO, STATUS.PAUSADO].includes(atual.status)) {
        throw new Error("STATUS_INVALIDO_ATENDIMENTO");
      }

      const atualizacao = await tx.solicitacaoImagem.updateMany({
        where: {
          id,
          status: { in: [STATUS.AGUARDANDO_ATENDIMENTO, STATUS.PAUSADO] },
          excluidoEm: null,
        },
        data: {
          status: STATUS.EM_ATENDIMENTO,
          atendenteId: req.usuarioId,
          atendimentoIniciadoEm: agora,
        },
      });

      if (atualizacao.count !== 1) throw new Error("ATENDIMENTO_CONCORRENTE");

      await tx.atendimentoSolicitacaoImagem.create({
        data: {
          solicitacaoId: id,
          atendenteId: req.usuarioId || 0,
          iniciadoEm: agora,
        },
      });

      await registrarHistorico(
        tx,
        id,
        req,
        atual.status === STATUS.PAUSADO ? "RETOMADA_ATENDIMENTO" : "INICIO_ATENDIMENTO",
        "Atendimento iniciado.",
        atual.status,
        STATUS.EM_ATENDIMENTO,
      );

      return tx.solicitacaoImagem.findUniqueOrThrow({
        where: { id },
        include: includeSolicitacao,
      });
    });

    return res.json(solicitacao);
  } catch (error: any) {
    if (error?.message === "NAO_ENCONTRADA") {
      return res.status(404).json({ error: "Solicitação de imagens não encontrada." });
    }
    if (error?.message === "STATUS_INVALIDO_ATENDIMENTO") {
      return res.status(409).json({ error: "Esta solicitação não pode iniciar atendimento neste status." });
    }
    if (error?.message === "ATENDIMENTO_CONCORRENTE") {
      return res.status(409).json({ error: "A solicitação já foi assumida por outro atendente." });
    }
    if (error?.status) {
      return res.status(error.status).json({ error: error.message });
    }
    console.error("Erro ao iniciar atendimento:", error);
    return res.status(500).json({ error: "Erro ao iniciar atendimento." });
  }
}

export async function assumirAtendimentoSolicitacaoImagem(req: AuthRequest, res: Response) {
  try {
    const id = Number(req.params.id);
    const motivo = texto(req.body.motivo);
    const descricao = texto(req.body.descricao);
    if (!motivo || !descricao) {
      return res.status(400).json({ error: "Informe o motivo e a descrição para assumir." });
    }

    const agora = new Date();
    const solicitacao = await prisma.$transaction(async (tx) => {
      const atual = await tx.solicitacaoImagem.findFirst({
        where: { id, excluidoEm: null, unidade: req.unidadeAtiva },
        include: { atendente: { select: { id: true, nome: true, email: true } } },
      });

      if (!atual) throw new Error("NAO_ENCONTRADA");
      if (atual.status !== STATUS.EM_ATENDIMENTO || !atual.atendenteId) {
        throw new Error("NAO_EM_ATENDIMENTO");
      }
      if (atual.atendenteId === req.usuarioId) {
        throw new Error("MESMO_ATENDENTE");
      }

      const atendimentoAnterior = await tx.atendimentoSolicitacaoImagem.findFirst({
        where: { solicitacaoId: id, atendenteId: atual.atendenteId, pausadoEm: null },
        orderBy: { iniciadoEm: "desc" },
      });
      if (!atendimentoAnterior) throw new Error("ATENDIMENTO_NAO_ENCONTRADO");

      const tempoSegundos = Math.max(
        0,
        Math.floor((agora.getTime() - atendimentoAnterior.iniciadoEm.getTime()) / 1000),
      );

      await tx.atendimentoSolicitacaoImagem.update({
        where: { id: atendimentoAnterior.id },
        data: {
          pausadoEm: agora,
          tempoSegundos,
          motivoPausa: `Atendimento assumido por outro usuário. Motivo: ${motivo}`,
          andamento: descricao,
        },
      });

      await tx.solicitacaoImagem.update({
        where: { id },
        data: {
          atendenteId: req.usuarioId,
          atendimentoIniciadoEm: agora,
          tempoTotalAtendimento: { increment: tempoSegundos },
        },
      });

      await tx.atendimentoSolicitacaoImagem.create({
        data: {
          solicitacaoId: id,
          atendenteId: req.usuarioId || 0,
          iniciadoEm: agora,
        },
      });

      await registrarHistorico(
        tx,
        id,
        req,
        "ASSUMIU_ATENDIMENTO",
        `Atendimento assumido de ${atual.atendente?.nome || "outro usuário"}. Motivo: ${motivo}`,
        STATUS.EM_ATENDIMENTO,
        STATUS.EM_ATENDIMENTO,
        {
          motivo,
          descricao,
          atendenteAnteriorId: atual.atendenteId,
          atendenteAnteriorNome: atual.atendente?.nome || null,
          tempoSegundos,
        },
      );

      return tx.solicitacaoImagem.findUniqueOrThrow({
        where: { id },
        include: includeSolicitacao,
      });
    });

    return res.json(solicitacao);
  } catch (error: any) {
    if (error?.message === "NAO_ENCONTRADA") {
      return res.status(404).json({ error: "Solicitação de imagens não encontrada." });
    }
    if (error?.message === "MESMO_ATENDENTE") {
      return res.status(409).json({ error: "Você já é o atendente atual desta solicitação." });
    }
    if (error?.message === "NAO_EM_ATENDIMENTO" || error?.message === "ATENDIMENTO_NAO_ENCONTRADO") {
      return res.status(409).json({ error: "Não há atendimento ativo para assumir." });
    }
    console.error("Erro ao assumir atendimento:", error);
    return res.status(500).json({ error: "Erro ao assumir atendimento." });
  }
}

export async function pausarAtendimentoSolicitacaoImagem(req: AuthRequest, res: Response) {
  try {
    const id = Number(req.params.id);
    const motivo = texto(req.body.motivo);
    const andamento = texto(req.body.andamento);
    if (!motivo || !andamento) {
      return res.status(400).json({ error: "Informe o motivo e o andamento para pausar." });
    }

    const agora = new Date();
    const solicitacao = await prisma.$transaction(async (tx) => {
      const cameraIds = idsNumericos(req.body.cameraIds || req.body.camerasIds);
      const camerasBusca = cameraIds.length
        ? await tx.cameraMonitoramento.findMany({
            where: {
              id: { in: cameraIds },
              unidade: req.unidadeAtiva,
              status: STATUS_CAMERA_CONECTADA,
              statusCadastro: STATUS_CAMERA_ATIVA,
            },
            orderBy: [{ numeroCamera: "asc" }],
            select: {
              id: true,
              numeroCamera: true,
              nomeCamera: true,
              numeroServidor: true,
              localInstalado: true,
              areaMonitorada: true,
              status: true,
            },
          })
        : [];
      const atual = await tx.solicitacaoImagem.findFirst({
        where: { id, excluidoEm: null, unidade: req.unidadeAtiva },
      });
      if (!atual) throw new Error("NAO_ENCONTRADA");
      if (atual.status !== STATUS.EM_ATENDIMENTO) throw new Error("NAO_EM_ATENDIMENTO");
      if (atual.atendenteId !== req.usuarioId) throw new Error("ATENDENTE_DIFERENTE");

      const atendimento = await tx.atendimentoSolicitacaoImagem.findFirst({
        where: { solicitacaoId: id, atendenteId: req.usuarioId || 0, pausadoEm: null },
        orderBy: { iniciadoEm: "desc" },
      });
      if (!atendimento) throw new Error("ATENDIMENTO_NAO_ENCONTRADO");

      const tempoSegundos = Math.max(
        0,
        Math.floor((agora.getTime() - atendimento.iniciadoEm.getTime()) / 1000),
      );

      await tx.atendimentoSolicitacaoImagem.update({
        where: { id: atendimento.id },
        data: { pausadoEm: agora, tempoSegundos, motivoPausa: motivo, andamento },
      });

      await tx.solicitacaoImagem.update({
        where: { id },
        data: {
          status: STATUS.PAUSADO,
          tempoTotalAtendimento: { increment: tempoSegundos },
          atendimentoIniciadoEm: null,
        },
      });

      await registrarHistorico(
        tx,
        id,
        req,
        "PAUSA_ATENDIMENTO",
        `Atendimento pausado. Motivo: ${motivo}`,
        STATUS.EM_ATENDIMENTO,
        STATUS.PAUSADO,
        {
          andamento,
          tempoSegundos,
          camerasBusca: camerasBusca.map((camera) => ({
            ...camera,
            rotulo: rotuloCameraBusca(camera),
          })),
        },
      );

      return tx.solicitacaoImagem.findUniqueOrThrow({
        where: { id },
        include: includeSolicitacao,
      });
    });

    return res.json(solicitacao);
  } catch (error: any) {
    if (error?.message === "NAO_ENCONTRADA") {
      return res.status(404).json({ error: "Solicitação de imagens não encontrada." });
    }
    if (error?.message === "ATENDENTE_DIFERENTE") {
      return res.status(403).json({ error: "Somente o atendente atual pode pausar esta solicitação." });
    }
    if (error?.message === "NAO_EM_ATENDIMENTO" || error?.message === "ATENDIMENTO_NAO_ENCONTRADO") {
      return res.status(409).json({ error: "Não há atendimento ativo para pausar." });
    }
    console.error("Erro ao pausar atendimento:", error);
    return res.status(500).json({ error: "Erro ao pausar atendimento." });
  }
}

export async function listarCamerasConectadasSolicitacaoImagem(req: AuthRequest, res: Response) {
  try {
    const cameras = await prisma.cameraMonitoramento.findMany({
      where: {
        unidade: req.unidadeAtiva,
        status: STATUS_CAMERA_CONECTADA,
        statusCadastro: STATUS_CAMERA_ATIVA,
      },
      orderBy: [{ numeroCamera: "asc" }],
      select: {
        id: true,
        numeroCamera: true,
        nomeCamera: true,
        numeroServidor: true,
        localInstalado: true,
        areaMonitorada: true,
        status: true,
      },
    });

    return res.json(
      cameras.map((camera) => ({
        ...camera,
        rotulo: rotuloCameraBusca(camera),
      })),
    );
  } catch (error) {
    console.error("Erro ao listar câmeras conectadas:", error);
    return res.status(500).json({ error: "Erro ao listar câmeras conectadas." });
  }
}

export async function coletarEvidenciasSolicitacaoImagem(req: AuthRequest, res: Response) {
  try {
    const id = Number(req.params.id);
    const arquivosRecebidos = (req.files as Express.Multer.File[]) || [];
    const arquivos = anexosImagem(arquivosRecebidos);

    if (!arquivos.length) {
      arquivosRecebidos.forEach((arquivo) => removerArquivoUpload(arquivo.path));
      return res.status(400).json({ error: "Envie pelo menos uma imagem como evidência." });
    }

    const arquivosInvalidos = arquivosRecebidos.filter(
      (arquivo) => !arquivo.mimetype?.startsWith("image/"),
    );
    arquivosInvalidos.forEach((arquivo) => removerArquivoUpload(arquivo.path));

    const solicitacao = await prisma.$transaction(async (tx) => {
      const atual = await tx.solicitacaoImagem.findFirst({
        where: { id, excluidoEm: null, unidade: req.unidadeAtiva },
      });

      if (!atual) throw new Error("NAO_ENCONTRADA");
      if (atual.status !== STATUS.EM_ATENDIMENTO) throw new Error("NAO_EM_ATENDIMENTO");
      if (atual.atendenteId !== req.usuarioId) throw new Error("ATENDENTE_DIFERENTE");

      await tx.anexoSolicitacaoImagem.createMany({
        data: anexosParaCriacao(id, arquivos, "Evidencia", req.usuarioId),
      });

      await registrarHistorico(
        tx,
        id,
        req,
        "COLETA_EVIDENCIAS",
        `Evidências coletadas: ${arquivos.length}.`,
        atual.status,
        atual.status,
        {
          quantidade: arquivos.length,
          arquivos: arquivos.map((arquivo) => arquivo.originalname),
        },
      );

      return buscarSolicitacaoComHistorico(tx, id);
    });

    return res.status(201).json(solicitacao);
  } catch (error: any) {
    ((req.files as Express.Multer.File[]) || []).forEach((arquivo) =>
      removerArquivoUpload(arquivo.path),
    );
    if (error?.message === "NAO_ENCONTRADA") {
      return res.status(404).json({ error: "Solicitação de imagens não encontrada." });
    }
    if (error?.message === "ATENDENTE_DIFERENTE") {
      return res.status(403).json({ error: "Somente o atendente atual pode coletar evidências." });
    }
    if (error?.message === "NAO_EM_ATENDIMENTO") {
      return res.status(409).json({ error: "A coleta de evidências só fica disponível durante o atendimento." });
    }
    console.error("Erro ao coletar evidências:", error);
    return res.status(500).json({ error: "Erro ao coletar evidências." });
  }
}

export async function excluirEvidenciaSolicitacaoImagem(req: AuthRequest, res: Response) {
  try {
    const id = Number(req.params.id);
    const anexoId = Number(req.params.anexoId);

    const solicitacao = await prisma.$transaction(async (tx) => {
      const atual = await tx.solicitacaoImagem.findFirst({
        where: { id, excluidoEm: null, unidade: req.unidadeAtiva },
      });

      if (!atual) throw new Error("NAO_ENCONTRADA");
      if (atual.status !== STATUS.EM_ATENDIMENTO) throw new Error("NAO_EM_ATENDIMENTO");
      if (atual.atendenteId !== req.usuarioId) throw new Error("ATENDENTE_DIFERENTE");

      const anexo = await tx.anexoSolicitacaoImagem.findFirst({
        where: { id: anexoId, solicitacaoId: id, origem: "Evidencia" },
      });
      if (!anexo) throw new Error("EVIDENCIA_NAO_ENCONTRADA");

      await tx.anexoSolicitacaoImagem.delete({ where: { id: anexo.id } });

      await registrarHistorico(
        tx,
        id,
        req,
        "EXCLUSAO_EVIDENCIA",
        `Evidência removida: ${anexo.nomeOriginal}.`,
        atual.status,
        atual.status,
        { anexoId: anexo.id, nomeOriginal: anexo.nomeOriginal },
      );

      removerArquivoUpload(anexo.caminho);

      return buscarSolicitacaoComHistorico(tx, id);
    });

    return res.json(solicitacao);
  } catch (error: any) {
    if (error?.message === "NAO_ENCONTRADA" || error?.message === "EVIDENCIA_NAO_ENCONTRADA") {
      return res.status(404).json({ error: "Evidência não encontrada." });
    }
    if (error?.message === "ATENDENTE_DIFERENTE") {
      return res.status(403).json({ error: "Somente o atendente atual pode excluir evidências." });
    }
    if (error?.message === "NAO_EM_ATENDIMENTO") {
      return res.status(409).json({ error: "Evidências só podem ser removidas durante o atendimento." });
    }
    console.error("Erro ao excluir evidência:", error);
    return res.status(500).json({ error: "Erro ao excluir evidência." });
  }
}

export async function excluirSolicitacaoImagem(req: AuthRequest, res: Response) {
  try {
    if (![PERFIS.SUPER_ADMIN, PERFIS.ADMINISTRADOR].includes(req.usuarioPerfil || "")) {
      return res.status(403).json({
        error: "Somente administradores e Super Admin podem excluir solicitações de imagens.",
      });
    }

    const id = Number(req.params.id);
    const motivo = texto(req.body?.motivo) || "Exclusão administrativa";

    const solicitacao = await prisma.$transaction(async (tx) => {
      const atual = await tx.solicitacaoImagem.findFirst({
        where: { id, excluidoEm: null, unidade: req.unidadeAtiva },
      });
      if (!atual) throw new Error("NAO_ENCONTRADA");

      await tx.solicitacaoImagem.update({
        where: { id },
        data: { excluidoEm: new Date(), excluidoPorId: req.usuarioId || null },
      });

      await registrarHistorico(
        tx,
        id,
        req,
        "EXCLUSAO",
        `Solicitação excluída. Motivo: ${motivo}`,
        atual.status,
        atual.status,
      );

      return atual;
    });

    await registrarLog({
      acao: "Exclusão de solicitação de imagens",
      tipoRegistro: "SolicitacaoImagem",
      registroId: solicitacao.id,
      dadosAnteriores: solicitacao,
      req,
    });

    return res.status(204).send();
  } catch (error: any) {
    if (error?.message === "NAO_ENCONTRADA") {
      return res.status(404).json({ error: "Solicitação de imagens não encontrada." });
    }
    console.error("Erro ao excluir solicitação de imagens:", error);
    return res.status(500).json({ error: "Erro ao excluir solicitação de imagens." });
  }
}

export async function enviarFormularioSolicitacaoImagem(req: AuthRequest, res: Response) {
  try {
    const email = texto(req.body.email).toLowerCase();
    if (!email || !email.includes("@")) {
      return res.status(400).json({ error: "Informe um e-mail válido." });
    }

    const token = crypto.randomBytes(32).toString("hex");
    const link = urlPublica(token);
    const expiraEm = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await prisma.tokenSolicitacaoImagem.create({
      data: {
        tokenHash: hashToken(token),
        email,
        expiraEm,
        criadoPorId: req.usuarioId || null,
      },
    });

    const emailResultado = await enviarEmail({
      to: email,
      subject: "Formulário de solicitação de imagens - MoveSecurity",
      text: `Acesse o formulário de solicitação de imagens: ${link}\n\nEste link expira em 24 horas e pode ser utilizado uma única vez.`,
      html: `<p>Olá,</p><p>Acesse o formulário de solicitação de imagens pelo link abaixo:</p><p><a href="${link}">${link}</a></p><p>Este link expira em 24 horas e pode ser utilizado uma única vez.</p>`,
    });

    return res.status(201).json({ link, expiraEm, email: emailResultado });
  } catch (error) {
    console.error("Erro ao enviar formulário de solicitação de imagens:", error);
    return res.status(500).json({ error: "Erro ao enviar formulário." });
  }
}

export async function validarTokenSolicitacaoImagem(req: AuthRequest, res: Response) {
  try {
    const token = texto(req.params.token);
    const unidade = unidadePublica(req);
    const locais = await locaisPublicos(unidade);

    if (tokenTesteDesenvolvimento(token)) {
      return res.json({
        email: "teste.desenvolvimento@movecta.com.br",
        expiraEm: new Date(Date.now() + 24 * 60 * 60 * 1000),
        unidade,
        locais,
        desenvolvimento: true,
      });
    }

    const registro = await prisma.tokenSolicitacaoImagem.findUnique({
      where: { tokenHash: hashToken(token) },
    });

    if (!registro || registro.usadoEm || registro.expiraEm.getTime() < Date.now()) {
      return res.status(404).json({ error: "Link inválido, expirado ou já utilizado." });
    }

    return res.json({ email: registro.email, expiraEm: registro.expiraEm, unidade, locais });
  } catch (error) {
    console.error("Erro ao validar token:", error);
    return res.status(500).json({ error: "Erro ao validar link." });
  }
}

export async function criarSolicitacaoImagemPublica(req: AuthRequest, res: Response) {
  try {
    const erro = validarCamposBase(req.body, true);
    if (erro) return res.status(400).json({ error: erro });

    const token = texto(req.params.token);
    const arquivos = (req.files as Express.Multer.File[]) || [];
    const ano = new Date().getFullYear();
    const unidade = unidadePublica(req);
    const dataOcorrencia = dataOpcional(req.body.dataOcorrencia);
    const dataFinalOcorrencia =
      dataOpcional(req.body.dataFinalOcorrencia) || dataOcorrencia;
    const horaInicial = textoOpcional(req.body.horaInicial);
    const horaFinal = textoOpcional(req.body.horaFinal);
    const erroPeriodo = validarPeriodoOcorrencia(
      dataOcorrencia,
      horaInicial,
      dataFinalOcorrencia,
      horaFinal,
    );
    if (erroPeriodo) return res.status(400).json({ error: erroPeriodo });

    const local = textoOpcional(req.body.local);
    if (local) {
      const localCadastro = await validarLocalAtivo(local, unidade);
      if (!localCadastro) {
        return res.status(400).json({
          error: "Selecione um local ativo cadastrado para esta unidade.",
        });
      }
    }

    const solicitacao = await prisma.$transaction(async (tx) => {
      const tokenDesenvolvimento = tokenTesteDesenvolvimento(token);
      const registro = tokenDesenvolvimento
        ? null
        : await tx.tokenSolicitacaoImagem.findUnique({
            where: { tokenHash: hashToken(token) },
          });

      if (
        !tokenDesenvolvimento &&
        (!registro || registro.usadoEm || registro.expiraEm.getTime() < Date.now())
      ) {
        throw new Error("TOKEN_INVALIDO");
      }

      const numero = await proximaSequencia(tx, ano);
      const criada = await tx.solicitacaoImagem.create({
        data: {
          ano,
          numero,
          protocolo: protocoloImagem(numero, ano),
          unidade,
          origem: "Formulário Externo",
          titulo: texto(req.body.titulo),
          solicitanteNome: texto(req.body.nome || req.body.solicitanteNome),
          solicitanteEmail: texto(req.body.email).toLowerCase(),
          solicitanteSetor: textoOpcional(req.body.setor),
          solicitanteCargo: textoOpcional(req.body.cargo),
          local,
          dataOcorrencia,
          dataFinalOcorrencia,
          horaInicial,
          horaFinal,
          descricao: textoOpcional(req.body.descricao),
          prioridade: "Não Classificada",
          status: STATUS.AGUARDANDO_CLASSIFICACAO,
        },
      });

      if (arquivos.length) {
        await tx.anexoSolicitacaoImagem.createMany({
          data: anexosParaCriacao(criada.id, arquivos, "Formulário Externo"),
        });
      }

      if (registro) {
        await tx.tokenSolicitacaoImagem.update({
          where: { id: registro.id },
          data: { usadoEm: new Date() },
        });
      }

      await registrarHistorico(
        tx,
        criada.id,
        null,
        "CRIACAO_EXTERNA",
        `Solicitação ${criada.protocolo} criada via formulário externo.`,
        null,
        criada.status,
      );

      return criada;
    });

    return res.status(201).json({
      protocolo: solicitacao.protocolo,
      status: solicitacao.status,
    });
  } catch (error: any) {
    if (error?.message === "TOKEN_INVALIDO") {
      return res.status(404).json({ error: "Link inválido, expirado ou já utilizado." });
    }
    console.error("Erro ao criar solicitação pública de imagens:", error);
    return res.status(500).json({ error: "Erro ao enviar solicitação." });
  }
}
