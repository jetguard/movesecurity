import fs from "fs";
import path from "path";
import { Response } from "express";
import { AuthRequest } from "../middlewares/auth";
import { prisma } from "../lib/prisma";
import { jwtSecret } from "../config/security";
import { registrarLog } from "../services/auditoria.service";

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
  const versoes: Array<{
    versao: string;
    data: string;
    secoes: SecaoChangelog[];
  }> = [];
  let versaoAtual: {
    versao: string;
    data: string;
    secoes: SecaoChangelog[];
  } | null = null;
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

function uploadsDir() {
  return path.resolve(process.cwd(), "uploads");
}

function caminhoQuarentena() {
  return path.join(uploadsDir(), "quarentena");
}

function relativoUpload(caminho: string) {
  return caminho.replace(/\\/g, "/").replace(/^\/+/, "");
}

function relativoSeguroUpload(caminho: string) {
  const normalizado = relativoUpload(caminho);
  if (!normalizado.startsWith("uploads/")) return null;
  if (normalizado.includes("..")) return null;
  if (normalizado.startsWith("uploads/quarentena/")) return null;

  const absoluto = path.resolve(process.cwd(), normalizado);
  if (!absoluto.startsWith(uploadsDir())) return null;

  return normalizado;
}

function caminhoAbsolutoUpload(caminho: string) {
  const normalizado = relativoUpload(caminho);
  return path.resolve(process.cwd(), normalizado);
}

function tamanhoMb(bytes: number) {
  return Number((bytes / 1024 / 1024).toFixed(2));
}

function listarArquivosUploadsAtivos(cwd: string) {
  return listarArquivosRecursivo(uploadsDir())
    .map((arquivo) => relativoUpload(path.relative(cwd, arquivo)))
    .filter(
      (arquivo) =>
        arquivo.startsWith("uploads/") &&
        !arquivo.startsWith("uploads/quarentena/"),
    );
}

function listarArquivosQuarentena(cwd: string) {
  return listarArquivosRecursivo(caminhoQuarentena())
    .map((arquivo) => {
      const stat = fs.statSync(arquivo);
      return {
        arquivo: relativoUpload(path.relative(cwd, arquivo)),
        tamanhoMb: tamanhoMb(stat.size),
        movidoEm: stat.mtime,
      };
    })
    .sort((a, b) => b.movidoEm.getTime() - a.movidoEm.getTime());
}

async function dadosIntegridade() {
  const cwd = process.cwd();
  const backupsDir = path.resolve(cwd, "backups");

  const [
    ocorrenciaAnexos,
    eventoAnexos,
    riscosFotos,
    quadraAnexos,
    sugestoes,
    usuariosComFoto,
    sessoesAtivas,
    sessoesExpiradas,
    falhasLoginHoje,
  ] = await Promise.all([
    prisma.anexoOcorrencia.findMany({
      include: { ocorrencia: { select: { codigo: true, unidade: true } } },
    }),
    prisma.anexoEvento.findMany({
      include: { evento: { select: { codigo: true, unidade: true } } },
    }),
    prisma.fotoRisco.findMany({
      include: { analiseRisco: { select: { codigo: true, unidade: true } } },
    }),
    prisma.quadraSegurancaAnexo.findMany({
      include: {
        container: { select: { numeroContainer: true, unidade: true } },
      },
    }),
    prisma.sugestaoMelhoria.findMany({
      where: { printTela: { not: null } },
      select: { id: true, printTela: true, unidade: true },
    }),
    prisma.usuario.findMany({
      where: { fotoPerfil: { not: null } },
      select: { id: true, nome: true, fotoPerfil: true, unidade: true },
    }),
    prisma.sessaoUsuario.count({ where: { status: "ATIVA" } }),
    prisma.sessaoUsuario.count({
      where: { status: { in: ["ENCERRADA", "DESCONECTADA", "EXPIRADA"] } },
    }),
    prisma.logAuditoria.count({
      where: {
        createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
        acao: { contains: "login" },
      },
    }),
  ]);

  const registros = [
    ...ocorrenciaAnexos.map((item) => ({
      modulo: "Ocorrencia",
      id: item.id,
      caminho: item.caminho,
      hash: item.hashArquivo,
      unidade: item.ocorrencia.unidade,
      codigo: item.ocorrencia.codigo,
    })),
    ...eventoAnexos.map((item) => ({
      modulo: "Evento",
      id: item.id,
      caminho: item.caminho,
      hash: item.hashArquivo,
      unidade: item.evento.unidade,
      codigo: item.evento.codigo,
    })),
    ...riscosFotos.map((item) => ({
      modulo: "Risco",
      id: item.id,
      caminho: item.caminho,
      hash: null,
      unidade: item.analiseRisco.unidade,
      codigo: item.analiseRisco.codigo,
    })),
    ...quadraAnexos.map((item) => ({
      modulo: "Quadra",
      id: item.id,
      caminho: item.caminho,
      hash: item.hashArquivo,
      unidade: item.container.unidade,
      codigo: item.container.numeroContainer,
    })),
    ...sugestoes.map((item) => ({
      modulo: "Sugestao",
      id: item.id,
      caminho: item.printTela || "",
      hash: null,
      unidade: item.unidade,
      codigo: `Sugestao ${item.id}`,
    })),
    ...usuariosComFoto.map((item) => ({
      modulo: "Perfil",
      id: item.id,
      caminho: item.fotoPerfil || "",
      hash: "foto-perfil",
      unidade: item.unidade,
      codigo: item.nome,
    })),
  ];

  const arquivosDisco = listarArquivosUploadsAtivos(cwd);
  const caminhosBanco = new Set(
    registros.map((item) => relativoUpload(item.caminho)),
  );
  const arquivosOrfaos = arquivosDisco.filter(
    (arquivo) => !caminhosBanco.has(arquivo),
  );
  const arquivosAusentes = registros.filter(
    (item) =>
      item.caminho && !fs.existsSync(caminhoAbsolutoUpload(item.caminho)),
  );
  const semHash = registros.filter((item) => !item.hash);
  const arquivosQuarentena = listarArquivosQuarentena(cwd);
  const backups = fs.existsSync(backupsDir)
    ? fs
        .readdirSync(backupsDir)
        .filter((arquivo) => arquivo.endsWith(".db"))
        .map((arquivo) => {
          const stat = fs.statSync(path.join(backupsDir, arquivo));
          return {
            arquivo,
            tamanhoMb: tamanhoMb(stat.size),
            criadoEm: stat.mtime,
          };
        })
        .sort((a, b) => b.criadoEm.getTime() - a.criadoEm.getTime())
    : [];

  const alertas = [
    ...(jwtSecret() === "jetguard_dev_secret_change_me"
      ? ["JWT_SECRET esta usando valor padrao de desenvolvimento."]
      : []),
    ...(process.env.CORS_ORIGIN && process.env.CORS_ORIGIN !== "*"
      ? []
      : ["CORS_ORIGIN nao esta restrito ao dominio oficial."]),
    ...(backups.length === 0 ? ["Nenhum backup local encontrado."] : []),
    ...(arquivosAusentes.length > 0
      ? [`${arquivosAusentes.length} registro(s) apontam para arquivo ausente.`]
      : []),
    ...(arquivosOrfaos.length > 0
      ? [
          `${arquivosOrfaos.length} arquivo(s) em uploads nao possuem vinculo no banco.`,
        ]
      : []),
    ...(semHash.length > 0
      ? [`${semHash.length} evidencia(s) ainda sem hash registrado.`]
      : []),
    ...(arquivosQuarentena.length > 0
      ? [
          `${arquivosQuarentena.length} arquivo(s) aguardam decisao na quarentena.`,
        ]
      : []),
  ];

  return {
    registros,
    arquivosDisco,
    arquivosOrfaos,
    arquivosAusentes,
    semHash,
    arquivosQuarentena,
    backups,
    sessoesAtivas,
    sessoesExpiradas,
    falhasLoginHoje,
    alertas,
  };
}

export async function integridadeSistema(_req: AuthRequest, res: Response) {
  try {
    const dados = await dadosIntegridade();

    return res.json({
      resumo: {
        evidenciasBanco: dados.registros.length,
        arquivosDisco: dados.arquivosDisco.length,
        arquivosOrfaos: dados.arquivosOrfaos.length,
        arquivosAusentes: dados.arquivosAusentes.length,
        evidenciasSemHash: dados.semHash.length,
        backups: dados.backups.length,
        arquivosQuarentena: dados.arquivosQuarentena.length,
        sessoesAtivas: dados.sessoesAtivas,
        sessoesHistoricas: dados.sessoesExpiradas,
        falhasLoginHoje: dados.falhasLoginHoje,
        alertas: dados.alertas.length,
      },
      alertas: dados.alertas,
      arquivosOrfaos: dados.arquivosOrfaos.slice(0, 100),
      arquivosAusentes: dados.arquivosAusentes.slice(0, 50),
      evidenciasSemHash: dados.semHash.slice(0, 50),
      arquivosQuarentena: dados.arquivosQuarentena.slice(0, 100),
      backups: dados.backups.slice(0, 10),
      atualizadoEm: new Date().toISOString(),
    });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ error: "Erro ao consultar integridade do sistema" });
  }
}

function exigirSuperAdmin(req: AuthRequest, res: Response) {
  if (req.usuarioPerfil !== "SUPER_ADMIN") {
    res
      .status(403)
      .json({ error: "Apenas Super Admin pode executar esta acao." });
    return false;
  }

  return true;
}

export async function moverOrfaosParaQuarentena(
  req: AuthRequest,
  res: Response,
) {
  if (!exigirSuperAdmin(req, res)) return;

  try {
    const dados = await dadosIntegridade();
    const solicitados = Array.isArray(req.body?.arquivos)
      ? req.body.arquivos.map((item: unknown) => String(item))
      : dados.arquivosOrfaos;
    const orfaos = new Set(dados.arquivosOrfaos);
    const movidos: string[] = [];
    const ignorados: string[] = [];
    const lote = new Date().toISOString().replace(/[:.]/g, "-");

    fs.mkdirSync(caminhoQuarentena(), { recursive: true });

    for (const arquivo of solicitados) {
      const relativo = relativoSeguroUpload(arquivo);
      if (!relativo || !orfaos.has(relativo)) {
        ignorados.push(String(arquivo));
        continue;
      }

      const origem = path.resolve(process.cwd(), relativo);
      if (!fs.existsSync(origem)) {
        ignorados.push(relativo);
        continue;
      }

      const destino = path.join(
        caminhoQuarentena(),
        lote,
        relativo.replace(/^uploads\//, ""),
      );
      fs.mkdirSync(path.dirname(destino), { recursive: true });
      fs.renameSync(origem, destino);
      movidos.push(relativo);
    }

    await registrarLog({
      req,
      acao: "Arquivos orfaos movidos para quarentena",
      tipoRegistro: "Integridade",
      dadosNovos: { totalMovidos: movidos.length, movidos, ignorados },
    });

    return res.json({
      mensagem: `${movidos.length} arquivo(s) movido(s) para quarentena.`,
      movidos,
      ignorados,
    });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ error: "Erro ao mover arquivos para quarentena" });
  }
}

export async function excluirArquivosQuarentena(
  req: AuthRequest,
  res: Response,
) {
  if (!exigirSuperAdmin(req, res)) return;

  try {
    const cwd = process.cwd();
    const quarentena = listarArquivosQuarentena(cwd).map(
      (item) => item.arquivo,
    );
    const solicitados = Array.isArray(req.body?.arquivos)
      ? req.body.arquivos.map((item: unknown) => String(item))
      : quarentena;
    const permitidos = new Set(quarentena);
    const excluidos: string[] = [];
    const ignorados: string[] = [];
    const dirQuarentena = caminhoQuarentena();

    for (const arquivo of solicitados) {
      const relativo = relativoUpload(String(arquivo));
      if (
        !relativo.startsWith("uploads/quarentena/") ||
        relativo.includes("..") ||
        !permitidos.has(relativo)
      ) {
        ignorados.push(String(arquivo));
        continue;
      }

      const absoluto = path.resolve(cwd, relativo);
      if (!absoluto.startsWith(dirQuarentena) || !fs.existsSync(absoluto)) {
        ignorados.push(relativo);
        continue;
      }

      fs.unlinkSync(absoluto);
      excluidos.push(relativo);
    }

    await registrarLog({
      req,
      acao: "Exclusao definitiva de arquivos em quarentena",
      tipoRegistro: "Integridade",
      dadosNovos: { totalExcluidos: excluidos.length, excluidos, ignorados },
    });

    return res.json({
      mensagem: `${excluidos.length} arquivo(s) excluido(s) definitivamente.`,
      excluidos,
      ignorados,
    });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ error: "Erro ao excluir arquivos em quarentena" });
  }
}
