import { useEffect, useState } from "react";
import type { AxiosError } from "axios";
import { api } from "../../services/api";
import { podeAnalisar } from "../../utils/permissoes";

type ApiError = {
  error?: string;
};

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
  const podeEditar = podeAnalisar();

  async function carregarNaturezas() {
    const response = await api.get("/naturezas");
    setNaturezas(response.data);
  }

  function tratarErro(error: unknown, mensagem: string) {
    const apiError = error as AxiosError<ApiError>;
    alert(apiError.response?.data?.error || mensagem);
  }

  async function salvarNatureza(e: React.FormEvent) {
    e.preventDefault();

    try {
      await api.post("/naturezas", {
        nome: nomeNatureza,
      });

      setNomeNatureza("");
      carregarNaturezas();
    } catch (error) {
      tratarErro(error, "Erro ao salvar natureza");
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
    } catch (error) {
      tratarErro(error, "Erro ao salvar subnatureza");
    }
  }

  async function editarNatureza(natureza: Natureza) {
    const novoNome = prompt(
      "Informe o novo nome da natureza:",
      natureza.nome,
    )?.trim();
    if (!novoNome || novoNome === natureza.nome) return;

    try {
      await api.put(`/naturezas/${natureza.id}`, { nome: novoNome });
      carregarNaturezas();
    } catch (error) {
      tratarErro(error, "Erro ao editar natureza");
    }
  }

  async function excluirNatureza(natureza: Natureza) {
    const mensagem =
      natureza.subNaturezas.length > 0
        ? `A natureza ${natureza.nome} possui subnaturezas vinculadas. Deseja excluir tudo mesmo assim?`
        : `Deseja excluir a natureza ${natureza.nome}?`;

    if (!confirm(mensagem)) return;

    try {
      await api.delete(`/naturezas/${natureza.id}`);
      carregarNaturezas();
    } catch (error) {
      tratarErro(error, "Erro ao excluir natureza");
    }
  }

  async function editarSubNatureza(subNatureza: SubNatureza) {
    const novoNome = prompt(
      "Informe o novo nome da subnatureza:",
      subNatureza.nome,
    )?.trim();
    if (!novoNome || novoNome === subNatureza.nome) return;

    try {
      await api.put(`/naturezas/subnaturezas/${subNatureza.id}`, {
        nome: novoNome,
      });
      carregarNaturezas();
    } catch (error) {
      tratarErro(error, "Erro ao editar subnatureza");
    }
  }

  async function excluirSubNatureza(subNatureza: SubNatureza) {
    if (!confirm(`Deseja excluir a subnatureza ${subNatureza.nome}?`)) return;

    try {
      await api.delete(`/naturezas/subnaturezas/${subNatureza.id}`);
      carregarNaturezas();
    } catch (error) {
      tratarErro(error, "Erro ao excluir subnatureza");
    }
  }

  useEffect(() => {
    carregarNaturezas();
  }, []);

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Naturezas e Subnaturezas</h1>
        <p className="mt-1 text-gray-500 dark:text-slate-300">
          Cadastre, organize e mantenha as opções usadas nos relatórios de
          ocorrências e eventos.
        </p>
      </div>

      {podeEditar ? (
        <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <form
            onSubmit={salvarNatureza}
            className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow dark:border-slate-700 dark:bg-slate-900"
          >
            <h2 className="text-xl font-bold">Nova Natureza</h2>

            <input
              className="w-full rounded-lg border border-slate-300 bg-white p-3 text-slate-900 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              placeholder="Ex: Intempéries"
              value={nomeNatureza}
              onChange={(e) => setNomeNatureza(e.target.value)}
              required
            />

            <button className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">
              Salvar Natureza
            </button>
          </form>

          <form
            onSubmit={salvarSubNatureza}
            className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow dark:border-slate-700 dark:bg-slate-900"
          >
            <h2 className="text-xl font-bold">Nova Subnatureza</h2>

            <select
              className="w-full rounded-lg border border-slate-300 bg-white p-3 text-slate-900 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
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
              className="w-full rounded-lg border border-slate-300 bg-white p-3 text-slate-900 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              placeholder="Ex: Alagamentos"
              value={nomeSubNatureza}
              onChange={(e) => setNomeSubNatureza(e.target.value)}
              required
            />

            <button className="rounded-lg bg-green-600 px-4 py-2 text-white hover:bg-green-700">
              Salvar Subnatureza
            </button>
          </form>
        </div>
      ) : (
        <div className="mb-6 rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-800 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-100">
          Você pode consultar as naturezas e subnaturezas cadastradas.
          Alterações ficam disponíveis para administradores e analistas.
        </div>
      )}

      {naturezas.length === 0 ? (
        <div className="rounded-xl bg-white p-8 text-center text-gray-500 shadow dark:bg-slate-900 dark:text-slate-300">
          Nenhuma natureza cadastrada.
        </div>
      ) : (
        <div className="space-y-4">
          {naturezas.map((natureza) => (
            <div
              key={natureza.id}
              className="rounded-xl border border-slate-200 bg-white p-5 shadow dark:border-slate-700 dark:bg-slate-900"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="text-xl font-bold">{natureza.nome}</h2>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    {natureza.subNaturezas.length} subnatureza(s) vinculada(s)
                  </p>
                </div>

                {podeEditar && (
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => editarNatureza(natureza)}
                      className="rounded-lg border border-blue-200 px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50 dark:border-blue-800 dark:text-blue-200 dark:hover:bg-blue-950"
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => excluirNatureza(natureza)}
                      className="rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 dark:border-red-800 dark:text-red-200 dark:hover:bg-red-950"
                    >
                      Excluir
                    </button>
                  </div>
                )}
              </div>

              {natureza.subNaturezas.length === 0 ? (
                <p className="mt-3 text-sm text-gray-500 dark:text-slate-400">
                  Nenhuma subnatureza cadastrada.
                </p>
              ) : (
                <div className="mt-4 flex flex-wrap gap-2">
                  {natureza.subNaturezas.map((subNatureza) => (
                    <span
                      key={subNatureza.id}
                      className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-700 dark:bg-slate-800 dark:text-slate-100"
                    >
                      {subNatureza.nome}
                      {podeEditar && (
                        <span className="flex gap-1">
                          <button
                            type="button"
                            onClick={() => editarSubNatureza(subNatureza)}
                            className="rounded-full px-2 text-xs font-bold text-blue-700 hover:bg-blue-100 dark:text-blue-200 dark:hover:bg-blue-950"
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            onClick={() => excluirSubNatureza(subNatureza)}
                            className="rounded-full px-2 text-xs font-bold text-red-700 hover:bg-red-100 dark:text-red-200 dark:hover:bg-red-950"
                          >
                            Excluir
                          </button>
                        </span>
                      )}
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
