import { useEffect, useMemo, useState } from "react";
import { api } from "../services/api";

type Plano = {
  id: number;
  codigo: string;
  titulo: string;
  origemModulo?: string;
  origemId?: number;
  prioridade: string;
  status: string;
  percentual: number;
  descricao: string;
  acaoCorretiva?: string;
  acaoPreventiva?: string;
  responsavelNome?: string;
  prazo: string;
  evidencia?: string;
  comentarios?: string;
};

const vazio = {
  titulo: "",
  origemModulo: "",
  origemId: "",
  prioridade: "Media",
  status: "Pendente",
  percentual: "0",
  descricao: "",
  acaoCorretiva: "",
  acaoPreventiva: "",
  responsavelNome: "",
  prazo: "",
  evidencia: "",
  comentarios: "",
};

export default function PlanosAcao() {
  const [planos, setPlanos] = useState<Plano[]>([]);
  const [form, setForm] = useState({ ...vazio });
  const [editando, setEditando] = useState<Plano | null>(null);
  const [abrir, setAbrir] = useState(false);

  async function carregar() {
    const response = await api.get("/planos-acao");
    setPlanos(response.data);
  }

  useEffect(() => {
    carregar();
  }, []);

  const resumo = useMemo(() => ({
    total: planos.length,
    atrasados: planos.filter((p) => p.status !== "Concluido" && new Date(p.prazo) < new Date()).length,
    concluidos: planos.filter((p) => p.status === "Concluido").length,
    criticos: planos.filter((p) => p.prioridade === "Critica").length,
  }), [planos]);

  function campo(nome: string, valor: string) {
    setForm((atual) => ({ ...atual, [nome]: valor }));
  }

  function novo() {
    setForm({ ...vazio });
    setEditando(null);
    setAbrir(true);
  }

  function editar(plano: Plano) {
    setEditando(plano);
    setForm({
      ...vazio,
      ...plano,
      origemId: plano.origemId ? String(plano.origemId) : "",
      percentual: String(plano.percentual || 0),
      prazo: plano.prazo.slice(0, 16),
    });
    setAbrir(true);
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    if (editando) await api.put(`/planos-acao/${editando.id}`, form);
    else await api.post("/planos-acao", form);
    setAbrir(false);
    await carregar();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">Plano de Acao Corporativo</h1>
          <p className="mt-1 text-sm text-slate-500">Controle executivo de acoes corretivas, preventivas, prazos e evidencias.</p>
        </div>
        <button onClick={novo} className="w-full rounded-lg bg-blue-600 px-4 py-2 text-white sm:w-auto">Novo Plano</button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl bg-white p-5 shadow"><p className="text-sm text-slate-500">Total</p><p className="text-3xl font-bold">{resumo.total}</p></div>
        <div className="rounded-xl bg-white p-5 shadow"><p className="text-sm text-slate-500">Atrasados</p><p className="text-3xl font-bold text-red-600">{resumo.atrasados}</p></div>
        <div className="rounded-xl bg-white p-5 shadow"><p className="text-sm text-slate-500">Concluidos</p><p className="text-3xl font-bold text-emerald-600">{resumo.concluidos}</p></div>
        <div className="rounded-xl bg-white p-5 shadow"><p className="text-sm text-slate-500">Criticos</p><p className="text-3xl font-bold text-amber-600">{resumo.criticos}</p></div>
      </div>

      {abrir && (
        <form onSubmit={salvar} className="space-y-4 rounded-xl bg-white p-4 shadow sm:p-6">
          <h2 className="text-xl font-bold">{editando ? `Editar ${editando.codigo}` : "Novo plano de acao"}</h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <input className="rounded-lg border p-3" placeholder="Titulo" value={form.titulo} onChange={(e) => campo("titulo", e.target.value)} required />
            <input type="datetime-local" className="rounded-lg border p-3" value={form.prazo} onChange={(e) => campo("prazo", e.target.value)} required />
            <select className="rounded-lg border p-3" value={form.prioridade} onChange={(e) => campo("prioridade", e.target.value)}><option>Baixa</option><option>Media</option><option>Alta</option><option>Critica</option></select>
            <select className="rounded-lg border p-3" value={form.status} onChange={(e) => campo("status", e.target.value)}><option>Pendente</option><option>Em andamento</option><option>Concluido</option><option>Atrasado</option></select>
            <input className="rounded-lg border p-3" placeholder="Responsavel" value={form.responsavelNome} onChange={(e) => campo("responsavelNome", e.target.value)} />
            <input type="number" min="0" max="100" className="rounded-lg border p-3" placeholder="Percentual" value={form.percentual} onChange={(e) => campo("percentual", e.target.value)} />
            <input className="rounded-lg border p-3" placeholder="Modulo de origem" value={form.origemModulo} onChange={(e) => campo("origemModulo", e.target.value)} />
            <input className="rounded-lg border p-3" placeholder="ID de origem" value={form.origemId} onChange={(e) => campo("origemId", e.target.value)} />
          </div>
          <textarea className="min-h-24 w-full rounded-lg border p-3" placeholder="Descricao" value={form.descricao} onChange={(e) => campo("descricao", e.target.value)} required />
          <textarea className="min-h-24 w-full rounded-lg border p-3" placeholder="Acao corretiva" value={form.acaoCorretiva} onChange={(e) => campo("acaoCorretiva", e.target.value)} />
          <textarea className="min-h-24 w-full rounded-lg border p-3" placeholder="Acao preventiva" value={form.acaoPreventiva} onChange={(e) => campo("acaoPreventiva", e.target.value)} />
          <input className="w-full rounded-lg border p-3" placeholder="Link ou descricao da evidencia de conclusao" value={form.evidencia} onChange={(e) => campo("evidencia", e.target.value)} />
          <textarea className="min-h-20 w-full rounded-lg border p-3" placeholder="Comentarios" value={form.comentarios} onChange={(e) => campo("comentarios", e.target.value)} />
          <div className="flex flex-col gap-3 sm:flex-row"><button className="rounded bg-green-600 px-4 py-2 text-white">Salvar</button><button type="button" onClick={() => setAbrir(false)} className="rounded bg-slate-200 px-4 py-2">Cancelar</button></div>
        </form>
      )}

      <div className="space-y-4">
        {planos.map((plano) => (
          <div key={plano.id} className="rounded-xl bg-white p-5 shadow">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-blue-600">{plano.codigo} | {plano.prioridade}</p>
                <h2 className="text-xl font-bold text-slate-900">{plano.titulo}</h2>
                <p className="text-sm text-slate-500">Responsavel: {plano.responsavelNome || "Nao informado"} | Prazo: {new Date(plano.prazo).toLocaleString("pt-BR")}</p>
              </div>
              <button onClick={() => editar(plano)} className="rounded bg-blue-600 px-3 py-2 text-sm text-white">Editar</button>
            </div>
            <div className="mt-4 h-2 rounded bg-slate-100"><div className="h-2 rounded bg-emerald-600" style={{ width: `${plano.percentual}%` }} /></div>
            <p className="mt-3 text-sm text-slate-700">{plano.descricao}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

