import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { Link } from "react-router-dom";
import {
  BarChart3,
  BrainCircuit,
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  FileText,
  LayoutDashboard,
  ListPlus,
  Pencil,
  Plus,
  Save,
  Search,
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
  descricao?: string | null;
  tipoControle?: "CP" | "CD" | "CC";
  fatoresRisco?: ControleSelecionado[];
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
  percentualTratativa?: number;
  planosTratativa?: number;
  planosConcluidos?: number;
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
  estrategiaTratamento?: string | null;
  preventivos: ControleSelecionado[];
  detectivos: ControleSelecionado[];
  corretivos: ControleSelecionado[];
  totalFatoresTratativa?: number;
  fatoresConcluidosTratativa?: number;
  percentualConclusaoTratativa?: number;
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
  tratativaStatus?: string | null;
  tratativaResponsavelId?: number | null;
  tratativaResponsavelNome?: string | null;
  tratativaPrazo?: string | null;
  tratativaAcao?: string | null;
  tratativaEvidencia?: string | null;
  tratativaValidacao?: string | null;
  tratativaConcluidaEm?: string | null;
  finalizacaoStatus?: string | null;
  finalizacaoDecisao?: string | null;
  finalizacaoJustificativa?: string | null;
  finalizacaoAprovadorNome?: string | null;
  finalizacaoObservacoes?: string | null;
  finalizadaEm?: string | null;
  createdAt: string;
};

type Formulario = {
  macroProcessoId: string;
  setorId: string;
  riscoId: string;
  fatoresIds: string[];
  estrategiaTratamento: string;
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

type FinalizacaoFormulario = {
  finalizacaoStatus: string;
  finalizacaoDecisao: string;
  finalizacaoJustificativa: string;
  finalizacaoObservacoes: string;
};

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
  estrategiaTratamento: "",
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

const finalizacaoInicial: FinalizacaoFormulario = {
  finalizacaoStatus: "Finalizada",
  finalizacaoDecisao: "",
  finalizacaoJustificativa: "",
  finalizacaoObservacoes: "",
};

const camposProbabilidade: Array<{
  campo: CampoNota;
  label: string;
}> = [
  { campo: "sc", label: "Severidade da consequência" },
  { campo: "fe", label: "Frequência / Exposição" },
  { campo: "intervalo", label: "Intensidade" },
];

const camposConsequencia: Array<{
  campo: CampoNota;
  label: string;
}> = [
  { campo: "sse", label: "Segurança / Saúde / Meio ambiente" },
  { campo: "ope", label: "Operação" },
  { campo: "fin", label: "Financeiro" },
  { campo: "adm", label: "Ambiental" },
  { campo: "img", label: "Imagem da empresa" },
  { campo: "lc", label: "Legal e Compliance" },
];

const camposProbabilidadeResidual: Array<{
  campo: CampoResidual;
  label: string;
}> = [
  { campo: "scResidual", label: "Severidade da consequência" },
  { campo: "feResidual", label: "Frequência / Exposição" },
  { campo: "intervaloResidual", label: "Intensidade" },
];

const camposConsequenciaResidual: Array<{
  campo: CampoResidual;
  label: string;
}> = [
  { campo: "sseResidual", label: "Segurança / Saúde / Meio ambiente" },
  { campo: "opeResidual", label: "Operação" },
  { campo: "finResidual", label: "Financeiro" },
  { campo: "admResidual", label: "Ambiental" },
  { campo: "imgResidual", label: "Imagem da empresa" },
  { campo: "lcResidual", label: "Legal e Compliance" },
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
      className={`inline-flex whitespace-nowrap items-center justify-center rounded-full px-3 py-1 text-xs font-black ${corNivel(
        children,
      )}`}
    >
      {children || "-"}
    </span>
  );
}

function MiniMetrica({
  rotulo,
  valor,
  destaque,
}: {
  rotulo: string;
  valor: string | number;
  destaque?: string | null;
}) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/80 px-2.5 py-1.5">
      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
        {rotulo}
      </p>
      <div className="mt-1 flex min-h-6 items-center gap-2">
        <span className="text-base font-black text-white">{valor}</span>
        {destaque && <BadgeNivel>{destaque}</BadgeNivel>}
      </div>
    </div>
  );
}

function RoscaConclusao({
  percentual,
  concluidos,
  total,
}: {
  percentual?: number;
  concluidos?: number;
  total?: number;
}) {
  const valor = Math.max(0, Math.min(100, Math.round(percentual || 0)));
  const cor = valor >= 100 ? "#34d399" : valor >= 50 ? "#60a5fa" : "#fbbf24";

  return (
    <div className="flex items-center gap-3">
      <div
        className="grid h-14 w-14 shrink-0 place-items-center rounded-full border border-slate-700 shadow-inner shadow-black/25"
        style={{
          background: `conic-gradient(${cor} ${valor * 3.6}deg, rgba(30,41,59,0.92) 0deg)`,
        }}
        aria-label={`Conclusão ${valor}%`}
      >
        <div className="grid h-9 w-9 place-items-center rounded-full bg-slate-950 text-[11px] font-black text-white">
          {valor}%
        </div>
      </div>
      <div>
        <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-300">
          Conclusão
        </p>
        <p className="mt-1 text-xs font-bold text-slate-400">
          {concluidos || 0} de {total || 0} fator(es)
        </p>
      </div>
    </div>
  );
}

function etiquetaControle(item: ControleSelecionado) {
  return item.codigo ? `${item.codigo} - ${item.nome}` : item.nome;
}

function codigoControleUso(
  item: ControleSelecionado,
  prefixo: "CP" | "CD" | "CC",
) {
  const numeros = String(item.codigo || "").match(/\d+/)?.[0];
  if (!numeros) return item.codigo ? `${prefixo}-${item.codigo}` : prefixo;
  return `${prefixo}${numeros.padStart(3, "0")}`;
}

function etiquetaControleUso(
  item: ControleSelecionado,
  prefixo: "CP" | "CD" | "CC",
) {
  return `${codigoControleUso(item, prefixo)} - ${item.nome}`;
}

export default function RiscosAnaliseCompleta() {
  const [cadastro, setCadastro] = useState<CadastroGeral>(cadastroVazio);
  const [analises, setAnalises] = useState<AnaliseCompleta[]>([]);
  const [form, setForm] = useState<Formulario>(formularioInicial);
  const [formularioAnaliseAberto, setFormularioAnaliseAberto] = useState(false);
  const [analiseEditando, setAnaliseEditando] =
    useState<AnaliseCompleta | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [mensagem, setMensagem] = useState("");
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [controlesEditando, setControlesEditando] =
    useState<AnaliseCompleta | null>(null);
  const [finalizacaoEditando, setFinalizacaoEditando] =
    useState<AnaliseCompleta | null>(null);
  const [finalizacao, setFinalizacao] =
    useState<FinalizacaoFormulario>(finalizacaoInicial);
  const [mensagemFinalizacao, setMensagemFinalizacao] = useState("");
  const [erroFinalizacao, setErroFinalizacao] = useState("");
  const [preventivos, setPreventivos] = useState<string[]>([]);
  const [detectivos, setDetectivos] = useState<string[]>([]);
  const [corretivos, setCorretivos] = useState<string[]>([]);
  const [buscaPreventivo, setBuscaPreventivo] = useState("");
  const [buscaDetectivo, setBuscaDetectivo] = useState("");
  const [buscaCorretivo, setBuscaCorretivo] = useState("");
  const [residual, setResidual] = useState<ResidualFormulario>(residualInicial);
  const [mensagemControles, setMensagemControles] = useState("");
  const [erroControles, setErroControles] = useState("");
  const [filtroRiscos, setFiltroRiscos] = useState("");
  const [seletorRiscoAberto, setSeletorRiscoAberto] = useState(false);
  const [filtroFatores, setFiltroFatores] = useState("");
  const [seletorFatoresAberto, setSeletorFatoresAberto] = useState(false);
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

  const riscosFiltrados = useMemo(() => {
    const termo = filtroRiscos.trim().toLowerCase();
    if (!termo) return cadastro.riscos;
    return cadastro.riscos.filter((item) =>
      `${item.codigo} ${item.nome} ${item.descricao || ""}`
        .toLowerCase()
        .includes(termo),
    );
  }, [cadastro.riscos, filtroRiscos]);

  const riscoSelecionado = useMemo(
    () =>
      cadastro.riscos.find((item) => String(item.id) === form.riscoId) || null,
    [cadastro.riscos, form.riscoId],
  );

  const resumoAnalises = useMemo(() => {
    const extremos = analises.filter(
      (item) => item.classificacaoRisco === "EXTREMO",
    ).length;
    const altos = analises.filter(
      (item) => item.classificacaoRisco === "ALTO",
    ).length;
    const residuais = analises.filter(
      (item) =>
        item.resultadoResidual !== null && item.resultadoResidual !== undefined,
    ).length;
    const comControles = analises.filter(
      (item) =>
        item.preventivos.length ||
        item.detectivos.length ||
        item.corretivos.length,
    ).length;
    return {
      total: analises.length,
      extremos,
      altos,
      residuais,
      comControles,
    };
  }, [analises]);

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

  function removerFator(id: string) {
    setForm((atual) => ({
      ...atual,
      fatoresIds: atual.fatoresIds.filter((item) => item !== id),
    }));
  }

  function selecionarRisco(id: string) {
    const risco = cadastro.riscos.find((item) => String(item.id) === id);
    const fatoresSugeridos = (risco?.fatoresRisco || [])
      .map((fator) => String(fator.id || ""))
      .filter(Boolean);
    setForm((atual) => ({
      ...atual,
      riscoId: id,
      fatoresIds: fatoresSugeridos.length
        ? Array.from(new Set(fatoresSugeridos))
        : atual.fatoresIds,
    }));
  }

  function removerRisco() {
    setForm((atual) => ({ ...atual, riscoId: "" }));
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

  function controlesPorTipo(tipo: "CP" | "CD" | "CC") {
    return cadastro.controles
      .filter((item) => (item.tipoControle || "CP") === tipo)
      .sort((a, b) => a.codigo.localeCompare(b.codigo, "pt-BR"));
  }

  function localizarControle(valor: string, tipo: "CP" | "CD" | "CC") {
    const termo = valor.trim().toLowerCase();
    if (!termo) return null;
    const controles = controlesPorTipo(tipo);
    return (
      controles.find((item) => {
        const etiqueta = `${item.codigo} - ${item.nome}`.toLowerCase();
        return (
          etiqueta === termo ||
          item.codigo.toLowerCase() === termo ||
          item.nome.toLowerCase() === termo
        );
      }) ||
      controles.find((item) =>
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
    if (!form.riscoId) {
      setErro("Selecione o risco da análise.");
      return;
    }
    setSalvando(true);
    const payload = {
      macroProcessoId: Number(form.macroProcessoId),
      setorId: Number(form.setorId),
      riscoId: Number(form.riscoId),
      fatoresRisco: fatoresSelecionados(),
      estrategiaTratamento: form.estrategiaTratamento || null,
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
        await api.put(
          `/riscos/analise-completa/${analiseEditando.id}`,
          payload,
        );
      } else {
        await api.post("/riscos/analise-completa", payload);
      }
      setForm(formularioInicial);
      setAnaliseEditando(null);
      setFormularioAnaliseAberto(false);
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
    setFormularioAnaliseAberto(true);
    setForm({
      macroProcessoId: String(analise.macroProcessoId || ""),
      setorId: String(analise.setorId || ""),
      riscoId: String(analise.riscoId || ""),
      fatoresIds: analise.fatoresRisco
        .map((item) => String(item.id || ""))
        .filter(Boolean),
      estrategiaTratamento: analise.estrategiaTratamento || "",
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
    setFormularioAnaliseAberto(false);
  }

  async function abrirPdfAnalise(analise: AnaliseCompleta) {
    setErro("");
    try {
      const response = await api.get(
        `/riscos/analise-completa/${analise.id}/pdf`,
        {
          responseType: "blob",
        },
      );
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
      setPdfUrl(
        URL.createObjectURL(
          new Blob([response.data], { type: "application/pdf" }),
        ),
      );
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
    setMensagemControles("");
    setErroControles("");
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

  function abrirFinalizacao(analise: AnaliseCompleta) {
    setFinalizacaoEditando(analise);
    setMensagemFinalizacao("");
    setErroFinalizacao("");
    setFinalizacao({
      finalizacaoStatus: analise.finalizacaoStatus || "Finalizada",
      finalizacaoDecisao:
        analise.finalizacaoDecisao || analise.estrategiaTratamento || "",
      finalizacaoJustificativa: analise.finalizacaoJustificativa || "",
      finalizacaoObservacoes: analise.finalizacaoObservacoes || "",
    });
  }

  function adicionarControle(
    busca: string,
    prefixo: "CP" | "CD" | "CC",
    setBusca: (valor: string) => void,
    selecionados: string[],
    setSelecionados: (ids: string[]) => void,
  ) {
    const controle = localizarControle(busca, prefixo);
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
    setMensagemControles("");
    setErroControles("");
    try {
      const response = await api.patch(
        `/riscos/analise-completa/${controlesEditando.id}/controles`,
        {
          preventivos: itensSelecionados(preventivos),
          detectivos: itensSelecionados(detectivos),
          corretivos: itensSelecionados(corretivos),
        },
      );
      setControlesEditando(response.data);
      setMensagemControles("Controles salvos com sucesso.");
      setMensagem("Controles atualizados com sucesso.");
      carregar().catch(() => undefined);
    } catch (error: any) {
      setErroControles(
        error?.response?.data?.error || "Não foi possível salvar os controles.",
      );
    } finally {
      setSalvando(false);
    }
  }

  async function salvarAvaliacaoResidual() {
    if (!controlesEditando) return;
    setSalvando(true);
    setMensagemControles("");
    setErroControles("");
    try {
      const response = await api.patch(
        `/riscos/analise-completa/${controlesEditando.id}/controles`,
        {
          preventivos: itensSelecionados(preventivos),
          detectivos: itensSelecionados(detectivos),
          corretivos: itensSelecionados(corretivos),
          ...residual,
        },
      );
      setControlesEditando(response.data);
      setMensagemControles("Avaliação residual salva com sucesso.");
      setMensagem("Avaliação residual salva com sucesso.");
      carregar().catch(() => undefined);
    } catch (error: any) {
      setErroControles(
        error?.response?.data?.error ||
          "Não foi possível salvar a avaliação residual.",
      );
    } finally {
      setSalvando(false);
    }
  }

  async function salvarFinalizacao() {
    if (!finalizacaoEditando) return;
    setSalvando(true);
    setMensagemFinalizacao("");
    setErroFinalizacao("");
    try {
      const response = await api.patch(
        `/riscos/analise-completa/${finalizacaoEditando.id}/finalizacao`,
        finalizacao,
      );
      setFinalizacaoEditando(response.data);
      setMensagemFinalizacao("ARC finalizada com sucesso.");
      setMensagem("ARC finalizada com sucesso.");
      carregar().catch(() => undefined);
    } catch (error: any) {
      setErroFinalizacao(
        error?.response?.data?.error || "Não foi possível finalizar a ARC.",
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
      <label className="group rounded-xl border border-slate-700/70 bg-slate-900/80 p-2.5 shadow-sm shadow-slate-950/20 transition hover:border-blue-400/70 hover:bg-slate-900">
        <span className="flex min-h-9 items-center text-[11px] font-black leading-4 text-slate-100">
          {label}
        </span>
        <select
          className={`${inputClass} mt-2 h-10 w-full rounded-lg px-2 text-center text-sm`}
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
      <label className="group flex min-h-[106px] flex-col rounded-xl border border-slate-700/70 bg-slate-900/80 p-2.5 shadow-sm shadow-slate-950/20 transition hover:border-cyan-400/70 hover:bg-slate-900">
        <span className="flex min-h-10 items-start text-[10px] font-black leading-3 text-slate-100">
          {label}
        </span>
        <select
          className={`${inputClass} mt-auto h-10 w-full rounded-lg px-2 text-center text-sm`}
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
    prefixo: "CP" | "CD" | "CC",
    selecionados: string[],
    setSelecionados: (ids: string[]) => void,
    busca: string,
    setBusca: (valor: string) => void,
  ) {
    const controlesSelecionados = itensSelecionados(selecionados);
    const controlesDisponiveis = controlesPorTipo(prefixo);
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
                adicionarControle(
                  busca,
                  prefixo,
                  setBusca,
                  selecionados,
                  setSelecionados,
                );
              }
            }}
            placeholder={`Digite ${prefixo}001 ou o nome`}
          />
          <datalist id={datalistId}>
            {controlesDisponiveis.map((controle) => (
              <option
                key={controle.id}
                value={`${controle.codigo} - ${controle.nome}`}
              />
            ))}
          </datalist>
          <button
            type="button"
            onClick={() =>
              adicionarControle(
                busca,
                prefixo,
                setBusca,
                selecionados,
                setSelecionados,
              )
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
              <span>{etiquetaControleUso(controle, prefixo)}</span>
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
          {!controlesDisponiveis.length && (
            <p className="rounded-xl bg-slate-900 p-3 text-sm font-bold text-slate-300">
              Nenhum controle {prefixo} cadastrado em Cadastro Geral.
            </p>
          )}
          {controlesDisponiveis.length > 0 && !controlesSelecionados.length && (
            <p className="rounded-xl bg-slate-900 p-3 text-sm font-bold text-slate-300">
              Nenhum controle selecionado.
            </p>
          )}
        </div>
      </div>
    );
  }

  const finalizacaoBloqueada =
    !!finalizacaoEditando &&
    finalizacao.finalizacaoStatus !== "Reaberta para novo tratamento" &&
    (finalizacaoEditando.totalFatoresTratativa || 0) > 0 &&
    (finalizacaoEditando.percentualConclusaoTratativa || 0) < 100;

  return (
    <div className="min-h-[calc(100vh-5rem)] bg-slate-950 px-4 py-6 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1800px]">
        <header className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-900 shadow-2xl shadow-black/20">
          <div className="border-b border-slate-800 bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.28),transparent_35%),linear-gradient(135deg,rgba(15,23,42,1),rgba(2,6,23,1))] p-6 sm:p-8">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.35em] text-blue-300">
                  Análise de Riscos
                </p>
                <h1 className="mt-2 text-3xl font-black text-white sm:text-4xl">
                  Análise Completa
                </h1>
                <p className="mt-3 max-w-4xl text-sm font-semibold leading-6 text-slate-300">
                  Cadastre a matriz completa, acompanhe os cálculos inerentes,
                  registre controles e avalie o residual sem perder a leitura
                  executiva do risco.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Link
                  to="/riscos/dashboard"
                  className="inline-flex items-center gap-2 rounded-xl border border-blue-400/30 bg-blue-500/10 px-4 py-3 text-sm font-black text-blue-100 hover:bg-blue-500/20"
                >
                  <LayoutDashboard size={16} />
                  Dashboard
                </Link>
                <Link
                  to="/riscos/cadastro-geral"
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-950/60 px-4 py-3 text-sm font-black text-slate-100 hover:border-blue-400/50"
                >
                  <Settings size={16} />
                  Cadastro Geral
                </Link>
              </div>
            </div>
          </div>

          <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-5">
            {[
              ["Total", resumoAnalises.total, "Registros cadastrados"],
              ["Extremos", resumoAnalises.extremos, "Prioridade máxima"],
              ["Altos", resumoAnalises.altos, "Acompanhamento crítico"],
              [
                "Com residual",
                resumoAnalises.residuais,
                "Avaliação preenchida",
              ],
              [
                "Com controles",
                resumoAnalises.comControles,
                "Controles vinculados",
              ],
            ].map(([titulo, valor, detalhe]) => (
              <div
                key={String(titulo)}
                className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4"
              >
                <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-200">
                  {titulo}
                </p>
                <p className="mt-2 text-2xl font-black text-white">{valor}</p>
                <p className="mt-1 text-xs font-semibold text-slate-400">
                  {detalhe}
                </p>
              </div>
            ))}
          </div>
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

        <section className="mt-6 overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/90 shadow-2xl shadow-black/20">
          <button
            type="button"
            onClick={() => setFormularioAnaliseAberto((aberto) => !aberto)}
            className="flex w-full flex-col gap-3 p-4 text-left transition hover:bg-slate-800/45 sm:flex-row sm:items-center sm:justify-between sm:p-5"
          >
            <div className="flex items-center gap-3">
              <span className="rounded-2xl border border-blue-400/30 bg-blue-500/10 p-3 text-blue-200">
                <BrainCircuit size={22} />
              </span>
              <div>
                <p className="text-xs font-black uppercase tracking-[0.24em] text-blue-200">
                  Cadastro de ARC
                </p>
                <h2 className="mt-1 text-xl font-black text-white">
                  {analiseEditando
                    ? `Editando ${analiseEditando.codigo}`
                    : "Cadastrar nova análise completa"}
                </h2>
                <p className="mt-1 text-sm font-semibold text-slate-300">
                  Abra para preencher macro processo, risco, fatores e avaliação
                  inerente.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span
                className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-black ${previa.cor}`}
              >
                Prévia: {previa.nivel} / NRI {previa.resultado}
              </span>
              <ChevronDown
                className={`text-blue-200 transition-transform duration-200 ${
                  formularioAnaliseAberto ? "rotate-180" : ""
                }`}
                size={22}
              />
            </div>
          </button>

          {formularioAnaliseAberto && (
            <form
              onSubmit={salvarAnalise}
              className="border-t border-slate-800 p-4 sm:p-5"
            >
              <div className="flex flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-950/60 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <span className="rounded-2xl border border-blue-400/30 bg-blue-500/10 p-3 text-blue-200">
                    <BrainCircuit size={22} />
                  </span>
                  <div>
                    <h2 className="text-xl font-black text-white">
                      {analiseEditando
                        ? `Editando ${analiseEditando.codigo}`
                        : "Nova análise completa"}
                    </h2>
                    <p className="mt-1 text-sm font-semibold text-slate-300">
                      Identificação, fatores e pontuação inerente em um fluxo
                      único.
                    </p>
                  </div>
                </div>
                <span
                  className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-black ${previa.cor}`}
                >
                  Prévia: {previa.nivel} / NRI {previa.resultado}
                </span>
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
              </div>

              <div className="mt-5 rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                  <div>
                    <p className="text-sm font-black text-white">Risco</p>
                    <p className="mt-1 text-xs font-semibold text-slate-300">
                      Busque pelo código ou nome. Esta análise permite
                      selecionar somente um risco principal.
                    </p>
                  </div>
                  <span
                    className={`w-fit rounded-full border px-3 py-2 text-xs font-black ${
                      riscoSelecionado
                        ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-100"
                        : "border-amber-400/30 bg-amber-500/10 text-amber-100"
                    }`}
                  >
                    {riscoSelecionado
                      ? "1 risco selecionado"
                      : "Seleção pendente"}
                  </span>
                </div>

                <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-center">
                  <label className="relative min-w-0 flex-1">
                    <Search
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
                      size={16}
                    />
                    <input
                      className={`${inputClass} w-full pl-10`}
                      value={filtroRiscos}
                      onChange={(event) => setFiltroRiscos(event.target.value)}
                      placeholder="Digite R001, número ou palavra-chave"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => setSeletorRiscoAberto(true)}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-blue-400/40 bg-blue-500/10 px-4 py-3 text-sm font-black text-blue-100 transition hover:bg-blue-500/20"
                  >
                    <ListPlus size={16} />
                    Busca detalhada
                  </button>
                </div>

                <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-900/70 p-3">
                  {riscoSelecionado ? (
                    <div className="flex flex-col gap-3 rounded-xl border border-blue-400/30 bg-blue-500/10 p-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm font-black text-blue-100">
                          {riscoSelecionado.codigo} - {riscoSelecionado.nome}
                        </p>
                        <p className="mt-1 text-xs font-semibold text-slate-300">
                          {riscoSelecionado.descricao ||
                            "Sem descrição cadastrada."}
                        </p>
                        {!!riscoSelecionado.fatoresRisco?.length && (
                          <p className="mt-2 text-xs font-black text-blue-100">
                            {riscoSelecionado.fatoresRisco.length} fator(es) de
                            risco pré-selecionado(s).
                          </p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={removerRisco}
                        className="inline-flex w-fit items-center gap-2 rounded-xl border border-red-300/30 px-3 py-2 text-xs font-black text-red-100 hover:bg-red-500/10"
                      >
                        <X size={13} />
                        Remover
                      </button>
                    </div>
                  ) : (
                    <p className="text-sm font-bold text-slate-400">
                      Nenhum risco selecionado ainda.
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-5 rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                  <div>
                    <p className="text-sm font-black text-white">
                      Fatores de Risco
                    </p>
                    <p className="mt-1 text-xs font-semibold text-slate-300">
                      Busque pelo código ou nome. A lista abaixo mostra somente
                      os fatores selecionados para esta análise.
                    </p>
                  </div>
                  <span className="w-fit rounded-full border border-blue-400/30 bg-blue-500/10 px-3 py-2 text-xs font-black text-blue-100">
                    {form.fatoresIds.length} fator(es) selecionado(s)
                  </span>
                </div>

                <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-center">
                  <label className="relative min-w-0 flex-1">
                    <Search
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
                      size={16}
                    />
                    <input
                      className={`${inputClass} w-full pl-10`}
                      value={filtroFatores}
                      onChange={(event) => setFiltroFatores(event.target.value)}
                      placeholder="Digite FR001, número ou palavra-chave"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => setSeletorFatoresAberto(true)}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-blue-400/40 bg-blue-500/10 px-4 py-3 text-sm font-black text-blue-100 transition hover:bg-blue-500/20"
                  >
                    <ListPlus size={16} />
                    Busca detalhada
                  </button>
                </div>

                <div className="mt-4 flex flex-wrap gap-2 rounded-2xl border border-slate-800 bg-slate-900/70 p-3">
                  {fatoresSelecionados().map((fator) => (
                    <span
                      key={fator.id}
                      className="inline-flex items-center gap-2 rounded-xl border border-amber-300/40 bg-amber-400/15 px-3 py-2 text-xs font-black text-amber-100"
                    >
                      {etiquetaControle(fator)}
                      <button
                        type="button"
                        onClick={() => removerFator(String(fator.id))}
                        className="rounded-lg border border-amber-200/30 p-1 text-amber-100 hover:border-red-300/50 hover:text-red-100"
                        aria-label={`Remover ${etiquetaControle(fator)}`}
                      >
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                  {!form.fatoresIds.length && (
                    <p className="text-sm font-bold text-slate-400">
                      Nenhum fator selecionado ainda.
                    </p>
                  )}
                </div>
              </div>

              <section className="mt-5 rounded-2xl border border-slate-800 bg-[linear-gradient(135deg,rgba(15,23,42,0.96),rgba(15,23,42,0.72))] p-4 shadow-xl shadow-slate-950/20">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-black uppercase tracking-[0.28em] text-blue-100">
                      Análise e Avaliação Inerente
                    </h3>
                    <p className="mt-1 text-xs font-semibold text-slate-400">
                      Preencha os critérios de probabilidade e consequência para
                      o cálculo automático do risco.
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-black ${previa.cor}`}
                  >
                    {previa.nivel}
                  </span>
                </div>

                <div className="mt-4 grid gap-3 xl:grid-cols-[0.78fr_1.22fr]">
                  <section className="rounded-2xl border border-blue-400/20 bg-blue-500/[0.06] p-3">
                    <div className="flex items-center justify-between gap-3 border-b border-blue-400/15 pb-2">
                      <h4 className="text-xs font-black uppercase tracking-[0.22em] text-blue-100">
                        Probabilidade
                      </h4>
                      <span className="rounded-full bg-slate-950/80 px-2.5 py-1 text-[11px] font-black text-blue-100">
                        MPP {previa.mediaProbabilidade}
                      </span>
                    </div>
                    <div className="mt-3 grid gap-2 sm:grid-cols-3">
                      {camposProbabilidade.map((item) =>
                        renderCampoNota(item.campo, item.label),
                      )}
                    </div>
                  </section>

                  <section className="rounded-2xl border border-cyan-400/20 bg-cyan-500/[0.05] p-3">
                    <div className="flex items-center justify-between gap-3 border-b border-cyan-400/15 pb-2">
                      <h4 className="text-xs font-black uppercase tracking-[0.22em] text-cyan-100">
                        Consequência
                      </h4>
                      <span className="rounded-full bg-slate-950/80 px-2.5 py-1 text-[11px] font-black text-cyan-100">
                        MPI {previa.mediaConsequencia}
                      </span>
                    </div>
                    <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
                      {camposConsequencia.map((item) =>
                        renderCampoNota(item.campo, item.label),
                      )}
                    </div>
                  </section>
                </div>
              </section>

              <div className="mt-5 grid gap-3 rounded-2xl border border-blue-400/30 bg-[linear-gradient(135deg,rgba(37,99,235,0.14),rgba(15,23,42,0.7))] p-4 sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-8">
                <div>
                  <p className="text-xs font-black uppercase text-blue-200">
                    Nota
                  </p>
                  <p className="mt-1 text-xl font-black text-white">
                    {form.sc * 5 + form.fe * 4 + form.intervalo * 3}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-black uppercase text-blue-200">
                    MPP
                  </p>
                  <p className="mt-1 text-xl font-black text-white">
                    {previa.mediaProbabilidade}
                  </p>
                  <p className="text-xs font-bold text-blue-100">
                    {previa.nivelProbabilidade}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-black uppercase text-blue-200">
                    %P
                  </p>
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
                  <p className="text-xs font-black uppercase text-blue-200">
                    MPI
                  </p>
                  <p className="mt-1 text-xl font-black text-white">
                    {previa.mediaConsequencia}
                  </p>
                  <p className="text-xs font-bold text-blue-100">
                    {previa.nivelConsequencia}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-black uppercase text-blue-200">
                    NRI
                  </p>
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
          )}
        </section>

        <section className="mt-6 rounded-3xl border border-slate-800 bg-slate-900/90 p-5 shadow-2xl shadow-black/20">
          <div className="flex flex-col gap-2 border-b border-slate-800 pb-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="flex items-center gap-3">
                <BarChart3 className="text-blue-300" size={20} />
                <h2 className="text-xl font-black text-white">
                  Análises cadastradas
                </h2>
              </div>
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

          <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950/40">
            <table className="w-full min-w-[2480px] table-fixed border-separate border-spacing-y-2 p-2">
              <colgroup>
                <col className="w-12" />
                <col className="w-32" />
                <col className="w-72" />
                <col className="w-[420px]" />
                <col className="w-56" />
                <col className="w-52" />
                <col className="w-52" />
                <col className="w-56" />
                <col className="w-72" />
                <col className="w-36" />
                <col className="w-56" />
              </colgroup>
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
                  <th className="px-3 py-2">Conclusão</th>
                  <th className="px-3 py-2">Probabilidade</th>
                  <th className="px-3 py-2">Consequência</th>
                  <th className="px-3 py-2">Risco inerente</th>
                  <th className="px-3 py-2">Residual</th>
                  <th className="px-3 py-2">Controles</th>
                  <th className="px-3 py-2 text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {analises.map((analise) => (
                  <tr
                    key={analise.id}
                    className="cursor-pointer align-top text-sm font-semibold text-slate-100 transition"
                    onClick={() => abrirControles(analise)}
                  >
                    <td
                      className="rounded-l-2xl border-y border-l border-slate-800 bg-slate-950/90 px-3 py-3 text-center"
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
                    <td className="border-y border-slate-800 bg-slate-950/90 px-3 py-3">
                      <span className="inline-flex rounded-xl border border-blue-400/30 bg-blue-500/10 px-3 py-1.5 text-sm font-black text-blue-100">
                        {analise.codigo}
                      </span>
                    </td>
                    <td className="border-y border-slate-800 bg-slate-950/90 px-3 py-3">
                      <p className="line-clamp-2 text-sm font-black leading-5 text-white">
                        {analise.riscoCodigo} - {analise.riscoNome}
                      </p>
                      <p className="mt-1.5 line-clamp-2 text-xs font-bold leading-5 text-slate-300">
                        {analise.macroProcessoCodigo} -{" "}
                        {analise.macroProcessoNome} / {analise.setorNome}
                      </p>
                    </td>
                    <td className="border-y border-slate-800 bg-slate-950/90 px-3 py-3">
                      <div className="flex max-h-[76px] flex-wrap gap-1.5 overflow-y-auto pr-1">
                        {analise.fatoresRisco.map((fator) => (
                          <span
                            key={`${fator.codigo}-${fator.nome}`}
                            className="min-w-[170px] rounded-lg border border-amber-300/35 bg-amber-400/15 px-2.5 py-1.5 text-xs font-bold leading-4 text-amber-100"
                          >
                            <span className="block truncate">
                              {etiquetaControle(fator)}
                            </span>
                            <span className="mt-1 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.08em] text-amber-50">
                              <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-900/80">
                                <span
                                  className="block h-full rounded-full bg-emerald-300"
                                  style={{
                                    width: `${Math.max(
                                      0,
                                      Math.min(
                                        100,
                                        fator.percentualTratativa || 0,
                                      ),
                                    )}%`,
                                  }}
                                />
                              </span>
                              {fator.percentualTratativa || 0}%
                            </span>
                            <span className="mt-0.5 block text-[10px] font-bold text-amber-100/75">
                              {fator.planosTratativa || 0} plano(s) 5W2H
                            </span>
                          </span>
                        ))}
                        {!analise.fatoresRisco.length && (
                          <span className="text-xs font-bold text-slate-400">
                            Nenhum fator informado
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="border-y border-slate-800 bg-slate-950/90 px-3 py-3">
                      <RoscaConclusao
                        percentual={analise.percentualConclusaoTratativa}
                        concluidos={analise.fatoresConcluidosTratativa}
                        total={analise.totalFatoresTratativa}
                      />
                    </td>
                    <td className="border-y border-slate-800 bg-slate-950/90 px-3 py-3">
                      <MiniMetrica
                        rotulo="MPP"
                        valor={analise.mediaProbabilidade}
                        destaque={analise.nivelProbabilidade}
                      />
                      <p className="mt-1.5 text-xs font-black text-blue-100">
                        %P:{" "}
                        {Math.round(
                          (analise.percentualProbabilidade || 0) * 100,
                        )}
                        %
                      </p>
                    </td>
                    <td className="border-y border-slate-800 bg-slate-950/90 px-3 py-3">
                      <MiniMetrica
                        rotulo="MPI"
                        valor={analise.mediaConsequencia}
                        destaque={analise.nivelConsequencia}
                      />
                    </td>
                    <td className="border-y border-slate-800 bg-slate-950/90 px-3 py-3">
                      <MiniMetrica
                        rotulo="NRI"
                        valor={analise.resultadoInerente}
                        destaque={analise.classificacaoRisco}
                      />
                      <p className="mt-1.5 inline-flex rounded-full border border-purple-400/25 bg-purple-500/10 px-2.5 py-1 text-[11px] font-black text-purple-100">
                        {analise.estrategiaTratamento || "Não definida"}
                      </p>
                      <p
                        className={`mt-1.5 inline-flex rounded-full border px-2.5 py-1 text-[11px] font-black ${
                          analise.finalizadaEm
                            ? "border-emerald-300/35 bg-emerald-400/10 text-emerald-100"
                            : "border-slate-600 bg-slate-800/80 text-slate-300"
                        }`}
                      >
                        {analise.finalizacaoStatus || "Aberta"}
                      </p>
                      <p className="mt-1.5 text-xs font-bold leading-5 text-slate-300">
                        {analise.periodicidadeAcao}
                      </p>
                    </td>
                    <td className="border-y border-slate-800 bg-slate-950/90 px-3 py-3">
                      <div className="grid gap-1.5">
                        <MiniMetrica
                          rotulo="Prob."
                          valor={analise.probabilidadeResidual ?? "-"}
                          destaque={analise.nivelProbabilidadeResidual || "-"}
                        />
                        <MiniMetrica
                          rotulo="Cons."
                          valor={analise.consequenciaResidual ?? "-"}
                          destaque={analise.nivelConsequenciaResidual || "-"}
                        />
                        <MiniMetrica
                          rotulo="Class."
                          valor={analise.resultadoResidual ?? "-"}
                          destaque={analise.classificacaoResidual || "-"}
                        />
                      </div>
                    </td>
                    <td className="border-y border-slate-800 bg-slate-950/90 px-3 py-3">
                      <div className="grid gap-1.5 text-xs font-black text-slate-200">
                        <span className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5">
                          Preventivo: {analise.preventivos.length}
                        </span>
                        <span className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5">
                          Detectivo: {analise.detectivos.length}
                        </span>
                        <span className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5">
                          Corretivo: {analise.corretivos.length}
                        </span>
                      </div>
                    </td>
                    <td className="sticky right-0 rounded-r-2xl border-y border-r border-slate-800 bg-slate-950 px-3 py-3 shadow-[-16px_0_22px_rgba(2,6,23,0.75)]">
                      <div className="grid gap-1.5">
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            iniciarEdicaoAnalise(analise);
                          }}
                          className="inline-flex items-center justify-center gap-2 rounded-xl border border-blue-400/30 bg-blue-500/10 px-3 py-1.5 text-xs font-black text-blue-100 hover:bg-blue-500/20"
                        >
                          <Pencil size={14} />
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            abrirControles(analise);
                          }}
                          className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-black text-emerald-100 hover:bg-emerald-500/20"
                        >
                          <Settings size={14} />
                          Controles
                        </button>
                        <Link
                          to={`/planos-acao?arcId=${analise.id}`}
                          onClick={(event) => event.stopPropagation()}
                          className="inline-flex items-center justify-center gap-2 rounded-xl border border-amber-300/35 bg-amber-400/10 px-3 py-1.5 text-xs font-black text-amber-100 hover:bg-amber-400/20"
                        >
                          <ClipboardList size={14} />
                          Plano de ação
                        </Link>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            abrirFinalizacao(analise);
                          }}
                          className="inline-flex items-center justify-center gap-2 rounded-xl border border-cyan-300/35 bg-cyan-400/10 px-3 py-1.5 text-xs font-black text-cyan-100 hover:bg-cyan-400/20"
                        >
                          <CheckCircle2 size={14} />
                          Finalizar ARC
                        </button>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            abrirPdfAnalise(analise);
                          }}
                          className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-1.5 text-xs font-black text-red-100 hover:bg-red-500/20"
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
                      colSpan={11}
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

            {(mensagemControles || erroControles) && (
              <div
                className={`mt-5 rounded-xl border px-4 py-3 text-sm font-black shadow-lg ${
                  erroControles
                    ? "border-red-400/50 bg-red-500/15 text-red-100"
                    : "border-emerald-400/50 bg-emerald-500/15 text-emerald-100"
                }`}
              >
                {erroControles || mensagemControles}
              </div>
            )}

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
                    "CP",
                    preventivos,
                    setPreventivos,
                    buscaPreventivo,
                    setBuscaPreventivo,
                  )}
                  {renderListaControles(
                    "Detectivo",
                    "CD",
                    detectivos,
                    setDetectivos,
                    buscaDetectivo,
                    setBuscaDetectivo,
                  )}
                  {renderListaControles(
                    "Corretivo",
                    "CC",
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

              <section className="rounded-2xl border border-slate-800 bg-[linear-gradient(135deg,rgba(15,23,42,0.96),rgba(15,23,42,0.74))] p-4 shadow-xl shadow-slate-950/20">
                <div className="flex flex-col gap-2 border-b border-slate-800 pb-4 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <h3 className="text-sm font-black uppercase tracking-[0.18em] text-blue-100">
                      Avaliação Residual
                    </h3>
                    <p className="mt-1 text-xs font-semibold text-slate-400">
                      Informe os critérios após os controles para calcular o
                      risco residual e o desempenho.
                    </p>
                  </div>
                  <BadgeNivel>{previaResidual.classificacao}</BadgeNivel>
                </div>

                <div className="mt-4 grid gap-3 xl:grid-cols-[0.78fr_1.22fr]">
                  <section className="rounded-2xl border border-blue-400/20 bg-blue-500/[0.06] p-3">
                    <div className="flex items-center justify-between gap-3 border-b border-blue-400/15 pb-2">
                      <h4 className="text-xs font-black uppercase tracking-[0.22em] text-blue-100">
                        Probabilidade
                      </h4>
                      <span className="rounded-full bg-slate-950/80 px-2.5 py-1 text-[11px] font-black text-blue-100">
                        MPP {previaResidual.probabilidade}
                      </span>
                    </div>
                    <div className="mt-3 grid gap-2 sm:grid-cols-3">
                      {camposProbabilidadeResidual.map((item) =>
                        renderCampoNotaResidual(item.campo, item.label),
                      )}
                    </div>
                  </section>

                  <section className="rounded-2xl border border-cyan-400/20 bg-cyan-500/[0.05] p-3">
                    <div className="flex items-center justify-between gap-3 border-b border-cyan-400/15 pb-2">
                      <h4 className="text-xs font-black uppercase tracking-[0.22em] text-cyan-100">
                        Consequência
                      </h4>
                      <span className="rounded-full bg-slate-950/80 px-2.5 py-1 text-[11px] font-black text-cyan-100">
                        MPI {previaResidual.consequencia}
                      </span>
                    </div>
                    <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
                      {camposConsequenciaResidual.map((item) =>
                        renderCampoNotaResidual(item.campo, item.label),
                      )}
                    </div>
                  </section>
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

      {seletorRiscoAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur">
          <div className="max-h-[86vh] w-full max-w-3xl overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-800 p-5">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.24em] text-blue-300">
                  Busca detalhada
                </p>
                <h3 className="mt-1 text-2xl font-black text-white">
                  Selecionar risco principal
                </h3>
                <p className="mt-1 text-sm font-semibold text-slate-300">
                  Escolha um único risco para esta análise completa.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSeletorRiscoAberto(false)}
                className="rounded-xl border border-slate-700 p-2 text-slate-300 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <div className="border-b border-slate-800 p-5">
              <label className="relative block">
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
                  size={16}
                />
                <input
                  className={`${inputClass} w-full pl-10`}
                  value={filtroRiscos}
                  onChange={(event) => setFiltroRiscos(event.target.value)}
                  placeholder="Buscar por R, código, número ou palavra"
                />
              </label>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs font-black text-slate-300">
                <span>
                  {riscosFiltrados.length} resultado(s) ·{" "}
                  {riscoSelecionado ? "1 selecionado" : "nenhum selecionado"}
                </span>
                {riscoSelecionado && (
                  <button
                    type="button"
                    onClick={removerRisco}
                    className="rounded-lg border border-slate-700 px-3 py-1.5 text-slate-300 hover:border-red-400 hover:text-red-100"
                  >
                    Limpar seleção
                  </button>
                )}
              </div>
            </div>

            <div className="max-h-[46vh] overflow-y-auto p-5">
              <div className="grid gap-2">
                {riscosFiltrados.map((item) => {
                  const marcado = form.riscoId === String(item.id);
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => selecionarRisco(String(item.id))}
                      className={`flex items-start justify-between gap-4 rounded-xl border p-3 text-left transition ${
                        marcado
                          ? "border-blue-400 bg-blue-600 text-white"
                          : "border-slate-700 bg-slate-950 text-slate-200 hover:border-blue-400"
                      }`}
                    >
                      <span className="min-w-0">
                        <strong className="text-sm">{item.codigo}</strong>
                        <span className="ml-2 text-sm font-bold">
                          {item.nome}
                        </span>
                        {item.descricao && (
                          <span
                            className={`mt-1 block text-xs font-semibold leading-5 ${
                              marcado ? "text-blue-50" : "text-slate-400"
                            }`}
                          >
                            {item.descricao}
                          </span>
                        )}
                        {!!item.fatoresRisco?.length && (
                          <span
                            className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-[11px] font-black ${
                              marcado
                                ? "bg-white/15 text-white"
                                : "bg-blue-500/10 text-blue-200"
                            }`}
                          >
                            {item.fatoresRisco.length} fator(es) sugerido(s)
                          </span>
                        )}
                      </span>
                      <span
                        className={`mt-0.5 h-5 w-5 shrink-0 rounded-full border ${
                          marcado
                            ? "border-white bg-white shadow-inner"
                            : "border-slate-600"
                        }`}
                      />
                    </button>
                  );
                })}
                {!riscosFiltrados.length && (
                  <p className="rounded-xl border border-slate-800 bg-slate-950 p-4 text-sm font-bold text-slate-300">
                    Nenhum risco encontrado para a busca informada.
                  </p>
                )}
              </div>
            </div>

            <div className="flex justify-end border-t border-slate-800 p-5">
              <button
                type="button"
                onClick={() => setSeletorRiscoAberto(false)}
                className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-black text-white hover:bg-blue-500"
              >
                Concluir seleção
              </button>
            </div>
          </div>
        </div>
      )}

      {seletorFatoresAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur">
          <div className="max-h-[86vh] w-full max-w-3xl overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-800 p-5">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.24em] text-blue-300">
                  Busca detalhada
                </p>
                <h3 className="mt-1 text-2xl font-black text-white">
                  Selecionar fatores de risco
                </h3>
                <p className="mt-1 text-sm font-semibold text-slate-300">
                  Marque quantos fatores forem necessários para compor a
                  análise.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSeletorFatoresAberto(false)}
                className="rounded-xl border border-slate-700 p-2 text-slate-300 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <div className="border-b border-slate-800 p-5">
              <label className="relative block">
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
                  size={16}
                />
                <input
                  className={`${inputClass} w-full pl-10`}
                  value={filtroFatores}
                  onChange={(event) => setFiltroFatores(event.target.value)}
                  placeholder="Buscar por FR, código, número ou palavra"
                />
              </label>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs font-black text-slate-300">
                <span>
                  {fatoresFiltrados.length} resultado(s) ·{" "}
                  {form.fatoresIds.length} selecionado(s)
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setForm((atual) => ({ ...atual, fatoresIds: [] }))
                  }
                  className="rounded-lg border border-slate-700 px-3 py-1.5 text-slate-300 hover:border-red-400 hover:text-red-100"
                >
                  Limpar seleção
                </button>
              </div>
            </div>

            <div className="max-h-[46vh] overflow-y-auto p-5">
              <div className="grid gap-2">
                {fatoresFiltrados.map((item) => {
                  const marcado = form.fatoresIds.includes(String(item.id));
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => alternarFator(String(item.id))}
                      className={`flex items-center justify-between gap-4 rounded-xl border p-3 text-left transition ${
                        marcado
                          ? "border-blue-400 bg-blue-600 text-white"
                          : "border-slate-700 bg-slate-950 text-slate-200 hover:border-blue-400"
                      }`}
                    >
                      <span>
                        <strong className="text-sm">{item.codigo}</strong>
                        <span className="ml-2 text-sm font-bold">
                          {item.nome}
                        </span>
                      </span>
                      <span
                        className={`h-5 w-5 rounded-md border ${
                          marcado
                            ? "border-white bg-white shadow-inner"
                            : "border-slate-600"
                        }`}
                      />
                    </button>
                  );
                })}
                {!fatoresFiltrados.length && (
                  <p className="rounded-xl border border-slate-800 bg-slate-950 p-4 text-sm font-bold text-slate-300">
                    Nenhum fator encontrado para a busca informada.
                  </p>
                )}
              </div>
            </div>

            <div className="flex justify-end border-t border-slate-800 p-5">
              <button
                type="button"
                onClick={() => setSeletorFatoresAberto(false)}
                className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-black text-white hover:bg-blue-500"
              >
                Concluir seleção
              </button>
            </div>
          </div>
        </div>
      )}

      {finalizacaoEditando && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur">
          <div className="max-h-[92vh] w-full max-w-3xl overflow-auto rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.3em] text-cyan-300">
                  Finalização da ARC
                </p>
                <h2 className="mt-2 text-2xl font-black text-white">
                  {finalizacaoEditando.codigo}
                </h2>
                <p className="mt-1 text-sm font-semibold text-slate-300">
                  {finalizacaoEditando.riscoCodigo} -{" "}
                  {finalizacaoEditando.riscoNome}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setFinalizacaoEditando(null)}
                className="rounded-xl border border-slate-700 p-2 text-slate-300 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            {(mensagemFinalizacao || erroFinalizacao) && (
              <div
                className={`mt-5 rounded-xl border px-4 py-3 text-sm font-black shadow-lg ${
                  erroFinalizacao
                    ? "border-red-400/50 bg-red-500/15 text-red-100"
                    : "border-emerald-400/50 bg-emerald-500/15 text-emerald-100"
                }`}
              >
                {erroFinalizacao || mensagemFinalizacao}
              </div>
            )}

            <div className="mt-5 grid gap-4 rounded-2xl border border-slate-800 bg-slate-950/70 p-4 sm:grid-cols-2">
              <label className="text-sm font-black text-slate-200">
                Decisão final
                <select
                  className={`${inputClass} mt-2 w-full`}
                  value={finalizacao.finalizacaoDecisao}
                  onChange={(event) =>
                    setFinalizacao((atual) => ({
                      ...atual,
                      finalizacaoDecisao: event.target.value,
                    }))
                  }
                  required
                >
                  <option value="">Selecione</option>
                  <option value="Mitigar">Mitigar</option>
                  <option value="Aceitar">Aceitar</option>
                  <option value="Transferir">Transferir</option>
                  <option value="Evitar">Evitar</option>
                  <option value="Monitorar">Monitorar</option>
                </select>
              </label>
              <label className="text-sm font-black text-slate-200">
                Status final
                <select
                  className={`${inputClass} mt-2 w-full`}
                  value={finalizacao.finalizacaoStatus}
                  onChange={(event) =>
                    setFinalizacao((atual) => ({
                      ...atual,
                      finalizacaoStatus: event.target.value,
                    }))
                  }
                >
                  <option value="Finalizada">Finalizada</option>
                  <option value="Finalizada com risco aceito">
                    Finalizada com risco aceito
                  </option>
                  <option value="Finalizada com monitoramento">
                    Finalizada com monitoramento
                  </option>
                  <option value="Reaberta para novo tratamento">
                    Reaberta para novo tratamento
                  </option>
                </select>
              </label>
              <label className="sm:col-span-2 text-sm font-black text-slate-200">
                Justificativa da decisão
                <textarea
                  className={`${inputClass} mt-2 min-h-28 w-full`}
                  value={finalizacao.finalizacaoJustificativa}
                  onChange={(event) =>
                    setFinalizacao((atual) => ({
                      ...atual,
                      finalizacaoJustificativa: event.target.value,
                    }))
                  }
                  placeholder="Ex.: Risco residual classificado como menor após controles e planos concluídos."
                />
              </label>
              <label className="sm:col-span-2 text-sm font-black text-slate-200">
                Observações finais
                <textarea
                  className={`${inputClass} mt-2 min-h-20 w-full`}
                  value={finalizacao.finalizacaoObservacoes}
                  onChange={(event) =>
                    setFinalizacao((atual) => ({
                      ...atual,
                      finalizacaoObservacoes: event.target.value,
                    }))
                  }
                  placeholder="Observações complementares, ressalvas ou monitoramentos."
                />
              </label>
            </div>

            <div className="mt-5 rounded-2xl border border-blue-400/20 bg-blue-500/10 p-4 text-sm font-bold leading-6 text-blue-100">
              A aprovação será registrada com o usuário logado. A estratégia da
              ARC será gravada somente nesta finalização.
            </div>
            {finalizacaoBloqueada && (
              <div className="mt-4 rounded-2xl border border-amber-300/45 bg-amber-400/15 p-4 text-sm font-black leading-6 text-amber-100">
                Esta ARC ainda não pode ser finalizada. Conclua todos os planos
                de ação dos fatores de risco antes de registrar a decisão final.
                Progresso atual:{" "}
                {finalizacaoEditando.percentualConclusaoTratativa || 0}%.
              </div>
            )}

            <div className="mt-5 flex flex-col justify-end gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => setFinalizacaoEditando(null)}
                className="rounded-xl border border-slate-700 px-5 py-3 text-sm font-black text-slate-200 hover:text-white"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={salvando || finalizacaoBloqueada}
                onClick={salvarFinalizacao}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-black text-white hover:bg-emerald-500 disabled:opacity-60"
              >
                <CheckCircle2 size={16} />
                Confirmar finalização
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
