import { Response } from "express";
import { prisma } from "../lib/prisma";
import { AuthRequest, PERFIS } from "../middlewares/auth";
import { registrarLog } from "../services/auditoria.service";

const STATUS_PENDENTE = "Pendente";
const STATUS_APROVADO = "Aprovado";
const STATUS_RECUSADO = "Recusado";
const STATUS_ANULADO = "Anulado";

function moduloValido(modulo: string) {
  return modulo === "Ocorrencia" || modulo === "Evento";
}

async function buscarRegistro(modulo: string, id: number, unidade: string) {
  if (modulo === "Ocorrencia") {
    return prisma.ocorrencia.findFirst({
      where: { id, unidade },
      select: { id: true, codigo: true, assunto: true, status: true },
    });
  }

  return prisma.evento.findFirst({
    where: { id, unidade },
    select: { id: true, codigo: true, assunto: true, status: true },
  });
}

function podeDecidir(perfil?: string) {
  return perfil === PERFIS.SUPER_ADMIN || perfil === PERFIS.ADMINISTRADOR;
}

export async function listarSolicitacoesAnulacao(req: AuthRequest, res: Response) {
  try {
    const solicitacoes = await prisma.solicitacaoAnulacaoRelatorio.findMany({
      where: {
        unidade: req.unidadeAtiva,
        OR: podeDecidir(req.usuarioPerfil)
          ? undefined
          : [
              { solicitanteId: req.usuarioId },
              { acordos: { some: { analistaId: req.usuarioId } } },
            ],
      },
      orderBy: { createdAt: "desc" },
      include: {
        solicitante: { select: { nome: true, apelido: true, email: true } },
        decididoPor: { select: { nome: true, apelido: true } },
        acordos: {
          orderBy: { createdAt: "asc" },
          include: { analista: { select: { nome: true, apelido: true, email: true } } },
        },
      },
    });

    return res.json(solicitacoes);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro ao listar solicitações de anulação" });
  }
}

export async function solicitarAnulacaoRelatorio(req: AuthRequest, res: Response) {
  try {
    const { modulo, registroId, motivo } = req.body;

    if (!moduloValido(modulo) || !registroId || !motivo?.trim()) {
      return res.status(400).json({ error: "Informe relatório e motivo da anulação." });
    }

    const registro = await buscarRegistro(modulo, Number(registroId), req.unidadeAtiva || "GJA-T1");
    if (!registro) return res.status(404).json({ error: "Relatório não encontrado." });
    if (registro.status === STATUS_ANULADO) {
      return res.status(400).json({ error: "Este relatório já está anulado." });
    }

    const pendente = await prisma.solicitacaoAnulacaoRelatorio.findFirst({
      where: {
        modulo,
        registroId: Number(registroId),
        unidade: req.unidadeAtiva,
        status: STATUS_PENDENTE,
      },
    });

    if (pendente) {
      return res.status(400).json({ error: "Já existe uma solicitação pendente para este relatório." });
    }

    const analistas = await prisma.usuario.findMany({
      where: {
        statusUsuario: "ATIVO",
        OR: [
          { unidade: req.unidadeAtiva },
          { unidadesPermitidas: { contains: req.unidadeAtiva } },
          { perfilAcesso: PERFIS.SUPER_ADMIN },
        ],
        perfilAcesso: { in: [PERFIS.SUPER_ADMIN, PERFIS.ADMINISTRADOR, PERFIS.ANALISTA] },
        NOT: { id: req.usuarioId },
      },
      select: { id: true },
    });

    const solicitacao = await prisma.solicitacaoAnulacaoRelatorio.create({
      data: {
        modulo,
        registroId: Number(registroId),
        codigoRegistro: registro.codigo,
        tituloRegistro: registro.assunto,
        unidade: req.unidadeAtiva || "GJA-T1",
        motivo,
        solicitanteId: req.usuarioId!,
        acordos: {
          create: analistas.map((analista) => ({
            analistaId: analista.id,
          })),
        },
      },
      include: {
        solicitante: { select: { nome: true, apelido: true, email: true } },
        acordos: { include: { analista: { select: { nome: true, apelido: true, email: true } } } },
      },
    });

    if (analistas.length > 0) {
      await prisma.mencao.createMany({
        data: analistas.map((analista) => ({
          modulo: "AnulacaoRelatorio",
          registroId: solicitacao.id,
          codigoRegistro: registro.codigo,
          tituloRegistro: `Solicitação de anulação - ${registro.assunto}`,
          unidade: req.unidadeAtiva || "GJA-T1",
          usuarioMencionadoId: analista.id,
          autorId: req.usuarioId,
          tipoMencao: "Acordo para anulação",
          observacao: motivo,
        })),
      });
    }

    await registrarLog({
      req,
      acao: "Solicitação de anulação de relatório",
      tipoRegistro: modulo,
      registroId: registro.id,
      dadosNovos: { ...registro, motivo, solicitacaoId: solicitacao.id },
    });

    return res.status(201).json(solicitacao);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro ao solicitar anulação" });
  }
}

export async function registrarAcordoAnulacao(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const { status, observacao } = req.body;

    if (![STATUS_APROVADO, STATUS_RECUSADO].includes(status)) {
      return res.status(400).json({ error: "Status de acordo inválido." });
    }

    const acordo = await prisma.acordoAnulacaoRelatorio.findFirst({
      where: {
        solicitacaoId: Number(id),
        analistaId: req.usuarioId,
      },
      include: { solicitacao: true },
    });

    if (!acordo) return res.status(404).json({ error: "Acordo não encontrado para este usuário." });
    if (acordo.solicitacao.status !== STATUS_PENDENTE) {
      return res.status(400).json({ error: "Esta solicitação já foi decidida." });
    }

    const atualizado = await prisma.acordoAnulacaoRelatorio.update({
      where: { id: acordo.id },
      data: {
        status,
        observacao,
        decididoEm: new Date(),
      },
      include: {
        analista: { select: { nome: true, apelido: true, email: true } },
        solicitacao: true,
      },
    });

    await registrarLog({
      req,
      acao: `${status} acordo de anulação`,
      tipoRegistro: "AnulacaoRelatorio",
      registroId: Number(id),
      dadosNovos: atualizado,
    });

    return res.json(atualizado);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro ao registrar acordo" });
  }
}

export async function decidirAnulacao(req: AuthRequest, res: Response) {
  try {
    if (!podeDecidir(req.usuarioPerfil)) {
      return res.status(403).json({ error: "Apenas administrador pode decidir a anulação." });
    }

    const { id } = req.params;
    const { decisao, justificativa } = req.body;

    if (![STATUS_APROVADO, STATUS_RECUSADO].includes(decisao)) {
      return res.status(400).json({ error: "Decisão inválida." });
    }

    const solicitacao = await prisma.solicitacaoAnulacaoRelatorio.findFirst({
      where: { id: Number(id), unidade: req.unidadeAtiva },
      include: { acordos: true },
    });

    if (!solicitacao) return res.status(404).json({ error: "Solicitação não encontrada." });
    if (solicitacao.status !== STATUS_PENDENTE) {
      return res.status(400).json({ error: "Esta solicitação já foi decidida." });
    }

    const possuiRecusa = solicitacao.acordos.some((acordo) => acordo.status === STATUS_RECUSADO);
    const possuiPendencia = solicitacao.acordos.some((acordo) => acordo.status === STATUS_PENDENTE);

    if (decisao === STATUS_APROVADO && (possuiPendencia || possuiRecusa)) {
      return res.status(400).json({
        error: "A anulação só pode ser aprovada após o acordo de todos os analistas mencionados.",
      });
    }

    const statusFinal = decisao === STATUS_APROVADO ? STATUS_ANULADO : STATUS_RECUSADO;

    const resultado = await prisma.$transaction(async (tx) => {
      const atualizada = await tx.solicitacaoAnulacaoRelatorio.update({
        where: { id: solicitacao.id },
        data: {
          status: statusFinal,
          decisaoMotivo: justificativa,
          decididoPorId: req.usuarioId,
          decididoEm: new Date(),
        },
        include: {
          solicitante: { select: { nome: true, apelido: true, email: true } },
          decididoPor: { select: { nome: true, apelido: true } },
          acordos: { include: { analista: { select: { nome: true, apelido: true, email: true } } } },
        },
      });

      if (statusFinal === STATUS_ANULADO) {
        if (solicitacao.modulo === "Ocorrencia") {
          await tx.ocorrencia.update({
            where: { id: solicitacao.registroId },
            data: { status: STATUS_ANULADO },
          });
        } else {
          await tx.evento.update({
            where: { id: solicitacao.registroId },
            data: { status: STATUS_ANULADO },
          });
        }
      }

      return atualizada;
    });

    await registrarLog({
      req,
      acao: statusFinal === STATUS_ANULADO ? "Anulação de relatório aprovada" : "Anulação de relatório recusada",
      tipoRegistro: solicitacao.modulo,
      registroId: solicitacao.registroId,
      dadosAnteriores: solicitacao,
      dadosNovos: resultado,
    });

    return res.json(resultado);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro ao decidir anulação" });
  }
}
