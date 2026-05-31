import { Response } from "express";
import crypto from "crypto";
import fs from "fs";
import PDFDocument from "pdfkit";
import { prisma } from "../lib/prisma";
import { AuthRequest } from "../middlewares/auth";

type RegistroAnalitico = {
  id: number;
  tipo: "Ocorrencia" | "Evento";
  codigo: string;
  assunto: string;
  local: string;
  unidade: string;
  natureza: string;
  subNatureza: string;
  status: string;
  data: Date;
  createdAt: Date;
  envolvidos: Array<{ nome: string; documento: string; empresa?: string | null }>;
  analise?: { iniciadoEm: Date; concluidoEm?: Date | null; status: string } | null;
  anexos: Array<{ id: number; nomeOriginal: string; caminho: string; tipo: string; createdAt: Date }>;
};

function horasEntre(inicio?: Date | null, fim?: Date | null) {
  if (!inicio || !fim) return null;
  return Math.max(0, (fim.getTime() - inicio.getTime()) / 3600000);
}

function media(valores: Array<number | null>) {
  const validos = valores.filter((valor): valor is number => typeof valor === "number" && Number.isFinite(valor));
  if (validos.length === 0) return 0;
  return validos.reduce((acc, valor) => acc + valor, 0) / validos.length;
}

function normalizar(valor?: string | null) {
  return String(valor || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function hashArquivo(caminho: string) {
  try {
    if (!fs.existsSync(caminho)) return null;
    return crypto.createHash("sha256").update(fs.readFileSync(caminho)).digest("hex");
  } catch {
    return null;
  }
}

function calcularCriticidade(registro: RegistroAnalitico) {
  const texto = normalizar(`${registro.assunto} ${registro.local} ${registro.natureza} ${registro.subNatureza} ${registro.status}`);
  let pontos = 1;
  const motivos: string[] = [];

  const regras: Array<[string[], number, string]> = [
    [["roubo", "arma", "agressao"], 4, "risco grave contra patrimônio ou pessoas"],
    [["furto", "invasao", "acesso indevido", "violacao"], 3, "risco patrimonial relevante"],
    [["incendio", "explosao", "acidente"], 4, "risco crítico de segurança operacional"],
    [["recinto alfandegado", "alfandegado", "gate", "portaria", "cais"], 2, "área sensível do terminal"],
    [["concluido"], -1, "registro já concluído"],
    [["anulado"], -2, "registro anulado"],
  ];

  regras.forEach(([termos, peso, motivo]) => {
    if (termos.some((termo) => texto.includes(termo))) {
      pontos += peso;
      motivos.push(motivo);
    }
  });

  if (registro.envolvidos.length >= 3) {
    pontos += 1;
    motivos.push("múltiplos envolvidos");
  }

  if (registro.analise?.status === "Em Análise") {
    pontos += 1;
    motivos.push("análise em andamento");
  }

  if (pontos >= 6) return { nivel: "Crítica", pontos, motivos };
  if (pontos >= 4) return { nivel: "Alta", pontos, motivos };
  if (pontos >= 2) return { nivel: "Moderada", pontos, motivos };
  return { nivel: "Baixa", pontos, motivos: motivos.length ? motivos : ["sem fatores críticos identificados"] };
}

function agrupar<T extends Record<string, unknown>>(itens: T[], chave: keyof T) {
  return Object.entries(
    itens.reduce<Record<string, number>>((acc, item) => {
      const valor = String(item[chave] || "Não informado");
      acc[valor] = (acc[valor] || 0) + 1;
      return acc;
    }, {})
  )
    .map(([nome, total]) => ({ nome, total }))
    .sort((a, b) => b.total - a.total);
}

function gerarResumoPatrimonial(params: {
  ocorrencias: any[];
  eventos: any[];
  investigacoes: any[];
  riscos: any[];
  cameras: any[];
  logs: any[];
}) {
  const registros: RegistroAnalitico[] = [
    ...params.ocorrencias.map((item) => ({
      ...item,
      tipo: "Ocorrencia" as const,
      data: item.dataOcorrencia,
      envolvidos: item.envolvidos,
      anexos: item.anexos,
    })),
    ...params.eventos.map((item) => ({
      ...item,
      tipo: "Evento" as const,
      data: item.dataEvento,
      envolvidos: item.envolvidos,
      anexos: item.anexos,
    })),
  ];

  const registrosComCriticidade = registros.map((registro) => ({
    id: registro.id,
    tipo: registro.tipo,
    codigo: registro.codigo,
    assunto: registro.assunto,
    local: registro.local,
    natureza: registro.natureza,
    subNatureza: registro.subNatureza,
    status: registro.status,
    criticidade: calcularCriticidade(registro),
  }));

  const evidencias = registros.flatMap((registro) =>
    registro.anexos.map((anexo) => {
      const logsRegistro = params.logs.filter((log) => log.registroId === registro.id && normalizar(log.tipoRegistro).includes(normalizar(registro.tipo)));
      return {
        id: `${registro.tipo}-${anexo.id}`,
        modulo: registro.tipo,
        codigo: registro.codigo,
        titulo: registro.assunto,
        arquivo: anexo.nomeOriginal,
        tipo: anexo.tipo,
        hashSha256: hashArquivo(anexo.caminho),
        criadoEm: anexo.createdAt,
        eventosCustodia: [
          { acao: "Anexo registrado no relatório", data: anexo.createdAt, usuario: "Sistema" },
          ...logsRegistro.slice(0, 8).map((log) => ({ acao: log.acao, data: log.createdAt, usuario: log.usuarioNome })),
        ],
      };
    })
  );

  const inicioAnaliseOcorrencia = params.ocorrencias.map((item) => horasEntre(item.createdAt, item.analise?.iniciadoEm));
  const inicioAnaliseEvento = params.eventos.map((item) => horasEntre(item.createdAt, item.analise?.iniciadoEm));
  const conclusaoAnaliseOcorrencia = params.ocorrencias.map((item) => horasEntre(item.analise?.iniciadoEm, item.analise?.concluidoEm));
  const conclusaoAnaliseEvento = params.eventos.map((item) => horasEntre(item.analise?.iniciadoEm, item.analise?.concluidoEm));

  const registrosSemAnalise24h = registros.filter((item) => {
    if (item.analise) return false;
    return horasEntre(item.createdAt, new Date())! > 24 && item.status !== "Anulado" && item.status !== "Concluído";
  });

  const camerasOffline = params.cameras.filter((camera) => camera.status === "Desconectada");
  const tempoOfflineMedio = media(params.cameras.map((camera) => camera.totalIndisponibilidade ? camera.totalIndisponibilidade / 60 : null));

  const areas = Array.from(new Set([
    ...registros.map((item) => item.local),
    ...params.cameras.map((camera) => camera.areaMonitorada || camera.localInstalado),
    ...params.riscos.map((risco) => risco.local),
  ].filter(Boolean)));

  const mapaTerminal = areas.map((area) => {
    const registrosArea = registros.filter((item) => item.local === area);
    const camerasArea = params.cameras.filter((camera) => camera.areaMonitorada === area || camera.localInstalado === area);
    const riscosArea = params.riscos.filter((risco) => risco.local === area);
    const offline = camerasArea.filter((camera) => camera.status === "Desconectada").length;
    const criticos = riscosArea.filter((risco) => ["Crítico", "Critico", "Alto"].includes(risco.nivelRisco)).length;
    const indice = registrosArea.length + offline * 2 + criticos * 3;
    return {
      area,
      ocorrenciasEventos: registrosArea.length,
      cameras: camerasArea.length,
      camerasOffline: offline,
      riscos: riscosArea.length,
      riscosCriticos: criticos,
      indiceCriticidade: indice,
      nivel: indice >= 8 ? "Crítica" : indice >= 4 ? "Atenção" : "Monitorada",
    };
  }).sort((a, b) => b.indiceCriticidade - a.indiceCriticidade);

  const envolvidos = registros.flatMap((item) =>
    item.envolvidos.map((envolvido) => ({
      chave: envolvido.documento || envolvido.nome,
      nome: envolvido.nome,
      documento: envolvido.documento,
      registro: item.codigo,
      tipo: item.tipo,
    }))
  );

  const envolvidosRecorrentes = Object.values(
    envolvidos.reduce<Record<string, { chave: string; nome: string; documento: string; total: number; registros: string[] }>>((acc, item) => {
      if (!item.chave) return acc;
      acc[item.chave] ||= { chave: item.chave, nome: item.nome, documento: item.documento, total: 0, registros: [] };
      acc[item.chave].total += 1;
      acc[item.chave].registros.push(`${item.tipo} ${item.registro}`);
      return acc;
    }, {})
  ).filter((item) => item.total > 1).sort((a, b) => b.total - a.total);

  return {
    geradoEm: new Date(),
    indicadores: {
      registros: registros.length,
      ocorrencias: params.ocorrencias.length,
      eventos: params.eventos.length,
      investigacoes: params.investigacoes.length,
      riscosCriticos: params.riscos.filter((risco) => ["Crítico", "Critico", "Alto"].includes(risco.nivelRisco)).length,
      evidencias: evidencias.length,
      cameras: params.cameras.length,
      camerasOffline: camerasOffline.length,
      criticidadeCritica: registrosComCriticidade.filter((item) => item.criticidade.nivel === "Crítica").length,
      slaPendencias: registrosSemAnalise24h.length,
    },
    criticidade: registrosComCriticidade.sort((a, b) => b.criticidade.pontos - a.criticidade.pontos).slice(0, 20),
    cadeiaCustodia: {
      totalEvidencias: evidencias.length,
      evidenciasSemHash: evidencias.filter((item) => !item.hashSha256).length,
      amostras: evidencias.slice(0, 30),
    },
    sla: {
      metaInicioAnaliseHoras: 24,
      metaConclusaoAnaliseHoras: 72,
      tempoMedioInicioAnaliseHoras: Number(media([...inicioAnaliseOcorrencia, ...inicioAnaliseEvento]).toFixed(1)),
      tempoMedioConclusaoAnaliseHoras: Number(media([...conclusaoAnaliseOcorrencia, ...conclusaoAnaliseEvento]).toFixed(1)),
      registrosSemAnalise24h: registrosSemAnalise24h.length,
      tempoMedioOfflineCameraMinutos: Number(tempoOfflineMedio.toFixed(1)),
      camerasOffline: camerasOffline.length,
    },
    mapaTerminal,
    reincidencia: {
      porNatureza: agrupar(registros, "natureza").slice(0, 8),
      porSubNatureza: agrupar(registros, "subNatureza").slice(0, 8),
      porLocal: agrupar(registros, "local").slice(0, 8),
      envolvidosRecorrentes: envolvidosRecorrentes.slice(0, 10),
      camerasInstaveis: params.cameras
        .map((camera) => ({
          camera: camera.numeroCamera,
          servidor: camera.numeroServidor,
          area: camera.areaMonitorada,
          falhas: camera.totalFalhas,
          indisponibilidadeMinutos: camera.totalIndisponibilidade,
          status: camera.status,
        }))
        .sort((a, b) => b.falhas - a.falhas || b.indisponibilidadeMinutos - a.indisponibilidadeMinutos)
        .slice(0, 10),
    },
    relatoriosExecutivos: {
      resumo: "Relatório executivo consolidado com criticidade, SLA, reincidência, evidências e CFTV.",
      recomendacoes: [
        "Priorizar áreas com maior índice de criticidade no mapa operacional.",
        "Atuar em registros sem análise acima de 24 horas.",
        "Revisar câmeras com falhas recorrentes e maior indisponibilidade.",
        "Abrir planos de ação para naturezas e locais reincidentes.",
        "Preservar cadeia de custódia das evidências com hash e histórico de auditoria.",
      ],
    },
  };
}

async function carregarDados(req: AuthRequest) {
  return Promise.all([
    prisma.ocorrencia.findMany({
      where: { unidade: req.unidadeAtiva },
      include: { envolvidos: true, anexos: true, analise: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.evento.findMany({
      where: { unidade: req.unidadeAtiva },
      include: { envolvidos: true, anexos: true, analise: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.investigacao.findMany({ where: { unidade: req.unidadeAtiva }, orderBy: { createdAt: "desc" } }),
    prisma.analiseRisco.findMany({ where: { unidade: req.unidadeAtiva }, orderBy: { createdAt: "desc" } }),
    prisma.cameraMonitoramento.findMany({ where: { unidade: req.unidadeAtiva, statusCadastro: "Ativa" }, orderBy: { updatedAt: "desc" } }),
    prisma.logAuditoria.findMany({ orderBy: { createdAt: "desc" }, take: 500 }),
  ]);
}

export async function resumoPatrimonialAvancado(req: AuthRequest, res: Response) {
  try {
    const [ocorrencias, eventos, investigacoes, riscos, cameras, logs] = await carregarDados(req);
    return res.json(gerarResumoPatrimonial({ ocorrencias, eventos, investigacoes, riscos, cameras, logs }));
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro ao gerar gestão patrimonial avançada" });
  }
}

function escreverLinha(doc: PDFKit.PDFDocument, titulo: string, valor: string | number) {
  doc.font("Helvetica-Bold").fillColor("#0f172a").text(`${titulo}: `, { continued: true });
  doc.font("Helvetica").fillColor("#334155").text(String(valor));
}

export async function pdfRelatorioExecutivoPatrimonial(req: AuthRequest, res: Response) {
  try {
    const [ocorrencias, eventos, investigacoes, riscos, cameras, logs] = await carregarDados(req);
    const resumo = gerarResumoPatrimonial({ ocorrencias, eventos, investigacoes, riscos, cameras, logs });

    const doc = new PDFDocument({ margin: 48, size: "A4" });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "inline; filename=relatorio-executivo-patrimonial.pdf");
    doc.pipe(res);

    doc.fontSize(20).fillColor("#0f172a").font("Helvetica-Bold").text("Relatório Executivo Patrimonial");
    doc.fontSize(11).fillColor("#64748b").font("Helvetica").text(`Unidade: ${req.unidadeAtiva || "GJA-T1"} | Gerado em ${new Date().toLocaleString("pt-BR")}`);
    doc.moveDown();

    doc.fontSize(14).fillColor("#1d4ed8").font("Helvetica-Bold").text("Indicadores");
    Object.entries(resumo.indicadores).forEach(([chave, valor]) => escreverLinha(doc, chave, valor));
    doc.moveDown();

    doc.fontSize(14).fillColor("#1d4ed8").font("Helvetica-Bold").text("SLA Operacional");
    Object.entries(resumo.sla).forEach(([chave, valor]) => escreverLinha(doc, chave, valor));
    doc.moveDown();

    doc.fontSize(14).fillColor("#1d4ed8").font("Helvetica-Bold").text("Áreas Prioritárias");
    resumo.mapaTerminal.slice(0, 8).forEach((area) => {
      doc.fontSize(10).fillColor("#334155").font("Helvetica").text(`${area.area} | ${area.nivel} | índice ${area.indiceCriticidade} | registros ${area.ocorrenciasEventos} | câmeras offline ${area.camerasOffline}`);
    });
    doc.moveDown();

    doc.fontSize(14).fillColor("#1d4ed8").font("Helvetica-Bold").text("Criticidade Automática");
    resumo.criticidade.slice(0, 8).forEach((item) => {
      doc.fontSize(10).fillColor("#334155").font("Helvetica").text(`${item.tipo} ${item.codigo} | ${item.criticidade.nivel} | ${item.local} | ${item.natureza}`);
    });
    doc.moveDown();

    doc.fontSize(14).fillColor("#1d4ed8").font("Helvetica-Bold").text("Recomendações Executivas");
    resumo.relatoriosExecutivos.recomendacoes.forEach((item) => {
      doc.fontSize(10).fillColor("#334155").font("Helvetica").text(`- ${item}`);
    });

    doc.end();
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro ao gerar relatório executivo patrimonial" });
  }
}
