import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { CheckCircle2, Copy, ExternalLink, FileText, Link2, Loader2, RefreshCw, ShieldCheck } from "lucide-react";
import { api } from "../services/api";

type EnvolvidoCampo = {
  id: number;
  tipoEnvolvimento: string;
  nome: string;
  tipoDocumento: string;
  documento?: string;
  empresa?: string;
  possuiVeiculo: boolean;
  placa?: string;
  reboque?: string;
  relato: string;
  audioNome?: string;
};

type RelatoCampo = {
  id: number;
  token: string;
  link: string;
  status: string;
  titulo?: string;
  setor?: string;
  local?: string;
  unidade: string;
  responsavelColeta?: string;
  observacoes?: string;
  dataOcorrido?: string;
  expiraEm: string;
  enviadoEm?: string;
  convertidoTipo?: string;
  convertidoCodigo?: string;
  expirado?: boolean;
  envolvidos: EnvolvidoCampo[];
  anexos: Array<{ id: number; nomeOriginal: string; tipo: string }>;
  geradoPor?: { nome: string; apelido?: string };
};

type Natureza = {
  id: number;
  nome: string;
  subNaturezas: Array<{ id: number; nome: string }>;
};

type Local = {
  id: number;
  nome: string;
};

const estados = {
  "Link Gerado": "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-200",
  Enviado: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-100",
  Convertido: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-200",
};

export default function RelatosCampo() {
  const [relatos, setRelatos] = useState<RelatoCampo[]>([]);
  const [naturezas, setNaturezas] = useState<Natureza[]>([]);
  const [locais, setLocais] = useState<Local[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [gerando, setGerando] = useState(false);
  const [linkGerado, setLinkGerado] = useState("");
  const [relatoSelecionado, setRelatoSelecionado] = useState<RelatoCampo | null>(null);
  const [convertendo, setConvertendo] = useState(false);
  const [form, setForm] = useState({
    tipo: "Ocorrencia",
    assunto: "",
    local: "",
    natureza: "",
    subNatureza: "",
    relatoSeguranca: "",
  });

  const subNaturezas = useMemo(
    () => naturezas.find((item) => item.nome === form.natureza)?.subNaturezas || [],
    [form.natureza, naturezas]
  );

  async function carregar() {
    setCarregando(true);
    try {
      const [relatosResponse, naturezasResponse, locaisResponse] = await Promise.all([
        api.get("/relatos-campo"),
        api.get("/naturezas"),
        api.get("/locais"),
      ]);
      setRelatos(relatosResponse.data || []);
      setNaturezas(naturezasResponse.data || []);
      setLocais((locaisResponse.data || []).filter((item: { status?: string }) => item.status !== "Inativo"));
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregar();
  }, []);

  async function gerarLink() {
    setGerando(true);
    try {
      const response = await api.post("/relatos-campo/links");
      setLinkGerado(response.data.link);
      await carregar();
    } finally {
      setGerando(false);
    }
  }

  function abrirConversao(relato: RelatoCampo) {
    setRelatoSelecionado(relato);
    setForm({
      tipo: "Ocorrencia",
      assunto: relato.titulo || "",
      local: relato.local || "",
      natureza: "",
      subNatureza: "",
      relatoSeguranca: relato.observacoes || "",
    } as typeof form);
  }

  async function converter(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!relatoSelecionado) return;

    setConvertendo(true);
    try {
      const response = await api.post(`/relatos-campo/${relatoSelecionado.id}/converter`, form);
      alert(`Relato convertido para ${response.data.tipo}: ${response.data.registro.codigo}`);
      setRelatoSelecionado(null);
      await carregar();
    } finally {
      setConvertendo(false);
    }
  }

  function data(valor?: string) {
    if (!valor) return "Nao informado";
    return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(valor));
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.25em] text-blue-500 dark:text-blue-300">Relatórios</p>
          <h1 className="mt-1 text-3xl font-black text-slate-900 dark:text-white">Relatos de Campo</h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-600 dark:text-slate-300">
            Gere links temporários para coleta de dados, envolvidos, evidências e relatos em campo antes da criação oficial de ocorrência ou evento.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={carregar} className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-100 dark:hover:bg-slate-800">
            <RefreshCw size={17} />
            Atualizar
          </button>
          <button onClick={gerarLink} disabled={gerando} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-black text-white transition hover:bg-blue-500 disabled:bg-slate-500">
            {gerando ? <Loader2 size={17} className="animate-spin" /> : <Link2 size={17} />}
            Gerar Link
          </button>
        </div>
      </div>

      <section className="rounded-3xl border border-blue-200 bg-blue-50 p-5 dark:border-blue-500/25 dark:bg-blue-500/10">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3">
            <div className="rounded-2xl bg-blue-600 p-3 text-white">
              <ShieldCheck size={22} />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900 dark:text-white">Coleta de dados para relatório</h2>
              <p className="text-sm text-slate-600 dark:text-slate-300">O link expira em 6 horas ou imediatamente após o envio do formulário.</p>
            </div>
          </div>
          {linkGerado && (
            <div className="flex min-w-0 flex-1 flex-col gap-2 lg:max-w-2xl">
              <div className="truncate rounded-2xl border border-blue-200 bg-white px-4 py-3 text-sm font-bold text-blue-700 dark:border-blue-400/30 dark:bg-slate-950 dark:text-blue-200">
                {linkGerado}
              </div>
              <div className="flex gap-2">
                <button onClick={() => navigator.clipboard?.writeText(linkGerado)} className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-3 py-2 text-xs font-black text-white dark:bg-white dark:text-slate-950">
                  <Copy size={14} />
                  Copiar
                </button>
                <a href={linkGerado} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl border border-blue-300 px-3 py-2 text-xs font-black text-blue-700 dark:border-blue-500/40 dark:text-blue-200">
                  <ExternalLink size={14} />
                  Abrir
                </a>
              </div>
            </div>
          )}
        </div>
      </section>

      <div className="grid gap-4">
        {carregando ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">Carregando relatos...</div>
        ) : relatos.length === 0 ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">Nenhum relato de campo gerado ainda.</div>
        ) : (
          relatos.map((relato) => (
            <article key={relato.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full px-3 py-1 text-xs font-black ${estados[relato.status as keyof typeof estados] || "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"}`}>
                      {relato.expirado ? "Expirado" : relato.status}
                    </span>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">Unidade {relato.unidade}</span>
                    {relato.convertidoCodigo && <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-200">{relato.convertidoTipo} {relato.convertidoCodigo}</span>}
                  </div>
                  <h2 className="mt-3 text-xl font-black text-slate-900 dark:text-white">{relato.titulo || "Link de coleta aguardando preenchimento"}</h2>
                  <div className="mt-3 grid gap-2 text-sm text-slate-600 dark:text-slate-300 md:grid-cols-2 lg:grid-cols-4">
                    <p><b>Responsável:</b> {relato.responsavelColeta || relato.geradoPor?.apelido || relato.geradoPor?.nome || "Nao informado"}</p>
                    <p><b>Local:</b> {relato.local || "Aguardando"}</p>
                    <p><b>Data:</b> {data(relato.dataOcorrido)}</p>
                    <p><b>Expira:</b> {data(relato.expiraEm)}</p>
                  </div>
                  <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
                    {relato.envolvidos.length} envolvido(s), {relato.anexos.length} evidência(s)
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <a href={relato.link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-3 py-2 text-xs font-black text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">
                    <ExternalLink size={14} />
                    Link
                  </a>
                  {relato.status === "Enviado" && (
                    <button onClick={() => abrirConversao(relato)} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-3 py-2 text-xs font-black text-white transition hover:bg-blue-500">
                      <FileText size={14} />
                      Converter
                    </button>
                  )}
                </div>
              </div>
            </article>
          ))
        )}
      </div>

      {relatoSelecionado && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
          <form onSubmit={converter} className="max-h-[92vh] w-full max-w-3xl overflow-auto rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-950">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-500">Conversão</p>
                <h2 className="text-2xl font-black text-slate-900 dark:text-white">Converter relato de campo</h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Os envolvidos já serão reaproveitados no relatório oficial.</p>
              </div>
              <button type="button" onClick={() => setRelatoSelecionado(null)} className="rounded-full bg-slate-100 px-3 py-2 text-sm font-black dark:bg-slate-800 dark:text-white">X</button>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <select value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })} className="rounded-xl border p-3 dark:border-slate-700 dark:bg-slate-900 dark:text-white">
                <option value="Ocorrencia">Converter para Ocorrência</option>
                <option value="Evento">Converter para Evento</option>
              </select>
              <input value={form.assunto} onChange={(e) => setForm({ ...form, assunto: e.target.value })} placeholder="Assunto / título do relatório" className="rounded-xl border p-3 dark:border-slate-700 dark:bg-slate-900 dark:text-white" />
              <select value={form.local} onChange={(e) => setForm({ ...form, local: e.target.value })} className="rounded-xl border p-3 dark:border-slate-700 dark:bg-slate-900 dark:text-white">
                <option value="">Selecione o local</option>
                {locais.map((local) => <option key={local.id} value={local.nome}>{local.nome}</option>)}
              </select>
              <select value={form.natureza} onChange={(e) => setForm({ ...form, natureza: e.target.value, subNatureza: "" })} className="rounded-xl border p-3 dark:border-slate-700 dark:bg-slate-900 dark:text-white">
                <option value="">Selecione a natureza</option>
                {naturezas.map((natureza) => <option key={natureza.id} value={natureza.nome}>{natureza.nome}</option>)}
              </select>
              <select value={form.subNatureza} onChange={(e) => setForm({ ...form, subNatureza: e.target.value })} className="rounded-xl border p-3 dark:border-slate-700 dark:bg-slate-900 dark:text-white md:col-span-2">
                <option value="">Selecione a subnatureza</option>
                {subNaturezas.map((sub) => <option key={sub.id} value={sub.nome}>{sub.nome}</option>)}
              </select>
            </div>
            <textarea value={form.relatoSeguranca} onChange={(e) => setForm({ ...form, relatoSeguranca: e.target.value })} placeholder="Relato patrimonial / observações complementares" className="mt-4 min-h-28 w-full rounded-xl border p-3 dark:border-slate-700 dark:bg-slate-900 dark:text-white" />

            <div className="mt-5 rounded-2xl bg-slate-50 p-4 dark:bg-slate-900">
              <p className="mb-3 text-sm font-black text-slate-700 dark:text-slate-200">Envolvidos coletados</p>
              <div className="space-y-3">
                {relatoSelecionado.envolvidos.map((envolvido) => (
                  <div key={envolvido.id} className="rounded-xl border border-slate-200 bg-white p-3 text-sm dark:border-slate-800 dark:bg-slate-950">
                    <p className="font-black text-slate-900 dark:text-white">{envolvido.nome}</p>
                    <p className="mt-1 whitespace-pre-line text-slate-600 dark:text-slate-300">{envolvido.relato}</p>
                    {envolvido.audioNome && <p className="mt-2 text-xs font-bold text-blue-600 dark:text-blue-300">Áudio anexado: {envolvido.audioNome}</p>}
                  </div>
                ))}
              </div>
            </div>

            <button disabled={convertendo} className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 font-black text-white transition hover:bg-blue-500 disabled:bg-slate-500">
              {convertendo ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle2 size={18} />}
              Confirmar conversão
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
