import { Response } from "express";
import { prisma } from "../lib/prisma";
import { AuthRequest } from "../middlewares/auth";
import { registrarLog } from "../services/auditoria.service";
import { enviarEmail } from "../services/email.service";
import { criptografarSegredo } from "../utils/secretCrypto";

const chavePadrao = "global";
const chaveMascarada = "********";
const perfisConfiguracaoSso = ["SUPER_ADMIN", "T_I", "TI"];

function normalizarPerfilAcesso(perfil?: string | null) {
  return String(perfil || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

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
  exibirSmtp = false,
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
    smtpSenhaConfigurada: Boolean(config.smtpSenha || process.env.SMTP_PASS),
    smtpSenha: config.smtpSenha ? chaveMascarada : "",
  };

  if (!exibirSso) {
    for (const chave of Object.keys(dados)) {
      if (chave.startsWith("sso")) delete dados[chave];
    }
  }

  if (!exibirSmtp) {
    for (const chave of Object.keys(dados)) {
      if (chave.startsWith("smtp")) delete dados[chave];
    }
  }

  return dados;
}

function podeConfigurarSso(perfil?: string) {
  return perfisConfiguracaoSso.includes(normalizarPerfilAcesso(perfil));
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
      mascararConfiguracao(
        configuracao,
        podeConfigurarSso(req.usuarioPerfil),
        req.usuarioPerfil === "SUPER_ADMIN",
      ),
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

    if (req.usuarioPerfil === "SUPER_ADMIN") {
      data.smtpAtivo = Boolean(req.body.smtpAtivo);
      data.smtpHost = req.body.smtpHost || null;
      data.smtpPorta = Number(req.body.smtpPorta || 587);
      data.smtpSeguro = Boolean(req.body.smtpSeguro);
      data.smtpUsuario = req.body.smtpUsuario || null;
      data.smtpRemetente = req.body.smtpRemetente || null;
      data.smtpRespostaPara = req.body.smtpRespostaPara || null;

      if (
        typeof req.body.smtpSenha === "string" &&
        req.body.smtpSenha.trim() &&
        req.body.smtpSenha !== chaveMascarada
      ) {
        data.smtpSenha = criptografarSegredo(req.body.smtpSenha.trim());
      }

      if (req.body.removerSmtpSenha === true) {
        data.smtpSenha = null;
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
        smtpSenha: (anterior as any).smtpSenha ? chaveMascarada : "",
      },
      dadosNovos: {
        ...(configuracao as any),
        openaiApiKey: (configuracao as any).openaiApiKey ? chaveMascarada : "",
        ssoClientSecret: (configuracao as any).ssoClientSecret ? chaveMascarada : "",
        smtpSenha: (configuracao as any).smtpSenha ? chaveMascarada : "",
      },
    });

    return res.json(
      mascararConfiguracao(
        configuracao,
        podeConfigurarSso(req.usuarioPerfil),
        req.usuarioPerfil === "SUPER_ADMIN",
      ),
    );
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro ao atualizar configuracoes" });
  }
}

export async function testarSmtpConfiguracao(req: AuthRequest, res: Response) {
  try {
    if (req.usuarioPerfil !== "SUPER_ADMIN") {
      return res.status(403).json({ error: "Acesso restrito ao super_admin." });
    }

    const usuario = req.usuarioId
      ? await prisma.usuario.findUnique({
          where: { id: req.usuarioId },
          select: { email: true },
        })
      : null;
    const destino = String(req.body?.destino || usuario?.email || "").trim();
    if (!destino || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(destino)) {
      return res
        .status(400)
        .json({ error: "Informe um e-mail válido para o teste." });
    }

    const resultado = await enviarEmail({
      to: destino,
      subject: "Teste SMTP - MoveSecurity",
      text:
        "Este é um e-mail de teste enviado pelas configurações SMTP do MoveSecurity.",
      html: `
        <div style="font-family:Arial,sans-serif;color:#0f172a;line-height:1.5">
          <h2 style="margin:0 0 12px;color:#2563eb">Teste SMTP - MoveSecurity</h2>
          <p>Este é um e-mail de teste enviado pelas configurações SMTP do MoveSecurity.</p>
          <p style="margin-top:18px">Atenciosamente,<br/>Segurança Patrimonial - Movecta</p>
        </div>
      `,
    });

    if (!resultado.enviado) {
      return res.status(400).json({
        error:
          resultado.status === "SMTP_NAO_CONFIGURADO"
            ? "SMTP não configurado ou inativo."
            : "Não foi possível enviar o e-mail de teste.",
        status: resultado.status,
      });
    }

    await registrarLog({
      req,
      acao: "Teste das configuracoes SMTP",
      tipoRegistro: "ConfiguracaoSistema",
      registroId: (await obterOuCriarConfiguracao()).id,
      dadosNovos: { destino, status: resultado.status },
    });

    return res.json({
      mensagem: `E-mail de teste enviado para ${destino}.`,
      status: resultado.status,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro ao testar SMTP." });
  }
}
