import { useEffect, useState } from "react";
import { api } from "../services/api";

type Item = { nome: string; total: number };
type Insight = { tipo: string; titulo: string; recomendacao: string; severidade: string };
type Inteligencia = {
  totais: Record<string, number>;
  porLocal: Item[];
  porNatureza: Item[];
  porStatus: Item[];
  temporal: Item[];
  insights: Insight[];
};

function Barra({ item, maximo }: { item: Item; maximo: number }) {
  return (
    <div>
      <div className="flex justify-between text-sm">
        <span>{item.nome}</span>
        <strong>{item.total}</strong>
      </div>
      <div className="mt-1 h-2 rounded bg-slate-100">
        <div className="h-2 rounded bg-blue-600" style={{ width: `${maximo ? Math.max((item.total / maximo) * 100, 8) : 0}%` }} />
      </div>
    </div>
  );
}

export default function InteligenciaOperacional() {
  const [dados, setDados] = useState<Inteligencia | null>(null);

  useEffect(() => {
    api.get("/inteligencia").then((response) => setDados(response.data));
  }, []);

  if (!dados) {
    return <div className="rounded-xl bg-white p-8 shadow">Carregando inteligencia operacional...</div>;
  }

  const maxLocal = Math.max(...dados.porLocal.map((item) => item.total), 0);
  const maxNatureza = Math.max(...dados.porNatureza.map((item) => item.total), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">Inteligencia Operacional</h1>
        <p className="mt-1 text-sm text-slate-500">Padroes, tendencias, locais criticos e recomendacoes preventivas.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl bg-white p-5 shadow"><p className="text-sm text-slate-500">Ocorrencias</p><p className="text-3xl font-bold">{dados.totais.ocorrencias}</p></div>
        <div className="rounded-xl bg-white p-5 shadow"><p className="text-sm text-slate-500">Eventos</p><p className="text-3xl font-bold">{dados.totais.eventos}</p></div>
        <div className="rounded-xl bg-white p-5 shadow"><p className="text-sm text-slate-500">Riscos criticos/altos</p><p className="text-3xl font-bold text-red-600">{dados.totais.riscosCriticos}</p></div>
        <div className="rounded-xl bg-white p-5 shadow"><p className="text-sm text-slate-500">Investigacoes abertas</p><p className="text-3xl font-bold text-amber-600">{dados.totais.investigacoesAbertas}</p></div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-xl bg-white p-5 shadow">
          <h2 className="mb-4 font-bold text-slate-900">Locais com maior indice</h2>
          <div className="space-y-4">{dados.porLocal.map((item) => <Barra key={item.nome} item={item} maximo={maxLocal} />)}</div>
        </div>
        <div className="rounded-xl bg-white p-5 shadow">
          <h2 className="mb-4 font-bold text-slate-900">Naturezas mais recorrentes</h2>
          <div className="space-y-4">{dados.porNatureza.map((item) => <Barra key={item.nome} item={item} maximo={maxNatureza} />)}</div>
        </div>
      </div>

      <div className="rounded-xl bg-white p-5 shadow">
        <h2 className="mb-4 font-bold text-slate-900">Insights automaticos</h2>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {dados.insights.length === 0 && <p className="text-sm text-slate-500">Nenhum padrao critico identificado no momento.</p>}
          {dados.insights.map((item, index) => (
            <div key={`${item.tipo}-${index}`} className="rounded-lg border border-slate-200 p-4">
              <span className={`rounded-full px-3 py-1 text-xs font-bold ${item.severidade === "alta" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}>
                {item.tipo}
              </span>
              <h3 className="mt-3 font-bold text-slate-900">{item.titulo}</h3>
              <p className="mt-2 text-sm text-slate-600">{item.recomendacao}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

