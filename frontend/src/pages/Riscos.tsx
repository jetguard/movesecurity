import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { api } from "../services/api";
import { PdfLightbox } from "../components/ui/PdfLightbox";

type RiscoCatalogo = {
  id: number;
  numero: number;
  ano?: number;
  codigo: string;
  unidade: string;
  local?: string | null;
  area?: string | null;
  nome: string;
  tipoRisco: string;
  grauRisco: string;
  origemRisco?: string | null;
  fonteRisco?: string | null;
  fatorRisco?: string | null;
  fragilidade?: string | null;
  eventoIncerteza?: string | null;
  objetivoImpactado?: string | null;
  responsavelNome?: string | null;
  descricaoRisco: string;
  possivelImpacto: string;
  medidasPreventivas?: string | null;
  planoAcaoSugerido?: string | null;
  status: string;
  createdAt?: string;
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
  area?: string | null;
  tipoRisco: string;
  tituloRisco?: string | null;
  origemRisco?: string | null;
  fonteRisco?: string | null;
  fatorRisco?: string | null;
  fragilidade?: string | null;
  eventoIncerteza?: string | null;
  objetivoImpactado?: string | null;
  eficaciaControles?: string | null;
  criteriosAvaliacao?: string | null;
  controlesInternos?: string | null;
  atividadesControle?: string | null;
  monitoramento?: string | null;
  comunicacaoConsulta?: string | null;
  descricaoRisco: string;
  possivelImpacto: string;
  causaProvavel?: string | null;
  consequencia?: string | null;
  pessoasAfetadas?: string | null;
  controlesExistentes?: string | null;
  probabilidade: string;
  severidade: string;
  probabilidadeValor?: number | null;
  impactoValor?: number | null;
  resultadoRisco?: number | null;
  nivelRisco: string;
  nivelAceitacao?: string | null;
  tratamentoRisco?: string | null;
  medidasPreventivas: string;
  planoAcao: string;
  acaoProposta?: string | null;
  responsavelAcaoNome?: string | null;
  prazo: string;
  custoEstimado?: string | null;
  prioridade?: string | null;
  statusAcao?: string | null;
  observacoes?: string | null;
  novaProbabilidade?: number | null;
  novoImpacto?: number | null;
  novoResultado?: number | null;
  novoNivelRisco?: string | null;
  observacaoReavaliacao?: string | null;
  dataReavaliacao?: string | null;
  responsavelReavaliacao?: string | null;
  status: string;
  anulado?: boolean;
  motivoAnulacao?: string | null;
  createdAt?: string;
  updatedAt?: string;
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

const abas = [
  "Dashboard de Riscos",
  "Riscos Identificados",
  "Nova Análise",
  "Plano de Tratamento",
  "Reavaliações",
] as const;
type Aba = (typeof abas)[number];

const categorias = ["Operacional", "Imagem / reputação", "Legal", "Integridade", "Financeiro / orçamentário", "Patrimonial", "Segurança do Trabalho", "Ambiental", "TI", "Compliance", "Logística"];
const unidades = ["GJA-T1", "GJA-T2", "ITAJAÍ-SC", "SUAPE-T1", "SUAPE-T2", "ANHANGUERA"];
const statusRisco = ["Aberto", "Em análise", "Em tratamento", "Aguardando ação", "Concluído", "Reavaliado", "Encerrado", "Anulado"];
const niveis = ["Baixo", "Moderado", "Alto", "Crítico"];
const aceitacoes = ["Aceito", "Aceito com monitoramento", "Não aceito"];
const tratamentos = ["Evitar", "Compartilhar", "Mitigar", "Aceitar"];
const fontesRisco = ["Pessoas", "Processos", "Sistemas", "Tecnologia", "Infraestrutura", "Eventos externos"];
const metodosIdentificacao = ["Ishikawa", "Bow Tie", "Inspeção", "Ocorrência", "Investigação", "CFTV", "Auditoria", "Checklist", "Análise operacional", "Outro"];
const escalasProbabilidade = [
  { label: "Muito Baixa", valor: 1, descricao: "Evento excepcional, sem indicação imediata de ocorrência." },
  { label: "Baixa", valor: 3, descricao: "Possibilidade remota no contexto atual." },
  { label: "Moderada", valor: 5, descricao: "Possibilidade mediana de ocorrência." },
  { label: "Alta", valor: 7, descricao: "Possibilidade significativa de ocorrência." },
  { label: "Muito Alta", valor: 9, descricao: "Possibilidade concreta e inequívoca de ocorrência." },
];
const escalasImpacto = [
  { label: "Muito Baixo", valor: 0.5, descricao: "Impacto inexistente ou incidental." },
  { label: "Baixo", valor: 1, descricao: "Impacto pequeno nos objetivos, imagem ou orçamento." },
  { label: "Moderado", valor: 2, descricao: "Impacta moderadamente os objetivos, imagem ou orçamento." },
  { label: "Alto", valor: 4, descricao: "Impacta fortemente os objetivos, imagem ou orçamento." },
  { label: "Muito Alto", valor: 8, descricao: "Impacto extremo ou fatal aos objetivos, imagem ou orçamento." },
];
const orientacoesTratamento: Record<string, { titulo: string; descricao: string; exemplos: string[] }> = {
  Evitar: {
    titulo: "Descontinuar a atividade ou eliminar o evento de risco",
    descricao: "Use quando nenhuma resposta razoável reduz a exposição a nível aceitável, exigindo remoção da causa ou interrupção do cenário.",
    exemplos: ["Bloquear um acesso sem controle", "Interditar uma escada sem guarda-corpo", "Remover uma condição insegura da operação"],
  },
  Mitigar: {
    titulo: "Diminuir probabilidade ou impacto",
    descricao: "Resposta mais comum: criar ou reforçar controles internos para reduzir a probabilidade, o impacto ou ambos.",
    exemplos: ["Instalar câmeras e iluminação", "Aumentar rondas", "Treinar equipes ou criar procedimento operacional"],
  },
  Compartilhar: {
    titulo: "Compartilhar ou transferir parte do risco",
    descricao: "Use quando parte da exposição será compartilhada com terceiros, contratos, seguros ou fornecedores especializados.",
    exemplos: ["Contratar seguro patrimonial", "Ter manutenção terceirizada", "Contratar vigilância especializada"],
  },
  Aceitar: {
    titulo: "Conviver com o risco dentro do apetite",
    descricao: "Use quando o risco já está em nível aceitável, sem novas medidas imediatas, mas com monitoramento documentado.",
    exemplos: ["Oscilação temporária de internet", "Atrasos em dias de chuva", "Risco baixo mantido em monitoramento"],
  },
};
const prioridades = ["Baixa", "Média", "Alta", "Urgente"];
const statusAcao = ["Pendente", "Em andamento", "Concluída", "Atrasada", "Cancelada"];
const origens = metodosIdentificacao;
const setores = ["Operacional", "Segurança Patrimonial", "CFTV", "Portaria", "Gate", "Armazém", "Pátio", "Administrativo", "Manutenção", "TI", "Compliance", "Outro"];

const riscoVazio = {
  dataHora: new Date().toISOString().slice(0, 16),
  unidade: "GJA-T1",
  setor: "",
  local: "",
  area: "",
  riscoCatalogoId: "",
  tipoRisco: "Patrimonial",
  tituloRisco: "",
  origemRisco: "Inspeção",
  fonteRisco: "Processos",
  fatorRisco: "",
  fragilidade: "",
  eventoIncerteza: "",
  objetivoImpactado: "",
  eficaciaControles: "Parcialmente eficaz",
  criteriosAvaliacao: "",
  controlesInternos: "",
  atividadesControle: "",
  monitoramento: "",
  comunicacaoConsulta: "",
  naturezaRisco: "",
  descricaoRisco: "",
  possivelImpacto: "",
  causaProvavel: "",
  consequencia: "",
  pessoasAfetadas: "",
  controlesExistentes: "",
  probabilidadeValor: "1",
  impactoValor: "1",
  probabilidade: "Muito Baixa",
  severidade: "Baixo",
  nivelAceitacao: "Aceito",
  tratamentoRisco: "Mitigar",
  medidasPreventivas: "",
  planoAcao: "",
  acaoProposta: "",
  responsavelAcaoNome: "",
  prazo: "",
  custoEstimado: "",
  prioridade: "Média",
  statusAcao: "Pendente",
  observacoes: "",
  novaProbabilidade: "",
  novoImpacto: "",
  observacaoReavaliacao: "",
  dataReavaliacao: "",
  responsavelReavaliacao: "",
  status: "Aberto",
  motivoAnulacao: "",
  ocorrenciaId: "",
  eventoId: "",
  investigacaoId: "",
};

const catalogoVazio = {
  id: 0,
  unidade: "GJA-T1",
  local: "",
  area: "",
  nome: "",
  tipoRisco: "Patrimonial",
  grauRisco: "Moderado",
  origemRisco: "Inspeção",
  fonteRisco: "Processos",
  fatorRisco: "",
  fragilidade: "",
  eventoIncerteza: "",
  objetivoImpactado: "",
  responsavelNome: "",
  descricaoRisco: "",
  possivelImpacto: "",
  medidasPreventivas: "",
  planoAcaoSugerido: "",
  status: "Aberto",
};

function probabilidadeParaTexto(valor: string | number) {
  const numero = Number(valor);
  return escalasProbabilidade.find((item) => item.valor === numero)?.label || "Muito Baixa";
}

function impactoParaTexto(valor: string | number) {
  const numero = Number(valor);
  return escalasImpacto.find((item) => item.valor === numero)?.label || "Baixo";
}

function calcularNivelResultado(resultado: number) {
  if (resultado <= 8) return "Baixo";
  if (resultado <= 20) return "Moderado";
  if (resultado <= 40) return "Alto";
  return "Crítico";
}

function apetitePorNivel(nivel: string) {
  if (nivel === "Crítico" || nivel === "Alto") return "Não aceito";
  if (nivel === "Moderado") return "Aceito com monitoramento";
  return "Aceito";
}

function textoDescricaoRisco(causa: string, evento: string, consequencia: string, objetivo: string) {
  return [
    causa ? `Devido a ${causa}` : "Devido às causas/fontes informadas",
    evento ? `poderá acontecer ${evento}` : "poderá ocorrer a incerteza descrita",
    consequencia ? `o que poderá levar a ${consequencia}` : "com possibilidade de consequência operacional",
    objetivo ? `impactando ${objetivo}.` : "impactando os objetivos da operação.",
  ].join(", ");
}

function corNivel(nivel: string) {
  if (nivel === "Crítico") return "border-red-200 bg-red-50 text-red-700";
  if (nivel === "Alto") return "border-orange-200 bg-orange-50 text-orange-700";
  if (nivel === "Moderado") return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-emerald-200 bg-emerald-50 text-emerald-700";
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

function dataCurta(valor?: string | null) {
  if (!valor) return "-";
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return "-";
  return data.toLocaleDateString("pt-BR");
}

function mascaraReais(valor: string) {
  const digitos = valor.replace(/\D/g, "");
  const numero = Number(digitos || "0") / 100;
  return numero.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function contarPor<T>(itens: T[], chave: (item: T) => string | undefined | null) {
  return itens.reduce<Record<string, number>>((acc, item) => {
    const nome = chave(item) || "Não informado";
    acc[nome] = (acc[nome] || 0) + 1;
    return acc;
  }, {});
}

function mediaDiasTratamento(riscos: Risco[]) {
  const concluidos = riscos.filter((risco) => ["Concluído", "Reavaliado", "Encerrado"].includes(risco.status) && risco.createdAt && risco.updatedAt);
  if (!concluidos.length) return 0;
  const total = concluidos.reduce((acc, risco) => {
    const inicio = new Date(risco.createdAt || "").getTime();
    const fim = new Date(risco.updatedAt || "").getTime();
    return acc + Math.max(0, fim - inicio) / 86400000;
  }, 0);
  return Math.round(total / concluidos.length);
}

const coresNivel: Record<string, string> = {
  Baixo: "#10b981",
  Moderado: "#f59e0b",
  Alto: "#f97316",
  Crítico: "#ef4444",
};
const coresGrafico = ["#2563eb", "#0f766e", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#84cc16", "#f97316"];

function paraGrafico(dados: Array<[string, number]>, limite = 8) {
  return dados
    .map(([nome, valor]) => ({ nome, valor }))
    .sort((a, b) => b.valor - a.valor)
    .slice(0, limite);
}

export default function Riscos() {
  const [aba, setAba] = useState<Aba>("Dashboard de Riscos");
  const [riscos, setRiscos] = useState<Risco[]>([]);
  const [catalogo, setCatalogo] = useState<RiscoCatalogo[]>([]);
  const [form, setForm] = useState({ ...riscoVazio });
  const [catalogoForm, setCatalogoForm] = useState({ ...catalogoVazio });
  const [fotos, setFotos] = useState<File[]>([]);
  const [editando, setEditando] = useState<Risco | null>(null);
  const [editandoCatalogoId, setEditandoCatalogoId] = useState<number | null>(null);
  const [abrirCadastroCatalogo, setAbrirCadastroCatalogo] = useState(false);
  const [filtroUnidade, setFiltroUnidade] = useState("");
  const [filtroLocal, setFiltroLocal] = useState("");
  const [filtroCategoria, setFiltroCategoria] = useState("");
  const [filtroNivel, setFiltroNivel] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("");
  const [filtroResponsavel, setFiltroResponsavel] = useState("");
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
    setRiscos(Array.isArray(riscosResponse.data) ? riscosResponse.data : []);
    setCatalogo(Array.isArray(catalogoResponse.data) ? catalogoResponse.data : []);
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

  const resultadoInicial = Number(form.probabilidadeValor || 1) * Number(form.impactoValor || 1);
  const nivelInicial = calcularNivelResultado(resultadoInicial);
  const resultadoResidual = form.novaProbabilidade && form.novoImpacto ? Number(form.novaProbabilidade) * Number(form.novoImpacto) : 0;
  const nivelResidual = resultadoResidual ? calcularNivelResultado(resultadoResidual) : "";
  const riscosAtivosCatalogo = catalogo.filter((item) => item.status !== "Inativo" && item.status !== "Anulado");

  const riscosFiltrados = riscos.filter((risco) => {
    return (
      (!filtroUnidade || risco.unidade === filtroUnidade) &&
      (!filtroLocal || risco.local === filtroLocal) &&
      (!filtroCategoria || risco.tipoRisco === filtroCategoria) &&
      (!filtroNivel || risco.nivelRisco === filtroNivel) &&
      (!filtroStatus || risco.status === filtroStatus) &&
      (!filtroResponsavel || (risco.responsavelAcaoNome || "").toLowerCase().includes(filtroResponsavel.toLowerCase()))
    );
  });

  const indicadores = useMemo(() => {
    const hoje = new Date();
    return {
      total: riscosFiltrados.length,
      criticos: riscosFiltrados.filter((r) => r.nivelRisco === "Crítico").length,
      altos: riscosFiltrados.filter((r) => r.nivelRisco === "Alto").length,
      moderados: riscosFiltrados.filter((r) => r.nivelRisco === "Moderado").length,
      baixos: riscosFiltrados.filter((r) => r.nivelRisco === "Baixo").length,
      vencidos: riscosFiltrados.filter((r) => !["Concluído", "Reavaliado", "Encerrado", "Anulado"].includes(r.status) && r.prazo && new Date(r.prazo) < hoje).length,
      tempoMedio: mediaDiasTratamento(riscosFiltrados),
    };
  }, [riscosFiltrados]);

  const distribuicaoCategoria = Object.entries(contarPor(riscosFiltrados, (r) => r.tipoRisco));
  const distribuicaoUnidade = Object.entries(contarPor(riscosFiltrados, (r) => r.unidade));
  const distribuicaoLocal = Object.entries(contarPor(riscosFiltrados, (r) => r.local));
  const distribuicaoResponsavel = Object.entries(contarPor(riscosFiltrados, (r) => r.responsavelAcaoNome));
  const evolucaoMensal = Object.entries(contarPor(riscosFiltrados, (r) => {
    const data = new Date(r.dataHora);
    return Number.isNaN(data.getTime()) ? "Sem data" : `${String(data.getMonth() + 1).padStart(2, "0")}/${data.getFullYear()}`;
  }));
  const graficoNivel = niveis.map((nivel) => ({ nome: nivel, valor: riscosFiltrados.filter((r) => r.nivelRisco === nivel).length }));
  const graficoStatus = paraGrafico(Object.entries(contarPor(riscosFiltrados, (r) => r.status)), 10);
  const graficoCategoria = paraGrafico(distribuicaoCategoria, 7);
  const graficoTratamento = tratamentos.map((tratamento) => ({ nome: tratamento, valor: riscosFiltrados.filter((r) => r.tratamentoRisco === tratamento).length }));
  const graficoEvolucao = evolucaoMensal
    .map(([mes, total]) => ({ mes, total }))
    .sort((a, b) => {
      const [mesA, anoA] = a.mes.split("/").map(Number);
      const [mesB, anoB] = b.mes.split("/").map(Number);
      if (!anoA || !anoB) return a.mes.localeCompare(b.mes);
      return anoA === anoB ? mesA - mesB : anoA - anoB;
    });
  const graficoAntesDepois = niveis.map((nivel) => ({
    nome: nivel,
    inicial: riscosFiltrados.filter((r) => r.nivelRisco === nivel).length,
    residual: riscosFiltrados.filter((r) => r.novoNivelRisco === nivel).length,
  }));
  const riscosVencidosPorResponsavel = Object.entries(contarPor(
    riscosFiltrados.filter((r) => !["Concluído", "Reavaliado", "Encerrado", "Anulado"].includes(r.status) && r.prazo && new Date(r.prazo) < new Date()),
    (r) => r.responsavelAcaoNome,
  ));

  function campo(nome: string, valor: string) {
    if (nome === "riscoCatalogoId") {
      const riscoSelecionado = catalogo.find((item) => item.id === Number(valor));
      setForm((atual) => ({
        ...atual,
        riscoCatalogoId: valor,
        unidade: riscoSelecionado?.unidade || atual.unidade,
        local: riscoSelecionado?.local || atual.local,
        area: riscoSelecionado?.area || atual.area,
        tipoRisco: riscoSelecionado?.tipoRisco || atual.tipoRisco,
        tituloRisco: riscoSelecionado?.nome || atual.tituloRisco,
        origemRisco: riscoSelecionado?.origemRisco || atual.origemRisco,
        fonteRisco: riscoSelecionado?.fonteRisco || atual.fonteRisco,
        fatorRisco: riscoSelecionado?.fatorRisco || atual.fatorRisco,
        fragilidade: riscoSelecionado?.fragilidade || atual.fragilidade,
        eventoIncerteza: riscoSelecionado?.eventoIncerteza || atual.eventoIncerteza,
        objetivoImpactado: riscoSelecionado?.objetivoImpactado || atual.objetivoImpactado,
        descricaoRisco: riscoSelecionado?.descricaoRisco || atual.descricaoRisco,
        possivelImpacto: riscoSelecionado?.possivelImpacto || atual.possivelImpacto,
        medidasPreventivas: riscoSelecionado?.medidasPreventivas || atual.medidasPreventivas,
        planoAcao: riscoSelecionado?.planoAcaoSugerido || atual.planoAcao,
      }));
      return;
    }

    setForm((atual) => {
      const proximo = { ...atual, [nome]: nome === "custoEstimado" ? mascaraReais(valor) : valor };
      if (["fatorRisco", "fragilidade", "eventoIncerteza", "consequencia", "objetivoImpactado"].includes(nome)) {
        const causa = [proximo.fatorRisco, proximo.fragilidade].filter(Boolean).join(" / ");
        proximo.descricaoRisco = textoDescricaoRisco(causa, proximo.eventoIncerteza, proximo.consequencia, proximo.objetivoImpactado);
      }
      if (["probabilidadeValor", "impactoValor"].includes(nome)) {
        const resultado = Number(proximo.probabilidadeValor || 1) * Number(proximo.impactoValor || 1);
        proximo.nivelAceitacao = apetitePorNivel(calcularNivelResultado(resultado));
      }
      return proximo;
    });
  }

  function campoCatalogo(nome: string, valor: string) {
    setCatalogoForm((atual) => ({ ...atual, [nome]: valor }));
  }

  function novaAnalise() {
    setForm({ ...riscoVazio, dataHora: new Date().toISOString().slice(0, 16) });
    setEditando(null);
    setFotos([]);
    setVinculoEncontrado(null);
    setAba("Nova Análise");
    window.setTimeout(() => formularioRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 60);
  }

  function editarAnalise(risco: Risco) {
    setEditando(risco);
    setForm({
      ...riscoVazio,
      ...risco,
      riscoCatalogoId: risco.riscoCatalogoId ? String(risco.riscoCatalogoId) : "",
      area: risco.area || "",
      tituloRisco: risco.tituloRisco || risco.riscoCatalogo?.nome || "",
      origemRisco: risco.origemRisco || "Inspeção",
      fonteRisco: risco.fonteRisco || risco.riscoCatalogo?.fonteRisco || "Processos",
      fatorRisco: risco.fatorRisco || risco.riscoCatalogo?.fatorRisco || "",
      fragilidade: risco.fragilidade || risco.riscoCatalogo?.fragilidade || "",
      eventoIncerteza: risco.eventoIncerteza || risco.riscoCatalogo?.eventoIncerteza || "",
      objetivoImpactado: risco.objetivoImpactado || risco.riscoCatalogo?.objetivoImpactado || "",
      eficaciaControles: risco.eficaciaControles || "Parcialmente eficaz",
      criteriosAvaliacao: risco.criteriosAvaliacao || "",
      controlesInternos: risco.controlesInternos || "",
      atividadesControle: risco.atividadesControle || "",
      monitoramento: risco.monitoramento || "",
      comunicacaoConsulta: risco.comunicacaoConsulta || "",
      causaProvavel: risco.causaProvavel || "",
      consequencia: risco.consequencia || "",
      pessoasAfetadas: risco.pessoasAfetadas || "",
      controlesExistentes: risco.controlesExistentes || "",
      probabilidadeValor: String(risco.probabilidadeValor || 1),
      impactoValor: String(risco.impactoValor || 1),
      nivelAceitacao: risco.nivelAceitacao || "Aceito",
      tratamentoRisco: risco.tratamentoRisco || "Reduzir",
      acaoProposta: risco.acaoProposta || risco.planoAcao || "",
      responsavelAcaoNome: risco.responsavelAcaoNome || "",
      medidasPreventivas: risco.medidasPreventivas || "",
      planoAcao: risco.planoAcao || "",
      custoEstimado: risco.custoEstimado || "",
      prioridade: risco.prioridade || "Média",
      statusAcao: risco.statusAcao || "Pendente",
      observacoes: risco.observacoes || "",
      novaProbabilidade: risco.novaProbabilidade ? String(risco.novaProbabilidade) : "",
      novoImpacto: risco.novoImpacto ? String(risco.novoImpacto) : "",
      observacaoReavaliacao: risco.observacaoReavaliacao || "",
      dataReavaliacao: risco.dataReavaliacao ? risco.dataReavaliacao.slice(0, 16) : "",
      responsavelReavaliacao: risco.responsavelReavaliacao || "",
      motivoAnulacao: risco.motivoAnulacao || "",
      dataHora: risco.dataHora.slice(0, 16),
      prazo: risco.prazo ? risco.prazo.slice(0, 16) : "",
    });
    setFotos([]);
    setVinculoEncontrado(null);
    setAba("Nova Análise");
  }

  function editarCatalogo(item: RiscoCatalogo) {
    setCatalogoForm({
      id: item.id,
      unidade: item.unidade,
      local: item.local || "",
      area: item.area || "",
      nome: item.nome,
      tipoRisco: item.tipoRisco,
      grauRisco: item.grauRisco || "Moderado",
      origemRisco: item.origemRisco || "Inspeção",
      fonteRisco: item.fonteRisco || "Processos",
      fatorRisco: item.fatorRisco || "",
      fragilidade: item.fragilidade || "",
      eventoIncerteza: item.eventoIncerteza || "",
      objetivoImpactado: item.objetivoImpactado || "",
      responsavelNome: item.responsavelNome || "",
      descricaoRisco: item.descricaoRisco,
      possivelImpacto: item.possivelImpacto,
      medidasPreventivas: item.medidasPreventivas || "",
      planoAcaoSugerido: item.planoAcaoSugerido || "",
      status: item.status,
    });
    setEditandoCatalogoId(item.id);
    setAbrirCadastroCatalogo(true);
    setAba("Riscos Identificados");
  }

  async function salvarCatalogo(e: FormEvent) {
    e.preventDefault();
    const payload = {
      ...catalogoForm,
      naturezaRisco: catalogoForm.tipoRisco,
      possivelImpacto: catalogoForm.possivelImpacto || catalogoForm.descricaoRisco,
    };

    try {
      if (editandoCatalogoId) await api.put(`/riscos/catalogo/${editandoCatalogoId}`, payload);
      else await api.post("/riscos/catalogo", payload);
      setCatalogoForm({ ...catalogoVazio });
      setEditandoCatalogoId(null);
      setAbrirCadastroCatalogo(false);
      carregarRiscos();
    } catch (error: unknown) {
      const apiError = error as { response?: { data?: { error?: string } } };
      alert(apiError.response?.data?.error || "Erro ao salvar risco identificado.");
    }
  }

  async function inativarCatalogo(id: number) {
    if (!confirm("Inativar este risco identificado? O registro será preservado para auditoria.")) return;
    await api.delete(`/riscos/catalogo/${id}`);
    carregarRiscos();
  }

  async function salvarRisco(e: FormEvent) {
    e.preventDefault();
    const payload = {
      ...form,
      probabilidade: probabilidadeParaTexto(form.probabilidadeValor),
      severidade: impactoParaTexto(form.impactoValor),
      nivelRisco: nivelInicial,
      resultadoRisco: resultadoInicial,
      novoResultado: resultadoResidual || "",
      novoNivelRisco: nivelResidual,
      nivelAceitacao: form.nivelAceitacao || apetitePorNivel(nivelInicial),
      possivelImpacto: form.consequencia || form.possivelImpacto || form.descricaoRisco,
      planoAcao: form.acaoProposta || form.planoAcao || "Acao nao informada",
      medidasPreventivas: form.controlesInternos || form.controlesExistentes || form.medidasPreventivas || "Nao informado",
    };

    if (editando) {
      await api.put(`/riscos/${editando.id}`, payload);
    } else {
      const formData = new FormData();
      Object.entries(payload).forEach(([chave, valor]) => formData.append(chave, String(valor || "")));
      fotos.forEach((foto) => formData.append("fotos", foto));
      await api.post("/riscos", formData, { headers: { "Content-Type": "multipart/form-data" } });
    }

    setForm({ ...riscoVazio, dataHora: new Date().toISOString().slice(0, 16) });
    setEditando(null);
    setFotos([]);
    setAba("Plano de Tratamento");
    carregarRiscos();
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
      const dados = response.data as DadosVinculo;
      setForm((atual) => ({
        ...atual,
        local: dados.local || atual.local,
        origemRisco: dados.origem || atual.origemRisco,
        ocorrenciaId: dados.ocorrenciaCodigo || (dados.ocorrenciaId ? String(dados.ocorrenciaId) : atual.ocorrenciaId),
        eventoId: dados.eventoCodigo || (dados.eventoId ? String(dados.eventoId) : atual.eventoId),
        investigacaoId: dados.investigacaoCodigo || (dados.investigacaoId ? String(dados.investigacaoId) : atual.investigacaoId),
        descricaoRisco: atual.descricaoRisco || [`Risco vinculado ao ${dados.origem.toLowerCase()} ${dados.codigo}.`, dados.assunto ? `Assunto: ${dados.assunto}` : ""].filter(Boolean).join("\n"),
      }));
      setVinculoEncontrado(dados);
    } catch (error: unknown) {
      const apiError = error as { response?: { data?: { error?: string } } };
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

  function PainelIndicador({ titulo, valor, destaque = "" }: { titulo: string; valor: string | number; destaque?: string }) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <p className="text-xs font-bold uppercase text-slate-400">{titulo}</p>
        <p className={`mt-1 text-2xl font-bold ${destaque}`}>{valor}</p>
      </div>
    );
  }

  function Ranking({ titulo, dados }: { titulo: string; dados: Array<[string, number]> }) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <h3 className="mb-3 font-bold text-slate-900 dark:text-white">{titulo}</h3>
        <div className="max-h-48 space-y-3 overflow-y-auto pr-1">
          {dados.slice(0, 12).map(([nome, total]) => (
            <div key={nome}>
              <div className="flex justify-between text-sm text-slate-700 dark:text-slate-200"><span>{nome}</span><strong>{total}</strong></div>
              <div className="mt-1 h-2 rounded bg-slate-100 dark:bg-slate-800"><div className="h-2 rounded bg-blue-600" style={{ width: `${Math.min(total * 14, 100)}%` }} /></div>
            </div>
          ))}
          {!dados.length && <p className="text-sm text-slate-500">Sem dados para exibir.</p>}
        </div>
      </div>
    );
  }

  function GraficoRosca({ titulo, dados, cores = coresGrafico }: { titulo: string; dados: Array<{ nome: string; valor: number }>; cores?: string[] }) {
    const total = dados.reduce((acc, item) => acc + item.valor, 0);
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 className="font-bold text-slate-900 dark:text-white">{titulo}</h3>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">{total} riscos</span>
        </div>
        <div className="h-64">
          {total ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Tooltip />
                <Pie data={dados} dataKey="valor" nameKey="nome" innerRadius={54} outerRadius={86} paddingAngle={3}>
                  {dados.map((item, index) => <Cell key={item.nome} fill={cores[index % cores.length]} />)}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          ) : <p className="text-sm text-slate-500">Sem dados para exibir.</p>}
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
          {dados.map((item, index) => (
            <div key={item.nome} className="flex items-center justify-between gap-2 rounded-md bg-slate-50 px-2 py-1.5 dark:bg-slate-950">
              <span className="flex min-w-0 items-center gap-2"><span className="h-2 w-2 rounded-full" style={{ backgroundColor: cores[index % cores.length] }} /><span className="truncate">{item.nome}</span></span>
              <strong>{item.valor}</strong>
            </div>
          ))}
        </div>
      </div>
    );
  }

  function GraficoBarras({ titulo, dados, cor = "#2563eb" }: { titulo: string; dados: Array<{ nome: string; valor: number }>; cor?: string }) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <h3 className="mb-3 font-bold text-slate-900 dark:text-white">{titulo}</h3>
        <div className="h-64">
          {dados.some((item) => item.valor > 0) ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dados} layout="vertical" margin={{ top: 8, right: 18, left: 12, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(148, 163, 184, 0.22)" />
                <XAxis type="number" allowDecimals={false} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#94a3b8" }} />
                <YAxis dataKey="nome" type="category" width={112} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#94a3b8" }} />
                <Tooltip />
                <Bar dataKey="valor" name="Quantidade" fill={cor} radius={[0, 8, 8, 0]} barSize={18} />
              </BarChart>
            </ResponsiveContainer>
          ) : <p className="text-sm text-slate-500">Sem dados para exibir.</p>}
        </div>
      </div>
    );
  }

  function GraficoEvolucao() {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-4 lg:col-span-2 dark:border-slate-800 dark:bg-slate-900">
        <h3 className="mb-3 font-bold text-slate-900 dark:text-white">Evolução mensal dos riscos</h3>
        <div className="h-64">
          {graficoEvolucao.length ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={graficoEvolucao} margin={{ top: 10, right: 24, left: 0, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.22)" />
                <XAxis dataKey="mes" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#94a3b8" }} />
                <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#94a3b8" }} />
                <Tooltip />
                <Line type="monotone" dataKey="total" name="Riscos" stroke="#2563eb" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : <p className="text-sm text-slate-500">Sem dados para exibir.</p>}
        </div>
      </div>
    );
  }

  function GraficoAntesDepois() {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-4 lg:col-span-2 dark:border-slate-800 dark:bg-slate-900">
        <h3 className="mb-3 font-bold text-slate-900 dark:text-white">Antes x depois da reavaliação</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={graficoAntesDepois} margin={{ top: 10, right: 24, left: 0, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.22)" />
              <XAxis dataKey="nome" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#94a3b8" }} />
              <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#94a3b8" }} />
              <Tooltip />
              <Bar dataKey="inicial" name="Inicial" fill="#ef4444" radius={[8, 8, 0, 0]} />
              <Bar dataKey="residual" name="Residual" fill="#10b981" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  }

  function DashboardRiscos() {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
          <PainelIndicador titulo="Total" valor={indicadores.total} />
          <PainelIndicador titulo="Críticos" valor={indicadores.criticos} destaque="text-red-600" />
          <PainelIndicador titulo="Altos" valor={indicadores.altos} destaque="text-orange-600" />
          <PainelIndicador titulo="Moderados" valor={indicadores.moderados} destaque="text-amber-600" />
          <PainelIndicador titulo="Baixos" valor={indicadores.baixos} destaque="text-emerald-600" />
          <PainelIndicador titulo="Vencidos" valor={indicadores.vencidos} destaque="text-rose-600" />
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <div className="rounded-lg border border-slate-200 bg-white p-4 xl:col-span-2 dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 dark:text-white">Matriz de risco 5x5</h3>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">Probabilidade x Impacto</span>
            </div>
            <div className="grid grid-cols-5 gap-2">
              {[1, 2, 3, 4, 5].map((prob) => [1, 2, 3, 4, 5].map((impacto) => {
                const resultado = prob * impacto;
                const nivel = calcularNivelResultado(resultado);
                const total = riscosFiltrados.filter((r) => Number(r.probabilidadeValor || 1) === prob && Number(r.impactoValor || 1) === impacto).length;
                return (
                  <div key={`${prob}-${impacto}`} className={`rounded-lg border p-3 text-center ${corNivel(nivel)}`}>
                    <p className="text-xs font-bold">{prob} x {impacto}</p>
                    <p className="text-lg font-black">{total}</p>
                    <p className="text-[11px] font-semibold">{nivel}</p>
                  </div>
                );
              }))}
            </div>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <h3 className="mb-3 font-bold text-slate-900 dark:text-white">Tempo médio de tratamento</h3>
            <p className="text-4xl font-black text-blue-600">{indicadores.tempoMedio} dias</p>
            <p className="mt-2 text-sm text-slate-500">Cálculo baseado em riscos concluídos, reavaliados ou encerrados.</p>
          </div>
        </div>

        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Indicadores analíticos</h2>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">Distribuição do risco</span>
          </div>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-4">
            <GraficoRosca titulo="Riscos por nível" dados={graficoNivel} cores={niveis.map((nivel) => coresNivel[nivel])} />
            <GraficoBarras titulo="Riscos por status" dados={graficoStatus} cor="#0f766e" />
            <GraficoBarras titulo="Riscos por categoria" dados={graficoCategoria} cor="#2563eb" />
            <GraficoRosca titulo="Tratamento adotado" dados={graficoTratamento} cores={["#ef4444", "#2563eb", "#8b5cf6", "#10b981"]} />
          </div>
        </div>

        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Acompanhamento</h2>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">Prazos, evolução e reincidência</span>
          </div>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-4">
            <GraficoEvolucao />
            <GraficoAntesDepois />
            <Ranking titulo="Ranking de locais com mais riscos" dados={distribuicaoLocal} />
            <Ranking titulo="Ações vencidas por responsável" dados={riscosVencidosPorResponsavel} />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
          <Ranking titulo="Riscos por unidade" dados={distribuicaoUnidade} />
          <Ranking titulo="Riscos por responsável" dados={distribuicaoResponsavel} />
        </div>
      </div>
    );
  }

  function TabelaAnalises({ modo }: { modo: "geral" | "plano" | "reavaliacao" }) {
    const dados = modo === "reavaliacao" ? riscosFiltrados.filter((r) => r.novoResultado || r.status === "Reavaliado") : riscosFiltrados;
    return (
      <section className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">{modo === "plano" ? "Plano de tratamento" : modo === "reavaliacao" ? "Reavaliações registradas" : "Análises de riscos cadastradas"}</h2>
            <p className="text-sm text-slate-500">{dados.length} registros encontrados.</p>
          </div>
        </div>
        <div className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800">
          <div className="max-h-[560px] overflow-y-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
              <thead className="sticky top-0 z-10 bg-slate-50 text-left text-xs font-bold uppercase tracking-wide text-slate-500 dark:bg-slate-950 dark:text-slate-400">
                <tr>
                  <th className="px-3 py-3">Código</th>
                  <th className="px-3 py-3">Risco</th>
                  <th className="px-3 py-3">Local</th>
                  <th className="px-3 py-3">Antes</th>
                  {modo === "reavaliacao" && <th className="px-3 py-3">Depois</th>}
                  <th className="px-3 py-3">Status</th>
                  <th className="px-3 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white dark:divide-slate-800 dark:bg-slate-900">
                {dados.map((risco) => (
                  <tr key={risco.id} className="align-top transition-colors hover:bg-slate-800/35 dark:hover:bg-slate-800/45">
                    <td className="whitespace-nowrap px-3 py-3 font-bold text-slate-900 dark:text-white">{risco.codigo}</td>
                    <td className="px-3 py-3">
                      <p className="font-bold text-slate-900 dark:text-white">{risco.tituloRisco || risco.riscoCatalogo?.nome || risco.tipoRisco}</p>
                      <p className="mt-1 line-clamp-2 text-xs text-slate-500">{risco.descricaoRisco}</p>
                    </td>
                    <td className="px-3 py-3 text-slate-600 dark:text-slate-300">{risco.unidade}<br /><span className="text-xs">{risco.local}</span></td>
                    <td className="whitespace-nowrap px-3 py-3">
                      <span className={`rounded-full border px-2 py-1 text-xs font-bold ${corNivel(risco.nivelRisco)}`}>{risco.resultadoRisco || "-"} | {risco.nivelRisco}</span>
                    </td>
                    {modo === "reavaliacao" && (
                      <td className="whitespace-nowrap px-3 py-3">
                        <span className={`rounded-full border px-2 py-1 text-xs font-bold ${corNivel(risco.novoNivelRisco || "Baixo")}`}>{risco.novoResultado || "-"} | {risco.novoNivelRisco || "-"}</span>
                      </td>
                    )}
                    <td className="whitespace-nowrap px-3 py-3"><span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300">{risco.status}</span></td>
                    <td className="px-3 py-3">
                      <div className="flex flex-wrap justify-end gap-2">
                        <button onClick={() => editarAnalise(risco)} className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-bold text-white">Editar</button>
                        <button onClick={() => abrirPdf(risco.id)} className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-bold text-white">PDF</button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!dados.length && (
                  <tr>
                    <td colSpan={modo === "reavaliacao" ? 7 : 6} className="px-3 py-6 text-center text-sm text-slate-500">Nenhum registro encontrado.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    );
  }

  function CadastroRiscosIdentificados() {
    return (
      <div className="space-y-4">
        <section className="rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Cadastro do risco identificado</h2>
              <p className="text-sm text-slate-500">Abra a sanfona para cadastrar ou editar a base de riscos.</p>
            </div>
            <button
              type="button"
              onClick={() => {
                setCatalogoForm({ ...catalogoVazio });
                setEditandoCatalogoId(null);
                setAbrirCadastroCatalogo(true);
              }}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700"
            >
              Cadastrar risco identificado
            </button>
          </div>
          {abrirCadastroCatalogo && (
            <form onSubmit={salvarCatalogo} className="border-t border-slate-200 p-5 dark:border-slate-800">
              <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">{editandoCatalogoId ? "Editar risco identificado" : "Novo risco identificado"}</h3>
                  <p className="text-sm text-slate-500">Código automático no padrão RISCO-0001/2026.</p>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
                <Label texto="Data do cadastro"><input className={campoClasse()} value={new Date().toLocaleDateString("pt-BR")} disabled /></Label>
                <Label texto="Unidade"><select className={campoClasse()} value={catalogoForm.unidade} onChange={(e) => campoCatalogo("unidade", e.target.value)}>{unidades.map((item) => <option key={item}>{item}</option>)}</select></Label>
                <Label texto="Local"><select className={campoClasse()} value={catalogoForm.local} onChange={(e) => campoCatalogo("local", e.target.value)}><option value="">Selecione</option>{locais.map((local) => <option key={local.id} value={local.nome}>{local.nome}</option>)}</select></Label>
                <Label texto="Área"><input className={campoClasse()} value={catalogoForm.area} onChange={(e) => campoCatalogo("area", e.target.value)} placeholder="Ex.: Portaria, pátio, gate" /></Label>
                <Label texto="Categoria do risco"><select className={campoClasse()} value={catalogoForm.tipoRisco} onChange={(e) => campoCatalogo("tipoRisco", e.target.value)}>{categorias.map((item) => <option key={item}>{item}</option>)}</select></Label>
                <Label texto="Título do risco" className="lg:col-span-2"><input className={campoClasse()} value={catalogoForm.nome} onChange={(e) => campoCatalogo("nome", e.target.value)} required /></Label>
                <Label texto="Origem do risco"><select className={campoClasse()} value={catalogoForm.origemRisco} onChange={(e) => campoCatalogo("origemRisco", e.target.value)}>{origens.map((item) => <option key={item}>{item}</option>)}</select></Label>
                <Label texto="Fonte / fator de risco"><select className={campoClasse()} value={catalogoForm.fonteRisco} onChange={(e) => campoCatalogo("fonteRisco", e.target.value)}>{fontesRisco.map((item) => <option key={item}>{item}</option>)}</select></Label>
                <Label texto="Causa / fator específico"><input className={campoClasse()} value={catalogoForm.fatorRisco} onChange={(e) => campoCatalogo("fatorRisco", e.target.value)} placeholder="Ex.: baixa aderência ao procedimento" /></Label>
                <Label texto="Fragilidade"><input className={campoClasse()} value={catalogoForm.fragilidade} onChange={(e) => campoCatalogo("fragilidade", e.target.value)} placeholder="Ex.: processo imaturo, sistema obsoleto" /></Label>
                <Label texto="Objetivo impactado"><input className={campoClasse()} value={catalogoForm.objetivoImpactado} onChange={(e) => campoCatalogo("objetivoImpactado", e.target.value)} placeholder="Ex.: continuidade operacional" /></Label>
                <Label texto="Responsável"><input className={campoClasse()} value={catalogoForm.responsavelNome} onChange={(e) => campoCatalogo("responsavelNome", e.target.value)} /></Label>
                <Label texto="Status"><select className={campoClasse()} value={catalogoForm.status} onChange={(e) => campoCatalogo("status", e.target.value)}>{statusRisco.map((item) => <option key={item}>{item}</option>)}</select></Label>
                <Label texto="Grau inicial"><select className={campoClasse()} value={catalogoForm.grauRisco} onChange={(e) => campoCatalogo("grauRisco", e.target.value)}>{niveis.map((item) => <option key={item}>{item}</option>)}</select></Label>
                <Label texto="Evento / incerteza" className="lg:col-span-2"><input className={campoClasse()} value={catalogoForm.eventoIncerteza} onChange={(e) => campoCatalogo("eventoIncerteza", e.target.value)} placeholder="Ex.: acesso indevido de pessoa não autorizada" /></Label>
                <Label texto="Descrição do risco identificado" className="lg:col-span-4"><textarea className={campoClasse()} rows={3} value={catalogoForm.descricaoRisco} onChange={(e) => campoCatalogo("descricaoRisco", e.target.value)} required /></Label>
                <Label texto="Possível impacto" className="lg:col-span-4"><textarea className={campoClasse()} rows={3} value={catalogoForm.possivelImpacto} onChange={(e) => campoCatalogo("possivelImpacto", e.target.value)} required /></Label>
                <Label texto="Controles ou medidas existentes" className="lg:col-span-2"><textarea className={campoClasse()} rows={3} value={catalogoForm.medidasPreventivas} onChange={(e) => campoCatalogo("medidasPreventivas", e.target.value)} /></Label>
                <Label texto="Plano sugerido" className="lg:col-span-2"><textarea className={campoClasse()} rows={3} value={catalogoForm.planoAcaoSugerido} onChange={(e) => campoCatalogo("planoAcaoSugerido", e.target.value)} /></Label>
              </div>
              <div className="mt-5 flex flex-wrap justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setCatalogoForm({ ...catalogoVazio });
                    setEditandoCatalogoId(null);
                    setAbrirCadastroCatalogo(false);
                  }}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-bold text-slate-600 dark:border-slate-700 dark:text-slate-200"
                >
                  Cancelar
                </button>
                <button className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700">Salvar risco identificado</button>
              </div>
            </form>
          )}
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Riscos identificados cadastrados</h2>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">{catalogo.length} registros</span>
          </div>
          <div className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800">
            <div className="max-h-[560px] overflow-y-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
                <thead className="sticky top-0 z-10 bg-slate-50 text-left text-xs font-bold uppercase tracking-wide text-slate-500 dark:bg-slate-950 dark:text-slate-400">
                  <tr>
                    <th className="px-3 py-3">Código</th>
                    <th className="px-3 py-3">Título</th>
                    <th className="px-3 py-3">Categoria</th>
                    <th className="px-3 py-3">Local</th>
                    <th className="px-3 py-3">Status</th>
                    <th className="px-3 py-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white dark:divide-slate-800 dark:bg-slate-900">
                  {catalogo.map((item) => (
                    <tr key={item.id} className="align-top transition-colors hover:bg-slate-800/35 dark:hover:bg-slate-800/45">
                      <td className="whitespace-nowrap px-3 py-3 font-bold text-slate-900 dark:text-white">{item.codigo}</td>
                      <td className="px-3 py-3"><p className="font-bold text-slate-900 dark:text-white">{item.nome}</p><p className="text-xs text-slate-500">{dataCurta(item.createdAt)}</p></td>
                      <td className="px-3 py-3 text-slate-600 dark:text-slate-300">{item.tipoRisco}</td>
                      <td className="px-3 py-3 text-slate-600 dark:text-slate-300">{item.local || "-"}<br /><span className="text-xs">{item.area || ""}</span></td>
                      <td className="px-3 py-3"><span className={`rounded-full border px-2 py-1 text-xs font-bold ${corNivel(item.grauRisco || "Baixo")}`}>{item.status}</span></td>
                      <td className="px-3 py-3">
                        <div className="flex flex-wrap justify-end gap-2">
                          <button onClick={() => editarCatalogo(item)} className="rounded-md bg-slate-900 px-3 py-1.5 text-xs font-bold text-white dark:bg-slate-700">Editar</button>
                          {item.status !== "Inativo" && <button onClick={() => inativarCatalogo(item.id)} className="rounded-md border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 dark:border-slate-700 dark:text-slate-200">Inativar</button>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>
    );
  }

  function FormularioAnalise() {
    return (
      <form ref={formularioRef} onSubmit={salvarRisco} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">{editando ? `Editar ${editando.codigo}` : "Nova análise de risco"}</h2>
            <p className="text-sm text-slate-500">Fluxo: identificação, análise, classificação, plano, acompanhamento e reavaliação.</p>
          </div>
          <div className={`rounded-lg border px-4 py-2 text-sm font-bold ${corNivel(nivelInicial)}`}>Resultado {resultadoInicial} | {nivelInicial}</div>
        </div>

        <div className="space-y-6">
          <section>
            <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500">1. Identificação</h3>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
              <Label texto="Risco identificado" className="lg:col-span-2"><select className={campoClasse()} value={form.riscoCatalogoId} onChange={(e) => campo("riscoCatalogoId", e.target.value)}><option value="">Análise avulsa</option>{riscosAtivosCatalogo.map((item) => <option key={item.id} value={item.id}>{item.codigo} - {item.nome}</option>)}</select></Label>
              <Label texto="Data da análise"><input type="datetime-local" className={campoClasse()} value={form.dataHora} onChange={(e) => campo("dataHora", e.target.value)} required /></Label>
              <Label texto="Status"><select className={campoClasse()} value={form.status} onChange={(e) => campo("status", e.target.value)}>{statusRisco.map((item) => <option key={item}>{item}</option>)}</select></Label>
              <Label texto="Unidade"><select className={campoClasse()} value={form.unidade} onChange={(e) => campo("unidade", e.target.value)}>{unidades.map((item) => <option key={item}>{item}</option>)}</select></Label>
              <Label texto="Local"><select className={campoClasse()} value={form.local} onChange={(e) => campo("local", e.target.value)} required><option value="">{locais.length ? "Selecione" : "Nenhum local carregado"}</option>{locais.map((local) => <option key={local.id} value={local.nome}>{local.nome}{local.areaSensivel ? " - ÁREA SENSÍVEL" : ""}</option>)}</select>{erroLocais && <button type="button" onClick={carregarLocaisRisco} className="text-xs font-bold text-blue-600">Recarregar locais</button>}</Label>
              <Label texto="Área"><input className={campoClasse()} value={form.area} onChange={(e) => campo("area", e.target.value)} /></Label>
              <Label texto="Categoria"><select className={campoClasse()} value={form.tipoRisco} onChange={(e) => campo("tipoRisco", e.target.value)}>{categorias.map((item) => <option key={item}>{item}</option>)}</select></Label>
              <Label texto="Título do risco" className="lg:col-span-2"><input className={campoClasse()} value={form.tituloRisco} onChange={(e) => campo("tituloRisco", e.target.value)} required /></Label>
              <Label texto="Origem"><select className={campoClasse()} value={form.origemRisco} onChange={(e) => campo("origemRisco", e.target.value)}>{origens.map((item) => <option key={item}>{item}</option>)}</select></Label>
              <Label texto="Setor"><select className={campoClasse()} value={form.setor} onChange={(e) => campo("setor", e.target.value)} required><option value="">Selecione</option>{setores.map((item) => <option key={item}>{item}</option>)}</select></Label>
              <Label texto="Fonte / fator de risco"><select className={campoClasse()} value={form.fonteRisco} onChange={(e) => campo("fonteRisco", e.target.value)}>{fontesRisco.map((item) => <option key={item}>{item}</option>)}</select></Label>
              <Label texto="Causa / fator específico"><input className={campoClasse()} value={form.fatorRisco} onChange={(e) => campo("fatorRisco", e.target.value)} placeholder="Ex.: falha de processo, pessoa, sistema" /></Label>
              <Label texto="Fragilidade"><input className={campoClasse()} value={form.fragilidade} onChange={(e) => campo("fragilidade", e.target.value)} placeholder="Ex.: baixa capacitação, rotina inexistente" /></Label>
              <Label texto="Objetivo impactado"><input className={campoClasse()} value={form.objetivoImpactado} onChange={(e) => campo("objetivoImpactado", e.target.value)} placeholder="Ex.: continuidade operacional" /></Label>
            </div>
          </section>

          <section>
            <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500">2. Análise do risco</h3>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <Label texto="Evento / incerteza" className="lg:col-span-2"><input className={campoClasse()} value={form.eventoIncerteza} onChange={(e) => campo("eventoIncerteza", e.target.value)} placeholder="Ex.: invasão, falha operacional, indisponibilidade, perda" /></Label>
              <Label texto="Descrição técnica automática" className="lg:col-span-2"><textarea className={campoClasse()} rows={3} value={form.descricaoRisco} onChange={(e) => campo("descricaoRisco", e.target.value)} required /></Label>
              <Label texto="Causa provável"><textarea className={campoClasse()} rows={3} value={form.causaProvavel} onChange={(e) => campo("causaProvavel", e.target.value)} /></Label>
              <Label texto="Consequência"><textarea className={campoClasse()} rows={3} value={form.consequencia} onChange={(e) => campo("consequencia", e.target.value)} /></Label>
              <Label texto="Pessoas ou áreas afetadas"><textarea className={campoClasse()} rows={3} value={form.pessoasAfetadas} onChange={(e) => campo("pessoasAfetadas", e.target.value)} /></Label>
              <Label texto="Controles existentes"><textarea className={campoClasse()} rows={3} value={form.controlesExistentes} onChange={(e) => campo("controlesExistentes", e.target.value)} /></Label>
              <Label texto="Eficácia dos controles"><select className={campoClasse()} value={form.eficaciaControles} onChange={(e) => campo("eficaciaControles", e.target.value)}>{["Eficaz", "Parcialmente eficaz", "Ineficaz", "Não existente"].map((item) => <option key={item}>{item}</option>)}</select></Label>
              <Label texto="Critério de avaliação"><input className={campoClasse()} value={form.criteriosAvaliacao} onChange={(e) => campo("criteriosAvaliacao", e.target.value)} placeholder="Ex.: apetite, norma, contrato, SLA" /></Label>
            </div>
          </section>

          <section>
            <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500">3. Classificação automática</h3>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
              <Label texto="Probabilidade"><select className={campoClasse()} value={form.probabilidadeValor} onChange={(e) => campo("probabilidadeValor", e.target.value)}>{escalasProbabilidade.map((item) => <option key={item.valor} value={item.valor}>{item.label} - {item.valor}</option>)}</select></Label>
              <Label texto="Impacto"><select className={campoClasse()} value={form.impactoValor} onChange={(e) => campo("impactoValor", e.target.value)}>{escalasImpacto.map((item) => <option key={item.valor} value={item.valor}>{item.label} - {item.valor}</option>)}</select></Label>
              <Label texto="Resultado"><input className={campoClasse()} value={resultadoInicial} disabled /></Label>
              <Label texto="Nível"><input className={campoClasse()} value={nivelInicial} disabled /></Label>
              <Label texto="Aceitação"><select className={campoClasse()} value={form.nivelAceitacao} onChange={(e) => campo("nivelAceitacao", e.target.value)}>{aceitacoes.map((item) => <option key={item}>{item}</option>)}</select></Label>
              <div className="lg:col-span-5 grid grid-cols-1 gap-3 md:grid-cols-2">
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">
                  <strong>Probabilidade:</strong> {escalasProbabilidade.find((item) => String(item.valor) === String(form.probabilidadeValor))?.descricao}
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">
                  <strong>Impacto:</strong> {escalasImpacto.find((item) => String(item.valor) === String(form.impactoValor))?.descricao}
                </div>
              </div>
              <div className={`lg:col-span-5 rounded-lg border p-4 text-sm font-semibold ${corNivel(nivelInicial)}`}>
                Apetite a risco sugerido: {apetitePorNivel(nivelInicial)}. {nivelInicial === "Crítico" || nivelInicial === "Alto" ? "Risco em zona vermelha, priorizar tratamento." : nivelInicial === "Moderado" ? "Risco em zona amarela, manter observação e reavaliação." : "Risco em zona verde, aceitável com registro e monitoramento proporcional."}
              </div>
            </div>
          </section>

          <section>
            <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500">4. Plano de tratamento e acompanhamento</h3>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
              <Label texto="Tratamento"><select className={campoClasse()} value={form.tratamentoRisco} onChange={(e) => campo("tratamentoRisco", e.target.value)}>{tratamentos.map((item) => <option key={item}>{item}</option>)}</select></Label>
              <Label texto="Responsável pela ação"><input className={campoClasse()} value={form.responsavelAcaoNome} onChange={(e) => campo("responsavelAcaoNome", e.target.value)} required /></Label>
              <Label texto="Prazo"><input type="datetime-local" className={campoClasse()} value={form.prazo} onChange={(e) => campo("prazo", e.target.value)} required /></Label>
              <Label texto="Custo estimado"><input inputMode="decimal" className={campoClasse()} value={form.custoEstimado} onChange={(e) => campo("custoEstimado", e.target.value)} placeholder="0,00" /></Label>
              <Label texto="Prioridade"><select className={campoClasse()} value={form.prioridade} onChange={(e) => campo("prioridade", e.target.value)}>{prioridades.map((item) => <option key={item}>{item}</option>)}</select></Label>
              <Label texto="Status da ação"><select className={campoClasse()} value={form.statusAcao} onChange={(e) => campo("statusAcao", e.target.value)}>{statusAcao.map((item) => <option key={item}>{item}</option>)}</select></Label>
              <Label texto="Ação proposta" className="lg:col-span-2"><input className={campoClasse()} value={form.acaoProposta} onChange={(e) => campo("acaoProposta", e.target.value)} required /></Label>
              <Label texto="Controles internos propostos" className="lg:col-span-2"><textarea className={campoClasse()} rows={3} value={form.controlesInternos} onChange={(e) => campo("controlesInternos", e.target.value)} placeholder="Regras, protocolos, rotinas, aprovações, controles físicos..." /></Label>
              <Label texto="Atividades de controle" className="lg:col-span-2"><textarea className={campoClasse()} rows={3} value={form.atividadesControle} onChange={(e) => campo("atividadesControle", e.target.value)} placeholder="Revisões, autorizações, segregação, verificações, treinamento..." /></Label>
              <Label texto="Monitoramento" className="lg:col-span-2"><textarea className={campoClasse()} rows={3} value={form.monitoramento} onChange={(e) => campo("monitoramento", e.target.value)} placeholder="Como será verificada a efetividade do controle" /></Label>
              <Label texto="Comunicação e consulta" className="lg:col-span-2"><textarea className={campoClasse()} rows={3} value={form.comunicacaoConsulta} onChange={(e) => campo("comunicacaoConsulta", e.target.value)} placeholder="Áreas consultadas, decisões, ciência e retorno das partes interessadas" /></Label>
              <Label texto="Observações" className="lg:col-span-3"><textarea className={campoClasse()} rows={3} value={form.observacoes} onChange={(e) => campo("observacoes", e.target.value)} /></Label>
              {!editando && <Label texto="Evidências anexadas"><input type="file" multiple accept="image/*" className={campoClasse()} onChange={(e) => setFotos(Array.from(e.target.files || []))} /></Label>}
              <div className="lg:col-span-4 rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-950 dark:border-blue-900/70 dark:bg-blue-950/30 dark:text-blue-100">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600 dark:text-blue-300">Orientação do tratamento</p>
                    <h4 className="mt-1 text-base font-bold">{form.tratamentoRisco}: {orientacoesTratamento[form.tratamentoRisco]?.titulo}</h4>
                    <p className="mt-1 text-blue-900/80 dark:text-blue-100/80">{orientacoesTratamento[form.tratamentoRisco]?.descricao}</p>
                  </div>
                  <span className="rounded-full border border-blue-200 bg-white px-3 py-1 text-xs font-bold text-blue-700 dark:border-blue-800 dark:bg-slate-950 dark:text-blue-200">ISO 31000</span>
                </div>
                <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-3">
                  {(orientacoesTratamento[form.tratamentoRisco]?.exemplos || []).map((exemplo) => (
                    <div key={exemplo} className="rounded-md border border-blue-100 bg-white/80 p-2 font-semibold text-blue-900 dark:border-blue-900/60 dark:bg-slate-950/60 dark:text-blue-100">{exemplo}</div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section>
            <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500">5. Reavaliação</h3>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-6">
              <Label texto="Nova probabilidade"><select className={campoClasse()} value={form.novaProbabilidade} onChange={(e) => campo("novaProbabilidade", e.target.value)}><option value="">Não reavaliado</option>{escalasProbabilidade.map((item) => <option key={item.valor} value={item.valor}>{item.label} - {item.valor}</option>)}</select></Label>
              <Label texto="Novo impacto"><select className={campoClasse()} value={form.novoImpacto} onChange={(e) => campo("novoImpacto", e.target.value)}><option value="">Não reavaliado</option>{escalasImpacto.map((item) => <option key={item.valor} value={item.valor}>{item.label} - {item.valor}</option>)}</select></Label>
              <Label texto="Novo resultado"><input className={campoClasse()} value={resultadoResidual || ""} disabled /></Label>
              <Label texto="Novo nível"><input className={campoClasse()} value={nivelResidual} disabled /></Label>
              <Label texto="Data da reavaliação"><input type="datetime-local" className={campoClasse()} value={form.dataReavaliacao} onChange={(e) => campo("dataReavaliacao", e.target.value)} /></Label>
              <Label texto="Responsável"><input className={campoClasse()} value={form.responsavelReavaliacao} onChange={(e) => campo("responsavelReavaliacao", e.target.value)} /></Label>
              <Label texto="Observação da reavaliação" className="lg:col-span-4"><textarea className={campoClasse()} rows={3} value={form.observacaoReavaliacao} onChange={(e) => campo("observacaoReavaliacao", e.target.value)} /></Label>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm dark:border-slate-800 dark:bg-slate-950 lg:col-span-2">
                <p className="font-bold text-slate-900 dark:text-white">Comparação</p>
                <p className="mt-2 text-slate-600 dark:text-slate-300">Antes: P{form.probabilidadeValor} x I{form.impactoValor} = {resultadoInicial} | {nivelInicial}</p>
                <p className="text-slate-600 dark:text-slate-300">Depois: {resultadoResidual ? `P${form.novaProbabilidade} x I${form.novoImpacto} = ${resultadoResidual} | ${nivelResidual}` : "Não reavaliado"}</p>
              </div>
              {form.status === "Anulado" && <Label texto="Motivo da anulação" className="lg:col-span-6"><textarea className={campoClasse()} rows={2} value={form.motivoAnulacao} onChange={(e) => campo("motivoAnulacao", e.target.value)} /></Label>}
            </div>
          </section>

          <section>
            <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500">Integrações futuras</h3>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
              <Label texto="Ocorrência vinculada"><input className={campoClasse()} placeholder="Ex.: 0001/2026" value={form.ocorrenciaId} onBlur={buscarDadosVinculados} onChange={(e) => campo("ocorrenciaId", e.target.value.toUpperCase())} /></Label>
              <Label texto="Investigação vinculada"><input className={campoClasse()} placeholder="Ex.: RI003/2026" value={form.investigacaoId} onBlur={buscarDadosVinculados} onChange={(e) => campo("investigacaoId", e.target.value.toUpperCase())} /></Label>
              <Label texto="Evento vinculado"><input className={campoClasse()} placeholder="Ex.: 0005/2026" value={form.eventoId} onBlur={buscarDadosVinculados} onChange={(e) => campo("eventoId", e.target.value.toUpperCase())} /></Label>
              <div className="flex items-end"><button type="button" onClick={buscarDadosVinculados} disabled={buscandoVinculo || (!form.ocorrenciaId && !form.eventoId && !form.investigacaoId)} className="w-full rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-bold text-white hover:bg-slate-800 disabled:bg-slate-300">{buscandoVinculo ? "Buscando..." : "Buscar vínculo"}</button></div>
            </div>
            {vinculoEncontrado && <div className="mt-3 rounded-lg border border-blue-100 bg-blue-50 p-3 text-sm text-blue-900"><strong>{vinculoEncontrado.origem} {vinculoEncontrado.codigo}</strong> - {vinculoEncontrado.titulo}</div>}
          </section>
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          <button className="rounded-lg bg-green-600 px-4 py-2 text-sm font-bold text-white hover:bg-green-700">Salvar análise de risco</button>
          <button type="button" onClick={() => { setForm({ ...riscoVazio, dataHora: new Date().toISOString().slice(0, 16) }); setEditando(null); }} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-bold text-slate-600 dark:border-slate-700 dark:text-slate-200">Limpar</button>
        </div>
      </form>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-blue-600">Governança operacional</p>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Análise de Risco</h1>
          <p className="mt-1 text-slate-500">Cadastre, classifique, trate, acompanhe e reavalie riscos operacionais.</p>
        </div>
        <button onClick={novaAnalise} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700">Nova análise</button>
      </div>

      <div className="flex flex-wrap gap-2 rounded-lg border border-slate-200 bg-white p-2 dark:border-slate-800 dark:bg-slate-900">
        {abas.map((item) => (
          <button key={item} onClick={() => setAba(item)} className={`rounded-md px-3 py-2 text-sm font-bold transition ${aba === item ? "bg-blue-600 text-white" : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"}`}>{item}</button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-3 rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 md:grid-cols-3 xl:grid-cols-6">
        <Label texto="Unidade"><select value={filtroUnidade} onChange={(e) => setFiltroUnidade(e.target.value)} className={campoClasse()}><option value="">Todas</option>{unidades.map((u) => <option key={u}>{u}</option>)}</select></Label>
        <Label texto="Local"><select value={filtroLocal} onChange={(e) => setFiltroLocal(e.target.value)} className={campoClasse()}><option value="">Todos</option>{locais.map((local) => <option key={local.id} value={local.nome}>{local.nome}</option>)}</select></Label>
        <Label texto="Categoria"><select value={filtroCategoria} onChange={(e) => setFiltroCategoria(e.target.value)} className={campoClasse()}><option value="">Todas</option>{categorias.map((item) => <option key={item}>{item}</option>)}</select></Label>
        <Label texto="Nível"><select value={filtroNivel} onChange={(e) => setFiltroNivel(e.target.value)} className={campoClasse()}><option value="">Todos</option>{niveis.map((item) => <option key={item}>{item}</option>)}</select></Label>
        <Label texto="Status"><select value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value)} className={campoClasse()}><option value="">Todos</option>{statusRisco.map((item) => <option key={item}>{item}</option>)}</select></Label>
        <Label texto="Responsável"><input value={filtroResponsavel} onChange={(e) => setFiltroResponsavel(e.target.value)} className={campoClasse()} placeholder="Buscar" /></Label>
      </div>

      {aba === "Dashboard de Riscos" && DashboardRiscos()}
      {aba === "Riscos Identificados" && CadastroRiscosIdentificados()}
      {aba === "Nova Análise" && FormularioAnalise()}
      {aba === "Plano de Tratamento" && TabelaAnalises({ modo: "plano" })}
      {aba === "Reavaliações" && TabelaAnalises({ modo: "reavaliacao" })}

      {pdfLightbox && <PdfLightbox url={pdfLightbox.url} titulo={pdfLightbox.titulo} nomeArquivo={pdfLightbox.nomeArquivo} onClose={fecharPdfLightbox} />}
    </div>
  );
}
