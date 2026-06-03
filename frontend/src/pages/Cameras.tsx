import { type ReactNode, useEffect, useMemo, useState } from "react";
import { Activity, AlertTriangle, Camera, FileText, Radio, ShieldCheck, Wifi, WifiOff, X } from "lucide-react";
import {
  Brush,
  CartesianGrid,
  Line,
  LineChart as RechartsLineChart,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { PdfLightbox } from "../components/ui/PdfLightbox";
import { api } from "../services/api";
import { solicitarPinOperacional } from "../utils/pinPrompt";
import { podeAdministrar, podeAnalisar, podeSuperAdmin } from "../utils/permissoes";

type CameraItem = {
  id: number;
  numeroCamera: string;
  nomeCamera?: string;
  numeroServidor: string;
  tipoSistema: string;
  periodoGravacaoDias?: number;
  status: string;
  tecnologia: string;
  tipoCamera: string;
  localInstalado: string;
  areaMonitorada: string;
  infravermelho: string;
  monitoramento: string;
  statusCadastro?: string;
  removidaEm?: string | null;
  motivoRemocao?: string | null;
  ultimaManutencao?: string;
  observacoesTecnicas?: string;
  totalIndisponibilidade: number;
  totalFalhas: number;
  desconectadaDesde?: string | null;
  checklists?: Array<{
    id: number;
    tempoGravacaoDisponivel: number;
    dataInicialGravacao?: string | null;
    dataMaisRecenteGravacao?: string | null;
    retencaoEstimadaMinutos?: number | null;
    retencaoEstimadaTexto?: string | null;
    statusAtual?: string;
    createdAt: string;
  }>;
};

type CameraChecklistHistorico = {
  id: number;
  tempoGravacaoDisponivel: number;
  dataInicialGravacao?: string | null;
  dataMaisRecenteGravacao?: string | null;
  retencaoEstimadaMinutos?: number | null;
  retencaoEstimadaTexto?: string | null;
  statusAtual?: string;
  observacoesOperacionais?: string | null;
  createdAt: string;
  responsavel?: { nome: string; apelido?: string | null } | null;
};

type DashboardCameras = {
  total: number;
  online: number;
  offline: number;
  disponibilidade: number;
  indisponibilidade: number;
  mediaSolucao: number;
  mediaOfflinePorCamera: number;
  totalOfflineHistorico: number;
  retencaoMedia: number;
  camerasConformidade: number;
  camerasAtencao: number;
  camerasCriticas: number;
  camerasDesconectadas: number;
  menorRetencao: Array<{ id: number; numeroCamera: string; servidor: string; area: string; status: string; diasRetencao: number; dataMaisAntiga?: string; dataMaisRecente?: string }>;
  sla: number;
  metaSla?: number;
  indicadorSla: string;
  digifort?: { statusIntegracao: string; tipoSistemaPadrao: string; camposMapeados: string[] };
  porTipoCamera: Record<string, number>;
  porTecnologia: Record<string, number>;
  porServidor: Record<string, number>;
  instabilidadePorCamera: [string, number][];
  falhasPorArea: [string, number][];
  falhasPorServidor: [string, number][];
  resolucaoPorOperador: [string, number][];
  falhasPorDia: [string, number][];
  timeline: Array<{ id: number; camera: string; area: string; status: string; iniciadoEm: string; encerradoEm?: string; duracao?: number; observacao?: string }>;
  mapaOperacional: Array<{ id: number; numeroCamera: string; servidor: string; area: string; local: string; status: string; tipoCamera: string; tecnologia: string; diasRetencao?: number | null; offlineMinutos: number }>;
  alertas: Array<{ id: number; titulo: string; mensagem: string; minutos: number; slaViolado?: boolean }>;
  alertasAutomaticos?: Array<{ tipo: string; mensagem: string; severidade: string }>;
};

type IndisponibilidadeCamera = {
  id: number;
  iniciadoEm: string;
  encerradoEm?: string;
  duracaoIndisponivel: number;
  tempoIndisponibilidade: string;
  motivo?: string;
  observacao?: string;
  createdAt: string;
  responsavel?: { nome: string } | null;
};

const cameraInicial = {
  numeroCamera: "",
  nomeCamera: "",
  numeroServidor: "",
  tipoSistema: "",
  status: "",
  tecnologia: "",
  tipoCamera: "",
  localInstalado: "",
  areaMonitorada: "",
  infravermelho: "",
  monitoramento: "",
  ultimaManutencao: "",
  observacoesTecnicas: "",
};

const checklistInicial = {
  statusAtual: "Conectada",
  dataInicialGravacao: "",
  dataMaisRecenteGravacao: "",
  retencaoEstimadaTexto: "Retencao atual: informe as datas reais encontradas no Digifort",
  observacoesOperacionais: "",
};

const indisponibilidadeInicial = {
  iniciadoEm: "",
  encerradoEm: "",
  motivo: "",
  observacao: "",
};

type TimelinePonto = {
  timestamp: number;
  data: string;
  retencaoDias?: number;
  metaProjetada?: number;
  falhaRetencao?: number;
  status?: string;
  dataMaisAntiga?: string | null;
  dataMaisRecente?: string | null;
  responsavel?: string;
  observacao?: string | null;
  tipo?: "checklist" | "falha";
};

type TimelineTooltipProps = {
  active?: boolean;
  payload?: Array<{ payload?: TimelinePonto }>;
};

const RETENCAO_MAXIMA_MS = 181 * 24 * 60 * 60 * 1000;

const motivosIndisponibilidade = [
  "Falha de Rede",
  "Falha de Energia",
  "Falha do Equipamento",
  "Manutenção Programada",
  "Manutenção Corretiva",
  "Falha de Servidor",
  "Outro",
];

function minutos(min: number) {
  if (!min) return "0 min";
  const dias = Math.floor(min / 1440);
  const horas = Math.floor((min % 1440) / 60);
  const minutosRestantes = min % 60;
  const partes = [];
  if (dias) partes.push(`${dias}d`);
  if (horas) partes.push(`${horas}h`);
  if (!dias && minutosRestantes) partes.push(`${minutosRestantes}min`);
  return partes.join(" ") || "0 min";
}

function minutosEntreDatas(inicio: string, fim?: string) {
  if (!inicio) return 0;
  const dataInicio = new Date(inicio);
  const dataFim = fim ? new Date(fim) : new Date();
  if (Number.isNaN(dataInicio.getTime()) || Number.isNaN(dataFim.getTime())) return 0;
  return Math.max(0, Math.round((dataFim.getTime() - dataInicio.getTime()) / 60000));
}

function paraDatetimeLocal(valor?: string | null) {
  if (!valor) return "";
  const data = new Date(valor);
  return dataParaDatetimeLocal(data);
}

function dataParaDatetimeLocal(data: Date) {
  if (Number.isNaN(data.getTime())) return "";
  const offset = data.getTimezoneOffset() * 60000;
  return new Date(data.getTime() - offset).toISOString().slice(0, 16);
}

function dataAntigaOperacional(valor?: string | null, status?: string) {
  if (!valor) return "";
  const dataReal = new Date(valor);
  if (Number.isNaN(dataReal.getTime())) return "";
  if (status !== "Conectada") return dataParaDatetimeLocal(dataReal);

  const limiteJanela = new Date(Date.now() - RETENCAO_MAXIMA_MS);
  return dataParaDatetimeLocal(dataReal > limiteJanela ? dataReal : limiteJanela);
}

function formatarRetencao(minutosTotais: number) {
  const minutosAjustados = Math.max(0, Math.round(minutosTotais));
  const dias = Math.floor(minutosAjustados / 1440);
  const horas = Math.floor((minutosAjustados % 1440) / 60);
  const minutosRestantes = minutosAjustados % 60;
  return `${dias} dias, ${String(horas).padStart(2, "0")} horas e ${String(minutosRestantes).padStart(2, "0")} minutos`;
}

function formatarDataHora(valor?: string | number | null) {
  if (!valor) return "Nao informado";
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return "Nao informado";
  return data.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatarEixoTemporal(valor: number) {
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return "";
  return data.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function calcularRetencaoChecklist(_camera: CameraItem | null, dados: typeof checklistInicial) {
  if (!dados.dataInicialGravacao) {
    return "informe a data e hora mais antiga encontrada no Digifort";
  }
  if (dados.statusAtual === "Desconectada" && !dados.dataMaisRecenteGravacao) {
    return "informe a data e hora da última gravação antes da desconexão";
  }
  return formatarRetencao(minutosEntreDatas(dados.dataInicialGravacao, dados.dataMaisRecenteGravacao || undefined));
}

function Barra({ nome, valor, maximo, cor = "bg-cyan-400" }: { nome: string; valor: number; maximo: number; cor?: string }) {
  return (
    <div>
      <div className="mb-1 flex justify-between gap-3 text-xs text-slate-300">
        <span className="truncate">{nome}</span>
        <strong>{valor}</strong>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-800">
        <div className={`h-full rounded-full ${cor}`} style={{ width: `${Math.max((valor / Math.max(maximo, 1)) * 100, valor ? 8 : 0)}%` }} />
      </div>
    </div>
  );
}

function CardSoc({ titulo, valor, subtitulo, icon: Icon, tom }: { titulo: string; valor: string | number; subtitulo: string; icon: typeof Camera; tom: string }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5 shadow-xl shadow-slate-950/20">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-slate-400">{titulo}</p>
          <p className={`mt-3 text-3xl font-black ${tom}`}>{valor}</p>
        </div>
        <div className="rounded-xl bg-slate-900 p-3 text-slate-200">
          <Icon size={22} />
        </div>
      </div>
      <p className="mt-3 text-xs text-slate-500">{subtitulo}</p>
    </div>
  );
}

function CampoChecklist({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="space-y-2 text-sm font-bold text-slate-700 dark:text-slate-200">
      <span>{label}</span>
      {children}
    </label>
  );
}

export default function Cameras() {
  const [cameras, setCameras] = useState<CameraItem[]>([]);
  const [dashboard, setDashboard] = useState<DashboardCameras | null>(null);
  const [formAberto, setFormAberto] = useState(false);
  const [cameraEditando, setCameraEditando] = useState<CameraItem | null>(null);
  const [cameraChecklist, setCameraChecklist] = useState<CameraItem | null>(null);
  const [cameraHistorico, setCameraHistorico] = useState<CameraItem | null>(null);
  const [cameraTimeline, setCameraTimeline] = useState<CameraItem | null>(null);
  const [buscaCamera, setBuscaCamera] = useState("");
  const [statusFiltroCamera, setStatusFiltroCamera] = useState("");
  const [camerasSelecionadas, setCamerasSelecionadas] = useState<number[]>([]);
  const [pdfLightbox, setPdfLightbox] = useState<{ url: string; titulo: string; nomeArquivo: string } | null>(null);
  const [indisponibilidades, setIndisponibilidades] = useState<IndisponibilidadeCamera[]>([]);
  const [timelineChecklists, setTimelineChecklists] = useState<CameraChecklistHistorico[]>([]);
  const [timelineIndisponibilidades, setTimelineIndisponibilidades] = useState<IndisponibilidadeCamera[]>([]);
  const [timelineAgora, setTimelineAgora] = useState(0);
  const [carregandoTimeline, setCarregandoTimeline] = useState(false);
  const [formIndisponibilidade, setFormIndisponibilidade] = useState(indisponibilidadeInicial);
  const [indisponibilidadeEditando, setIndisponibilidadeEditando] = useState<IndisponibilidadeCamera | null>(null);
  const [formIndisponibilidadeAberto, setFormIndisponibilidadeAberto] = useState(false);
  const [form, setForm] = useState(cameraInicial);
  const [checklist, setChecklist] = useState(checklistInicial);

  async function carregar() {
    const [camerasResponse, dashboardResponse] = await Promise.all([
      api.get("/cameras"),
      api.get("/cameras/dashboard"),
    ]);
    setCameras(camerasResponse.data);
    setDashboard(dashboardResponse.data);
  }

  useEffect(() => {
    carregar();
    const intervalo = window.setInterval(carregar, 30000);
    return () => window.clearInterval(intervalo);
  }, []);

  const maxFalhas = useMemo(() => Math.max(...(dashboard?.instabilidadePorCamera || []).map(([, valor]) => valor), 1), [dashboard]);
  const maxAreas = useMemo(() => Math.max(...(dashboard?.falhasPorArea || []).map(([, valor]) => valor), 1), [dashboard]);
  const camerasFiltradas = useMemo(() => {
    const busca = buscaCamera.trim().toLocaleLowerCase("pt-BR");
    return cameras.filter((camera) => {
      const texto = `${camera.numeroCamera} ${camera.nomeCamera || ""}`.toLocaleLowerCase("pt-BR");
      return (!busca || texto.includes(busca)) && (!statusFiltroCamera || camera.status === statusFiltroCamera);
    });
  }, [buscaCamera, cameras, statusFiltroCamera]);
  const todasFiltradasSelecionadas = camerasFiltradas.length > 0 && camerasFiltradas.every((camera) => camerasSelecionadas.includes(camera.id));
  const faixasIndisponibilidade = useMemo(() => {
    return timelineIndisponibilidades
      .map((evento) => {
        const inicio = new Date(evento.iniciadoEm).getTime();
        const fim = evento.encerradoEm ? new Date(evento.encerradoEm).getTime() : timelineAgora;
        return {
          ...evento,
          inicio,
          fim,
        };
      })
      .filter((evento) => Number.isFinite(evento.inicio) && Number.isFinite(evento.fim) && evento.fim >= evento.inicio);
  }, [timelineAgora, timelineIndisponibilidades]);
  const pontosChecklistTimeline = useMemo<TimelinePonto[]>(() => {
    const ordenados = [...timelineChecklists].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    const primeiraDataAntiga = ordenados
      .map((item) => item.dataInicialGravacao ? new Date(item.dataInicialGravacao).getTime() : Number.POSITIVE_INFINITY)
      .filter(Number.isFinite)
      .sort((a, b) => a - b)[0];

    return ordenados
      .map((item) => {
        const timestamp = new Date(item.createdAt).getTime();
        const minutosRetencao = item.retencaoEstimadaMinutos ?? item.tempoGravacaoDisponivel * 1440;
        const dataReferencia = item.dataMaisRecenteGravacao ? new Date(item.dataMaisRecenteGravacao).getTime() : timestamp;
        const metaProjetada = Number.isFinite(primeiraDataAntiga)
          ? Math.min(181, Math.max(0, (dataReferencia - primeiraDataAntiga) / 86400000))
          : Math.min(181, Math.max(0, minutosRetencao / 1440));

        return {
          timestamp,
          data: formatarDataHora(timestamp),
          retencaoDias: Number((Math.max(0, minutosRetencao) / 1440).toFixed(2)),
          metaProjetada: Number(metaProjetada.toFixed(2)),
          status: item.statusAtual || "Nao informado",
          dataMaisAntiga: item.dataInicialGravacao,
          dataMaisRecente: item.dataMaisRecenteGravacao,
          responsavel: item.responsavel?.apelido || item.responsavel?.nome,
          observacao: item.observacoesOperacionais,
          tipo: "checklist" as const,
        };
      })
      .filter((item) => Number.isFinite(item.timestamp) && Number.isFinite(item.retencaoDias));
  }, [timelineChecklists]);
  const pontosTimeline = useMemo<TimelinePonto[]>(() => {
    const pontosFalha = faixasIndisponibilidade.flatMap((evento) => {
      const pontoAnterior = [...pontosChecklistTimeline].reverse().find((ponto) => ponto.timestamp <= evento.inicio) || pontosChecklistTimeline[0];
      const retencaoFalha = pontoAnterior?.retencaoDias ?? null;
      if (retencaoFalha === null || retencaoFalha === undefined) return [];

      return [
        {
          timestamp: evento.inicio,
          data: formatarDataHora(evento.inicio),
          falhaRetencao: retencaoFalha,
          status: "Sem gravacao",
          observacao: evento.motivo || evento.observacao,
          tipo: "falha" as const,
        },
        {
          timestamp: evento.fim,
          data: formatarDataHora(evento.fim),
          falhaRetencao: retencaoFalha,
          status: "Sem gravacao",
          observacao: evento.motivo || evento.observacao,
          tipo: "falha" as const,
        },
      ];
    });

    return [...pontosChecklistTimeline, ...pontosFalha].sort((a, b) => a.timestamp - b.timestamp);
  }, [faixasIndisponibilidade, pontosChecklistTimeline]);
  const blocosDisponibilidade = useMemo(() => {
    if (!pontosChecklistTimeline.length) return [];
    const inicio = pontosChecklistTimeline[0].timestamp;
    const fim = pontosChecklistTimeline[pontosChecklistTimeline.length - 1].timestamp;
    const total = Math.max(fim - inicio, 1);
    const blocos = 48;
    return Array.from({ length: blocos }, (_, index) => {
      const blocoInicio = inicio + (total / blocos) * index;
      const blocoFim = inicio + (total / blocos) * (index + 1);
      const falha = faixasIndisponibilidade.some((evento) => evento.inicio < blocoFim && evento.fim > blocoInicio);
      return { index, falha };
    });
  }, [faixasIndisponibilidade, pontosChecklistTimeline]);
  const resumoTimeline = useMemo(() => {
    const retencoes = pontosChecklistTimeline.map((ponto) => ponto.retencaoDias).filter((valor): valor is number => typeof valor === "number");
    const atual = retencoes.length ? retencoes[retencoes.length - 1] : null;
    const menor = retencoes.length ? Math.min(...retencoes) : null;
    const metaAtual = pontosChecklistTimeline.length ? pontosChecklistTimeline[pontosChecklistTimeline.length - 1].metaProjetada ?? null : null;
    const totalIndisponivel = timelineIndisponibilidades.reduce((total, item) => total + (item.duracaoIndisponivel || 0), 0);
    return {
      atual,
      menor,
      metaAtual,
      falhas: timelineIndisponibilidades.length,
      indisponibilidade: totalIndisponivel,
    };
  }, [pontosChecklistTimeline, timelineIndisponibilidades]);

  function campo(nome: string, valor: string) {
    setForm((atual) => ({ ...atual, [nome]: valor }));
  }

  function campoChecklist(nome: string, valor: string) {
    setChecklist((atual) => {
      const novo = { ...atual, [nome]: valor };
      return {
        ...novo,
        retencaoEstimadaTexto: `Retenção atual: ${calcularRetencaoChecklist(cameraChecklist, novo)}`,
      };
    });
  }

  function campoIndisponibilidade(nome: string, valor: string) {
    setFormIndisponibilidade((atual) => ({ ...atual, [nome]: valor }));
  }

  useEffect(() => {
    if (!cameraChecklist) return;
    const intervalo = window.setInterval(() => {
      setChecklist((atual) => ({
        ...atual,
        retencaoEstimadaTexto: `Retenção atual: ${calcularRetencaoChecklist(cameraChecklist, atual)}`,
      }));
    }, 60000);
    return () => window.clearInterval(intervalo);
  }, [cameraChecklist]);

  function novaCamera() {
    setCameraEditando(null);
    setForm(cameraInicial);
    setFormAberto(true);
    setTimeout(() => document.getElementById("form-camera")?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  }

  function editarCamera(camera: CameraItem) {
    setCameraEditando(camera);
    setForm({
      numeroCamera: String(camera.numeroCamera),
      nomeCamera: camera.nomeCamera || "",
      numeroServidor: String(camera.numeroServidor),
      tipoSistema: camera.tipoSistema,
      status: camera.status,
      tecnologia: camera.tecnologia,
      tipoCamera: camera.tipoCamera,
      localInstalado: camera.localInstalado,
      areaMonitorada: camera.areaMonitorada,
      infravermelho: camera.infravermelho,
      monitoramento: camera.monitoramento,
      ultimaManutencao: camera.ultimaManutencao?.slice(0, 10) || "",
      observacoesTecnicas: camera.observacoesTecnicas || "",
    });
    setFormAberto(true);
    setTimeout(() => document.getElementById("form-camera")?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  }

  async function salvarCamera(e: React.FormEvent) {
    e.preventDefault();
    if (cameraEditando) {
      await api.put(`/cameras/${cameraEditando.id}`, form);
    } else {
      await api.post("/cameras", form);
    }
    setFormAberto(false);
    setCameraEditando(null);
    setForm(cameraInicial);
    await carregar();
  }

  async function excluirCamera(camera: CameraItem) {
    const confirmar = window.confirm(
      `Deseja realmente excluir a câmera ${camera.numeroCamera}?\n\nEssa ação também removerá o histórico de checklists e eventos desta câmera.`
    );
    if (!confirmar) return;

    await api.delete(`/cameras/${camera.id}`);
    await carregar();
  }
  void excluirCamera;

  async function removerCamera(camera: CameraItem) {
    const motivo = window.prompt(
      `Informe o motivo para remover/inativar a câmera ${camera.numeroCamera}:`,
      "Remoção operacional"
    );
    if (!motivo) return;

    await api.delete(`/cameras/${camera.id}`, { data: { motivo } });
    await carregar();
    alert("Câmera marcada como removida/inativa. O histórico foi preservado.");
  }

  async function excluirCameraDefinitivo(camera: CameraItem) {
    const confirmar = window.confirm(
      `Deseja realmente excluir definitivamente a câmera ${camera.numeroCamera}?\n\nEssa ação é permitida somente para Super Admin e remove o histórico de checklists e eventos.`
    );
    if (!confirmar) return;

    await api.delete(`/cameras/${camera.id}?permanente=true`);
    await carregar();
  }

  function abrirChecklist(camera: CameraItem) {
    const ultimoChecklist = camera.checklists?.[0];
    const proximoChecklist = {
      ...checklistInicial,
      statusAtual: camera.status,
      dataInicialGravacao: dataAntigaOperacional(ultimoChecklist?.dataInicialGravacao, camera.status),
      dataMaisRecenteGravacao: camera.status === "Desconectada" ? paraDatetimeLocal(ultimoChecklist?.dataMaisRecenteGravacao) : "",
    };

    setCameraChecklist(camera);
    setChecklist({
      ...proximoChecklist,
      retencaoEstimadaTexto: `Retencao atual: ${calcularRetencaoChecklist(camera, proximoChecklist)}`,
    });
  }

  async function abrirHistoricoIndisponibilidade(camera: CameraItem) {
    setCameraHistorico(camera);
    setFormIndisponibilidade(indisponibilidadeInicial);
    setIndisponibilidadeEditando(null);
    setFormIndisponibilidadeAberto(false);
    const response = await api.get(`/cameras/${camera.id}/indisponibilidades`);
    setIndisponibilidades(response.data);
  }

  async function abrirTimelineRetencao(camera: CameraItem) {
    setCameraTimeline(camera);
    setTimelineChecklists([]);
    setTimelineIndisponibilidades([]);
    setTimelineAgora(new Date().getTime());
    setCarregandoTimeline(true);
    try {
      const [checklistsResponse, indisponibilidadesResponse] = await Promise.all([
        api.get(`/cameras/${camera.id}/checklists`),
        api.get(`/cameras/${camera.id}/indisponibilidades`),
      ]);
      setTimelineChecklists(checklistsResponse.data);
      setTimelineIndisponibilidades(indisponibilidadesResponse.data);
    } finally {
      setCarregandoTimeline(false);
    }
  }

  function editarIndisponibilidade(registro: IndisponibilidadeCamera) {
    setIndisponibilidadeEditando(registro);
    setFormIndisponibilidade({
      iniciadoEm: registro.iniciadoEm ? registro.iniciadoEm.slice(0, 16) : "",
      encerradoEm: registro.encerradoEm ? registro.encerradoEm.slice(0, 16) : "",
      motivo: registro.motivo || "",
      observacao: registro.observacao || "",
    });
    setFormIndisponibilidadeAberto(true);
  }

  async function salvarIndisponibilidade(e: React.FormEvent) {
    e.preventDefault();
    if (!cameraHistorico) return;

    const inicio = formIndisponibilidade.iniciadoEm ? new Date(formIndisponibilidade.iniciadoEm) : null;
    const fim = formIndisponibilidade.encerradoEm ? new Date(formIndisponibilidade.encerradoEm) : null;

    if (inicio && fim && inicio > fim) {
      alert("A data/hora inicial da indisponibilidade não pode ser maior que a data/hora final.");
      return;
    }

    if (indisponibilidadeEditando) {
      await api.put(`/cameras/${cameraHistorico.id}/indisponibilidades/${indisponibilidadeEditando.id}`, formIndisponibilidade);
    } else {
      await api.post(`/cameras/${cameraHistorico.id}/indisponibilidades`, formIndisponibilidade);
    }
    const response = await api.get(`/cameras/${cameraHistorico.id}/indisponibilidades`);
    setIndisponibilidades(response.data);
    setFormIndisponibilidade(indisponibilidadeInicial);
    setIndisponibilidadeEditando(null);
    setFormIndisponibilidadeAberto(false);
    await carregar();
  }

  async function salvarChecklist(e: React.FormEvent) {
    e.preventDefault();
    if (!cameraChecklist) return;

    const dataAntiga = checklist.dataInicialGravacao ? new Date(checklist.dataInicialGravacao) : null;
    const dataRecente = checklist.dataMaisRecenteGravacao
      ? new Date(checklist.dataMaisRecenteGravacao)
      : new Date();

    if (dataAntiga && dataAntiga > dataRecente) {
      alert("A data mais antiga encontrada no Digifort não pode ser maior que a data mais recente.");
      return;
    }

    await api.post(`/cameras/${cameraChecklist.id}/checklists`, checklist);
    setCameraChecklist(null);
    setChecklist(checklistInicial);
    await carregar();
  }

  async function exportar(tipo: "inventario" | "historico") {
    const response = await api.get(`/cameras/exportar/${tipo}`, { responseType: "blob" });
    const url = URL.createObjectURL(response.data);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${tipo}-cameras.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function alternarCameraSelecionada(cameraId: number) {
    setCamerasSelecionadas((atuais) =>
      atuais.includes(cameraId) ? atuais.filter((id) => id !== cameraId) : [...atuais, cameraId]
    );
  }

  function alternarTodasFiltradas() {
    const idsFiltrados = camerasFiltradas.map((camera) => camera.id);
    setCamerasSelecionadas((atuais) => {
      if (idsFiltrados.every((id) => atuais.includes(id))) {
        return atuais.filter((id) => !idsFiltrados.includes(id));
      }
      return Array.from(new Set([...atuais, ...idsFiltrados]));
    });
  }

  async function gerarRelatorioDisponibilidade() {
    if (camerasSelecionadas.length === 0) {
      alert("Selecione ao menos uma câmera para gerar o relatório.");
      return;
    }
    const pinOperacional = await solicitarPinOperacional("Informe seu PIN para assinar e emitir o relatório técnico CFTV.");
    if (!pinOperacional) return;
    const response = await api.post(
      "/cameras/relatorio-disponibilidade/pdf",
      { cameraIds: camerasSelecionadas, pinOperacional },
      { responseType: "blob" }
    );
    const url = URL.createObjectURL(new Blob([response.data], { type: "application/pdf" }));
    setPdfLightbox({
      url,
      titulo: "Relatório Técnico CFTV",
      nomeArquivo: `relatorio-tecnico-cftv-${new Date().toISOString().slice(0, 10)}.pdf`,
    });
  }

  function fecharPdfLightbox() {
    if (pdfLightbox?.url) URL.revokeObjectURL(pdfLightbox.url);
    setPdfLightbox(null);
  }

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-950 text-white shadow-2xl">
        <div className="border-b border-slate-800 bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.26),transparent_34%),linear-gradient(135deg,#020617,#0f172a)] p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-cyan-300">
                <Radio size={16} /> Centro de Operações CFTV
              </p>
              <h1 className="mt-3 text-2xl font-black tracking-normal sm:text-3xl">Gestão e Monitoramento de Câmeras</h1>
              <p className="mt-2 max-w-3xl text-sm text-slate-300">
                Monitoramento operacional por unidade, status em tempo real, checklist semanal, indisponibilidade e indicadores SOC.
              </p>
            </div>
            {podeAnalisar() && (
              <div className="flex flex-wrap gap-3">
                <button onClick={() => exportar("inventario")} className="rounded-xl border border-cyan-400/40 px-4 py-2 text-sm font-bold text-cyan-100 transition hover:bg-cyan-400/10">
                  Exportar Inventário
                </button>
                <button onClick={() => exportar("historico")} className="rounded-xl border border-cyan-400/40 px-4 py-2 text-sm font-bold text-cyan-100 transition hover:bg-cyan-400/10">
                  Exportar Histórico
                </button>
                <button onClick={novaCamera} className="rounded-xl bg-cyan-400 px-4 py-2 text-sm font-bold text-slate-950 shadow-lg shadow-cyan-950/30 transition hover:-translate-y-0.5 hover:bg-cyan-300">
                  Nova Câmera
                </button>
              </div>
            )}
          </div>
        </div>

        {dashboard && (
          <div className="space-y-6 p-5 sm:p-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <CardSoc titulo="Câmeras cadastradas" valor={dashboard.total} subtitulo="Inventário ativo da unidade" icon={Camera} tom="text-white" />
              <CardSoc titulo="Online" valor={dashboard.online} subtitulo={`${dashboard.disponibilidade}% de disponibilidade`} icon={Wifi} tom="text-emerald-300" />
              <CardSoc titulo="Offline" valor={dashboard.offline} subtitulo={`${dashboard.indisponibilidade}% indisponível`} icon={WifiOff} tom="text-red-300" />
              <CardSoc titulo="SLA operacional" valor={`${dashboard.sla}%`} subtitulo={`${dashboard.indicadorSla} | meta ${dashboard.metaSla || 98}%`} icon={ShieldCheck} tom={dashboard.sla >= (dashboard.metaSla || 98) ? "text-emerald-300" : dashboard.sla >= 90 ? "text-amber-300" : "text-red-300"} />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
              <CardSoc titulo="Retencao media" valor={`${dashboard.retencaoMedia || 0} dias`} subtitulo="Media real pelo Digifort" icon={ShieldCheck} tom="text-cyan-300" />
              <CardSoc titulo="Em conformidade" valor={dashboard.camerasConformidade || 0} subtitulo="Retencao acima de 180 dias" icon={Wifi} tom="text-emerald-300" />
              <CardSoc titulo="Em atencao" valor={dashboard.camerasAtencao || 0} subtitulo="Retencao entre 150 e 179 dias" icon={AlertTriangle} tom="text-amber-300" />
              <CardSoc titulo="Criticas" valor={dashboard.camerasCriticas || 0} subtitulo="Retencao abaixo de 150 dias" icon={AlertTriangle} tom="text-red-300" />
              <CardSoc titulo="Sem gravacao" valor={dashboard.camerasDesconectadas || 0} subtitulo="Cameras desconectadas agora" icon={WifiOff} tom="text-red-300" />
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5 lg:col-span-2">
                <div className="flex items-center justify-between">
                  <h2 className="font-bold text-slate-100">Mapa operacional das áreas monitoradas</h2>
                  <span className="text-xs text-slate-500">Atualização dinâmica</span>
                </div>
                <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {dashboard.mapaOperacional.map((item) => (
                    <button key={item.id} onClick={() => editarCamera(cameras.find((c) => c.id === item.id)!)} className={`rounded-2xl border p-4 text-left transition hover:-translate-y-0.5 ${item.status === "Conectada" ? "border-emerald-500/30 bg-emerald-500/10" : "border-red-500/40 bg-red-500/10"}`}>
                      <div className="flex items-center justify-between">
                        <strong>Câmera {item.numeroCamera}</strong>
                        <span className={`h-3 w-3 rounded-full ${item.status === "Conectada" ? "bg-emerald-400 shadow-[0_0_18px_rgba(52,211,153,.75)]" : "bg-red-400 shadow-[0_0_18px_rgba(248,113,113,.75)]"}`} />
                      </div>
                      <p className="mt-2 text-sm text-slate-300">{item.area}</p>
                      <p className="text-xs text-slate-500">{item.local} | Servidor {item.servidor}</p>
                      {item.offlineMinutos > 0 && <p className="mt-2 text-xs font-bold text-red-300">Offline há {minutos(item.offlineMinutos)}</p>}
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5">
                <h2 className="flex items-center gap-2 font-bold text-slate-100"><AlertTriangle size={18} /> Alertas ativos</h2>
                <div className="mt-4 space-y-3">
                  {dashboard.alertas.length === 0 ? (
                    <p className="rounded-xl bg-emerald-500/10 p-4 text-sm text-emerald-200">Nenhuma câmera desconectada neste momento.</p>
                  ) : (
                    dashboard.alertas.map((alerta) => (
                      <div key={alerta.id} className="rounded-xl border border-red-500/30 bg-red-500/10 p-4">
                        <p className="font-bold text-red-200">{alerta.titulo}</p>
                        <p className="text-sm text-slate-300">{alerta.mensagem}</p>
                        <p className="mt-1 text-xs text-red-300">Indisponível há {minutos(alerta.minutos)} {alerta.slaViolado ? "| SLA violado" : ""}</p>
                      </div>
                    ))
                  )}
                  {(dashboard.alertasAutomaticos || []).map((alerta, index) => (
                    <div key={`${alerta.tipo}-${index}`} className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
                      <p className="font-bold text-amber-200">{alerta.tipo}</p>
                      <p className="text-sm text-slate-300">{alerta.mensagem}</p>
                      <p className="mt-1 text-xs text-amber-300">{alerta.severidade}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-4">
              <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5">
                <p className="text-sm text-slate-400">Tempo médio de solução</p>
                <p className="mt-3 text-3xl font-black text-cyan-300">{minutos(dashboard.mediaSolucao)}</p>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5">
                <p className="text-sm text-slate-400">Média offline por câmera</p>
                <p className="mt-3 text-3xl font-black text-amber-300">{minutos(dashboard.mediaOfflinePorCamera)}</p>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5">
                <p className="text-sm text-slate-400">Indisponibilidade histórica</p>
                <p className="mt-3 text-3xl font-black text-red-300">{minutos(dashboard.totalOfflineHistorico)}</p>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5">
                <p className="text-sm text-slate-400">Checklists recentes</p>
                <p className="mt-3 text-3xl font-black text-emerald-300">{dashboard.timeline.length}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <div className="space-y-4 rounded-2xl border border-slate-800 bg-slate-950 p-5">
                <h2 className="font-bold text-slate-100">Ranking de instabilidade</h2>
                {dashboard.instabilidadePorCamera.map(([nome, valor]) => <Barra key={nome} nome={nome} valor={valor} maximo={maxFalhas} cor="bg-red-400" />)}
              </div>
              <div className="space-y-4 rounded-2xl border border-slate-800 bg-slate-950 p-5">
                <h2 className="font-bold text-slate-100">Áreas mais críticas</h2>
                {dashboard.falhasPorArea.map(([nome, valor]) => <Barra key={nome} nome={nome} valor={valor} maximo={maxAreas} cor="bg-amber-400" />)}
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5">
                <h2 className="font-bold text-slate-100">Comparativos técnicos</h2>
                <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  {Object.entries(dashboard.porTipoCamera).map(([nome, valor]) => <div key={nome} className="rounded-xl bg-slate-900 p-3"><p className="text-slate-400">{nome}</p><strong>{valor}</strong></div>)}
                  {Object.entries(dashboard.porTecnologia).map(([nome, valor]) => <div key={nome} className="rounded-xl bg-slate-900 p-3"><p className="text-slate-400">{nome}</p><strong>{valor}</strong></div>)}
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5">
              <h2 className="font-bold text-slate-100">10 cameras com menor retencao real</h2>
              <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
                {dashboard.menorRetencao.length === 0 ? (
                  <p className="text-sm text-slate-500">Nenhum checklist de retencao registrado.</p>
                ) : dashboard.menorRetencao.map((item) => (
                  <div key={item.id} className="rounded-xl border border-slate-800 bg-slate-900 p-3">
                    <p className="text-sm font-bold text-slate-100">Camera {item.numeroCamera}</p>
                    <p className="mt-1 text-2xl font-black text-amber-300">{item.diasRetencao} dias</p>
                    <p className="text-xs text-slate-400">{item.area} | Servidor {item.servidor}</p>
                  </div>
                ))}
              </div>
            </div>

            {dashboard.digifort && (
              <div className="rounded-2xl border border-cyan-500/30 bg-cyan-500/10 p-5">
                <h2 className="font-bold text-cyan-100">Preparação para integração Digifort</h2>
                <p className="mt-2 text-sm text-slate-300">{dashboard.digifort.statusIntegracao} | Sistema padrão: {dashboard.digifort.tipoSistemaPadrao}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {dashboard.digifort.camposMapeados.map((campo) => (
                    <span key={campo} className="rounded-full bg-slate-950 px-3 py-1 text-xs font-bold text-cyan-100">{campo}</span>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5">
                <h2 className="font-bold text-slate-100">Histórico gráfico de falhas</h2>
                <div className="mt-6 flex h-52 items-end gap-3 overflow-x-auto">
                  {dashboard.falhasPorDia.length === 0 ? <p className="self-start text-sm text-slate-500">Sem falhas registradas.</p> : dashboard.falhasPorDia.map(([dia, valor]) => (
                    <div key={dia} className="flex min-w-14 flex-col items-center gap-2">
                      <div className="w-8 rounded-t bg-cyan-400" style={{ height: `${Math.max(valor * 28, 8)}px` }} />
                      <span className="text-[10px] text-slate-500">{dia.slice(5)}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5">
                <h2 className="font-bold text-slate-100">Timeline operacional</h2>
                <div className="mt-4 max-h-64 space-y-3 overflow-auto pr-2">
                  {dashboard.timeline.map((evento) => (
                    <div key={evento.id} className="rounded-xl border border-slate-800 bg-slate-900 p-3">
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-bold">Câmera {evento.camera} | {evento.status}</p>
                        <span className="text-xs text-slate-500">{new Date(evento.iniciadoEm).toLocaleString("pt-BR")}</span>
                      </div>
                      <p className="text-sm text-slate-400">{evento.area} {evento.duracao ? `| ${minutos(evento.duracao)}` : ""}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </section>

      {formAberto && (
        <form id="form-camera" onSubmit={salvarCamera} className="rounded-2xl bg-white p-5 shadow">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold text-slate-900">{cameraEditando ? "Editar câmera" : "Cadastrar câmera"}</h2>
              <p className="text-sm text-slate-500">Inventário individual por unidade operacional.</p>
            </div>
            <button type="button" onClick={() => setFormAberto(false)} className="rounded-lg bg-slate-100 px-3 py-2">Fechar</button>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <input className="rounded-lg border p-3" placeholder="Nº da câmera. Ex: CF001" value={form.numeroCamera} onChange={(e) => campo("numeroCamera", e.target.value.toUpperCase())} required />
            <input className="rounded-lg border p-3" placeholder="Nome da camera. Ex: Gate 1 - Entrada" value={form.nomeCamera} onChange={(e) => campo("nomeCamera", e.target.value)} />
            <input className="rounded-lg border p-3" placeholder="Nº do servidor. Ex: SJJ-1" value={form.numeroServidor} onChange={(e) => campo("numeroServidor", e.target.value.toUpperCase())} required />
            <select className="rounded-lg border p-3" value={form.tipoSistema} onChange={(e) => campo("tipoSistema", e.target.value)} required>
              <option value="">Selecione o tipo de sistema</option>
              <option>DIGIFORT</option>
            </select>
            <select className="rounded-lg border p-3" value={form.status} onChange={(e) => campo("status", e.target.value)} required>
              <option value="">Selecione o status atual</option>
              <option>Conectada</option>
              <option>Desconectada</option>
            </select>
            <select className="rounded-lg border p-3" value={form.tecnologia} onChange={(e) => campo("tecnologia", e.target.value)} required>
              <option value="">Selecione a tecnologia</option>
              <option>Analógica</option>
              <option>Digital</option>
            </select>
            <select className="rounded-lg border p-3" value={form.tipoCamera} onChange={(e) => campo("tipoCamera", e.target.value)} required>
              <option value="">Selecione o tipo da câmera</option>
              <option>Speed Dome</option>
              <option>Fixa</option>
              <option>Bullet</option>
              <option>PTZ</option>
            </select>
            <input className="rounded-lg border p-3" placeholder="Local instalado" value={form.localInstalado} onChange={(e) => campo("localInstalado", e.target.value)} required />
            <input className="rounded-lg border p-3" placeholder="Área monitorada" value={form.areaMonitorada} onChange={(e) => campo("areaMonitorada", e.target.value)} required />
            <select className="rounded-lg border p-3" value={form.infravermelho} onChange={(e) => campo("infravermelho", e.target.value)} required>
              <option value="">Possui infravermelho?</option>
              <option>Sim</option>
              <option>Não</option>
            </select>
            <select className="rounded-lg border p-3" value={form.monitoramento} onChange={(e) => campo("monitoramento", e.target.value)} required>
              <option value="">Selecione o monitoramento</option>
              <option>Ativo</option>
              <option>Inativo</option>
            </select>
            <label className="space-y-2 text-sm font-bold text-slate-700">
              <span>Última manutenção da câmera</span>
              <input type="date" className="w-full rounded-lg border p-3" value={form.ultimaManutencao} onChange={(e) => campo("ultimaManutencao", e.target.value)} />
            </label>
            <textarea className="rounded-lg border p-3 md:col-span-3" placeholder="Observações técnicas" value={form.observacoesTecnicas} onChange={(e) => campo("observacoesTecnicas", e.target.value)} />
          </div>
          <button className="mt-5 rounded-lg bg-blue-600 px-5 py-3 font-bold text-white">Salvar câmera</button>
        </form>
      )}

      <section className="rounded-2xl bg-white p-5 shadow">
        <div className="mb-5 flex flex-col justify-between gap-3 lg:flex-row lg:items-center">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Inventário operacional</h2>
            <p className="text-sm text-slate-500">Cadastro, atualização de status e checklist semanal obrigatório.</p>
          </div>
          <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-[minmax(220px,320px)_180px] lg:w-auto">
            <input
              className="rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              placeholder="Buscar por número ou nome"
              value={buscaCamera}
              onChange={(e) => setBuscaCamera(e.target.value)}
            />
            <select
              className="rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              value={statusFiltroCamera}
              onChange={(e) => setStatusFiltroCamera(e.target.value)}
            >
              <option value="">Todos os status</option>
              <option value="Conectada">Conectada</option>
              <option value="Desconectada">Desconectada</option>
            </select>
          </div>
        </div>
        <div className="mb-4 flex flex-col justify-between gap-3 rounded-2xl border border-blue-100 bg-blue-50 p-4 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm font-bold text-blue-900">Relatório Técnico CFTV</p>
            <p className="text-xs text-blue-700">
              Selecione câmeras filtradas ou específicas para emitir um PDF com status, retenção e histórico de conexão/desconexão.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={alternarTodasFiltradas} className="rounded-xl bg-white px-4 py-2 text-sm font-bold text-blue-700 shadow-sm hover:bg-blue-100">
              {todasFiltradasSelecionadas ? "Limpar filtradas" : "Selecionar filtradas"}
            </button>
            <button
              type="button"
              onClick={gerarRelatorioDisponibilidade}
              disabled={camerasSelecionadas.length === 0}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <FileText size={16} />
              Gerar relatório ({camerasSelecionadas.length})
            </button>
          </div>
        </div>
        <div className="max-h-[640px] overflow-auto">
          <table className="w-full min-w-[1040px] text-left text-sm">
            <thead className="sticky top-0 z-10 bg-slate-50 text-slate-500 shadow-sm">
              <tr>
                <th className="p-3">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-blue-600"
                    checked={todasFiltradasSelecionadas}
                    onChange={alternarTodasFiltradas}
                    aria-label="Selecionar todas as câmeras filtradas"
                  />
                </th>
                <th className="p-3">Câmera</th>
                <th className="p-3">Servidor</th>
                <th className="p-3">Status</th>
                <th className="p-3">Tipo</th>
                <th className="p-3">Tecnologia</th>
                <th className="p-3">Área</th>
                <th className="p-3">Dias de gravacao</th>
                <th className="p-3">Falhas</th>
                <th className="p-3">Ações</th>
              </tr>
            </thead>
            <tbody>
              {camerasFiltradas.map((camera) => (
                <tr key={camera.id} className="border-b border-slate-100">
                  <td className="p-3">
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-blue-600"
                      checked={camerasSelecionadas.includes(camera.id)}
                      onChange={() => alternarCameraSelecionada(camera.id)}
                      aria-label={`Selecionar câmera ${camera.numeroCamera}`}
                    />
                  </td>
                  <td className="p-3 font-bold">{camera.numeroCamera}{camera.nomeCamera ? ` - ${camera.nomeCamera}` : ""}</td>
                  <td className="p-3">{camera.numeroServidor}</td>
                  <td className="p-3"><span className={`rounded-full px-3 py-1 text-xs font-bold ${camera.status === "Conectada" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>{camera.status}</span></td>
                  <td className="p-3">{camera.tipoCamera}</td>
                  <td className="p-3">{camera.tecnologia}</td>
                  <td className="p-3">{camera.areaMonitorada}</td>
                  <td className="p-3 font-bold">
                    <div className="flex items-center gap-2">
                      <span>{camera.checklists?.[0]?.tempoGravacaoDisponivel ?? "Sem checklist"}</span>
                      <button
                        type="button"
                        onClick={() => abrirTimelineRetencao(camera)}
                        title="Abrir linha do tempo de retencao e falhas"
                        className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-cyan-200 bg-cyan-50 text-cyan-700 transition hover:border-cyan-400 hover:bg-cyan-100"
                      >
                        <Activity size={12} />
                      </button>
                    </div>
                  </td>
                  <td className="p-3">{camera.totalFalhas}</td>
                  <td className="p-3">
                    <div className="flex flex-wrap gap-2">
                      {podeAnalisar() && <button onClick={() => editarCamera(camera)} className="rounded bg-slate-200 px-3 py-1">Editar</button>}
                      {podeAnalisar() && <button onClick={() => removerCamera(camera)} className="rounded bg-amber-500 px-3 py-1 font-semibold text-slate-950">Remover/Inativar</button>}
                      {podeSuperAdmin() && <button onClick={() => excluirCameraDefinitivo(camera)} className="rounded bg-red-700 px-3 py-1 text-white">Excluir definitivo</button>}
                      <button onClick={() => abrirChecklist(camera)} className="rounded bg-blue-600 px-3 py-1 text-white">Checklist</button>
                      <button onClick={() => abrirHistoricoIndisponibilidade(camera)} className="rounded bg-slate-900 px-3 py-1 text-white">Histórico</button>
                    </div>
                  </td>
                </tr>
              ))}
              {camerasFiltradas.length === 0 && (
                <tr>
                  <td className="p-6 text-center text-slate-500" colSpan={10}>
                    Nenhuma câmera encontrada com os filtros selecionados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {cameraTimeline && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
          <div className="max-h-[92vh] w-full max-w-7xl overflow-auto rounded-3xl border border-slate-800 bg-slate-950 text-white shadow-2xl shadow-slate-950/60">
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-800 bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.22),transparent_36%),linear-gradient(135deg,#020617,#0f172a)] p-6">
              <div>
                <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.22em] text-cyan-300">
                  <Activity size={16} /> Linha do tempo de retencao
                </p>
                <h2 className="mt-3 text-2xl font-black">
                  Retencao de Gravacao - Camera {cameraTimeline.numeroCamera}{cameraTimeline.nomeCamera ? ` - ${cameraTimeline.nomeCamera}` : ""}
                </h2>
                <p className="mt-1 text-sm text-slate-400">
                  {cameraTimeline.areaMonitorada} | {cameraTimeline.localInstalado} | Servidor {cameraTimeline.numeroServidor}
                </p>
                {pontosChecklistTimeline.length > 0 && (
                  <p className="mt-2 text-sm text-slate-300">
                    Periodo: {formatarDataHora(pontosChecklistTimeline[0].dataMaisAntiga || pontosChecklistTimeline[0].timestamp)} ate {formatarDataHora(pontosChecklistTimeline[pontosChecklistTimeline.length - 1].dataMaisRecente || pontosChecklistTimeline[pontosChecklistTimeline.length - 1].timestamp)}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setCameraTimeline(null)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-700 bg-slate-900 text-slate-200 transition hover:border-cyan-400 hover:text-cyan-200"
                aria-label="Fechar grafico temporal"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-5 p-5 sm:p-6">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
                <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/10 p-4">
                  <p className="text-xs text-cyan-200">Retencao efetiva</p>
                  <p className="mt-2 text-2xl font-black text-white">{resumoTimeline.atual === null ? "Sem dados" : `${resumoTimeline.atual.toLocaleString("pt-BR")} dias`}</p>
                </div>
                <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4">
                  <p className="text-xs text-emerald-200">Meta projetada</p>
                  <p className="mt-2 text-2xl font-black text-white">{resumoTimeline.metaAtual === null ? "181 dias" : `${resumoTimeline.metaAtual.toLocaleString("pt-BR")} dias`}</p>
                </div>
                <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4">
                  <p className="text-xs text-amber-200">Menor retencao</p>
                  <p className="mt-2 text-2xl font-black text-white">{resumoTimeline.menor === null ? "Sem dados" : `${resumoTimeline.menor.toLocaleString("pt-BR")} dias`}</p>
                </div>
                <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4">
                  <p className="text-xs text-red-200">Falhas registradas</p>
                  <p className="mt-2 text-2xl font-black text-white">{resumoTimeline.falhas}</p>
                </div>
                <div className="rounded-2xl border border-slate-700 bg-slate-900 p-4">
                  <p className="text-xs text-slate-400">Indisponibilidade acumulada</p>
                  <p className="mt-2 text-2xl font-black text-white">{minutos(resumoTimeline.indisponibilidade)}</p>
                </div>
              </div>

              <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-4">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="font-bold text-slate-100">Retencao efetiva x meta de 181 dias</h3>
                    <p className="text-sm text-slate-400">
                      Linha principal = retencao efetiva. Linha verde = meta projetada. Trecho vermelho = falha de gravacao.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs">
                    <span className="rounded-full bg-cyan-500/15 px-3 py-1 font-bold text-cyan-200">Azul: retencao efetiva</span>
                    <span className="rounded-full bg-emerald-500/15 px-3 py-1 font-bold text-emerald-200">Verde: meta projetada</span>
                    <span className="rounded-full bg-red-500/15 px-3 py-1 font-bold text-red-200">Vermelho: sem gravacao</span>
                  </div>
                </div>

                {carregandoTimeline ? (
                  <div className="flex h-96 items-center justify-center rounded-2xl border border-slate-800 bg-slate-950 text-slate-400">
                    Carregando linha do tempo...
                  </div>
                ) : pontosChecklistTimeline.length === 0 ? (
                  <div className="flex h-96 flex-col items-center justify-center rounded-2xl border border-slate-800 bg-slate-950 text-center text-slate-400">
                    <Activity size={34} className="mb-3 text-slate-600" />
                    <p className="font-bold text-slate-200">Sem checklists para gerar grafico</p>
                    <p className="mt-1 max-w-md text-sm">Registre ao menos um checklist CFTV nesta camera para acompanhar a evolucao da retencao.</p>
                  </div>
                ) : (
                  <div className="h-[430px] rounded-2xl border border-slate-800 bg-slate-950 p-3">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsLineChart data={pontosTimeline} margin={{ top: 14, right: 24, left: 0, bottom: 24 }}>
                        <CartesianGrid stroke="#1e293b" strokeDasharray="4 4" />
                        <XAxis
                          dataKey="timestamp"
                          type="number"
                          domain={["dataMin", "dataMax"]}
                          tickFormatter={formatarEixoTemporal}
                          stroke="#94a3b8"
                          tick={{ fontSize: 11 }}
                        />
                        <YAxis
                          stroke="#94a3b8"
                          tick={{ fontSize: 11 }}
                          tickFormatter={(valor) => `${valor}d`}
                          width={54}
                          allowDecimals
                          domain={[0, 200]}
                        />
                        <Tooltip content={<TooltipTimelineRetencao />} />
                        <ReferenceLine y={181} stroke="#22c55e" strokeDasharray="6 6" strokeOpacity={0.55} label={{ value: "Meta 181 dias", fill: "#86efac", fontSize: 11, position: "insideTopRight" }} />
                        {faixasIndisponibilidade.map((evento) => (
                          <ReferenceArea
                            key={evento.id}
                            x1={evento.inicio}
                            x2={evento.fim}
                            strokeOpacity={0}
                            fill="#ef4444"
                            fillOpacity={0.16}
                          />
                        ))}
                        <Line
                          type="monotone"
                          dataKey="retencaoDias"
                          name="Retencao efetiva"
                          stroke="#0ea5e9"
                          strokeWidth={3}
                          connectNulls
                          dot={{ r: 4, fill: "#0f172a", stroke: "#0ea5e9", strokeWidth: 2 }}
                          activeDot={{ r: 7, fill: "#0ea5e9", stroke: "#e0f2fe", strokeWidth: 2 }}
                        />
                        <Line
                          type="monotone"
                          dataKey="metaProjetada"
                          name="Meta projetada"
                          stroke="#22c55e"
                          strokeWidth={2.5}
                          connectNulls
                          dot={{ r: 3, fill: "#22c55e", stroke: "#0f172a", strokeWidth: 1 }}
                        />
                        <Line
                          type="linear"
                          dataKey="falhaRetencao"
                          name="Falha de gravacao"
                          stroke="#ef4444"
                          strokeWidth={3}
                          strokeDasharray="8 6"
                          connectNulls={false}
                          dot={{ r: 4, fill: "#ef4444", stroke: "#fecaca", strokeWidth: 1 }}
                        />
                        <Brush
                          dataKey="timestamp"
                          height={34}
                          stroke="#38bdf8"
                          fill="#0f172a"
                          travellerWidth={12}
                          tickFormatter={formatarEixoTemporal}
                        />
                      </RechartsLineChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {pontosChecklistTimeline.length > 0 && (
                  <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-950 p-4">
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-3 text-xs font-bold text-slate-300">
                      <span>{formatarDataHora(pontosChecklistTimeline[0].dataMaisAntiga || pontosChecklistTimeline[0].timestamp)}</span>
                      <span>{formatarDataHora(pontosChecklistTimeline[pontosChecklistTimeline.length - 1].dataMaisRecente || pontosChecklistTimeline[pontosChecklistTimeline.length - 1].timestamp)}</span>
                    </div>
                    <div className="flex gap-1">
                      {blocosDisponibilidade.map((bloco) => (
                        <span
                          key={bloco.index}
                          title={bloco.falha ? "Periodo com falha de gravacao" : "Periodo com gravacao operacional"}
                          className={`h-4 flex-1 rounded-sm ${bloco.falha ? "bg-red-500" : "bg-emerald-500"}`}
                        />
                      ))}
                    </div>
                    <p className="mt-3 text-center text-xs text-slate-400">
                      Retencao efetiva = data recente - data antiga - periodos de indisponibilidade registrados
                    </p>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
                  <h3 className="font-bold text-slate-100">Ultimos checklists</h3>
                  <div className="mt-3 max-h-56 space-y-2 overflow-auto pr-2">
                    {timelineChecklists.slice(0, 8).map((item) => (
                      <div key={item.id} className="rounded-xl border border-slate-800 bg-slate-950 p-3 text-sm">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <strong>{formatarDataHora(item.createdAt)}</strong>
                          <span className={`rounded-full px-2 py-1 text-xs font-bold ${item.statusAtual === "Conectada" ? "bg-emerald-500/15 text-emerald-200" : "bg-red-500/15 text-red-200"}`}>
                            {item.statusAtual || "Nao informado"}
                          </span>
                        </div>
                        <p className="mt-1 text-slate-400">Retencao: {item.retencaoEstimadaTexto || `${item.tempoGravacaoDisponivel} dias`}</p>
                      </div>
                    ))}
                    {timelineChecklists.length === 0 && <p className="text-sm text-slate-500">Nenhum checklist registrado.</p>}
                  </div>
                </div>
                <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
                  <h3 className="font-bold text-slate-100">Periodos de indisponibilidade</h3>
                  <div className="mt-3 max-h-56 space-y-2 overflow-auto pr-2">
                    {timelineIndisponibilidades.slice(0, 8).map((item) => (
                      <div key={item.id} className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <strong>{item.motivo || "Indisponibilidade"}</strong>
                          <span className="rounded-full bg-red-500/15 px-2 py-1 text-xs font-bold text-red-200">{item.tempoIndisponibilidade}</span>
                        </div>
                        <p className="mt-1 text-slate-400">{formatarDataHora(item.iniciadoEm)} ate {formatarDataHora(item.encerradoEm)}</p>
                      </div>
                    ))}
                    {timelineIndisponibilidades.length === 0 && <p className="text-sm text-slate-500">Nenhum periodo de indisponibilidade registrado.</p>}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {cameraHistorico && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="max-h-[92vh] w-full max-w-6xl overflow-auto rounded-2xl bg-white p-5 shadow-2xl">
            <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-600">Histórico de Indisponibilidade</p>
                <h2 className="text-xl font-bold text-slate-900">Câmera {cameraHistorico.numeroCamera}{cameraHistorico.nomeCamera ? ` - ${cameraHistorico.nomeCamera}` : ""}</h2>
                <p className="text-sm text-slate-500">{cameraHistorico.areaMonitorada} | Servidor {cameraHistorico.numeroServidor}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setFormIndisponibilidade(indisponibilidadeInicial);
                    setIndisponibilidadeEditando(null);
                    setFormIndisponibilidadeAberto(true);
                  }}
                  className="rounded-lg bg-blue-600 px-4 py-2 font-bold text-white"
                >
                  + Registrar Indisponibilidade
                </button>
                <button type="button" onClick={() => setCameraHistorico(null)} className="rounded-lg bg-slate-100 px-3 py-2">Fechar</button>
              </div>
            </div>

            {formIndisponibilidadeAberto && (
              <form onSubmit={salvarIndisponibilidade} className="mb-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <label className="space-y-2 text-sm font-bold text-slate-700">
                    <span>Data/Hora Inicial</span>
                    <input type="datetime-local" className="w-full rounded-lg border p-3" value={formIndisponibilidade.iniciadoEm} onChange={(e) => campoIndisponibilidade("iniciadoEm", e.target.value)} required />
                  </label>
                  <label className="space-y-2 text-sm font-bold text-slate-700">
                    <span>Data/Hora Final</span>
                    <input type="datetime-local" className="w-full rounded-lg border p-3" value={formIndisponibilidade.encerradoEm} onChange={(e) => campoIndisponibilidade("encerradoEm", e.target.value)} required />
                  </label>
                  <label className="space-y-2 text-sm font-bold text-slate-700">
                    <span>Motivo</span>
                    <select className="w-full rounded-lg border p-3" value={formIndisponibilidade.motivo} onChange={(e) => campoIndisponibilidade("motivo", e.target.value)} required>
                      <option value="">Selecione o motivo</option>
                      {motivosIndisponibilidade.map((motivo) => <option key={motivo}>{motivo}</option>)}
                    </select>
                  </label>
                  <label className="space-y-2 text-sm font-bold text-slate-700 md:col-span-2">
                    <span>Observação</span>
                    <textarea className="w-full rounded-lg border p-3" placeholder="Detalhe a indisponibilidade, evidências e tratativas realizadas" value={formIndisponibilidade.observacao} onChange={(e) => campoIndisponibilidade("observacao", e.target.value)} />
                  </label>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button className="rounded-lg bg-green-600 px-5 py-3 font-bold text-white">{indisponibilidadeEditando ? "Salvar alteração" : "Salvar registro"}</button>
                  <button type="button" onClick={() => setFormIndisponibilidadeAberto(false)} className="rounded-lg bg-slate-200 px-5 py-3 font-bold text-slate-700">Cancelar</button>
                </div>
              </form>
            )}

            <div className="overflow-x-auto">
              <table className="w-full min-w-[920px] text-left text-sm">
                <thead className="bg-slate-100 text-slate-600">
                  <tr>
                    <th className="p-3">Data Inicial</th>
                    <th className="p-3">Data Final</th>
                    <th className="p-3">Tempo</th>
                    <th className="p-3">Motivo</th>
                    <th className="p-3">Usuário Responsável</th>
                    <th className="p-3">Data de Cadastro</th>
                    {podeAdministrar() && <th className="p-3">Ações</th>}
                  </tr>
                </thead>
                <tbody>
                  {indisponibilidades.length === 0 ? (
                    <tr><td className="p-4 text-slate-500" colSpan={podeAdministrar() ? 7 : 6}>Nenhum período de indisponibilidade registrado.</td></tr>
                  ) : indisponibilidades.map((registro) => (
                    <tr key={registro.id} className="border-b border-slate-100">
                      <td className="p-3">{new Date(registro.iniciadoEm).toLocaleString("pt-BR")}</td>
                      <td className="p-3">{registro.encerradoEm ? new Date(registro.encerradoEm).toLocaleString("pt-BR") : "Em aberto"}</td>
                      <td className="p-3 font-bold">{registro.tempoIndisponibilidade}</td>
                      <td className="p-3">{registro.motivo || "Não informado"}</td>
                      <td className="p-3">{registro.responsavel?.nome || "Sistema"}</td>
                      <td className="p-3">{new Date(registro.createdAt).toLocaleString("pt-BR")}</td>
                      {podeAdministrar() && (
                        <td className="p-3">
                          <button onClick={() => editarIndisponibilidade(registro)} className="rounded bg-slate-200 px-3 py-1 text-slate-700">Editar</button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {cameraChecklist && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <form onSubmit={salvarChecklist} className="max-h-[92vh] w-full max-w-3xl overflow-auto rounded-2xl bg-white p-5 shadow-2xl">
            <div className="mb-5 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Checklist operacional semanal</h2>
                <p className="text-sm text-slate-500">Câmera {cameraChecklist.numeroCamera} | {cameraChecklist.areaMonitorada}</p>
              </div>
              <button type="button" onClick={() => setCameraChecklist(null)} className="rounded-lg bg-slate-100 px-3 py-2">Fechar</button>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <CampoChecklist label="Data mais antiga encontrada no Digifort">
                <input className="w-full rounded-lg border p-3" type="datetime-local" title="Data e hora mais antiga de gravação encontrada durante a consulta no Digifort" value={checklist.dataInicialGravacao} onChange={(e) => campoChecklist("dataInicialGravacao", e.target.value)} required />
              </CampoChecklist>
              <CampoChecklist label="Data mais recente encontrada no Digifort">
                <input className="w-full rounded-lg border p-3" type="datetime-local" title="Obrigatória somente quando a câmera estiver desconectada; se estiver conectada, o sistema usa a data e hora atual" value={checklist.dataMaisRecenteGravacao} onChange={(e) => campoChecklist("dataMaisRecenteGravacao", e.target.value)} required={checklist.statusAtual === "Desconectada"} />
              </CampoChecklist>
              <CampoChecklist label="Status atual da camera">
                <select className="w-full rounded-lg border p-3" title="Status atual da camera no momento do checklist" value={checklist.statusAtual} onChange={(e) => campoChecklist("statusAtual", e.target.value)}>
                  <option>Conectada</option>
                  <option>Desconectada</option>
                </select>
              </CampoChecklist>
              <CampoChecklist label="Retencao atual calculada">
                <input className="w-full rounded-lg border bg-slate-50 p-3 text-slate-700" readOnly title="Diferenca real entre a data mais antiga e a data mais recente encontradas no Digifort" value={checklist.retencaoEstimadaTexto} />
              </CampoChecklist>
              <label className="space-y-2 text-sm font-bold text-slate-700 md:col-span-2 dark:text-slate-200">
                <span>Observacoes do operador</span>
                <textarea className="w-full rounded-lg border p-3" placeholder="Descreva o resultado da consulta no Digifort, falhas, ausencia de gravacao ou observacoes relevantes" title="Observacoes operacionais do checklist" value={checklist.observacoesOperacionais} onChange={(e) => campoChecklist("observacoesOperacionais", e.target.value)} />
              </label>
            </div>
            <button className="mt-5 rounded-lg bg-green-600 px-5 py-3 font-bold text-white">Salvar checklist</button>
          </form>
        </div>
      )}

      {pdfLightbox && (
        <PdfLightbox
          url={pdfLightbox.url}
          titulo={pdfLightbox.titulo}
          nomeArquivo={pdfLightbox.nomeArquivo}
          onClose={fecharPdfLightbox}
        />
      )}
    </div>
  );
}

function TooltipTimelineRetencao({ active, payload }: TimelineTooltipProps) {
  const ponto = payload?.[0]?.payload;
  if (!active || !ponto) return null;

  return (
    <div className="min-w-64 rounded-2xl border border-slate-700 bg-slate-950/95 p-4 text-sm text-slate-100 shadow-2xl shadow-slate-950/40">
      <p className={`text-xs font-bold uppercase tracking-[0.18em] ${ponto.tipo === "falha" ? "text-red-300" : "text-cyan-300"}`}>
        {ponto.tipo === "falha" ? "Falha de gravacao" : "Checklist CFTV"}
      </p>
      <p className="mt-1 text-base font-black">
        {ponto.tipo === "falha"
          ? `${ponto.falhaRetencao?.toLocaleString("pt-BR") || 0} dias no inicio da falha`
          : `${ponto.retencaoDias?.toLocaleString("pt-BR") || 0} dias de retencao`}
      </p>
      <div className="mt-3 space-y-1 text-xs text-slate-300">
        <p><span className="text-slate-500">Inspecao:</span> {ponto.data}</p>
        {ponto.status && <p><span className="text-slate-500">Status:</span> {ponto.status}</p>}
        {ponto.tipo !== "falha" && (
          <>
            <p><span className="text-slate-500">Meta projetada:</span> {ponto.metaProjetada?.toLocaleString("pt-BR") || 0} dias</p>
            <p><span className="text-slate-500">Mais antiga:</span> {formatarDataHora(ponto.dataMaisAntiga)}</p>
            <p><span className="text-slate-500">Mais recente:</span> {formatarDataHora(ponto.dataMaisRecente)}</p>
          </>
        )}
        {ponto.responsavel && <p><span className="text-slate-500">Responsavel:</span> {ponto.responsavel}</p>}
        {ponto.observacao && <p className="pt-1 text-slate-400">{ponto.observacao}</p>}
      </div>
    </div>
  );
}
