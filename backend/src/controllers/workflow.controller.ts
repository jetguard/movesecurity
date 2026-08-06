import { Response } from "express";
import { prisma } from "../lib/prisma";
import { AuthRequest } from "../middlewares/auth";
import { registrarLog } from "../services/auditoria.service";
import {
  assinarDocumento,
  invalidarAssinaturasDocumento,
} from "../services/assinaturaDocumento.service";

type ModuloWorkflow = "ocorrencia" | "evento" | "investigacao";

function normalizarModulo(modulo: string): ModuloWorkflow | null {
  const valor = modulo.toLowerCase();
  if (["ocorrencia", "evento", "investigacao"].includes(valor))
    return valor as ModuloWorkflow;
  return null;
}

async function buscarRegistro(
  modulo: ModuloWorkflow,
  id: number,
  unidade?: string,
) {
  if (modulo === "ocorrencia") {
    return prisma.ocorrencia.findFirst({
      where: { id, unidade },
      include: {
        analise: true,
        investigacao: true,
      },
    });
  }
  if (modulo === "evento") {
    return prisma.evento.findFirst({
      where: { id, unidade },
      include: {
        analise: true,
      },
    });
  }
  return prisma.investigacao.findFirst({
    where: { id, unidade },
    include: {
      ocorrencia: {
        include: {
          analise: true,
        },
      },
    },
  });
}

async function atualizarRegistro(
  modulo: ModuloWorkflow,
  id: number,
  data: Record<string, unknown>,
) {
  if (modulo === "ocorrencia") {
    return prisma.ocorrencia.update({ where: { id }, data });
  }
  if (modulo === "evento") {
    return prisma.evento.update({ where: { id }, data });
  }
  return prisma.investigacao.update({ where: { id }, data });
}

function resumoRegistro(modulo: string, registro: any) {
  return {
    id: registro.id,
    modulo,
    codigo: registro.codigo || registro.numeroOcorrencia,
    titulo: registro.assunto || registro.titulo,
    local: registro.local,
    unidade: registro.unidade,
    status: registro.status,
    fluxoStatus: registro.fluxoStatus,
    motivoDevolucao: registro.motivoDevolucao,
    createdAt: registro.createdAt,
  };
}

function codigoWorkflow(registro: unknown) {
  const dados = registro as {
    codigo?: string | null;
    numeroOcorrencia?: string | null;
    id?: number;
  };
  return dados.codigo || dados.numeroOcorrencia || String(dados.id || "");
}

function criarErroFluxo(message: string, status = 400) {
  const erro = new Error(message);
  (erro as Error & { status?: number }).status = status;
  return erro;
}

function moduloAssinatura(modulo: ModuloWorkflow) {
  return modulo === "ocorrencia"
    ? "Ocorrencia"
    : modulo === "evento"
      ? "Evento"
      : "Investigacao";
}

function validarAprovacaoDocumento(modulo: ModuloWorkflow, registro: any) {
  if (registro.status === "Anulado") {
    throw criarErroFluxo("Documento anulado não pode ser aprovado.");
  }
  if (registro.fluxoStatus === "Em Revisao") {
    throw criarErroFluxo(
      "Conclua a revisão documental antes de aprovar o documento.",
    );
  }
  if (registro.fluxoStatus === "Aprovado") {
    throw criarErroFluxo("Documento já aprovado.");
  }

  if (modulo === "ocorrencia") {
    if (!registro.analise) {
      throw criarErroFluxo(
        "Inicie e conclua a análise da ocorrência antes da aprovação final.",
      );
    }
    if (registro.analise.status !== "Concluído") {
      throw criarErroFluxo(
        "A análise da ocorrência precisa estar concluída antes da aprovação final.",
      );
    }
    if (registro.investigacao && registro.investigacao.status !== "Concluído") {
      throw criarErroFluxo(
        "A investigação vinculada precisa estar concluída antes da aprovação final.",
      );
    }
    return;
  }

  if (modulo === "evento") {
    if (!registro.analise) {
      throw criarErroFluxo(
        "Inicie e conclua a análise do evento antes da aprovação final.",
      );
    }
    if (registro.analise.status !== "Concluído") {
      throw criarErroFluxo(
        "A análise do evento precisa estar concluída antes da aprovação final.",
      );
    }
    return;
  }

  if (registro.status !== "Concluído") {
    throw criarErroFluxo(
      "A investigação precisa estar concluída antes da aprovação final.",
    );
  }
  if (
    registro.ocorrencia?.analise &&
    registro.ocorrencia.analise.status !== "Concluído"
  ) {
    throw criarErroFluxo(
      "A análise da ocorrência vinculada precisa estar concluída antes da aprovação final.",
    );
  }
}

export async function listarWorkflow(req: AuthRequest, res: Response) {
  try {
    const [ocorrencias, eventos, investigacoes] = await Promise.all([
      prisma.ocorrencia.findMany({
        where: { unidade: req.unidadeAtiva },
        orderBy: { createdAt: "desc" },
      }),
      prisma.evento.findMany({
        where: { unidade: req.unidadeAtiva },
        orderBy: { createdAt: "desc" },
      }),
      prisma.investigacao.findMany({
        where: { unidade: req.unidadeAtiva },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    const itens = [
      ...ocorrencias.map((item) => resumoRegistro("ocorrencia", item)),
      ...eventos.map((item) => resumoRegistro("evento", item)),
      ...investigacoes.map((item) => resumoRegistro("investigacao", item)),
    ].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

    return res.json(itens);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro ao listar workflow" });
  }
}

export async function atualizarWorkflow(req: AuthRequest, res: Response) {
  try {
    const modulo = normalizarModulo(String(req.params.modulo));
    const id = Number(req.params.id);
    const acao = String(req.body.acao || "");

    if (!modulo) return res.status(400).json({ error: "Modulo invalido" });

    const anterior = await buscarRegistro(modulo, id, req.unidadeAtiva);
    if (!anterior)
      return res.status(404).json({ error: "Registro nao encontrado" });

    const agora = new Date();
    const dados: Record<string, unknown> = {};
    let acaoLog = "Atualizacao de workflow";

    if (acao === "revisar") {
      if (anterior.fluxoStatus === "Aprovado") {
        throw criarErroFluxo(
          "Documento aprovado não pode iniciar nova revisão. Reabra o documento antes.",
          403,
        );
      }
      dados.fluxoStatus = "Em Revisao";
      dados.revisadoPorId = req.usuarioId;
      dados.revisadoEm = agora;
      acaoLog = "Registro colocado em revisao";
    } else if (acao === "concluir_revisao") {
      if (anterior.fluxoStatus !== "Em Revisao") {
        throw criarErroFluxo(
          "Somente documentos em revisão podem ter revisão concluída.",
        );
      }
      dados.fluxoStatus = "Aguardando Revisao";
      acaoLog = "Revisao documental concluida";
    } else if (acao === "aprovar") {
      validarAprovacaoDocumento(modulo, anterior);

      await assinarDocumento({
        req,
        modulo: moduloAssinatura(modulo),
        registroId: id,
        codigoRegistro: codigoWorkflow(anterior),
        unidade: anterior.unidade,
        acao: "Aprovação do documento",
        dados: anterior,
      });
      dados.fluxoStatus = "Aprovado";
      dados.status = "Concluído";
      dados.aprovadoPorId = req.usuarioId;
      dados.aprovadoEm = agora;
      dados.motivoDevolucao = null;
      acaoLog = "Registro aprovado";
    } else if (acao === "devolver") {
      dados.fluxoStatus = "Devolvido";
      dados.motivoDevolucao = req.body.motivo || "Ajustes solicitados";
      acaoLog = "Registro devolvido para correcao";
    } else if (acao === "reabrir") {
      if (req.usuarioPerfil !== "SUPER_ADMIN") {
        return res
          .status(403)
          .json({
            error: "Somente Super Admin pode reabrir registros aprovados.",
          });
      }

      if (!req.body.motivo) {
        return res
          .status(400)
          .json({ error: "Informe a justificativa da reabertura." });
      }

      dados.fluxoStatus = "Devolvido";
      dados.status = "Reaberto";
      dados.aprovadoPorId = null;
      dados.aprovadoEm = null;
      dados.motivoDevolucao = `Reaberto pelo Super Admin: ${req.body.motivo}`;
      await invalidarAssinaturasDocumento({
        modulo: moduloAssinatura(modulo),
        registroId: id,
        motivo: `Registro reaberto: ${req.body.motivo}`,
      });
      acaoLog = "Registro aprovado reaberto";
    } else {
      return res.status(400).json({ error: "Acao invalida" });
    }

    const atualizado = await atualizarRegistro(modulo, id, dados);

    await registrarLog({
      req,
      acao: `${acaoLog} - ${modulo}`,
      tipoRegistro: modulo,
      registroId: id,
      dadosAnteriores: anterior,
      dadosNovos: atualizado,
    });

    return res.json(atualizado);
  } catch (error) {
    console.error(error);
    const status = (error as Error & { status?: number }).status;
    if (status)
      return res.status(status).json({ error: (error as Error).message });
    return res.status(500).json({ error: "Erro ao atualizar workflow" });
  }
}
