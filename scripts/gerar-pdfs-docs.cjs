const fs = require("fs");
const path = require("path");
const PDFDocument = require("../backend/node_modules/pdfkit");

const raiz = path.resolve(__dirname, "..");
const docsDir = path.join(raiz, "docs");

const arquivos = [
  {
    entrada: "manual-completo-jetguard.md",
    saida: "manual-completo-jetguard.pdf",
    titulo: "Manual Completo do Sistema JetGuard",
    subtitulo: "Movecta Patrimonial",
  },
  {
    entrada: "roteiro-apresentacao-jetguard.md",
    saida: "roteiro-apresentacao-jetguard.pdf",
    titulo: "Roteiro de Apresentacao do JetGuard",
    subtitulo: "Apresentacao institucional e operacional",
  },
  {
    entrada: "procedimentos-passo-a-passo-jetguard.md",
    saida: "procedimentos-passo-a-passo-jetguard.pdf",
    titulo: "Procedimentos Passo a Passo",
    subtitulo: "Manual pratico de operacao do JetGuard",
  },
];

function limparMarkdown(texto) {
  return texto
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[(.*?)\]\((.*?)\)/g, "$1");
}

function rodape(doc) {
  const pagina = doc.bufferedPageRange().count;
  doc
    .font("Helvetica")
    .fontSize(8)
    .fillColor("#64748b")
    .text(`JetGuard - Movecta Patrimonial | Fernando Nunes | Pagina ${pagina}`, 54, 760, {
      width: 504,
      align: "center",
    });
}

function novaPagina(doc) {
  rodape(doc);
  doc.addPage();
  cabecalho(doc);
}

function cabecalho(doc) {
  doc
    .rect(0, 0, 612, 54)
    .fill("#0f172a");
  doc
    .font("Helvetica-Bold")
    .fontSize(10)
    .fillColor("#ffffff")
    .text("JetGuard - Movecta Patrimonial", 54, 20);
  doc
    .font("Helvetica")
    .fontSize(8)
    .fillColor("#bfdbfe")
    .text("Documentacao operacional do sistema", 402, 20, { width: 156, align: "right" });
  doc.y = 78;
}

function garantirEspaco(doc, altura = 36) {
  if (doc.y + altura > 742) novaPagina(doc);
}

function texto(doc, conteudo, opcoes = {}) {
  garantirEspaco(doc, opcoes.altura || 22);
  doc
    .font(opcoes.font || "Helvetica")
    .fontSize(opcoes.size || 10)
    .fillColor(opcoes.color || "#334155")
    .text(conteudo, 54, doc.y, {
      width: 504,
      align: opcoes.align || "left",
      lineGap: opcoes.lineGap ?? 3,
    });
  doc.moveDown(opcoes.down ?? 0.45);
}

function tituloSecao(doc, conteudo, nivel) {
  garantirEspaco(doc, nivel === 1 ? 58 : 40);
  const cor = nivel === 1 ? "#0f172a" : "#1d4ed8";
  const tamanho = nivel === 1 ? 18 : nivel === 2 ? 14 : 11;
  const margemTopo = nivel === 1 ? 0.9 : 0.55;
  doc.moveDown(margemTopo);
  doc
    .font("Helvetica-Bold")
    .fontSize(tamanho)
    .fillColor(cor)
    .text(conteudo, 54, doc.y, { width: 504, lineGap: 2 });
  if (nivel === 1) {
    doc
      .moveTo(54, doc.y + 4)
      .lineTo(558, doc.y + 4)
      .strokeColor("#bfdbfe")
      .lineWidth(1)
      .stroke();
    doc.moveDown(0.9);
  } else {
    doc.moveDown(0.45);
  }
}

function itemLista(doc, conteudo) {
  garantirEspaco(doc, 24);
  const y = doc.y + 4;
  doc.circle(61, y, 2).fill("#2563eb");
  doc
    .font("Helvetica")
    .fontSize(10)
    .fillColor("#334155")
    .text(conteudo, 72, doc.y, { width: 486, lineGap: 3 });
  doc.moveDown(0.25);
}

function gerarPdf(config) {
  const entrada = path.join(docsDir, config.entrada);
  const saida = path.join(docsDir, config.saida);
  const markdown = fs.readFileSync(entrada, "utf8");
  const linhas = markdown.split(/\r?\n/);

  const doc = new PDFDocument({
    size: "A4",
    margin: 54,
    bufferPages: true,
    info: {
      Title: config.titulo,
      Author: "Fernando Nunes",
      Subject: "Documentacao JetGuard",
    },
  });

  doc.pipe(fs.createWriteStream(saida));

  doc.rect(0, 0, 612, 792).fill("#f8fafc");
  doc.rect(0, 0, 612, 180).fill("#0f172a");
  doc
    .font("Helvetica-Bold")
    .fontSize(25)
    .fillColor("#ffffff")
    .text(config.titulo, 54, 92, { width: 504, align: "center" });
  doc
    .font("Helvetica")
    .fontSize(13)
    .fillColor("#bfdbfe")
    .text(config.subtitulo, 54, 132, { width: 504, align: "center" });
  doc
    .font("Helvetica")
    .fontSize(10)
    .fillColor("#334155")
    .text("Criador e arquiteto do sistema: Fernando Nunes", 54, 228, { width: 504, align: "center" })
    .moveDown(0.7)
    .text("Apoio de inteligencia artificial utilizado como ferramenta auxiliar de desenvolvimento, revisao e documentacao.", {
      width: 504,
      align: "center",
    });

  doc.y = 330;
  texto(doc, "Este documento consolida orientacoes operacionais, procedimentos e criterios de uso do sistema JetGuard para apresentacao, treinamento e consulta interna.", {
    size: 12,
    align: "center",
    color: "#0f172a",
    lineGap: 5,
  });

  doc.addPage();
  cabecalho(doc);

  for (const linhaOriginal of linhas) {
    const linha = limparMarkdown(linhaOriginal.trim());
    if (!linha) {
      doc.moveDown(0.25);
      continue;
    }

    if (linha.startsWith("# ")) {
      tituloSecao(doc, linha.replace(/^# /, ""), 1);
      continue;
    }
    if (linha.startsWith("## ")) {
      tituloSecao(doc, linha.replace(/^## /, ""), 2);
      continue;
    }
    if (linha.startsWith("### ")) {
      tituloSecao(doc, linha.replace(/^### /, ""), 3);
      continue;
    }
    if (/^[-*]\s+/.test(linha)) {
      itemLista(doc, linha.replace(/^[-*]\s+/, ""));
      continue;
    }
    if (/^\d+\.\s+/.test(linha)) {
      itemLista(doc, linha);
      continue;
    }

    texto(doc, linha);
  }

  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i += 1) {
    doc.switchToPage(i);
    rodape(doc);
  }

  doc.end();
  return saida;
}

for (const arquivo of arquivos) {
  const saida = gerarPdf(arquivo);
  console.log(saida);
}
