import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, Bell, CheckCircle2 } from "lucide-react";
import { api } from "../services/api";

type Notificacao = {
  id: string;
  tipo: string;
  titulo: string;
  mensagem: string;
  severidade: string;
  link: string;
  createdAt: string;
  lida?: boolean;
};

function cor(severidade: string) {
  if (severidade === "alta") return "border-red-200 bg-red-50 text-red-700";
  if (severidade === "media") return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-blue-200 bg-blue-50 text-blue-700";
}

export default function Notificacoes() {
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);
  const [filtro, setFiltro] = useState("");

  async function carregar() {
    const response = await api.get("/gestao/notificacoes");
    setNotificacoes(response.data);
  }

  async function marcarLida(id: string) {
    await api.post(`/gestao/notificacoes/${encodeURIComponent(id)}/lida`);
    setNotificacoes((atuais) => atuais.filter((item) => item.id !== id));
    window.dispatchEvent(new CustomEvent("notificacoes-atualizadas"));
  }

  async function marcarTodasLidas() {
    await api.post("/gestao/notificacoes/lidas");
    setNotificacoes([]);
    window.dispatchEvent(new CustomEvent("notificacoes-atualizadas"));
  }

  useEffect(() => {
    carregar();
    const interval = window.setInterval(carregar, 30000);
    return () => window.clearInterval(interval);
  }, []);

  const tipos = Array.from(new Set(notificacoes.map((item) => item.tipo)));
  const filtradas = notificacoes.filter((item) => !filtro || item.tipo === filtro);
  const resumo = useMemo(() => ({
    total: notificacoes.length,
    alta: notificacoes.filter((item) => item.severidade === "alta").length,
    media: notificacoes.filter((item) => item.severidade === "media").length,
  }), [notificacoes]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">Central de Notificações</h1>
          <p className="mt-1 text-sm text-slate-500">Alertas operacionais, prazos, CFTV, menções e pendências críticas.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <select className="rounded-lg border bg-white p-3" value={filtro} onChange={(e) => setFiltro(e.target.value)}>
            <option value="">Todos os tipos</option>
            {tipos.map((tipo) => <option key={tipo}>{tipo}</option>)}
          </select>
          <button
            type="button"
            onClick={marcarTodasLidas}
            disabled={notificacoes.length === 0}
            className="rounded-lg bg-slate-900 px-4 py-2 font-semibold text-white disabled:bg-slate-400"
          >
            Marcar todas como lidas
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl bg-white p-5 shadow"><p className="text-sm text-slate-500">Total</p><p className="text-3xl font-bold">{resumo.total}</p></div>
        <div className="rounded-xl bg-white p-5 shadow"><p className="text-sm text-slate-500">Alta prioridade</p><p className="text-3xl font-bold text-red-600">{resumo.alta}</p></div>
        <div className="rounded-xl bg-white p-5 shadow"><p className="text-sm text-slate-500">Atenção</p><p className="text-3xl font-bold text-amber-600">{resumo.media}</p></div>
      </div>

      <div className="space-y-3">
        {filtradas.length === 0 ? (
          <div className="rounded-xl bg-white p-8 text-center text-slate-500 shadow">
            <CheckCircle2 className="mx-auto mb-3 text-emerald-500" />
            Nenhuma notificação no filtro atual.
          </div>
        ) : (
          filtradas.map((item) => (
            <div key={item.id} className={`rounded-xl border p-5 shadow-sm transition hover:-translate-y-0.5 ${cor(item.severidade)}`}>
              <div className="flex items-start gap-3">
                {item.severidade === "alta" ? <AlertTriangle className="mt-1 shrink-0" /> : <Bell className="mt-1 shrink-0" />}
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold uppercase tracking-wide opacity-75">{item.tipo}</p>
                  <h2 className="mt-1 text-lg font-bold">{item.titulo}</h2>
                  <p className="mt-1 text-sm opacity-90">{item.mensagem}</p>
                  <p className="mt-2 text-xs opacity-70">{new Date(item.createdAt).toLocaleString("pt-BR")}</p>
                </div>
                <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
                  <Link to={item.link || "/"} className="rounded-lg bg-white/70 px-3 py-2 text-sm font-semibold shadow-sm hover:bg-white">
                    Abrir
                  </Link>
                  <button onClick={() => marcarLida(item.id)} className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800">
                    Lida
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
