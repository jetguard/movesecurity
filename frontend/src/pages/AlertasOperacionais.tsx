import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, BellRing, CheckCircle2, Clock, RadioTower, RefreshCcw, ShieldAlert } from "lucide-react";
import { api } from "../services/api";

type AlertaOperacional = {
  id: string;
  tipo: string;
  titulo: string;
  mensagem: string;
  severidade: string;
  link: string;
  createdAt: string;
  lida?: boolean;
  lidaEm?: string | null;
};

function prioridade(alerta: AlertaOperacional) {
  if (alerta.severidade === "alta") return "Crítico";
  if (alerta.severidade === "media") return "Atenção";
  return "Informativo";
}

function estilo(prioridadeAtual: string) {
  if (prioridadeAtual === "Crítico") return "border-red-500/40 bg-red-500/10 text-red-100";
  if (prioridadeAtual === "Atenção") return "border-amber-500/40 bg-amber-500/10 text-amber-100";
  return "border-cyan-500/30 bg-cyan-500/10 text-cyan-100";
}

function icone(prioridadeAtual: string) {
  if (prioridadeAtual === "Crítico") return <ShieldAlert size={18} />;
  if (prioridadeAtual === "Atenção") return <AlertTriangle size={18} />;
  return <BellRing size={18} />;
}

export default function AlertasOperacionais() {
  const [alertas, setAlertas] = useState<AlertaOperacional[]>([]);
  const [busca, setBusca] = useState("");
  const [tipo, setTipo] = useState("");
  const [mostrarResolvidos, setMostrarResolvidos] = useState(false);
  const [carregando, setCarregando] = useState(false);

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      const response = await api.get("/gestao/notificacoes", {
        params: { incluirLidas: true },
      });
      setAlertas(response.data);
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    carregar();
    const interval = window.setInterval(carregar, 30000);
    return () => window.clearInterval(interval);
  }, [carregar]);

  async function resolver(alerta: AlertaOperacional) {
    await api.post(`/gestao/notificacoes/${encodeURIComponent(alerta.id)}/lida`);
    setAlertas((atuais) =>
      atuais.map((item) => item.id === alerta.id ? { ...item, lida: true, lidaEm: new Date().toISOString() } : item)
    );
    window.dispatchEvent(new CustomEvent("notificacoes-atualizadas"));
  }

  const alertasFiltrados = alertas.filter((alerta) => {
    const texto = `${alerta.tipo} ${alerta.titulo} ${alerta.mensagem}`.toLowerCase();
    return (
      (mostrarResolvidos || !alerta.lida) &&
      (!tipo || alerta.tipo === tipo) &&
      (!busca || texto.includes(busca.toLowerCase()))
    );
  });

  const tipos = Array.from(new Set(alertas.map((alerta) => alerta.tipo)));
  const grupos = ["Crítico", "Atenção", "Informativo"].map((nome) => ({
    nome,
    itens: alertasFiltrados.filter((alerta) => prioridade(alerta) === nome),
  }));

  const indicadores = useMemo(() => ({
    abertos: alertas.filter((alerta) => !alerta.lida).length,
    criticos: alertas.filter((alerta) => !alerta.lida && prioridade(alerta) === "Crítico").length,
    atencao: alertas.filter((alerta) => !alerta.lida && prioridade(alerta) === "Atenção").length,
    resolvidos: alertas.filter((alerta) => alerta.lida).length,
  }), [alertas]);

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-950 text-white shadow-2xl">
        <div className="border-b border-slate-800 bg-[radial-gradient(circle_at_top_left,rgba(239,68,68,0.20),transparent_36%),linear-gradient(135deg,#020617,#111827)] p-6">
          <p className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-cyan-300">
            <RadioTower size={16} /> Centro de operações
          </p>
          <h1 className="mt-3 text-2xl font-black sm:text-3xl">Central de Alertas Operacionais</h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-300">
            Priorização única de CFTV, pendências, planos de ação, riscos, relatórios e prazos operacionais.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5"><p className="text-sm text-slate-400">Alertas abertos</p><p className="mt-2 text-3xl font-black">{indicadores.abertos}</p></div>
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-5"><p className="text-sm text-red-200">Críticos</p><p className="mt-2 text-3xl font-black text-red-200">{indicadores.criticos}</p></div>
          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5"><p className="text-sm text-amber-200">Atenção</p><p className="mt-2 text-3xl font-black text-amber-200">{indicadores.atencao}</p></div>
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-5"><p className="text-sm text-emerald-200">Resolvidos</p><p className="mt-2 text-3xl font-black text-emerald-200">{indicadores.resolvidos}</p></div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-3 rounded-2xl bg-white p-4 shadow md:grid-cols-4">
        <input className="rounded-xl border p-3 md:col-span-2" placeholder="Buscar alerta, origem ou mensagem" value={busca} onChange={(e) => setBusca(e.target.value)} />
        <select className="rounded-xl border bg-white p-3" value={tipo} onChange={(e) => setTipo(e.target.value)}>
          <option value="">Todas as origens</option>
          {tipos.map((item) => <option key={item}>{item}</option>)}
        </select>
        <div className="flex gap-2">
          <label className="flex flex-1 items-center gap-2 rounded-xl border p-3 text-sm font-semibold text-slate-700">
            <input type="checkbox" checked={mostrarResolvidos} onChange={(e) => setMostrarResolvidos(e.target.checked)} />
            Resolvidos
          </label>
          <button type="button" onClick={carregar} className="rounded-xl bg-slate-900 px-4 text-white" title="Atualizar">
            <RefreshCcw size={17} className={carregando ? "animate-spin" : ""} />
          </button>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        {grupos.map((grupo) => (
          <div key={grupo.nome} className="rounded-2xl border border-slate-200 bg-white p-4 shadow">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-black text-slate-900">{grupo.nome}</h2>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-bold text-slate-600">{grupo.itens.length}</span>
            </div>

            <div className="space-y-3">
              {grupo.itens.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 p-5 text-center text-sm text-slate-500">
                  <CheckCircle2 className="mx-auto mb-2 text-emerald-500" />
                  Nenhum alerta nesta prioridade.
                </div>
              ) : grupo.itens.map((alerta) => {
                const prioridadeAtual = prioridade(alerta);
                return (
                  <article key={alerta.id} className={`rounded-2xl border p-4 ${estilo(prioridadeAtual)}`}>
                    <div className="flex items-start gap-3">
                      <div className="mt-1 shrink-0">{icone(prioridadeAtual)}</div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold uppercase tracking-wide opacity-80">{alerta.tipo}</p>
                        <h3 className="mt-1 font-black">{alerta.titulo}</h3>
                        <p className="mt-1 text-sm opacity-90">{alerta.mensagem}</p>
                        <p className="mt-3 flex items-center gap-1 text-xs opacity-75">
                          <Clock size={13} /> {new Date(alerta.createdAt).toLocaleString("pt-BR")}
                        </p>
                        {alerta.lida && <p className="mt-1 text-xs opacity-75">Resolvido em {alerta.lidaEm ? new Date(alerta.lidaEm).toLocaleString("pt-BR") : "data não registrada"}</p>}
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <Link to={alerta.link || "/"} className="rounded-lg bg-white/90 px-3 py-2 text-sm font-bold text-slate-900 shadow-sm hover:bg-white">
                        Tratar
                      </Link>
                      {!alerta.lida && (
                        <button type="button" onClick={() => resolver(alerta)} className="rounded-lg bg-slate-950 px-3 py-2 text-sm font-bold text-white hover:bg-slate-800">
                          Marcar resolvido
                        </button>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
