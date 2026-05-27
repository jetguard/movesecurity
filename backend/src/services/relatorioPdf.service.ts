import crypto from "crypto";
import path from "path";
import PDFDocument from "pdfkit";
import QRCode from "qrcode";
import { Response } from "express";

type EnvolvidoPdf = {
  tipoEnvolvimento?: string;
  nome: string;
  tipoDocumento: string;
  documento: string;
  empresa?: string | null;
  possuiVeiculo: boolean;
  placa?: string | null;
  reboque?: string | null;
  relato: string;
};

type RelatorioPdf = {
  tipo: "Ocorrência" | "Evento" | "Investigação";
  codigo: string;
  assunto: string;
  local?: string | null;
  natureza?: string | null;
  subNatureza?: string | null;
  status: string;
  data: Date;
  relatoSeguranca?: string | null;
  envolvidos?: EnvolvidoPdf[];
  investigacao?: {
    numeroOcorrencia?: string | null;
    status: string;
    descricaoInvestigacao?: string | null;
    conclusaoFatos?: string | null;
    createdAt: Date;
    responsavel?: { nome: string } | null;
  } | null;
  analise?: {
    status: string;
    iniciadoEm: Date;
    concluidoEm?: Date | null;
    prejuizoFinanceiro?: string | null;
    valorRecuperado?: string | null;
    conclusaoAnalise?: string | null;
    responsavel?: { nome: string } | null;
    concluidoPor?: { nome: string } | null;
  } | null;
};

type UsuarioAssinatura = {
  nome: string;
  re?: string | null;
  cargo?: string | null;
  setor?: string | null;
  empresa?: string | null;
};

const logoPath = path.resolve(process.cwd(), "assets", "movecta-logo.png");
const page = {
  left: 45,
  right: 550,
  top: 34,
  headerBottom: 108,
  contentTop: 132,
  footerTop: 704,
  bottom: 804,
};
const contentWidth = page.right - page.left;

function formatarData(data: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(data);
}

function criarToken(relatorio: RelatorioPdf, usuario: UsuarioAssinatura) {
  return crypto
    .createHash("sha256")
    .update(`${relatorio.tipo}:${relatorio.codigo}:${usuario.nome}`)
    .digest("hex")
    .slice(0, 16)
    .toUpperCase();
}

function valor(valor?: string | null) {
  return valor && String(valor).trim() ? valor : "Não informado";
}

function desenharBasePagina(
  doc: PDFKit.PDFDocument,
  relatorio: RelatorioPdf,
  usuario: UsuarioAssinatura,
  qrCode: string,
  token: string
) {
  doc.save();

  doc
    .lineWidth(0.7)
    .strokeColor("#e5e7eb")
    .roundedRect(28, 24, 539, 792, 8)
    .stroke();

  doc.image(logoPath, page.left, page.top + 7, { width: 145 });

  doc
    .font("Helvetica-Bold")
    .fontSize(16)
    .fillColor("#111827")
    .text(`Relatório de ${relatorio.tipo}`, 215, page.top + 16, {
      width: 200,
      align: "center",
    });

  doc
    .font("Helvetica-Bold")
    .fontSize(14)
    .text(relatorio.codigo, 430, page.top + 18, {
      width: 115,
      align: "right",
    });

  doc
    .moveTo(page.left, page.headerBottom)
    .lineTo(page.right, page.headerBottom)
    .strokeColor("#cbd5e1")
    .stroke();

  doc
    .moveTo(page.left, page.footerTop)
    .lineTo(page.right, page.footerTop)
    .strokeColor("#cbd5e1")
    .stroke();

  doc
    .font("Helvetica-Bold")
    .fontSize(10)
    .fillColor("#111827")
    .text("Assinatura digital", page.left, page.footerTop + 17);

  doc
    .font("Helvetica")
    .fontSize(8.5)
    .fillColor("#374151")
    .text(
      `Documento validado e elaborado por ${usuario.nome}. Token: ${token}`,
      page.left,
      page.footerTop + 38,
      { width: 350 }
    );

  const detalhesUsuario = [
    usuario.re ? `R.E: ${usuario.re}` : null,
    usuario.cargo ? `Cargo: ${usuario.cargo}` : null,
    usuario.setor ? `Setor: ${usuario.setor}` : null,
    usuario.empresa ? `Empresa: ${usuario.empresa}` : null,
  ]
    .filter(Boolean)
    .join(" | ");

  if (detalhesUsuario) {
    doc.text(detalhesUsuario, page.left, page.footerTop + 58, { width: 350 });
  }

  doc.image(qrCode, 455, page.footerTop + 15, { width: 78 });
  doc
    .fontSize(7.5)
    .fillColor("#6b7280")
    .text("Acesse o PDF", 444, page.footerTop + 96, {
      width: 100,
      align: "center",
    });

  doc.restore();
  doc.x = page.left;
  doc.y = page.contentTop;
}

function novaPagina(
  doc: PDFKit.PDFDocument,
  relatorio: RelatorioPdf,
  usuario: UsuarioAssinatura,
  qrCode: string,
  token: string
) {
  doc.addPage();
  desenharBasePagina(doc, relatorio, usuario, qrCode, token);
}

function garantirEspaco(
  doc: PDFKit.PDFDocument,
  altura: number,
  relatorio: RelatorioPdf,
  usuario: UsuarioAssinatura,
  qrCode: string,
  token: string
) {
  if (doc.y + altura > page.footerTop - 20) {
    novaPagina(doc, relatorio, usuario, qrCode, token);
  }
}

function escreverTituloSecao(doc: PDFKit.PDFDocument, titulo: string) {
  doc.moveDown(0.5);
  doc
    .font("Helvetica-Bold")
    .fontSize(12)
    .fillColor("#0f172a")
    .text(titulo, page.left, doc.y);
  doc
    .moveTo(page.left, doc.y + 4)
    .lineTo(page.right, doc.y + 4)
    .strokeColor("#dbe3ef")
    .stroke();
  doc.moveDown(0.8);
}

function escreverCampo(
  doc: PDFKit.PDFDocument,
  rotulo: string,
  conteudo: string,
  x: number,
  y: number,
  width: number
) {
  doc
    .font("Helvetica-Bold")
    .fontSize(8.5)
    .fillColor("#64748b")
    .text(rotulo.toUpperCase(), x, y, { width });

  doc
    .font("Helvetica")
    .fontSize(10)
    .fillColor("#111827")
    .text(conteudo, x, y + 14, { width, lineGap: 2 });
}

function escreverDadosRelatorio(doc: PDFKit.PDFDocument, relatorio: RelatorioPdf) {
  escreverTituloSecao(doc, "Dados do relatório");

  const y = doc.y;
  const colunaLargura = 230;
  const colunaDireitaX = page.left + 270;

  escreverCampo(doc, "Assunto", valor(relatorio.assunto), page.left, y, contentWidth);
  escreverCampo(doc, "Data", formatarData(relatorio.data), page.left, y + 44, colunaLargura);
  escreverCampo(doc, "Local", valor(relatorio.local), page.left, y + 84, colunaLargura);
  escreverCampo(doc, "Status", valor(relatorio.status), page.left, y + 124, colunaLargura);

  escreverCampo(doc, "Natureza", valor(relatorio.natureza), colunaDireitaX, y + 44, colunaLargura);
  escreverCampo(doc, "Subnatureza", valor(relatorio.subNatureza), colunaDireitaX, y + 84, colunaLargura);

  doc.y = y + 158;
}

function escreverEnvolvidos(
  doc: PDFKit.PDFDocument,
  relatorio: RelatorioPdf,
  usuario: UsuarioAssinatura,
  qrCode: string,
  token: string
) {
  escreverTituloSecao(doc, "Envolvidos");

  if (!relatorio.envolvidos?.length) {
    doc.font("Helvetica").fontSize(10).fillColor("#111827").text("Nenhum envolvido informado.");
    return;
  }

  relatorio.envolvidos.forEach((envolvido, index) => {
    const relato = valor(envolvido.relato);
    const alturaRelato = Math.max(
      22,
      doc.heightOfString(relato, {
        width: contentWidth - 28,
        lineGap: 3,
      })
    );
    const alturaCard = Math.max(116, 92 + alturaRelato);

    garantirEspaco(doc, alturaCard + 12, relatorio, usuario, qrCode, token);

    const y = doc.y;
    doc
      .lineWidth(0.6)
      .strokeColor("#e5e7eb")
      .roundedRect(page.left, y, contentWidth, alturaCard, 6)
      .stroke();

    doc
      .font("Helvetica-Bold")
      .fontSize(10.5)
      .fillColor("#111827")
      .text(`${index + 1}. ${envolvido.nome}`, page.left + 14, y + 12, {
        width: 260,
      });

    doc
      .font("Helvetica")
      .fontSize(9)
      .fillColor("#334155")
      .text(`Tipo: ${valor(envolvido.tipoEnvolvimento)}`, page.left + 14, y + 32, { width: 210 })
      .text(`Documento: ${envolvido.tipoDocumento} ${envolvido.documento}`, page.left + 14, y + 47, { width: 250 })
      .text(`Empresa: ${valor(envolvido.empresa)}`, page.left + 285, y + 32, { width: 200 });

    const veiculo = envolvido.possuiVeiculo
      ? `Placa: ${valor(envolvido.placa)} | Reboque: ${valor(envolvido.reboque)}`
      : "Veículo: não informado";

    doc.text(veiculo, page.left + 14, y + 62, { width: 470 });

    doc
      .font("Helvetica-Bold")
      .fontSize(8.5)
      .fillColor("#64748b")
      .text("RELATO DO ENVOLVIDO", page.left + 14, y + 84, { width: contentWidth - 28 });

    doc
      .font("Helvetica")
      .fontSize(9.2)
      .fillColor("#111827")
      .text(relato, page.left + 14, y + 98, {
        width: contentWidth - 28,
        lineGap: 3,
      });

    doc.y = y + alturaCard + 12;
  });
}

function escreverBlocoTexto(
  doc: PDFKit.PDFDocument,
  titulo: string,
  texto: string,
  relatorio: RelatorioPdf,
  usuario: UsuarioAssinatura,
  qrCode: string,
  token: string
) {
  garantirEspaco(doc, 55, relatorio, usuario, qrCode, token);
  doc.font("Helvetica-Bold").fontSize(9).fillColor("#64748b").text(titulo, page.left, doc.y);
  doc.moveDown(0.3);

  texto.split(/\n+/).forEach((paragrafo) => {
    const altura = doc.heightOfString(paragrafo, {
      width: contentWidth,
      align: "justify",
      lineGap: 3,
    });

    garantirEspaco(doc, altura + 12, relatorio, usuario, qrCode, token);
    doc
      .font("Helvetica")
      .fontSize(10)
      .fillColor("#111827")
      .text(paragrafo, page.left, doc.y, {
        width: contentWidth,
        align: "justify",
        lineGap: 3,
      });
    doc.moveDown(0.5);
  });
}

function escreverInvestigacao(
  doc: PDFKit.PDFDocument,
  relatorio: RelatorioPdf,
  usuario: UsuarioAssinatura,
  qrCode: string,
  token: string
) {
  if (!relatorio.investigacao) return;

  garantirEspaco(doc, 150, relatorio, usuario, qrCode, token);
  escreverTituloSecao(doc, "Dados da investigação");

  const y = doc.y;
  const colunaLargura = 230;
  const colunaDireitaX = page.left + 270;

  escreverCampo(doc, "Ocorrência vinculada", valor(relatorio.investigacao.numeroOcorrencia), page.left, y, colunaLargura);
  escreverCampo(doc, "Solicitação", formatarData(relatorio.investigacao.createdAt), page.left, y + 42, colunaLargura);
  escreverCampo(doc, "Status", relatorio.investigacao.status, colunaDireitaX, y, colunaLargura);
  escreverCampo(doc, "Responsável", valor(relatorio.investigacao.responsavel?.nome), colunaDireitaX, y + 42, colunaLargura);

  doc.y = y + 86;
  escreverBlocoTexto(doc, "Descrição da investigação", valor(relatorio.investigacao.descricaoInvestigacao), relatorio, usuario, qrCode, token);
  escreverBlocoTexto(doc, "Conclusão dos fatos", valor(relatorio.investigacao.conclusaoFatos), relatorio, usuario, qrCode, token);
}

function escreverAnalise(
  doc: PDFKit.PDFDocument,
  relatorio: RelatorioPdf,
  usuario: UsuarioAssinatura,
  qrCode: string,
  token: string
) {
  if (!relatorio.analise) return;

  garantirEspaco(doc, 145, relatorio, usuario, qrCode, token);
  escreverTituloSecao(doc, "Dados da análise");

  const y = doc.y;
  const colunaLargura = 230;
  const colunaDireitaX = page.left + 270;
  const valorFinanceiro =
    relatorio.analise.prejuizoFinanceiro || relatorio.analise.valorRecuperado;

  escreverCampo(doc, "Iniciada por", valor(relatorio.analise.responsavel?.nome), page.left, y, colunaLargura);
  escreverCampo(doc, "Data/hora de início", formatarData(relatorio.analise.iniciadoEm), page.left, y + 42, colunaLargura);
  escreverCampo(doc, "Status", relatorio.analise.status, colunaDireitaX, y, colunaLargura);
  escreverCampo(doc, "Concluída por", valor(relatorio.analise.concluidoPor?.nome), colunaDireitaX, y + 42, colunaLargura);
  escreverCampo(
    doc,
    relatorio.analise.prejuizoFinanceiro ? "Prejuízo financeiro" : "Valor recuperado",
    valorFinanceiro ? `R$ ${valorFinanceiro}` : "Não informado",
    page.left,
    y + 84,
    colunaLargura
  );
  escreverCampo(
    doc,
    "Data/hora de conclusão",
    relatorio.analise.concluidoEm ? formatarData(relatorio.analise.concluidoEm) : "Não concluída",
    colunaDireitaX,
    y + 84,
    colunaLargura
  );

  doc.y = y + 128;
  escreverBlocoTexto(doc, "Conclusão da análise", valor(relatorio.analise.conclusaoAnalise), relatorio, usuario, qrCode, token);
}

function escreverRelato(
  doc: PDFKit.PDFDocument,
  relatorio: RelatorioPdf,
  usuario: UsuarioAssinatura,
  qrCode: string,
  token: string
) {
  garantirEspaco(doc, 90, relatorio, usuario, qrCode, token);
  escreverTituloSecao(doc, "Relato patrimonial");

  const texto = valor(relatorio.relatoSeguranca);
  const paragrafos = texto.split(/\n+/);

  paragrafos.forEach((paragrafo) => {
    const altura = doc.heightOfString(paragrafo, {
      width: contentWidth,
      align: "justify",
      lineGap: 3,
    });

    garantirEspaco(doc, altura + 14, relatorio, usuario, qrCode, token);

    doc
      .font("Helvetica")
      .fontSize(10)
      .fillColor("#111827")
      .text(paragrafo, page.left, doc.y, {
        width: contentWidth,
        align: "justify",
        lineGap: 3,
      });
    doc.moveDown(0.6);
  });
}

export async function gerarRelatorioPdf(
  res: Response,
  relatorio: RelatorioPdf,
  usuario: UsuarioAssinatura,
  pdfUrl: string
) {
  const token = criarToken(relatorio, usuario);
  const qrCode = await QRCode.toDataURL(pdfUrl, {
    margin: 1,
    width: 120,
  });

  const doc = new PDFDocument({
    size: "A4",
    margin: 0,
    bufferPages: true,
    autoFirstPage: false,
    info: {
      Title: `Relatório de ${relatorio.tipo} ${relatorio.codigo}`,
      Author: usuario.nome,
    },
  });

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `inline; filename=relatorio-${relatorio.codigo.replace("/", "-")}.pdf`
  );

  doc.pipe(res);

  novaPagina(doc, relatorio, usuario, qrCode, token);
  escreverDadosRelatorio(doc, relatorio);
  escreverInvestigacao(doc, relatorio, usuario, qrCode, token);
  escreverAnalise(doc, relatorio, usuario, qrCode, token);
  escreverEnvolvidos(doc, relatorio, usuario, qrCode, token);
  escreverRelato(doc, relatorio, usuario, qrCode, token);

  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i += 1) {
    doc.switchToPage(i);
    doc
      .font("Helvetica")
      .fontSize(8)
      .fillColor("#6b7280")
      .text(`Página ${i + 1} de ${range.count}`, page.left, 786, {
        width: contentWidth,
        align: "center",
      });
  }

  doc.end();
}

