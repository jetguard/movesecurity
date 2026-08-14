import { Response } from "express";
import PDFDocument from "pdfkit";
import { desenharCabecalhoPadrao, pdfTheme } from "./documentoPdfBase.service";

type ItemNome = {
  codigo?: string | null;
  nome: string;
  percentualTratativa?: number;
  planosTratativa?: number;
  planosConcluidos?: number;
};

type PlanoAcaoPdf = {
  codigo?: string;
  titulo?: string;
  fatorRiscoCodigo?: string | null;
  fatorRiscoNome?: string | null;
  prioridade?: string;
  status?: string;
  percentual?: number;
  descricao?: string | null;
  acaoCorretiva?: string | null;
  acaoPreventiva?: string | null;
  responsavelNome?: string | null;
  prazo?: Date | string | null;
  concluidoEm?: Date | string | null;
  evidencia?: string | null;
  comentarios?: string | null;
};

type AnaliseCompletaPdf = {
  id: number;
  codigo: string;
  unidade: string;
  macroProcessoCodigo: string;
  macroProcessoNome: string;
  setorNome: string;
  riscoCodigo: string;
  riscoNome: string;
  fatoresRisco: ItemNome[];
  preventivos: ItemNome[];
  detectivos: ItemNome[];
  corretivos: ItemNome[];
  planosAcao?: PlanoAcaoPdf[];
  sc: number;
  fe: number;
  intervalo: number;
  sse: number;
  ope: number;
  fin: number;
  adm: number;
  img: number;
  lc: number;
  notaProbabilidade: number;
  mediaProbabilidade: number;
  percentualProbabilidade: number;
  nivelProbabilidade: string;
  notaConsequencia: number;
  mediaConsequencia: number;
  nivelConsequencia: string;
  resultadoInerente: number;
  classificacaoRisco: string;
  periodicidadeAcao: string;
  notaProbabilidadeResidual?: number | null;
  probabilidadeResidual?: number | null;
  percentualProbabilidadeResidual?: number | null;
  nivelProbabilidadeResidual?: string | null;
  notaConsequenciaResidual?: number | null;
  consequenciaResidual?: number | null;
  nivelConsequenciaResidual?: string | null;
  resultadoResidual?: number | null;
  classificacaoResidual?: string | null;
  desempenhoProbabilidade?: number | null;
  desempenhoConsequencia?: number | null;
  desempenhoNivelRisco?: number | null;
  createdAt: Date;
  updatedAt: Date;
};

const margemX = 42;
const larguraConteudo = 758;

function texto(valor: unknown) {
  if (valor === null || valor === undefined || valor === "") return "-";
  return String(valor);
}

function textoPreenchido(valor: unknown) {
  return String(valor || "").trim();
}

function formatarData(valor?: Date | string | null) {
  if (!valor) return "-";
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return "-";
  return data.toLocaleString("pt-BR");
}

function corClassificacao(valor?: string | null) {
  const texto = String(valor || "").toUpperCase();
  if (["BAIXO", "MENOR", "REMOTO"].includes(texto)) return "#10b981";
  if (["POSSÍVEL", "MODERADO"].includes(texto)) return "#f59e0b";
  if (["ALTO", "MAIOR", "PROVÁVEL", "SEVERO"].includes(texto)) return "#f97316";
  if (["EXTREMO", "CRÍTICO", "FREQUENTE"].includes(texto)) return "#dc2626";
  return pdfTheme.accent;
}

function etiqueta(item: ItemNome) {
  return item.codigo ? `${item.codigo} - ${item.nome}` : item.nome;
}

function etiquetaFator(item: ItemNome) {
  const base = etiqueta(item);
  const percentual =
    item.percentualTratativa === undefined
      ? null
      : `${item.percentualTratativa}% tratado`;
  const planos =
    item.planosTratativa === undefined
      ? null
      : `${item.planosConcluidos || 0}/${item.planosTratativa} plano(s) concluído(s)`;
  return [base, percentual, planos].filter(Boolean).join(" | ");
}

function campo(
  doc: PDFKit.PDFDocument,
  rotulo: string,
  valor: unknown,
  x: number,
  y: number,
  width: number,
  color = pdfTheme.primary,
) {
  doc
    .roundedRect(x, y, width, 48, 8)
    .fillColor("#f8fafc")
    .fill()
    .strokeColor("#dbeafe")
    .lineWidth(0.8)
    .stroke();
  doc
    .fillColor("#64748b")
    .font("Helvetica-Bold")
    .fontSize(7.5)
    .text(rotulo.toUpperCase(), x + 10, y + 9, { width: width - 20 });
  doc
    .fillColor(color)
    .font("Helvetica-Bold")
    .fontSize(13)
    .text(texto(valor), x + 10, y + 25, {
      width: width - 20,
      lineBreak: false,
      ellipsis: true,
    });
}

function barra(
  doc: PDFKit.PDFDocument,
  rotulo: string,
  valor: number | null | undefined,
  max: number,
  x: number,
  y: number,
  width: number,
  color: string,
) {
  const numero = Number(valor || 0);
  const proporcao = Math.max(0, Math.min(numero / max, 1));
  doc
    .fillColor(pdfTheme.primary)
    .font("Helvetica-Bold")
    .fontSize(8)
    .text(rotulo, x, y, {
      width,
    });
  doc
    .roundedRect(x, y + 15, width, 12, 6)
    .fillColor("#e2e8f0")
    .fill();
  doc
    .roundedRect(x, y + 15, width * proporcao, 12, 6)
    .fillColor(color)
    .fill();
  doc
    .fillColor(pdfTheme.primary)
    .font("Helvetica-Bold")
    .fontSize(9)
    .text(texto(valor), x + width - 48, y - 1, { width: 48, align: "right" });
}

function blocoLista(
  doc: PDFKit.PDFDocument,
  titulo: string,
  itens: ItemNome[],
  x: number,
  y: number,
  width: number,
  height: number,
) {
  doc
    .roundedRect(x, y, width, height, 8)
    .fillColor("#ffffff")
    .fill()
    .strokeColor("#dbeafe")
    .lineWidth(0.8)
    .stroke();
  doc
    .fillColor(pdfTheme.accent)
    .font("Helvetica-Bold")
    .fontSize(8)
    .text(titulo.toUpperCase(), x + 12, y + 10, {
      width: width - 24,
    });
  const lista = itens.length ? itens.map(etiqueta) : ["Nenhum item informado."];
  doc
    .fillColor(pdfTheme.primary)
    .font("Helvetica")
    .fontSize(8.4)
    .text(
      lista
        .slice(0, 7)
        .map((item) => `• ${item}`)
        .join("\n"),
      x + 12,
      y + 28,
      {
        width: width - 24,
        height: height - 36,
        ellipsis: true,
      },
    );
}

function blocoFatoresTratativa(
  doc: PDFKit.PDFDocument,
  itens: ItemNome[],
  x: number,
  y: number,
  width: number,
  height: number,
) {
  doc
    .roundedRect(x, y, width, height, 8)
    .fillColor("#ffffff")
    .fill()
    .strokeColor("#fcd34d")
    .lineWidth(0.8)
    .stroke();
  doc
    .fillColor("#92400e")
    .font("Helvetica-Bold")
    .fontSize(8)
    .text("FATORES DE RISCO E PLANOS DE AÇÃO 5W2H", x + 12, y + 10, {
      width: width - 24,
    });
  const lista = itens.length
    ? itens.map(etiquetaFator)
    : ["Nenhum fator de risco informado."];
  doc
    .fillColor(pdfTheme.primary)
    .font("Helvetica")
    .fontSize(8.2)
    .text(
      lista
        .slice(0, 10)
        .map((item) => `• ${item}`)
        .join("\n"),
      x + 12,
      y + 28,
      {
        width: width - 24,
        height: height - 36,
        ellipsis: true,
      },
    );
}

function variacao(valor?: number | null) {
  if (valor === null || valor === undefined) return "-";
  return `${Math.round(valor * 100)}%`;
}

function statusManualPlano(status?: string | null) {
  if (status === "Concluído") return "Concluido";
  if (status === "Em Andamento") return "Em andamento";
  if (["Pendente", "Em andamento", "Concluido"].includes(status || "")) {
    return status || "Pendente";
  }
  return "Pendente";
}

function statusPlano(plano: PlanoAcaoPdf) {
  const status = statusManualPlano(plano.status);
  const prazo = plano.prazo ? new Date(plano.prazo) : null;
  const atrasado =
    status !== "Concluido" &&
    prazo &&
    !Number.isNaN(prazo.getTime()) &&
    prazo < new Date();
  if (atrasado) return "Em atraso";
  return status === "Concluido" ? "Concluído" : status;
}

function corStatusPlano(status: string) {
  if (status === "Concluído") return "#10b981";
  if (status === "Em andamento") return "#2563eb";
  if (status === "Em atraso") return "#dc2626";
  return "#f59e0b";
}

function novaPaginaPlanos(
  doc: PDFKit.PDFDocument,
  analise: AnaliseCompletaPdf,
) {
  doc.addPage();
  desenharCabecalhoPadrao(doc, {
    titulo: "Planos de ação 5W2H",
    subtitulo: "Ações vinculadas aos fatores de risco da ARC",
    codigo: analise.codigo,
    unidade: analise.unidade,
  });
  doc
    .fillColor(pdfTheme.primary)
    .font("Helvetica-Bold")
    .fontSize(12)
    .text("Planos cadastrados para tratamento dos fatores de risco", 42, 126, {
      width: larguraConteudo,
    });
  return 152;
}

function desenharBarraProgresso(
  doc: PDFKit.PDFDocument,
  percentual: number,
  x: number,
  y: number,
  width: number,
  color: string,
) {
  const valor = Math.max(0, Math.min(Number(percentual || 0), 100));
  doc.roundedRect(x, y, width, 9, 4.5).fillColor("#e2e8f0").fill();
  doc
    .roundedRect(x, y, (width * valor) / 100, 9, 4.5)
    .fillColor(color)
    .fill();
  doc
    .fillColor(pdfTheme.primary)
    .font("Helvetica-Bold")
    .fontSize(8)
    .text(`${valor}%`, x + width + 8, y - 1, { width: 38 });
}

function desenharPlanoAcao(
  doc: PDFKit.PDFDocument,
  analise: AnaliseCompletaPdf,
  plano: PlanoAcaoPdf,
  yInicial: number,
) {
  const campos = [
    ["Descrição", plano.descricao],
    ["Ação corretiva", plano.acaoCorretiva],
    ["Ação preventiva", plano.acaoPreventiva],
    ["Evidência", plano.evidencia],
    ["Comentários", plano.comentarios],
  ].filter(([, valor]) => textoPreenchido(valor));

  const larguraTexto = larguraConteudo - 34;
  doc.font("Helvetica").fontSize(8.4);
  const alturaCampos = campos.reduce((total, [rotulo, valor]) => {
    const conteudo = `${rotulo}: ${textoPreenchido(valor)}`;
    return total + doc.heightOfString(conteudo, { width: larguraTexto }) + 9;
  }, 0);
  const altura = Math.max(126, 92 + alturaCampos);
  let y = yInicial;
  if (y + altura > 535) y = novaPaginaPlanos(doc, analise);

  const status = statusPlano(plano);
  const cor = corStatusPlano(status);
  doc
    .roundedRect(margemX, y, larguraConteudo, altura, 10)
    .fillColor("#ffffff")
    .fill()
    .strokeColor("#dbeafe")
    .lineWidth(0.9)
    .stroke();

  doc.roundedRect(margemX, y, 8, altura, 4).fillColor(cor).fill();

  doc
    .fillColor(pdfTheme.accent)
    .font("Helvetica-Bold")
    .fontSize(8)
    .text(texto(plano.codigo).toUpperCase(), margemX + 18, y + 13, {
      width: 92,
    });
  doc
    .fillColor(pdfTheme.primary)
    .font("Helvetica-Bold")
    .fontSize(11)
    .text(texto(plano.titulo), margemX + 118, y + 11, {
      width: 378,
      lineBreak: false,
      ellipsis: true,
    });
  doc
    .roundedRect(margemX + 625, y + 10, 110, 20, 10)
    .fillColor(cor)
    .fill();
  doc
    .fillColor("#ffffff")
    .font("Helvetica-Bold")
    .fontSize(8)
    .text(status, margemX + 625, y + 16, { width: 110, align: "center" });

  const fator = [plano.fatorRiscoCodigo, plano.fatorRiscoNome]
    .filter(Boolean)
    .join(" - ");
  doc
    .fillColor("#92400e")
    .font("Helvetica-Bold")
    .fontSize(8.2)
    .text(`Fator tratado: ${fator || "Não informado"}`, margemX + 18, y + 38, {
      width: 430,
    });
  doc
    .fillColor("#475569")
    .font("Helvetica")
    .fontSize(8.2)
    .text(
      `Responsável: ${texto(plano.responsavelNome)} | Prioridade: ${texto(plano.prioridade)} | Prazo: ${formatarData(plano.prazo)}`,
      margemX + 18,
      y + 55,
      { width: 600 },
    );
  desenharBarraProgresso(
    doc,
    Number(plano.percentual || 0),
    margemX + 588,
    y + 56,
    104,
    cor,
  );

  let cursorY = y + 80;
  campos.forEach(([rotulo, valor]) => {
    const conteudo = `${rotulo}: ${textoPreenchido(valor)}`;
    doc
      .fillColor(pdfTheme.primary)
      .font("Helvetica")
      .fontSize(8.4)
      .text(conteudo, margemX + 18, cursorY, { width: larguraTexto });
    cursorY += doc.heightOfString(conteudo, { width: larguraTexto }) + 9;
  });

  if (!campos.length) {
    doc
      .fillColor("#64748b")
      .font("Helvetica")
      .fontSize(8.4)
      .text(
        "Nenhuma descrição complementar preenchida.",
        margemX + 18,
        cursorY,
        {
          width: larguraTexto,
        },
      );
  }

  return y + altura + 14;
}

function secaoPlanosAcao(doc: PDFKit.PDFDocument, analise: AnaliseCompletaPdf) {
  const planos = analise.planosAcao || [];
  let y = novaPaginaPlanos(doc, analise);

  if (!planos.length) {
    doc
      .roundedRect(42, y, larguraConteudo, 90, 10)
      .fillColor("#ffffff")
      .fill()
      .strokeColor("#dbeafe")
      .stroke();
    doc
      .fillColor("#64748b")
      .font("Helvetica")
      .fontSize(10)
      .text(
        "Nenhum plano de ação 5W2H foi cadastrado para os fatores de risco desta ARC.",
        62,
        y + 34,
        { width: larguraConteudo - 40, align: "center" },
      );
    return;
  }

  const total = planos.length;
  const concluidos = planos.filter(
    (plano) => statusPlano(plano) === "Concluído",
  ).length;
  const atrasados = planos.filter(
    (plano) => statusPlano(plano) === "Em atraso",
  ).length;
  const progressoMedio = Math.round(
    planos.reduce((soma, plano) => soma + Number(plano.percentual || 0), 0) /
      Math.max(1, total),
  );

  campo(doc, "Planos cadastrados", total, 42, y, 170, pdfTheme.primary);
  campo(doc, "Concluídos", concluidos, 222, y, 170, "#10b981");
  campo(doc, "Em atraso", atrasados, 402, y, 170, "#dc2626");
  campo(doc, "Progresso médio", `${progressoMedio}%`, 582, y, 218, "#2563eb");
  y += 70;

  planos.forEach((plano) => {
    y = desenharPlanoAcao(doc, analise, plano, y);
  });
}

export function gerarAnaliseCompletaPdf(
  res: Response,
  analise: AnaliseCompletaPdf,
) {
  const doc = new PDFDocument({
    size: "A4",
    layout: "landscape",
    margin: 42,
    bufferPages: true,
  });
  const nomeArquivo = `analise-completa-${analise.codigo.replace("/", "-")}`;

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `inline; filename=${nomeArquivo}.pdf`);
  doc.pipe(res);

  desenharCabecalhoPadrao(doc, {
    titulo: "Análise completa de riscos",
    subtitulo:
      "Relatório executivo com avaliação inerente, residual e controles",
    codigo: analise.codigo,
    unidade: analise.unidade,
  });

  campo(
    doc,
    "Macro processo",
    `${analise.macroProcessoCodigo} - ${analise.macroProcessoNome}`,
    42,
    128,
    270,
  );
  campo(doc, "Setor", analise.setorNome, 322, 128, 180);
  campo(
    doc,
    "Risco",
    `${analise.riscoCodigo} - ${analise.riscoNome}`,
    512,
    128,
    288,
  );

  const corInerente = corClassificacao(analise.classificacaoRisco);
  const corResidual = corClassificacao(analise.classificacaoResidual);

  campo(
    doc,
    "Probabilidade inerente",
    `${analise.mediaProbabilidade} (${analise.nivelProbabilidade})`,
    42,
    190,
    180,
    corInerente,
  );
  campo(
    doc,
    "Consequência inerente",
    `${analise.mediaConsequencia} (${analise.nivelConsequencia})`,
    232,
    190,
    180,
    corInerente,
  );
  campo(
    doc,
    "Nível de risco inerente",
    analise.resultadoInerente,
    422,
    190,
    150,
    corInerente,
  );
  campo(
    doc,
    "Classificação inerente",
    analise.classificacaoRisco,
    582,
    190,
    218,
    corInerente,
  );

  campo(
    doc,
    "Probabilidade residual",
    `${texto(analise.probabilidadeResidual)} (${texto(analise.nivelProbabilidadeResidual)})`,
    42,
    250,
    180,
    corResidual,
  );
  campo(
    doc,
    "Consequência residual",
    `${texto(analise.consequenciaResidual)} (${texto(analise.nivelConsequenciaResidual)})`,
    232,
    250,
    180,
    corResidual,
  );
  campo(
    doc,
    "Nível de risco residual",
    texto(analise.resultadoResidual),
    422,
    250,
    150,
    corResidual,
  );
  campo(
    doc,
    "Classificação residual",
    texto(analise.classificacaoResidual),
    582,
    250,
    218,
    corResidual,
  );

  doc
    .roundedRect(42, 322, larguraConteudo, 118, 10)
    .fillColor("#ffffff")
    .fill()
    .strokeColor("#dbeafe")
    .stroke();
  doc
    .fillColor(pdfTheme.primary)
    .font("Helvetica-Bold")
    .fontSize(11)
    .text("Gráficos comparativos", 58, 338);
  barra(
    doc,
    "Risco inerente",
    analise.resultadoInerente,
    25,
    58,
    366,
    300,
    corInerente,
  );
  barra(
    doc,
    "Risco residual",
    analise.resultadoResidual,
    25,
    58,
    405,
    300,
    corResidual,
  );
  barra(
    doc,
    "Probabilidade residual",
    analise.probabilidadeResidual,
    5,
    430,
    366,
    300,
    corResidual,
  );
  barra(
    doc,
    "Consequência residual",
    analise.consequenciaResidual,
    5,
    430,
    405,
    300,
    corResidual,
  );

  campo(
    doc,
    "Desempenho probabilidade",
    variacao(analise.desempenhoProbabilidade),
    42,
    458,
    180,
  );
  campo(
    doc,
    "Desempenho consequência",
    variacao(analise.desempenhoConsequencia),
    232,
    458,
    180,
  );
  campo(
    doc,
    "Desempenho nível de risco",
    variacao(analise.desempenhoNivelRisco),
    422,
    458,
    180,
  );
  campo(doc, "Periodicidade / ação", analise.periodicidadeAcao, 612, 458, 188);

  doc.addPage();
  desenharCabecalhoPadrao(doc, {
    titulo: "Análise completa de riscos",
    subtitulo: "Fatores de risco e controles cadastrados",
    codigo: analise.codigo,
    unidade: analise.unidade,
  });

  blocoFatoresTratativa(doc, analise.fatoresRisco, 42, 132, 758, 150);
  blocoLista(
    doc,
    "Controles preventivos",
    analise.preventivos,
    42,
    302,
    370,
    150,
  );
  blocoLista(
    doc,
    "Controles detectivos",
    analise.detectivos,
    430,
    302,
    370,
    150,
  );
  blocoLista(doc, "Controles corretivos", analise.corretivos, 42, 470, 758, 55);

  doc
    .fillColor("#64748b")
    .font("Helvetica")
    .fontSize(8)
    .text(
      `Gerado em ${new Date().toLocaleString("pt-BR")} | Criado em ${new Date(analise.createdAt).toLocaleString("pt-BR")} | Última atualização ${new Date(analise.updatedAt).toLocaleString("pt-BR")}`,
      42,
      535,
      { width: 758, align: "center" },
    );

  secaoPlanosAcao(doc, analise);

  doc.end();
}
