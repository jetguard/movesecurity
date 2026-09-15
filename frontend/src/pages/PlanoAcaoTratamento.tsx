import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  ClipboardCheck,
  FileUp,
  LoaderCircle,
  Paperclip,
  Save,
  X,
} from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../services/api";
import { usuarioAtual } from "../utils/permissoes";

type Plano = {
  id: number;
  codigo: string;
  titulo: string;
  origemModulo?: string | null;
  origemId?: number | null;
  fatorRiscoCodigo?: string | null;
  fatorRiscoNome?: string | null;
  prioridade: string;
  status: string;
  tratamentoExecucaoStatus?: string | null;
  percentual: number;
  responsavelNome?: string | null;
  responsaveis?: { id: number; nome: string }[];
  prazo: string;
  comentarios?: string | null;
  anexosTratamento?: AnexoTratamento[];
  mediadores?: MediadorPlano[];
  conclusoesMediadores?: ConclusaoMediador[];
  tratamentoCustos?: TratamentoCustos;
};

type MediadorPlano = {
  id: number;
  nome: string;
  email?: string | null;
  setor?: string | null;
  cargo?: string | null;
  conclusao?: ConclusaoMediador;
};

type ConclusaoMediador = {
  mediadorId: number;
  mediadorNome: string;
  conclusao: string;
  concluidoEm: string;
};

type Arc = {
  id: number;
  codigo: string;
  macroProcessoCodigo: string;
  macroProcessoNome: string;
  setorNome: string;
  riscoCodigo: string;
  riscoNome: string;
  classificacaoRisco: string;
  nivelProbabilidade: string;
  nivelConsequencia: string;
  resultadoInerente: number;
  status: string;
};

type AnexoTratamento = {
  nomeOriginal: string;
  caminho: string;
  tipo: string;
  tamanho: number;
  criadoEm: string;
};

type TratamentoCustos = {
  houveCusto: boolean;
  tipo?: string | null;
  valorEstimado?: string | null;
  valorRealizado?: string | null;
  observacao?: string | null;
  atualizadoEm?: string | null;
};

function normalizarStatus(status?: string | null) {
  if (status === "Concluído") return "Concluido";
  if (status === "Em Andamento") return "Em andamento";
  if (["Pendente", "Em andamento", "Concluido"].includes(status || "")) {
    return status || "Pendente";
  }
  return "Pendente";
}

function statusExibicao(status?: string | null) {
  return normalizarStatus(status) === "Concluido"
    ? "Concluído"
    : normalizarStatus(status);
}

function classeStatus(status?: string | null) {
  const atual = normalizarStatus(status);
  if (atual === "Concluido") return "bg-emerald-400 text-slate-950";
  if (atual === "Em andamento") return "bg-blue-500 text-white";
  return "bg-amber-300 text-slate-950";
}

export default function PlanoAcaoTratamento() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [plano, setPlano] = useState<Plano | null>(null);
  const [arc, setArc] = useState<Arc | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");
  const [popupAberto, setPopupAberto] = useState(false);
  const [popupMediadorAberto, setPopupMediadorAberto] = useState(false);
  const [conclusaoMediador, setConclusaoMediador] = useState("");
  const [form, setForm] = useState({
    status: "Pendente",
    comentarios: "",
    houveCusto: false,
    tipoCusto: "",
    valorEstimado: "",
    valorRealizado: "",
    observacaoCusto: "",
  });
  const [arquivos, setArquivos] = useState<File[]>([]);

  async function carregar() {
    if (!id) return;
    setCarregando(true);
    setErro("");
    try {
      const resposta = await api.get(`/planos-acao/${id}`);
      setPlano(resposta.data.plano);
      setArc(resposta.data.arc);
      setForm({
        status: normalizarStatus(
          resposta.data.plano.tratamentoExecucaoStatus ||
            resposta.data.plano.status,
        ),
        comentarios: resposta.data.plano.comentarios || "",
        houveCusto: Boolean(resposta.data.plano.tratamentoCustos?.houveCusto),
        tipoCusto: resposta.data.plano.tratamentoCustos?.tipo || "",
        valorEstimado:
          resposta.data.plano.tratamentoCustos?.valorEstimado || "",
        valorRealizado:
          resposta.data.plano.tratamentoCustos?.valorRealizado || "",
        observacaoCusto:
          resposta.data.plano.tratamentoCustos?.observacao || "",
      });
    } catch (error: any) {
      setErro(
        error?.response?.data?.error || "Erro ao carregar plano de ação.",
      );
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregar();
  }, [id]);

  const prazoFormatado = useMemo(() => {
    if (!plano?.prazo) return "-";
    return new Date(plano.prazo).toLocaleString("pt-BR");
  }, [plano?.prazo]);
  const usuario = usuarioAtual();
  const mediadorAtual = plano?.mediadores?.find(
    (mediador) => mediador.id === usuario?.id,
  );
  const podeTratarPlano = Boolean(
    usuario?.id &&
      plano?.responsaveis?.some((responsavel) => responsavel.id === usuario.id),
  );
  const podeConcluirMediador = Boolean(plano?.mediadores?.length && mediadorAtual);
  function alterarStatus(status: string) {
    setForm((atual) => ({
      ...atual,
      status,
    }));
  }

  async function salvarTratamento(evento: React.FormEvent) {
    evento.preventDefault();
    if (!id) return;
    setSalvando(true);
    setErro("");
    setSucesso("");
    try {
      const dados = new FormData();
      dados.append("status", form.status);
      dados.append("comentarios", form.comentarios);
      dados.append("houveCusto", String(form.houveCusto));
      dados.append("tipoCusto", form.tipoCusto);
      dados.append("valorEstimado", form.valorEstimado);
      dados.append("valorRealizado", form.valorRealizado);
      dados.append("observacaoCusto", form.observacaoCusto);
      arquivos.forEach((arquivo) => dados.append("anexos", arquivo));
      const resposta = await api.post(`/planos-acao/${id}/tratamento`, dados, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setPlano(resposta.data);
      setForm({
        status: normalizarStatus(
          resposta.data.tratamentoExecucaoStatus || resposta.data.status,
        ),
        comentarios: resposta.data.comentarios || "",
        houveCusto: Boolean(resposta.data.tratamentoCustos?.houveCusto),
        tipoCusto: resposta.data.tratamentoCustos?.tipo || "",
        valorEstimado: resposta.data.tratamentoCustos?.valorEstimado || "",
        valorRealizado: resposta.data.tratamentoCustos?.valorRealizado || "",
        observacaoCusto: resposta.data.tratamentoCustos?.observacao || "",
      });
      setArquivos([]);
      setPopupAberto(false);
      setSucesso("Tratamento salvo com sucesso.");
    } catch (error: any) {
      setErro(error?.response?.data?.error || "Erro ao salvar tratamento.");
    } finally {
      setSalvando(false);
    }
  }

  async function salvarConclusaoMediador(evento: React.FormEvent) {
    evento.preventDefault();
    if (!id) return;
    setSalvando(true);
    setErro("");
    setSucesso("");
    try {
      const resposta = await api.post(`/planos-acao/${id}/mediadores/concluir`, {
        conclusao: conclusaoMediador,
        comentarios: form.comentarios,
      });
      setPlano(resposta.data);
      setConclusaoMediador("");
      setPopupMediadorAberto(false);
      setSucesso("Análise do mediador concluída com sucesso.");
    } catch (error: any) {
      setErro(
        error?.response?.data?.error ||
          "Erro ao concluir análise do mediador.",
      );
    } finally {
      setSalvando(false);
    }
  }

  if (carregando) {
    return (
      <div className="flex min-h-[calc(100vh-5rem)] items-center justify-center bg-slate-950 text-white">
        <LoaderCircle className="animate-spin text-blue-300" size={34} />
      </div>
    );
  }

  if (!plano) {
    return (
      <div className="min-h-[calc(100vh-5rem)] bg-slate-950 p-6 text-white">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-700 px-4 py-2 text-sm font-bold text-slate-100"
        >
          <ArrowLeft size={16} />
          Voltar
        </button>
        <p className="mt-6 rounded-2xl border border-red-400/30 bg-red-500/10 p-4 font-bold text-red-100">
          {erro || "Plano de ação não encontrado."}
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-5rem)] bg-slate-950 px-4 py-6 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            onClick={() => navigate("/planos-acao")}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-700 px-4 py-2 text-sm font-bold text-slate-100 transition hover:border-blue-400"
          >
            <ArrowLeft size={16} />
            Planos de ação
          </button>
          {arc && (
            <Link
              to={`/riscos/analise-completa/${arc.id}`}
              className="rounded-xl border border-blue-400/30 bg-blue-500/10 px-4 py-2 text-sm font-black text-blue-100 transition hover:bg-blue-500/20"
            >
              Ver ARC completa
            </Link>
          )}
        </div>

        <section className="rounded-3xl border border-slate-800 bg-slate-900/85 p-5 shadow-2xl shadow-black/25">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.35em] text-blue-300">
                Tratamento de Plano de Ação
              </p>
              <h1 className="mt-2 text-3xl font-black">{plano.codigo}</h1>
              <p className="mt-2 max-w-3xl text-lg font-bold text-slate-100">
                {plano.titulo}
              </p>
              <div className="mt-4 flex flex-wrap gap-2 text-xs font-black">
                <span
                  className={`rounded-full px-3 py-1 ${classeStatus(plano.status)}`}
                >
                  {statusExibicao(plano.status)}
                </span>
                <span className="rounded-full border border-slate-700 px-3 py-1 text-slate-200">
                  Prioridade: {plano.prioridade}
                </span>
                <span className="rounded-full border border-slate-700 px-3 py-1 text-slate-200">
                  Prazo: {prazoFormatado}
                </span>
              </div>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row lg:flex-col xl:flex-row">
              {podeConcluirMediador && (
                <button
                  onClick={() => setPopupMediadorAberto(true)}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-500 px-5 py-3 text-sm font-black text-white shadow-lg shadow-blue-950/20 transition hover:bg-blue-400"
                >
                  <CheckCircle2 size={18} />
                  Concluir minha análise
                </button>
              )}
              {podeTratarPlano && (
                <button
                  onClick={() => setPopupAberto(true)}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-5 py-3 text-sm font-black text-slate-950 shadow-lg shadow-emerald-950/20 transition hover:bg-emerald-400"
                >
                  <ClipboardCheck size={18} />
                  Tratar execução
                </button>
              )}
            </div>
          </div>
        </section>

        {sucesso && (
          <p className="rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-3 text-sm font-bold text-emerald-100">
            {sucesso}
          </p>
        )}
        {erro && (
          <p className="rounded-2xl border border-red-400/30 bg-red-500/10 p-3 text-sm font-bold text-red-100">
            {erro}
          </p>
        )}

        <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
          <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-5">
            <p className="text-xs font-black uppercase tracking-[0.28em] text-blue-300">
              Plano em tratamento
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                <p className="text-xs font-black uppercase text-slate-400">
                  Fator de risco
                </p>
                <p className="mt-2 font-black text-amber-100">
                  {plano.fatorRiscoCodigo ? `${plano.fatorRiscoCodigo} - ` : ""}
                  {plano.fatorRiscoNome || "Não informado"}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                <p className="text-xs font-black uppercase text-slate-400">
                  Responsáveis
                </p>
                <p className="mt-2 font-black">
                  {plano.responsaveis?.length
                    ? plano.responsaveis
                        .map((responsavel) => responsavel.nome)
                        .join(", ")
                    : plano.responsavelNome || "Não informado"}
                </p>
              </div>
            </div>
            {!!plano.mediadores?.length && (
              <div className="mt-5 rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-black uppercase text-slate-400">
                      Progresso da execução e validação
                    </p>
                    <p className="mt-1 text-sm font-bold text-slate-200">
                      Execução + {plano.mediadores.length} mediador(es)
                    </p>
                  </div>
                  <span className="rounded-full border border-blue-400/30 bg-blue-500/10 px-3 py-1 text-sm font-black text-blue-100">
                    {plano.percentual || 0}%
                  </span>
                </div>
                <div className="mt-4 grid gap-2">
                  <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-black text-slate-100">
                        Tratamento da execução
                      </p>
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-black ${
                          normalizarStatus(plano.tratamentoExecucaoStatus) ===
                          "Concluido"
                            ? "bg-emerald-400 text-slate-950"
                            : normalizarStatus(
                                  plano.tratamentoExecucaoStatus,
                                ) === "Em andamento"
                              ? "bg-blue-500 text-white"
                              : "bg-amber-300 text-slate-950"
                        }`}
                      >
                        {statusExibicao(plano.tratamentoExecucaoStatus)}
                      </span>
                    </div>
                    <p className="mt-2 text-sm font-semibold text-slate-400">
                      Conta como 1 etapa do percentual total.
                    </p>
                  </div>
                  {plano.mediadores.map((mediador) => (
                    <div
                      key={mediador.id}
                      className="rounded-xl border border-slate-800 bg-slate-900/80 p-3"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-black text-slate-100">
                          {mediador.nome}
                        </p>
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-black ${
                            mediador.conclusao
                              ? "bg-emerald-400 text-slate-950"
                              : "bg-amber-300 text-slate-950"
                          }`}
                        >
                          {mediador.conclusao ? "Concluído" : "Pendente"}
                        </span>
                      </div>
                      {mediador.conclusao && (
                        <p className="mt-2 text-sm font-semibold leading-6 text-slate-300">
                          {mediador.conclusao.conclusao}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="mt-5 rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
              <p className="text-xs font-black uppercase text-slate-400">
                Observações registradas
              </p>
              <p className="mt-2 whitespace-pre-wrap text-sm font-semibold leading-6 text-slate-200">
                {plano.comentarios || "Nenhuma observação registrada."}
              </p>
            </div>
            <div className="mt-5 rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase text-slate-400">
                    Custos e investimento
                  </p>
                  <p className="mt-1 text-sm font-semibold text-slate-400">
                    Informado pelos responsáveis pela execução.
                  </p>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-black ${
                    plano.tratamentoCustos?.houveCusto
                      ? "bg-amber-300 text-slate-950"
                      : "bg-slate-800 text-slate-200"
                  }`}
                >
                  {plano.tratamentoCustos?.houveCusto
                    ? "Com custo"
                    : "Sem custo informado"}
                </span>
              </div>
              {plano.tratamentoCustos?.houveCusto ? (
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-3">
                    <p className="text-xs font-black uppercase text-slate-500">
                      Tipo
                    </p>
                    <p className="mt-1 font-bold">
                      {plano.tratamentoCustos.tipo || "Não informado"}
                    </p>
                  </div>
                  <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-3">
                    <p className="text-xs font-black uppercase text-slate-500">
                      Valores
                    </p>
                    <p className="mt-1 font-bold">
                      Estimado:{" "}
                      {plano.tratamentoCustos.valorEstimado || "Não informado"}
                    </p>
                    <p className="text-sm font-semibold text-slate-300">
                      Realizado:{" "}
                      {plano.tratamentoCustos.valorRealizado ||
                        "Não informado"}
                    </p>
                  </div>
                  {plano.tratamentoCustos.observacao && (
                    <p className="rounded-xl border border-slate-800 bg-slate-900/80 p-3 text-sm font-semibold leading-6 text-slate-300 sm:col-span-2">
                      {plano.tratamentoCustos.observacao}
                    </p>
                  )}
                </div>
              ) : (
                <p className="mt-4 text-sm font-semibold text-slate-400">
                  Nenhum custo ou investimento registrado para este tratamento.
                </p>
              )}
            </div>
          </section>

          <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-5">
            <p className="text-xs font-black uppercase tracking-[0.28em] text-blue-300">
              ARC vinculada
            </p>
            {arc ? (
              <div className="mt-4 space-y-3">
                <p className="text-2xl font-black">{arc.codigo}</p>
                <p className="text-sm font-bold text-slate-200">
                  {arc.riscoCodigo} - {arc.riscoNome}
                </p>
                <p className="text-sm font-semibold text-slate-400">
                  {arc.macroProcessoCodigo} - {arc.macroProcessoNome} /{" "}
                  {arc.setorNome}
                </p>
                <div className="grid grid-cols-2 gap-2 text-xs font-black">
                  <span className="rounded-xl border border-slate-700 bg-slate-950/70 p-3">
                    Probabilidade
                    <strong className="mt-1 block text-blue-200">
                      {arc.nivelProbabilidade}
                    </strong>
                  </span>
                  <span className="rounded-xl border border-slate-700 bg-slate-950/70 p-3">
                    Consequência
                    <strong className="mt-1 block text-amber-200">
                      {arc.nivelConsequencia}
                    </strong>
                  </span>
                  <span className="rounded-xl border border-slate-700 bg-slate-950/70 p-3">
                    NRI
                    <strong className="mt-1 block text-white">
                      {Number(arc.resultadoInerente || 0).toFixed(2)}
                    </strong>
                  </span>
                  <span className="rounded-xl border border-slate-700 bg-slate-950/70 p-3">
                    Risco
                    <strong className="mt-1 block text-emerald-200">
                      {arc.classificacaoRisco}
                    </strong>
                  </span>
                </div>
              </div>
            ) : (
              <p className="mt-4 text-sm font-semibold text-slate-400">
                Este plano não está vinculado a uma ARC.
              </p>
            )}
          </section>
        </div>

        <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-5">
          <p className="text-xs font-black uppercase tracking-[0.28em] text-blue-300">
            Evidências anexadas
          </p>
          <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {(plano.anexosTratamento || []).map((anexo, index) => (
              <a
                key={`${anexo.caminho}-${index}`}
                href={`/${anexo.caminho}`}
                target="_blank"
                rel="noreferrer"
                className="rounded-2xl border border-slate-800 bg-slate-950/70 p-3"
              >
                <div className="flex items-start gap-2">
                  <Paperclip className="mt-0.5 text-blue-300" size={16} />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black">
                      {anexo.nomeOriginal}
                    </p>
                    <p className="text-xs font-semibold text-slate-400">
                      {new Date(anexo.criadoEm).toLocaleString("pt-BR")}
                    </p>
                  </div>
                </div>
              </a>
            ))}
            {!(plano.anexosTratamento || []).length && (
              <p className="rounded-2xl border border-dashed border-slate-700 p-4 text-sm font-semibold text-slate-400">
                Nenhum anexo registrado no tratamento.
              </p>
            )}
          </div>
        </section>
      </div>

      {popupAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
          <form
            onSubmit={salvarTratamento}
            className="w-full max-w-2xl rounded-3xl border border-slate-700 bg-slate-900 p-5 shadow-2xl"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.25em] text-blue-300">
                  Tratamento da execução
                </p>
                <h2 className="mt-1 text-2xl font-black">{plano.codigo}</h2>
                <p className="mt-1 text-sm font-semibold text-amber-100">
                  {plano.fatorRiscoCodigo ? `${plano.fatorRiscoCodigo} - ` : ""}
                  {plano.fatorRiscoNome || plano.titulo}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPopupAberto(false)}
                className="rounded-xl border border-slate-700 p-2 text-slate-300 transition hover:border-red-300 hover:text-red-200"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-5">
              <label className="space-y-1 text-sm font-bold text-slate-200">
                Status
                <select
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-white outline-none focus:border-blue-400"
                  value={form.status}
                  onChange={(evento) => alterarStatus(evento.target.value)}
                >
                  <option value="Pendente">Pendente</option>
                  <option value="Em andamento">Em andamento</option>
                  <option value="Concluido">Concluído</option>
                </select>
              </label>
            </div>

            <label className="mt-4 block space-y-1 text-sm font-bold text-slate-200">
              Informações do tratamento
              <textarea
                className="min-h-32 w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-white outline-none focus:border-blue-400"
                placeholder="Descreva o que foi necessário para tratar este plano de ação"
                value={form.comentarios}
                onChange={(evento) =>
                  setForm((atual) => ({
                    ...atual,
                    comentarios: evento.target.value,
                  }))
                }
              />
            </label>

            <div className="mt-4 rounded-2xl border border-slate-700 bg-slate-950/60 p-4">
              <label className="flex items-center gap-3 text-sm font-bold text-slate-100">
                <input
                  type="checkbox"
                  checked={form.houveCusto}
                  onChange={(evento) =>
                    setForm((atual) => ({
                      ...atual,
                      houveCusto: evento.target.checked,
                    }))
                  }
                  className="h-5 w-5 rounded border-slate-600 bg-slate-950"
                />
                Houve custo ou investimento para resolução
              </label>

              {form.houveCusto && (
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <label className="space-y-1 text-sm font-bold text-slate-200">
                    Tipo
                    <select
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-white outline-none focus:border-blue-400"
                      value={form.tipoCusto}
                      onChange={(evento) =>
                        setForm((atual) => ({
                          ...atual,
                          tipoCusto: evento.target.value,
                        }))
                      }
                    >
                      <option value="">Selecione</option>
                      <option value="Custo operacional">Custo operacional</option>
                      <option value="Investimento">Investimento</option>
                      <option value="Manutenção">Manutenção</option>
                      <option value="Contratação">Contratação</option>
                      <option value="Compra">Compra</option>
                      <option value="Outro">Outro</option>
                    </select>
                  </label>
                  <label className="space-y-1 text-sm font-bold text-slate-200">
                    Valor estimado
                    <input
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-white outline-none focus:border-blue-400"
                      placeholder="R$ 0,00"
                      value={form.valorEstimado}
                      onChange={(evento) =>
                        setForm((atual) => ({
                          ...atual,
                          valorEstimado: evento.target.value,
                        }))
                      }
                    />
                  </label>
                  <label className="space-y-1 text-sm font-bold text-slate-200">
                    Valor realizado
                    <input
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-white outline-none focus:border-blue-400"
                      placeholder="R$ 0,00"
                      value={form.valorRealizado}
                      onChange={(evento) =>
                        setForm((atual) => ({
                          ...atual,
                          valorRealizado: evento.target.value,
                        }))
                      }
                    />
                  </label>
                  <label className="space-y-1 text-sm font-bold text-slate-200 sm:col-span-2">
                    Observação do custo/investimento
                    <textarea
                      className="min-h-24 w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-white outline-none focus:border-blue-400"
                      placeholder="Descreva o motivo, fornecedor, compra, investimento ou detalhe financeiro"
                      value={form.observacaoCusto}
                      onChange={(evento) =>
                        setForm((atual) => ({
                          ...atual,
                          observacaoCusto: evento.target.value,
                        }))
                      }
                    />
                  </label>
                </div>
              )}
            </div>

            <label className="mt-4 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-blue-400/40 bg-blue-500/10 p-5 text-center text-sm font-bold text-blue-100 transition hover:bg-blue-500/15">
              <FileUp size={24} />
              Anexar imagens ou arquivos PDF
              <input
                type="file"
                multiple
                accept="image/*,application/pdf"
                className="hidden"
                onChange={(evento) =>
                  setArquivos(Array.from(evento.target.files || []))
                }
              />
            </label>
            {arquivos.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {arquivos.map((arquivo) => (
                  <span
                    key={`${arquivo.name}-${arquivo.size}`}
                    className="rounded-full border border-slate-700 bg-slate-950 px-3 py-1 text-xs font-bold text-slate-200"
                  >
                    {arquivo.name}
                  </span>
                ))}
              </div>
            )}

            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setPopupAberto(false)}
                className="rounded-xl border border-slate-700 px-4 py-3 text-sm font-black text-slate-100 transition hover:bg-slate-800"
              >
                Cancelar
              </button>
              <button
                disabled={salvando}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-black text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Save size={16} />
                {salvando ? "Salvando..." : "Salvar tratamento da execução"}
              </button>
            </div>
          </form>
        </div>
      )}

      {popupMediadorAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
          <form
            onSubmit={salvarConclusaoMediador}
            className="w-full max-w-xl rounded-3xl border border-slate-700 bg-slate-900 p-5 shadow-2xl"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.25em] text-blue-300">
                  Conclusão do mediador
                </p>
                <h2 className="mt-1 text-2xl font-black">{plano.codigo}</h2>
                <p className="mt-1 text-sm font-semibold text-slate-300">
                  {mediadorAtual
                    ? `Mediador: ${mediadorAtual.nome}`
                    : "Somente mediadores vinculados podem concluir"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPopupMediadorAberto(false)}
                className="rounded-xl border border-slate-700 p-2 text-slate-300 transition hover:border-red-300 hover:text-red-200"
              >
                <X size={18} />
              </button>
            </div>

            <label className="mt-5 block space-y-1 text-sm font-bold text-slate-200">
              Conclusão da análise
              <textarea
                className="min-h-36 w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-white outline-none focus:border-blue-400"
                placeholder="Descreva sua conclusão sobre este plano de ação"
                value={conclusaoMediador}
                onChange={(evento) => setConclusaoMediador(evento.target.value)}
                required
              />
            </label>

            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setPopupMediadorAberto(false)}
                className="rounded-xl border border-slate-700 px-4 py-3 text-sm font-black text-slate-100 transition hover:bg-slate-800"
              >
                Cancelar
              </button>
              <button
                disabled={salvando}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-black text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <CheckCircle2 size={16} />
                {salvando ? "Salvando..." : "Concluir análise"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
