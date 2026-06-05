import { Response } from "express";
import { prisma } from "../lib/prisma";
import { AuthRequest } from "../middlewares/auth";
import { registrarLog } from "../services/auditoria.service";
import { criarUrlValidacaoAssinatura } from "../services/assinaturaDocumento.service";

type DocumentoCentral = {
  id: string;
  modulo: string;
  tipo: string;
  registroId: number;
  protocolo: string;
  titulo: string;
  unidade: string;
  status: string;
  fluxoStatus?: string | null;
  motivoDevolucao?: string | null;
  emitidoEm: Date;
  assinaturaStatus: "Assinado" | "Pendente";
  assinaturaToken?: string | null;
  assinadoPor?: string | null;
  assinadoEm?: Date | null;
  pdfUrl?: string | null;
  validacaoUrl?: string | null;
};

function dataInicioFim(query: AuthRequest["query"]) {
  const inicio = typeof query.inicio === "string" && query.inicio ? new Date(`${query.inicio}T00:00:00`) : null;
  const fim = typeof query.fim === "string" && query.fim ? new Date(`${query.fim}T23:59:59`) : null;
  return { inicio, fim };
}

function filtrarData<T extends { emitidoEm: Date }>(itens: T[], inicio: Date | null, fim: Date | null) {
  return itens.filter((item) => {
    if (inicio && item.emitidoEm < inicio) return false;
    if (fim && item.emitidoEm > fim) return false;
    return true;
  });
}

function chaveAssinatura(modulo: string, registroId: number) {
  return `${modulo}:${registroId}`;
}

function unidadesConsulta(req: AuthRequest) {
  const unidadeFiltro = typeof req.query.unidade === "string" ? req.query.unidade.trim() : "";
  const unidadesBase = [
    ...(req.unidadesPermitidas || []),
    req.unidadeAtiva || "",
    req.usuarioUnidade || "",
  ].filter(Boolean);
  const unidadesPermitidas = Array.from(new Set(unidadesBase.length ? unidadesBase : ["GJA-T1"]));

  if (unidadeFiltro && unidadesPermitidas.includes(unidadeFiltro)) {
    return [unidadeFiltro];
  }

  return unidadesPermitidas;
}

function assinaturaParaMapa(assinaturas: Array<{
  modulo: string;
  registroId: number;
  token: string;
  usuarioNome: string;
  createdAt: Date;
}>) {
  const mapa = new Map<string, { token: string; usuarioNome: string; createdAt: Date }>();
  assinaturas.forEach((assinatura) => {
    const chave = chaveAssinatura(assinatura.modulo, assinatura.registroId);
    if (!mapa.has(chave)) {
      mapa.set(chave, assinatura);
    }
  });
  return mapa;
}

function anexarAssinatura(
  req: AuthRequest,
  documento: Omit<DocumentoCentral, "assinaturaStatus" | "assinaturaToken" | "assinadoPor" | "assinadoEm" | "validacaoUrl">,
  assinatura?: { token: string; usuarioNome: string; createdAt: Date }
): DocumentoCentral {
  return {
    ...documento,
    assinaturaStatus: assinatura ? "Assinado" : "Pendente",
    assinaturaToken: assinatura?.token || null,
    assinadoPor: assinatura?.usuarioNome || null,
    assinadoEm: assinatura?.createdAt || null,
    validacaoUrl: assinatura ? criarUrlValidacaoAssinatura(req, assinatura.token) : null,
  };
}

async function consultaSegura<T>(nome: string, consulta: Promise<T[]>): Promise<T[]> {
  try {
    return await consulta;
  } catch (error) {
    console.error(`Erro ao consultar documentos do modulo ${nome}`, error);
    return [];
  }
}

function moduloPermitidoExclusao(modulo: string) {
  return ["Ocorrencia", "Evento", "Investigacao", "PassagemTurno", "ChecklistInspecao", "RelatorioCftv", "AnaliseRisco"].includes(modulo);
}

async function limparReferenciasDocumento(tx: typeof prisma, modulo: string, registroId: number) {
  await tx.assinaturaDocumento.deleteMany({ where: { modulo, registroId } });
  await tx.solicitacaoAnulacaoRelatorio.deleteMany({ where: { modulo, registroId } });
  await tx.mencao.deleteMany({ where: { modulo, registroId } });
  await tx.comentarioInterno.deleteMany({ where: { modulo, registroId } });
}

async function excluirRegistroDocumento(tx: typeof prisma, modulo: string, registroId: number, unidade: string) {
  if (modulo === "Ocorrencia") {
    await tx.analiseEstrategica.updateMany({ where: { ocorrenciaId: registroId, unidade }, data: { ocorrenciaId: null } });
    await tx.ocorrencia.delete({ where: { id: registroId } });
    return;
  }

  if (modulo === "Evento") {
    await tx.analiseEstrategica.updateMany({ where: { eventoId: registroId, unidade }, data: { eventoId: null } });
    await tx.evento.delete({ where: { id: registroId } });
    return;
  }

  if (modulo === "Investigacao") {
    await tx.analiseEstrategica.updateMany({ where: { investigacaoId: registroId, unidade }, data: { investigacaoId: null } });
    await tx.investigacao.delete({ where: { id: registroId } });
    return;
  }

  if (modulo === "PassagemTurno") {
    await tx.passagemTurno.delete({ where: { id: registroId } });
    return;
  }

  if (modulo === "ChecklistInspecao") {
    await tx.checklistInspecao.delete({ where: { id: registroId } });
    return;
  }

  if (modulo === "RelatorioCftv") {
    await tx.relatorioCftv.delete({ where: { id: registroId } });
    return;
  }

  if (modulo === "AnaliseRisco") {
    await tx.analiseEstrategica.updateMany({ where: { analiseRiscoId: registroId, unidade }, data: { analiseRiscoId: null } });
    await tx.analiseRisco.delete({ where: { id: registroId } });
  }
}

async function buscarDocumentoExclusao(modulo: string, registroId: number, unidade: string) {
  if (modulo === "Ocorrencia") return prisma.ocorrencia.findFirst({ where: { id: registroId, unidade } });
  if (modulo === "Evento") return prisma.evento.findFirst({ where: { id: registroId, unidade } });
  if (modulo === "Investigacao") return prisma.investigacao.findFirst({ where: { id: registroId, unidade } });
  if (modulo === "PassagemTurno") return prisma.passagemTurno.findFirst({ where: { id: registroId, unidade } });
  if (modulo === "ChecklistInspecao") return prisma.checklistInspecao.findFirst({ where: { id: registroId, unidade } });
  if (modulo === "RelatorioCftv") return prisma.relatorioCftv.findFirst({ where: { id: registroId, unidade } });
  if (modulo === "AnaliseRisco") return prisma.analiseRisco.findFirst({ where: { id: registroId, unidade } });
  return null;
}

export async function excluirDocumentoCentral(req: AuthRequest, res: Response) {
  try {
    if (req.usuarioPerfil !== "SUPER_ADMIN") {
      return res.status(403).json({ error: "Somente Super Admin pode excluir relatórios definitivamente." });
    }

    const modulo = String(req.params.modulo || "");
    const registroId = Number(req.params.id);
    const unidade = req.unidadeAtiva || "";

    if (!moduloPermitidoExclusao(modulo) || !Number.isFinite(registroId)) {
      return res.status(400).json({ error: "Documento inválido para exclusão." });
    }

    const documento = await buscarDocumentoExclusao(modulo, registroId, unidade);
    if (!documento) {
      return res.status(404).json({ error: "Documento não encontrado nesta unidade." });
    }

    await prisma.$transaction(async (tx) => {
      await limparReferenciasDocumento(tx as typeof prisma, modulo, registroId);
      await excluirRegistroDocumento(tx as typeof prisma, modulo, registroId, unidade);
    });

    await registrarLog({
      req,
      acao: `Exclusão definitiva de documento ${modulo}`,
      tipoRegistro: modulo,
      registroId,
      dadosAnteriores: documento,
    });

    return res.status(204).send();
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro ao excluir documento definitivamente" });
  }
}

export async function listarDocumentos(req: AuthRequest, res: Response) {
  try {
    const unidades = unidadesConsulta(req);
    const filtroUnidade = { in: unidades };
    const moduloFiltro = typeof req.query.modulo === "string" ? req.query.modulo : "";
    const statusFiltro = typeof req.query.status === "string" ? req.query.status : "";
    const assinaturaFiltro = typeof req.query.assinatura === "string" ? req.query.assinatura : "";
    const busca = typeof req.query.busca === "string" ? req.query.busca.trim().toLowerCase() : "";
    const { inicio, fim } = dataInicioFim(req.query);

    const [
      ocorrencias,
      eventos,
      investigacoes,
      passagens,
      checklists,
      riscos,
      relatoriosCftv,
      assinaturas,
    ] = await Promise.all([
      consultaSegura("Ocorrencia", prisma.ocorrencia.findMany({
        where: { unidade: filtroUnidade },
        select: { id: true, codigo: true, assunto: true, status: true, fluxoStatus: true, motivoDevolucao: true, createdAt: true, unidade: true },
        orderBy: { createdAt: "desc" },
      })),
      consultaSegura("Evento", prisma.evento.findMany({
        where: { unidade: filtroUnidade },
        select: { id: true, codigo: true, assunto: true, status: true, fluxoStatus: true, motivoDevolucao: true, createdAt: true, unidade: true },
        orderBy: { createdAt: "desc" },
      })),
      consultaSegura("Investigacao", prisma.investigacao.findMany({
        where: { unidade: filtroUnidade },
        select: { id: true, codigo: true, titulo: true, status: true, fluxoStatus: true, motivoDevolucao: true, createdAt: true, unidade: true, ocorrenciaId: true },
        orderBy: { createdAt: "desc" },
      })),
      consultaSegura("PassagemTurno", prisma.passagemTurno.findMany({
        where: { unidade: filtroUnidade },
        select: { id: true, codigo: true, equipe: true, status: true, createdAt: true, unidade: true },
        orderBy: { createdAt: "desc" },
      })),
      consultaSegura("ChecklistInspecao", prisma.checklistInspecao.findMany({
        where: { unidade: filtroUnidade },
        select: { id: true, codigo: true, titulo: true, status: true, createdAt: true, unidade: true, local: true },
        orderBy: { createdAt: "desc" },
      })),
      consultaSegura("AnaliseRisco", prisma.analiseRisco.findMany({
        where: { unidade: filtroUnidade },
        select: { id: true, codigo: true, tipoRisco: true, nivelRisco: true, status: true, createdAt: true, unidade: true, local: true },
        orderBy: { createdAt: "desc" },
      })),
      consultaSegura("RelatorioCftv", prisma.relatorioCftv.findMany({
        where: { unidade: filtroUnidade },
        select: { id: true, codigo: true, totalCameras: true, retencaoMedia: true, createdAt: true, unidade: true },
        orderBy: { createdAt: "desc" },
      })),
      consultaSegura("AssinaturaDocumento", prisma.assinaturaDocumento.findMany({
        where: { unidade: filtroUnidade, status: "VALIDA" },
        select: { modulo: true, registroId: true, token: true, usuarioNome: true, createdAt: true },
        orderBy: { createdAt: "desc" },
      })),
    ]);

    const mapaAssinaturas = assinaturaParaMapa(assinaturas);

    const documentos: DocumentoCentral[] = [
      ...ocorrencias.map((item) =>
        anexarAssinatura(req, {
          id: `Ocorrencia-${item.id}`,
          modulo: "Ocorrencia",
          tipo: "Ocorrências",
          registroId: item.id,
          protocolo: item.codigo,
          titulo: item.assunto,
          unidade: item.unidade,
          status: item.status,
          fluxoStatus: item.fluxoStatus,
          motivoDevolucao: item.motivoDevolucao,
          emitidoEm: item.createdAt,
          pdfUrl: `/api/ocorrencias/${item.id}/pdf`,
        }, mapaAssinaturas.get(chaveAssinatura("Ocorrencia", item.id)))
      ),
      ...eventos.map((item) =>
        anexarAssinatura(req, {
          id: `Evento-${item.id}`,
          modulo: "Evento",
          tipo: "Eventos",
          registroId: item.id,
          protocolo: item.codigo,
          titulo: item.assunto,
          unidade: item.unidade,
          status: item.status,
          fluxoStatus: item.fluxoStatus,
          motivoDevolucao: item.motivoDevolucao,
          emitidoEm: item.createdAt,
          pdfUrl: `/api/eventos/${item.id}/pdf`,
        }, mapaAssinaturas.get(chaveAssinatura("Evento", item.id)))
      ),
      ...investigacoes.map((item) =>
        anexarAssinatura(req, {
          id: `Investigacao-${item.id}`,
          modulo: "Investigacao",
          tipo: "Investigações",
          registroId: item.id,
          protocolo: item.codigo || `RI-${item.id}`,
          titulo: item.titulo,
          unidade: item.unidade,
          status: item.status,
          fluxoStatus: item.fluxoStatus,
          motivoDevolucao: item.motivoDevolucao,
          emitidoEm: item.createdAt,
          pdfUrl: `/api/ocorrencias/${item.ocorrenciaId}/pdf`,
        }, mapaAssinaturas.get(chaveAssinatura("Investigacao", item.id)))
      ),
      ...passagens.map((item) =>
        anexarAssinatura(req, {
          id: `PassagemTurno-${item.id}`,
          modulo: "PassagemTurno",
          tipo: "CCOS",
          registroId: item.id,
          protocolo: item.codigo,
          titulo: `Relatório CCOS - ${item.equipe}`,
          unidade: item.unidade,
          status: item.status,
          emitidoEm: item.createdAt,
          pdfUrl: `/api/operacao/passagens-turno/${item.id}/pdf`,
        }, mapaAssinaturas.get(chaveAssinatura("PassagemTurno", item.id)))
      ),
      ...checklists.map((item) =>
        anexarAssinatura(req, {
          id: `ChecklistInspecao-${item.id}`,
          modulo: "ChecklistInspecao",
          tipo: "CIP",
          registroId: item.id,
          protocolo: item.codigo,
          titulo: `${item.titulo} - ${item.local}`,
          unidade: item.unidade,
          status: item.status,
          emitidoEm: item.createdAt,
          pdfUrl: `/api/checklists/${item.id}/pdf`,
        }, mapaAssinaturas.get(chaveAssinatura("ChecklistInspecao", item.id)))
      ),
      ...relatoriosCftv.map((item) =>
        anexarAssinatura(req, {
          id: `RelatorioCftv-${item.id}`,
          modulo: "RelatorioCftv",
          tipo: "CFTV",
          registroId: item.id,
          protocolo: item.codigo,
          titulo: `${item.totalCameras} câmera(s) | retenção média ${item.retencaoMedia} dias`,
          unidade: item.unidade,
          status: "Emitido",
          emitidoEm: item.createdAt,
          pdfUrl: null,
        }, mapaAssinaturas.get(chaveAssinatura("RelatorioCftv", item.id)))
      ),
      ...riscos.map((item) =>
        anexarAssinatura(req, {
          id: `AnaliseRisco-${item.id}`,
          modulo: "AnaliseRisco",
          tipo: "Riscos",
          registroId: item.id,
          protocolo: item.codigo,
          titulo: `${item.tipoRisco} - ${item.local}`,
          unidade: item.unidade,
          status: item.status || item.nivelRisco,
          emitidoEm: item.createdAt,
          pdfUrl: `/api/riscos/${item.id}/pdf`,
        }, mapaAssinaturas.get(chaveAssinatura("AnaliseRisco", item.id)))
      ),
    ];

    const filtrados = filtrarData(documentos, inicio, fim)
      .filter((item) => !moduloFiltro || item.modulo === moduloFiltro || item.tipo === moduloFiltro)
      .filter((item) => !statusFiltro || item.status === statusFiltro)
      .filter((item) => !assinaturaFiltro || item.assinaturaStatus === assinaturaFiltro)
      .filter((item) => {
        if (!busca) return true;
        return [item.protocolo, item.titulo, item.tipo, item.status, item.assinadoPor || ""]
          .join(" ")
          .toLowerCase()
          .includes(busca);
      })
      .sort((a, b) => b.emitidoEm.getTime() - a.emitidoEm.getTime());

    return res.json({
      documentos: filtrados,
      resumo: {
        total: filtrados.length,
        assinados: filtrados.filter((item) => item.assinaturaStatus === "Assinado").length,
        pendentes: filtrados.filter((item) => item.assinaturaStatus === "Pendente").length,
        comPdf: filtrados.filter((item) => Boolean(item.pdfUrl)).length,
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro ao listar central de documentos" });
  }
}
