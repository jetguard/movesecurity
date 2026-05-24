import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../services/api";

type Tarefa = {
  id: string;
  origem: string;
  modulo: string;
  codigo: string;
  titulo: string;
  status: string;
  prazo?: string | null;
  prioridade: string;
  link: string;
};

function diasAte(prazo?: string | null) {
  if (!prazo) return null;
  return Math.ceil((new Date(prazo).getTime() - Date.now()) / 86400000);
}

export default function Tarefas() {
  const [tarefas, setTarefas] = useState<Tarefa[]>([]);
  const [origem, setOrigem] = useState("");

  useEffect(() => {
    api.get("/gestao/tarefas").then((response) => setTarefas(response.data));
  }, []);

  const filtradas = tarefas.filter((tarefa) => !origem || tarefa.origem === origem);
  const origens = Array.from(new Set(tarefas.map((tarefa) => tarefa.origem)));
  const resumo = useMemo(() => ({
    total: filtradas.length,
    vencidas: filtradas.filter((tarefa) => {
      const dias = diasAte(tarefa.prazo);
      return typeof dias === "number" && dias < 0;
    }).length,
    semana: filtradas.filter((tarefa) => {
      const dias = diasAte(tarefa.prazo);
      return typeof dias === "number" && dias >= 0 && dias <= 7;
    }).length,
  }), [filtradas]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">Central de Tarefas</h1>
          <p className="mt-1 text-sm text-slate-500">Fila unica de mencoes, aprovacoes, riscos e planos de acao.</p>
        </div>
        <select className="rounded-lg border bg-white p-3" value={origem} onChange={(e) => setOrigem(e.target.value)}>
          <option value="">Todas as origens</option>
          {origens.map((item) => <option key={item}>{item}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl bg-white p-5 shadow"><p className="text-sm text-slate-500">Total</p><p className="text-3xl font-bold">{resumo.total}</p></div>
        <div className="rounded-xl bg-white p-5 shadow"><p className="text-sm text-slate-500">Vencidas</p><p className="text-3xl font-bold text-red-600">{resumo.vencidas}</p></div>
        <div className="rounded-xl bg-white p-5 shadow"><p className="text-sm text-slate-500">Proximos 7 dias</p><p className="text-3xl font-bold text-amber-600">{resumo.semana}</p></div>
      </div>

      <div className="space-y-4">
        {filtradas.map((tarefa) => {
          const dias = diasAte(tarefa.prazo);
          return (
            <div key={tarefa.id} className="rounded-xl bg-white p-5 shadow">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-blue-600">{tarefa.origem} | {tarefa.modulo} | {tarefa.codigo}</p>
                  <h2 className="mt-1 text-xl font-bold text-slate-900">{tarefa.titulo}</h2>
                  <p className="mt-1 text-sm text-slate-500">Status: {tarefa.status} | Prioridade: {tarefa.prioridade}</p>
                  <p className="mt-1 text-sm text-slate-500">
                    Prazo: {tarefa.prazo ? new Date(tarefa.prazo).toLocaleString("pt-BR") : "Sem prazo"}
                    {typeof dias === "number" ? ` (${dias < 0 ? `${Math.abs(dias)} dias vencido` : `${dias} dias`})` : ""}
                  </p>
                </div>
                <Link to={tarefa.link} className="rounded bg-blue-600 px-3 py-2 text-sm text-white">Abrir</Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

