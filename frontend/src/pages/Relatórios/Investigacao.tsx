import { useEffect, useState } from "react";
import { api } from "../../services/api";

type Investigacao = {
  id: number;
  titulo: string;
  descricao: string;
  status: string;
  createdAt: string;
};

export default function Investigacao() {
  const [investigacoes, setInvestigacoes] = useState<Investigacao[]>([]);

  async function carregarInvestigacoes() {
    try {
      const response = await api.get("/investigacoes");
      setInvestigacoes(response.data);
    } catch (error) {
      console.error("Erro ao carregar investigações");
    }
  }

  useEffect(() => {
    carregarInvestigacoes();
  }, []);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Relatórios de Investigação</h1>
          <p className="text-gray-500 mt-1">
            Gerencie todos os relatórios de investigação.
          </p>
        </div>

        <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg">
          Novo Relatório
        </button>
      </div>

      {investigacoes.length === 0 ? (
        <div className="bg-white rounded-xl p-8 shadow text-center text-gray-500">
          Nenhuma investigação cadastrada.
        </div>
      ) : (
        <div className="space-y-4">
          {investigacoes.map((item) => (
            <div key={item.id} className="bg-white rounded-xl shadow p-5">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold">{item.titulo}</h2>
                  <p className="text-gray-600 mt-1">{item.descricao}</p>
                </div>

                <span className="bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full text-sm">
                  {item.status}
                </span>
              </div>

              <p className="mt-4 text-sm text-gray-500">
                Criado em: {new Date(item.createdAt).toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}