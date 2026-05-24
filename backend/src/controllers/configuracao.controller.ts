import { Response } from "express";
import { prisma } from "../lib/prisma";
import { AuthRequest } from "../middlewares/auth";
import { registrarLog } from "../services/auditoria.service";

const chavePadrao = "global";

async function obterOuCriarConfiguracao() {
  return prisma.configuracaoSistema.upsert({
    where: { chave: chavePadrao },
    update: {},
    create: { chave: chavePadrao },
  });
}

export async function buscarConfiguracao(req: AuthRequest, res: Response) {
  try {
    const configuracao = await obterOuCriarConfiguracao();
    return res.json(configuracao);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro ao buscar configurações" });
  }
}

export async function atualizarConfiguracao(req: AuthRequest, res: Response) {
  try {
    const anterior = await obterOuCriarConfiguracao();
    const configuracao = await prisma.configuracaoSistema.update({
      where: { chave: chavePadrao },
      data: {
        nomeEmpresa: req.body.nomeEmpresa || anterior.nomeEmpresa,
        slaCameras: Number(req.body.slaCameras || anterior.slaCameras),
        tempoMaximoOffline: Number(req.body.tempoMaximoOffline || anterior.tempoMaximoOffline),
        checklistCameraDias: Number(req.body.checklistCameraDias || anterior.checklistCameraDias),
        corsPermitido: req.body.corsPermitido,
        logoUrl: req.body.logoUrl,
        rodapePdf: req.body.rodapePdf,
      },
    });

    await registrarLog({
      req,
      acao: "Atualização das configurações do sistema",
      tipoRegistro: "ConfiguracaoSistema",
      registroId: configuracao.id,
      dadosAnteriores: anterior,
      dadosNovos: configuracao,
    });

    return res.json(configuracao);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro ao atualizar configurações" });
  }
}
