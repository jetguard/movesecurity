import { useCallback, useEffect, useMemo, useState } from "react";
import { Activity, CalendarDays, Clock, Filter, Search } from "lucide-react";
import { api } from "../services/api";

type Atividade = {
  id: number;
  acao: string;
  modulo: string;
  moduloCodigo?: string;
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
  modulosDisponiveis: Array<{ valor: string; label: string; total: number }>;
  porModulo: Record<string, number>;
  porHora: Record<string, number>;
  atividades: Atividade[];
};

function hoje() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
  }).format(new Date());
}

function hora(valor?: string | null) {
  if (!valor) return "--:--";
  return new Date(valor).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
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

  const horas = Object.entries(jornada?.porHora || {}).sort((a, b) =>
    a[0].localeCompare(b[0]),
  );
  const maxHora = Math.max(...horas.map(([, valor]) => valor), 1);
  const modulosOrdenados = useMemo(
    () => Object.entries(jornada?.porModulo || {}).sort((a, b) => b[1] - a[1]),
    [jornada],
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white sm:text-3xl">
            Minha Jornada
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Resumo auditável das atividades realizadas por você no JetGuard.
          </p>
        </div>
        <button
          onClick={carregar}
          className="rounded-lg bg-slate-900 px-4 py-2 font-semibold text-white"
        >
          {carregando ? "Atualizando..." : "Atualizar"}
        </button>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <label className="block">
            <span className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-200">
              <CalendarDays size={16} /> Data
            </span>
            <input
              type="date"
              className="w-full rounded-lg border border-slate-700 bg-slate-950 p-3 text-white"
              value={data}
              onChange={(e) => setData(e.target.value)}
            />
          </label>

          <label className="block">
            <span className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-200">
              <Filter size={16} /> Módulo
            </span>
            <select
              className="w-full rounded-lg border border-slate-700 bg-slate-950 p-3 text-white"
              value={modulo}
              onChange={(e) => setModulo(e.target.value)}
            >
              <option value="">Todos os módulos</option>
              {(jornada?.modulosDisponiveis || []).map((item) => (
                <option key={item.valor} value={item.valor}>
                  {item.label} ({item.total})
                </option>
              ))}
            </select>
          </label>

          <label className="block md:col-span-2">
            <span className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-200">
              <Search size={16} /> Pesquisar ação
            </span>
            <input
              className="w-full rounded-lg border border-slate-700 bg-slate-950 p-3 text-white placeholder:text-slate-600"
              placeholder="Ex: câmera, ocorrência, análise..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
          </label>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow">
          <p className="text-sm text-slate-400">Ações registradas</p>
          <p className="mt-2 text-3xl font-bold text-white">
            {jornada?.total || 0}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow">
          <p className="text-sm text-slate-400">Módulos utilizados</p>
          <p className="mt-2 text-3xl font-bold text-blue-600">
            {jornada?.modulosUtilizados || 0}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow">
          <p className="text-sm text-slate-400">Primeira atividade</p>
          <p className="mt-2 text-3xl font-bold text-emerald-600">
            {hora(jornada?.primeiraAtividade)}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow">
          <p className="text-sm text-slate-400">Ãšltima atividade</p>
          <p className="mt-2 text-3xl font-bold text-amber-600">
            {hora(jornada?.ultimaAtividade)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow lg:col-span-2">
          <h2 className="flex items-center gap-2 text-lg font-bold text-white">
            <Clock size={18} /> Linha do tempo
          </h2>
          <div className="mt-5 space-y-4">
            {jornada?.atividades.length === 0 ? (
              <p className="rounded-xl bg-slate-950 p-5 text-center text-slate-400">
                Nenhuma atividade encontrada para os filtros selecionados.
              </p>
            ) : (
              jornada?.atividades.map((atividade) => (
                <div
                  key={atividade.id}
                  className="relative rounded-xl border border-slate-800 bg-slate-950/70 p-4 pl-12 shadow-sm"
                >
                  <span className="absolute left-4 top-5 flex h-6 w-6 items-center justify-center rounded-full bg-blue-500/15 text-blue-300">
                    <Activity size={14} />
                  </span>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-bold text-white">{atividade.acao}</p>
                      <p className="mt-1 text-sm text-slate-400">
                        {atividade.modulo}{" "}
                        {atividade.registroId ? `#${atividade.registroId}` : ""}
                      </p>
                    </div>
                    <span className="rounded-full bg-slate-800 px-3 py-1 text-sm font-semibold text-slate-200">
                      {new Date(atividade.data).toLocaleTimeString("pt-BR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        <aside className="space-y-4">
          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow">
            <h2 className="text-lg font-bold text-white">
              Atividades por módulo
            </h2>
            <p className="mt-1 text-xs leading-5 text-slate-400">
              Distribui suas ações entre as áreas do JetGuard no período
              filtrado.
            </p>
            <div className="mt-4 space-y-3">
              {modulosOrdenados.length === 0 ? (
                <p className="text-sm text-slate-500">
                  Nenhuma atividade para contabilizar.
                </p>
              ) : (
                modulosOrdenados.map(([nome, valor]) => (
                  <div key={nome}>
                    <div className="mb-1 flex justify-between gap-3 text-sm">
                      <span className="truncate text-slate-300">{nome}</span>
                      <strong className="text-white">{valor}</strong>
                    </div>
                    <div className="h-2 rounded-full bg-slate-800">
                      <div
                        className="h-2 rounded-full bg-blue-600"
                        style={{
                          width: `${Math.max((valor / Math.max(jornada?.total || 1, 1)) * 100, 8)}%`,
                        }}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow">
            <h2 className="text-lg font-bold text-white">
              Atividades por horário
            </h2>
            <p className="mt-1 text-xs leading-5 text-slate-400">
              Quantidade de ações registradas em cada hora, considerando o
              horário de Brasília.
            </p>
            <div className="mt-4 flex h-44 items-end gap-2 overflow-x-auto pb-2">
              {horas.length === 0 ? (
                <p className="self-start text-sm text-slate-500">
                  Sem movimento.
                </p>
              ) : (
                horas.map(([nome, valor]) => (
                  <div
                    key={nome}
                    className="flex min-w-10 flex-col items-center gap-1"
                    title={`${nome}: ${valor} ação(ões)`}
                  >
                    <span
                      className={`text-[10px] font-bold ${valor ? "text-emerald-300" : "text-slate-700"}`}
                    >
                      {valor}
                    </span>
                    <div
                      className={`w-5 rounded-t ${valor ? "bg-emerald-500" : "bg-slate-800"}`}
                      style={{
                        height: valor
                          ? `${Math.max((valor / maxHora) * 108, 8)}px`
                          : "2px",
                      }}
                    />
                    <span className="text-[10px] text-slate-500">
                      {nome.slice(0, 2)}h
                    </span>
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
