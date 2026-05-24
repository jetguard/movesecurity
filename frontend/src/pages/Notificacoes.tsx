import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, Bell, CheckCircle2, RefreshCcw } from "lucide-react";
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
  lidaEm?: string | null;
};

function cor(severidade: string, lida?: boolean) {
  if (lida) return "border-slate-200 bg-white text-slate-600";
  if (severidade === "alta") return "border-red-200 bg-red-50 text-red-700";
  if (severidade === "media") return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-blue-200 bg-blue-50 text-blue-700";
}

export default function Notificacoes() {
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);
  const [tipo, setTipo] = useState("");
  const [severidade, setSeveridade] = useState("");
  const [busca, setBusca] = useState("");
  const [incluirLidas, setIncluirLidas] = useState(false);
  const [carregando, setCarregando] = useState(false);

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      const response = await api.get("/gestao/notificacoes", {
        params: { incluirLidas },
      });
      setNotificacoes(response.data);
    } finally {
      setCarregando(false);
    }
  }, [incluirLidas]);

  async function marcarLida(id: string) {
    await api.post(`/gestao/notificacoes/${encodeURIComponent(id)}/lida`);
    if (incluirLidas) {
      setNotificacoes((atuais) =>
        atuais.map((item) => (item.id === id ? { ...item, lida: true, lidaEm: new Date().toISOString() } : item))
      );
    } else {
      setNotificacoes((atuais) => atuais.filter((item) => item.id !== id));
    }
    window.dispatchEvent(new CustomEvent("notificacoes-atualizadas"));
  }

  async function marcarTodasLidas() {
    await api.post("/gestao/notificacoes/lidas");
    await carregar();
    window.dispatchEvent(new CustomEvent("notificacoes-atualizadas"));
  }

  useEffect(() => {
    carregar();
    const interval = window.setInterval(carregar, 30000);
    return () => window.clearInterval(interval);
  }, [carregar]);

  const tipos = Array.from(new Set(notificacoes.map((item) => item.tipo)));
  const filtradas = notificacoes.filter((item) => {
    const texto = `${item.tipo} ${item.titulo} ${item.mensagem}`.toLowerCase();
    return (
      (!tipo || item.tipo === tipo) &&
      (!severidade || item.severidade === severidade) &&
      (!busca || texto.includes(busca.toLowerCase()))
    );
  });

  const resumo = useMemo(() => ({
    total: notificacoes.length,
    naoLidas: notificacoes.filter((item) => !item.lida).length,
    alta: notificacoes.filter((item) => item.severidade === "alta" && !item.lida).length,
    media: notificacoes.filter((item) => item.severidade === "media" && !item.lida).length,
  }), [notificacoes]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">Central de Notificações</h1>
          <p className="mt-1 text-sm text-slate-500">Alertas operacionais, prazos, CFTV, menções e pendências críticas.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={carregar}
            className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 font-semibold text-slate-700 shadow"
          >
            <RefreshCcw size={16} /> {carregando ? "Atualizando..." : "Atualizar"}
          </button>
          <button
            type="button"
            onClick={marcarTodasLidas}
            disabled={resumo.naoLidas === 0}
            className="rounded-lg bg-slate-900 px-4 py-2 font-semibold text-white disabled:bg-slate-400"
          >
            Marcar todas como lidas
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <div className="rounded-xl bg-white p-5 shadow"><p className="text-sm text-slate-500">Total exibido</p><p className="text-3xl font-bold">{resumo.total}</p></div>
        <div className="rounded-xl bg-white p-5 shadow"><p className="text-sm text-slate-500">Não lidas</p><p className="text-3xl font-bold text-blue-600">{resumo.naoLidas}</p></div>
        <div className="rounded-xl bg-white p-5 shadow"><p className="text-sm text-slate-500">Alta prioridade</p><p className="text-3xl font-bold text-red-600">{resumo.alta}</p></div>
        <div className="rounded-xl bg-white p-5 shadow"><p className="text-sm text-slate-500">Atenção</p><p className="text-3xl font-bold text-amber-600">{resumo.media}</p></div>
      </div>

      <div className="grid grid-cols-1 gap-3 rounded-xl bg-white p-4 shadow md:grid-cols-4">
        <input
          className="rounded-lg border p-3"
          placeholder="Pesquisar notificação"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
        <select className="rounded-lg border bg-white p-3" value={tipo} onChange={(e) => setTipo(e.target.value)}>
          <option value="">Todos os tipos</option>
          {tipos.map((item) => <option key={item}>{item}</option>)}
        </select>
        <select className="rounded-lg border bg-white p-3" value={severidade} onChange={(e) => setSeveridade(e.target.value)}>
          <option value="">Todas as prioridades</option>
          <option value="alta">Alta</option>
          <option value="media">Média</option>
          <option value="baixa">Baixa</option>
        </select>
        <label className="flex items-center gap-2 rounded-lg border p-3 text-sm font-semibold text-slate-700">
          <input type="checkbox" checked={incluirLidas} onChange={(e) => setIncluirLidas(e.target.checked)} />
          Mostrar lidas
        </label>
      </div>

      <div className="space-y-3">
        {filtradas.length === 0 ? (
          <div className="rounded-xl bg-white p-8 text-center text-slate-500 shadow">
            <CheckCircle2 className="mx-auto mb-3 text-emerald-500" />
            Nenhuma notificação no filtro atual.
          </div>
        ) : (
          filtradas.map((item) => (
            <div key={item.id} className={`rounded-xl border p-5 shadow-sm transition hover:-translate-y-0.5 ${cor(item.severidade, item.lida)}`}>
              <div className="flex items-start gap-3">
                {item.severidade === "alta" ? <AlertTriangle className="mt-1 shrink-0" /> : <Bell className="mt-1 shrink-0" />}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-xs font-bold uppercase tracking-wide opacity-75">{item.tipo}</p>
                    {item.lida && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">Lida</span>}
                  </div>
                  <h2 className="mt-1 text-lg font-bold">{item.titulo}</h2>
                  <p className="mt-1 text-sm opacity-90">{item.mensagem}</p>
                  <p className="mt-2 text-xs opacity-70">{new Date(item.createdAt).toLocaleString("pt-BR")}</p>
                  {item.lidaEm && <p className="mt-1 text-xs opacity-70">Lida em {new Date(item.lidaEm).toLocaleString("pt-BR")}</p>}
                </div>
                <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
                  <Link to={item.link || "/"} className="rounded-lg bg-white/70 px-3 py-2 text-sm font-semibold shadow-sm hover:bg-white">
                    Abrir
                  </Link>
                  {!item.lida && (
                    <button onClick={() => marcarLida(item.id)} className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800">
                      Lida
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
