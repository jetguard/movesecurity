import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import {
  Activity,
  BrainCircuit,
  CheckCircle2,
  KeyRound,
  Lock,
  ShieldAlert,
  Sparkles,
} from "lucide-react";
import { api } from "../services/api";
import { podeSuperAdmin } from "../utils/permissoes";

type ConfigOpenAi = {
  ocrProvider: string;
  openaiOcrModel: string;
  openaiApiKey: string;
  openaiApiKeyConfigurada: boolean;
  openaiAprimoramentoTextoAtivo: boolean;
  origemChave: string;
  somenteLeitura: boolean;
  removerOpenaiApiKey?: boolean;
  validacao: {
    status: string;
    chaveValida: boolean;
    mensagem: string;
  };
};

type RankingConsumo = {
  usuarioId: number | null;
  usuarioNome: string;
  requisicoes: number;
  tokensEntrada: number;
  tokensSaida: number;
  tokensTotal: number;
  ultimoUso: string;
};

const modelosOpenAiOcr = [
  { valor: "gpt-5.4-mini", label: "GPT-5.4 mini" },
  { valor: "gpt-4.1-mini", label: "GPT-4.1 mini" },
  { valor: "gpt-4.1", label: "GPT-4.1" },
  { valor: "gpt-4o-mini", label: "GPT-4o mini" },
];

const configInicial: ConfigOpenAi = {
  ocrProvider: "openai",
  openaiOcrModel: "gpt-4.1-mini",
  openaiApiKey: "",
  openaiApiKeyConfigurada: false,
  openaiAprimoramentoTextoAtivo: false,
  origemChave: "Nao configurada",
  somenteLeitura: true,
  removerOpenaiApiKey: false,
  validacao: {
    status: "nao_configurada",
    chaveValida: false,
    mensagem: "Nenhuma chave OpenAI configurada para o OCR.",
  },
};

function numero(valor: number) {
  return new Intl.NumberFormat("pt-BR").format(valor || 0);
}

function dataHora(valor?: string) {
  if (!valor) return "Sem uso";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(valor));
}

export default function APIsOpenAI() {
  const [config, setConfig] = useState<ConfigOpenAi>(configInicial);
  const [ranking, setRanking] = useState<RankingConsumo[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const superAdmin = podeSuperAdmin();
  const bloqueado = !superAdmin;

  const totais = useMemo(() => {
    return ranking.reduce(
      (acc, item) => ({
        requisicoes: acc.requisicoes + item.requisicoes,
        tokens: acc.tokens + item.tokensTotal,
      }),
      { requisicoes: 0, tokens: 0 },
    );
  }, [ranking]);

  async function carregar() {
    setCarregando(true);
    try {
      const [configResponse, rankingResponse] = await Promise.all([
        api.get("/configuracoes/openai"),
        api.get("/configuracoes/openai/consumo"),
      ]);
      setConfig({
        ...configInicial,
        ...configResponse.data,
        openaiApiKey: "",
        removerOpenaiApiKey: false,
      });
      setRanking(rankingResponse.data?.ranking || []);
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregar();
  }, []);

  function alterar(campo: keyof ConfigOpenAi, valor: string | boolean) {
    setConfig((atual) => ({ ...atual, [campo]: valor }));
  }

  async function salvar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setSalvando(true);
    try {
      await api.put("/configuracoes", {
        openaiAprimoramentoTextoAtivo: config.openaiAprimoramentoTextoAtivo,
        ...(superAdmin
          ? {
              ocrProvider: config.ocrProvider,
              openaiOcrModel: config.openaiOcrModel,
              openaiApiKey: config.openaiApiKey,
              removerOpenaiApiKey: config.removerOpenaiApiKey,
            }
          : {}),
      });
      await carregar();
      alert("Configuração OpenAI salva com sucesso.");
    } finally {
      setSalvando(false);
    }
  }

  const statusClasse = config.validacao?.chaveValida
    ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-100"
    : "border-amber-400/30 bg-amber-500/10 text-amber-100";

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-blue-500 dark:text-blue-300">
            API's
          </p>
          <h1 className="mt-1 text-3xl font-black text-slate-900 dark:text-white">
            OpenAI
          </h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-600 dark:text-slate-300">
            Central de configuração da integração usada para OCR inteligente dos
            relatos de envolvidos.
          </p>
        </div>
        <button
          type="button"
          onClick={carregar}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-100 dark:hover:bg-slate-800"
        >
          <Activity size={17} />
          Atualizar status
        </button>
      </div>

      <div className={`rounded-3xl border p-5 shadow-xl ${statusClasse}`}>
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-4">
            <div className="rounded-2xl bg-white/10 p-3 ring-1 ring-white/15">
              {config.validacao?.chaveValida ? (
                <CheckCircle2 size={26} />
              ) : (
                <ShieldAlert size={26} />
              )}
            </div>
            <div>
              <p className="text-sm font-black uppercase tracking-wide">
                {config.validacao?.chaveValida
                  ? "Integração validada"
                  : "Atenção na integração"}
              </p>
              <p className="mt-1 text-lg font-black text-white">
                {config.validacao?.mensagem}
              </p>
              <p className="mt-1 text-sm text-white/70">
                Status técnico: {config.validacao?.status || "nao_verificado"}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm md:min-w-80">
            <div className="rounded-2xl bg-black/15 p-4">
              <p className="text-white/60">Requisições OCR</p>
              <p className="mt-1 text-2xl font-black">
                {numero(totais.requisicoes)}
              </p>
            </div>
            <div className="rounded-2xl bg-black/15 p-4">
              <p className="text-white/60">Tokens consumidos</p>
              <p className="mt-1 text-2xl font-black">
                {numero(totais.tokens)}
              </p>
            </div>
          </div>
        </div>
      </div>

      <section className="rounded-3xl border border-cyan-400/20 bg-gradient-to-br from-slate-900 to-slate-950 p-5 shadow-xl">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="rounded-2xl bg-cyan-500/10 p-3 text-cyan-300 ring-1 ring-cyan-400/20">
              <Sparkles size={24} />
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-300">
                Recursos de IA
              </p>
              <h2 className="mt-1 text-xl font-black text-white">
                Aprimoramento de textos com OpenAI
              </h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
                Quando ativo, módulos compatíveis podem aprimorar a redação
                corporativa sem alterar fatos, protocolos, nomes, horários ou
                valores registrados pelo MoveSecurity.
              </p>
            </div>
          </div>
          <label className="flex cursor-pointer items-center justify-between gap-5 rounded-2xl border border-slate-700 bg-slate-900/80 px-5 py-4 lg:min-w-72">
            <span>
              <strong className="block text-sm text-white">
                {config.openaiAprimoramentoTextoAtivo
                  ? "Recurso ativado"
                  : "Recurso desativado"}
              </strong>
              <span className="text-xs text-slate-400">
                Aplicação global nos módulos habilitados
              </span>
            </span>
            <input
              type="checkbox"
              checked={config.openaiAprimoramentoTextoAtivo}
              onChange={(event) =>
                alterar("openaiAprimoramentoTextoAtivo", event.target.checked)
              }
              className="h-5 w-5 accent-cyan-500"
            />
          </label>
        </div>
      </section>

      <form
        onSubmit={salvar}
        className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
      >
        <div className="flex flex-col gap-3 border-b border-slate-200 pb-5 dark:border-slate-800 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-3">
            <div className="rounded-2xl bg-blue-600 p-3 text-white shadow-lg shadow-blue-600/20">
              <BrainCircuit size={22} />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900 dark:text-white">
                Credenciais e modelo OCR
              </h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                {superAdmin
                  ? "Você pode alterar o modelo e cadastrar uma nova chave protegida."
                  : "Administrador visualiza os dados em modo protegido. Apenas Super Admin altera a integração."}
              </p>
            </div>
          </div>
          {bloqueado && (
            <span className="inline-flex items-center gap-2 rounded-full border border-slate-300 px-3 py-1.5 text-xs font-bold text-slate-600 dark:border-slate-700 dark:text-slate-300">
              <Lock size={14} />
              Somente leitura
            </span>
          )}
        </div>

        {config.validacao?.chaveValida && (
          <div className="mt-5 rounded-2xl border border-emerald-400/25 bg-emerald-500/10 px-4 py-3 text-sm font-bold text-emerald-700 dark:text-emerald-200">
            Chave validada: o OCR inteligente está apto para leitura de imagens
            e PDFs enviados nos relatos.
          </div>
        )}

        <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-4">
          <label className="block">
            <span className="mb-2 block text-sm font-bold text-slate-700 dark:text-slate-200">
              Provedor OCR
            </span>
            <select
              disabled={bloqueado}
              value={config.ocrProvider || "openai"}
              onChange={(event) => alterar("ocrProvider", event.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm font-semibold text-slate-900 outline-none transition disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:disabled:bg-slate-900"
            >
              <option value="openai">OpenAI</option>
            </select>
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-bold text-slate-700 dark:text-slate-200">
              Modelo OCR
            </span>
            <select
              disabled={bloqueado}
              value={config.openaiOcrModel || "gpt-4.1-mini"}
              onChange={(event) =>
                alterar("openaiOcrModel", event.target.value)
              }
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm font-semibold text-slate-900 outline-none transition disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:disabled:bg-slate-900"
            >
              {modelosOpenAiOcr.map((modelo) => (
                <option key={modelo.valor} value={modelo.valor}>
                  {modelo.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block lg:col-span-2">
            <span className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-200">
              <KeyRound size={15} />
              API Key
            </span>
            <input
              disabled={bloqueado}
              type="password"
              value={config.openaiApiKey || ""}
              onChange={(event) => alterar("openaiApiKey", event.target.value)}
              placeholder={
                config.openaiApiKeyConfigurada
                  ? "********"
                  : "Cole uma chave OpenAI"
              }
              autoComplete="off"
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm font-semibold text-slate-900 outline-none transition disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:disabled:bg-slate-900"
            />
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
              Origem atual: {config.origemChave}. O valor real da chave nunca é
              exibido na interface.
            </p>
          </label>
        </div>

        {superAdmin && config.openaiApiKeyConfigurada && (
          <label className="mt-4 flex items-center gap-2 text-sm font-bold text-red-700 dark:text-red-200">
            <input
              type="checkbox"
              checked={Boolean(config.removerOpenaiApiKey)}
              onChange={(event) =>
                alterar("removerOpenaiApiKey", event.target.checked)
              }
            />
            Remover chave OpenAI salva no banco de dados
          </label>
        )}

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={salvando}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-black text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            <Sparkles size={17} />
            {salvando ? "Salvando..." : "Salvar configurações OpenAI"}
          </button>
          {bloqueado && (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Administrador pode controlar os recursos de IA, mas não alterar
              credenciais.
            </p>
          )}
        </div>
      </form>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-5 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-xl font-black text-slate-900 dark:text-white">
              Usuários que mais consomem tokens no OCR
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Ranking baseado nas leituras inteligentes de relato registradas
              nos logs do sistema.
            </p>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            Últimos 2.000 registros
          </span>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800">
          <div className="max-h-[28rem] overflow-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="sticky top-0 z-10 bg-slate-100 text-xs uppercase text-slate-500 dark:bg-slate-950 dark:text-slate-400">
                <tr>
                  <th className="px-4 py-3">Usuário</th>
                  <th className="px-4 py-3">Requisições</th>
                  <th className="px-4 py-3">Entrada</th>
                  <th className="px-4 py-3">Saída</th>
                  <th className="px-4 py-3">Total</th>
                  <th className="px-4 py-3">Último uso</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {carregando ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-8 text-center text-slate-500 dark:text-slate-400"
                    >
                      Carregando consumo...
                    </td>
                  </tr>
                ) : ranking.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-8 text-center text-slate-500 dark:text-slate-400"
                    >
                      Ainda não há consumo de OCR registrado.
                    </td>
                  </tr>
                ) : (
                  ranking.map((item, index) => (
                    <tr
                      key={`${item.usuarioId || item.usuarioNome}-${index}`}
                      className="bg-white/60 transition hover:bg-blue-50/60 dark:bg-slate-900/60 dark:hover:bg-slate-800/70"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600/10 text-xs font-black text-blue-600 dark:bg-blue-500/15 dark:text-blue-200">
                            {index + 1}
                          </span>
                          <div>
                            <p className="font-black text-slate-900 dark:text-white">
                              {item.usuarioNome}
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              ID: {item.usuarioId || "N/A"}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-bold text-slate-700 dark:text-slate-200">
                        {numero(item.requisicoes)}
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                        {numero(item.tokensEntrada)}
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                        {numero(item.tokensSaida)}
                      </td>
                      <td className="px-4 py-3 font-black text-blue-600 dark:text-blue-300">
                        {numero(item.tokensTotal)}
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                        {dataHora(item.ultimoUso)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}
