import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { Request, Response } from "express";
import PDFDocument from "pdfkit";
import QRCode from "qrcode";
import { prisma } from "../lib/prisma";
import { AuthRequest } from "../middlewares/auth";
import { pdfAssets } from "../services/documentoPdfBase.service";
import { enviarEmail } from "../services/email.service";

const resumoPortaria = [
  "Integracao operacional para motoristas que acessam os Terminais Movecta Guaruja, com orientacoes de seguranca, circulacao, conduta no patio e conformidade operacional.",
];

const respostasQuiz = [false, false, false, true, true];
const assinaturaSegurancaPatrimonial = path.resolve(process.cwd(), "assets", "assinatura-seguranca-patrimonial.png");

function limparCpf(cpf: string) {
  return String(cpf || "").replace(/\D/g, "");
}

function formatarCpf(cpf: string) {
  const digitos = limparCpf(cpf);
  if (digitos.length !== 11) return cpf || "-";
  return digitos.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
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

function limparTelefone(valor: string) {
  return String(valor || "").replace(/[^\d+]/g, "");
}

function texto(valor: unknown) {
  return String(valor || "").trim();
}

function emailValido(email: string) {
  const normalizado = String(email || "").trim();
  if (!normalizado || normalizado.length > 254 || normalizado.includes("..")) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(normalizado);
}

function videoPadrao() {
  return process.env.INTEGRACAO_TERMINAL_VIDEO_URL || "/videos/video-integracao.mp4";
}

function appPublicUrl() {
  return String(process.env.PUBLIC_APP_URL || process.env.APP_URL || process.env.FRONTEND_URL || "https://movecta.jetguard.com.br").replace(/\/$/, "");
}

function urlValidacaoCertificado(token: string) {
  return `${appPublicUrl()}/validar-integracao/${token}`;
}

function integracaoConcluido(status?: string | null) {
  return String(status || "").toLowerCase().startsWith("conclu");
}

function idade(data: Date) {
  const hoje = new Date();
  let anos = hoje.getFullYear() - data.getFullYear();
  const mes = hoje.getMonth() - data.getMonth();
  if (mes < 0 || (mes === 0 && hoje.getDate() < data.getDate())) anos -= 1;
  return anos;
}

function dataCurta(data: Date) {
  return data.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
}

function dataPorExtenso(data: Date) {
  return data.toLocaleDateString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

async function proximoCodigo(tx: any) {
  const ano = new Date().getFullYear();
  await tx.$executeRawUnsafe(`SELECT pg_advisory_xact_lock(hashtext('movecta_integracao_terminal_certificado_${ano}'))`);
  const ultimo = await tx.integracaoTerminal.findFirst({
    where: { codigo: { endsWith: `/${ano}` } },
    orderBy: { id: "desc" },
  });
  const numero = ultimo?.codigo ? Number(ultimo.codigo.match(/INT-(\d+)\//)?.[1] || 0) + 1 : 1;
  return `INT-${String(numero).padStart(5, "0")}/${ano}`;
}

async function garantirCodigoIntegracao(integracao: { id: number; codigo?: string | null }) {
  if (integracao.codigo) return integracao.codigo;
  const atualizado = await prisma.$transaction(async (tx) => {
    const codigo = await proximoCodigo(tx);
    return tx.integracaoTerminal.update({
      where: { id: integracao.id },
      data: { codigo },
    });
  });
  return atualizado.codigo || "";
}

function arquivoCertificado(token: string) {
  const pasta = path.resolve(process.cwd(), "uploads", "certificados-integracao");
  fs.mkdirSync(pasta, { recursive: true });
  return path.join(pasta, `certificado-${token}.pdf`);
}

function desenharLinhaAssinatura(doc: PDFKit.PDFDocument, x: number, y: number, largura: number, nome: string, cargo: string) {
  doc.moveTo(x, y).lineTo(x + largura, y).strokeColor("#2f6bb2").lineWidth(1).stroke();
  doc.fillColor("#111827").font("Helvetica-Bold").fontSize(9).text(nome, x, y + 12, { width: largura, align: "center" });
  doc.fillColor("#111827").font("Helvetica").fontSize(8).text(cargo, x, y + 27, { width: largura, align: "center" });
}

function desenharAssinaturaInstitucional(doc: PDFKit.PDFDocument, x: number, y: number, largura: number) {
  if (fs.existsSync(assinaturaSegurancaPatrimonial)) {
    doc.image(assinaturaSegurancaPatrimonial, x + 45, y - 58, {
      fit: [largura - 90, 54],
      align: "center",
      valign: "center",
    });
  }

  doc.moveTo(x, y).lineTo(x + largura, y).strokeColor("#2f6bb2").lineWidth(1).stroke();
  doc.fillColor("#111827").font("Helvetica-Bold").fontSize(9.5).text("Segurança Patrimonial", x, y + 12, {
    width: largura,
    align: "center",
  });
  doc.fillColor("#111827").font("Helvetica").fontSize(8.5).text("Movecta S.A", x, y + 28, {
    width: largura,
    align: "center",
  });
}

async function gerarCertificadoPdf(integracao: any) {
  const destino = arquivoCertificado(integracao.token);
  const destinoTemporario = `${destino}.tmp`;
  fs.rmSync(destinoTemporario, { force: true });
  const doc = new PDFDocument({ size: "A4", layout: "landscape", margin: 0, bufferPages: true });
  const stream = fs.createWriteStream(destinoTemporario);
  doc.pipe(stream);

  const pageWidth = doc.page.width;
  const pageHeight = doc.page.height;
  const concluidoEm = new Date(integracao.concluidoEm || new Date());
  const validacaoUrl = urlValidacaoCertificado(integracao.token);
  const qrCodeDataUrl = await QRCode.toDataURL(validacaoUrl, {
    width: 220,
    margin: 1,
    color: { dark: "#0f172a", light: "#ffffff" },
  });
  const qrCode = Buffer.from(String(qrCodeDataUrl).split(",")[1], "base64");

  doc.rect(0, 0, pageWidth, pageHeight).fill("#ffffff");
  doc.rect(0, 0, pageWidth, 142).fill("#356bad");
  doc.save();
  doc.fillColor("#ffffff").path("M300 142 L430 30 C472 -8 534 15 536 78 L536 132 C536 139 542 144 548 138 L674 32 C720 -7 783 17 785 80 L785 142 Z").fill();
  doc.restore();

  doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(34).text("CERTIFICADO", 44, 58, { width: 270, lineBreak: false });
  doc.roundedRect(pageWidth - 218, 34, 174, 34, 10).fillAndStroke("#ffffff", "#bfdbfe");
  doc.fillColor("#1d4ed8").font("Helvetica-Bold").fontSize(15).text(integracao.codigo, pageWidth - 204, 44, { width: 146, align: "center" });

  const textoPrincipal = `Certificamos que o(a) motorista ${integracao.nomeCompleto}, portador(a) do CPF nº ${formatarCpf(integracao.cpf)}, concluiu com aproveitamento o Treinamento de Integração de Segurança. O profissional está apto a realizar o ingresso, trânsito e operações de transporte nos Terminais Alfandegados da Movecta Guarujá (Terminal 1 e Terminal 2), estando ciente das normas internas de circulação, procedimentos de segurança portuária e diretrizes de compliance da companhia.`;
  doc.fillColor("#111827").font("Helvetica").fontSize(14.5).text(textoPrincipal, 150, 178, {
    width: 548,
    align: "center",
    lineGap: 5,
  });

  doc.fillColor("#111827").font("Helvetica-Bold").fontSize(15.5).text(`Guaruja, ${dataPorExtenso(concluidoEm)}.`, 210, 314, {
    width: 430,
    align: "center",
  });

  if (integracao.assinaturaDataUrl) {
    const assinaturaBase64 = String(integracao.assinaturaDataUrl).split(",")[1];
    if (assinaturaBase64) {
      const buffer = Buffer.from(assinaturaBase64, "base64");
      const assinaturaPng = path.join(path.dirname(destino), `assinatura-${integracao.token}.png`);
      fs.writeFileSync(assinaturaPng, buffer);
      doc.image(assinaturaPng, 176, 356, { fit: [240, 52], align: "center" });
      fs.rmSync(assinaturaPng, { force: true });
    }
  }

  desenharLinhaAssinatura(doc, 158, 415, 275, integracao.nomeCompleto, "Motorista");
  desenharAssinaturaInstitucional(doc, 472, 415, 275);

  doc.image(qrCode, 58, 424, { width: 72, height: 72 });
  doc.fillColor("#334155").font("Helvetica-Bold").fontSize(7).text("VALIDACAO", 49, 502, { width: 90, align: "center" });

  doc.moveTo(206, 505).lineTo(580, 505).strokeColor("#86b91d").lineWidth(1).stroke();
  doc.circle(206, 505, 3).fill("#86b91d");
  doc.circle(580, 505, 3).fill("#86b91d");

  if (fs.existsSync(pdfAssets.logo)) {
    doc.image(pdfAssets.logo, 610, 488, { fit: [150, 46], align: "center" });
  } else {
    doc.fillColor("#356bad").font("Helvetica-Bold").fontSize(22).text("Movecta", 618, 492, { width: 140, align: "center" });
  }

  doc.fillColor("#64748b").font("Helvetica").fontSize(7).text(`Validacao: ${validacaoUrl}`, 44, pageHeight - 26, { width: pageWidth - 88, align: "center", ellipsis: true });
  doc.end();

  await new Promise<void>((resolve, reject) => {
    stream.on("finish", resolve);
    stream.on("error", reject);
  });
  fs.renameSync(destinoTemporario, destino);

  return destino;
}

function respostaPublica(integracao: any) {
  return {
    token: integracao.token,
    codigo: integracao.codigo,
    nomeCompleto: integracao.nomeCompleto,
    cpf: integracao.cpf,
    email: integracao.email,
    etapa: integracao.etapa,
    status: integracao.status,
    progressoSegundos: integracao.progressoSegundos,
    duracaoSegundos: integracao.duracaoSegundos,
    videoConcluido: integracao.videoConcluido,
    quizAprovado: integracao.quizAprovado,
    aceiteDeclaracao: integracao.aceiteDeclaracao,
    certificadoUrl: integracao.certificadoArquivo ? `/api/public/integracao-terminal/${integracao.token}/certificado` : null,
  };
}

export function configIntegracaoTerminal(req: Request, res: Response) {
  return res.json({
    titulo: "Integração de Motoristas",
    portaria: "Integração de Motoristas",
    resumo: resumoPortaria,
    videoUrl: videoPadrao(),
  });
}

export async function iniciarIntegracaoTerminal(req: Request, res: Response) {
  try {
    const cpf = limparCpf(req.body.cpf);
    const email = texto(req.body.email).toLowerCase();
    const dataNascimento = new Date(req.body.dataNascimento);

    if (!texto(req.body.nomeCompleto) || !cpfValido(cpf) || !emailValido(email) || Number.isNaN(dataNascimento.getTime())) {
      return res.status(400).json({ error: "Informe nome completo, CPF valido, e-mail e data de nascimento." });
    }

    if (idade(dataNascimento) < 18) {
      return res.status(400).json({ error: "A integracao e recomendada apenas para maiores de 18 anos." });
    }

    const existente = await prisma.integracaoTerminal.findFirst({
      where: { cpf },
      orderBy: { updatedAt: "desc" },
    });

    if (existente) {
      const concluido = integracaoConcluido(existente.status);
      const atualizado = await prisma.integracaoTerminal.update({
        where: { id: existente.id },
        data: concluido
          ? { ultimoAcessoEm: new Date() }
          : {
              nomeCompleto: texto(req.body.nomeCompleto),
              dataNascimento,
              empresa: texto(req.body.empresa),
              cargo: texto(req.body.cargo),
              email,
              telefone: limparTelefone(req.body.telefone),
              ultimoAcessoEm: new Date(),
            },
      });
      return res.json({
        integracao: respostaPublica(atualizado),
        emAndamento: !concluido,
        concluido,
      });
    }

    const integracao = await prisma.integracaoTerminal.create({
      data: {
        token: randomUUID(),
        nomeCompleto: texto(req.body.nomeCompleto),
        cpf,
        dataNascimento,
        empresa: texto(req.body.empresa),
        cargo: texto(req.body.cargo),
        email,
        telefone: limparTelefone(req.body.telefone),
        videoUrl: videoPadrao(),
        etapa: "video",
      },
    });

    return res.status(201).json({ integracao: respostaPublica(integracao), emAndamento: false });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro ao iniciar integracao." });
  }
}

export async function atualizarProgressoIntegracao(req: Request, res: Response) {
  try {
    const token = String(req.params.token || "");
    const integracao = await prisma.integracaoTerminal.findUnique({ where: { token } });
    if (!integracao) return res.status(404).json({ error: "Integracao nao encontrada." });
    if (integracaoConcluido(integracao.status)) return res.json({ integracao: respostaPublica(integracao) });

    const progresso = Math.max(0, Math.floor(Number(req.body.progressoSegundos || 0)));
    const duracao = Math.max(integracao.duracaoSegundos || 0, Math.floor(Number(req.body.duracaoSegundos || 0)));
    const videoConcluido = Boolean(req.body.videoConcluido) || (duracao > 0 && progresso >= Math.max(0, duracao - 2));

    const atualizado = await prisma.integracaoTerminal.update({
      where: { id: integracao.id },
      data: {
        progressoSegundos: Math.max(integracao.progressoSegundos, progresso),
        duracaoSegundos: duracao,
        videoConcluido,
        etapa: videoConcluido ? "quiz" : "video",
        ultimoAcessoEm: new Date(),
      },
    });

    return res.json({ integracao: respostaPublica(atualizado) });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro ao atualizar progresso." });
  }
}

export async function responderQuizIntegracao(req: Request, res: Response) {
  try {
    const token = String(req.params.token || "");
    const integracao = await prisma.integracaoTerminal.findUnique({ where: { token } });
    if (!integracao) return res.status(404).json({ error: "Integracao nao encontrada." });
    if (!integracao.videoConcluido) return res.status(400).json({ error: "Conclua o video antes de responder o quiz." });
    if (integracaoConcluido(integracao.status)) return res.json({ integracao: respostaPublica(integracao) });

    const respostas: boolean[] = Array.isArray(req.body.respostas) ? req.body.respostas.map(Boolean) : [];
    const aprovado = respostas.length === respostasQuiz.length && respostas.every((resposta: boolean, index: number) => resposta === respostasQuiz[index]);
    if (!aprovado) {
      const questoesIncorretas = respostasQuiz
        .map((correta, index) => ({ numero: index + 1, correta, resposta: respostas[index] }))
        .filter((item) => item.resposta !== item.correta);
      await prisma.integracaoTerminal.update({
        where: { id: integracao.id },
        data: {
          quizAprovado: false,
          respostasQuiz: JSON.stringify(respostas),
          etapa: "quiz",
          ultimoAcessoEm: new Date(),
        },
      });
      return res.status(400).json({
        error: "Revise as respostas destacadas para continuar.",
        questoesIncorretas,
      });
    }

    const atualizado = await prisma.integracaoTerminal.update({
      where: { id: integracao.id },
      data: {
        quizAprovado: true,
        respostasQuiz: JSON.stringify(respostas),
        etapa: "declaracao",
        ultimoAcessoEm: new Date(),
      },
    });

    return res.json({ integracao: respostaPublica(atualizado) });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro ao validar quiz." });
  }
}

export async function concluirIntegracaoTerminal(req: Request, res: Response) {
  try {
    const token = String(req.params.token || "");
    const integracao = await prisma.integracaoTerminal.findUnique({ where: { token } });
    if (!integracao) return res.status(404).json({ error: "Integracao nao encontrada." });
    if (!integracao.videoConcluido) return res.status(400).json({ error: "Conclua o video antes de emitir o certificado." });
    if (!integracao.quizAprovado) return res.status(400).json({ error: "Responda corretamente o quiz antes de emitir o certificado." });
    if (!req.body.aceiteDeclaracao) return res.status(400).json({ error: "Confirme a declaracao de ciencia." });
    if (!texto(req.body.assinaturaDataUrl).startsWith("data:image/png;base64,")) {
      return res.status(400).json({ error: "Informe a assinatura eletronica." });
    }

    let atualizado = await prisma.$transaction(async (tx) => {
      const codigo = integracao.codigo || (await proximoCodigo(tx));
      return tx.integracaoTerminal.update({
        where: { id: integracao.id },
        data: {
          codigo,
          aceiteDeclaracao: true,
          assinaturaDataUrl: texto(req.body.assinaturaDataUrl),
          etapa: "concluido",
          status: "Concluido",
          concluidoEm: integracao.concluidoEm || new Date(),
          ultimoAcessoEm: new Date(),
        },
      });
    });

    const certificadoArquivo = await gerarCertificadoPdf(atualizado);
    const codigoCertificado = atualizado.codigo || "";
    const email = await enviarEmail({
      to: atualizado.email,
      subject: `Certificado de Integração de Motoristas - ${codigoCertificado}`,
      text: `Olá, ${atualizado.nomeCompleto}. Segue em anexo o certificado de conclusão da Integração de Motoristas.`,
      html: `<p>Olá, <strong>${atualizado.nomeCompleto}</strong>.</p><p>Segue em anexo o certificado de conclusão da Integração de Motoristas.</p>`,
      attachments: [{ filename: `certificado-${codigoCertificado.replace("/", "-")}.pdf`, path: certificadoArquivo, contentType: "application/pdf" }],
    });

    atualizado = await prisma.integracaoTerminal.update({
      where: { id: atualizado.id },
      data: {
        certificadoArquivo,
        emailStatus: email.status,
        emailEnviadoEm: email.enviado ? new Date() : null,
      },
    });

    return res.json({ integracao: respostaPublica(atualizado) });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro ao concluir integracao." });
  }
}

export async function baixarCertificadoIntegracao(req: Request, res: Response) {
  const token = String(req.params.token || "");
  const integracao = await prisma.integracaoTerminal.findUnique({ where: { token } });
  if (!integracao?.certificadoArquivo || !fs.existsSync(integracao.certificadoArquivo)) {
    return res.status(404).json({ error: "Certificado nao encontrado." });
  }

  const codigo = await garantirCodigoIntegracao(integracao);
  return res.download(integracao.certificadoArquivo, `certificado-${codigo.replace("/", "-")}.pdf`);
}

export async function validarCertificadoIntegracao(req: Request, res: Response) {
  const token = String(req.params.token || "");
  const integracao = await prisma.integracaoTerminal.findUnique({ where: { token } });
  if (!integracao || !integracaoConcluido(integracao.status) || !integracao.certificadoArquivo) {
    return res.status(404).json({ error: "Certificado nao encontrado ou ainda nao emitido." });
  }

  return res.json({
    valido: true,
    token: integracao.token,
    codigo: integracao.codigo,
    nomeCompleto: integracao.nomeCompleto,
    cpf: integracao.cpf,
    empresa: integracao.empresa,
    cargo: integracao.cargo,
    email: integracao.email,
    concluidoEm: integracao.concluidoEm,
    certificadoUrl: `/api/public/integracao-terminal/${integracao.token}/certificado`,
  });
}

export async function listarIntegracoesTerminal(req: AuthRequest, res: Response) {
  const integracoes = await prisma.integracaoTerminal.findMany({
    orderBy: { updatedAt: "desc" },
    take: 300,
  });

  return res.json(integracoes.map((item) => ({
    ...item,
    assinaturaDataUrl: undefined,
    certificadoUrl: item.certificadoArquivo ? `/api/public/integracao-terminal/${item.token}/certificado` : null,
  })));
}

export async function excluirIntegracaoTerminal(req: AuthRequest, res: Response) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ error: "Integracao invalida." });

    const integracao = await prisma.integracaoTerminal.findUnique({ where: { id } });
    if (!integracao) return res.status(404).json({ error: "Integracao nao encontrada." });

    if (integracao.certificadoArquivo && fs.existsSync(integracao.certificadoArquivo)) {
      fs.rmSync(integracao.certificadoArquivo, { force: true });
    }

    await prisma.integracaoTerminal.delete({ where: { id } });

    return res.status(204).send();
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro ao excluir integracao." });
  }
}
