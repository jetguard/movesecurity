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
import { certificadoTreinamentoFixoTemplateBase64 } from "../assets/certificadoTreinamentoFixoTemplate";

const APP_PUBLIC_URL_PADRAO = "https://movesecurity.movecta.com.br";
const VIDEO_TERMINAL_PADRAO = "/videos/treinamento_terminal_rfb.mp4";

const resumoPortaria = [
  "A Portaria ALF/STS no 205, de 22 de junho de 2026, condiciona o credenciamento de pessoas para ingresso em recintos alfandegados sob jurisdição da Alfândega da Receita Federal do Brasil do Porto de Santos à conclusão do curso básico de conhecimentos aduaneiros previsto na Portaria Coana no 185/2026.",
];

const assinaturasSegurancaPatrimonial = [
  path.resolve(process.cwd(), "assets", "assinatura-seguranca-patrimonial.png"),
  path.resolve(process.cwd(), "frontend", "public", "images", "assinatura-seguranca-patrimonial.png"),
  path.resolve(process.cwd(), "frontend", "dist", "images", "assinatura-seguranca-patrimonial.png"),
  path.resolve(
    process.cwd(),
    "backend",
    "assets",
    "assinatura-seguranca-patrimonial.png",
  ),
  path.resolve(
    __dirname,
    "..",
    "..",
    "assets",
    "assinatura-seguranca-patrimonial.png",
  ),
  path.resolve(
    process.cwd(),
    "assets",
    "assinatura-seguranca-patrimonial.jpeg",
  ),
  path.resolve(
    process.cwd(),
    "backend",
    "assets",
    "assinatura-seguranca-patrimonial.jpeg",
  ),
  path.resolve(
    __dirname,
    "..",
    "..",
    "assets",
    "assinatura-seguranca-patrimonial.jpeg",
  ),
  path.resolve(path.dirname(pdfAssets.logo), "assinatura-seguranca-patrimonial.png"),
  path.resolve(path.dirname(pdfAssets.logo), "assinatura-seguranca-patrimonial.jpeg"),
];

const logosMovecta = [
  path.resolve(process.cwd(), "assets", "movecta-logo.png"),
  path.resolve(process.cwd(), "frontend", "public", "images", "movecta-logo.png"),
  path.resolve(process.cwd(), "frontend", "dist", "images", "movecta-logo.png"),
  path.resolve(process.cwd(), "backend", "assets", "movecta-logo.png"),
  path.resolve(__dirname, "..", "..", "assets", "movecta-logo.png"),
  path.resolve(__dirname, "..", "..", "frontend", "public", "images", "movecta-logo.png"),
  path.resolve(__dirname, "..", "..", "frontend", "dist", "images", "movecta-logo.png"),
  pdfAssets.logo,
];

const templatesCertificadoFixo = [
  path.resolve(process.cwd(), "assets", "certificado-treinamento-fixo-template.png"),
  path.resolve(process.cwd(), "backend", "assets", "certificado-treinamento-fixo-template.png"),
  path.resolve(__dirname, "..", "..", "assets", "certificado-treinamento-fixo-template.png"),
];

function primeiroArquivoExistente(caminhos: string[]) {
  return caminhos.find((arquivo) => fs.existsSync(arquivo)) || "";
}

function templateCertificadoFixo() {
  const arquivo = primeiroArquivoExistente(templatesCertificadoFixo);
  if (arquivo) return arquivo;
  return Buffer.from(certificadoTreinamentoFixoTemplateBase64, "base64");
}

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

function limparTelefone(valor: string) {
  return String(valor || "").replace(/[^\d+]/g, "");
}

function texto(valor: unknown) {
  return String(valor || "").trim();
}

function emailValido(email: string) {
  const normalizado = String(email || "").trim();
  if (!normalizado || normalizado.length > 254 || normalizado.includes(".."))
    return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(normalizado);
}

function videoPadrao() {
  return (
    process.env.TREINAMENTO_TERMINAL_VIDEO_URL ||
    VIDEO_TERMINAL_PADRAO
  );
}

function appPublicUrl() {
  const url = String(
    process.env.PUBLIC_APP_URL ||
      process.env.APP_URL ||
      process.env.FRONTEND_URL ||
      APP_PUBLIC_URL_PADRAO,
  ).replace(/\/$/, "");
  return url.includes("movecta.jetguard.com.br") ? APP_PUBLIC_URL_PADRAO : url;
}

function urlValidacaoCertificado(token: string) {
  return `${appPublicUrl()}/validar-certificado/${token}`;
}

function treinamentoConcluido(status?: string | null) {
  return String(status || "")
    .toLowerCase()
    .startsWith("conclu");
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

function extensaoAssinaturaDataUrl(dataUrl: string) {
  if (dataUrl.startsWith("data:image/jpeg;base64,")) return "jpg";
  if (dataUrl.startsWith("data:image/png;base64,")) return "png";
  return null;
}

async function proximoCodigo(tx: any) {
  const ano = new Date().getFullYear();
  await tx.$executeRawUnsafe(
    `SELECT pg_advisory_xact_lock(hashtext('movecta_treinamento_terminal_certificado_${ano}'))`,
  );
  const certificados = await tx.treinamentoTerminal.findMany({
    where: { codigo: { endsWith: `/${ano}` } },
    select: { codigo: true },
  });
  const maiorNumero = certificados.reduce(
    (maior: number, item: { codigo: string | null }) => {
      const numero = Number(item.codigo?.match(/CERT-(\d+)\//)?.[1] || 0);
      return Math.max(maior, numero);
    },
    0,
  );
  const numero = maiorNumero + 1;
  return `CERT-${String(numero).padStart(5, "0")}/${ano}`;
}

async function garantirCodigoTreinamento(treinamento: {
  id: number;
  codigo?: string | null;
}) {
  if (treinamento.codigo) return treinamento.codigo;
  const atualizado = await prisma.$transaction(async (tx) => {
    const codigo = await proximoCodigo(tx);
    return tx.treinamentoTerminal.update({
      where: { id: treinamento.id },
      data: { codigo },
    });
  });
  return atualizado.codigo || "";
}

function arquivoCertificado(token: string) {
  const pasta = path.resolve(
    process.cwd(),
    "uploads",
    "certificados-treinamento",
  );
  fs.mkdirSync(pasta, { recursive: true });
  return path.join(pasta, `certificado-${token}.pdf`);
}

function desenharLinhaAssinatura(
  doc: PDFKit.PDFDocument,
  x: number,
  y: number,
  largura: number,
  nome: string,
  cargo: string,
) {
  doc
    .moveTo(x, y)
    .lineTo(x + largura, y)
    .strokeColor("#2f6bb2")
    .lineWidth(1)
    .stroke();
  doc
    .fillColor("#111827")
    .font("Helvetica-Bold")
    .fontSize(9)
    .text(nome, x, y + 12, { width: largura, align: "center" });
  doc
    .fillColor("#111827")
    .font("Helvetica")
    .fontSize(8)
    .text(cargo, x, y + 27, { width: largura, align: "center" });
}

function desenharAssinaturaInstitucional(
  doc: PDFKit.PDFDocument,
  x: number,
  y: number,
  largura: number,
) {
  doc
    .fillColor("#0f172a")
    .font("Helvetica-Oblique")
    .fontSize(13)
    .text("Segurança Patrimonial", x + 18, y - 32, {
      width: largura - 36,
      align: "center",
    });

  let assinaturaInserida = false;
  for (const assinatura of assinaturasSegurancaPatrimonial) {
    if (!fs.existsSync(assinatura)) continue;
    try {
      doc.image(assinatura, x + 45, y - 58, {
        fit: [largura - 90, 54],
        align: "center",
        valign: "center",
      });
      assinaturaInserida = true;
      break;
    } catch (error) {
      console.error(
        "Falha ao inserir assinatura institucional no certificado:",
        error,
      );
    }
  }
  if (!assinaturaInserida) {
    doc
      .fillColor("#0f172a")
      .font("Helvetica-Oblique")
      .fontSize(18)
      .text("MoveSecurity", x + 18, y - 56, {
        width: largura - 36,
        align: "center",
      });
  }

  doc
    .moveTo(x, y)
    .lineTo(x + largura, y)
    .strokeColor("#2f6bb2")
    .lineWidth(1)
    .stroke();
  doc
    .fillColor("#111827")
    .font("Helvetica-Bold")
    .fontSize(9.5)
    .text("Segurança Patrimonial", x, y + 12, {
      width: largura,
      align: "center",
    });
  doc
    .fillColor("#111827")
    .font("Helvetica")
    .fontSize(8.5)
    .text("Movecta S.A", x, y + 28, {
      width: largura,
      align: "center",
    });
}

async function gerarCertificadoPdf(treinamento: any) {
  const destino = arquivoCertificado(treinamento.token);
  const destinoTemporario = `${destino}.tmp`;
  fs.rmSync(destinoTemporario, { force: true });
  const doc = new PDFDocument({ size: [1440, 810], margin: 0 });
  const stream = fs.createWriteStream(destinoTemporario);
  doc.pipe(stream);

  const pageWidth = doc.page.width;
  const pageHeight = doc.page.height;
  const concluidoEm = new Date(treinamento.concluidoEm || new Date());
  const validacaoUrl = urlValidacaoCertificado(treinamento.token);
  const qrCodeDataUrl = await QRCode.toDataURL(validacaoUrl, {
    width: 260,
    margin: 1,
    color: { dark: "#0f172a", light: "#ffffff" },
  });
  const qrCode = Buffer.from(String(qrCodeDataUrl).split(",")[1], "base64");

  doc.rect(0, 0, pageWidth, pageHeight).fill("#ffffff");
  const templateCertificado = templateCertificadoFixo();
  if (templateCertificado) {
    doc.image(templateCertificado, 0, 0, {
      width: pageWidth,
      height: pageHeight,
    });
  } else {
    doc.rect(0, 0, 468, 245).fill("#09052a");
    doc.rect(468, 0, pageWidth - 468, 245).fill("#0877f2");
    doc
      .fillColor("#ffffff")
      .font("Helvetica-Bold")
      .fontSize(43)
      .text("certificado", 82, 78, { width: 310, lineBreak: false });
    doc
      .fillColor("#ffffff")
      .font("Helvetica-Bold")
      .fontSize(43)
      .text("certificado", 82, 128, { width: 310, lineBreak: false });
  }

  const textoPrincipal = `Certificamos que ${treinamento.nomeCompleto}, portador(a) do CPF nº ${formatarCpf(treinamento.cpf)}, concluiu o Curso Básico de Conhecimentos Aduaneiros, atendendo ao requisito para credenciamento de pessoas para ingresso em recintos alfandegados, conforme a PORTARIA ALF/STS Nº 205, DE 22 DE JUNHO DE 2026 e demais normas aplicáveis, em ${dataCurta(concluidoEm)}.`;
  doc
    .rect(80, 320, pageWidth - 160, 155)
    .fill("#ffffff")
    .fillColor("#07142f")
    .font("Helvetica")
    .fontSize(26)
    .text(textoPrincipal, 82, 326, {
      width: pageWidth - 164,
      align: "left",
      lineGap: 9,
    });

  doc
    .rect(520, 474, 400, 44)
    .fill("#ffffff")
    .fillColor("#07142f")
    .font("Helvetica")
    .fontSize(26)
    .text(`Guarujá, ${dataPorExtenso(concluidoEm)}.`, 0, 482, {
      width: pageWidth,
      align: "center",
    });

  if (treinamento.assinaturaDataUrl) {
    const assinaturaDataUrl = String(treinamento.assinaturaDataUrl);
    const assinaturaBase64 = assinaturaDataUrl.split(",")[1];
    const extensao = extensaoAssinaturaDataUrl(assinaturaDataUrl) || "png";
    if (assinaturaBase64) {
      const buffer = Buffer.from(assinaturaBase64, "base64");
      const assinaturaArquivo = path.join(
        path.dirname(destino),
        `assinatura-${treinamento.token}.${extensao}`,
      );
      try {
        fs.writeFileSync(assinaturaArquivo, buffer);
        doc.image(assinaturaArquivo, 335, 536, {
          fit: [250, 58],
          align: "center",
        });
      } catch (error) {
        console.error(
          "Falha ao inserir assinatura do participante no certificado:",
          error,
        );
      } finally {
        fs.rmSync(assinaturaArquivo, { force: true });
      }
    }
  }

  doc.rect(400, 652, 170, 28).fill("#ffffff");
  doc
    .fillColor("#07142f")
    .font("Helvetica")
    .fontSize(16)
    .text(treinamento.nomeCompleto, 350, 652, {
      width: 250,
      align: "center",
      ellipsis: true,
    });

  doc.rect(656, 664, 130, 134).fill("#ffffff");
  doc.image(qrCode, 671, 671, { width: 100, height: 100 });
  doc
    .fillColor("#07142f")
    .font("Helvetica")
    .fontSize(14)
    .text(treinamento.codigo || "CERTIFICADO", 626, 783, {
      width: 190,
      align: "center",
    });

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
    certificadoUrl: treinamento.certificadoArquivo
      ? `/api/public/treinamento-terminal/${treinamento.token}/certificado`
      : null,
  };
}

export function configTreinamentoTerminal(req: Request, res: Response) {
  return res.json({
    titulo: "Treinamento de acesso ao Recinto Alfandegado",
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

    if (
      !texto(req.body.nomeCompleto) ||
      !cpfValido(cpf) ||
      !emailValido(email) ||
      Number.isNaN(dataNascimento.getTime())
    ) {
      return res
        .status(400)
        .json({
          error:
            "Informe nome completo, CPF válido, e-mail e data de nascimento.",
        });
    }

    if (idade(dataNascimento) < 18) {
      return res
        .status(400)
        .json({
          error: "O treinamento e recomendado apenas para maiores de 18 anos.",
        });
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

    return res
      .status(201)
      .json({ treinamento: respostaPublica(treinamento), emAndamento: false });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro ao iniciar treinamento." });
  }
}

export async function atualizarProgressoTreinamento(
  req: Request,
  res: Response,
) {
  try {
    const token = String(req.params.token || "");
    const treinamento = await prisma.treinamentoTerminal.findUnique({
      where: { token },
    });
    if (!treinamento)
      return res.status(404).json({ error: "Treinamento não encontrado." });
    if (treinamentoConcluido(treinamento.status))
      return res.json({ treinamento: respostaPublica(treinamento) });

    const progresso = Math.max(
      0,
      Math.floor(Number(req.body.progressoSegundos || 0)),
    );
    const duracao = Math.max(
      treinamento.duracaoSegundos || 0,
      Math.floor(Number(req.body.duracaoSegundos || 0)),
    );
    const videoConcluido =
      Boolean(req.body.videoConcluido) ||
      (duracao > 0 && progresso >= Math.max(0, duracao - 2));

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
    const treinamento = await prisma.treinamentoTerminal.findUnique({
      where: { token },
    });
    if (!treinamento)
      return res.status(404).json({ error: "Treinamento não encontrado." });
    if (!treinamento.videoConcluido)
      return res
        .status(400)
        .json({ error: "Conclua o vídeo antes de emitir o certificado." });
    if (!req.body.aceiteDeclaracao)
      return res
        .status(400)
        .json({ error: "Confirme a declaração de ciência." });
    if (!extensaoAssinaturaDataUrl(texto(req.body.assinaturaDataUrl))) {
      return res
        .status(400)
        .json({ error: "Informe a assinatura eletrônica." });
    }

    let atualizado = await prisma.$transaction(async (tx) => {
      const codigo = treinamento.codigo || (await proximoCodigo(tx));
      return tx.treinamentoTerminal.update({
        where: { id: treinamento.id },
        data: {
          codigo,
          aceiteDeclaracao: true,
          assinaturaDataUrl: texto(req.body.assinaturaDataUrl),
          etapa: "concluido",
          status: "Concluido",
          concluidoEm: treinamento.concluidoEm || new Date(),
          ultimoAcessoEm: new Date(),
        },
      });
    });

    const certificadoArquivo = await gerarCertificadoPdf(atualizado);
    const codigoCertificado = atualizado.codigo || "";
    const email = await enviarEmail({
      to: atualizado.email,
      subject: `Certificado de treinamento - ${codigoCertificado}`,
      text: `Olá, ${atualizado.nomeCompleto}. Segue em anexo o certificado de conclusão do treinamento de acesso ao terminal.`,
      html: `<p>Olá, <strong>${atualizado.nomeCompleto}</strong>.</p><p>Segue em anexo o certificado de conclusão do treinamento de acesso ao terminal.</p>`,
      attachments: [
        {
          filename: `certificado-${codigoCertificado.replace("/", "-")}.pdf`,
          path: certificadoArquivo,
          contentType: "application/pdf",
        },
      ],
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
  } catch (error: any) {
    const mensagem = error?.message || "Erro ao concluir treinamento.";
    console.error(error);
    return res.status(500).json({ error: mensagem });
  }
}

export async function baixarCertificadoTreinamento(
  req: Request,
  res: Response,
) {
  const token = String(req.params.token || "");
  const treinamento = await prisma.treinamentoTerminal.findUnique({
    where: { token },
  });
  if (!treinamento || !treinamentoConcluido(treinamento.status)) {
    return res.status(404).json({ error: "Certificado não encontrado." });
  }

  const codigo = await garantirCodigoTreinamento(treinamento);
  const treinamentoComCodigo = { ...treinamento, codigo };
  const certificadoArquivo = await gerarCertificadoPdf(treinamentoComCodigo);
  await prisma.treinamentoTerminal.update({
    where: { id: treinamento.id },
    data: { certificadoArquivo },
  });

  if (!certificadoArquivo) {
    return res.status(404).json({ error: "Certificado não encontrado." });
  }

  return res.download(
    certificadoArquivo,
    `certificado-${codigo.replace("/", "-")}.pdf`,
  );
}

export async function validarCertificadoTreinamento(
  req: Request,
  res: Response,
) {
  const token = String(req.params.token || "");
  const treinamento = await prisma.treinamentoTerminal.findUnique({
    where: { token },
  });
  if (
    !treinamento ||
    !treinamentoConcluido(treinamento.status) ||
    !treinamento.certificadoArquivo
  ) {
    return res
      .status(404)
      .json({ error: "Certificado não encontrado ou ainda não emitido." });
  }

  return res.json({
    valido: true,
    token: treinamento.token,
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

export async function reenviarCertificadoTreinamento(
  req: AuthRequest,
  res: Response,
) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id))
      return res.status(400).json({ error: "Treinamento inválido." });

    const treinamento = await prisma.treinamentoTerminal.findUnique({
      where: { id },
    });
    if (!treinamento)
      return res.status(404).json({ error: "Treinamento não encontrado." });
    if (!treinamentoConcluido(treinamento.status)) {
      return res
        .status(400)
        .json({
          error: "O certificado só pode ser enviado após a conclusão do curso.",
        });
    }

    const codigo = await garantirCodigoTreinamento(treinamento);
    const treinamentoComCodigo = { ...treinamento, codigo };
    const certificadoArquivo = await gerarCertificadoPdf(treinamentoComCodigo);
    const email = await enviarEmail({
      to: treinamento.email,
      subject: `Certificado de treinamento - ${codigo}`,
      text: `Olá, ${treinamento.nomeCompleto}. Segue em anexo o certificado de conclusão do treinamento de acesso ao terminal.`,
      html: `<p>Olá, <strong>${treinamento.nomeCompleto}</strong>.</p><p>Segue em anexo o certificado de conclusão do treinamento de acesso ao terminal.</p>`,
      attachments: [
        {
          filename: `certificado-${codigo.replace("/", "-")}.pdf`,
          path: certificadoArquivo,
          contentType: "application/pdf",
        },
      ],
    });

    const atualizado = await prisma.treinamentoTerminal.update({
      where: { id: treinamento.id },
      data: {
        certificadoArquivo,
        emailStatus: email.status,
        emailEnviadoEm: email.enviado ? new Date() : treinamento.emailEnviadoEm,
      },
    });

    return res.json({
      mensagem: email.enviado
        ? "Certificado enviado com sucesso."
        : "Envio registrado. Verifique a configuração de SMTP.",
      treinamento: {
        ...atualizado,
        assinaturaDataUrl: undefined,
        certificadoUrl: `/api/public/treinamento-terminal/${atualizado.token}/certificado`,
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro ao reenviar certificado." });
  }
}

export async function listarTreinamentosTerminal(
  req: AuthRequest,
  res: Response,
) {
  const treinamentos = await prisma.treinamentoTerminal.findMany({
    orderBy: { updatedAt: "desc" },
    take: 300,
  });

  return res.json(
    treinamentos.map((item) => ({
      ...item,
      assinaturaDataUrl: undefined,
      certificadoUrl: item.certificadoArquivo
        ? `/api/public/treinamento-terminal/${item.token}/certificado`
        : null,
    })),
  );
}

export async function excluirTreinamentoTerminal(
  req: AuthRequest,
  res: Response,
) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id))
      return res.status(400).json({ error: "Treinamento inválido." });

    const treinamento = await prisma.treinamentoTerminal.findUnique({
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

    await prisma.treinamentoTerminal.delete({ where: { id } });

    return res.status(204).send();
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro ao excluir treinamento." });
  }
}
