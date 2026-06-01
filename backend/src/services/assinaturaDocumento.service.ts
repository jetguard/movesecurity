import bcrypt from "bcryptjs";
import crypto from "crypto";
import { Request } from "express";
import { prisma } from "../lib/prisma";

type AuthLikeRequest = Request & {
  usuarioId?: number;
  usuarioPerfil?: string;
  unidadeAtiva?: string;
  sessaoId?: string;
};

export type ModuloAssinavel =
  | "Ocorrencia"
  | "Evento"
  | "Investigacao"
  | "AnaliseOcorrencia"
  | "AnaliseEvento"
  | "PassagemTurno";

function hashDocumento(params: {
  modulo: string;
  registroId: number;
  codigoRegistro: string;
  unidade: string;
  acao: string;
  usuarioId: number;
  dados?: unknown;
}) {
  return crypto
    .createHash("sha256")
    .update(JSON.stringify({
      modulo: params.modulo,
      registroId: params.registroId,
      codigoRegistro: params.codigoRegistro,
      unidade: params.unidade,
      acao: params.acao,
      usuarioId: params.usuarioId,
      dados: params.dados || null,
    }))
    .digest("hex");
}

function gerarTokenAssinatura() {
  const aleatorio = crypto.randomBytes(12).toString("hex").toUpperCase();
  return `JG-${aleatorio.slice(0, 4)}-${aleatorio.slice(4, 8)}-${aleatorio.slice(8, 12)}-${new Date().getFullYear()}`;
}

export function criarUrlValidacaoAssinatura(
  req: Pick<Request, "protocol" | "get">,
  token?: string | null
) {
  if (!token) return "";
  return `${req.protocol}://${req.get("host")}/api/public/assinaturas/${encodeURIComponent(token)}`;
}

export async function assinaturaValidaDocumento(modulo: string, registroId: number) {
  return prisma.assinaturaDocumento.findFirst({
    where: {
      modulo,
      registroId,
      status: "VALIDA",
    },
    include: {
      usuario: {
        select: {
          nome: true,
          apelido: true,
          email: true,
          perfilAcesso: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function invalidarAssinaturasDocumento(params: {
  modulo: string;
  registroId: number;
  motivo: string;
}) {
  await prisma.assinaturaDocumento.updateMany({
    where: {
      modulo: params.modulo,
      registroId: params.registroId,
      status: "VALIDA",
    },
    data: {
      status: "INVALIDADA",
      invalidadaEm: new Date(),
      motivoInvalidacao: params.motivo,
    },
  });
}

export async function exigirSenhaAssinatura(req: AuthLikeRequest) {
  const senha = String(req.body?.senhaAssinatura || "").trim();
  if (!senha) {
    const erro = new Error("Confirme sua senha para assinar eletronicamente este documento.");
    (erro as Error & { status?: number }).status = 400;
    throw erro;
  }

  const usuario = await prisma.usuario.findUnique({
    where: { id: req.usuarioId },
    select: {
      id: true,
      nome: true,
      apelido: true,
      senha: true,
      perfilAcesso: true,
    },
  });

  if (!usuario) {
    const erro = new Error("Usuário não encontrado para assinatura.");
    (erro as Error & { status?: number }).status = 401;
    throw erro;
  }

  const senhaValida = await bcrypt.compare(senha, usuario.senha);
  if (!senhaValida) {
    const erro = new Error("Senha inválida para assinatura eletrônica.");
    (erro as Error & { status?: number }).status = 400;
    throw erro;
  }

  return usuario;
}

export async function assinarDocumento(params: {
  req: AuthLikeRequest;
  modulo: ModuloAssinavel;
  registroId: number;
  codigoRegistro: string;
  unidade: string;
  acao: string;
  dados?: unknown;
}) {
  const usuario = await exigirSenhaAssinatura(params.req);

  const anterior = await assinaturaValidaDocumento(params.modulo, params.registroId);
  const proximaVersao = (anterior?.versao || 0) + 1;

  await invalidarAssinaturasDocumento({
    modulo: params.modulo,
    registroId: params.registroId,
    motivo: `Nova assinatura gerada para a ação: ${params.acao}`,
  });

  return prisma.assinaturaDocumento.create({
    data: {
      token: gerarTokenAssinatura(),
      modulo: params.modulo,
      registroId: params.registroId,
      codigoRegistro: params.codigoRegistro,
      unidade: params.unidade,
      acao: params.acao,
      usuarioId: usuario.id,
      usuarioNome: usuario.apelido || usuario.nome,
      perfilAcesso: usuario.perfilAcesso,
      ip: params.req.ip,
      sessaoId: params.req.sessaoId,
      documentoHash: hashDocumento({
        modulo: params.modulo,
        registroId: params.registroId,
        codigoRegistro: params.codigoRegistro,
        unidade: params.unidade,
        acao: params.acao,
        usuarioId: usuario.id,
        dados: params.dados,
      }),
      versao: proximaVersao,
    },
  });
}
