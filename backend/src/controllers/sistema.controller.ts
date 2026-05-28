import fs from "fs";
import path from "path";
import { Response } from "express";
import { AuthRequest } from "../middlewares/auth";

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
