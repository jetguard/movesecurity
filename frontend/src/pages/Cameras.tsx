import { type ReactNode, useEffect, useMemo, useState } from "react";
import { AlertTriangle, Camera, Radio, ShieldCheck, Wifi, WifiOff } from "lucide-react";
import { api } from "../services/api";
import { podeAnalisar } from "../utils/permissoes";

type CameraItem = {
  id: number;
  numeroCamera: string;
  numeroServidor: string;
  tipoSistema: string;
  periodoGravacaoDias: number;
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
  mapaOperacional: Array<{ id: number; numeroCamera: string; servidor: string; area: string; local: string; status: string; tipoCamera: string; tecnologia: string; offlineMinutos: number }>;
  alertas: Array<{ id: number; titulo: string; mensagem: string; minutos: number; slaViolado?: boolean }>;
  alertasAutomaticos?: Array<{ tipo: string; mensagem: string; severidade: string }>;
};

const cameraInicial = {
  numeroCamera: "",
  numeroServidor: "",
  tipoSistema: "",
  periodoGravacaoDias: "",
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
  tempoGravacaoDisponivel: "",
  dataInicialGravacao: "",
  dataDesconexaoManual: "",
  dataReconexaoManual: "",
  retencaoEstimadaTexto: "Retenção estimada atual: 180 dias, 00 horas e 00 minutos",
  qualidadeImagem: "Boa",
  funcionamentoInfravermelho: "Funcionando",
  funcionamentoGravacao: "Funcionando",
  comunicacaoServidor: "Funcionando",
  instabilidadeDetectada: "Não",
  necessidadeManutencao: "Não",
  observacoesOperacionais: "",
};

function minutos(min: number) {
  if (!min) return "0 min";
  const horas = Math.floor(min / 60);
  const minutosRestantes = min % 60;
  return horas > 0 ? `${horas}h ${minutosRestantes}min` : `${minutosRestantes} min`;
}

function minutosEntreDatas(inicio: string, fim?: string) {
  if (!inicio) return 0;
  const dataInicio = new Date(inicio);
  const dataFim = fim ? new Date(fim) : new Date();
  if (Number.isNaN(dataInicio.getTime()) || Number.isNaN(dataFim.getTime())) return 0;
  return Math.max(0, Math.round((dataFim.getTime() - dataInicio.getTime()) / 60000));
}

function formatarRetencao(minutosTotais: number) {
  const minutosAjustados = Math.max(0, Math.round(minutosTotais));
  const dias = Math.floor(minutosAjustados / 1440);
  const horas = Math.floor((minutosAjustados % 1440) / 60);
  const minutosRestantes = minutosAjustados % 60;
  return `${dias} dias, ${String(horas).padStart(2, "0")} horas e ${String(minutosRestantes).padStart(2, "0")} minutos`;
}

function calcularRetencaoChecklist(camera: CameraItem | null, dados: typeof checklistInicial) {
  const retencaoProjetada = 180 * 24 * 60;
  const offlineHistorico = camera?.totalIndisponibilidade || 0;
  const offlineAtual = camera?.status === "Desconectada" && camera.desconectadaDesde
    ? minutosEntreDatas(camera.desconectadaDesde)
    : 0;
  const offlineManual = minutosEntreDatas(dados.dataDesconexaoManual, dados.dataReconexaoManual || undefined);
  return formatarRetencao(retencaoProjetada - offlineHistorico - offlineAtual - offlineManual);
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
        retencaoEstimadaTexto: `Retenção estimada atual: ${calcularRetencaoChecklist(cameraChecklist, novo)}`,
      };
    });
  }

  useEffect(() => {
    if (!cameraChecklist) return;
    const intervalo = window.setInterval(() => {
      setChecklist((atual) => ({
        ...atual,
        retencaoEstimadaTexto: `Retenção estimada atual: ${calcularRetencaoChecklist(cameraChecklist, atual)}`,
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
      numeroServidor: String(camera.numeroServidor),
      tipoSistema: camera.tipoSistema,
      periodoGravacaoDias: String(camera.periodoGravacaoDias),
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
    setCameraChecklist(camera);
    setChecklist({
      ...checklistInicial,
      statusAtual: camera.status,
      tempoGravacaoDisponivel: String(Math.max(0, Math.round((180 * 24 * 60 - camera.totalIndisponibilidade) / 1440))),
      retencaoEstimadaTexto: `Retenção estimada atual: ${calcularRetencaoChecklist(camera, checklistInicial)}`,
    });
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
            <input className="rounded-lg border p-3" placeholder="Nº do servidor. Ex: SJJ-1" value={form.numeroServidor} onChange={(e) => campo("numeroServidor", e.target.value.toUpperCase())} required />
            <select className="rounded-lg border p-3" value={form.tipoSistema} onChange={(e) => campo("tipoSistema", e.target.value)} required>
              <option value="">Selecione o tipo de sistema</option>
              <option>DIGIFORT</option>
            </select>
            <input className="rounded-lg border p-3" placeholder="Período de gravação em dias" value={form.periodoGravacaoDias} onChange={(e) => campo("periodoGravacaoDias", e.target.value)} required />
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
            <input type="date" className="rounded-lg border p-3" value={form.ultimaManutencao} onChange={(e) => campo("ultimaManutencao", e.target.value)} />
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
                <th className="p-3">Falhas</th>
                <th className="p-3">Offline total</th>
                <th className="p-3">Ações</th>
              </tr>
            </thead>
            <tbody>
              {cameras.map((camera) => (
                <tr key={camera.id} className="border-b border-slate-100">
                  <td className="p-3 font-bold">Câmera {camera.numeroCamera}</td>
                  <td className="p-3">Servidor {camera.numeroServidor}</td>
                  <td className="p-3"><span className={`rounded-full px-3 py-1 text-xs font-bold ${camera.status === "Conectada" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>{camera.status}</span></td>
                  <td className="p-3">{camera.tipoCamera}</td>
                  <td className="p-3">{camera.tecnologia}</td>
                  <td className="p-3">{camera.areaMonitorada}</td>
                  <td className="p-3">{camera.totalFalhas}</td>
                  <td className="p-3">{minutos(camera.totalIndisponibilidade)}</td>
                  <td className="p-3">
                    <div className="flex flex-wrap gap-2">
                      {podeAnalisar() && <button onClick={() => editarCamera(camera)} className="rounded bg-slate-200 px-3 py-1">Editar</button>}
                      {podeAnalisar() && <button onClick={() => excluirCamera(camera)} className="rounded bg-red-600 px-3 py-1 text-white">Excluir</button>}
                      <button onClick={() => abrirChecklist(camera)} className="rounded bg-blue-600 px-3 py-1 text-white">Checklist</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

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
              <CampoChecklist label="Status atual da câmera">
                <select className="w-full rounded-lg border p-3" title="Status atual da câmera no momento do checklist" value={checklist.statusAtual} onChange={(e) => campoChecklist("statusAtual", e.target.value)}><option>Conectada</option><option>Desconectada</option></select>
              </CampoChecklist>
              <CampoChecklist label="Tempo de gravação disponível">
                <input className="w-full rounded-lg border p-3" placeholder="Ex: 180 dias disponíveis" title="Quantidade de dias disponíveis após cálculo de retenção" value={checklist.tempoGravacaoDisponivel} onChange={(e) => campoChecklist("tempoGravacaoDisponivel", e.target.value)} required />
              </CampoChecklist>
              <CampoChecklist label="Data inicial/limite de gravação">
                <input className="w-full rounded-lg border p-3" type="datetime-local" title="Data inicial ou limite de gravação informada pelo operador" value={checklist.dataInicialGravacao} onChange={(e) => campoChecklist("dataInicialGravacao", e.target.value)} />
              </CampoChecklist>
              <CampoChecklist label="Retenção estimada atual">
                <input className="w-full rounded-lg border bg-slate-50 p-3 text-slate-700" readOnly title="Retenção calculada automaticamente em dias, horas e minutos" value={checklist.retencaoEstimadaTexto} />
              </CampoChecklist>
              <CampoChecklist label="Data/hora de desconexão">
                <input className="w-full rounded-lg border p-3" type="datetime-local" title="Data/hora de desconexão manual, se houver ajuste operacional" value={checklist.dataDesconexaoManual} onChange={(e) => campoChecklist("dataDesconexaoManual", e.target.value)} />
              </CampoChecklist>
              <CampoChecklist label="Data/hora de reconexão">
                <input className="w-full rounded-lg border p-3" type="datetime-local" title="Data/hora de reconexão manual. Se ficar vazio, calcula até agora" value={checklist.dataReconexaoManual} onChange={(e) => campoChecklist("dataReconexaoManual", e.target.value)} />
              </CampoChecklist>
              <CampoChecklist label="Qualidade da imagem">
                <select className="w-full rounded-lg border p-3" title="Qualidade atual da imagem exibida no sistema de CFTV" value={checklist.qualidadeImagem} onChange={(e) => campoChecklist("qualidadeImagem", e.target.value)}><option>Excelente</option><option>Boa</option><option>Regular</option><option>Ruim</option><option>Sem imagem</option></select>
              </CampoChecklist>
              <CampoChecklist label="Funcionamento do infravermelho">
                <select className="w-full rounded-lg border p-3" title="Funcionamento do infravermelho durante período noturno ou baixa luminosidade" value={checklist.funcionamentoInfravermelho} onChange={(e) => campoChecklist("funcionamentoInfravermelho", e.target.value)}><option>Funcionando</option><option>Parcial</option><option>Não funcionando</option><option>Não possui</option></select>
              </CampoChecklist>
              <CampoChecklist label="Funcionamento da gravação">
                <select className="w-full rounded-lg border p-3" title="Confirma se a gravação está sendo armazenada corretamente" value={checklist.funcionamentoGravacao} onChange={(e) => campoChecklist("funcionamentoGravacao", e.target.value)}><option>Funcionando</option><option>Parcial</option><option>Não funcionando</option></select>
              </CampoChecklist>
              <CampoChecklist label="Comunicação com servidor">
                <select className="w-full rounded-lg border p-3" title="Comunicação entre câmera, rede e servidor de gravação" value={checklist.comunicacaoServidor} onChange={(e) => campoChecklist("comunicacaoServidor", e.target.value)}><option>Funcionando</option><option>Instável</option><option>Sem comunicação</option></select>
              </CampoChecklist>
              <CampoChecklist label="Instabilidade detectada">
                <select className="w-full rounded-lg border p-3" title="Indica oscilação, queda de imagem ou comportamento intermitente" value={checklist.instabilidadeDetectada} onChange={(e) => campoChecklist("instabilidadeDetectada", e.target.value)}><option>Não</option><option>Sim</option></select>
              </CampoChecklist>
              <CampoChecklist label="Necessidade de manutenção">
                <select className="w-full rounded-lg border p-3" title="Indica se a câmera precisa de manutenção preventiva ou corretiva" value={checklist.necessidadeManutencao} onChange={(e) => campoChecklist("necessidadeManutencao", e.target.value)}><option>Não</option><option>Sim</option><option>Urgente</option></select>
              </CampoChecklist>
              <label className="space-y-2 text-sm font-bold text-slate-700 md:col-span-2 dark:text-slate-200">
                <span>Observações operacionais</span>
                <textarea className="w-full rounded-lg border p-3" placeholder="Descreva observações operacionais, falhas percebidas, imagem ruim, perda de gravação ou ação necessária" title="Observações operacionais do checklist" value={checklist.observacoesOperacionais} onChange={(e) => campoChecklist("observacoesOperacionais", e.target.value)} />
              </label>
            </div>
            <button className="mt-5 rounded-lg bg-green-600 px-5 py-3 font-bold text-white">Salvar checklist</button>
          </form>
        </div>
      )}
    </div>
  );
}
