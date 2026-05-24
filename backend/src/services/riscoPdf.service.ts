import path from "path";
import PDFDocument from "pdfkit";
import { Response } from "express";

type RiscoPdf = {
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
};

const logoPath = path.resolve(process.cwd(), "assets", "movecta-logo.png");

function formatarData(data: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(data);
}

function campo(doc: PDFKit.PDFDocument, rotulo: string, valor: string, y?: number) {
  if (y) doc.y = y;
  doc.font("Helvetica-Bold").fontSize(9).fillColor("#64748b").text(rotulo.toUpperCase());
  doc.font("Helvetica").fontSize(10.5).fillColor("#111827").text(valor || "Não informado", {
    width: 500,
    lineGap: 2,
  });
  doc.moveDown(0.6);
}

export function gerarRiscoPdf(res: Response, risco: RiscoPdf) {
  const doc = new PDFDocument({ size: "A4", margin: 44 });

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `inline; filename=analise-risco-${risco.codigo}.pdf`);

  doc.pipe(res);

  doc.image(logoPath, 44, 34, { width: 150 });
  doc.font("Helvetica-Bold").fontSize(18).fillColor("#0f172a").text("Relatório de Análise de Risco", 230, 42, {
    align: "right",
  });
  doc.fontSize(14).text(risco.codigo, 230, 66, { align: "right" });
  doc.moveTo(44, 108).lineTo(552, 108).strokeColor("#cbd5e1").stroke();
  doc.y = 132;

  campo(doc, "Responsável", risco.responsavel.nome);
  campo(doc, "Data/hora", formatarData(risco.dataHora));
  campo(doc, "Unidade / Setor / Local", `${risco.unidade} | ${risco.setor} | ${risco.local}`);
  campo(doc, "Tipo e natureza", `${risco.tipoRisco} | ${risco.naturezaRisco}`);
  campo(doc, "Classificação", `${risco.nivelRisco} - Probabilidade ${risco.probabilidade} / Severidade ${risco.severidade}`);
  campo(doc, "Status", risco.status);
  campo(doc, "Descrição do risco", risco.descricaoRisco);
  campo(doc, "Possível impacto", risco.possivelImpacto);
  campo(doc, "Medidas preventivas", risco.medidasPreventivas);
  campo(doc, "Plano de ação", risco.planoAcao);
  campo(doc, "Responsável e prazo da ação", `${risco.responsavelAcaoNome || "Não informado"} | ${formatarData(risco.prazo)}`);

  doc.moveTo(44, 760).lineTo(552, 760).strokeColor("#cbd5e1").stroke();
  doc.fontSize(8).fillColor("#64748b").text("Documento gerado pelo JetGuard", 44, 774, {
    align: "center",
    width: 508,
  });

  doc.end();
}

