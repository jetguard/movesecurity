import { useEffect, useState } from "react";
import { api } from "../../services/api";

type Evento = {
  id: number;
  titulo: string;
  descricao: string;
  local: string;
  createdAt: string;
};

export default function Eventos() {
  const [eventos, setEventos] = useState<Evento[]>([]);

  async function carregarEventos() {
    try {
      const response = await api.get("/eventos");
      setEventos(response.data);
    } catch (error) {
      console.error("Erro ao carregar eventos");
    }
  }

  useEffect(() => {
    carregarEventos();
  }, []);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Relatórios de Eventos</h1>
          <p className="text-gray-500 mt-1">
            Gerencie todos os relatórios de eventos.
          </p>
        </div>

        <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg">
          Novo Relatório
        </button>
      </div>

      {eventos.length === 0 ? (
        <div className="bg-white rounded-xl p-8 shadow text-center text-gray-500">
          Nenhum evento cadastrado.
        </div>
      ) : (
        <div className="space-y-4">
          {eventos.map((evento) => (
            <div key={evento.id} className="bg-white rounded-xl shadow p-5">
              <h2 className="text-xl font-bold">{evento.titulo}</h2>

              <p className="text-gray-600 mt-1">{evento.descricao}</p>

              <div className="mt-4 text-sm text-gray-500">
                <p>Local: {evento.local}</p>
                <p>Criado em: {new Date(evento.createdAt).toLocaleString()}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}