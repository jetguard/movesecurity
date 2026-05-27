import { Response } from "express";
import { prisma } from "../lib/prisma";
import { AuthRequest } from "../middlewares/auth";
import { registrarLog } from "../services/auditoria.service";

function inicioDia(data = new Date()) {
  const inicio = new Date(data);
  inicio.setHours(0, 0, 0, 0);
  return inicio;
}

function inicioMes(data = new Date()) {
  return new Date(data.getFullYear(), data.getMonth(), 1);
}

function horaRegistro(data: Date) {
  return `${String(data.getHours()).padStart(2, "0")}:00`;
}

function agrupar<T>(itens: T[], chave: (item: T) => string | null | undefined) {
  return Object.entries(
    itens.reduce<Record<string, number>>((acc, item) => {
      const nome = chave(item) || "Não informado";
      acc[nome] = (acc[nome] || 0) + 1;
      return acc;
    }, {})
  )
    .map(([nome, total]) => ({ nome, total }))
    .sort((a, b) => b.total - a.total);
}

async function proximoCodigoChecklist(unidade: string) {
  const ano = new Date().getFullYear();
  const ultimo = await prisma.checklistInspecao.findFirst({
    where: { ano, unidade },
    orderBy: { numero: "desc" },
  });
  const numero = (ultimo?.numero || 0) + 1;
  return {
    ano,
    numero,
    codigo: `CHK${String(numero).padStart(3, "0")}/${ano}`,
  };
}

export async function painelOperacionalSoc(req: AuthRequest, res: Response) {
  try {
    const unidade = req.unidadeAtiva || "GJA-T1";
    const hoje = inicioDia();
    const mes = inicioMes();

    const [
      ocorrencias,
      eventos,
      investigacoes,
      cameras,
      containers,
      tarefas,
      checklists,
      cameraEventos,
    ] = await Promise.all([
      prisma.ocorrencia.findMany({ where: { unidade }, orderBy: { dataOcorrencia: "desc" }, take: 200 }),
      prisma.evento.findMany({ where: { unidade }, orderBy: { dataEvento: "desc" }, take: 200 }),
      prisma.investigacao.findMany({ where: { unidade }, orderBy: { createdAt: "desc" }, take: 100 }),
      prisma.cameraMonitoramento.findMany({ where: { unidade }, orderBy: { updatedAt: "desc" } }),
      prisma.quadraSegurancaContainer.findMany({ where: { unidade }, orderBy: { dataHoraEntrada: "desc" }, take: 200 }),
      prisma.planejamentoCard.findMany({
        where: { unidade, status: "Ativo" },
        include: { coluna: true, responsavel: { select: { nome: true, apelido: true } } },
        orderBy: { updatedAt: "desc" },
        take: 50,
      }),
      prisma.checklistInspecao.findMany({
        where: { unidade },
        include: { responsavel: { select: { nome: true, apelido: true } }, itens: true },
        orderBy: { dataHora: "desc" },
        take: 30,
      }),
      prisma.cameraEventoStatus.findMany({
        where: { unidade },
        include: { camera: true },
        orderBy: { iniciadoEm: "desc" },
        take: 100,
      }),
    ]);

    const registros = [
      ...ocorrencias.map((item) => ({
        modulo: "Ocorrência",
        codigo: item.codigo,
        titulo: item.assunto,
        local: item.local,
        natureza: item.natureza,
        unidade: item.unidade,
        data: item.dataOcorrencia,
        status: item.status,
      })),
      ...eventos.map((item) => ({
        modulo: "Evento",
        codigo: item.codigo,
        titulo: item.assunto,
        local: item.local,
        natureza: item.natureza,
        unidade: item.unidade,
        data: item.dataEvento,
        status: item.status,
      })),
    ];

    const containersCriticos = containers.filter((item) => {
      if (item.dataHoraSaida) return false;
      const horas = (Date.now() - item.dataHoraEntrada.getTime()) / 3600000;
      return horas >= 72 || item.prioridade === "Crítica" || item.statusOperacional === "Bloqueado";
    });

    return res.json({
      unidade,
      atualizadoEm: new Date().toISOString(),
      soc: {
        ocorrenciasAbertas: ocorrencias.filter((item) => item.status !== "Concluído").length,
        eventosAbertos: eventos.filter((item) => item.status !== "Concluído").length,
        investigacoesAbertas: investigacoes.filter((item) => item.status !== "Concluído").length,
        camerasOffline: cameras.filter((item) => item.status === "Desconectada").length,
        containersCriticos: containersCriticos.length,
        tarefasAbertas: tarefas.length,
        checklistsHoje: checklists.filter((item) => item.dataHora >= hoje).length,
      },
      checklistTurno: checklists.find((item) => item.tipo === "Checklist de Turno") || null,
      passagensServico: checklists.filter((item) => item.tipo === "Passagem de Serviço").slice(0, 6),
      livroEletronico: [
        ...registros.slice(0, 20).map((item) => ({
          tipo: item.modulo,
          titulo: `${item.codigo} - ${item.titulo}`,
          detalhe: `${item.local} | ${item.natureza} | ${item.status}`,
          data: item.data,
        })),
        ...cameraEventos.slice(0, 20).map((item) => ({
          tipo: "CFTV",
          titulo: `Câmera ${item.camera?.numeroCamera || "-"} - ${item.statusNovo}`,
          detalhe: `${item.camera?.areaMonitorada || "Área não informada"} | ${item.observacao || "Sem observação"}`,
          data: item.iniciadoEm,
        })),
      ]
        .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime())
        .slice(0, 30),
      reincidencia: {
        porLocal: agrupar(registros, (item) => item.local).slice(0, 8),
        porNatureza: agrupar(registros, (item) => item.natureza).slice(0, 8),
        porHorario: agrupar(registros, (item) => horaRegistro(item.data)).slice(0, 8),
        porUnidade: agrupar(registros, (item) => item.unidade).slice(0, 8),
      },
      indicadoresMensais: {
        ocorrencias: ocorrencias.filter((item) => item.dataOcorrencia >= mes).length,
        eventos: eventos.filter((item) => item.dataEvento >= mes).length,
        investigacoes: investigacoes.filter((item) => item.createdAt >= mes).length,
        camerasOffline: cameras.filter((item) => item.status === "Desconectada").length,
        containersNoTerminal: containers.filter((item) => !item.dataHoraSaida).length,
      },
      relatoriosExecutivosAutomaticos: [
        "Resumo diário operacional por unidade",
        "Relatório semanal de reincidência por local e natureza",
        "Relatório mensal executivo com indicadores por unidade",
      ],
      tarefas: tarefas.map((item) => ({
        id: item.id,
        titulo: item.titulo,
        status: item.coluna?.titulo || item.status,
        prioridade: item.prioridade,
        prazo: item.prazo,
        responsavel: item.responsavel?.apelido || item.responsavel?.nome || "Sem responsável",
      })),
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro ao carregar painel SOC operacional" });
  }
}

export async function criarRegistroOperacional(req: AuthRequest, res: Response) {
  try {
    const unidade = req.unidadeAtiva || "GJA-T1";
    const tipo = req.body.tipo === "Passagem de Serviço" ? "Passagem de Serviço" : "Checklist de Turno";
    const titulo = String(req.body.titulo || tipo).trim();
    const local = String(req.body.local || "Centro de Operações").trim();
    const observacoes = String(req.body.observacoes || "").trim();
    const itens = Array.isArray(req.body.itens) ? req.body.itens : [];
    const codigo = await proximoCodigoChecklist(unidade);

    const checklist = await prisma.checklistInspecao.create({
      data: {
        ...codigo,
        titulo,
        unidade,
        local,
        tipo,
        setor: "Operação",
        responsavelId: req.usuarioId!,
        status: req.body.status || "Aberto",
        observacoes,
        itens: {
          create: itens.length
            ? itens.map((item: any) => ({
                categoria: String(item.categoria || tipo),
                descricao: String(item.descricao || "Item operacional"),
                conformidade: String(item.conformidade || "Conforme"),
                criticidade: String(item.criticidade || "Media"),
                observacao: item.observacao ? String(item.observacao) : undefined,
              }))
            : [
                {
                  categoria: tipo,
                  descricao: observacoes || titulo,
                  conformidade: "Conforme",
                  criticidade: "Media",
                },
              ],
        },
      },
      include: { itens: true, responsavel: { select: { nome: true, apelido: true } } },
    });

    await registrarLog({
      req,
      acao: `Registro operacional - ${tipo}`,
      tipoRegistro: "Operacao",
      registroId: checklist.id,
      dadosNovos: checklist,
    });

    return res.status(201).json(checklist);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro ao criar registro operacional" });
  }
}
