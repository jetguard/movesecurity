import { Response } from "express";
import PDFDocument from "pdfkit";
import { prisma } from "../lib/prisma";
import { AuthRequest, PERFIS } from "../middlewares/auth";
import { registrarLog } from "../services/auditoria.service";
import { calcularHashArquivo } from "../utils/arquivoHash";

const QUADRAS_20 = ["A06", "A07"];
const QUADRAS_40_OFICIAIS = ["A09", "A11"];
const POSICOES_40: Record<string, string> = { A09: "A08", A11: "A10" };

const STATUS_ARMAZENADOS = ["Dentro do terminal", "Pendente de verificação", "Bloqueado"];
const STATUS_SAIDA = ["Liberado"];
const STATUS_VALIDOS = ["Previsão para chegada", "No terminal", "Liberado"];

function bool(valor: unknown) {
  return valor === true || valor === "true" || valor === "Sim" || valor === "sim";
}

function texto(valor: unknown) {
  return String(valor || "").trim();
}

function numeroContainer(valor: unknown) {
  return texto(valor).toLocaleUpperCase("pt-BR");
}

function statusOperacional(valor: unknown) {
  const status = texto(valor);
  return STATUS_VALIDOS.includes(status) ? status : "Previsão para chegada";
}

function normalizarPosicionamento(valor: unknown) {
  return texto(valor).toLocaleUpperCase("pt-BR").replace(/[^A-Z0-9]/g, "");
}

function dimensaoOperacional(valor: unknown) {
  const dimensao = texto(valor).toLocaleUpperCase("pt-BR");
  return dimensao.includes("40") ? "40" : "20";
}

function interpretarPosicao(posicionamento?: string | null) {
  const posicao = normalizarPosicionamento(posicionamento);
  const match = /^A(0[6-9]|1[01])([0-9]{2})([1-5])$/.exec(posicao);
  if (!match) return null;
  return {
    posicao,
    quadra: `A${match[1]}`,
    pilha: match[2],
    altura: match[3],
  };
}

function slotsOcupados(posicionamento: string | null | undefined, dimensao: string) {
  const posicao = interpretarPosicao(posicionamento);
  if (!posicao) return [];

  if (dimensaoOperacional(dimensao) === "40") {
    const quadraAnterior = POSICOES_40[posicao.quadra];
    return quadraAnterior
      ? [`${quadraAnterior}${posicao.pilha}${posicao.altura}`, `${posicao.quadra}${posicao.pilha}${posicao.altura}`]
      : [posicao.posicao];
  }

  return [posicao.posicao];
}

function pilhasOcupadas(posicionamento: string | null | undefined, dimensao: string) {
  const posicao = interpretarPosicao(posicionamento);
  if (!posicao) return [];

  if (dimensaoOperacional(dimensao) === "40") {
    const quadraAnterior = POSICOES_40[posicao.quadra];
    return quadraAnterior ? [`${quadraAnterior}-${posicao.pilha}`, `${posicao.quadra}-${posicao.pilha}`] : [`${posicao.quadra}-${posicao.pilha}`];
  }

  return [`${posicao.quadra}-${posicao.pilha}`];
}

async function validarPosicionamentoOperacional(params: {
  idIgnorar?: number;
  unidade?: string;
  posicionamento?: string | null;
  dimensao: string;
  statusOperacional: string;
}) {
  const posicao = interpretarPosicao(params.posicionamento);
  if (!posicao || params.statusOperacional === "Liberado") return;

  const dimensao = dimensaoOperacional(params.dimensao);
  if (dimensao === "20" && !QUADRAS_20.includes(posicao.quadra)) {
    const erro = new Error("Conteiner de 20 pes deve ser posicionado somente nas quadras A06 ou A07.");
    (erro as any).status = 400;
    throw erro;
  }

  if (dimensao === "40" && !QUADRAS_40_OFICIAIS.includes(posicao.quadra)) {
    const erro = new Error("Conteiner de 40 pes deve usar a posicao oficial da segunda quadra ocupada: A09 ou A11.");
    (erro as any).status = 400;
    throw erro;
  }

  const containers = await prisma.quadraSegurancaContainer.findMany({
    where: {
      unidade: params.unidade,
      statusOperacional: { not: "Liberado" },
      ...(params.idIgnorar ? { id: { not: params.idIgnorar } } : {}),
    },
    select: {
      id: true,
      numeroContainer: true,
      posicionamento: true,
      dimensao: true,
    },
  });

  const novosSlots = new Set(slotsOcupados(posicao.posicao, params.dimensao));
  const novasPilhas = new Set(pilhasOcupadas(posicao.posicao, params.dimensao));

  for (const existente of containers) {
    const slotsExistentes = slotsOcupados(existente.posicionamento, existente.dimensao);
    if (slotsExistentes.some((slot) => novosSlots.has(slot))) {
      const erro = new Error(`Posicao ocupada pelo conteiner ${existente.numeroContainer}.`);
      (erro as any).status = 400;
      throw erro;
    }

    const dimensaoExistente = dimensaoOperacional(existente.dimensao);
    const pilhasExistentes = pilhasOcupadas(existente.posicionamento, existente.dimensao);
    const misturaDimensao = dimensaoExistente !== dimensao && pilhasExistentes.some((pilha) => novasPilhas.has(pilha));
    if (misturaDimensao) {
      const erro = new Error(`Regra de empilhamento violada: nao e permitido misturar conteiner de 20 pes com 40 pes na mesma pilha. Conflito com ${existente.numeroContainer}.`);
      (erro as any).status = 400;
      throw erro;
    }
  }
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
  const dias = Math.max(0, Math.floor(ms / 86400000));

  return `${dias} dia(s)`;
}

function nivelPermanencia(entrada: Date, saida?: Date | null): string {
  if (saida) return "finalizado";
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

function lacreDivergente(container: { numeroLacre?: string | null; novoLacre?: string | null }) {
  const entrada = texto(container.numeroLacre).toLocaleUpperCase("pt-BR");
  const saida = texto(container.novoLacre).toLocaleUpperCase("pt-BR");
  return Boolean(entrada && saida && entrada !== saida);
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

export async function exportarDossieContainerPdf(req: AuthRequest, res: Response) {
  try {
    const container = await prisma.quadraSegurancaContainer.findFirst({
      where: {
        id: Number(req.params.id),
        unidade: req.unidadeAtiva,
      },
      include: {
        criadoPor: { select: { nome: true, apelido: true } },
        atualizadoPor: { select: { nome: true, apelido: true } },
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

    const doc = new PDFDocument({ margin: 44, size: "A4" });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename=dossie-container-${container.numeroContainer}.pdf`);
    doc.pipe(res);

    doc.font("Helvetica-Bold").fontSize(18).fillColor("#0f172a").text("Dossiê do Contêiner");
    doc.font("Helvetica").fontSize(10).fillColor("#475569").text(`Quadra de Segurança | Unidade ${container.unidade}`);
    doc.moveDown();

    const linha = (titulo: string, conteudo: unknown) => {
      doc.font("Helvetica-Bold").fontSize(9).fillColor("#64748b").text(titulo.toUpperCase());
      doc.font("Helvetica").fontSize(11).fillColor("#111827").text(String(conteudo || "Não informado"));
      doc.moveDown(0.35);
    };

    linha("Contêiner", container.numeroContainer);
    linha("Status operacional", container.statusOperacional);
    linha("Tempo no terminal", serializarContainer(container).tempoTerminal);
    linha("Entrada", container.dataHoraEntrada.toLocaleString("pt-BR"));
    linha("Saída", container.dataHoraSaida?.toLocaleString("pt-BR") || "Em aberto");
    linha("Tipo / dimensão / destino", `${container.tipoContainer} | ${container.dimensao} | ${container.destino}`);
    linha("Lacre de entrada", container.numeroLacre);
    linha("Lacre de saída", container.novoLacre || "Não informado");
    linha("Divergência de lacre", lacreDivergente(container) ? "Sim" : "Não");
    linha("Scanner", `Entrada: ${container.scannerEntrada ? "Sim" : "Não"} | Saída: ${container.scannerSaida ? "Sim" : "Não"}`);
    linha("Transportadora / motorista", `${container.transportadora || "Não informado"} | ${container.motoristaResponsavel || "Não informado"}`);
    linha("Observações", container.observacoes || "Sem observações");
    linha("Observações de saída", container.observacoesSaida || "Sem observações");

    doc.addPage();
    doc.font("Helvetica-Bold").fontSize(14).fillColor("#0f172a").text("Timeline operacional");
    doc.moveDown();
    container.historico.forEach((item) => {
      doc.font("Helvetica-Bold").fontSize(10).fillColor("#111827").text(`${item.createdAt.toLocaleString("pt-BR")} - ${item.acao}`);
      doc.font("Helvetica").fontSize(9).fillColor("#475569").text(`${item.usuario?.apelido || item.usuario?.nome || "Sistema"} | ${item.detalhes || "Sem detalhes"}`);
      doc.moveDown(0.6);
    });

    doc.addPage();
    doc.font("Helvetica-Bold").fontSize(14).fillColor("#0f172a").text("Anexos e evidências");
    doc.moveDown();
    container.anexos.forEach((anexo) => {
      doc.font("Helvetica-Bold").fontSize(10).fillColor("#111827").text(`${anexo.categoria} - ${anexo.nomeOriginal}`);
      doc.font("Helvetica").fontSize(9).fillColor("#475569").text(`Responsável: ${anexo.usuario?.apelido || anexo.usuario?.nome || "Não informado"} | Hash: ${anexo.hashArquivo || "Não calculado"}`);
      doc.moveDown(0.6);
    });

    doc.end();
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro ao gerar dossiê PDF do contêiner" });
  }
}

export async function criarContainer(req: AuthRequest, res: Response) {
  try {
    const arquivos = (req.files as Express.Multer.File[]) || [];
    const numero = numeroContainer(req.body.numeroContainer);

    if (!numero || !req.body.dataHoraEntrada || !req.body.tipoContainer || !req.body.dimensao || !req.body.destino) {
      return res.status(400).json({ error: "Preencha os dados principais do contêiner." });
    }

    const status = statusOperacional(req.body.statusOperacional);
    const posicionamento = status === "Previsão para chegada" ? "" : normalizarPosicionamento(req.body.posicionamento);
    await validarPosicionamentoOperacional({
      unidade: req.unidadeAtiva || "GJA-T1",
      posicionamento,
      dimensao: texto(req.body.dimensao),
      statusOperacional: status,
    });

    const container = await prisma.quadraSegurancaContainer.create({
      data: {
        numeroContainer: numero,
        unidade: req.unidadeAtiva || "GJA-T1",
        dataHoraEntrada: new Date(req.body.dataHoraEntrada),
        dataHoraSaida: req.body.dataHoraSaida ? new Date(req.body.dataHoraSaida) : undefined,
        posicionamento,
        tipoContainer: texto(req.body.tipoContainer),
        dimensao: texto(req.body.dimensao),
        destino: texto(req.body.destino),
        scannerEntrada: bool(req.body.scannerEntrada),
        estufadoTerminal: bool(req.body.estufadoTerminal),
        numeroLacre: texto(req.body.numeroLacre),
        armador: texto(req.body.armador),
        prioridade: texto(req.body.prioridade) || "Baixa",
        statusOperacional: status,
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
    if (error?.status) {
      return res.status(error.status).json({ error: error.message });
    }
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

    const status = statusOperacional(req.body.statusOperacional || anterior.statusOperacional);
    const dimensaoAtualizada = texto(req.body.dimensao) || anterior.dimensao;
    const posicionamento = status === "Previsão para chegada" ? "" : normalizarPosicionamento(req.body.posicionamento ?? anterior.posicionamento);
    await validarPosicionamentoOperacional({
      idIgnorar: anterior.id,
      unidade: req.unidadeAtiva,
      posicionamento,
      dimensao: dimensaoAtualizada,
      statusOperacional: status,
    });

    const container = await prisma.quadraSegurancaContainer.update({
      where: { id: anterior.id },
      data: {
        numeroContainer: numeroContainer(req.body.numeroContainer || anterior.numeroContainer),
        dataHoraEntrada: req.body.dataHoraEntrada ? new Date(req.body.dataHoraEntrada) : anterior.dataHoraEntrada,
        dataHoraSaida: req.body.dataHoraSaida ? new Date(req.body.dataHoraSaida) : anterior.dataHoraSaida,
        posicionamento,
        tipoContainer: texto(req.body.tipoContainer) || anterior.tipoContainer,
        dimensao: dimensaoAtualizada,
        destino: texto(req.body.destino) || anterior.destino,
        scannerEntrada: req.body.scannerEntrada === undefined ? anterior.scannerEntrada : bool(req.body.scannerEntrada),
        scannerSaida: req.body.scannerSaida === undefined ? anterior.scannerSaida : bool(req.body.scannerSaida),
        estufadoTerminal: req.body.estufadoTerminal === undefined ? anterior.estufadoTerminal : bool(req.body.estufadoTerminal),
        numeroLacre: req.body.numeroLacre === undefined ? anterior.numeroLacre : texto(req.body.numeroLacre),
        armador: req.body.armador === undefined ? anterior.armador : texto(req.body.armador),
        prioridade: texto(req.body.prioridade) || anterior.prioridade,
        statusOperacional: status,
        observacoes: req.body.observacoes === undefined ? anterior.observacoes : texto(req.body.observacoes),
        observacoesSaida: req.body.observacoesSaida === undefined ? anterior.observacoesSaida : texto(req.body.observacoesSaida),
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
    if (error?.status) {
      return res.status(error.status).json({ error: error.message });
    }
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
    const porArea = containers.reduce<Record<string, { total: number; criticos: number; bloqueados: number }>>((acc, item) => {
      const area = item.destino || item.tipoCarga || "Não informado";
      acc[area] ||= { total: 0, criticos: 0, bloqueados: 0 };
      acc[area].total += 1;
      if (nivelPermanencia(item.dataHoraEntrada, item.dataHoraSaida) === "critico") acc[area].criticos += 1;
      if (item.statusOperacional === "Bloqueado") acc[area].bloqueados += 1;
      return acc;
    }, {});

    return res.json({
      ano,
      total: containers.length,
      noTerminal: armazenados.length,
      armazenados: armazenados.length,
      previstos: previstos.length,
      saidos: saidos.length,
      permanenciaCritica: criticos.length,
      bloqueados: containers.filter((item) => item.statusOperacional === "Bloqueado").length,
      alertaPermanencia: criticos.map((item) => ({
        id: item.id,
        numeroContainer: item.numeroContainer,
        tempoTerminal: tempoPermanencia(item.dataHoraEntrada, item.dataHoraSaida),
        prioridade: item.prioridade,
        status: item.statusOperacional,
      })),
      lacresDivergentes: containers.filter(lacreDivergente).map((item) => ({
        id: item.id,
        numeroContainer: item.numeroContainer,
        lacreEntrada: item.numeroLacre,
        lacreSaida: item.novoLacre,
      })),
      mapaStatusArea: Object.entries(porArea).map(([area, dados]) => ({
        area,
        ...dados,
      })),
      pendentes: containers.filter((item) => item.statusOperacional === "Pendente de verificação").length,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro ao carregar dashboard da quadra" });
  }
}
