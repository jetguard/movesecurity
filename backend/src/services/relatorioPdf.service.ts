import crypto from "crypto";
import path from "path";
import PDFDocument from "pdfkit";
import QRCode from "qrcode";
import { Request, Response } from "express";
import { jwtSecret } from "../config/security";

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
  unidade?: string | null;
  local?: string | null;
  natureza?: string | null;
  subNatureza?: string | null;
  status: string;
  data: Date;
  relatoSeguranca?: string | null;
  acoesTomadas?: string | null;
  envolvidos?: EnvolvidoPdf[];
  investigacao?: {
    codigo?: string | null;
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
  riscos?: {
    codigo: string;
    dataHora: Date;
    status: string;
    setor: string;
    local: string;
    tipoRisco: string;
    naturezaRisco: string;
    probabilidade: string;
    severidade: string;
    nivelRisco: string;
    descricaoRisco: string;
    possivelImpacto: string;
    medidasPreventivas: string;
    planoAcao: string;
    prazo: Date;
    responsavel?: { nome: string } | null;
    responsavelAcaoNome?: string | null;
  }[];
  estrategicas?: {
    codigo: string;
    tipo: string;
    titulo: string;
    status: string;
    dataHora: Date;
    descricao: string;
    diagnostico?: string | null;
    impacto?: string | null;
    recomendacoes?: string | null;
    planoAcao?: string | null;
    responsavelAcao?: string | null;
    prazo?: Date | null;
    responsavel?: { nome: string } | null;
  }[];
};

type UsuarioAssinatura = {
  nome: string;
  re?: string | null;
  cargo?: string | null;
  setor?: string | null;
  empresa?: string | null;
};

export type TipoRelatorioPublico = "ocorrencias" | "eventos";

const logoPath = path.resolve(process.cwd(), "assets", "movecta-logo.png");
const watermarkPath = path.resolve(process.cwd(), "assets", "jetguard-watermark.png");
const page = {
  left: 42,
  right: 553,
  top: 28,
  headerBottom: 114,
  contentTop: 128,
  footerTop: 725,
  bottom: 804,
};
const contentWidth = page.right - page.left;

function desenharMarcaDagua(doc: PDFKit.PDFDocument, opacity = 0.052) {
  const largura = 270;
  const x = (doc.page.width - largura) / 2;
  const y = (doc.page.height - largura) / 2;
  doc
    .save()
    .opacity(opacity)
    .image(watermarkPath, x, y, { width: largura })
    .restore();
}

function decodificarEntidadeHtml(entidade: string) {
  const mapa: Record<string, string> = {
    amp: "&",
    lt: "<",
    gt: ">",
    quot: '"',
    apos: "'",
    nbsp: " ",
    ccedil: "ç",
    Ccedil: "Ç",
    aacute: "á",
    Aacute: "Á",
    eacute: "é",
    Eacute: "É",
    iacute: "í",
    Iacute: "Í",
    oacute: "ó",
    Oacute: "Ó",
    uacute: "ú",
    Uacute: "Ú",
    atilde: "ã",
    Atilde: "Ã",
    otilde: "õ",
    Otilde: "Õ",
    acirc: "â",
    Acirc: "Â",
    ecirc: "ê",
    Ecirc: "Ê",
    ocirc: "ô",
    Ocirc: "Ô",
  };

  if (mapa[entidade]) return mapa[entidade];

  if (entidade.startsWith("#x")) {
    const codigo = Number.parseInt(entidade.slice(2), 16);
    return Number.isFinite(codigo) ? String.fromCodePoint(codigo) : "";
  }

  if (entidade.startsWith("#")) {
    const codigo = Number.parseInt(entidade.slice(1), 10);
    return Number.isFinite(codigo) ? String.fromCodePoint(codigo) : "";
  }

  return "";
}

function textoPdf(valorEntrada?: string | number | null) {
  const texto = String(valorEntrada ?? "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|h[1-6])>/gi, "\n")
    .replace(/<li[^>]*>/gi, "- ")
    .replace(/<[^>]+>/g, "")
    .replace(/&([a-zA-Z]+|#[0-9]+|#x[0-9a-fA-F]+);/g, (_, entidade) => decodificarEntidadeHtml(entidade))
    .normalize("NFC")
    .replace(/[\u2018\u2019\u201A\u201B]/g, "'")
    .replace(/[\u201C\u201D\u201E\u201F]/g, '"')
    .replace(/[\u2013\u2014\u2212]/g, "-")
    .replace(/\u2026/g, "...")
    .replace(/[\u2022\u25CF\u25E6\u2043]/g, "-")
    .replace(/[\u00A0\u2007\u202F]/g, " ")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/[Ðð]/g, "")
    .replace(/[^\u0009\u000A\u000D\u0020-\u00FF]/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return texto;
}

function desenharAssinaturaDigital(
  doc: PDFKit.PDFDocument,
  params: {
    x: number;
    y: number;
    width: number;
    height: number;
    usuario: UsuarioAssinatura;
    token: string;
    qrCode: string;
  }
) {
  const qrSize = Math.min(54, params.height - 8);
  const qrX = params.x + params.width - qrSize - 10;
  const qrY = params.y + (params.height - qrSize) / 2;
  const textoX = params.x + 18;
  const textoWidth = params.width - qrSize - 42;

  const detalhesUsuario = [
    params.usuario.re ? `R.E: ${textoPdf(params.usuario.re)}` : null,
    params.usuario.cargo ? `Cargo: ${textoPdf(params.usuario.cargo)}` : null,
    params.usuario.setor ? `Setor: ${textoPdf(params.usuario.setor)}` : null,
    params.usuario.empresa ? `Empresa: ${textoPdf(params.usuario.empresa)}` : null,
  ]
    .filter(Boolean)
    .join(" | ");

  doc
    .roundedRect(params.x, params.y, params.width, params.height, 8)
    .fillColor("#f8fbff")
    .fill()
    .roundedRect(params.x, params.y, params.width, params.height, 8)
    .lineWidth(0.7)
    .strokeColor("#dbeafe")
    .stroke();

  doc
    .roundedRect(params.x, params.y, 6, params.height, 8)
    .fillColor("#0b74ff")
    .fill();

  doc
    .font("Helvetica-Bold")
    .fontSize(8.6)
    .fillColor("#0f172a")
    .text("Assinatura digital JetGuard", textoX, params.y + 8, { width: textoWidth });

  doc
    .font("Helvetica")
    .fontSize(7.4)
    .fillColor("#334155")
    .text(textoPdf(`Documento validado por ${params.usuario.nome}`), textoX, params.y + 22, {
      width: textoWidth,
    });

  if (detalhesUsuario && params.height >= 68) {
    doc
      .fontSize(6.8)
      .fillColor("#64748b")
      .text(textoPdf(detalhesUsuario), textoX, params.y + 40, { width: textoWidth });
  }

  doc
    .font("Helvetica-Bold")
    .fontSize(6.9)
    .fillColor("#0b74ff")
    .text(textoPdf(`Código: ${params.token}`), textoX, params.y + params.height - 14, {
      width: textoWidth,
    });

  doc.image(params.qrCode, qrX, qrY, { width: qrSize });
  doc
    .font("Helvetica")
    .fontSize(6.4)
    .fillColor("#64748b")
    .text("Validar", qrX - 6, params.y + params.height - 10, {
      width: qrSize + 12,
      align: "center",
    });
}

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

export function criarTokenAcessoPdf(params: {
  tipo: TipoRelatorioPublico;
  id: number;
  codigo: string;
  unidade: string;
}) {
  return crypto
    .createHmac("sha256", jwtSecret())
    .update(`${params.tipo}:${params.id}:${params.codigo}:${params.unidade}`)
    .digest("hex")
    .slice(0, 32);
}

export function validarTokenAcessoPdf(params: {
  tipo: TipoRelatorioPublico;
  id: number;
  codigo: string;
  unidade: string;
  token?: string | null;
}) {
  if (!params.token) return false;
  const esperado = criarTokenAcessoPdf(params);
  const recebido = String(params.token);

  if (recebido.length !== esperado.length) return false;

  return crypto.timingSafeEqual(Buffer.from(recebido), Buffer.from(esperado));
}

export function criarUrlPublicaPdf(
  req: Pick<Request, "protocol" | "get">,
  params: {
    tipo: TipoRelatorioPublico;
    id: number;
    codigo: string;
    unidade: string;
  }
) {
  const token = criarTokenAcessoPdf(params);
  return `${req.protocol}://${req.get("host")}/api/public/relatorios/${params.tipo}/${params.id}/pdf?token=${token}`;
}

function valor(valor?: string | null) {
  const texto = textoPdf(valor);
  return texto ? texto : "Não informado";
}

function desenharBasePagina(
  doc: PDFKit.PDFDocument,
  relatorio: RelatorioPdf,
  usuario: UsuarioAssinatura,
  qrCode: string,
  token: string
) {
  doc.save();

  desenharMarcaDagua(doc);
  doc.roundedRect(page.left, page.top, contentWidth, 72, 10).fill("#0f172a");
  doc.roundedRect(page.left + 12, page.top + 14, 126, 38, 8).fill("#ffffff");
  doc.image(logoPath, page.left + 20, page.top + 22, { width: 110, height: 22, fit: [110, 22] });

  doc
    .font("Helvetica")
    .fontSize(8)
    .fillColor("#dbeafe")
    .text(textoPdf(`RELATÓRIO DE ${relatorio.tipo}`).toUpperCase(), page.left + 148, page.top + 14, { width: 230 });

  doc
    .font("Helvetica-Bold")
    .fontSize(18)
    .fillColor("#ffffff")
    .text(textoPdf(relatorio.codigo), page.left + 148, page.top + 29, { width: 230 });

  doc
    .font("Helvetica")
    .fontSize(9)
    .fillColor("#cbd5e1")
    .text(`Unidade: ${textoPdf(relatorio.unidade || "GJA-T1")}`, page.left + 148, page.top + 53, { width: 230 });

  doc
    .font("Helvetica")
    .fontSize(8.5)
    .fillColor("#bfdbfe")
    .text(`Emitido em ${new Date().toLocaleString("pt-BR")}`, page.right - 178, page.top + 24, {
      width: 166,
      align: "right",
    });

  doc
    .font("Helvetica-Bold")
    .fontSize(10)
    .fillColor("#ffffff")
    .text(textoPdf(relatorio.status), page.right - 178, page.top + 48, {
      width: 166,
      align: "right",
    });

  doc.moveTo(page.left, page.headerBottom).lineTo(page.right, page.headerBottom).strokeColor("#dbe4f0").lineWidth(0.8).stroke();
  doc.moveTo(page.left, page.footerTop - 10).lineTo(page.right, page.footerTop - 10).strokeColor("#dbe4f0").lineWidth(0.8).stroke();

  desenharAssinaturaDigital(doc, {
    x: page.left,
    y: page.footerTop,
    width: contentWidth - 72,
    height: 54,
    usuario,
    token,
    qrCode,
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
  const y = doc.y;
  doc
    .roundedRect(page.left, y - 3, contentWidth, 24, 6)
    .fillColor("#0b74ff")
    .fill()
    .roundedRect(page.left, y - 3, contentWidth, 24, 6)
    .strokeColor("#0b74ff")
    .stroke();
  doc
    .font("Helvetica-Bold")
    .fontSize(10.8)
    .fillColor("#ffffff")
    .text(textoPdf(titulo.toUpperCase()), page.left + 12, y + 4, { width: contentWidth - 24 });
  doc.y = y + 31;
}

function escreverCampo(
  doc: PDFKit.PDFDocument,
  rotulo: string,
  conteudo: string,
  x: number,
  y: number,
  width: number
) {
  const altura = 36;
  doc
    .roundedRect(x, y - 4, width, altura, 6)
    .fillColor("#f8fafc")
    .fill()
    .roundedRect(x, y - 4, width, altura, 6)
    .strokeColor("#e2e8f0")
    .lineWidth(0.55)
    .stroke();

  doc
    .font("Helvetica-Bold")
    .fontSize(7.7)
    .fillColor("#0b74ff")
    .text(textoPdf(rotulo.toUpperCase()), x + 10, y + 3, { width: width - 20 });

  doc
    .font("Helvetica")
    .fontSize(9.3)
    .fillColor("#111827")
    .text(textoPdf(conteudo), x + 10, y + 16, { width: width - 20, height: 14, lineGap: 1 });
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
    garantirEspaco(doc, 108, relatorio, usuario, qrCode, token);

    const y = doc.y;
    doc
      .lineWidth(0.6)
      .fillColor("#ffffff")
      .roundedRect(page.left, y, contentWidth, 94, 8)
      .fill()
      .roundedRect(page.left, y, contentWidth, 94, 8)
      .strokeColor("#dbeafe")
      .stroke();

    doc
      .roundedRect(page.left, y, contentWidth, 24, 8)
      .fillColor("#eff6ff")
      .fill();

    doc
      .font("Helvetica-Bold")
      .fontSize(10.5)
      .fillColor("#0f172a")
      .text(textoPdf(`${index + 1}. ${envolvido.nome}`), page.left + 14, y + 7, {
        width: 260,
      });

    doc
      .font("Helvetica-Bold")
      .fontSize(7.2)
      .fillColor("#2563eb")
      .text(textoPdf(valor(envolvido.tipoEnvolvimento).toUpperCase()), page.right - 155, y + 8, {
        width: 140,
        align: "right",
      });

    doc
      .font("Helvetica")
      .fontSize(9)
      .fillColor("#334155")
      .text(textoPdf(`Documento: ${envolvido.tipoDocumento} ${envolvido.documento}`), page.left + 14, y + 36, { width: 240 })
      .text(textoPdf(`Empresa: ${valor(envolvido.empresa)}`), page.left + 285, y + 36, { width: 205 });

    const veiculo = envolvido.possuiVeiculo
      ? `Placa: ${valor(envolvido.placa)} | Reboque: ${valor(envolvido.reboque)}`
      : "Veículo: não informado";

    doc
      .font("Helvetica")
      .fontSize(8.8)
      .fillColor("#475569")
      .text(textoPdf(veiculo), page.left + 14, y + 56, { width: 245 });

    doc
      .font("Helvetica-Bold")
      .fontSize(7.5)
      .fillColor("#64748b")
      .text("REGISTRO DO ENVOLVIDO", page.left + 285, y + 56, { width: 205 });

    doc.y = y + 108;
    garantirEspaco(doc, 52, relatorio, usuario, qrCode, token);
    doc
      .font("Helvetica-Bold")
      .fontSize(8.5)
      .fillColor("#64748b")
      .text(textoPdf(`RELATO DO ENVOLVIDO ${index + 1}`), page.left, doc.y, { width: contentWidth });
    doc.moveDown(0.25);

    relato.split(/\n+/).forEach((paragrafo) => {
      const textoParagrafo = textoPdf(paragrafo);
      if (!textoParagrafo) return;

      const altura = doc.heightOfString(textoParagrafo, {
        width: contentWidth,
        align: "justify",
        lineGap: 3,
      });

      garantirEspaco(doc, altura + 10, relatorio, usuario, qrCode, token);
      doc
        .font("Helvetica")
        .fontSize(9.5)
        .fillColor("#111827")
        .text(textoParagrafo, page.left, doc.y, {
          width: contentWidth,
          align: "justify",
          lineGap: 3,
        });
      doc.moveDown(0.45);
    });
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
  doc.font("Helvetica-Bold").fontSize(9).fillColor("#64748b").text(textoPdf(titulo), page.left, doc.y);
  doc.moveDown(0.3);

  textoPdf(texto).split(/\n+/).forEach((paragrafo) => {
    const textoParagrafo = textoPdf(paragrafo);
    if (!textoParagrafo) return;

    const altura = doc.heightOfString(textoParagrafo, {
      width: contentWidth,
      align: "justify",
      lineGap: 3,
    });

    garantirEspaco(doc, altura + 12, relatorio, usuario, qrCode, token);
    doc
      .font("Helvetica")
      .fontSize(10)
      .fillColor("#111827")
      .text(textoParagrafo, page.left, doc.y, {
        width: contentWidth,
        align: "justify",
        lineGap: 3,
      });
    doc.moveDown(0.5);
  });
}

function escreverTextoPaginado(
  doc: PDFKit.PDFDocument,
  texto: string,
  relatorio: RelatorioPdf,
  usuario: UsuarioAssinatura,
  qrCode: string,
  token: string
) {
  const paragrafos = textoPdf(texto).split(/\n+/);

  paragrafos.forEach((paragrafo) => {
    const textoParagrafo = textoPdf(paragrafo);
    if (!textoParagrafo) return;

    const palavras = textoParagrafo.split(/\s+/);
    let trecho = "";

    palavras.forEach((palavra) => {
      const tentativa = trecho ? `${trecho} ${palavra}` : palavra;
      const altura = doc.heightOfString(tentativa, {
        width: contentWidth,
        align: "justify",
        lineGap: 3,
      });
      const espacoDisponivel = page.footerTop - 18 - doc.y;

      if (altura > espacoDisponivel && trecho) {
        doc
          .font("Helvetica")
          .fontSize(10)
          .fillColor("#111827")
          .text(trecho, page.left, doc.y, {
            width: contentWidth,
            align: "justify",
            lineGap: 3,
          });
        novaPagina(doc, relatorio, usuario, qrCode, token);
        trecho = palavra;
        return;
      }

      trecho = tentativa;
    });

    if (trecho) {
      garantirEspaco(doc, 24, relatorio, usuario, qrCode, token);
      doc
        .font("Helvetica")
        .fontSize(10)
        .fillColor("#111827")
        .text(trecho, page.left, doc.y, {
          width: contentWidth,
          align: "justify",
          lineGap: 3,
        });
      doc.moveDown(0.6);
    }
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

  const numeroInvestigacao = relatorio.investigacao.codigo || relatorio.investigacao.numeroOcorrencia || relatorio.codigo;
  const relatorioInvestigacao: RelatorioPdf = {
    ...relatorio,
    tipo: "Investigação",
    codigo: numeroInvestigacao,
  };

  novaPagina(doc, relatorioInvestigacao, usuario, qrCode, token);
  escreverTituloSecao(doc, "Relatório de investigação");

  const y = doc.y;
  const colunaLargura = 230;
  const colunaDireitaX = page.left + 270;

  escreverCampo(doc, "Número da R.I.", valor(numeroInvestigacao), page.left, y, colunaLargura);
  escreverCampo(doc, "Data da conversão", formatarData(relatorio.investigacao.createdAt), page.left, y + 42, colunaLargura);
  escreverCampo(doc, "Ocorrência vinculada", valor(relatorio.investigacao.numeroOcorrencia), colunaDireitaX, y, colunaLargura);
  escreverCampo(doc, "Responsável", valor(relatorio.investigacao.responsavel?.nome), colunaDireitaX, y + 42, colunaLargura);
  escreverCampo(doc, "Status", relatorio.investigacao.status, page.left, y + 84, colunaLargura);

  doc.y = y + 128;
  const fraseAbertura = `O usuário ${valor(relatorio.investigacao.responsavel?.nome)} iniciou a investigação do Relatório de Ocorrência nº ${relatorio.codigo}.`;
  escreverBlocoTexto(doc, "Abertura da investigação", fraseAbertura, relatorioInvestigacao, usuario, qrCode, token);
  escreverBlocoTexto(doc, "Descrição da investigação", valor(relatorio.investigacao.descricaoInvestigacao), relatorioInvestigacao, usuario, qrCode, token);
  escreverBlocoTexto(doc, "Conclusão dos fatos", valor(relatorio.investigacao.conclusaoFatos), relatorioInvestigacao, usuario, qrCode, token);
}

function escreverAnalise(
  doc: PDFKit.PDFDocument,
  relatorio: RelatorioPdf,
  usuario: UsuarioAssinatura,
  qrCode: string,
  token: string
) {
  if (!relatorio.analise) return;

  novaPagina(doc, relatorio, usuario, qrCode, token);
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

function escreverAnalisesRisco(
  doc: PDFKit.PDFDocument,
  relatorio: RelatorioPdf,
  usuario: UsuarioAssinatura,
  qrCode: string,
  token: string
) {
  if (!relatorio.riscos?.length) return;

  relatorio.riscos.forEach((risco) => {
    novaPagina(doc, relatorio, usuario, qrCode, token);
    escreverTituloSecao(doc, `Análise de risco ${risco.codigo}`);

    const y = doc.y;
    const colunaLargura = 230;
    const colunaDireitaX = page.left + 270;

    escreverCampo(doc, "Responsável", valor(risco.responsavel?.nome), page.left, y, colunaLargura);
    escreverCampo(doc, "Data/hora", formatarData(risco.dataHora), colunaDireitaX, y, colunaLargura);
    escreverCampo(doc, "Status", risco.status, page.left, y + 42, colunaLargura);
    escreverCampo(doc, "Nível do risco", risco.nivelRisco, colunaDireitaX, y + 42, colunaLargura);
    escreverCampo(doc, "Tipo / Natureza", `${risco.tipoRisco} | ${risco.naturezaRisco}`, page.left, y + 84, colunaLargura);
    escreverCampo(doc, "Probabilidade / Severidade", `${risco.probabilidade} | ${risco.severidade}`, colunaDireitaX, y + 84, colunaLargura);
    escreverCampo(doc, "Setor", risco.setor, page.left, y + 126, colunaLargura);
    escreverCampo(doc, "Local", risco.local, colunaDireitaX, y + 126, colunaLargura);

    doc.y = y + 170;
    escreverBlocoTexto(doc, "Descrição do risco", risco.descricaoRisco, relatorio, usuario, qrCode, token);
    escreverBlocoTexto(doc, "Possível impacto", risco.possivelImpacto, relatorio, usuario, qrCode, token);
    escreverBlocoTexto(doc, "Medidas preventivas", risco.medidasPreventivas, relatorio, usuario, qrCode, token);
    escreverBlocoTexto(
      doc,
      "Plano de ação",
      `${risco.planoAcao}\nResponsável: ${valor(risco.responsavelAcaoNome)}\nPrazo: ${formatarData(risco.prazo)}`,
      relatorio,
      usuario,
      qrCode,
      token
    );
  });
}

function escreverAnalisesEstrategicas(
  doc: PDFKit.PDFDocument,
  relatorio: RelatorioPdf,
  usuario: UsuarioAssinatura,
  qrCode: string,
  token: string
) {
  if (!relatorio.estrategicas?.length) return;

  relatorio.estrategicas.forEach((analise) => {
    novaPagina(doc, relatorio, usuario, qrCode, token);
    escreverTituloSecao(doc, `Análise estratégica ${analise.codigo}`);

    const y = doc.y;
    const colunaLargura = 230;
    const colunaDireitaX = page.left + 270;

    escreverCampo(doc, "Título", analise.titulo, page.left, y, contentWidth);
    escreverCampo(doc, "Tipo", analise.tipo, page.left, y + 42, colunaLargura);
    escreverCampo(doc, "Status", analise.status, colunaDireitaX, y + 42, colunaLargura);
    escreverCampo(doc, "Responsável", valor(analise.responsavel?.nome), page.left, y + 84, colunaLargura);
    escreverCampo(doc, "Data/hora", formatarData(analise.dataHora), colunaDireitaX, y + 84, colunaLargura);

    doc.y = y + 128;
    escreverBlocoTexto(doc, "Descrição", analise.descricao, relatorio, usuario, qrCode, token);
    escreverBlocoTexto(doc, "Diagnóstico", valor(analise.diagnostico), relatorio, usuario, qrCode, token);
    escreverBlocoTexto(doc, "Impacto", valor(analise.impacto), relatorio, usuario, qrCode, token);
    escreverBlocoTexto(doc, "Recomendações", valor(analise.recomendacoes), relatorio, usuario, qrCode, token);
    escreverBlocoTexto(
      doc,
      "Plano de ação",
      `${valor(analise.planoAcao)}\nResponsável: ${valor(analise.responsavelAcao)}\nPrazo: ${
        analise.prazo ? formatarData(analise.prazo) : "Não informado"
      }`,
      relatorio,
      usuario,
      qrCode,
      token
    );
  });
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

  escreverTextoPaginado(doc, valor(relatorio.relatoSeguranca), relatorio, usuario, qrCode, token);
}

function escreverAcoesTomadas(
  doc: PDFKit.PDFDocument,
  relatorio: RelatorioPdf,
  usuario: UsuarioAssinatura,
  qrCode: string,
  token: string
) {
  if (!textoPdf(relatorio.acoesTomadas)) return;

  garantirEspaco(doc, 90, relatorio, usuario, qrCode, token);
  escreverTituloSecao(doc, "Ações tomadas");
  escreverTextoPaginado(doc, valor(relatorio.acoesTomadas), relatorio, usuario, qrCode, token);
}

export async function gerarRelatorioPdf(
  res: Response,
  relatorio: RelatorioPdf,
  usuario: UsuarioAssinatura,
  pdfUrl: string,
  assinaturaToken?: string | null
) {
  const token = assinaturaToken || criarToken(relatorio, usuario);
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
  escreverEnvolvidos(doc, relatorio, usuario, qrCode, token);
  escreverRelato(doc, relatorio, usuario, qrCode, token);
  escreverAcoesTomadas(doc, relatorio, usuario, qrCode, token);
  escreverAnalise(doc, relatorio, usuario, qrCode, token);
  escreverInvestigacao(doc, relatorio, usuario, qrCode, token);
  escreverAnalisesRisco(doc, relatorio, usuario, qrCode, token);
  escreverAnalisesEstrategicas(doc, relatorio, usuario, qrCode, token);

  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i += 1) {
    doc.switchToPage(i);
    desenharMarcaDagua(doc, 0.028);
    doc
      .font("Helvetica")
      .fontSize(8)
      .fillColor("#6b7280")
      .text(textoPdf(`Página ${i + 1} de ${range.count}`), page.right - 82, page.footerTop + 20, {
        width: 82,
        align: "right",
      });
  }

  doc.end();
}

