import { Response } from "express";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import PDFDocument from "pdfkit";
import { prisma } from "../lib/prisma";
import { AuthRequest, PERFIS } from "../middlewares/auth";
import { registrarLog } from "../services/auditoria.service";
import { emitirRealtime } from "../services/realtime.service";
import { assinarDocumento, criarUrlValidacaoAssinatura } from "../services/assinaturaDocumento.service";
import { jwtSecret } from "../config/security";
import { criarQrCodeValidacao, desenharCabecalhoPadrao, desenharRodapeAssinaturaPadrao } from "../services/documentoPdfBase.service";

const STATUS_CONECTADA = "Conectada";
const STATUS_DESCONECTADA = "Desconectada";
const STATUS_CADASTRO_ATIVA = "Ativa";
const STATUS_CADASTRO_REMOVIDA = "Removida";
const RETENCAO_MAXIMA_MINUTOS = 181 * 24 * 60;

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

function dataPt(data?: Date | null) {
  return data ? data.toLocaleString("pt-BR") : "Nao informado";
}

function textoPdf(valor?: string | number | null) {
  const texto = String(valor ?? "").trim();
  return texto || "Nao informado";
}

function tokenRelatorioCftv(params: { id: number; codigo: string; unidade: string }) {
  return crypto
    .createHmac("sha256", jwtSecret())
    .update(`relatorio-cftv:${params.id}:${params.codigo}:${params.unidade}`)
    .digest("hex")
    .slice(0, 32);
}

export function criarUrlPublicaRelatorioCftv(req: Pick<AuthRequest, "protocol" | "get">, params: { id: number; codigo: string; unidade: string }) {
  const token = tokenRelatorioCftv(params);
  return `${req.protocol}://${req.get("host")}/api/public/cameras/relatorios-cftv/${params.id}/pdf?token=${token}`;
}

export function validarTokenAcessoRelatorioCftv(params: { id: number; codigo: string; unidade: string; token: string }) {
  const esperado = tokenRelatorioCftv(params);
  if (!params.token || params.token.length !== esperado.length) return false;
  return crypto.timingSafeEqual(Buffer.from(esperado), Buffer.from(params.token));
}

function calcularMinutosIndisponiveisNoIntervalo(
  eventos: Array<{ iniciadoEm: Date; encerradoEm: Date | null; statusNovo: string }>,
  inicio: Date,
  fim: Date
) {
  const agora = new Date();
  return eventos
    .filter((evento) => evento.statusNovo === STATUS_DESCONECTADA)
    .reduce((total, evento) => {
      const inicioEvento = evento.iniciadoEm > inicio ? evento.iniciadoEm : inicio;
      const fimEventoBase = evento.encerradoEm || agora;
      const fimEvento = fimEventoBase < fim ? fimEventoBase : fim;
      if (fimEvento <= inicioEvento) return total;
      return total + minutosEntre(inicioEvento, fimEvento);
    }, 0);
}

function calcularRetencaoEfetiva(params: {
  dataMaisAntiga?: Date | null;
  dataMaisRecente?: Date | null;
  statusCamera?: string;
  referenciaAtual?: Date;
  eventos: Array<{ iniciadoEm: Date; encerradoEm: Date | null; statusNovo: string }>;
}) {
  if (!params.dataMaisAntiga) {
    return {
      retencaoBrutaMinutos: 0,
      indisponibilidadeMinutos: 0,
      retencaoMinutos: 0,
      retencaoTexto: formatarRetencao(0),
    };
  }

  const agora = params.referenciaAtual || new Date();
  const limiteJanelaMovel = new Date(agora.getTime() - RETENCAO_MAXIMA_MINUTOS * 60000);
  const inicioOperacional = params.dataMaisAntiga > limiteJanelaMovel ? params.dataMaisAntiga : limiteJanelaMovel;
  const fimOperacional = params.statusCamera === STATUS_DESCONECTADA
    ? params.dataMaisRecente || agora
    : agora;

  if (fimOperacional <= inicioOperacional) {
    return {
      retencaoBrutaMinutos: 0,
      indisponibilidadeMinutos: 0,
      retencaoMinutos: 0,
      retencaoTexto: formatarRetencao(0),
    };
  }

  const retencaoBrutaMinutos = Math.min(minutosEntre(inicioOperacional, fimOperacional), RETENCAO_MAXIMA_MINUTOS);
  const indisponibilidadeMinutos = calcularMinutosIndisponiveisNoIntervalo(
    params.eventos,
    inicioOperacional,
    fimOperacional
  );
  const retencaoMinutos = Math.max(0, retencaoBrutaMinutos - indisponibilidadeMinutos);

  return {
    retencaoBrutaMinutos,
    indisponibilidadeMinutos,
    retencaoMinutos,
    retencaoTexto: formatarRetencao(retencaoMinutos),
  };
}

function agrupar<T>(itens: T[], chave: (item: T) => string | number | null | undefined) {
  return itens.reduce<Record<string, number>>((acc, item) => {
    const key = String(chave(item) || "Não informado");
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
}

async function calcularRetencaoGravacao(params: {
  cameraId: number;
  dataMaisAntiga?: Date | null;
  dataMaisRecente?: Date | null;
  statusCamera?: string;
}) {
  const eventos = await prisma.cameraEventoStatus.findMany({
    where: {
      cameraId: params.cameraId,
      statusNovo: STATUS_DESCONECTADA,
    },
    select: {
      iniciadoEm: true,
      encerradoEm: true,
      statusNovo: true,
    },
  });

  return calcularRetencaoEfetiva({
    dataMaisAntiga: params.dataMaisAntiga,
    dataMaisRecente: params.dataMaisRecente,
    statusCamera: params.statusCamera,
    eventos,
  });
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
  dataEvento?: Date;
}) {
  const agora = params.dataEvento || new Date();
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
    const incluirRemovidas = req.query.incluirRemovidas === "true" && req.usuarioPerfil === PERFIS.SUPER_ADMIN;
    const cameras = await prisma.cameraMonitoramento.findMany({
      where: {
        unidade: req.unidadeAtiva,
        ...(incluirRemovidas ? {} : { statusCadastro: STATUS_CADASTRO_ATIVA }),
      },
      orderBy: [{ status: "desc" }, { numeroCamera: "asc" }],
      include: {
        checklists: {
          orderBy: { createdAt: "desc" },
          take: 1,
          include: { responsavel: { select: { id: true, nome: true, apelido: true } } },
        },
      },
    });
    const eventos = await prisma.cameraEventoStatus.findMany({
      where: { unidade: req.unidadeAtiva, statusNovo: STATUS_DESCONECTADA },
      select: { cameraId: true, iniciadoEm: true, encerradoEm: true, statusNovo: true },
    });

    const camerasComRetencaoAtual = cameras.map((camera) => {
      const ultimoChecklist = camera.checklists[0];
      if (!ultimoChecklist) return camera;
      const eventosCamera = eventos.filter((evento) => evento.cameraId === camera.id);
      const retencao = calcularRetencaoEfetiva({
        dataMaisAntiga: ultimoChecklist.dataInicialGravacao,
        dataMaisRecente: ultimoChecklist.dataMaisRecenteGravacao,
        statusCamera: camera.status,
        eventos: eventosCamera,
      });
      return {
        ...camera,
        checklists: [
          {
            ...ultimoChecklist,
            tempoGravacaoDisponivel: Math.floor(retencao.retencaoMinutos / 1440),
            retencaoEstimadaMinutos: retencao.retencaoMinutos,
            retencaoEstimadaTexto: retencao.retencaoTexto,
            indisponibilidadeMinutos: retencao.indisponibilidadeMinutos,
          },
        ],
      };
    });

    return res.json(camerasComRetencaoAtual);
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
        statusCadastro: STATUS_CADASTRO_ATIVA,
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
      where: { id: Number(id), unidade: req.unidadeAtiva, statusCadastro: STATUS_CADASTRO_ATIVA },
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

    const exclusaoDefinitiva = req.query.permanente === "true";

    if (exclusaoDefinitiva && req.usuarioPerfil !== PERFIS.SUPER_ADMIN) {
      return res.status(403).json({ error: "Somente Super Admin pode excluir definitivamente uma câmera." });
    }

    if (!exclusaoDefinitiva) {
      if (camera.statusCadastro === STATUS_CADASTRO_REMOVIDA) {
        return res.status(400).json({ error: "Esta câmera já está removida/inativa." });
      }

      const atualizada = await prisma.cameraMonitoramento.update({
        where: { id: camera.id },
        data: {
          statusCadastro: STATUS_CADASTRO_REMOVIDA,
          monitoramento: "Inativo",
          removidaEm: new Date(),
          removidaPorId: req.usuarioId,
          motivoRemocao: String(req.body?.motivo || "Removida pelo usuário"),
        },
      });

      await registrarLog({
        req,
        acao: `Câmera ${camera.numeroCamera} marcada como removida/inativa`,
        tipoRegistro: "CameraMonitoramento",
        registroId: camera.id,
        dadosAnteriores: camera,
        dadosNovos: atualizada,
      });

      return res.json(atualizada);
    }

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
      where: { id: Number(cameraId), unidade: req.unidadeAtiva, statusCadastro: STATUS_CADASTRO_ATIVA },
    });
    if (!camera) return res.status(404).json({ error: "Câmera não encontrada" });

    const statusAtual = req.body.statusAtual || camera.status;

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
    const dataMaisRecenteInformada = dataOpcional(req.body.dataMaisRecenteGravacao);
    const dataMaisRecenteGravacao =
      dataMaisRecenteInformada || (statusAtual === STATUS_CONECTADA ? new Date() : null);

    if (!dataInicialGravacao) {
      return res.status(400).json({ error: "Informe a data e hora mais antiga encontrada no Digifort." });
    }

    if (statusAtual === STATUS_DESCONECTADA && !dataMaisRecenteGravacao) {
      return res.status(400).json({ error: "Informe a data e hora da última gravação antes da desconexão." });
    }

    if (dataMaisRecenteGravacao && dataInicialGravacao > dataMaisRecenteGravacao) {
      return res.status(400).json({
        error: "A data mais antiga encontrada no Digifort nao pode ser maior que a data mais recente.",
      });
    }

    if (statusAtual !== camera.status) {
      await registrarMudancaStatus({
        cameraId: camera.id,
        unidade: camera.unidade,
        statusAnterior: camera.status,
        statusNovo: statusAtual,
        responsavelId: req.usuarioId,
        observacao: req.body.observacoesOperacionais,
        dataEvento: dataMaisRecenteGravacao || new Date(),
      });
    }

    const retencao = await calcularRetencaoGravacao({
      cameraId: camera.id,
      dataMaisAntiga: dataInicialGravacao,
      dataMaisRecente: dataMaisRecenteGravacao,
      statusCamera: statusAtual,
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
      where: { cameraId: Number(cameraId), unidade: req.unidadeAtiva, camera: { statusCadastro: STATUS_CADASTRO_ATIVA } },
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
      where: { id: Number(cameraId), unidade: req.unidadeAtiva, statusCadastro: STATUS_CADASTRO_ATIVA },
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
      where: { id: Number(cameraId), unidade: req.unidadeAtiva, statusCadastro: STATUS_CADASTRO_ATIVA },
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
      prisma.cameraMonitoramento.findMany({ where: { unidade: req.unidadeAtiva, statusCadastro: STATUS_CADASTRO_ATIVA } }),
      prisma.cameraChecklistOperacional.findMany({
        where: { unidade: req.unidadeAtiva, camera: { statusCadastro: STATUS_CADASTRO_ATIVA } },
        include: { responsavel: { select: { nome: true, apelido: true } }, camera: true },
        orderBy: { createdAt: "desc" },
      }),
      prisma.cameraEventoStatus.findMany({
        where: { unidade: req.unidadeAtiva, camera: { statusCadastro: STATUS_CADASTRO_ATIVA } },
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
    const checklistsComRetencao = checklists.map((checklist) => {
      const retencao = calcularRetencaoEfetiva({
        dataMaisAntiga: checklist.dataInicialGravacao,
        dataMaisRecente: checklist.dataMaisRecenteGravacao,
        statusCamera: checklist.camera.status,
        eventos: eventos.filter((evento) => evento.cameraId === checklist.cameraId),
      });
      return {
        ...checklist,
        tempoGravacaoDisponivel: Math.floor(retencao.retencaoMinutos / 1440),
        retencaoEstimadaMinutos: retencao.retencaoMinutos,
        retencaoEstimadaTexto: retencao.retencaoTexto,
        indisponibilidadeMinutos: retencao.indisponibilidadeMinutos,
      };
    });
    const camerasSemChecklist = cameras.filter((camera) => {
      const ultimo = checklistsComRetencao.find((checklist) => checklist.cameraId === camera.id);
      return !ultimo || ultimo.createdAt < limiteChecklist;
    });
    const ultimoChecklistPorCamera = cameras.map((camera) => ({
      camera,
      checklist: checklistsComRetencao.find((checklist) => checklist.cameraId === camera.id) || null,
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
      checklistsComRetencao.reduce<Record<string, number>>((acc, checklist) => {
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
        diasRetencao: checklistsComRetencao.find((checklist) => checklist.cameraId === camera.id)?.tempoGravacaoDisponivel ?? null,
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
      where: { unidade: req.unidadeAtiva, statusCadastro: STATUS_CADASTRO_ATIVA },
      orderBy: { numeroCamera: "asc" },
      include: {
        checklists: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    });
    const eventos = await prisma.cameraEventoStatus.findMany({
      where: { unidade: req.unidadeAtiva, statusNovo: STATUS_DESCONECTADA, camera: { statusCadastro: STATUS_CADASTRO_ATIVA } },
      select: { cameraId: true, iniciadoEm: true, encerradoEm: true, statusNovo: true },
    });

    const linhas = [
      ["Camera", "Servidor", "Sistema", "Retencao real dias", "Data mais antiga", "Data mais recente", "Status", "Tecnologia", "Tipo", "Local", "Area", "Infravermelho", "Monitoramento", "Ultima manutencao", "Falhas", "Indisponibilidade minutos"],
      ...cameras.map((camera) => {
        const checklist = camera.checklists[0];
        const retencao = checklist
          ? calcularRetencaoEfetiva({
              dataMaisAntiga: checklist.dataInicialGravacao,
              dataMaisRecente: checklist.dataMaisRecenteGravacao,
              statusCamera: camera.status,
              eventos: eventos.filter((evento) => evento.cameraId === camera.id),
            })
          : null;
        return [
          camera.numeroCamera,
          camera.numeroServidor,
          camera.tipoSistema,
          retencao ? Math.floor(retencao.retencaoMinutos / 1440) : "",
          checklist?.dataInicialGravacao?.toISOString().slice(0, 10) || "",
          checklist?.dataMaisRecenteGravacao?.toISOString().slice(0, 10) || "",
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
        ];
      }),
    ];

    return enviarCsv(res, `inventario-cameras-${req.unidadeAtiva || "unidade"}.csv`, linhas);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro ao exportar inventário de câmeras" });
  }
}

export async function gerarRelatorioDisponibilidadeCameras(req: AuthRequest, res: Response) {
  try {
    const cameraIds = Array.isArray(req.body?.cameraIds)
      ? req.body.cameraIds.map((id: unknown) => Number(id)).filter((id: number) => Number.isFinite(id))
      : [];

    if (cameraIds.length === 0) {
      return res.status(400).json({ error: "Selecione ao menos uma câmera para gerar o relatório." });
    }

    const cameras = await prisma.cameraMonitoramento.findMany({
      where: {
        id: { in: cameraIds },
        unidade: req.unidadeAtiva,
        statusCadastro: STATUS_CADASTRO_ATIVA,
      },
      orderBy: [{ numeroServidor: "asc" }, { numeroCamera: "asc" }],
      include: {
        checklists: {
          orderBy: { createdAt: "desc" },
          take: 1,
          include: { responsavel: { select: { nome: true, apelido: true } } },
        },
        eventos: {
          where: { statusNovo: STATUS_DESCONECTADA },
          orderBy: { iniciadoEm: "desc" },
        },
      },
    });

    if (cameras.length === 0) {
      return res.status(404).json({ error: "Nenhuma câmera encontrada para os filtros selecionados." });
    }

    const responsaveisIds = [...new Set(cameras.flatMap((camera) => camera.eventos.map((evento) => evento.responsavelId).filter(Boolean)))] as number[];
    const responsaveis = await prisma.usuario.findMany({
      where: { id: { in: responsaveisIds } },
      select: { id: true, nome: true, apelido: true },
    });
    const usuarios = new Map(responsaveis.map((usuario) => [usuario.id, usuario]));

    const camerasRelatorio = cameras.map((camera) => {
      const checklist = camera.checklists[0];
      const retencao = checklist
        ? calcularRetencaoEfetiva({
            dataMaisAntiga: checklist.dataInicialGravacao,
            dataMaisRecente: checklist.dataMaisRecenteGravacao,
            statusCamera: camera.status,
            eventos: camera.eventos,
          })
        : null;
      const totalIndisponibilidade = camera.eventos.reduce((soma, evento) => {
        return soma + (evento.duracaoIndisponivel ?? minutosEntre(evento.iniciadoEm, evento.encerradoEm || new Date()));
      }, 0);
      return {
        camera,
        checklist,
        retencao,
        diasRetencao: retencao ? Math.floor(retencao.retencaoMinutos / 1440) : null,
        totalIndisponibilidade,
        eventos: camera.eventos.map((evento) => {
          const duracao = evento.duracaoIndisponivel ?? minutosEntre(evento.iniciadoEm, evento.encerradoEm || new Date());
          const responsavel = evento.responsavelId ? usuarios.get(evento.responsavelId) : null;
          return {
            ...evento,
            duracaoCalculada: duracao,
            responsavelNome: responsavel ? responsavel.apelido || responsavel.nome : "Sistema",
          };
        }),
      };
    });

    const total = camerasRelatorio.length;
    const conectadas = camerasRelatorio.filter(({ camera }) => camera.status === STATUS_CONECTADA).length;
    const desconectadas = camerasRelatorio.filter(({ camera }) => camera.status === STATUS_DESCONECTADA).length;
    const totalEventos = camerasRelatorio.reduce((soma, item) => soma + item.eventos.length, 0);
    const totalIndisponibilidade = camerasRelatorio.reduce((soma, item) => soma + item.totalIndisponibilidade, 0);
    const retencoesValidas = camerasRelatorio.map((item) => item.diasRetencao).filter((dias): dias is number => typeof dias === "number");
    const retencaoMedia = retencoesValidas.length ? Math.round(retencoesValidas.reduce((soma, dias) => soma + dias, 0) / retencoesValidas.length) : 0;
    const snapshotAtual = camerasRelatorio.map(({ camera, diasRetencao, totalIndisponibilidade: totalCamera }) => ({
      cameraId: camera.id,
      numeroCamera: camera.numeroCamera,
      nomeCamera: camera.nomeCamera,
      servidor: camera.numeroServidor,
      area: camera.areaMonitorada,
      status: camera.status,
      diasRetencao,
      totalFalhas: camera.totalFalhas,
      totalIndisponibilidade: totalCamera,
    }));
    const relatorioAnterior = await prisma.relatorioCftv.findFirst({
      where: { unidade: req.unidadeAtiva || "GJA-T1", snapshotJson: { not: null } },
      orderBy: { createdAt: "desc" },
    });
    const snapshotAnterior = relatorioAnterior?.snapshotJson
      ? JSON.parse(relatorioAnterior.snapshotJson) as Array<{ cameraId: number; numeroCamera: string; diasRetencao: number | null; totalFalhas: number; totalIndisponibilidade: number; status: string }>
      : [];
    const mapaAnterior = new Map(snapshotAnterior.map((item) => [item.cameraId, item]));
    const comparativoCameras = snapshotAtual.map((atual) => {
      const anterior = mapaAnterior.get(atual.cameraId);
      const variacaoRetencao =
        anterior && typeof atual.diasRetencao === "number" && typeof anterior.diasRetencao === "number"
          ? atual.diasRetencao - anterior.diasRetencao
          : null;
      return {
        ...atual,
        anterior,
        variacaoRetencao,
        variacaoFalhas: anterior ? atual.totalFalhas - anterior.totalFalhas : null,
        variacaoIndisponibilidade: anterior ? atual.totalIndisponibilidade - anterior.totalIndisponibilidade : null,
      };
    });
    const ganhoRetencao = comparativoCameras.filter((item) => (item.variacaoRetencao ?? 0) > 0).length;
    const perdaRetencao = comparativoCameras.filter((item) => (item.variacaoRetencao ?? 0) < 0).length;
    const variacaoRetencaoMedia = relatorioAnterior ? retencaoMedia - relatorioAnterior.retencaoMedia : null;
    const variacaoIndisponibilidadeTotal = relatorioAnterior ? totalIndisponibilidade - relatorioAnterior.totalIndisponibilidade : null;

    const ano = new Date().getFullYear();
    const relatorioCftv = await prisma.$transaction(async (tx) => {
      const ultimo = await tx.relatorioCftv.findFirst({
        where: { ano, unidade: req.unidadeAtiva || "GJA-T1" },
        orderBy: { numero: "desc" },
      });
      const numero = ultimo ? ultimo.numero + 1 : 1;
      return tx.relatorioCftv.create({
        data: {
          numero,
          ano,
          codigo: `CFTV${String(numero).padStart(3, "0")}/${ano}`,
          unidade: req.unidadeAtiva || "GJA-T1",
          responsavelId: req.usuarioId,
          camerasIdsJson: JSON.stringify(cameraIds),
          snapshotJson: JSON.stringify(snapshotAtual),
          retencaoMedia,
          totalEventos,
          totalIndisponibilidade,
          totalCameras: cameras.length,
        },
      });
    });
    const protocolo = relatorioCftv.codigo;
    const assinatura = await assinarDocumento({
      req,
      modulo: "RelatorioCftv",
      registroId: relatorioCftv.id,
      codigoRegistro: relatorioCftv.codigo,
      unidade: relatorioCftv.unidade,
      acao: "Emissao do Relatorio Tecnico CFTV",
      dados: {
        total,
        conectadas,
        desconectadas,
        totalEventos,
        retencaoMedia,
        cameras: cameraIds,
      },
    });
    const validacaoUrl = criarUrlValidacaoAssinatura(req, assinatura.token);
    const qrCode = await criarQrCodeValidacao(validacaoUrl);
    const usuario = await prisma.usuario.findUnique({
      where: { id: req.usuarioId },
      select: { nome: true, apelido: true },
    });
    const responsavelEmissao = usuario?.apelido || usuario?.nome || "Usuario autenticado";

    const doc = new PDFDocument({ size: "A4", margin: 42, bufferPages: true });
    const pageWidth = doc.page.width;
    const pageHeight = doc.page.height;
    const contentWidth = pageWidth - 84;
    const footerY = pageHeight - 116;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename=relatorio-disponibilidade-cftv-${protocolo.replace("/", "-")}.pdf`);
    doc.pipe(res);

    function header() {
      desenharCabecalhoPadrao(doc, {
        titulo: "Relatório Técnico CFTV",
        subtitulo: "Disponibilidade e indisponibilidade",
        codigo: protocolo,
        unidade: req.unidadeAtiva || "GJA-T1",
      });
    }

    function footer(numeroPagina?: number, totalPaginas?: number) {
      desenharRodapeAssinaturaPadrao(doc, {
        assinatura,
        qrCode,
        pagina: numeroPagina,
        totalPaginas,
      });
    }

    function ensureSpace(height = 80) {
      if (doc.y + height < footerY - 20) return;
      doc.addPage();
      header();
    }

    function card(x: number, y: number, w: number, label: string, value: string, color = "#0f172a") {
      doc.roundedRect(x, y, w, 48, 8).fillAndStroke("#f8fafc", "#e2e8f0");
      doc.fillColor("#64748b").fontSize(7).text(label.toUpperCase(), x + 10, y + 9, { width: w - 20 });
      doc.fillColor(color).fontSize(15).text(value, x + 10, y + 24, { width: w - 20, lineBreak: false, ellipsis: true });
    }

    function graficoBarras(titulo: string, dados: Array<{ label: string; value: number; color: string }>) {
      ensureSpace(120);
      doc.fillColor("#0f172a").fontSize(12).text(titulo, 42, doc.y);
      doc.moveDown(0.6);
      const max = Math.max(...dados.map((item) => item.value), 1);
      dados.forEach((item) => {
        const y = doc.y;
        doc.fillColor("#334155").fontSize(8).text(item.label, 42, y + 2, { width: 116, lineBreak: false, ellipsis: true });
        doc.roundedRect(164, y, 300, 12, 6).fill("#e2e8f0");
        doc.roundedRect(164, y, Math.max(8, (item.value / max) * 300), 12, 6).fill(item.color);
        doc.fillColor("#0f172a").fontSize(8).text(String(item.value), 474, y + 1, { width: 40, align: "right" });
        doc.y += 20;
      });
      doc.moveDown(0.3);
    }

    function tabela(headers: string[], widths: number[], rows: string[][]) {
      ensureSpace(44);
      let y = doc.y;
      doc.roundedRect(42, y, contentWidth, 24, 6).fill("#0f172a");
      let x = 42;
      headers.forEach((head, i) => {
        doc.fillColor("#ffffff").fontSize(7).text(head.toUpperCase(), x + 5, y + 8, { width: widths[i] - 8, lineBreak: false, ellipsis: true });
        x += widths[i];
      });
      doc.y = y + 28;
      rows.forEach((row, index) => {
        const rowH = 34;
        ensureSpace(rowH + 8);
        y = doc.y;
        doc.rect(42, y, contentWidth, rowH).fill(index % 2 === 0 ? "#ffffff" : "#f8fafc").strokeColor("#e2e8f0").stroke();
        x = 42;
        row.forEach((cell, i) => {
          doc.fillColor("#334155").fontSize(7.2).text(cell, x + 5, y + 8, { width: widths[i] - 8, height: rowH - 10, ellipsis: true });
          x += widths[i];
        });
        doc.y = y + rowH;
      });
      doc.moveDown(0.8);
    }

    header();

    doc.fillColor("#0f172a").fontSize(12).text("Resumo executivo", 42, doc.y);
    doc.moveDown(0.7);
    const col = (contentWidth - 36) / 4;
    const yCards = doc.y;
    card(42, yCards, col, "Cameras avaliadas", String(total));
    card(42 + col + 12, yCards, col, "Conectadas", String(conectadas), "#059669");
    card(42 + (col + 12) * 2, yCards, col, "Desconectadas", String(desconectadas), "#dc2626");
    card(42 + (col + 12) * 3, yCards, col, "Retencao media", `${retencaoMedia} dias`, "#2563eb");
    doc.y = yCards + 68;

    const intro =
      "Conforme analise realizada no modulo de Gestao e Monitoramento de Cameras CFTV do JetGuard, este relatorio consolida o status operacional, a retencao de gravacao e os registros de conexao, desconexao e indisponibilidade das cameras selecionadas. As informacoes apresentadas apoiam a auditoria tecnica, o acompanhamento de SLA, a rastreabilidade das falhas e a tomada de decisao para tratativas preventivas ou corretivas.";
    const introY = doc.y;
    const introH = 74;
    doc.roundedRect(42, introY, contentWidth, introH, 10).fillAndStroke("#f8fafc", "#dbeafe");
    doc.fillColor("#0f172a").fontSize(8.8).text(intro, 56, introY + 11, { width: contentWidth - 28, align: "justify", lineGap: 1.5 });
    doc.y = introY + introH + 10;

    graficoBarras("Mapa grafico de status", [
      { label: "Conectadas", value: conectadas, color: "#10b981" },
      { label: "Desconectadas", value: desconectadas, color: "#ef4444" },
      { label: "Eventos de indisponibilidade", value: totalEventos, color: "#2563eb" },
      { label: "Horas indisponiveis", value: Math.round(totalIndisponibilidade / 60), color: "#f59e0b" },
    ]);

    tabela(
      ["Camera", "Servidor", "Status", "Area monitorada", "Retencao", "Falhas"],
      [70, 70, 70, 165, 85, contentWidth - 70 - 70 - 70 - 165 - 85],
      camerasRelatorio.map(({ camera, diasRetencao }) => [
        `${camera.numeroCamera}${camera.nomeCamera ? ` - ${camera.nomeCamera}` : ""}`,
        camera.numeroServidor,
        camera.status,
        camera.areaMonitorada,
        diasRetencao === null ? "Sem checklist" : `${diasRetencao} dias`,
        String(camera.totalFalhas),
      ])
    );

    ensureSpace(150);
    doc.fillColor("#0f172a").fontSize(12).text("Analise comparativa de retencao e disponibilidade", 42, doc.y);
    doc.moveDown(0.6);
    if (!relatorioAnterior) {
      doc.roundedRect(42, doc.y, contentWidth, 42, 8).fillAndStroke("#f8fafc", "#e2e8f0");
      doc.fillColor("#475569").fontSize(9).text(
        "Este e o primeiro relatorio CFTV com base comparativa armazenada para esta unidade. A partir da proxima emissao, o JetGuard apresentara ganhos, perdas e variacoes em relacao ao relatorio anterior.",
        56,
        doc.y + 12,
        { width: contentWidth - 28 }
      );
      doc.y += 54;
    } else {
      const yComp = doc.y;
      const compCol = (contentWidth - 36) / 4;
      card(42, yComp, compCol, "Comparado com", relatorioAnterior.codigo, "#2563eb");
      card(42 + compCol + 12, yComp, compCol, "Variacao retencao", `${variacaoRetencaoMedia && variacaoRetencaoMedia > 0 ? "+" : ""}${variacaoRetencaoMedia ?? 0} dias`, (variacaoRetencaoMedia ?? 0) < 0 ? "#dc2626" : "#059669");
      card(42 + (compCol + 12) * 2, yComp, compCol, "Cameras com ganho", String(ganhoRetencao), "#059669");
      card(42 + (compCol + 12) * 3, yComp, compCol, "Cameras com perda", String(perdaRetencao), "#dc2626");
      doc.y = yComp + 64;

      const variacaoIndisponibilidadeTexto = variacaoIndisponibilidadeTotal === null
        ? ""
        : ` A variacao total de indisponibilidade foi de ${variacaoIndisponibilidadeTotal > 0 ? "+" : ""}${Math.round(variacaoIndisponibilidadeTotal / 60)} hora(s).`;
      const textoComparativo =
        (variacaoRetencaoMedia ?? 0) < 0
          ? `Em comparacao com o relatorio ${relatorioAnterior.codigo}, houve reducao media de ${Math.abs(variacaoRetencaoMedia || 0)} dia(s) de retencao. Este comportamento pode indicar impacto por indisponibilidade, falha de gravacao ou sobrescrita operacional no Digifort.${variacaoIndisponibilidadeTexto}`
          : `Em comparacao com o relatorio ${relatorioAnterior.codigo}, houve ganho ou estabilidade na retencao media das cameras avaliadas.${variacaoIndisponibilidadeTexto} Recomenda-se manter o acompanhamento para confirmar a tendencia operacional.`;
      const textoCompH = Math.max(42, doc.heightOfString(textoComparativo, { width: contentWidth - 28, lineGap: 2 }) + 22);
      doc.roundedRect(42, doc.y, contentWidth, textoCompH, 8).fillAndStroke("#f8fafc", "#dbeafe");
      doc.fillColor("#334155").fontSize(9).text(textoComparativo, 56, doc.y + 11, { width: contentWidth - 28, lineGap: 2 });
      doc.y += textoCompH + 10;

      const linhasComparativo = comparativoCameras
        .filter((item) => item.anterior)
        .sort((a, b) => (a.variacaoRetencao ?? 0) - (b.variacaoRetencao ?? 0))
        .slice(0, 10)
        .map((item) => [
          `${item.numeroCamera}${item.nomeCamera ? ` - ${item.nomeCamera}` : ""}`,
          item.anterior?.diasRetencao === null || item.anterior?.diasRetencao === undefined ? "Sem base" : `${item.anterior.diasRetencao} dias`,
          item.diasRetencao === null ? "Sem checklist" : `${item.diasRetencao} dias`,
          item.variacaoRetencao === null ? "N/A" : `${item.variacaoRetencao > 0 ? "+" : ""}${item.variacaoRetencao} dias`,
          item.variacaoIndisponibilidade === null ? "N/A" : `${item.variacaoIndisponibilidade > 0 ? "+" : ""}${Math.round(item.variacaoIndisponibilidade / 60)} h`,
        ]);
      if (linhasComparativo.length > 0) {
        tabela(
          ["Camera", "Retencao anterior", "Retencao atual", "Ganho/perda", "Indisp."],
          [132, 96, 90, 82, contentWidth - 132 - 96 - 90 - 82],
          linhasComparativo
        );
      }
    }

    camerasRelatorio.forEach(({ camera, checklist, eventos, totalIndisponibilidade: totalCamera, diasRetencao }) => {
      ensureSpace(116);
      doc.fillColor("#0f172a").fontSize(12).text(`Historico - Camera ${camera.numeroCamera}${camera.nomeCamera ? ` - ${camera.nomeCamera}` : ""}`, 42, doc.y);
      doc.moveDown(0.4);
      doc.fillColor("#475569").fontSize(8.5).text(
        `Servidor ${camera.numeroServidor} | ${camera.areaMonitorada} | ${camera.localInstalado} | Status atual: ${camera.status} | Retencao: ${diasRetencao === null ? "Sem checklist" : `${diasRetencao} dias`} | Indisponibilidade acumulada: ${formatarIndisponibilidade(totalCamera)}`,
        42,
        doc.y,
        { width: contentWidth }
      );
      doc.moveDown(0.6);
      if (checklist) {
        doc.fillColor("#64748b").fontSize(8).text(
          `Ultimo checklist: ${dataPt(checklist.createdAt)} | Data mais antiga: ${dataPt(checklist.dataInicialGravacao)} | Data mais recente: ${dataPt(checklist.dataMaisRecenteGravacao)} | Responsavel: ${checklist.responsavel?.apelido || checklist.responsavel?.nome || "Nao informado"}`,
          42,
          doc.y,
          { width: contentWidth }
        );
        doc.moveDown(0.7);
      }
      if (eventos.length === 0) {
        doc.roundedRect(42, doc.y, contentWidth, 30, 6).fillAndStroke("#f0fdf4", "#bbf7d0");
        doc.fillColor("#047857").fontSize(8.5).text("Sem registros de indisponibilidade para a camera no historico selecionado.", 54, doc.y + 10, { width: contentWidth - 24 });
        doc.y += 40;
        return;
      }
      tabela(
        ["Inicio", "Fim", "Duracao", "Motivo", "Responsavel"],
        [88, 88, 80, 156, contentWidth - 88 - 88 - 80 - 156],
        eventos.slice(0, 12).map((evento) => [
          dataPt(evento.iniciadoEm),
          dataPt(evento.encerradoEm),
          formatarIndisponibilidade(evento.duracaoCalculada),
          textoPdf(evento.motivo || evento.observacao),
          evento.responsavelNome,
        ])
      );
    });

    ensureSpace(92);
    const conclusao = desconectadas > 0 || totalEventos > 0
      ? "Foram identificados registros de indisponibilidade ou cameras desconectadas entre os itens avaliados. Recomenda-se acompanhamento tecnico, verificacao das causas recorrentes e priorizacao das cameras com maior impacto operacional para preservacao da cobertura de seguranca patrimonial."
      : "As cameras selecionadas apresentam condicao operacional satisfatoria no momento da emissao, sem registros de indisponibilidade no historico avaliado. Recomenda-se manter a rotina de checklist e a verificacao periodica da retencao real no Digifort.";
    doc.fillColor("#0f172a").fontSize(12).text("Conclusao tecnica", 42, doc.y);
    doc.moveDown(0.5);
    const conclusaoH = Math.max(62, doc.heightOfString(conclusao, { width: contentWidth - 32, align: "justify", lineGap: 3 }) + 26);
    doc.roundedRect(42, doc.y, contentWidth, conclusaoH, 9).fillAndStroke(desconectadas > 0 || totalEventos > 0 ? "#fff7ed" : "#f0fdf4", desconectadas > 0 || totalEventos > 0 ? "#fed7aa" : "#bbf7d0");
    doc.rect(42, doc.y, 4, conclusaoH).fill(desconectadas > 0 || totalEventos > 0 ? "#f97316" : "#10b981");
    doc.fillColor("#334155").fontSize(9.5).text(conclusao, 58, doc.y + 14, { width: contentWidth - 32, align: "justify", lineGap: 3 });

    const range = doc.bufferedPageRange();
    for (let i = range.start; i < range.start + range.count; i += 1) {
      doc.switchToPage(i);
      footer(i + 1, range.count);
    }
    doc.end();

    await registrarLog({
      req,
      acao: `Emissao de relatorio tecnico CFTV ${protocolo}`,
      tipoRegistro: "RelatorioCftv",
      registroId: relatorioCftv.id,
      dadosNovos: { protocolo, cameras: cameraIds, unidade: req.unidadeAtiva },
    });
  } catch (error: any) {
    console.error(error);
    return res.status(error?.status || 500).json({ error: error?.message || "Erro ao gerar relatorio tecnico CFTV" });
  }
}

export async function exportarHistoricoCameras(req: AuthRequest, res: Response) {
  try {
    const eventos = await prisma.cameraEventoStatus.findMany({
      where: { unidade: req.unidadeAtiva, camera: { statusCadastro: STATUS_CADASTRO_ATIVA } },
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
