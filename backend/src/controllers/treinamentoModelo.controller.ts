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

const db = prisma as any;

function texto(valor: unknown) {
  return String(valor || "").trim();
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
  const template = texto(modelo.textoCertificado);
  if (template) {
    return template
      .replace(/\{\{nome\}\}/gi, participante.nomeCompleto)
      .replace(/\{\{cpf\}\}/gi, formatarCpf(participante.cpf || ""))
      .replace(/\{\{data\}\}/gi, data)
      .replace(/\{\{codigo\}\}/gi, modelo.codigo)
      .replace(/\{\{treinamento\}\}/gi, modelo.nome);
  }

  return `Certificamos que ${participante.nomeCompleto}, portador(a) do CPF nº ${formatarCpf(
    participante.cpf || "",
  )}, concluiu com aproveitamento o treinamento ${modelo.codigo} - ${modelo.nome} na data de ${data}.`;
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
  return {
    ...modelo,
    publicUrl: `/treinamento/${modelo.slug}`,
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

function lerSnapshot(
  participante: any,
  modeloFallback?: any,
  incluirCorretas = true,
) {
  if (participante?.snapshotJson) {
    try {
      const snapshot = JSON.parse(participante.snapshotJson);
      return incluirCorretas ? snapshot : removerGabarito(snapshot);
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
    selecionados.map((usuario: any) =>
      enviarEmail({
        to: usuario.email,
        subject: `Treinamento disponível - ${modelo.codigo}`,
        text: `Olá, ${usuario.nome}. O treinamento ${modelo.codigo} - ${modelo.nome} está disponível em ${link}`,
        html: `<p>Olá, <strong>${usuario.nome}</strong>.</p><p>O treinamento <strong>${modelo.codigo} - ${modelo.nome}</strong> está disponível para o seu grupo.</p><p><a href="${link}">Acessar treinamento</a></p>`,
      }),
    ),
  );
  return resultados.filter((item) => item.status === "fulfilled").length;
}

function validarPayloadModelo(body: any) {
  const status = texto(body.status) || "Rascunho";
  const rascunho = status !== "Publicado";
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
  if (!rascunho && !perguntas.length) {
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

  return { codigo, nome, tipo, etapas, perguntas, gruposPermitidos, status };
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

export async function excluirTreinamentoModelo(
  req: AuthRequest,
  res: Response,
) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id))
      return res.status(400).json({ error: "Treinamento inválido." });
    await db.treinamentoModelo.delete({ where: { id } });
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
      fs.rmSync(participante.certificadoArquivo, { force: true });
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

    const email = texto(req.body.email).toLowerCase();
    if (!emailValido(email)) {
      return res
        .status(400)
        .json({ error: "Informe o e-mail cadastrado para iniciar." });
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
    if (!temGrupoTreinamento(usuario, gruposPermitidos)) {
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
    if (perguntas.length === 0)
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
    if ((participante.nota || 0) < snapshot.notaMinima) {
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
    if ((participante.nota || 0) < snapshot.notaMinima) {
      return res
        .status(400)
        .json({ error: "A nota mínima ainda não foi atingida." });
    }

    if (!participante.avaliacaoTreinamentoJson) {
      return res.status(400).json({
        error:
          "Responda a avaliação do treinamento antes de emitir o certificado.",
      });
    }

    const comCodigo = await prisma.$transaction(async (tx) => {
      const repo = tx as any;
      const codigo =
        participante.codigo || (await proximoCodigoCertificado(repo, snapshot));
      return repo.treinamentoModeloParticipante.update({
        where: { id: participante.id },
        data: {
          codigo,
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
    const certificadoArquivo =
      participante.certificadoArquivo &&
      fs.existsSync(participante.certificadoArquivo)
        ? participante.certificadoArquivo
        : await gerarCertificado(
            lerSnapshot(participante, participante.treinamento, true),
            participante,
          );
    if (!participante.certificadoArquivo) {
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
    const certificadoArquivo =
      participante.certificadoArquivo &&
      fs.existsSync(participante.certificadoArquivo)
        ? participante.certificadoArquivo
        : await gerarCertificado(
            lerSnapshot(participante, participante.treinamento, true),
            participante,
          );
    const email = await enviarCertificado(
      lerSnapshot(participante, participante.treinamento, true),
      participante,
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
