import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "../services/api";

type Risco = {
  id: number;
  codigo: string;
  dataHora: string;
  unidade: string;
  setor: string;
  local: string;
  tipoRisco: string;
  naturezaRisco: string;
  descricaoRisco: string;
  possivelImpacto: string;
  probabilidade: string;
  severidade: string;
  nivelRisco: string;
  medidasPreventivas: string;
  planoAcao: string;
  responsavelAcaoNome?: string;
  prazo: string;
  status: string;
};

type LocalTerminal = {
  id: number;
  nome: string;
  areaSensivel: boolean;
  status: string;
};

type NaturezaCadastro = {
  id: number;
  nome: string;
  subNaturezas: Array<{ id: number; nome: string }>;
};

type DadosVinculo = {
  origem: string;
  codigo: string;
  titulo: string;
  assunto?: string;
  local?: string;
  natureza?: string;
  subNatureza?: string;
  status?: string;
  ocorrenciaId?: number | null;
  eventoId?: number | null;
  investigacaoId?: number | null;
  ocorrenciaCodigo?: string | null;
  eventoCodigo?: string | null;
  investigacaoCodigo?: string | null;
  resumo?: string;
};

const tipos = ["Patrimonial", "Operacional", "Segurança Física", "Logístico", "Acesso indevido", "Furto", "Roubo", "Vandalismo", "Incêndio", "Acidente", "Compliance", "Outros"];
const unidades = ["GJA-T1", "GJA-T2", "ITAJAÍ-SC", "SUAPE-T1", "SUAPE-T2", "ANHANGUERA"];
const niveis = ["Baixa", "Média", "Alta", "Crítica"];
const statusPlano = ["Pendente", "Em andamento", "Concluído", "Atrasado"];
const setores = ["Operacional", "Segurança Patrimonial", "CFTV", "Portaria", "Gate", "Armazém", "Pátio", "Administrativo", "Manutenção", "TI", "Compliance", "Outro"];

const vazio = {
  dataHora: new Date().toISOString().slice(0, 16),
  unidade: "GJA-T1",
  setor: "",
  local: "",
  tipoRisco: "Patrimonial",
  naturezaRisco: "",
  natureza: "",
  subNatureza: "",
  descricaoRisco: "",
  possivelImpacto: "",
  probabilidade: "Baixa",
  severidade: "Baixa",
  medidasPreventivas: "",
  planoAcao: "",
  responsavelAcaoNome: "",
  prazo: "",
  status: "Pendente",
  ocorrenciaId: "",
  eventoId: "",
  investigacaoId: "",
};

function calcularNivel(probabilidade: string, severidade: string) {
  const peso: Record<string, number> = { Baixa: 1, Média: 2, Alta: 3, Crítica: 4 };
  const score = (peso[probabilidade] || 1) * (peso[severidade] || 1);
  if (score <= 3) return "Baixo";
  if (score <= 7) return "Moderado";
  if (score <= 11) return "Alto";
  return "Crítico";
}

function corNivel(nivel: string) {
  if (nivel === "Crítico") return "bg-red-100 text-red-700 border-red-200";
  if (nivel === "Alto") return "bg-orange-100 text-orange-700 border-orange-200";
  if (nivel === "Moderado") return "bg-amber-100 text-amber-700 border-amber-200";
  return "bg-emerald-100 text-emerald-700 border-emerald-200";
}

function contarPor<T>(itens: T[], chave: (item: T) => string) {
  return itens.reduce<Record<string, number>>((acc, item) => {
    const nome = chave(item) || "Não informado";
    acc[nome] = (acc[nome] || 0) + 1;
    return acc;
  }, {});
}

export default function Riscos() {
  const [riscos, setRiscos] = useState<Risco[]>([]);
  const [form, setForm] = useState({ ...vazio });
  const [fotos, setFotos] = useState<File[]>([]);
  const [abrirFormulario, setAbrirFormulario] = useState(false);
  const [editando, setEditando] = useState<Risco | null>(null);
  const [filtroUnidade, setFiltroUnidade] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("");
  const [locais, setLocais] = useState<LocalTerminal[]>([]);
  const [naturezas, setNaturezas] = useState<NaturezaCadastro[]>([]);
  const [buscandoVinculo, setBuscandoVinculo] = useState(false);
  const [vinculoEncontrado, setVinculoEncontrado] = useState<DadosVinculo | null>(null);
  const formularioRef = useRef<HTMLFormElement | null>(null);

  async function carregarRiscos() {
    const [riscosResponse, locaisResponse, naturezasResponse] = await Promise.all([
      api.get("/riscos"),
      api.get("/locais", { params: { status: "ativo" } }).catch(() => ({ data: [] })),
      api.get("/naturezas").catch(() => ({ data: [] })),
    ]);
    setRiscos(riscosResponse.data);
    setLocais(locaisResponse.data);
    setNaturezas(naturezasResponse.data);
  }

  useEffect(() => {
    carregarRiscos();
  }, []);

  function rolarParaFormulario() {
    window.setTimeout(() => {
      formularioRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 50);
  }

  useEffect(() => {
    if (!abrirFormulario) return;

    rolarParaFormulario();
  }, [abrirFormulario, editando]);

  const nivelCalculado = calcularNivel(form.probabilidade, form.severidade);
  const riscosFiltrados = riscos.filter((risco) => {
    return (!filtroUnidade || risco.unidade === filtroUnidade) && (!filtroStatus || risco.status === filtroStatus);
  });

  const indicadores = useMemo(() => {
    const hoje = new Date();
    return {
      abertos: riscosFiltrados.filter((r) => r.status !== "Concluído").length,
      criticos: riscosFiltrados.filter((r) => r.nivelRisco === "Crítico").length,
      concluidos: riscosFiltrados.filter((r) => r.status === "Concluído").length,
      atrasados: riscosFiltrados.filter((r) => r.status !== "Concluído" && new Date(r.prazo) < hoje).length,
    };
  }, [riscosFiltrados]);

  function novoRisco() {
    setForm({ ...vazio, dataHora: new Date().toISOString().slice(0, 16) });
    setEditando(null);
    setVinculoEncontrado(null);
    setFotos([]);
    setAbrirFormulario(true);
    rolarParaFormulario();
  }

  function editarRisco(risco: Risco) {
    const [naturezaEditada = "", subNaturezaEditada = ""] = (risco.naturezaRisco || "").split(" / ");
    setEditando(risco);
    setForm({
      ...vazio,
      ...risco,
      natureza: naturezaEditada,
      subNatureza: subNaturezaEditada,
      dataHora: risco.dataHora.slice(0, 16),
      prazo: risco.prazo.slice(0, 16),
    });
    setFotos([]);
    setVinculoEncontrado(null);
    setAbrirFormulario(true);
    rolarParaFormulario();
  }

  function campo(nome: string, valor: string) {
    setForm((atual) => {
      const proximo = { ...atual, [nome]: valor };
      if (nome === "natureza") {
        proximo.subNatureza = "";
        proximo.naturezaRisco = valor;
      }
      if (nome === "subNatureza") {
        proximo.naturezaRisco = [proximo.natureza, valor].filter(Boolean).join(" / ");
      }
      return proximo;
    });
  }

  async function salvarRisco(e: React.FormEvent) {
    e.preventDefault();
    const formData = new FormData();
    Object.entries(form).forEach(([chave, valor]) => formData.append(chave, valor));
    fotos.forEach((foto) => formData.append("fotos", foto));

    if (editando) {
      await api.put(`/riscos/${editando.id}`, form);
    } else {
      await api.post("/riscos", formData, { headers: { "Content-Type": "multipart/form-data" } });
    }

    setAbrirFormulario(false);
    carregarRiscos();
  }

  function aplicarDadosVinculo(dados: DadosVinculo) {
    const naturezaEncontrada = naturezas.find((item) => item.nome === dados.natureza);
    const subNaturezaEncontrada = naturezaEncontrada?.subNaturezas.find((item) => item.nome === dados.subNatureza);

    setForm((atual) => ({
      ...atual,
      local: dados.local || atual.local,
      natureza: naturezaEncontrada?.nome || atual.natureza,
      subNatureza: subNaturezaEncontrada?.nome || atual.subNatureza,
      naturezaRisco: [dados.natureza, dados.subNatureza].filter(Boolean).join(" / ") || atual.naturezaRisco,
      ocorrenciaId: dados.ocorrenciaCodigo || (dados.ocorrenciaId ? String(dados.ocorrenciaId) : atual.ocorrenciaId),
      eventoId: dados.eventoCodigo || (dados.eventoId ? String(dados.eventoId) : atual.eventoId),
      investigacaoId: dados.investigacaoCodigo || (dados.investigacaoId ? String(dados.investigacaoId) : atual.investigacaoId),
      descricaoRisco: atual.descricaoRisco || [
        `Risco vinculado ao ${dados.origem.toLowerCase()} ${dados.codigo}.`,
        dados.assunto ? `Assunto: ${dados.assunto}` : "",
        dados.local ? `Local: ${dados.local}` : "",
        dados.natureza ? `Natureza: ${dados.natureza}${dados.subNatureza ? ` / ${dados.subNatureza}` : ""}` : "",
      ].filter(Boolean).join("\n"),
    }));
    setVinculoEncontrado(dados);
  }

  async function buscarDadosVinculados() {
    const params: Record<string, string> = {};
    if (form.investigacaoId) params.investigacaoCodigo = form.investigacaoId;
    else if (form.ocorrenciaId) params.ocorrenciaCodigo = form.ocorrenciaId;
    else if (form.eventoId) params.eventoCodigo = form.eventoId;

    if (!Object.keys(params).length) return;

    setBuscandoVinculo(true);
    try {
      const response = await api.get("/riscos/vinculo", { params });
      aplicarDadosVinculo(response.data);
    } catch (error: any) {
      setVinculoEncontrado(null);
      alert(error.response?.data?.error || "Não foi possível localizar o relatório vinculado.");
    } finally {
      setBuscandoVinculo(false);
    }
  }

  async function abrirPdf(id: number) {
    const response = await api.get(`/riscos/${id}/pdf`, { responseType: "blob" });
    window.open(URL.createObjectURL(new Blob([response.data], { type: "application/pdf" })), "_blank");
  }

  const porUnidade = Object.entries(contarPor(riscosFiltrados, (r) => r.unidade));
  const porNatureza = Object.entries(contarPor(riscosFiltrados, (r) => r.naturezaRisco));
  const subNaturezasDisponiveis = naturezas.find((item) => item.nome === form.natureza)?.subNaturezas || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-3xl font-bold">Análise de Risco Operacional</h1>
          <p className="text-gray-500 mt-1">Cadastro, classificação, plano de ação e monitoramento de riscos.</p>
        </div>
        <button onClick={novoRisco} className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">Nova Análise</button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="rounded-xl bg-white p-5 shadow"><p className="text-sm text-gray-500">Riscos abertos</p><p className="text-3xl font-bold">{indicadores.abertos}</p></div>
        <div className="rounded-xl bg-white p-5 shadow"><p className="text-sm text-gray-500">Riscos críticos</p><p className="text-3xl font-bold text-red-600">{indicadores.criticos}</p></div>
        <div className="rounded-xl bg-white p-5 shadow"><p className="text-sm text-gray-500">Concluídos</p><p className="text-3xl font-bold text-emerald-600">{indicadores.concluidos}</p></div>
        <div className="rounded-xl bg-white p-5 shadow"><p className="text-sm text-gray-500">Prazos vencidos</p><p className="text-3xl font-bold text-amber-600">{indicadores.atrasados}</p></div>
      </div>

      <div className="grid grid-cols-1 gap-4 rounded-xl bg-white p-4 shadow md:grid-cols-2">
        <select value={filtroUnidade} onChange={(e) => setFiltroUnidade(e.target.value)} className="rounded-lg border p-3">
          <option value="">Todas as unidades</option>
          {unidades.map((u) => <option key={u} value={u}>{u}</option>)}
        </select>
        <select value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value)} className="rounded-lg border p-3">
          <option value="">Todos os status</option>
          {statusPlano.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-xl bg-white p-5 shadow">
          <h2 className="font-bold mb-4">Mapa de calor de riscos</h2>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {niveis.map((prob) => niveis.map((sev) => {
              const nivel = calcularNivel(prob, sev);
              const total = riscosFiltrados.filter((r) => r.probabilidade === prob && r.severidade === sev).length;
              return <div key={`${prob}-${sev}`} className={`rounded-lg border p-3 text-center ${corNivel(nivel)}`} title={`${prob} x ${sev}`}><p className="text-xs">{prob}/{sev}</p><p className="text-xl font-bold">{total}</p></div>;
            }))}
          </div>
        </div>
        <div className="rounded-xl bg-white p-5 shadow">
          <h2 className="font-bold mb-4">Riscos por unidade</h2>
          <div className="space-y-3">{porUnidade.map(([nome, total]) => <div key={nome}><div className="flex justify-between text-sm"><span>{nome}</span><strong>{total}</strong></div><div className="h-2 rounded bg-slate-100"><div className="h-2 rounded bg-blue-600" style={{ width: `${Math.min(total * 16, 100)}%` }} /></div></div>)}</div>
        </div>
        <div className="rounded-xl bg-white p-5 shadow lg:col-span-2">
          <h2 className="font-bold mb-4">Riscos por natureza</h2>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">{porNatureza.map(([nome, total]) => <div key={nome} className="rounded-lg border p-3"><p className="text-sm text-gray-500">{nome}</p><p className="text-2xl font-bold">{total}</p></div>)}</div>
        </div>
      </div>

      {abrirFormulario && (
        <form ref={formularioRef} onSubmit={salvarRisco} className="scroll-mt-28 rounded-xl bg-white p-4 shadow space-y-5 sm:p-6">
          <h2 className="text-xl font-bold">{editando ? `Editar ${editando.codigo}` : "Nova análise de risco"}</h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <label className="space-y-2 text-sm font-semibold text-slate-700">
              <span>Data e hora da análise</span>
              <input type="datetime-local" className="w-full rounded-lg border p-3" value={form.dataHora} onChange={(e) => campo("dataHora", e.target.value)} required />
            </label>
            <select className="rounded-lg border p-3" title="Selecione a unidade da análise" value={form.unidade} onChange={(e) => campo("unidade", e.target.value)} required>
              <option value="">Selecione a unidade</option>
              {unidades.map((u) => <option key={u}>{u}</option>)}
            </select>
            <select className="rounded-lg border p-3" value={form.setor} onChange={(e) => campo("setor", e.target.value)} required>
              <option value="">Selecione o setor onde o risco foi identificado</option>
              {setores.map((setor) => <option key={setor}>{setor}</option>)}
            </select>
            <select className="rounded-lg border p-3" value={form.local} onChange={(e) => campo("local", e.target.value)} required>
              <option value="">Selecione o local cadastrado</option>
              {locais.map((local) => <option key={local.id} value={local.nome}>{local.nome}{local.areaSensivel ? " - ÁREA SENSÍVEL" : ""}</option>)}
            </select>
            <select className="rounded-lg border p-3" title="Selecione o tipo de risco operacional" value={form.tipoRisco} onChange={(e) => campo("tipoRisco", e.target.value)} required>
              <option value="">Selecione o tipo de risco</option>
              {tipos.map((t) => <option key={t}>{t}</option>)}
            </select>
            <select className="rounded-lg border p-3" value={form.natureza} onChange={(e) => campo("natureza", e.target.value)} required>
              <option value="">Selecione a natureza do risco</option>
              {naturezas.map((natureza) => <option key={natureza.id} value={natureza.nome}>{natureza.nome}</option>)}
            </select>
            <select className="rounded-lg border p-3" value={form.subNatureza} onChange={(e) => campo("subNatureza", e.target.value)}>
              <option value="">Selecione a subnatureza do risco</option>
              {subNaturezasDisponiveis.map((subNatureza) => <option key={subNatureza.id} value={subNatureza.nome}>{subNatureza.nome}</option>)}
            </select>
            <select className="rounded-lg border p-3" title="Selecione a probabilidade do risco" value={form.probabilidade} onChange={(e) => campo("probabilidade", e.target.value)} required>
              <option value="">Selecione a probabilidade</option>
              {niveis.map((n) => <option key={n}>{n}</option>)}
            </select>
            <select className="rounded-lg border p-3" title="Selecione a severidade do risco" value={form.severidade} onChange={(e) => campo("severidade", e.target.value)} required>
              <option value="">Selecione a severidade</option>
              {niveis.map((n) => <option key={n}>{n}</option>)}
            </select>
            <div className={`rounded-lg border p-3 font-bold ${corNivel(nivelCalculado)}`}>Nível de risco: {nivelCalculado}</div>
            <select className="rounded-lg border p-3" title="Selecione o status do plano de ação" value={form.status} onChange={(e) => campo("status", e.target.value)} required>
              <option value="">Selecione o status do plano de ação</option>
              {statusPlano.map((s) => <option key={s}>{s}</option>)}
            </select>
            <label className="space-y-2 text-sm font-semibold text-slate-700">
              <span>Prazo para tratativa do risco</span>
              <input type="datetime-local" className="w-full rounded-lg border p-3" value={form.prazo} onChange={(e) => campo("prazo", e.target.value)} required />
            </label>
            <input className="rounded-lg border p-3" placeholder="Responsável pela ação" value={form.responsavelAcaoNome} onChange={(e) => campo("responsavelAcaoNome", e.target.value)} required />
            <input className="rounded-lg border p-3" placeholder="Nº da ocorrência vinculada. Ex: 0001/2026" value={form.ocorrenciaId} onBlur={buscarDadosVinculados} onChange={(e) => campo("ocorrenciaId", e.target.value.toUpperCase())} />
            <input className="rounded-lg border p-3" placeholder="Nº do evento vinculado. Ex: 0005/2026" value={form.eventoId} onBlur={buscarDadosVinculados} onChange={(e) => campo("eventoId", e.target.value.toUpperCase())} />
            <input className="rounded-lg border p-3" placeholder="Nº da investigação vinculada. Ex: RI003/2026" value={form.investigacaoId} onBlur={buscarDadosVinculados} onChange={(e) => campo("investigacaoId", e.target.value.toUpperCase())} />
            {!editando && <input type="file" multiple accept="image/*" className="rounded-lg border p-3" onChange={(e) => setFotos(Array.from(e.target.files || []))} />}
          </div>
          <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-900">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p>Informe o número da ocorrência, evento ou investigação para preencher automaticamente local, natureza e contexto do risco.</p>
              <button
                type="button"
                onClick={buscarDadosVinculados}
                disabled={buscandoVinculo || (!form.ocorrenciaId && !form.eventoId && !form.investigacaoId)}
                className="rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700 disabled:bg-slate-300"
              >
                {buscandoVinculo ? "Buscando..." : "Buscar vínculo"}
              </button>
            </div>
            {vinculoEncontrado && (
              <div className="mt-4 grid grid-cols-1 gap-3 rounded-lg bg-white p-4 text-slate-700 shadow-sm md:grid-cols-4">
                <div>
                  <p className="text-xs font-bold uppercase text-slate-400">Origem</p>
                  <p className="font-bold">{vinculoEncontrado.origem} {vinculoEncontrado.codigo}</p>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase text-slate-400">Local</p>
                  <p className="font-bold">{vinculoEncontrado.local || "Não informado"}</p>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase text-slate-400">Natureza</p>
                  <p className="font-bold">{vinculoEncontrado.natureza || "Não informado"}{vinculoEncontrado.subNatureza ? ` / ${vinculoEncontrado.subNatureza}` : ""}</p>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase text-slate-400">Status</p>
                  <p className="font-bold">{vinculoEncontrado.status || "Não informado"}</p>
                </div>
                <p className="md:col-span-4 text-sm text-slate-600">{vinculoEncontrado.titulo}</p>
              </div>
            )}
          </div>
          <textarea className="w-full rounded-lg border p-3" placeholder="Descrição do risco" value={form.descricaoRisco} onChange={(e) => campo("descricaoRisco", e.target.value)} required />
          <textarea className="w-full rounded-lg border p-3" placeholder="Possível impacto" value={form.possivelImpacto} onChange={(e) => campo("possivelImpacto", e.target.value)} required />
          <textarea className="w-full rounded-lg border p-3" placeholder="Medidas preventivas" value={form.medidasPreventivas} onChange={(e) => campo("medidasPreventivas", e.target.value)} required />
          <textarea className="w-full rounded-lg border p-3" placeholder="Plano de ação" value={form.planoAcao} onChange={(e) => campo("planoAcao", e.target.value)} required />
          <div className="flex flex-col gap-3 sm:flex-row"><button className="rounded-lg bg-green-600 px-4 py-2 text-white">Salvar</button><button type="button" onClick={() => setAbrirFormulario(false)} className="rounded-lg bg-gray-300 px-4 py-2">Cancelar</button></div>
        </form>
      )}

      <div className="space-y-4">
        {riscosFiltrados.map((risco) => (
          <div key={risco.id} className="rounded-xl bg-white p-5 shadow">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div><h2 className="text-xl font-bold">{risco.codigo}</h2><p className="text-gray-600">{risco.tipoRisco} | {risco.naturezaRisco}</p><p className="text-sm text-gray-500">{risco.unidade} - {risco.local}</p></div>
              <div className="flex flex-wrap gap-2"><span className={`rounded-full border px-3 py-1 text-sm ${corNivel(risco.nivelRisco)}`}>{risco.nivelRisco}</span><button onClick={() => editarRisco(risco)} className="rounded bg-blue-600 px-3 py-1 text-white">Editar</button><button onClick={() => abrirPdf(risco.id)} className="rounded bg-red-600 px-3 py-1 text-white">PDF</button></div>
            </div>
            <p className="mt-3 text-sm text-gray-700">{risco.descricaoRisco}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

