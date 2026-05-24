import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../services/api";

type EventoTimeline = {
  id: number;
  data: string;
  usuario: string;
  acao: string;
  tipo: string;
};

export default function Timeline() {
  const { tipo, id } = useParams();
  const [eventos, setEventos] = useState<EventoTimeline[]>([]);

  useEffect(() => {
    if (!tipo || !id) return;
    api.get(`/gestao/timeline/${tipo}/${id}`).then((response) => setEventos(response.data));
  }, [tipo, id]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">Timeline do Registro</h1>
        <p className="mt-1 text-sm text-slate-500">{tipo} #{id}</p>
      </div>

      <div className="rounded-xl bg-white p-5 shadow">
        {eventos.length === 0 && <p className="text-sm text-slate-500">Nenhum evento de auditoria encontrado para este registro.</p>}
        <div className="space-y-4">
          {eventos.map((evento) => (
            <div key={evento.id} className="border-l-4 border-blue-500 pl-4">
              <p className="text-sm text-slate-500">{new Date(evento.data).toLocaleString("pt-BR")}</p>
              <h2 className="font-bold text-slate-900">{evento.acao}</h2>
              <p className="text-sm text-slate-600">{evento.usuario} | {evento.tipo}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

