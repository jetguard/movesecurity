import fs from "fs";
import path from "path";
import { Response } from "express";
import { prisma } from "../lib/prisma";
import { AuthRequest, PERFIS } from "../middlewares/auth";
import { registrarLog } from "../services/auditoria.service";

function normalizarCaminho(caminho: string) {
  return caminho.replace(/\\/g, "/").replace(/^\/+/, "");
}

function variantesCaminho(caminho: string) {
  const normalizado = normalizarCaminho(caminho);
  return Array.from(new Set([normalizado, normalizado.replace(/\//g, "\\")]));
}

function dentroDeUploads(caminhoAbsoluto: string) {
  const raizUploads = path.resolve(process.cwd(), "uploads");
  const relativo = path.relative(raizUploads, caminhoAbsoluto);
  return (
    Boolean(relativo) &&
    !relativo.startsWith("..") &&
    !path.isAbsolute(relativo)
  );
}

function podeVerTodasUnidades(perfil?: string) {
  return perfil === PERFIS.SUPER_ADMIN;
}

function unidadePermitida(req: AuthRequest, unidade?: string | null) {
  return (
    podeVerTodasUnidades(req.usuarioPerfil) ||
    !unidade ||
    unidade === req.unidadeAtiva
  );
}

async function localizarArquivo(req: AuthRequest, caminhoNormalizado: string) {
  if (caminhoNormalizado.startsWith("uploads/perfis/")) {
    return {
      permitido: true,
      tipoRegistro: "UsuarioPerfil",
      registroId: req.usuarioId,
      unidade: req.unidadeAtiva,
    };
  }

  const ocorrencia = await prisma.anexoOcorrencia.findFirst({
    where: { caminho: { in: variantesCaminho(caminhoNormalizado) } },
    include: {
      ocorrencia: { select: { id: true, unidade: true, codigo: true } },
    },
  });
  if (ocorrencia) {
    return {
      permitido: unidadePermitida(req, ocorrencia.ocorrencia.unidade),
      tipoRegistro: "AnexoOcorrencia",
      registroId: ocorrencia.ocorrencia.id,
      unidade: ocorrencia.ocorrencia.unidade,
    };
  }

  const evento = await prisma.anexoEvento.findFirst({
    where: { caminho: { in: variantesCaminho(caminhoNormalizado) } },
    include: { evento: { select: { id: true, unidade: true, codigo: true } } },
  });
  if (evento) {
    return {
      permitido: unidadePermitida(req, evento.evento.unidade),
      tipoRegistro: "AnexoEvento",
      registroId: evento.evento.id,
      unidade: evento.evento.unidade,
    };
  }

  const risco = await prisma.fotoRisco.findFirst({
    where: { caminho: { in: variantesCaminho(caminhoNormalizado) } },
    include: {
      analiseRisco: { select: { id: true, unidade: true, codigo: true } },
    },
  });
  if (risco) {
    return {
      permitido: unidadePermitida(req, risco.analiseRisco.unidade),
      tipoRegistro: "FotoRisco",
      registroId: risco.analiseRisco.id,
      unidade: risco.analiseRisco.unidade,
    };
  }

  const quadra = await prisma.quadraSegurancaAnexo.findFirst({
    where: { caminho: { in: variantesCaminho(caminhoNormalizado) } },
    include: {
      container: { select: { id: true, unidade: true, numeroContainer: true } },
    },
  });
  if (quadra) {
    return {
      permitido: unidadePermitida(req, quadra.container.unidade),
      tipoRegistro: "QuadraSegurancaAnexo",
      registroId: quadra.container.id,
      unidade: quadra.container.unidade,
    };
  }

  const solicitacaoImagem = await prisma.anexoSolicitacaoImagem.findFirst({
    where: { caminho: { in: variantesCaminho(caminhoNormalizado) } },
    include: {
      solicitacao: { select: { id: true, unidade: true, protocolo: true } },
    },
  });
  if (solicitacaoImagem) {
    return {
      permitido: unidadePermitida(req, solicitacaoImagem.solicitacao.unidade),
      tipoRegistro: "AnexoSolicitacaoImagem",
      registroId: solicitacaoImagem.solicitacao.id,
      unidade: solicitacaoImagem.solicitacao.unidade,
    };
  }

  const sugestao = await prisma.sugestaoMelhoria.findFirst({
    where: { printTela: { in: variantesCaminho(caminhoNormalizado) } },
    select: { id: true, unidade: true, autorId: true },
  });
  if (sugestao) {
    const permitido =
      unidadePermitida(req, sugestao.unidade) &&
      (req.usuarioPerfil === PERFIS.SUPER_ADMIN ||
        req.usuarioPerfil === PERFIS.ADMINISTRADOR ||
        sugestao.autorId === req.usuarioId);
    return {
      permitido,
      tipoRegistro: "SugestaoMelhoria",
      registroId: sugestao.id,
      unidade: sugestao.unidade,
    };
  }

  return null;
}

export async function servirArquivoProtegido(req: AuthRequest, res: Response) {
  try {
    const caminhoSolicitado = Array.isArray(req.params[0])
      ? req.params[0].join("/")
      : String(req.params[0] || "");
    const caminhoNormalizado = normalizarCaminho(
      `uploads/${caminhoSolicitado}`,
    );
    const caminhoAbsoluto = path.resolve(process.cwd(), caminhoNormalizado);

    if (!dentroDeUploads(caminhoAbsoluto) || !fs.existsSync(caminhoAbsoluto)) {
      return res.status(404).json({ error: "Arquivo não encontrado." });
    }

    const vinculo = await localizarArquivo(req, caminhoNormalizado);
    if (!vinculo?.permitido) {
      return res
        .status(403)
        .json({ error: "Acesso não autorizado ao arquivo." });
    }

    await registrarLog({
      req,
      acao: `Visualização/download de arquivo protegido`,
      tipoRegistro: vinculo.tipoRegistro,
      registroId: vinculo.registroId,
      dadosNovos: {
        caminho: caminhoNormalizado,
        unidade: vinculo.unidade,
      },
    });

    return res.sendFile(caminhoAbsoluto, {
      headers: {
        "Cache-Control": "private, max-age=300",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ error: "Erro ao carregar arquivo protegido." });
  }
}
