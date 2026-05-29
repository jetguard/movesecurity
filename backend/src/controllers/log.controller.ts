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
      where: req.usuarioPerfil === PERFIS.SUPER_ADMIN
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

function inicioDoDia(data: Date) {
  const nova = new Date(data);
  nova.setHours(0, 0, 0, 0);
  return nova;
}

function fimDoDia(data: Date) {
  const nova = new Date(data);
  nova.setHours(23, 59, 59, 999);
  return nova;
}

export async function minhaJornada(req: AuthRequest, res: Response) {
  try {
    const dataFiltro = typeof req.query.data === "string" && req.query.data
      ? new Date(`${req.query.data}T12:00:00`)
      : new Date();
    const modulo = String(req.query.modulo || "");
    const termo = String(req.query.q || "").toLowerCase();

    const logs = await prisma.logAuditoria.findMany({
      where: {
        usuarioId: req.usuarioId,
        createdAt: {
          gte: inicioDoDia(dataFiltro),
          lte: fimDoDia(dataFiltro),
        },
        ...(modulo ? { tipoRegistro: modulo } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 300,
    });

    const filtrados = termo
      ? logs.filter((log) =>
          [log.acao, log.tipoRegistro, log.usuarioNome, log.registroId]
            .some((valor) => String(valor || "").toLowerCase().includes(termo))
        )
      : logs;

    const porModulo = filtrados.reduce<Record<string, number>>((acc, log) => {
      acc[log.tipoRegistro] = (acc[log.tipoRegistro] || 0) + 1;
      return acc;
    }, {});

    const porHora = filtrados.reduce<Record<string, number>>((acc, log) => {
      const hora = String(new Date(log.createdAt).getHours()).padStart(2, "0");
      acc[`${hora}:00`] = (acc[`${hora}:00`] || 0) + 1;
      return acc;
    }, {});

    return res.json({
      data: dataFiltro.toISOString().slice(0, 10),
      total: filtrados.length,
      primeiraAtividade: filtrados[filtrados.length - 1]?.createdAt || null,
      ultimaAtividade: filtrados[0]?.createdAt || null,
      modulosUtilizados: Object.keys(porModulo).length,
      porModulo,
      porHora,
      atividades: filtrados.map((log) => ({
        id: log.id,
        acao: log.acao,
        modulo: log.tipoRegistro,
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
