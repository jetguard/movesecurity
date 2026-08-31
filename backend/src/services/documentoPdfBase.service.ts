import fs from "fs";
import path from "path";
import QRCode from "qrcode";

export const pdfTheme = {
  primary: "#0f172a",
  accent: "#0b74ff",
  muted: "#64748b",
  line: "#dbe4f0",
  soft: "#f8fafc",
};

export const pdfAssets = {
  logo: path.resolve(process.cwd(), "assets", "movecta-logo.png"),
  watermark: path.resolve(process.cwd(), "assets", "jetguard-watermark.png"),
};

function ajustarFonteParaLargura(doc: PDFKit.PDFDocument, texto: string, largura: number, tamanhoInicial: number, tamanhoMinimo: number) {
  for (let tamanho = tamanhoInicial; tamanho >= tamanhoMinimo; tamanho -= 0.5) {
    doc.fontSize(tamanho);
    if (doc.widthOfString(texto) <= largura) return tamanho;
  }

  return tamanhoMinimo;
}

export type AssinaturaPdf = {
  token: string;
  usuarioNome: string;
  createdAt: Date;
};

export function desenharMarcaDaguaPadrao(doc: PDFKit.PDFDocument, opacity = 0.035) {
  if (!fs.existsSync(pdfAssets.watermark)) return;

  const pageWidth = doc.page.width;
  const pageHeight = doc.page.height;
  const largura = 250;

  doc
    .save()
    .opacity(opacity)
    .image(pdfAssets.watermark, (pageWidth - largura) / 2, (pageHeight - largura) / 2, { width: largura })
    .restore();
}

export function desenharCabecalhoPadrao(
  doc: PDFKit.PDFDocument,
  params: {
    titulo: string;
    subtitulo: string;
    codigo: string;
    unidade: string;
    emitidoEm?: Date;
  }
) {
  const pageWidth = doc.page.width;
  const contentWidth = pageWidth - 84;

  desenharMarcaDaguaPadrao(doc);
  doc.roundedRect(42, 28, contentWidth, 74, 10).fill(pdfTheme.primary);

  if (fs.existsSync(pdfAssets.logo)) {
    doc.roundedRect(54, 42, 126, 38, 8).fill("#ffffff");
    doc.image(pdfAssets.logo, 62, 50, { width: 110, height: 22, fit: [110, 22] });
  }

  const infoX = pageWidth - 235;
  const codigoTexto = String(params.codigo || "").replace(/\s+/g, "");
  const codigoWidth = Math.max(150, infoX - 205);
  const codigoFonte = ajustarFonteParaLargura(doc, codigoTexto, codigoWidth, 16, 11);

  doc.fillColor("#dbeafe").fontSize(8).text(params.titulo.toUpperCase(), 190, 43, { width: codigoWidth, lineBreak: false, ellipsis: true });
  doc.fillColor("#ffffff").fontSize(codigoFonte).text(codigoTexto, 190, 58, { width: codigoWidth, lineBreak: false, ellipsis: true });
  doc.fillColor("#cbd5e1").fontSize(9).text(params.subtitulo, 190, 82, { width: codigoWidth + 30, lineBreak: false, ellipsis: true });
  doc.fillColor("#bfdbfe").fontSize(8.5).text(`Emitido em ${(params.emitidoEm || new Date()).toLocaleString("pt-BR")}`, infoX, 52, { width: 175, align: "right" });
  doc.fillColor("#ffffff").fontSize(10).text(`Unidade: ${params.unidade}`, infoX, 75, { width: 175, align: "right" });
  doc.moveTo(42, 116).lineTo(pageWidth - 42, 116).strokeColor(pdfTheme.line).lineWidth(0.8).stroke();
  doc.y = 130;
}

export async function criarQrCodeValidacao(url: string) {
  return QRCode.toDataURL(url, {
    width: 180,
    margin: 1,
    color: { dark: pdfTheme.primary, light: "#ffffff" },
  });
}

export function desenharRodapeAssinaturaPadrao(
  doc: PDFKit.PDFDocument,
  params: {
    assinatura?: AssinaturaPdf | null;
    qrCode?: string | null;
    pagina?: number;
    totalPaginas?: number;
  }
) {
  const pageWidth = doc.page.width;
  const pageHeight = doc.page.height;
  const contentWidth = pageWidth - 84;
  const footerY = pageHeight - 116;

  doc.moveTo(42, footerY - 10).lineTo(pageWidth - 42, footerY - 10).strokeColor(pdfTheme.line).lineWidth(0.8).stroke();

  const seloW = contentWidth - 102;
  const qrX = pageWidth - 110;

  doc.roundedRect(42, footerY, seloW, 54, 8).strokeColor("#bfdbfe").lineWidth(1).stroke();
  doc.rect(42, footerY, 4, 54).fill(pdfTheme.accent);
  doc.fillColor(pdfTheme.primary).fontSize(9).text("Assinatura eletrônica MoveSecurity", 56, footerY + 9, { width: seloW - 24, lineBreak: false });

  if (params.assinatura) {
    doc.fillColor("#475569").fontSize(8).text(
      `Documento validado por ${params.assinatura.usuarioNome} em ${params.assinatura.createdAt.toLocaleString("pt-BR")}`,
      56,
      footerY + 25,
      { width: seloW - 24, lineBreak: false, ellipsis: true }
    );
    doc.fillColor("#475569").fontSize(7).text(`Token: ${params.assinatura.token}`, 56, footerY + 38, { width: seloW - 24, lineBreak: false, ellipsis: true });
  } else {
    doc.fillColor("#475569").fontSize(8).text("Documento emitido sem assinatura eletrônica validada.", 56, footerY + 27, { width: seloW - 24, lineBreak: false, ellipsis: true });
  }

  doc.fillColor(pdfTheme.muted).fontSize(8).text(
    params.pagina && params.totalPaginas ? `Página ${params.pagina} de ${params.totalPaginas}` : "",
    qrX - 8,
    footerY - 8,
    { width: 74, align: "center", lineBreak: false }
  );

  if (params.qrCode) {
    doc.image(params.qrCode, qrX, footerY + 2, { width: 54, height: 54 });
  }
}
