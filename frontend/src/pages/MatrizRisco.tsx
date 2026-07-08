import { AlertTriangle, ArrowRight, CheckCircle2, Grid3X3, Info, ShieldAlert } from "lucide-react";

type Nivel = {
  nome: string;
  descricao: string;
  classe: string;
};

type CelulaMatriz = {
  probabilidade: string;
  severidade: string;
  nivel: "Baixo" | "Moderado" | "Alto" | "Crítico";
};

const probabilidades: Nivel[] = [
  { nome: "Baixa", descricao: "Evento improvável, sem histórico recorrente.", classe: "border-emerald-400/30 bg-emerald-500/10 text-emerald-100" },
  { nome: "Média", descricao: "Pode ocorrer em condições específicas.", classe: "border-amber-400/30 bg-amber-500/10 text-amber-100" },
  { nome: "Alta", descricao: "Existe histórico, tendência ou exposição frequente.", classe: "border-orange-400/30 bg-orange-500/10 text-orange-100" },
  { nome: "Crítica", descricao: "Ocorrência provável ou já observada repetidamente.", classe: "border-red-400/30 bg-red-500/10 text-red-100" },
];

const severidades: Nivel[] = [
  { nome: "Baixa", descricao: "Impacto controlado, sem interrupção relevante.", classe: "border-emerald-400/30 bg-emerald-500/10 text-emerald-100" },
  { nome: "Média", descricao: "Impacto operacional limitado, exige acompanhamento.", classe: "border-amber-400/30 bg-amber-500/10 text-amber-100" },
  { nome: "Alta", descricao: "Pode afetar operação, segurança, custo ou cliente.", classe: "border-orange-400/30 bg-orange-500/10 text-orange-100" },
  { nome: "Crítica", descricao: "Risco severo para pessoas, operação, imagem ou continuidade.", classe: "border-red-400/30 bg-red-500/10 text-red-100" },
];

const pesos: Record<string, number> = { Baixa: 1, Média: 2, Alta: 3, Crítica: 4 };

function calcularNivel(probabilidade: string, severidade: string): CelulaMatriz["nivel"] {
  const score = (pesos[probabilidade] || 1) * (pesos[severidade] || 1);
  if (score <= 3) return "Baixo";
  if (score <= 7) return "Moderado";
  if (score <= 11) return "Alto";
  return "Crítico";
}

function classeNivel(nivel: CelulaMatriz["nivel"]) {
  if (nivel === "Crítico") return "border-red-400/40 bg-red-500/20 text-red-50 shadow-red-950/20";
  if (nivel === "Alto") return "border-orange-400/40 bg-orange-500/20 text-orange-50 shadow-orange-950/20";
  if (nivel === "Moderado") return "border-amber-400/40 bg-amber-500/20 text-amber-50 shadow-amber-950/20";
  return "border-emerald-400/40 bg-emerald-500/20 text-emerald-50 shadow-emerald-950/20";
}

const matriz: CelulaMatriz[] = probabilidades.flatMap((probabilidade) =>
  severidades.map((severidade) => ({
    probabilidade: probabilidade.nome,
    severidade: severidade.nome,
    nivel: calcularNivel(probabilidade.nome, severidade.nome),
  })),
);

const acoes = [
  {
    nivel: "Baixo",
    texto: "Monitorar dentro da rotina operacional e manter evidências mínimas.",
    classe: "border-emerald-400/30 bg-emerald-500/10 text-emerald-100",
  },
  {
    nivel: "Moderado",
    texto: "Registrar plano preventivo, definir responsável e acompanhar prazo.",
    classe: "border-amber-400/30 bg-amber-500/10 text-amber-100",
  },
  {
    nivel: "Alto",
    texto: "Priorizar tratativa, acionar responsável e acompanhar indicadores.",
    classe: "border-orange-400/30 bg-orange-500/10 text-orange-100",
  },
  {
    nivel: "Crítico",
    texto: "Escalar imediatamente, registrar plano de ação e acompanhar até mitigação.",
    classe: "border-red-400/30 bg-red-500/10 text-red-100",
  },
];

export default function MatrizRisco() {
  return (
    <div className="space-y-6 text-slate-100">
      <section className="overflow-hidden rounded-2xl border border-slate-700/70 bg-slate-950 shadow-2xl shadow-slate-950/30">
        <div className="relative p-6 sm:p-8">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(37,99,235,0.24),transparent_34%),linear-gradient(135deg,rgba(15,23,42,0.98),rgba(2,6,23,0.96))]" />
          <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <div className="flex items-center gap-3 text-xs font-bold uppercase tracking-[0.26em] text-sky-300">
                <Grid3X3 size={18} />
                Metodologia de Risco
              </div>
              <h1 className="mt-4 text-3xl font-black tracking-tight text-white sm:text-4xl">Matriz de Risco 5x5</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
                Esta tela define a régua usada pelo JetGuard para classificar riscos por probabilidade e severidade. O
                acompanhamento dos riscos cadastrados continua na página <strong className="text-white">Análise de Riscos</strong>.
              </p>
            </div>
            <div className="rounded-2xl border border-sky-400/20 bg-sky-500/10 p-4 text-sm text-sky-100">
              <p className="flex items-center gap-2 font-bold">
                <Info size={16} />
                Sem duplicidade operacional
              </p>
              <p className="mt-2 max-w-sm text-sky-100/80">
                Aqui ficam os critérios. O mapa de calor com registros reais fica em Riscos.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-700 bg-slate-900/80 p-5 shadow-xl shadow-slate-950/20">
          <h2 className="text-lg font-bold text-white">Probabilidade</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {probabilidades.map((item) => (
              <div key={item.nome} className={`rounded-xl border p-4 ${item.classe}`}>
                <strong>{item.nome}</strong>
                <p className="mt-2 text-xs leading-5 opacity-85">{item.descricao}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-700 bg-slate-900/80 p-5 shadow-xl shadow-slate-950/20">
          <h2 className="text-lg font-bold text-white">Severidade</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {severidades.map((item) => (
              <div key={item.nome} className={`rounded-xl border p-4 ${item.classe}`}>
                <strong>{item.nome}</strong>
                <p className="mt-2 text-xs leading-5 opacity-85">{item.descricao}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-700 bg-slate-900/80 p-5 shadow-xl shadow-slate-950/20">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-white">Classificação 5x5</h2>
            <p className="mt-1 text-sm text-slate-400">Cruzamento entre probabilidade e severidade para definir prioridade.</p>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-300">
            <ShieldAlert size={15} />
            Quanto maior o cruzamento, maior a urgência.
          </div>
        </div>

        <div className="mt-5 overflow-x-auto">
          <div className="grid min-w-[760px] grid-cols-[120px_repeat(4,1fr)] gap-2">
            <div className="rounded-xl border border-slate-700 bg-slate-950/80 p-3 text-xs font-bold uppercase tracking-widest text-slate-400">
              Prob. / Sev.
            </div>
            {severidades.map((severidade) => (
              <div key={severidade.nome} className="rounded-xl border border-slate-700 bg-slate-950/80 p-3 text-center text-sm font-bold text-slate-200">
                {severidade.nome}
              </div>
            ))}
            {probabilidades.map((probabilidade) => (
              <div key={probabilidade.nome} className="contents">
                <div className="flex items-center rounded-xl border border-slate-700 bg-slate-950/80 p-3 text-sm font-bold text-slate-200">
                  {probabilidade.nome}
                </div>
                {severidades.map((severidade) => {
                  const item = matriz.find((celula) => celula.probabilidade === probabilidade.nome && celula.severidade === severidade.nome);
                  return (
                    <div
                      key={`${probabilidade.nome}-${severidade.nome}`}
                      className={`min-h-24 rounded-xl border p-4 shadow-lg ${classeNivel(item?.nivel || "Baixo")}`}
                    >
                      <p className="text-xs font-semibold opacity-80">{probabilidade.nome} x {severidade.nome}</p>
                      <p className="mt-2 text-xl font-black">{item?.nivel}</p>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-4">
        {acoes.map((acao) => (
          <div key={acao.nivel} className={`rounded-2xl border p-5 ${acao.classe}`}>
            <p className="flex items-center gap-2 text-sm font-black">
              {acao.nivel === "Baixo" ? <CheckCircle2 size={17} /> : <AlertTriangle size={17} />}
              {acao.nivel}
            </p>
            <p className="mt-3 text-xs leading-5 opacity-85">{acao.texto}</p>
          </div>
        ))}
      </section>

      <section className="rounded-2xl border border-blue-400/20 bg-blue-500/10 p-5 text-sm text-blue-50">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-500/20 text-blue-200">
            <ArrowRight size={20} />
          </div>
          <div>
            <h2 className="font-bold text-white">Como usar na rotina</h2>
            <p className="mt-1 leading-6 text-blue-100/85">
              Ao abrir uma análise de risco, o usuário informa probabilidade e severidade. O JetGuard calcula o nível
              automaticamente e exibe o risco no mapa de calor operacional da página Análise de Risco.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
