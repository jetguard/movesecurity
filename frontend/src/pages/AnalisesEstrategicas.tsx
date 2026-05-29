import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "../services/api";

type AnaliseEstrategica = {
  id: number;
  codigo: string;
  tipo: string;
  titulo: string;
  unidade: string;
  setor?: string;
  local?: string;
  dataHora: string;
  status: string;
  descricao: string;
  diagnostico?: string;
  impacto?: string;
  recomendacoes?: string;
  planoAcao?: string;
  responsavelAcao?: string;
  prazo?: string;
  ocorrenciaId?: number;
  eventoId?: number;
  investigacaoId?: number;
  analiseRiscoId?: number;
  responsavel?: {
    nome: string;
    apelido?: string;
  };
};

type LocalTerminal = {
  id: number;
  nome: string;
  areaSensivel: boolean;
  status: string;
};

type DadosVinculo = {
  origem: string;
  titulo: string;
  local?: string;
  unidade?: string;
  natureza?: string;
  subNatureza?: string;
  ocorrenciaId?: number | null;
  eventoId?: number | null;
  investigacaoId?: number | null;
  contexto?: Record<string, any>;
};

const tipos = [
  "Causa Raiz",
  "Reincidencia",
  "Vulnerabilidade",
  "Perdas",
  "Conformidade",
  "Preventiva",
  "Por Unidade",
];

const status = ["Aberta", "Em andamento", "Concluida", "Cancelada"];

const vazio = {
  tipo: "Causa Raiz",
  titulo: "",
  setor: "",
  local: "",
  dataHora: new Date().toISOString().slice(0, 16),
  status: "Aberta",
  descricao: "",
  diagnostico: "",
  impacto: "",
  recomendacoes: "",
  planoAcao: "",
  responsavelAcao: "",
  prazo: "",
  ocorrenciaId: "",
  eventoId: "",
  investigacaoId: "",
  analiseRiscoId: "",
};

function textoTipo(tipo: string) {
  const descricoes: Record<string, string> = {
    "Causa Raiz": "Identifica origem, falhas contribuintes e acoes corretivas.",
    Reincidencia: "Detecta repeticao por local, unidade, natureza ou processo.",
    Vulnerabilidade: "Mapeia fragilidades fisicas, operacionais e procedimentais.",
    Perdas: "Consolida perdas, impacto financeiro e oportunidades de recuperacao.",
    Conformidade: "Verifica aderencia a procedimentos internos e protocolos.",
    Preventiva: "Registra medidas antes que o risco vire ocorrencia.",
    "Por Unidade": "Compara desempenho e tendencias entre ambientes de trabalho.",
  };
  return descricoes[tipo] || "Analise estrategica do sistema.";
}

export default function AnalisesEstrategicas() {
  const [analises, setAnalises] = useState<AnaliseEstrategica[]>([]);
  const [form, setForm] = useState({ ...vazio });
  const [editando, setEditando] = useState<AnaliseEstrategica | null>(null);
  const [abrirFormulario, setAbrirFormulario] = useState(false);
  const [filtroTipo, setFiltroTipo] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("");
  const [locais, setLocais] = useState<LocalTerminal[]>([]);
  const [buscandoVinculo, setBuscandoVinculo] = useState(false);
  const [resumoVinculo, setResumoVinculo] = useState("");
  const formularioRef = useRef<HTMLFormElement | null>(null);

  async function carregar() {
    const [analisesResponse, locaisResponse] = await Promise.all([
      api.get("/analises-estrategicas"),
      api.get("/locais", { params: { status: "ativo" } }).catch(() => ({ data: [] })),
    ]);
    setAnalises(analisesResponse.data);
    setLocais(locaisResponse.data);
  }

  useEffect(() => {
    carregar();
  }, []);

  useEffect(() => {
    if (!abrirFormulario) return;
    window.setTimeout(() => {
      formularioRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  }, [abrirFormulario, editando]);

  const filtradas = analises.filter((analise) => {
    return (!filtroTipo || analise.tipo === filtroTipo) && (!filtroStatus || analise.status === filtroStatus);
  });

  const indicadores = useMemo(() => {
    const abertas = filtradas.filter((item) => item.status !== "Concluida").length;
    const concluidas = filtradas.filter((item) => item.status === "Concluida").length;
    const atrasadas = filtradas.filter((item) => item.prazo && item.status !== "Concluida" && new Date(item.prazo) < new Date()).length;
    return { total: filtradas.length, abertas, concluidas, atrasadas };
  }, [filtradas]);

  function campo(nome: string, valor: string) {
    setForm((atual) => ({ ...atual, [nome]: valor }));
  }

  function aplicarDadosVinculo(dados: DadosVinculo) {
    setForm((atual) => ({
      ...atual,
      titulo: atual.titulo || dados.titulo || atual.titulo,
      local: dados.local || atual.local,
      ocorrenciaId: dados.ocorrenciaId ? String(dados.ocorrenciaId) : atual.ocorrenciaId,
      eventoId: dados.eventoId ? String(dados.eventoId) : atual.eventoId,
      investigacaoId: dados.investigacaoId ? String(dados.investigacaoId) : atual.investigacaoId,
      descricao: atual.descricao || [
        `${dados.origem} vinculada automaticamente.`,
        dados.contexto?.codigo ? `Codigo: ${dados.contexto.codigo}` : "",
        dados.contexto?.assunto ? `Assunto: ${dados.contexto.assunto}` : "",
        dados.natureza ? `Natureza: ${dados.natureza}${dados.subNatureza ? ` / ${dados.subNatureza}` : ""}` : "",
      ].filter(Boolean).join("\n"),
    }));

    setResumoVinculo([
      `${dados.origem} localizada`,
      dados.contexto?.codigo ? `Codigo: ${dados.contexto.codigo}` : "",
      dados.local ? `Local: ${dados.local}` : "",
      dados.natureza ? `Natureza: ${dados.natureza}` : "",
      dados.investigacaoId ? `R.I vinculada: ID ${dados.investigacaoId}` : "",
    ].filter(Boolean).join(" | "));
  }

  async function buscarDadosVinculados() {
    const params: Record<string, string> = {};
    if (form.investigacaoId) params.investigacaoId = form.investigacaoId;
    else if (form.ocorrenciaId) params.ocorrenciaId = form.ocorrenciaId;
    else if (form.eventoId) params.eventoId = form.eventoId;

    if (!Object.keys(params).length) return;

    setBuscandoVinculo(true);
    try {
      const response = await api.get("/analises-estrategicas/vinculo", { params });
      aplicarDadosVinculo(response.data);
    } catch (error: any) {
      alert(error.response?.data?.error || "Nao foi possivel carregar os dados vinculados.");
    } finally {
      setBuscandoVinculo(false);
    }
  }

  function novaAnalise(tipo = "Causa Raiz") {
    setForm({ ...vazio, tipo, dataHora: new Date().toISOString().slice(0, 16) });
    setEditando(null);
    setResumoVinculo("");
    setAbrirFormulario(true);
  }

  function editar(analise: AnaliseEstrategica) {
    setEditando(analise);
    setForm({
      ...vazio,
      ...analise,
      dataHora: analise.dataHora.slice(0, 16),
      prazo: analise.prazo ? analise.prazo.slice(0, 16) : "",
      ocorrenciaId: analise.ocorrenciaId ? String(analise.ocorrenciaId) : "",
      eventoId: analise.eventoId ? String(analise.eventoId) : "",
      investigacaoId: analise.investigacaoId ? String(analise.investigacaoId) : "",
      analiseRiscoId: analise.analiseRiscoId ? String(analise.analiseRiscoId) : "",
    });
    setResumoVinculo("");
    setAbrirFormulario(true);
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault();

    if (editando) {
      await api.put(`/analises-estrategicas/${editando.id}`, form);
    } else {
      await api.post("/analises-estrategicas", form);
    }

    setAbrirFormulario(false);
    setEditando(null);
    setForm({ ...vazio });
    await carregar();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">Analises Estrategicas</h1>
          <p className="mt-1 text-sm text-slate-500">
            Causa raiz, reincidencia, vulnerabilidade, perdas, conformidade, preventiva e unidade.
          </p>
        </div>
        <button onClick={() => novaAnalise()} className="w-full rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 sm:w-auto">
          Nova Analise
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl bg-white p-5 shadow"><p className="text-sm text-slate-500">Total</p><p className="text-3xl font-bold">{indicadores.total}</p></div>
        <div className="rounded-xl bg-white p-5 shadow"><p className="text-sm text-slate-500">Abertas</p><p className="text-3xl font-bold text-blue-600">{indicadores.abertas}</p></div>
        <div className="rounded-xl bg-white p-5 shadow"><p className="text-sm text-slate-500">Concluidas</p><p className="text-3xl font-bold text-emerald-600">{indicadores.concluidas}</p></div>
        <div className="rounded-xl bg-white p-5 shadow"><p className="text-sm text-slate-500">Atrasadas</p><p className="text-3xl font-bold text-amber-600">{indicadores.atrasadas}</p></div>
      </div>

      <div className="grid grid-cols-1 gap-4 rounded-xl bg-white p-4 shadow md:grid-cols-2">
        <select value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)} className="rounded-lg border p-3">
          <option value="">Todos os tipos</option>
          {tipos.map((tipo) => <option key={tipo}>{tipo}</option>)}
        </select>
        <select value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value)} className="rounded-lg border p-3">
          <option value="">Todos os status</option>
          {status.map((item) => <option key={item}>{item}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {tipos.map((tipo) => (
          <button key={tipo} onClick={() => novaAnalise(tipo)} className="rounded-xl border border-slate-200 bg-white p-4 text-left shadow transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md">
            <h2 className="font-bold text-slate-900">{tipo}</h2>
            <p className="mt-2 text-sm text-slate-500">{textoTipo(tipo)}</p>
          </button>
        ))}
      </div>

      {abrirFormulario && (
        <form ref={formularioRef} onSubmit={salvar} className="scroll-mt-28 space-y-5 rounded-xl bg-white p-4 shadow sm:p-6">
          <h2 className="text-xl font-bold">{editando ? `Editar ${editando.codigo}` : "Nova analise estrategica"}</h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <select className="rounded-lg border p-3" value={form.tipo} onChange={(e) => campo("tipo", e.target.value)}>{tipos.map((tipo) => <option key={tipo}>{tipo}</option>)}</select>
            <select className="rounded-lg border p-3" value={form.status} onChange={(e) => campo("status", e.target.value)}>{status.map((item) => <option key={item}>{item}</option>)}</select>
            <input className="rounded-lg border p-3" placeholder="Titulo" value={form.titulo} onChange={(e) => campo("titulo", e.target.value)} required />
            <input type="datetime-local" className="rounded-lg border p-3" value={form.dataHora} onChange={(e) => campo("dataHora", e.target.value)} required />
            <input className="rounded-lg border p-3" placeholder="Setor" value={form.setor} onChange={(e) => campo("setor", e.target.value)} />
            <select className="rounded-lg border p-3" value={form.local} onChange={(e) => campo("local", e.target.value)}>
              <option value="">Selecione o local da analise</option>
              {form.local && !locais.some((local) => local.nome === form.local) && <option value={form.local}>{form.local}</option>}
              {locais.map((local) => (
                <option key={local.id} value={local.nome}>
                  {local.nome}{local.areaSensivel ? " - AREA SENSIVEL" : ""}
                </option>
              ))}
            </select>
            <input type="datetime-local" className="rounded-lg border p-3" value={form.prazo} onChange={(e) => campo("prazo", e.target.value)} />
            <input className="rounded-lg border p-3" placeholder="Responsavel pela acao" value={form.responsavelAcao} onChange={(e) => campo("responsavelAcao", e.target.value)} />
            <input className="rounded-lg border p-3" placeholder="ID da ocorrencia vinculada" value={form.ocorrenciaId} onBlur={buscarDadosVinculados} onChange={(e) => campo("ocorrenciaId", e.target.value)} />
            <input className="rounded-lg border p-3" placeholder="ID do evento vinculado" value={form.eventoId} onBlur={buscarDadosVinculados} onChange={(e) => campo("eventoId", e.target.value)} />
            <input className="rounded-lg border p-3" placeholder="ID da investigacao vinculada" value={form.investigacaoId} onBlur={buscarDadosVinculados} onChange={(e) => campo("investigacaoId", e.target.value)} />
            <input className="rounded-lg border p-3" placeholder="ID da analise de risco vinculada" value={form.analiseRiscoId} onChange={(e) => campo("analiseRiscoId", e.target.value)} />
          </div>
          <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-900">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p>
                Informe o ID da ocorrencia, evento ou investigacao para preencher automaticamente local e contexto da analise.
              </p>
              <button
                type="button"
                onClick={buscarDadosVinculados}
                disabled={buscandoVinculo || (!form.ocorrenciaId && !form.eventoId && !form.investigacaoId)}
                className="rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700 disabled:bg-slate-300"
              >
                {buscandoVinculo ? "Buscando..." : "Buscar vinculo"}
              </button>
            </div>
            {resumoVinculo && <p className="mt-3 font-semibold">{resumoVinculo}</p>}
          </div>
          <textarea className="min-h-28 w-full rounded-lg border p-3" placeholder="Descricao da analise" value={form.descricao} onChange={(e) => campo("descricao", e.target.value)} required />
          <textarea className="min-h-28 w-full rounded-lg border p-3" placeholder="Diagnostico" value={form.diagnostico} onChange={(e) => campo("diagnostico", e.target.value)} />
          <textarea className="min-h-28 w-full rounded-lg border p-3" placeholder="Impacto identificado" value={form.impacto} onChange={(e) => campo("impacto", e.target.value)} />
          <textarea className="min-h-28 w-full rounded-lg border p-3" placeholder="Recomendacoes" value={form.recomendacoes} onChange={(e) => campo("recomendacoes", e.target.value)} />
          <textarea className="min-h-28 w-full rounded-lg border p-3" placeholder="Plano de acao" value={form.planoAcao} onChange={(e) => campo("planoAcao", e.target.value)} />
          <div className="flex flex-col gap-3 sm:flex-row">
            <button className="rounded-lg bg-green-600 px-4 py-2 text-white hover:bg-green-700">Salvar</button>
            <button type="button" onClick={() => setAbrirFormulario(false)} className="rounded-lg bg-slate-200 px-4 py-2 text-slate-700 hover:bg-slate-300">Cancelar</button>
          </div>
        </form>
      )}

      <div className="space-y-4">
        {filtradas.map((analise) => (
          <div key={analise.id} className="rounded-xl bg-white p-5 shadow">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-blue-600">{analise.tipo} | {analise.codigo}</p>
                <h2 className="mt-1 text-xl font-bold text-slate-900">{analise.titulo}</h2>
                <p className="mt-1 text-sm text-slate-500">{analise.unidade} {analise.local ? `- ${analise.local}` : ""}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full border border-slate-200 px-3 py-1 text-sm text-slate-600">{analise.status}</span>
                <button onClick={() => editar(analise)} className="rounded bg-blue-600 px-3 py-1 text-white">Editar</button>
              </div>
            </div>
            <p className="mt-3 text-sm text-slate-700">{analise.descricao}</p>
            {(analise.planoAcao || analise.recomendacoes) && (
              <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                {analise.recomendacoes && <div className="rounded-lg bg-slate-50 p-3 text-sm"><strong>Recomendacoes:</strong><p>{analise.recomendacoes}</p></div>}
                {analise.planoAcao && <div className="rounded-lg bg-slate-50 p-3 text-sm"><strong>Plano de acao:</strong><p>{analise.planoAcao}</p></div>}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

