import { Response } from "express";
import PDFDocument from "pdfkit";
import { prisma } from "../lib/prisma";
import { AuthRequest, PERFIS } from "../middlewares/auth";
import { registrarLog } from "../services/auditoria.service";
import { calcularHashArquivo } from "../utils/arquivoHash";

const QUADRAS_20 = ["A06", "A07"];
const QUADRAS_40_OFICIAIS = ["A09", "A11"];
const POSICOES_40: Record<string, string> = { A09: "A08", A11: "A10" };

const STATUS_ARMAZENADOS = [
  "Dentro do terminal",
  "Pendente de verificação",
  "Bloqueado",
];
const STATUS_SAIDA = ["Liberado"];
const STATUS_VALIDOS = ["Previsão para chegada", "No terminal", "Liberado"];

function bool(valor: unknown) {
  return (
    valor === true || valor === "true" || valor === "Sim" || valor === "sim"
  );
}

function texto(valor: unknown) {
  return String(valor || "").trim();
}

function formatarDataHora(data?: Date | string | null) {
  if (!data) return "Não informado";
  const date = data instanceof Date ? data : new Date(data);
  if (Number.isNaN(date.getTime())) return "Não informado";
  return date.toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function nomeResponsavel(
  usuario?: {
    nome?: string | null;
    apelido?: string | null;
    equipe?: string | null;
  } | null,
) {
  return usuario?.apelido || usuario?.nome || "Sistema";
}

function equipeResponsavel(usuario?: { equipe?: string | null } | null) {
  return usuario?.equipe || "Equipe não informada";
}

function lerJsonSeguro(valor?: string | null) {
  if (!valor) return null;
  try {
    return JSON.parse(valor);
  } catch {
    return null;
  }
}

function posicaoTexto(valor?: string | null) {
  return texto(valor) || "Sem posição";
}

function dadosReposicionamento(item: {
  dadosAnteriores?: string | null;
  dadosNovos?: string | null;
}) {
  const anterior = lerJsonSeguro(item.dadosAnteriores);
  const novo = lerJsonSeguro(item.dadosNovos);
  const posicaoAnterior = posicaoTexto(anterior?.posicionamento);
  const posicaoAtual = posicaoTexto(novo?.posicionamento);
  const mudouPosicao =
    normalizarPosicionamento(posicaoAnterior) !==
    normalizarPosicionamento(posicaoAtual);
  return {
    anterior,
    novo,
    posicaoAnterior,
    posicaoAtual,
    mudouPosicao,
  };
}

function numeroContainer(valor: unknown) {
  return texto(valor).toLocaleUpperCase("pt-BR");
}

function statusOperacional(valor: unknown) {
  const status = texto(valor);
  return STATUS_VALIDOS.includes(status) ? status : "Previsão para chegada";
}

function normalizarPosicionamento(valor: unknown) {
  return texto(valor)
    .toLocaleUpperCase("pt-BR")
    .replace(/[^A-Z0-9]/g, "");
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

function slotsOcupados(
  posicionamento: string | null | undefined,
  dimensao: string,
) {
  const posicao = interpretarPosicao(posicionamento);
  if (!posicao) return [];

  if (dimensaoOperacional(dimensao) === "40") {
    const quadraAnterior = POSICOES_40[posicao.quadra];
    return quadraAnterior
      ? [
          `${quadraAnterior}${posicao.pilha}${posicao.altura}`,
          `${posicao.quadra}${posicao.pilha}${posicao.altura}`,
        ]
      : [posicao.posicao];
  }

  return [posicao.posicao];
}

function pilhasOcupadas(
  posicionamento: string | null | undefined,
  dimensao: string,
) {
  const posicao = interpretarPosicao(posicionamento);
  if (!posicao) return [];

  if (dimensaoOperacional(dimensao) === "40") {
    const quadraAnterior = POSICOES_40[posicao.quadra];
    return quadraAnterior
      ? [
          `${quadraAnterior}-${posicao.pilha}`,
          `${posicao.quadra}-${posicao.pilha}`,
        ]
      : [`${posicao.quadra}-${posicao.pilha}`];
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
    const erro = new Error(
      "Conteiner de 20 pes deve ser posicionado somente nas quadras A06 ou A07.",
    );
    (erro as any).status = 400;
    throw erro;
  }

  if (dimensao === "40" && !QUADRAS_40_OFICIAIS.includes(posicao.quadra)) {
    const erro = new Error(
      "Conteiner de 40 pes deve usar a posicao oficial da segunda quadra ocupada: A09 ou A11.",
    );
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
    const slotsExistentes = slotsOcupados(
      existente.posicionamento,
      existente.dimensao,
    );
    if (slotsExistentes.some((slot) => novosSlots.has(slot))) {
      const erro = new Error(
        `Posicao ocupada pelo conteiner ${existente.numeroContainer}.`,
      );
      (erro as any).status = 400;
      throw erro;
    }

    const dimensaoExistente = dimensaoOperacional(existente.dimensao);
    const pilhasExistentes = pilhasOcupadas(
      existente.posicionamento,
      existente.dimensao,
    );
    const misturaDimensao =
      dimensaoExistente !== dimensao &&
      pilhasExistentes.some((pilha) => novasPilhas.has(pilha));
    if (misturaDimensao) {
      const erro = new Error(
        `Regra de empilhamento violada: nao e permitido misturar conteiner de 20 pes com 40 pes na mesma pilha. Conflito com ${existente.numeroContainer}.`,
      );
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
    nivelPermanencia: nivelPermanencia(
      container.dataHoraEntrada,
      container.dataHoraSaida,
    ),
  };
}

function lacreDivergente(container: {
  numeroLacre?: string | null;
  novoLacre?: string | null;
}) {
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
      dadosAnteriores: params.dadosAnteriores
        ? JSON.stringify(params.dadosAnteriores)
        : undefined,
      dadosNovos: params.dadosNovos
        ? JSON.stringify(params.dadosNovos)
        : undefined,
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
          include: {
            usuario: { select: { nome: true, apelido: true, equipe: true } },
          },
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

export async function exportarDossieContainerPdf(
  req: AuthRequest,
  res: Response,
) {
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
          include: {
            usuario: { select: { nome: true, apelido: true, equipe: true } },
          },
        },
      },
    });

    if (!container) {
      return res.status(404).json({ error: "Contêiner não encontrado" });
    }

    const doc = new PDFDocument({ margin: 36, size: "A4", bufferPages: true });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `inline; filename=dossie-container-${container.numeroContainer}.pdf`,
    );
    doc.pipe(res);

    const margem = 36;
    const largura = doc.page.width - margem * 2;
    const azul = "#123f78";
    const azulClaro = "#e8f1ff";
    const textoEscuro = "#0f172a";
    const textoMedio = "#475569";
    const linhaCor = "#dbe7f5";

    const novaPaginaSePreciso = (altura: number) => {
      if (doc.y + altura > doc.page.height - 58) doc.addPage();
    };

    const cabecalho = () => {
      doc.roundedRect(margem, 28, largura, 70, 12).fillColor(azul).fill();
      doc
        .fillColor("#ffffff")
        .font("Helvetica-Bold")
        .fontSize(18)
        .text("Dossiê do Contêiner", margem + 22, 48, { width: 300 });
      doc
        .fillColor("#bfdbfe")
        .font("Helvetica")
        .fontSize(9)
        .text(
          `Quadra de Segurança | Unidade ${container.unidade}`,
          margem + 22,
          73,
          { width: 300 },
        );
      doc
        .roundedRect(doc.page.width - margem - 164, 45, 142, 34, 8)
        .fillColor("#ffffff")
        .fill();
      doc
        .fillColor(azul)
        .font("Helvetica-Bold")
        .fontSize(13)
        .text(container.numeroContainer, doc.page.width - margem - 154, 56, {
          width: 122,
          align: "center",
        });
      doc.y = 122;
    };

    const tituloSecao = (titulo: string, subtitulo?: string) => {
      novaPaginaSePreciso(48);
      doc.moveDown(0.4);
      doc
        .fillColor(azul)
        .font("Helvetica-Bold")
        .fontSize(12)
        .text(titulo.toUpperCase(), margem, doc.y, { width: largura });
      if (subtitulo) {
        doc
          .fillColor(textoMedio)
          .font("Helvetica")
          .fontSize(8.5)
          .text(subtitulo, margem, doc.y + 3, { width: largura });
      }
      doc
        .moveTo(margem, doc.y + 7)
        .lineTo(doc.page.width - margem, doc.y + 7)
        .strokeColor(linhaCor)
        .lineWidth(0.8)
        .stroke();
      doc.moveDown(0.9);
    };

    const card = (
      x: number,
      y: number,
      w: number,
      h: number,
      rotulo: string,
      valor: unknown,
      destaque = textoEscuro,
    ) => {
      doc
        .roundedRect(x, y, w, h, 9)
        .fillColor("#f8fbff")
        .fill()
        .strokeColor(linhaCor)
        .lineWidth(0.8)
        .stroke();
      doc
        .fillColor("#64748b")
        .font("Helvetica-Bold")
        .fontSize(7.5)
        .text(rotulo.toUpperCase(), x + 11, y + 9, { width: w - 22 });
      doc
        .fillColor(destaque)
        .font("Helvetica-Bold")
        .fontSize(10)
        .text(String(valor || "Não informado"), x + 11, y + 25, {
          width: w - 22,
          ellipsis: true,
        });
    };

    cabecalho();

    tituloSecao("Resumo operacional");
    const yResumo = doc.y;
    const col = (largura - 20) / 3;
    card(
      margem,
      yResumo,
      col,
      54,
      "Status",
      container.statusOperacional,
      container.statusOperacional === "Liberado" ? "#047857" : azul,
    );
    card(
      margem + col + 10,
      yResumo,
      col,
      54,
      "Posição atual",
      container.posicionamento || "Sem posição",
      "#2563eb",
    );
    card(
      margem + (col + 10) * 2,
      yResumo,
      col,
      54,
      "Tempo no terminal",
      serializarContainer(container).tempoTerminal,
      "#0f766e",
    );
    doc.y = yResumo + 72;

    tituloSecao("Dados do contêiner");
    const yDados = doc.y;
    card(
      margem,
      yDados,
      col,
      48,
      "Entrada",
      formatarDataHora(container.dataHoraEntrada),
    );
    card(
      margem + col + 10,
      yDados,
      col,
      48,
      "Saída",
      container.dataHoraSaida
        ? formatarDataHora(container.dataHoraSaida)
        : "Em aberto",
    );
    card(
      margem + (col + 10) * 2,
      yDados,
      col,
      48,
      "Tipo / dimensão",
      `${container.tipoContainer} | ${container.dimensao}`,
    );
    card(margem, yDados + 58, col, 48, "Destino", container.destino);
    card(
      margem + col + 10,
      yDados + 58,
      col,
      48,
      "Lacres",
      `Entrada: ${container.numeroLacre || "N/I"} | Saída: ${container.novoLacre || "N/I"}`,
      lacreDivergente(container) ? "#dc2626" : textoEscuro,
    );
    card(
      margem + (col + 10) * 2,
      yDados + 58,
      col,
      48,
      "Scanner",
      `Entrada: ${container.scannerEntrada ? "Sim" : "Não"} | Saída: ${container.scannerSaida ? "Sim" : "Não"}`,
    );
    doc.y = yDados + 124;

    tituloSecao("Transporte e observações");
    doc
      .roundedRect(margem, doc.y, largura, 82, 10)
      .fillColor("#ffffff")
      .fill()
      .strokeColor(linhaCor)
      .lineWidth(0.8)
      .stroke();
    doc
      .fillColor(textoEscuro)
      .font("Helvetica-Bold")
      .fontSize(10)
      .text("Transportadora / motorista", margem + 14, doc.y + 12, {
        width: largura - 28,
      });
    doc
      .fillColor(textoMedio)
      .font("Helvetica")
      .fontSize(9)
      .text(
        `${container.transportadora || "Não informado"} | ${container.motoristaResponsavel || "Não informado"}`,
        margem + 14,
        doc.y + 29,
        { width: largura - 28 },
      );
    doc
      .fillColor(textoEscuro)
      .font("Helvetica-Bold")
      .fontSize(10)
      .text("Observações", margem + 14, doc.y + 50, { width: 120 });
    doc
      .fillColor(textoMedio)
      .font("Helvetica")
      .fontSize(8.5)
      .text(
        `${container.observacoes || "Sem observações"} | Saída: ${container.observacoesSaida || "Sem observações"}`,
        margem + 110,
        doc.y + 50,
        { width: largura - 128, ellipsis: true },
      );
    doc.y += 102;

    const reposicionamentos = container.historico.filter(
      (item) =>
        item.acao === "Reposicionamento de contêiner" ||
        dadosReposicionamento(item).mudouPosicao,
    );
    tituloSecao(
      "Histórico de reposicionamentos",
      "Posição anterior, posição atual, data, usuário e equipe responsável.",
    );
    if (reposicionamentos.length === 0) {
      doc
        .roundedRect(margem, doc.y, largura, 38, 8)
        .fillColor(azulClaro)
        .fill();
      doc
        .fillColor(azul)
        .font("Helvetica-Bold")
        .fontSize(9)
        .text(
          "Nenhum reposicionamento registrado para este contêiner.",
          margem + 12,
          doc.y + 13,
          { width: largura - 24 },
        );
      doc.y += 52;
    } else {
      reposicionamentos.forEach((item, index) => {
        novaPaginaSePreciso(72);
        const dados = dadosReposicionamento(item);
        const y = doc.y;
        doc
          .roundedRect(margem, y, largura, 62, 9)
          .fillColor(index % 2 === 0 ? "#ffffff" : "#f8fbff")
          .fill()
          .strokeColor(linhaCor)
          .lineWidth(0.8)
          .stroke();
        doc
          .fillColor(azul)
          .font("Helvetica-Bold")
          .fontSize(9)
          .text(formatarDataHora(item.createdAt), margem + 12, y + 11, {
            width: 105,
          });
        doc
          .fillColor(textoEscuro)
          .font("Helvetica-Bold")
          .fontSize(10)
          .text(
            `${dados.posicaoAnterior}  â†’  ${dados.posicaoAtual}`,
            margem + 126,
            y + 10,
            { width: 180 },
          );
        doc
          .fillColor(textoMedio)
          .font("Helvetica")
          .fontSize(8.4)
          .text(
            item.detalhes || "Reposicionamento operacional",
            margem + 126,
            y + 29,
            { width: 180, ellipsis: true },
          );
        doc
          .fillColor(textoEscuro)
          .font("Helvetica-Bold")
          .fontSize(8.6)
          .text(nomeResponsavel(item.usuario), margem + 322, y + 12, {
            width: 92,
            ellipsis: true,
          });
        doc
          .fillColor(textoMedio)
          .font("Helvetica")
          .fontSize(8)
          .text(equipeResponsavel(item.usuario), margem + 322, y + 29, {
            width: 92,
            ellipsis: true,
          });
        doc
          .fillColor(textoMedio)
          .font("Helvetica")
          .fontSize(7.5)
          .text("Atualizado por", margem + 322, y + 45, { width: 92 });
        doc.y = y + 76;
      });
    }

    tituloSecao("Timeline operacional completa");
    container.historico.forEach((item) => {
      novaPaginaSePreciso(48);
      const dados = dadosReposicionamento(item);
      const detalhe =
        item.acao === "Reposicionamento de contêiner" || dados.mudouPosicao
          ? `${dados.posicaoAnterior} â†’ ${dados.posicaoAtual}`
          : item.detalhes || "Sem detalhes";
      doc
        .fillColor(textoEscuro)
        .font("Helvetica-Bold")
        .fontSize(9.2)
        .text(
          `${formatarDataHora(item.createdAt)} - ${item.acao}`,
          margem,
          doc.y,
          { width: largura },
        );
      doc
        .fillColor(textoMedio)
        .font("Helvetica")
        .fontSize(8.4)
        .text(
          `${nomeResponsavel(item.usuario)} | ${equipeResponsavel(item.usuario)} | ${detalhe}`,
          margem,
          doc.y + 2,
          { width: largura },
        );
      doc.moveDown(0.9);
    });

    doc.addPage();
    cabecalho();
    tituloSecao("Anexos e evidências");
    if (container.anexos.length === 0) {
      doc
        .fillColor(textoMedio)
        .font("Helvetica")
        .fontSize(9)
        .text("Nenhum anexo registrado.", margem, doc.y);
    }
    container.anexos.forEach((anexo) => {
      novaPaginaSePreciso(42);
      doc
        .roundedRect(margem, doc.y, largura, 36, 8)
        .fillColor("#ffffff")
        .fill()
        .strokeColor(linhaCor)
        .lineWidth(0.8)
        .stroke();
      doc
        .fillColor(textoEscuro)
        .font("Helvetica-Bold")
        .fontSize(9)
        .text(
          `${anexo.categoria} - ${anexo.nomeOriginal}`,
          margem + 12,
          doc.y + 8,
          { width: largura - 24, ellipsis: true },
        );
      doc
        .fillColor(textoMedio)
        .font("Helvetica")
        .fontSize(7.8)
        .text(
          `Responsável: ${nomeResponsavel(anexo.usuario)} | Hash: ${anexo.hashArquivo || "Não calculado"}`,
          margem + 12,
          doc.y + 21,
          { width: largura - 24, ellipsis: true },
        );
      doc.y += 46;
    });

    const range = doc.bufferedPageRange();
    for (let i = range.start; i < range.start + range.count; i++) {
      doc.switchToPage(i);
      doc
        .moveTo(margem, doc.page.height - 40)
        .lineTo(doc.page.width - margem, doc.page.height - 40)
        .strokeColor(linhaCor)
        .lineWidth(0.8)
        .stroke();
      doc
        .fillColor("#64748b")
        .font("Helvetica")
        .fontSize(7.5)
        .text(
          `JetGuard | Dossiê gerado em ${formatarDataHora(new Date())}`,
          margem,
          doc.page.height - 30,
          { width: largura / 2 },
        );
      doc
        .fillColor("#64748b")
        .font("Helvetica")
        .fontSize(7.5)
        .text(
          `Página ${i + 1 - range.start} de ${range.count}`,
          margem + largura / 2,
          doc.page.height - 30,
          { width: largura / 2, align: "right" },
        );
    }

    doc.end();
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ error: "Erro ao gerar dossiê PDF do contêiner" });
  }
}

export async function criarContainer(req: AuthRequest, res: Response) {
  try {
    const arquivos = (req.files as Express.Multer.File[]) || [];
    const numero = numeroContainer(req.body.numeroContainer);

    if (
      !numero ||
      !req.body.dataHoraEntrada ||
      !req.body.tipoContainer ||
      !req.body.dimensao ||
      !req.body.destino
    ) {
      return res
        .status(400)
        .json({ error: "Preencha os dados principais do contêiner." });
    }

    const status = statusOperacional(req.body.statusOperacional);
    const posicionamento =
      status === "Previsão para chegada"
        ? ""
        : normalizarPosicionamento(req.body.posicionamento);
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
        dataHoraSaida: req.body.dataHoraSaida
          ? new Date(req.body.dataHoraSaida)
          : undefined,
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
      return res
        .status(400)
        .json({ error: "Este contêiner já está cadastrado nesta unidade." });
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

    const status = statusOperacional(
      req.body.statusOperacional || anterior.statusOperacional,
    );
    const dimensaoAtualizada = texto(req.body.dimensao) || anterior.dimensao;
    const posicionamento =
      status === "Previsão para chegada"
        ? ""
        : normalizarPosicionamento(
            req.body.posicionamento ?? anterior.posicionamento,
          );
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
        numeroContainer: numeroContainer(
          req.body.numeroContainer || anterior.numeroContainer,
        ),
        dataHoraEntrada: req.body.dataHoraEntrada
          ? new Date(req.body.dataHoraEntrada)
          : anterior.dataHoraEntrada,
        dataHoraSaida: req.body.dataHoraSaida
          ? new Date(req.body.dataHoraSaida)
          : anterior.dataHoraSaida,
        posicionamento,
        tipoContainer: texto(req.body.tipoContainer) || anterior.tipoContainer,
        dimensao: dimensaoAtualizada,
        destino: texto(req.body.destino) || anterior.destino,
        scannerEntrada:
          req.body.scannerEntrada === undefined
            ? anterior.scannerEntrada
            : bool(req.body.scannerEntrada),
        scannerSaida:
          req.body.scannerSaida === undefined
            ? anterior.scannerSaida
            : bool(req.body.scannerSaida),
        estufadoTerminal:
          req.body.estufadoTerminal === undefined
            ? anterior.estufadoTerminal
            : bool(req.body.estufadoTerminal),
        numeroLacre:
          req.body.numeroLacre === undefined
            ? anterior.numeroLacre
            : texto(req.body.numeroLacre),
        armador:
          req.body.armador === undefined
            ? anterior.armador
            : texto(req.body.armador),
        prioridade: texto(req.body.prioridade) || anterior.prioridade,
        statusOperacional: status,
        observacoes:
          req.body.observacoes === undefined
            ? anterior.observacoes
            : texto(req.body.observacoes),
        observacoesSaida:
          req.body.observacoesSaida === undefined
            ? anterior.observacoesSaida
            : texto(req.body.observacoesSaida),
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

    const reposicionamento =
      normalizarPosicionamento(anterior.posicionamento) !==
      normalizarPosicionamento(container.posicionamento);
    const registroSaida = Boolean(
      container.dataHoraSaida && !anterior.dataHoraSaida,
    );

    await registrarHistorico({
      containerId: container.id,
      usuarioId: req.usuarioId,
      acao: registroSaida
        ? "Registro de saída"
        : reposicionamento
          ? "Reposicionamento de contêiner"
          : "Atualização operacional",
      detalhes: reposicionamento
        ? `Posição anterior: ${posicaoTexto(anterior.posicionamento)} | Posição atual: ${posicaoTexto(container.posicionamento)}`
        : `Atualização do contêiner ${container.numeroContainer}`,
      dadosAnteriores: reposicionamento
        ? {
            posicionamento: anterior.posicionamento,
            statusOperacional: anterior.statusOperacional,
            updatedAt: anterior.updatedAt,
          }
        : anterior,
      dadosNovos: reposicionamento
        ? {
            posicionamento: container.posicionamento,
            statusOperacional: container.statusOperacional,
            updatedAt: container.updatedAt,
          }
        : container,
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
      return res
        .status(400)
        .json({ error: "Este contêiner já está cadastrado nesta unidade." });
    }

    console.error(error);
    return res.status(500).json({ error: "Erro ao atualizar contêiner" });
  }
}

export async function excluirContainer(req: AuthRequest, res: Response) {
  try {
    if (req.usuarioPerfil === PERFIS.OPERADOR) {
      return res
        .status(403)
        .json({
          error:
            "Operadores não podem excluir registros da Quadra de Segurança.",
        });
    }

    const container = await prisma.quadraSegurancaContainer.findFirst({
      where: { id: Number(req.params.id), unidade: req.unidadeAtiva },
    });

    if (!container) {
      return res.status(404).json({ error: "Contêiner não encontrado" });
    }

    await prisma.quadraSegurancaContainer.delete({
      where: { id: container.id },
    });
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

    const armazenados = containers.filter((item) =>
      STATUS_ARMAZENADOS.includes(item.statusOperacional),
    );
    const previstos = containers.filter(
      (item) => item.statusOperacional === "Previsto para chegada",
    );
    const saidos = containers.filter(
      (item) =>
        STATUS_SAIDA.includes(item.statusOperacional) ||
        Boolean(item.dataHoraSaida) ||
        [
          "Liberado",
          "Retido",
          "Encaminhado para verificação",
          "Finalizado",
        ].includes(item.statusFinal || ""),
    );
    const criticos = armazenados.filter(
      (item) =>
        nivelPermanencia(item.dataHoraEntrada, item.dataHoraSaida) ===
        "critico",
    );
    const porArea = containers.reduce<
      Record<string, { total: number; criticos: number; bloqueados: number }>
    >((acc, item) => {
      const area = item.destino || item.tipoCarga || "Não informado";
      acc[area] ||= { total: 0, criticos: 0, bloqueados: 0 };
      acc[area].total += 1;
      if (
        nivelPermanencia(item.dataHoraEntrada, item.dataHoraSaida) === "critico"
      )
        acc[area].criticos += 1;
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
      bloqueados: containers.filter(
        (item) => item.statusOperacional === "Bloqueado",
      ).length,
      alertaPermanencia: criticos.map((item) => ({
        id: item.id,
        numeroContainer: item.numeroContainer,
        tempoTerminal: tempoPermanencia(
          item.dataHoraEntrada,
          item.dataHoraSaida,
        ),
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
      pendentes: containers.filter(
        (item) => item.statusOperacional === "Pendente de verificação",
      ).length,
    });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ error: "Erro ao carregar dashboard da quadra" });
  }
}
