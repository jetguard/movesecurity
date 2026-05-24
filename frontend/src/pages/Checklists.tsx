import { useEffect, useMemo, useState } from "react";
import { api } from "../services/api";

type Item = { categoria: string; descricao: string; conformidade: string; criticidade: string; observacao: string };
type Checklist = {
  id: number;
  codigo: string;
  titulo: string;
  setor?: string;
  local: string;
  tipo: string;
  status: string;
  pontuacao: number;
  observacoes?: string;
  itens: Item[];
};

const itemPadrao: Item = { categoria: "Perimetro", descricao: "", conformidade: "Conforme", criticidade: "Media", observacao: "" };

export default function Checklists() {
  const [checklists, setChecklists] = useState<Checklist[]>([]);
  const [abrir, setAbrir] = useState(false);
  const [form, setForm] = useState({
    titulo: "",
    setor: "",
    local: "",
    tipo: "Ronda Preventiva",
    status: "Aberto",
    observacoes: "",
    itens: [{ ...itemPadrao }],
  });

  async function carregar() {
    const response = await api.get("/checklists");
    setChecklists(response.data);
  }

  useEffect(() => {
    carregar();
  }, []);

  const resumo = useMemo(() => ({
    total: checklists.length,
    abertos: checklists.filter((c) => c.status !== "Concluido").length,
    criticos: checklists.filter((c) => c.pontuacao >= 40).length,
  }), [checklists]);

  function campo(nome: string, valor: string) {
    setForm((atual) => ({ ...atual, [nome]: valor }));
  }

  function campoItem(index: number, nome: keyof Item, valor: string) {
    setForm((atual) => ({
      ...atual,
      itens: atual.itens.map((item, i) => i === index ? { ...item, [nome]: valor } : item),
    }));
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    await api.post("/checklists", form);
    setAbrir(false);
    setForm({ titulo: "", setor: "", local: "", tipo: "Ronda Preventiva", status: "Aberto", observacoes: "", itens: [{ ...itemPadrao }] });
    await carregar();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">Checklist de Inspecao Preventiva</h1>
          <p className="mt-1 text-sm text-slate-500">Rondas, portaria, CFTV, perimetro, iluminacao, docas e areas criticas.</p>
        </div>
        <button onClick={() => setAbrir(true)} className="w-full rounded-lg bg-blue-600 px-4 py-2 text-white sm:w-auto">Novo Checklist</button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl bg-white p-5 shadow"><p className="text-sm text-slate-500">Total</p><p className="text-3xl font-bold">{resumo.total}</p></div>
        <div className="rounded-xl bg-white p-5 shadow"><p className="text-sm text-slate-500">Abertos</p><p className="text-3xl font-bold text-blue-600">{resumo.abertos}</p></div>
        <div className="rounded-xl bg-white p-5 shadow"><p className="text-sm text-slate-500">Criticos</p><p className="text-3xl font-bold text-red-600">{resumo.criticos}</p></div>
      </div>

      {abrir && (
        <form onSubmit={salvar} className="space-y-4 rounded-xl bg-white p-4 shadow sm:p-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <input className="rounded-lg border p-3" placeholder="Titulo" value={form.titulo} onChange={(e) => campo("titulo", e.target.value)} required />
            <input className="rounded-lg border p-3" placeholder="Local" value={form.local} onChange={(e) => campo("local", e.target.value)} required />
            <input className="rounded-lg border p-3" placeholder="Setor" value={form.setor} onChange={(e) => campo("setor", e.target.value)} />
            <select className="rounded-lg border p-3" value={form.tipo} onChange={(e) => campo("tipo", e.target.value)}><option>Ronda Preventiva</option><option>Portaria</option><option>CFTV</option><option>Perimetro</option><option>Docas</option><option>Area Critica</option></select>
          </div>
          <textarea className="w-full rounded-lg border p-3" placeholder="Observacoes gerais" value={form.observacoes} onChange={(e) => campo("observacoes", e.target.value)} />
          <div className="space-y-3">
            {form.itens.map((item, index) => (
              <div key={index} className="grid grid-cols-1 gap-3 rounded-lg border p-3 md:grid-cols-5">
                <select className="rounded border p-2" value={item.categoria} onChange={(e) => campoItem(index, "categoria", e.target.value)}><option>Perimetro</option><option>Portaria</option><option>CFTV</option><option>Iluminacao</option><option>Docas</option><option>Procedimento</option></select>
                <input className="rounded border p-2 md:col-span-2" placeholder="Item verificado" value={item.descricao} onChange={(e) => campoItem(index, "descricao", e.target.value)} required />
                <select className="rounded border p-2" value={item.conformidade} onChange={(e) => campoItem(index, "conformidade", e.target.value)}><option>Conforme</option><option>Nao conforme</option><option>Nao aplicavel</option></select>
                <select className="rounded border p-2" value={item.criticidade} onChange={(e) => campoItem(index, "criticidade", e.target.value)}><option>Baixa</option><option>Media</option><option>Alta</option><option>Critica</option></select>
              </div>
            ))}
          </div>
          <button type="button" onClick={() => setForm((atual) => ({ ...atual, itens: [...atual.itens, { ...itemPadrao }] }))} className="rounded bg-slate-200 px-4 py-2">Adicionar item</button>
          <div className="flex flex-col gap-3 sm:flex-row"><button className="rounded bg-green-600 px-4 py-2 text-white">Salvar</button><button type="button" onClick={() => setAbrir(false)} className="rounded bg-slate-200 px-4 py-2">Cancelar</button></div>
        </form>
      )}

      <div className="space-y-4">
        {checklists.map((checklist) => (
          <div key={checklist.id} className="rounded-xl bg-white p-5 shadow">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-blue-600">{checklist.codigo} | {checklist.tipo}</p>
                <h2 className="text-xl font-bold text-slate-900">{checklist.titulo}</h2>
                <p className="text-sm text-slate-500">{checklist.local} | Pontuacao: {checklist.pontuacao}</p>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-sm">{checklist.status}</span>
            </div>
            <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
              {checklist.itens.map((item, index) => (
                <div key={index} className="rounded-lg border p-3 text-sm">
                  <strong>{item.categoria}</strong> - {item.descricao}
                  <p className="text-slate-500">{item.conformidade} | {item.criticidade}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

