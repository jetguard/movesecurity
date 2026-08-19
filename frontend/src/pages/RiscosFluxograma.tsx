import {
  BarChart3,
  CheckCircle2,
  ClipboardList,
  Database,
  FileText,
  GitBranch,
  ShieldCheck,
  Target,
} from "lucide-react";

const etapas = [
  {
    numero: "01",
    titulo: "Cadastro Geral",
    texto:
      "Cadastre macroprocessos, setores, riscos, fatores de risco e controles CP, CD e CC.",
    icone: Database,
    cor: "from-blue-500/20 to-cyan-500/10 border-blue-300/25",
  },
  {
    numero: "02",
    titulo: "Análise Completa",
    texto:
      "Crie a ARC selecionando macroprocesso, setor, risco principal e fatores de risco.",
    icone: Target,
    cor: "from-violet-500/20 to-blue-500/10 border-violet-300/25",
  },
  {
    numero: "03",
    titulo: "Risco Inerente",
    texto:
      "Preencha probabilidade e consequência. O sistema calcula MPP, MPI, NRI, classificação e periodicidade.",
    icone: BarChart3,
    cor: "from-amber-500/20 to-orange-500/10 border-amber-300/25",
  },
  {
    numero: "04",
    titulo: "Controles e Residual",
    texto:
      "Associe controles preventivos, detectivos e corretivos. Depois preencha a avaliação residual.",
    icone: ShieldCheck,
    cor: "from-emerald-500/20 to-teal-500/10 border-emerald-300/25",
  },
  {
    numero: "05",
    titulo: "Plano de Ação",
    texto:
      "Cada fator de risco da ARC pode receber um plano de ação específico, com responsável, prazo e status.",
    icone: ClipboardList,
    cor: "from-sky-500/20 to-blue-500/10 border-sky-300/25",
  },
  {
    numero: "06",
    titulo: "Finalização da ARC",
    texto:
      "Após tratar os fatores, registre a decisão final: mitigar, aceitar, transferir, evitar ou monitorar.",
    icone: CheckCircle2,
    cor: "from-lime-500/20 to-emerald-500/10 border-lime-300/25",
  },
  {
    numero: "07",
    titulo: "PDF e Dashboard",
    texto:
      "O PDF consolida a análise, controles, planos, residual e finalização. O dashboard mostra indicadores e mapas de calor.",
    icone: FileText,
    cor: "from-slate-500/20 to-blue-500/10 border-slate-300/25",
  },
];

const regras = [
  "A estratégia da ARC nasce sem preenchimento e só é definida na finalização.",
  "Cada plano de ação trata um fator de risco específico.",
  "A conclusão da ARC evolui conforme os fatores têm planos concluídos.",
  "A finalização registra decisão, justificativa, aprovador e data.",
];

export default function RiscosFluxograma() {
  return (
    <div className="min-h-screen bg-[#030817] p-4 text-white sm:p-6">
      <section className="overflow-hidden rounded-3xl border border-slate-800 bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.22),transparent_35%),linear-gradient(135deg,rgba(15,23,42,0.96),rgba(2,6,23,0.96))] p-6 shadow-2xl shadow-black/25">
        <div className="flex flex-col gap-4 border-b border-white/10 pb-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.35em] text-blue-200">
              Análise de Riscos
            </p>
            <h1 className="mt-3 text-3xl font-black sm:text-4xl">
              Fluxograma da ARC
            </h1>
            <p className="mt-3 max-w-3xl text-sm font-semibold leading-6 text-slate-300">
              Visão operacional do ciclo completo: cadastro, análise inerente,
              controles, residual, plano de ação, finalização e consolidação.
            </p>
          </div>
          <div className="inline-flex w-fit items-center gap-2 rounded-2xl border border-blue-300/25 bg-blue-500/10 px-4 py-3 text-sm font-black text-blue-100">
            <GitBranch size={18} />
            Ciclo ponta a ponta
          </div>
        </div>

        <div className="mt-6 grid gap-4 xl:grid-cols-[1fr_320px]">
          <div className="rounded-3xl border border-slate-800 bg-slate-950/55 p-4">
            <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
              {etapas.map((etapa, index) => {
                const Icone = etapa.icone;
                return (
                  <article
                    key={etapa.numero}
                    className={`relative min-h-[190px] rounded-2xl border bg-gradient-to-br p-5 shadow-lg shadow-black/10 ${etapa.cor}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <span className="rounded-2xl border border-white/10 bg-slate-950/70 px-3 py-2 text-xs font-black text-blue-100">
                        Etapa {etapa.numero}
                      </span>
                      <span className="rounded-2xl border border-white/10 bg-white/10 p-3 text-white">
                        <Icone size={22} />
                      </span>
                    </div>
                    <h2 className="mt-5 text-xl font-black">{etapa.titulo}</h2>
                    <p className="mt-3 text-sm font-semibold leading-6 text-slate-200">
                      {etapa.texto}
                    </p>
                    {index < etapas.length - 1 && (
                      <span className="absolute -bottom-3 left-8 rounded-full border border-blue-300/25 bg-blue-600 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-white lg:-right-3 lg:bottom-auto lg:left-auto lg:top-1/2">
                        próximo
                      </span>
                    )}
                  </article>
                );
              })}
            </div>
          </div>

          <aside className="rounded-3xl border border-slate-800 bg-slate-950/70 p-5">
            <p className="text-xs font-black uppercase tracking-[0.24em] text-blue-200">
              Regras do ciclo
            </p>
            <div className="mt-4 space-y-3">
              {regras.map((regra) => (
                <div
                  key={regra}
                  className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 text-sm font-bold leading-6 text-slate-200"
                >
                  {regra}
                </div>
              ))}
            </div>

            <div className="mt-5 rounded-2xl border border-emerald-300/25 bg-emerald-400/10 p-4">
              <p className="text-sm font-black text-emerald-100">
                Quando a ARC termina?
              </p>
              <p className="mt-2 text-sm font-semibold leading-6 text-emerald-50/90">
                A ARC fica formalmente finalizada quando a decisão final é
                registrada com justificativa e aprovação. Antes disso, ela
                permanece em acompanhamento.
              </p>
            </div>
          </aside>
        </div>
      </section>
    </div>
  );
}
