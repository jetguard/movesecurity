import { Response } from "express";
import { prisma } from "../lib/prisma";
import { AuthRequest, PERFIS } from "../middlewares/auth";
import { registrarLog } from "../services/auditoria.service";

const STATUS_SUGESTAO = ["Recebida", "Em análise", "Aprovada", "Implementada", "Recusada"];

function podeGerenciarSugestoes(perfil?: string) {
  return perfil === PERFIS.SUPER_ADMIN || perfil === PERFIS.ADMINISTRADOR;
}

function statusValido(status?: string) {
  if (!status) return "Recebida";
  return STATUS_SUGESTAO.includes(status) ? status : "Recebida";
}

export async function listarSugestoesMelhoria(req: AuthRequest, res: Response) {
  try {
    const where = podeGerenciarSugestoes(req.usuarioPerfil)
      ? { unidade: req.unidadeAtiva }
      : { unidade: req.unidadeAtiva, autorId: req.usuarioId };

    const sugestoes = await prisma.sugestaoMelhoria.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        autor: {
          select: {
            id: true,
            nome: true,
            apelido: true,
            email: true,
            perfilAcesso: true,
          },
        },
        avaliadoPor: {
          select: {
            id: true,
            nome: true,
            apelido: true,
          },
        },
      },
    });

    return res.json(sugestoes);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro ao listar sugestões de melhoria" });
  }
}

export async function criarSugestaoMelhoria(req: AuthRequest, res: Response) {
  try {
    const assunto = String(req.body.assunto || "").trim();
    const sugestao = String(req.body.sugestao || "").trim();
    const arquivo = req.file;

    if (!assunto || !sugestao) {
      return res.status(400).json({ error: "Informe o assunto e a sugestão." });
    }

    if (!req.usuarioId) {
      return res.status(401).json({ error: "Usuário não autenticado." });
    }

    const registro = await prisma.sugestaoMelhoria.create({
      data: {
        assunto,
        sugestao,
        printTela: arquivo?.path,
        nomeArquivo: arquivo?.originalname,
        unidade: req.unidadeAtiva || "GJA-T1",
        autorId: req.usuarioId,
      },
      include: {
        autor: {
          select: {
            id: true,
            nome: true,
            apelido: true,
            email: true,
            perfilAcesso: true,
          },
        },
      },
    });

    await registrarLog({
      req,
      acao: `Registro de sugestão de melhoria ${registro.id}`,
      tipoRegistro: "SugestaoMelhoria",
      registroId: registro.id,
      dadosNovos: registro,
    });

    return res.status(201).json(registro);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro ao registrar sugestão de melhoria" });
  }
}

export async function atualizarStatusSugestaoMelhoria(req: AuthRequest, res: Response) {
  try {
    if (!podeGerenciarSugestoes(req.usuarioPerfil)) {
      return res.status(403).json({ error: "Apenas administradores podem alterar o status da sugestão." });
    }

    const anterior = await prisma.sugestaoMelhoria.findFirst({
      where: {
        id: Number(req.params.id),
        unidade: req.unidadeAtiva,
      },
    });

    if (!anterior) {
      return res.status(404).json({ error: "Sugestão não encontrada." });
    }

    const atualizada = await prisma.sugestaoMelhoria.update({
      where: { id: anterior.id },
      data: {
        status: statusValido(req.body.status),
        resposta: String(req.body.resposta || "").trim() || null,
        avaliadoPorId: req.usuarioId,
        avaliadoEm: new Date(),
      },
      include: {
        autor: {
          select: {
            id: true,
            nome: true,
            apelido: true,
            email: true,
            perfilAcesso: true,
          },
        },
        avaliadoPor: {
          select: {
            id: true,
            nome: true,
            apelido: true,
          },
        },
      },
    });

    await registrarLog({
      req,
      acao: `Atualização de sugestão de melhoria ${atualizada.id}`,
      tipoRegistro: "SugestaoMelhoria",
      registroId: atualizada.id,
      dadosAnteriores: anterior,
      dadosNovos: atualizada,
    });

    return res.json(atualizada);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro ao atualizar sugestão de melhoria" });
  }
}
