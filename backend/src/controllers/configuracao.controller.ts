import { Response } from "express";
import { prisma } from "../lib/prisma";
import { AuthRequest } from "../middlewares/auth";
import { registrarLog } from "../services/auditoria.service";

const chavePadrao = "global";
const chaveMascarada = "********";
const perfisConfiguracaoSso = ["SUPER_ADMIN", "T_I"];

async function obterOuCriarConfiguracao() {
  return prisma.configuracaoSistema.upsert({
    where: { chave: chavePadrao },
    update: {},
    create: { chave: chavePadrao },
  });
}

function mascararConfiguracao(
  configuracao: Awaited<ReturnType<typeof obterOuCriarConfiguracao>>,
  exibirSso = false,
) {
  const config = configuracao as any;
  const dados = {
    ...config,
    openaiApiKeyConfigurada: Boolean(
      config.openaiApiKey || process.env.OPENAI_API_KEY,
    ),
    openaiApiKey: config.openaiApiKey ? chaveMascarada : "",
    ssoClientSecretConfigurado: Boolean(config.ssoClientSecret),
    ssoClientSecret: config.ssoClientSecret ? chaveMascarada : "",
  };

  if (!exibirSso) {
    for (const chave of Object.keys(dados)) {
      if (chave.startsWith("sso")) delete dados[chave];
    }
  }

  return dados;
}

function podeConfigurarSso(perfil?: string) {
  return perfisConfiguracaoSso.includes(String(perfil || ""));
}

function apiKeyOpenAi(
  configuracao: Awaited<ReturnType<typeof obterOuCriarConfiguracao>>,
) {
  return configuracao.openaiApiKey || process.env.OPENAI_API_KEY || "";
}

function parseJsonSeguro(valor?: string | null) {
  if (!valor) return {};
  try {
    return JSON.parse(valor) as Record<string, unknown>;
  } catch {
    return {};
  }
}

async function validarChaveOpenAi(apiKey: string) {
  if (!apiKey) {
    return {
      status: "nao_configurada",
      chaveValida: false,
      mensagem: "Nenhuma chave OpenAI configurada para o OCR.",
    };
  }

  try {
    const response = await fetch("https://api.openai.com/v1/models", {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    if (response.ok) {
      return {
        status: "valida",
        chaveValida: true,
        mensagem: "Chave OpenAI válida e pronta para uso no OCR inteligente.",
      };
    }

    if (response.status === 401 || response.status === 403) {
      return {
        status: "invalida",
        chaveValida: false,
        mensagem: "Chave OpenAI não autorizada. Revise a chave cadastrada.",
      };
    }

    return {
      status: "erro_validacao",
      chaveValida: false,
      mensagem:
        "Não foi possível validar a chave agora. Tente novamente em instantes.",
    };
  } catch {
    return {
      status: "indisponivel",
      chaveValida: false,
      mensagem:
        "Validação indisponível no momento. Confira a conexão do servidor.",
    };
  }
}

export async function buscarConfiguracao(req: AuthRequest, res: Response) {
  try {
    const configuracao = await obterOuCriarConfiguracao();
    return res.json(
      mascararConfiguracao(configuracao, podeConfigurarSso(req.usuarioPerfil)),
    );
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro ao buscar configuracoes" });
  }
}

export async function buscarConfiguracaoOpenAi(
  req: AuthRequest,
  res: Response,
) {
  try {
    const configuracao = await obterOuCriarConfiguracao();
    const apiKey = apiKeyOpenAi(configuracao);
    const validacao = await validarChaveOpenAi(apiKey);

    return res.json({
      ocrProvider: configuracao.ocrProvider || "openai",
      openaiOcrModel:
        configuracao.openaiOcrModel ||
        process.env.OPENAI_OCR_MODEL ||
        "gpt-4.1-mini",
      openaiAprimoramentoTextoAtivo: configuracao.openaiAprimoramentoTextoAtivo,
      openaiApiKeyConfigurada: Boolean(apiKey),
      openaiApiKey: apiKey ? chaveMascarada : "",
      origemChave: configuracao.openaiApiKey
        ? "Banco de dados"
        : process.env.OPENAI_API_KEY
          ? ".env do servidor"
          : "Nao configurada",
      somenteLeitura: req.usuarioPerfil !== "SUPER_ADMIN",
      validacao,
    });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ error: "Erro ao buscar configuracao da OpenAI" });
  }
}

export async function rankingUsoOpenAi(req: AuthRequest, res: Response) {
  try {
    const logs = await prisma.logAuditoria.findMany({
      where: { tipoRegistro: "InteligenciaRelato" },
      orderBy: { createdAt: "desc" },
      take: 2000,
    });

    const mapa = new Map<
      number | string,
      {
        usuarioId: number | null;
        usuarioNome: string;
        requisicoes: number;
        tokensEntrada: number;
        tokensSaida: number;
        tokensTotal: number;
        ultimoUso: Date;
      }
    >();

    for (const log of logs) {
      const dados = parseJsonSeguro(log.dadosNovos);
      const tokens = (dados.tokens || {}) as Record<string, unknown>;
      const chave = log.usuarioId || `nome:${log.usuarioNome}`;
      const atual = mapa.get(chave) || {
        usuarioId: log.usuarioId,
        usuarioNome: log.usuarioNome,
        requisicoes: 0,
        tokensEntrada: 0,
        tokensSaida: 0,
        tokensTotal: 0,
        ultimoUso: log.createdAt,
      };

      atual.requisicoes += 1;
      atual.tokensEntrada += Number(tokens.entrada || 0);
      atual.tokensSaida += Number(tokens.saida || 0);
      atual.tokensTotal += Number(tokens.total || 0);
      if (log.createdAt > atual.ultimoUso) atual.ultimoUso = log.createdAt;
      mapa.set(chave, atual);
    }

    const ranking = Array.from(mapa.values())
      .sort(
        (a, b) =>
          b.tokensTotal - a.tokensTotal || b.requisicoes - a.requisicoes,
      )
      .slice(0, 20);

    return res.json({
      ranking,
      resumo: {
        usuarios: ranking.length,
        requisicoes: ranking.reduce(
          (total, item) => total + item.requisicoes,
          0,
        ),
        tokensTotal: ranking.reduce(
          (total, item) => total + item.tokensTotal,
          0,
        ),
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro ao buscar consumo de OCR" });
  }
}

export async function atualizarConfiguracao(req: AuthRequest, res: Response) {
  try {
    const anterior = await obterOuCriarConfiguracao();
    const data: Record<string, string | number | boolean | null | undefined> = {
      nomeEmpresa: req.body.nomeEmpresa || anterior.nomeEmpresa,
      slaCameras: Number(req.body.slaCameras || anterior.slaCameras),
      tempoMaximoOffline: Number(
        req.body.tempoMaximoOffline || anterior.tempoMaximoOffline,
      ),
      checklistCameraDias: Number(
        req.body.checklistCameraDias || anterior.checklistCameraDias,
      ),
      corsPermitido: req.body.corsPermitido,
      logoUrl: req.body.logoUrl,
      rodapePdf: req.body.rodapePdf,
    };

    if (typeof req.body.openaiAprimoramentoTextoAtivo === "boolean") {
      data.openaiAprimoramentoTextoAtivo =
        req.body.openaiAprimoramentoTextoAtivo;
    }

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

    if (podeConfigurarSso(req.usuarioPerfil)) {
      data.ssoAtivo = Boolean(req.body.ssoAtivo);
      data.ssoProvider = req.body.ssoProvider || "azure-ad";
      data.ssoNomeBotao =
        req.body.ssoNomeBotao || "Entrar com conta corporativa";
      data.ssoDominioPermitido = req.body.ssoDominioPermitido || null;
      data.ssoClientId = req.body.ssoClientId || null;
      data.ssoTenantId = req.body.ssoTenantId || null;
      data.ssoCallbackUrl = req.body.ssoCallbackUrl || null;
      data.ssoFrontendUrl = req.body.ssoFrontendUrl || null;
      data.ssoAuthorizationUrl = req.body.ssoAuthorizationUrl || null;
      data.ssoTokenUrl = req.body.ssoTokenUrl || null;
      data.ssoUserInfoUrl = req.body.ssoUserInfoUrl || null;
      data.ssoLogoutUrl = req.body.ssoLogoutUrl || null;
      data.ssoMetadataUrl = req.body.ssoMetadataUrl || null;
      data.ssoCertificado = req.body.ssoCertificado || null;
      data.ssoModoPermissao = req.body.ssoModoPermissao || "perfil_manual";
      data.ssoLoginLocalEmergencia =
        req.body.ssoLoginLocalEmergencia !== false;

      if (
        typeof req.body.ssoClientSecret === "string" &&
        req.body.ssoClientSecret.trim() &&
        req.body.ssoClientSecret !== chaveMascarada
      ) {
        data.ssoClientSecret = req.body.ssoClientSecret.trim();
      }

      if (req.body.removerSsoClientSecret === true) {
        data.ssoClientSecret = null;
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
      dadosAnteriores: {
        ...(anterior as any),
        openaiApiKey: (anterior as any).openaiApiKey ? chaveMascarada : "",
        ssoClientSecret: (anterior as any).ssoClientSecret ? chaveMascarada : "",
      },
      dadosNovos: {
        ...(configuracao as any),
        openaiApiKey: (configuracao as any).openaiApiKey ? chaveMascarada : "",
        ssoClientSecret: (configuracao as any).ssoClientSecret ? chaveMascarada : "",
      },
    });

    return res.json(
      mascararConfiguracao(configuracao, podeConfigurarSso(req.usuarioPerfil)),
    );
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro ao atualizar configuracoes" });
  }
}
