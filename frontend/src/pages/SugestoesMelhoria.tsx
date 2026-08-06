import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { ImagePlus, Lightbulb, RefreshCcw, Send } from "lucide-react";
import { api } from "../services/api";
import { podeAdministrar } from "../utils/permissoes";

type SugestaoMelhoria = {
  id: number;
  assunto: string;
  sugestao: string;
  printTela?: string | null;
  nomeArquivo?: string | null;
  status: string;
  resposta?: string | null;
  unidade: string;
  createdAt: string;
  avaliadoEm?: string | null;
  autor: {
    nome: string;
    apelido?: string | null;
    email: string;
    perfilAcesso?: string;
  };
  avaliadoPor?: {
    nome: string;
    apelido?: string | null;
  } | null;
};

const statusSugestao = [
  "Recebida",
  "Em análise",
  "Aprovada",
  "Implementada",
  "Recusada",
];

const statusClasse: Record<string, string> = {
  Recebida: "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-200",
  "Em análise":
    "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-200",
  Aprovada:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-200",
  Implementada:
    "bg-purple-100 text-purple-700 dark:bg-purple-500/15 dark:text-purple-200",
  Recusada: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-200",
};

function nomePessoa(pessoa?: { nome: string; apelido?: string | null } | null) {
  return pessoa?.apelido || pessoa?.nome || "Não informado";
}

export default function SugestoesMelhoria() {
  const [sugestoes, setSugestoes] = useState<SugestaoMelhoria[]>([]);
  const [assunto, setAssunto] = useState("");
  const [sugestao, setSugestao] = useState("");
  const [printTela, setPrintTela] = useState<File | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [statusEdicao, setStatusEdicao] = useState<Record<number, string>>({});
  const [respostas, setRespostas] = useState<Record<number, string>>({});
  const administrador = podeAdministrar();

  async function carregar() {
    setCarregando(true);
    try {
      const response = await api.get("/sugestoes-melhoria");
      setSugestoes(response.data);
      setStatusEdicao(
        Object.fromEntries(
          response.data.map((item: SugestaoMelhoria) => [item.id, item.status]),
        ),
      );
      setRespostas(
        Object.fromEntries(
          response.data.map((item: SugestaoMelhoria) => [
            item.id,
            item.resposta || "",
          ]),
        ),
      );
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregar();
  }, []);

  async function salvar(event: FormEvent) {
    event.preventDefault();
    setSalvando(true);
    try {
      const formData = new FormData();
      formData.append("assunto", assunto);
      formData.append("sugestao", sugestao);
      if (printTela) formData.append("printTela", printTela);

      await api.post("/sugestoes-melhoria", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setAssunto("");
      setSugestao("");
      setPrintTela(null);
      await carregar();
    } finally {
      setSalvando(false);
    }
  }

  async function atualizarStatus(id: number) {
    await api.put(`/sugestoes-melhoria/${id}/status`, {
      status: statusEdicao[id],
      resposta: respostas[id],
    });
    await carregar();
  }

  return (
    <div className="space-y-6 text-slate-900 dark:text-slate-100">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-300">
            Administração
          </p>
          <h1 className="text-3xl font-bold">Sugestão de melhorias</h1>
          <p className="mt-1 text-slate-500 dark:text-slate-400">
            Envie ideias, correções e melhorias para evolução do JetGuard.
          </p>
        </div>

        <button
          type="button"
          onClick={carregar}
          className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900"
        >
          <RefreshCcw size={16} className={carregando ? "animate-spin" : ""} />
          Atualizar
        </button>
      </div>

      <form
        onSubmit={salvar}
        className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
      >
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-300">
            <Lightbulb size={22} />
          </div>
          <div>
            <h2 className="text-xl font-bold">Nova sugestão</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Inclua um print quando a melhoria for visual ou envolver alguma
              tela.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <input
            className="rounded-xl border border-slate-300 p-3 dark:border-slate-700 dark:bg-slate-950"
            placeholder="Assunto da melhoria"
            value={assunto}
            onChange={(event) => setAssunto(event.target.value)}
            required
          />

          <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-slate-300 p-3 text-slate-500 transition hover:border-blue-400 hover:text-blue-600 dark:border-slate-700 dark:text-slate-400">
            <ImagePlus size={20} />
            <span className="truncate">
              {printTela?.name || "Anexar print de tela ou PDF"}
            </span>
            <input
              type="file"
              className="hidden"
              accept="image/*,.pdf"
              onChange={(event) =>
                setPrintTela(event.target.files?.[0] || null)
              }
            />
          </label>

          <textarea
            className="min-h-36 rounded-xl border border-slate-300 p-3 lg:col-span-2 dark:border-slate-700 dark:bg-slate-950"
            placeholder="Descreva a sugestão, o problema percebido ou a melhoria desejada"
            value={sugestao}
            onChange={(event) => setSugestao(event.target.value)}
            required
          />
        </div>

        <button
          disabled={salvando}
          className="mt-4 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 font-semibold text-white transition hover:bg-blue-700 disabled:bg-slate-300"
        >
          <Send size={16} />
          {salvando ? "Enviando..." : "Enviar sugestão"}
        </button>
      </form>

      <section className="space-y-4">
        {sugestoes.map((item) => (
          <article
            key={item.id}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
          >
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-xl font-bold">{item.assunto}</h2>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-bold ${statusClasse[item.status] || statusClasse.Recebida}`}
                  >
                    {item.status}
                  </span>
                </div>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Enviada por {nomePessoa(item.autor)} em{" "}
                  {new Date(item.createdAt).toLocaleString("pt-BR")} | Unidade{" "}
                  {item.unidade}
                </p>
              </div>

              {item.printTela && (
                <a
                  href={`/${item.printTela.replaceAll("\\", "/")}`}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-lg bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200"
                >
                  Ver print
                </a>
              )}
            </div>

            <p className="mt-4 whitespace-pre-wrap rounded-xl bg-slate-50 p-4 text-sm text-slate-700 dark:bg-slate-950 dark:text-slate-300">
              {item.sugestao}
            </p>

            {item.resposta && !administrador && (
              <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-800 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-200">
                <strong>Resposta:</strong> {item.resposta}
              </div>
            )}

            {administrador && (
              <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-[220px_1fr_auto]">
                <select
                  className="rounded-xl border border-slate-300 p-3 dark:border-slate-700 dark:bg-slate-950"
                  value={statusEdicao[item.id] || item.status}
                  onChange={(event) =>
                    setStatusEdicao((atual) => ({
                      ...atual,
                      [item.id]: event.target.value,
                    }))
                  }
                >
                  {statusSugestao.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
                <input
                  className="rounded-xl border border-slate-300 p-3 dark:border-slate-700 dark:bg-slate-950"
                  placeholder="Resposta ou observação administrativa"
                  value={respostas[item.id] || ""}
                  onChange={(event) =>
                    setRespostas((atual) => ({
                      ...atual,
                      [item.id]: event.target.value,
                    }))
                  }
                />
                <button
                  type="button"
                  onClick={() => atualizarStatus(item.id)}
                  className="rounded-xl bg-emerald-600 px-4 py-2 font-semibold text-white hover:bg-emerald-700"
                >
                  Salvar status
                </button>
              </div>
            )}

            {item.avaliadoPor && (
              <p className="mt-3 text-xs text-slate-400">
                Última avaliação por {nomePessoa(item.avaliadoPor)}
                {item.avaliadoEm
                  ? ` em ${new Date(item.avaliadoEm).toLocaleString("pt-BR")}`
                  : ""}
                .
              </p>
            )}
          </article>
        ))}

        {!carregando && sugestoes.length === 0 && (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
            Nenhuma sugestão registrada ainda.
          </div>
        )}
      </section>
    </div>
  );
}
