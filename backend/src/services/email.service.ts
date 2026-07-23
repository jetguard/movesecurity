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

export async function enviarEmail(params: EmailParams) {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM || user;

  if (!host || !from) {
    return { enviado: false, status: "SMTP_NAO_CONFIGURADO" };
  }

  try {
    // Dependencia opcional: instale nodemailer na VPS para envio real.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const nodemailer = require("nodemailer");
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: user && pass ? { user, pass } : undefined,
    });

    await transporter.sendMail({
      from,
      to: params.to,
      subject: params.subject,
      text: params.text,
      html: params.html,
      attachments: params.attachments,
    });

    return { enviado: true, status: "ENVIADO" };
  } catch (error) {
    console.error("Falha ao enviar e-mail:", error);
    return { enviado: false, status: "FALHA_ENVIO" };
  }
}
