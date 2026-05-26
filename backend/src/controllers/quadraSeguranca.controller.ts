import { Response } from "express";
import { prisma } from "../lib/prisma";
import { AuthRequest, PERFIS } from "../middlewares/auth";
import { registrarLog } from "../services/auditoria.service";
import { calcularHashArquivo } from "../utils/arquivoHash";

const STATUS_ARMAZENADOS = ["Dentro do terminal", "Pendente de verificação", "Bloqueado"];
const STATUS_SAIDA = ["Liberado"];

function bool(valor: unknown) {
  return valor === true || valor === "true" || valor === "Sim" || valor === "sim";
}

function texto(valor: unknown) {
  return String(valor || "").trim();
}

function numeroContainer(valor: unknown) {
  return texto(valor).toLocaleUpperCase("pt-BR");
}

function categoriaArquivos(valor: unknown) {
  const categoria = texto(valor);
  return ["Entrada", "Saída", "Evidências Operacionais"].includes(categoria)
    ? categoria
    : "Evidências Operacionais";
}

function tempoPermanencia(entrada: Date, saida?: Date | null) {
  const fim = saida || new Date();
  const ms = Math.max(0, fim.getTime() - entrada.getTime());
  const horas = Math.floor(ms / 3600000);
  const dias = Math.floor(horas / 24);
  const restoHoras = horas % 24;

  if (dias <= 0) return `${Math.max(1, horas)} hora(s)`;
  if (restoHoras <= 0) return `${dias} dia(s)`;
  return `${dias} dia(s) e ${restoHoras} hora(s)`;
}

function nivelPermanencia(entrada: Date, saida?: Date | null) {
  if (saida) return "finalizado";
  const horas = (Date.now() - entrada.getTime()) / 3600000;
  if (horas >= 72) return "critico";
  if (horas >= 24) return "atencao";
  return "normal";
}

function serializarContainer(container: any) {
  return {
    ...container,
    tempoTerminal: container.dataHoraSaida
      ? `Finalizado em ${tempoPermanencia(container.dataHoraEntrada, container.dataHoraSaida)}`
      : tempoPermanencia(container.dataHoraEntrada),
    nivelPermanencia: nivelPermanencia(container.dataHoraEntrada, container.dataHoraSaida),
  };
}

async function registrarHistorico(params: {
  containerId: number;
  usuarioId?: number;
  acao: string;
  detalhes?: string;
  dadosAnteriores?: unknown;
  dadosNovos?: unknown;
}) {
  await prisma.quadraSegurancaHistorico.create({
    data: {
      containerId: params.containerId,
      usuarioId: params.usuarioId,
      acao: params.acao,
      detalhes: params.detalhes,
      dadosAnteriores: params.dadosAnteriores ? JSON.stringify(params.dadosAnteriores) : undefined,
      dadosNovos: params.dadosNovos ? JSON.stringify(params.dadosNovos) : undefined,
    },
  });
}

export async function listarContainers(req: AuthRequest, res: Response) {
  try {
    const containers = await prisma.quadraSegurancaContainer.findMany({
      where: {
        unidade: req.unidadeAtiva,
      },
      orderBy: { dataHoraEntrada: "desc" },
      include: {
        criadoPor: { select: { nome: true, apelido: true } },
        anexos: true,
      },
    });

    return res.json(containers.map(serializarContainer));
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro ao listar contêineres" });
  }
}

export async function buscarContainer(req: AuthRequest, res: Response) {
  try {
    const container = await prisma.quadraSegurancaContainer.findFirst({
      where: {
        id: Number(req.params.id),
        unidade: req.unidadeAtiva,
      },
      include: {
        criadoPor: { select: { id: true, nome: true, apelido: true } },
        atualizadoPor: { select: { id: true, nome: true, apelido: true } },
        anexos: {
          orderBy: { createdAt: "desc" },
          include: { usuario: { select: { nome: true, apelido: true } } },
        },
        historico: {
          orderBy: { createdAt: "desc" },
          include: { usuario: { select: { nome: true, apelido: true } } },
        },
      },
    });

    if (!container) {
      return res.status(404).json({ error: "Contêiner não encontrado" });
    }

    return res.json(serializarContainer(container));
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro ao buscar dossiê" });
  }
}

export async function criarContainer(req: AuthRequest, res: Response) {
  try {
    const arquivos = (req.files as Express.Multer.File[]) || [];
    const numero = numeroContainer(req.body.numeroContainer);

    if (!numero || !req.body.dataHoraEntrada || !req.body.tipoContainer || !req.body.dimensao || !req.body.destino) {
      return res.status(400).json({ error: "Preencha os dados principais do contêiner." });
    }

    const container = await prisma.quadraSegurancaContainer.create({
      data: {
        numeroContainer: numero,
        unidade: req.unidadeAtiva || "GJA-T1",
        dataHoraEntrada: new Date(req.body.dataHoraEntrada),
        tipoContainer: texto(req.body.tipoContainer),
        dimensao: texto(req.body.dimensao),
        destino: texto(req.body.destino),
        scannerEntrada: bool(req.body.scannerEntrada),
        estufadoTerminal: bool(req.body.estufadoTerminal),
        numeroLacre: texto(req.body.numeroLacre),
        armador: texto(req.body.armador),
        transportadora: texto(req.body.transportadora),
        motoristaResponsavel: texto(req.body.motoristaResponsavel),
        documentoMotorista: texto(req.body.documentoMotorista),
        placaCavalo: texto(req.body.placaCavalo).toLocaleUpperCase("pt-BR"),
        placaCarreta: texto(req.body.placaCarreta).toLocaleUpperCase("pt-BR"),
        tipoCarga: texto(req.body.tipoCarga),
        pesoCarga: texto(req.body.pesoCarga),
        prioridade: texto(req.body.prioridade) || "Baixa",
        statusOperacional: texto(req.body.statusOperacional) || "Dentro do terminal",
        observacoes: texto(req.body.observacoes),
        criadoPorId: req.usuarioId,
        atualizadoPorId: req.usuarioId,
        anexos: {
          create: arquivos.map((arquivo) => ({
            categoria: categoriaArquivos(req.body.categoriaAnexo || "Entrada"),
            nomeOriginal: arquivo.originalname,
            nomeArquivo: arquivo.filename,
            caminho: arquivo.path,
            tipo: arquivo.mimetype,
            hashArquivo: calcularHashArquivo(arquivo.path),
            usuarioId: req.usuarioId,
          })),
        },
      },
      include: { anexos: true, criadoPor: true },
    });

    await registrarHistorico({
      containerId: container.id,
      usuarioId: req.usuarioId,
      acao: "Cadastro de entrada",
      detalhes: `Entrada do contêiner ${container.numeroContainer}`,
      dadosNovos: container,
    });

    await registrarLog({
      req,
      acao: "Criação de contêiner na Quadra de Segurança",
      tipoRegistro: "QuadraSeguranca",
      registroId: container.id,
      dadosNovos: container,
    });

    return res.status(201).json(serializarContainer(container));
  } catch (error: any) {
    if (error?.code === "P2002") {
      return res.status(400).json({ error: "Este contêiner já está cadastrado nesta unidade." });
    }

    console.error(error);
    return res.status(500).json({ error: "Erro ao cadastrar contêiner" });
  }
}

export async function atualizarContainer(req: AuthRequest, res: Response) {
  try {
    const arquivos = (req.files as Express.Multer.File[]) || [];
    const anterior = await prisma.quadraSegurancaContainer.findFirst({
      where: {
        id: Number(req.params.id),
        unidade: req.unidadeAtiva,
      },
      include: { anexos: true },
    });

    if (!anterior) {
      return res.status(404).json({ error: "Contêiner não encontrado" });
    }

    const container = await prisma.quadraSegurancaContainer.update({
      where: { id: anterior.id },
      data: {
        numeroContainer: numeroContainer(req.body.numeroContainer || anterior.numeroContainer),
        dataHoraEntrada: req.body.dataHoraEntrada ? new Date(req.body.dataHoraEntrada) : anterior.dataHoraEntrada,
        dataHoraSaida: req.body.dataHoraSaida ? new Date(req.body.dataHoraSaida) : anterior.dataHoraSaida,
        tipoContainer: texto(req.body.tipoContainer) || anterior.tipoContainer,
        dimensao: texto(req.body.dimensao) || anterior.dimensao,
        destino: texto(req.body.destino) || anterior.destino,
        scannerEntrada: req.body.scannerEntrada === undefined ? anterior.scannerEntrada : bool(req.body.scannerEntrada),
        scannerSaida: req.body.scannerSaida === undefined ? anterior.scannerSaida : bool(req.body.scannerSaida),
        estufadoTerminal: req.body.estufadoTerminal === undefined ? anterior.estufadoTerminal : bool(req.body.estufadoTerminal),
        numeroLacre: texto(req.body.numeroLacre),
        novoLacre: texto(req.body.novoLacre),
        armador: texto(req.body.armador),
        transportadora: texto(req.body.transportadora),
        motoristaResponsavel: texto(req.body.motoristaResponsavel),
        documentoMotorista: texto(req.body.documentoMotorista),
        placaCavalo: texto(req.body.placaCavalo).toLocaleUpperCase("pt-BR"),
        placaCarreta: texto(req.body.placaCarreta).toLocaleUpperCase("pt-BR"),
        tipoCarga: texto(req.body.tipoCarga),
        pesoCarga: texto(req.body.pesoCarga),
        prioridade: texto(req.body.prioridade) || anterior.prioridade,
        statusOperacional: texto(req.body.statusOperacional) || anterior.statusOperacional,
        statusFinal: texto(req.body.statusFinal),
        observacoes: texto(req.body.observacoes),
        observacoesSaida: texto(req.body.observacoesSaida),
        atualizadoPorId: req.usuarioId,
        anexos: {
          create: arquivos.map((arquivo) => ({
            categoria: categoriaArquivos(req.body.categoriaAnexo),
            nomeOriginal: arquivo.originalname,
            nomeArquivo: arquivo.filename,
            caminho: arquivo.path,
            tipo: arquivo.mimetype,
            hashArquivo: calcularHashArquivo(arquivo.path),
            usuarioId: req.usuarioId,
          })),
        },
      },
      include: { anexos: true, criadoPor: true, atualizadoPor: true },
    });

    await registrarHistorico({
      containerId: container.id,
      usuarioId: req.usuarioId,
      acao: container.dataHoraSaida && !anterior.dataHoraSaida ? "Registro de saída" : "Atualização operacional",
      detalhes: `Atualização do contêiner ${container.numeroContainer}`,
      dadosAnteriores: anterior,
      dadosNovos: container,
    });

    await registrarLog({
      req,
      acao: "Atualização de contêiner na Quadra de Segurança",
      tipoRegistro: "QuadraSeguranca",
      registroId: container.id,
      dadosAnteriores: anterior,
      dadosNovos: container,
    });

    return res.json(serializarContainer(container));
  } catch (error: any) {
    if (error?.code === "P2002") {
      return res.status(400).json({ error: "Este contêiner já está cadastrado nesta unidade." });
    }

    console.error(error);
    return res.status(500).json({ error: "Erro ao atualizar contêiner" });
  }
}

export async function excluirContainer(req: AuthRequest, res: Response) {
  try {
    if (req.usuarioPerfil === PERFIS.OPERADOR) {
      return res.status(403).json({ error: "Operadores não podem excluir registros da Quadra de Segurança." });
    }

    const container = await prisma.quadraSegurancaContainer.findFirst({
      where: { id: Number(req.params.id), unidade: req.unidadeAtiva },
    });

    if (!container) {
      return res.status(404).json({ error: "Contêiner não encontrado" });
    }

    await prisma.quadraSegurancaContainer.delete({ where: { id: container.id } });
    await registrarLog({
      req,
      acao: "Exclusão de contêiner na Quadra de Segurança",
      tipoRegistro: "QuadraSeguranca",
      registroId: container.id,
      dadosAnteriores: container,
    });

    return res.status(204).send();
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro ao excluir contêiner" });
  }
}

export async function dashboardQuadra(req: AuthRequest, res: Response) {
  try {
    const ano = Number(req.query.ano || new Date().getFullYear());
    const inicioAno = new Date(ano, 0, 1);
    const fimAno = new Date(ano + 1, 0, 1);

    const containers = await prisma.quadraSegurancaContainer.findMany({
      where: {
        unidade: req.unidadeAtiva,
        dataHoraEntrada: {
          gte: inicioAno,
          lt: fimAno,
        },
      },
    });

    const armazenados = containers.filter((item) => STATUS_ARMAZENADOS.includes(item.statusOperacional));
    const previstos = containers.filter((item) => item.statusOperacional === "Previsto para chegada");
    const saidos = containers.filter((item) =>
      STATUS_SAIDA.includes(item.statusOperacional) ||
      Boolean(item.dataHoraSaida) ||
      ["Liberado", "Retido", "Encaminhado para verificação", "Finalizado"].includes(item.statusFinal || "")
    );
    const criticos = armazenados.filter((item) => nivelPermanencia(item.dataHoraEntrada, item.dataHoraSaida) === "critico");

    return res.json({
      ano,
      total: containers.length,
      noTerminal: armazenados.length,
      armazenados: armazenados.length,
      previstos: previstos.length,
      saidos: saidos.length,
      permanenciaCritica: criticos.length,
      bloqueados: containers.filter((item) => item.statusOperacional === "Bloqueado").length,
      pendentes: containers.filter((item) => item.statusOperacional === "Pendente de verificação").length,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro ao carregar dashboard da quadra" });
  }
}
