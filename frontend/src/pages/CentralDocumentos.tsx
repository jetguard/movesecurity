import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  Clock,
  Download,
  ExternalLink,
  FileSearch,
  Filter,
  History,
  Maximize2,
  RefreshCcw,
  RotateCcw,
  Search,
  ShieldCheck,
  UserCheck,
  XCircle,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { api } from "../services/api";
import { SkeletonDashboard } from "../components/ui/Skeleton";
import { podeAdministrar, podeAnalisar, podeSuperAdmin, unidadesPermitidasUsuario, usuarioAtual } from "../utils/permissoes";
import { solicitarPinOperacional } from "../utils/pinPrompt";

type DocumentoCentral = {
  id: string;
  modulo: string;
  tipo: string;
  registroId: number;
  protocolo: string;
  titulo: string;
  unidade: string;
  status: string;
  fluxoStatus?: string | null;
  motivoDevolucao?: string | null;
  emitidoEm: string;
  assinaturaStatus: "Assinado" | "Pendente";
  assinaturaToken?: string | null;
  assinadoPor?: string | null;
  assinadoEm?: string | null;
  pdfUrl?: string | null;
  validacaoUrl?: string | null;
};

type Resumo = {
  total: number;
  assinados: number;
  pendentes: number;
  comPdf: number;
};

type AcordoAnulacao = {
  id: number;
  status: string;
  observacao?: string | null;
  decididoEm?: string | null;
  analistaId: number;
  analista: { nome: string; apelido?: string; email: string };
};

type SolicitacaoAnulacao = {
  id: number;
  modulo: string;
  registroId: number;
  codigoRegistro: string;
  tituloRegistro: string;
  unidade: string;
  motivo: string;
  status: string;
  decisaoMotivo?: string | null;
  createdAt: string;
  solicitante: { nome: string; apelido?: string; email: string };
  decididoPor?: { nome: string; apelido?: string } | null;
  acordos: AcordoAnulacao[];
};

const modulos = [
  { valor: "", label: "Todos os documentos" },
  { valor: "Ocorrencia", label: "Ocorrências" },
  { valor: "Evento", label: "Eventos" },
  { valor: "Investigacao", label: "Investigações" },
  { valor: "PassagemTurno", label: "CCOS" },
  { valor: "ChecklistInspecao", label: "CIP" },
  { valor: "RelatorioCftv", label: "CFTV" },
  { valor: "AnaliseRisco", label: "Riscos" },
];

const cardsResumo: Array<{
  label: string;
  chave: keyof Resumo;
  Icon: LucideIcon;
  cor: string;
  fundo: string;
}> = [
  { label: "Total", chave: "total", Icon: FileSearch, cor: "text-blue-600", fundo: "bg-blue-50 dark:bg-blue-500/10" },
  { label: "Assinados", chave: "assinados", Icon: ShieldCheck, cor: "text-emerald-600", fundo: "bg-emerald-50 dark:bg-emerald-500/10" },
  { label: "Pendentes", chave: "pendentes", Icon: Filter, cor: "text-amber-600", fundo: "bg-amber-50 dark:bg-amber-500/10" },
  { label: "Com PDF", chave: "comPdf", Icon: Download, cor: "text-slate-700 dark:text-slate-200", fundo: "bg-slate-100 dark:bg-slate-800" },
];

const filtrosTratativa = [
  { valor: "", label: "Todos" },
  { valor: "Aguardando Revisao", label: "Aguardando decisão" },
  { valor: "Em Revisao", label: "Em revisão" },
  { valor: "Devolvido", label: "Em ajuste" },
  { valor: "Aprovado", label: "Aprovados" },
  { valor: "sem-tratativa", label: "Sem tratativa" },
];

const filtrosAcaoPendente = [
  { valor: "", label: "Todas as acoes" },
  { valor: "assinatura-pendente", label: "Assinatura pendente" },
  { valor: "aguardando-decisao", label: "Aguardando decisao" },
  { valor: "em-ajuste", label: "Em ajuste" },
  { valor: "anulacao-pendente", label: "Anulacao pendente" },
  { valor: "sem-tratativa", label: "Sem tratativa" },
];
function statusAssinaturaClasse(status: DocumentoCentral["assinaturaStatus"]) {
  return status === "Assinado"
    ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200"
    : "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200";
}

function statusTratativaClasse(status?: string | null) {
  if (status === "Aprovado") return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200";
  if (status === "Devolvido") return "border-red-200 bg-red-50 text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-200";
  if (status === "Em Revisao") return "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-200";
  if (status === "Aguardando Revisao") return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200";
  return "border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300";
}

function moduloWorkflow(documento: DocumentoCentral) {
  if (documento.modulo === "Ocorrencia") return "ocorrencia";
  if (documento.modulo === "Evento") return "evento";
  if (documento.modulo === "Investigacao") return "investigacao";
  return null;
}

function formatarData(valor?: string | null) {
  if (!valor) return "Não informado";
  return new Date(valor).toLocaleString("pt-BR");
}

export default function CentralDocumentos() {
  const [documentos, setDocumentos] = useState<DocumentoCentral[]>([]);
  const [anulacoes, setAnulacoes] = useState<SolicitacaoAnulacao[]>([]);
  const [selecionado, setSelecionado] = useState<DocumentoCentral | null>(null);
  const [resumo, setResumo] = useState<Resumo>({ total: 0, assinados: 0, pendentes: 0, comPdf: 0 });
  const [carregando, setCarregando] = useState(true);
  const [busca, setBusca] = useState("");
  const [modulo, setModulo] = useState("");
  const [unidade, setUnidade] = useState("");
  const [assinatura, setAssinatura] = useState("");
  const [tratativa, setTratativa] = useState("");
  const [acaoPendente, setAcaoPendente] = useState("");
  const [inicio, setInicio] = useState("");
  const [fim, setFim] = useState("");
  const [motivoDevolucao, setMotivoDevolucao] = useState("Ajustes solicitados pela revisão documental.");
  const [motivoReabertura, setMotivoReabertura] = useState("Reabertura para ajuste controlado.");
  const [observacaoAcordo, setObservacaoAcordo] = useState("");
  const [justificativaAnulacao, setJustificativaAnulacao] = useState("");
  const [processandoTratativa, setProcessandoTratativa] = useState(false);
  const [processandoAnulacao, setProcessandoAnulacao] = useState(false);
  const unidades = useMemo(() => unidadesPermitidasUsuario(), []);
  const usuario = usuarioAtual();

  const params = useMemo(() => ({
    busca,
    modulo,
    unidade,
    assinatura,
    inicio,
    fim,
  }), [assinatura, busca, fim, inicio, modulo, unidade]);

  const carregarDocumentos = useCallback(async () => {
    setCarregando(true);
    try {
      const [documentosResponse, anulacoesResponse] = await Promise.allSettled([
        api.get("/documentos", { params }),
        api.get("/anulacoes"),
      ]);
      const dadosDocumentos = documentosResponse.status === "fulfilled" ? documentosResponse.value.data : {};
      const lista = dadosDocumentos.documentos || [];
      setDocumentos(lista);
      setResumo(dadosDocumentos.resumo || { total: 0, assinados: 0, pendentes: 0, comPdf: 0 });
      setAnulacoes(anulacoesResponse.status === "fulfilled" ? anulacoesResponse.value.data || [] : []);
      setSelecionado(null);
    } finally {
      setCarregando(false);
    }
  }, [params]);

  useEffect(() => {
    carregarDocumentos();
  }, [carregarDocumentos]);

  function aplicarFiltros(event: React.FormEvent) {
    event.preventDefault();
    carregarDocumentos();
  }

  function limparFiltros() {
    setBusca("");
    setModulo("");
    setUnidade("");
    setAssinatura("");
    setTratativa("");
    setAcaoPendente("");
    setInicio("");
    setFim("");
  }

  const documentosTratados = useMemo(() => {
    let lista = documentos;

    if (tratativa === "sem-tratativa") {
      lista = lista.filter((documento) => !documento.fluxoStatus);
    } else if (tratativa) {
      lista = lista.filter((documento) => documento.fluxoStatus === tratativa);
    }

    if (acaoPendente === "assinatura-pendente") {
      return lista.filter((documento) => documento.assinaturaStatus === "Pendente");
    }
    if (acaoPendente === "aguardando-decisao") {
      return lista.filter((documento) => documento.fluxoStatus === "Aguardando Revisao");
    }
    if (acaoPendente === "em-ajuste") {
      return lista.filter((documento) => documento.fluxoStatus === "Devolvido");
    }
    if (acaoPendente === "sem-tratativa") {
      return lista.filter((documento) => !documento.fluxoStatus);
    }
    if (acaoPendente === "anulacao-pendente") {
      return lista.filter((documento) =>
        anulacoes.some((item) => item.modulo === documento.modulo && item.registroId === documento.registroId && item.status === "Pendente")
      );
    }

    return lista;
  }, [acaoPendente, anulacoes, documentos, tratativa]);

  const resumoTratativas = useMemo(() => ({
    aguardando: documentos.filter((item) => item.fluxoStatus === "Aguardando Revisao").length,
    revisao: documentos.filter((item) => item.fluxoStatus === "Em Revisao").length,
    ajuste: documentos.filter((item) => item.fluxoStatus === "Devolvido").length,
    aprovados: documentos.filter((item) => item.fluxoStatus === "Aprovado").length,
  }), [documentos]);

  const resumoAnulacoes = useMemo(() => ({
    pendentes: anulacoes.filter((item) => item.status === "Pendente").length,
    anuladas: anulacoes.filter((item) => item.status === "Anulado").length,
    recusadas: anulacoes.filter((item) => item.status === "Recusado").length,
  }), [anulacoes]);

  const filaExecutiva = useMemo(() => ({
    assinaturaPendente: documentos.filter((item) => item.assinaturaStatus === "Pendente").length,
    aguardandoDecisao: documentos.filter((item) => item.fluxoStatus === "Aguardando Revisao").length,
    emAjuste: documentos.filter((item) => item.fluxoStatus === "Devolvido").length,
    anulacaoPendente: anulacoes.filter((item) => item.status === "Pendente").length,
  }), [anulacoes, documentos]);

  const anulacaoSelecionada = useMemo(() => {
    if (!selecionado) return null;
    return anulacoes.find((item) => item.modulo === selecionado.modulo && item.registroId === selecionado.registroId) || null;
  }, [anulacoes, selecionado]);

  const meuAcordoAnulacao = useMemo(() => {
    if (!anulacaoSelecionada || !usuario?.id) return null;
    return anulacaoSelecionada.acordos.find((acordo) => acordo.analistaId === usuario.id) || null;
  }, [anulacaoSelecionada, usuario?.id]);

  const todosAcordosAprovados = anulacaoSelecionada
    ? anulacaoSelecionada.acordos.length === 0 || anulacaoSelecionada.acordos.every((acordo) => acordo.status === "Aprovado")
    : false;

  const podeResponderAnulacao = anulacaoSelecionada?.status === "Pendente" && meuAcordoAnulacao?.status === "Pendente";
  const podeDecidirAnulacao = Boolean(anulacaoSelecionada && podeAdministrar() && anulacaoSelecionada.status === "Pendente");

  async function executarTratativa(documento: DocumentoCentral, acao: string) {
    const moduloTratativa = moduloWorkflow(documento);
    if (!moduloTratativa) return;

    const payload: Record<string, string> = {
      acao,
      motivo: acao === "reabrir" ? motivoReabertura : motivoDevolucao,
    };

    if (acao === "aprovar") {
      const pinOperacional = await solicitarPinOperacional("Informe seu PIN para assinar eletronicamente esta tratativa.");
      if (!pinOperacional) return;
      payload.pinOperacional = pinOperacional;
    }

    setProcessandoTratativa(true);
    try {
      await api.post(`/workflow/${moduloTratativa}/${documento.registroId}`, payload);
      await carregarDocumentos();
      alert("Tratativa registrada com sucesso.");
    } finally {
      setProcessandoTratativa(false);
    }
  }

  async function registrarAcordoAnulacao(status: string) {
    if (!anulacaoSelecionada) return;
    const pinOperacional = status === "Aprovado"
      ? await solicitarPinOperacional("Informe seu PIN para aprovar o acordo de anulação deste documento.")
      : null;
    if (status === "Aprovado" && !pinOperacional) return;

    setProcessandoAnulacao(true);
    try {
      await api.put(`/anulacoes/${anulacaoSelecionada.id}/acordo`, {
        status,
        observacao: observacaoAcordo,
        pinOperacional: pinOperacional || undefined,
      });
      setObservacaoAcordo("");
      await carregarDocumentos();
      alert("Acordo de anulação registrado com sucesso.");
    } finally {
      setProcessandoAnulacao(false);
    }
  }

  async function decidirAnulacao(decisao: string) {
    if (!anulacaoSelecionada) return;
    const pinOperacional = decisao === "Aprovado"
      ? await solicitarPinOperacional("Informe seu PIN para anular definitivamente este documento.")
      : null;
    if (decisao === "Aprovado" && !pinOperacional) return;

    setProcessandoAnulacao(true);
    try {
      await api.put(`/anulacoes/${anulacaoSelecionada.id}/decisao`, {
        decisao,
        justificativa: justificativaAnulacao,
        pinOperacional: pinOperacional || undefined,
      });
      setJustificativaAnulacao("");
      await carregarDocumentos();
      alert("Decisão de anulação registrada com sucesso.");
    } finally {
      setProcessandoAnulacao(false);
    }
  }
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-300">Relatórios e documentos</p>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Central de Documentos</h1>
          <p className="mt-1 max-w-3xl text-slate-500 dark:text-slate-400">
            Mesa documental para consultar protocolos, assinaturas eletrônicas, validações e PDFs emitidos pelo JetGuard.
          </p>
        </div>

        <button
          type="button"
          onClick={carregarDocumentos}
          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
        >
          <RefreshCcw size={16} className={carregando ? "animate-spin" : ""} />
          Atualizar
        </button>
      </div>

      <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
              <Filter className="text-blue-600 dark:text-blue-300" size={18} />
              Filtros
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Refine a consulta documental sem afastar a lista de documentos.</p>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            {documentosTratados.length} encontrados
          </span>
        </div>

        <form onSubmit={aplicarFiltros} className="grid grid-cols-1 gap-3 lg:grid-cols-2 xl:grid-cols-[minmax(220px,1.2fr)_170px_190px_170px_190px_145px_145px_auto_auto] xl:items-end">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-3 top-3.5 text-slate-400" size={16} />
            <input
              value={busca}
              onChange={(event) => setBusca(event.target.value)}
              placeholder="Protocolo, título ou responsável"
              className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-3 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            />
          </label>

          <select value={modulo} onChange={(event) => setModulo(event.target.value)} className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white">
            {modulos.map((item) => <option key={item.valor} value={item.valor}>{item.label}</option>)}
          </select>

          <select value={unidade} onChange={(event) => setUnidade(event.target.value)} className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white">
            <option value="">Todas as unidades permitidas</option>
            {unidades.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>

          <select value={assinatura} onChange={(event) => setAssinatura(event.target.value)} className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white">
            <option value="">Todas as assinaturas</option>
            <option value="Assinado">Assinados</option>
            <option value="Pendente">Pendentes</option>
          </select>

          <select value={acaoPendente} onChange={(event) => setAcaoPendente(event.target.value)} className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white">
            {filtrosAcaoPendente.map((item) => <option key={item.valor} value={item.valor}>{item.label}</option>)}
          </select>

          <label className="space-y-1">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Data inicial</span>
            <input type="date" value={inicio} onChange={(event) => setInicio(event.target.value)} className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white" />
          </label>
          <label className="space-y-1">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Data final</span>
            <input type="date" value={fim} onChange={(event) => setFim(event.target.value)} className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white" />
          </label>

          <button type="button" onClick={limparFiltros} className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-600 transition hover:border-blue-300 hover:text-blue-700 dark:border-slate-700 dark:text-slate-300">
            Limpar
          </button>
          <button type="submit" className="rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 dark:bg-blue-600 dark:hover:bg-blue-500">
            Aplicar
          </button>
        </form>
      </section>

      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {cardsResumo.map(({ label, chave, Icon, cor, fundo }) => (
          <div key={label} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${fundo} ${cor}`}>
              <Icon size={18} />
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
              <p className="text-xl font-bold leading-tight text-slate-900 dark:text-white">{resumo[chave]}</p>
            </div>
          </div>
        ))}
      </section>

      <section className="grid grid-cols-1 gap-3 md:grid-cols-4">
        <button type="button" onClick={() => setAcaoPendente("assinatura-pendente")} className={`rounded-2xl border p-3 text-left transition hover:-translate-y-0.5 ${acaoPendente === "assinatura-pendente" ? "border-amber-400 bg-amber-50 text-amber-800 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-100" : "border-slate-200 bg-white text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"}`}>
          <p className="text-xl font-black">{filaExecutiva.assinaturaPendente}</p>
          <p className="text-xs font-semibold">Assinaturas pendentes</p>
        </button>
        <button type="button" onClick={() => setAcaoPendente("aguardando-decisao")} className={`rounded-2xl border p-3 text-left transition hover:-translate-y-0.5 ${acaoPendente === "aguardando-decisao" ? "border-blue-400 bg-blue-50 text-blue-800 dark:border-blue-500/40 dark:bg-blue-500/10 dark:text-blue-100" : "border-slate-200 bg-white text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"}`}>
          <p className="text-xl font-black">{filaExecutiva.aguardandoDecisao}</p>
          <p className="text-xs font-semibold">Aguardando decisao</p>
        </button>
        <button type="button" onClick={() => setAcaoPendente("em-ajuste")} className={`rounded-2xl border p-3 text-left transition hover:-translate-y-0.5 ${acaoPendente === "em-ajuste" ? "border-red-400 bg-red-50 text-red-800 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-100" : "border-slate-200 bg-white text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"}`}>
          <p className="text-xl font-black">{filaExecutiva.emAjuste}</p>
          <p className="text-xs font-semibold">Documentos em ajuste</p>
        </button>
        <button type="button" onClick={() => setAcaoPendente("anulacao-pendente")} className={`rounded-2xl border p-3 text-left transition hover:-translate-y-0.5 ${acaoPendente === "anulacao-pendente" ? "border-orange-400 bg-orange-50 text-orange-800 dark:border-orange-500/40 dark:bg-orange-500/10 dark:text-orange-100" : "border-slate-200 bg-white text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"}`}>
          <p className="text-xl font-black">{filaExecutiva.anulacaoPendente}</p>
          <p className="text-xs font-semibold">Anulacoes pendentes</p>
        </button>
      </section>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[390px_minmax(0,1fr)]">
        <aside className="flex flex-col gap-4 xl:sticky xl:top-24 xl:self-start">
          <section className="hidden">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="font-bold text-slate-900 dark:text-white">Filtros</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">Refine a consulta documental.</p>
              </div>
              <Filter className="text-blue-600 dark:text-blue-300" size={20} />
            </div>

            <form onSubmit={aplicarFiltros} className="space-y-3">
              <label className="relative block">
                <Search className="pointer-events-none absolute left-3 top-3.5 text-slate-400" size={16} />
                <input
                  value={busca}
                  onChange={(event) => setBusca(event.target.value)}
                  placeholder="Protocolo, título ou responsável"
                  className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-3 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                />
              </label>

              <select value={modulo} onChange={(event) => setModulo(event.target.value)} className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white">
                {modulos.map((item) => <option key={item.valor} value={item.valor}>{item.label}</option>)}
              </select>

              <select value={unidade} onChange={(event) => setUnidade(event.target.value)} className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white">
                <option value="">Todas as unidades permitidas</option>
                {unidades.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>

              <select value={assinatura} onChange={(event) => setAssinatura(event.target.value)} className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white">
                <option value="">Todas as assinaturas</option>
                <option value="Assinado">Assinados</option>
                <option value="Pendente">Pendentes</option>
              </select>

              <div className="grid grid-cols-2 gap-3">
                <label className="space-y-1">
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Data inicial</span>
                  <input type="date" value={inicio} onChange={(event) => setInicio(event.target.value)} className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white" />
                </label>
                <label className="space-y-1">
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Data final</span>
                  <input type="date" value={fim} onChange={(event) => setFim(event.target.value)} className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white" />
                </label>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <button type="button" onClick={limparFiltros} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-blue-300 hover:text-blue-700 dark:border-slate-700 dark:text-slate-300">
                  Limpar
                </button>
                <button type="submit" className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 dark:bg-blue-600 dark:hover:bg-blue-500">
                  Aplicar
                </button>
              </div>
            </form>
          </section>

          <section className="hidden">
            {cardsResumo.map(({ label, chave, Icon, cor, fundo }) => (
              <div key={label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl ${fundo} ${cor}`}>
                  <Icon size={20} />
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
                <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">{resumo[chave]}</p>
              </div>
            ))}
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <h2 className="font-bold text-slate-900 dark:text-white">Tratativas</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">Revisões e aprovações no mesmo fluxo documental.</p>
              </div>
              <UserCheck className="text-blue-600 dark:text-blue-300" size={20} />
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-2xl bg-amber-50 p-3 text-amber-700 dark:bg-amber-500/10 dark:text-amber-200"><b className="block text-lg">{resumoTratativas.aguardando}</b>Aguardando</div>
              <div className="rounded-2xl bg-blue-50 p-3 text-blue-700 dark:bg-blue-500/10 dark:text-blue-200"><b className="block text-lg">{resumoTratativas.revisao}</b>Em revisão</div>
              <div className="rounded-2xl bg-red-50 p-3 text-red-700 dark:bg-red-500/10 dark:text-red-200"><b className="block text-lg">{resumoTratativas.ajuste}</b>Em ajuste</div>
              <div className="rounded-2xl bg-emerald-50 p-3 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-200"><b className="block text-lg">{resumoTratativas.aprovados}</b>Aprovados</div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {filtrosTratativa.map((item) => (
                <button
                  key={item.valor}
                  type="button"
                  onClick={() => setTratativa(item.valor)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-bold transition ${tratativa === item.valor ? "border-blue-500 bg-blue-600 text-white" : "border-slate-200 text-slate-600 hover:border-blue-300 dark:border-slate-700 dark:text-slate-300"}`}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <div className="mt-4 rounded-2xl border border-orange-200 bg-orange-50 p-3 text-xs text-orange-800 dark:border-orange-500/20 dark:bg-orange-500/10 dark:text-orange-200">
              <div className="mb-2 flex items-center gap-2 font-bold">
                <AlertTriangle size={15} />
                Solicitações de anulação
              </div>
              <div className="grid grid-cols-3 gap-2">
                <span><b className="block text-base">{resumoAnulacoes.pendentes}</b>Pendentes</span>
                <span><b className="block text-base">{resumoAnulacoes.anuladas}</b>Anuladas</span>
                <span><b className="block text-base">{resumoAnulacoes.recusadas}</b>Recusadas</span>
              </div>
            </div>
          </section>

          <section className="order-first overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="border-b border-slate-100 p-4 dark:border-slate-800">
              <h2 className="font-bold text-slate-900 dark:text-white">Documentos encontrados</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Clique em um documento para abrir a prévia.</p>
            </div>

            {carregando ? (
              <div className="p-4">
                <SkeletonDashboard />
              </div>
            ) : (
              <div className="max-h-[640px] space-y-2 overflow-y-auto p-3 [scrollbar-color:rgba(148,163,184,.35)_transparent] [scrollbar-width:thin]">
                {documentosTratados.map((documento) => {
                  const ativo = selecionado?.id === documento.id;
                  const anulacaoDocumento = anulacoes.find((item) => item.modulo === documento.modulo && item.registroId === documento.registroId);
                  return (
                    <button
                      key={documento.id}
                      type="button"
                      onClick={() => setSelecionado(documento)}
                      className={`w-full rounded-2xl border p-3 text-left transition ${
                        ativo
                          ? "border-blue-400 bg-blue-50 shadow-sm dark:border-blue-500/50 dark:bg-blue-500/10"
                          : "border-slate-100 bg-slate-50 hover:border-blue-200 hover:bg-white dark:border-slate-800 dark:bg-slate-950 dark:hover:border-blue-500/30"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate font-bold text-slate-900 dark:text-white">{documento.protocolo}</p>
                          <p className="mt-1 line-clamp-2 text-xs text-slate-500 dark:text-slate-400">{documento.titulo}</p>
                        </div>
                        <span className="shrink-0 rounded-full bg-slate-900 px-2 py-1 text-[10px] font-bold text-white dark:bg-slate-700">
                          {documento.tipo}
                        </span>
                      </div>

                      <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                        <span className="inline-flex items-center gap-1">
                          <CalendarDays size={12} />
                          {formatarData(documento.emitidoEm)}
                        </span>
                        <span className={`rounded-full border px-2 py-0.5 font-bold ${statusAssinaturaClasse(documento.assinaturaStatus)}`}>
                          {documento.assinaturaStatus}
                        </span>
                        <span className={`rounded-full border px-2 py-0.5 font-bold ${statusTratativaClasse(documento.fluxoStatus)}`}>
                          {documento.fluxoStatus || "Sem tratativa"}
                        </span>
                        {anulacaoDocumento && (
                          <span className="rounded-full border border-orange-200 bg-orange-50 px-2 py-0.5 font-bold text-orange-700 dark:border-orange-500/20 dark:bg-orange-500/10 dark:text-orange-200">
                            Anulação: {anulacaoDocumento.status}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}

                {documentosTratados.length === 0 && (
                  <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                    Nenhum documento encontrado para os filtros selecionados.
                  </div>
                )}
              </div>
            )}
          </section>
        </aside>

        <section className="min-w-0 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          {selecionado ? (
            <>
              <div className="border-b border-slate-100 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-950">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-300">{selecionado.tipo}</p>
                    <h2 className="mt-1 truncate text-2xl font-bold text-slate-900 dark:text-white">{selecionado.protocolo}</h2>
                    <p className="mt-1 max-w-3xl text-sm text-slate-500 dark:text-slate-400">{selecionado.titulo}</p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {selecionado.pdfUrl && (
                      <>
                        <a href={selecionado.pdfUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-blue-700">
                          <Maximize2 size={16} />
                          Abrir
                        </a>
                        <a href={selecionado.pdfUrl} download className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 transition hover:border-blue-300 hover:text-blue-700 dark:border-slate-700 dark:text-slate-200">
                          <Download size={16} />
                          Baixar
                        </a>
                      </>
                    )}
                    {selecionado.validacaoUrl && (
                      <a href={selecionado.validacaoUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 px-4 py-2 text-sm font-bold text-emerald-700 transition hover:bg-emerald-50 dark:border-emerald-500/30 dark:text-emerald-200 dark:hover:bg-emerald-500/10">
                        <ExternalLink size={16} />
                        Validar
                      </a>
                    )}
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-3 text-sm md:grid-cols-4">
                  <div className="rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
                    <p className="text-xs uppercase text-slate-500">Unidade</p>
                    <p className="mt-1 font-bold text-slate-900 dark:text-white">{selecionado.unidade}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
                    <p className="text-xs uppercase text-slate-500">Status</p>
                    <p className="mt-1 font-bold text-slate-900 dark:text-white">{selecionado.status}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
                    <p className="text-xs uppercase text-slate-500">Assinatura</p>
                    <p className="mt-1 font-bold text-slate-900 dark:text-white">{selecionado.assinaturaStatus}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
                    <p className="text-xs uppercase text-slate-500">Emissão</p>
                    <p className="mt-1 font-bold text-slate-900 dark:text-white">{formatarData(selecionado.emitidoEm)}</p>
                  </div>
                </div>
              </div>

              <div className="grid min-h-[680px] grid-cols-1 bg-slate-100 dark:bg-slate-950">
                {selecionado.pdfUrl ? (
                  <iframe
                    title={`Prévia do documento ${selecionado.protocolo}`}
                    src={selecionado.pdfUrl}
                    className="h-[72vh] min-h-[680px] w-full bg-white"
                  />
                ) : (
                  <div className="flex min-h-[680px] items-center justify-center p-8">
                    <div className="max-w-md rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center shadow-sm dark:border-slate-700 dark:bg-slate-900">
                      <FileSearch className="mx-auto text-slate-400" size={42} />
                      <h3 className="mt-4 text-lg font-bold text-slate-900 dark:text-white">Prévia indisponível</h3>
                      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                        Este documento está registrado na central, mas ainda não possui rota de reemissão direta do PDF.
                      </p>
                      {selecionado.validacaoUrl && (
                        <a href={selecionado.validacaoUrl} target="_blank" rel="noreferrer" className="mt-5 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-blue-700">
                          <ExternalLink size={16} />
                          Abrir validação
                        </a>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="border-t border-slate-100 p-4 dark:border-slate-800">
                {moduloWorkflow(selecionado) && (
                  <div className="mb-5 rounded-3xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-300">Tratativa documental</p>
                        <h3 className="mt-1 text-lg font-bold text-slate-900 dark:text-white">{selecionado.fluxoStatus || "Sem tratativa iniciada"}</h3>
                        {selecionado.motivoDevolucao && (
                          <p className="mt-1 text-sm text-red-600 dark:text-red-300">Motivo: {selecionado.motivoDevolucao}</p>
                        )}
                      </div>
                      <span className={`rounded-full border px-3 py-1 text-xs font-bold ${statusTratativaClasse(selecionado.fluxoStatus)}`}>
                        {selecionado.fluxoStatus || "Sem tratativa"}
                      </span>
                    </div>

                    {podeAnalisar() && (
                      <div className="mt-4 space-y-3">
                        <label className="block text-xs font-bold uppercase text-slate-500 dark:text-slate-400">Motivo para devolução ou ajuste</label>
                        <input
                          value={motivoDevolucao}
                          onChange={(event) => setMotivoDevolucao(event.target.value)}
                          className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-900 outline-none focus:border-blue-400 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                        />
                        {podeSuperAdmin() && (
                          <>
                            <label className="block text-xs font-bold uppercase text-slate-500 dark:text-slate-400">Justificativa para reabertura</label>
                            <input
                              value={motivoReabertura}
                              onChange={(event) => setMotivoReabertura(event.target.value)}
                              className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-900 outline-none focus:border-blue-400 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                            />
                          </>
                        )}
                        <div className="flex flex-wrap gap-2">
                          <button disabled={processandoTratativa} onClick={() => executarTratativa(selecionado, "revisar")} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-3 py-2 text-sm font-bold text-white disabled:opacity-60">
                            <UserCheck size={15} /> Iniciar revisão
                          </button>
                          <button disabled={processandoTratativa} onClick={() => executarTratativa(selecionado, "aprovar")} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-3 py-2 text-sm font-bold text-white disabled:opacity-60">
                            <CheckCircle2 size={15} /> Aprovar
                          </button>
                          <button disabled={processandoTratativa} onClick={() => executarTratativa(selecionado, "devolver")} className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-3 py-2 text-sm font-bold text-white disabled:opacity-60">
                            <XCircle size={15} /> Devolver
                          </button>
                          {podeSuperAdmin() && (
                            <button disabled={processandoTratativa} onClick={() => executarTratativa(selecionado, "reabrir")} className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-3 py-2 text-sm font-bold text-white disabled:opacity-60 dark:bg-slate-700">
                              <RotateCcw size={15} /> Reabrir
                            </button>
                          )}
                          <a href={`/timeline/${moduloWorkflow(selecionado)}/${selecionado.registroId}`} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700 dark:border-slate-700 dark:text-slate-200">
                            <History size={15} /> Timeline
                          </a>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {anulacaoSelecionada && (
                  <div className="mb-5 rounded-3xl border border-orange-200 bg-orange-50 p-4 dark:border-orange-500/20 dark:bg-orange-500/10">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-orange-700 dark:text-orange-200">
                          <AlertTriangle size={15} />
                          Solicitação de anulação
                        </p>
                        <h3 className="mt-1 text-lg font-bold text-slate-900 dark:text-white">{anulacaoSelecionada.status}</h3>
                        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                          Solicitado por {anulacaoSelecionada.solicitante.apelido || anulacaoSelecionada.solicitante.nome} em {formatarData(anulacaoSelecionada.createdAt)}
                        </p>
                      </div>
                      <span className="rounded-full border border-orange-300 bg-white px-3 py-1 text-xs font-bold text-orange-700 dark:border-orange-500/30 dark:bg-slate-950 dark:text-orange-200">
                        {anulacaoSelecionada.codigoRegistro}
                      </span>
                    </div>

                    <div className="mt-4 rounded-2xl bg-white p-3 text-sm text-slate-700 dark:bg-slate-950 dark:text-slate-200">
                      <b>Motivo:</b> {anulacaoSelecionada.motivo}
                      {anulacaoSelecionada.decisaoMotivo && (
                        <p className="mt-2"><b>Decisão:</b> {anulacaoSelecionada.decisaoMotivo}</p>
                      )}
                    </div>

                    <div className="mt-4">
                      <h4 className="font-bold text-slate-900 dark:text-white">Acordo dos analistas</h4>
                      <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-2">
                        {anulacaoSelecionada.acordos.map((acordo) => (
                          <div key={acordo.id} className="rounded-2xl border border-orange-100 bg-white p-3 text-sm dark:border-orange-500/20 dark:bg-slate-950">
                            <div className="flex items-center justify-between gap-3">
                              <span className="font-semibold text-slate-800 dark:text-slate-100">{acordo.analista.apelido || acordo.analista.nome}</span>
                              <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-200">{acordo.status}</span>
                            </div>
                            {acordo.observacao && <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{acordo.observacao}</p>}
                          </div>
                        ))}
                        {anulacaoSelecionada.acordos.length === 0 && (
                          <div className="rounded-2xl border border-dashed border-orange-200 bg-white p-3 text-sm text-slate-500 dark:border-orange-500/20 dark:bg-slate-950 dark:text-slate-400">
                            Nenhum acordo de analista pendente.
                          </div>
                        )}
                      </div>
                    </div>

                    {podeResponderAnulacao && (
                      <div className="mt-4 rounded-2xl border border-blue-200 bg-blue-50 p-3 dark:border-blue-500/20 dark:bg-blue-500/10">
                        <p className="mb-2 flex items-center gap-2 text-sm font-bold text-blue-800 dark:text-blue-200">
                          <Clock size={15} /> Registrar seu acordo
                        </p>
                        <textarea
                          className="min-h-[80px] w-full rounded-xl border border-blue-200 bg-white p-3 text-sm text-slate-900 outline-none dark:border-blue-500/20 dark:bg-slate-950 dark:text-white"
                          placeholder="Observação opcional"
                          value={observacaoAcordo}
                          onChange={(event) => setObservacaoAcordo(event.target.value)}
                        />
                        <div className="mt-3 flex flex-wrap gap-2">
                          <button disabled={processandoAnulacao} onClick={() => registrarAcordoAnulacao("Aprovado")} className="rounded-xl bg-emerald-600 px-3 py-2 text-sm font-bold text-white disabled:opacity-60">
                            Concordo
                          </button>
                          <button disabled={processandoAnulacao} onClick={() => registrarAcordoAnulacao("Recusado")} className="rounded-xl bg-red-600 px-3 py-2 text-sm font-bold text-white disabled:opacity-60">
                            Recusar
                          </button>
                        </div>
                      </div>
                    )}

                    {podeDecidirAnulacao && (
                      <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-950">
                        <p className="text-sm font-bold text-slate-800 dark:text-slate-100">
                          Decisão administrativa {todosAcordosAprovados ? "" : "(aguardando acordo de todos os analistas)"}
                        </p>
                        <textarea
                          className="mt-2 min-h-[80px] w-full rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-900 outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                          placeholder="Justificativa da decisão"
                          value={justificativaAnulacao}
                          onChange={(event) => setJustificativaAnulacao(event.target.value)}
                        />
                        <div className="mt-3 flex flex-wrap gap-2">
                          <button disabled={!todosAcordosAprovados || processandoAnulacao} onClick={() => decidirAnulacao("Aprovado")} className="rounded-xl bg-orange-600 px-3 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50">
                            Aprovar anulação
                          </button>
                          <button disabled={processandoAnulacao} onClick={() => decidirAnulacao("Recusado")} className="rounded-xl bg-slate-900 px-3 py-2 text-sm font-bold text-white disabled:opacity-60 dark:bg-slate-700">
                            Recusar solicitação
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-1 gap-3 text-sm md:grid-cols-3">
                  <div>
                    <p className="text-xs font-semibold uppercase text-slate-500">Assinado por</p>
                    <p className="mt-1 font-semibold text-slate-800 dark:text-slate-100">{selecionado.assinadoPor || "Pendente de assinatura"}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase text-slate-500">Data da assinatura</p>
                    <p className="mt-1 font-semibold text-slate-800 dark:text-slate-100">{formatarData(selecionado.assinadoEm)}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase text-slate-500">Token</p>
                    <p className="mt-1 truncate font-mono text-xs text-slate-600 dark:text-slate-300">{selecionado.assinaturaToken || "Não gerado"}</p>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="flex min-h-[680px] items-center justify-center p-8 text-center">
              <div>
                <FileSearch className="mx-auto text-slate-400" size={46} />
                <h2 className="mt-4 text-xl font-bold text-slate-900 dark:text-white">Nenhum documento selecionado</h2>
                <p className="mt-2 max-w-md text-sm text-slate-500 dark:text-slate-400">
                  Use os filtros ao lado para localizar um documento e abrir a prévia do PDF.
                </p>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

