import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Camera,
  MapPinned,
  PackageSearch,
  ShieldAlert,
} from "lucide-react";
import { api } from "../services/api";

type LocalTerminal = {
  id: number;
  nome: string;
  tipo: string;
  areaSensivel: boolean;
  status: string;
};

type Ocorrencia = {
  id: number;
  codigo: string;
  assunto: string;
  local: string;
  status: string;
  natureza: string;
};

type Evento = {
  id: number;
  codigo: string;
  assunto: string;
  local: string;
  status: string;
  natureza: string;
};

type CameraItem = {
  id: number;
  numeroCamera: string;
  status: string;
  localInstalado: string;
  areaMonitorada: string;
};

type Risco = {
  id: number;
  codigo: string;
  local: string;
  nivelRisco: string;
  status: string;
};

type ContainerQuadra = {
  id: number;
  numeroContainer: string;
  statusOperacional: string;
  posicionamento?: string;
};

function normalizar(texto?: string | null) {
  return String(texto || "")
    .trim()
    .toUpperCase();
}

function nivelArea(params: {
  ocorrencias: number;
  eventos: number;
  camerasOffline: number;
  riscosCriticos: number;
  sensivel: boolean;
}) {
  const pontos =
    params.ocorrencias * 2 +
    params.eventos +
    params.camerasOffline * 3 +
    params.riscosCriticos * 3 +
    (params.sensivel ? 1 : 0);

  if (pontos >= 8)
    return {
      nome: "Crítico",
      classe: "border-red-500/40 bg-red-500/10 text-red-100",
      barra: "bg-red-400",
    };
  if (pontos >= 4)
    return {
      nome: "Atenção",
      classe: "border-amber-500/40 bg-amber-500/10 text-amber-100",
      barra: "bg-amber-400",
    };
  return {
    nome: "Normal",
    classe: "border-emerald-500/30 bg-emerald-500/10 text-emerald-100",
    barra: "bg-emerald-400",
  };
}

export default function MapaOperacional() {
  const [locais, setLocais] = useState<LocalTerminal[]>([]);
  const [ocorrencias, setOcorrencias] = useState<Ocorrencia[]>([]);
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [cameras, setCameras] = useState<CameraItem[]>([]);
  const [riscos, setRiscos] = useState<Risco[]>([]);
  const [containers, setContainers] = useState<ContainerQuadra[]>([]);
  const [filtroStatus, setFiltroStatus] = useState("");
  const [busca, setBusca] = useState("");

  useEffect(() => {
    async function carregar() {
      const [
        locaisResponse,
        ocorrenciasResponse,
        eventosResponse,
        camerasResponse,
        riscosResponse,
        containersResponse,
      ] = await Promise.all([
        api
          .get("/locais", { params: { status: "ativo" } })
          .catch(() => ({ data: [] })),
        api.get("/ocorrencias").catch(() => ({ data: [] })),
        api.get("/eventos").catch(() => ({ data: [] })),
        api.get("/cameras").catch(() => ({ data: [] })),
        api.get("/riscos").catch(() => ({ data: [] })),
        api.get("/quadra-seguranca").catch(() => ({ data: [] })),
      ]);

      setLocais(locaisResponse.data);
      setOcorrencias(ocorrenciasResponse.data);
      setEventos(eventosResponse.data);
      setCameras(camerasResponse.data);
      setRiscos(riscosResponse.data);
      setContainers(containersResponse.data);
    }

    carregar();
  }, []);

  const areas = useMemo(() => {
    const locaisBase =
      locais.length > 0
        ? locais
        : Array.from(
            new Set(
              [
                ...ocorrencias.map((item) => item.local),
                ...eventos.map((item) => item.local),
                ...cameras.map(
                  (item) => item.localInstalado || item.areaMonitorada,
                ),
                ...riscos.map((item) => item.local),
              ].filter(Boolean),
            ),
          ).map((nome, index) => ({
            id: index,
            nome,
            tipo: "Operacional",
            areaSensivel: false,
            status: "Ativo",
          }));

    return locaisBase.map((local) => {
      const chave = normalizar(local.nome);
      const ocorrenciasArea = ocorrencias.filter(
        (item) => normalizar(item.local) === chave,
      );
      const eventosArea = eventos.filter(
        (item) => normalizar(item.local) === chave,
      );
      const camerasArea = cameras.filter(
        (item) =>
          normalizar(item.localInstalado) === chave ||
          normalizar(item.areaMonitorada) === chave,
      );
      const riscosArea = riscos.filter(
        (item) => normalizar(item.local) === chave,
      );
      const camerasOffline = camerasArea.filter(
        (item) => item.status === "Desconectada",
      ).length;
      const riscosCriticos = riscosArea.filter((item) =>
        ["CRÍTICO", "CRITICO", "ALTO"].includes(normalizar(item.nivelRisco)),
      ).length;
      const nivel = nivelArea({
        ocorrencias: ocorrenciasArea.length,
        eventos: eventosArea.length,
        camerasOffline,
        riscosCriticos,
        sensivel: local.areaSensivel,
      });

      return {
        ...local,
        ocorrencias: ocorrenciasArea,
        eventos: eventosArea,
        cameras: camerasArea,
        riscos: riscosArea,
        camerasOffline,
        riscosCriticos,
        nivel,
        total:
          ocorrenciasArea.length +
          eventosArea.length +
          camerasArea.length +
          riscosArea.length,
      };
    });
  }, [locais, ocorrencias, eventos, cameras, riscos]);

  const areasFiltradas = areas.filter((area) => {
    const texto = `${area.nome} ${area.tipo} ${area.nivel.nome}`.toLowerCase();
    return (
      (!filtroStatus || area.nivel.nome === filtroStatus) &&
      (!busca || texto.includes(busca.toLowerCase()))
    );
  });

  const indicadores = {
    locais: areas.length,
    criticos: areas.filter((area) => area.nivel.nome === "Crítico").length,
    atencao: areas.filter((area) => area.nivel.nome === "Atenção").length,
    camerasOffline: cameras.filter((camera) => camera.status === "Desconectada")
      .length,
    containersTerminal: containers.filter(
      (item) => !["Liberado", "Finalizado"].includes(item.statusOperacional),
    ).length,
  };

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-950 text-white shadow-2xl">
        <div className="border-b border-slate-800 bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.22),transparent_36%),linear-gradient(135deg,#020617,#111827)] p-6">
          <p className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-cyan-300">
            <MapPinned size={16} /> Centro de comando patrimonial
          </p>
          <h1 className="mt-3 text-2xl font-black sm:text-3xl">
            Mapa Operacional do Terminal
          </h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-300">
            Visão consolidada por local com ocorrências, eventos, riscos,
            câmeras, áreas sensíveis e quadra de segurança.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2 xl:grid-cols-5">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">Locais monitorados</p>
            <p className="mt-2 text-3xl font-black">{indicadores.locais}</p>
          </div>
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-5">
            <p className="text-sm text-red-200">Áreas críticas</p>
            <p className="mt-2 text-3xl font-black text-red-200">
              {indicadores.criticos}
            </p>
          </div>
          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5">
            <p className="text-sm text-amber-200">Áreas em atenção</p>
            <p className="mt-2 text-3xl font-black text-amber-200">
              {indicadores.atencao}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">Câmeras offline</p>
            <p className="mt-2 text-3xl font-black text-cyan-200">
              {indicadores.camerasOffline}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">Contêineres no terminal</p>
            <p className="mt-2 text-3xl font-black text-cyan-200">
              {indicadores.containersTerminal}
            </p>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 rounded-2xl bg-white p-4 shadow md:grid-cols-3">
        <input
          className="rounded-xl border p-3 md:col-span-2"
          placeholder="Buscar local, tipo ou criticidade"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
        <select
          className="rounded-xl border p-3"
          value={filtroStatus}
          onChange={(e) => setFiltroStatus(e.target.value)}
        >
          <option value="">Todos os níveis</option>
          <option>Normal</option>
          <option>Atenção</option>
          <option>Crítico</option>
        </select>
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        {areasFiltradas.map((area) => (
          <div
            key={area.id}
            className={`rounded-2xl border p-5 shadow-xl ${area.nivel.classe}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] opacity-80">
                  {area.tipo || "Operacional"}
                </p>
                <h2 className="mt-1 text-xl font-black">{area.nome}</h2>
              </div>
              <span className="rounded-full bg-slate-950/40 px-3 py-1 text-xs font-bold">
                {area.nivel.nome}
              </span>
            </div>

            <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-950/30">
              <div
                className={`h-full ${area.nivel.barra}`}
                style={{
                  width: `${Math.min(Math.max(area.total * 12, 12), 100)}%`,
                }}
              />
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-xl bg-slate-950/30 p-3">
                <p className="flex items-center gap-2 opacity-80">
                  <ShieldAlert size={15} /> Ocorrências
                </p>
                <strong className="text-xl">{area.ocorrencias.length}</strong>
              </div>
              <div className="rounded-xl bg-slate-950/30 p-3">
                <p className="flex items-center gap-2 opacity-80">
                  <AlertTriangle size={15} /> Eventos
                </p>
                <strong className="text-xl">{area.eventos.length}</strong>
              </div>
              <div className="rounded-xl bg-slate-950/30 p-3">
                <p className="flex items-center gap-2 opacity-80">
                  <Camera size={15} /> CFTV
                </p>
                <strong className="text-xl">{area.cameras.length}</strong>
                <p className="text-xs opacity-80">
                  {area.camerasOffline} offline
                </p>
              </div>
              <div className="rounded-xl bg-slate-950/30 p-3">
                <p className="flex items-center gap-2 opacity-80">
                  <PackageSearch size={15} /> Riscos
                </p>
                <strong className="text-xl">{area.riscos.length}</strong>
                <p className="text-xs opacity-80">
                  {area.riscosCriticos} críticos/altos
                </p>
              </div>
            </div>

            {area.areaSensivel && (
              <p className="mt-4 rounded-xl border border-cyan-300/30 bg-cyan-300/10 p-3 text-sm font-bold text-cyan-100">
                Área sensível cadastrada
              </p>
            )}
          </div>
        ))}
      </section>
    </div>
  );
}
