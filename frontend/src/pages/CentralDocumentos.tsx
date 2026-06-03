import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  Download,
  ExternalLink,
  FileSearch,
  Filter,
  Maximize2,
  RefreshCcw,
  Search,
  ShieldCheck,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { api } from "../services/api";
import { SkeletonDashboard } from "../components/ui/Skeleton";
import { unidadesPermitidasUsuario } from "../utils/permissoes";

type DocumentoCentral = {
  id: string;
  modulo: string;
  tipo: string;
  registroId: number;
  protocolo: string;
  titulo: string;
  unidade: string;
  status: string;
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

function statusAssinaturaClasse(status: DocumentoCentral["assinaturaStatus"]) {
  return status === "Assinado"
    ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200"
    : "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200";
}

function formatarData(valor?: string | null) {
  if (!valor) return "Não informado";
  return new Date(valor).toLocaleString("pt-BR");
}

export default function CentralDocumentos() {
  const [documentos, setDocumentos] = useState<DocumentoCentral[]>([]);
  const [selecionado, setSelecionado] = useState<DocumentoCentral | null>(null);
  const [resumo, setResumo] = useState<Resumo>({ total: 0, assinados: 0, pendentes: 0, comPdf: 0 });
  const [carregando, setCarregando] = useState(true);
  const [busca, setBusca] = useState("");
  const [modulo, setModulo] = useState("");
  const [unidade, setUnidade] = useState("");
  const [assinatura, setAssinatura] = useState("");
  const [inicio, setInicio] = useState("");
  const [fim, setFim] = useState("");
  const unidades = useMemo(() => unidadesPermitidasUsuario(), []);

  const params = useMemo(() => ({
    busca,
    modulo,
    unidade,
    assinatura,
    inicio,
    fim,
  }), [assinatura, busca, fim, inicio, modulo, unidade]);

  async function carregarDocumentos() {
    setCarregando(true);
    try {
      const response = await api.get("/documentos", { params });
      const lista = response.data.documentos || [];
      setDocumentos(lista);
      setResumo(response.data.resumo || { total: 0, assinados: 0, pendentes: 0, comPdf: 0 });
      setSelecionado((atual) => lista.find((documento: DocumentoCentral) => documento.id === atual?.id) || lista[0] || null);
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregarDocumentos();
  }, []);

  function aplicarFiltros(event: React.FormEvent) {
    event.preventDefault();
    carregarDocumentos();
  }

  function limparFiltros() {
    setBusca("");
    setModulo("");
    setUnidade("");
    setAssinatura("");
    setInicio("");
    setFim("");
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

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[380px_minmax(0,1fr)]">
        <aside className="space-y-4 xl:sticky xl:top-24 xl:self-start">
          <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
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

          <section className="grid grid-cols-2 gap-3">
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

          <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="border-b border-slate-100 p-4 dark:border-slate-800">
              <h2 className="font-bold text-slate-900 dark:text-white">Documentos encontrados</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Clique em um documento para abrir a prévia.</p>
            </div>

            {carregando ? (
              <div className="p-4">
                <SkeletonDashboard />
              </div>
            ) : (
              <div className="max-h-[520px] space-y-2 overflow-y-auto p-3 [scrollbar-color:rgba(148,163,184,.35)_transparent] [scrollbar-width:thin]">
                {documentos.map((documento) => {
                  const ativo = selecionado?.id === documento.id;
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
                      </div>
                    </button>
                  );
                })}

                {documentos.length === 0 && (
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
