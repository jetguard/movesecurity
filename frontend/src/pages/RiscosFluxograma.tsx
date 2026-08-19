import {
  ArrowDown,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Database,
  FileText,
  GitBranch,
  GitMerge,
  ShieldCheck,
  Target,
} from "lucide-react";

const fluxoPrincipal = [
  {
    numero: "01",
    titulo: "Cadastro Geral",
    descricao:
      "Estruture macroprocessos, setores, riscos, fatores de risco e controles CP, CD e CC.",
    detalhe: "Base de dados para padronizar as próximas análises.",
    icone: Database,
    tom: "border-blue-300/30 bg-blue-500/10 text-blue-100",
  },
  {
    numero: "02",
    titulo: "Abrir ARC",
    descricao:
      "Selecione unidade, macroprocesso, setor, risco e fatores de risco aplicáveis.",
    detalhe: "A ARC nasce aberta e sem decisão final definida.",
    icone: Target,
    tom: "border-cyan-300/30 bg-cyan-500/10 text-cyan-100",
  },
  {
    numero: "03",
    titulo: "Avaliação Inerente",
    descricao:
      "Preencha probabilidade e consequência para o sistema calcular MPP, MPI, NRI e classificação.",
    detalhe: "Representa o risco antes dos controles.",
    icone: BarChart3,
    tom: "border-amber-300/35 bg-amber-500/10 text-amber-100",
  },
  {
    numero: "04",
    titulo: "Controles e Residual",
    descricao:
      "Vincule controles preventivos, detectivos e corretivos, depois calcule a avaliação residual.",
    detalhe: "Mostra o risco depois das barreiras existentes.",
    icone: ShieldCheck,
    tom: "border-emerald-300/30 bg-emerald-500/10 text-emerald-100",
  },
];

const decisoes = [
  {
    titulo: "Há fator de risco sem plano?",
    resposta: "Sim",
    acao: "Criar plano de ação para cada fator pendente.",
  },
  {
    titulo: "Há plano em aberto?",
    resposta: "Sim",
    acao: "Acompanhar responsável, prazo, status e evidências.",
  },
  {
    titulo: "Todos os planos foram concluídos?",
    resposta: "Sim",
    acao: "Liberar a finalização formal da ARC.",
  },
];

const saidas = [
  {
    titulo: "Finalização da ARC",
    descricao:
      "Registre a decisão final: mitigar, aceitar, transferir, evitar ou monitorar, com justificativa e aprovação.",
    icone: CheckCircle2,
  },
  {
    titulo: "PDF da análise",
    descricao:
      "Gere o dossiê com análise inerente, residual, controles, planos, responsáveis, prazos e decisão final.",
    icone: FileText,
  },
  {
    titulo: "Dashboard",
    descricao:
      "Acompanhe indicadores, mapas de calor, conclusão dos planos e distribuição por classificação.",
    icone: GitMerge,
  },
];

const regras = [
  "A ARC só pode ser finalizada quando todos os planos de ação estiverem concluídos.",
  "Cada fator de risco deve possuir tratamento próprio quando exigir plano de ação.",
  "A decisão final é registrada apenas no fechamento da ARC.",
  "PDF e dashboard refletem a situação real da análise.",
];

function CardFluxo({ etapa }: { etapa: (typeof fluxoPrincipal)[number] }) {
  const Icone = etapa.icone;
  return (
    <article
      className={`min-w-[255px] flex-1 rounded-3xl border p-5 shadow-xl shadow-black/20 ${etapa.tom}`}
    >
      <div className="flex items-start justify-between gap-3">
        <span className="rounded-2xl border border-white/10 bg-slate-950/65 px-3 py-2 text-xs font-black tracking-[0.18em] text-white">
          {etapa.numero}
        </span>
        <span className="rounded-2xl border border-white/10 bg-white/10 p-3">
          <Icone size={22} />
        </span>
      </div>
      <h2 className="mt-5 text-xl font-black text-white">{etapa.titulo}</h2>
      <p className="mt-3 text-sm font-semibold leading-6 text-slate-100">
        {etapa.descricao}
      </p>
      <p className="mt-4 rounded-2xl border border-white/10 bg-slate-950/45 px-3 py-2 text-xs font-black leading-5 text-slate-200">
        {etapa.detalhe}
      </p>
    </article>
  );
}

export default function RiscosFluxograma() {
  return (
    <div className="min-h-screen bg-[#030817] px-4 py-6 text-white sm:px-6 lg:px-8">
      <section className="mx-auto max-w-[1800px] overflow-hidden rounded-3xl border border-slate-800 bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.2),transparent_34%),linear-gradient(135deg,rgba(15,23,42,0.98),rgba(2,6,23,0.98))] shadow-2xl shadow-black/25">
        <header className="border-b border-white/10 p-6 sm:p-8">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.35em] text-blue-200">
                Análise de Riscos
              </p>
              <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">
                Fluxograma da ARC
              </h1>
              <p className="mt-3 max-w-4xl text-sm font-semibold leading-6 text-slate-300">
                Caminho operacional da análise completa: cadastro, criação da
                ARC, avaliação inerente, controles, avaliação residual, plano de
                ação, finalização, PDF e dashboard.
              </p>
            </div>
            <div className="inline-flex w-fit items-center gap-2 rounded-2xl border border-blue-300/25 bg-blue-500/10 px-4 py-3 text-sm font-black text-blue-100">
              <GitBranch size={18} />
              Ciclo de tratamento do risco
            </div>
          </div>
        </header>

        <div className="p-5 sm:p-6">
          <div className="rounded-3xl border border-slate-800 bg-slate-950/50 p-4">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-stretch">
              {fluxoPrincipal.map((etapa, index) => (
                <div
                  key={etapa.numero}
                  className="flex flex-col gap-4 xl:flex-1 xl:flex-row xl:items-center"
                >
                  <CardFluxo etapa={etapa} />
                  {index < fluxoPrincipal.length - 1 && (
                    <div className="flex items-center justify-center text-blue-200">
                      <ArrowDown className="xl:hidden" size={26} />
                      <ArrowRight className="hidden xl:block" size={28} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="my-5 flex justify-center text-blue-200">
            <ArrowDown size={30} />
          </div>

          <section className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
            <div className="rounded-3xl border border-slate-800 bg-slate-950/60 p-5">
              <div className="flex flex-col gap-3 border-b border-white/10 pb-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.28em] text-amber-200">
                    Ponto de decisão
                  </p>
                  <h2 className="mt-2 text-2xl font-black">
                    Planos de ação por fator de risco
                  </h2>
                </div>
                <span className="rounded-full border border-amber-300/35 bg-amber-400/10 px-3 py-1.5 text-xs font-black text-amber-100">
                  Bloqueia finalização se houver pendência
                </span>
              </div>

              <div className="mt-5 grid gap-4 lg:grid-cols-3">
                {decisoes.map((decisao) => (
                  <article
                    key={decisao.titulo}
                    className="relative rounded-3xl border border-amber-300/25 bg-[linear-gradient(135deg,rgba(251,191,36,0.14),rgba(15,23,42,0.72))] p-4"
                  >
                    <div className="mx-auto flex h-24 w-24 rotate-45 items-center justify-center rounded-2xl border border-amber-200/30 bg-slate-950/75">
                      <span className="-rotate-45 text-lg font-black text-amber-100">
                        {decisao.resposta}
                      </span>
                    </div>
                    <h3 className="mt-5 text-center text-base font-black text-white">
                      {decisao.titulo}
                    </h3>
                    <p className="mt-3 text-center text-sm font-semibold leading-6 text-slate-200">
                      {decisao.acao}
                    </p>
                  </article>
                ))}
              </div>
            </div>

            <aside className="rounded-3xl border border-slate-800 bg-slate-950/60 p-5">
              <p className="text-xs font-black uppercase tracking-[0.28em] text-blue-200">
                Regras do processo
              </p>
              <div className="mt-4 space-y-3">
                {regras.map((regra, index) => (
                  <div
                    key={regra}
                    className="flex gap-3 rounded-2xl border border-slate-800 bg-slate-900/80 p-4"
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-blue-500/15 text-xs font-black text-blue-100">
                      {index + 1}
                    </span>
                    <p className="text-sm font-bold leading-6 text-slate-200">
                      {regra}
                    </p>
                  </div>
                ))}
              </div>
            </aside>
          </section>

          <div className="my-5 flex justify-center text-emerald-200">
            <ArrowDown size={30} />
          </div>

          <section className="rounded-3xl border border-emerald-300/20 bg-[linear-gradient(135deg,rgba(16,185,129,0.12),rgba(15,23,42,0.76))] p-5">
            <div className="flex flex-col gap-3 border-b border-white/10 pb-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.28em] text-emerald-200">
                  Saída do fluxo
                </p>
                <h2 className="mt-2 text-2xl font-black">
                  Encerramento e evidências
                </h2>
              </div>
              <span className="rounded-full border border-emerald-300/30 bg-emerald-400/10 px-3 py-1.5 text-xs font-black text-emerald-100">
                Só após todos os planos concluídos
              </span>
            </div>

            <div className="mt-5 grid gap-4 lg:grid-cols-3">
              {saidas.map((saida) => {
                const Icone = saida.icone;
                return (
                  <article
                    key={saida.titulo}
                    className="rounded-3xl border border-white/10 bg-slate-950/55 p-5"
                  >
                    <span className="inline-flex rounded-2xl border border-emerald-300/25 bg-emerald-400/10 p-3 text-emerald-100">
                      <Icone size={22} />
                    </span>
                    <h3 className="mt-4 text-xl font-black text-white">
                      {saida.titulo}
                    </h3>
                    <p className="mt-3 text-sm font-semibold leading-6 text-slate-200">
                      {saida.descricao}
                    </p>
                  </article>
                );
              })}
            </div>
          </section>
        </div>
      </section>
    </div>
  );
}
