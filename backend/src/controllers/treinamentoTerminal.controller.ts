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
  "A Portaria ALF/STS no 205, de 22 de junho de 2026, condiciona o credenciamento de pessoas para ingresso em recintos alfandegados sob jurisdição da Alfândega da Receita Federal do Brasil do Porto de Santos à conclusão do curso básico de conhecimentos aduaneiros previsto na Portaria Coana no 185/2026.",
];

const assinaturaSegurancaPatrimonial = path.resolve(process.cwd(), "assets", "assinatura-seguranca-patrimonial.jpeg");
const rodapeCertificado =
  "Curso básico de conhecimentos aduaneiros como requisito para o credenciamento de pessoas para ingresso em recintos alfandegados";

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

function limparTelefone(valor: string) {
  return String(valor || "").replace(/[^\d+]/g, "");
}

function texto(valor: unknown) {
  return String(valor || "").trim();
}

function videoPadrao() {
  return process.env.TREINAMENTO_TERMINAL_VIDEO_URL || "/videos/treinamento-terminal.mp4";
}

function appPublicUrl() {
  return String(process.env.PUBLIC_APP_URL || process.env.APP_URL || process.env.FRONTEND_URL || "https://movecta.jetguard.com.br").replace(/\/$/, "");
}

function urlValidacaoCertificado(token: string) {
  return `${appPublicUrl()}/validar-certificado/${token}`;
}

function treinamentoConcluido(status?: string | null) {
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
  return data.toLocaleDateString("pt-BR");
}

function dataPorExtenso(data: Date) {
  return data.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

async function proximoCodigo() {
  const ano = new Date().getFullYear();
  const ultimo = await prisma.treinamentoTerminal.findFirst({
    where: { codigo: { endsWith: `/${ano}` } },
    orderBy: { id: "desc" },
  });
  const numero = ultimo ? Number(ultimo.codigo.match(/CERT-(\d+)\//)?.[1] || 0) + 1 : 1;
  return `CERT-${String(numero).padStart(5, "0")}/${ano}`;
}

function arquivoCertificado(token: string) {
  const pasta = path.resolve(process.cwd(), "uploads", "certificados-treinamento");
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
    doc.image(assinaturaSegurancaPatrimonial, x + 30, y - 74, {
      cover: [largura - 60, 68],
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

async function gerarCertificadoPdf(treinamento: any) {
  const destino = arquivoCertificado(treinamento.token);
  const destinoTemporario = `${destino}.tmp`;
  fs.rmSync(destinoTemporario, { force: true });
  const doc = new PDFDocument({ size: "A4", layout: "landscape", margin: 0, bufferPages: true });
  const stream = fs.createWriteStream(destinoTemporario);
  doc.pipe(stream);

  const pageWidth = doc.page.width;
  const pageHeight = doc.page.height;
  const concluidoEm = new Date(treinamento.concluidoEm || new Date());
  const validacaoUrl = urlValidacaoCertificado(treinamento.token);
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
  doc.fillColor("#1d4ed8").font("Helvetica-Bold").fontSize(15).text(treinamento.codigo, pageWidth - 204, 44, { width: 146, align: "center" });

  const textoPrincipal = `Certificamos que o(a) colaborador(a) ${treinamento.nomeCompleto} participou do programa Portas Abertas da Movecta S.A em ${dataCurta(concluidoEm)}.`;
  doc.fillColor("#111827").font("Helvetica").fontSize(18).text(textoPrincipal, 178, 198, {
    width: 500,
    align: "center",
    lineGap: 8,
  });

  doc.fillColor("#111827").font("Helvetica-Bold").fontSize(17).text(`Guarujá, ${dataPorExtenso(concluidoEm)}.`, 210, 295, {
    width: 430,
    align: "center",
  });

  if (treinamento.assinaturaDataUrl) {
    const assinaturaBase64 = String(treinamento.assinaturaDataUrl).split(",")[1];
    if (assinaturaBase64) {
      const buffer = Buffer.from(assinaturaBase64, "base64");
      const assinaturaPng = path.join(path.dirname(destino), `assinatura-${treinamento.token}.png`);
      fs.writeFileSync(assinaturaPng, buffer);
      doc.image(assinaturaPng, 176, 356, { fit: [240, 52], align: "center" });
      fs.rmSync(assinaturaPng, { force: true });
    }
  }

  desenharLinhaAssinatura(doc, 158, 415, 275, treinamento.nomeCompleto, "Participante");
  desenharAssinaturaInstitucional(doc, 472, 415, 275);

  doc.image(qrCode, 700, 248, { width: 82, height: 82 });
  doc.fillColor("#334155").font("Helvetica-Bold").fontSize(7).text("VALIDACAO", 696, 336, { width: 90, align: "center" });
  doc.fillColor("#64748b").font("Helvetica").fontSize(6.5).text("Aponte a camera para confirmar a autenticidade deste certificado na plataforma.", 686, 348, { width: 116, align: "center", lineGap: 1 });

  doc.moveTo(206, 505).lineTo(580, 505).strokeColor("#86b91d").lineWidth(1).stroke();
  doc.circle(206, 505, 3).fill("#86b91d");
  doc.circle(580, 505, 3).fill("#86b91d");

  if (fs.existsSync(pdfAssets.logo)) {
    doc.image(pdfAssets.logo, 610, 488, { fit: [150, 46], align: "center" });
  } else {
    doc.fillColor("#356bad").font("Helvetica-Bold").fontSize(22).text("Movecta", 618, 492, { width: 140, align: "center" });
  }

  doc.fillColor("#334155").font("Helvetica-Bold").fontSize(8).text(rodapeCertificado, 58, pageHeight - 44, {
    width: pageWidth - 116,
    align: "center",
  });
  doc.fillColor("#64748b").font("Helvetica").fontSize(7).text(`Validação: ${validacaoUrl}`, 44, pageHeight - 26, { width: pageWidth - 88, align: "center", ellipsis: true });
  doc.end();

  await new Promise<void>((resolve, reject) => {
    stream.on("finish", resolve);
    stream.on("error", reject);
  });
  fs.renameSync(destinoTemporario, destino);

  return destino;
}

function respostaPublica(treinamento: any) {
  return {
    token: treinamento.token,
    codigo: treinamento.codigo,
    nomeCompleto: treinamento.nomeCompleto,
    cpf: treinamento.cpf,
    email: treinamento.email,
    etapa: treinamento.etapa,
    status: treinamento.status,
    progressoSegundos: treinamento.progressoSegundos,
    duracaoSegundos: treinamento.duracaoSegundos,
    videoConcluido: treinamento.videoConcluido,
    aceiteDeclaracao: treinamento.aceiteDeclaracao,
    certificadoUrl: treinamento.certificadoArquivo ? `/api/public/treinamento-terminal/${treinamento.token}/certificado` : null,
  };
}

export function configTreinamentoTerminal(req: Request, res: Response) {
  return res.json({
    titulo: "Treinamento de acesso ao terminal",
    portaria: "Portaria ALF/STS no 205, de 22 de junho de 2026",
    resumo: resumoPortaria,
    videoUrl: videoPadrao(),
  });
}

export async function iniciarTreinamentoTerminal(req: Request, res: Response) {
  try {
    const cpf = limparCpf(req.body.cpf);
    const email = texto(req.body.email).toLowerCase();
    const dataNascimento = new Date(req.body.dataNascimento);

    if (!texto(req.body.nomeCompleto) || !cpfValido(cpf) || !email || Number.isNaN(dataNascimento.getTime())) {
      return res.status(400).json({ error: "Informe nome completo, CPF válido, e-mail e data de nascimento." });
    }

    if (idade(dataNascimento) < 18) {
      return res.status(400).json({ error: "O treinamento e recomendado apenas para maiores de 18 anos." });
    }

    const existente = await prisma.treinamentoTerminal.findFirst({
      where: { cpf },
      orderBy: { updatedAt: "desc" },
    });

    if (existente) {
      const concluido = treinamentoConcluido(existente.status);
      const atualizado = await prisma.treinamentoTerminal.update({
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
        treinamento: respostaPublica(atualizado),
        emAndamento: !concluido,
        concluido,
      });
    }

    const treinamento = await prisma.treinamentoTerminal.create({
      data: {
        token: randomUUID(),
        codigo: await proximoCodigo(),
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

    return res.status(201).json({ treinamento: respostaPublica(treinamento), emAndamento: false });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro ao iniciar treinamento." });
  }
}

export async function atualizarProgressoTreinamento(req: Request, res: Response) {
  try {
    const token = String(req.params.token || "");
    const treinamento = await prisma.treinamentoTerminal.findUnique({ where: { token } });
    if (!treinamento) return res.status(404).json({ error: "Treinamento não encontrado." });
    if (treinamentoConcluido(treinamento.status)) return res.json({ treinamento: respostaPublica(treinamento) });

    const progresso = Math.max(0, Math.floor(Number(req.body.progressoSegundos || 0)));
    const duracao = Math.max(treinamento.duracaoSegundos || 0, Math.floor(Number(req.body.duracaoSegundos || 0)));
    const videoConcluido = Boolean(req.body.videoConcluido) || (duracao > 0 && progresso >= Math.max(0, duracao - 2));

    const atualizado = await prisma.treinamentoTerminal.update({
      where: { id: treinamento.id },
      data: {
        progressoSegundos: Math.max(treinamento.progressoSegundos, progresso),
        duracaoSegundos: duracao,
        videoConcluido,
        etapa: videoConcluido ? "declaracao" : "video",
        ultimoAcessoEm: new Date(),
      },
    });

    return res.json({ treinamento: respostaPublica(atualizado) });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro ao atualizar progresso." });
  }
}

export async function concluirTreinamentoTerminal(req: Request, res: Response) {
  try {
    const token = String(req.params.token || "");
    const treinamento = await prisma.treinamentoTerminal.findUnique({ where: { token } });
    if (!treinamento) return res.status(404).json({ error: "Treinamento não encontrado." });
    if (!treinamento.videoConcluido) return res.status(400).json({ error: "Conclua o vídeo antes de emitir o certificado." });
    if (!req.body.aceiteDeclaracao) return res.status(400).json({ error: "Confirme a declaração de ciência." });
    if (!texto(req.body.assinaturaDataUrl).startsWith("data:image/png;base64,")) {
      return res.status(400).json({ error: "Informe a assinatura eletrônica." });
    }

    let atualizado = await prisma.treinamentoTerminal.update({
      where: { id: treinamento.id },
      data: {
        aceiteDeclaracao: true,
        assinaturaDataUrl: texto(req.body.assinaturaDataUrl),
        etapa: "concluido",
        status: "Concluido",
        concluidoEm: treinamento.concluidoEm || new Date(),
        ultimoAcessoEm: new Date(),
      },
    });

    const certificadoArquivo = await gerarCertificadoPdf(atualizado);
    const email = await enviarEmail({
      to: atualizado.email,
      subject: `Certificado de treinamento - ${atualizado.codigo}`,
      text: `Olá, ${atualizado.nomeCompleto}. Segue em anexo o certificado de conclusão do treinamento de acesso ao terminal.`,
      html: `<p>Olá, <strong>${atualizado.nomeCompleto}</strong>.</p><p>Segue em anexo o certificado de conclusão do treinamento de acesso ao terminal.</p>`,
      attachments: [{ filename: `certificado-${atualizado.codigo.replace("/", "-")}.pdf`, path: certificadoArquivo, contentType: "application/pdf" }],
    });

    atualizado = await prisma.treinamentoTerminal.update({
      where: { id: atualizado.id },
      data: {
        certificadoArquivo,
        emailStatus: email.status,
        emailEnviadoEm: email.enviado ? new Date() : null,
      },
    });

    return res.json({ treinamento: respostaPublica(atualizado) });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro ao concluir treinamento." });
  }
}

export async function baixarCertificadoTreinamento(req: Request, res: Response) {
  const token = String(req.params.token || "");
  const treinamento = await prisma.treinamentoTerminal.findUnique({ where: { token } });
  if (!treinamento || !treinamentoConcluido(treinamento.status)) {
    return res.status(404).json({ error: "Certificado não encontrado." });
  }

  let certificadoArquivo = treinamento.certificadoArquivo;
  const precisaRegenerar =
    !certificadoArquivo ||
    !fs.existsSync(certificadoArquivo) ||
    fs.statSync(certificadoArquivo).size < 1024;

  if (precisaRegenerar) {
    certificadoArquivo = await gerarCertificadoPdf(treinamento);
    await prisma.treinamentoTerminal.update({
      where: { id: treinamento.id },
      data: { certificadoArquivo },
    });
  }

  if (!certificadoArquivo) {
    return res.status(404).json({ error: "Certificado não encontrado." });
  }

  return res.download(certificadoArquivo, `certificado-${treinamento.codigo.replace("/", "-")}.pdf`);
}

export async function validarCertificadoTreinamento(req: Request, res: Response) {
  const token = String(req.params.token || "");
  const treinamento = await prisma.treinamentoTerminal.findUnique({ where: { token } });
  if (!treinamento || !treinamentoConcluido(treinamento.status) || !treinamento.certificadoArquivo) {
    return res.status(404).json({ error: "Certificado não encontrado ou ainda não emitido." });
  }

  return res.json({
    valido: true,
    codigo: treinamento.codigo,
    nomeCompleto: treinamento.nomeCompleto,
    cpf: treinamento.cpf,
    empresa: treinamento.empresa,
    cargo: treinamento.cargo,
    email: treinamento.email,
    concluidoEm: treinamento.concluidoEm,
    certificadoUrl: `/api/public/treinamento-terminal/${treinamento.token}/certificado`,
  });
}

export async function listarTreinamentosTerminal(req: AuthRequest, res: Response) {
  const treinamentos = await prisma.treinamentoTerminal.findMany({
    orderBy: { updatedAt: "desc" },
    take: 300,
  });

  return res.json(treinamentos.map((item) => ({
    ...item,
    assinaturaDataUrl: undefined,
    certificadoUrl: item.certificadoArquivo ? `/api/public/treinamento-terminal/${item.token}/certificado` : null,
  })));
}

export async function excluirTreinamentoTerminal(req: AuthRequest, res: Response) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ error: "Treinamento inválido." });

    const treinamento = await prisma.treinamentoTerminal.findUnique({ where: { id } });
    if (!treinamento) return res.status(404).json({ error: "Treinamento não encontrado." });

    if (treinamento.certificadoArquivo && fs.existsSync(treinamento.certificadoArquivo)) {
      fs.rmSync(treinamento.certificadoArquivo, { force: true });
    }

    await prisma.treinamentoTerminal.delete({ where: { id } });

    return res.status(204).send();
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro ao excluir treinamento." });
  }
}
