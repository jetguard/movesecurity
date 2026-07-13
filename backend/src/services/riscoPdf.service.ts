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
  area?: string | null;
  tipoRisco: string;
  tituloRisco?: string | null;
  origemRisco?: string | null;
  naturezaRisco: string;
  fonteRisco?: string | null;
  fatorRisco?: string | null;
  fragilidade?: string | null;
  eventoIncerteza?: string | null;
  objetivoImpactado?: string | null;
  eficaciaControles?: string | null;
  criteriosAvaliacao?: string | null;
  controlesInternos?: string | null;
  atividadesControle?: string | null;
  monitoramento?: string | null;
  comunicacaoConsulta?: string | null;
  descricaoRisco: string;
  possivelImpacto: string;
  causaProvavel?: string | null;
  consequencia?: string | null;
  pessoasAfetadas?: string | null;
  controlesExistentes?: string | null;
  probabilidade: string;
  severidade: string;
  probabilidadeValor?: number | null;
  impactoValor?: number | null;
  resultadoRisco?: number | null;
  nivelRisco: string;
  nivelAceitacao?: string | null;
  tratamentoRisco?: string | null;
  medidasPreventivas: string;
  planoAcao: string;
  acaoProposta?: string | null;
  responsavelAcaoNome?: string | null;
  prazo: Date;
  custoEstimado?: string | null;
  prioridade?: string | null;
  statusAcao?: string | null;
  observacoes?: string | null;
  novaProbabilidade?: number | null;
  novoImpacto?: number | null;
  novoResultado?: number | null;
  novoNivelRisco?: string | null;
  observacaoReavaliacao?: string | null;
  dataReavaliacao?: Date | null;
  responsavelReavaliacao?: string | null;
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

function nivelPeso(nivel?: string | null) {
  if (nivel === "Crítico") return 4;
  if (nivel === "Alto") return 3;
  if (nivel === "Moderado") return 2;
  if (nivel === "Baixo") return 1;
  return 0;
}

function diasEntre(inicio?: Date | string | null, fim?: Date | string | null) {
  if (!inicio || !fim) return null;
  const dataInicio = inicio instanceof Date ? inicio : new Date(inicio);
  const dataFim = fim instanceof Date ? fim : new Date(fim);
  if (Number.isNaN(dataInicio.getTime()) || Number.isNaN(dataFim.getTime())) return null;
  return Math.round((dataFim.getTime() - dataInicio.getTime()) / 86400000);
}

function pluralDias(dias: number) {
  return `${Math.abs(dias)} ${Math.abs(dias) === 1 ? "dia" : "dias"}`;
}

function diagnosticoPrazo(risco: RiscoPdf) {
  const dias = diasEntre(new Date(), risco.prazo);
  if (dias === null) return "Prazo não informado para conclusão da tratativa.";
  if (["Concluído", "Reavaliado", "Encerrado"].includes(risco.status)) {
    return `Tratativa registrada com status ${risco.status}. O prazo final definido para controle foi ${formatarData(risco.prazo)}.`;
  }
  if (dias < 0) return `A tratativa está vencida há ${pluralDias(dias)}. Recomenda-se priorização imediata e registro formal da causa do atraso.`;
  if (dias === 0) return "A tratativa vence hoje. Recomenda-se acompanhamento no mesmo turno operacional.";
  if (dias <= 3) return `A tratativa vence em ${pluralDias(dias)}. Recomenda-se acompanhamento diário até a execução da ação proposta.`;
  return `A tratativa possui ${pluralDias(dias)} restantes até o prazo final, permitindo acompanhamento programado sem perda de controle.`;
}

function diagnosticoNivel(risco: RiscoPdf) {
  if (risco.nivelRisco === "Crítico") {
    return "O risco foi classificado como CRÍTICO, exigindo atenção prioritária da gestão, definição clara de responsável e acompanhamento até a redução do nível residual.";
  }
  if (risco.nivelRisco === "Alto") {
    return "O risco foi classificado como ALTO, indicando exposição relevante à operação e necessidade de plano de tratamento com prazo e evidências de execução.";
  }
  if (risco.nivelRisco === "Moderado") {
    return "O risco foi classificado como MODERADO, recomendando controle formal, monitoramento periódico e validação da efetividade das medidas propostas.";
  }
  return "O risco foi classificado como BAIXO, podendo ser aceito ou monitorado, desde que a decisão permaneça documentada e revisada em ciclos futuros.";
}

function diagnosticoTratamento(risco: RiscoPdf) {
  const tratamento = risco.tratamentoRisco || "Não informado";
  if (tratamento === "Eliminar") {
    return "A estratégia de tratamento indicada é eliminar a causa do risco. A ação deve remover a condição geradora ou interditar o cenário até que o risco deixe de existir de forma operacionalmente verificável.";
  }
  if (tratamento === "Reduzir") {
    return "A estratégia de tratamento indicada é reduzir o risco. O foco deve ser diminuir a probabilidade ou o impacto por meio de controles, tecnologia, procedimento, treinamento ou reforço operacional.";
  }
  if (tratamento === "Transferir") {
    return "A estratégia de tratamento indicada é transferir parte da exposição. Recomenda-se formalizar responsabilidade contratual, seguro, SLA ou escopo de terceiros envolvidos.";
  }
  if (tratamento === "Aceitar") {
    return "A estratégia indicada é aceitar o risco. Essa decisão deve ser justificada, aprovada e mantida sob monitoramento, especialmente se houver mudança no contexto operacional.";
  }
  return "A estratégia de tratamento ainda não foi informada. Recomenda-se definir se o risco será eliminado, reduzido, transferido ou aceito.";
}

function diagnosticoReavaliacao(risco: RiscoPdf) {
  if (!risco.novoResultado || !risco.novoNivelRisco) {
    return "Ainda não há reavaliação residual registrada. Após a execução do plano de tratamento, recomenda-se nova medição de probabilidade e impacto para comprovar a efetividade da ação.";
  }

  const inicial = risco.resultadoRisco || 0;
  const residual = risco.novoResultado || 0;
  const diferenca = inicial - residual;
  const reducaoPercentual = inicial > 0 ? Math.round((diferenca / inicial) * 100) : 0;
  const pesoInicial = nivelPeso(risco.nivelRisco);
  const pesoResidual = nivelPeso(risco.novoNivelRisco);

  if (diferenca > 0 && pesoResidual < pesoInicial) {
    return `A reavaliação demonstra redução efetiva do risco: o resultado passou de ${inicial} (${risco.nivelRisco}) para ${residual} (${risco.novoNivelRisco}), representando redução aproximada de ${reducaoPercentual}% na exposição calculada.`;
  }
  if (diferenca > 0) {
    return `A reavaliação reduziu o resultado de ${inicial} para ${residual}, porém o nível residual permanece em ${risco.novoNivelRisco}. Recomenda-se manter acompanhamento até nova redução de exposição.`;
  }
  if (diferenca === 0) {
    return `A reavaliação manteve o resultado em ${residual}. Não foi evidenciada redução quantitativa do risco, sendo recomendável revisar a efetividade das ações propostas.`;
  }
  return `A reavaliação elevou o resultado de ${inicial} para ${residual}. O cenário residual exige revisão imediata do plano de tratamento e reclassificação da prioridade.`;
}

function parecerExecutivo(risco: RiscoPdf) {
  const titulo = texto(risco.tituloRisco || risco.riscoCatalogo?.nome || risco.tipoRisco);
  const resultado = risco.resultadoRisco || (Number(risco.probabilidadeValor || 1) * Number(risco.impactoValor || 1));
  const prazo = diagnosticoPrazo(risco);

  return [
    `A presente análise avalia o risco "${titulo}" na unidade ${texto(risco.unidade)}, local ${texto(risco.local)}, área ${texto(risco.area)}.`,
    `A classificação inicial resultou em ${resultado} ponto(s), nível ${texto(risco.nivelRisco)}, considerando probabilidade ${texto(risco.probabilidadeValor || risco.probabilidade)} e impacto ${texto(risco.impactoValor || risco.severidade)}.`,
    diagnosticoNivel(risco),
    diagnosticoTratamento(risco),
    prazo,
    diagnosticoReavaliacao(risco),
  ].join("\n\n");
}

function recomendacoesDiretoria(risco: RiscoPdf) {
  const recomendacoes = [
    `Manter responsável formal pela ação: ${texto(risco.responsavelAcaoNome)}.`,
    `Exigir evidências objetivas de execução do plano até ${formatarData(risco.prazo)}.`,
    "Registrar nova reavaliação após a conclusão da ação para medir o risco residual.",
  ];

  if (["Crítico", "Alto"].includes(risco.nivelRisco)) {
    recomendacoes.unshift("Tratar o risco como prioridade gerencial até que o nível residual seja reduzido ou formalmente aceito.");
  }

  if (risco.nivelAceitacao === "Não aceito") {
    recomendacoes.push("Como o risco foi marcado como não aceito, a permanência do cenário deve ser submetida à gestão responsável.");
  }

  if (!risco.novoResultado) {
    recomendacoes.push("Programar reavaliação obrigatória após execução, evitando encerramento sem comprovação de efetividade.");
  }

  return recomendacoes;
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

function blocoAnalitico(doc: PDFKit.PDFDocument, rotulo: string, conteudo: string, cor = pdfTheme.accent) {
  const valor = texto(conteudo);
  const textoWidth = larguraConteudo - 34;
  const alturaTexto = doc.font("Helvetica").fontSize(9.6).heightOfString(valor, {
    width: textoWidth,
    lineGap: 3,
    align: "justify",
  });
  const altura = Math.max(92, alturaTexto + 44);

  garantirEspaco(doc, altura + 12);
  const y = doc.y;

  doc.roundedRect(margemX, y, larguraConteudo, altura, 8).fillColor("#f8fafc").fill().strokeColor("#bfdbfe").lineWidth(0.9).stroke();
  doc.rect(margemX, y, 5, altura).fill(cor);
  doc.fillColor(cor).font("Helvetica-Bold").fontSize(8).text(rotulo.toUpperCase(), margemX + 16, y + 11, {
    width: textoWidth,
    height: 11,
    ellipsis: true,
  });
  doc.fillColor(pdfTheme.primary).font("Helvetica").fontSize(9.6).text(valor, margemX + 16, y + 30, {
    width: textoWidth,
    lineGap: 3,
    align: "justify",
  });

  doc.y = y + altura + 12;
}

function listaRecomendacoes(doc: PDFKit.PDFDocument, titulo: string, itens: string[]) {
  const linhas = itens.filter(Boolean);
  const alturaTexto = linhas.reduce((acc, item) => acc + doc.font("Helvetica").fontSize(9.2).heightOfString(item, { width: larguraConteudo - 50, lineGap: 2 }), 0);
  const altura = Math.max(78, alturaTexto + 38 + linhas.length * 8);

  garantirEspaco(doc, altura + 10);
  const y = doc.y;
  doc.roundedRect(margemX, y, larguraConteudo, altura, 8).fillColor("#ffffff").fill().strokeColor(pdfTheme.line).lineWidth(0.8).stroke();
  doc.fillColor(pdfTheme.accent).font("Helvetica-Bold").fontSize(8).text(titulo.toUpperCase(), margemX + 12, y + 10, { width: larguraConteudo - 24 });

  let cursorY = y + 30;
  linhas.forEach((item, index) => {
    doc.circle(margemX + 17, cursorY + 5, 2.4).fillColor(pdfTheme.accent).fill();
    doc.fillColor(pdfTheme.primary).font("Helvetica").fontSize(9.2).text(`${index + 1}. ${item}`, margemX + 28, cursorY, {
      width: larguraConteudo - 44,
      lineGap: 2,
      align: "justify",
    });
    cursorY += doc.heightOfString(`${index + 1}. ${item}`, { width: larguraConteudo - 44, lineGap: 2 }) + 7;
  });

  doc.y = y + altura + 10;
}

function comparativoResidual(doc: PDFKit.PDFDocument, risco: RiscoPdf) {
  garantirEspaco(doc, 160);
  const y = doc.y;
  const inicial = risco.resultadoRisco || (Number(risco.probabilidadeValor || 1) * Number(risco.impactoValor || 1));
  const residual = risco.novoResultado || 0;
  const delta = residual ? inicial - residual : null;
  const deltaTexto = delta === null ? "Pendente" : `${delta > 0 ? "-" : "+"}${Math.abs(delta)} ponto(s)`;

  doc.roundedRect(margemX, y, larguraConteudo, 142, 8).fillColor("#ffffff").fill().strokeColor(pdfTheme.line).lineWidth(0.8).stroke();
  doc.fillColor(pdfTheme.primary).font("Helvetica-Bold").fontSize(10).text("Comparativo de exposição", margemX + 12, y + 12, { width: larguraConteudo - 24 });

  campo(doc, "Antes", `P${texto(risco.probabilidadeValor)} x I${texto(risco.impactoValor)}`, margemX + 12, y + 36, 110);
  campo(doc, "Resultado inicial", inicial, margemX + 134, y + 36, 110, corNivel(risco.nivelRisco));
  campo(doc, "Nível inicial", risco.nivelRisco, margemX + 256, y + 36, 110, corNivel(risco.nivelRisco));
  campo(doc, "Variação", deltaTexto, margemX + 378, y + 36, 120, delta && delta > 0 ? "#059669" : delta && delta < 0 ? "#dc2626" : pdfTheme.primary);

  campo(doc, "Depois", risco.novoResultado ? `P${texto(risco.novaProbabilidade)} x I${texto(risco.novoImpacto)}` : "Pendente", margemX + 12, y + 86, 110);
  campo(doc, "Resultado residual", risco.novoResultado || "Pendente", margemX + 134, y + 86, 110, risco.novoNivelRisco ? corNivel(risco.novoNivelRisco) : pdfTheme.primary);
  campo(doc, "Nível residual", risco.novoNivelRisco || "Pendente", margemX + 256, y + 86, 110, risco.novoNivelRisco ? corNivel(risco.novoNivelRisco) : pdfTheme.primary);
  campo(doc, "Reavaliado em", risco.dataReavaliacao ? formatarData(risco.dataReavaliacao) : "Pendente", margemX + 378, y + 86, 120);

  doc.y = y + 154;
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
  const diasPlanejados = diasEntre(risco.dataHora, risco.prazo);
  const janelaTratamento = diasPlanejados === null ? "Não informado" : `${pluralDias(diasPlanejados)} planejado(s)`;

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `inline; filename=${nomeArquivo}.pdf`);
  doc.pipe(res);

  desenharCabecalhoPadrao(doc, {
    titulo: "Análise de Risco",
    subtitulo: risco.tituloRisco || risco.riscoCatalogo?.nome || `${risco.tipoRisco} | ${risco.naturezaRisco}`,
    codigo: risco.codigo,
    unidade: risco.unidade,
    emitidoEm: new Date(),
  });

  secao(doc, "Sumário executivo");
  blocoAnalitico(doc, "Parecer técnico para diretoria", parecerExecutivo(risco), corNivel(risco.nivelRisco));

  secao(doc, "Dados da análise");
  linhaCampos(doc, [
    { rotulo: "Responsável", valor: risco.responsavel?.nome, width: 160 },
    { rotulo: "Data e hora", valor: formatarData(risco.dataHora), width: 165 },
    { rotulo: "Status", valor: risco.status, width: 162 },
  ]);
  linhaCampos(doc, [
    { rotulo: "Unidade", valor: risco.unidade, width: 160 },
    { rotulo: "Local", valor: risco.local, width: 165 },
    { rotulo: "Área", valor: risco.area, width: 162 },
  ]);

  secao(doc, "Risco identificado");
  linhaCampos(doc, [
    { rotulo: "Título", valor: risco.tituloRisco || risco.riscoCatalogo?.nome || "Risco identificado", width: 245 },
    { rotulo: "Categoria", valor: risco.tipoRisco, width: 120 },
    { rotulo: "Status", valor: risco.status, width: 125 },
  ]);
  linhaCampos(doc, [
    { rotulo: "Setor", valor: risco.setor, width: 160 },
    { rotulo: "Local", valor: risco.local, width: 165 },
    { rotulo: "Prazo da tratativa", valor: formatarData(risco.prazo), width: 162 },
  ]);

  secao(doc, "Classificação");
  resumoClassificacao(doc, risco);
  linhaCampos(doc, [
    { rotulo: "Probabilidade inicial", valor: risco.probabilidadeValor, width: 120 },
    { rotulo: "Impacto inicial", valor: risco.impactoValor, width: 120 },
    { rotulo: "Pontuação inicial", valor: risco.resultadoRisco, width: 120 },
    { rotulo: "Aceitação", valor: risco.nivelAceitacao, width: 125 },
  ]);
  comparativoResidual(doc, risco);

  secao(doc, "Análise do risco");
  linhaCampos(doc, [
    { rotulo: "Eficácia dos controles", valor: risco.eficaciaControles, width: 160 },
    { rotulo: "Nível inicial", valor: risco.nivelRisco, width: 165 },
    { rotulo: "Nível residual", valor: risco.novoNivelRisco || "Não reavaliado", width: 162 },
  ]);
  blocoTexto(doc, "O que pode acontecer?", risco.descricaoRisco);
  blocoTexto(doc, "Consequência", risco.consequencia || risco.possivelImpacto);
  blocoTexto(doc, "Pessoas ou áreas afetadas", risco.pessoasAfetadas);
  blocoTexto(doc, "Controles existentes", risco.controlesExistentes);
  blocoTexto(doc, "Justificativa da análise", risco.criteriosAvaliacao);

  secao(doc, "Plano de tratamento");
  linhaCampos(doc, [
    { rotulo: "Tratamento", valor: risco.tratamentoRisco, width: 120 },
    { rotulo: "Prioridade", valor: risco.prioridade, width: 120 },
    { rotulo: "Status da ação", valor: risco.statusAcao, width: 120 },
    { rotulo: "Custo estimado", valor: risco.custoEstimado, width: 125 },
  ]);
  blocoTexto(doc, "Ação proposta", risco.acaoProposta || risco.planoAcao);
  blocoTexto(doc, "Controles internos propostos", risco.controlesInternos || risco.controlesExistentes || risco.medidasPreventivas);
  blocoTexto(doc, "Atividades de controle", risco.atividadesControle);
  blocoTexto(doc, "Monitoramento", risco.monitoramento);
  blocoTexto(doc, "Comunicação e consulta", risco.comunicacaoConsulta);
  linhaCampos(doc, [
    { rotulo: "Responsável pela ação", valor: risco.responsavelAcaoNome, width: 160 },
    { rotulo: "Prazo final", valor: formatarData(risco.prazo), width: 165 },
    { rotulo: "Janela planejada", valor: janelaTratamento, width: 162 },
  ]);
  blocoTexto(doc, "Observações", risco.observacoes);

  if (risco.novoResultado || risco.observacaoReavaliacao) {
    secao(doc, "Reavaliação do risco");
    linhaCampos(doc, [
      { rotulo: "Probabilidade residual", valor: risco.novaProbabilidade, width: 120 },
      { rotulo: "Impacto residual", valor: risco.novoImpacto, width: 120 },
      { rotulo: "Resultado residual", valor: risco.novoResultado, width: 120 },
      { rotulo: "Nível residual", valor: risco.novoNivelRisco, width: 125, destaque: corNivel(risco.novoNivelRisco || "") },
    ]);
    linhaCampos(doc, [
      { rotulo: "Data da reavaliação", valor: formatarData(risco.dataReavaliacao), width: 245 },
      { rotulo: "Responsável", valor: risco.responsavelReavaliacao, width: 245 },
    ]);
    blocoTexto(doc, "Observação da reavaliação", risco.observacaoReavaliacao);
  }

  secao(doc, "Recomendações executivas");
  listaRecomendacoes(doc, "Encaminhamentos recomendados", recomendacoesDiretoria(risco));

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
