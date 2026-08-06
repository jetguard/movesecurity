import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  BarChart3,
  Camera,
  FileBadge,
  FileText,
  Fingerprint,
  Gauge,
  MapPinned,
  ShieldAlert,
  TrendingUp,
} from "lucide-react";
import { api } from "../services/api";

type Resumo = {
  indicadores: Record<string, number>;
  criticidade: Array<{
    id: number;
    tipo: string;
    codigo: string;
    assunto: string;
    local: string;
    natureza: string;
    subNatureza: string;
    status: string;
    criticidade: { nivel: string; pontos: number; motivos: string[] };
  }>;
  cadeiaCustodia: {
    totalEvidencias: number;
    evidenciasSemHash: number;
    amostras: Array<{
      id: string;
      modulo: string;
      codigo: string;
      titulo: string;
      arquivo: string;
      tipo: string;
      hashSha256?: string | null;
      eventosCustodia: Array<{ acao: string; usuario: string; data: string }>;
    }>;
  };
  sla: Record<string, number>;
  mapaTerminal: Array<{
    area: string;
    ocorrenciasEventos: number;
    cameras: number;
    camerasOffline: number;
    riscos: number;
    riscosCriticos: number;
    indiceCriticidade: number;
    nivel: string;
  }>;
  reincidencia: {
    porNatureza: Array<{ nome: string; total: number }>;
    porSubNatureza: Array<{ nome: string; total: number }>;
    porLocal: Array<{ nome: string; total: number }>;
    envolvidosRecorrentes: Array<{
      nome: string;
      documento: string;
      total: number;
      registros: string[];
    }>;
    camerasInstaveis: Array<{
      camera: number;
      servidor: number;
      area: string;
      falhas: number;
      indisponibilidadeMinutos: number;
      status: string;
    }>;
  };
  relatoriosExecutivos: {
    resumo: string;
    recomendacoes: string[];
  };
};

function cardCor(valor: string) {
  if (valor === "Crítica") return "border-red-200 bg-red-50 text-red-700";
  if (valor === "Alta" || valor === "Atenção")
    return "border-orange-200 bg-orange-50 text-orange-700";
  if (valor === "Moderada")
    return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-emerald-200 bg-emerald-50 text-emerald-700";
}

function numero(valor?: number) {
  return Number(valor || 0).toLocaleString("pt-BR");
}

export default function GestaoPatrimonialAvancada() {
  const [dados, setDados] = useState<Resumo | null>(null);
  const [aba, setAba] = useState("visao");
  const [carregando, setCarregando] = useState(false);

  async function carregar() {
    setCarregando(true);
    try {
      const response = await api.get("/patrimonio-avancado/resumo");
      setDados(response.data);
    } finally {
      setCarregando(false);
    }
  }

  async function baixarRelatorio() {
    const response = await api.get(
      "/patrimonio-avancado/relatorio-executivo/pdf",
      { responseType: "blob" },
    );
    const url = URL.createObjectURL(
      new Blob([response.data], { type: "application/pdf" }),
    );
    window.open(url, "_blank");
  }

  useEffect(() => {
    carregar();
  }, []);

  const maiorIndice = useMemo(
    () =>
      Math.max(
        ...(dados?.mapaTerminal.map((item) => item.indiceCriticidade) || [1]),
        1,
      ),
    [dados],
  );

  if (!dados) {
    return (
      <div className="rounded-2xl bg-white p-8 text-center text-slate-500 shadow">
        {carregando
          ? "Carregando gestão patrimonial avançada..."
          : "Nenhum dado encontrado."}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-bold uppercase tracking-wide text-blue-600">
            Terminal alfandegado
          </p>
          <h1 className="mt-1 text-3xl font-bold text-slate-900">
            Gestão Patrimonial Avançada
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Cadeia de custódia, SLA, mapa operacional, reincidência, criticidade
            e relatórios executivos.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={carregar}
            className="rounded-lg bg-white px-4 py-3 font-semibold text-slate-700 shadow"
          >
            {carregando ? "Atualizando..." : "Atualizar"}
          </button>
          <button
            onClick={baixarRelatorio}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white shadow"
          >
            <FileText size={18} /> Relatório Executivo
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-6">
        <div className="rounded-xl bg-white p-5 shadow">
          <FileBadge className="text-blue-600" />
          <p className="mt-3 text-sm text-slate-500">Registros</p>
          <p className="text-3xl font-bold">
            {numero(dados.indicadores.registros)}
          </p>
        </div>
        <div className="rounded-xl bg-white p-5 shadow">
          <ShieldAlert className="text-red-600" />
          <p className="mt-3 text-sm text-slate-500">Críticos</p>
          <p className="text-3xl font-bold text-red-600">
            {numero(dados.indicadores.criticidadeCritica)}
          </p>
        </div>
        <div className="rounded-xl bg-white p-5 shadow">
          <Fingerprint className="text-indigo-600" />
          <p className="mt-3 text-sm text-slate-500">Evidências</p>
          <p className="text-3xl font-bold">
            {numero(dados.indicadores.evidencias)}
          </p>
        </div>
        <div className="rounded-xl bg-white p-5 shadow">
          <Gauge className="text-amber-600" />
          <p className="mt-3 text-sm text-slate-500">SLA Pend.</p>
          <p className="text-3xl font-bold text-amber-600">
            {numero(dados.indicadores.slaPendencias)}
          </p>
        </div>
        <div className="rounded-xl bg-white p-5 shadow">
          <Camera className="text-slate-700" />
          <p className="mt-3 text-sm text-slate-500">CÃ¢meras offline</p>
          <p className="text-3xl font-bold">
            {numero(dados.indicadores.camerasOffline)}
          </p>
        </div>
        <div className="rounded-xl bg-white p-5 shadow">
          <TrendingUp className="text-emerald-600" />
          <p className="mt-3 text-sm text-slate-500">Riscos críticos</p>
          <p className="text-3xl font-bold text-emerald-600">
            {numero(dados.indicadores.riscosCriticos)}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 rounded-xl bg-white p-2 shadow">
        {[
          ["visao", "Visão executiva"],
          ["custodia", "Cadeia de custódia"],
          ["sla", "SLA operacional"],
          ["mapa", "Mapa operacional"],
          ["reincidencia", "Reincidência"],
          ["criticidade", "Criticidade automática"],
        ].map(([id, label]) => (
          <button
            key={id}
            onClick={() => setAba(id)}
            className={`rounded-lg px-4 py-2 text-sm font-semibold ${aba === id ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"}`}
          >
            {label}
          </button>
        ))}
      </div>

      {aba === "visao" && (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <section className="rounded-xl bg-white p-5 shadow xl:col-span-2">
            <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
              <BarChart3 size={18} /> Recomendações executivas
            </h2>
            <div className="mt-4 space-y-3">
              {dados.relatoriosExecutivos.recomendacoes.map((item) => (
                <div
                  key={item}
                  className="rounded-lg border border-blue-100 bg-blue-50 p-3 text-sm text-blue-900"
                >
                  {item}
                </div>
              ))}
            </div>
          </section>
          <section className="rounded-xl bg-white p-5 shadow">
            <h2 className="text-lg font-bold text-slate-900">
              Naturezas recorrentes
            </h2>
            <div className="mt-4 space-y-3">
              {dados.reincidencia.porNatureza.map((item) => (
                <div key={item.nome}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span>{item.nome}</span>
                    <strong>{item.total}</strong>
                  </div>
                  <div className="h-2 rounded bg-slate-100">
                    <div
                      className="h-2 rounded bg-blue-600"
                      style={{ width: `${Math.max(item.total * 12, 10)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}

      {aba === "custodia" && (
        <section className="rounded-xl bg-white p-5 shadow">
          <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
            <Fingerprint size={18} /> Cadeia de custódia de evidências
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Total: {dados.cadeiaCustodia.totalEvidencias} | Sem hash localizado:{" "}
            {dados.cadeiaCustodia.evidenciasSemHash}
          </p>
          <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
            {dados.cadeiaCustodia.amostras.map((item) => (
              <div
                key={item.id}
                className="rounded-xl border border-slate-200 p-4"
              >
                <p className="text-sm font-bold text-blue-600">
                  {item.modulo} {item.codigo}
                </p>
                <h3 className="mt-1 font-bold text-slate-900">
                  {item.arquivo}
                </h3>
                <p className="mt-1 break-all text-xs text-slate-500">
                  Hash SHA-256:{" "}
                  {item.hashSha256 || "arquivo não localizado no servidor"}
                </p>
                <div className="mt-3 space-y-2">
                  {item.eventosCustodia.slice(0, 3).map((evento, index) => (
                    <p
                      key={`${item.id}-${index}`}
                      className="text-xs text-slate-600"
                    >
                      {new Date(evento.data).toLocaleString("pt-BR")} -{" "}
                      {evento.usuario}: {evento.acao}
                    </p>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {aba === "sla" && (
        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Object.entries(dados.sla).map(([chave, valor]) => (
            <div key={chave} className="rounded-xl bg-white p-5 shadow">
              <p className="text-sm text-slate-500">{chave}</p>
              <p className="mt-2 text-3xl font-bold text-slate-900">
                {numero(valor)}
              </p>
            </div>
          ))}
        </section>
      )}

      {aba === "mapa" && (
        <section className="rounded-xl bg-white p-5 shadow">
          <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
            <MapPinned size={18} /> Mapa operacional por área
          </h2>
          <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {dados.mapaTerminal.map((area) => (
              <div
                key={area.area}
                className={`rounded-xl border p-4 ${cardCor(area.nivel)}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-bold">{area.area}</h3>
                  <span className="rounded-full bg-white/70 px-2 py-1 text-xs font-bold">
                    {area.nivel}
                  </span>
                </div>
                <div className="mt-4 h-2 rounded bg-white/70">
                  <div
                    className="h-2 rounded bg-current"
                    style={{
                      width: `${Math.max((area.indiceCriticidade / maiorIndice) * 100, 8)}%`,
                    }}
                  />
                </div>
                <p className="mt-3 text-sm">
                  Registros: {area.ocorrenciasEventos} | Câmeras: {area.cameras}{" "}
                  | Offline: {area.camerasOffline} | Riscos críticos:{" "}
                  {area.riscosCriticos}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {aba === "reincidencia" && (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          {[
            ["Por local", dados.reincidencia.porLocal],
            ["Por subnatureza", dados.reincidencia.porSubNatureza],
            [
              "Câmeras instáveis",
              dados.reincidencia.camerasInstaveis.map((item) => ({
                nome: `Cam ${item.camera} - ${item.area}`,
                total: item.falhas,
              })),
            ],
          ].map(([titulo, lista]) => (
            <section
              key={String(titulo)}
              className="rounded-xl bg-white p-5 shadow"
            >
              <h2 className="text-lg font-bold text-slate-900">
                {String(titulo)}
              </h2>
              <div className="mt-4 space-y-3">
                {(lista as Array<{ nome: string; total: number }>).map(
                  (item) => (
                    <div
                      key={item.nome}
                      className="flex items-center justify-between rounded-lg bg-slate-50 p-3 text-sm"
                    >
                      <span className="truncate">{item.nome}</span>
                      <strong>{item.total}</strong>
                    </div>
                  ),
                )}
              </div>
            </section>
          ))}
          <section className="rounded-xl bg-white p-5 shadow xl:col-span-3">
            <h2 className="text-lg font-bold text-slate-900">
              Envolvidos recorrentes
            </h2>
            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
              {dados.reincidencia.envolvidosRecorrentes.map((item) => (
                <div
                  key={item.documento || item.nome}
                  className="rounded-lg border p-3 text-sm"
                >
                  <strong>{item.nome}</strong>
                  <p className="text-slate-500">
                    {item.documento} | {item.total} registros
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {item.registros.join(", ")}
                  </p>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}

      {aba === "criticidade" && (
        <section className="rounded-xl bg-white p-5 shadow">
          <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
            <AlertTriangle size={18} /> Criticidade automática
          </h2>
          <div className="mt-5 space-y-3">
            {dados.criticidade.map((item) => (
              <div
                key={`${item.tipo}-${item.id}`}
                className={`rounded-xl border p-4 ${cardCor(item.criticidade.nivel)}`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold">
                      {item.tipo} {item.codigo}
                    </p>
                    <h3 className="mt-1 font-bold">{item.assunto}</h3>
                    <p className="mt-1 text-sm">
                      {item.local} | {item.natureza} / {item.subNatureza}
                    </p>
                  </div>
                  <span className="rounded-full bg-white/70 px-3 py-1 text-sm font-bold">
                    {item.criticidade.nivel}
                  </span>
                </div>
                <p className="mt-3 text-sm">
                  Motivos: {item.criticidade.motivos.join("; ")}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
