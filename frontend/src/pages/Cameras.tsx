import { type ReactNode, useEffect, useMemo, useState } from "react";
import { AlertTriangle, Camera, Radio, ShieldCheck, Wifi, WifiOff } from "lucide-react";
import { api } from "../services/api";
import { podeAdministrar, podeAnalisar } from "../utils/permissoes";

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
    retencaoEstimadaTexto?: string | null;
    createdAt: string;
  }>;
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
  const [indisponibilidades, setIndisponibilidades] = useState<IndisponibilidadeCamera[]>([]);
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
        <div className="mb-5 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Inventário operacional</h2>
            <p className="text-sm text-slate-500">Cadastro, atualização de status e checklist semanal obrigatório.</p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[960px] text-left text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
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
              {cameras.map((camera) => (
                <tr key={camera.id} className="border-b border-slate-100">
                  <td className="p-3 font-bold">Câmera {camera.numeroCamera}{camera.nomeCamera ? ` - ${camera.nomeCamera}` : ""}</td>
                  <td className="p-3">Servidor {camera.numeroServidor}</td>
                  <td className="p-3"><span className={`rounded-full px-3 py-1 text-xs font-bold ${camera.status === "Conectada" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>{camera.status}</span></td>
                  <td className="p-3">{camera.tipoCamera}</td>
                  <td className="p-3">{camera.tecnologia}</td>
                  <td className="p-3">{camera.areaMonitorada}</td>
                  <td className="p-3 font-bold">{camera.checklists?.[0]?.tempoGravacaoDisponivel ?? "Sem checklist"}</td>
                  <td className="p-3">{camera.totalFalhas}</td>
                  <td className="p-3">
                    <div className="flex flex-wrap gap-2">
                      {podeAnalisar() && <button onClick={() => editarCamera(camera)} className="rounded bg-slate-200 px-3 py-1">Editar</button>}
                      {podeAnalisar() && <button onClick={() => excluirCamera(camera)} className="rounded bg-red-600 px-3 py-1 text-white">Excluir</button>}
                      <button onClick={() => abrirChecklist(camera)} className="rounded bg-blue-600 px-3 py-1 text-white">Checklist</button>
                      <button onClick={() => abrirHistoricoIndisponibilidade(camera)} className="rounded bg-slate-900 px-3 py-1 text-white">Histórico</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

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
    </div>
  );
}
