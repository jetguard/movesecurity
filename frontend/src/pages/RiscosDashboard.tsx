import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  BrainCircuit,
  CalendarDays,
  Download,
  FileText,
  Grid2X2,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import { Link } from "react-router-dom";
import { api } from "../services/api";

type ControleSelecionado = {
  id?: number | null;
  codigo?: string;
  nome: string;
};

type AnaliseCompleta = {
  id: number;
  codigo: string;
  macroProcessoCodigo: string;
  macroProcessoNome: string;
  setorNome: string;
  riscoCodigo: string;
  riscoNome: string;
  fatoresRisco: ControleSelecionado[];
  mediaProbabilidade: number;
  mediaConsequencia: number;
  resultadoInerente: number;
  nivelProbabilidade: string;
  nivelConsequencia: string;
  classificacaoRisco: string;
  periodicidadeAcao: string;
  estrategiaTratamento?: string | null;
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
  if (texto === "EXTREMO") return "bg-red-500/90 text-white border-red-200/50";
  if (texto === "ALTO") return "bg-orange-400/90 text-slate-950 border-orange-100/60";
  if (texto === "MENOR")
    return "bg-amber-200/95 text-slate-950 border-amber-100/70";
  if (texto === "BAIXO")
    return "bg-teal-200/95 text-slate-950 border-teal-100/70";
  return "bg-slate-700/80 text-slate-100 border-slate-500/60";
}

function corCalor(valor: number, maximo: number) {
  if (!valor)
    return "bg-slate-100/10 text-slate-300 border-white/10 shadow-none";
  const intensidade = maximo ? valor / maximo : 0;
  if (intensidade >= 0.78)
    return "bg-red-300/80 text-red-950 border-red-100/70 shadow-red-500/10";
  if (intensidade >= 0.55)
    return "bg-orange-200/80 text-orange-950 border-orange-100/70 shadow-orange-500/10";
  if (intensidade >= 0.32)
    return "bg-amber-100/80 text-amber-950 border-amber-50/80 shadow-amber-500/10";
  return "bg-teal-100/80 text-teal-950 border-teal-50/80 shadow-teal-500/10";
}

function contarPor<T>(itens: T[], chave: (item: T) => string) {
  return itens.reduce<Record<string, number>>((acc, item) => {
    const nome = chave(item) || "-";
    acc[nome] = (acc[nome] || 0) + 1;
    return acc;
  }, {});
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

function CardIndicador({
  titulo,
  valor,
  detalhe,
  icon: Icon,
  tom,
}: {
  titulo: string;
  valor: string | number;
  detalhe: string;
  icon: typeof Activity;
  tom: string;
}) {
  return (
    <div className="group overflow-hidden rounded-2xl border border-white/10 bg-[linear-gradient(145deg,rgba(30,41,59,0.72),rgba(15,23,42,0.88))] p-5 shadow-xl shadow-black/10 ring-1 ring-white/5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-200">
            {titulo}
          </p>
          <p className={`mt-3 text-4xl font-black ${tom}`}>{valor}</p>
        </div>
        <span
          className={`rounded-full border p-4 ${tom} border-current/30 bg-current/10`}
        >
          <Icon size={24} />
        </span>
      </div>
      <p className="mt-3 text-sm font-semibold leading-6 text-slate-300/90">
        {detalhe}
      </p>
    </div>
  );
}

function Barra({
  nome,
  valor,
  total,
}: {
  nome: string;
  valor: number;
  total: number;
}) {
  const percentual = total ? Math.round((valor / total) * 100) : 0;
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3">
      <div className="flex items-center justify-between gap-3 text-sm font-black">
        <span className="truncate text-slate-100">{nome}</span>
        <span className="text-blue-100">{valor}</span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-gradient-to-r from-sky-400 to-teal-300"
          style={{ width: `${percentual}%` }}
        />
      </div>
    </div>
  );
}

const coresRosca = [
  "#38bdf8",
  "#2dd4bf",
  "#facc15",
  "#fb923c",
  "#f87171",
  "#a78bfa",
];

function corEstrategia(nome: string, indice: number) {
  const valor = normalizar(nome);
  if (valor.includes("MITIG")) return "#38bdf8";
  if (valor.includes("ACEIT")) return "#2dd4bf";
  if (valor.includes("TRANSFER")) return "#a78bfa";
  if (valor.includes("EVIT")) return "#f87171";
  if (valor.includes("MONITOR")) return "#facc15";
  return coresRosca[indice % coresRosca.length];
}

function RoscaEstrategias({
  itens,
  total,
}: {
  itens: Array<[string, number]>;
  total: number;
}) {
  let acumulado = 0;
  const segmentos = itens.length
    ? itens.map(([nome, valor], indice) => {
        const inicio = total ? (acumulado / total) * 360 : 0;
        acumulado += valor;
        const fim = total ? (acumulado / total) * 360 : 0;
        return `${corEstrategia(nome, indice)} ${inicio}deg ${fim}deg`;
      })
    : ["rgba(148,163,184,0.24) 0deg 360deg"];

  return (
    <div className="flex flex-col items-center gap-4 lg:flex-row">
      <div className="relative grid h-44 w-44 shrink-0 place-items-center rounded-full border border-white/10 bg-slate-950/70 shadow-2xl shadow-black/20">
        <div
          className="absolute inset-3 rounded-full transition-all duration-700"
          style={{
            background: `conic-gradient(${segmentos.join(", ")})`,
            animation: "riskChartIn 900ms ease-out both",
          }}
        />
        <div className="absolute inset-12 rounded-full border border-white/10 bg-[#07101d]" />
        <div className="relative text-center">
          <p className="text-4xl font-black text-white">{total}</p>
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
            ARCs
          </p>
        </div>
      </div>

      <div className="grid w-full gap-2">
        {itens.map(([nome, valor], indice) => {
          const percentual = total ? Math.round((valor / total) * 100) : 0;
          return (
            <div
              key={nome}
              className="rounded-xl border border-white/10 bg-slate-950/45 p-3"
              style={{ animation: `riskChartIn ${500 + indice * 90}ms ease-out both` }}
            >
              <div className="flex items-center justify-between gap-3 text-sm font-black">
                <span className="flex min-w-0 items-center gap-2 text-slate-100">
                  <span
                    className="h-3 w-3 shrink-0 rounded-full"
                    style={{ backgroundColor: corEstrategia(nome, indice) }}
                  />
                  <span className="truncate">{nome}</span>
                </span>
                <span className="text-slate-200">
                  {valor} · {percentual}%
                </span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${percentual}%`,
                    backgroundColor: corEstrategia(nome, indice),
                  }}
                />
              </div>
            </div>
          );
        })}
        {!itens.length && (
          <p className="rounded-xl border border-white/10 bg-slate-950/45 p-4 text-sm font-bold text-slate-300">
            Nenhuma estratégia cadastrada.
          </p>
        )}
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
    const baixo = analises.filter(
      (item) => normalizar(item.classificacaoRisco) === "BAIXO",
    ).length;
    const menor = analises.filter(
      (item) => normalizar(item.classificacaoRisco) === "MENOR",
    ).length;
    const alto = analises.filter(
      (item) => normalizar(item.classificacaoRisco) === "ALTO",
    ).length;
    const extremo = analises.filter(
      (item) => normalizar(item.classificacaoRisco) === "EXTREMO",
    ).length;
    const comResidual = analises.filter(
      (item) =>
        item.resultadoResidual !== null && item.resultadoResidual !== undefined,
    );
    const comControles = analises.filter(
      (item) =>
        item.preventivos.length ||
        item.detectivos.length ||
        item.corretivos.length,
    ).length;
    const mediaInerente = media(
      analises.map((item) => Number(item.resultadoInerente || 0)),
    );
    const mediaResidual = media(
      comResidual.map((item) => Number(item.resultadoResidual || 0)),
    );
    const reducaoMedia =
      mediaInerente && mediaResidual
        ? Math.round(((mediaResidual - mediaInerente) / mediaInerente) * 100)
        : 0;
    const porClassificacao = contarPor(analises, (item) =>
      normalizar(item.classificacaoRisco),
    );
    const porResidual = contarPor(comResidual, (item) =>
      normalizar(item.classificacaoResidual),
    );
    const porEstrategia = Object.entries(
      contarPor(analises, (item) => item.estrategiaTratamento || "Não definido"),
    ).sort((a, b) => b[1] - a[1]);
    const porMacro = Object.entries(
      contarPor(analises, (item) => item.macroProcessoNome),
    )
      .sort((a, b) => b[1] - a[1])
      .slice(0, 7);
    const criticos = [...analises]
      .sort(
        (a, b) =>
          Number(b.resultadoInerente || 0) - Number(a.resultadoInerente || 0),
      )
      .slice(0, 7);

    return {
      total,
      baixo,
      menor,
      alto,
      extremo,
      comResidual: comResidual.length,
      comControles,
      mediaInerente,
      mediaResidual,
      reducaoMedia,
      porClassificacao,
      porResidual,
      porEstrategia,
      porMacro,
      criticos,
    };
  }, [analises]);

  const matrizProbabilidadeImpacto = useMemo(() => {
    return Array.from({ length: 5 }, (_, impactoIndex) => {
      const impacto = 5 - impactoIndex;
      return Array.from({ length: 5 }, (_, probIndex) => {
        const probabilidade = probIndex + 1;
        const total = analises.filter(
          (item) =>
            Math.round(Number(item.mediaProbabilidade || 0)) ===
              probabilidade &&
            Math.round(Number(item.mediaConsequencia || 0)) === impacto,
        ).length;
        return { impacto, probabilidade, total };
      });
    });
  }, [analises]);

  const mapaRiscoFator = useMemo(() => {
    const riscos = new Map<string, number>();
    const fatores = new Map<string, number>();
    const matriz = new Map<string, number>();

    analises.forEach((analise) => {
      const risco = analise.riscoCodigo || "Sem código";
      riscos.set(risco, (riscos.get(risco) || 0) + 1);
      const fatoresAnalise = analise.fatoresRisco?.length
        ? analise.fatoresRisco
        : [{ codigo: "Sem código", nome: "Sem fator" }];
      fatoresAnalise.forEach((fator) => {
        const codigo = fator.codigo || "Sem código";
        fatores.set(codigo, (fatores.get(codigo) || 0) + 1);
        const chave = `${risco}__${codigo}`;
        matriz.set(chave, (matriz.get(chave) || 0) + 1);
      });
    });

    const linhas = [...riscos.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
    const colunas = [...fatores.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
    const maximo = Math.max(
      1,
      ...linhas.flatMap(([risco]) =>
        colunas.map(([fator]) => matriz.get(`${risco}__${fator}`) || 0),
      ),
    );

    return { linhas, colunas, matriz, maximo };
  }, [analises]);

  const mapaMacroPrioridade = useMemo(() => {
    const macros = new Map<string, number>();
    const prioridades = new Set<string>();
    const matriz = new Map<string, number>();
    analises.forEach((analise) => {
      const macro = [
        analise.macroProcessoCodigo,
        analise.macroProcessoNome,
      ]
        .filter(Boolean)
        .join(" - ") || "Sem macroprocesso";
      const prioridade = normalizar(analise.classificacaoRisco);
      const valor = Number(analise.resultadoInerente || 0);
      prioridades.add(prioridade);
      macros.set(macro, (macros.get(macro) || 0) + valor);
      matriz.set(
        `${macro}__${prioridade}`,
        (matriz.get(`${macro}__${prioridade}`) || 0) + valor,
      );
    });
    const linhas = [...macros.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8);
    const colunas = [...prioridades].sort((a, b) => {
      const indiceA = ordemClassificacao.indexOf(a);
      const indiceB = ordemClassificacao.indexOf(b);
      return (
        (indiceB === -1 ? -1 : indiceB) - (indiceA === -1 ? -1 : indiceA) ||
        a.localeCompare(b)
      );
    });
    const maximo = Math.max(
      1,
      ...linhas.flatMap(([macro]) =>
        colunas.map(
          (prioridade) => matriz.get(`${macro}__${prioridade}`) || 0,
        ),
      ),
    );
    return { linhas, colunas, matriz, maximo };
  }, [analises]);

  return (
    <div className="min-h-[calc(100vh-5rem)] bg-[linear-gradient(180deg,#07101d,#050914)] px-4 py-6 text-white sm:px-6 lg:px-8">
      <style>
        {`
          @keyframes riskChartIn {
            from { opacity: 0; transform: translateY(12px) scale(0.97); }
            to { opacity: 1; transform: translateY(0) scale(1); }
          }
        `}
      </style>
      <div className="mx-auto max-w-[1900px]">
        <header className="overflow-hidden rounded-3xl border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.16),transparent_30%),radial-gradient(circle_at_top_right,rgba(45,212,191,0.12),transparent_28%),linear-gradient(135deg,rgba(15,23,42,0.88),rgba(2,6,23,0.94))] p-6 shadow-xl shadow-black/20 ring-1 ring-white/5 sm:p-8">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex items-center gap-5">
              <span className="rounded-3xl border border-sky-300/25 bg-sky-400/10 p-4 text-sky-200">
                <ShieldAlert size={34} />
              </span>
              <div>
                <p className="text-xs font-black uppercase tracking-[0.34em] text-sky-200">
                  Risk Analytics
                </p>
                <h1 className="mt-2 flex items-center gap-3 text-3xl font-black text-white sm:text-4xl">
                  <Grid2X2 className="text-slate-300" size={30} />
                  Dashboard
                </h1>
                <p className="mt-2 text-sm font-semibold text-slate-300">
                  Visão geral da análise de riscos, controles, residual e mapas
                  de calor.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <div className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-bold text-slate-200">
                <CalendarDays size={16} />
                Base atual
              </div>
              <Link
                to="/riscos/analise-completa"
                className="inline-flex items-center gap-2 rounded-xl border border-sky-300/30 bg-sky-400/10 px-4 py-3 text-sm font-black text-sky-100 hover:bg-sky-400/20"
              >
                <Download size={16} />
                Ver análises
              </Link>
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

        <section className="mt-6 grid gap-4 md:grid-cols-2 2xl:grid-cols-5">
          <CardIndicador
            titulo="Risco extremo"
            valor={dados.extremo}
            detalhe="Exposição máxima na matriz inerente."
            icon={ShieldAlert}
            tom="text-red-400"
          />
          <CardIndicador
            titulo="Risco alto"
            valor={dados.alto}
            detalhe="Requer plano de controle e acompanhamento."
            icon={AlertTriangle}
            tom="text-orange-400"
          />
          <CardIndicador
            titulo="Risco menor"
            valor={dados.menor}
            detalhe="Exposição intermediária monitorada."
            icon={Activity}
            tom="text-yellow-300"
          />
          <CardIndicador
            titulo="Risco baixo"
            valor={dados.baixo}
            detalhe="Riscos com menor prioridade operacional."
            icon={ShieldCheck}
            tom="text-emerald-300"
          />
          <CardIndicador
            titulo="Total"
            valor={dados.total}
            detalhe="Total de análises completas registradas."
            icon={FileText}
            tom="text-sky-300"
          />
        </section>

        <section className="mt-6 grid gap-5 xl:grid-cols-[1.05fr_0.95fr_0.9fr]">
          <div className="rounded-2xl border border-white/10 bg-[linear-gradient(145deg,rgba(15,23,42,0.82),rgba(2,6,23,0.92))] p-5 shadow-xl shadow-black/10 ring-1 ring-white/5">
            <div className="mb-5 flex items-start justify-between gap-3 border-b border-white/10 pb-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.24em] text-blue-200">
                  Tratamento dos riscos
                </p>
                <h2 className="mt-2 text-xl font-black text-white">
                  Estratégia por ARC
                </h2>
              </div>
              <Activity className="text-teal-300" />
            </div>
            <RoscaEstrategias
              itens={dados.porEstrategia}
              total={dados.total}
            />
          </div>

          <div className="rounded-2xl border border-white/10 bg-[linear-gradient(145deg,rgba(15,23,42,0.82),rgba(2,6,23,0.92))] p-5 shadow-xl shadow-black/10 ring-1 ring-white/5">
            <div className="mb-5 border-b border-white/10 pb-4">
              <p className="text-xs font-black uppercase tracking-[0.24em] text-blue-200">
                Residual
              </p>
              <h2 className="mt-2 text-xl font-black text-white">
                Resultado após controles
              </h2>
            </div>
            <div className="grid gap-3">
              {ordemClassificacao.map((nome, indice) => (
                <div
                  key={nome}
                  className="rounded-xl border border-white/10 bg-slate-950/45 p-3"
                  style={{
                    animation: `riskChartIn ${520 + indice * 80}ms ease-out both`,
                  }}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span
                      className={`rounded-full border px-3 py-1 text-xs font-black ${corClassificacao(nome)}`}
                    >
                      {nome}
                    </span>
                    <span className="text-xl font-black text-white">
                      {dados.porResidual[nome] || 0}
                    </span>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-teal-300 to-sky-400 transition-all duration-700"
                      style={{
                        width: `${dados.comResidual ? ((dados.porResidual[nome] || 0) / dados.comResidual) * 100 : 0}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
              {!dados.comResidual && (
                <p className="rounded-xl border border-white/10 bg-slate-950/45 p-4 text-sm font-bold text-slate-300">
                  Nenhuma avaliação residual preenchida ainda.
                </p>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[linear-gradient(145deg,rgba(15,23,42,0.82),rgba(2,6,23,0.92))] p-5 shadow-xl shadow-black/10 ring-1 ring-white/5">
            <div className="mb-5 border-b border-white/10 pb-4">
              <p className="text-xs font-black uppercase tracking-[0.24em] text-blue-200">
                Inerente x residual
              </p>
              <h2 className="mt-2 text-xl font-black text-white">
                Efeito dos controles
              </h2>
            </div>
            <div className="grid gap-4">
              {[
                ["Média inerente", dados.mediaInerente, "from-red-400 to-orange-300"],
                ["Média residual", dados.mediaResidual, "from-sky-400 to-teal-300"],
              ].map(([nome, valor, cor], indice) => {
                const numero = Number(valor);
                const largura = Math.min(100, (numero / 25) * 100);
                return (
                  <div
                    key={String(nome)}
                    className="rounded-xl border border-white/10 bg-slate-950/45 p-4"
                    style={{
                      animation: `riskChartIn ${560 + indice * 100}ms ease-out both`,
                    }}
                  >
                    <div className="flex items-center justify-between text-sm font-black">
                      <span className="text-slate-300">{nome}</span>
                      <span className="text-2xl text-white">
                        {formatarNumero(numero)}
                      </span>
                    </div>
                    <div className="mt-3 h-3 overflow-hidden rounded-full bg-white/10">
                      <div
                        className={`h-full rounded-full bg-gradient-to-r ${cor} transition-all duration-700`}
                        style={{ width: `${largura}%` }}
                      />
                    </div>
                  </div>
                );
              })}
              <div className="rounded-xl border border-white/10 bg-slate-950/45 p-4">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">
                  Variação média
                </p>
                <p
                  className={`mt-2 text-4xl font-black ${
                    dados.reducaoMedia <= 0 ? "text-emerald-300" : "text-red-300"
                  }`}
                >
                  {dados.reducaoMedia}%
                </p>
                <p className="mt-2 text-sm font-semibold text-slate-300">
                  Valores negativos indicam redução do risco após controles.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-6 grid gap-5 2xl:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-2xl border border-white/10 bg-[linear-gradient(145deg,rgba(15,23,42,0.82),rgba(2,6,23,0.92))] p-5 shadow-xl shadow-black/10 ring-1 ring-white/5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.24em] text-blue-200">
                  Mapa de risco
                </p>
                <h2 className="mt-2 text-xl font-black text-white">
                  Probabilidade x consequência
                </h2>
              </div>
              <BrainCircuit className="text-blue-300" />
            </div>
            <div className="mt-5 overflow-x-auto">
              <div className="grid min-w-[620px] grid-cols-[78px_repeat(5,1fr)] gap-2">
                <div />
                {[1, 2, 3, 4, 5].map((prob) => (
                  <div
                    key={prob}
                    className="text-center text-xs font-black text-slate-200"
                  >
                    Prob. {prob}
                  </div>
                ))}
                {matrizProbabilidadeImpacto.map((linha) => (
                  <div key={`linha-${linha[0].impacto}`} className="contents">
                    <div className="flex items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-xs font-black text-slate-200">
                      Cons. {linha[0].impacto}
                    </div>
                    {linha.map((celula) => (
                      <div
                        key={`${celula.impacto}-${celula.probabilidade}`}
                        className={`flex h-20 flex-col items-center justify-center rounded-xl border text-center font-black backdrop-blur ${corCalor(celula.total, Math.max(1, dados.total / 5))}`}
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

          <div className="rounded-2xl border border-white/10 bg-[linear-gradient(145deg,rgba(15,23,42,0.82),rgba(2,6,23,0.92))] p-5 shadow-xl shadow-black/10 ring-1 ring-white/5">
            <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.24em] text-blue-200">
                  Riscos mais críticos
                </p>
                <h2 className="mt-2 text-xl font-black text-white">
                  Ranking por NRI
                </h2>
              </div>
              <BarChart3 className="text-blue-300" />
            </div>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[900px]">
                <thead>
                  <tr className="text-left text-xs font-black uppercase tracking-[0.16em] text-slate-400">
                    <th className="px-3 py-3">Risco</th>
                    <th className="px-3 py-3">Setor</th>
                    <th className="px-3 py-3 text-center">Prob.</th>
                    <th className="px-3 py-3 text-center">Cons.</th>
                    <th className="px-3 py-3 text-center">NRI</th>
                    <th className="px-3 py-3">Nível</th>
                    <th className="px-3 py-3">Residual</th>
                  </tr>
                </thead>
                <tbody>
                  {dados.criticos.map((item) => (
                    <tr
                      key={item.id}
                      className="border-t border-white/10 text-sm font-semibold text-slate-200 hover:bg-white/[0.03]"
                    >
                      <td className="px-3 py-4">
                        <p className="font-black text-white">
                          {item.riscoCodigo} - {item.riscoNome}
                        </p>
                        <p className="text-xs text-slate-400">
                          {item.macroProcessoCodigo} - {item.macroProcessoNome}
                        </p>
                      </td>
                      <td className="px-3 py-4">{item.setorNome}</td>
                      <td className="px-3 py-4 text-center">
                        <span className="rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-1 text-xs font-black text-red-200">
                          {formatarNumero(item.mediaProbabilidade)}
                        </span>
                      </td>
                      <td className="px-3 py-4 text-center">
                        <span className="rounded-lg border border-orange-400/30 bg-orange-500/10 px-3 py-1 text-xs font-black text-orange-200">
                          {formatarNumero(item.mediaConsequencia)}
                        </span>
                      </td>
                      <td className="px-3 py-4 text-center font-black text-white">
                        {formatarNumero(item.resultadoInerente)}
                      </td>
                      <td className="px-3 py-4">
                        <span
                          className={`rounded-full border px-3 py-1 text-xs font-black ${corClassificacao(item.classificacaoRisco)}`}
                        >
                          {item.classificacaoRisco}
                        </span>
                      </td>
                      <td className="px-3 py-4">
                        {item.classificacaoResidual ? (
                          <span
                            className={`rounded-full border px-3 py-1 text-xs font-black ${corClassificacao(item.classificacaoResidual)}`}
                          >
                            {item.classificacaoResidual}
                          </span>
                        ) : (
                          <span className="text-slate-500">Não avaliado</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {!dados.criticos.length && (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-3 py-8 text-center text-sm font-bold text-slate-400"
                      >
                        Nenhuma análise cadastrada para montar o ranking.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section className="mt-6 grid gap-5 xl:grid-cols-[0.8fr_1.2fr_0.9fr]">
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 shadow-xl shadow-black/10 ring-1 ring-white/5">
            <p className="text-xs font-black uppercase tracking-[0.24em] text-blue-200">
              Distribuição por nível
            </p>
            <div className="mt-5 grid gap-3">
              {ordemClassificacao.map((nome) => (
                <div
                  key={nome}
                    className="rounded-xl border border-white/10 bg-slate-950/45 p-3"
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`rounded-full border px-3 py-1 text-xs font-black ${corClassificacao(nome)}`}
                    >
                      {nome}
                    </span>
                    <span className="text-xl font-black text-white">
                      {dados.porClassificacao[nome] || 0}
                    </span>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-sky-400 to-teal-300"
                      style={{
                        width: `${dados.total ? ((dados.porClassificacao[nome] || 0) / dados.total) * 100 : 0}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 shadow-xl shadow-black/10 ring-1 ring-white/5">
            <p className="text-xs font-black uppercase tracking-[0.24em] text-blue-200">
              Macroprocessos
            </p>
            <div className="mt-5 grid gap-3">
              {dados.porMacro.map(([nome, valor]) => (
                <Barra
                  key={nome}
                  nome={nome}
                  valor={valor}
                  total={dados.total}
                />
              ))}
              {!dados.porMacro.length && (
                <p className="rounded-xl border border-white/10 bg-slate-950/45 p-4 text-sm font-bold text-slate-300">
                  Nenhum macroprocesso encontrado.
                </p>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 shadow-xl shadow-black/10 ring-1 ring-white/5">
            <p className="text-xs font-black uppercase tracking-[0.24em] text-blue-200">
              Indicadores
            </p>
            <div className="mt-5 grid gap-3">
              <div className="rounded-xl border border-white/10 bg-slate-950/45 p-4">
                <p className="text-xs font-black uppercase text-slate-400">
                  Média inerente
                </p>
                <p className="mt-2 text-3xl font-black text-white">
                  {formatarNumero(dados.mediaInerente)}
                </p>
              </div>
              <div className="rounded-xl border border-white/10 bg-slate-950/45 p-4">
                <p className="text-xs font-black uppercase text-slate-400">
                  Média residual
                </p>
                <p className="mt-2 text-3xl font-black text-white">
                  {formatarNumero(dados.mediaResidual)}
                </p>
              </div>
              <div className="rounded-xl border border-white/10 bg-slate-950/45 p-4">
                <p className="text-xs font-black uppercase text-slate-400">
                  Variação média
                </p>
                <p
                  className={`mt-2 text-3xl font-black ${dados.reducaoMedia <= 0 ? "text-emerald-300" : "text-red-300"}`}
                >
                  {dados.reducaoMedia}%
                </p>
              </div>
              <div className="rounded-xl border border-white/10 bg-slate-950/45 p-4">
                <p className="text-xs font-black uppercase text-slate-400">
                  Com controles
                </p>
                <p className="mt-2 text-3xl font-black text-sky-300">
                  {dados.comControles}
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-6 space-y-5">
          <div className="rounded-2xl border border-white/10 bg-[linear-gradient(145deg,rgba(15,23,42,0.78),rgba(2,6,23,0.92))] p-5 shadow-xl shadow-black/10 ring-1 ring-white/5">
            <div className="flex flex-col gap-2 border-b border-white/10 pb-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.24em] text-blue-200">
                  Mapa de calor
                </p>
                <h2 className="mt-2 text-xl font-black text-white">
                  Riscos x fatores
                </h2>
              </div>
              <p className="text-xs font-bold text-slate-400">
                Quadrante 10 x 10 com Top riscos por código e Top fatores por
                código
              </p>
            </div>
            <div className="mt-4 overflow-x-auto rounded-2xl border border-white/10 bg-white/[0.035] p-3">
              <table className="w-full min-w-[1280px] border-separate border-spacing-1.5">
                <thead>
                  <tr className="text-left text-xs font-black uppercase tracking-[0.14em] text-slate-300">
                    <th className="sticky left-0 z-10 min-w-[160px] rounded-xl border border-white/10 bg-[#07101d] px-4 py-3">
                      Risco x fator
                    </th>
                    {mapaRiscoFator.colunas.map(([fator]) => (
                      <th
                        key={fator}
                        className="min-w-[96px] rounded-xl border border-white/10 bg-[#07101d] px-4 py-3 text-center"
                      >
                        {fator}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {mapaRiscoFator.linhas.map(([risco]) => (
                    <tr key={risco}>
                      <td className="sticky left-0 z-10 rounded-xl border border-white/10 bg-[#07101d] px-4 py-3 text-sm font-black text-white shadow-lg shadow-black/10">
                        {risco}
                      </td>
                      {mapaRiscoFator.colunas.map(([fator]) => {
                        const valor =
                          mapaRiscoFator.matriz.get(`${risco}__${fator}`) || 0;
                        return (
                          <td
                            key={`${risco}-${fator}`}
                            className={`rounded-xl border px-4 py-3 text-center text-sm font-black shadow-sm backdrop-blur ${corCalor(valor, mapaRiscoFator.maximo)}`}
                          >
                            {valor}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                  {!mapaRiscoFator.linhas.length && (
                    <tr>
                      <td
                        className="rounded-xl bg-slate-950 px-3 py-8 text-center text-sm font-bold text-slate-400"
                        colSpan={11}
                      >
                        Sem dados para o mapa de riscos x fatores.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[linear-gradient(145deg,rgba(15,23,42,0.78),rgba(2,6,23,0.92))] p-5 shadow-xl shadow-black/10 ring-1 ring-white/5">
            <div className="flex flex-col gap-2 border-b border-white/10 pb-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.24em] text-blue-200">
                  Mapa de calor
                </p>
                <h2 className="mt-2 text-xl font-black text-white">
                  Macroprocesso x prioridade
                </h2>
              </div>
              <p className="text-xs font-bold text-slate-400">
                Soma do NRI por macroprocesso e classificação do risco
              </p>
            </div>
            <div className="mt-4 overflow-x-auto rounded-2xl border border-white/10 bg-white/[0.035] p-3">
              <table className="w-full min-w-[980px] border-separate border-spacing-1.5">
                <thead>
                  <tr className="text-left text-xs font-black uppercase tracking-[0.14em] text-slate-300">
                    <th className="sticky left-0 z-10 min-w-[260px] rounded-xl border border-white/10 bg-[#07101d] px-4 py-3">
                      Macroprocesso
                    </th>
                    {mapaMacroPrioridade.colunas.map((prioridade) => (
                      <th
                        key={prioridade}
                        className="min-w-[180px] rounded-xl border border-white/10 bg-[#07101d] px-4 py-3 text-center"
                      >
                        {prioridade}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {mapaMacroPrioridade.linhas.map(([macro]) => (
                    <tr key={macro}>
                      <td className="sticky left-0 z-10 rounded-xl border border-white/10 bg-[#07101d] px-4 py-3 text-sm font-black text-white shadow-lg shadow-black/10">
                        {macro}
                      </td>
                      {mapaMacroPrioridade.colunas.map((prioridade) => {
                        const valor =
                          mapaMacroPrioridade.matriz.get(
                            `${macro}__${prioridade}`,
                          ) || 0;
                        return (
                          <td
                            key={`${macro}-${prioridade}`}
                            className={`rounded-xl border px-4 py-3 text-center text-sm font-black shadow-sm backdrop-blur ${corCalor(valor, mapaMacroPrioridade.maximo)}`}
                          >
                            {formatarNumero(valor)}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                  {!mapaMacroPrioridade.linhas.length && (
                    <tr>
                      <td
                        className="rounded-xl bg-slate-950 px-3 py-8 text-center text-sm font-bold text-slate-400"
                        colSpan={Math.max(
                          2,
                          mapaMacroPrioridade.colunas.length + 1,
                        )}
                      >
                        Sem dados para o mapa de macroprocesso x prioridade.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
