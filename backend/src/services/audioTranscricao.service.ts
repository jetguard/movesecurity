import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

export class ErroTranscricaoAudio extends Error {
  status: number;
  detalhe?: string;

  constructor(message: string, status = 500, detalhe?: string) {
    super(message);
    this.name = "ErroTranscricaoAudio";
    this.status = status;
    this.detalhe = detalhe;
  }
}

export function mimeAudioPermitido(mime?: string) {
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

function audioEhWav(mime?: string) {
  const tipo = String(mime || "").split(";")[0];
  return ["audio/wav", "audio/x-wav"].includes(tipo);
}

function converterAudioParaWav(arquivoEntrada: string, arquivoSaida: string) {
  const comando = process.env.FFMPEG_COMMAND || "ffmpeg";

  return new Promise<void>((resolve, reject) => {
    const processo = spawn(
      comando,
      ["-y", "-i", arquivoEntrada, "-ar", "16000", "-ac", "1", "-c:a", "pcm_s16le", arquivoSaida],
      { windowsHide: true }
    );
    let stderr = "";

    processo.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    processo.on("error", (error) => reject(new ErroTranscricaoAudio("Conversao de audio indisponivel no servidor.", 503, error.message)));
    processo.on("close", (code) => {
      if (code !== 0) {
        reject(new ErroTranscricaoAudio("Conversao de audio indisponivel no servidor.", 503, stderr || `ffmpeg finalizado com codigo ${code}`));
        return;
      }
      resolve();
    });
  });
}

function executarWhisperCpp(arquivoEntrada: string, saidaBase: string) {
  const comando = process.env.WHISPER_CPP_COMMAND;
  const modelo = process.env.WHISPER_CPP_MODEL;

  if (!comando || !modelo) {
    return Promise.reject(new ErroTranscricaoAudio("Transcricao local ainda nao configurada.", 503, "Configure WHISPER_CPP_COMMAND e WHISPER_CPP_MODEL no .env do backend."));
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
    processo.on("error", (error) => reject(new ErroTranscricaoAudio("Erro ao executar transcricao local.", 500, error.message)));
    processo.on("close", async (code) => {
      if (code !== 0) {
        reject(new ErroTranscricaoAudio("Erro ao executar transcricao local.", 500, stderr || `whisper.cpp finalizado com codigo ${code}`));
        return;
      }

      const textoArquivo = await fs.readFile(`${saidaBase}.txt`, "utf8").catch(() => "");
      resolve((textoArquivo || stdout).trim());
    });
  });
}

export async function transcreverAudioBuffer(arquivo: Express.Multer.File) {
  if (!mimeAudioPermitido(arquivo.mimetype)) {
    throw new ErroTranscricaoAudio("Formato de audio nao permitido. Envie WEBM, OGG, MP3, M4A ou WAV.", 400);
  }

  const id = randomUUID();
  const caminhoEntrada = path.join(os.tmpdir(), `jetguard-audio-${id}.${extensaoAudio(arquivo.mimetype)}`);
  const caminhoWav = path.join(os.tmpdir(), `jetguard-audio-${id}.wav`);
  const saidaBase = path.join(os.tmpdir(), `jetguard-transcricao-${id}`);

  try {
    await fs.writeFile(caminhoEntrada, arquivo.buffer);
    const arquivoTranscricao = audioEhWav(arquivo.mimetype) ? caminhoEntrada : caminhoWav;
    if (!audioEhWav(arquivo.mimetype)) {
      await converterAudioParaWav(caminhoEntrada, caminhoWav);
    }

    const transcricao = await executarWhisperCpp(arquivoTranscricao, saidaBase);
    if (!transcricao) {
      throw new ErroTranscricaoAudio("Nao foi possivel identificar uma fala legivel neste audio.", 422);
    }

    return transcricao;
  } finally {
    await Promise.all([
      fs.unlink(caminhoEntrada).catch(() => undefined),
      fs.unlink(caminhoWav).catch(() => undefined),
      fs.unlink(`${saidaBase}.txt`).catch(() => undefined),
    ]);
  }
}
