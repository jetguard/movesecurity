import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  BrainCircuit,
  Layers3,
  ShieldCheck,
  TrendingDown,
} from "lucide-react";
import { api } from "../services/api";

type AnaliseCompleta = {
  id: number;
  codigo: string;
  macroProcessoCodigo: string;
  macroProcessoNome: string;
  setorNome: string;
  riscoCodigo: string;
  riscoNome: string;
  mediaProbabilidade: number;
  mediaConsequencia: number;
  resultadoInerente: number;
  nivelProbabilidade: string;
  nivelConsequencia: string;
  classificacaoRisco: string;
  periodicidadeAcao: string;
  preventivos: unknown[];
  detectivos: unknown[];
  corretivos: unknown[];
  resultadoResidual?: number | null;
  classificacaoResidual?: string | null;
  desempenhoNivelRisco?: number | null;
};

const ordemClassificacao = ["BAIXO", "MENOR", "ALTO", "EXTREMO"];

function normalizar(valor?: string | null) {
  return String(valor || "-").toUpperCase();
}

function corClassificacao(valor?: string | null) {
  const texto = normalizar(valor);
  if (texto === "EXTREMO") return "bg-red-500 text-white border-red-300/40";
  if (texto === "ALTO") return "bg-amber-400 text-slate-950 border-amber-200/60";
  if (texto === "MENOR") return "bg-lime-300 text-slate-950 border-lime-100/60";
  if (texto === "BAIXO") return "bg-emerald-400 text-slate-950 border-emerald-100/60";
  return "bg-slate-700 text-slate-100 border-slate-600";
}

function contarPor<T>(itens: T[], chave: (item: T) => string) {
  return itens.reduce<Record<string, number>>((acc, item) => {
    const nome = chave(item) || "-";
    acc[nome] = (acc[nome] || 0) + 1;
    return acc;
  }, {});
}

function ranking(dados: Record<string, number>, limite = 6) {
  return Object.entries(dados)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limite);
}

function media(valores: number[]) {
  if (!valores.length) return 0;
  return valores.reduce((total, valor) => total + valor, 0) / valores.length;
}

function formatarNumero(valor: number) {
  return new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits: 2,
    minimumFractionDigits: valor % 1 ? 1 : 0,
  }).format(valor);
}

function celulaCalor(total: number) {
  if (total >= 8) return "bg-red-500 text-white border-red-300";
  if (total >= 5) return "bg-orange-400 text-slate-950 border-orange-200";
  if (total >= 3) return "bg-amber-300 text-slate-950 border-amber-100";
  if (total >= 1) return "bg-emerald-400 text-slate-950 border-emerald-100";
  return "bg-slate-900 text-slate-500 border-slate-800";
}

function CardIndicador({
  titulo,
  valor,
  detalhe,
  icon: Icon,
}: {
  titulo: string;
  valor: string | number;
  detalhe: string;
  icon: typeof Activity;
}) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-2xl shadow-black/10">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.22em] text-blue-200">
            {titulo}
          </p>
          <p className="mt-3 text-3xl font-black text-white">{valor}</p>
        </div>
        <span className="rounded-2xl border border-blue-400/30 bg-blue-500/10 p-3 text-blue-200">
          <Icon size={22} />
        </span>
      </div>
      <p className="mt-3 text-sm font-semibold leading-6 text-slate-300">
        {detalhe}
      </p>
    </div>
  );
}

function Barra({ nome, valor, total }: { nome: string; valor: number; total: number }) {
  const percentual = total ? Math.round((valor / total) * 100) : 0;
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
      <div className="flex items-center justify-between gap-3 text-sm font-black">
        <span className="truncate text-slate-100">{nome}</span>
        <span className="text-blue-100">{valor}</span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-800">
        <div
          className="h-full rounded-full bg-blue-500"
          style={{ width: `${percentual}%` }}
        />
      </div>
    </div>
  );
}

export default function RiscosDashboard() {
  const [analises, setAnalises] = useState<AnaliseCompleta[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  useEffect(() => {
    async function carregar() {
      setCarregando(true);
      setErro("");
      try {
        const response = await api.get("/riscos/analise-completa");
        setAnalises(Array.isArray(response.data) ? response.data : []);
      } catch {
        setErro("Não foi possível carregar o dashboard de riscos.");
      } finally {
        setCarregando(false);
      }
    }
    carregar();
  }, []);

  const dados = useMemo(() => {
    const total = analises.length;
    const extremos = analises.filter(
      (item) => normalizar(item.classificacaoRisco) === "EXTREMO",
    ).length;
    const altos = analises.filter(
      (item) => normalizar(item.classificacaoRisco) === "ALTO",
    ).length;
    const comResidual = analises.filter(
      (item) => item.resultadoResidual !== null && item.resultadoResidual !== undefined,
    );
    const comControles = analises.filter(
      (item) =>
        item.preventivos.length || item.detectivos.length || item.corretivos.length,
    ).length;
    const mediaInerente = media(analises.map((item) => Number(item.resultadoInerente || 0)));
    const mediaResidual = media(comResidual.map((item) => Number(item.resultadoResidual || 0)));
    const reducaoMedia =
      mediaInerente && mediaResidual
        ? Math.round(((mediaResidual - mediaInerente) / mediaInerente) * 100)
        : 0;

    return {
      total,
      extremos,
      altos,
      comResidual: comResidual.length,
      comControles,
      mediaInerente,
      mediaResidual,
      reducaoMedia,
      porClassificacao: contarPor(analises, (item) =>
        normalizar(item.classificacaoRisco),
      ),
      porResidual: contarPor(comResidual, (item) =>
        normalizar(item.classificacaoResidual),
      ),
      porMacro: ranking(
        contarPor(analises, (item) => `${item.macroProcessoCodigo} - ${item.macroProcessoNome}`),
      ),
      porSetor: ranking(contarPor(analises, (item) => item.setorNome)),
      criticos: [...analises]
        .sort((a, b) => Number(b.resultadoInerente || 0) - Number(a.resultadoInerente || 0))
        .slice(0, 8),
    };
  }, [analises]);

  const mapaCalor = useMemo(() => {
    return Array.from({ length: 5 }, (_, impactoIndex) => {
      const impacto = 5 - impactoIndex;
      return Array.from({ length: 5 }, (_, probIndex) => {
        const probabilidade = probIndex + 1;
        const total = analises.filter(
          (item) =>
            Math.round(Number(item.mediaProbabilidade || 0)) === probabilidade &&
            Math.round(Number(item.mediaConsequencia || 0)) === impacto,
        ).length;
        return { impacto, probabilidade, total };
      });
    });
  }, [analises]);

  return (
    <div className="min-h-[calc(100vh-5rem)] bg-slate-950 px-4 py-6 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1800px]">
        <header className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-900 shadow-2xl shadow-black/20">
          <div className="border-b border-slate-800 bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.28),transparent_36%),linear-gradient(135deg,rgba(15,23,42,1),rgba(2,6,23,1))] p-6 sm:p-8">
            <p className="text-xs font-black uppercase tracking-[0.35em] text-blue-200">
              Análise de Riscos
            </p>
            <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h1 className="text-3xl font-black text-white sm:text-4xl">
                  Dashboard
                </h1>
                <p className="mt-3 max-w-4xl text-sm font-semibold leading-6 text-slate-300">
                  Visão executiva das análises completas com exposição
                  inerente, avaliação residual, controles cadastrados e mapa de
                  calor por probabilidade e consequência.
                </p>
              </div>
              <div className="rounded-2xl border border-blue-400/30 bg-blue-500/10 px-4 py-3 text-sm font-black text-blue-100">
                {dados.total} análises monitoradas
              </div>
            </div>
          </div>
        </header>

        {carregando && (
          <div className="mt-6 rounded-xl border border-slate-800 bg-slate-900 p-5 text-sm font-black text-slate-300">
            Carregando dashboard...
          </div>
        )}
        {erro && (
          <div className="mt-6 rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm font-black text-red-100">
            {erro}
          </div>
        )}

        <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <CardIndicador
            titulo="Total"
            valor={dados.total}
            detalhe="Análises completas cadastradas no módulo."
            icon={Layers3}
          />
          <CardIndicador
            titulo="Extremos / Altos"
            valor={`${dados.extremos + dados.altos}`}
            detalhe={`${dados.extremos} extremos e ${dados.altos} altos na classificação inerente.`}
            icon={AlertTriangle}
          />
          <CardIndicador
            titulo="Com residual"
            valor={dados.comResidual}
            detalhe="Registros com avaliação residual preenchida."
            icon={TrendingDown}
          />
          <CardIndicador
            titulo="Com controles"
            valor={dados.comControles}
            detalhe="Análises com controles preventivos, detectivos ou corretivos."
            icon={ShieldCheck}
          />
        </section>

        <section className="mt-6 grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-2xl shadow-black/10">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.24em] text-blue-200">
                  Mapa de calor
                </p>
                <h2 className="mt-2 text-xl font-black text-white">
                  Probabilidade x Consequência
                </h2>
              </div>
              <BrainCircuit className="text-blue-300" />
            </div>
            <div className="mt-5 overflow-x-auto">
              <div className="grid min-w-[560px] grid-cols-[72px_repeat(5,1fr)] gap-2">
                <div />
                {[1, 2, 3, 4, 5].map((prob) => (
                  <div
                    key={prob}
                    className="text-center text-xs font-black uppercase text-slate-300"
                  >
                    P{prob}
                  </div>
                ))}
                {mapaCalor.map((linha) => (
                  <div key={`linha-${linha[0].impacto}`} className="contents">
                    <div
                      className="flex items-center justify-center rounded-xl border border-slate-800 bg-slate-950/80 text-xs font-black text-slate-300"
                    >
                      C{linha[0].impacto}
                    </div>
                    {linha.map((celula) => (
                      <div
                        key={`${celula.impacto}-${celula.probabilidade}`}
                        className={`flex h-20 flex-col items-center justify-center rounded-xl border text-center font-black ${celulaCalor(celula.total)}`}
                      >
                        <span className="text-2xl">{celula.total}</span>
                        <span className="mt-1 text-[10px] uppercase opacity-80">
                          registros
                        </span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="grid gap-5">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-2xl shadow-black/10">
              <p className="text-xs font-black uppercase tracking-[0.24em] text-blue-200">
                Classificação
              </p>
              <div className="mt-4 grid gap-3">
                {ordemClassificacao.map((nome) => (
                  <div
                    key={nome}
                    className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/70 p-3"
                  >
                    <span className={`rounded-full border px-3 py-1 text-xs font-black ${corClassificacao(nome)}`}>
                      {nome}
                    </span>
                    <span className="text-xl font-black text-white">
                      {dados.porClassificacao[nome] || 0}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-2xl shadow-black/10">
              <p className="text-xs font-black uppercase tracking-[0.24em] text-blue-200">
                Desempenho residual
              </p>
              <div className="mt-4 grid grid-cols-3 gap-3">
                <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
                  <p className="text-xs font-black uppercase text-slate-400">
                    Inerente
                  </p>
                  <p className="mt-2 text-2xl font-black text-white">
                    {formatarNumero(dados.mediaInerente)}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
                  <p className="text-xs font-black uppercase text-slate-400">
                    Residual
                  </p>
                  <p className="mt-2 text-2xl font-black text-white">
                    {formatarNumero(dados.mediaResidual)}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
                  <p className="text-xs font-black uppercase text-slate-400">
                    Variação
                  </p>
                  <p className="mt-2 text-2xl font-black text-emerald-300">
                    {dados.reducaoMedia}%
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-6 grid gap-5 xl:grid-cols-3">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5">
            <p className="text-xs font-black uppercase tracking-[0.24em] text-blue-200">
              Macro processos
            </p>
            <div className="mt-4 grid gap-3">
              {dados.porMacro.map(([nome, valor]) => (
                <Barra key={nome} nome={nome} valor={valor} total={dados.total} />
              ))}
            </div>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5">
            <p className="text-xs font-black uppercase tracking-[0.24em] text-blue-200">
              Setores
            </p>
            <div className="mt-4 grid gap-3">
              {dados.porSetor.map(([nome, valor]) => (
                <Barra key={nome} nome={nome} valor={valor} total={dados.total} />
              ))}
            </div>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5">
            <p className="text-xs font-black uppercase tracking-[0.24em] text-blue-200">
              Residual por faixa
            </p>
            <div className="mt-4 grid gap-3">
              {ordemClassificacao.map((nome) => (
                <Barra
                  key={nome}
                  nome={nome}
                  valor={dados.porResidual[nome] || 0}
                  total={Math.max(dados.comResidual, 1)}
                />
              ))}
            </div>
          </div>
        </section>

        <section className="mt-6 rounded-2xl border border-slate-800 bg-slate-900/80 p-5">
          <div className="flex items-center justify-between gap-3 border-b border-slate-800 pb-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.24em] text-blue-200">
                Prioridade
              </p>
              <h2 className="mt-2 text-xl font-black text-white">
                Maiores exposições inerentes
              </h2>
            </div>
            <BarChart3 className="text-blue-300" />
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[980px]">
              <thead>
                <tr className="text-left text-xs font-black uppercase tracking-[0.18em] text-blue-200">
                  <th className="px-3 py-3">Código</th>
                  <th className="px-3 py-3">Risco</th>
                  <th className="px-3 py-3">Setor</th>
                  <th className="px-3 py-3 text-center">NRI</th>
                  <th className="px-3 py-3">Classificação</th>
                  <th className="px-3 py-3">Residual</th>
                </tr>
              </thead>
              <tbody>
                {dados.criticos.map((item) => (
                  <tr key={item.id} className="border-t border-slate-800 text-sm font-semibold text-slate-200">
                    <td className="px-3 py-4 font-black text-blue-100">{item.codigo}</td>
                    <td className="px-3 py-4">
                      <p className="font-black text-white">
                        {item.riscoCodigo} - {item.riscoNome}
                      </p>
                      <p className="text-xs text-slate-400">
                        {item.macroProcessoCodigo} - {item.macroProcessoNome}
                      </p>
                    </td>
                    <td className="px-3 py-4">{item.setorNome}</td>
                    <td className="px-3 py-4 text-center font-black text-white">
                      {formatarNumero(item.resultadoInerente)}
                    </td>
                    <td className="px-3 py-4">
                      <span className={`rounded-full border px-3 py-1 text-xs font-black ${corClassificacao(item.classificacaoRisco)}`}>
                        {item.classificacaoRisco}
                      </span>
                    </td>
                    <td className="px-3 py-4">
                      {item.classificacaoResidual ? (
                        <span className={`rounded-full border px-3 py-1 text-xs font-black ${corClassificacao(item.classificacaoResidual)}`}>
                          {item.classificacaoResidual}
                        </span>
                      ) : (
                        <span className="text-slate-400">Não avaliado</span>
                      )}
                    </td>
                  </tr>
                ))}
                {!dados.criticos.length && (
                  <tr>
                    <td colSpan={6} className="px-3 py-8 text-center text-sm font-bold text-slate-400">
                      Nenhuma análise cadastrada para montar o dashboard.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
