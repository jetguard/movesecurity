import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  BarChart3,
  CheckCircle2,
  ClipboardList,
  FileText,
  ShieldCheck,
  Target,
} from "lucide-react";
import { PdfLightbox } from "../components/ui/PdfLightbox";
import { api } from "../services/api";

type Controle = {
  id?: number | null;
  codigo?: string | null;
  nome: string;
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
  macroProcessoCodigo: string;
  macroProcessoNome: string;
  setorNome: string;
  riscoCodigo: string;
  riscoNome: string;
  fatoresRisco: Fator[];
  preventivos: Controle[];
  detectivos: Controle[];
  corretivos: Controle[];
  planosAcao: Plano[];
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
  const [erro, setErro] = useState("");
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  useEffect(() => {
    let ativo = true;
    setCarregando(true);
    api
      .get(`/riscos/analise-completa/${id}`)
      .then((response) => {
        if (ativo) setArc(response.data);
      })
      .catch((error) => {
        if (ativo)
          setErro(
            error?.response?.data?.error || "Não foi possível carregar a ARC.",
          );
      })
      .finally(() => {
        if (ativo) setCarregando(false);
      });
    return () => {
      ativo = false;
    };
  }, [id]);

  const status = useMemo(() => {
    if (!arc) return "Carregando";
    if (arc.finalizadaEm) return "Finalizada";
    return arc.finalizacaoStatus || "Aberta";
  }, [arc]);

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
              <p className="mt-5 text-xs font-black uppercase tracking-[0.35em] text-blue-300">
                Página da ARC
              </p>
              <h1 className="mt-2 text-3xl font-black sm:text-4xl">
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
