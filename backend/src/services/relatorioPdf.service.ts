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

type AnexoPdf = {
  nomeOriginal: string;
  tipo: string;
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
  anexos?: AnexoPdf[];
};

type UsuarioAssinatura = {
  nome: string;
  re?: string | null;
  cargo?: string | null;
  setor?: string | null;
  empresa?: string | null;
};

const logoPath = path.resolve(process.cwd(), "assets", "movecta-logo.png");

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

function escreverLinha(
  doc: PDFKit.PDFDocument,
  rotulo: string,
  valor?: string | null
) {
  doc.font("Helvetica-Bold").text(`${rotulo}: `, { continued: true });
  doc.font("Helvetica").text(valor || "Não informado");
}

function garantirEspaco(doc: PDFKit.PDFDocument, altura = 90) {
  if (doc.y + altura > doc.page.height - 90) {
    doc.addPage();
  }
}

function desenharCabecalho(doc: PDFKit.PDFDocument, relatorio: RelatorioPdf) {
  const topo = 38;

  doc.image(logoPath, 45, topo, { width: 150 });

  doc
    .font("Helvetica-Bold")
    .fontSize(16)
    .text(`Relatório de ${relatorio.tipo}`, 220, topo + 5, {
      width: 190,
      align: "center",
    });

  doc
    .font("Helvetica-Bold")
    .fontSize(14)
    .text(relatorio.codigo, 430, topo + 7, {
      width: 115,
      align: "right",
    });

  doc
    .moveTo(45, 104)
    .lineTo(550, 104)
    .strokeColor("#d1d5db")
    .stroke();

  doc.x = 45;
  doc.y = 124;
  doc.strokeColor("#000000");
}

async function desenharRodape(
  doc: PDFKit.PDFDocument,
  relatorio: RelatorioPdf,
  usuario: UsuarioAssinatura,
  pdfUrl: string
) {
  garantirEspaco(doc, 150);

  const token = criarToken(relatorio, usuario);
  const qrCode = await QRCode.toDataURL(pdfUrl, {
    margin: 1,
    width: 120,
  });

  const y = Math.max(doc.y + 28, doc.page.height - 170);

  doc
    .moveTo(45, y)
    .lineTo(550, y)
    .strokeColor("#d1d5db")
    .stroke();

  doc
    .font("Helvetica-Bold")
    .fontSize(11)
    .fillColor("#111827")
    .text("Assinatura digital", 45, y + 18);

  doc
    .font("Helvetica")
    .fontSize(9)
    .fillColor("#374151")
    .text(
      `Documento validado e elaborado por ${usuario.nome}. Token: ${token}`,
      45,
      y + 39,
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
    doc.text(detalhesUsuario, 45, y + 68, { width: 350 });
  }

  doc.image(qrCode, 445, y + 15, { width: 86 });
  doc
    .fontSize(8)
    .fillColor("#6b7280")
    .text("Acesse o PDF", 435, y + 105, { width: 105, align: "center" });

  doc.fillColor("#000000").strokeColor("#000000");
}

export async function gerarRelatorioPdf(
  res: Response,
  relatorio: RelatorioPdf,
  usuario: UsuarioAssinatura,
  pdfUrl: string
) {
  const doc = new PDFDocument({
    size: "A4",
    margin: 45,
    bufferPages: true,
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

  desenharCabecalho(doc, relatorio);

  doc.font("Helvetica-Bold").fontSize(13).text("Dados do relatório");
  doc.moveDown(0.7);
  doc.fontSize(10);

  escreverLinha(doc, "Assunto", relatorio.assunto);
  escreverLinha(doc, "Status", relatorio.status);
  escreverLinha(doc, "Data", formatarData(relatorio.data));
  escreverLinha(doc, "Local", relatorio.local);
  escreverLinha(doc, "Natureza", relatorio.natureza);
  escreverLinha(doc, "Subnatureza", relatorio.subNatureza);

  doc.moveDown();
  doc.font("Helvetica-Bold").fontSize(13).text("Relato da segurança patrimonial");
  doc.moveDown(0.5);
  doc
    .font("Helvetica")
    .fontSize(10)
    .text(relatorio.relatoSeguranca || "Não informado", {
      align: "justify",
      lineGap: 3,
    });

  doc.moveDown();
  doc.font("Helvetica-Bold").fontSize(13).text("Envolvidos");
  doc.moveDown(0.5);

  if (!relatorio.envolvidos?.length) {
    doc.font("Helvetica").fontSize(10).text("Nenhum envolvido informado.");
  } else {
    relatorio.envolvidos.forEach((envolvido, index) => {
      garantirEspaco(doc, 130);

      doc
        .font("Helvetica-Bold")
        .fontSize(11)
        .text(`${index + 1}. ${envolvido.nome}`);
      doc.fontSize(10);
      escreverLinha(doc, "Tipo", envolvido.tipoEnvolvimento);
      escreverLinha(
        doc,
        "Documento",
        `${envolvido.tipoDocumento} ${envolvido.documento}`
      );
      escreverLinha(doc, "Empresa", envolvido.empresa);

      if (envolvido.possuiVeiculo) {
        escreverLinha(doc, "Placa", envolvido.placa);
        escreverLinha(doc, "Reboque", envolvido.reboque);
      }

      escreverLinha(doc, "Relato", envolvido.relato);
      doc.moveDown(0.8);
    });
  }

  doc.moveDown();
  doc.font("Helvetica-Bold").fontSize(13).text("Anexos");
  doc.moveDown(0.5);

  if (!relatorio.anexos?.length) {
    doc.font("Helvetica").fontSize(10).text("Nenhum anexo informado.");
  } else {
    relatorio.anexos.forEach((anexo, index) => {
      garantirEspaco(doc, 25);
      doc
        .font("Helvetica")
        .fontSize(10)
        .text(`${index + 1}. ${anexo.nomeOriginal} (${anexo.tipo})`);
    });
  }

  await desenharRodape(doc, relatorio, usuario, pdfUrl);

  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i += 1) {
    doc.switchToPage(i);
    doc
      .font("Helvetica")
      .fontSize(8)
      .fillColor("#6b7280")
      .text(`Página ${i + 1} de ${range.count}`, 45, 780, {
        width: 505,
        align: "center",
      });
  }

  doc.end();
}
