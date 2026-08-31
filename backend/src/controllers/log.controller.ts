import { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { AuthRequest, PERFIS } from "../middlewares/auth";

export async function listarLogs(req: AuthRequest, res: Response) {
  try {
    const superAdmins = await prisma.usuario.findMany({
      where: { perfilAcesso: PERFIS.SUPER_ADMIN },
      select: { id: true },
    });
    const superAdminIds = superAdmins.map((usuario) => usuario.id);

    const logs = await prisma.logAuditoria.findMany({
      where:
        req.usuarioPerfil === PERFIS.SUPER_ADMIN
          ? {}
          : {
              NOT: {
                AND: [
                  { usuarioId: { in: superAdminIds } },
                  { tipoRegistro: { in: ["Auth", "SessaoUsuario"] } },
                ],
              },
            },
      orderBy: {
        createdAt: "desc",
      },
      take: 200,
    });

    return res.json(logs);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro ao listar logs" });
  }
}

const rotulosModulos: Record<string, string> = {
  AnaliseEstrategica: "Análises Estratégicas",
  AnaliseEvento: "Análises de Eventos",
  AnaliseOcorrencia: "Análises de Ocorrências",
  AnaliseRisco: "Análises de Risco",
  AnulacaoRelatorio: "Anulações",
  Auth: "Acessos e Segurança",
  CameraChecklistOperacional: "Checklist CFTV",
  CameraEventoStatus: "Eventos CFTV",
  CameraMonitoramento: "Câmeras CFTV",
  ChecklistInspecao: "Inspeção Preventiva",
  ComentarioInterno: "Comentários Internos",
  ConfiguracaoSistema: "Configurações do Sistema",
  Evento: "Relatórios de Eventos",
  Governanca: "Governança",
  InteligenciaRelato: "Inteligência OCR",
  InteligenciaRelatoAudio: "Transcrição de Áudio",
  Investigacao: "Investigações",
  LocalTerminal: "Locais",
  Mencao: "Menções",
  Natureza: "Naturezas e Subnaturezas",
  Ocorrencia: "Relatórios de Ocorrências",
  Operacao: "Operações",
  PassagemTurno: "Relatórios CCOS",
  Planejamento: "Tarefas Operacionais",
  PlanoAcao: "Planos de Ação",
  QuadraSeguranca: "Quadra de Segurança",
  RelatorioCftv: "Relatórios CFTV",
  RelatorioDiario: "Relatório Diário Executivo",
  SessaoUsuario: "Sessões",
  SugestaoMelhoria: "Sugestões de Melhoria",
  Usuario: "Usuários",
  UsuarioPerfil: "Perfil do Usuário",
};

function rotuloModulo(tipoRegistro: string) {
  return (
    rotulosModulos[tipoRegistro] ||
    tipoRegistro.replace(/([a-z])([A-Z])/g, "$1 $2")
  );
}

function limitesDiaSaoPaulo(data: string) {
  const inicio = new Date(`${data}T00:00:00.000-03:00`);
  const fim = new Date(`${data}T23:59:59.999-03:00`);
  return { inicio, fim };
}

function horaSaoPaulo(data: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    hour: "2-digit",
    hourCycle: "h23",
  })
    .format(data)
    .padStart(2, "0");
}

export async function minhaJornada(req: AuthRequest, res: Response) {
  try {
    const dataFiltro =
      typeof req.query.data === "string" &&
      /^\d{4}-\d{2}-\d{2}$/.test(req.query.data)
        ? req.query.data
        : new Intl.DateTimeFormat("en-CA", {
            timeZone: "America/Sao_Paulo",
          }).format(new Date());
    const modulo = String(req.query.modulo || "");
    const termo = String(req.query.q || "").toLowerCase();
    const { inicio, fim } = limitesDiaSaoPaulo(dataFiltro);

    const logs = await prisma.logAuditoria.findMany({
      where: {
        usuarioId: req.usuarioId,
        createdAt: {
          gte: inicio,
          lte: fim,
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const modulosDisponiveis = Array.from(
      new Set(logs.map((log) => log.tipoRegistro)),
    )
      .map((valor) => ({
        valor,
        label: rotuloModulo(valor),
        total: logs.filter((log) => log.tipoRegistro === valor).length,
      }))
      .sort((a, b) => a.label.localeCompare(b.label, "pt-BR"));

    const logsModulo = modulo
      ? logs.filter((log) => log.tipoRegistro === modulo)
      : logs;
    const filtrados = termo
      ? logsModulo.filter((log) =>
          [
            log.acao,
            log.tipoRegistro,
            rotuloModulo(log.tipoRegistro),
            log.usuarioNome,
            log.registroId,
          ].some((valor) =>
            String(valor || "")
              .toLowerCase()
              .includes(termo),
          ),
        )
      : logsModulo;

    const porModulo = filtrados.reduce<Record<string, number>>((acc, log) => {
      const nome = rotuloModulo(log.tipoRegistro);
      acc[nome] = (acc[nome] || 0) + 1;
      return acc;
    }, {});

    const horasIniciais = Object.fromEntries(
      Array.from({ length: 24 }, (_, hora) => [
        `${String(hora).padStart(2, "0")}:00`,
        0,
      ]),
    ) as Record<string, number>;
    const porHora = filtrados.reduce<Record<string, number>>((acc, log) => {
      const hora = horaSaoPaulo(log.createdAt);
      acc[`${hora}:00`] = (acc[`${hora}:00`] || 0) + 1;
      return acc;
    }, horasIniciais);

    return res.json({
      data: dataFiltro,
      total: filtrados.length,
      primeiraAtividade: filtrados[filtrados.length - 1]?.createdAt || null,
      ultimaAtividade: filtrados[0]?.createdAt || null,
      modulosUtilizados: Object.keys(porModulo).length,
      modulosDisponiveis,
      porModulo,
      porHora,
      atividades: filtrados.map((log) => ({
        id: log.id,
        acao: log.acao,
        modulo: rotuloModulo(log.tipoRegistro),
        moduloCodigo: log.tipoRegistro,
        registroId: log.registroId,
        data: log.createdAt,
        ip: log.ip,
      })),
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro ao carregar minha jornada" });
  }
}
