import { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import {
  gerarPdfPassagemTurno,
  criarUrlPublicaCcos,
  validarTokenAcessoCcos,
} from "./operacao.controller";
import {
  criarUrlPublicaChecklist,
  gerarPdfPublicoChecklist,
} from "./checklist.controller";
import {
  criarUrlPublicaPdf,
  gerarRelatorioPdf,
  TipoRelatorioPublico,
  validarTokenAcessoPdf,
} from "../services/relatorioPdf.service";
import { criarUrlValidacaoAssinatura } from "../services/assinaturaDocumento.service";

const usuarioConsultaPublica = {
  nome: "JetGuard - Movecta Patrimonial",
  empresa: "Movecta S/A",
};

export async function gerarPdfPublicoRelatorio(req: Request, res: Response) {
  try {
    const tipo = req.params.tipo as TipoRelatorioPublico;
    const id = Number(req.params.id);
    const token = String(req.query.token || "");

    if (!["ocorrencias", "eventos"].includes(tipo) || !Number.isFinite(id)) {
      return res.status(404).json({ error: "Relatório não encontrado" });
    }

    if (tipo === "ocorrencias") {
      const ocorrencia = await prisma.ocorrencia.findUnique({
        where: { id },
        include: {
          envolvidos: true,
          anexos: true,
          investigacao: {
            include: {
              responsavel: { select: { nome: true } },
            },
          },
          analise: {
            include: {
              responsavel: { select: { nome: true } },
              concluidoPor: { select: { nome: true } },
            },
          },
        },
      });

      if (!ocorrencia)
        return res.status(404).json({ error: "Relatório não encontrado" });

      const valido = validarTokenAcessoPdf({
        tipo,
        id: ocorrencia.id,
        codigo: ocorrencia.codigo,
        unidade: ocorrencia.unidade,
        token,
      });

      if (!valido)
        return res.status(403).json({ error: "Token de acesso inválido" });

      const pdfUrl = criarUrlPublicaPdf(req, {
        tipo,
        id: ocorrencia.id,
        codigo: ocorrencia.codigo,
        unidade: ocorrencia.unidade,
      });
      const assinaturaAprovacao = await prisma.assinaturaDocumento.findFirst({
        where: {
          modulo: "Ocorrencia",
          registroId: ocorrencia.id,
          status: "VALIDA",
        },
        orderBy: { createdAt: "desc" },
      });
      const assinatura =
        assinaturaAprovacao ||
        (ocorrencia.analise
          ? await prisma.assinaturaDocumento.findFirst({
              where: {
                modulo: "AnaliseOcorrencia",
                registroId: ocorrencia.analise.id,
                status: "VALIDA",
              },
              orderBy: { createdAt: "desc" },
            })
          : null) ||
        (ocorrencia.investigacao
          ? await prisma.assinaturaDocumento.findFirst({
              where: {
                modulo: "Investigacao",
                registroId: ocorrencia.investigacao.id,
                status: "VALIDA",
              },
              orderBy: { createdAt: "desc" },
            })
          : null);
      const validacaoUrl = assinatura
        ? criarUrlValidacaoAssinatura(req, assinatura.token)
        : pdfUrl;

      return gerarRelatorioPdf(
        res,
        {
          tipo: "Ocorrência",
          codigo: ocorrencia.codigo,
          assunto: ocorrencia.assunto,
          local: ocorrencia.local,
          natureza: ocorrencia.natureza,
          subNatureza: ocorrencia.subNatureza,
          status: ocorrencia.status,
          data: ocorrencia.dataOcorrencia,
          relatoSeguranca: ocorrencia.relatoSeguranca,
          acoesTomadas: ocorrencia.acoesTomadas,
          envolvidos: ocorrencia.envolvidos,
          anexos: ocorrencia.anexos,
          investigacao: ocorrencia.investigacao,
          analise: ocorrencia.analise,
          assinaturaAprovacao,
        },
        usuarioConsultaPublica,
        validacaoUrl,
        assinatura?.token,
      );
    }

    const evento = await prisma.evento.findUnique({
      where: { id },
      include: {
        envolvidos: true,
        anexos: true,
        analise: {
          include: {
            responsavel: { select: { nome: true } },
            concluidoPor: { select: { nome: true } },
          },
        },
      },
    });

    if (!evento)
      return res.status(404).json({ error: "Relatório não encontrado" });

    const valido = validarTokenAcessoPdf({
      tipo,
      id: evento.id,
      codigo: evento.codigo,
      unidade: evento.unidade,
      token,
    });

    if (!valido)
      return res.status(403).json({ error: "Token de acesso inválido" });

    const pdfUrl = criarUrlPublicaPdf(req, {
      tipo,
      id: evento.id,
      codigo: evento.codigo,
      unidade: evento.unidade,
    });
    const assinaturaAprovacao = await prisma.assinaturaDocumento.findFirst({
      where: { modulo: "Evento", registroId: evento.id, status: "VALIDA" },
      orderBy: { createdAt: "desc" },
    });
    const assinatura =
      assinaturaAprovacao ||
      (evento.analise
        ? await prisma.assinaturaDocumento.findFirst({
            where: {
              modulo: "AnaliseEvento",
              registroId: evento.analise.id,
              status: "VALIDA",
            },
            orderBy: { createdAt: "desc" },
          })
        : null);
    const validacaoUrl = assinatura
      ? criarUrlValidacaoAssinatura(req, assinatura.token)
      : pdfUrl;

    return gerarRelatorioPdf(
      res,
      {
        tipo: "Evento",
        codigo: evento.codigo,
        assunto: evento.assunto,
        local: evento.local,
        natureza: evento.natureza,
        subNatureza: evento.subNatureza,
        status: evento.status,
        data: evento.dataEvento,
        relatoSeguranca: evento.relatoSeguranca,
        acoesTomadas: evento.acoesTomadas,
        envolvidos: evento.envolvidos,
        anexos: evento.anexos,
        analise: evento.analise,
        assinaturaAprovacao,
      },
      usuarioConsultaPublica,
      validacaoUrl,
      assinatura?.token,
    );
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro ao gerar PDF público" });
  }
}

export async function gerarPdfPublicoCcos(req: Request, res: Response) {
  try {
    const id = Number(req.params.id);
    const token = String(req.query.token || "");

    if (!Number.isFinite(id)) {
      return res.status(404).json({ error: "Relatório CCOS não encontrado" });
    }

    const passagem = await prisma.passagemTurno.findUnique({
      where: { id },
      select: {
        id: true,
        codigo: true,
        unidade: true,
      },
    });

    if (!passagem)
      return res.status(404).json({ error: "Relatório CCOS não encontrado" });

    const valido = validarTokenAcessoCcos({
      id: passagem.id,
      codigo: passagem.codigo,
      unidade: passagem.unidade,
      token,
    });

    if (!valido)
      return res.status(403).json({ error: "Token de acesso inválido" });

    return gerarPdfPassagemTurno(
      {
        ...req,
        params: { ...req.params, id: String(passagem.id) },
        unidadeAtiva: passagem.unidade,
      } as unknown as Parameters<typeof gerarPdfPassagemTurno>[0],
      res,
    );
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro ao gerar PDF público do CCOS" });
  }
}

function escaparHtml(valor: unknown) {
  return String(valor || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function linkPdfAssinatura(
  req: Request,
  assinatura: {
    modulo: string;
    registroId: number;
    token: string;
  },
) {
  if (assinatura.modulo === "Ocorrencia") {
    const ocorrencia = await prisma.ocorrencia.findUnique({
      where: { id: assinatura.registroId },
      select: { id: true, codigo: true, unidade: true },
    });
    return ocorrencia
      ? criarUrlPublicaPdf(req, {
          tipo: "ocorrencias",
          id: ocorrencia.id,
          codigo: ocorrencia.codigo,
          unidade: ocorrencia.unidade,
        })
      : "";
  }

  if (assinatura.modulo === "Evento") {
    const evento = await prisma.evento.findUnique({
      where: { id: assinatura.registroId },
      select: { id: true, codigo: true, unidade: true },
    });
    return evento
      ? criarUrlPublicaPdf(req, {
          tipo: "eventos",
          id: evento.id,
          codigo: evento.codigo,
          unidade: evento.unidade,
        })
      : "";
  }

  if (assinatura.modulo === "Investigacao") {
    const investigacao = await prisma.investigacao.findUnique({
      where: { id: assinatura.registroId },
      include: {
        ocorrencia: { select: { id: true, codigo: true, unidade: true } },
      },
    });
    return investigacao?.ocorrencia
      ? criarUrlPublicaPdf(req, {
          tipo: "ocorrencias",
          id: investigacao.ocorrencia.id,
          codigo: investigacao.ocorrencia.codigo,
          unidade: investigacao.ocorrencia.unidade,
        })
      : "";
  }

  if (assinatura.modulo === "AnaliseOcorrencia") {
    const analise = await prisma.analiseOcorrencia.findUnique({
      where: { id: assinatura.registroId },
      include: {
        ocorrencia: { select: { id: true, codigo: true, unidade: true } },
      },
    });
    return analise?.ocorrencia
      ? criarUrlPublicaPdf(req, {
          tipo: "ocorrencias",
          id: analise.ocorrencia.id,
          codigo: analise.ocorrencia.codigo,
          unidade: analise.ocorrencia.unidade,
        })
      : "";
  }

  if (assinatura.modulo === "AnaliseEvento") {
    const analise = await prisma.analiseEvento.findUnique({
      where: { id: assinatura.registroId },
      include: {
        evento: { select: { id: true, codigo: true, unidade: true } },
      },
    });
    return analise?.evento
      ? criarUrlPublicaPdf(req, {
          tipo: "eventos",
          id: analise.evento.id,
          codigo: analise.evento.codigo,
          unidade: analise.evento.unidade,
        })
      : "";
  }

  if (assinatura.modulo === "PassagemTurno") {
    const passagem = await prisma.passagemTurno.findUnique({
      where: { id: assinatura.registroId },
      select: { id: true, codigo: true, unidade: true },
    });
    return passagem
      ? criarUrlPublicaCcos(req, {
          id: passagem.id,
          codigo: passagem.codigo,
          unidade: passagem.unidade,
        })
      : "";
  }

  if (assinatura.modulo === "ChecklistInspecao") {
    const checklist = await prisma.checklistInspecao.findUnique({
      where: { id: assinatura.registroId },
      select: { id: true, codigo: true, unidade: true },
    });
    return checklist
      ? criarUrlPublicaChecklist(req, {
          id: checklist.id,
          codigo: checklist.codigo,
          unidade: checklist.unidade,
        })
      : "";
  }

  if (assinatura.modulo === "RelatorioDiario") {
    const relatorio = await prisma.relatorioDiarioExecutivo.findUnique({
      where: { id: assinatura.registroId },
      select: { id: true },
    });
    return relatorio
      ? `${req.protocol}://${req.get("host")}/api/public/relatorios-diarios/${relatorio.id}/pdf?token=${encodeURIComponent(assinatura.token)}`
      : "";
  }

  return "";
}

export { gerarPdfPublicoChecklist };

export async function validarAssinaturaPublica(req: Request, res: Response) {
  try {
    const token = String(req.params.token || "");
    const assinatura = await prisma.assinaturaDocumento.findUnique({
      where: { token },
      include: {
        usuario: {
          select: {
            nome: true,
            apelido: true,
            email: true,
            perfilAcesso: true,
          },
        },
      },
    });

    if (!assinatura)
      return res.status(404).send("<h1>Assinatura não encontrada</h1>");

    const pdfUrl = await linkPdfAssinatura(req, assinatura);
    const valido = assinatura.status === "VALIDA";
    const validacaoUrl = criarUrlValidacaoAssinatura(req, assinatura.token);

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    return res.send(`<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Validação JetGuard</title>
  <style>
    body { margin:0; font-family: Arial, sans-serif; background:#07111f; color:#e5eefc; display:grid; place-items:center; min-height:100vh; }
    .card { width:min(680px, calc(100vw - 32px)); background:#0f1b2d; border:1px solid #1d3b63; border-left:6px solid #0b74ff; border-radius:18px; padding:28px; box-shadow:0 20px 60px rgba(0,0,0,.35); }
    .badge { display:inline-flex; padding:8px 12px; border-radius:999px; font-weight:700; font-size:12px; background:${valido ? "#064e3b" : "#7f1d1d"}; color:#fff; }
    h1 { margin:18px 0 8px; font-size:28px; }
    dl { display:grid; grid-template-columns:170px 1fr; gap:10px 16px; margin:22px 0; }
    dt { color:#93a4bd; }
    dd { margin:0; font-weight:700; }
    a { display:inline-flex; margin-top:8px; padding:12px 16px; border-radius:12px; background:#0b74ff; color:#fff; text-decoration:none; font-weight:700; }
    .muted { color:#93a4bd; font-size:12px; word-break:break-all; }
  </style>
</head>
<body>
  <main class="card">
    <span class="badge">${valido ? "DOCUMENTO VÁLIDO" : "ASSINATURA INVALIDADA"}</span>
    <h1>Validação de assinatura eletrônica</h1>
    <p>Este registro foi assinado eletronicamente dentro do JetGuard.</p>
    <dl>
      <dt>Documento</dt><dd>${escaparHtml(assinatura.modulo)} nº ${escaparHtml(assinatura.codigoRegistro)}</dd>
      <dt>Ação</dt><dd>${escaparHtml(assinatura.acao)}</dd>
      <dt>Assinado por</dt><dd>${escaparHtml(assinatura.usuarioNome)}</dd>
      <dt>Perfil</dt><dd>${escaparHtml(assinatura.perfilAcesso || assinatura.usuario.perfilAcesso)}</dd>
      <dt>Unidade</dt><dd>${escaparHtml(assinatura.unidade)}</dd>
      <dt>Data/hora</dt><dd>${assinatura.createdAt.toLocaleString("pt-BR")}</dd>
      <dt>Código</dt><dd>${escaparHtml(assinatura.token)}</dd>
    </dl>
    ${assinatura.motivoInvalidacao ? `<p class="muted">Motivo da invalidação: ${escaparHtml(assinatura.motivoInvalidacao)}</p>` : ""}
    ${pdfUrl ? `<a href="${escaparHtml(pdfUrl)}" target="_blank" rel="noopener">Abrir / baixar PDF</a>` : ""}
    <p class="muted">URL de validação: ${escaparHtml(validacaoUrl)}</p>
  </main>
</body>
</html>`);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro ao validar assinatura" });
  }
}
