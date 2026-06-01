import { Request } from "express";
import jwt from "jsonwebtoken";
import { prisma } from "../lib/prisma";
import { jwtSecret } from "../config/security";

type TokenPayload = {
  id: number;
};

function extrairCodigo(registro: unknown) {
  if (!registro || typeof registro !== "object") return undefined;

  const dados = registro as Record<string, unknown>;
  if (typeof dados.codigo === "string") return dados.codigo;
  if (typeof dados.numeroOcorrencia === "string") return dados.numeroOcorrencia;
  if (dados.ocorrencia && typeof dados.ocorrencia === "object") {
    const ocorrencia = dados.ocorrencia as Record<string, unknown>;
    if (typeof ocorrencia.codigo === "string") return ocorrencia.codigo;
  }
  if (dados.evento && typeof dados.evento === "object") {
    const evento = dados.evento as Record<string, unknown>;
    if (typeof evento.codigo === "string") return evento.codigo;
  }

  return undefined;
}

function moduloLegivel(tipoRegistro: string) {
  const mapa: Record<string, string> = {
    Ocorrencia: "Relatório de Ocorrência",
    Evento: "Relatório de Evento",
    Investigacao: "Investigação",
    AnaliseOcorrencia: "Relatório de Ocorrência",
    AnaliseEvento: "Relatório de Evento",
    AnulacaoRelatorio: "Solicitação de Anulação",
    Usuario: "Usuário",
    Auth: "Acesso",
    Governanca: "Governança",
    Planejamento: "Tarefas Operacionais",
    QuadraSeguranca: "Quadra de Segurança",
    Operacao: "Operação",
    ChecklistInspecao: "Checklist Operacional",
    CameraMonitoramento: "CFTV",
    CameraChecklistOperacional: "Checklist CFTV",
  };

  return mapa[tipoRegistro] || tipoRegistro;
}

function montarAcaoLegivel(params: {
  usuarioNome: string;
  acao: string;
  tipoRegistro: string;
  registroId?: number;
  dadosAnteriores?: unknown;
  dadosNovos?: unknown;
}) {
  const modulo = moduloLegivel(params.tipoRegistro);
  const codigo =
    extrairCodigo(params.dadosNovos) ||
    extrairCodigo(params.dadosAnteriores) ||
    (params.registroId ? String(params.registroId).padStart(4, "0") : undefined);
  const alvo = codigo ? `${modulo} nº${codigo}` : modulo;

  const anterior = params.dadosAnteriores as Record<string, unknown> | undefined;
  const novo = params.dadosNovos as Record<string, unknown> | undefined;
  if (
    anterior?.status &&
    novo?.status &&
    anterior.status !== novo.status
  ) {
    return `O usuário ${params.usuarioNome} alterou o status de "${anterior.status}" para "${novo.status}" no ${alvo}`;
  }

  if (params.acao.includes("Criação")) {
    return `O usuário ${params.usuarioNome} registrou o ${alvo}`;
  }

  if (params.acao.includes("Alteração de foto de perfil")) {
    return `O usuário ${params.usuarioNome} alterou sua foto de perfil`;
  }

  if (params.acao.includes("Remoção de foto de perfil")) {
    return `O usuário ${params.usuarioNome} removeu sua foto de perfil`;
  }

  if (params.acao.includes("Alteração de apelido")) {
    return `O usuário ${params.usuarioNome} alterou seu apelido`;
  }

  if (params.acao.includes("Início de análise")) {
    return `O usuário ${params.usuarioNome} iniciou uma análise no ${alvo}`;
  }

  if (params.acao.includes("Conclusão de análise")) {
    return `O usuário ${params.usuarioNome} concluiu a análise no ${alvo}`;
  }

  if (params.acao.includes("Conversão")) {
    return `O usuário ${params.usuarioNome} converteu o ${alvo} para investigação`;
  }

  if (params.acao.includes("Solicitação de anulação")) {
    return `O usuário ${params.usuarioNome} solicitou a anulação do ${alvo}`;
  }

  if (params.acao.includes("Anulação de relatório aprovada")) {
    return `O administrador ${params.usuarioNome} aprovou a anulação do ${alvo}`;
  }

  if (params.acao.includes("Anulação de relatório recusada")) {
    return `O administrador ${params.usuarioNome} recusou a anulação do ${alvo}`;
  }

  if (params.acao.includes("Aprovado acordo de anulação")) {
    return `O usuário ${params.usuarioNome} registrou acordo favorável na ${alvo}`;
  }

  if (params.acao.includes("Recusado acordo de anulação")) {
    return `O usuário ${params.usuarioNome} recusou acordo na ${alvo}`;
  }

  if (params.acao.includes("Atualização")) {
    return `O usuário ${params.usuarioNome} atualizou o ${alvo}`;
  }

  if (params.acao.includes("Acesso")) {
    return `O usuário ${params.usuarioNome} acessou o sistema`;
  }

  if (params.acao.includes("Logout")) {
    return `O usuário ${params.usuarioNome} encerrou a sessão no sistema`;
  }

  return `O usuário ${params.usuarioNome} executou "${params.acao}" no ${alvo}`;
}

export async function registrarLog(params: {
  req: Request;
  acao: string;
  tipoRegistro: string;
  registroId?: number;
  dadosAnteriores?: unknown;
  dadosNovos?: unknown;
}) {
  try {
    const authHeader = params.req.headers.authorization;
    const usuarioIdReq = (params.req as Request & { usuarioId?: number }).usuarioId;
    let usuario = null;

    if (usuarioIdReq) {
      usuario = await prisma.usuario.findUnique({
        where: {
          id: usuarioIdReq,
        },
        select: {
          id: true,
          nome: true,
          apelido: true,
        },
      });
    } else if (authHeader) {
      const [, token] = authHeader.split(" ");
      const payload = jwt.verify(token, jwtSecret()) as TokenPayload;

      usuario = await prisma.usuario.findUnique({
        where: {
          id: payload.id,
        },
        select: {
          id: true,
          nome: true,
          apelido: true,
        },
      });
    }

    const usuarioNome = usuario?.apelido || usuario?.nome || "Sistema";

    await prisma.logAuditoria.create({
      data: {
        usuarioId: usuario?.id,
        usuarioNome,
        ip: params.req.ip,
        acao: montarAcaoLegivel({
          usuarioNome,
          acao: params.acao,
          tipoRegistro: params.tipoRegistro,
          registroId: params.registroId,
          dadosAnteriores: params.dadosAnteriores,
          dadosNovos: params.dadosNovos,
        }),
        tipoRegistro: params.tipoRegistro,
        registroId: params.registroId,
        dadosAnteriores: params.dadosAnteriores
          ? JSON.stringify(params.dadosAnteriores)
          : undefined,
        dadosNovos: params.dadosNovos ? JSON.stringify(params.dadosNovos) : undefined,
      },
    });
  } catch (error) {
    console.error("Erro ao registrar log:", error);
  }
}

