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
  controles: Controle[];
};

type FormularioArc = Pick<
  Arc,
  "sc" | "fe" | "intervalo" | "sse" | "ope" | "fin" | "adm" | "img" | "lc"
> & {
  estrategiaTratamento: string;
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
  const [cadastro, setCadastro] = useState<CadastroGeral>({ controles: [] });
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
    estrategiaTratamento: "",
  });
  const [preventivos, setPreventivos] = useState<string[]>([]);
  const [detectivos, setDetectivos] = useState<string[]>([]);
  const [corretivos, setCorretivos] = useState<string[]>([]);
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

  function controlesPorTipo(tipo: "CP" | "CD" | "CC") {
    return cadastro.controles
      .filter((item) => (item.tipoControle || "CP") === tipo)
      .sort((a, b) =>
        String(a.codigo || "").localeCompare(String(b.codigo || ""), "pt-BR"),
      );
  }

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
    if (cadastro.controles.length) return;
    const response = await api.get("/riscos/cadastro-geral");
    setCadastro({ controles: response.data.controles || [] });
  }

  async function abrirEdicao() {
    if (!arc) return;
    setErro("");
    setMensagem("");
    setForm({
      sc: pontuacao(arc.sc),
      fe: pontuacao(arc.fe),
      intervalo: pontuacao(arc.intervalo),
      sse: pontuacao(arc.sse),
      ope: pontuacao(arc.ope),
      fin: pontuacao(arc.fin),
      adm: pontuacao(arc.adm),
      img: pontuacao(arc.img),
      lc: pontuacao(arc.lc),
      estrategiaTratamento: arc.estrategiaTratamento || "",
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
        riscoId: arc.riscoId,
        fatoresRisco: arc.fatoresRisco.map((fator) => ({
          id: fator.id,
          codigo: fator.codigo,
          nome: fator.nome,
        })),
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
        },
      );
      setArc(response.data);
      setModalControles(false);
      setMensagem("Controles salvos com sucesso.");
    } catch (error: any) {
      setErro(
        error?.response?.data?.error || "Não foi possível salvar os controles.",
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

  function renderSelecaoControles(
    titulo: string,
    tipo: "CP" | "CD" | "CC",
    selecionados: string[],
    setSelecionados: (ids: string[]) => void,
  ) {
    const controles = controlesPorTipo(tipo);
    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-black text-white">{titulo}</h3>
          <span className="rounded-full border border-blue-400/30 bg-blue-500/10 px-2 py-1 text-[11px] font-black text-blue-100">
            {selecionados.length}
          </span>
        </div>
        <div className="mt-3 max-h-64 space-y-2 overflow-auto pr-1">
          {controles.map((controle) => {
            const idControle = String(controle.id || "");
            return (
              <label
                key={`${tipo}-${idControle}`}
                className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-700 bg-slate-900 p-3 text-sm font-bold text-slate-100 transition hover:border-blue-400/50"
              >
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4"
                  checked={selecionados.includes(idControle)}
                  onChange={(event) => {
                    setSelecionados(
                      event.target.checked
                        ? [...selecionados, idControle]
                        : selecionados.filter((item) => item !== idControle),
                    );
                  }}
                />
                <span>{etiqueta(controle)}</span>
              </label>
            );
          })}
          {!controles.length && (
            <p className="rounded-xl bg-slate-900 p-3 text-sm font-bold text-slate-300">
              Nenhum controle {tipo} cadastrado em Cadastro Geral.
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

            <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_1.6fr]">
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

            <label className="mt-4 block rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
              <span className="text-xs font-black uppercase tracking-[0.18em] text-slate-300">
                Estratégia de tratamento
              </span>
              <select
                className={`${inputClass} mt-2 w-full`}
                value={form.estrategiaTratamento}
                onChange={(event) =>
                  setForm((atual) => ({
                    ...atual,
                    estrategiaTratamento: event.target.value,
                  }))
                }
              >
                <option value="">Não definida</option>
                <option value="Mitigar">Mitigar</option>
                <option value="Aceitar">Aceitar</option>
                <option value="Transferir">Transferir</option>
                <option value="Evitar">Evitar</option>
                <option value="Monitorar">Monitorar</option>
              </select>
            </label>

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
              )}
              {renderSelecaoControles(
                "Detectivo",
                "CD",
                detectivos,
                setDetectivos,
              )}
              {renderSelecaoControles(
                "Corretivo",
                "CC",
                corretivos,
                setCorretivos,
              )}
            </div>
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
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-black text-white hover:bg-emerald-500 disabled:opacity-60"
              >
                <Save size={16} />
                Salvar controles
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
