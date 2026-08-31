import { Request, Response } from "express";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import PDFDocument from "pdfkit";
import QRCode from "qrcode";
import { prisma } from "../lib/prisma";
import { AuthRequest } from "../middlewares/auth";
import { registrarLog } from "../services/auditoria.service";
import {
  assinarDocumento,
  assinaturaValidaDocumento,
  criarUrlValidacaoAssinatura,
  invalidarAssinaturasDocumento,
} from "../services/assinaturaDocumento.service";
import { jwtSecret } from "../config/security";

function normalizarItens(valor: unknown) {
  if (Array.isArray(valor)) return valor;
  if (typeof valor === "string" && valor.trim()) return JSON.parse(valor);
  return [];
}

function calcularPontuacao(
  itens: Array<{ conformidade: string; criticidade: string }>,
) {
  const pesos: Record<string, number> = {
    Baixa: 1,
    Media: 2,
    Alta: 3,
    Critica: 4,
  };
  return itens.reduce((total, item) => {
    if (item.conformidade === "Conforme") return total;
    return total + (pesos[item.criticidade] || 2) * 10;
  }, 0);
}

function tokenChecklist(params: {
  id: number;
  codigo: string;
  unidade: string;
}) {
  return crypto
    .createHmac("sha256", jwtSecret())
    .update(`checklist:${params.id}:${params.codigo}:${params.unidade}`)
    .digest("hex")
    .slice(0, 32);
}

export function criarUrlPublicaChecklist(
  req: Pick<Request, "protocol" | "get">,
  params: { id: number; codigo: string; unidade: string },
) {
  const token = tokenChecklist(params);
  return `${req.protocol}://${req.get("host")}/api/public/checklists/${params.id}/pdf?token=${token}`;
}

export function validarTokenAcessoChecklist(params: {
  id: number;
  codigo: string;
  unidade: string;
  token: string;
}) {
  const esperado = tokenChecklist(params);
  if (!params.token || params.token.length !== esperado.length) return false;
  return crypto.timingSafeEqual(
    Buffer.from(esperado),
    Buffer.from(params.token),
  );
}

function texto(valor?: string | null) {
  return valor && String(valor).trim() ? String(valor) : "Nao informado";
}

function corConformidade(valor: string) {
  if (valor === "Conforme") return "#059669";
  if (valor === "Nao conforme") return "#dc2626";
  return "#64748b";
}

function corCriticidade(valor: string) {
  if (valor === "Critica") return "#991b1b";
  if (valor === "Alta") return "#b45309";
  if (valor === "Media") return "#2563eb";
  return "#047857";
}

async function buscarChecklist(id: number, unidade?: string) {
  return prisma.checklistInspecao.findFirst({
    where: { id, ...(unidade ? { unidade } : {}) },
    include: {
      responsavel: {
        select: {
          id: true,
          nome: true,
          apelido: true,
          email: true,
          perfilAcesso: true,
        },
      },
      itens: { orderBy: { id: "asc" } },
    },
  });
}

async function desenharPdfChecklist(
  req: Pick<Request, "protocol" | "get">,
  res: Response,
  checklist: NonNullable<Awaited<ReturnType<typeof buscarChecklist>>>,
) {
  const assinatura = await assinaturaValidaDocumento(
    "ChecklistInspecao",
    checklist.id,
  );
  const pdfUrl = criarUrlPublicaChecklist(req, {
    id: checklist.id,
    codigo: checklist.codigo,
    unidade: checklist.unidade,
  });
  const validacaoUrl = assinatura
    ? criarUrlValidacaoAssinatura(req, assinatura.token)
    : pdfUrl;
  const qrCode = await QRCode.toDataURL(validacaoUrl, {
    width: 180,
    margin: 1,
    color: { dark: "#0f172a", light: "#ffffff" },
  });
  const logoPath = path.resolve(process.cwd(), "assets", "movecta-logo.png");
  const watermarkPath = path.resolve(
    process.cwd(),
    "assets",
    "jetguard-watermark.png",
  );
  const doc = new PDFDocument({ size: "A4", margin: 42, bufferPages: true });
  const pageWidth = doc.page.width;
  const pageHeight = doc.page.height;
  const contentWidth = pageWidth - 84;
  const footerY = pageHeight - 116;

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `inline; filename=checklist-inspecao-${checklist.codigo.replace("/", "-")}.pdf`,
  );
  doc.pipe(res);

  function watermark() {
    if (!fs.existsSync(watermarkPath)) return;
    const largura = 260;
    doc
      .save()
      .opacity(0.035)
      .image(
        watermarkPath,
        (pageWidth - largura) / 2,
        (pageHeight - largura) / 2,
        { width: largura },
      )
      .restore();
  }

  function header() {
    watermark();
    doc.roundedRect(42, 28, contentWidth, 72, 10).fill("#0f172a");
    if (fs.existsSync(logoPath)) {
      doc.roundedRect(54, 42, 126, 38, 8).fill("#ffffff");
      doc.image(logoPath, 62, 50, { width: 110, height: 22, fit: [110, 22] });
    }
    doc
      .fillColor("#dbeafe")
      .fontSize(8)
      .text("CHECKLIST DE INSPECAO PREVENTIVA", 190, 43, { width: 230 });
    doc
      .fillColor("#ffffff")
      .fontSize(18)
      .text(checklist.codigo, 190, 57, { width: 230 });
    doc
      .fillColor("#cbd5e1")
      .fontSize(9)
      .text(`Unidade: ${checklist.unidade}`, 190, 79, { width: 230 });
    doc
      .fillColor("#bfdbfe")
      .fontSize(9)
      .text(
        `Emitido em ${new Date().toLocaleString("pt-BR")}`,
        pageWidth - 230,
        52,
        { width: 170, align: "right" },
      );
    doc
      .fillColor("#ffffff")
      .fontSize(10)
      .text(checklist.status, pageWidth - 230, 74, {
        width: 170,
        align: "right",
      });
    doc
      .moveTo(42, 114)
      .lineTo(pageWidth - 42, 114)
      .strokeColor("#dbe4f0")
      .lineWidth(0.8)
      .stroke();
    doc.y = 128;
  }

  function footer(numeroPagina?: number, totalPaginas?: number) {
    doc
      .moveTo(42, footerY - 10)
      .lineTo(pageWidth - 42, footerY - 10)
      .strokeColor("#dbe4f0")
      .lineWidth(0.8)
      .stroke();
    const seloW = contentWidth - 102;
    const qrX = pageWidth - 110;
    doc
      .roundedRect(42, footerY, seloW, 54, 8)
      .strokeColor("#bfdbfe")
      .lineWidth(1)
      .stroke();
    doc.rect(42, footerY, 4, 54).fill("#0b74ff");
    doc
      .fillColor("#0f172a")
      .fontSize(9)
      .text("Assinatura eletronica MoveSecurity", 56, footerY + 9, {
        width: seloW - 24,
        lineBreak: false,
      });
    doc
      .fillColor("#475569")
      .fontSize(8)
      .text(
        assinatura
          ? `Documento validado por ${assinatura.usuarioNome} em ${assinatura.createdAt.toLocaleString("pt-BR")}`
          : "Documento emitido sem assinatura eletronica validada.",
        56,
        footerY + 25,
        { width: seloW - 24, lineBreak: false, ellipsis: true },
      );
    if (assinatura) {
      doc
        .fillColor("#475569")
        .fontSize(7)
        .text(`Token: ${assinatura.token}`, 56, footerY + 38, {
          width: seloW - 24,
          lineBreak: false,
          ellipsis: true,
        });
    }
    doc
      .fillColor("#64748b")
      .fontSize(7.5)
      .text(
        numeroPagina && totalPaginas
          ? `Pagina ${numeroPagina} de ${totalPaginas}`
          : "",
        qrX - 8,
        footerY - 8,
        { width: 74, align: "center", lineBreak: false },
      );
    doc.image(qrCode, qrX, footerY + 2, { width: 54, height: 54 });
  }

  function ensureSpace(height = 80) {
    if (doc.y + height < footerY - 16) return;
    doc.addPage();
    header();
  }

  header();

  doc.fillColor("#0f172a").fontSize(12).text("Dados da inspecao", 42, doc.y);
  doc.moveDown(0.7);
  const dados = [
    ["Data", new Date(checklist.dataHora).toLocaleString("pt-BR")],
    ["Local", checklist.local],
    ["Setor", checklist.setor || "Sem setor"],
    [
      "Responsavel",
      checklist.responsavel?.apelido ||
        checklist.responsavel?.nome ||
        checklist.titulo,
    ],
  ];
  const colW = (contentWidth - 12) / 2;
  const startY = doc.y;
  dados.forEach(([label, value], index) => {
    const x = index % 2 === 0 ? 42 : 42 + colW + 12;
    const y = startY + Math.floor(index / 2) * 46;
    doc.roundedRect(x, y, colW, 36, 7).fillAndStroke("#f8fafc", "#e2e8f0");
    doc
      .fillColor("#64748b")
      .fontSize(7)
      .text(label.toUpperCase(), x + 10, y + 7, { width: colW - 20 });
    doc
      .fillColor("#0f172a")
      .fontSize(10)
      .text(texto(value), x + 10, y + 19, { width: colW - 20 });
  });
  doc.y = startY + 96;

  const textoIntro =
    "Em cumprimento ao cronograma de inspeções preventivas da organização, foi realizada vistoria no setor em referência, com o propósito de verificar as condições operacionais, estruturais e de segurança existentes no momento da inspeção. As observações, evidências e recomendações apresentadas neste documento têm como objetivo promover a melhoria contínua dos processos e a mitigação de riscos operacionais.";
  const introY = doc.y;
  const introAltura = Math.max(
    74,
    doc.heightOfString(textoIntro, {
      width: contentWidth - 32,
      align: "justify",
      lineGap: 3,
    }) + 28,
  );
  doc
    .roundedRect(42, introY, contentWidth, introAltura, 10)
    .fillAndStroke("#f8fafc", "#dbeafe");
  doc
    .fillColor("#0f172a")
    .fontSize(10)
    .text(textoIntro, 58, introY + 14, {
      width: contentWidth - 32,
      align: "justify",
      lineGap: 3,
    });
  doc.y = introY + introAltura + 18;

  doc.fillColor("#0f172a").fontSize(13).text("Itens verificados", 42, doc.y);
  doc.moveDown(0.6);

  const widths = [96, 188, 84, 70, contentWidth - 96 - 188 - 84 - 70];
  const headers = [
    "Item",
    "Descricao coletada",
    "Conformidade",
    "Prioridade",
    "Observacao",
  ];
  function tableHeader() {
    ensureSpace(42);
    const y = doc.y;
    let x = 42;
    doc.roundedRect(42, y, contentWidth, 26, 6).fill("#0f172a");
    headers.forEach((item, index) => {
      doc
        .fillColor("#ffffff")
        .fontSize(7.2)
        .text(item.toUpperCase(), x + 6, y + 9, { width: widths[index] - 10 });
      x += widths[index];
    });
    doc.y = y + 30;
  }

  tableHeader();
  checklist.itens.forEach((item, index) => {
    const descHeight = doc.heightOfString(texto(item.descricao), {
      width: widths[1] - 10,
    });
    const obsHeight = doc.heightOfString(texto(item.observacao), {
      width: widths[4] - 10,
    });
    const rowH = Math.max(38, descHeight + 18, obsHeight + 18);
    ensureSpace(rowH + 12);
    const y = doc.y;
    let x = 42;
    doc
      .rect(42, y, contentWidth, rowH)
      .fill(index % 2 === 0 ? "#ffffff" : "#f8fafc")
      .strokeColor("#e2e8f0")
      .stroke();
    doc
      .fillColor("#0f172a")
      .fontSize(8)
      .text(texto(item.categoria), x + 6, y + 9, { width: widths[0] - 10 });
    x += widths[0];
    doc
      .fillColor("#334155")
      .fontSize(8)
      .text(texto(item.descricao), x + 6, y + 9, { width: widths[1] - 10 });
    x += widths[1];
    doc
      .fillColor(corConformidade(item.conformidade))
      .fontSize(8)
      .text(texto(item.conformidade), x + 6, y + 9, { width: widths[2] - 10 });
    x += widths[2];
    doc
      .fillColor(corCriticidade(item.criticidade))
      .fontSize(8)
      .text(texto(item.criticidade), x + 6, y + 9, { width: widths[3] - 10 });
    x += widths[3];
    doc
      .fillColor("#334155")
      .fontSize(8)
      .text(texto(item.observacao), x + 6, y + 9, { width: widths[4] - 10 });
    doc.y = y + rowH;
  });

  const possuiNaoConformidade = checklist.itens.some(
    (item) => item.conformidade === "Nao conforme",
  );
  const conclusao = possuiNaoConformidade
    ? "Com base nas verificacoes realizadas e nas evidencias registradas, foram identificadas nao conformidades que requerem tratativa. As condicoes gerais permitem a continuidade operacional, desde que as acoes corretivas sejam acompanhadas pela gestao responsavel ate a regularizacao das pendencias e mitigacao dos riscos apontados."
    : "Com base nas verificacoes realizadas e nas evidencias registradas, constatou-se que os itens avaliados encontram-se em conformidade com os requisitos operacionais, estruturais e de seguranca da organizacao. Recomenda-se a manutencao das praticas atuais e a continuidade do monitoramento preventivo.";

  ensureSpace(96);
  doc.moveDown(1);
  doc
    .fillColor("#0f172a")
    .fontSize(12)
    .text("Conclusao da inspecao", 42, doc.y);
  doc.moveDown(0.5);
  const conclusaoAltura = Math.max(
    64,
    doc.heightOfString(conclusao, { width: contentWidth - 32 }) + 26,
  );
  doc
    .roundedRect(42, doc.y, contentWidth, conclusaoAltura, 9)
    .fillAndStroke(
      possuiNaoConformidade ? "#fff7ed" : "#f0fdf4",
      possuiNaoConformidade ? "#fed7aa" : "#bbf7d0",
    );
  doc
    .rect(42, doc.y, 4, conclusaoAltura)
    .fill(possuiNaoConformidade ? "#f97316" : "#10b981");
  doc
    .fillColor("#334155")
    .fontSize(9.5)
    .text(conclusao, 58, doc.y + 14, {
      width: contentWidth - 32,
      align: "justify",
      lineGap: 3,
    });
  doc.y += conclusaoAltura;

  if (checklist.observacoes) {
    ensureSpace(92);
    doc.moveDown(1);
    doc.fillColor("#0f172a").fontSize(12).text("Observacoes gerais", 42, doc.y);
    doc.moveDown(0.5);
    const boxH = Math.max(
      58,
      doc.heightOfString(checklist.observacoes, { width: contentWidth - 28 }) +
        24,
    );
    doc
      .roundedRect(42, doc.y, contentWidth, boxH, 8)
      .fillAndStroke("#f8fafc", "#e2e8f0");
    doc
      .fillColor("#334155")
      .fontSize(9)
      .text(checklist.observacoes, 56, doc.y + 12, {
        width: contentWidth - 28,
      });
    doc.y += boxH;
  }

  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i += 1) {
    doc.switchToPage(i);
    footer(i + 1, range.count);
  }
  doc.end();
}

export async function listarChecklists(req: AuthRequest, res: Response) {
  try {
    const checklists = await prisma.checklistInspecao.findMany({
      where: {
        unidade: req.unidadeAtiva,
        tipo: "Ronda Preventiva",
      },
      orderBy: { createdAt: "desc" },
      include: {
        responsavel: { select: { id: true, nome: true, apelido: true } },
        itens: true,
      },
    });
    return res.json(checklists);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro ao listar checklists" });
  }
}

export async function criarChecklist(req: AuthRequest, res: Response) {
  try {
    const { titulo, local } = req.body;
    const tipo = "Ronda Preventiva";
    const itens = normalizarItens(req.body.itens);
    if (!titulo || !local || !tipo || itens.length === 0) {
      return res
        .status(400)
        .json({ error: "Informe titulo, local, tipo e itens." });
    }

    const ano = new Date().getFullYear();
    const ultimo = await prisma.checklistInspecao.findFirst({
      where: { ano, unidade: req.unidadeAtiva },
      orderBy: { numero: "desc" },
    });
    const numero = ultimo ? ultimo.numero + 1 : 1;
    const codigo = `CIP${String(numero).padStart(3, "0")}/${ano}`;
    const pontuacao = calcularPontuacao(itens);

    const checklist = await prisma.checklistInspecao.create({
      data: {
        numero,
        ano,
        codigo,
        titulo,
        unidade: req.unidadeAtiva || "GJA-T1",
        setor: req.body.setor,
        local,
        tipo,
        dataHora: req.body.dataHora ? new Date(req.body.dataHora) : new Date(),
        responsavelId: req.usuarioId!,
        status: req.body.status || "Aberto",
        pontuacao,
        observacoes: req.body.observacoes,
        itens: {
          create: itens.map((item: any) => ({
            categoria: item.categoria,
            descricao: item.descricao,
            conformidade: item.conformidade || "Conforme",
            criticidade: item.criticidade || "Media",
            observacao: item.observacao,
          })),
        },
      },
      include: {
        responsavel: { select: { id: true, nome: true, apelido: true } },
        itens: true,
      },
    });

    await registrarLog({
      req,
      acao: `Criacao de checklist ${checklist.codigo}`,
      tipoRegistro: "ChecklistInspecao",
      registroId: checklist.id,
      dadosNovos: checklist,
    });
    return res.status(201).json(checklist);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro ao criar checklist" });
  }
}

export async function atualizarChecklist(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const anterior = await prisma.checklistInspecao.findFirst({
      where: { id: Number(id), unidade: req.unidadeAtiva },
      include: { itens: true },
    });
    if (!anterior)
      return res.status(404).json({ error: "Checklist nao encontrado" });

    const itens = normalizarItens(req.body.itens);
    if (itens.length === 0) {
      return res
        .status(400)
        .json({ error: "Informe ao menos um item verificado." });
    }
    const pontuacao = calcularPontuacao(itens);
    const status = req.body.status === "Concluido" ? "Concluido" : "Aberto";

    const checklist = await prisma.$transaction(async (tx) => {
      await tx.checklistItem.deleteMany({ where: { checklistId: Number(id) } });
      return tx.checklistInspecao.update({
        where: { id: Number(id) },
        data: {
          titulo: req.body.titulo,
          setor: req.body.setor,
          local: req.body.local,
          tipo: "Ronda Preventiva",
          dataHora: req.body.dataHora
            ? new Date(req.body.dataHora)
            : anterior.dataHora,
          status,
          pontuacao,
          observacoes: req.body.observacoes,
          itens: {
            create: itens.map((item: any) => ({
              categoria: item.categoria,
              descricao: item.descricao,
              conformidade: item.conformidade || "Conforme",
              criticidade: item.criticidade || "Media",
              observacao: item.observacao,
            })),
          },
        },
        include: {
          responsavel: { select: { id: true, nome: true, apelido: true } },
          itens: true,
        },
      });
    });

    await invalidarAssinaturasDocumento({
      modulo: "ChecklistInspecao",
      registroId: checklist.id,
      motivo: `Checklist ${checklist.codigo} atualizado apos assinatura.`,
    });
    await registrarLog({
      req,
      acao: `Atualizacao de checklist ${checklist.codigo}`,
      tipoRegistro: "ChecklistInspecao",
      registroId: checklist.id,
      dadosAnteriores: anterior,
      dadosNovos: checklist,
    });
    return res.json(checklist);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro ao atualizar checklist" });
  }
}

export async function assinarChecklist(req: AuthRequest, res: Response) {
  try {
    const checklist = await buscarChecklist(
      Number(req.params.id),
      req.unidadeAtiva,
    );
    if (!checklist)
      return res.status(404).json({ error: "Checklist nao encontrado" });

    const assinatura = await assinarDocumento({
      req,
      modulo: "ChecklistInspecao",
      registroId: checklist.id,
      codigoRegistro: checklist.codigo,
      unidade: checklist.unidade,
      acao: "Assinatura do Checklist de Inspecao Preventiva",
      dados: {
        local: checklist.local,
        setor: checklist.setor,
        status: checklist.status,
        pontuacao: checklist.pontuacao,
        itens: checklist.itens.length,
      },
    });

    await registrarLog({
      req,
      acao: `Assinatura digital do checklist ${checklist.codigo}`,
      tipoRegistro: "ChecklistInspecao",
      registroId: checklist.id,
      dadosNovos: { assinaturaId: assinatura.id, token: assinatura.token },
    });

    return res.json({
      mensagem: "Checklist assinado com sucesso.",
      assinatura,
    });
  } catch (error: any) {
    const status = error?.status || 500;
    return res
      .status(status)
      .json({ error: error?.message || "Erro ao assinar checklist" });
  }
}

export async function gerarPdfChecklist(req: AuthRequest, res: Response) {
  try {
    const checklist = await buscarChecklist(
      Number(req.params.id),
      req.unidadeAtiva,
    );
    if (!checklist)
      return res.status(404).json({ error: "Checklist nao encontrado" });
    return desenharPdfChecklist(req, res, checklist);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro ao gerar PDF do checklist" });
  }
}

export async function gerarPdfPublicoChecklist(req: Request, res: Response) {
  try {
    const checklist = await buscarChecklist(Number(req.params.id));
    if (!checklist)
      return res.status(404).json({ error: "Checklist nao encontrado" });

    const valido = validarTokenAcessoChecklist({
      id: checklist.id,
      codigo: checklist.codigo,
      unidade: checklist.unidade,
      token: String(req.query.token || ""),
    });
    if (!valido)
      return res.status(403).json({ error: "Token de acesso invalido" });

    return desenharPdfChecklist(req, res, checklist);
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ error: "Erro ao gerar PDF publico do checklist" });
  }
}
