import { useEffect, useMemo, useState } from "react";
import type { AxiosError } from "axios";
import { Edit3, Eye, MapPin, Plus, Trash2 } from "lucide-react";
import { api } from "../../services/api";
import { podeAdministrar } from "../../utils/permissoes";

type ApiError = {
  error?: string;
};

type LocalTerminal = {
  id: number;
  nome: string;
  descricao?: string | null;
  tipo: string;
  areaSensivel: boolean;
  status: string;
  createdAt: string;
};

const tipos = ["Operacional", "Administrativo", "Acesso", "Armazenagem", "Segurança", "Outro"];
const vazio = {
  nome: "",
  descricao: "",
  tipo: "Operacional",
  areaSensivel: false,
  status: "Ativo",
};

export default function Locais() {
  const [locais, setLocais] = useState<LocalTerminal[]>([]);
  const [form, setForm] = useState({ ...vazio });
  const [editando, setEditando] = useState<LocalTerminal | null>(null);
  const [visualizando, setVisualizando] = useState<LocalTerminal | null>(null);
  const [busca, setBusca] = useState("");
  const podeEditar = podeAdministrar();

  async function carregarLocais() {
    const response = await api.get("/locais");
    setLocais(response.data);
  }

  useEffect(() => {
    carregarLocais();
  }, []);

  const locaisFiltrados = useMemo(() => {
    const texto = busca.toLocaleUpperCase("pt-BR");
    return locais.filter((local) =>
      local.nome.includes(texto) ||
      local.tipo.toLocaleUpperCase("pt-BR").includes(texto) ||
      (local.descricao || "").toLocaleUpperCase("pt-BR").includes(texto)
    );
  }, [busca, locais]);

  function campo(nome: string, valor: string | boolean) {
    setForm((atual) => ({
      ...atual,
      [nome]: nome === "nome" && typeof valor === "string" ? valor.toLocaleUpperCase("pt-BR") : valor,
    }));
  }

  function novoLocal() {
    setForm({ ...vazio });
    setEditando(null);
  }

  function editarLocal(local: LocalTerminal) {
    setEditando(local);
    setForm({
      nome: local.nome,
      descricao: local.descricao || "",
      tipo: local.tipo,
      areaSensivel: local.areaSensivel,
      status: local.status,
    });
  }

  async function salvarLocal(e: React.FormEvent) {
    e.preventDefault();

    try {
      if (editando) {
        await api.put(`/locais/${editando.id}`, form);
      } else {
        await api.post("/locais", form);
      }

      novoLocal();
      carregarLocais();
    } catch (error) {
      const apiError = error as AxiosError<ApiError>;
      alert(apiError.response?.data?.error || "Erro ao salvar local");
    }
  }

  async function excluirLocal(local: LocalTerminal) {
    if (!confirm(`Deseja excluir o local ${local.nome}?`)) return;
    await api.delete(`/locais/${local.id}`);
    carregarLocais();
  }

  return (
    <div className="space-y-6 p-6 text-slate-900 dark:text-slate-100">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Locais</h1>
          <p className="mt-1 text-slate-500 dark:text-slate-400">
            Base de locais do terminal usada em ocorrências, eventos e investigações.
          </p>
        </div>
        {podeEditar && (
          <button onClick={novoLocal} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">
            <Plus size={18} />
            Novo Local
          </button>
        )}
      </div>

      {!podeEditar && (
        <div className="rounded-xl border border-blue-500/20 bg-blue-50 p-4 text-sm text-blue-800 dark:bg-blue-950/30 dark:text-blue-200">
          Você pode consultar os locais cadastrados. Cadastro, edição e exclusão ficam disponíveis para administradores.
        </div>
      )}

      {podeEditar && (
        <form onSubmit={salvarLocal} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-4 flex items-center gap-2">
            <MapPin className="text-blue-600" size={20} />
            <h2 className="text-xl font-bold">{editando ? "Editar local" : "Cadastrar local"}</h2>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <input
              className="rounded-lg border border-slate-300 bg-white p-3 uppercase text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              placeholder="Nome do local. Ex: GATE 1"
              value={form.nome}
              onChange={(e) => campo("nome", e.target.value)}
              required
            />
            <select
              className="rounded-lg border border-slate-300 bg-white p-3 text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              value={form.tipo}
              onChange={(e) => campo("tipo", e.target.value)}
            >
              {tipos.map((tipo) => (
                <option key={tipo} value={tipo}>{tipo}</option>
              ))}
            </select>
            <select
              className="rounded-lg border border-slate-300 bg-white p-3 text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              value={form.areaSensivel ? "Sim" : "Não"}
              onChange={(e) => campo("areaSensivel", e.target.value === "Sim")}
            >
              <option value="Não">Área sensível: Não</option>
              <option value="Sim">Área sensível: Sim</option>
            </select>
            <select
              className="rounded-lg border border-slate-300 bg-white p-3 text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              value={form.status}
              onChange={(e) => campo("status", e.target.value)}
            >
              <option value="Ativo">Ativo</option>
              <option value="Inativo">Inativo</option>
            </select>
            <textarea
              className="min-h-28 rounded-lg border border-slate-300 bg-white p-3 text-slate-900 md:col-span-2 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              placeholder="Descrição opcional do local"
              value={form.descricao}
              onChange={(e) => campo("descricao", e.target.value)}
            />
          </div>

          <div className="mt-4 flex flex-wrap gap-3">
            <button className="rounded-lg bg-green-600 px-4 py-2 text-white hover:bg-green-700">
              Salvar Local
            </button>
            {editando && (
              <button type="button" onClick={novoLocal} className="rounded-lg bg-slate-200 px-4 py-2 text-slate-800 hover:bg-slate-300 dark:bg-slate-800 dark:text-slate-100">
                Cancelar edição
              </button>
            )}
          </div>
        </form>
      )}

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <input
          className="mb-4 w-full rounded-lg border border-slate-300 bg-white p-3 text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
          placeholder="Pesquisar por nome, tipo ou descrição"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-100 text-left text-slate-600 dark:bg-slate-950 dark:text-slate-300">
              <tr>
                <th className="p-3">Nome do local</th>
                <th className="p-3">Tipo</th>
                <th className="p-3">Área sensível</th>
                <th className="p-3">Status</th>
                <th className="p-3">Data de cadastro</th>
                <th className="p-3">Ações</th>
              </tr>
            </thead>
            <tbody>
              {locaisFiltrados.map((local) => (
                <tr key={local.id} className="border-t border-slate-200 dark:border-slate-800">
                  <td className="p-3 font-bold">{local.nome}</td>
                  <td className="p-3">{local.tipo}</td>
                  <td className="p-3">
                    {local.areaSensivel ? (
                      <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-bold text-red-700 dark:bg-red-950/50 dark:text-red-200">ÁREA SENSÍVEL</span>
                    ) : (
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">Não</span>
                    )}
                  </td>
                  <td className="p-3">
                    <span className={`rounded-full px-3 py-1 text-xs font-bold ${local.status === "Ativo" ? "bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-200" : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"}`}>
                      {local.status}
                    </span>
                  </td>
                  <td className="p-3">{new Date(local.createdAt).toLocaleDateString("pt-BR")}</td>
                  <td className="p-3">
                    <div className="flex flex-wrap gap-2">
                      <button onClick={() => setVisualizando(local)} className="rounded bg-slate-700 p-2 text-white" title="Ver">
                        <Eye size={16} />
                      </button>
                      {podeEditar && (
                        <>
                          <button onClick={() => editarLocal(local)} className="rounded bg-blue-600 p-2 text-white" title="Editar">
                            <Edit3 size={16} />
                          </button>
                          <button onClick={() => excluirLocal(local)} className="rounded bg-red-600 p-2 text-white" title="Excluir">
                            <Trash2 size={16} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {locaisFiltrados.length === 0 && (
                <tr>
                  <td className="p-6 text-center text-slate-500" colSpan={6}>Nenhum local encontrado.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {visualizando && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4">
          <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold">{visualizando.nome}</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">{visualizando.tipo}</p>
              </div>
              <button onClick={() => setVisualizando(null)} className="rounded-lg bg-slate-100 px-3 py-2 text-slate-700 dark:bg-slate-800 dark:text-slate-100">
                Fechar
              </button>
            </div>
            <div className="mt-5 space-y-3 text-sm">
              <p><strong>Status:</strong> {visualizando.status}</p>
              <p><strong>Área sensível:</strong> {visualizando.areaSensivel ? "Sim" : "Não"}</p>
              <p><strong>Descrição:</strong> {visualizando.descricao || "Não informada"}</p>
              <p><strong>Cadastro:</strong> {new Date(visualizando.createdAt).toLocaleString("pt-BR")}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
