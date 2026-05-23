import { useEffect, useState } from "react";
import { api } from "../../services/api";

type SubNatureza = {
  id: number;
  nome: string;
};

type Natureza = {
  id: number;
  nome: string;
  subNaturezas: SubNatureza[];
};

export default function Naturezas() {
  const [naturezas, setNaturezas] = useState<Natureza[]>([]);
  const [nomeNatureza, setNomeNatureza] = useState("");
  const [naturezaSelecionada, setNaturezaSelecionada] = useState("");
  const [nomeSubNatureza, setNomeSubNatureza] = useState("");

  async function carregarNaturezas() {
    const response = await api.get("/naturezas");
    setNaturezas(response.data);
  }

  async function salvarNatureza(e: React.FormEvent) {
    e.preventDefault();

    try {
      await api.post("/naturezas", {
        nome: nomeNatureza,
      });

      setNomeNatureza("");
      carregarNaturezas();
    } catch (error: any) {
      alert(error.response?.data?.error || "Erro ao salvar natureza");
    }
  }

  async function salvarSubNatureza(e: React.FormEvent) {
    e.preventDefault();

    if (!naturezaSelecionada) {
      alert("Selecione uma natureza");
      return;
    }

    try {
      await api.post(`/naturezas/${naturezaSelecionada}/subnaturezas`, {
        nome: nomeSubNatureza,
      });

      setNomeSubNatureza("");
      carregarNaturezas();
    } catch (error: any) {
      alert(error.response?.data?.error || "Erro ao salvar subnatureza");
    }
  }

  useEffect(() => {
    carregarNaturezas();
  }, []);

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Naturezas e Subnaturezas</h1>
        <p className="text-gray-500 mt-1">
          Cadastre as opções usadas nos relatórios de ocorrências e eventos.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <form
          onSubmit={salvarNatureza}
          className="bg-white rounded-xl shadow p-6 space-y-4"
        >
          <h2 className="text-xl font-bold">Nova Natureza</h2>

          <input
            className="w-full border rounded-lg p-3"
            placeholder="Ex: Intempéries"
            value={nomeNatureza}
            onChange={(e) => setNomeNatureza(e.target.value)}
            required
          />

          <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg">
            Salvar Natureza
          </button>
        </form>

        <form
          onSubmit={salvarSubNatureza}
          className="bg-white rounded-xl shadow p-6 space-y-4"
        >
          <h2 className="text-xl font-bold">Nova Subnatureza</h2>

          <select
            className="w-full border rounded-lg p-3"
            value={naturezaSelecionada}
            onChange={(e) => setNaturezaSelecionada(e.target.value)}
            required
          >
            <option value="">Selecione a natureza</option>
            {naturezas.map((natureza) => (
              <option key={natureza.id} value={natureza.id}>
                {natureza.nome}
              </option>
            ))}
          </select>

          <input
            className="w-full border rounded-lg p-3"
            placeholder="Ex: Alagamentos"
            value={nomeSubNatureza}
            onChange={(e) => setNomeSubNatureza(e.target.value)}
            required
          />

          <button className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg">
            Salvar Subnatureza
          </button>
        </form>
      </div>

      {naturezas.length === 0 ? (
        <div className="bg-white rounded-xl p-8 shadow text-center text-gray-500">
          Nenhuma natureza cadastrada.
        </div>
      ) : (
        <div className="space-y-4">
          {naturezas.map((natureza) => (
            <div key={natureza.id} className="bg-white rounded-xl shadow p-5">
              <h2 className="text-xl font-bold">{natureza.nome}</h2>

              {natureza.subNaturezas.length === 0 ? (
                <p className="text-sm text-gray-500 mt-3">
                  Nenhuma subnatureza cadastrada.
                </p>
              ) : (
                <div className="flex flex-wrap gap-2 mt-4">
                  {natureza.subNaturezas.map((subNatureza) => (
                    <span
                      key={subNatureza.id}
                      className="bg-slate-100 text-slate-700 px-3 py-1 rounded-full text-sm"
                    >
                      {subNatureza.nome}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
