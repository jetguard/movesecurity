import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import archiver = require("archiver");
import { Request, Response } from "express";
import PDFDocument from "pdfkit";
import QRCode from "qrcode";
import { prisma } from "../lib/prisma";
import { AuthRequest } from "../middlewares/auth";
import { UNIDADES_SISTEMA } from "../config/unidades";
import { enviarEmail } from "../services/email.service";

const TOTAL_ETAPAS_CONTEUDO = 12;
const TOTAL_ETAPAS = 13;
const NOTA_MINIMA = 80;
const respostasCorretas = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];

function texto(valor: unknown) {
  return String(valor || "").trim();
}

function limparCpf(cpf: string) {
  return String(cpf || "").replace(/\D/g, "");
}

function cpfValido(cpf: string) {
  const digitos = limparCpf(cpf);
  if (digitos.length !== 11 || /^(\d)\1{10}$/.test(digitos)) return false;

  const calcularDigito = (tamanho: number) => {
    const soma = digitos
      .slice(0, tamanho)
      .split("")
      .reduce(
        (total, numero, index) =>
          total + Number(numero) * (tamanho + 1 - index),
        0,
      );
    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  };

  return (
    calcularDigito(9) === Number(digitos[9]) &&
    calcularDigito(10) === Number(digitos[10])
  );
}

function emailCorporativo(email: string) {
  return texto(email).toLowerCase();
}

function dominioMovecta(email: string) {
  return emailCorporativo(email).endsWith("@movecta.com.br");
}

function unidadeValida(unidade: string) {
  return UNIDADES_SISTEMA.includes(unidade);
}

function emailValido(email: string) {
  const normalizado = String(email || "").trim();
  if (!normalizado || normalizado.length > 254 || normalizado.includes(".."))
    return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(normalizado);
}

function userAgent(req: Request) {
  return texto(req.headers["user-agent"]);
}

function porcentagem(etapaAtual: number, status?: string | null) {
  if (
    String(status || "")
      .toLowerCase()
      .startsWith("conclu")
  )
    return 100;
  return Math.max(
    0,
    Math.min(99, Math.round(((etapaAtual - 1) / TOTAL_ETAPAS) * 100)),
  );
}

function treinamentoConcluido(status?: string | null) {
  return String(status || "")
    .toLowerCase()
    .startsWith("conclu");
}

function dataPtBr(data?: Date | string | null) {
  if (!data) return "-";
  return new Date(data).toLocaleDateString("pt-BR", {
    timeZone: "America/Sao_Paulo",
  });
}

function appPublicUrl() {
  return String(
    process.env.PUBLIC_APP_URL ||
      process.env.APP_URL ||
      process.env.FRONTEND_URL ||
      "https://movecta.jetguard.com.br",
  ).replace(/\/$/, "");
}

function arquivoCertificado(token: string) {
  const pasta = path.resolve(
    process.cwd(),
    "uploads",
    "certificados-poc-sep-006",
  );
  fs.mkdirSync(pasta, { recursive: true });
  return path.join(pasta, `certificado-poc-sep-006-${token}.pdf`);
}

function certificadoUrl(token: string) {
  return `/api/public/treinamento-poc-sep-006/${token}/certificado`;
}

function caminhoFundoCertificadoPoc() {
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
  return caminhos.find((caminho) => fs.existsSync(caminho));
}

async function gerarCertificadoPocSep006(treinamento: any) {
  const destino = arquivoCertificado(treinamento.token);
  const temporario = `${destino}.tmp`;
  fs.rmSync(temporario, { force: true });

  const doc = new PDFDocument({ size: "A4", layout: "landscape", margin: 0 });
  const stream = fs.createWriteStream(temporario);
  doc.pipe(stream);

  const pageWidth = doc.page.width;
  const pageHeight = doc.page.height;
  const concluidoEm = new Date(treinamento.dataConclusao || new Date());
  const fundo = caminhoFundoCertificadoPoc();
  const validacaoUrl = `${appPublicUrl()}/validar-certificado/${treinamento.token}`;
  const qrDataUrl = await QRCode.toDataURL(validacaoUrl, {
    width: 240,
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

  doc.save();
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
  doc.restore();

  doc
    .fillColor("#1d4ed8")
    .font("Helvetica-Bold")
    .fontSize(11)
    .text(treinamento.codigo || "CERTIFICADO", pageWidth - 218, 66, {
      width: 156,
      align: "right",
    });

  doc
    .fillColor("#07142f")
    .font("Helvetica-Bold")
    .fontSize(36)
    .text("Treinamento POC-SEP-006", 88, 86, {
      width: pageWidth - 176,
      align: "center",
    });
  doc
    .fillColor("#1d4ed8")
    .font("Helvetica-Bold")
    .fontSize(16)
    .text("CCOS - Centro de Controle Operacional de Segurança", 96, 134, {
      width: pageWidth - 192,
      align: "center",
    });

  doc
    .moveTo(186, 176)
    .lineTo(pageWidth - 186, 176)
    .strokeColor("#7ed321")
    .lineWidth(2)
    .stroke();

  const textoPrincipal = `Certificamos que o colaborador ${String(treinamento.nomeCompleto || "").toUpperCase()} concluiu com aproveitamento o treinamento POC-SEP-006 na data de ${dataPtBr(concluidoEm)}.`;
  doc
    .fillColor("#111827")
    .font("Helvetica")
    .fontSize(21)
    .text(textoPrincipal, 104, 214, {
      width: pageWidth - 208,
      align: "center",
      lineGap: 9,
    });

  doc.save();
  doc
    .roundedRect(70, 416, 102, 112, 14)
    .fillOpacity(0.96)
    .fillAndStroke("#ffffff", "#bfdbfe");
  doc.restore();
  doc.image(qrCode, 84, 428, { width: 74, height: 74 });
  doc
    .fillColor("#0f172a")
    .font("Helvetica-Bold")
    .fontSize(7)
    .text("VALIDAÇÃO", 70, 508, { width: 102, align: "center" });

  if (treinamento.assinaturaDataUrl) {
    const assinaturaBase64 = String(treinamento.assinaturaDataUrl).split(
      ",",
    )[1];
    if (assinaturaBase64) {
      const assinaturaPng = path.join(
        path.dirname(destino),
        `assinatura-poc-${treinamento.token}.png`,
      );
      fs.writeFileSync(assinaturaPng, Buffer.from(assinaturaBase64, "base64"));
      doc.image(assinaturaPng, 292, 370, { fit: [258, 62], align: "center" });
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
    .text(treinamento.nomeCompleto, 256, 464, { width: 330, align: "center" });
  doc
    .fillColor("#334155")
    .font("Helvetica")
    .fontSize(9)
    .text("Colaborador", 256, 480, { width: 330, align: "center" });

  doc
    .fillColor("#64748b")
    .font("Helvetica")
    .fontSize(7.5)
    .text(
      "Certificado emitido eletronicamente pela plataforma Movecta.",
      206,
      pageHeight - 70,
      {
        width: pageWidth - 412,
        align: "center",
      },
    );
  doc.end();

  await new Promise<void>((resolve, reject) => {
    stream.on("finish", resolve);
    stream.on("error", reject);
  });
  fs.renameSync(temporario, destino);
  return destino;
}

async function enviarCertificadoPocSep006(
  treinamento: any,
  certificadoArquivo: string,
) {
  return enviarEmail({
    to: treinamento.email,
    subject: `Certificado POC-SEP-006 - ${treinamento.codigo}`,
    text: `Olá, ${treinamento.nomeCompleto}. Segue em anexo o certificado de conclusão do treinamento POC-SEP-006.`,
    html: `<p>Olá, <strong>${treinamento.nomeCompleto}</strong>.</p><p>Segue em anexo o certificado de conclusão do treinamento <strong>POC-SEP-006</strong>.</p>`,
    attachments: [
      {
        filename: `certificado-${String(treinamento.codigo || "poc").replace("/", "-")}.pdf`,
        path: certificadoArquivo,
        contentType: "application/pdf",
      },
    ],
  });
}

async function proximoCodigo(tx: any) {
  const ano = new Date().getFullYear();
  await tx.$executeRawUnsafe(
    `SELECT pg_advisory_xact_lock(hashtext('movecta_poc_sep_006_certificado_${ano}'))`,
  );
  const certificados = await tx.treinamentoPocSep006.findMany({
    where: { codigo: { endsWith: `/${ano}` } },
    select: { codigo: true },
  });
  const maiorNumero = certificados.reduce((maior: number, item: { codigo: string | null }) => {
    const numero = Number(item.codigo?.match(/POC006-(\d+)\//)?.[1] || 0);
    return Math.max(maior, numero);
  }, 0);
  const numero = maiorNumero + 1;
  return `POC006-${String(numero).padStart(5, "0")}/${ano}`;
}

function respostaPublica(registro: any) {
  return {
    token: registro.token,
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
    tentativas: registro.tentativas,
    dataConclusao: registro.dataConclusao,
    emailStatus: registro.emailStatus,
    emailEnviadoEm: registro.emailEnviadoEm,
    certificadoUrl: registro.certificadoArquivo
      ? certificadoUrl(registro.token)
      : null,
  };
}

export async function listarUnidadesTreinamentoPocSep006(
  req: Request,
  res: Response,
) {
  return res.json({ unidades: UNIDADES_SISTEMA });
}

export async function localizarParticipanteTreinamentoPocSep006(
  req: Request,
  res: Response,
) {
  const identificador = texto(req.query.identificador).toLowerCase();
  const cpf = limparCpf(identificador);
  const email = emailValido(identificador) ? identificador : "";

  if (!email && !cpfValido(cpf)) {
    return res.json({ participante: null });
  }

  const usuario = await prisma.usuario.findFirst({
    where: {
      OR: [...(email ? [{ email }] : []), ...(cpfValido(cpf) ? [{ cpf }] : [])],
    },
    select: {
      id: true,
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

  if (!usuario || usuario.statusUsuario !== "ATIVO") {
    return res.json({ participante: null });
  }

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

export async function iniciarTreinamentoPocSep006(req: Request, res: Response) {
  try {
    const email = emailCorporativo(req.body.email);
    const nomeCompleto = texto(req.body.nomeCompleto);
    const cpf = limparCpf(req.body.cpf);
    const unidade = texto(req.body.unidade);
    const terceirizado = req.body.terceirizado === true;
    if (!terceirizado && !dominioMovecta(email)) {
      return res.status(403).json({
        error:
          "Acesso não autorizado.\n\nPara colaboradores Movecta, utilize seu e-mail corporativo (@movecta.com.br).\n\nSe você for terceirizado autorizado, marque a opção correspondente e informe um e-mail válido.",
      });
    }

    if (
      !nomeCompleto ||
      !cpfValido(cpf) ||
      !emailValido(email) ||
      !unidadeValida(unidade)
    ) {
      return res.status(400).json({
        error:
          "Informe nome completo, CPF válido, e-mail válido e unidade para iniciar.",
      });
    }

    const usuario = await prisma.usuario.findFirst({
      where: {
        OR: [{ email }, { cpf }],
      },
    });

    const existente = await prisma.treinamentoPocSep006.findFirst({
      where: {
        OR: [{ cpf }, { email }],
      },
      orderBy: { updatedAt: "desc" },
    });

    if (existente) {
      const atualizado = await prisma.treinamentoPocSep006.update({
        where: { id: existente.id },
        data: {
          nomeCompleto,
          cpf,
          email,
          usuarioId: usuario?.id || existente.usuarioId,
          cargo: usuario?.cargo || existente.cargo,
          departamento: usuario?.setor || existente.departamento,
          unidade,
          empresa: terceirizado
            ? usuario?.empresa || existente.empresa || "Terceirizado"
            : usuario?.empresa || existente.empresa || "Movecta",
          ultimoAcessoEm: new Date(),
          navegador: userAgent(req),
        },
      });
      return res.json({ treinamento: respostaPublica(atualizado) });
    }

    const treinamento = await prisma.treinamentoPocSep006.create({
      data: {
        token: randomUUID(),
        usuarioId: usuario?.id,
        nomeCompleto,
        cpf,
        email,
        cargo: usuario?.cargo,
        departamento: usuario?.setor,
        unidade,
        empresa: terceirizado
          ? usuario?.empresa || "Terceirizado"
          : usuario?.empresa || "Movecta",
        etapaAtual: 1,
        porcentagem: 0,
        ipInicio: req.ip,
        navegador: userAgent(req),
        sistema: userAgent(req),
      },
    });

    return res.status(201).json({ treinamento: respostaPublica(treinamento) });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ error: "Erro ao iniciar treinamento POC-SEP-006." });
  }
}

export async function concluirEtapaTreinamentoPocSep006(
  req: Request,
  res: Response,
) {
  try {
    const token = texto(req.params.token);
    const etapa = Number(req.body.etapa);
    if (
      !Number.isInteger(etapa) ||
      etapa < 1 ||
      etapa > TOTAL_ETAPAS_CONTEUDO
    ) {
      return res.status(400).json({ error: "Etapa inválida." });
    }

    const treinamento = await prisma.treinamentoPocSep006.findUnique({
      where: { token },
    });
    if (!treinamento)
      return res.status(404).json({ error: "Treinamento não encontrado." });
    if (etapa > treinamento.etapaAtual)
      return res
        .status(403)
        .json({ error: "Conclua as etapas anteriores antes de avançar." });

    const proximaEtapa = Math.min(
      TOTAL_ETAPAS,
      Math.max(treinamento.etapaAtual, etapa + 1),
    );
    const atualizado = await prisma.treinamentoPocSep006.update({
      where: { id: treinamento.id },
      data: {
        etapaAtual: proximaEtapa,
        porcentagem: porcentagem(proximaEtapa, treinamento.status),
        ultimoAcessoEm: new Date(),
        navegador: userAgent(req),
      },
    });

    return res.json({ treinamento: respostaPublica(atualizado) });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro ao salvar etapa." });
  }
}

export async function responderQuizTreinamentoPocSep006(
  req: Request,
  res: Response,
) {
  try {
    const token = texto(req.params.token);
    const respostas: number[] = Array.isArray(req.body.respostas)
      ? req.body.respostas.map(Number)
      : [];
    if (
      respostas.length !== respostasCorretas.length ||
      respostas.some((item) => !Number.isInteger(item))
    ) {
      return res.status(400).json({
        error: "Responda todas as questões para finalizar a avaliação.",
      });
    }

    const treinamento = await prisma.treinamentoPocSep006.findUnique({
      where: { token },
    });
    if (!treinamento)
      return res.status(404).json({ error: "Treinamento não encontrado." });
    if (treinamento.etapaAtual < TOTAL_ETAPAS)
      return res
        .status(403)
        .json({ error: "Conclua todas as etapas antes da avaliação." });

    const acertos = respostas.reduce(
      (total, resposta, index) =>
        total + (resposta === respostasCorretas[index] ? 1 : 0),
      0,
    );
    const nota = Math.round((acertos / respostasCorretas.length) * 100);
    const aprovado = nota >= NOTA_MINIMA;

    const atualizado = await prisma.$transaction(async (tx) => {
      return tx.treinamentoPocSep006.update({
        where: { id: treinamento.id },
        data: {
          nota,
          respostasQuiz: JSON.stringify(respostas),
          tentativas: { increment: 1 },
          status: aprovado ? "Aguardando assinatura" : "Reprovado",
          porcentagem: aprovado ? 99 : porcentagem(TOTAL_ETAPAS),
          ultimoAcessoEm: new Date(),
          navegador: userAgent(req),
        },
      });
    });

    return res.json({
      aprovado,
      acertos,
      nota,
      treinamento: respostaPublica(atualizado),
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro ao validar avaliação." });
  }
}

export async function concluirTreinamentoPocSep006(
  req: Request,
  res: Response,
) {
  try {
    const token = texto(req.params.token);
    const assinaturaDataUrl = texto(req.body.assinaturaDataUrl);
    if (!assinaturaDataUrl.startsWith("data:image/")) {
      return res.status(400).json({ error: "Assinatura inválida." });
    }

    const treinamento = await prisma.treinamentoPocSep006.findUnique({
      where: { token },
    });
    if (!treinamento)
      return res.status(404).json({ error: "Treinamento não encontrado." });
    if ((treinamento.nota || 0) < NOTA_MINIMA) {
      return res
        .status(400)
        .json({ error: "A nota mínima para emissão do certificado é 80%." });
    }

    const comCodigo = await prisma.$transaction(async (tx) => {
      const codigo = treinamento.codigo || (await proximoCodigo(tx));
      return tx.treinamentoPocSep006.update({
        where: { id: treinamento.id },
        data: {
          codigo,
          assinaturaDataUrl,
          status: "Concluido",
          porcentagem: 100,
          dataConclusao: treinamento.dataConclusao || new Date(),
          ultimoAcessoEm: new Date(),
          navegador: userAgent(req),
        },
      });
    });

    const certificadoArquivo = await gerarCertificadoPocSep006(comCodigo);
    const email = await enviarCertificadoPocSep006(
      comCodigo,
      certificadoArquivo,
    );
    const atualizado = await prisma.treinamentoPocSep006.update({
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
      treinamento: respostaPublica(atualizado),
    });
  } catch (error: any) {
    const mensagem =
      error?.message || "Erro ao concluir treinamento POC-SEP-006.";
    console.error(error);
    return res
      .status(500)
      .json({ error: mensagem });
  }
}

export async function listarTreinamentosPocSep006(
  req: AuthRequest,
  res: Response,
) {
  const treinamentos = await prisma.treinamentoPocSep006.findMany({
    orderBy: { updatedAt: "desc" },
    take: 300,
  });

  return res.json(
    treinamentos.map((item) => ({
      ...item,
      assinaturaDataUrl: undefined,
      certificadoUrl: item.certificadoArquivo
        ? certificadoUrl(item.token)
        : null,
    })),
  );
}

export async function reenviarEmailTreinamentoPocSep006(
  req: AuthRequest,
  res: Response,
) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id))
      return res.status(400).json({ error: "Treinamento inválido." });

    const treinamento = await prisma.treinamentoPocSep006.findUnique({
      where: { id },
    });
    if (!treinamento)
      return res.status(404).json({ error: "Treinamento não encontrado." });
    if (!treinamentoConcluido(treinamento.status) || !treinamento.codigo) {
      return res.status(400).json({
        error:
          "O e-mail só pode ser reenviado após a conclusão do treinamento.",
      });
    }

    const certificadoArquivo =
      treinamento.certificadoArquivo &&
      fs.existsSync(treinamento.certificadoArquivo)
        ? treinamento.certificadoArquivo
        : await gerarCertificadoPocSep006(treinamento);
    const email = await enviarCertificadoPocSep006(
      treinamento,
      certificadoArquivo,
    );

    const atualizado = await prisma.treinamentoPocSep006.update({
      where: { id: treinamento.id },
      data: {
        certificadoArquivo,
        emailStatus: email.status,
        emailEnviadoEm: email.enviado ? new Date() : treinamento.emailEnviadoEm,
      },
    });

    return res.json({
      mensagem: email.enviado
        ? "E-mail enviado com sucesso."
        : "Envio registrado. Verifique a configuração de SMTP.",
      treinamento: {
        ...atualizado,
        assinaturaDataUrl: undefined,
        certificadoUrl: certificadoUrl(atualizado.token),
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro ao reenviar e-mail." });
  }
}

export async function excluirTreinamentoPocSep006(
  req: AuthRequest,
  res: Response,
) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id))
      return res.status(400).json({ error: "Treinamento inválido." });

    const treinamento = await prisma.treinamentoPocSep006.findUnique({
      where: { id },
    });
    if (!treinamento)
      return res.status(404).json({ error: "Treinamento não encontrado." });

    if (
      treinamento.certificadoArquivo &&
      fs.existsSync(treinamento.certificadoArquivo)
    ) {
      fs.rmSync(treinamento.certificadoArquivo, { force: true });
    }

    await prisma.treinamentoPocSep006.delete({ where: { id } });

    return res.status(204).send();
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro ao excluir treinamento." });
  }
}

export async function baixarCertificadoPocSep006(req: Request, res: Response) {
  try {
    const token = texto(req.params.token);
    const treinamento = await prisma.treinamentoPocSep006.findUnique({
      where: { token },
    });
    if (!treinamento || !treinamentoConcluido(treinamento.status)) {
      return res.status(404).json({ error: "Certificado não encontrado." });
    }

    const certificadoArquivo =
      treinamento.certificadoArquivo &&
      fs.existsSync(treinamento.certificadoArquivo)
        ? treinamento.certificadoArquivo
        : await gerarCertificadoPocSep006(treinamento);

    if (!treinamento.certificadoArquivo) {
      await prisma.treinamentoPocSep006.update({
        where: { id: treinamento.id },
        data: { certificadoArquivo },
      });
    }

    return res.download(
      certificadoArquivo,
      `certificado-${String(treinamento.codigo || "poc-sep-006").replace("/", "-")}.pdf`,
    );
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro ao baixar certificado." });
  }
}

export async function baixarCertificadosPocSep006Zip(
  req: AuthRequest,
  res: Response,
) {
  try {
    const treinamentos = (
      await prisma.treinamentoPocSep006.findMany({
        orderBy: [{ dataConclusao: "desc" }, { updatedAt: "desc" }],
      })
    ).filter((item) => treinamentoConcluido(item.status));

    if (!treinamentos.length) {
      return res
        .status(404)
        .json({ error: "Nenhum certificado concluído encontrado." });
    }

    res.setHeader("Content-Type", "application/zip");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="certificados-poc-sep-006-${new Date().getFullYear()}.zip"`,
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

    for (const treinamento of treinamentos) {
      const certificadoArquivo =
        treinamento.certificadoArquivo &&
        fs.existsSync(treinamento.certificadoArquivo)
          ? treinamento.certificadoArquivo
          : await gerarCertificadoPocSep006(treinamento);

      if (!treinamento.certificadoArquivo) {
        await prisma.treinamentoPocSep006.update({
          where: { id: treinamento.id },
          data: { certificadoArquivo },
        });
      }

      const codigo = String(treinamento.codigo || treinamento.token).replace(
        /[\\/]/g,
        "-",
      );
      const nome = texto(treinamento.nomeCompleto)
        .replace(/[^\p{L}\d\s.-]/gu, "")
        .replace(/\s+/g, "-")
        .slice(0, 80);
      arquivoZip.file(certificadoArquivo, {
        name: `${codigo}-${nome || "participante"}.pdf`,
      });
    }

    await arquivoZip.finalize();
  } catch (error) {
    console.error(error);
    if (!res.headersSent) {
      return res.status(500).json({ error: "Erro ao baixar certificados." });
    }
    return res.end();
  }
}
