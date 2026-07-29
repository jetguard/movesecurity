import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { Request, Response } from "express";
import PDFDocument from "pdfkit";
import QRCode from "qrcode";
import { prisma } from "../lib/prisma";
import { AuthRequest } from "../middlewares/auth";
import { UNIDADES_SISTEMA } from "../config/unidades";
import { enviarEmail } from "../services/email.service";
import { pdfAssets } from "../services/documentoPdfBase.service";

const TOTAL_ETAPAS_CONTEUDO = 15;
const TOTAL_ETAPAS = 16;
const NOTA_MINIMA = 80;
const respostasCorretas = [0, 1, 2, 0, 1, 1, 2, 2, 0, 1, 1, 1, 1, 2, 1];

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
      .reduce((total, numero, index) => total + Number(numero) * (tamanho + 1 - index), 0);
    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  };

  return calcularDigito(9) === Number(digitos[9]) && calcularDigito(10) === Number(digitos[10]);
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
  if (!normalizado || normalizado.length > 254 || normalizado.includes("..")) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(normalizado);
}

function userAgent(req: Request) {
  return texto(req.headers["user-agent"]);
}

function porcentagem(etapaAtual: number, status?: string | null) {
  if (String(status || "").toLowerCase().startsWith("conclu")) return 100;
  return Math.max(0, Math.min(99, Math.round(((etapaAtual - 1) / TOTAL_ETAPAS) * 100)));
}

function treinamentoConcluido(status?: string | null) {
  return String(status || "").toLowerCase().startsWith("conclu");
}

function dataPtBr(data?: Date | string | null) {
  if (!data) return "-";
  return new Date(data).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
}

function formatarCpf(cpf?: string | null) {
  const digitos = limparCpf(cpf || "");
  if (digitos.length !== 11) return cpf || "-";
  return digitos.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
}

function appPublicUrl() {
  return String(process.env.PUBLIC_APP_URL || process.env.APP_URL || process.env.FRONTEND_URL || "https://movecta.jetguard.com.br").replace(/\/$/, "");
}

function arquivoCertificado(token: string) {
  const pasta = path.resolve(process.cwd(), "uploads", "certificados-poc-sep-007");
  fs.mkdirSync(pasta, { recursive: true });
  return path.join(pasta, `certificado-poc-sep-007-${token}.pdf`);
}

function certificadoUrl(token: string) {
  return `/api/public/treinamento-poc-sep-007/${token}/certificado`;
}

async function gerarCertificadoPocSep007(treinamento: any) {
  const destino = arquivoCertificado(treinamento.token);
  const temporario = `${destino}.tmp`;
  fs.rmSync(temporario, { force: true });

  const doc = new PDFDocument({ size: "A4", layout: "landscape", margin: 0 });
  const stream = fs.createWriteStream(temporario);
  doc.pipe(stream);

  const pageWidth = doc.page.width;
  const pageHeight = doc.page.height;
  const validacaoUrl = `${appPublicUrl()}/treinamento-poc-sep-007`;
  const qrDataUrl = await QRCode.toDataURL(validacaoUrl, {
    width: 220,
    margin: 1,
    color: { dark: "#0f172a", light: "#ffffff" },
  });
  const qrCode = Buffer.from(String(qrDataUrl).split(",")[1], "base64");
  const concluidoEm = new Date(treinamento.dataConclusao || new Date());

  doc.rect(0, 0, pageWidth, pageHeight).fill("#ffffff");
  doc.rect(0, 0, pageWidth, 142).fill("#356bad");
  doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(34).text("CERTIFICADO", 44, 58, { width: 270 });
  doc.roundedRect(pageWidth - 230, 34, 186, 34, 10).fillAndStroke("#ffffff", "#bfdbfe");
  doc.fillColor("#1d4ed8").font("Helvetica-Bold").fontSize(14).text(treinamento.codigo || "-", pageWidth - 218, 44, { width: 162, align: "center" });

  const textoPrincipal = `Certificamos que ${treinamento.nomeCompleto}, portador(a) do CPF nº ${formatarCpf(treinamento.cpf)}, concluiu com aproveitamento o treinamento POC-SEP-007 - Controle de Acesso de Pessoas e Veículos não Atrelados à Carga, obtendo nota ${treinamento.nota ?? "-"}%, em ${dataPtBr(concluidoEm)}.`;
  doc.fillColor("#111827").font("Helvetica").fontSize(16).text(textoPrincipal, 118, 182, {
    width: 620,
    align: "center",
    lineGap: 7,
  });

  if (treinamento.assinaturaDataUrl) {
    const assinaturaBase64 = String(treinamento.assinaturaDataUrl).split(",")[1];
    if (assinaturaBase64) {
      const assinaturaPng = path.join(path.dirname(destino), `assinatura-poc-${treinamento.token}.png`);
      fs.writeFileSync(assinaturaPng, Buffer.from(assinaturaBase64, "base64"));
      doc.image(assinaturaPng, 180, 350, { fit: [240, 58], align: "center" });
      fs.rmSync(assinaturaPng, { force: true });
    }
  }

  doc.moveTo(158, 415).lineTo(433, 415).strokeColor("#2f6bb2").lineWidth(1).stroke();
  doc.fillColor("#111827").font("Helvetica-Bold").fontSize(9).text(treinamento.nomeCompleto, 158, 427, { width: 275, align: "center" });
  doc.fillColor("#111827").font("Helvetica").fontSize(8).text("Participante", 158, 442, { width: 275, align: "center" });

  doc.moveTo(472, 415).lineTo(747, 415).strokeColor("#2f6bb2").lineWidth(1).stroke();
  doc.fillColor("#111827").font("Helvetica-Bold").fontSize(9.5).text("Segurança Patrimonial", 472, 427, { width: 275, align: "center" });
  doc.fillColor("#111827").font("Helvetica").fontSize(8.5).text("Movecta S.A", 472, 442, { width: 275, align: "center" });

  doc.image(qrCode, 58, 424, { width: 72, height: 72 });
  doc.fillColor("#334155").font("Helvetica-Bold").fontSize(7).text("VALIDAÇÃO", 49, 502, { width: 90, align: "center" });

  if (fs.existsSync(pdfAssets.logo)) {
    doc.image(pdfAssets.logo, 610, 488, { fit: [150, 46], align: "center" });
  } else {
    doc.fillColor("#356bad").font("Helvetica-Bold").fontSize(22).text("Movecta", 618, 492, { width: 140, align: "center" });
  }

  doc.fillColor("#64748b").font("Helvetica").fontSize(7).text(`Validação: ${validacaoUrl}`, 44, pageHeight - 26, { width: pageWidth - 88, align: "center", ellipsis: true });
  doc.end();

  await new Promise<void>((resolve, reject) => {
    stream.on("finish", resolve);
    stream.on("error", reject);
  });
  fs.renameSync(temporario, destino);
  return destino;
}

async function enviarCertificadoPocSep007(treinamento: any, certificadoArquivo: string) {
  return enviarEmail({
    to: treinamento.email,
    subject: `Certificado POC-SEP-007 - ${treinamento.codigo}`,
    text: `Olá, ${treinamento.nomeCompleto}. Segue em anexo o certificado de conclusão do treinamento POC-SEP-007.`,
    html: `<p>Olá, <strong>${treinamento.nomeCompleto}</strong>.</p><p>Segue em anexo o certificado de conclusão do treinamento <strong>POC-SEP-007</strong>.</p>`,
    attachments: [{ filename: `certificado-${String(treinamento.codigo || "poc").replace("/", "-")}.pdf`, path: certificadoArquivo, contentType: "application/pdf" }],
  });
}

async function proximoCodigo(tx: any) {
  const ano = new Date().getFullYear();
  await tx.$executeRawUnsafe(`SELECT pg_advisory_xact_lock(hashtext('movecta_poc_sep_007_certificado_${ano}'))`);
  const ultimo = await tx.treinamentoPocSep007.findFirst({
    where: { codigo: { endsWith: `/${ano}` } },
    orderBy: { id: "desc" },
  });
  const numero = ultimo?.codigo ? Number(ultimo.codigo.match(/POC-(\d+)\//)?.[1] || 0) + 1 : 1;
  return `POC-${String(numero).padStart(5, "0")}/${ano}`;
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
    certificadoUrl: registro.certificadoArquivo ? certificadoUrl(registro.token) : null,
  };
}

export async function listarUnidadesTreinamentoPocSep007(req: Request, res: Response) {
  return res.json({ unidades: UNIDADES_SISTEMA });
}

export async function localizarParticipanteTreinamentoPocSep007(req: Request, res: Response) {
  const identificador = texto(req.query.identificador).toLowerCase();
  const cpf = limparCpf(identificador);
  const email = emailValido(identificador) ? identificador : "";

  if (!email && !cpfValido(cpf)) {
    return res.json({ participante: null });
  }

  const usuario = await prisma.usuario.findFirst({
    where: {
      OR: [
        ...(email ? [{ email }] : []),
        ...(cpfValido(cpf) ? [{ cpf }] : []),
      ],
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

export async function iniciarTreinamentoPocSep007(req: Request, res: Response) {
  try {
    const email = emailCorporativo(req.body.email);
    const nomeCompleto = texto(req.body.nomeCompleto);
    const cpf = limparCpf(req.body.cpf);
    const unidade = texto(req.body.unidade);
    if (!dominioMovecta(email)) {
      return res.status(403).json({
        error: "Acesso não autorizado.\n\nEste treinamento é exclusivo para colaboradores da Movecta.\n\nUtilize seu e-mail corporativo (@movecta.com.br). Caso ainda não possua acesso, procure o administrador do sistema.",
      });
    }

    if (!nomeCompleto || !cpfValido(cpf) || !unidadeValida(unidade)) {
      return res.status(400).json({ error: "Informe nome completo, CPF válido, e-mail corporativo e unidade para iniciar." });
    }

    const usuario = await prisma.usuario.findFirst({
      where: {
        OR: [
          { email },
          { cpf },
        ],
      },
    });

    const existente = await prisma.treinamentoPocSep007.findFirst({
      where: {
        OR: [
          { cpf },
          { email },
        ],
      },
      orderBy: { updatedAt: "desc" },
    });

    if (existente) {
      const atualizado = await prisma.treinamentoPocSep007.update({
        where: { id: existente.id },
        data: {
          nomeCompleto,
          cpf,
          email,
          usuarioId: usuario?.id || existente.usuarioId,
          cargo: usuario?.cargo || existente.cargo,
          departamento: usuario?.setor || existente.departamento,
          unidade,
          empresa: usuario?.empresa || existente.empresa || "Movecta",
          ultimoAcessoEm: new Date(),
          navegador: userAgent(req),
        },
      });
      return res.json({ treinamento: respostaPublica(atualizado) });
    }

    const treinamento = await prisma.treinamentoPocSep007.create({
      data: {
        token: randomUUID(),
        usuarioId: usuario?.id,
        nomeCompleto,
        cpf,
        email,
        cargo: usuario?.cargo,
        departamento: usuario?.setor,
        unidade,
        empresa: usuario?.empresa || "Movecta",
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
    return res.status(500).json({ error: "Erro ao iniciar treinamento POC-SEP-007." });
  }
}

export async function concluirEtapaTreinamentoPocSep007(req: Request, res: Response) {
  try {
    const token = texto(req.params.token);
    const etapa = Number(req.body.etapa);
    if (!Number.isInteger(etapa) || etapa < 1 || etapa > TOTAL_ETAPAS_CONTEUDO) {
      return res.status(400).json({ error: "Etapa inválida." });
    }

    const treinamento = await prisma.treinamentoPocSep007.findUnique({ where: { token } });
    if (!treinamento) return res.status(404).json({ error: "Treinamento não encontrado." });
    if (etapa > treinamento.etapaAtual) return res.status(403).json({ error: "Conclua as etapas anteriores antes de avançar." });

    const proximaEtapa = Math.min(TOTAL_ETAPAS, Math.max(treinamento.etapaAtual, etapa + 1));
    const atualizado = await prisma.treinamentoPocSep007.update({
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

export async function responderQuizTreinamentoPocSep007(req: Request, res: Response) {
  try {
    const token = texto(req.params.token);
    const respostas: number[] = Array.isArray(req.body.respostas) ? req.body.respostas.map(Number) : [];
    if (respostas.length !== respostasCorretas.length || respostas.some((item) => !Number.isInteger(item))) {
      return res.status(400).json({ error: "Responda todas as questões para finalizar a avaliação." });
    }

    const treinamento = await prisma.treinamentoPocSep007.findUnique({ where: { token } });
    if (!treinamento) return res.status(404).json({ error: "Treinamento não encontrado." });
    if (treinamento.etapaAtual < TOTAL_ETAPAS) return res.status(403).json({ error: "Conclua todas as etapas antes da avaliação." });

    const acertos = respostas.reduce((total, resposta, index) => total + (resposta === respostasCorretas[index] ? 1 : 0), 0);
    const nota = Math.round((acertos / respostasCorretas.length) * 100);
    const aprovado = nota >= NOTA_MINIMA;

    const atualizado = await prisma.$transaction(async (tx) => {
      return tx.treinamentoPocSep007.update({
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

export async function concluirTreinamentoPocSep007(req: Request, res: Response) {
  try {
    const token = texto(req.params.token);
    const assinaturaDataUrl = texto(req.body.assinaturaDataUrl);
    if (!assinaturaDataUrl.startsWith("data:image/")) {
      return res.status(400).json({ error: "Assinatura inválida." });
    }

    const treinamento = await prisma.treinamentoPocSep007.findUnique({ where: { token } });
    if (!treinamento) return res.status(404).json({ error: "Treinamento não encontrado." });
    if ((treinamento.nota || 0) < NOTA_MINIMA) {
      return res.status(400).json({ error: "A nota mínima para emissão do certificado é 80%." });
    }

    const comCodigo = await prisma.$transaction(async (tx) => {
      const codigo = treinamento.codigo || await proximoCodigo(tx);
      return tx.treinamentoPocSep007.update({
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

    const certificadoArquivo = await gerarCertificadoPocSep007(comCodigo);
    const email = await enviarCertificadoPocSep007(comCodigo, certificadoArquivo);
    const atualizado = await prisma.treinamentoPocSep007.update({
      where: { id: comCodigo.id },
      data: {
        certificadoArquivo,
        emailStatus: email.status,
        emailEnviadoEm: email.enviado ? new Date() : comCodigo.emailEnviadoEm,
      },
    });

    return res.json({
      mensagem: email.enviado ? "Certificado emitido e enviado por e-mail." : "Certificado emitido. O envio por e-mail não foi confirmado.",
      treinamento: respostaPublica(atualizado),
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro ao concluir treinamento POC-SEP-007." });
  }
}

export async function listarTreinamentosPocSep007(req: AuthRequest, res: Response) {
  const treinamentos = await prisma.treinamentoPocSep007.findMany({
    orderBy: { updatedAt: "desc" },
    take: 300,
  });

  return res.json(treinamentos.map((item) => ({
    ...item,
    assinaturaDataUrl: undefined,
    certificadoUrl: item.certificadoArquivo ? certificadoUrl(item.token) : null,
  })));
}

export async function reenviarEmailTreinamentoPocSep007(req: AuthRequest, res: Response) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ error: "Treinamento inválido." });

    const treinamento = await prisma.treinamentoPocSep007.findUnique({ where: { id } });
    if (!treinamento) return res.status(404).json({ error: "Treinamento não encontrado." });
    if (!treinamentoConcluido(treinamento.status) || !treinamento.codigo) {
      return res.status(400).json({ error: "O e-mail só pode ser reenviado após a conclusão do treinamento." });
    }

    const certificadoArquivo = treinamento.certificadoArquivo && fs.existsSync(treinamento.certificadoArquivo)
      ? treinamento.certificadoArquivo
      : await gerarCertificadoPocSep007(treinamento);
    const email = await enviarCertificadoPocSep007(treinamento, certificadoArquivo);

    const atualizado = await prisma.treinamentoPocSep007.update({
      where: { id: treinamento.id },
      data: {
        certificadoArquivo,
        emailStatus: email.status,
        emailEnviadoEm: email.enviado ? new Date() : treinamento.emailEnviadoEm,
      },
    });

    return res.json({
      mensagem: email.enviado ? "E-mail enviado com sucesso." : "Envio registrado. Verifique a configuração de SMTP.",
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

export async function excluirTreinamentoPocSep007(req: AuthRequest, res: Response) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ error: "Treinamento inválido." });

    const treinamento = await prisma.treinamentoPocSep007.findUnique({ where: { id } });
    if (!treinamento) return res.status(404).json({ error: "Treinamento não encontrado." });

    if (treinamento.certificadoArquivo && fs.existsSync(treinamento.certificadoArquivo)) {
      fs.rmSync(treinamento.certificadoArquivo, { force: true });
    }

    await prisma.treinamentoPocSep007.delete({ where: { id } });

    return res.status(204).send();
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro ao excluir treinamento." });
  }
}

export async function baixarCertificadoPocSep007(req: Request, res: Response) {
  try {
    const token = texto(req.params.token);
    const treinamento = await prisma.treinamentoPocSep007.findUnique({ where: { token } });
    if (!treinamento || !treinamentoConcluido(treinamento.status)) {
      return res.status(404).json({ error: "Certificado não encontrado." });
    }

    const certificadoArquivo = treinamento.certificadoArquivo && fs.existsSync(treinamento.certificadoArquivo)
      ? treinamento.certificadoArquivo
      : await gerarCertificadoPocSep007(treinamento);

    if (!treinamento.certificadoArquivo) {
      await prisma.treinamentoPocSep007.update({
        where: { id: treinamento.id },
        data: { certificadoArquivo },
      });
    }

    return res.download(certificadoArquivo, `certificado-${String(treinamento.codigo || "poc-sep-007").replace("/", "-")}.pdf`);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro ao baixar certificado." });
  }
}
