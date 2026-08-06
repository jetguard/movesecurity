import { useEffect, useMemo, useState } from "react";
import { api } from "../services/api";

type Pendencia = {
  id: string;
  modulo: string;
  codigo: string;
  titulo: string;
  status: string;
  responsavel: string;
  prazo?: string | null;
  dias?: number | null;
  prioridade: string;
};

function corDias(dias?: number | null) {
  if (dias === null || dias === undefined) return "bg-slate-100 text-slate-700";
  if (dias < 0) return "bg-red-100 text-red-700";
  if (dias <= 7) return "bg-amber-100 text-amber-700";
  return "bg-emerald-100 text-emerald-700";
}

export default function Pendencias() {
  const [pendencias, setPendencias] = useState<Pendencia[]>([]);
  const [modulo, setModulo] = useState("");

  useEffect(() => {
    api
      .get("/gestao/pendencias")
      .then((response) => setPendencias(response.data));
  }, []);

  const filtradas = pendencias.filter(
    (item) => !modulo || item.modulo === modulo,
  );
  const modulos = Array.from(new Set(pendencias.map((item) => item.modulo)));
  const resumo = useMemo(
    () => ({
      total: filtradas.length,
      vencidas: filtradas.filter(
        (item) => typeof item.dias === "number" && item.dias < 0,
      ).length,
      semana: filtradas.filter(
        (item) =>
          typeof item.dias === "number" && item.dias >= 0 && item.dias <= 7,
      ).length,
    }),
    [filtradas],
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
            Pendencias e Prazos
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Fila unica de analises, investigacoes, riscos e planos de acao.
          </p>
        </div>
        <select
          className="rounded-lg border bg-white p-3"
          value={modulo}
          onChange={(e) => setModulo(e.target.value)}
        >
          <option value="">Todos os modulos</option>
          {modulos.map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl bg-white p-5 shadow">
          <p className="text-sm text-slate-500">Total</p>
          <p className="text-3xl font-bold">{resumo.total}</p>
        </div>
        <div className="rounded-xl bg-white p-5 shadow">
          <p className="text-sm text-slate-500">Vencidas</p>
          <p className="text-3xl font-bold text-red-600">{resumo.vencidas}</p>
        </div>
        <div className="rounded-xl bg-white p-5 shadow">
          <p className="text-sm text-slate-500">Proximos 7 dias</p>
          <p className="text-3xl font-bold text-amber-600">{resumo.semana}</p>
        </div>
      </div>

      <div className="space-y-4">
        {filtradas.map((item) => (
          <div key={item.id} className="rounded-xl bg-white p-5 shadow">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-blue-600">
                  {item.modulo} | {item.codigo}
                </p>
                <h2 className="mt-1 text-xl font-bold text-slate-900">
                  {item.titulo}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Responsavel: {item.responsavel}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full border px-3 py-1 text-sm">
                  {item.status}
                </span>
                <span
                  className={`rounded-full px-3 py-1 text-sm ${corDias(item.dias)}`}
                >
                  {typeof item.dias === "number"
                    ? item.dias < 0
                      ? `${Math.abs(item.dias)} dias vencido`
                      : `${item.dias} dias`
                    : "Sem prazo"}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
