import { randomUUID } from "node:crypto";
import fs from "node:fs";
import { randomInt } from "node:crypto";
import path from "node:path";
import { Request, Response } from "express";
import archiver = require("archiver");
import PDFDocument from "pdfkit";
import QRCode from "qrcode";
import { prisma } from "../lib/prisma";
import { AuthRequest } from "../middlewares/auth";
import { UNIDADES_SISTEMA } from "../config/unidades";
import { enviarEmail } from "../services/email.service";

const db = prisma as any;

function texto(valor: unknown) {
  return String(valor || "").trim();
}

function nomeArquivoSeguro(valor: unknown, fallback = "arquivo") {
  const limpo = texto(valor)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\d\s._-]/gu, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 90);
  return limpo || fallback;
}

function removerArquivoInterno(caminho?: string | null) {
  const relativo = texto(caminho).replace(/\\/g, "/");
  if (!relativo || !relativo.startsWith("uploads/")) return;
  const absoluto = path.resolve(process.cwd(), relativo);
  const raizUploads = path.resolve(process.cwd(), "uploads");
  if (!absoluto.startsWith(raizUploads)) return;
  fs.rmSync(absoluto, { force: true });
}

function limparCpf(cpf: string) {
  return String(cpf || "").replace(/\D/g, "");
}

function emailValido(email: string) {
  const normalizado = texto(email).toLowerCase();
  if (!normalizado || normalizado.length > 254 || normalizado.includes(".."))
    return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(normalizado);
}

function emailCorporativoMovecta(email: string) {
  return texto(email).toLowerCase().endsWith("@movecta.com.br");
}

function tokenExpiraEm24h() {
  return new Date(Date.now() + 24 * 60 * 60 * 1000);
}

function tokenExpirado(data?: Date | string | null) {
  return Boolean(data && new Date(data).getTime() < Date.now());
}

function normalizarTokenTreinamento(token: unknown) {
  const valor = texto(token);
  const digitos = valor.replace(/\D/g, "");
  return digitos.length ? digitos.slice(0, 6) : valor;
}

function formatarTokenTreinamento(token: unknown) {
  const valor = normalizarTokenTreinamento(token);
  return valor.length === 6 ? valor.split("").join("-") : valor;
}

async function gerarTokenTreinamentoPublico() {
  for (let tentativa = 0; tentativa < 20; tentativa += 1) {
    const token = String(randomInt(0, 1_000_000)).padStart(6, "0");
    const existente = await db.treinamentoModeloParticipante.findUnique({
      where: { token },
      select: { id: true },
    });
    if (!existente) return token;
  }
  return randomUUID();
}

const GRUPOS_TREINAMENTO = [
  "CCOS",
  "LIDERANCA",
  "BALANCA",
  "PORTARIA",
  "TERCEIRIZADO",
];

const ALIASES_GRUPOS_TREINAMENTO: Record<string, string> = {
  ccos: "CCOS",
  lideranca: "LIDERANCA",
  liderana: "LIDERANCA",
  lideranaa: "LIDERANCA",
  balanca: "BALANCA",
  balanaa: "BALANCA",
  portaria: "PORTARIA",
  terceirizado: "TERCEIRIZADO",
};

function normalizarGrupoTreinamento(grupo: string) {
  const original = texto(grupo);
  const chave = original
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
  const compacto = chave.replace(/[^a-z0-9]/g, "");
  const alias =
    ALIASES_GRUPOS_TREINAMENTO[chave] ||
    ALIASES_GRUPOS_TREINAMENTO[compacto] ||
    ALIASES_GRUPOS_TREINAMENTO[original.trim().toLowerCase()];
  if (alias) return alias;
  const maiusculo = original.trim().toUpperCase();
  return GRUPOS_TREINAMENTO.includes(maiusculo) ? maiusculo : "";
}

function normalizarGruposTreinamento(valor: unknown) {
  let itens: unknown[] = [];
  if (Array.isArray(valor)) {
    itens = valor;
  } else if (typeof valor === "string") {
    try {
      const parsed = JSON.parse(valor);
      itens = Array.isArray(parsed) ? parsed : valor.split(",");
    } catch {
      itens = valor.split(",");
    }
  }
  return Array.from(
    new Set(
      itens
        .map((item) => normalizarGrupoTreinamento(String(item)))
        .filter(Boolean),
    ),
  );
}

function temGrupoTreinamento(usuario: any, gruposPermitidos: string[]) {
  if (!gruposPermitidos.length) return true;
  const gruposUsuario = normalizarGruposTreinamento(
    usuario?.gruposTreinamentoJson,
  );
  return gruposUsuario.some((grupo) => gruposPermitidos.includes(grupo));
}

function userAgent(req: Request) {
  return texto(req.headers["user-agent"]);
}

function appPublicUrl() {
  return String(
    process.env.PUBLIC_APP_URL ||
      process.env.APP_URL ||
      process.env.FRONTEND_URL ||
      "https://movecta.jetguard.com.br",
  ).replace(/\/$/, "");
}

function escaparHtml(valor: unknown) {
  return String(valor || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function slugify(valor: string) {
  const base = texto(valor)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return base || `treinamento-${Date.now()}`;
}

function normalizarCodigo(valor: string) {
  return texto(valor).toUpperCase().replace(/\s+/g, "-");
}

function gerarTextoCertificado(modelo: any, participante: any) {
  const data = dataPtBr(participante.dataConclusao || new Date());
  const cpfFormatado = formatarCpf(participante.cpf || "");
  const textoCpf = cpfFormatado || "não informado";
  const template = texto(modelo.textoCertificado);
  if (template) {
    return template
      .replace(/\{\{nome\}\}/gi, participante.nomeCompleto)
      .replace(/\{\{cpf\}\}/gi, textoCpf)
      .replace(/\{\{data\}\}/gi, data)
      .replace(/\{\{codigo\}\}/gi, modelo.codigo)
      .replace(/\{\{treinamento\}\}/gi, modelo.nome);
  }

  return `Certificamos que ${participante.nomeCompleto}, portador(a) do CPF nº ${textoCpf}, concluiu com aproveitamento o treinamento ${modelo.codigo} - ${modelo.nome} na data de ${data}.`;
}

function formatarCpf(cpf: string) {
  const digitos = limparCpf(cpf);
  if (digitos.length !== 11) return cpf;
  return `${digitos.slice(0, 3)}.${digitos.slice(3, 6)}.${digitos.slice(
    6,
    9,
  )}-${digitos.slice(9)}`;
}

function dataPtBr(data?: Date | string | null) {
  if (!data) return "-";
  return new Date(data).toLocaleDateString("pt-BR", {
    timeZone: "America/Sao_Paulo",
  });
}

function parseJsonArray(valor: unknown) {
  if (Array.isArray(valor)) return valor;
  try {
    const convertido = JSON.parse(String(valor || "[]"));
    return Array.isArray(convertido) ? convertido : [];
  } catch {
    return [];
  }
}

function arquivoCertificado(token: string) {
  const pasta = path.resolve(process.cwd(), "uploads", "certificados-modelos");
  fs.mkdirSync(pasta, { recursive: true });
  return path.join(pasta, `certificado-treinamento-${token}.pdf`);
}

function certificadoUrl(token: string) {
  return `/api/public/treinamentos-dinamicos/${token}/certificado`;
}

async function sincronizarCpfParticipante(participante: any) {
  const cpfAtual = limparCpf(participante?.cpf || "");
  if (cpfAtual) {
    return {
      participante: { ...participante, cpf: cpfAtual },
      atualizado: false,
    };
  }

  const usuario = await prisma.usuario.findFirst({
    where: { email: participante.email },
    select: { cpf: true },
  });
  const cpfUsuario = limparCpf(usuario?.cpf || "");
  if (!cpfUsuario) {
    return { participante, atualizado: false };
  }

  await db.treinamentoModeloParticipante.update({
    where: { id: participante.id },
    data: { cpf: cpfUsuario },
  });

  return {
    participante: { ...participante, cpf: cpfUsuario },
    atualizado: true,
  };
}

function caminhoFundoCertificado() {
  const caminhos = [
    path.resolve(process.cwd(), "assets", "fundo-para-desktop.jpeg"),
    path.resolve(
      process.cwd(),
      "..",
      "frontend",
      "public",
      "images",
      "treinamento-terminal",
      "fundo-para-desktop.jpeg",
    ),
    path.resolve(
      process.cwd(),
      "..",
      "frontend",
      "dist",
      "images",
      "treinamento-terminal",
      "fundo-para-desktop.jpeg",
    ),
  ];
  return caminhos.find((item) => fs.existsSync(item));
}

function porcentagem(
  etapaAtual: number,
  totalEtapas: number,
  status?: string | null,
) {
  if (
    String(status || "")
      .toLowerCase()
      .startsWith("conclu")
  )
    return 100;
  const total = Math.max(totalEtapas + 3, 2);
  return Math.max(
    0,
    Math.min(99, Math.round(((etapaAtual - 1) / total) * 100)),
  );
}

function treinamentoConcluido(status?: string | null) {
  return String(status || "")
    .toLowerCase()
    .startsWith("conclu");
}

function contarAcertosQuiz(respostasQuiz: unknown) {
  if (!respostasQuiz) return null;
  try {
    const respostas =
      typeof respostasQuiz === "string"
        ? JSON.parse(respostasQuiz)
        : respostasQuiz;
    if (!Array.isArray(respostas)) return null;
    return respostas.filter((item: any) => Boolean(item?.correto)).length;
  } catch {
    return null;
  }
}

function respostaParticipante(registro: any) {
  return {
    token: registro.token,
    treinamentoId: registro.treinamentoId,
    codigo: registro.codigo,
    nomeCompleto: registro.nomeCompleto,
    cpf: registro.cpf,
    email: registro.email,
    cargo: registro.cargo,
    departamento: registro.departamento,
    unidade: registro.unidade,
    empresa: registro.empresa,
    etapaAtual: registro.etapaAtual,
    status: registro.status,
    porcentagem: registro.porcentagem,
    nota: registro.nota,
    acertos: contarAcertosQuiz(registro.respostasQuiz),
    tentativas: registro.tentativas,
    versao: registro.versao,
    dataConclusao: registro.dataConclusao,
    emailStatus: registro.emailStatus,
    certificadoUrl: registro.certificadoArquivo
      ? certificadoUrl(registro.token)
      : null,
  };
}

function serializarModelo(modelo: any, incluirCorretas = true) {
  const videoUrl = String(modelo.videoUrl || "");
  const videoPublico = !incluirCorretas && videoUrl.startsWith("uploads/")
    ? `/api/public/treinamentos-dinamicos/${modelo.slug}/video`
    : videoUrl || null;

  return {
    ...modelo,
    publicUrl: `/treinamento/${modelo.slug}`,
    acessoPublico: Boolean(modelo.acessoPublico),
    perguntasHabilitadas: modelo.perguntasHabilitadas !== false,
    avaliacaoHabilitada: modelo.avaliacaoHabilitada !== false,
    videoUrl: videoPublico,
    anexoNome: modelo.anexoNome || null,
    anexoUrl: modelo.anexoArquivo
      ? `/api/public/treinamentos-dinamicos/${modelo.slug}/anexo`
      : modelo.anexoUrl || null,
    anexoArquivo: modelo.anexoArquivo || null,
    gruposPermitidos: normalizarGruposTreinamento(modelo.gruposPermitidosJson),
    gruposPermitidosJson: undefined,
    etapas: (modelo.etapas || []).map((etapa: any) => ({
      ...etapa,
      topicos: parseJsonArray(etapa.topicosJson),
      topicosJson: undefined,
    })),
    perguntas: (modelo.perguntas || []).map((pergunta: any) => ({
      ...pergunta,
      alternativas: (pergunta.alternativas || []).map((alternativa: any) => ({
        ...alternativa,
        correta: incluirCorretas ? alternativa.correta : undefined,
      })),
    })),
  };
}

function removerGabarito(modelo: any) {
  return {
    ...modelo,
    perguntas: (modelo.perguntas || []).map((pergunta: any) => ({
      ...pergunta,
      alternativas: (pergunta.alternativas || []).map((alternativa: any) => ({
        ...alternativa,
        correta: undefined,
      })),
    })),
  };
}

function criarSnapshot(modelo: any) {
  return JSON.stringify(serializarModelo(modelo, true));
}

function aplicarConfiguracaoAtual(snapshot: any, modeloAtual?: any) {
  if (!modeloAtual) return snapshot;
  const atual = serializarModelo(modeloAtual, true);
  const atualPublico = serializarModelo(modeloAtual, false);
  return {
    ...snapshot,
    acessoPublico: atual.acessoPublico,
    perguntasHabilitadas: atual.perguntasHabilitadas,
    avaliacaoHabilitada: atual.avaliacaoHabilitada,
    videoUrl: atualPublico.videoUrl,
    anexoNome: atual.anexoNome,
    anexoUrl: atualPublico.anexoUrl,
    anexoArquivo: atual.anexoArquivo,
  };
}

function lerSnapshot(
  participante: any,
  modeloFallback?: any,
  incluirCorretas = true,
) {
  if (participante?.snapshotJson) {
    try {
      const snapshot = JSON.parse(participante.snapshotJson);
      const comConfiguracaoAtual = aplicarConfiguracaoAtual(
        snapshot,
        modeloFallback || participante?.treinamento,
      );
      return incluirCorretas
        ? comConfiguracaoAtual
        : removerGabarito(comConfiguracaoAtual);
    } catch {
      // Se o snapshot estiver inválido, usa o modelo atual.
    }
  }

  const serializado = serializarModelo(
    modeloFallback || participante?.treinamento || {},
    incluirCorretas,
  );
  return incluirCorretas ? serializado : removerGabarito(serializado);
}

async function carregarModeloPorSlug(slug: string) {
  return db.treinamentoModelo.findUnique({
    where: { slug },
    include: {
      etapas: { orderBy: { ordem: "asc" } },
      perguntas: {
        orderBy: { ordem: "asc" },
        include: { alternativas: { orderBy: { ordem: "asc" } } },
      },
    },
  });
}

async function proximoCodigoCertificado(tx: any, modelo: any) {
  const ano = new Date().getFullYear();
  const prefixo = normalizarCodigo(modelo.codigo).replace(/[^A-Z0-9]/g, "");
  await tx.$executeRawUnsafe(
    `SELECT pg_advisory_xact_lock(hashtext('movecta_treinamento_modelo_${prefixo}_${ano}'))`,
  );
  const certificados = await tx.treinamentoModeloParticipante.findMany({
    where: {
      treinamentoId: modelo.id,
      codigo: { endsWith: `/${ano}` },
    },
    select: { codigo: true },
  });
  const maior = certificados.reduce((atual: number, item: any) => {
    const numero = Number(
      String(item.codigo || "").match(/-(\d+)\//)?.[1] || 0,
    );
    return Math.max(atual, numero);
  }, 0);
  return `${prefixo}-${String(maior + 1).padStart(5, "0")}/${ano}`;
}

async function gerarCertificado(modelo: any, participante: any) {
  const destino = arquivoCertificado(participante.token);
  const temporario = `${destino}.tmp`;
  fs.rmSync(temporario, { force: true });

  const doc = new PDFDocument({ size: "A4", layout: "landscape", margin: 0 });
  const stream = fs.createWriteStream(temporario);
  doc.pipe(stream);

  const pageWidth = doc.page.width;
  const pageHeight = doc.page.height;
  const fundo = caminhoFundoCertificado();
  const validacaoUrl = `${appPublicUrl()}${certificadoUrl(participante.token)}`;
  const qrDataUrl = await QRCode.toDataURL(validacaoUrl, {
    width: 220,
    margin: 1,
    color: { dark: "#0f172a", light: "#ffffff" },
  });
  const qrCode = Buffer.from(String(qrDataUrl).split(",")[1], "base64");

  doc.rect(0, 0, pageWidth, pageHeight).fill("#ffffff");
  if (fundo) {
    doc.save();
    doc.opacity(0.12);
    doc.image(fundo, 0, 0, { width: pageWidth, height: pageHeight });
    doc.restore();
  }

  doc
    .roundedRect(42, 38, pageWidth - 84, pageHeight - 76, 26)
    .lineWidth(1.4)
    .strokeColor("#93c5fd")
    .stroke();
  doc
    .roundedRect(54, 50, pageWidth - 108, pageHeight - 100, 20)
    .lineWidth(0.7)
    .strokeColor("#dbeafe")
    .stroke();

  doc
    .fillColor("#1d4ed8")
    .font("Helvetica-Bold")
    .fontSize(11)
    .text(participante.codigo || "CERTIFICADO", pageWidth - 220, 64, {
      width: 158,
      align: "right",
    });
  doc
    .fillColor("#07142f")
    .font("Helvetica-Bold")
    .fontSize(34)
    .text(modelo.codigo, 92, 86, { width: pageWidth - 184, align: "center" });
  doc
    .fillColor("#1d4ed8")
    .font("Helvetica-Bold")
    .fontSize(15)
    .text(modelo.nome, 110, 132, { width: pageWidth - 220, align: "center" });
  if (modelo.subtitulo) {
    doc
      .fillColor("#334155")
      .font("Helvetica-Bold")
      .fontSize(11)
      .text(modelo.subtitulo, 118, 156, {
        width: pageWidth - 236,
        align: "center",
      });
  }

  doc
    .moveTo(190, 184)
    .lineTo(pageWidth - 190, 184)
    .strokeColor("#7ed321")
    .lineWidth(2)
    .stroke();

  doc
    .fillColor("#111827")
    .font("Helvetica")
    .fontSize(19)
    .text(gerarTextoCertificado(modelo, participante), 104, 220, {
      width: pageWidth - 208,
      align: "center",
      lineGap: 8,
    });

  doc.image(qrCode, 84, 424, { width: 78, height: 78 });
  doc
    .fillColor("#0f172a")
    .font("Helvetica-Bold")
    .fontSize(7)
    .text("VALIDAÇÃO", 70, 508, { width: 102, align: "center" });

  if (participante.assinaturaDataUrl) {
    const assinaturaBase64 = String(participante.assinaturaDataUrl).split(
      ",",
    )[1];
    if (assinaturaBase64) {
      const assinaturaPng = path.join(
        path.dirname(destino),
        `assinatura-modelo-${participante.token}.png`,
      );
      fs.writeFileSync(assinaturaPng, Buffer.from(assinaturaBase64, "base64"));
      doc.image(assinaturaPng, 292, 374, { fit: [258, 62], align: "center" });
      fs.rmSync(assinaturaPng, { force: true });
    }
  }

  doc
    .moveTo(256, 448)
    .lineTo(586, 448)
    .strokeColor("#1d4ed8")
    .lineWidth(1.2)
    .stroke();
  doc
    .fillColor("#111827")
    .font("Helvetica-Bold")
    .fontSize(10.5)
    .text(participante.nomeCompleto, 256, 464, { width: 330, align: "center" });
  doc
    .fillColor("#334155")
    .font("Helvetica")
    .fontSize(9)
    .text("Participante", 256, 480, { width: 330, align: "center" });

  doc
    .fillColor("#64748b")
    .font("Helvetica")
    .fontSize(7.5)
    .text(`Validação: ${validacaoUrl}`, 170, pageHeight - 70, {
      width: pageWidth - 340,
      align: "center",
    });
  doc.end();

  await new Promise<void>((resolve, reject) => {
    stream.on("finish", resolve);
    stream.on("error", reject);
  });
  fs.renameSync(temporario, destino);
  return destino;
}

async function enviarCertificado(
  modelo: any,
  participante: any,
  certificadoArquivo: string,
) {
  return enviarEmail({
    to: participante.email,
    subject: `Certificado ${modelo.codigo} - ${participante.codigo}`,
    text: `Olá, ${participante.nomeCompleto}. Segue em anexo o certificado de conclusão do treinamento ${modelo.codigo}.`,
    html: `<p>Olá, <strong>${participante.nomeCompleto}</strong>.</p><p>Segue em anexo o certificado de conclusão do treinamento <strong>${modelo.codigo} - ${modelo.nome}</strong>.</p>`,
    attachments: [
      {
        filename: `certificado-${String(participante.codigo || modelo.codigo).replace("/", "-")}.pdf`,
        path: certificadoArquivo,
        contentType: "application/pdf",
      },
    ],
  });
}

async function enviarConvitesTreinamento(modelo: any, grupos: string[]) {
  if (!grupos.length || modelo.status !== "Publicado") return 0;
  const usuarios = await prisma.usuario.findMany({
    select: {
      nome: true,
      email: true,
      statusUsuario: true,
      gruposTreinamentoJson: true,
    },
  });
  const selecionados = usuarios.filter(
    (usuario: any) =>
      usuario.email &&
      usuario.statusUsuario !== "BLOQUEADO" &&
      normalizarGruposTreinamento(usuario.gruposTreinamentoJson).some((grupo) =>
        grupos.includes(grupo),
      ),
  );
  const link = `${appPublicUrl()}/treinamento/${modelo.slug}`;
  const resultados = await Promise.allSettled(
    selecionados.map((usuario: any) => {
      const nomeColaborador = texto(usuario.nome) || "colaborador(a)";
      const nomeTreinamento = texto(modelo.nome) || texto(modelo.codigo);
      const treinamentoCompleto = [modelo.codigo, modelo.nome]
        .map(texto)
        .filter(Boolean)
        .join(" - ");

      return enviarEmail({
        to: usuario.email,
        subject: `Treinamento ${nomeTreinamento}`,
        text: [
          `Olá, ${nomeColaborador}`,
          "",
          `Segue o treinamento ${treinamentoCompleto}.`,
          "Leia com atenção todas as etapas e conclua a avaliação final para registrar sua participação.",
          "",
          `Acesse pelo link: ${link}`,
          "",
          "Atenciosamente,",
          "Segurança Patrimonial - Movecta",
        ].join("\n"),
        html: `
          <div style="font-family: Arial, sans-serif; color: #0f172a; line-height: 1.6;">
            <p>Olá, <strong>${escaparHtml(nomeColaborador)}</strong></p>
            <p>Segue o treinamento <strong>${escaparHtml(treinamentoCompleto)}</strong>.</p>
            <p>Leia com atenção todas as etapas e conclua a avaliação final para registrar sua participação.</p>
            <p style="margin: 24px 0;">
              <a href="${escaparHtml(link)}" style="background: #2563eb; color: #ffffff; padding: 12px 18px; border-radius: 10px; text-decoration: none; font-weight: 700;">
                Acessar treinamento
              </a>
            </p>
            <p>Atenciosamente,<br><strong>Segurança Patrimonial - Movecta</strong></p>
          </div>
        `,
      });
    }),
  );
  return resultados.filter((item) => item.status === "fulfilled").length;
}

function validarPayloadModelo(body: any) {
  const status = texto(body.status) || "Rascunho";
  const rascunho = status !== "Publicado";
  const acessoPublico = Boolean(body.acessoPublico);
  const perguntasHabilitadas = body.perguntasHabilitadas !== false;
  const avaliacaoHabilitada = body.avaliacaoHabilitada !== false;
  const codigo =
    normalizarCodigo(body.codigo) || (rascunho ? `RASCUNHO-${Date.now()}` : "");
  const nome = texto(body.nome) || (rascunho ? "Treinamento em rascunho" : "");
  const tipo = texto(body.tipo) || (rascunho ? "Rascunho" : "");
  const etapas = Array.isArray(body.etapas)
    ? body.etapas.filter((etapa: any) =>
        [
          etapa?.titulo,
          etapa?.objetivo,
          etapa?.conteudo,
          etapa?.atencao,
          ...(Array.isArray(etapa?.topicos) ? etapa.topicos : []),
        ].some((valor) => Boolean(texto(valor))),
      )
    : [];
  const perguntas = Array.isArray(body.perguntas)
    ? body.perguntas.filter((pergunta: any) => {
        const alternativas = Array.isArray(pergunta?.alternativas)
          ? pergunta.alternativas
          : [];
        return (
          Boolean(texto(pergunta?.pergunta)) ||
          alternativas.some((alternativa: any) => texto(alternativa?.texto))
        );
      })
    : [];
  const gruposPermitidos = normalizarGruposTreinamento(
    body.gruposPermitidos ??
      body.gruposTreinamento ??
      body.gruposPermitidosJson,
  );

  if (!rascunho && (!codigo || !nome || !tipo)) {
    return { error: "Informe tipo, código e nome do treinamento." };
  }
  if (!rascunho && !etapas.length) {
    return { error: "Cadastre pelo menos uma etapa de conteúdo." };
  }
  if (!rascunho && perguntasHabilitadas && !perguntas.length) {
    return { error: "Cadastre pelo menos uma pergunta para avaliação." };
  }
  for (const pergunta of perguntas) {
    const alternativas = Array.isArray(pergunta.alternativas)
      ? pergunta.alternativas.filter((alternativa: any) =>
          texto(alternativa?.texto),
        )
      : [];
    if (!texto(pergunta.pergunta) || alternativas.length < 2) {
      if (rascunho) continue;
      return {
        error: "Cada pergunta precisa de texto e pelo menos duas alternativas.",
      };
    }
    if (
      alternativas.filter((item: any) => item.correta === true).length !== 1
    ) {
      if (rascunho) continue;
      return {
        error: "Cada pergunta deve ter exatamente uma alternativa correta.",
      };
    }
    pergunta.alternativas = alternativas;
  }

  return {
    codigo,
    nome,
    tipo,
    etapas,
    perguntas,
    gruposPermitidos: acessoPublico ? [] : gruposPermitidos,
    status,
    acessoPublico,
    perguntasHabilitadas,
    avaliacaoHabilitada,
    videoUrl: texto(body.videoUrl) || null,
    anexoNome: texto(body.anexoNome) || null,
    anexoUrl: texto(body.anexoUrl) || null,
    anexoArquivo: texto(body.anexoArquivo) || null,
  };
}

export async function listarTreinamentosModelo(
  req: AuthRequest,
  res: Response,
) {
  const modelos = await db.treinamentoModelo.findMany({
    orderBy: { updatedAt: "desc" },
    include: {
      etapas: { orderBy: { ordem: "asc" } },
      perguntas: {
        orderBy: { ordem: "asc" },
        include: { alternativas: { orderBy: { ordem: "asc" } } },
      },
      participantes: {
        orderBy: { updatedAt: "desc" },
        take: 200,
      },
    },
  });

  return res.json(
    modelos.map((modelo: any) => ({
      ...serializarModelo(modelo),
      participantes: modelo.participantes.map((item: any) => ({
        ...item,
        assinaturaDataUrl: undefined,
        certificadoUrl:
          treinamentoConcluido(item.status) || item.certificadoArquivo
            ? certificadoUrl(item.token)
            : null,
      })),
    })),
  );
}

export async function salvarTreinamentoModelo(req: AuthRequest, res: Response) {
  try {
    const id = Number(req.params.id || 0);
    const validacao = validarPayloadModelo(req.body);
    if ("error" in validacao)
      return res.status(400).json({ error: validacao.error });

    const slugBase = slugify(req.body.slug || validacao.codigo);
    const modelo = await prisma.$transaction(async (tx) => {
      const repo = tx as any;
      const salvo = id
        ? await repo.treinamentoModelo.update({
            where: { id },
            data: {
              codigo: validacao.codigo,
              slug: slugBase,
              tipo: validacao.tipo,
              nome: validacao.nome,
              descricao: texto(req.body.descricao) || null,
              subtitulo: texto(req.body.subtitulo) || null,
              acessoPublico: validacao.acessoPublico,
              perguntasHabilitadas: validacao.perguntasHabilitadas,
              avaliacaoHabilitada: validacao.avaliacaoHabilitada,
              videoUrl: validacao.videoUrl,
              anexoNome: validacao.anexoNome,
              anexoUrl: validacao.anexoUrl,
              anexoArquivo: validacao.anexoArquivo,
              notaMinima: Number(req.body.notaMinima) || 80,
              validadeMeses: Number(req.body.validadeMeses) || 24,
              textoCertificado: texto(req.body.textoCertificado) || null,
              gruposPermitidosJson: JSON.stringify(validacao.gruposPermitidos),
              versao: { increment: 1 },
              status: validacao.status,
            },
          })
        : await repo.treinamentoModelo.create({
            data: {
              codigo: validacao.codigo,
              slug: slugBase,
              tipo: validacao.tipo,
              nome: validacao.nome,
              descricao: texto(req.body.descricao) || null,
              subtitulo: texto(req.body.subtitulo) || null,
              acessoPublico: validacao.acessoPublico,
              perguntasHabilitadas: validacao.perguntasHabilitadas,
              avaliacaoHabilitada: validacao.avaliacaoHabilitada,
              videoUrl: validacao.videoUrl,
              anexoNome: validacao.anexoNome,
              anexoUrl: validacao.anexoUrl,
              anexoArquivo: validacao.anexoArquivo,
              notaMinima: Number(req.body.notaMinima) || 80,
              validadeMeses: Number(req.body.validadeMeses) || 24,
              textoCertificado: texto(req.body.textoCertificado) || null,
              gruposPermitidosJson: JSON.stringify(validacao.gruposPermitidos),
              status: validacao.status,
            },
          });

      await repo.treinamentoModeloPergunta.deleteMany({
        where: { treinamentoId: salvo.id },
      });
      await repo.treinamentoModeloEtapa.deleteMany({
        where: { treinamentoId: salvo.id },
      });

      const etapasCriadas: Record<number, number> = {};
      for (const [index, etapa] of validacao.etapas.entries()) {
        const criada = await repo.treinamentoModeloEtapa.create({
          data: {
            treinamentoId: salvo.id,
            ordem: index + 1,
            titulo: texto(etapa.titulo) || `Etapa ${index + 1}`,
            objetivo: texto(etapa.objetivo) || null,
            conteudo: texto(etapa.conteudo),
            topicosJson: JSON.stringify(
              Array.isArray(etapa.topicos)
                ? etapa.topicos.map(texto).filter(Boolean)
                : [],
            ),
            atencao: texto(etapa.atencao) || null,
          },
        });
        etapasCriadas[index + 1] = criada.id;
      }

      for (const [index, pergunta] of validacao.perguntas.entries()) {
        const criada = await repo.treinamentoModeloPergunta.create({
          data: {
            treinamentoId: salvo.id,
            etapaId: etapasCriadas[Number(pergunta.etapaOrdem)] || null,
            ordem: index + 1,
            pergunta: texto(pergunta.pergunta),
          },
        });
        for (const [altIndex, alternativa] of pergunta.alternativas.entries()) {
          await repo.treinamentoModeloAlternativa.create({
            data: {
              perguntaId: criada.id,
              ordem: altIndex + 1,
              texto: texto(alternativa.texto),
              correta: alternativa.correta === true,
            },
          });
        }
      }

      return repo.treinamentoModelo.findUnique({
        where: { id: salvo.id },
        include: {
          etapas: { orderBy: { ordem: "asc" } },
          perguntas: {
            orderBy: { ordem: "asc" },
            include: { alternativas: { orderBy: { ordem: "asc" } } },
          },
          participantes: true,
        },
      });
    });

    return res.status(id ? 200 : 201).json(serializarModelo(modelo));
  } catch (error: any) {
    console.error(error);
    return res
      .status(500)
      .json({ error: error?.message || "Erro ao salvar treinamento." });
  }
}

export async function enviarConvitesTreinamentoModelo(
  req: AuthRequest,
  res: Response,
) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      return res.status(400).json({ error: "Treinamento inválido." });
    }

    const gruposBody = normalizarGruposTreinamento(req.body?.gruposPermitidos);
    let modelo = await db.treinamentoModelo.findUnique({ where: { id } });
    if (!modelo) {
      return res.status(404).json({ error: "Treinamento não encontrado." });
    }
    if (gruposBody.length) {
      modelo = await db.treinamentoModelo.update({
        where: { id },
        data: { gruposPermitidosJson: JSON.stringify(gruposBody) },
      });
    }
    if (modelo.status !== "Publicado") {
      return res.status(400).json({
        error: "Publique o treinamento antes de enviar o link aos grupos.",
      });
    }
    if (modelo.acessoPublico) {
      return res.status(400).json({
        error:
          "Treinamentos públicos não exigem envio por grupo. Copie o link público para divulgação.",
      });
    }

    const grupos = normalizarGruposTreinamento(modelo.gruposPermitidosJson);
    if (!grupos.length) {
      return res.status(400).json({
        error: "Selecione ao menos um grupo liberado para este treinamento.",
      });
    }

    const convitesEnviados = await enviarConvitesTreinamento(modelo, grupos);
    return res.json({
      convitesEnviados,
      mensagem:
        convitesEnviados > 0
          ? `Treinamento enviado para ${convitesEnviados} participante(s).`
          : "Nenhum usuário cadastrado foi encontrado nos grupos selecionados.",
    });
  } catch (error: any) {
    console.error(error);
    return res
      .status(500)
      .json({ error: error?.message || "Erro ao enviar treinamento." });
  }
}

export async function listarVisitantesTreinamentoModelo(
  _req: AuthRequest,
  res: Response,
) {
  try {
    const [visitantes, treinamentosPublicos] = await Promise.all([
      db.treinamentoModeloVisitante.findMany({
        orderBy: { updatedAt: "desc" },
        include: {
          participantes: {
            orderBy: { conviteEnviadoEm: "desc" },
            take: 8,
            select: {
              id: true,
              treinamentoId: true,
              token: true,
              tokenExpiraEm: true,
              conviteEnviadoEm: true,
              status: true,
              treinamento: {
                select: {
                  id: true,
                  codigo: true,
                  nome: true,
                  slug: true,
                  acessoPublico: true,
                  status: true,
                },
              },
            },
          },
        },
      }),
      db.treinamentoModelo.findMany({
        where: { acessoPublico: true, status: "Publicado" },
        orderBy: { nome: "asc" },
        select: { id: true, codigo: true, nome: true, slug: true },
      }),
    ]);

    return res.json({
      visitantes,
      treinamentosPublicos,
    });
  } catch (error: any) {
    console.error(error);
    return res
      .status(500)
      .json({ error: error?.message || "Erro ao listar visitantes." });
  }
}

export async function salvarVisitanteTreinamentoModelo(
  req: AuthRequest,
  res: Response,
) {
  try {
    const id = Number(req.params.id || 0);
    const nomeCompleto = texto(req.body.nomeCompleto);
    const cpf = limparCpf(req.body.cpf || "");
    const email = texto(req.body.email).toLowerCase();
    const dataNascimentoTexto = texto(req.body.dataNascimento);
    const dataNascimento = dataNascimentoTexto
      ? new Date(`${dataNascimentoTexto}T00:00:00`)
      : null;

    if (!nomeCompleto || cpf.length !== 11 || !emailValido(email)) {
      return res
        .status(400)
        .json({ error: "Informe nome completo, CPF válido e e-mail." });
    }

    if (dataNascimentoTexto && (!dataNascimento || Number.isNaN(dataNascimento.getTime()))) {
      return res.status(400).json({ error: "Data de nascimento inválida." });
    }

    const data = {
      nomeCompleto,
      cpf,
      email,
      dataNascimento,
      empresa: texto(req.body.empresa) || null,
      cargo: texto(req.body.cargo) || null,
      status: texto(req.body.status) || "Ativo",
    };

    const visitante = id
      ? await db.treinamentoModeloVisitante.update({ where: { id }, data })
      : await db.treinamentoModeloVisitante.upsert({
          where: { cpf },
          update: data,
          create: data,
        });

    if (req.body.treinamentoId) {
      await enviarConviteVisitanteInterno(Number(req.body.treinamentoId), visitante);
    }

    return res.status(id ? 200 : 201).json({ visitante });
  } catch (error: any) {
    console.error(error);
    return res
      .status(500)
      .json({ error: error?.message || "Erro ao salvar visitante." });
  }
}

async function enviarConviteVisitanteInterno(treinamentoId: number, visitante: any) {
  const modelo = await db.treinamentoModelo.findUnique({
    where: { id: treinamentoId },
    include: {
      etapas: { orderBy: { ordem: "asc" } },
      perguntas: {
        orderBy: { ordem: "asc" },
        include: { alternativas: { orderBy: { ordem: "asc" } } },
      },
    },
  });

  if (!modelo || modelo.status !== "Publicado" || !modelo.acessoPublico) {
    throw new Error("Selecione um treinamento público publicado.");
  }

  const token = await gerarTokenTreinamentoPublico();
  const expiraEm = tokenExpiraEm24h();
  const snapshotAtual = criarSnapshot(modelo);
  const existente = await db.treinamentoModeloParticipante.findFirst({
    where: {
      treinamentoId: modelo.id,
      OR: [{ visitanteId: visitante.id }, { email: visitante.email }, { cpf: visitante.cpf }],
    },
    orderBy: { updatedAt: "desc" },
  });

  const dadosParticipante = {
    visitanteId: visitante.id,
    usuarioId: null,
    nomeCompleto: visitante.nomeCompleto,
    cpf: visitante.cpf,
    email: visitante.email,
    cargo: visitante.cargo,
    departamento: "Visitante",
    unidade: "Visitante",
    empresa: visitante.empresa,
    token,
    tokenExpiraEm: expiraEm,
    conviteEnviadoEm: new Date(),
    versao: modelo.versao,
    snapshotJson: snapshotAtual,
    status: existente?.status === "Concluído" ? existente.status : "Em andamento",
  };

  const participante = existente
    ? await db.treinamentoModeloParticipante.update({
        where: { id: existente.id },
        data: dadosParticipante,
      })
    : await db.treinamentoModeloParticipante.create({
        data: {
          treinamentoId: modelo.id,
          ...dadosParticipante,
        },
      });

  const link = `${appPublicUrl()}/treinamento/${modelo.slug}`;
  const treinamentoCompleto = [modelo.codigo, modelo.nome]
    .map(texto)
    .filter(Boolean)
    .join(" - ");

  await enviarEmail({
    to: visitante.email,
    subject: `Treinamento ${modelo.nome}`,
    text: [
      `Olá, ${visitante.nomeCompleto}`,
      "",
      `Segue o treinamento ${treinamentoCompleto}.`,
      "Acesse o link abaixo e informe o token para iniciar. Este acesso é válido por 24 horas.",
      "",
      `Link: ${link}`,
      `Token: ${formatarTokenTreinamento(participante.token)}`,
      "",
      "Atenciosamente,",
      "Segurança Patrimonial - Movecta",
    ].join("\n"),
    html: `
      <div style="font-family: Arial, sans-serif; color: #0f172a; line-height: 1.6;">
        <p>Olá, <strong>${escaparHtml(visitante.nomeCompleto)}</strong></p>
        <p>Segue o treinamento <strong>${escaparHtml(treinamentoCompleto)}</strong>.</p>
        <p>Acesse o link abaixo e informe o token para iniciar. Este acesso é válido por <strong>24 horas</strong>.</p>
        <p style="margin: 24px 0;">
          <a href="${escaparHtml(link)}" style="background: #2563eb; color: #ffffff; padding: 12px 18px; border-radius: 10px; text-decoration: none; font-weight: 700;">
            Acessar treinamento
          </a>
        </p>
        <p style="font-size: 20px; font-weight: 800; letter-spacing: 0.08em;">Token: ${escaparHtml(formatarTokenTreinamento(participante.token))}</p>
        <p>Atenciosamente,<br><strong>Segurança Patrimonial - Movecta</strong></p>
      </div>
    `,
  });

  return participante;
}

export async function enviarConviteVisitanteTreinamentoModelo(
  req: AuthRequest,
  res: Response,
) {
  try {
    const visitante = await db.treinamentoModeloVisitante.findUnique({
      where: { id: Number(req.params.id) },
    });
    if (!visitante) {
      return res.status(404).json({ error: "Visitante não encontrado." });
    }

    const participante = await enviarConviteVisitanteInterno(
      Number(req.body.treinamentoId),
      visitante,
    );
    return res.json({
      participante,
      mensagem: "Treinamento enviado com token válido por 24 horas.",
    });
  } catch (error: any) {
    console.error(error);
    return res
      .status(500)
      .json({ error: error?.message || "Erro ao enviar treinamento." });
  }
}

export async function excluirVisitanteTreinamentoModelo(
  req: AuthRequest,
  res: Response,
) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      return res.status(400).json({ error: "Visitante inválido." });
    }

    const visitante = await db.treinamentoModeloVisitante.findUnique({
      where: { id },
    });
    if (!visitante) {
      return res.status(404).json({ error: "Visitante não encontrado." });
    }

    await db.treinamentoModeloVisitante.delete({ where: { id } });
    return res.status(204).send();
  } catch (error: any) {
    console.error(error);
    return res
      .status(500)
      .json({ error: error?.message || "Erro ao excluir visitante." });
  }
}

export async function excluirTreinamentoModelo(
  req: AuthRequest,
  res: Response,
) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id))
      return res.status(400).json({ error: "Treinamento inválido." });
    const modelo = await db.treinamentoModelo.findUnique({
      where: { id },
      select: {
        videoUrl: true,
        anexoArquivo: true,
        participantes: {
          select: {
            certificadoArquivo: true,
          },
        },
      },
    });
    if (!modelo)
      return res.status(404).json({ error: "Treinamento não encontrado." });
    await db.treinamentoModelo.delete({ where: { id } });
    removerArquivoInterno(modelo.videoUrl);
    removerArquivoInterno(modelo.anexoArquivo);
    for (const participante of modelo.participantes || []) {
      removerArquivoInterno(participante.certificadoArquivo);
    }
    return res.status(204).send();
  } catch (error: any) {
    return res
      .status(500)
      .json({ error: error?.message || "Erro ao excluir treinamento." });
  }
}

export async function excluirParticipanteTreinamentoModelo(
  req: AuthRequest,
  res: Response,
) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id))
      return res.status(400).json({ error: "Registro inválido." });
    const participante = await db.treinamentoModeloParticipante.findUnique({
      where: { id },
    });
    if (!participante)
      return res.status(404).json({ error: "Registro não encontrado." });
    if (participante.certificadoArquivo) {
      removerArquivoInterno(participante.certificadoArquivo);
    }
    await db.treinamentoModeloParticipante.delete({ where: { id } });
    return res.status(204).send();
  } catch (error: any) {
    return res
      .status(500)
      .json({ error: error?.message || "Erro ao excluir participante." });
  }
}

export async function buscarTreinamentoPublico(req: Request, res: Response) {
  const modelo = await carregarModeloPorSlug(texto(req.params.slug));
  if (!modelo || modelo.status !== "Publicado") {
    return res.status(404).json({ error: "Treinamento não encontrado." });
  }
  return res.json({ treinamento: serializarModelo(modelo, false) });
}

export async function uploadAnexoTreinamentoModelo(
  req: AuthRequest,
  res: Response,
) {
  const arquivo = req.file as Express.Multer.File | undefined;
  if (!arquivo) {
    return res.status(400).json({ error: "Selecione um arquivo para anexar." });
  }

  return res.status(201).json({
    anexoNome: arquivo.originalname,
    anexoArquivo: arquivo.path.replace(/\\/g, "/"),
    anexoUrl: `/uploads/treinamentos-dinamicos/${arquivo.filename}`,
  });
}

export async function uploadVideoTreinamentoModelo(
  req: AuthRequest,
  res: Response,
) {
  const arquivo = req.file as Express.Multer.File | undefined;
  if (!arquivo) {
    return res.status(400).json({ error: "Selecione um vídeo para anexar." });
  }

  return res.status(201).json({
    videoNome: arquivo.originalname,
    videoArquivo: arquivo.path.replace(/\\/g, "/"),
    videoUrl: arquivo.path.replace(/\\/g, "/"),
  });
}

export async function baixarVideoTreinamentoModelo(req: Request, res: Response) {
  try {
    const modelo = await db.treinamentoModelo.findUnique({
      where: { slug: texto(req.params.slug) },
      select: {
        status: true,
        videoUrl: true,
      },
    });

    const videoUrl = String(modelo?.videoUrl || "");
    if (
      !modelo ||
      modelo.status !== "Publicado" ||
      !videoUrl.startsWith("uploads/")
    ) {
      return res.status(404).json({ error: "Vídeo não encontrado." });
    }

    const caminhoAbsoluto = path.resolve(process.cwd(), videoUrl);
    const raizUploads = path.resolve(process.cwd(), "uploads");
    if (
      !caminhoAbsoluto.startsWith(raizUploads) ||
      !fs.existsSync(caminhoAbsoluto)
    ) {
      return res.status(404).json({ error: "Vídeo não encontrado." });
    }

    const tamanho = fs.statSync(caminhoAbsoluto).size;
    const range = req.headers.range;
    const contentType = videoUrl.endsWith(".webm")
      ? "video/webm"
      : videoUrl.endsWith(".ogg")
        ? "video/ogg"
        : "video/mp4";

    if (range) {
      const partes = range.replace(/bytes=/, "").split("-");
      const inicio = parseInt(partes[0], 10);
      const fim = partes[1] ? parseInt(partes[1], 10) : tamanho - 1;
      const tamanhoBloco = fim - inicio + 1;
      res.writeHead(206, {
        "Content-Range": `bytes ${inicio}-${fim}/${tamanho}`,
        "Accept-Ranges": "bytes",
        "Content-Length": tamanhoBloco,
        "Content-Type": contentType,
      });
      return fs.createReadStream(caminhoAbsoluto, { start: inicio, end: fim }).pipe(res);
    }

    res.writeHead(200, {
      "Content-Length": tamanho,
      "Content-Type": contentType,
      "Accept-Ranges": "bytes",
    });
    return fs.createReadStream(caminhoAbsoluto).pipe(res);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro ao carregar vídeo." });
  }
}

export async function baixarAnexoTreinamentoModelo(
  req: Request,
  res: Response,
) {
  try {
    const modelo = await db.treinamentoModelo.findUnique({
      where: { slug: texto(req.params.slug) },
      select: {
        status: true,
        anexoNome: true,
        anexoArquivo: true,
      },
    });

    if (!modelo || modelo.status !== "Publicado" || !modelo.anexoArquivo) {
      return res.status(404).json({ error: "Anexo não encontrado." });
    }

    const caminhoAbsoluto = path.resolve(process.cwd(), modelo.anexoArquivo);
    const raizUploads = path.resolve(process.cwd(), "uploads");
    const relativo = path.relative(raizUploads, caminhoAbsoluto);
    if (
      !relativo ||
      relativo.startsWith("..") ||
      path.isAbsolute(relativo) ||
      !fs.existsSync(caminhoAbsoluto)
    ) {
      return res.status(404).json({ error: "Anexo não encontrado." });
    }

    return res.download(
      caminhoAbsoluto,
      modelo.anexoNome || path.basename(caminhoAbsoluto),
    );
  } catch (error: any) {
    console.error(error);
    return res
      .status(500)
      .json({ error: error?.message || "Erro ao carregar anexo." });
  }
}

export async function listarUnidadesTreinamentoModelo(
  req: Request,
  res: Response,
) {
  return res.json({ unidades: UNIDADES_SISTEMA });
}

export async function localizarParticipanteTreinamentoModelo(
  req: Request,
  res: Response,
) {
  const email = texto(req.query.identificador).toLowerCase();
  if (!emailValido(email)) return res.json({ participante: null });

  const usuario = await prisma.usuario.findFirst({
    where: { email },
    select: {
      nome: true,
      cpf: true,
      email: true,
      cargo: true,
      setor: true,
      unidade: true,
      empresa: true,
      statusUsuario: true,
    },
  });
  if (!usuario || usuario.statusUsuario === "BLOQUEADO")
    return res.json({ participante: null });

  return res.json({
    participante: {
      nomeCompleto: usuario.nome,
      cpf: usuario.cpf,
      email: usuario.email,
      cargo: usuario.cargo,
      departamento: usuario.setor,
      unidade: usuario.unidade,
      empresa: usuario.empresa,
    },
  });
}

export async function iniciarTreinamentoModelo(req: Request, res: Response) {
  try {
    const modelo = await carregarModeloPorSlug(texto(req.params.slug));
    if (!modelo || modelo.status !== "Publicado")
      return res.status(404).json({ error: "Treinamento não encontrado." });

    if (modelo.acessoPublico) {
      const token = normalizarTokenTreinamento(req.body.token);
      if (!token) {
        return res
          .status(400)
          .json({ error: "Informe o token recebido por e-mail." });
      }

      const participante = await db.treinamentoModeloParticipante.findFirst({
        where: { token, treinamentoId: modelo.id },
      });

      if (!participante) {
        return res.status(404).json({ error: "Token inválido para este treinamento." });
      }

      if (tokenExpirado(participante.tokenExpiraEm)) {
        await db.treinamentoModeloParticipante.update({
          where: { id: participante.id },
          data: { status: "Expirado" },
        });
        return res.status(403).json({
          error:
            "Token expirado. Solicite um novo envio do treinamento para continuar.",
        });
      }

      const snapshotAtual = participante.snapshotJson || criarSnapshot(modelo);
      const atualizado = await db.treinamentoModeloParticipante.update({
        where: { id: participante.id },
        data: {
          ultimoAcessoEm: new Date(),
          navegador: userAgent(req),
          sistema: userAgent(req),
          ipInicio: participante.ipInicio || req.ip,
          versao: participante.versao || modelo.versao,
          snapshotJson: snapshotAtual,
        },
      });

      return res.json({
        treinamento: lerSnapshot(atualizado, modelo, false),
        participante: respostaParticipante(atualizado),
      });
    }

    const email = texto(req.body.email).toLowerCase();
    const terceirizado = Boolean(req.body.terceirizado);
    if (!emailValido(email)) {
      return res
        .status(400)
        .json({ error: "Informe o e-mail cadastrado para iniciar." });
    }

    if (!terceirizado && !emailCorporativoMovecta(email)) {
      return res.status(400).json({
        error:
          "Informe seu e-mail corporativo ou marque a opção Sou terceirizado para usar e-mail pessoal.",
      });
    }

    const usuario = await prisma.usuario.findFirst({ where: { email } });
    if (!usuario || usuario.statusUsuario === "BLOQUEADO") {
      return res.status(404).json({
        error: "E-mail não cadastrado para este treinamento.",
      });
    }

    const gruposPermitidos = normalizarGruposTreinamento(
      modelo.gruposPermitidosJson,
    );
    if (
      !modelo.acessoPublico &&
      !temGrupoTreinamento(usuario, gruposPermitidos)
    ) {
      return res.status(403).json({
        error: "Este treinamento não está disponível para sua função.",
      });
    }

    const cpf = limparCpf(usuario.cpf || "");
    const existente = await db.treinamentoModeloParticipante.findFirst({
      where: {
        treinamentoId: modelo.id,
        OR: [...(cpf ? [{ cpf }] : []), { email }],
      },
      orderBy: { updatedAt: "desc" },
    });

    const data = {
      usuarioId: usuario.id || existente?.usuarioId,
      nomeCompleto: usuario.nome,
      cpf,
      email,
      cargo: usuario.cargo || existente?.cargo || null,
      departamento: usuario.setor || existente?.departamento || null,
      unidade: usuario.unidade || existente?.unidade || "Não informado",
      empresa: usuario.empresa || existente?.empresa || null,
      ultimoAcessoEm: new Date(),
      navegador: userAgent(req),
      sistema: userAgent(req),
    };
    const snapshotAtual = criarSnapshot(modelo);
    const participante = existente
      ? await db.treinamentoModeloParticipante.update({
          where: { id: existente.id },
          data,
        })
      : await db.treinamentoModeloParticipante.create({
          data: {
            treinamentoId: modelo.id,
            token: randomUUID(),
            versao: modelo.versao,
            snapshotJson: snapshotAtual,
            ...data,
            ipInicio: req.ip,
          },
        });

    if (existente && !existente.snapshotJson) {
      await db.treinamentoModeloParticipante.update({
        where: { id: existente.id },
        data: {
          versao: modelo.versao,
          snapshotJson: snapshotAtual,
        },
      });
      participante.versao = modelo.versao;
      participante.snapshotJson = snapshotAtual;
    }

    return res.status(existente ? 200 : 201).json({
      treinamento: lerSnapshot(participante, modelo, false),
      participante: respostaParticipante(participante),
    });
  } catch (error: any) {
    console.error(error);
    return res
      .status(500)
      .json({ error: error?.message || "Erro ao iniciar treinamento." });
  }
}

export async function concluirEtapaTreinamentoModelo(
  req: Request,
  res: Response,
) {
  try {
    const token = texto(req.params.token);
    const etapa = Number(req.body.etapa);
    const participante = await db.treinamentoModeloParticipante.findUnique({
      where: { token },
      include: {
        treinamento: {
          include: {
            etapas: { orderBy: { ordem: "asc" } },
            perguntas: {
              orderBy: { ordem: "asc" },
              include: { alternativas: { orderBy: { ordem: "asc" } } },
            },
          },
        },
      },
    });
    if (!participante)
      return res.status(404).json({ error: "Treinamento não encontrado." });
    const snapshot = lerSnapshot(participante, participante.treinamento, true);
    const totalEtapas = snapshot.etapas.length;
    if (!Number.isInteger(etapa) || etapa < 1 || etapa > totalEtapas) {
      return res.status(400).json({ error: "Etapa inválida." });
    }
    if (etapa > participante.etapaAtual) {
      return res
        .status(403)
        .json({ error: "Conclua as etapas anteriores antes de avançar." });
    }
    const proxima = Math.max(participante.etapaAtual, etapa + 1);
    const atualizado = await db.treinamentoModeloParticipante.update({
      where: { id: participante.id },
      data: {
        etapaAtual: proxima,
        porcentagem: porcentagem(proxima, totalEtapas, participante.status),
        ultimoAcessoEm: new Date(),
        navegador: userAgent(req),
      },
    });
    return res.json({ participante: respostaParticipante(atualizado) });
  } catch (error: any) {
    return res
      .status(500)
      .json({ error: error?.message || "Erro ao salvar etapa." });
  }
}

export async function responderQuizTreinamentoModelo(
  req: Request,
  res: Response,
) {
  try {
    const token = texto(req.params.token);
    const respostas: Record<string, number> = req.body.respostas || {};
    const participante = await db.treinamentoModeloParticipante.findUnique({
      where: { token },
      include: {
        treinamento: {
          include: {
            etapas: { orderBy: { ordem: "asc" } },
            perguntas: {
              orderBy: { ordem: "asc" },
              include: { alternativas: { orderBy: { ordem: "asc" } } },
            },
          },
        },
      },
    });
    if (!participante)
      return res.status(404).json({ error: "Treinamento não encontrado." });
    const snapshot = lerSnapshot(participante, participante.treinamento, true);
    const perguntas = snapshot.perguntas || [];
    if (snapshot.perguntasHabilitadas === false || perguntas.length === 0)
      return res.status(400).json({ error: "Treinamento sem avaliação." });
    if (Object.keys(respostas).length < perguntas.length) {
      return res.status(400).json({ error: "Responda todas as questões." });
    }

    const detalhes = perguntas.map((pergunta: any) => {
      const correta = pergunta.alternativas.find((item: any) => item.correta);
      const marcada = Number(respostas[String(pergunta.id)]);
      return {
        perguntaId: pergunta.id,
        alternativaId: marcada,
        corretaId: correta?.id,
        correto: marcada === correta?.id,
      };
    });
    const acertos = detalhes.filter((item: any) => item.correto).length;
    const nota = Math.round((acertos / perguntas.length) * 100);
    const aprovado = nota >= snapshot.notaMinima;
    const etapaAssinatura = snapshot.etapas.length + 2;

    const atualizado = await db.treinamentoModeloParticipante.update({
      where: { id: participante.id },
      data: {
        nota,
        respostasQuiz: JSON.stringify(detalhes),
        tentativas: { increment: 1 },
        status: aprovado ? "Aguardando assinatura" : "Reprovado",
        etapaAtual: aprovado ? etapaAssinatura : snapshot.etapas.length + 1,
        porcentagem: aprovado
          ? 99
          : porcentagem(snapshot.etapas.length + 1, snapshot.etapas.length),
        ultimoAcessoEm: new Date(),
        navegador: userAgent(req),
      },
    });

    return res.json({
      aprovado,
      acertos,
      nota,
      detalhes,
      participante: respostaParticipante(atualizado),
    });
  } catch (error: any) {
    return res
      .status(500)
      .json({ error: error?.message || "Erro ao validar avaliação." });
  }
}

const camposAvaliacaoTreinamento = [
  "satisfacao",
  "aprendizado",
  "aplicacao",
  "qualidade",
  "instrutor",
  "duracao",
  "avaliacaoGeral",
];

export async function salvarAvaliacaoTreinamentoModelo(
  req: Request,
  res: Response,
) {
  try {
    const token = texto(req.params.token);
    const respostas = req.body.respostas || {};
    const comentario = texto(req.body.comentario);
    const participante = await db.treinamentoModeloParticipante.findUnique({
      where: { token },
      include: {
        treinamento: {
          include: {
            etapas: { orderBy: { ordem: "asc" } },
            perguntas: {
              orderBy: { ordem: "asc" },
              include: { alternativas: { orderBy: { ordem: "asc" } } },
            },
          },
        },
      },
    });
    if (!participante)
      return res.status(404).json({ error: "Treinamento não encontrado." });

    const snapshot = lerSnapshot(participante, participante.treinamento, true);
    if (snapshot.avaliacaoHabilitada === false) {
      return res.status(400).json({
        error: "Avaliação do treinamento não habilitada para este treinamento.",
      });
    }
    const temQuiz =
      snapshot.perguntasHabilitadas !== false &&
      (snapshot.perguntas || []).length > 0;
    if (temQuiz && (participante.nota || 0) < snapshot.notaMinima) {
      return res.status(400).json({
        error: "Conclua a avaliação final antes de avaliar o treinamento.",
      });
    }

    const faltantes = camposAvaliacaoTreinamento.filter(
      (campo) => !texto(respostas[campo]),
    );
    if (faltantes.length) {
      return res.status(400).json({
        error:
          "Responda todos os itens obrigatórios da avaliação do treinamento.",
      });
    }

    const payload = {
      respostas: camposAvaliacaoTreinamento.reduce(
        (mapa: Record<string, string>, campo) => {
          mapa[campo] = texto(respostas[campo]);
          return mapa;
        },
        {},
      ),
      comentario: comentario || null,
      respondidoEm: new Date().toISOString(),
    };
    const etapaAssinatura = snapshot.etapas.length + 4;
    const atualizado = await db.treinamentoModeloParticipante.update({
      where: { id: participante.id },
      data: {
        avaliacaoTreinamentoJson: JSON.stringify(payload),
        avaliacaoTreinamentoEm: new Date(),
        etapaAtual: Math.max(participante.etapaAtual || 1, etapaAssinatura),
        status: "Aguardando assinatura",
        porcentagem: 99,
        ultimoAcessoEm: new Date(),
        navegador: userAgent(req),
      },
    });

    return res.json({
      mensagem: "Avaliação do treinamento registrada com sucesso.",
      participante: respostaParticipante(atualizado),
    });
  } catch (error: any) {
    return res.status(500).json({
      error: error?.message || "Erro ao salvar avaliação do treinamento.",
    });
  }
}

export async function concluirTreinamentoModelo(req: Request, res: Response) {
  try {
    const token = texto(req.params.token);
    const assinaturaDataUrl = texto(req.body.assinaturaDataUrl);
    if (!assinaturaDataUrl.startsWith("data:image/")) {
      return res.status(400).json({ error: "Assinatura inválida." });
    }

    const participante = await db.treinamentoModeloParticipante.findUnique({
      where: { token },
      include: {
        treinamento: {
          include: {
            etapas: { orderBy: { ordem: "asc" } },
            perguntas: {
              orderBy: { ordem: "asc" },
              include: { alternativas: { orderBy: { ordem: "asc" } } },
            },
          },
        },
      },
    });
    if (!participante)
      return res.status(404).json({ error: "Treinamento não encontrado." });
    const snapshot = lerSnapshot(participante, participante.treinamento, true);
    const temQuiz =
      snapshot.perguntasHabilitadas !== false &&
      (snapshot.perguntas || []).length > 0;
    const temAvaliacaoTreinamento = snapshot.avaliacaoHabilitada !== false;
    if (temQuiz && (participante.nota || 0) < snapshot.notaMinima) {
      return res
        .status(400)
        .json({ error: "A nota mínima ainda não foi atingida." });
    }

    if (temAvaliacaoTreinamento && !participante.avaliacaoTreinamentoJson) {
      return res.status(400).json({
        error:
          "Responda a avaliação do treinamento antes de emitir o certificado.",
      });
    }

    const participanteCpf = await sincronizarCpfParticipante(participante);
    const participanteParaCertificado = participanteCpf.participante;

    const comCodigo = await prisma.$transaction(async (tx) => {
      const repo = tx as any;
      const codigo =
        participante.codigo || (await proximoCodigoCertificado(repo, snapshot));
      return repo.treinamentoModeloParticipante.update({
        where: { id: participante.id },
        data: {
          codigo,
          cpf: participanteParaCertificado.cpf || participante.cpf || null,
          assinaturaDataUrl,
          status: "Concluido",
          porcentagem: 100,
          dataConclusao: participante.dataConclusao || new Date(),
          ultimoAcessoEm: new Date(),
          navegador: userAgent(req),
        },
      });
    });

    const certificadoArquivo = await gerarCertificado(snapshot, comCodigo);
    const email = await enviarCertificado(
      snapshot,
      comCodigo,
      certificadoArquivo,
    );
    const atualizado = await db.treinamentoModeloParticipante.update({
      where: { id: comCodigo.id },
      data: {
        certificadoArquivo,
        emailStatus: email.status,
        emailEnviadoEm: email.enviado ? new Date() : comCodigo.emailEnviadoEm,
      },
    });

    return res.json({
      mensagem: email.enviado
        ? "Certificado emitido e enviado por e-mail."
        : "Certificado emitido. O envio por e-mail não foi confirmado.",
      participante: respostaParticipante(atualizado),
    });
  } catch (error: any) {
    console.error(error);
    return res
      .status(500)
      .json({ error: error?.message || "Erro ao concluir treinamento." });
  }
}

export async function baixarCertificadoTreinamentoModelo(
  req: Request,
  res: Response,
) {
  try {
    const token = texto(req.params.token);
    const participante = await db.treinamentoModeloParticipante.findUnique({
      where: { token },
      include: {
        treinamento: {
          include: {
            etapas: { orderBy: { ordem: "asc" } },
            perguntas: {
              orderBy: { ordem: "asc" },
              include: { alternativas: { orderBy: { ordem: "asc" } } },
            },
          },
        },
      },
    });
    if (!participante || !treinamentoConcluido(participante.status)) {
      return res.status(404).json({ error: "Certificado não encontrado." });
    }
    const participanteCpf = await sincronizarCpfParticipante(participante);
    const participanteParaCertificado = participanteCpf.participante;
    if (
      participanteCpf.atualizado &&
      participante.certificadoArquivo &&
      fs.existsSync(participante.certificadoArquivo)
    ) {
      fs.rmSync(participante.certificadoArquivo, { force: true });
    }
    const certificadoArquivo =
      !participanteCpf.atualizado &&
      participante.certificadoArquivo &&
      fs.existsSync(participante.certificadoArquivo)
        ? participante.certificadoArquivo
        : await gerarCertificado(
            lerSnapshot(
              participanteParaCertificado,
              participante.treinamento,
              true,
            ),
            participanteParaCertificado,
          );
    if (!participante.certificadoArquivo || participanteCpf.atualizado) {
      await db.treinamentoModeloParticipante.update({
        where: { id: participante.id },
        data: { certificadoArquivo },
      });
    }
    return res.download(
      certificadoArquivo,
      `certificado-${String(participante.codigo || participante.treinamento.codigo).replace("/", "-")}.pdf`,
    );
  } catch (error: any) {
    return res
      .status(500)
      .json({ error: error?.message || "Erro ao baixar certificado." });
  }
}

export async function baixarCertificadosTreinamentoModeloZip(
  req: AuthRequest,
  res: Response,
) {
  try {
    const treinamentoId = Number(req.params.id);
    if (!Number.isInteger(treinamentoId)) {
      return res.status(400).json({ error: "Treinamento inválido." });
    }

    const ids = texto(req.query.ids)
      .split(",")
      .map((item) => Number(item))
      .filter((item) => Number.isInteger(item));

    const modelo = await db.treinamentoModelo.findUnique({
      where: { id: treinamentoId },
      include: {
        etapas: { orderBy: { ordem: "asc" } },
        perguntas: {
          orderBy: { ordem: "asc" },
          include: { alternativas: { orderBy: { ordem: "asc" } } },
        },
      },
    });
    if (!modelo) {
      return res.status(404).json({ error: "Treinamento não encontrado." });
    }

    const participantes = (
      await db.treinamentoModeloParticipante.findMany({
        where: {
          treinamentoId,
          ...(ids.length ? { id: { in: ids } } : {}),
        },
        orderBy: [{ dataConclusao: "desc" }, { updatedAt: "desc" }],
      })
    ).filter((item: any) => treinamentoConcluido(item.status));

    if (!participantes.length) {
      return res
        .status(404)
        .json({ error: "Nenhum certificado concluído encontrado." });
    }

    const nomeTreinamento = nomeArquivoSeguro(
      modelo.nome || modelo.codigo || modelo.slug,
      "treinamento",
    );

    res.setHeader("Content-Type", "application/zip");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="certificados-${nomeTreinamento}.zip"`,
    );

    const arquivoZip = new archiver.ZipArchive({ zlib: { level: 9 } });
    arquivoZip.on("error", (error: archiver.ArchiverError) => {
      console.error(error);
      if (!res.headersSent) {
        res.status(500).json({ error: "Erro ao gerar arquivo ZIP." });
      } else {
        res.end();
      }
    });
    arquivoZip.pipe(res);

    const usados = new Set<string>();
    for (const participanteOriginal of participantes) {
      const participanteCpf = await sincronizarCpfParticipante({
        ...participanteOriginal,
        treinamento: modelo,
      });
      const participante = participanteCpf.participante;

      if (
        participanteCpf.atualizado &&
        participanteOriginal.certificadoArquivo &&
        fs.existsSync(participanteOriginal.certificadoArquivo)
      ) {
        fs.rmSync(participanteOriginal.certificadoArquivo, { force: true });
      }

      const certificadoArquivo =
        !participanteCpf.atualizado &&
        participanteOriginal.certificadoArquivo &&
        fs.existsSync(participanteOriginal.certificadoArquivo)
          ? participanteOriginal.certificadoArquivo
          : await gerarCertificado(
              lerSnapshot(participante, modelo, true),
              participante,
            );

      if (
        !participanteOriginal.certificadoArquivo ||
        participanteCpf.atualizado
      ) {
        await db.treinamentoModeloParticipante.update({
          where: { id: participanteOriginal.id },
          data: { certificadoArquivo },
        });
      }

      const nome = nomeArquivoSeguro(participante.nomeCompleto, "participante");
      const codigo = nomeArquivoSeguro(modelo.codigo, "treinamento");
      const base = `${nome}-${codigo}`;
      const repeticoes = Array.from(usados).filter((item) =>
        item.startsWith(base),
      ).length;
      const arquivo = `${base}${repeticoes ? `-${repeticoes + 1}` : ""}.pdf`;
      usados.add(arquivo);

      arquivoZip.file(certificadoArquivo, { name: arquivo });
    }

    await arquivoZip.finalize();
  } catch (error: any) {
    console.error(error);
    if (!res.headersSent) {
      return res
        .status(500)
        .json({ error: error?.message || "Erro ao baixar certificados." });
    }
    return res.end();
  }
}

export async function reenviarEmailTreinamentoModelo(
  req: AuthRequest,
  res: Response,
) {
  try {
    const id = Number(req.params.id);
    const participante = await db.treinamentoModeloParticipante.findUnique({
      where: { id },
      include: {
        treinamento: {
          include: {
            etapas: { orderBy: { ordem: "asc" } },
            perguntas: {
              orderBy: { ordem: "asc" },
              include: { alternativas: { orderBy: { ordem: "asc" } } },
            },
          },
        },
      },
    });
    if (!participante)
      return res.status(404).json({ error: "Registro não encontrado." });
    if (!treinamentoConcluido(participante.status)) {
      return res
        .status(400)
        .json({ error: "Só é possível enviar após a conclusão." });
    }
    const participanteCpf = await sincronizarCpfParticipante(participante);
    const participanteParaCertificado = participanteCpf.participante;
    if (
      participanteCpf.atualizado &&
      participante.certificadoArquivo &&
      fs.existsSync(participante.certificadoArquivo)
    ) {
      fs.rmSync(participante.certificadoArquivo, { force: true });
    }
    const certificadoArquivo =
      !participanteCpf.atualizado &&
      participante.certificadoArquivo &&
      fs.existsSync(participante.certificadoArquivo)
        ? participante.certificadoArquivo
        : await gerarCertificado(
            lerSnapshot(
              participanteParaCertificado,
              participante.treinamento,
              true,
            ),
            participanteParaCertificado,
          );
    const email = await enviarCertificado(
      lerSnapshot(participanteParaCertificado, participante.treinamento, true),
      participanteParaCertificado,
      certificadoArquivo,
    );
    const atualizado = await db.treinamentoModeloParticipante.update({
      where: { id },
      data: {
        certificadoArquivo,
        emailStatus: email.status,
        emailEnviadoEm: email.enviado
          ? new Date()
          : participante.emailEnviadoEm,
      },
    });
    return res.json({
      mensagem: email.enviado
        ? "E-mail enviado com sucesso."
        : "Envio registrado. Verifique o SMTP.",
      participante: {
        ...atualizado,
        assinaturaDataUrl: undefined,
        certificadoUrl: certificadoUrl(atualizado.token),
      },
    });
  } catch (error: any) {
    return res
      .status(500)
      .json({ error: error?.message || "Erro ao reenviar e-mail." });
  }
}
