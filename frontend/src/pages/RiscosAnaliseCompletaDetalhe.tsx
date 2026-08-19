import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  BarChart3,
  CheckCircle2,
  ClipboardList,
  FileText,
  LockKeyholeOpen,
  Pencil,
  Save,
  Settings,
  ShieldCheck,
  Target,
  X,
} from "lucide-react";
import { PdfLightbox } from "../components/ui/PdfLightbox";
import { api } from "../services/api";
import { solicitarPinOperacional } from "../utils/pinPrompt";

type Controle = {
  id?: number | null;
  codigo?: string | null;
  nome: string;
  tipoControle?: "CP" | "CD" | "CC";
  descricao?: string | null;
  fatoresRisco?: Fator[];
};

type Fator = Controle & {
  percentualTratativa?: number;
  planosTratativa?: number;
  planosConcluidos?: number;
};

type Plano = {
  codigo?: string;
  titulo?: string;
  fatorRiscoCodigo?: string | null;
  fatorRiscoNome?: string | null;
  prioridade?: string;
  status: string;
  percentual: number;
  descricao?: string;
  responsavelNome?: string | null;
  prazo?: string;
  concluidoEm?: string | null;
};

type Arc = {
  id: number;
  codigo: string;
  unidade: string;
  macroProcessoId?: number | null;
  macroProcessoCodigo: string;
  macroProcessoNome: string;
  setorId?: number | null;
  setorNome: string;
  riscoId?: number | null;
  riscoCodigo: string;
  riscoNome: string;
  fatoresRisco: Fator[];
  preventivos: Controle[];
  detectivos: Controle[];
  corretivos: Controle[];
  planosAcao: Plano[];
  sc: number;
  fe: number;
  intervalo: number;
  sse: number;
  ope: number;
  fin: number;
  adm: number;
  img: number;
  lc: number;
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
  percentualProbabilidadeResidual?: number | null;
  notaConsequenciaResidual?: number | null;
  mediaProbabilidade: number;
  nivelProbabilidade: string;
  percentualProbabilidade: number;
  mediaConsequencia: number;
  nivelConsequencia: string;
  resultadoInerente: number;
  classificacaoRisco: string;
  periodicidadeAcao: string;
  probabilidadeResidual?: number | null;
  nivelProbabilidadeResidual?: string | null;
  consequenciaResidual?: number | null;
  nivelConsequenciaResidual?: string | null;
  resultadoResidual?: number | null;
  classificacaoResidual?: string | null;
  estrategiaTratamento?: string | null;
  finalizacaoStatus?: string | null;
  finalizacaoDecisao?: string | null;
  finalizacaoJustificativa?: string | null;
  finalizacaoAprovadorNome?: string | null;
  finalizacaoObservacoes?: string | null;
  finalizadaEm?: string | null;
  totalFatoresTratativa?: number;
  fatoresConcluidosTratativa?: number;
  percentualConclusaoTratativa?: number;
};

type CadastroGeral = {
  riscos: Controle[];
  fatores: Fator[];
  controles: Controle[];
};

type FormularioArc = Pick<
  Arc,
  "sc" | "fe" | "intervalo" | "sse" | "ope" | "fin" | "adm" | "img" | "lc"
> & {
  riscoId: string;
  fatoresIds: string[];
};

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

type FinalizacaoFormulario = {
  finalizacaoStatus: string;
  finalizacaoDecisao: string;
  finalizacaoJustificativa: string;
  finalizacaoObservacoes: string;
};

const camposProbabilidade: Array<{
  campo: keyof Pick<FormularioArc, "sc" | "fe" | "intervalo">;
  label: string;
}> = [
  { campo: "sc", label: "Severidade da consequência" },
  { campo: "fe", label: "Frequência / Exposição" },
  { campo: "intervalo", label: "Intensidade" },
];

const camposConsequencia: Array<{
  campo: keyof Pick<
    FormularioArc,
    "sse" | "ope" | "fin" | "adm" | "img" | "lc"
  >;
  label: string;
}> = [
  { campo: "sse", label: "Segurança / Saúde / Meio ambiente" },
  { campo: "ope", label: "Operação" },
  { campo: "fin", label: "Financeiro" },
  { campo: "adm", label: "Ambiental" },
  { campo: "img", label: "Imagem da empresa" },
  { campo: "lc", label: "Legal e Compliance" },
];

const inputClass =
  "h-11 rounded-xl border border-slate-700 bg-slate-950 px-3 text-sm font-bold text-white outline-none transition focus:border-blue-400";

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

function etiqueta(item: Controle) {
  return `${item.codigo ? `${item.codigo} - ` : ""}${item.nome}`;
}

function classeRisco(valor?: string | null) {
  const texto = String(valor || "").toUpperCase();
  if (texto.includes("EXTREMO")) return "bg-red-500 text-white";
  if (texto.includes("ALTO") || texto.includes("SEVERO"))
    return "bg-orange-500 text-white";
  if (texto.includes("MENOR") || texto.includes("MODERADO"))
    return "bg-yellow-300 text-slate-950";
  return "bg-emerald-300 text-slate-950";
}

function CardMetrica({
  titulo,
  valor,
  detalhe,
  destaque,
}: {
  titulo: string;
  valor: string | number;
  detalhe?: string;
  destaque?: string | null;
}) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/75 p-4">
      <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-200">
        {titulo}
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="text-2xl font-black text-white">{valor}</span>
        {destaque && (
          <span
            className={`rounded-full px-2.5 py-1 text-[11px] font-black ${classeRisco(
              destaque,
            )}`}
          >
            {destaque}
          </span>
        )}
      </div>
      {detalhe && (
        <p className="mt-2 text-xs font-bold leading-5 text-slate-300">
          {detalhe}
        </p>
      )}
    </div>
  );
}

export default function RiscosAnaliseCompletaDetalhe() {
  const { id } = useParams();
  const [arc, setArc] = useState<Arc | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [cadastro, setCadastro] = useState<CadastroGeral>({
    riscos: [],
    fatores: [],
    controles: [],
  });
  const [modalEdicao, setModalEdicao] = useState(false);
  const [modalControles, setModalControles] = useState(false);
  const [modalFinalizacao, setModalFinalizacao] = useState(false);
  const [form, setForm] = useState<FormularioArc>({
    sc: 1,
    fe: 1,
    intervalo: 1,
    sse: 1,
    ope: 1,
    fin: 1,
    adm: 1,
    img: 1,
    lc: 1,
    riscoId: "",
    fatoresIds: [],
  });
  const [filtroRiscos, setFiltroRiscos] = useState("");
  const [filtroFatores, setFiltroFatores] = useState("");
  const [preventivos, setPreventivos] = useState<string[]>([]);
  const [detectivos, setDetectivos] = useState<string[]>([]);
  const [corretivos, setCorretivos] = useState<string[]>([]);
  const [buscaPreventivo, setBuscaPreventivo] = useState("");
  const [buscaDetectivo, setBuscaDetectivo] = useState("");
  const [buscaCorretivo, setBuscaCorretivo] = useState("");
  const [residual, setResidual] = useState<ResidualFormulario>(residualInicial);
  const [finalizacao, setFinalizacao] = useState<FinalizacaoFormulario>({
    finalizacaoStatus: "Finalizada",
    finalizacaoDecisao: "",
    finalizacaoJustificativa: "",
    finalizacaoObservacoes: "",
  });

  async function carregarArc() {
    setCarregando(true);
    setErro("");
    try {
      const response = await api.get(`/riscos/analise-completa/${id}`);
      setArc(response.data);
    } catch (error: any) {
      setErro(
        error?.response?.data?.error || "Não foi possível carregar a ARC.",
      );
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregarArc();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const status = useMemo(() => {
    if (!arc) return "Carregando";
    if (arc.finalizadaEm) return "Finalizada";
    return arc.finalizacaoStatus || "Aberta";
  }, [arc]);

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
    if (resultado <= 5) return "BAIXO";
    if (resultado <= 10) return "MENOR";
    if (resultado <= 15) return "ALTO";
    return "EXTREMO";
  }

  function formatarVariacao(valor: number | null) {
    if (valor === null || !Number.isFinite(valor)) return "-";
    return `${Math.round(valor * 100)}%`;
  }

  function controlesPorTipo(tipo: "CP" | "CD" | "CC") {
    return cadastro.controles
      .filter((item) => (item.tipoControle || "CP") === tipo)
      .sort((a, b) =>
        String(a.codigo || "").localeCompare(String(b.codigo || ""), "pt-BR"),
      );
  }

  const riscosFiltrados = useMemo(() => {
    const termo = filtroRiscos.trim().toLowerCase();
    if (!termo) return cadastro.riscos;
    return cadastro.riscos.filter((item) =>
      `${item.codigo || ""} ${item.nome} ${item.descricao || ""}`
        .toLowerCase()
        .includes(termo),
    );
  }, [cadastro.riscos, filtroRiscos]);

  const fatoresFiltrados = useMemo(() => {
    const termo = filtroFatores.trim().toLowerCase();
    if (!termo) return cadastro.fatores;
    return cadastro.fatores.filter((item) =>
      `${item.codigo || ""} ${item.nome} ${item.descricao || ""}`
        .toLowerCase()
        .includes(termo),
    );
  }, [cadastro.fatores, filtroFatores]);

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
      classificacao: classificar(resultado),
      desempenhoProbabilidade: desempenho(
        percentualProbabilidade,
        arc?.percentualProbabilidade,
      ),
      desempenhoNivelRisco: desempenho(resultado, arc?.resultadoInerente),
    };
  }, [arc, residual]);

  function itensSelecionados(ids: string[]) {
    return ids
      .map((controleId) =>
        cadastro.controles.find((item) => String(item.id) === controleId),
      )
      .filter(Boolean)
      .map((item) => ({
        id: item!.id,
        codigo: item!.codigo || undefined,
        nome: item!.nome,
      }));
  }

  async function carregarCadastro() {
    if (
      cadastro.controles.length ||
      cadastro.riscos.length ||
      cadastro.fatores.length
    )
      return;
    const response = await api.get("/riscos/cadastro-geral");
    setCadastro({
      riscos: response.data.riscos || [],
      fatores: response.data.fatores || [],
      controles: response.data.controles || [],
    });
  }

  async function abrirEdicao() {
    if (!arc) return;
    setErro("");
    setMensagem("");
    try {
      await carregarCadastro();
    } catch (error: any) {
      setErro(
        error?.response?.data?.error ||
          "Não foi possível carregar o cadastro geral.",
      );
      return;
    }
    setForm({
      riscoId: String(arc.riscoId || ""),
      fatoresIds: arc.fatoresRisco
        .map((fator) => String(fator.id || ""))
        .filter(Boolean),
      sc: pontuacao(arc.sc),
      fe: pontuacao(arc.fe),
      intervalo: pontuacao(arc.intervalo),
      sse: pontuacao(arc.sse),
      ope: pontuacao(arc.ope),
      fin: pontuacao(arc.fin),
      adm: pontuacao(arc.adm),
      img: pontuacao(arc.img),
      lc: pontuacao(arc.lc),
    });
    setModalEdicao(true);
  }

  async function abrirControles() {
    if (!arc) return;
    setErro("");
    setMensagem("");
    try {
      await carregarCadastro();
      setPreventivos(arc.preventivos.map((item) => String(item.id || "")));
      setDetectivos(arc.detectivos.map((item) => String(item.id || "")));
      setCorretivos(arc.corretivos.map((item) => String(item.id || "")));
      setBuscaPreventivo("");
      setBuscaDetectivo("");
      setBuscaCorretivo("");
      setResidual({
        scResidual: pontuacao(arc.scResidual || residualInicial.scResidual),
        feResidual: pontuacao(arc.feResidual || residualInicial.feResidual),
        intervaloResidual: pontuacao(
          arc.intervaloResidual || residualInicial.intervaloResidual,
        ),
        sseResidual: pontuacao(arc.sseResidual || residualInicial.sseResidual),
        opeResidual: pontuacao(arc.opeResidual || residualInicial.opeResidual),
        finResidual: pontuacao(arc.finResidual || residualInicial.finResidual),
        admResidual: pontuacao(arc.admResidual || residualInicial.admResidual),
        imgResidual: pontuacao(arc.imgResidual || residualInicial.imgResidual),
        lcResidual: pontuacao(arc.lcResidual || residualInicial.lcResidual),
      });
      setModalControles(true);
    } catch (error: any) {
      setErro(
        error?.response?.data?.error ||
          "Não foi possível carregar os controles.",
      );
    }
  }

  function abrirFinalizacao() {
    if (!arc) return;
    setErro("");
    setMensagem("");
    setFinalizacao({
      finalizacaoStatus: arc.finalizacaoStatus || "Finalizada",
      finalizacaoDecisao:
        arc.finalizacaoDecisao || arc.estrategiaTratamento || "",
      finalizacaoJustificativa: arc.finalizacaoJustificativa || "",
      finalizacaoObservacoes: arc.finalizacaoObservacoes || "",
    });
    setModalFinalizacao(true);
  }

  async function salvarEdicao() {
    if (!arc) return;
    setSalvando(true);
    setErro("");
    setMensagem("");
    try {
      const response = await api.put(`/riscos/analise-completa/${arc.id}`, {
        macroProcessoId: arc.macroProcessoId,
        setorId: arc.setorId,
        riscoId: Number(form.riscoId || arc.riscoId),
        fatoresRisco: form.fatoresIds
          .map((fatorId) => {
            const fator = cadastro.fatores.find(
              (item) => String(item.id) === fatorId,
            );
            return {
              id: fator?.id || Number(fatorId),
              codigo: fator?.codigo || undefined,
              nome: fator?.nome || "",
            };
          })
          .filter((fator) => fator.nome),
        estrategiaTratamento: arc.estrategiaTratamento || null,
        sc: form.sc,
        fe: form.fe,
        intervalo: form.intervalo,
        sse: form.sse,
        ope: form.ope,
        fin: form.fin,
        adm: form.adm,
        img: form.img,
        lc: form.lc,
      });
      setArc(response.data);
      setModalEdicao(false);
      setMensagem("ARC atualizada com sucesso.");
    } catch (error: any) {
      setErro(error?.response?.data?.error || "Não foi possível editar a ARC.");
    } finally {
      setSalvando(false);
    }
  }

  async function salvarControles() {
    if (!arc) return;
    setSalvando(true);
    setErro("");
    setMensagem("");
    try {
      const response = await api.patch(
        `/riscos/analise-completa/${arc.id}/controles`,
        {
          preventivos: itensSelecionados(preventivos),
          detectivos: itensSelecionados(detectivos),
          corretivos: itensSelecionados(corretivos),
          ...residual,
        },
      );
      setArc(response.data);
      setModalControles(false);
      setMensagem("Controles e avaliação residual salvos com sucesso.");
    } catch (error: any) {
      setErro(
        error?.response?.data?.error ||
          "Não foi possível salvar os controles e a avaliação residual.",
      );
    } finally {
      setSalvando(false);
    }
  }

  async function salvarFinalizacao() {
    if (!arc) return;
    setSalvando(true);
    setErro("");
    setMensagem("");
    try {
      const response = await api.patch(
        `/riscos/analise-completa/${arc.id}/finalizacao`,
        finalizacao,
      );
      setArc(response.data);
      setModalFinalizacao(false);
      setMensagem("ARC finalizada com sucesso.");
    } catch (error: any) {
      setErro(
        error?.response?.data?.error || "Não foi possível finalizar a ARC.",
      );
    } finally {
      setSalvando(false);
    }
  }

  async function reabrirArc() {
    if (!arc) return;
    const pinOperacional = await solicitarPinOperacional(
      `Informe seu PIN operacional para reabrir a ${arc.codigo}.`,
    );
    if (!pinOperacional) return;
    setSalvando(true);
    setErro("");
    setMensagem("");
    try {
      const response = await api.patch(
        `/riscos/analise-completa/${arc.id}/reabrir`,
        { pinOperacional },
      );
      setArc(response.data);
      setMensagem("ARC reaberta com sucesso.");
    } catch (error: any) {
      setErro(
        error?.response?.data?.error || "Não foi possível reabrir a ARC.",
      );
    } finally {
      setSalvando(false);
    }
  }

  async function abrirPdf() {
    if (!arc) return;
    setErro("");
    try {
      const response = await api.get(`/riscos/analise-completa/${arc.id}/pdf`, {
        responseType: "blob",
      });
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

  function renderCampoNota(campo: keyof FormularioArc, label: string) {
    return (
      <label className="rounded-2xl border border-slate-800 bg-slate-950/70 p-3">
        <span className="block min-h-9 text-xs font-black leading-4 text-slate-100">
          {label}
        </span>
        <select
          className={`${inputClass} mt-2 w-full text-center`}
          value={form[campo]}
          onChange={(event) =>
            setForm((atual) => ({
              ...atual,
              [campo]: pontuacao(Number(event.target.value)),
            }))
          }
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

  function alternarFator(fatorId: string) {
    setForm((atual) => ({
      ...atual,
      fatoresIds: atual.fatoresIds.includes(fatorId)
        ? atual.fatoresIds.filter((item) => item !== fatorId)
        : [...atual.fatoresIds, fatorId],
    }));
  }

  function renderCampoResidual(campo: keyof ResidualFormulario, label: string) {
    return (
      <label className="rounded-2xl border border-slate-800 bg-slate-950/70 p-3">
        <span className="block min-h-9 text-xs font-black leading-4 text-slate-100">
          {label}
        </span>
        <select
          className={`${inputClass} mt-2 w-full text-center`}
          value={residual[campo]}
          onChange={(event) =>
            setResidual((atual) => ({
              ...atual,
              [campo]: pontuacao(Number(event.target.value)),
            }))
          }
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

  function renderSelecaoControles(
    titulo: string,
    tipo: "CP" | "CD" | "CC",
    selecionados: string[],
    setSelecionados: (ids: string[]) => void,
    busca: string,
    setBusca: (valor: string) => void,
  ) {
    const controles = controlesPorTipo(tipo);
    const selecionadosDetalhe = itensSelecionados(selecionados);
    const datalistId = `controles-${tipo.toLowerCase()}-${titulo
      .toLowerCase()
      .replace(/\s+/g, "-")}`;
    const termo = busca.trim().toLowerCase();
    const sugestoes = controles
      .filter((controle) =>
        `${controle.codigo || ""} ${controle.nome} ${controle.descricao || ""}`
          .toLowerCase()
          .includes(termo),
      )
      .slice(0, 12);

    function localizarControle() {
      if (!termo) return null;
      return (
        controles.find((controle) => {
          const codigo = String(controle.codigo || "").toLowerCase();
          const nome = controle.nome.toLowerCase();
          const texto = etiqueta(controle).toLowerCase();
          return codigo === termo || nome === termo || texto === termo;
        }) ||
        controles.find((controle) =>
          `${controle.codigo || ""} ${controle.nome}`
            .toLowerCase()
            .includes(termo),
        ) ||
        null
      );
    }

    function adicionarControle() {
      const controle = localizarControle();
      const idControle = String(controle?.id || "");
      if (!idControle) return;
      if (!selecionados.includes(idControle)) {
        setSelecionados([...selecionados, idControle]);
      }
      setBusca("");
    }

    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-black text-white">{titulo}</h3>
          <span className="rounded-full border border-blue-400/30 bg-blue-500/10 px-2 py-1 text-[11px] font-black text-blue-100">
            {selecionados.length}
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
                adicionarControle();
              }
            }}
            placeholder={`Digite ${tipo}001 ou o nome`}
          />
          <datalist id={datalistId}>
            {sugestoes.map((controle) => (
              <option key={controle.id} value={etiqueta(controle)} />
            ))}
          </datalist>
          <button
            type="button"
            onClick={adicionarControle}
            className="rounded-xl bg-blue-600 px-4 text-sm font-black text-white transition hover:bg-blue-500"
          >
            Adicionar
          </button>
        </div>

        <div className="mt-3 grid max-h-44 gap-2 overflow-auto pr-1">
          {selecionadosDetalhe.map((controle) => {
            const idControle = String(controle.id || "");
            return (
              <div
                key={`${tipo}-${idControle}`}
                className="flex items-center justify-between gap-3 rounded-xl border border-slate-700 bg-slate-900 p-3 text-sm font-bold text-slate-100"
              >
                <span className="min-w-0 truncate">{etiqueta(controle)}</span>
                <button
                  type="button"
                  onClick={() =>
                    setSelecionados(
                      selecionados.filter((item) => item !== idControle),
                    )
                  }
                  className="shrink-0 rounded-lg border border-slate-700 p-1 text-slate-300 transition hover:border-red-400 hover:text-red-200"
                  aria-label={`Remover ${etiqueta(controle)}`}
                >
                  <X size={14} />
                </button>
              </div>
            );
          })}
          {!controles.length && (
            <p className="rounded-xl bg-slate-900 p-3 text-sm font-bold text-slate-300">
              Nenhum controle {tipo} cadastrado em Cadastro Geral.
            </p>
          )}
          {controles.length > 0 && !selecionadosDetalhe.length && (
            <p className="rounded-xl bg-slate-900 p-3 text-sm font-bold text-slate-300">
              Nenhum controle selecionado.
            </p>
          )}
        </div>
      </div>
    );
  }

  if (carregando) {
    return (
      <div className="min-h-screen bg-slate-950 p-6 text-white">
        <p className="text-sm font-black text-blue-200">Carregando ARC...</p>
      </div>
    );
  }

  if (!arc) {
    return (
      <div className="min-h-screen bg-slate-950 p-6 text-white">
        <Link
          to="/riscos/analise-completa"
          className="inline-flex items-center gap-2 text-sm font-black text-blue-200"
        >
          <ArrowLeft size={16} />
          Voltar
        </Link>
        <p className="mt-6 rounded-2xl border border-red-400/30 bg-red-500/10 p-4 text-sm font-black text-red-100">
          {erro || "ARC não encontrada."}
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-6 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1800px] space-y-5">
        <header className="overflow-hidden rounded-3xl border border-slate-800 bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.24),transparent_35%),linear-gradient(135deg,rgba(15,23,42,1),rgba(2,6,23,1))] p-6 shadow-2xl shadow-black/25">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <Link
                to="/riscos/analise-completa"
                className="inline-flex items-center gap-2 text-sm font-black text-blue-200 hover:text-white"
              >
                <ArrowLeft size={16} />
                Voltar para análises
              </Link>
              <h1 className="mt-5 text-3xl font-black sm:text-4xl">
                {arc.codigo}
              </h1>
              <p className="mt-3 max-w-4xl text-sm font-semibold leading-6 text-slate-300">
                {arc.riscoCodigo} - {arc.riscoNome}
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <span
                className={`inline-flex items-center rounded-2xl px-4 py-3 text-sm font-black ${classeRisco(
                  status,
                )}`}
              >
                {status}
              </span>
              <button
                type="button"
                onClick={abrirEdicao}
                className="inline-flex items-center gap-2 rounded-2xl border border-blue-300/35 bg-blue-500/10 px-4 py-3 text-sm font-black text-blue-100 hover:bg-blue-500/20"
              >
                <Pencil size={18} />
                Editar
              </button>
              <button
                type="button"
                onClick={abrirControles}
                className="inline-flex items-center gap-2 rounded-2xl border border-emerald-300/35 bg-emerald-500/10 px-4 py-3 text-sm font-black text-emerald-100 hover:bg-emerald-500/20"
              >
                <Settings size={18} />
                Controles
              </button>
              <Link
                to={`/planos-acao?arcId=${arc.id}`}
                className="inline-flex items-center gap-2 rounded-2xl border border-amber-300/35 bg-amber-400/10 px-4 py-3 text-sm font-black text-amber-100 hover:bg-amber-400/20"
              >
                <ClipboardList size={18} />
                Plano de ação
              </Link>
              {arc.finalizadaEm ? (
                <button
                  type="button"
                  disabled={salvando}
                  onClick={reabrirArc}
                  className="inline-flex items-center gap-2 rounded-2xl border border-amber-300/35 bg-amber-400/10 px-4 py-3 text-sm font-black text-amber-100 hover:bg-amber-400/20 disabled:opacity-60"
                >
                  <LockKeyholeOpen size={18} />
                  Reabrir ARC
                </button>
              ) : (
                <button
                  type="button"
                  disabled={salvando}
                  onClick={abrirFinalizacao}
                  className="inline-flex items-center gap-2 rounded-2xl border border-cyan-300/35 bg-cyan-400/10 px-4 py-3 text-sm font-black text-cyan-100 hover:bg-cyan-400/20 disabled:opacity-60"
                >
                  <CheckCircle2 size={18} />
                  Finalizar ARC
                </button>
              )}
              <button
                type="button"
                onClick={abrirPdf}
                className="inline-flex items-center gap-2 rounded-2xl border border-red-300/35 bg-red-500/10 px-4 py-3 text-sm font-black text-red-100 hover:bg-red-500/20"
              >
                <FileText size={18} />
                PDF
              </button>
            </div>
          </div>
        </header>

        {erro && (
          <p className="rounded-2xl border border-red-400/30 bg-red-500/10 p-4 text-sm font-black text-red-100">
            {erro}
          </p>
        )}
        {mensagem && (
          <p className="rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-4 text-sm font-black text-emerald-100">
            {mensagem}
          </p>
        )}

        <section className="grid gap-4 xl:grid-cols-4">
          <CardMetrica
            titulo="Macroprocesso"
            valor={arc.macroProcessoCodigo}
            detalhe={`${arc.macroProcessoNome} / ${arc.setorNome}`}
          />
          <CardMetrica
            titulo="Conclusão dos fatores"
            valor={`${arc.percentualConclusaoTratativa || 0}%`}
            detalhe={`${arc.fatoresConcluidosTratativa || 0} de ${
              arc.totalFatoresTratativa || 0
            } fator(es) concluído(s)`}
            destaque={
              (arc.percentualConclusaoTratativa || 0) >= 100 ? "BAIXO" : "ALTO"
            }
          />
          <CardMetrica
            titulo="Risco inerente"
            valor={arc.resultadoInerente}
            detalhe={arc.periodicidadeAcao}
            destaque={arc.classificacaoRisco}
          />
          <CardMetrica
            titulo="Risco residual"
            valor={arc.resultadoResidual ?? "-"}
            detalhe={arc.nivelConsequenciaResidual || "Não avaliado"}
            destaque={arc.classificacaoResidual || "Não avaliado"}
          />
        </section>

        <section className="grid gap-4 xl:grid-cols-2">
          <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5">
            <div className="flex items-center gap-3">
              <BarChart3 className="text-blue-200" size={22} />
              <h2 className="text-xl font-black">Avaliação inerente</h2>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <CardMetrica
                titulo="Probabilidade"
                valor={arc.mediaProbabilidade}
                detalhe={`${Math.round((arc.percentualProbabilidade || 0) * 100)}%`}
                destaque={arc.nivelProbabilidade}
              />
              <CardMetrica
                titulo="Consequência"
                valor={arc.mediaConsequencia}
                destaque={arc.nivelConsequencia}
              />
              <CardMetrica
                titulo="Estratégia"
                valor={arc.estrategiaTratamento || "Não definida"}
              />
            </div>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5">
            <div className="flex items-center gap-3">
              <ShieldCheck className="text-emerald-200" size={22} />
              <h2 className="text-xl font-black">Controles vinculados</h2>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              {[
                ["Preventivos", arc.preventivos],
                ["Detectivos", arc.detectivos],
                ["Corretivos", arc.corretivos],
              ].map(([titulo, lista]) => (
                <div
                  key={String(titulo)}
                  className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4"
                >
                  <p className="text-sm font-black text-white">
                    {String(titulo)}
                  </p>
                  <div className="mt-3 space-y-2">
                    {(lista as Controle[]).map((item) => (
                      <p
                        key={`${item.codigo}-${item.nome}`}
                        className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-bold text-slate-200"
                      >
                        {etiqueta(item)}
                      </p>
                    ))}
                    {!(lista as Controle[]).length && (
                      <p className="text-xs font-bold text-slate-400">
                        Nenhum controle informado.
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5">
          <div className="flex items-center gap-3">
            <Target className="text-amber-200" size={22} />
            <h2 className="text-xl font-black">Fatores de risco</h2>
          </div>
          <div className="mt-4 grid gap-3 lg:grid-cols-2 2xl:grid-cols-3">
            {arc.fatoresRisco.map((fator) => (
              <article
                key={`${fator.codigo}-${fator.nome}`}
                className="rounded-2xl border border-amber-300/25 bg-amber-400/10 p-4"
              >
                <p className="text-sm font-black text-amber-100">
                  {etiqueta(fator)}
                </p>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-950">
                  <span
                    className="block h-full rounded-full bg-emerald-300"
                    style={{ width: `${fator.percentualTratativa || 0}%` }}
                  />
                </div>
                <p className="mt-2 text-xs font-bold text-amber-100/80">
                  {fator.planosConcluidos || 0} de {fator.planosTratativa || 0}{" "}
                  plano(s) concluído(s)
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5">
          <div className="flex items-center gap-3">
            <ClipboardList className="text-cyan-200" size={22} />
            <h2 className="text-xl font-black">Planos de ação</h2>
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-[980px] w-full border-separate border-spacing-y-2 text-left">
              <thead className="text-xs font-black uppercase tracking-[0.2em] text-blue-200">
                <tr>
                  <th className="px-3 py-2">Plano</th>
                  <th className="px-3 py-2">Fator</th>
                  <th className="px-3 py-2">Responsável</th>
                  <th className="px-3 py-2">Prazo</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Progresso</th>
                </tr>
              </thead>
              <tbody>
                {arc.planosAcao.map((plano) => (
                  <tr key={`${plano.codigo}-${plano.fatorRiscoCodigo}`}>
                    <td className="rounded-l-2xl border-y border-l border-slate-800 bg-slate-950/80 px-3 py-3">
                      <p className="font-black text-white">{plano.codigo}</p>
                      <p className="mt-1 text-xs font-bold text-slate-300">
                        {plano.titulo}
                      </p>
                    </td>
                    <td className="border-y border-slate-800 bg-slate-950/80 px-3 py-3 text-sm font-bold text-slate-200">
                      {plano.fatorRiscoCodigo} - {plano.fatorRiscoNome}
                    </td>
                    <td className="border-y border-slate-800 bg-slate-950/80 px-3 py-3 text-sm font-bold text-slate-200">
                      {plano.responsavelNome || "Não informado"}
                    </td>
                    <td className="border-y border-slate-800 bg-slate-950/80 px-3 py-3 text-sm font-bold text-slate-200">
                      {plano.prazo
                        ? new Date(plano.prazo).toLocaleDateString("pt-BR")
                        : "-"}
                    </td>
                    <td className="border-y border-slate-800 bg-slate-950/80 px-3 py-3">
                      <span className="rounded-full border border-blue-300/30 bg-blue-500/10 px-3 py-1 text-xs font-black text-blue-100">
                        {plano.status}
                      </span>
                    </td>
                    <td className="rounded-r-2xl border-y border-r border-slate-800 bg-slate-950/80 px-3 py-3">
                      <p className="text-sm font-black text-white">
                        {plano.percentual || 0}%
                      </p>
                      <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-800">
                        <span
                          className="block h-full rounded-full bg-cyan-300"
                          style={{ width: `${plano.percentual || 0}%` }}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
                {!arc.planosAcao.length && (
                  <tr>
                    <td
                      colSpan={6}
                      className="rounded-2xl bg-slate-950/80 p-6 text-center text-sm font-bold text-slate-300"
                    >
                      Nenhum plano de ação vinculado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="text-emerald-200" size={22} />
            <h2 className="text-xl font-black">Finalização</h2>
          </div>
          <div className="mt-4 grid gap-3 lg:grid-cols-4">
            <CardMetrica titulo="Status" valor={status} />
            <CardMetrica
              titulo="Decisão"
              valor={arc.finalizacaoDecisao || "Não definida"}
            />
            <CardMetrica
              titulo="Aprovador"
              valor={arc.finalizacaoAprovadorNome || "Não informado"}
            />
            <CardMetrica
              titulo="Data"
              valor={
                arc.finalizadaEm
                  ? new Date(arc.finalizadaEm).toLocaleDateString("pt-BR")
                  : "Pendente"
              }
            />
          </div>
          <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-950/75 p-4">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-200">
              Justificativa
            </p>
            <p className="mt-3 text-sm font-semibold leading-6 text-slate-200">
              {arc.finalizacaoJustificativa || "Ainda não informada."}
            </p>
          </div>
        </section>
      </div>

      {modalEdicao && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur">
          <div className="max-h-[92vh] w-full max-w-5xl overflow-auto rounded-3xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.28em] text-blue-300">
                  Editar análise
                </p>
                <h2 className="mt-2 text-2xl font-black text-white">
                  {arc.codigo}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setModalEdicao(false)}
                className="rounded-xl border border-slate-700 p-2 text-slate-300 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-5 grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
              <section className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                <h3 className="text-sm font-black uppercase tracking-[0.2em] text-blue-200">
                  Risco
                </h3>
                <input
                  className={`${inputClass} mt-3 w-full`}
                  value={filtroRiscos}
                  onChange={(event) => setFiltroRiscos(event.target.value)}
                  placeholder="Buscar risco por código ou nome"
                />
                <div className="mt-3 max-h-64 space-y-2 overflow-auto pr-1">
                  {riscosFiltrados.map((risco) => (
                    <button
                      key={risco.id}
                      type="button"
                      onClick={() => {
                        const fatoresSugeridos = (risco.fatoresRisco || [])
                          .map((fator) => String(fator.id || ""))
                          .filter(Boolean);
                        setForm((atual) => ({
                          ...atual,
                          riscoId: String(risco.id),
                          fatoresIds: fatoresSugeridos.length
                            ? Array.from(new Set(fatoresSugeridos))
                            : atual.fatoresIds,
                        }));
                      }}
                      className={`w-full rounded-xl border p-3 text-left text-sm font-bold transition ${
                        form.riscoId === String(risco.id)
                          ? "border-blue-300 bg-blue-600 text-white"
                          : "border-slate-700 bg-slate-900 text-slate-200 hover:border-blue-400/60"
                      }`}
                    >
                      <span className="font-black">{risco.codigo}</span>
                      <span className="ml-2">{risco.nome}</span>
                    </button>
                  ))}
                </div>
              </section>

              <section className="rounded-2xl border border-amber-300/25 bg-amber-400/10 p-4">
                <h3 className="text-sm font-black uppercase tracking-[0.2em] text-amber-100">
                  Fatores de risco
                </h3>
                <input
                  className={`${inputClass} mt-3 w-full`}
                  value={filtroFatores}
                  onChange={(event) => setFiltroFatores(event.target.value)}
                  placeholder="Buscar fator por código ou nome"
                />
                <div className="mt-3 max-h-64 space-y-2 overflow-auto pr-1">
                  {fatoresFiltrados.map((fator) => {
                    const marcado = form.fatoresIds.includes(String(fator.id));
                    return (
                      <button
                        key={fator.id}
                        type="button"
                        onClick={() => alternarFator(String(fator.id))}
                        className={`w-full rounded-xl border p-3 text-left text-sm font-bold transition ${
                          marcado
                            ? "border-amber-200 bg-amber-300 text-slate-950"
                            : "border-slate-700 bg-slate-900 text-slate-200 hover:border-amber-300/60"
                        }`}
                      >
                        <span className="font-black">{fator.codigo}</span>
                        <span className="ml-2">{fator.nome}</span>
                      </button>
                    );
                  })}
                </div>
              </section>
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_1.6fr]">
              <section className="rounded-2xl border border-blue-400/20 bg-blue-500/5 p-4">
                <h3 className="text-sm font-black uppercase tracking-[0.2em] text-blue-200">
                  Probabilidade
                </h3>
                <div className="mt-3 grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
                  {camposProbabilidade.map((campo) =>
                    renderCampoNota(campo.campo, campo.label),
                  )}
                </div>
              </section>
              <section className="rounded-2xl border border-cyan-400/20 bg-cyan-500/5 p-4">
                <h3 className="text-sm font-black uppercase tracking-[0.2em] text-cyan-200">
                  Consequência
                </h3>
                <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {camposConsequencia.map((campo) =>
                    renderCampoNota(campo.campo, campo.label),
                  )}
                </div>
              </section>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setModalEdicao(false)}
                className="rounded-xl border border-slate-700 px-5 py-3 text-sm font-black text-slate-100 hover:border-slate-500"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={salvando}
                onClick={salvarEdicao}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-black text-white hover:bg-blue-500 disabled:opacity-60"
              >
                <Save size={16} />
                Salvar análise
              </button>
            </div>
          </div>
        </div>
      )}

      {modalControles && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur">
          <div className="max-h-[92vh] w-full max-w-6xl overflow-auto rounded-3xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.28em] text-emerald-300">
                  Controles
                </p>
                <h2 className="mt-2 text-2xl font-black text-white">
                  {arc.codigo}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setModalControles(false)}
                className="rounded-xl border border-slate-700 p-2 text-slate-300 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>
            <div className="mt-5 grid gap-4 lg:grid-cols-3">
              {renderSelecaoControles(
                "Preventivo",
                "CP",
                preventivos,
                setPreventivos,
                buscaPreventivo,
                setBuscaPreventivo,
              )}
              {renderSelecaoControles(
                "Detectivo",
                "CD",
                detectivos,
                setDetectivos,
                buscaDetectivo,
                setBuscaDetectivo,
              )}
              {renderSelecaoControles(
                "Corretivo",
                "CC",
                corretivos,
                setCorretivos,
                buscaCorretivo,
                setBuscaCorretivo,
              )}
            </div>

            <section className="mt-5 rounded-2xl border border-cyan-400/20 bg-cyan-500/[0.05] p-4">
              <div className="flex flex-col gap-2 border-b border-slate-800 pb-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.24em] text-cyan-200">
                    Avaliação residual
                  </p>
                  <h3 className="mt-1 text-xl font-black text-white">
                    Probabilidade, consequência e desempenho residual
                  </h3>
                </div>
                <span
                  className={`inline-flex rounded-full px-3 py-1 text-xs font-black ${classeRisco(
                    previaResidual.classificacao,
                  )}`}
                >
                  {previaResidual.classificacao}
                </span>
              </div>

              <div className="mt-4 grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
                <div className="rounded-2xl border border-blue-400/20 bg-blue-500/5 p-4">
                  <h4 className="text-sm font-black uppercase tracking-[0.2em] text-blue-200">
                    Probabilidade
                  </h4>
                  <div className="mt-3 grid gap-3 sm:grid-cols-3">
                    {renderCampoResidual(
                      "scResidual",
                      "Severidade da consequência",
                    )}
                    {renderCampoResidual(
                      "feResidual",
                      "Frequência / Exposição",
                    )}
                    {renderCampoResidual("intervaloResidual", "Intensidade")}
                  </div>
                </div>

                <div className="rounded-2xl border border-cyan-400/20 bg-cyan-500/5 p-4">
                  <h4 className="text-sm font-black uppercase tracking-[0.2em] text-cyan-200">
                    Consequência
                  </h4>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {renderCampoResidual(
                      "sseResidual",
                      "Segurança / Saúde / Meio ambiente",
                    )}
                    {renderCampoResidual("opeResidual", "Operação")}
                    {renderCampoResidual("finResidual", "Financeiro")}
                    {renderCampoResidual("admResidual", "Ambiental")}
                    {renderCampoResidual("imgResidual", "Imagem da empresa")}
                    {renderCampoResidual("lcResidual", "Legal e Compliance")}
                  </div>
                </div>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <CardMetrica
                  titulo="Nota / MPP / %P"
                  valor={`${previaResidual.notaProbabilidade} / ${previaResidual.probabilidade} / ${Math.round(
                    previaResidual.percentualProbabilidade * 100,
                  )}%`}
                  destaque={previaResidual.nivelProbabilidade}
                />
                <CardMetrica
                  titulo="Nota Conseq. / MPI"
                  valor={`${previaResidual.notaConsequencia} / ${previaResidual.consequencia}`}
                  destaque={previaResidual.nivelConsequencia}
                />
                <CardMetrica
                  titulo="Desemp. Prob."
                  valor={formatarVariacao(
                    previaResidual.desempenhoProbabilidade,
                  )}
                />
                <CardMetrica
                  titulo="Desemp. Risco"
                  valor={formatarVariacao(previaResidual.desempenhoNivelRisco)}
                />
              </div>
            </section>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setModalControles(false)}
                className="rounded-xl border border-slate-700 px-5 py-3 text-sm font-black text-slate-100 hover:border-slate-500"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={salvando}
                onClick={salvarControles}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-black text-white hover:bg-blue-500 disabled:opacity-60"
              >
                <Save size={16} />
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}

      {modalFinalizacao && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur">
          <div className="max-h-[92vh] w-full max-w-3xl overflow-auto rounded-3xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.28em] text-cyan-300">
                  Finalizar ARC
                </p>
                <h2 className="mt-2 text-2xl font-black text-white">
                  {arc.codigo}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setModalFinalizacao(false)}
                className="rounded-xl border border-slate-700 p-2 text-slate-300 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            {(arc.totalFatoresTratativa || 0) > 0 &&
              (arc.percentualConclusaoTratativa || 0) < 100 && (
                <p className="mt-5 rounded-2xl border border-amber-300/35 bg-amber-400/10 p-4 text-sm font-black text-amber-100">
                  Ainda existem planos de ação em aberto. A ARC só pode ser
                  finalizada quando todos os fatores estiverem concluídos.
                </p>
              )}

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label>
                <span className="text-xs font-black uppercase tracking-[0.18em] text-slate-300">
                  Status
                </span>
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
                </select>
              </label>
              <label>
                <span className="text-xs font-black uppercase tracking-[0.18em] text-slate-300">
                  Decisão
                </span>
                <select
                  className={`${inputClass} mt-2 w-full`}
                  value={finalizacao.finalizacaoDecisao}
                  onChange={(event) =>
                    setFinalizacao((atual) => ({
                      ...atual,
                      finalizacaoDecisao: event.target.value,
                    }))
                  }
                >
                  <option value="">Selecione</option>
                  <option value="Mitigar">Mitigar</option>
                  <option value="Aceitar">Aceitar</option>
                  <option value="Transferir">Transferir</option>
                  <option value="Evitar">Evitar</option>
                  <option value="Monitorar">Monitorar</option>
                </select>
              </label>
            </div>

            <label className="mt-4 block">
              <span className="text-xs font-black uppercase tracking-[0.18em] text-slate-300">
                Justificativa
              </span>
              <textarea
                className="mt-2 min-h-28 w-full rounded-2xl border border-slate-700 bg-slate-950 p-4 text-sm font-bold text-white outline-none transition focus:border-blue-400"
                value={finalizacao.finalizacaoJustificativa}
                onChange={(event) =>
                  setFinalizacao((atual) => ({
                    ...atual,
                    finalizacaoJustificativa: event.target.value,
                  }))
                }
              />
            </label>

            <label className="mt-4 block">
              <span className="text-xs font-black uppercase tracking-[0.18em] text-slate-300">
                Observações
              </span>
              <textarea
                className="mt-2 min-h-20 w-full rounded-2xl border border-slate-700 bg-slate-950 p-4 text-sm font-bold text-white outline-none transition focus:border-blue-400"
                value={finalizacao.finalizacaoObservacoes}
                onChange={(event) =>
                  setFinalizacao((atual) => ({
                    ...atual,
                    finalizacaoObservacoes: event.target.value,
                  }))
                }
              />
            </label>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setModalFinalizacao(false)}
                className="rounded-xl border border-slate-700 px-5 py-3 text-sm font-black text-slate-100 hover:border-slate-500"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={
                  salvando ||
                  ((arc.totalFatoresTratativa || 0) > 0 &&
                    (arc.percentualConclusaoTratativa || 0) < 100)
                }
                onClick={salvarFinalizacao}
                className="inline-flex items-center gap-2 rounded-xl bg-cyan-600 px-5 py-3 text-sm font-black text-white hover:bg-cyan-500 disabled:opacity-60"
              >
                <CheckCircle2 size={16} />
                Finalizar ARC
              </button>
            </div>
          </div>
        </div>
      )}

      {pdfUrl && (
        <PdfLightbox
          url={pdfUrl}
          titulo="PDF da análise completa"
          nomeArquivo={`${arc.codigo}.pdf`}
          onClose={() => {
            URL.revokeObjectURL(pdfUrl);
            setPdfUrl(null);
          }}
        />
      )}
    </div>
  );
}
