import { Response } from "express";
import { AuthRequest } from "../middlewares/auth";
import { prisma } from "../lib/prisma";
import { registrarLog } from "../services/auditoria.service";

function normalizarStatus(status?: unknown) {
  const valor = String(status || "ATIVA").toUpperCase();
  return ["ATIVA", "ENCERRADA", "EXPIRADA", "DESCONECTADA"].includes(valor) ? valor : "ATIVA";
}

export async function listarSessoes(req: AuthRequest, res: Response) {
  try {
    const status = normalizarStatus(req.query.status);
    const sessoes = await prisma.sessaoUsuario.findMany({
      where: { status },
      orderBy: status === "ATIVA" ? { ultimaAtividadeEm: "desc" } : { encerradaEm: "desc" },
      take: 150,
      include: {
        usuario: {
          select: {
            id: true,
            nome: true,
            apelido: true,
            email: true,
            perfilAcesso: true,
            equipe: true,
            unidade: true,
            fotoPerfil: true,
          },
        },
      },
    });

    return res.json(sessoes);
  } catch (error) {
    return res.status(500).json({ error: "Erro ao listar sessões" });
  }
}

export async function desconectarSessao(req: AuthRequest, res: Response) {
  try {
    const id = String(req.params.id);
    const sessao = await prisma.sessaoUsuario.findUnique({
      where: { id },
      include: { usuario: { select: { id: true, nome: true, email: true } } },
    });

    if (!sessao) {
      return res.status(404).json({ error: "Sessão não encontrada." });
    }

    if (sessao.status !== "ATIVA") {
      return res.status(400).json({ error: "Esta sessão já está encerrada." });
    }

    if (sessao.id === req.sessaoId) {
      return res.status(400).json({ error: "Use o botão Sair para encerrar sua própria sessão." });
    }

    const atualizada = await prisma.sessaoUsuario.update({
      where: { id },
      data: {
        status: "DESCONECTADA",
        encerradaEm: new Date(),
        encerradaPor: "Administrador",
        encerradaPorId: req.usuarioId,
        motivoEncerramento: String(req.body?.motivo || "Desconectada pelo administrador"),
      },
      include: { usuario: { select: { id: true, nome: true, email: true } } },
    });

    await registrarLog({
      req,
      acao: `Administrador desconectou a sessão do usuário ${sessao.usuario.nome}`,
      tipoRegistro: "SessaoUsuario",
      registroId: sessao.usuarioId,
      dadosAnteriores: {
        id: sessao.id,
        status: sessao.status,
        usuario: sessao.usuario.nome,
      },
      dadosNovos: {
        id: atualizada.id,
        status: atualizada.status,
        encerradaEm: atualizada.encerradaEm,
        motivo: atualizada.motivoEncerramento,
      },
    });

    return res.json(atualizada);
  } catch (error) {
    return res.status(500).json({ error: "Erro ao desconectar sessão" });
  }
}
