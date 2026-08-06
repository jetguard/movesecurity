import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import type { AxiosError } from "axios";
import { Edit3, Plus, Trash2 } from "lucide-react";
import { api } from "../services/api";
import { podeAnalisar } from "../utils/permissoes";

type ApiError = { error?: string };

type MacroProcesso = {
  id: number;
  numero: number;
  codigo: string;
  nome: string;
  status: string;
  setores: SetorRisco[];
};

type SetorRisco = {
  id: number;
  nome: string;
  macroProcessoId: number;
  status: string;
};

type CadastroSimples = {
  id: number;
  numero: number;
  codigo: string;
  nome: string;
  descricao?: string | null;
  status: string;
};

type Dados = {
  macroProcessos: MacroProcesso[];
  riscos: CadastroSimples[];
  fatores: CadastroSimples[];
  controles: CadastroSimples[];
};

type Aba = "macro" | "setores" | "riscos" | "fatores" | "controles";

const abas: Array<{ id: Aba; titulo: string; descricao: string }> = [
  {
    id: "macro",
    titulo: "Macro Processo",
    descricao: "Códigos sequenciais MP001, MP002...",
  },
  {
    id: "setores",
    titulo: "Setores",
    descricao: "Setores vinculados a um macro processo.",
  },
  {
    id: "riscos",
    titulo: "Risco",
    descricao: "Códigos sequenciais R001, R002...",
  },
  {
    id: "fatores",
    titulo: "Fator de Risco",
    descricao: "Códigos sequenciais FR001, FR002...",
  },
  {
    id: "controles",
    titulo: "Controle Preventivo",
    descricao: "Códigos sequenciais CP001, CP002...",
  },
];

const dadosVazios: Dados = {
  macroProcessos: [],
  riscos: [],
  fatores: [],
  controles: [],
};

const rotas = {
  riscos: "/riscos/cadastro-geral/riscos",
  fatores: "/riscos/cadastro-geral/fatores",
  controles: "/riscos/cadastro-geral/controles",
};

function erroApi(error: unknown, fallback: string) {
  const apiError = error as AxiosError<ApiError>;
  return apiError.response?.data?.error || fallback;
}

function statusClass(status: string) {
  return status === "Ativo"
    ? "border-emerald-500/30 bg-emerald-950/60 text-emerald-200"
    : "border-slate-600 bg-slate-800 text-slate-200";
}

export default function RiscosCadastroGeral() {
  const [aba, setAba] = useState<Aba>("macro");
  const [dados, setDados] = useState<Dados>(dadosVazios);
  const [carregando, setCarregando] = useState(true);
  const [mensagem, setMensagem] = useState("");
  const [macroNome, setMacroNome] = useState("");
  const [setorNome, setSetorNome] = useState("");
  const [macroProcessoId, setMacroProcessoId] = useState("");
  const [simples, setSimples] = useState({ nome: "", descricao: "" });
  const podeEditar = podeAnalisar();

  const abaAtual = useMemo(
    () => abas.find((item) => item.id === aba) || abas[0],
    [aba],
  );

  async function carregar() {
    setCarregando(true);
    try {
      const response = await api.get("/riscos/cadastro-geral");
      setDados(response.data || dadosVazios);
    } catch (error) {
      setMensagem(erroApi(error, "Erro ao carregar cadastro geral."));
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregar();
  }, []);

  async function executar(acao: () => Promise<void>, sucesso: string) {
    try {
      setMensagem("");
      await acao();
      setMensagem(sucesso);
      await carregar();
    } catch (error) {
      setMensagem(erroApi(error, "Não foi possível concluir a operação."));
    }
  }

  async function salvarMacro(e: FormEvent) {
    e.preventDefault();
    await executar(async () => {
      await api.post("/riscos/cadastro-geral/macro-processos", {
        nome: macroNome,
      });
      setMacroNome("");
    }, "Macro processo cadastrado.");
  }

  async function salvarSetor(e: FormEvent) {
    e.preventDefault();
    await executar(async () => {
      await api.post("/riscos/cadastro-geral/setores", {
        nome: setorNome,
        macroProcessoId: Number(macroProcessoId),
      });
      setSetorNome("");
      setMacroProcessoId("");
    }, "Setor cadastrado.");
  }

  async function salvarSimples(e: FormEvent) {
    e.preventDefault();
    const rota = rotas[aba as keyof typeof rotas];
    if (!rota) return;
    await executar(async () => {
      await api.post(rota, simples);
      setSimples({ nome: "", descricao: "" });
    }, "Cadastro salvo.");
  }

  async function editarMacro(item: MacroProcesso) {
    const nome = prompt(
      "Informe o novo nome do macro processo:",
      item.nome,
    )?.trim();
    if (!nome || nome === item.nome) return;
    await executar(async () => {
      await api.put(`/riscos/cadastro-geral/macro-processos/${item.id}`, {
        nome,
        status: item.status,
      });
    }, "Macro processo atualizado.");
  }

  async function editarSetor(item: SetorRisco) {
    const nome = prompt("Informe o novo nome do setor:", item.nome)?.trim();
    if (!nome || nome === item.nome) return;
    await executar(async () => {
      await api.put(`/riscos/cadastro-geral/setores/${item.id}`, {
        nome,
        macroProcessoId: item.macroProcessoId,
        status: item.status,
      });
    }, "Setor atualizado.");
  }

  async function editarSimples(item: CadastroSimples, rota: string) {
    const nome = prompt("Informe o novo nome:", item.nome)?.trim();
    if (!nome || nome === item.nome) return;
    const descricao =
      prompt("Informe a descrição:", item.descricao || "")?.trim() || "";
    await executar(async () => {
      await api.put(`${rota}/${item.id}`, {
        nome,
        descricao,
        status: item.status,
      });
    }, "Cadastro atualizado.");
  }

  async function excluir(url: string, nome: string) {
    if (!confirm(`Deseja excluir ${nome}?`)) return;
    await executar(async () => {
      await api.delete(url);
    }, "Cadastro excluído.");
  }

  function TabelaSimples({
    itens,
    rota,
  }: {
    itens: CadastroSimples[];
    rota: string;
  }) {
    return (
      <div className="overflow-x-auto rounded-xl border border-slate-800">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-slate-950 text-left text-xs uppercase tracking-[0.18em] text-blue-200">
            <tr>
              <th className="p-3">Código</th>
              <th className="p-3">Nome</th>
              <th className="p-3">Descrição</th>
              <th className="p-3">Status</th>
              <th className="p-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {itens.map((item) => (
              <tr
                key={item.id}
                className="border-t border-slate-800 text-slate-200"
              >
                <td className="p-3 font-black text-blue-200">{item.codigo}</td>
                <td className="p-3 font-bold text-white">{item.nome}</td>
                <td className="p-3 text-slate-300">{item.descricao || "-"}</td>
                <td className="p-3">
                  <span
                    className={`rounded-full border px-3 py-1 text-xs font-black ${statusClass(item.status)}`}
                  >
                    {item.status}
                  </span>
                </td>
                <td className="p-3">
                  {podeEditar && (
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => editarSimples(item, rota)}
                        className="rounded-lg border border-blue-700 px-3 py-2 text-blue-200 hover:bg-blue-950"
                      >
                        <Edit3 size={15} />
                      </button>
                      <button
                        onClick={() => excluir(`${rota}/${item.id}`, item.nome)}
                        className="rounded-lg border border-red-700 px-3 py-2 text-red-200 hover:bg-red-950"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {!itens.length && (
              <tr>
                <td colSpan={5} className="p-8 text-center text-slate-400">
                  Nenhum cadastro encontrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 p-6 text-slate-100">
      <header className="mb-6 border-b border-slate-800 pb-6">
        <p className="text-xs font-black uppercase tracking-[0.35em] text-blue-300">
          Análise de Riscos
        </p>
        <h1 className="mt-2 text-3xl font-black text-white">Cadastro Geral</h1>
        <p className="mt-2 max-w-3xl text-sm font-semibold text-slate-300">
          Cadastre macro processos, setores, riscos, fatores de risco e
          controles preventivos para estruturar o novo escopo de análise.
        </p>
      </header>

      <div className="mb-6 grid gap-3 md:grid-cols-5">
        {abas.map((item) => (
          <button
            key={item.id}
            onClick={() => setAba(item.id)}
            className={`rounded-xl border p-4 text-left transition ${aba === item.id ? "border-blue-500 bg-blue-600 text-white shadow-lg shadow-blue-950/40" : "border-slate-800 bg-slate-900 text-slate-300 hover:border-blue-800 hover:bg-slate-800"}`}
          >
            <span className="block text-sm font-black">{item.titulo}</span>
            <span className="mt-1 block text-xs font-semibold opacity-80">
              {item.descricao}
            </span>
          </button>
        ))}
      </div>

      {mensagem && (
        <div className="mb-5 rounded-xl border border-blue-800 bg-blue-950/70 p-4 text-sm font-bold text-blue-100">
          {mensagem}
        </div>
      )}
      {carregando && (
        <div className="mb-5 rounded-xl border border-slate-800 bg-slate-900 p-5 text-sm font-bold text-slate-300">
          Carregando cadastro geral...
        </div>
      )}

      <section className="mb-6 rounded-xl border border-slate-800 bg-slate-900/80 p-5 shadow-lg">
        <div className="mb-4 flex items-center gap-2">
          <Plus className="text-blue-300" size={20} />
          <h2 className="text-lg font-black text-white">
            Cadastrar {abaAtual.titulo}
          </h2>
        </div>

        {!podeEditar ? (
          <p className="rounded-lg bg-slate-950 p-4 text-sm font-semibold text-slate-300">
            Seu perfil pode consultar estes cadastros, mas não pode alterar
            registros.
          </p>
        ) : aba === "macro" ? (
          <form
            onSubmit={salvarMacro}
            className="flex flex-col gap-3 md:flex-row"
          >
            <input
              className="h-12 flex-1 rounded-xl border border-slate-700 bg-slate-950 px-4 text-sm font-bold text-white outline-none"
              placeholder="Ex: Jurídico"
              value={macroNome}
              onChange={(e) => setMacroNome(e.target.value)}
              required
            />
            <button className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-black text-white hover:bg-blue-500">
              Salvar Macro Processo
            </button>
          </form>
        ) : aba === "setores" ? (
          <form
            onSubmit={salvarSetor}
            className="grid gap-3 md:grid-cols-[1fr_1fr_auto]"
          >
            <input
              className="h-12 rounded-xl border border-slate-700 bg-slate-950 px-4 text-sm font-bold text-white outline-none"
              placeholder="Ex: Balança"
              value={setorNome}
              onChange={(e) => setSetorNome(e.target.value)}
              required
            />
            <select
              className="h-12 rounded-xl border border-slate-700 bg-slate-950 px-4 text-sm font-bold text-white outline-none"
              value={macroProcessoId}
              onChange={(e) => setMacroProcessoId(e.target.value)}
              required
            >
              <option value="">Associar a um macro processo</option>
              {dados.macroProcessos.map((mp) => (
                <option key={mp.id} value={mp.id}>
                  {mp.codigo} - {mp.nome}
                </option>
              ))}
            </select>
            <button className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-black text-white hover:bg-blue-500">
              Salvar Setor
            </button>
          </form>
        ) : (
          <form
            onSubmit={salvarSimples}
            className="grid gap-3 md:grid-cols-[1fr_2fr_auto]"
          >
            <input
              className="h-12 rounded-xl border border-slate-700 bg-slate-950 px-4 text-sm font-bold text-white outline-none"
              placeholder={`Nome do ${abaAtual.titulo.toLowerCase()}`}
              value={simples.nome}
              onChange={(e) =>
                setSimples((atual) => ({ ...atual, nome: e.target.value }))
              }
              required
            />
            <input
              className="h-12 rounded-xl border border-slate-700 bg-slate-950 px-4 text-sm font-bold text-white outline-none"
              placeholder="Descrição opcional"
              value={simples.descricao}
              onChange={(e) =>
                setSimples((atual) => ({ ...atual, descricao: e.target.value }))
              }
            />
            <button className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-black text-white hover:bg-blue-500">
              Salvar Cadastro
            </button>
          </form>
        )}
      </section>

      {aba === "macro" && (
        <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/80 shadow-lg">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="bg-slate-950 text-left text-xs uppercase tracking-[0.18em] text-blue-200">
              <tr>
                <th className="p-3">Código</th>
                <th className="p-3">Macro processo</th>
                <th className="p-3">Setores vinculados</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {dados.macroProcessos.map((item) => (
                <tr
                  key={item.id}
                  className="border-t border-slate-800 text-slate-200"
                >
                  <td className="p-3 font-black text-blue-200">
                    {item.codigo}
                  </td>
                  <td className="p-3 font-bold text-white">{item.nome}</td>
                  <td className="p-3">{item.setores.length}</td>
                  <td className="p-3">
                    <span
                      className={`rounded-full border px-3 py-1 text-xs font-black ${statusClass(item.status)}`}
                    >
                      {item.status}
                    </span>
                  </td>
                  <td className="p-3">
                    {podeEditar && (
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => editarMacro(item)}
                          className="rounded-lg border border-blue-700 px-3 py-2 text-blue-200 hover:bg-blue-950"
                        >
                          <Edit3 size={15} />
                        </button>
                        <button
                          onClick={() =>
                            excluir(
                              `/riscos/cadastro-geral/macro-processos/${item.id}`,
                              item.nome,
                            )
                          }
                          className="rounded-lg border border-red-700 px-3 py-2 text-red-200 hover:bg-red-950"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {!dados.macroProcessos.length && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-400">
                    Nenhum macro processo cadastrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {aba === "setores" && (
        <div className="space-y-4">
          {dados.macroProcessos.map((mp) => (
            <div
              key={mp.id}
              className="rounded-xl border border-slate-800 bg-slate-900/80 p-5 shadow-lg"
            >
              <h2 className="text-lg font-black text-white">
                {mp.codigo} - {mp.nome}
              </h2>
              <div className="mt-4 flex flex-wrap gap-2">
                {mp.setores.map((setor) => (
                  <span
                    key={setor.id}
                    className="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-950 px-3 py-2 text-sm font-bold text-slate-100"
                  >
                    {setor.nome}
                    {podeEditar && (
                      <>
                        <button
                          onClick={() => editarSetor(setor)}
                          className="text-blue-300"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() =>
                            excluir(
                              `/riscos/cadastro-geral/setores/${setor.id}`,
                              setor.nome,
                            )
                          }
                          className="text-red-300"
                        >
                          Excluir
                        </button>
                      </>
                    )}
                  </span>
                ))}
                {!mp.setores.length && (
                  <p className="text-sm text-slate-400">
                    Nenhum setor vinculado.
                  </p>
                )}
              </div>
            </div>
          ))}
          {!dados.macroProcessos.length && (
            <div className="rounded-xl border border-slate-800 bg-slate-900 p-8 text-center text-slate-400">
              Cadastre um macro processo antes de cadastrar setores.
            </div>
          )}
        </div>
      )}

      {aba === "riscos" && (
        <TabelaSimples itens={dados.riscos} rota={rotas.riscos} />
      )}
      {aba === "fatores" && (
        <TabelaSimples itens={dados.fatores} rota={rotas.fatores} />
      )}
      {aba === "controles" && (
        <TabelaSimples itens={dados.controles} rota={rotas.controles} />
      )}
    </div>
  );
}
