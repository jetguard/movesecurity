import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { Request, Response } from "express";
import PDFDocument from "pdfkit";
import { prisma } from "../lib/prisma";
import { AuthRequest } from "../middlewares/auth";
import { desenharCabecalhoPadrao, desenharRodapeAssinaturaPadrao, pdfTheme } from "../services/documentoPdfBase.service";
import { enviarEmail } from "../services/email.service";

const resumoPortaria = [
  "A Portaria ALF/STS nº 205, de 22 de junho de 2026, condiciona o credenciamento de pessoas para ingresso em recintos alfandegados sob jurisdição da Alfândega da Receita Federal do Brasil do Porto de Santos à conclusão do curso básico de conhecimentos aduaneiros previsto na Portaria Coana nº 185/2026.",
];

function limparCpf(cpf: string) {
  return String(cpf || "").replace(/\D/g, "");
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

function idade(data: Date) {
  const hoje = new Date();
  let anos = hoje.getFullYear() - data.getFullYear();
  const mes = hoje.getMonth() - data.getMonth();
  if (mes < 0 || (mes === 0 && hoje.getDate() < data.getDate())) anos -= 1;
  return anos;
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

function escreverCampo(doc: PDFKit.PDFDocument, rotulo: string, valor: string, x: number, y: number, width = 240) {
  doc.roundedRect(x, y, width, 46, 8).fill("#f8fafc").strokeColor("#dbe4f0").stroke();
  doc.fillColor(pdfTheme.muted).fontSize(7).text(rotulo.toUpperCase(), x + 10, y + 9, { width: width - 20 });
  doc.fillColor(pdfTheme.primary).fontSize(10).text(valor || "-", x + 10, y + 24, { width: width - 20, ellipsis: true });
}

async function gerarCertificadoPdf(treinamento: any) {
  const destino = arquivoCertificado(treinamento.token);
  const doc = new PDFDocument({ size: "A4", margin: 42, bufferPages: true, margins: { top: 130, left: 42, right: 42, bottom: 120 } });
  const stream = fs.createWriteStream(destino);
  doc.pipe(stream);

  desenharCabecalhoPadrao(doc, {
    titulo: "Certificado de treinamento",
    subtitulo: "Acesso ao terminal - ciência operacional",
    codigo: treinamento.codigo,
    unidade: "Movecta",
  });

  doc.fillColor(pdfTheme.primary).fontSize(20).text("Certificado de Conclusão", 42, doc.y, { width: 511, align: "center" });
  doc.moveDown(0.8);
  doc.fillColor("#334155").fontSize(11).text(
    `Certificamos que ${treinamento.nomeCompleto} concluiu o treinamento público de acesso ao terminal, declarou ciência das orientações apresentadas e registrou assinatura eletrônica de conformidade.`,
    62,
    doc.y,
    { width: 471, align: "center" }
  );

  const y = doc.y + 28;
  escreverCampo(doc, "CPF", treinamento.cpf, 42, y);
  escreverCampo(doc, "Empresa", treinamento.empresa, 313, y);
  escreverCampo(doc, "Cargo/Função", treinamento.cargo, 42, y + 58);
  escreverCampo(doc, "E-mail", treinamento.email, 313, y + 58);
  escreverCampo(doc, "Concluído em", new Date(treinamento.concluidoEm || new Date()).toLocaleString("pt-BR"), 42, y + 116);
  escreverCampo(doc, "Código do certificado", treinamento.codigo, 313, y + 116);

  doc.y = y + 190;
  doc.fillColor(pdfTheme.primary).fontSize(12).text("Declaração", 42, doc.y);
  doc.moveDown(0.4);
  doc.fillColor("#475569").fontSize(10).text(
    "O participante declarou ter assistido integralmente ao conteúdo de orientação, compreendido as regras de acesso e assumido compromisso de cumprir as normas de segurança, controle e conduta aplicáveis ao terminal.",
    42,
    doc.y,
    { width: 511, align: "justify" }
  );

  if (treinamento.assinaturaDataUrl) {
    const assinaturaBase64 = String(treinamento.assinaturaDataUrl).split(",")[1];
    if (assinaturaBase64) {
      const buffer = Buffer.from(assinaturaBase64, "base64");
      const assinaturaPng = path.join(path.dirname(destino), `assinatura-${treinamento.token}.png`);
      fs.writeFileSync(assinaturaPng, buffer);
      doc.roundedRect(142, doc.y + 20, 310, 86, 8).strokeColor("#dbe4f0").stroke();
      doc.image(assinaturaPng, 160, doc.y + 32, { fit: [274, 50], align: "center" });
      doc.fillColor(pdfTheme.muted).fontSize(8).text("Assinatura eletrônica do participante", 142, doc.y + 92, { width: 310, align: "center" });
      fs.rmSync(assinaturaPng, { force: true });
    }
  }

  desenharRodapeAssinaturaPadrao(doc, { pagina: 1, totalPaginas: 1 });
  doc.end();

  await new Promise<void>((resolve, reject) => {
    stream.on("finish", resolve);
    stream.on("error", reject);
  });

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
    portaria: "Portaria ALF/STS nº 205, de 22 de junho de 2026",
    resumo: resumoPortaria,
    videoUrl: videoPadrao(),
  });
}

export async function iniciarTreinamentoTerminal(req: Request, res: Response) {
  try {
    const cpf = limparCpf(req.body.cpf);
    const email = texto(req.body.email).toLowerCase();
    const dataNascimento = new Date(req.body.dataNascimento);

    if (!texto(req.body.nomeCompleto) || cpf.length !== 11 || !email || Number.isNaN(dataNascimento.getTime())) {
      return res.status(400).json({ error: "Informe nome completo, CPF válido, e-mail e data de nascimento." });
    }

    if (idade(dataNascimento) < 18) {
      return res.status(400).json({ error: "O treinamento é recomendado apenas para maiores de 18 anos." });
    }

    const existente = await prisma.treinamentoTerminal.findFirst({
      where: { cpf, email, status: "Em andamento" },
      orderBy: { updatedAt: "desc" },
    });

    if (existente) {
      const atualizado = await prisma.treinamentoTerminal.update({
        where: { id: existente.id },
        data: { ultimoAcessoEm: new Date() },
      });
      return res.json({ treinamento: respostaPublica(atualizado), emAndamento: true });
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
    if (treinamento.status === "Concluído") return res.json({ treinamento: respostaPublica(treinamento) });

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
        status: "Concluído",
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
  if (!treinamento?.certificadoArquivo || !fs.existsSync(treinamento.certificadoArquivo)) {
    return res.status(404).json({ error: "Certificado não encontrado." });
  }

  return res.download(treinamento.certificadoArquivo, `certificado-${treinamento.codigo.replace("/", "-")}.pdf`);
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
