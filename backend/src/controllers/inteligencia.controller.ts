import { Response } from "express";
import { prisma } from "../lib/prisma";
import { AuthRequest } from "../middlewares/auth";
import { registrarLog } from "../services/auditoria.service";

function contarPor<T>(itens: T[], chave: (item: T) => string | null | undefined) {
  return Object.entries(
    itens.reduce<Record<string, number>>((acc, item) => {
      const nome = chave(item) || "Nao informado";
      acc[nome] = (acc[nome] || 0) + 1;
      return acc;
    }, {})
  )
    .map(([nome, total]) => ({ nome, total }))
    .sort((a, b) => b.total - a.total);
}

function porMes(data: Date) {
  return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, "0")}`;
}

export async function obterInteligencia(req: AuthRequest, res: Response) {
  try {
    const [ocorrencias, eventos, riscos, investigacoes, estrategicas] = await Promise.all([
      prisma.ocorrencia.findMany({ where: { unidade: req.unidadeAtiva } }),
      prisma.evento.findMany({ where: { unidade: req.unidadeAtiva } }),
      prisma.analiseRisco.findMany({ where: { unidade: req.unidadeAtiva } }),
      prisma.investigacao.findMany({ where: { unidade: req.unidadeAtiva } }),
      prisma.analiseEstrategica.findMany({ where: { unidade: req.unidadeAtiva } }),
    ]);

    const registros = [
      ...ocorrencias.map((item) => ({ modulo: "Ocorrencia", local: item.local, natureza: item.natureza, data: item.dataOcorrencia, status: item.status })),
      ...eventos.map((item) => ({ modulo: "Evento", local: item.local, natureza: item.natureza, data: item.dataEvento, status: item.status })),
    ];

    const porLocal = contarPor(registros, (item) => item.local).slice(0, 8);
    const porNatureza = contarPor(registros, (item) => item.natureza).slice(0, 8);
    const porStatus = contarPor(registros, (item) => item.status);
    const riscosCriticos = riscos.filter((item) => ["Critico", "Crítico", "Alto"].includes(item.nivelRisco));
    const investigacoesAbertas = investigacoes.filter((item) => !["Concluido", "Concluído"].includes(item.status));

    const temporal = contarPor(registros, (item) => porMes(new Date(item.data))).sort((a, b) => a.nome.localeCompare(b.nome));
    const locaisCriticos = porLocal.filter((item) => item.total >= 3);
    const naturezasCriticas = porNatureza.filter((item) => item.total >= 3);

    const insights = [
      ...locaisCriticos.map((item) => ({
        tipo: "Local critico",
        titulo: `${item.nome} concentra ${item.total} registros`,
        recomendacao: "Avaliar reforco de controle, ronda, iluminacao, CFTV e procedimento local.",
        severidade: item.total >= 5 ? "alta" : "media",
      })),
      ...naturezasCriticas.map((item) => ({
        tipo: "Natureza recorrente",
        titulo: `${item.nome} aparece em ${item.total} registros`,
        recomendacao: "Criar plano preventivo especifico e acompanhar reincidencia no mes seguinte.",
        severidade: item.total >= 5 ? "alta" : "media",
      })),
      ...riscosCriticos.slice(0, 5).map((item) => ({
        tipo: "Risco relevante",
        titulo: `${item.codigo} - ${item.naturezaRisco} classificado como ${item.nivelRisco}`,
        recomendacao: "Priorizar plano de acao e validar prazo/responsavel.",
        severidade: item.nivelRisco.includes("Crit") ? "alta" : "media",
      })),
    ];

    return res.json({
      totais: {
        ocorrencias: ocorrencias.length,
        eventos: eventos.length,
        riscos: riscos.length,
        investigacoes: investigacoes.length,
        analisesEstrategicas: estrategicas.length,
        riscosCriticos: riscosCriticos.length,
        investigacoesAbertas: investigacoesAbertas.length,
      },
      porLocal,
      porNatureza,
      porStatus,
      temporal,
      insights,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro ao gerar inteligencia operacional" });
  }
}

function mimeRelatoPermitido(mime?: string) {
  return ["image/jpeg", "image/png", "image/webp", "application/pdf"].includes(String(mime || ""));
}

function limparSugestaoRelato(texto: string) {
  return texto
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/i, "")
    .replace(/^relato\s*sugerido\s*:/i, "")
    .trim();
}

function extrairErroOpenAi(detalhe: string) {
  try {
    const json = JSON.parse(detalhe) as {
      error?: {
        message?: string;
        code?: string;
        type?: string;
      };
    };

    return json.error?.message || json.error?.code || json.error?.type || detalhe;
  } catch {
    return detalhe;
  }
}

function mensagemAmigavelOpenAi(status: number, detalhe: string) {
  const detalheNormalizado = detalhe.toLowerCase();

  if (status === 401 || status === 403) {
    return "A chave da OpenAI não foi autorizada. Verifique a OPENAI_API_KEY no arquivo .env e reinicie o backend.";
  }

  if (status === 400 && detalheNormalizado.includes("api key")) {
    return "A chave da OpenAI parece inválida. Confira a OPENAI_API_KEY no arquivo .env e reinicie o backend.";
  }

  if (status === 404 || detalheNormalizado.includes("model")) {
    return "O modelo configurado no OPENAI_OCR_MODEL não foi encontrado ou não está disponível para esta chave.";
  }

  if (status === 429) {
    return "O limite de uso da OpenAI foi atingido. Aguarde alguns minutos ou verifique os limites da conta.";
  }

  return "Não foi possível realizar a leitura inteligente do documento pela OpenAI. Confira a configuração da IA e tente novamente.";
}

async function sugerirRelatoComOpenAi(arquivo: Express.Multer.File) {
  const configuracao = await prisma.configuracaoSistema.findUnique({ where: { chave: "global" } });
  const apiKey = configuracao?.openaiApiKey || process.env.OPENAI_API_KEY;
  const modelo = configuracao?.openaiOcrModel || process.env.OPENAI_OCR_MODEL || "gpt-4.1-mini";

  if (!apiKey) {
    return {
      status: 503,
      error: "Leitura inteligente ainda não configurada.",
      detalhe: "Configure OPENAI_API_KEY no backend para ativar a leitura OCR/IA dos relatos.",
    };
  }

  const prompt = [
    "Você é um assistente do sistema JetGuard para segurança patrimonial.",
    "Leia o documento anexado, que pode ser uma foto ou PDF escaneado de um relato manuscrito.",
    "Extraia o conteúdo com fidelidade, sem inventar fatos.",
    "Organize o texto em português do Brasil, em formato de relato claro, objetivo e profissional.",
    "Mantenha datas, horários, nomes, locais e placas exatamente como forem identificados.",
    "Se algum trecho estiver ilegível, indique entre colchetes: [trecho ilegível].",
    "Retorne somente o texto sugerido para o campo Relato do Envolvido.",
  ].join("\n");

  const arquivoBase64 = arquivo.buffer.toString("base64");
  const arquivoDataUrl = `data:${arquivo.mimetype};base64,${arquivoBase64}`;
  const conteudoArquivo = arquivo.mimetype === "application/pdf"
    ? {
        type: "input_file",
        filename: arquivo.originalname || "relato.pdf",
        file_data: arquivoDataUrl,
      }
    : {
        type: "input_image",
        image_url: arquivoDataUrl,
      };

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: modelo,
      input: [
        {
          role: "user",
          content: [
            { type: "input_text", text: prompt },
            conteudoArquivo,
          ],
        },
      ],
      temperature: 0.2,
      max_output_tokens: 1200,
    }),
  });

  if (!response.ok) {
    const detalhe = await response.text().catch(() => "");
    const detalheTratado = extrairErroOpenAi(detalhe);
    console.error("Erro OpenAI relato OCR:", detalheTratado);
    return {
      status: 502,
      error: mensagemAmigavelOpenAi(response.status, detalheTratado),
      detalhe: process.env.NODE_ENV === "production" ? undefined : detalheTratado,
    };
  }

  const data = (await response.json()) as {
    output_text?: string;
    output?: Array<{
      content?: Array<{ text?: string; type?: string }>;
    }>;
  };
  const texto =
    data.output_text ||
    data.output?.flatMap((item) => item.content || []).map((part) => part.text || "").join("\n").trim() ||
    "";

  if (!texto) {
    return {
      status: 422,
      error: "A IA não conseguiu extrair um relato legível deste documento.",
    };
  }

  return {
    status: 200,
    relatoSugerido: limparSugestaoRelato(texto),
    aviso: "Sugestão gerada por IA com OpenAI. Revise o conteúdo antes de aplicar ao relato.",
  };
}

export async function sugerirRelatoPorOcr(req: AuthRequest, res: Response) {
  try {
    const arquivo = req.file;
    const provedor = (process.env.OCR_PROVIDER || "openai").toLowerCase();

    if (!arquivo) {
      return res.status(400).json({ error: "Anexe uma foto ou PDF do relato manuscrito." });
    }

    if (!mimeRelatoPermitido(arquivo.mimetype)) {
      return res.status(400).json({ error: "Formato não permitido. Envie JPG, PNG, WEBP ou PDF." });
    }

    let resultado:
      | { status: number; error: string; detalhe?: string }
      | { status: number; relatoSugerido: string; aviso: string };

    if (provedor !== "openai") {
      return res.status(400).json({
        error: "Provedor OCR inválido. Configure OCR_PROVIDER=\"openai\" no backend.",
      });
    }

    resultado = await sugerirRelatoComOpenAi(arquivo);

    if ("error" in resultado) {
      return res.status(resultado.status).json({ error: resultado.error, detalhe: resultado.detalhe });
    }

    await registrarLog({
      req,
      acao: "Leitura inteligente de relato do envolvido",
      tipoRegistro: "InteligenciaRelato",
      dadosNovos: {
        nomeArquivo: arquivo.originalname,
        tipo: arquivo.mimetype,
        tamanho: arquivo.size,
      },
    });

    return res.json({
      relatoSugerido: resultado.relatoSugerido,
      aviso: resultado.aviso,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro ao processar leitura inteligente do relato." });
  }
}

