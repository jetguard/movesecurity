import { Response } from "express";
import { prisma } from "../lib/prisma";
import { AuthRequest } from "../middlewares/auth";
import { registrarLog } from "../services/auditoria.service";
import { emitirRealtime } from "../services/realtime.service";

const STATUS_CONECTADA = "Conectada";
const STATUS_DESCONECTADA = "Desconectada";

function numero(valor: unknown, fallback = 0) {
  const convertido = Number(valor);
  return Number.isFinite(convertido) ? convertido : fallback;
}

function codigo(valor: unknown, fallback = "") {
  const texto = String(valor ?? fallback).trim();
  return texto ? texto.toUpperCase() : fallback;
}

function minutosEntre(inicio: Date, fim: Date) {
  return Math.max(0, Math.round((fim.getTime() - inicio.getTime()) / 60000));
}

function dataOpcional(valor: unknown) {
  if (!valor) return null;
  const data = new Date(String(valor));
  return Number.isNaN(data.getTime()) ? null : data;
}

function formatarRetencao(minutosTotais: number) {
  const minutos = Math.max(0, Math.round(minutosTotais));
  const dias = Math.floor(minutos / 1440);
  const horas = Math.floor((minutos % 1440) / 60);
  const minutosRestantes = minutos % 60;
  return `${dias} dias, ${String(horas).padStart(2, "0")} horas e ${String(minutosRestantes).padStart(2, "0")} minutos`;
}

function formatarIndisponibilidade(minutosTotais: number) {
  const minutos = Math.max(0, Math.round(minutosTotais));
  const dias = Math.floor(minutos / 1440);
  const horas = Math.floor((minutos % 1440) / 60);
  const minutosRestantes = minutos % 60;
  const partes = [];
  if (dias) partes.push(`${dias} dia${dias === 1 ? "" : "s"}`);
  if (horas) partes.push(`${horas} hora${horas === 1 ? "" : "s"}`);
  if (!dias && !horas) partes.push(`${minutosRestantes} minuto${minutosRestantes === 1 ? "" : "s"}`);
  return partes.join(" e ");
}

function agrupar<T>(itens: T[], chave: (item: T) => string | number | null | undefined) {
  return itens.reduce<Record<string, number>>((acc, item) => {
    const key = String(chave(item) || "Não informado");
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
}

async function calcularRetencaoGravacao(params: {
  dataMaisAntiga?: Date | null;
  dataMaisRecente?: Date | null;
}) {
  const retencaoMinutos =
    params.dataMaisAntiga && params.dataMaisRecente
      ? minutosEntre(params.dataMaisAntiga, params.dataMaisRecente)
      : 0;

  return {
    retencaoMinutos,
    retencaoTexto: formatarRetencao(retencaoMinutos),
  };
}

function ranking(dados: Record<string, number>, limite = 8) {
  return Object.entries(dados).sort((a, b) => b[1] - a[1]).slice(0, limite);
}

function csvEscape(valor: unknown) {
  const texto = String(valor ?? "");
  return `"${texto.replace(/"/g, '""')}"`;
}

function enviarCsv(res: Response, nome: string, linhas: unknown[][]) {
  const csv = linhas.map((linha) => linha.map(csvEscape).join(";")).join("\n");
  res.header("Content-Type", "text/csv; charset=utf-8");
  res.header("Content-Disposition", `attachment; filename="${nome}"`);
  return res.send(`\uFEFF${csv}`);
}

async function registrarMudancaStatus(params: {
  cameraId: number;
  unidade: string;
  statusAnterior?: string;
  statusNovo: string;
  responsavelId?: number;
  observacao?: string;
}) {
  const agora = new Date();
  const camera = await prisma.cameraMonitoramento.findUnique({ where: { id: params.cameraId } });
  if (!camera) return;

  if (params.statusNovo === STATUS_DESCONECTADA && camera.status !== STATUS_DESCONECTADA) {
    await prisma.cameraEventoStatus.create({
      data: {
        cameraId: params.cameraId,
        unidade: params.unidade,
        statusAnterior: params.statusAnterior || camera.status,
        statusNovo: STATUS_DESCONECTADA,
        iniciadoEm: agora,
        motivo: "Status alterado para desconectada",
        responsavelId: params.responsavelId,
        observacao: params.observacao,
      },
    });

    await prisma.cameraMonitoramento.update({
      where: { id: params.cameraId },
      data: {
        status: STATUS_DESCONECTADA,
        desconectadaDesde: agora,
        totalFalhas: { increment: 1 },
      },
    });
    emitirRealtime({
      tipo: "camera.desconectada",
      titulo: `Câmera ${camera.numeroCamera} desconectada`,
      mensagem: `${camera.areaMonitorada} | Servidor ${camera.numeroServidor}`,
      severidade: "alta",
      unidade: params.unidade,
      payload: { cameraId: camera.id, numeroCamera: camera.numeroCamera },
    });
    return;
  }

  if (params.statusNovo === STATUS_CONECTADA && camera.status === STATUS_DESCONECTADA) {
    const eventoAberto = await prisma.cameraEventoStatus.findFirst({
      where: {
        cameraId: params.cameraId,
        statusNovo: STATUS_DESCONECTADA,
        encerradoEm: null,
      },
      orderBy: { iniciadoEm: "desc" },
    });

    const inicio = eventoAberto?.iniciadoEm || camera.desconectadaDesde || agora;
    const duracao = minutosEntre(inicio, agora);

    if (eventoAberto) {
      await prisma.cameraEventoStatus.update({
        where: { id: eventoAberto.id },
        data: {
          encerradoEm: agora,
          duracaoIndisponivel: duracao,
          observacao: params.observacao || eventoAberto.observacao,
        },
      });
    }

    await prisma.cameraEventoStatus.create({
      data: {
        cameraId: params.cameraId,
        unidade: params.unidade,
        statusAnterior: STATUS_DESCONECTADA,
        statusNovo: STATUS_CONECTADA,
        iniciadoEm: agora,
        encerradoEm: agora,
        duracaoIndisponivel: 0,
        motivo: "Status alterado para conectada",
        responsavelId: params.responsavelId,
        observacao: params.observacao,
      },
    });

    await prisma.cameraMonitoramento.update({
      where: { id: params.cameraId },
      data: {
        status: STATUS_CONECTADA,
        desconectadaDesde: null,
        totalIndisponibilidade: { increment: duracao },
      },
    });
    emitirRealtime({
      tipo: "camera.conectada",
      titulo: `Câmera ${camera.numeroCamera} reconectada`,
      mensagem: `${camera.areaMonitorada} | offline por ${duracao} minuto(s)`,
      severidade: "media",
      unidade: params.unidade,
      payload: { cameraId: camera.id, numeroCamera: camera.numeroCamera, duracao },
    });
  }
}

export async function listarCameras(req: AuthRequest, res: Response) {
  try {
    const cameras = await prisma.cameraMonitoramento.findMany({
      where: { unidade: req.unidadeAtiva },
      orderBy: [{ status: "desc" }, { numeroCamera: "asc" }],
      include: {
        checklists: {
          orderBy: { createdAt: "desc" },
          take: 1,
          include: { responsavel: { select: { id: true, nome: true, apelido: true } } },
        },
      },
    });
    return res.json(cameras);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro ao listar câmeras" });
  }
}

export async function criarCamera(req: AuthRequest, res: Response) {
  try {
    const obrigatorios = [
      "numeroCamera",
      "numeroServidor",
      "tecnologia",
      "tipoCamera",
      "localInstalado",
      "areaMonitorada",
      "infravermelho",
      "monitoramento",
    ];

    if (obrigatorios.some((campo) => req.body[campo] === undefined || req.body[campo] === "")) {
      return res.status(400).json({ error: "Preencha todos os campos obrigatórios da câmera." });
    }

    const status = req.body.status || STATUS_CONECTADA;
    const camera = await prisma.cameraMonitoramento.create({
      data: {
        numeroCamera: codigo(req.body.numeroCamera),
        nomeCamera: req.body.nomeCamera,
        numeroServidor: codigo(req.body.numeroServidor),
        tipoSistema: "DIGIFORT",
        periodoGravacaoDias: numero(req.body.periodoGravacaoDias),
        status,
        tecnologia: req.body.tecnologia,
        tipoCamera: req.body.tipoCamera,
        localInstalado: req.body.localInstalado,
        areaMonitorada: req.body.areaMonitorada,
        infravermelho: req.body.infravermelho,
        monitoramento: req.body.monitoramento,
        ultimaManutencao: req.body.ultimaManutencao ? new Date(req.body.ultimaManutencao) : null,
        observacoesTecnicas: req.body.observacoesTecnicas,
        unidade: req.unidadeAtiva || "GJA-T1",
        cadastradoPorId: req.usuarioId,
        desconectadaDesde: status === STATUS_DESCONECTADA ? new Date() : null,
        totalFalhas: status === STATUS_DESCONECTADA ? 1 : 0,
      },
    });

    if (status === STATUS_DESCONECTADA) {
      await prisma.cameraEventoStatus.create({
        data: {
          cameraId: camera.id,
          unidade: camera.unidade,
          statusAnterior: STATUS_CONECTADA,
          statusNovo: STATUS_DESCONECTADA,
          responsavelId: req.usuarioId,
          observacao: "Câmera cadastrada já desconectada.",
        },
      });
      emitirRealtime({
        tipo: "camera.desconectada",
        titulo: `Câmera ${camera.numeroCamera} cadastrada desconectada`,
        mensagem: `${camera.areaMonitorada} | Servidor ${camera.numeroServidor}`,
        severidade: "alta",
        unidade: camera.unidade,
        payload: { cameraId: camera.id, numeroCamera: camera.numeroCamera },
      });
    }

    await registrarLog({ req, acao: `Cadastro de câmera ${camera.numeroCamera}`, tipoRegistro: "CameraMonitoramento", registroId: camera.id, dadosNovos: camera });
    return res.status(201).json(camera);
  } catch (error: any) {
    console.error(error);
    if (error?.code === "P2002") {
      return res.status(400).json({ error: "Já existe uma câmera com esse número nesta unidade." });
    }
    return res.status(500).json({ error: "Erro ao cadastrar câmera" });
  }
}

export async function atualizarCamera(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const anterior = await prisma.cameraMonitoramento.findFirst({
      where: { id: Number(id), unidade: req.unidadeAtiva },
    });
    if (!anterior) return res.status(404).json({ error: "Câmera não encontrada" });

    const statusNovo = req.body.status || anterior.status;
    const camera = await prisma.cameraMonitoramento.update({
      where: { id: anterior.id },
      data: {
        numeroCamera: codigo(req.body.numeroCamera, anterior.numeroCamera),
        nomeCamera: req.body.nomeCamera ?? anterior.nomeCamera,
        numeroServidor: codigo(req.body.numeroServidor, anterior.numeroServidor),
        tipoSistema: "DIGIFORT",
        periodoGravacaoDias: numero(req.body.periodoGravacaoDias, anterior.periodoGravacaoDias),
        tecnologia: req.body.tecnologia || anterior.tecnologia,
        tipoCamera: req.body.tipoCamera || anterior.tipoCamera,
        localInstalado: req.body.localInstalado || anterior.localInstalado,
        areaMonitorada: req.body.areaMonitorada || anterior.areaMonitorada,
        infravermelho: req.body.infravermelho || anterior.infravermelho,
        monitoramento: req.body.monitoramento || anterior.monitoramento,
        ultimaManutencao: req.body.ultimaManutencao ? new Date(req.body.ultimaManutencao) : anterior.ultimaManutencao,
        observacoesTecnicas: req.body.observacoesTecnicas,
      },
    });

    if (statusNovo !== anterior.status) {
      await registrarMudancaStatus({
        cameraId: anterior.id,
        unidade: anterior.unidade,
        statusAnterior: anterior.status,
        statusNovo,
        responsavelId: req.usuarioId,
        observacao: req.body.observacoesTecnicas,
      });
    }

    const atualizada = await prisma.cameraMonitoramento.findUnique({ where: { id: anterior.id } });
    await registrarLog({ req, acao: `Atualização de câmera ${camera.numeroCamera}`, tipoRegistro: "CameraMonitoramento", registroId: camera.id, dadosAnteriores: anterior, dadosNovos: atualizada });
    return res.json(atualizada);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro ao atualizar câmera" });
  }
}

export async function excluirCamera(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const camera = await prisma.cameraMonitoramento.findFirst({
      where: { id: Number(id), unidade: req.unidadeAtiva },
      include: {
        checklists: true,
        eventos: true,
      },
    });

    if (!camera) return res.status(404).json({ error: "Câmera não encontrada" });

    await prisma.cameraMonitoramento.delete({
      where: { id: camera.id },
    });

    await registrarLog({
      req,
      acao: `Exclusão de câmera ${camera.numeroCamera}`,
      tipoRegistro: "CameraMonitoramento",
      registroId: camera.id,
      dadosAnteriores: camera,
    });

    return res.status(204).send();
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro ao excluir câmera" });
  }
}

export async function criarChecklistCamera(req: AuthRequest, res: Response) {
  try {
    const { cameraId } = req.params;
    const camera = await prisma.cameraMonitoramento.findFirst({
      where: { id: Number(cameraId), unidade: req.unidadeAtiva },
    });
    if (!camera) return res.status(404).json({ error: "Câmera não encontrada" });

    const statusAtual = req.body.statusAtual || camera.status;
    if (statusAtual !== camera.status) {
      await registrarMudancaStatus({
        cameraId: camera.id,
        unidade: camera.unidade,
        statusAnterior: camera.status,
        statusNovo: statusAtual,
        responsavelId: req.usuarioId,
        observacao: req.body.observacoesOperacionais,
      });
    }

    const eventosRecentes = await prisma.cameraEventoStatus.count({
      where: {
        cameraId: camera.id,
        statusNovo: STATUS_DESCONECTADA,
        iniciadoEm: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
      },
    });

    const atual = await prisma.cameraMonitoramento.findUnique({ where: { id: camera.id } });
    const indisponibilidadeAberta =
      atual?.status === STATUS_DESCONECTADA && atual.desconectadaDesde
        ? minutosEntre(atual.desconectadaDesde, new Date())
        : 0;
    const dataInicialGravacao = dataOpcional(req.body.dataInicialGravacao);
    const dataMaisRecenteGravacao = dataOpcional(req.body.dataMaisRecenteGravacao);
    const retencao = await calcularRetencaoGravacao({
      dataMaisAntiga: dataInicialGravacao,
      dataMaisRecente: dataMaisRecenteGravacao,
    });
    const diasRetencao = Math.floor(retencao.retencaoMinutos / 1440);

    const checklist = await prisma.cameraChecklistOperacional.create({
      data: {
        cameraId: camera.id,
        unidade: camera.unidade,
        responsavelId: req.usuarioId!,
        statusAtual,
        tempoGravacaoDisponivel: diasRetencao,
        dataInicialGravacao,
        dataMaisRecenteGravacao,
        dataDesconexaoManual: null,
        dataReconexaoManual: null,
        retencaoEstimadaMinutos: retencao.retencaoMinutos,
        retencaoEstimadaTexto: retencao.retencaoTexto,
        qualidadeImagem: req.body.qualidadeImagem || "Nao informado",
        funcionamentoInfravermelho: req.body.funcionamentoInfravermelho || "Nao informado",
        funcionamentoGravacao: req.body.funcionamentoGravacao || "Nao informado",
        comunicacaoServidor: req.body.comunicacaoServidor || "Nao informado",
        instabilidadeDetectada: req.body.instabilidadeDetectada || (statusAtual === STATUS_DESCONECTADA ? "Sim" : "Nao"),
        necessidadeManutencao: req.body.necessidadeManutencao || "Nao informado",
        observacoesOperacionais: req.body.observacoesOperacionais,
        indisponibilidadeMinutos: indisponibilidadeAberta,
        falhaRecorrente: eventosRecentes >= 3 || statusAtual === STATUS_DESCONECTADA,
      },
      include: { responsavel: { select: { id: true, nome: true, apelido: true } }, camera: true },
    });

    await registrarLog({ req, acao: `Checklist operacional da câmera ${camera.numeroCamera}`, tipoRegistro: "CameraChecklistOperacional", registroId: checklist.id, dadosNovos: checklist });
    return res.status(201).json(checklist);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro ao criar checklist da câmera" });
  }
}

export async function listarChecklistCamera(req: AuthRequest, res: Response) {
  try {
    const { cameraId } = req.params;
    const checklists = await prisma.cameraChecklistOperacional.findMany({
      where: { cameraId: Number(cameraId), unidade: req.unidadeAtiva },
      orderBy: { createdAt: "desc" },
      include: { responsavel: { select: { id: true, nome: true, apelido: true } } },
    });
    return res.json(checklists);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro ao listar histórico da câmera" });
  }
}

export async function listarIndisponibilidadesCamera(req: AuthRequest, res: Response) {
  try {
    const { cameraId } = req.params;
    const camera = await prisma.cameraMonitoramento.findFirst({
      where: { id: Number(cameraId), unidade: req.unidadeAtiva },
    });
    if (!camera) return res.status(404).json({ error: "CÃ¢mera nÃ£o encontrada" });

    const eventos = await prisma.cameraEventoStatus.findMany({
      where: {
        cameraId: camera.id,
        unidade: req.unidadeAtiva,
        statusNovo: STATUS_DESCONECTADA,
      },
      orderBy: { iniciadoEm: "desc" },
    });

    const responsaveisIds = [...new Set(eventos.map((evento) => evento.responsavelId).filter(Boolean))] as number[];
    const responsaveis = await prisma.usuario.findMany({
      where: { id: { in: responsaveisIds } },
      select: { id: true, nome: true, apelido: true },
    });
    const usuarios = new Map(responsaveis.map((usuario) => [usuario.id, usuario]));

    return res.json(eventos.map((evento) => {
      const duracao = evento.duracaoIndisponivel ?? (evento.encerradoEm ? minutosEntre(evento.iniciadoEm, evento.encerradoEm) : minutosEntre(evento.iniciadoEm, new Date()));
      const responsavel = evento.responsavelId ? usuarios.get(evento.responsavelId) : null;
      return {
        ...evento,
        duracaoIndisponivel: duracao,
        tempoIndisponibilidade: formatarIndisponibilidade(duracao),
        responsavel: responsavel ? { nome: responsavel.apelido || responsavel.nome } : null,
      };
    }));
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro ao listar histÃ³rico de indisponibilidade" });
  }
}

export async function registrarIndisponibilidadeCamera(req: AuthRequest, res: Response) {
  try {
    const { cameraId } = req.params;
    const camera = await prisma.cameraMonitoramento.findFirst({
      where: { id: Number(cameraId), unidade: req.unidadeAtiva },
    });
    if (!camera) return res.status(404).json({ error: "CÃ¢mera nÃ£o encontrada" });

    const iniciadoEm = dataOpcional(req.body.iniciadoEm);
    const encerradoEm = dataOpcional(req.body.encerradoEm);
    const motivo = String(req.body.motivo || "").trim();

    if (!iniciadoEm || !encerradoEm || !motivo) {
      return res.status(400).json({ error: "Informe data/hora inicial, data/hora final e motivo." });
    }

    if (encerradoEm <= iniciadoEm) {
      return res.status(400).json({ error: "A data/hora final deve ser maior que a data/hora inicial." });
    }

    const duracao = minutosEntre(iniciadoEm, encerradoEm);
    const evento = await prisma.cameraEventoStatus.create({
      data: {
        cameraId: camera.id,
        unidade: camera.unidade,
        statusAnterior: STATUS_CONECTADA,
        statusNovo: STATUS_DESCONECTADA,
        iniciadoEm,
        encerradoEm,
        duracaoIndisponivel: duracao,
        motivo,
        responsavelId: req.usuarioId,
        observacao: req.body.observacao,
      },
    });

    await prisma.cameraMonitoramento.update({
      where: { id: camera.id },
      data: {
        totalFalhas: { increment: 1 },
        totalIndisponibilidade: { increment: duracao },
      },
    });

    await registrarLog({
      req,
      acao: `Registro de indisponibilidade da cÃ¢mera ${camera.numeroCamera} por ${formatarIndisponibilidade(duracao)}`,
      tipoRegistro: "CameraEventoStatus",
      registroId: evento.id,
      dadosNovos: evento,
    });

    return res.status(201).json({
      ...evento,
      tempoIndisponibilidade: formatarIndisponibilidade(duracao),
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro ao registrar indisponibilidade" });
  }
}

export async function atualizarIndisponibilidadeCamera(req: AuthRequest, res: Response) {
  try {
    const { cameraId, eventoId } = req.params;
    const anterior = await prisma.cameraEventoStatus.findFirst({
      where: {
        id: Number(eventoId),
        cameraId: Number(cameraId),
        unidade: req.unidadeAtiva,
        statusNovo: STATUS_DESCONECTADA,
      },
    });
    if (!anterior) return res.status(404).json({ error: "Registro de indisponibilidade nÃ£o encontrado" });

    const iniciadoEm = dataOpcional(req.body.iniciadoEm) || anterior.iniciadoEm;
    const encerradoEm = dataOpcional(req.body.encerradoEm) || anterior.encerradoEm;
    if (!encerradoEm || encerradoEm <= iniciadoEm) {
      return res.status(400).json({ error: "A data/hora final deve ser maior que a data/hora inicial." });
    }

    const duracaoAnterior = anterior.duracaoIndisponivel ?? minutosEntre(anterior.iniciadoEm, anterior.encerradoEm || new Date());
    const duracaoNova = minutosEntre(iniciadoEm, encerradoEm);

    const evento = await prisma.cameraEventoStatus.update({
      where: { id: anterior.id },
      data: {
        iniciadoEm,
        encerradoEm,
        duracaoIndisponivel: duracaoNova,
        motivo: req.body.motivo || anterior.motivo,
        observacao: req.body.observacao ?? anterior.observacao,
      },
    });

    await prisma.cameraMonitoramento.update({
      where: { id: Number(cameraId) },
      data: {
        totalIndisponibilidade: { increment: duracaoNova - duracaoAnterior },
      },
    });

    await registrarLog({
      req,
      acao: `AtualizaÃ§Ã£o de indisponibilidade da cÃ¢mera ID ${cameraId}`,
      tipoRegistro: "CameraEventoStatus",
      registroId: evento.id,
      dadosAnteriores: anterior,
      dadosNovos: evento,
    });

    return res.json({
      ...evento,
      tempoIndisponibilidade: formatarIndisponibilidade(duracaoNova),
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro ao atualizar indisponibilidade" });
  }
}

export async function dashboardCameras(req: AuthRequest, res: Response) {
  try {
    const [cameras, checklists, eventos, configuracao] = await Promise.all([
      prisma.cameraMonitoramento.findMany({ where: { unidade: req.unidadeAtiva } }),
      prisma.cameraChecklistOperacional.findMany({
        where: { unidade: req.unidadeAtiva },
        include: { responsavel: { select: { nome: true, apelido: true } }, camera: true },
        orderBy: { createdAt: "desc" },
      }),
      prisma.cameraEventoStatus.findMany({
        where: { unidade: req.unidadeAtiva },
        include: { camera: true },
        orderBy: { iniciadoEm: "desc" },
      }),
      prisma.configuracaoSistema.findFirst(),
    ]);

    const agora = new Date();
    const total = cameras.length;
    const online = cameras.filter((camera) => camera.status === STATUS_CONECTADA).length;
    const offline = cameras.filter((camera) => camera.status === STATUS_DESCONECTADA).length;
    const indisponibilidadeAtual = cameras.reduce((totalMinutos, camera) => {
      if (camera.status !== STATUS_DESCONECTADA || !camera.desconectadaDesde) return totalMinutos;
      return totalMinutos + minutosEntre(camera.desconectadaDesde, agora);
    }, 0);

    const eventosOfflineEncerrados = eventos.filter((evento) => evento.duracaoIndisponivel !== null && evento.duracaoIndisponivel !== undefined && evento.statusNovo === STATUS_DESCONECTADA);
    const mediaSolucao =
      eventosOfflineEncerrados.length > 0
        ? Math.round(eventosOfflineEncerrados.reduce((soma, evento) => soma + (evento.duracaoIndisponivel || 0), 0) / eventosOfflineEncerrados.length)
        : 0;
    const totalOfflineHistorico = cameras.reduce((soma, camera) => soma + camera.totalIndisponibilidade, 0) + indisponibilidadeAtual;
    const sla = total === 0 ? 100 : Math.max(0, Math.round((online / total) * 100));
    const metaSla = configuracao?.slaCameras || 98;
    const tempoMaximoOffline = configuracao?.tempoMaximoOffline || 60;
    const checklistCameraDias = configuracao?.checklistCameraDias || 7;
    const limiteChecklist = new Date(Date.now() - checklistCameraDias * 24 * 60 * 60 * 1000);
    const camerasSemChecklist = cameras.filter((camera) => {
      const ultimo = checklists.find((checklist) => checklist.cameraId === camera.id);
      return !ultimo || ultimo.createdAt < limiteChecklist;
    });
    const ultimoChecklistPorCamera = cameras.map((camera) => ({
      camera,
      checklist: checklists.find((checklist) => checklist.cameraId === camera.id) || null,
    }));
    const retencoesValidas = ultimoChecklistPorCamera
      .map(({ checklist }) => checklist?.tempoGravacaoDisponivel ?? null)
      .filter((dias): dias is number => typeof dias === "number" && Number.isFinite(dias));
    const retencaoMedia =
      retencoesValidas.length === 0
        ? 0
        : Math.round(retencoesValidas.reduce((soma, dias) => soma + dias, 0) / retencoesValidas.length);
    const camerasConformidade = ultimoChecklistPorCamera.filter(({ checklist }) => (checklist?.tempoGravacaoDisponivel ?? -1) >= 180).length;
    const camerasAtencao = ultimoChecklistPorCamera.filter(({ checklist }) => {
      const dias = checklist?.tempoGravacaoDisponivel;
      return typeof dias === "number" && dias >= 150 && dias <= 179;
    }).length;
    const camerasCriticas = ultimoChecklistPorCamera.filter(({ checklist }) => {
      const dias = checklist?.tempoGravacaoDisponivel;
      return typeof dias === "number" && dias < 150;
    }).length;
    const menorRetencao = ultimoChecklistPorCamera
      .filter(({ checklist }) => typeof checklist?.tempoGravacaoDisponivel === "number")
      .sort((a, b) => (a.checklist!.tempoGravacaoDisponivel || 0) - (b.checklist!.tempoGravacaoDisponivel || 0))
      .slice(0, 10)
      .map(({ camera, checklist }) => ({
        id: camera.id,
        numeroCamera: camera.numeroCamera,
        servidor: camera.numeroServidor,
        area: camera.areaMonitorada,
        status: camera.status,
        diasRetencao: checklist?.tempoGravacaoDisponivel || 0,
        dataMaisAntiga: checklist?.dataInicialGravacao,
        dataMaisRecente: checklist?.dataMaisRecenteGravacao,
      }));

    const instabilidadePorCamera = ranking(
      cameras.reduce<Record<string, number>>((acc, camera) => {
        acc[`Câmera ${camera.numeroCamera}`] = camera.totalFalhas + (camera.status === STATUS_DESCONECTADA ? 1 : 0);
        return acc;
      }, {})
    );

    const falhasPorArea = ranking(
      eventos
        .filter((evento) => evento.statusNovo === STATUS_DESCONECTADA)
        .reduce<Record<string, number>>((acc, evento) => {
          const area = evento.camera?.areaMonitorada || "Não informado";
          acc[area] = (acc[area] || 0) + 1;
          return acc;
        }, {})
    );

    const falhasPorServidor = ranking(
      eventos
        .filter((evento) => evento.statusNovo === STATUS_DESCONECTADA)
        .reduce<Record<string, number>>((acc, evento) => {
          const servidor = evento.camera?.numeroServidor ? `Servidor ${evento.camera.numeroServidor}` : "Não informado";
          acc[servidor] = (acc[servidor] || 0) + 1;
          return acc;
        }, {})
    );

    const resolucaoPorOperador = ranking(
      checklists.reduce<Record<string, number>>((acc, checklist) => {
        const nome = checklist.responsavel?.apelido || checklist.responsavel?.nome || "Não informado";
        acc[nome] = (acc[nome] || 0) + checklist.indisponibilidadeMinutos;
        return acc;
      }, {})
    );

    const falhasPorDia = eventos
      .filter((evento) => evento.statusNovo === STATUS_DESCONECTADA)
      .reduce<Record<string, number>>((acc, evento) => {
        const dia = evento.iniciadoEm.toISOString().slice(0, 10);
        acc[dia] = (acc[dia] || 0) + 1;
        return acc;
      }, {});

    return res.json({
      total,
      online,
      offline,
      disponibilidade: total === 0 ? 100 : Math.round((online / total) * 100),
      indisponibilidade: total === 0 ? 0 : Math.round((offline / total) * 100),
      mediaSolucao,
      mediaOfflinePorCamera: total === 0 ? 0 : Math.round(totalOfflineHistorico / total),
      totalOfflineHistorico,
      retencaoMedia,
      camerasConformidade,
      camerasAtencao,
      camerasCriticas,
      camerasDesconectadas: offline,
      menorRetencao,
      sla,
      metaSla,
      indicadorSla: sla >= metaSla ? "Dentro do SLA" : sla >= 90 ? "Atenção" : "Crítico",
      digifort: {
        statusIntegracao: "Preparado para integração futura",
        tipoSistemaPadrao: "DIGIFORT",
        camposMapeados: ["numeroCamera", "numeroServidor", "status", "areaMonitorada", "eventos"],
      },
      porTipoCamera: agrupar(cameras, (camera) => camera.tipoCamera),
      porTecnologia: agrupar(cameras, (camera) => camera.tecnologia),
      porUnidade: agrupar(cameras, (camera) => camera.unidade),
      porServidor: agrupar(cameras, (camera) => `Servidor ${camera.numeroServidor}`),
      instabilidadePorCamera,
      falhasPorArea,
      falhasPorServidor,
      resolucaoPorOperador,
      falhasPorDia: Object.entries(falhasPorDia).sort((a, b) => a[0].localeCompare(b[0])).slice(-14),
      timeline: eventos.slice(0, 30).map((evento) => ({
        id: evento.id,
        camera: evento.camera?.numeroCamera,
        area: evento.camera?.areaMonitorada,
        status: evento.statusNovo,
        iniciadoEm: evento.iniciadoEm,
        encerradoEm: evento.encerradoEm,
        duracao: evento.duracaoIndisponivel,
        observacao: evento.observacao,
      })),
      mapaOperacional: cameras.map((camera) => ({
        id: camera.id,
        numeroCamera: camera.numeroCamera,
        servidor: camera.numeroServidor,
        area: camera.areaMonitorada,
        local: camera.localInstalado,
        status: camera.status,
        tipoCamera: camera.tipoCamera,
        tecnologia: camera.tecnologia,
        diasRetencao: checklists.find((checklist) => checklist.cameraId === camera.id)?.tempoGravacaoDisponivel ?? null,
        offlineMinutos:
          camera.status === STATUS_DESCONECTADA && camera.desconectadaDesde
            ? minutosEntre(camera.desconectadaDesde, agora)
            : 0,
      })),
      alertas: cameras
        .filter((camera) => camera.status === STATUS_DESCONECTADA)
        .map((camera) => ({
          id: camera.id,
          titulo: `Câmera ${camera.numeroCamera} desconectada`,
          mensagem: `${camera.areaMonitorada} | Servidor ${camera.numeroServidor}`,
          minutos: camera.desconectadaDesde ? minutosEntre(camera.desconectadaDesde, agora) : 0,
          slaViolado: camera.desconectadaDesde ? minutosEntre(camera.desconectadaDesde, agora) > tempoMaximoOffline : false,
        })),
      alertasAutomaticos: [
        ...cameras
          .filter((camera) => camera.status === STATUS_DESCONECTADA && camera.desconectadaDesde && minutosEntre(camera.desconectadaDesde, agora) > tempoMaximoOffline)
          .map((camera) => ({
            tipo: "SLA violado",
            mensagem: `Câmera ${camera.numeroCamera} offline acima de ${tempoMaximoOffline} minutos`,
            severidade: "Crítica",
          })),
        ...camerasSemChecklist.map((camera) => ({
          tipo: "Checklist vencido",
          mensagem: `Câmera ${camera.numeroCamera} sem checklist nos últimos ${checklistCameraDias} dias`,
          severidade: "Atenção",
        })),
      ],
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro ao gerar dashboard de câmeras" });
  }
}

export async function exportarInventarioCameras(req: AuthRequest, res: Response) {
  try {
    const cameras = await prisma.cameraMonitoramento.findMany({
      where: { unidade: req.unidadeAtiva },
      orderBy: { numeroCamera: "asc" },
      include: {
        checklists: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    });

    const linhas = [
      ["Camera", "Servidor", "Sistema", "Retencao real dias", "Data mais antiga", "Data mais recente", "Status", "Tecnologia", "Tipo", "Local", "Area", "Infravermelho", "Monitoramento", "Ultima manutencao", "Falhas", "Indisponibilidade minutos"],
      ...cameras.map((camera) => [
        camera.numeroCamera,
        camera.numeroServidor,
        camera.tipoSistema,
        camera.checklists[0]?.tempoGravacaoDisponivel ?? "",
        camera.checklists[0]?.dataInicialGravacao?.toISOString().slice(0, 10) || "",
        camera.checklists[0]?.dataMaisRecenteGravacao?.toISOString().slice(0, 10) || "",
        camera.status,
        camera.tecnologia,
        camera.tipoCamera,
        camera.localInstalado,
        camera.areaMonitorada,
        camera.infravermelho,
        camera.monitoramento,
        camera.ultimaManutencao?.toISOString().slice(0, 10) || "",
        camera.totalFalhas,
        camera.totalIndisponibilidade,
      ]),
    ];

    return enviarCsv(res, `inventario-cameras-${req.unidadeAtiva || "unidade"}.csv`, linhas);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro ao exportar inventário de câmeras" });
  }
}

export async function exportarHistoricoCameras(req: AuthRequest, res: Response) {
  try {
    const eventos = await prisma.cameraEventoStatus.findMany({
      where: { unidade: req.unidadeAtiva },
      include: { camera: true },
      orderBy: { iniciadoEm: "desc" },
    });

    const linhas = [
      ["Camera", "Servidor", "Area", "Status anterior", "Status novo", "Inicio", "Encerramento", "Duracao minutos", "Observacao"],
      ...eventos.map((evento) => [
        evento.camera.numeroCamera,
        evento.camera.numeroServidor,
        evento.camera.areaMonitorada,
        evento.statusAnterior || "",
        evento.statusNovo,
        evento.iniciadoEm.toISOString(),
        evento.encerradoEm?.toISOString() || "",
        evento.duracaoIndisponivel ?? "",
        evento.observacao || "",
      ]),
    ];

    return enviarCsv(res, `historico-cameras-${req.unidadeAtiva || "unidade"}.csv`, linhas);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro ao exportar histórico de câmeras" });
  }
}
