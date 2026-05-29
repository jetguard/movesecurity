import { useEffect, useState } from "react";
import { CalendarClock, RefreshCcw, Rocket, Tags } from "lucide-react";
import { api } from "../services/api";
import { SkeletonPage } from "../components/ui/Skeleton";

type SecaoChangelog = {
  titulo: string;
  itens: string[];
};

type VersaoChangelog = {
  versao: string;
  data: string;
  secoes: SecaoChangelog[];
};

type AtualizacoesResponse = {
  sistema: string;
  versaoAtual: string;
  atualizadoEm: string;
  changelog: VersaoChangelog[];
};

export default function AtualizacoesSistema() {
  const [dados, setDados] = useState<AtualizacoesResponse | null>(null);
  const [carregando, setCarregando] = useState(false);

  async function carregarAtualizacoes() {
    setCarregando(true);
    try {
      const response = await api.get("/sistema/atualizacoes");
      setDados(response.data);
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregarAtualizacoes();
  }, []);

  if (carregando && !dados) {
    return <SkeletonPage />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-300">Sistema</p>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Últimas atualizações</h1>
          <p className="mt-1 text-slate-500 dark:text-slate-400">
            Histórico de versões, melhorias e correções do JetGuard.
          </p>
        </div>

        <button
          type="button"
          onClick={carregarAtualizacoes}
          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
        >
          <RefreshCcw size={16} className={carregando ? "animate-spin" : ""} />
          Atualizar
        </button>
      </div>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-300">
            <Rocket size={22} />
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">Sistema</p>
          <p className="mt-1 text-lg font-bold text-slate-900 dark:text-white">{dados?.sistema || "JetGuard"}</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300">
            <Tags size={22} />
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">Versão atual</p>
          <p className="mt-1 text-lg font-bold text-slate-900 dark:text-white">v{dados?.versaoAtual || "..."}</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-300">
            <CalendarClock size={22} />
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">Consulta</p>
          <p className="mt-1 text-lg font-bold text-slate-900 dark:text-white">
            {dados?.atualizadoEm ? new Date(dados.atualizadoEm).toLocaleString() : "..."}
          </p>
        </div>
      </section>

      <section className="space-y-4">
        {dados?.changelog.map((versao) => (
          <article
            key={`${versao.versao}-${versao.data}`}
            className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900"
          >
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">Versão {versao.versao}</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">{versao.data}</p>
              </div>
              {versao.versao === dados.versaoAtual && (
                <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-700 dark:bg-blue-500/15 dark:text-blue-200">
                  VERSÃO ATUAL
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {versao.secoes.map((secao) => (
                <div key={`${versao.versao}-${secao.titulo}`} className="rounded-xl bg-slate-50 p-4 dark:bg-slate-950">
                  <h3 className="mb-3 font-bold text-slate-900 dark:text-white">{secao.titulo}</h3>
                  <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
                    {secao.itens.map((item) => (
                      <li key={item} className="flex gap-2">
                        <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </article>
        ))}

        {!carregando && dados?.changelog.length === 0 && (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
            Nenhuma atualização registrada no changelog.
          </div>
        )}
      </section>
    </div>
  );
}
