import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import {
  AlertTriangle,
  BrainCircuit,
  FileText,
  Pencil,
  Plus,
  Save,
  Settings,
  Trash2,
  X,
} from "lucide-react";
import { PdfLightbox } from "../components/ui/PdfLightbox";
import { api } from "../services/api";

type Setor = {
  id: number;
  nome: string;
  macroProcessoId: number;
};

type MacroProcesso = {
  id: number;
  codigo: string;
  nome: string;
  setores: Setor[];
};

type Cadastro = {
  id: number;
  codigo: string;
  nome: string;
};

type CadastroGeral = {
  macroProcessos: MacroProcesso[];
  riscos: Cadastro[];
  fatores: Cadastro[];
  controles: Cadastro[];
};

type ControleSelecionado = {
  id?: number | null;
  codigo?: string;
  nome: string;
};

type AnaliseCompleta = {
  id: number;
  codigo: string;
  macroProcessoId?: number | null;
  macroProcessoCodigo: string;
  macroProcessoNome: string;
  setorId?: number | null;
  setorNome: string;
  riscoId?: number | null;
  riscoCodigo: string;
  riscoNome: string;
  fatoresRisco: ControleSelecionado[];
  sc: number;
  fe: number;
  intervalo: number;
  sse: number;
  ope: number;
  fin: number;
  adm: number;
  img: number;
  lc: number;
  mediaProbabilidade: number;
  percentualProbabilidade: number;
  nivelProbabilidade: string;
  mediaConsequencia: number;
  nivelConsequencia: string;
  resultadoInerente: number;
  nivelRiscoInerente: string;
  classificacaoRisco: string;
  periodicidadeAcao: string;
  preventivos: ControleSelecionado[];
  detectivos: ControleSelecionado[];
  corretivos: ControleSelecionado[];
  scResidual?: number | null;
  feResidual?: number | null;
  intervaloResidual?: number | null;
  sseResidual?: number | null;
  opeResidual?: number | null;
  finResidual?: number | null;
  admResidual?: number | null;
  imgResidual?: number | null;
  lcResidual?: number | null;
  notaProbabilidadeResidual?: number | null;
  probabilidadeResidual?: number | null;
  percentualProbabilidadeResidual?: number | null;
  nivelProbabilidadeResidual?: string | null;
  notaConsequenciaResidual?: number | null;
  consequenciaResidual?: number | null;
  nivelConsequenciaResidual?: string | null;
  resultadoResidual?: number | null;
  nivelRiscoResidual?: string | null;
  classificacaoResidual?: string | null;
  desempenhoNota?: number | null;
  desempenhoProbabilidade?: number | null;
  desempenhoConsequencia?: number | null;
  desempenhoNivelRisco?: number | null;
  createdAt: string;
};

type Formulario = {
  macroProcessoId: string;
  setorId: string;
  riscoId: string;
  fatoresIds: string[];
  sc: number;
  fe: number;
  intervalo: number;
  sse: number;
  ope: number;
  fin: number;
  adm: number;
  img: number;
  lc: number;
};

type CampoNota = keyof Pick<
  Formulario,
  "sc" | "fe" | "intervalo" | "sse" | "ope" | "fin" | "adm" | "img" | "lc"
>;

type ResidualFormulario = {
  scResidual: number;
  feResidual: number;
  intervaloResidual: number;
  sseResidual: number;
  opeResidual: number;
  finResidual: number;
  admResidual: number;
  imgResidual: number;
  lcResidual: number;
};

type CampoResidual = keyof ResidualFormulario;

const cadastroVazio: CadastroGeral = {
  macroProcessos: [],
  riscos: [],
  fatores: [],
  controles: [],
};

const formularioInicial: Formulario = {
  macroProcessoId: "",
  setorId: "",
  riscoId: "",
  fatoresIds: [],
  sc: 1,
  fe: 1,
  intervalo: 1,
  sse: 1,
  ope: 1,
  fin: 1,
  adm: 1,
  img: 1,
  lc: 1,
};

const residualInicial: ResidualFormulario = {
  scResidual: 1,
  feResidual: 1,
  intervaloResidual: 1,
  sseResidual: 1,
  opeResidual: 1,
  finResidual: 1,
  admResidual: 1,
  imgResidual: 1,
  lcResidual: 1,
};

const camposProbabilidade: Array<{
  campo: CampoNota;
  label: string;
}> = [
  { campo: "sc", label: "SC" },
  { campo: "fe", label: "FE" },
  { campo: "intervalo", label: "INT" },
];

const camposConsequencia: Array<{
  campo: CampoNota;
  label: string;
}> = [
  { campo: "sse", label: "SSE" },
  { campo: "ope", label: "OPE" },
  { campo: "fin", label: "FIN" },
  { campo: "adm", label: "AMB" },
  { campo: "img", label: "IMG" },
  { campo: "lc", label: "L&C" },
];

const camposProbabilidadeResidual: Array<{
  campo: CampoResidual;
  label: string;
}> = [
  { campo: "scResidual", label: "SC" },
  { campo: "feResidual", label: "FE" },
  { campo: "intervaloResidual", label: "INT" },
];

const camposConsequenciaResidual: Array<{
  campo: CampoResidual;
  label: string;
}> = [
  { campo: "sseResidual", label: "SSE" },
  { campo: "opeResidual", label: "OPE" },
  { campo: "finResidual", label: "FIN" },
  { campo: "admResidual", label: "AMB" },
  { campo: "imgResidual", label: "IMG" },
  { campo: "lcResidual", label: "L&C" },
];

const inputClass =
  "h-12 rounded-xl border border-slate-700 bg-slate-950 px-4 text-sm font-bold text-white outline-none transition focus:border-blue-400";

function pontuacao(valor: number) {
  return Math.min(Math.max(Math.trunc(Number(valor) || 1), 1), 5);
}

function arredondar(valor: number) {
  return Math.round(valor * 100) / 100;
}

function nivelProbabilidade(media: number) {
  if (media >= 4.51) return "FREQUENTE";
  if (media >= 3.51) return "PROVÁVEL";
  if (media >= 2.51) return "POSSÍVEL";
  if (media >= 1.51) return "IMPROVÁVEL";
  if (media >= 1) return "REMOTO";
  return "-";
}

function nivelConsequencia(media: number) {
  if (media >= 4.51) return "CRÍTICO";
  if (media >= 3.51) return "SEVERO";
  if (media >= 2.51) return "MAIOR";
  if (media >= 1.51) return "MODERADO";
  if (media >= 1) return "MENOR";
  return "-";
}

function classificar(resultado: number) {
  if (resultado <= 5)
    return {
      nivel: "BAIXO",
      periodicidade: "Revisão a cada 24 meses",
      cor: "bg-emerald-500 text-slate-950",
    };
  if (resultado <= 10)
    return {
      nivel: "MENOR",
      periodicidade: "Revisão a cada 12 meses",
      cor: "bg-lime-300 text-slate-950",
    };
  if (resultado <= 15)
    return {
      nivel: "ALTO",
      periodicidade: "Revisão a cada 180 dias",
      cor: "bg-amber-300 text-slate-950",
    };
  return {
    nivel: "EXTREMO",
    periodicidade: "Revisão a cada 90 dias",
    cor: "bg-red-600 text-white",
  };
}

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

function BadgeNivel({ children }: { children: string }) {
  return (
    <span
      className={`inline-flex items-center justify-center rounded-full px-3 py-1 text-xs font-black ${corNivel(
        children,
      )}`}
    >
      {children || "-"}
    </span>
  );
}

function etiquetaControle(item: ControleSelecionado) {
  return item.codigo ? `${item.codigo} - ${item.nome}` : item.nome;
}

export default function RiscosAnaliseCompleta() {
  const [cadastro, setCadastro] = useState<CadastroGeral>(cadastroVazio);
  const [analises, setAnalises] = useState<AnaliseCompleta[]>([]);
  const [form, setForm] = useState<Formulario>(formularioInicial);
  const [analiseEditando, setAnaliseEditando] =
    useState<AnaliseCompleta | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [mensagem, setMensagem] = useState("");
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [controlesEditando, setControlesEditando] =
    useState<AnaliseCompleta | null>(null);
  const [preventivos, setPreventivos] = useState<string[]>([]);
  const [detectivos, setDetectivos] = useState<string[]>([]);
  const [corretivos, setCorretivos] = useState<string[]>([]);
  const [buscaPreventivo, setBuscaPreventivo] = useState("");
  const [buscaDetectivo, setBuscaDetectivo] = useState("");
  const [buscaCorretivo, setBuscaCorretivo] = useState("");
  const [residual, setResidual] =
    useState<ResidualFormulario>(residualInicial);
  const [filtroFatores, setFiltroFatores] = useState("");
  const [analisesSelecionadas, setAnalisesSelecionadas] = useState<number[]>(
    [],
  );

  useEffect(() => {
    carregar();
  }, []);

  async function carregar() {
    setCarregando(true);
    const [cadastroResponse, analisesResponse] = await Promise.all([
      api.get("/riscos/cadastro-geral"),
      api.get("/riscos/analise-completa"),
    ]);
    setCadastro(cadastroResponse.data);
    setAnalises(analisesResponse.data);
    setAnalisesSelecionadas([]);
    setCarregando(false);
  }

  const setoresDisponiveis = useMemo(() => {
    const macro = cadastro.macroProcessos.find(
      (item) => String(item.id) === form.macroProcessoId,
    );
    return macro?.setores || [];
  }, [cadastro.macroProcessos, form.macroProcessoId]);

  const previa = useMemo(() => {
    const sc = pontuacao(form.sc);
    const fe = pontuacao(form.fe);
    const intervalo = pontuacao(form.intervalo);
    const sse = pontuacao(form.sse);
    const ope = pontuacao(form.ope);
    const fin = pontuacao(form.fin);
    const adm = pontuacao(form.adm);
    const img = pontuacao(form.img);
    const lc = pontuacao(form.lc);
    const notaProbabilidade = sc * 5 + fe * 4 + intervalo * 3;
    const mediaProbabilidade = arredondar(notaProbabilidade / 12);
    const percentualProbabilidade = arredondar(mediaProbabilidade / 5);
    const notaConsequencia =
      sse * 3 + ope * 5 + fin * 3 + adm * 1 + img * 2 + lc * 3;
    const mediaConsequencia = arredondar(notaConsequencia / 17);
    const resultado = arredondar(mediaProbabilidade * mediaConsequencia);
    return {
      mediaProbabilidade,
      percentualProbabilidade,
      nivelProbabilidade: nivelProbabilidade(mediaProbabilidade),
      notaConsequencia,
      mediaConsequencia,
      nivelConsequencia: nivelConsequencia(mediaConsequencia),
      resultado,
      ...classificar(resultado),
    };
  }, [form]);

  const previaResidual = useMemo(() => {
    const sc = pontuacao(residual.scResidual);
    const fe = pontuacao(residual.feResidual);
    const intervalo = pontuacao(residual.intervaloResidual);
    const sse = pontuacao(residual.sseResidual);
    const ope = pontuacao(residual.opeResidual);
    const fin = pontuacao(residual.finResidual);
    const adm = pontuacao(residual.admResidual);
    const img = pontuacao(residual.imgResidual);
    const lc = pontuacao(residual.lcResidual);
    const notaProbabilidade = sc * 5 + fe * 4 + intervalo * 3;
    const probabilidade = arredondar(notaProbabilidade / 12);
    const percentualProbabilidade = arredondar(probabilidade / 5);
    const notaConsequencia =
      sse * 3 + ope * 5 + fin * 3 + adm * 1 + img * 2 + lc * 3;
    const consequencia = arredondar(notaConsequencia / 17);
    const resultado = arredondar(probabilidade * consequencia);
    const classificacao = resultado !== null ? classificar(resultado) : null;
    const desempenho = (atual: number, base?: number | null) =>
      base ? arredondar((atual - Number(base)) / Number(base)) : null;

    return {
      notaProbabilidade,
      probabilidade,
      percentualProbabilidade,
      nivelProbabilidade: nivelProbabilidade(probabilidade),
      notaConsequencia,
      consequencia,
      nivelConsequencia: nivelConsequencia(consequencia),
      resultado,
      classificacao: classificacao?.nivel || "-",
      cor: classificacao?.cor || "bg-slate-700 text-slate-100",
      desempenhoNota: desempenho(
        probabilidade,
        controlesEditando?.mediaProbabilidade,
      ),
      desempenhoProbabilidade: desempenho(
        percentualProbabilidade,
        controlesEditando?.percentualProbabilidade,
      ),
      desempenhoConsequencia: desempenho(
        consequencia,
        controlesEditando?.mediaConsequencia,
      ),
      desempenhoNivelRisco: desempenho(
        resultado,
        controlesEditando?.resultadoInerente,
      ),
    };
  }, [controlesEditando, residual]);

  const fatoresFiltrados = useMemo(() => {
    const termo = filtroFatores.trim().toLowerCase();
    if (!termo) return cadastro.fatores;
    return cadastro.fatores.filter((item) =>
      `${item.codigo} ${item.nome}`.toLowerCase().includes(termo),
    );
  }, [cadastro.fatores, filtroFatores]);

  function alterarNota(campo: CampoNota, valor: string) {
    setForm((atual) => ({ ...atual, [campo]: pontuacao(Number(valor)) }));
  }

  function alterarNotaResidual(campo: CampoResidual, valor: string) {
    setResidual((atual) => ({ ...atual, [campo]: pontuacao(Number(valor)) }));
  }

  function formatarVariacao(valor?: number | null) {
    if (valor === null || valor === undefined) return "-";
    return `${Math.round(valor * 100)}%`;
  }

  function alternarFator(id: string) {
    setForm((atual) => ({
      ...atual,
      fatoresIds: atual.fatoresIds.includes(id)
        ? atual.fatoresIds.filter((item) => item !== id)
        : [...atual.fatoresIds, id],
    }));
  }

  function itensSelecionados(ids: string[]) {
    return ids
      .map((id) => cadastro.controles.find((item) => String(item.id) === id))
      .filter(Boolean)
      .map((item) => ({
        id: item!.id,
        codigo: item!.codigo,
        nome: item!.nome,
      }));
  }

  function localizarControle(valor: string) {
    const termo = valor.trim().toLowerCase();
    if (!termo) return null;
    return (
      cadastro.controles.find((item) => {
        const etiqueta = `${item.codigo} - ${item.nome}`.toLowerCase();
        return (
          etiqueta === termo ||
          item.codigo.toLowerCase() === termo ||
          item.nome.toLowerCase() === termo
        );
      }) ||
      cadastro.controles.find((item) =>
        `${item.codigo} ${item.nome}`.toLowerCase().includes(termo),
      ) ||
      null
    );
  }

  function fatoresSelecionados() {
    return form.fatoresIds
      .map((id) => cadastro.fatores.find((item) => String(item.id) === id))
      .filter(Boolean)
      .map((item) => ({
        id: item!.id,
        codigo: item!.codigo,
        nome: item!.nome,
      }));
  }

  async function salvarAnalise(event: FormEvent) {
    event.preventDefault();
    setErro("");
    setMensagem("");
    setSalvando(true);
    const payload = {
      macroProcessoId: Number(form.macroProcessoId),
      setorId: Number(form.setorId),
      riscoId: Number(form.riscoId),
      fatoresRisco: fatoresSelecionados(),
      sc: form.sc,
      fe: form.fe,
      intervalo: form.intervalo,
      sse: form.sse,
      ope: form.ope,
      fin: form.fin,
      adm: form.adm,
      img: form.img,
      lc: form.lc,
    };
    try {
      if (analiseEditando) {
        await api.put(`/riscos/analise-completa/${analiseEditando.id}`, payload);
      } else {
        await api.post("/riscos/analise-completa", payload);
      }
      setForm(formularioInicial);
      setAnaliseEditando(null);
      setMensagem(
        analiseEditando
          ? "Análise completa atualizada com sucesso."
          : "Análise completa cadastrada com sucesso.",
      );
      await carregar();
    } catch (error: any) {
      setErro(
        error?.response?.data?.error || "Não foi possível salvar a análise.",
      );
    } finally {
      setSalvando(false);
    }
  }

  function iniciarEdicaoAnalise(analise: AnaliseCompleta) {
    setAnaliseEditando(analise);
    setForm({
      macroProcessoId: String(analise.macroProcessoId || ""),
      setorId: String(analise.setorId || ""),
      riscoId: String(analise.riscoId || ""),
      fatoresIds: analise.fatoresRisco
        .map((item) => String(item.id || ""))
        .filter(Boolean),
      sc: pontuacao(analise.sc),
      fe: pontuacao(analise.fe),
      intervalo: pontuacao(analise.intervalo),
      sse: pontuacao(analise.sse),
      ope: pontuacao(analise.ope),
      fin: pontuacao(analise.fin),
      adm: pontuacao(analise.adm),
      img: pontuacao(analise.img),
      lc: pontuacao(analise.lc),
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function cancelarEdicaoAnalise() {
    setAnaliseEditando(null);
    setForm(formularioInicial);
  }

  async function abrirPdfAnalise(analise: AnaliseCompleta) {
    setErro("");
    try {
      const response = await api.get(`/riscos/analise-completa/${analise.id}/pdf`, {
        responseType: "blob",
      });
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
      setPdfUrl(URL.createObjectURL(new Blob([response.data], { type: "application/pdf" })));
    } catch (error: any) {
      setErro(error?.response?.data?.error || "Não foi possível gerar o PDF.");
    }
  }

  function fecharPdfAnalise() {
    if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    setPdfUrl(null);
  }

  function abrirControles(analise: AnaliseCompleta) {
    setControlesEditando(analise);
    setPreventivos(analise.preventivos.map((item) => String(item.id || "")));
    setDetectivos(analise.detectivos.map((item) => String(item.id || "")));
    setCorretivos(analise.corretivos.map((item) => String(item.id || "")));
    setBuscaPreventivo("");
    setBuscaDetectivo("");
    setBuscaCorretivo("");
    setResidual({
      scResidual: pontuacao(analise.scResidual || residualInicial.scResidual),
      feResidual: pontuacao(analise.feResidual || residualInicial.feResidual),
      intervaloResidual: pontuacao(
        analise.intervaloResidual || residualInicial.intervaloResidual,
      ),
      sseResidual: pontuacao(
        analise.sseResidual || residualInicial.sseResidual,
      ),
      opeResidual: pontuacao(
        analise.opeResidual || residualInicial.opeResidual,
      ),
      finResidual: pontuacao(
        analise.finResidual || residualInicial.finResidual,
      ),
      admResidual: pontuacao(
        analise.admResidual || residualInicial.admResidual,
      ),
      imgResidual: pontuacao(
        analise.imgResidual || residualInicial.imgResidual,
      ),
      lcResidual: pontuacao(analise.lcResidual || residualInicial.lcResidual),
    });
  }

  function adicionarControle(
    busca: string,
    setBusca: (valor: string) => void,
    selecionados: string[],
    setSelecionados: (ids: string[]) => void,
  ) {
    const controle = localizarControle(busca);
    if (!controle) return;
    const id = String(controle.id);
    if (!selecionados.includes(id)) {
      setSelecionados([...selecionados, id]);
    }
    setBusca("");
  }

  function removerControleSelecionado(
    id: string,
    selecionados: string[],
    setSelecionados: (ids: string[]) => void,
  ) {
    setSelecionados(selecionados.filter((item) => item !== id));
  }

  async function salvarControles() {
    if (!controlesEditando) return;
    setSalvando(true);
    try {
      await api.patch(
        `/riscos/analise-completa/${controlesEditando.id}/controles`,
        {
          preventivos: itensSelecionados(preventivos),
          detectivos: itensSelecionados(detectivos),
          corretivos: itensSelecionados(corretivos),
        },
      );
      setMensagem("Controles atualizados com sucesso.");
      await carregar();
    } catch (error: any) {
      setErro(
        error?.response?.data?.error || "Não foi possível salvar os controles.",
      );
    } finally {
      setSalvando(false);
    }
  }

  async function salvarAvaliacaoResidual() {
    if (!controlesEditando) return;
    setSalvando(true);
    try {
      await api.patch(
        `/riscos/analise-completa/${controlesEditando.id}/controles`,
        residual,
      );
      setControlesEditando(null);
      setMensagem("Avaliação residual salva com sucesso.");
      await carregar();
    } catch (error: any) {
      setErro(
        error?.response?.data?.error ||
          "Não foi possível salvar a avaliação residual.",
      );
    } finally {
      setSalvando(false);
    }
  }

  function alternarAnaliseSelecionada(id: number) {
    setAnalisesSelecionadas((atuais) =>
      atuais.includes(id)
        ? atuais.filter((item) => item !== id)
        : [...atuais, id],
    );
  }

  function alternarTodasAnalises() {
    setAnalisesSelecionadas((atuais) =>
      atuais.length === analises.length ? [] : analises.map((item) => item.id),
    );
  }

  async function excluirAnalisesSelecionadas() {
    if (!analisesSelecionadas.length) return;
    const confirmar = window.confirm(
      `Excluir definitivamente ${analisesSelecionadas.length} análise(s) selecionada(s)? Esta ação não poderá ser desfeita.`,
    );
    if (!confirmar) return;

    setErro("");
    setMensagem("");
    setSalvando(true);
    try {
      await Promise.all(
        analisesSelecionadas.map((id) =>
          api.delete(`/riscos/analise-completa/${id}`),
        ),
      );
      setMensagem("Análises selecionadas excluídas com sucesso.");
      await carregar();
    } catch (error: any) {
      setErro(
        error?.response?.data?.error ||
          "Não foi possível excluir as análises selecionadas.",
      );
    } finally {
      setSalvando(false);
    }
  }

  function renderCampoNota(campo: CampoNota, label: string) {
    return (
      <label className="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
        <span className="block text-center text-sm font-black text-white">
          {label}
        </span>
        <select
          className={`${inputClass} mt-3 w-full text-center`}
          value={form[campo]}
          onChange={(event) => alterarNota(campo, event.target.value)}
        >
          {[1, 2, 3, 4, 5].map((valor) => (
            <option key={valor} value={valor}>
              {valor}
            </option>
          ))}
        </select>
      </label>
    );
  }

  function renderCampoNotaResidual(campo: CampoResidual, label: string) {
    return (
      <label className="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
        <span className="block text-center text-sm font-black text-white">
          {label}
        </span>
        <select
          className={`${inputClass} mt-3 w-full text-center`}
          value={residual[campo]}
          onChange={(event) => alterarNotaResidual(campo, event.target.value)}
        >
          {[1, 2, 3, 4, 5].map((valor) => (
            <option key={valor} value={valor}>
              {valor}
            </option>
          ))}
        </select>
      </label>
    );
  }

  function renderListaControles(
    titulo: string,
    selecionados: string[],
    setSelecionados: (ids: string[]) => void,
    busca: string,
    setBusca: (valor: string) => void,
  ) {
    const controlesSelecionados = itensSelecionados(selecionados);
    const datalistId = `controles-${titulo.toLowerCase()}`;

    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-black text-white">{titulo}</h3>
          <span className="rounded-full border border-blue-400/30 bg-blue-500/10 px-2 py-1 text-[11px] font-black text-blue-100">
            {controlesSelecionados.length}
          </span>
        </div>
        <div className="mt-3 flex gap-2">
          <input
            className={`${inputClass} min-w-0 flex-1`}
            list={datalistId}
            value={busca}
            onChange={(event) => setBusca(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                adicionarControle(busca, setBusca, selecionados, setSelecionados);
              }
            }}
            placeholder="Digite CP001 ou o nome"
          />
          <datalist id={datalistId}>
            {cadastro.controles.map((controle) => (
              <option
                key={controle.id}
                value={`${controle.codigo} - ${controle.nome}`}
              />
            ))}
          </datalist>
          <button
            type="button"
            onClick={() =>
              adicionarControle(busca, setBusca, selecionados, setSelecionados)
            }
            className="rounded-xl bg-blue-600 px-4 text-sm font-black text-white transition hover:bg-blue-500"
          >
            Adicionar
          </button>
        </div>
        <div className="mt-3 grid max-h-36 gap-2 overflow-auto pr-1">
          {controlesSelecionados.map((controle) => (
            <div
              key={controle.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-slate-700 bg-slate-900 p-3 text-sm font-bold text-slate-100"
            >
              <span>{etiquetaControle(controle)}</span>
              <button
                type="button"
                onClick={() =>
                  removerControleSelecionado(
                    String(controle.id),
                    selecionados,
                    setSelecionados,
                  )
                }
                className="rounded-lg border border-slate-700 p-1 text-slate-300 transition hover:border-red-400 hover:text-red-200"
              >
                <X size={14} />
              </button>
            </div>
          ))}
          {!cadastro.controles.length && (
            <p className="rounded-xl bg-slate-900 p-3 text-sm font-bold text-slate-300">
              Nenhum CP cadastrado em Cadastro Geral.
            </p>
          )}
          {cadastro.controles.length > 0 && !controlesSelecionados.length && (
            <p className="rounded-xl bg-slate-900 p-3 text-sm font-bold text-slate-300">
              Nenhum controle selecionado.
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-5rem)] bg-slate-950 px-4 py-6 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1800px]">
        <header className="border-b border-slate-800 pb-6">
          <p className="text-xs font-black uppercase tracking-[0.35em] text-blue-300">
            Análise de Riscos
          </p>
          <h1 className="mt-2 text-3xl font-black text-white">
            Análise Completa
          </h1>
          <p className="mt-2 max-w-4xl text-sm font-semibold leading-6 text-slate-300">
            Cadastre a análise preenchendo macro processo, setor, risco, fatores
            de risco e notas de probabilidade/consequência. Os demais campos são
            calculados automaticamente.
          </p>
        </header>

        {carregando && (
          <div className="mt-6 rounded-xl border border-slate-800 bg-slate-900 p-5 text-sm font-black text-slate-300">
            Carregando dados da análise...
          </div>
        )}

        {mensagem && (
          <div className="mt-6 rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm font-black text-emerald-100">
            {mensagem}
          </div>
        )}
        {erro && (
          <div className="mt-6 rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm font-black text-red-100">
            {erro}
          </div>
        )}

        <form
          onSubmit={salvarAnalise}
          className="mt-6 rounded-2xl border border-slate-800 bg-slate-900/80 p-4 shadow-2xl shadow-black/20 sm:p-5"
        >
          <div className="flex items-center gap-3">
            <BrainCircuit className="text-blue-300" size={22} />
            <h2 className="text-xl font-black text-white">
              {analiseEditando
                ? `Editando ${analiseEditando.codigo}`
                : "Nova análise completa"}
            </h2>
          </div>

          <div className="mt-5 grid gap-4 xl:grid-cols-3">
            <label className="text-sm font-black text-slate-200">
              Macro Processo
              <select
                className={`${inputClass} mt-2 w-full`}
                value={form.macroProcessoId}
                onChange={(event) =>
                  setForm((atual) => ({
                    ...atual,
                    macroProcessoId: event.target.value,
                    setorId: "",
                  }))
                }
                required
              >
                <option value="">Selecione</option>
                {cadastro.macroProcessos.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.codigo} - {item.nome}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-sm font-black text-slate-200">
              Setor
              <select
                className={`${inputClass} mt-2 w-full`}
                value={form.setorId}
                onChange={(event) =>
                  setForm((atual) => ({
                    ...atual,
                    setorId: event.target.value,
                  }))
                }
                required
                disabled={!form.macroProcessoId}
              >
                <option value="">Selecione</option>
                {setoresDisponiveis.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.nome}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-sm font-black text-slate-200">
              Risco
              <select
                className={`${inputClass} mt-2 w-full`}
                value={form.riscoId}
                onChange={(event) =>
                  setForm((atual) => ({
                    ...atual,
                    riscoId: event.target.value,
                  }))
                }
                required
              >
                <option value="">Selecione</option>
                {cadastro.riscos.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.codigo} - {item.nome}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="mt-5 rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
            <p className="text-sm font-black text-white">Fatores de Risco</p>
            <p className="mt-1 text-xs font-semibold text-slate-300">
              Selecione quantos fatores forem necessários. O sistema não limita
              a três fatores como a planilha.
            </p>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <input
                className={`${inputClass} w-full sm:max-w-md`}
                value={filtroFatores}
                onChange={(event) => setFiltroFatores(event.target.value)}
                placeholder="Buscar por código, número ou palavra"
              />
              <span className="rounded-full border border-blue-400/30 bg-blue-500/10 px-3 py-2 text-xs font-black text-blue-100">
                {fatoresFiltrados.length} de {cadastro.fatores.length} fatores
              </span>
            </div>
            <div className="mt-3 grid max-h-[456px] gap-2 overflow-y-auto pr-2 md:grid-cols-2 xl:grid-cols-3">
              {fatoresFiltrados.map((item) => (
                <label
                  key={item.id}
                  className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 text-sm font-bold transition ${
                    form.fatoresIds.includes(String(item.id))
                      ? "border-blue-400 bg-blue-600 text-white"
                      : "border-slate-700 bg-slate-900 text-slate-200 hover:border-blue-500"
                  }`}
                >
                  <input
                    type="checkbox"
                    className="h-4 w-4"
                    checked={form.fatoresIds.includes(String(item.id))}
                    onChange={() => alternarFator(String(item.id))}
                  />
                  {item.codigo} - {item.nome}
                </label>
              ))}
              {!fatoresFiltrados.length && (
                <p className="rounded-xl border border-slate-800 bg-slate-900 p-3 text-sm font-bold text-slate-300 md:col-span-2 xl:col-span-3">
                  Nenhum fator encontrado para o filtro informado.
                </p>
              )}
            </div>
          </div>

          <section className="mt-5 rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
            <h3 className="text-sm font-black uppercase tracking-[0.28em] text-blue-200">
              Análise e Avaliação Inerente
            </h3>
            <div className="mt-4 grid gap-4 2xl:grid-cols-[0.72fr_1.28fr]">
              <section>
              <h3 className="text-sm font-black uppercase tracking-[0.18em] text-blue-200">
                Probabilidade
              </h3>
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                {camposProbabilidade.map((item) =>
                  renderCampoNota(item.campo, item.label),
                )}
              </div>
            </section>

            <section>
              <h3 className="text-sm font-black uppercase tracking-[0.18em] text-blue-200">
                Consequência
              </h3>
              <div className="mt-3 grid gap-3 sm:grid-cols-3 2xl:grid-cols-6">
                {camposConsequencia.map((item) =>
                  renderCampoNota(item.campo, item.label),
                )}
              </div>
            </section>
            </div>
          </section>

          <div className="mt-5 grid gap-3 rounded-2xl border border-blue-400/30 bg-blue-500/10 p-4 sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-8">
            <div>
              <p className="text-xs font-black uppercase text-blue-200">Nota</p>
              <p className="mt-1 text-xl font-black text-white">
                {form.sc * 5 + form.fe * 4 + form.intervalo * 3}
              </p>
            </div>
            <div>
              <p className="text-xs font-black uppercase text-blue-200">MPP</p>
              <p className="mt-1 text-xl font-black text-white">
                {previa.mediaProbabilidade}
              </p>
              <p className="text-xs font-bold text-blue-100">
                {previa.nivelProbabilidade}
              </p>
            </div>
            <div>
              <p className="text-xs font-black uppercase text-blue-200">%P</p>
              <p className="mt-1 text-xl font-black text-white">
                {Math.round(previa.percentualProbabilidade * 100)}%
              </p>
            </div>
            <div>
              <p className="text-xs font-black uppercase text-blue-200">
                Nota Conseq.
              </p>
              <p className="mt-1 text-xl font-black text-white">
                {previa.notaConsequencia}
              </p>
            </div>
            <div>
              <p className="text-xs font-black uppercase text-blue-200">MPI</p>
              <p className="mt-1 text-xl font-black text-white">
                {previa.mediaConsequencia}
              </p>
              <p className="text-xs font-bold text-blue-100">
                {previa.nivelConsequencia}
              </p>
            </div>
            <div>
              <p className="text-xs font-black uppercase text-blue-200">NRI</p>
              <p className="mt-1 text-xl font-black text-white">
                {previa.resultado}
              </p>
            </div>
            <div>
              <p className="text-xs font-black uppercase text-blue-200">
                Classificação
              </p>
              <span
                className={`mt-2 inline-flex rounded-full px-3 py-1 text-xs font-black ${previa.cor}`}
              >
                {previa.nivel}
              </span>
            </div>
            <div>
              <p className="text-xs font-black uppercase text-blue-200">
                Periodicidade
              </p>
              <p className="mt-1 text-sm font-black text-white">
                {previa.periodicidade}
              </p>
            </div>
          </div>

          <div className="mt-5 flex justify-end">
            <button
              disabled={salvando}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-blue-950/30 hover:bg-blue-500 disabled:opacity-60"
            >
              <Plus size={16} />
              {analiseEditando ? "Atualizar análise" : "Cadastrar análise"}
            </button>
            {analiseEditando && (
              <button
                type="button"
                onClick={cancelarEdicaoAnalise}
                className="ml-3 rounded-xl border border-slate-700 px-5 py-3 text-sm font-black text-slate-200 hover:text-white"
              >
                Cancelar edição
              </button>
            )}
          </div>
        </form>

        <section className="mt-6 rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-2xl shadow-black/20">
          <div className="flex flex-col gap-2 border-b border-slate-800 pb-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-xl font-black text-white">
                Análises cadastradas
              </h2>
              <p className="text-sm font-semibold text-slate-300">
                Após o cadastro, edite os controles preventivos, detectivos e
                corretivos.
              </p>
            </div>
            <span className="rounded-full border border-blue-400/30 bg-blue-500/10 px-3 py-1 text-xs font-black text-blue-200">
              {analises.length} registros
            </span>
          </div>

          <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-950/50 p-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-bold text-slate-300">
              Use os botões de ação para editar a análise, ajustar controles ou
              emitir o PDF.
            </p>
            {analisesSelecionadas.length > 0 && (
              <button
                type="button"
                disabled={salvando}
                onClick={excluirAnalisesSelecionadas}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-2 text-sm font-black text-red-100 transition hover:bg-red-500/20 disabled:opacity-60"
              >
                <Trash2 size={16} />
                Excluir selecionadas ({analisesSelecionadas.length})
              </button>
            )}
          </div>

          <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-800">
            <table className="w-full min-w-[1480px] border-separate border-spacing-y-2">
              <thead>
                <tr className="text-left text-xs font-black uppercase tracking-[0.18em] text-blue-200">
                  <th className="px-3 py-2 text-center">
                    <input
                      type="checkbox"
                      className="h-4 w-4"
                      checked={
                        analises.length > 0 &&
                        analisesSelecionadas.length === analises.length
                      }
                      onChange={alternarTodasAnalises}
                      aria-label="Selecionar todas as análises"
                    />
                  </th>
                  <th className="px-3 py-2">Código</th>
                  <th className="px-3 py-2">Identificação</th>
                  <th className="px-3 py-2">Fatores</th>
                  <th className="px-3 py-2 text-center">Prob.</th>
                  <th className="px-3 py-2 text-center">%P</th>
                  <th className="px-3 py-2 text-center">Cons.</th>
                  <th className="px-3 py-2 text-center">NRI</th>
                  <th className="px-3 py-2">Classificação</th>
                  <th className="px-3 py-2">Residual</th>
                  <th className="px-3 py-2">Controles</th>
                  <th className="px-3 py-2 text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {analises.map((analise) => (
                  <tr
                    key={analise.id}
                    className="bg-slate-950/70 text-sm font-semibold text-slate-100 transition hover:bg-slate-900"
                  >
                    <td
                      className="rounded-l-xl px-3 py-4 text-center"
                      onClick={(event) => event.stopPropagation()}
                    >
                      <input
                        type="checkbox"
                        className="h-4 w-4"
                        checked={analisesSelecionadas.includes(analise.id)}
                        onChange={() => alternarAnaliseSelecionada(analise.id)}
                        aria-label={`Selecionar ${analise.codigo}`}
                      />
                    </td>
                    <td className="px-3 py-4 font-black text-blue-100">
                      {analise.codigo}
                    </td>
                    <td className="px-3 py-4">
                      <p className="font-black text-white">
                        {analise.riscoCodigo} - {analise.riscoNome}
                      </p>
                      <p className="mt-1 text-xs text-slate-300">
                        {analise.macroProcessoCodigo} -{" "}
                        {analise.macroProcessoNome} / {analise.setorNome}
                      </p>
                    </td>
                    <td className="px-3 py-4 text-xs text-slate-300">
                      {analise.fatoresRisco.map(etiquetaControle).join(", ")}
                    </td>
                    <td className="px-3 py-4 text-center">
                      {analise.mediaProbabilidade}
                      <p className="mt-1">
                        <BadgeNivel>{analise.nivelProbabilidade}</BadgeNivel>
                      </p>
                    </td>
                    <td className="px-3 py-4 text-center font-black">
                      {Math.round((analise.percentualProbabilidade || 0) * 100)}
                      %
                    </td>
                    <td className="px-3 py-4 text-center">
                      {analise.mediaConsequencia}
                      <p className="mt-1">
                        <BadgeNivel>{analise.nivelConsequencia}</BadgeNivel>
                      </p>
                    </td>
                    <td className="px-3 py-4 text-center font-black">
                      {analise.resultadoInerente}
                    </td>
                    <td className="px-3 py-4">
                      <BadgeNivel>{analise.classificacaoRisco}</BadgeNivel>
                      <p className="mt-1 text-xs text-slate-400">
                        {analise.periodicidadeAcao}
                      </p>
                    </td>
                    <td className="px-3 py-4 text-xs text-slate-300">
                      <p>
                        Prob.:{" "}
                        <span className="font-black text-white">
                          {analise.probabilidadeResidual ?? "-"}
                        </span>{" "}
                        <BadgeNivel>
                          {analise.nivelProbabilidadeResidual || "-"}
                        </BadgeNivel>
                      </p>
                      <p className="mt-1">
                        Cons.:{" "}
                        <span className="font-black text-white">
                          {analise.consequenciaResidual ?? "-"}
                        </span>{" "}
                        <BadgeNivel>
                          {analise.nivelConsequenciaResidual || "-"}
                        </BadgeNivel>
                      </p>
                      <p className="mt-1">
                        Class.:{" "}
                        <BadgeNivel>
                          {analise.classificacaoResidual || "-"}
                        </BadgeNivel>
                      </p>
                    </td>
                    <td className="px-3 py-4 text-xs text-slate-300">
                      <p>Prev.: {analise.preventivos.length}</p>
                      <p>Det.: {analise.detectivos.length}</p>
                      <p>Corr.: {analise.corretivos.length}</p>
                    </td>
                    <td className="rounded-r-xl px-3 py-4">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => iniciarEdicaoAnalise(analise)}
                          className="inline-flex items-center gap-2 rounded-xl border border-blue-400/30 bg-blue-500/10 px-3 py-2 text-xs font-black text-blue-100 hover:bg-blue-500/20"
                        >
                          <Pencil size={14} />
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => abrirControles(analise)}
                          className="inline-flex items-center gap-2 rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 text-xs font-black text-emerald-100 hover:bg-emerald-500/20"
                        >
                          <Settings size={14} />
                          Controles
                        </button>
                        <button
                          type="button"
                          onClick={() => abrirPdfAnalise(analise)}
                          className="inline-flex items-center gap-2 rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2 text-xs font-black text-red-100 hover:bg-red-500/20"
                        >
                          <FileText size={14} />
                          PDF
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!analises.length && (
                  <tr>
                    <td
                      colSpan={12}
                      className="rounded-xl bg-slate-950/70 p-8 text-center text-sm font-bold text-slate-300"
                    >
                      Nenhuma análise completa cadastrada.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {controlesEditando && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur">
          <div className="max-h-[92vh] w-full max-w-7xl overflow-auto rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.3em] text-blue-300">
                  Controles da análise
                </p>
                <h2 className="mt-2 text-2xl font-black text-white">
                  {controlesEditando.codigo}
                </h2>
                <p className="mt-1 text-sm font-semibold text-slate-300">
                  {controlesEditando.riscoCodigo} -{" "}
                  {controlesEditando.riscoNome}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setControlesEditando(null)}
                className="rounded-xl border border-slate-700 p-2 text-slate-300 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-5 flex gap-3 rounded-xl border border-amber-400/30 bg-amber-500/10 p-4 text-amber-50">
              <AlertTriangle className="mt-0.5 shrink-0 text-amber-300" />
              <p className="text-sm font-semibold leading-6">
                Os controles preventivos, detectivos e corretivos ficam
                registrados separadamente. A avaliação residual é preenchida em
                outro bloco e calculada automaticamente conforme a planilha.
              </p>
            </div>

            <div className="mt-5 grid gap-5">
              <section className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                <h3 className="text-sm font-black uppercase tracking-[0.18em] text-blue-200">
                  Controles preventivos, detectivos e corretivos
                </h3>
                <p className="mt-1 text-xs font-semibold text-slate-300">
                  Busque o CP pelo código ou pelo nome e adicione quantos itens
                  forem necessários em cada categoria.
                </p>
                <div className="mt-4 grid gap-4 lg:grid-cols-3">
                  {renderListaControles(
                    "Preventivo",
                    preventivos,
                    setPreventivos,
                    buscaPreventivo,
                    setBuscaPreventivo,
                  )}
                  {renderListaControles(
                    "Detectivo",
                    detectivos,
                    setDetectivos,
                    buscaDetectivo,
                    setBuscaDetectivo,
                  )}
                  {renderListaControles(
                    "Corretivo",
                    corretivos,
                    setCorretivos,
                    buscaCorretivo,
                    setBuscaCorretivo,
                  )}
                </div>
                <div className="mt-4 flex justify-end">
                  <button
                    type="button"
                    disabled={salvando}
                    onClick={salvarControles}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-blue-400/40 bg-blue-500/10 px-5 py-3 text-sm font-black text-blue-100 hover:border-blue-300 hover:bg-blue-500/20 disabled:opacity-60"
                  >
                    <Save size={16} />
                    Salvar controles
                  </button>
                </div>
              </section>

              <section className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                <div className="flex flex-col gap-2 border-b border-slate-800 pb-4 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <h3 className="text-sm font-black uppercase tracking-[0.18em] text-blue-200">
                      Avaliação Residual
                    </h3>
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-300">
                      Probabilidade, consequência e desempenho residual
                    </p>
                  </div>
                  <BadgeNivel>{previaResidual.classificacao}</BadgeNivel>
                </div>

                <div className="mt-4 grid gap-4 xl:grid-cols-[0.72fr_1.28fr]">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-300">
                      Probabilidade
                    </p>
                    <div className="mt-2 grid gap-3 sm:grid-cols-3">
                      {camposProbabilidadeResidual.map((item) =>
                        renderCampoNotaResidual(item.campo, item.label),
                      )}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-300">
                      Consequência
                    </p>
                    <div className="mt-2 grid gap-3 sm:grid-cols-3 xl:grid-cols-6">
                      {camposConsequenciaResidual.map((item) =>
                        renderCampoNotaResidual(item.campo, item.label),
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="rounded-xl border border-blue-400/30 bg-blue-500/10 p-4">
                    <p className="text-xs font-black uppercase text-blue-200">
                      Nota / MPP / %P
                    </p>
                    <p className="mt-2 text-lg font-black text-white">
                      {previaResidual.notaProbabilidade} /{" "}
                      {previaResidual.probabilidade} /{" "}
                      {Math.round(previaResidual.percentualProbabilidade * 100)}
                      %
                    </p>
                  </div>
                  <div className="rounded-xl border border-blue-400/30 bg-blue-500/10 p-4">
                    <p className="text-xs font-black uppercase text-blue-200">
                      Nota Conseq. / MPI
                    </p>
                    <p className="mt-2 text-lg font-black text-white">
                      {previaResidual.notaConsequencia} /{" "}
                      {previaResidual.consequencia}
                    </p>
                  </div>
                  <div className="rounded-xl border border-blue-400/30 bg-blue-500/10 p-4">
                    <p className="text-xs font-black uppercase text-blue-200">
                      Desemp. Prob.
                    </p>
                    <p className="mt-2 text-lg font-black text-white">
                      {formatarVariacao(previaResidual.desempenhoProbabilidade)}
                    </p>
                  </div>
                  <div className="rounded-xl border border-blue-400/30 bg-blue-500/10 p-4">
                    <p className="text-xs font-black uppercase text-blue-200">
                      Desemp. Risco
                    </p>
                    <p className="mt-2 text-lg font-black text-white">
                      {formatarVariacao(previaResidual.desempenhoNivelRisco)}
                    </p>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
                    <p className="text-xs font-black uppercase text-slate-400">
                      Nível de Probabilidade
                    </p>
                    <div className="mt-2">
                      <BadgeNivel>
                        {previaResidual.nivelProbabilidade}
                      </BadgeNivel>
                    </div>
                  </div>
                  <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
                    <p className="text-xs font-black uppercase text-slate-400">
                      Nível de Consequência
                    </p>
                    <div className="mt-2">
                      <BadgeNivel>
                        {previaResidual.nivelConsequencia}
                      </BadgeNivel>
                    </div>
                  </div>
                  <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
                    <p className="text-xs font-black uppercase text-slate-400">
                      Nível de Risco
                    </p>
                    <p className="mt-2 text-2xl font-black text-white">
                      {previaResidual.resultado ?? "-"}
                    </p>
                  </div>
                  <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
                    <p className="text-xs font-black uppercase text-slate-400">
                      Classificação do Risco
                    </p>
                    <div className="mt-2">
                      <BadgeNivel>{previaResidual.classificacao}</BadgeNivel>
                    </div>
                  </div>
                </div>
              </section>
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setControlesEditando(null)}
                className="rounded-xl border border-slate-700 px-5 py-3 text-sm font-black text-slate-200 hover:text-white"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={salvando}
                onClick={salvarAvaliacaoResidual}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-blue-950/30 hover:bg-blue-500 disabled:opacity-60"
              >
                <Save size={16} />
                Salvar avaliação residual
              </button>
            </div>
          </div>
        </div>
      )}

      {pdfUrl && (
        <PdfLightbox
          url={pdfUrl}
          titulo="PDF da análise completa"
          nomeArquivo="analise-completa-risco.pdf"
          onClose={fecharPdfAnalise}
        />
      )}
    </div>
  );
}
