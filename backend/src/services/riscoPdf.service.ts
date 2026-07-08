import PDFDocument from "pdfkit";
import { Response } from "express";
import {
  criarQrCodeValidacao,
  desenharCabecalhoPadrao,
  desenharRodapeAssinaturaPadrao,
  pdfTheme,
} from "./documentoPdfBase.service";

type RiscoPdf = {
  id: number;
  codigo: string;
  dataHora: Date;
  unidade: string;
  setor: string;
  local: string;
  tipoRisco: string;
  naturezaRisco: string;
  descricaoRisco: string;
  possivelImpacto: string;
  probabilidade: string;
  severidade: string;
  nivelRisco: string;
  medidasPreventivas: string;
  planoAcao: string;
  responsavelAcaoNome?: string | null;
  prazo: Date;
  status: string;
  responsavel: { nome: string };
  riscoCatalogo?: { nome: string } | null;
};

const margemX = 42;
const larguraConteudo = 511;
const limiteInferior = 705;

function texto(valor?: string | number | Date | null) {
  if (valor instanceof Date) return formatarData(valor);
  const normalizado = String(valor ?? "").trim();
  return normalizado || "Não informado";
}

function formatarData(data?: Date | string | null) {
  if (!data) return "Não informado";
  const parsed = data instanceof Date ? data : new Date(data);
  if (Number.isNaN(parsed.getTime())) return "Não informado";

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(parsed);
}

function garantirEspaco(doc: PDFKit.PDFDocument, altura = 80) {
  if (doc.y + altura > limiteInferior) {
    doc.addPage();
  }
}

function secao(doc: PDFKit.PDFDocument, titulo: string) {
  garantirEspaco(doc, 44);
  const y = doc.y;
  doc.roundedRect(margemX, y, larguraConteudo, 25, 6).fillColor(pdfTheme.accent).fill();
  doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(10).text(titulo.toUpperCase(), margemX + 12, y + 7, {
    width: larguraConteudo - 24,
    lineBreak: false,
    ellipsis: true,
  });
  doc.y = y + 36;
}

function corNivel(nivel: string) {
  if (nivel === "Crítico") return "#dc2626";
  if (nivel === "Alto") return "#ea580c";
  if (nivel === "Moderado") return "#d97706";
  return "#059669";
}

function campo(
  doc: PDFKit.PDFDocument,
  rotulo: string,
  valor?: string | number | Date | null,
  x = margemX,
  y = doc.y,
  width = 160,
  destaque?: string
) {
  doc.roundedRect(x, y, width, 42, 6).fillColor(pdfTheme.soft).fill().strokeColor(pdfTheme.line).lineWidth(0.7).stroke();
  doc.fillColor(pdfTheme.accent).font("Helvetica-Bold").fontSize(7.4).text(rotulo.toUpperCase(), x + 10, y + 7, {
    width: width - 20,
    height: 10,
    ellipsis: true,
  });
  doc.fillColor(destaque || pdfTheme.primary).font("Helvetica-Bold").fontSize(9).text(texto(valor), x + 10, y + 22, {
    width: width - 20,
    height: 13,
    ellipsis: true,
  });
}

function linhaCampos(
  doc: PDFKit.PDFDocument,
  itens: Array<{ rotulo: string; valor?: string | number | Date | null; width?: number; destaque?: string }>
) {
  garantirEspaco(doc, 52);
  const y = doc.y;
  let x = margemX;
  const espacamento = 12;

  itens.forEach((item) => {
    const width = item.width || 160;
    campo(doc, item.rotulo, item.valor, x, y, width, item.destaque);
    x += width + espacamento;
  });

  doc.y = y + 52;
}

function blocoTexto(doc: PDFKit.PDFDocument, rotulo: string, conteudo?: string | null) {
  const valor = texto(conteudo);
  const textoWidth = larguraConteudo - 24;
  const alturaTexto = doc.font("Helvetica").fontSize(9.4).heightOfString(valor, {
    width: textoWidth,
    lineGap: 2,
    align: "justify",
  });
  const altura = Math.max(58, alturaTexto + 34);

  garantirEspaco(doc, altura + 10);
  const y = doc.y;

  doc.roundedRect(margemX, y, larguraConteudo, altura, 7).fillColor("#ffffff").fill().strokeColor(pdfTheme.line).lineWidth(0.8).stroke();
  doc.fillColor(pdfTheme.accent).font("Helvetica-Bold").fontSize(8).text(rotulo.toUpperCase(), margemX + 12, y + 10, {
    width: textoWidth,
    height: 11,
    ellipsis: true,
  });
  doc.fillColor(pdfTheme.primary).font("Helvetica").fontSize(9.4).text(valor, margemX + 12, y + 27, {
    width: textoWidth,
    lineGap: 2,
    align: "justify",
  });

  doc.y = y + altura + 10;
}

function resumoClassificacao(doc: PDFKit.PDFDocument, risco: RiscoPdf) {
  garantirEspaco(doc, 92);
  const y = doc.y;
  const nivelCor = corNivel(risco.nivelRisco);

  doc.roundedRect(margemX, y, larguraConteudo, 80, 8).fillColor("#f8fafc").fill().strokeColor(pdfTheme.line).lineWidth(0.8).stroke();
  doc.rect(margemX, y, 5, 80).fill(nivelCor);

  doc.fillColor(pdfTheme.muted).font("Helvetica-Bold").fontSize(8).text("NÍVEL DE RISCO", margemX + 18, y + 14, { width: 130 });
  doc.fillColor(nivelCor).font("Helvetica-Bold").fontSize(22).text(risco.nivelRisco, margemX + 18, y + 28, { width: 150, lineBreak: false, ellipsis: true });

  campo(doc, "Probabilidade", risco.probabilidade, margemX + 190, y + 19, 140);
  campo(doc, "Impacto / Severidade", risco.severidade, margemX + 344, y + 19, 165);
  doc.y = y + 94;
}

export async function gerarRiscoPdf(res: Response, risco: RiscoPdf, urlValidacao?: string) {
  const doc = new PDFDocument({
    size: "A4",
    bufferPages: true,
    margins: { top: 130, left: margemX, right: margemX, bottom: 128 },
  });
  const nomeArquivo = `analise-risco-${risco.codigo}`.replace(/[^\w.-]+/g, "-").replace("/", "-");
  const qrCode = urlValidacao ? await criarQrCodeValidacao(urlValidacao) : null;

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `inline; filename=${nomeArquivo}.pdf`);
  doc.pipe(res);

  desenharCabecalhoPadrao(doc, {
    titulo: "Análise de Risco Operacional",
    subtitulo: risco.riscoCatalogo?.nome || `${risco.tipoRisco} | ${risco.naturezaRisco}`,
    codigo: risco.codigo,
    unidade: risco.unidade,
    emitidoEm: new Date(),
  });

  secao(doc, "Dados da análise");
  linhaCampos(doc, [
    { rotulo: "Responsável", valor: risco.responsavel?.nome, width: 160 },
    { rotulo: "Data e hora", valor: formatarData(risco.dataHora), width: 165 },
    { rotulo: "Status", valor: risco.status, width: 162 },
  ]);
  linhaCampos(doc, [
    { rotulo: "Unidade", valor: risco.unidade, width: 160 },
    { rotulo: "Setor", valor: risco.setor, width: 165 },
    { rotulo: "Local", valor: risco.local, width: 162 },
  ]);

  secao(doc, "Risco identificado");
  linhaCampos(doc, [
    { rotulo: "Risco cadastrado", valor: risco.riscoCatalogo?.nome || "Análise avulsa", width: 245 },
    { rotulo: "Tipo", valor: risco.tipoRisco, width: 245 },
  ]);
  linhaCampos(doc, [
    { rotulo: "Natureza", valor: risco.naturezaRisco, width: 245 },
    { rotulo: "Prazo da tratativa", valor: formatarData(risco.prazo), width: 245 },
  ]);

  secao(doc, "Classificação");
  resumoClassificacao(doc, risco);

  secao(doc, "Descrição e impacto");
  blocoTexto(doc, "Descrição do risco", risco.descricaoRisco);
  blocoTexto(doc, "Possível impacto", risco.possivelImpacto);

  secao(doc, "Controles e plano de ação");
  blocoTexto(doc, "Medidas preventivas", risco.medidasPreventivas);
  blocoTexto(doc, "Plano de ação", risco.planoAcao);
  linhaCampos(doc, [
    { rotulo: "Responsável pela ação", valor: risco.responsavelAcaoNome, width: 245 },
    { rotulo: "Prazo final", valor: formatarData(risco.prazo), width: 245 },
  ]);

  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i += 1) {
    doc.switchToPage(i);
    desenharRodapeAssinaturaPadrao(doc, {
      assinatura: null,
      qrCode,
      pagina: i + 1,
      totalPaginas: range.count,
    });
  }

  doc.end();
}
