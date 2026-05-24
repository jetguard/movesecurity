import { useEffect, useState } from "react";
import { api } from "../services/api";

type Celula = {
  probabilidade: string;
  severidade: string;
  total: number;
  riscos: Array<{ id: number; codigo: string; naturezaRisco: string; local: string; nivelRisco: string; status: string }>;
};

function cor(prob: string, sev: string) {
  const peso: Record<string, number> = { Baixa: 1, Media: 2, Alta: 3, Critica: 4 };
  const score = (peso[prob] || 1) * (peso[sev] || 1);
  if (score >= 12) return "bg-red-100 text-red-800 border-red-300";
  if (score >= 8) return "bg-orange-100 text-orange-800 border-orange-300";
  if (score >= 4) return "bg-amber-100 text-amber-800 border-amber-300";
  return "bg-emerald-100 text-emerald-800 border-emerald-300";
}

export default function MatrizRisco() {
  const [niveis, setNiveis] = useState<string[]>([]);
  const [matriz, setMatriz] = useState<Celula[]>([]);
  const [selecionada, setSelecionada] = useState<Celula | null>(null);

  useEffect(() => {
    api.get("/matriz-risco").then((response) => {
      setNiveis(response.data.niveis);
      setMatriz(response.data.matriz);
    });
  }, []);

  function celula(prob: string, sev: string) {
    return matriz.find((item) => item.probabilidade === prob && item.severidade === sev);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">Matriz de Risco 5x5</h1>
        <p className="mt-1 text-sm text-slate-500">Distribuicao dos riscos por probabilidade e severidade.</p>
      </div>

      <div className="overflow-x-auto rounded-xl bg-white p-4 shadow">
        <div className="grid min-w-[720px] grid-cols-[120px_repeat(4,1fr)] gap-2">
          <div />
          {niveis.map((sev) => <div key={sev} className="rounded-lg bg-slate-100 p-3 text-center font-bold">{sev}</div>)}
          {niveis.map((prob) => (
            <>
              <div key={`${prob}-label`} className="flex items-center rounded-lg bg-slate-100 p-3 font-bold">{prob}</div>
              {niveis.map((sev) => {
                const item = celula(prob, sev);
                return (
                  <button key={`${prob}-${sev}`} onClick={() => setSelecionada(item || null)} className={`min-h-28 rounded-lg border p-3 text-left ${cor(prob, sev)}`}>
                    <p className="text-sm font-semibold">{prob} x {sev}</p>
                    <p className="mt-2 text-3xl font-bold">{item?.total || 0}</p>
                  </button>
                );
              })}
            </>
          ))}
        </div>
      </div>

      {selecionada && (
        <div className="rounded-xl bg-white p-5 shadow">
          <h2 className="text-xl font-bold">Riscos em {selecionada.probabilidade} x {selecionada.severidade}</h2>
          <div className="mt-4 space-y-3">
            {selecionada.riscos.length === 0 && <p className="text-sm text-slate-500">Nenhum risco neste quadrante.</p>}
            {selecionada.riscos.map((risco) => (
              <div key={risco.id} className="rounded-lg border p-3">
                <p className="font-bold">{risco.codigo} - {risco.naturezaRisco}</p>
                <p className="text-sm text-slate-500">{risco.local} | {risco.nivelRisco} | {risco.status}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

