import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../services/api";

type CampoAlterado = {
  campo: string;
  anterior: string;
  novo: string;
};

type HistoricoItem = {
  id: number;
  usuario: string;
  acao: string;
  data: string;
  campos: CampoAlterado[];
};

export default function Historico() {
  const { tipo, id } = useParams();
  const [historico, setHistorico] = useState<HistoricoItem[]>([]);

  useEffect(() => {
    if (!tipo || !id) return;
    api.get(`/gestao/historico/${tipo}/${id}`).then((response) => setHistorico(response.data));
  }, [tipo, id]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">Historico de Alteracoes</h1>
        <p className="mt-1 text-sm text-slate-500">{tipo} #{id}</p>
      </div>

      <div className="space-y-4">
        {historico.length === 0 && <div className="rounded-xl bg-white p-8 text-center text-slate-500 shadow">Nenhuma alteracao encontrada.</div>}
        {historico.map((item) => (
          <div key={item.id} className="rounded-xl bg-white p-5 shadow">
            <p className="text-sm text-slate-500">{new Date(item.data).toLocaleString("pt-BR")} | {item.usuario}</p>
            <h2 className="mt-1 font-bold text-slate-900">{item.acao}</h2>
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="bg-slate-100 text-left">
                    <th className="p-2">Campo</th>
                    <th className="p-2">Anterior</th>
                    <th className="p-2">Novo</th>
                  </tr>
                </thead>
                <tbody>
                  {item.campos.length === 0 && (
                    <tr><td className="p-2 text-slate-500" colSpan={3}>Sem comparacao detalhada.</td></tr>
                  )}
                  {item.campos.map((campo) => (
                    <tr key={campo.campo} className="border-t">
                      <td className="p-2 font-semibold">{campo.campo}</td>
                      <td className="max-w-sm break-words p-2 text-red-700">{campo.anterior}</td>
                      <td className="max-w-sm break-words p-2 text-emerald-700">{campo.novo}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

