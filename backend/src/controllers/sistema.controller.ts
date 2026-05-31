import fs from "fs";
import path from "path";
import { Response } from "express";
import { AuthRequest } from "../middlewares/auth";
import { prisma } from "../lib/prisma";
import { jwtSecret } from "../config/security";

type SecaoChangelog = {
  titulo: string;
  itens: string[];
};

function lerJson(caminho: string) {
  try {
    return JSON.parse(fs.readFileSync(caminho, "utf8")) as { version?: string };
  } catch {
    return {};
  }
}

function caminhosProjeto() {
  const cwd = process.cwd();
  const raiz = fs.existsSync(path.resolve(cwd, "CHANGELOG.md"))
    ? cwd
    : path.resolve(cwd, "..");
  const backendDir = fs.existsSync(path.resolve(cwd, "src", "server.ts"))
    ? cwd
    : path.resolve(raiz, "backend");

  return {
    raiz,
    backendPackage: path.resolve(backendDir, "package.json"),
    rootPackage: path.resolve(raiz, "package.json"),
    changelog: path.resolve(raiz, "CHANGELOG.md"),
  };
}

function parseChangelog(markdown: string) {
  const linhas = markdown.split(/\r?\n/);
  const versoes: Array<{ versao: string; data: string; secoes: SecaoChangelog[] }> = [];
  let versaoAtual: { versao: string; data: string; secoes: SecaoChangelog[] } | null = null;
  let secaoAtual: SecaoChangelog | null = null;

  linhas.forEach((linha) => {
    const versao = linha.match(/^## \[([^\]]+)\] - (.+)$/);
    if (versao) {
      versaoAtual = {
        versao: versao[1],
        data: versao[2],
        secoes: [],
      };
      versoes.push(versaoAtual);
      secaoAtual = null;
      return;
    }

    const secao = linha.match(/^### (.+)$/);
    if (secao && versaoAtual) {
      secaoAtual = {
        titulo: secao[1],
        itens: [],
      };
      versaoAtual.secoes.push(secaoAtual);
      return;
    }

    if (linha.startsWith("- ") && secaoAtual) {
      secaoAtual.itens.push(linha.slice(2));
    }
  });

  return versoes;
}

export function atualizacoesSistema(_req: AuthRequest, res: Response) {
  const caminhos = caminhosProjeto();
  const pacoteBackend = lerJson(caminhos.backendPackage);
  const pacoteRoot = lerJson(caminhos.rootPackage);
  const versaoAtual = pacoteRoot.version || pacoteBackend.version || "1.0.0";
  const changelog = fs.existsSync(caminhos.changelog)
    ? fs.readFileSync(caminhos.changelog, "utf8")
    : "";

  return res.json({
    sistema: "JetGuard - Movecta Patrimonial",
    versaoAtual,
    atualizadoEm: new Date().toISOString(),
    changelog: parseChangelog(changelog),
  });
}

function listarArquivosRecursivo(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];

  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entrada) => {
    const completo = path.join(dir, entrada.name);
    if (entrada.isDirectory()) return listarArquivosRecursivo(completo);
    return [completo];
  });
}

function relativoUpload(caminho: string) {
  return caminho.replace(/\\/g, "/").replace(/^\/+/, "");
}

function tamanhoMb(bytes: number) {
  return Number((bytes / 1024 / 1024).toFixed(2));
}

export async function integridadeSistema(_req: AuthRequest, res: Response) {
  try {
    const cwd = process.cwd();
    const uploadsDir = path.resolve(cwd, "uploads");
    const backupsDir = path.resolve(cwd, "backups");

    const [ocorrenciaAnexos, eventoAnexos, riscosFotos, quadraAnexos, sugestoes, sessoesAtivas, sessoesExpiradas, falhasLoginHoje] = await Promise.all([
      prisma.anexoOcorrencia.findMany({ include: { ocorrencia: { select: { codigo: true, unidade: true } } } }),
      prisma.anexoEvento.findMany({ include: { evento: { select: { codigo: true, unidade: true } } } }),
      prisma.fotoRisco.findMany({ include: { analiseRisco: { select: { codigo: true, unidade: true } } } }),
      prisma.quadraSegurancaAnexo.findMany({ include: { container: { select: { numeroContainer: true, unidade: true } } } }),
      prisma.sugestaoMelhoria.findMany({ where: { printTela: { not: null } }, select: { id: true, printTela: true, unidade: true } }),
      prisma.sessaoUsuario.count({ where: { status: "ATIVA" } }),
      prisma.sessaoUsuario.count({ where: { status: { in: ["ENCERRADA", "DESCONECTADA", "EXPIRADA"] } } }),
      prisma.logAuditoria.count({
        where: {
          createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
          acao: { contains: "login" },
        },
      }),
    ]);

    const registros = [
      ...ocorrenciaAnexos.map((item) => ({ modulo: "Ocorrência", id: item.id, caminho: item.caminho, hash: item.hashArquivo, unidade: item.ocorrencia.unidade, codigo: item.ocorrencia.codigo })),
      ...eventoAnexos.map((item) => ({ modulo: "Evento", id: item.id, caminho: item.caminho, hash: item.hashArquivo, unidade: item.evento.unidade, codigo: item.evento.codigo })),
      ...riscosFotos.map((item) => ({ modulo: "Risco", id: item.id, caminho: item.caminho, hash: null, unidade: item.analiseRisco.unidade, codigo: item.analiseRisco.codigo })),
      ...quadraAnexos.map((item) => ({ modulo: "Quadra", id: item.id, caminho: item.caminho, hash: item.hashArquivo, unidade: item.container.unidade, codigo: item.container.numeroContainer })),
      ...sugestoes.map((item) => ({ modulo: "Sugestão", id: item.id, caminho: item.printTela || "", hash: null, unidade: item.unidade, codigo: `Sugestão ${item.id}` })),
    ];

    const arquivosDisco = listarArquivosRecursivo(uploadsDir).map((arquivo) => relativoUpload(path.relative(cwd, arquivo)));
    const caminhosBanco = new Set(registros.map((item) => relativoUpload(item.caminho)));
    const arquivosOrfaos = arquivosDisco.filter((arquivo) => !caminhosBanco.has(arquivo));
    const arquivosAusentes = registros.filter((item) => item.caminho && !fs.existsSync(path.resolve(cwd, item.caminho)));
    const semHash = registros.filter((item) => !item.hash);
    const backups = fs.existsSync(backupsDir)
      ? fs.readdirSync(backupsDir)
          .filter((arquivo) => arquivo.endsWith(".db"))
          .map((arquivo) => {
            const stat = fs.statSync(path.join(backupsDir, arquivo));
            return { arquivo, tamanhoMb: tamanhoMb(stat.size), criadoEm: stat.mtime };
          })
          .sort((a, b) => b.criadoEm.getTime() - a.criadoEm.getTime())
      : [];

    const alertas = [
      ...(jwtSecret() === "jetguard_dev_secret_change_me" ? ["JWT_SECRET está usando valor padrão de desenvolvimento."] : []),
      ...(process.env.CORS_ORIGIN && process.env.CORS_ORIGIN !== "*" ? [] : ["CORS_ORIGIN não está restrito ao domínio oficial."]),
      ...(backups.length === 0 ? ["Nenhum backup local encontrado."] : []),
      ...(arquivosAusentes.length > 0 ? [`${arquivosAusentes.length} registro(s) apontam para arquivo ausente.`] : []),
      ...(arquivosOrfaos.length > 0 ? [`${arquivosOrfaos.length} arquivo(s) em uploads não possuem vínculo no banco.`] : []),
      ...(semHash.length > 0 ? [`${semHash.length} evidência(s) ainda sem hash registrado.`] : []),
    ];

    return res.json({
      resumo: {
        evidenciasBanco: registros.length,
        arquivosDisco: arquivosDisco.length,
        arquivosOrfaos: arquivosOrfaos.length,
        arquivosAusentes: arquivosAusentes.length,
        evidenciasSemHash: semHash.length,
        backups: backups.length,
        sessoesAtivas,
        sessoesHistoricas: sessoesExpiradas,
        falhasLoginHoje,
        alertas: alertas.length,
      },
      alertas,
      arquivosOrfaos: arquivosOrfaos.slice(0, 50),
      arquivosAusentes: arquivosAusentes.slice(0, 50),
      evidenciasSemHash: semHash.slice(0, 50),
      backups: backups.slice(0, 10),
      atualizadoEm: new Date().toISOString(),
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro ao consultar integridade do sistema" });
  }
}
