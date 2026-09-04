import { prisma } from "../lib/prisma";
import { descriptografarSegredo } from "../utils/secretCrypto";

type EmailAnexo = {
  filename: string;
  path: string;
  contentType?: string;
};

type EmailParams = {
  to: string;
  subject: string;
  text: string;
  html?: string;
  attachments?: EmailAnexo[];
};

async function configuracaoSmtp() {
  const config = await prisma.configuracaoSistema.findUnique({
    where: { chave: "global" },
  });

  if ((config as any)?.smtpAtivo && (config as any)?.smtpHost) {
    return {
      host: (config as any).smtpHost,
      port: Number((config as any).smtpPorta || 587),
      secure: Boolean((config as any).smtpSeguro),
      user: (config as any).smtpUsuario || "",
      pass: descriptografarSegredo((config as any).smtpSenha || ""),
      from: (config as any).smtpRemetente || (config as any).smtpUsuario || "",
      replyTo: (config as any).smtpRespostaPara || "",
    };
  }

  const port = Number(process.env.SMTP_PORT || 587);
  return {
    host: process.env.SMTP_HOST || "",
    port,
    secure:
      String(process.env.SMTP_SECURE || "").toLowerCase() === "true" ||
      port === 465,
    user: process.env.SMTP_USER || "",
    pass: process.env.SMTP_PASS || "",
    from: process.env.SMTP_FROM || process.env.SMTP_USER || "",
    replyTo: process.env.SMTP_REPLY_TO || "",
  };
}

export async function enviarEmail(params: EmailParams) {
  const smtp = await configuracaoSmtp();

  if (!smtp.host || !smtp.from) {
    return { enviado: false, status: "SMTP_NAO_CONFIGURADO" };
  }

  try {
    // Dependencia opcional: instale nodemailer na VPS para envio real.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const nodemailer = require("nodemailer");
    const transporter = nodemailer.createTransport({
      host: smtp.host,
      port: smtp.port,
      secure: smtp.secure,
      auth: smtp.user && smtp.pass ? { user: smtp.user, pass: smtp.pass } : undefined,
    });

    await transporter.sendMail({
      from: smtp.from,
      to: params.to,
      subject: params.subject,
      text: params.text,
      html: params.html,
      replyTo: smtp.replyTo || undefined,
      attachments: params.attachments,
    });

    return { enviado: true, status: "ENVIADO" };
  } catch (error) {
    console.error("Falha ao enviar e-mail:", error);
    return { enviado: false, status: "FALHA_ENVIO" };
  }
}
