import fs from "fs";
import path from "path";
import { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { jwtExpiresIn, jwtSecret, loginPolicy, sessionPolicy } from "../config/security";
import { registrarLog } from "../services/auditoria.service";

function resolverBancoSqlite() {
  const databaseUrl = process.env.DATABASE_URL || "";

  if (!databaseUrl.startsWith("file:")) {
    return null;
  }

  const caminho = databaseUrl.replace("file:", "");
  return path.resolve(process.cwd(), "prisma", caminho.replace(/^\.\//, ""));
}

function mascaraBooleano(valor: boolean) {
  return valor ? "Configurado" : "Pendente";
}

async function coletarIndicadores() {
  const [
    ocorrencias,
    eventos,
    investigacoes,
    riscosCriticos,
    camerasOffline,
    logsHoje,
  ] = await Promise.all([
    prisma.ocorrencia.count(),
    prisma.evento.count(),
    prisma.investigacao.count(),
    prisma.analiseRisco.count({ where: { nivelRisco: "Crítico" } }),
    prisma.cameraMonitoramento.count({ where: { status: "Desconectada", statusCadastro: "Ativa" } }),
    prisma.logAuditoria.count({
      where: {
        createdAt: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
        },
      },
    }),
  ]);

  return {
    ocorrencias,
    eventos,
    investigacoes,
    riscosCriticos,
    camerasOffline,
    logsHoje,
  };
}

export async function statusGovernanca(req: Request, res: Response) {
  try {
    await prisma.$queryRaw`SELECT 1`;

    const banco = resolverBancoSqlite();
    const uploadPath = path.resolve(process.cwd(), "uploads");
    const backupsPath = path.resolve(process.cwd(), "backups");
    const jwtCustomizado = jwtSecret() !== "jetguard_dev_secret_change_me";
    const superAdminSenha = Boolean(process.env.SUPER_ADMIN_PASSWORD);
    const databaseUrl = Boolean(process.env.DATABASE_URL);
    const corsRestrito = Boolean(process.env.CORS_ORIGIN && process.env.CORS_ORIGIN !== "*");
    const backupExiste = fs.existsSync(backupsPath)
      ? fs.readdirSync(backupsPath).some((arquivo) => arquivo.endsWith(".db"))
      : false;

    return res.json({
      ambiente: {
        nodeEnv: process.env.NODE_ENV || "development",
        api: "online",
        banco: "online",
        sqlitePath: banco ? path.basename(banco) : "Banco externo",
        uploads: fs.existsSync(uploadPath) ? "disponível" : "não encontrado",
        ultimoBackup: backupExiste ? "disponível" : "nenhum backup local",
      },
      seguranca: {
        jwtSecret: mascaraBooleano(jwtCustomizado),
        databaseUrl: mascaraBooleano(databaseUrl),
        superAdminPassword: mascaraBooleano(superAdminSenha),
        corsRestrito: mascaraBooleano(corsRestrito),
        jwtExpiracao: jwtExpiresIn(),
        maxTentativasLogin: loginPolicy.maxAttempts,
        bloqueioLoginMinutos: loginPolicy.lockMinutes,
        inatividadeSessaoMinutos: sessionPolicy.idleMinutes,
      },
      automacaoExecutiva: [
        {
          nome: "Resumo diário operacional",
          frequencia: "Diário",
          conteudo: "Ocorrências, eventos, câmeras offline, riscos críticos e tarefas pendentes.",
          status: "Configurado para geração manual e pronto para agendamento externo.",
        },
        {
          nome: "Relatório semanal executivo",
          frequencia: "Semanal",
          conteudo: "Tendências, reincidência, SLA, criticidade e evolução patrimonial.",
          status: "Pronto para integração com cron/servidor de produção.",
        },
        {
          nome: "Pacote mensal de governança",
          frequencia: "Mensal",
          conteudo: "Indicadores consolidados, auditoria, produtividade e plano de ação.",
          status: "Modelo executivo disponível no módulo de Gestão Patrimonial.",
        },
      ],
      indicadores: await coletarIndicadores(),
      producao: {
        backupAutomatico: {
          status: backupExiste ? "Backup local encontrado" : "Pendente de agendamento",
          recomendacao: "Agendar backup diário do banco e da pasta uploads no cron da VPS.",
        },
        postgres: {
          status: (process.env.DATABASE_URL || "").startsWith("postgres")
            ? "PostgreSQL ativo"
            : "Preparado para migração futura",
          recomendacao: "Manter SQLite em operação leve e migrar para PostgreSQL quando houver maior volume ou múltiplos acessos simultâneos.",
        },
        testesAutomatizados: {
          status: "Base ativa",
          comandos: ["npm test", "npm run typecheck", "npm run lint", "npm run build"],
        },
        monitoramentoSaude: {
          api: "online",
          banco: "online",
          uploads: fs.existsSync(uploadPath) ? "online" : "atenção",
        },
      },
      recomendacoes: [
        "Configurar JWT_SECRET e SUPER_ADMIN_PASSWORD próprios em produção.",
        "Usar CORS_ORIGIN restrito ao domínio oficial do sistema.",
        "Executar backup diário do banco e da pasta uploads.",
        "Migrar para PostgreSQL quando o volume de registros e usuários crescer.",
        "Publicar a API atrás de HTTPS e proxy reverso.",
      ],
      atualizadoEm: new Date().toISOString(),
    });
  } catch (error) {
    return res.status(500).json({
      error: "Erro ao consultar governança do ambiente",
    });
  }
}

export async function gerarBackup(req: Request, res: Response) {
  try {
    const banco = resolverBancoSqlite();

    if (!banco || !fs.existsSync(banco)) {
      return res.status(400).json({
        error: "Backup automático disponível apenas para SQLite local configurado em DATABASE_URL.",
      });
    }

    const destinoDir = path.resolve(process.cwd(), "backups");
    fs.mkdirSync(destinoDir, { recursive: true });

    const carimbo = new Date().toISOString().replace(/[:.]/g, "-");
    const destino = path.join(destinoDir, `jetguard-backup-${carimbo}.db`);
    fs.copyFileSync(banco, destino);

    await registrarLog({
      req,
      acao: "Backup de produção gerado",
      tipoRegistro: "Governanca",
      dadosNovos: {
        arquivo: path.basename(destino),
        dataHora: new Date().toISOString(),
      },
    });

    return res.json({
      mensagem: "Backup gerado com sucesso.",
      arquivo: path.basename(destino),
      caminhoRelativo: `backups/${path.basename(destino)}`,
    });
  } catch (error) {
    return res.status(500).json({
      error: "Erro ao gerar backup",
    });
  }
}
