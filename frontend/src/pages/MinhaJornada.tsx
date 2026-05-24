import { useCallback, useEffect, useMemo, useState } from "react";
import { Activity, CalendarDays, Clock, Filter, Search } from "lucide-react";
import { api } from "../services/api";

type Atividade = {
  id: number;
  acao: string;
  modulo: string;
  registroId?: number | null;
  data: string;
  ip?: string | null;
};

type Jornada = {
  data: string;
  total: number;
  primeiraAtividade?: string | null;
  ultimaAtividade?: string | null;
  modulosUtilizados: number;
  porModulo: Record<string, number>;
  porHora: Record<string, number>;
  atividades: Atividade[];
};

function hoje() {
  return new Date().toISOString().slice(0, 10);
}

function hora(valor?: string | null) {
  if (!valor) return "--:--";
  return new Date(valor).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

export default function MinhaJornada() {
  const [data, setData] = useState(hoje());
  const [modulo, setModulo] = useState("");
  const [busca, setBusca] = useState("");
  const [jornada, setJornada] = useState<Jornada | null>(null);
  const [carregando, setCarregando] = useState(false);

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      const response = await api.get("/logs/minha-jornada", {
        params: { data, modulo, q: busca },
      });
      setJornada(response.data);
    } finally {
      setCarregando(false);
    }
  }, [busca, data, modulo]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const modulos = useMemo(() => Object.keys(jornada?.porModulo || {}).sort(), [jornada]);
  const horas = Object.entries(jornada?.porHora || {}).sort((a, b) => a[0].localeCompare(b[0]));
  const maxHora = Math.max(...horas.map(([, valor]) => valor), 1);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">Minha Jornada</h1>
          <p className="mt-1 text-sm text-slate-500">Resumo das atividades realizadas por você no sistema.</p>
        </div>
        <button onClick={carregar} className="rounded-lg bg-slate-900 px-4 py-2 font-semibold text-white">
          {carregando ? "Atualizando..." : "Atualizar"}
        </button>
      </div>

      <div className="rounded-2xl bg-white p-5 shadow">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <label className="block">
            <span className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
              <CalendarDays size={16} /> Data
            </span>
            <input type="date" className="w-full rounded-lg border p-3" value={data} onChange={(e) => setData(e.target.value)} />
          </label>

          <label className="block">
            <span className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
              <Filter size={16} /> Módulo
            </span>
            <select className="w-full rounded-lg border p-3" value={modulo} onChange={(e) => setModulo(e.target.value)}>
              <option value="">Todos os módulos</option>
              {modulos.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </label>

          <label className="block md:col-span-2">
            <span className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
              <Search size={16} /> Pesquisar ação
            </span>
            <input
              className="w-full rounded-lg border p-3"
              placeholder="Ex: câmera, ocorrência, análise..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
          </label>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="rounded-2xl bg-white p-5 shadow">
          <p className="text-sm text-slate-500">Ações realizadas</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{jornada?.total || 0}</p>
        </div>
        <div className="rounded-2xl bg-white p-5 shadow">
          <p className="text-sm text-slate-500">Módulos usados</p>
          <p className="mt-2 text-3xl font-bold text-blue-600">{jornada?.modulosUtilizados || 0}</p>
        </div>
        <div className="rounded-2xl bg-white p-5 shadow">
          <p className="text-sm text-slate-500">Primeira atividade</p>
          <p className="mt-2 text-3xl font-bold text-emerald-600">{hora(jornada?.primeiraAtividade)}</p>
        </div>
        <div className="rounded-2xl bg-white p-5 shadow">
          <p className="text-sm text-slate-500">Última atividade</p>
          <p className="mt-2 text-3xl font-bold text-amber-600">{hora(jornada?.ultimaAtividade)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <section className="rounded-2xl bg-white p-5 shadow lg:col-span-2">
          <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
            <Clock size={18} /> Linha do tempo
          </h2>
          <div className="mt-5 space-y-4">
            {jornada?.atividades.length === 0 ? (
              <p className="rounded-xl bg-slate-50 p-5 text-center text-slate-500">Nenhuma atividade encontrada para os filtros selecionados.</p>
            ) : (
              jornada?.atividades.map((atividade) => (
                <div key={atividade.id} className="relative rounded-xl border border-slate-200 bg-white p-4 pl-12 shadow-sm">
                  <span className="absolute left-4 top-5 flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-blue-700">
                    <Activity size={14} />
                  </span>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-bold text-slate-900">{atividade.acao}</p>
                      <p className="mt-1 text-sm text-slate-500">
                        {atividade.modulo} {atividade.registroId ? `#${atividade.registroId}` : ""}
                      </p>
                    </div>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-700">
                      {new Date(atividade.data).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        <aside className="space-y-4">
          <section className="rounded-2xl bg-white p-5 shadow">
            <h2 className="text-lg font-bold text-slate-900">Por módulo</h2>
            <div className="mt-4 space-y-3">
              {Object.entries(jornada?.porModulo || {}).map(([nome, valor]) => (
                <div key={nome}>
                  <div className="mb-1 flex justify-between gap-3 text-sm">
                    <span className="truncate text-slate-600">{nome}</span>
                    <strong>{valor}</strong>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100">
                    <div className="h-2 rounded-full bg-blue-600" style={{ width: `${Math.max((valor / Math.max(jornada?.total || 1, 1)) * 100, 8)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-2xl bg-white p-5 shadow">
            <h2 className="text-lg font-bold text-slate-900">Movimento por hora</h2>
            <div className="mt-4 flex h-40 items-end gap-2 overflow-x-auto">
              {horas.length === 0 ? (
                <p className="self-start text-sm text-slate-500">Sem movimento.</p>
              ) : (
                horas.map(([nome, valor]) => (
                  <div key={nome} className="flex min-w-10 flex-col items-center gap-2">
                    <div className="w-5 rounded-t bg-emerald-500" style={{ height: `${Math.max((valor / maxHora) * 120, 8)}px` }} />
                    <span className="text-[10px] text-slate-500">{nome.slice(0, 2)}</span>
                  </div>
                ))
              )}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
