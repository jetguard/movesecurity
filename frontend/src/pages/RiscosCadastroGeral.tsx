import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import type { AxiosError } from "axios";
import { Edit3, ListChecks, Plus, Search, Trash2, X } from "lucide-react";
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
  tipoControle?: "CP" | "CD" | "CC";
  nome: string;
  descricao?: string | null;
  fatoresRisco?: CadastroSimples[];
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
    titulo: "Controles",
    descricao: "Códigos CP, CD e CC por tipo de aplicação.",
  },
];

const tiposControle = [
  { valor: "CP", titulo: "Preventivo", descricao: "Antes do risco ocorrer" },
  { valor: "CD", titulo: "Detectivo", descricao: "Identifica ou alerta" },
  { valor: "CC", titulo: "Corretivo", descricao: "Corrige ou recupera" },
] as const;

const simplesInicial = {
  nome: "",
  descricao: "",
  fatoresIds: [] as string[],
  tipoControle: "CP" as "CP" | "CD" | "CC",
  replicarTipos: [] as Array<"CP" | "CD" | "CC">,
};

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

function rotuloTipoControle(tipo?: string) {
  if (tipo === "CD") return "CD - Detectivo";
  if (tipo === "CC") return "CC - Corretivo";
  return "CP - Preventivo";
}

const palavrasIgnoradasSimilaridade = new Set([
  "a",
  "ao",
  "aos",
  "as",
  "com",
  "da",
  "das",
  "de",
  "do",
  "dos",
  "e",
  "em",
  "na",
  "nas",
  "no",
  "nos",
  "o",
  "os",
  "para",
  "por",
  "um",
  "uma",
]);

function normalizarSimilaridade(valor: string) {
  return valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function tokensSimilaridade(valor: string) {
  return normalizarSimilaridade(valor)
    .split(/\s+/)
    .map((token) =>
      token.length > 4 && token.endsWith("s") ? token.slice(0, -1) : token,
    )
    .filter(
      (token) => token.length > 2 && !palavrasIgnoradasSimilaridade.has(token),
    );
}

function distanciaLevenshtein(a: string, b: string) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const anterior = Array.from({ length: b.length + 1 }, (_, index) => index);
  const atual = Array.from({ length: b.length + 1 }, () => 0);

  for (let i = 1; i <= a.length; i += 1) {
    atual[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const custo = a[i - 1] === b[j - 1] ? 0 : 1;
      atual[j] = Math.min(
        atual[j - 1] + 1,
        anterior[j] + 1,
        anterior[j - 1] + custo,
      );
    }
    for (let j = 0; j <= b.length; j += 1) anterior[j] = atual[j];
  }
  return anterior[b.length];
}

function pontuarSimilaridade(a: string, b: string) {
  const textoA = normalizarSimilaridade(a);
  const textoB = normalizarSimilaridade(b);
  if (!textoA || !textoB) return 0;
  if (textoA === textoB) return 1;
  if (textoA.includes(textoB) || textoB.includes(textoA)) return 0.9;

  const tokensA = new Set(tokensSimilaridade(textoA));
  const tokensB = new Set(tokensSimilaridade(textoB));
  const comuns = [...tokensA].filter((token) => tokensB.has(token)).length;
  const dice =
    tokensA.size + tokensB.size
      ? (2 * comuns) / (tokensA.size + tokensB.size)
      : 0;
  const maxLen = Math.max(textoA.length, textoB.length);
  const levenshtein =
    maxLen <= 120 ? 1 - distanciaLevenshtein(textoA, textoB) / maxLen : 0;
  return Math.max(dice, levenshtein * 0.85);
}

export default function RiscosCadastroGeral() {
  const [aba, setAba] = useState<Aba>("macro");
  const [dados, setDados] = useState<Dados>(dadosVazios);
  const [carregando, setCarregando] = useState(true);
  const [mensagem, setMensagem] = useState("");
  const [macroNome, setMacroNome] = useState("");
  const [setorNome, setSetorNome] = useState("");
  const [macroProcessoId, setMacroProcessoId] = useState("");
  const [simples, setSimples] = useState(simplesInicial);
  const [simplesEditando, setSimplesEditando] =
    useState<CadastroSimples | null>(null);
  const [tipoControleAtivo, setTipoControleAtivo] =
    useState<(typeof tiposControle)[number]["valor"]>("CP");
  const [filtroRiscosTabela, setFiltroRiscosTabela] = useState("");
  const [seletorFatoresAberto, setSeletorFatoresAberto] = useState(false);
  const [filtroFatoresSelecao, setFiltroFatoresSelecao] = useState("");
  const podeEditar = podeAnalisar();

  const abaAtual = useMemo(
    () => abas.find((item) => item.id === aba) || abas[0],
    [aba],
  );

  const riscosTabelaFiltrados = useMemo(() => {
    const termo = filtroRiscosTabela.trim().toLowerCase();
    if (!termo) return dados.riscos;
    return dados.riscos.filter((risco) => {
      const fatores = (risco.fatoresRisco || [])
        .map((fator) => `${fator.codigo} ${fator.nome}`)
        .join(" ");
      return `${risco.codigo} ${risco.nome} ${risco.descricao || ""} ${fatores}`
        .toLowerCase()
        .includes(termo);
    });
  }, [dados.riscos, filtroRiscosTabela]);

  const controlesTabelaFiltrados = useMemo(
    () =>
      dados.controles.filter(
        (controle) => (controle.tipoControle || "CP") === tipoControleAtivo,
      ),
    [dados.controles, tipoControleAtivo],
  );

  const fatoresSelecaoFiltrados = useMemo(() => {
    const termo = filtroFatoresSelecao.trim().toLowerCase();
    if (!termo) return dados.fatores;
    return dados.fatores.filter((fator) =>
      `${fator.codigo} ${fator.nome} ${fator.descricao || ""}`
        .toLowerCase()
        .includes(termo),
    );
  }, [dados.fatores, filtroFatoresSelecao]);

  const fatoresSelecionados = useMemo(
    () =>
      simples.fatoresIds
        .map((id) => dados.fatores.find((fator) => String(fator.id) === id))
        .filter(Boolean) as CadastroSimples[],
    [dados.fatores, simples.fatoresIds],
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
    if (aba === "riscos" || aba === "fatores") {
      const lista = aba === "riscos" ? dados.riscos : dados.fatores;
      const semelhante = encontrarCadastroSemelhante(
        lista,
        simples.nome,
        simples.descricao,
        simplesEditando?.id,
      );
      if (semelhante) {
        const continuar = confirm(
          `Atenção: este cadastro parece semelhante a um item já existente.\n\n` +
            `Item encontrado: ${semelhante.item.codigo} - ${semelhante.item.nome}\n` +
            `Similaridade aproximada: ${Math.round(semelhante.score * 100)}%\n\n` +
            `Deseja continuar mesmo assim?`,
        );
        if (!continuar) return;
      }
    }
    const fatoresRisco =
      aba === "riscos"
        ? simples.fatoresIds
            .map((id) => dados.fatores.find((fator) => String(fator.id) === id))
            .filter(Boolean)
            .map((fator) => ({
              id: fator!.id,
              codigo: fator!.codigo,
              nome: fator!.nome,
            }))
        : undefined;
    const payload = {
      nome: simples.nome,
      descricao: simples.descricao,
      ...(fatoresRisco ? { fatoresRisco } : {}),
      ...(aba === "controles"
        ? {
            tipoControle: simples.tipoControle,
            replicarTipos: simples.replicarTipos,
          }
        : {}),
    };
    await executar(async () => {
      if (simplesEditando) {
        await api.put(`${rota}/${simplesEditando.id}`, {
          ...payload,
          status: simplesEditando.status,
        });
      } else {
        await api.post(rota, payload);
      }
      setSimples({
        ...simplesInicial,
        tipoControle: aba === "controles" ? tipoControleAtivo : "CP",
      });
      setSimplesEditando(null);
    }, simplesEditando ? "Cadastro atualizado." : "Cadastro salvo.");
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

  async function editarSimples(item: CadastroSimples) {
    if (aba === "controles") {
      setTipoControleAtivo(item.tipoControle || "CP");
    }
    setSimplesEditando(item);
    setSimples({
      nome: item.nome,
      descricao: item.descricao || "",
      fatoresIds: (item.fatoresRisco || [])
        .map((fator) => String(fator.id || ""))
        .filter(Boolean),
      tipoControle: item.tipoControle || "CP",
      replicarTipos: [],
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function excluir(url: string, nome: string) {
    if (!confirm(`Deseja excluir ${nome}?`)) return;
    await executar(async () => {
      await api.delete(url);
    }, "Cadastro excluído.");
  }

  function encontrarCadastroSemelhante(
    lista: CadastroSimples[],
    nome: string,
    descricao: string,
    ignorarId?: number,
  ) {
    const textoNovo = `${nome} ${descricao || ""}`;
    const candidatos = lista
      .filter((item) => item.id !== ignorarId)
      .map((item) => ({
        item,
        score: pontuarSimilaridade(
          textoNovo,
          `${item.nome} ${item.descricao || ""}`,
        ),
      }))
      .sort((a, b) => b.score - a.score);
    const melhor = candidatos[0];
    return melhor && melhor.score >= 0.58 ? melhor : null;
  }

  function montarFatoresRiscoPayload() {
    return simples.fatoresIds
      .map((id) => dados.fatores.find((fator) => String(fator.id) === id))
      .filter(Boolean)
      .map((fator) => ({
        id: fator!.id,
        codigo: fator!.codigo,
        nome: fator!.nome,
      }));
  }

  function abrirAtribuicaoFatores(item: CadastroSimples) {
    setSimplesEditando(item);
    setSimples({
      nome: item.nome,
      descricao: item.descricao || "",
      fatoresIds: (item.fatoresRisco || [])
        .map((fator) => String(fator.id || ""))
        .filter(Boolean),
      tipoControle: item.tipoControle || "CP",
      replicarTipos: [],
    });
    setFiltroFatoresSelecao("");
    setSeletorFatoresAberto(true);
  }

  async function salvarAtribuicaoFatores() {
    if (!simplesEditando) {
      setSeletorFatoresAberto(false);
      return;
    }
    await executar(async () => {
      await api.put(`${rotas.riscos}/${simplesEditando.id}`, {
        nome: simples.nome,
        descricao: simples.descricao,
        status: simplesEditando.status,
        fatoresRisco: montarFatoresRiscoPayload(),
      });
      setSeletorFatoresAberto(false);
      setSimplesEditando(null);
      setSimples(simplesInicial);
    }, "Fatores de risco atualizados.");
  }

  function alternarFatorRisco(id: string) {
    setSimples((atual) => ({
      ...atual,
      fatoresIds: atual.fatoresIds.includes(id)
        ? atual.fatoresIds.filter((item) => item !== id)
        : [...atual.fatoresIds, id],
    }));
  }

  function removerFatorRisco(id: string) {
    setSimples((atual) => ({
      ...atual,
      fatoresIds: atual.fatoresIds.filter((item) => item !== id),
    }));
  }

  function TabelaSimples({
    itens,
    rota,
    limitarDezLinhas = false,
    mostrarFatores = false,
    mostrarTipoControle = false,
  }: {
    itens: CadastroSimples[];
    rota: string;
    limitarDezLinhas?: boolean;
    mostrarFatores?: boolean;
    mostrarTipoControle?: boolean;
  }) {
    return (
      <div
        className={`overflow-x-auto rounded-xl border border-slate-800 ${
          limitarDezLinhas ? "max-h-[552px] overflow-y-auto" : ""
        }`}
      >
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-slate-950 text-left text-xs uppercase tracking-[0.18em] text-blue-200">
            <tr>
              <th className="p-3">Código</th>
              {mostrarTipoControle && <th className="p-3">Tipo</th>}
              <th className="p-3">Nome</th>
              <th className="p-3">Descrição</th>
              {mostrarFatores && <th className="p-3">Fatores</th>}
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
                {mostrarTipoControle && (
                  <td className="p-3">
                    <span className="inline-flex rounded-full border border-cyan-400/30 bg-cyan-500/10 px-3 py-1 text-xs font-black text-cyan-100">
                      {rotuloTipoControle(item.tipoControle)}
                    </span>
                  </td>
                )}
                <td className="p-3 font-bold text-white">{item.nome}</td>
                <td className="p-3 text-slate-300">{item.descricao || "-"}</td>
                {mostrarFatores && (
                  <td className="p-3">
                    <span className="inline-flex min-w-24 items-center justify-center rounded-full border border-blue-400/30 bg-blue-500/10 px-3 py-1.5 text-xs font-black text-blue-100">
                      {item.fatoresRisco?.length || 0} atribuído(s)
                    </span>
                  </td>
                )}
                <td className="p-3">
                  <span
                    className={`rounded-full border px-3 py-1 text-xs font-black ${statusClass(item.status)}`}
                  >
                    {item.status}
                  </span>
                </td>
                <td className="p-3">
                  <div className="flex justify-end gap-2">
                    {mostrarFatores && (
                      <button
                        onClick={() => abrirAtribuicaoFatores(item)}
                        className="rounded-lg border border-cyan-700 px-3 py-2 text-cyan-200 hover:bg-cyan-950"
                        title="Atribuir fatores de risco"
                        aria-label={`Atribuir fatores de risco para ${item.nome}`}
                      >
                        <ListChecks size={15} />
                      </button>
                    )}
                    {podeEditar && (
                      <>
                        <button
                          onClick={() => editarSimples(item)}
                          className="rounded-lg border border-blue-700 px-3 py-2 text-blue-200 hover:bg-blue-950"
                        >
                          <Edit3 size={15} />
                        </button>
                        <button
                          onClick={() =>
                            excluir(`${rota}/${item.id}`, item.nome)
                          }
                          className="rounded-lg border border-red-700 px-3 py-2 text-red-200 hover:bg-red-950"
                        >
                          <Trash2 size={15} />
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {!itens.length && (
              <tr>
                <td
                  colSpan={
                    5 + (mostrarFatores ? 1 : 0) + (mostrarTipoControle ? 1 : 0)
                  }
                  className="p-8 text-center text-slate-400"
                >
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
          controles preventivos, detectivos e corretivos para estruturar o novo
          escopo de análise.
        </p>
      </header>

      <div className="mb-6 grid gap-3 md:grid-cols-5">
        {abas.map((item) => (
          <button
            key={item.id}
            onClick={() => {
              setAba(item.id);
              setSimplesEditando(null);
              setSimples({
                ...simplesInicial,
                tipoControle:
                  item.id === "controles" ? tipoControleAtivo : "CP",
              });
              setFiltroRiscosTabela("");
            }}
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
            {simplesEditando ? "Editar" : "Cadastrar"} {abaAtual.titulo}
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
              {simplesEditando ? "Atualizar Cadastro" : "Salvar Cadastro"}
            </button>
            {aba === "controles" && (
              <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 md:col-span-3">
                <div className="grid gap-3 lg:grid-cols-[1fr_1.4fr]">
                  <div>
                    <p className="text-sm font-black text-white">
                      Tipo do controle
                    </p>
                    <div className="mt-3 grid gap-2 sm:grid-cols-3">
                      {tiposControle.map((tipo) => (
                        <label
                          key={tipo.valor}
                          className={`cursor-pointer rounded-xl border p-3 transition ${
                            simples.tipoControle === tipo.valor
                              ? "border-blue-400 bg-blue-500/15 text-blue-100"
                              : "border-slate-700 bg-slate-900 text-slate-200 hover:border-blue-500/60"
                          }`}
                        >
                          <input
                            type="radio"
                            className="sr-only"
                            name="tipoControle"
                            value={tipo.valor}
                            checked={simples.tipoControle === tipo.valor}
                            onChange={() =>
                              {
                                setTipoControleAtivo(tipo.valor);
                                setSimples((atual) => ({
                                  ...atual,
                                  tipoControle: tipo.valor,
                                  replicarTipos: atual.replicarTipos.filter(
                                    (item) => item !== tipo.valor,
                                  ),
                                }));
                              }
                            }
                          />
                          <span className="block text-sm font-black">
                            {tipo.valor} - {tipo.titulo}
                          </span>
                          <span className="mt-1 block text-xs font-semibold text-slate-400">
                            {tipo.descricao}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-sm font-black text-white">
                      Replicar cadastro
                    </p>
                    <p className="mt-1 text-xs font-semibold text-slate-400">
                      Cria o mesmo controle nos tipos selecionados, mantendo
                      sequências próprias CP, CD e CC.
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {tiposControle
                        .filter((tipo) => tipo.valor !== simples.tipoControle)
                        .map((tipo) => (
                          <label
                            key={tipo.valor}
                            className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm font-bold text-slate-100 transition hover:border-blue-400/60"
                          >
                            <input
                              type="checkbox"
                              className="h-4 w-4 accent-blue-500"
                              checked={simples.replicarTipos.includes(
                                tipo.valor,
                              )}
                              onChange={() =>
                                setSimples((atual) => ({
                                  ...atual,
                                  replicarTipos:
                                    atual.replicarTipos.includes(tipo.valor)
                                      ? atual.replicarTipos.filter(
                                          (item) => item !== tipo.valor,
                                        )
                                      : [...atual.replicarTipos, tipo.valor],
                                }))
                              }
                            />
                            Replicar para {tipo.valor} - {tipo.titulo}
                          </label>
                        ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
            {simplesEditando && (
              <button
                type="button"
                onClick={() => {
                  setSimplesEditando(null);
                  setSimples({
                    ...simplesInicial,
                    tipoControle:
                      aba === "controles" ? tipoControleAtivo : "CP",
                  });
                }}
                className="rounded-xl border border-slate-700 px-5 py-3 text-sm font-black text-slate-200 hover:bg-slate-800"
              >
                Cancelar edição
              </button>
            )}
            {aba === "riscos" && (
              <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 md:col-span-3">
                <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                  <div>
                    <p className="text-sm font-black text-white">
                      Fatores de risco atribuídos
                    </p>
                    <p className="mt-1 text-xs font-semibold text-slate-400">
                      Use a busca detalhada para atribuir fatores ao risco. Eles
                      serão pré-selecionados na Análise Completa.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSeletorFatoresAberto(true);
                      setFiltroFatoresSelecao("");
                    }}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-blue-400/40 bg-blue-500/10 px-4 py-3 text-sm font-black text-blue-100 transition hover:bg-blue-500/20"
                  >
                    <ListChecks size={16} />
                    Buscar fatores
                  </button>
                </div>

                <div className="mt-3 flex min-h-16 flex-wrap gap-2 rounded-xl border border-slate-800 bg-slate-900/80 p-3">
                  {fatoresSelecionados.map((fator) => (
                    <span
                      key={fator.id}
                      className="inline-flex items-center gap-2 rounded-xl border border-blue-400/30 bg-blue-500/10 px-3 py-2 text-xs font-black text-blue-100"
                    >
                      {fator.codigo} - {fator.nome}
                      <button
                        type="button"
                        onClick={() => removerFatorRisco(String(fator.id))}
                        className="rounded-lg border border-blue-300/20 p-1 text-blue-100 hover:border-red-300/50 hover:text-red-100"
                        aria-label={`Remover ${fator.nome}`}
                      >
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                  {!fatoresSelecionados.length && (
                    <p className="text-sm font-bold text-slate-400">
                      Nenhum fator atribuído ainda.
                    </p>
                  )}
                </div>
              </div>
            )}
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
        <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 shadow-lg">
          <div className="mb-4 grid gap-3 lg:grid-cols-[1fr_auto] lg:items-center">
            <label className="relative block">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
                size={16}
              />
              <input
                className="h-12 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 pl-10 text-sm font-bold text-white outline-none transition focus:border-blue-400"
                value={filtroRiscosTabela}
                onChange={(event) => setFiltroRiscosTabela(event.target.value)}
                placeholder="Buscar risco por código, nome, descrição ou fator vinculado"
              />
            </label>
            <div className="rounded-xl border border-blue-400/20 bg-blue-500/10 px-4 py-3 text-sm font-black text-blue-100">
              {riscosTabelaFiltrados.length} de {dados.riscos.length} risco(s)
            </div>
          </div>
          <TabelaSimples
            itens={riscosTabelaFiltrados}
            rota={rotas.riscos}
            limitarDezLinhas
            mostrarFatores
          />
        </section>
      )}
      {aba === "fatores" && (
        <TabelaSimples
          itens={dados.fatores}
          rota={rotas.fatores}
          limitarDezLinhas
        />
      )}
      {aba === "controles" && (
        <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 shadow-lg">
          <div className="mb-4 grid gap-2 sm:grid-cols-3">
            {tiposControle.map((tipo) => {
              const total = dados.controles.filter(
                (controle) => (controle.tipoControle || "CP") === tipo.valor,
              ).length;
              return (
                <button
                  key={tipo.valor}
                  type="button"
                  onClick={() => {
                    setTipoControleAtivo(tipo.valor);
                    setSimplesEditando(null);
                    setSimples({
                      ...simplesInicial,
                      tipoControle: tipo.valor,
                    });
                  }}
                  className={`rounded-xl border p-4 text-left transition ${
                    tipoControleAtivo === tipo.valor
                      ? "border-blue-400 bg-blue-600 text-white shadow-lg shadow-blue-950/40"
                      : "border-slate-800 bg-slate-950 text-slate-300 hover:border-blue-700 hover:bg-slate-900"
                  }`}
                >
                  <span className="flex items-center justify-between gap-3">
                    <strong className="text-sm">
                      {tipo.valor} - {tipo.titulo}
                    </strong>
                    <span className="rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-xs font-black">
                      {total}
                    </span>
                  </span>
                  <span className="mt-1 block text-xs font-semibold opacity-80">
                    {tipo.descricao}
                  </span>
                </button>
              );
            })}
          </div>
          <TabelaSimples
            itens={controlesTabelaFiltrados}
            rota={rotas.controles}
            mostrarTipoControle
          />
        </section>
      )}

      {seletorFatoresAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-sm">
          <div className="w-full max-w-3xl overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl shadow-slate-950">
            <div className="flex items-start justify-between gap-4 border-b border-slate-800 p-5">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.28em] text-blue-300">
                  Atribuir fatores de risco
                </p>
                <h3 className="mt-2 text-xl font-black text-white">
                  {simplesEditando
                    ? `Editar ${simplesEditando.codigo}`
                    : "Novo risco"}
                </h3>
                <p className="mt-1 text-sm font-semibold text-slate-300">
                  {simples.fatoresIds.length} fator(es) selecionado(s).
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSeletorFatoresAberto(false)}
                className="rounded-xl border border-slate-700 p-2 text-slate-300 hover:bg-slate-800 hover:text-white"
                aria-label="Fechar seleção de fatores"
              >
                <X size={18} />
              </button>
            </div>

            <div className="border-b border-slate-800 p-5">
              <label className="relative block">
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
                  size={16}
                />
                <input
                  className="h-12 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 pl-10 text-sm font-bold text-white outline-none transition focus:border-blue-400"
                  value={filtroFatoresSelecao}
                  onChange={(event) =>
                    setFiltroFatoresSelecao(event.target.value)
                  }
                  placeholder="Buscar por FR001, código, nome ou descrição"
                />
              </label>
            </div>

            <div className="max-h-[52vh] overflow-y-auto p-5">
              <div className="grid gap-2">
                {fatoresSelecaoFiltrados.map((fator) => {
                  const id = String(fator.id);
                  const marcado = simples.fatoresIds.includes(id);
                  return (
                    <button
                      key={fator.id}
                      type="button"
                      onClick={() => alternarFatorRisco(id)}
                      className={`flex items-start justify-between gap-4 rounded-xl border p-3 text-left transition ${
                        marcado
                          ? "border-blue-400 bg-blue-600 text-white"
                          : "border-slate-700 bg-slate-950 text-slate-200 hover:border-blue-400"
                      }`}
                    >
                      <span className="min-w-0">
                        <strong className="text-sm">{fator.codigo}</strong>
                        <span className="ml-2 text-sm font-bold">
                          {fator.nome}
                        </span>
                        {fator.descricao && (
                          <span
                            className={`mt-1 block text-xs font-semibold leading-5 ${
                              marcado ? "text-blue-50" : "text-slate-400"
                            }`}
                          >
                            {fator.descricao}
                          </span>
                        )}
                      </span>
                      <span
                        className={`mt-0.5 h-5 w-5 shrink-0 rounded-full border ${
                          marcado
                            ? "border-white bg-white shadow-inner"
                            : "border-slate-600"
                        }`}
                      />
                    </button>
                  );
                })}
                {!fatoresSelecaoFiltrados.length && (
                  <p className="rounded-xl border border-slate-800 bg-slate-950 p-5 text-center text-sm font-bold text-slate-400">
                    Nenhum fator encontrado para esta busca.
                  </p>
                )}
              </div>
            </div>

            <div className="flex flex-col justify-end gap-3 border-t border-slate-800 p-5 sm:flex-row">
              <button
                type="button"
                onClick={() => setSeletorFatoresAberto(false)}
                className="rounded-xl border border-slate-700 px-5 py-3 text-sm font-black text-slate-200 hover:bg-slate-800"
              >
                Concluir atribuição
              </button>
              {simplesEditando && (
                <button
                  type="button"
                  onClick={salvarAtribuicaoFatores}
                  className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-black text-white hover:bg-blue-500"
                >
                  Salvar fatores do risco
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
