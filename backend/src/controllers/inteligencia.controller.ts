import { Response } from "express";
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
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

function mimeAudioPermitido(mime?: string) {
  return [
    "audio/webm",
    "audio/ogg",
    "audio/mpeg",
    "audio/mp3",
    "audio/mp4",
    "audio/wav",
    "audio/x-wav",
    "audio/aac",
  ].includes(String(mime || "").split(";")[0]);
}

function extensaoAudio(mime?: string) {
  const tipo = String(mime || "").split(";")[0];
  const mapa: Record<string, string> = {
    "audio/webm": "webm",
    "audio/ogg": "ogg",
    "audio/mpeg": "mp3",
    "audio/mp3": "mp3",
    "audio/mp4": "m4a",
    "audio/wav": "wav",
    "audio/x-wav": "wav",
    "audio/aac": "aac",
  };
  return mapa[tipo] || "webm";
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

function executarWhisperCpp(arquivoEntrada: string, saidaBase: string) {
  const comando = process.env.WHISPER_CPP_COMMAND;
  const modelo = process.env.WHISPER_CPP_MODEL;

  if (!comando || !modelo) {
    return Promise.reject(new Error("WHISPER_NAO_CONFIGURADO"));
  }

  return new Promise<string>((resolve, reject) => {
    const processo = spawn(
      comando,
      ["-m", modelo, "-f", arquivoEntrada, "-l", "pt", "-nt", "-otxt", "-of", saidaBase],
      { windowsHide: true }
    );
    let stdout = "";
    let stderr = "";

    processo.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    processo.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    processo.on("error", reject);
    processo.on("close", async (code) => {
      if (code !== 0) {
        reject(new Error(stderr || `whisper.cpp finalizado com codigo ${code}`));
        return;
      }

      const textoArquivo = await fs.readFile(`${saidaBase}.txt`, "utf8").catch(() => "");
      resolve((textoArquivo || stdout).trim());
    });
  });
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
    usage?: {
      input_tokens?: number;
      output_tokens?: number;
      total_tokens?: number;
    };
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
    modelo,
    tokens: {
      entrada: data.usage?.input_tokens || 0,
      saida: data.usage?.output_tokens || 0,
      total: data.usage?.total_tokens || 0,
    },
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
      | {
          status: number;
          relatoSugerido: string;
          aviso: string;
          modelo?: string;
          tokens?: { entrada: number; saida: number; total: number };
        };

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
        provedor: "openai",
        modelo: resultado.modelo,
        tokens: resultado.tokens,
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

export async function transcreverRelatoAudio(req: AuthRequest, res: Response) {
  const arquivo = req.file;
  const id = randomUUID();
  const caminhoEntrada = path.join(os.tmpdir(), `jetguard-audio-${id}.${extensaoAudio(arquivo?.mimetype)}`);
  const saidaBase = path.join(os.tmpdir(), `jetguard-transcricao-${id}`);

  try {
    if (!arquivo) {
      return res.status(400).json({ error: "Anexe ou grave um áudio para transcrição." });
    }

    if (!mimeAudioPermitido(arquivo.mimetype)) {
      return res.status(400).json({ error: "Formato de áudio não permitido. Envie WEBM, OGG, MP3, M4A ou WAV." });
    }

    await fs.writeFile(caminhoEntrada, arquivo.buffer);
    const transcricao = await executarWhisperCpp(caminhoEntrada, saidaBase);

    if (!transcricao) {
      return res.status(422).json({ error: "Não foi possível identificar uma fala legível neste áudio." });
    }

    await registrarLog({
      req,
      acao: "Transcrição de áudio para relato do envolvido",
      tipoRegistro: "InteligenciaRelatoAudio",
      dadosNovos: {
        nomeArquivo: arquivo.originalname,
        tipo: arquivo.mimetype,
        tamanho: arquivo.size,
        provedor: "whisper.cpp",
      },
    });

    return res.json({
      transcricao,
      aviso: "Transcrição local gerada com whisper.cpp. Revise o texto antes de usar no relatório.",
    });
  } catch (error) {
    if (error instanceof Error && error.message === "WHISPER_NAO_CONFIGURADO") {
      return res.status(503).json({
        error: "Transcrição local ainda não configurada.",
        detalhe: "Configure WHISPER_CPP_COMMAND e WHISPER_CPP_MODEL no .env do backend.",
      });
    }

    console.error(error);
    return res.status(500).json({ error: "Erro ao transcrever áudio do relato." });
  } finally {
    await Promise.all([
      fs.unlink(caminhoEntrada).catch(() => undefined),
      fs.unlink(`${saidaBase}.txt`).catch(() => undefined),
    ]);
  }
}
