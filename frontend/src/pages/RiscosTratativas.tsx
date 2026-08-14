import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  Save,
  Search,
  UserCheck,
  X,
} from "lucide-react";
import { api } from "../services/api";

type ControleSelecionado = {
  id?: number | null;
  codigo?: string;
  nome: string;
};

type AnaliseTratativa = {
  id: number;
  codigo: string;
  macroProcessoCodigo: string;
  macroProcessoNome: string;
  setorNome: string;
  riscoCodigo: string;
  riscoNome: string;
  fatoresRisco: ControleSelecionado[];
  resultadoInerente: number;
  classificacaoRisco: string;
  resultadoResidual?: number | null;
  classificacaoResidual?: string | null;
  preventivos: ControleSelecionado[];
  detectivos: ControleSelecionado[];
  corretivos: ControleSelecionado[];
  tratativaStatus?: string | null;
  tratativaResponsavelId?: number | null;
  tratativaResponsavelNome?: string | null;
  tratativaPrazo?: string | null;
  tratativaAcao?: string | null;
  tratativaEvidencia?: string | null;
  tratativaValidacao?: string | null;
  tratativaConcluidaEm?: string | null;
  createdAt: string;
};

type Responsavel = {
  id: number;
  nome: string;
  email: string;
  setor?: string | null;
  cargo?: string | null;
};

type FormTratativa = {
  tratativaStatus: string;
  tratativaResponsavelId: string;
  tratativaPrazo: string;
  tratativaAcao: string;
  tratativaEvidencia: string;
  tratativaValidacao: string;
};

const statusTratativa = [
  "Aberta",
  "Em tratamento",
  "Aguardando evidência",
  "Em validação",
  "Concluída",
  "Reprovada / Reaberta",
];

const inputClass =
  "h-12 rounded-xl border border-slate-700 bg-slate-950 px-4 text-sm font-bold text-white outline-none transition placeholder:text-slate-500 focus:border-blue-400";

function corNivel(texto?: string | null) {
  const valor = String(texto || "").toUpperCase();
  if (["BAIXO", "MENOR", "REMOTO"].includes(valor))
    return "bg-emerald-300 text-slate-950";
  if (["POSSÍVEL", "MODERADO"].includes(valor))
    return "bg-yellow-300 text-slate-950";
  if (["ALTO", "MAIOR", "PROVÁVEL", "SEVERO"].includes(valor))
    return "bg-orange-500 text-white";
  if (["EXTREMO", "CRÍTICO", "FREQUENTE"].includes(valor))
    return "bg-red-600 text-white";
  return "bg-slate-700 text-slate-100";
}

function statusCor(status?: string | null) {
  const valor = status || "Aberta";
  if (valor === "Concluída") return "bg-emerald-400 text-slate-950";
  if (valor === "Em validação") return "bg-blue-400 text-slate-950";
  if (valor === "Aguardando evidência") return "bg-amber-300 text-slate-950";
  if (valor === "Reprovada / Reaberta") return "bg-red-500 text-white";
  if (valor === "Em tratamento") return "bg-cyan-300 text-slate-950";
  return "bg-slate-700 text-slate-100";
}

function formatarData(valor?: string | null) {
  if (!valor) return "-";
  return new Date(valor).toLocaleDateString("pt-BR", {
    timeZone: "America/Sao_Paulo",
  });
}

function paraInputDate(valor?: string | null) {
  if (!valor) return "";
  return new Date(valor).toISOString().slice(0, 10);
}

function etiqueta(item: ControleSelecionado) {
  return item.codigo ? `${item.codigo} - ${item.nome}` : item.nome;
}

export default function RiscosTratativas() {
  const [analises, setAnalises] = useState<AnaliseTratativa[]>([]);
  const [responsaveis, setResponsaveis] = useState<Responsavel[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("Todos");
  const [selecionada, setSelecionada] = useState<AnaliseTratativa | null>(null);
  const [form, setForm] = useState<FormTratativa>({
    tratativaStatus: "Aberta",
    tratativaResponsavelId: "",
    tratativaPrazo: "",
    tratativaAcao: "",
    tratativaEvidencia: "",
    tratativaValidacao: "",
  });
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    carregar();
  }, []);

  async function carregar() {
    setCarregando(true);
    setErro("");
    try {
      const [tratativasResponse, responsaveisResponse] = await Promise.all([
        api.get("/riscos/tratativas"),
        api.get("/riscos/responsaveis"),
      ]);
      setAnalises(tratativasResponse.data);
      setResponsaveis(responsaveisResponse.data);
    } catch (error: any) {
      setErro(
        error?.response?.data?.error ||
          "Não foi possível carregar as tratativas.",
      );
    } finally {
      setCarregando(false);
    }
  }

  const analisesFiltradas = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return analises.filter((analise) => {
      const status = analise.tratativaStatus || "Aberta";
      const bateStatus = filtroStatus === "Todos" || status === filtroStatus;
      const texto = [
        analise.codigo,
        analise.riscoCodigo,
        analise.riscoNome,
        analise.macroProcessoNome,
        analise.setorNome,
        analise.tratativaResponsavelNome || "",
      ]
        .join(" ")
        .toLowerCase();
      return bateStatus && (!termo || texto.includes(termo));
    });
  }, [analises, busca, filtroStatus]);

  const resumo = useMemo(() => {
    const pendentes = analises.filter(
      (item) => (item.tratativaStatus || "Aberta") !== "Concluída",
    ).length;
    const vencidas = analises.filter((item) => {
      if (!item.tratativaPrazo || item.tratativaStatus === "Concluída")
        return false;
      return new Date(item.tratativaPrazo).getTime() < Date.now();
    }).length;
    return {
      total: analises.length,
      pendentes,
      vencidas,
      concluidas: analises.length - pendentes,
    };
  }, [analises]);

  function abrirTratativa(analise: AnaliseTratativa) {
    setSelecionada(analise);
    setMensagem("");
    setErro("");
    setForm({
      tratativaStatus: analise.tratativaStatus || "Aberta",
      tratativaResponsavelId: String(analise.tratativaResponsavelId || ""),
      tratativaPrazo: paraInputDate(analise.tratativaPrazo),
      tratativaAcao: analise.tratativaAcao || "",
      tratativaEvidencia: analise.tratativaEvidencia || "",
      tratativaValidacao: analise.tratativaValidacao || "",
    });
  }

  async function salvarTratativa() {
    if (!selecionada) return;
    setSalvando(true);
    setMensagem("");
    setErro("");
    try {
      const response = await api.patch(
        `/riscos/analise-completa/${selecionada.id}/tratativa`,
        {
          ...form,
          tratativaResponsavelId: form.tratativaResponsavelId
            ? Number(form.tratativaResponsavelId)
            : null,
          tratativaPrazo: form.tratativaPrazo || null,
        },
      );
      setSelecionada(response.data);
      setAnalises((atuais) =>
        atuais.map((item) =>
          item.id === response.data.id ? response.data : item,
        ),
      );
      setMensagem("Tratativa salva com sucesso.");
    } catch (error: any) {
      setErro(
        error?.response?.data?.error || "Não foi possível salvar a tratativa.",
      );
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="min-h-[calc(100vh-5rem)] bg-slate-950 px-4 py-6 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1800px]">
        <header className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-900 shadow-2xl shadow-black/20">
          <div className="bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.2),transparent_32%),linear-gradient(135deg,rgba(15,23,42,1),rgba(2,6,23,1))] p-6 sm:p-8">
            <p className="text-xs font-black uppercase tracking-[0.35em] text-emerald-300">
              Análise de Riscos
            </p>
            <h1 className="mt-2 text-3xl font-black text-white sm:text-4xl">
              Tratativas de Risco
            </h1>
            <p className="mt-3 max-w-4xl text-sm font-semibold leading-6 text-slate-300">
              Acompanhe os riscos cadastrados, defina responsáveis, prazos,
              ações, evidências e valide o tratamento até o encerramento.
            </p>
          </div>
          <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["Total", resumo.total, ClipboardCheck],
              ["Pendentes", resumo.pendentes, Clock3],
              ["Vencidas", resumo.vencidas, AlertTriangle],
              ["Concluídas", resumo.concluidas, CheckCircle2],
            ].map(([titulo, valor, Icone]) => {
              const Icon = Icone as typeof ClipboardCheck;
              return (
                <div
                  key={String(titulo)}
                  className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4"
                >
                  <Icon className="text-emerald-300" size={20} />
                  <p className="mt-3 text-xs font-black uppercase tracking-[0.18em] text-slate-400">
                    {titulo as string}
                  </p>
                  <p className="mt-1 text-2xl font-black text-white">
                    {valor as number}
                  </p>
                </div>
              );
            })}
          </div>
        </header>

        {(mensagem || erro) && (
          <div
            className={`mt-5 rounded-xl border px-4 py-3 text-sm font-black ${
              erro
                ? "border-red-400/40 bg-red-500/10 text-red-100"
                : "border-emerald-400/40 bg-emerald-500/10 text-emerald-100"
            }`}
          >
            {erro || mensagem}
          </div>
        )}

        <section className="mt-6 rounded-3xl border border-slate-800 bg-slate-900/90 p-5 shadow-2xl shadow-black/20">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-xl font-black text-white">
                Riscos em acompanhamento
              </h2>
              <p className="mt-1 text-sm font-semibold text-slate-300">
                Clique em uma linha para registrar ou revisar a tratativa.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <label className="relative">
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
                  size={16}
                />
                <input
                  className={`${inputClass} w-full pl-10 sm:w-80`}
                  value={busca}
                  onChange={(event) => setBusca(event.target.value)}
                  placeholder="Buscar por código, risco ou responsável"
                />
              </label>
              <select
                className={`${inputClass} w-full sm:w-56`}
                value={filtroStatus}
                onChange={(event) => setFiltroStatus(event.target.value)}
              >
                <option>Todos</option>
                {statusTratativa.map((status) => (
                  <option key={status}>{status}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-5 overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950/50">
            <table className="w-full min-w-[1360px] border-separate border-spacing-y-2 p-2">
              <thead>
                <tr className="text-left text-xs font-black uppercase tracking-[0.18em] text-emerald-200">
                  <th className="px-3 py-2">Análise</th>
                  <th className="px-3 py-2">Risco</th>
                  <th className="px-3 py-2">Nível</th>
                  <th className="px-3 py-2">Controles</th>
                  <th className="px-3 py-2">Responsável</th>
                  <th className="px-3 py-2">Prazo</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Ação</th>
                </tr>
              </thead>
              <tbody>
                {analisesFiltradas.map((analise) => (
                  <tr
                    key={analise.id}
                    onClick={() => abrirTratativa(analise)}
                    className="cursor-pointer text-sm font-semibold text-slate-100"
                  >
                    <td className="rounded-l-2xl border-y border-l border-slate-800 bg-slate-950/90 px-3 py-3">
                      <span className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-3 py-1.5 text-sm font-black text-emerald-100">
                        {analise.codigo}
                      </span>
                    </td>
                    <td className="border-y border-slate-800 bg-slate-950/90 px-3 py-3">
                      <p className="font-black text-white">
                        {analise.riscoCodigo} - {analise.riscoNome}
                      </p>
                      <p className="mt-1 text-xs font-bold text-slate-400">
                        {analise.macroProcessoCodigo} -{" "}
                        {analise.macroProcessoNome} / {analise.setorNome}
                      </p>
                    </td>
                    <td className="border-y border-slate-800 bg-slate-950/90 px-3 py-3">
                      <div className="space-y-1">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-black ${corNivel(
                            analise.classificacaoRisco,
                          )}`}
                        >
                          {analise.classificacaoRisco}
                        </span>
                        <p className="text-xs font-black text-slate-300">
                          NRI {analise.resultadoInerente}
                        </p>
                        {analise.classificacaoResidual && (
                          <p className="text-xs font-bold text-slate-400">
                            Residual: {analise.classificacaoResidual}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="border-y border-slate-800 bg-slate-950/90 px-3 py-3 text-xs font-black text-slate-300">
                      Prev. {analise.preventivos.length} · Det.{" "}
                      {analise.detectivos.length} · Corr.{" "}
                      {analise.corretivos.length}
                    </td>
                    <td className="border-y border-slate-800 bg-slate-950/90 px-3 py-3">
                      {analise.tratativaResponsavelNome || "Não definido"}
                    </td>
                    <td className="border-y border-slate-800 bg-slate-950/90 px-3 py-3">
                      {formatarData(analise.tratativaPrazo)}
                    </td>
                    <td className="border-y border-slate-800 bg-slate-950/90 px-3 py-3">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-black ${statusCor(
                          analise.tratativaStatus,
                        )}`}
                      >
                        {analise.tratativaStatus || "Aberta"}
                      </span>
                    </td>
                    <td className="rounded-r-2xl border-y border-r border-slate-800 bg-slate-950/90 px-3 py-3">
                      <button className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-2 text-xs font-black text-emerald-100 hover:bg-emerald-500/20">
                        Abrir tratativa
                      </button>
                    </td>
                  </tr>
                ))}
                {!carregando && !analisesFiltradas.length && (
                  <tr>
                    <td
                      colSpan={8}
                      className="rounded-xl bg-slate-950/70 p-8 text-center text-sm font-bold text-slate-300"
                    >
                      Nenhuma tratativa encontrada.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            {carregando && (
              <div className="p-8 text-center text-sm font-black text-slate-300">
                Carregando tratativas...
              </div>
            )}
          </div>
        </section>
      </div>

      {selecionada && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur">
          <div className="max-h-[92vh] w-full max-w-5xl overflow-auto rounded-2xl border border-slate-700 bg-slate-900 p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.28em] text-emerald-300">
                  Tratativa
                </p>
                <h2 className="mt-2 text-2xl font-black text-white">
                  {selecionada.codigo}
                </h2>
                <p className="mt-1 text-sm font-semibold text-slate-300">
                  {selecionada.riscoCodigo} - {selecionada.riscoNome}
                </p>
              </div>
              <button
                onClick={() => setSelecionada(null)}
                className="rounded-xl border border-slate-700 p-2 text-slate-300 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-5 grid gap-4 lg:grid-cols-3">
              <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
                  Risco inerente
                </p>
                <p className="mt-2 text-2xl font-black text-white">
                  {selecionada.resultadoInerente}
                </p>
                <span
                  className={`mt-2 inline-flex rounded-full px-3 py-1 text-xs font-black ${corNivel(
                    selecionada.classificacaoRisco,
                  )}`}
                >
                  {selecionada.classificacaoRisco}
                </span>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
                  Risco residual
                </p>
                <p className="mt-2 text-2xl font-black text-white">
                  {selecionada.resultadoResidual ?? "-"}
                </p>
                <span
                  className={`mt-2 inline-flex rounded-full px-3 py-1 text-xs font-black ${corNivel(
                    selecionada.classificacaoResidual,
                  )}`}
                >
                  {selecionada.classificacaoResidual || "Não avaliado"}
                </span>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
                  Fatores de risco
                </p>
                <div className="mt-2 flex max-h-24 flex-wrap gap-1.5 overflow-auto">
                  {selecionada.fatoresRisco.map((item) => (
                    <span
                      key={`${item.codigo}-${item.nome}`}
                      className="rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 text-[11px] font-bold text-slate-200"
                    >
                      {etiqueta(item)}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-5 grid gap-4 lg:grid-cols-3">
              <label className="text-sm font-black text-slate-200">
                Status
                <select
                  className={`${inputClass} mt-2 w-full`}
                  value={form.tratativaStatus}
                  onChange={(event) =>
                    setForm((atual) => ({
                      ...atual,
                      tratativaStatus: event.target.value,
                    }))
                  }
                >
                  {statusTratativa.map((status) => (
                    <option key={status}>{status}</option>
                  ))}
                </select>
              </label>
              <label className="text-sm font-black text-slate-200">
                Responsável
                <select
                  className={`${inputClass} mt-2 w-full`}
                  value={form.tratativaResponsavelId}
                  onChange={(event) =>
                    setForm((atual) => ({
                      ...atual,
                      tratativaResponsavelId: event.target.value,
                    }))
                  }
                >
                  <option value="">Selecione</option>
                  {responsaveis.map((responsavel) => (
                    <option key={responsavel.id} value={responsavel.id}>
                      {responsavel.nome}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm font-black text-slate-200">
                Prazo
                <input
                  type="date"
                  className={`${inputClass} mt-2 w-full`}
                  value={form.tratativaPrazo}
                  onChange={(event) =>
                    setForm((atual) => ({
                      ...atual,
                      tratativaPrazo: event.target.value,
                    }))
                  }
                />
              </label>
            </div>

            <div className="mt-5 grid gap-4 lg:grid-cols-3">
              <label className="text-sm font-black text-slate-200 lg:col-span-3">
                Ação de tratamento
                <textarea
                  rows={4}
                  className="mt-2 w-full resize-none rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm font-bold text-white outline-none placeholder:text-slate-500 focus:border-blue-400"
                  value={form.tratativaAcao}
                  onChange={(event) =>
                    setForm((atual) => ({
                      ...atual,
                      tratativaAcao: event.target.value,
                    }))
                  }
                  placeholder="Descreva o que será feito, por quem e como o risco será tratado."
                />
              </label>
              <label className="text-sm font-black text-slate-200 lg:col-span-2">
                Evidência / registro da execução
                <textarea
                  rows={4}
                  className="mt-2 w-full resize-none rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm font-bold text-white outline-none placeholder:text-slate-500 focus:border-blue-400"
                  value={form.tratativaEvidencia}
                  onChange={(event) =>
                    setForm((atual) => ({
                      ...atual,
                      tratativaEvidencia: event.target.value,
                    }))
                  }
                  placeholder="Registre evidências, observações, documentos ou links internos."
                />
              </label>
              <label className="text-sm font-black text-slate-200">
                Validação
                <textarea
                  rows={4}
                  className="mt-2 w-full resize-none rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm font-bold text-white outline-none placeholder:text-slate-500 focus:border-blue-400"
                  value={form.tratativaValidacao}
                  onChange={(event) =>
                    setForm((atual) => ({
                      ...atual,
                      tratativaValidacao: event.target.value,
                    }))
                  }
                  placeholder="Parecer de validação ou motivo de reabertura."
                />
              </label>
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap gap-2 text-xs font-black text-slate-300">
                <span className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-950 px-3 py-2">
                  <UserCheck size={14} />{" "}
                  {selecionada.tratativaResponsavelNome || "Sem responsável"}
                </span>
                <span className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-950 px-3 py-2">
                  <CalendarClock size={14} />{" "}
                  {formatarData(selecionada.tratativaPrazo)}
                </span>
              </div>
              <button
                disabled={salvando}
                onClick={salvarTratativa}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-emerald-950/30 hover:bg-emerald-500 disabled:opacity-60"
              >
                <Save size={16} />
                Salvar tratativa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
