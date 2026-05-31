import { useEffect, useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
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
type LocalTerminal = {
  id: number;
  nome: string;
  areaSensivel?: boolean;
  status: string;
};

const categoriasInspecao = [
  "Alarme",
  "Ar Condicionado",
  "Balança",
  "Bebedouros",
  "Buracos",
  "Cabeamento ou fio exposto",
  "Câmera CFTV",
  "Cancelas",
  "Cerca",
  "Docas",
  "Escadas e corrimãos",
  "Extintores",
  "Gerador / Nobreak",
  "Hidrantes",
  "Iluminação",
  "Infiltrações",
  "Janelas",
  "Limpeza e organização",
  "Portas / Fechaduras",
  "Piso",
  "Portões",
  "Ralos e drenagem",
  "Rotas de fuga",
  "Scanner",
  "Sinalização",
  "Telhados",
  "Tomadas / quadros elétricos",
  "Torniquetes",
  "Vazamentos",
  "Vias de circulação",
].sort((a, b) => a.localeCompare(b, "pt-BR"));

const itemPadrao: Item = { categoria: "Câmera CFTV", descricao: "", conformidade: "Conforme", criticidade: "Media", observacao: "" };

export default function Checklists() {
  const [checklists, setChecklists] = useState<Checklist[]>([]);
  const [locais, setLocais] = useState<LocalTerminal[]>([]);
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
    const [checklistsResponse, locaisResponse] = await Promise.all([
      api.get("/checklists"),
      api.get("/locais", { params: { status: "ativo" } }).catch(() => ({ data: [] })),
    ]);
    setChecklists(checklistsResponse.data);
    setLocais(locaisResponse.data);
  }

  useEffect(() => {
    carregar();
  }, []);

  const resumo = useMemo(() => ({
    total: checklists.length,
    abertos: checklists.filter((checklist) => checklist.status !== "Concluido").length,
    criticos: checklists.filter((checklist) => checklist.pontuacao >= 40).length,
  }), [checklists]);

  const localSelecionado = useMemo(
    () => locais.find((local) => local.nome === form.local),
    [form.local, locais]
  );

  const graficoConformidade = useMemo(() => {
    const mapa = new Map<string, { nome: string; Conforme: number; "Não conforme": number; "Não aplicável": number }>();

    checklists.forEach((checklist) => {
      const nome = `${checklist.local}${checklist.setor ? ` | ${checklist.setor}` : ""}`;
      const atual = mapa.get(nome) || { nome, Conforme: 0, "Não conforme": 0, "Não aplicável": 0 };

      checklist.itens.forEach((item) => {
        if (item.conformidade === "Conforme") atual.Conforme += 1;
        else if (item.conformidade === "Nao conforme") atual["Não conforme"] += 1;
        else atual["Não aplicável"] += 1;
      });

      mapa.set(nome, atual);
    });

    return Array.from(mapa.values()).slice(0, 10);
  }, [checklists]);

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
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white sm:text-3xl">Checklist Inspeção Preventiva</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">Rondas preventivas com verificação estruturada dos locais cadastrados.</p>
        </div>
        <button onClick={() => setAbrir(true)} className="w-full rounded-lg bg-blue-600 px-4 py-2 text-white sm:w-auto">Novo Checklist</button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl bg-white p-5 shadow dark:bg-slate-900"><p className="text-sm text-slate-500 dark:text-slate-300">Total</p><p className="text-3xl font-bold dark:text-white">{resumo.total}</p></div>
        <div className="rounded-xl bg-white p-5 shadow dark:bg-slate-900"><p className="text-sm text-slate-500 dark:text-slate-300">Abertos</p><p className="text-3xl font-bold text-blue-600">{resumo.abertos}</p></div>
        <div className="rounded-xl bg-white p-5 shadow dark:bg-slate-900"><p className="text-sm text-slate-500 dark:text-slate-300">Críticos</p><p className="text-3xl font-bold text-red-600">{resumo.criticos}</p></div>
      </div>

      <section className="rounded-xl bg-white p-5 shadow dark:bg-slate-900">
        <div className="mb-4">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Conformidade por local e setor</h2>
          <p className="text-sm text-slate-500 dark:text-slate-300">Itens conformes, não conformes e não aplicáveis registrados nas inspeções preventivas.</p>
        </div>
        {graficoConformidade.length > 0 ? (
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={graficoConformidade} margin={{ top: 10, right: 20, left: 0, bottom: 72 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.22} />
                <XAxis dataKey="nome" angle={-25} textAnchor="end" interval={0} height={78} tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Legend />
                <Bar dataKey="Conforme" stackId="a" fill="#10b981" />
                <Bar dataKey="Não conforme" stackId="a" fill="#ef4444" />
                <Bar dataKey="Não aplicável" stackId="a" fill="#94a3b8" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="rounded-lg bg-slate-50 p-4 text-sm text-slate-500 dark:bg-slate-800 dark:text-slate-300">Nenhum checklist realizado para gerar o gráfico.</p>
        )}
      </section>

      {abrir && (
        <form onSubmit={salvar} className="space-y-4 rounded-xl bg-white p-4 shadow dark:bg-slate-900 sm:p-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <label className="space-y-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
              <span>Nome do responsável pela inspeção preventiva</span>
              <input className="w-full rounded-lg border border-slate-300 bg-white p-3 text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white" placeholder="Ex: Fernando Nunes" value={form.titulo} onChange={(e) => campo("titulo", e.target.value)} required />
            </label>
            <label className="space-y-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
              <span>Local cadastrado</span>
              <select className="w-full rounded-lg border border-slate-300 bg-white p-3 text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white" value={form.local} onChange={(e) => campo("local", e.target.value)} required>
                <option value="">Selecione o local cadastrado</option>
                {form.local && !locais.some((local) => local.nome === form.local) && <option value={form.local}>{form.local}</option>}
                {locais.map((local) => (
                  <option key={local.id} value={local.nome}>
                    {local.nome}{local.areaSensivel ? " - ÁREA SENSÍVEL" : ""}
                  </option>
                ))}
              </select>
              {localSelecionado?.areaSensivel && (
                <span className="inline-flex rounded-full bg-red-100 px-3 py-1 text-xs font-bold uppercase text-red-700 dark:bg-red-500/15 dark:text-red-200">
                  Área sensível / crítica
                </span>
              )}
            </label>
            <label className="space-y-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
              <span>Setor</span>
              <input className="w-full rounded-lg border border-slate-300 bg-white p-3 text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white" placeholder="Ex: Operacional, Portaria, Armazém" value={form.setor} onChange={(e) => campo("setor", e.target.value)} />
            </label>
            <label className="space-y-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
              <span>Tipo de inspeção</span>
              <select className="w-full rounded-lg border border-slate-300 bg-white p-3 text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white" value={form.tipo} onChange={(e) => campo("tipo", e.target.value)}>
                <option>Ronda Preventiva</option>
              </select>
            </label>
          </div>
          <textarea className="w-full rounded-lg border border-slate-300 bg-white p-3 text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white" placeholder="Observações gerais da inspeção preventiva" value={form.observacoes} onChange={(e) => campo("observacoes", e.target.value)} />
          <div className="space-y-3">
            {form.itens.map((item, index) => (
              <div key={index} className="grid grid-cols-1 gap-3 rounded-lg border border-slate-200 p-3 dark:border-slate-700 md:grid-cols-[1.2fr_2fr_1fr_1fr]">
                <label className="space-y-1 text-xs font-bold uppercase text-slate-500 dark:text-slate-300">
                  <span>Item inspecionado</span>
                  <select className="w-full rounded border border-slate-300 bg-white p-2 text-sm font-normal normal-case text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white" value={item.categoria} onChange={(e) => campoItem(index, "categoria", e.target.value)}>
                    {categoriasInspecao.map((categoria) => <option key={categoria}>{categoria}</option>)}
                  </select>
                </label>
                <label className="space-y-1 text-xs font-bold uppercase text-slate-500 dark:text-slate-300">
                  <span>Condição observada</span>
                  <input className="w-full rounded border border-slate-300 bg-white p-2 text-sm font-normal normal-case text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white" placeholder="Descreva a condição observada no item selecionado" value={item.descricao} onChange={(e) => campoItem(index, "descricao", e.target.value)} required />
                </label>
                <label className="space-y-1 text-xs font-bold uppercase text-slate-500 dark:text-slate-300">
                  <span>Conformidade</span>
                  <select className="w-full rounded border border-slate-300 bg-white p-2 text-sm font-normal normal-case text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white" value={item.conformidade} onChange={(e) => campoItem(index, "conformidade", e.target.value)}><option>Conforme</option><option>Nao conforme</option><option>Nao aplicavel</option></select>
                </label>
                <label className="space-y-1 text-xs font-bold uppercase text-slate-500 dark:text-slate-300">
                  <span>Criticidade</span>
                  <select className="w-full rounded border border-slate-300 bg-white p-2 text-sm font-normal normal-case text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white" value={item.criticidade} onChange={(e) => campoItem(index, "criticidade", e.target.value)}><option>Baixa</option><option>Media</option><option>Alta</option><option>Critica</option></select>
                </label>
              </div>
            ))}
          </div>
          <button type="button" onClick={() => setForm((atual) => ({ ...atual, itens: [...atual.itens, { ...itemPadrao }] }))} className="rounded bg-slate-200 px-4 py-2 text-slate-900 dark:bg-slate-700 dark:text-white">Adicionar item</button>
          <div className="flex flex-col gap-3 sm:flex-row"><button className="rounded bg-green-600 px-4 py-2 text-white">Salvar</button><button type="button" onClick={() => setAbrir(false)} className="rounded bg-slate-200 px-4 py-2 text-slate-900 dark:bg-slate-700 dark:text-white">Cancelar</button></div>
        </form>
      )}

      <div className="space-y-4">
        {checklists.map((checklist) => (
          <div key={checklist.id} className="rounded-xl bg-white p-5 shadow dark:bg-slate-900">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-blue-600">{checklist.codigo} | {checklist.tipo}</p>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">{checklist.titulo}</h2>
                <p className="text-sm text-slate-500 dark:text-slate-300">{checklist.local} | {checklist.setor || "Sem setor"} | Pontuação: {checklist.pontuacao}</p>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-700 dark:bg-slate-800 dark:text-slate-200">{checklist.status}</span>
            </div>
            <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
              {checklist.itens.map((item, index) => (
                <div key={index} className="rounded-lg border border-slate-200 p-3 text-sm text-slate-700 dark:border-slate-700 dark:text-slate-200">
                  <strong>{item.categoria}</strong> - {item.descricao}
                  <p className="text-slate-500 dark:text-slate-400">{item.conformidade} | Criticidade: {item.criticidade}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
