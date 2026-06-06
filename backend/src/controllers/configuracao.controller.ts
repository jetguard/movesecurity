import { Response } from "express";
import { prisma } from "../lib/prisma";
import { AuthRequest } from "../middlewares/auth";
import { registrarLog } from "../services/auditoria.service";

const chavePadrao = "global";
const chaveMascarada = "********";

async function obterOuCriarConfiguracao() {
  return prisma.configuracaoSistema.upsert({
    where: { chave: chavePadrao },
    update: {},
    create: { chave: chavePadrao },
  });
}

function mascararConfiguracao(configuracao: Awaited<ReturnType<typeof obterOuCriarConfiguracao>>) {
  return {
    ...configuracao,
    openaiApiKeyConfigurada: Boolean(configuracao.openaiApiKey || process.env.OPENAI_API_KEY),
    openaiApiKey: configuracao.openaiApiKey ? chaveMascarada : "",
  };
}

export async function buscarConfiguracao(req: AuthRequest, res: Response) {
  try {
    const configuracao = await obterOuCriarConfiguracao();
    return res.json(mascararConfiguracao(configuracao));
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro ao buscar configuracoes" });
  }
}

export async function atualizarConfiguracao(req: AuthRequest, res: Response) {
  try {
    const anterior = await obterOuCriarConfiguracao();
    const data: Record<string, string | number | null | undefined> = {
      nomeEmpresa: req.body.nomeEmpresa || anterior.nomeEmpresa,
      slaCameras: Number(req.body.slaCameras || anterior.slaCameras),
      tempoMaximoOffline: Number(req.body.tempoMaximoOffline || anterior.tempoMaximoOffline),
      checklistCameraDias: Number(req.body.checklistCameraDias || anterior.checklistCameraDias),
      corsPermitido: req.body.corsPermitido,
      logoUrl: req.body.logoUrl,
      rodapePdf: req.body.rodapePdf,
    };

    if (req.usuarioPerfil === "SUPER_ADMIN") {
      data.ocrProvider = req.body.ocrProvider || "openai";
      data.openaiOcrModel = req.body.openaiOcrModel || "gpt-4.1-mini";

      if (
        typeof req.body.openaiApiKey === "string" &&
        req.body.openaiApiKey.trim() &&
        req.body.openaiApiKey !== chaveMascarada
      ) {
        data.openaiApiKey = req.body.openaiApiKey.trim();
      }

      if (req.body.removerOpenaiApiKey === true) {
        data.openaiApiKey = null;
      }
    }

    const configuracao = await prisma.configuracaoSistema.update({
      where: { chave: chavePadrao },
      data,
    });

    await registrarLog({
      req,
      acao: "Atualizacao das configuracoes do sistema",
      tipoRegistro: "ConfiguracaoSistema",
      registroId: configuracao.id,
      dadosAnteriores: { ...anterior, openaiApiKey: anterior.openaiApiKey ? chaveMascarada : "" },
      dadosNovos: { ...configuracao, openaiApiKey: configuracao.openaiApiKey ? chaveMascarada : "" },
    });

    return res.json(mascararConfiguracao(configuracao));
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro ao atualizar configuracoes" });
  }
}
