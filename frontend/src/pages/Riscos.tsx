import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import { api } from "../services/api";
import { PdfLightbox } from "../components/ui/PdfLightbox";
import { podeSuperAdmin } from "../utils/permissoes";

type RiscoCatalogo = {
  id: number;
  numero: number;
  codigo: string;
  nome: string;
  unidade: string;
  tipoRisco: string;
  naturezaRisco: string;
  descricaoRisco: string;
  possivelImpacto: string;
  medidasPreventivas?: string | null;
  planoAcaoSugerido?: string | null;
  status: string;
};

type Risco = {
  id: number;
  codigo: string;
  riscoCatalogoId?: number | null;
  riscoCatalogo?: RiscoCatalogo | null;
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
};

const tipos = ["Patrimonial", "Operacional", "Segurança Física", "Logístico", "Acesso indevido", "Furto", "Roubo", "Vandalismo", "Incêndio", "Acidente", "Compliance", "Outros"];
const unidades = ["GJA-T1", "GJA-T2", "ITAJAÍ-SC", "SUAPE-T1", "SUAPE-T2", "ANHANGUERA"];
const niveis = ["Baixa", "Média", "Alta", "Crítica"];
const statusPlano = ["Pendente", "Em andamento", "Concluído", "Atrasado"];
const setores = ["Operacional", "Segurança Patrimonial", "CFTV", "Portaria", "Gate", "Armazém", "Pátio", "Administrativo", "Manutenção", "TI", "Compliance", "Outro"];

const riscoVazio = {
  dataHora: new Date().toISOString().slice(0, 16),
  unidade: "GJA-T1",
  setor: "",
  local: "",
  riscoCatalogoId: "",
  tipoRisco: "Patrimonial",
  naturezaRisco: "",
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

const catalogoVazio = {
  id: 0,
  nome: "",
  tipoRisco: "Patrimonial",
  naturezaRisco: "",
  descricaoRisco: "",
  possivelImpacto: "",
  medidasPreventivas: "",
  planoAcaoSugerido: "",
  status: "Ativo",
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
  if (nivel === "Crítico") return "border-red-200 bg-red-50 text-red-700";
  if (nivel === "Alto") return "border-orange-200 bg-orange-50 text-orange-700";
  if (nivel === "Moderado") return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-emerald-200 bg-emerald-50 text-emerald-700";
}

function contarPor<T>(itens: T[], chave: (item: T) => string) {
  return itens.reduce<Record<string, number>>((acc, item) => {
    const nome = chave(item) || "Não informado";
    acc[nome] = (acc[nome] || 0) + 1;
    return acc;
  }, {});
}

function campoClasse() {
  return "w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-blue-400 dark:focus:ring-blue-500/20";
}

function Label({ texto, children, className = "" }: { texto: string; children: ReactNode; className?: string }) {
  return (
    <label className={`space-y-1.5 text-sm font-semibold text-slate-700 dark:text-slate-200 ${className}`}>
      <span>{texto}</span>
      {children}
    </label>
  );
}

export default function Riscos() {
  const [riscos, setRiscos] = useState<Risco[]>([]);
  const [catalogo, setCatalogo] = useState<RiscoCatalogo[]>([]);
  const [form, setForm] = useState({ ...riscoVazio });
  const [catalogoForm, setCatalogoForm] = useState({ ...catalogoVazio });
  const [fotos, setFotos] = useState<File[]>([]);
  const [abrirFormulario, setAbrirFormulario] = useState(false);
  const [abrirCatalogo, setAbrirCatalogo] = useState(false);
  const [editando, setEditando] = useState<Risco | null>(null);
  const [editandoCatalogoId, setEditandoCatalogoId] = useState<number | null>(null);
  const [filtroUnidade, setFiltroUnidade] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("");
  const [locais, setLocais] = useState<LocalTerminal[]>([]);
  const [erroLocais, setErroLocais] = useState("");
  const [buscandoVinculo, setBuscandoVinculo] = useState(false);
  const [vinculoEncontrado, setVinculoEncontrado] = useState<DadosVinculo | null>(null);
  const [pdfLightbox, setPdfLightbox] = useState<{ url: string; titulo: string; nomeArquivo: string } | null>(null);
  const formularioRef = useRef<HTMLFormElement | null>(null);

  async function carregarRiscos() {
    const [riscosResponse, catalogoResponse] = await Promise.all([
      api.get("/riscos"),
      api.get("/riscos/catalogo", { params: { todos: true } }).catch(() => ({ data: [] })),
    ]);
    setRiscos(riscosResponse.data);
    setCatalogo(catalogoResponse.data);
  }

  async function carregarLocaisRisco() {
    setErroLocais("");
    try {
      const response = await api.get("/riscos/locais");
      setLocais(Array.isArray(response.data) ? response.data : []);
    } catch (erroPrincipal) {
      try {
        const response = await api.get("/locais");
        setLocais(Array.isArray(response.data) ? response.data : []);
      } catch (erroFallback) {
        console.error("Erro ao carregar locais para análise de risco", erroPrincipal, erroFallback);
        setLocais([]);
        setErroLocais("Não foi possível carregar os locais cadastrados.");
      }
    }
  }

  useEffect(() => {
    carregarRiscos();
    carregarLocaisRisco();
  }, []);

  function rolarParaFormulario() {
    window.setTimeout(() => formularioRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  }

  const nivelCalculado = calcularNivel(form.probabilidade, form.severidade);
  const riscosFiltrados = riscos.filter((risco) => (!filtroUnidade || risco.unidade === filtroUnidade) && (!filtroStatus || risco.status === filtroStatus));
  const riscosCatalogoAtivos = catalogo.filter((item) => item.status === "Ativo");
  const usuarioSuperAdmin = podeSuperAdmin();

  const indicadores = useMemo(() => {
    const hoje = new Date();
    return {
      abertos: riscosFiltrados.filter((r) => r.status !== "Concluído").length,
      criticos: riscosFiltrados.filter((r) => r.nivelRisco === "Crítico").length,
      concluidos: riscosFiltrados.filter((r) => r.status === "Concluído").length,
      atrasados: riscosFiltrados.filter((r) => r.status !== "Concluído" && r.prazo && new Date(r.prazo) < hoje).length,
    };
  }, [riscosFiltrados]);

  function novoRisco() {
    setForm({ ...riscoVazio, dataHora: new Date().toISOString().slice(0, 16) });
    setEditando(null);
    setVinculoEncontrado(null);
    setFotos([]);
    setAbrirFormulario(true);
    rolarParaFormulario();
  }

  function editarRisco(risco: Risco) {
    setEditando(risco);
    setForm({
      ...riscoVazio,
      ...risco,
      riscoCatalogoId: risco.riscoCatalogoId ? String(risco.riscoCatalogoId) : "",
      dataHora: risco.dataHora.slice(0, 16),
      prazo: risco.prazo.slice(0, 16),
    });
    setFotos([]);
    setVinculoEncontrado(null);
    setAbrirFormulario(true);
    rolarParaFormulario();
  }

  function aplicarRiscoCatalogo(id: string) {
    const riscoSelecionado = catalogo.find((item) => item.id === Number(id));
    setForm((atual) => ({
      ...atual,
      riscoCatalogoId: id,
      tipoRisco: riscoSelecionado?.tipoRisco || atual.tipoRisco,
      naturezaRisco: riscoSelecionado?.naturezaRisco || atual.naturezaRisco,
      descricaoRisco: riscoSelecionado?.descricaoRisco || atual.descricaoRisco,
      possivelImpacto: riscoSelecionado?.possivelImpacto || atual.possivelImpacto,
      medidasPreventivas: riscoSelecionado?.medidasPreventivas || atual.medidasPreventivas,
      planoAcao: riscoSelecionado?.planoAcaoSugerido || atual.planoAcao,
    }));
  }

  function campo(nome: string, valor: string) {
    if (nome === "riscoCatalogoId") return aplicarRiscoCatalogo(valor);

    setForm((atual) => {
      const proximo = { ...atual, [nome]: valor };
      return proximo;
    });
  }

  function campoCatalogo(nome: string, valor: string) {
    setCatalogoForm((atual) => {
      const proximo = { ...atual, [nome]: valor };
      return proximo;
    });
  }

  async function salvarRisco(e: FormEvent) {
    e.preventDefault();
    const formData = new FormData();
    Object.entries(form).forEach(([chave, valor]) => formData.append(chave, String(valor || "")));
    fotos.forEach((foto) => formData.append("fotos", foto));

    if (editando) {
      await api.put(`/riscos/${editando.id}`, form);
    } else {
      await api.post("/riscos", formData, { headers: { "Content-Type": "multipart/form-data" } });
    }

    setAbrirFormulario(false);
    carregarRiscos();
  }

  async function salvarCatalogo(e: FormEvent) {
    e.preventDefault();
    const payload = {
      ...catalogoForm,
      naturezaRisco: catalogoForm.tipoRisco,
    };

    try {
      if (editandoCatalogoId) await api.put(`/riscos/catalogo/${editandoCatalogoId}`, payload);
      else await api.post("/riscos/catalogo", payload);

      setCatalogoForm({ ...catalogoVazio });
      setEditandoCatalogoId(null);
      setAbrirCatalogo(false);
      carregarRiscos();
    } catch (error: unknown) {
      const apiError = error as { response?: { data?: { error?: string } } };
      alert(apiError.response?.data?.error || "Erro ao salvar risco identificado.");
    }
  }

  function editarCatalogo(item: RiscoCatalogo) {
    setCatalogoForm({
      id: item.id,
      nome: item.nome,
      tipoRisco: item.tipoRisco,
      naturezaRisco: item.naturezaRisco,
      descricaoRisco: item.descricaoRisco,
      possivelImpacto: item.possivelImpacto,
      medidasPreventivas: item.medidasPreventivas || "",
      planoAcaoSugerido: item.planoAcaoSugerido || "",
      status: item.status,
    });
    setEditandoCatalogoId(item.id);
    setAbrirCatalogo(true);
  }

  async function inativarCatalogo(id: number) {
    if (!confirm("Inativar este risco identificado?")) return;
    await api.delete(`/riscos/catalogo/${id}`);
    carregarRiscos();
  }

  async function excluirCatalogo(id: number) {
    if (!confirm("Excluir definitivamente este risco identificado? Esta ação fica registrada em auditoria.")) return;
    try {
      await api.delete(`/riscos/catalogo/${id}/permanente`);
      carregarRiscos();
    } catch (error: unknown) {
      const apiError = error as { response?: { data?: { error?: string } } };
      alert(apiError.response?.data?.error || "Erro ao excluir risco identificado.");
    }
  }

  function aplicarDadosVinculo(dados: DadosVinculo) {
    setForm((atual) => ({
      ...atual,
      local: dados.local || atual.local,
      naturezaRisco: [dados.natureza, dados.subNatureza].filter(Boolean).join(" / ") || atual.naturezaRisco,
      ocorrenciaId: dados.ocorrenciaCodigo || (dados.ocorrenciaId ? String(dados.ocorrenciaId) : atual.ocorrenciaId),
      eventoId: dados.eventoCodigo || (dados.eventoId ? String(dados.eventoId) : atual.eventoId),
      investigacaoId: dados.investigacaoCodigo || (dados.investigacaoId ? String(dados.investigacaoId) : atual.investigacaoId),
      descricaoRisco: atual.descricaoRisco || [`Risco vinculado ao ${dados.origem.toLowerCase()} ${dados.codigo}.`, dados.assunto ? `Assunto: ${dados.assunto}` : "", dados.local ? `Local: ${dados.local}` : ""].filter(Boolean).join("\n"),
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
    } catch (error: unknown) {
      const apiError = error as { response?: { data?: { error?: string } } };
      setVinculoEncontrado(null);
      alert(apiError.response?.data?.error || "Não foi possível localizar o relatório vinculado.");
    } finally {
      setBuscandoVinculo(false);
    }
  }

  async function abrirPdf(id: number) {
    const risco = riscos.find((item) => item.id === id);
    const response = await api.get(`/riscos/${id}/pdf`, { responseType: "blob" });
    const url = URL.createObjectURL(new Blob([response.data], { type: "application/pdf" }));
    setPdfLightbox({
      url,
      titulo: risco ? `Análise de Risco ${risco.codigo}` : "Análise de Risco",
      nomeArquivo: `analise-risco-${risco?.codigo || id}.pdf`.replace(/\//g, "-"),
    });
  }

  function fecharPdfLightbox() {
    if (pdfLightbox?.url) URL.revokeObjectURL(pdfLightbox.url);
    setPdfLightbox(null);
  }

  const porUnidade = Object.entries(contarPor(riscosFiltrados, (r) => r.unidade));
  const porTipo = Object.entries(contarPor(riscosFiltrados, (r) => r.tipoRisco));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-blue-600">Governança operacional</p>
          <h1 className="text-3xl font-bold text-slate-900">Análise de Riscos</h1>
          <p className="mt-1 text-slate-500">Cadastre riscos identificados, avalie probabilidade e impacto, e acompanhe planos de ação.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => { setCatalogoForm({ ...catalogoVazio }); setEditandoCatalogoId(null); setAbrirCatalogo(true); }} className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-bold text-blue-700 hover:bg-blue-100">Cadastrar risco</button>
          <button onClick={novoRisco} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700">Nova análise</button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="rounded-lg border border-slate-200 bg-white p-4"><p className="text-xs font-bold uppercase text-slate-400">Abertos</p><p className="mt-1 text-2xl font-bold">{indicadores.abertos}</p></div>
        <div className="rounded-lg border border-slate-200 bg-white p-4"><p className="text-xs font-bold uppercase text-slate-400">Críticos</p><p className="mt-1 text-2xl font-bold text-red-600">{indicadores.criticos}</p></div>
        <div className="rounded-lg border border-slate-200 bg-white p-4"><p className="text-xs font-bold uppercase text-slate-400">Concluídos</p><p className="mt-1 text-2xl font-bold text-emerald-600">{indicadores.concluidos}</p></div>
        <div className="rounded-lg border border-slate-200 bg-white p-4"><p className="text-xs font-bold uppercase text-slate-400">Vencidos</p><p className="mt-1 text-2xl font-bold text-amber-600">{indicadores.atrasados}</p></div>
      </div>

      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Riscos identificados</h2>
            <p className="text-sm text-slate-500">Base padronizada usada dentro do formulário de análise.</p>
          </div>
          <div className="flex gap-2">
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">{catalogo.length} cadastrados</span>
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">{riscosCatalogoAtivos.length} ativos</span>
          </div>
        </div>
        <div className="overflow-hidden rounded-lg border border-slate-200">
          <div className="max-h-[520px] overflow-y-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="sticky top-0 z-10 bg-slate-50 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-3 py-3">Código</th>
                  <th className="px-3 py-3">Risco identificado</th>
                  <th className="px-3 py-3">Tipo</th>
                  <th className="px-3 py-3">Status</th>
                  <th className="px-3 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {catalogo.map((item) => (
                  <tr key={item.id} className="align-top transition-colors hover:bg-slate-800/35 dark:hover:bg-slate-800/45">
                    <td className="whitespace-nowrap px-3 py-3 font-bold text-slate-900">{item.codigo}</td>
                    <td className="px-3 py-3">
                      <p className="font-bold text-slate-900">{item.nome}</p>
                      <p className="mt-1 line-clamp-2 text-xs text-slate-500">{item.descricaoRisco}</p>
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 text-slate-600">{item.tipoRisco}</td>
                    <td className="whitespace-nowrap px-3 py-3">
                      <span className={`rounded-full px-2 py-1 text-xs font-bold ${item.status === "Ativo" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{item.status}</span>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex flex-wrap justify-end gap-2">
                        <button onClick={() => editarCatalogo(item)} className="rounded-md bg-slate-900 px-3 py-1.5 text-xs font-bold text-white">Editar</button>
                        {item.status === "Ativo" && <button onClick={() => inativarCatalogo(item.id)} className="rounded-md border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600">Inativar</button>}
                        {usuarioSuperAdmin && <button onClick={() => excluirCatalogo(item.id)} className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-bold text-white">Excluir</button>}
                      </div>
                    </td>
                  </tr>
                ))}
                {!catalogo.length && (
                  <tr>
                    <td colSpan={5} className="px-3 py-6 text-center text-sm text-slate-500">Nenhum risco identificado cadastrado.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {abrirCatalogo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
          <form onSubmit={salvarCatalogo} className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-xl border border-slate-700 bg-slate-900 p-5 shadow-2xl">
          <div className="mb-5 flex items-start justify-between gap-3 border-b border-slate-800 pb-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-blue-300">{editandoCatalogoId ? "Edição" : "Novo cadastro"}</p>
              <h2 className="mt-1 text-xl font-bold text-white">{editandoCatalogoId ? "Editar risco identificado" : "Cadastrar risco identificado"}</h2>
              <p className="mt-1 text-sm text-slate-400">O código será gerado automaticamente no padrão IR0001.</p>
            </div>
            <button type="button" onClick={() => setAbrirCatalogo(false)} className="rounded-lg border border-slate-700 px-3 py-2 text-sm font-bold text-slate-300 hover:bg-slate-800">Fechar</button>
          </div>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <Label texto="Nome do risco identificado" className="lg:col-span-2"><input className={campoClasse()} value={catalogoForm.nome} onChange={(e) => campoCatalogo("nome", e.target.value)} required /></Label>
              <Label texto="Tipo do risco"><select className={campoClasse()} value={catalogoForm.tipoRisco} onChange={(e) => campoCatalogo("tipoRisco", e.target.value)} required>{tipos.map((tipo) => <option key={tipo}>{tipo}</option>)}</select></Label>
              <Label texto="Status"><select className={campoClasse()} value={catalogoForm.status} onChange={(e) => campoCatalogo("status", e.target.value)}><option>Ativo</option><option>Inativo</option></select></Label>
            <Label texto="Descrição do risco" className="lg:col-span-3"><textarea className={campoClasse()} rows={3} value={catalogoForm.descricaoRisco} onChange={(e) => campoCatalogo("descricaoRisco", e.target.value)} required /></Label>
            <Label texto="Impacto possível" className="lg:col-span-3"><textarea className={campoClasse()} rows={3} value={catalogoForm.possivelImpacto} onChange={(e) => campoCatalogo("possivelImpacto", e.target.value)} required /></Label>
            <Label texto="Medidas preventivas sugeridas" className="lg:col-span-3"><textarea className={campoClasse()} rows={3} value={catalogoForm.medidasPreventivas} onChange={(e) => campoCatalogo("medidasPreventivas", e.target.value)} /></Label>
            <Label texto="Plano de ação sugerido" className="lg:col-span-3"><textarea className={campoClasse()} rows={3} value={catalogoForm.planoAcaoSugerido} onChange={(e) => campoCatalogo("planoAcaoSugerido", e.target.value)} /></Label>
          </div>
          <div className="mt-5 flex justify-end gap-3 border-t border-slate-800 pt-4">
            <button type="button" onClick={() => setAbrirCatalogo(false)} className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-bold text-slate-300 hover:bg-slate-800">Cancelar</button>
            <button className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-500">Salvar risco identificado</button>
          </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 rounded-lg border border-slate-200 bg-white p-4 md:grid-cols-2">
        <Label texto="Filtrar por unidade"><select value={filtroUnidade} onChange={(e) => setFiltroUnidade(e.target.value)} className={campoClasse()}><option value="">Todas as unidades</option>{unidades.map((u) => <option key={u} value={u}>{u}</option>)}</select></Label>
        <Label texto="Filtrar por status"><select value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value)} className={campoClasse()}><option value="">Todos os status</option>{statusPlano.map((s) => <option key={s}>{s}</option>)}</select></Label>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="rounded-lg border border-slate-200 bg-white p-4 xl:col-span-2">
          <h2 className="mb-3 font-bold text-slate-900">Mapa de calor</h2>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {niveis.map((prob) => niveis.map((sev) => {
              const nivel = calcularNivel(prob, sev);
              const total = riscosFiltrados.filter((r) => r.probabilidade === prob && r.severidade === sev).length;
              return <div key={`${prob}-${sev}`} className={`rounded-lg border p-3 text-center ${corNivel(nivel)}`}><p className="text-xs font-semibold">{prob} / {sev}</p><p className="text-xl font-bold">{total}</p></div>;
            }))}
          </div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="mb-3 font-bold text-slate-900">Distribuição</h2>
          <div className="space-y-3">
            {[...porUnidade, ...porTipo].slice(0, 8).map(([nome, total]) => <div key={nome}><div className="flex justify-between text-sm"><span>{nome}</span><strong>{total}</strong></div><div className="h-2 rounded bg-slate-100"><div className="h-2 rounded bg-blue-600" style={{ width: `${Math.min(total * 16, 100)}%` }} /></div></div>)}
          </div>
        </div>
      </div>

      {abrirFormulario && (
        <form ref={formularioRef} onSubmit={salvarRisco} className="scroll-mt-28 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold text-slate-900">{editando ? `Editar ${editando.codigo}` : "Nova análise de risco"}</h2>
              <p className="text-sm text-slate-500">Selecione o risco identificado e registre a avaliação operacional.</p>
            </div>
            <div className={`rounded-lg border px-4 py-2 text-sm font-bold ${corNivel(nivelCalculado)}`}>Nível calculado: {nivelCalculado}</div>
          </div>

          <div className="space-y-5">
            <section>
              <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500">Identificação</h3>
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
                <Label texto="Data e hora da análise"><input type="datetime-local" className={campoClasse()} value={form.dataHora} onChange={(e) => campo("dataHora", e.target.value)} required /></Label>
                <Label texto="Unidade"><select className={campoClasse()} value={form.unidade} onChange={(e) => campo("unidade", e.target.value)} required>{unidades.map((u) => <option key={u}>{u}</option>)}</select></Label>
                <Label texto="Setor"><select className={campoClasse()} value={form.setor} onChange={(e) => campo("setor", e.target.value)} required><option value="">Selecione</option>{setores.map((setor) => <option key={setor}>{setor}</option>)}</select></Label>
                <Label texto="Local">
                  <select className={campoClasse()} value={form.local} onChange={(e) => campo("local", e.target.value)} required>
                    <option value="">{locais.length ? "Selecione" : "Nenhum local carregado"}</option>
                    {locais.map((local) => <option key={local.id} value={local.nome}>{local.nome}{local.areaSensivel ? " - ÁREA SENSÍVEL" : ""}</option>)}
                  </select>
                  {(erroLocais || !locais.length) && (
                    <div className="mt-2 flex items-center justify-between gap-2 rounded-lg border border-amber-300/40 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
                      <span>{erroLocais || "Nenhum local foi retornado pela API."}</span>
                      <button type="button" onClick={carregarLocaisRisco} className="font-bold text-blue-700 dark:text-blue-300">Recarregar</button>
                    </div>
                  )}
                </Label>
              </div>
            </section>

            <section>
              <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500">Risco apontado</h3>
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <Label texto="Risco identificado cadastrado" className="lg:col-span-2">
                  <select className={campoClasse()} value={form.riscoCatalogoId} onChange={(e) => campo("riscoCatalogoId", e.target.value)}>
                    <option value="">Selecionar da base de riscos</option>
                    {riscosCatalogoAtivos.map((item) => <option key={item.id} value={item.id}>{item.codigo} - {item.nome}</option>)}
                  </select>
                </Label>
                <Label texto="Tipo do risco" className="lg:col-span-2"><select className={campoClasse()} value={form.tipoRisco} onChange={(e) => campo("tipoRisco", e.target.value)} required>{tipos.map((t) => <option key={t}>{t}</option>)}</select></Label>
              </div>
            </section>

            <section>
              <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500">Classificação</h3>
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
                <Label texto="Probabilidade"><select className={campoClasse()} value={form.probabilidade} onChange={(e) => campo("probabilidade", e.target.value)} required>{niveis.map((n) => <option key={n}>{n}</option>)}</select></Label>
                <Label texto="Impacto / severidade"><select className={campoClasse()} value={form.severidade} onChange={(e) => campo("severidade", e.target.value)} required>{niveis.map((n) => <option key={n}>{n}</option>)}</select></Label>
                <Label texto="Status do plano"><select className={campoClasse()} value={form.status} onChange={(e) => campo("status", e.target.value)} required>{statusPlano.map((s) => <option key={s}>{s}</option>)}</select></Label>
                <Label texto="Prazo da tratativa"><input type="datetime-local" className={campoClasse()} value={form.prazo} onChange={(e) => campo("prazo", e.target.value)} required /></Label>
              </div>
            </section>

            <section>
              <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500">Vínculo com relatório</h3>
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
                <Label texto="Ocorrência vinculada"><input className={campoClasse()} placeholder="Ex.: 0001/2026" value={form.ocorrenciaId} onBlur={buscarDadosVinculados} onChange={(e) => campo("ocorrenciaId", e.target.value.toUpperCase())} /></Label>
                <Label texto="Evento vinculado"><input className={campoClasse()} placeholder="Ex.: 0005/2026" value={form.eventoId} onBlur={buscarDadosVinculados} onChange={(e) => campo("eventoId", e.target.value.toUpperCase())} /></Label>
                <Label texto="Investigação vinculada"><input className={campoClasse()} placeholder="Ex.: RI003/2026" value={form.investigacaoId} onBlur={buscarDadosVinculados} onChange={(e) => campo("investigacaoId", e.target.value.toUpperCase())} /></Label>
                <div className="flex items-end">
                  <button type="button" onClick={buscarDadosVinculados} disabled={buscandoVinculo || (!form.ocorrenciaId && !form.eventoId && !form.investigacaoId)} className="w-full rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-bold text-white hover:bg-slate-800 disabled:bg-slate-300">{buscandoVinculo ? "Buscando..." : "Buscar vínculo"}</button>
                </div>
              </div>
              {vinculoEncontrado && <div className="mt-3 rounded-lg border border-blue-100 bg-blue-50 p-3 text-sm text-blue-900"><strong>{vinculoEncontrado.origem} {vinculoEncontrado.codigo}</strong> - {vinculoEncontrado.titulo}</div>}
            </section>

            <section>
              <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500">Tratativa</h3>
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <Label texto="Descrição do risco" className="lg:col-span-2"><textarea className={campoClasse()} rows={4} value={form.descricaoRisco} onChange={(e) => campo("descricaoRisco", e.target.value)} required /></Label>
                <Label texto="Possível impacto" className="lg:col-span-2"><textarea className={campoClasse()} rows={3} value={form.possivelImpacto} onChange={(e) => campo("possivelImpacto", e.target.value)} required /></Label>
                <Label texto="Medidas preventivas"><textarea className={campoClasse()} rows={3} value={form.medidasPreventivas} onChange={(e) => campo("medidasPreventivas", e.target.value)} required /></Label>
                <Label texto="Plano de ação"><textarea className={campoClasse()} rows={3} value={form.planoAcao} onChange={(e) => campo("planoAcao", e.target.value)} required /></Label>
                <Label texto="Responsável pela ação"><input className={campoClasse()} value={form.responsavelAcaoNome} onChange={(e) => campo("responsavelAcaoNome", e.target.value)} required /></Label>
                {!editando && <Label texto="Evidências fotográficas"><input type="file" multiple accept="image/*" className={campoClasse()} onChange={(e) => setFotos(Array.from(e.target.files || []))} /></Label>}
              </div>
            </section>
          </div>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <button className="rounded-lg bg-green-600 px-4 py-2 text-sm font-bold text-white hover:bg-green-700">Salvar análise</button>
            <button type="button" onClick={() => setAbrirFormulario(false)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-bold text-slate-600">Cancelar</button>
          </div>
        </form>
      )}

      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Análises de riscos cadastradas</h2>
            <p className="text-sm text-slate-500">Registros gerados a partir dos riscos identificados e planos de ação.</p>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">{riscosFiltrados.length} registros</span>
        </div>
        <div className="overflow-hidden rounded-lg border border-slate-200">
          <div className="max-h-[560px] overflow-y-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="sticky top-0 z-10 bg-slate-50 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-3 py-3">Código</th>
                  <th className="px-3 py-3">Risco</th>
                  <th className="px-3 py-3">Unidade / local</th>
                  <th className="px-3 py-3">Nível</th>
                  <th className="px-3 py-3">Status</th>
                  <th className="px-3 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {riscosFiltrados.map((risco) => (
                  <tr key={risco.id} className="align-top transition-colors hover:bg-slate-800/35 dark:hover:bg-slate-800/45">
                    <td className="whitespace-nowrap px-3 py-3 font-bold text-slate-900">{risco.codigo}</td>
                    <td className="px-3 py-3">
                      <p className="font-bold text-slate-900">{risco.riscoCatalogo?.nome || risco.tipoRisco}</p>
                      <p className="mt-1 line-clamp-2 text-xs text-slate-500">{risco.descricaoRisco}</p>
                    </td>
                    <td className="px-3 py-3 text-slate-600">
                      <p className="font-semibold text-slate-800">{risco.unidade}</p>
                      <p className="text-xs text-slate-500">{risco.local || "Local não informado"}</p>
                    </td>
                    <td className="whitespace-nowrap px-3 py-3"><span className={`rounded-full border px-2 py-1 text-xs font-bold ${corNivel(risco.nivelRisco)}`}>{risco.nivelRisco}</span></td>
                    <td className="whitespace-nowrap px-3 py-3"><span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-bold text-slate-700">{risco.status}</span></td>
                    <td className="px-3 py-3">
                      <div className="flex flex-wrap justify-end gap-2">
                        <button onClick={() => editarRisco(risco)} className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-bold text-white">Editar</button>
                        <button onClick={() => abrirPdf(risco.id)} className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-bold text-white">PDF</button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!riscosFiltrados.length && (
                  <tr>
                    <td colSpan={6} className="px-3 py-6 text-center text-sm text-slate-500">Nenhuma análise de risco cadastrada.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {pdfLightbox && <PdfLightbox url={pdfLightbox.url} titulo={pdfLightbox.titulo} nomeArquivo={pdfLightbox.nomeArquivo} onClose={fecharPdfLightbox} />}
    </div>
  );
}
