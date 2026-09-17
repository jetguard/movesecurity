import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  BarChart3,
  Camera,
  Image as ImageIcon,
  Maximize2,
  Minimize2,
  RefreshCw,
  ScanLine,
  ShieldCheck,
  ClipboardCheck,
  Shield,
  TrendingUp,
  Truck,
  Users,
  UserRoundCheck,
  AlertTriangle,
  X,
} from "lucide-react";
import { api } from "../services/api";

type IndicadorCard = {
  titulo: string;
  valor: string | number;
  detalhe?: string;
};

type RankingItem = {
  label: string;
  valor: number;
  chave?: string;
};

type BlocoIndicadores = {
  cards: IndicadorCard[];
  rankings: Record<string, RankingItem[]>;
};

type RegistroOcorrenciaEvento = {
  id: string;
  registroId: number;
  tipo: "RO" | "RE" | "RI";
  codigo: string;
  unidade: string;
  resumo: string;
  assunto: string;
  local: string;
  natureza: string;
  subNatureza: string;
  data: string;
  acoesTomadas: string;
  responsavelTratativas: string;
  dataResolucao?: string | null;
  status: string;
  diasParaResolucao?: number | null;
};

type BlocoOcorrenciasEventos = BlocoIndicadores & {
  unidades?: string[];
  registros?: RegistroOcorrenciaEvento[];
};

type CameraCftvRegistro = {
  id: number;
  numeroCamera: string;
  nomeCamera?: string | null;
  numeroServidor: string;
  unidade: string;
  status: string;
  tipoCamera: string;
  tecnologia: string;
  localInstalado: string;
  areaMonitorada: string;
  totalFalhas: number;
  totalIndisponibilidade: number;
  desconectadaDesde?: string | null;
};

type BlocoCamerasCftv = BlocoIndicadores & {
  unidades?: string[];
  cameras?: CameraCftvRegistro[];
};

type DadosIndicadores = {
  atualizadoEm: string;
  unidade: string;
  ocorrenciasEventos: BlocoOcorrenciasEventos;
  scanner: BlocoIndicadores;
  ocr: BlocoIndicadores;
  entradaSaida: BlocoIndicadores;
  vigilancia: BlocoIndicadores;
  balanca: BlocoIndicadores;
  acesso: BlocoIndicadores;
  motoristas: BlocoIndicadores;
  filas: BlocoIndicadores;
  solicitacoesImagens: BlocoIndicadores;
  camerasCftv: BlocoCamerasCftv;
};

type AbaIndicador = {
  id: keyof Omit<DadosIndicadores, "atualizadoEm" | "unidade">;
  titulo: string;
  subtitulo: string;
  icone: typeof BarChart3;
  cor: string;
};

const abas: AbaIndicador[] = [
  {
    id: "ocorrenciasEventos",
    titulo: "Ocorrências e eventos",
    subtitulo: "Indicadores gerais do dashboard operacional",
    icone: ShieldCheck,
    cor: "from-blue-500 to-cyan-400",
  },
  {
    id: "scanner",
    titulo: "Scanner",
    subtitulo: "Passagens, falhas, suspeitas e disponibilidade",
    icone: ScanLine,
    cor: "from-emerald-500 to-lime-400",
  },
  {
    id: "ocr",
    titulo: "OCR",
    subtitulo: "Leituras, assertividade e indisponibilidade",
    icone: ClipboardCheck,
    cor: "from-indigo-500 to-blue-400",
  },
  {
    id: "entradaSaida",
    titulo: "Entrada e saída",
    subtitulo: "Auditorias, lacres, divergências e conformidade",
    icone: Truck,
    cor: "from-cyan-500 to-blue-400",
  },
  {
    id: "balanca",
    titulo: "Balança",
    subtitulo: "Atendimentos, paradas e contingências",
    icone: BarChart3,
    cor: "from-orange-500 to-amber-400",
  },
  {
    id: "vigilancia",
    titulo: "Vigilância patrimonial",
    subtitulo: "Efetivo, rondas, cobertura e desvios",
    icone: Shield,
    cor: "from-slate-500 to-blue-500",
  },
  {
    id: "acesso",
    titulo: "Acesso",
    subtitulo: "Pessoas, veículos leves e irregularidades",
    icone: Users,
    cor: "from-violet-500 to-blue-400",
  },
  {
    id: "motoristas",
    titulo: "Motoristas",
    subtitulo: "Cadastros, bloqueios e conformidade documental",
    icone: UserRoundCheck,
    cor: "from-teal-500 to-cyan-400",
  },
  {
    id: "filas",
    titulo: "Filas e paradas",
    subtitulo: "Impactos, contingências e reincidência",
    icone: AlertTriangle,
    cor: "from-red-500 to-orange-400",
  },
  {
    id: "solicitacoesImagens",
    titulo: "Solicitações de imagens",
    subtitulo: "Atendimentos, status e evidências",
    icone: ImageIcon,
    cor: "from-fuchsia-500 to-violet-400",
  },
  {
    id: "camerasCftv",
    titulo: "Câmeras CFTV",
    subtitulo: "Conectividade, falhas e áreas monitoradas",
    icone: Camera,
    cor: "from-amber-500 to-orange-400",
  },
];

function formatarData(valor?: string) {
  if (!valor) return "--";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(valor));
}

function normalizarTitulo(valor: string) {
  return valor
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (letra) => letra.toUpperCase())
    .trim();
}

function formatarDataCurta(valor?: string | null) {
  if (!valor) return "-";
  return new Intl.DateTimeFormat("pt-BR").format(new Date(valor));
}

function chaveMesAno(valor?: string) {
  if (!valor) return "";
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return "";
  return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, "0")}`;
}

function rotuloMesAno(chave: string) {
  const [ano, mes] = chave.split("-").map(Number);
  if (!ano || !mes) return chave || "Não informado";
  return new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
  }).format(new Date(ano, mes - 1, 1));
}

function mesCurto(chave: string) {
  const [ano, mes] = chave.split("-").map(Number);
  if (!ano || !mes) return chave || "N/I";
  return new Intl.DateTimeFormat("pt-BR", { month: "short" })
    .format(new Date(ano, mes - 1, 1))
    .replace(".", "");
}

function contarPor<T>(lista: T[], seletor: (item: T) => string | null | undefined) {
  const mapa = new Map<string, number>();
  lista.forEach((item) => {
    const chave = seletor(item)?.trim() || "Não informado";
    mapa.set(chave, (mapa.get(chave) || 0) + 1);
  });
  return Array.from(mapa.entries())
    .map(([label, valor]) => ({ label, valor }))
    .sort((a, b) => b.valor - a.valor || a.label.localeCompare(b.label));
}

function BiCard({ titulo, valor }: { titulo: string; valor: string | number }) {
  return (
    <div className="rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 text-center shadow-[0_12px_28px_rgba(0,0,0,0.28)]">
      <p className="text-xs font-semibold text-slate-300">{titulo}</p>
      <p className="mt-1 text-3xl font-black text-white">{valor}</p>
    </div>
  );
}

function BiPanel({
  titulo,
  children,
  className = "",
}: {
  titulo: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-lg border border-slate-700 bg-slate-900 p-3 text-slate-100 shadow-[0_12px_28px_rgba(0,0,0,0.24)] ${className}`}
    >
      <h3 className="mb-2 text-center text-sm font-bold text-white">
        {titulo}
      </h3>
      {children}
    </div>
  );
}

function BarrasVerticais({
  itens,
  ativo,
  onSelect,
}: {
  itens: RankingItem[];
  ativo?: string;
  onSelect: (item: RankingItem) => void;
}) {
  const maior = Math.max(...itens.map((item) => item.valor), 1);
  return (
    <div className="flex h-36 items-end gap-3 overflow-x-auto px-1 pb-1">
      {itens.map((item) => (
        <button
          key={item.label}
          type="button"
          onClick={() => onSelect(item)}
          className={`flex min-w-14 flex-1 flex-col items-center justify-end rounded-lg px-1 transition ${
            ativo === item.label ? "bg-blue-500/15 ring-2 ring-blue-400" : "hover:bg-slate-800"
          }`}
          title={`Filtrar por ${item.label}`}
        >
          <span className="mb-1 text-[10px] font-bold text-slate-100">
            {item.valor}
          </span>
          <span
            className="w-full rounded-t-sm bg-gradient-to-t from-blue-600 to-cyan-300 shadow-[0_0_12px_rgba(56,189,248,0.25)]"
            style={{ height: `${Math.max(8, (item.valor / maior) * 104)}px` }}
          />
          <span className="mt-1 line-clamp-1 text-[10px] text-slate-300">
            {item.label}
          </span>
        </button>
      ))}
    </div>
  );
}

function BarrasHorizontais({
  itens,
  ativo,
  onSelect,
  cor = "bg-[#94c8f4]",
}: {
  itens: RankingItem[];
  ativo?: string;
  onSelect: (valor: string) => void;
  cor?: string;
}) {
  const maior = Math.max(...itens.map((item) => item.valor), 1);
  return (
    <div className="max-h-36 space-y-2 overflow-y-auto pr-1">
      {itens.map((item) => (
        <button
          key={item.label}
          type="button"
          onClick={() => onSelect(item.label)}
          className={`grid w-full grid-cols-[minmax(80px,1fr)_minmax(40px,1.2fr)_32px] items-center gap-2 rounded-lg px-1 py-0.5 text-left transition ${
            ativo === item.label ? "bg-blue-500/15 ring-1 ring-blue-400" : "hover:bg-slate-800"
          }`}
          title={`Filtrar por ${item.label}`}
        >
          <span className="line-clamp-1 text-[10px] text-slate-300">
            {item.label}
          </span>
          <span className="h-5 rounded-sm bg-slate-800">
            <span
              className={`block h-full rounded-sm ${cor}`}
              style={{ width: `${Math.max(7, (item.valor / maior) * 100)}%` }}
            />
          </span>
          <span className="text-right text-[10px] font-bold text-slate-100">
            {item.valor}
          </span>
        </button>
      ))}
    </div>
  );
}

export default function IndicadoresSegurancaEmpresarial() {
  const [dados, setDados] = useState<DadosIndicadores | null>(null);
  const [abaAtiva, setAbaAtiva] = useState<AbaIndicador["id"]>("ocorrenciasEventos");
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [estendido, setEstendido] = useState(false);
  const [filtroUnidade, setFiltroUnidade] = useState("Todos");
  const [filtroTipoRegistro, setFiltroTipoRegistro] = useState("Todos");
  const [filtroMesAno, setFiltroMesAno] = useState("Todos");
  const [filtroGrafico, setFiltroGrafico] = useState<{
    campo: keyof RegistroOcorrenciaEvento | "mesAno";
    valor: string;
  } | null>(null);
  const [filtroUnidadeCftv, setFiltroUnidadeCftv] = useState("Todos");
  const [filtroCftv, setFiltroCftv] = useState<{
    campo: "status" | "tipoCamera" | "tecnologia" | "areaMonitorada" | "id";
    valor: string;
  } | null>(null);

  async function carregarIndicadores() {
    try {
      setErro("");
      const resposta = await api.get<DadosIndicadores>("/indicadores-seguranca-empresarial");
      setDados(resposta.data);
    } catch (error) {
      console.error("Erro ao carregar indicadores de segurança empresarial:", error);
      setErro("Não foi possível carregar os indicadores agora.");
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregarIndicadores();
    const intervalo = window.setInterval(carregarIndicadores, 30000);
    return () => window.clearInterval(intervalo);
  }, []);

  useEffect(() => {
    let timeout: number | undefined;
    const eventosRelevantes = new Set([
      "indicadores_seguranca_atualizados",
      "ocorrencia.criada",
      "ocorrencia.atualizada",
      "evento.criado",
      "evento.atualizado",
      "camera_status_alterado",
      "camera_indisponibilidade_atualizada",
      "camera_cadastrada",
    ]);

    function atualizarPorEvento(event: Event) {
      const detalhe = (event as CustomEvent<{ tipo?: string }>).detail;
      if (!detalhe?.tipo || !eventosRelevantes.has(detalhe.tipo)) return;
      window.clearTimeout(timeout);
      timeout = window.setTimeout(() => carregarIndicadores(), 700);
    }

    window.addEventListener("movesecurity-realtime", atualizarPorEvento);
    return () => {
      window.clearTimeout(timeout);
      window.removeEventListener("movesecurity-realtime", atualizarPorEvento);
    };
  }, []);

  useEffect(() => {
    document.body.classList.toggle("overflow-hidden", estendido);
    return () => document.body.classList.remove("overflow-hidden");
  }, [estendido]);

  const aba = abas.find((item) => item.id === abaAtiva) || abas[0];
  const bloco = dados?.[aba.id];
  const rankings = useMemo(() => Object.entries(bloco?.rankings || {}), [bloco]);
  const IconeAba = aba.icone;
  const registrosBi = dados?.ocorrenciasEventos.registros || [];
  const unidadesBi = dados?.ocorrenciasEventos.unidades?.length
    ? dados.ocorrenciasEventos.unidades
    : Array.from(new Set(registrosBi.map((item) => item.unidade))).sort();
  const mesesBi = Array.from(new Set(registrosBi.map((item) => chaveMesAno(item.data))))
    .filter(Boolean)
    .sort()
    .reverse();
  const registrosOcorrenciasFiltrados = registrosBi.filter((item) => {
    if (filtroUnidade !== "Todos" && item.unidade !== filtroUnidade) return false;
    if (filtroTipoRegistro !== "Todos" && item.tipo !== filtroTipoRegistro) return false;
    if (filtroMesAno !== "Todos" && chaveMesAno(item.data) !== filtroMesAno) return false;
    if (filtroGrafico) {
      const valor =
        filtroGrafico.campo === "mesAno"
          ? chaveMesAno(item.data)
          : String(item[filtroGrafico.campo] || "Não informado");
      if (valor !== filtroGrafico.valor) return false;
    }
    return true;
  });

  const serieMensal = contarPor(registrosOcorrenciasFiltrados, (item) =>
    chaveMesAno(item.data),
  )
    .sort((a, b) => a.label.localeCompare(b.label))
    .map((item) => ({
      ...item,
      label: `${mesCurto(item.label)}/${item.label.slice(2, 4)}`,
      chave: item.label,
    }));
  const rankingTipo = contarPor(registrosOcorrenciasFiltrados, (item) => item.tipo);
  const rankingStatus = contarPor(registrosOcorrenciasFiltrados, (item) => item.status);
  const rankingNatureza = contarPor(registrosOcorrenciasFiltrados, (item) => item.natureza).slice(0, 12);
  const rankingSubNatureza = contarPor(registrosOcorrenciasFiltrados, (item) => item.subNatureza).slice(0, 12);
  const camerasBi = dados?.camerasCftv.cameras || [];
  const unidadesCftv = dados?.camerasCftv.unidades?.length
    ? dados.camerasCftv.unidades
    : Array.from(new Set(camerasBi.map((item) => item.unidade))).sort();
  const camerasFiltradas = camerasBi.filter((item) => {
    if (filtroUnidadeCftv !== "Todos" && item.unidade !== filtroUnidadeCftv) return false;
    if (filtroCftv && String(item[filtroCftv.campo] || "Não informado") !== filtroCftv.valor) return false;
    return true;
  });
  const rankingStatusCftv = contarPor(camerasFiltradas, (item) => item.status);
  const rankingTiposCftv = contarPor(camerasFiltradas, (item) => item.tipoCamera).slice(0, 12);
  const rankingTecnologiasCftv = contarPor(camerasFiltradas, (item) => item.tecnologia).slice(0, 12);
  const rankingAreasCftv = contarPor(camerasFiltradas, (item) => item.areaMonitorada).slice(0, 12);
  const rankingCamerasCftv = [...camerasFiltradas]
    .sort((a, b) => b.totalFalhas - a.totalFalhas || b.totalIndisponibilidade - a.totalIndisponibilidade)
    .slice(0, 12)
    .map((item) => ({
      label: `${item.numeroCamera}${item.nomeCamera ? ` - ${item.nomeCamera}` : ""}`,
      valor: item.totalFalhas,
      chave: String(item.id),
    }));
  const camerasConectadasBi = camerasFiltradas.filter((item) => item.status === "Conectada").length;
  const disponibilidadeCftv = camerasFiltradas.length
    ? ((camerasConectadasBi / camerasFiltradas.length) * 100).toFixed(1).replace(".", ",")
    : "0,0";

  function limparFiltrosBi() {
    setFiltroUnidade("Todos");
    setFiltroTipoRegistro("Todos");
    setFiltroMesAno("Todos");
    setFiltroGrafico(null);
  }

  function limparFiltrosCftv() {
    setFiltroUnidadeCftv("Todos");
    setFiltroCftv(null);
  }

  const renderOcorrenciasEventosBi = () => (
    <div className="rounded-xl border border-slate-700 bg-slate-950/80 p-3 text-slate-100 shadow-2xl">
      <div className="grid gap-3 xl:grid-cols-[1.1fr_1fr_1fr_1fr]">
        <BiCard titulo="Total de Registros" valor={registrosOcorrenciasFiltrados.length} />
        <label className="rounded-lg border border-slate-700 bg-slate-900 p-3 shadow-[0_12px_28px_rgba(0,0,0,0.24)]">
          <span className="mb-2 block text-center text-sm font-semibold text-slate-200">
            Unidade
          </span>
          <select
            value={filtroUnidade}
            onChange={(event) => {
              setFiltroUnidade(event.target.value);
              setFiltroGrafico(null);
            }}
            className="h-10 w-full rounded-md border border-slate-600 bg-slate-950 px-3 text-sm text-white outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20"
          >
            <option>Todos</option>
            {unidadesBi.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </label>
        <label className="rounded-lg border border-slate-700 bg-slate-900 p-3 shadow-[0_12px_28px_rgba(0,0,0,0.24)]">
          <span className="mb-2 block text-center text-sm font-semibold text-slate-200">
            Tipo do Registro
          </span>
          <select
            value={filtroTipoRegistro}
            onChange={(event) => {
              setFiltroTipoRegistro(event.target.value);
              setFiltroGrafico(null);
            }}
            className="h-10 w-full rounded-md border border-slate-600 bg-slate-950 px-3 text-sm text-white outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20"
          >
            <option>Todos</option>
            <option>RE</option>
            <option>RO</option>
            <option>RI</option>
          </select>
        </label>
        <label className="rounded-lg border border-slate-700 bg-slate-900 p-3 shadow-[0_12px_28px_rgba(0,0,0,0.24)]">
          <span className="mb-2 block text-center text-sm font-semibold text-slate-200">
            Mês / Ano
          </span>
          <select
            value={filtroMesAno}
            onChange={(event) => {
              setFiltroMesAno(event.target.value);
              setFiltroGrafico(null);
            }}
            className="h-10 w-full rounded-md border border-slate-600 bg-slate-950 px-3 text-sm text-white outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20"
          >
            <option>Todos</option>
            {mesesBi.map((item) => (
              <option key={item} value={item}>
                {rotuloMesAno(item)}
              </option>
            ))}
          </select>
        </label>
      </div>

      {(filtroGrafico || filtroUnidade !== "Todos" || filtroTipoRegistro !== "Todos" || filtroMesAno !== "Todos") && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-blue-500/40 bg-blue-500/10 px-3 py-2 text-xs font-bold text-blue-200">
          <span>
            Filtros ativos
            {filtroGrafico ? `: ${String(filtroGrafico.valor)}` : ""}
          </span>
          <button
            type="button"
            onClick={limparFiltrosBi}
            className="inline-flex items-center gap-1 rounded-md border border-blue-400/40 bg-slate-900 px-2 py-1 text-blue-200 shadow-sm hover:bg-slate-800"
          >
            <X size={14} />
            Limpar filtros
          </button>
        </div>
      )}

      <div className="mt-3 grid gap-3 xl:grid-cols-[1.45fr_0.8fr_0.75fr_0.75fr]">
        <BiPanel titulo="Registros por mês">
          <BarrasVerticais
            itens={serieMensal}
            ativo={
              filtroGrafico?.campo === "mesAno"
                ? serieMensal.find((item) => item.chave === filtroGrafico.valor)?.label
                : undefined
            }
            onSelect={(item) => {
              setFiltroGrafico(item.chave ? { campo: "mesAno", valor: item.chave } : null);
            }}
          />
        </BiPanel>
        <BiPanel titulo="Sub Natureza">
          <BarrasHorizontais
            itens={rankingSubNatureza}
            ativo={filtroGrafico?.campo === "subNatureza" ? filtroGrafico.valor : undefined}
            onSelect={(valor) => setFiltroGrafico({ campo: "subNatureza", valor })}
          />
        </BiPanel>
        <BiPanel titulo="Tipo do Registro">
          <BarrasVerticais
            itens={rankingTipo}
            ativo={filtroGrafico?.campo === "tipo" ? filtroGrafico.valor : undefined}
            onSelect={(item) => setFiltroGrafico({ campo: "tipo", valor: item.label })}
          />
        </BiPanel>
        <BiPanel titulo="Status">
          <BarrasHorizontais
            itens={rankingStatus}
            ativo={filtroGrafico?.campo === "status" ? filtroGrafico.valor : undefined}
            onSelect={(valor) => setFiltroGrafico({ campo: "status", valor })}
            cor="bg-green-600"
          />
        </BiPanel>
      </div>

      <div className="mt-3 grid gap-3 xl:grid-cols-[minmax(0,1fr)_0.38fr]">
        <BiPanel titulo="Registros gerados" className="min-h-[265px]">
          <div className="max-h-[248px] overflow-auto pr-1">
            <table className="min-w-[980px] w-full border-collapse text-left text-[11px] text-slate-300">
              <thead className="sticky top-0 z-10 bg-slate-800 text-slate-100 shadow-sm">
                <tr>
                  {[
                    "Nº",
                    "Tipo",
                    "Unidade",
                    "Resumo",
                    "Data",
                    "Ações a serem tomadas",
                    "Responsável",
                    "Data Resolução",
                    "Status",
                    "Dias",
                  ].map((coluna) => (
                    <th key={coluna} className="border-b border-blue-500/40 px-2 py-2 font-semibold">
                      {coluna}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {registrosOcorrenciasFiltrados.map((item) => (
                  <tr key={item.id} className="align-top odd:bg-slate-900 even:bg-slate-800/45 hover:bg-blue-500/10">
                    <td className="border-b border-slate-700 px-2 py-2 font-bold text-sky-300">
                      {item.codigo}
                    </td>
                    <td className="border-b border-slate-700 px-2 py-2 font-semibold text-white">{item.tipo}</td>
                    <td className="border-b border-slate-700 px-2 py-2">{item.unidade}</td>
                    <td className="border-b border-slate-700 px-2 py-2">{item.resumo}</td>
                    <td className="border-b border-slate-700 px-2 py-2">{formatarDataCurta(item.data)}</td>
                    <td className="border-b border-slate-700 px-2 py-2">{item.acoesTomadas}</td>
                    <td className="border-b border-slate-700 px-2 py-2">{item.responsavelTratativas || "-"}</td>
                    <td className="border-b border-slate-700 px-2 py-2">{formatarDataCurta(item.dataResolucao)}</td>
                    <td className="border-b border-slate-700 px-2 py-2">{item.status}</td>
                    <td className="border-b border-slate-700 px-2 py-2 text-right">{item.diasParaResolucao ?? "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </BiPanel>

        <BiPanel titulo="Natureza" className="min-h-[265px]">
          <BarrasHorizontais
            itens={rankingNatureza}
            ativo={filtroGrafico?.campo === "natureza" ? filtroGrafico.valor : undefined}
            onSelect={(valor) => setFiltroGrafico({ campo: "natureza", valor })}
          />
        </BiPanel>
      </div>
    </div>
  );

  const renderCamerasCftvBi = () => {
    const percentualConectadas = camerasFiltradas.length
      ? (camerasConectadasBi / camerasFiltradas.length) * 100
      : 0;

    return (
      <div className="rounded-xl border border-slate-700 bg-slate-950/80 p-3 text-slate-100 shadow-2xl">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <BiCard titulo="Total de câmeras" valor={camerasFiltradas.length} />
          <BiCard titulo="Câmeras conectadas" valor={camerasConectadasBi} />
          <BiCard titulo="Disponibilidade atual" valor={`${disponibilidadeCftv}%`} />
          <label className="rounded-lg border border-slate-700 bg-slate-900 p-3 shadow-[0_12px_28px_rgba(0,0,0,0.24)]">
            <span className="mb-2 block text-center text-sm font-semibold text-slate-200">
              Unidade
            </span>
            <select
              value={filtroUnidadeCftv}
              onChange={(event) => {
                setFiltroUnidadeCftv(event.target.value);
                setFiltroCftv(null);
              }}
              className="h-10 w-full rounded-md border border-slate-600 bg-slate-950 px-3 text-sm text-white outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20"
            >
              <option>Todos</option>
              {unidadesCftv.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </label>
        </div>

        {(filtroCftv || filtroUnidadeCftv !== "Todos") && (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-blue-500/40 bg-blue-500/10 px-3 py-2 text-xs font-bold text-blue-200">
            <span>
              Filtros ativos{filtroCftv ? `: ${filtroCftv.valor}` : ""}
            </span>
            <button
              type="button"
              onClick={limparFiltrosCftv}
              className="inline-flex items-center gap-1 rounded-md border border-blue-400/40 bg-slate-900 px-2 py-1 text-blue-200 shadow-sm hover:bg-slate-800"
            >
              <X size={14} />
              Limpar filtros
            </button>
          </div>
        )}

        <div className="mt-3 grid gap-3 xl:grid-cols-[0.8fr_1.1fr_1.1fr]">
          <BiPanel titulo="Status das câmeras">
            <div className="flex h-36 items-center justify-center gap-6">
              <button
                type="button"
                onClick={() => setFiltroCftv(null)}
                className="relative h-28 w-28 shrink-0 rounded-full shadow-[0_0_24px_rgba(34,197,94,0.15)]"
                style={{
                  background: `conic-gradient(#22c55e 0 ${percentualConectadas}%, #ef4444 ${percentualConectadas}% 100%)`,
                }}
                title="Limpar filtro de status"
              >
                <span className="absolute inset-[18px] flex flex-col items-center justify-center rounded-full bg-slate-900 text-white">
                  <strong className="text-lg">{disponibilidadeCftv}%</strong>
                  <span className="text-[9px] text-slate-400">online</span>
                </span>
              </button>
              <div className="min-w-0 space-y-2">
                {rankingStatusCftv.map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => setFiltroCftv({ campo: "status", valor: item.label })}
                    className={`flex w-full items-center justify-between gap-3 rounded-md px-2 py-1 text-left text-xs ${
                      filtroCftv?.campo === "status" && filtroCftv.valor === item.label
                        ? "bg-blue-500/20 ring-1 ring-blue-400"
                        : "hover:bg-slate-800"
                    }`}
                  >
                    <span className="flex items-center gap-2 text-slate-200">
                      <span className={`h-2.5 w-2.5 rounded-full ${item.label === "Conectada" ? "bg-green-500" : "bg-red-500"}`} />
                      {item.label}
                    </span>
                    <strong className="text-white">{item.valor}</strong>
                  </button>
                ))}
              </div>
            </div>
          </BiPanel>

          <BiPanel titulo="Tipos de câmeras">
            <BarrasHorizontais
              itens={rankingTiposCftv}
              ativo={filtroCftv?.campo === "tipoCamera" ? filtroCftv.valor : undefined}
              onSelect={(valor) => setFiltroCftv({ campo: "tipoCamera", valor })}
              cor="bg-blue-500"
            />
          </BiPanel>

          <BiPanel titulo="Tecnologias">
            <BarrasHorizontais
              itens={rankingTecnologiasCftv}
              ativo={filtroCftv?.campo === "tecnologia" ? filtroCftv.valor : undefined}
              onSelect={(valor) => setFiltroCftv({ campo: "tecnologia", valor })}
              cor="bg-violet-500"
            />
          </BiPanel>
        </div>

        <div className="mt-3 grid gap-3 xl:grid-cols-[minmax(0,1fr)_0.42fr]">
          <BiPanel titulo="Câmeras cadastradas" className="min-h-[330px]">
            <div className="max-h-[310px] overflow-auto pr-1">
              <table className="w-full min-w-[1040px] border-collapse text-left text-[11px] text-slate-300">
                <thead className="sticky top-0 z-10 bg-slate-800 text-slate-100 shadow-sm">
                  <tr>
                    {["Nº câmera", "Servidor", "Unidade", "Tipo", "Tecnologia", "Status", "Local instalado", "Área monitorada", "Falhas", "Indisp. (min)"].map((coluna) => (
                      <th key={coluna} className="border-b border-blue-500/40 px-2 py-2 font-semibold">
                        {coluna}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {camerasFiltradas.map((camera) => (
                    <tr key={camera.id} className="align-top odd:bg-slate-900 even:bg-slate-800/45 hover:bg-blue-500/10">
                      <td className="border-b border-slate-700 px-2 py-2 font-bold text-sky-300">
                        {camera.numeroCamera}
                        {camera.nomeCamera && <span className="ml-1 font-normal text-slate-400">{camera.nomeCamera}</span>}
                      </td>
                      <td className="border-b border-slate-700 px-2 py-2">{camera.numeroServidor}</td>
                      <td className="border-b border-slate-700 px-2 py-2">{camera.unidade}</td>
                      <td className="border-b border-slate-700 px-2 py-2">{camera.tipoCamera}</td>
                      <td className="border-b border-slate-700 px-2 py-2">{camera.tecnologia}</td>
                      <td className="border-b border-slate-700 px-2 py-2">
                        <span className={`inline-flex rounded-full px-2 py-0.5 font-bold ${camera.status === "Conectada" ? "bg-green-500/15 text-green-300" : "bg-red-500/15 text-red-300"}`}>
                          {camera.status}
                        </span>
                      </td>
                      <td className="border-b border-slate-700 px-2 py-2">{camera.localInstalado}</td>
                      <td className="border-b border-slate-700 px-2 py-2">{camera.areaMonitorada}</td>
                      <td className="border-b border-slate-700 px-2 py-2 text-right">{camera.totalFalhas}</td>
                      <td className="border-b border-slate-700 px-2 py-2 text-right">{camera.totalIndisponibilidade}</td>
                    </tr>
                  ))}
                  {camerasFiltradas.length === 0 && (
                    <tr>
                      <td colSpan={10} className="px-4 py-10 text-center text-sm text-slate-400">
                        Nenhuma câmera encontrada para os filtros selecionados.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </BiPanel>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-1">
            <BiPanel titulo="Áreas monitoradas">
              <BarrasHorizontais
                itens={rankingAreasCftv}
                ativo={filtroCftv?.campo === "areaMonitorada" ? filtroCftv.valor : undefined}
                onSelect={(valor) => setFiltroCftv({ campo: "areaMonitorada", valor })}
                cor="bg-cyan-500"
              />
            </BiPanel>
            <BiPanel titulo="Ranking de falhas por câmera">
              <BarrasHorizontais
                itens={rankingCamerasCftv}
                ativo={
                  filtroCftv?.campo === "id"
                    ? rankingCamerasCftv.find((item) => item.chave === filtroCftv.valor)?.label
                    : undefined
                }
                onSelect={(valor) => {
                  const camera = rankingCamerasCftv.find((item) => item.label === valor);
                  if (camera?.chave) setFiltroCftv({ campo: "id", valor: camera.chave });
                }}
                cor="bg-amber-500"
              />
            </BiPanel>
          </div>
        </div>
      </div>
    );
  };

  const conteudo = (
    <div
      className={`min-h-screen bg-slate-950 text-white ${
        estendido ? "fixed inset-0 z-[80] overflow-y-auto p-4 sm:p-6" : "rounded-3xl border border-slate-800 p-4 shadow-2xl sm:p-6"
      }`}
    >
      <div className="mb-5 flex flex-col gap-4 border-b border-slate-800 pb-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-4">
          <div className={`flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${aba.cor} shadow-lg`}>
            <IconeAba size={28} />
          </div>
          <div>
            <p className="text-xs font-black uppercase tracking-[0.32em] text-blue-300">
              Segurança empresarial
            </p>
            <h1 className="text-2xl font-black text-white sm:text-3xl">
              Indicadores Segurança Empresarial
            </h1>
            <p className="text-sm text-slate-300">
              Painel consolidado para acompanhamento contínuo do setor.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="rounded-2xl border border-slate-700 bg-slate-900/70 px-4 py-2">
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400">
              Unidade
            </p>
            <p className="text-sm font-black text-white">{dados?.unidade || "--"}</p>
          </div>
          <div className="rounded-2xl border border-slate-700 bg-slate-900/70 px-4 py-2">
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400">
              Atualizado
            </p>
            <p className="text-sm font-black text-white">{formatarData(dados?.atualizadoEm)}</p>
          </div>
          <button
            type="button"
            onClick={carregarIndicadores}
            className="inline-flex h-11 items-center gap-2 rounded-2xl border border-slate-700 bg-slate-900 px-4 text-sm font-bold text-slate-100 transition hover:border-blue-400 hover:bg-blue-600"
          >
            <RefreshCw size={16} />
            Atualizar
          </button>
          <button
            type="button"
            onClick={() => setEstendido((valor) => !valor)}
            className="inline-flex h-11 items-center gap-2 rounded-2xl bg-blue-600 px-4 text-sm font-black text-white shadow-lg shadow-blue-950/30 transition hover:bg-blue-500"
          >
            {estendido ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            {estendido ? "Sair da tela estendida" : "Estender tela"}
          </button>
        </div>
      </div>

      <div className="mb-5 flex gap-2 overflow-x-auto pb-2 [scrollbar-width:thin]">
        {abas.map((item) => {
          const Icone = item.icone;
          const ativo = item.id === abaAtiva;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setAbaAtiva(item.id)}
              className={`flex min-w-[220px] items-center gap-3 rounded-2xl border px-4 py-3 text-left transition ${
                ativo
                  ? "border-blue-400 bg-blue-600/20 text-white"
                  : "border-slate-800 bg-slate-900/70 text-slate-300 hover:border-slate-600"
              }`}
            >
              <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${item.cor}`}>
                <Icone size={20} />
              </span>
              <span>
                <span className="block text-sm font-black">{item.titulo}</span>
                <span className="block text-xs text-slate-400">{item.subtitulo}</span>
              </span>
            </button>
          );
        })}
      </div>

      {erro && (
        <div className="mb-5 rounded-2xl border border-red-500/40 bg-red-950/50 px-4 py-3 text-sm font-bold text-red-100">
          {erro}
        </div>
      )}

      {carregando ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="h-32 animate-pulse rounded-2xl border border-slate-800 bg-slate-900" />
          ))}
        </div>
      ) : abaAtiva === "ocorrenciasEventos" ? (
        renderOcorrenciasEventosBi()
      ) : abaAtiva === "camerasCftv" ? (
        renderCamerasCftvBi()
      ) : (
        <>
          <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
            {(bloco?.cards || []).map((card) => (
              <div
                key={card.titulo}
                className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 shadow-lg shadow-slate-950/30"
              >
                <div className="mb-4 flex items-center justify-between gap-3">
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
                    {card.titulo}
                  </p>
                  <TrendingUp size={18} className="text-blue-300" />
                </div>
                <p className="text-3xl font-black text-white">{card.valor}</p>
                {card.detalhe && <p className="mt-2 text-xs text-slate-400">{card.detalhe}</p>}
              </div>
            ))}
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            {rankings.map(([titulo, itens]) => (
              <div
                key={titulo}
                className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 shadow-lg shadow-slate-950/30"
              >
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.22em] text-blue-300">
                      Ranking
                    </p>
                    <h2 className="text-lg font-black text-white">
                      {normalizarTitulo(titulo)}
                    </h2>
                  </div>
                  <BarChart3 className="text-slate-400" size={22} />
                </div>
                {itens.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-700 px-4 py-8 text-center text-sm text-slate-400">
                    Nenhum dado encontrado para este indicador.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {itens.map((item, index) => {
                      const maior = Math.max(...itens.map((registro) => registro.valor), 1);
                      const largura = Math.max(8, (item.valor / maior) * 100);
                      return (
                        <div key={`${item.label}-${index}`}>
                          <div className="mb-1 flex items-center justify-between gap-3 text-sm">
                            <span className="line-clamp-1 font-bold text-slate-100">
                              {item.label}
                            </span>
                            <span className="font-black text-white">{item.valor}</span>
                          </div>
                          <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                            <div
                              className={`h-full rounded-full bg-gradient-to-r ${aba.cor}`}
                              style={{ width: `${largura}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );

  if (estendido) {
    return conteudo;
  }

  return <div className="bg-slate-950 p-3 sm:p-6">{conteudo}</div>;
}
