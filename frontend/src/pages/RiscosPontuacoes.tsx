import { useMemo, useState } from "react";
import { AlertTriangle, Edit3, Gauge, RotateCcw, Save, X } from "lucide-react";

type LinhaPontuacao = {
  id: string;
  criterio: string;
  descricao: string;
  pontuacao: number;
};

type LinhaFaixa = {
  id: string;
  faixa: string;
  classificacao: string;
  periodicidade: string;
};

type Editando =
  | { tipo: "probabilidade" | "impacto"; id: string; dados: LinhaPontuacao }
  | { tipo: "faixa"; id: string; dados: LinhaFaixa }
  | null;

const probabilidadeInicial: LinhaPontuacao[] = [
  { id: "prob-1", criterio: "Controle", descricao: "Muito ruim", pontuacao: 5 },
  { id: "prob-2", criterio: "Controle", descricao: "Ruim", pontuacao: 4 },
  { id: "prob-3", criterio: "Controle", descricao: "Média", pontuacao: 3 },
  { id: "prob-4", criterio: "Controle", descricao: "Boa", pontuacao: 2 },
  { id: "prob-5", criterio: "Controle", descricao: "Muito boa", pontuacao: 1 },
  {
    id: "prob-6",
    criterio: "Frequência / Exposição",
    descricao: "No mínimo 1 vez por ano",
    pontuacao: 5,
  },
  {
    id: "prob-7",
    criterio: "Frequência / Exposição",
    descricao: "1 ocorrência a cada 2 anos",
    pontuacao: 4,
  },
  {
    id: "prob-8",
    criterio: "Frequência / Exposição",
    descricao: "1 ocorrência a cada 5 anos",
    pontuacao: 3,
  },
  {
    id: "prob-9",
    criterio: "Frequência / Exposição",
    descricao: "1 ocorrência a cada 10 anos",
    pontuacao: 2,
  },
  {
    id: "prob-10",
    criterio: "Frequência / Exposição",
    descricao: "1 ocorrência a cada 25 anos",
    pontuacao: 1,
  },
  { id: "prob-11", criterio: "Intervalo", descricao: "Não realiza revisão", pontuacao: 5 },
  { id: "prob-12", criterio: "Intervalo", descricao: "Bienal", pontuacao: 4 },
  { id: "prob-13", criterio: "Intervalo", descricao: "Anual", pontuacao: 3 },
  { id: "prob-14", criterio: "Intervalo", descricao: "Semestral", pontuacao: 2 },
  { id: "prob-15", criterio: "Intervalo", descricao: "Trimestral", pontuacao: 1 },
];

const impactoInicial: LinhaPontuacao[] = [
  {
    id: "imp-1",
    criterio: "Acidentes / SSE",
    descricao: "Única ou múltiplas vítimas",
    pontuacao: 5,
  },
  {
    id: "imp-2",
    criterio: "Acidentes / SSE",
    descricao: "Lesão grave/fraturas",
    pontuacao: 4,
  },
  {
    id: "imp-3",
    criterio: "Acidentes / SSE",
    descricao: "Perda de tempo > 3 dias",
    pontuacao: 3,
  },
  {
    id: "imp-4",
    criterio: "Acidentes / SSE",
    descricao: "Acidente sem afastamento / trabalho restrito",
    pontuacao: 2,
  },
  {
    id: "imp-5",
    criterio: "Acidentes / SSE",
    descricao: "Quase acidente ou simples atendimento",
    pontuacao: 1,
  },
  {
    id: "imp-6",
    criterio: "Parada na Operação",
    descricao: "Superior a 15 dias",
    pontuacao: 5,
  },
  { id: "imp-7", criterio: "Parada na Operação", descricao: "Até 14 dias", pontuacao: 4 },
  { id: "imp-8", criterio: "Parada na Operação", descricao: "Até 7 dias", pontuacao: 3 },
  { id: "imp-9", criterio: "Parada na Operação", descricao: "Até 3 dias", pontuacao: 2 },
  { id: "imp-10", criterio: "Parada na Operação", descricao: "Até 1 dia", pontuacao: 1 },
  {
    id: "imp-11",
    criterio: "Impacto Financeiro",
    descricao: "Superior a US$1.000.000,00",
    pontuacao: 5,
  },
  {
    id: "imp-12",
    criterio: "Impacto Financeiro",
    descricao: "US$500.000,01 a US$1.000.000,00",
    pontuacao: 4,
  },
  {
    id: "imp-13",
    criterio: "Impacto Financeiro",
    descricao: "US$200.000,01 a US$500.000,00",
    pontuacao: 3,
  },
  {
    id: "imp-14",
    criterio: "Impacto Financeiro",
    descricao: "US$50.000,01 a US$200.000,00",
    pontuacao: 2,
  },
  {
    id: "imp-15",
    criterio: "Impacto Financeiro",
    descricao: "Até US$50.000,00",
    pontuacao: 1,
  },
  {
    id: "imp-16",
    criterio: "Impacto Ambiental",
    descricao: "Liberação de poluente não-IMO > 2.000L/Kg ou IMO classe 1, 6 ou 7",
    pontuacao: 5,
  },
  {
    id: "imp-17",
    criterio: "Impacto Ambiental",
    descricao: "Liberação externa 200-2.000L/Kg ou IMO classe 2, 3, 4, 5, 8 ou 9",
    pontuacao: 4,
  },
  {
    id: "imp-18",
    criterio: "Impacto Ambiental",
    descricao: "Contaminação externa < 200L/Kg",
    pontuacao: 3,
  },
  {
    id: "imp-19",
    criterio: "Impacto Ambiental",
    descricao: "Liberação < 20L/Kg contida imediatamente",
    pontuacao: 2,
  },
  {
    id: "imp-20",
    criterio: "Impacto Ambiental",
    descricao: "Quase acidente ou lançamento < 20L/Kg",
    pontuacao: 1,
  },
  {
    id: "imp-21",
    criterio: "Imagem da Empresa",
    descricao: "Cobertura imprensa internacional",
    pontuacao: 5,
  },
  {
    id: "imp-22",
    criterio: "Imagem da Empresa",
    descricao: "Cobertura imprensa nacional",
    pontuacao: 4,
  },
  {
    id: "imp-23",
    criterio: "Imagem da Empresa",
    descricao: "Cobertura imprensa estadual",
    pontuacao: 3,
  },
  {
    id: "imp-24",
    criterio: "Imagem da Empresa",
    descricao: "Cobertura imprensa local",
    pontuacao: 2,
  },
  {
    id: "imp-25",
    criterio: "Imagem da Empresa",
    descricao: "Nenhum impacto significativo ou negativo",
    pontuacao: 1,
  },
];

const faixasInicial: LinhaFaixa[] = [
  {
    id: "faixa-1",
    faixa: "0,00 a 5,00",
    classificacao: "BAIXO",
    periodicidade: "Revisão a cada 24 meses",
  },
  {
    id: "faixa-2",
    faixa: "5,01 a 10,00",
    classificacao: "MENOR",
    periodicidade: "Revisão a cada 12 meses",
  },
  {
    id: "faixa-3",
    faixa: "10,01 a 15,00",
    classificacao: "ALTO",
    periodicidade: "Revisão a cada 180 dias",
  },
  {
    id: "faixa-4",
    faixa: "15,01 a 25,00",
    classificacao: "EXTREMO",
    periodicidade: "Revisão a cada 90 dias",
  },
  {
    id: "faixa-5",
    faixa: "Extremo",
    classificacao: "EXTREMO",
    periodicidade: "Residual em até 30 dias",
  },
  {
    id: "faixa-6",
    faixa: "Maior/Alto",
    classificacao: "ALTO",
    periodicidade: "Residual em até 90 dias",
  },
];

const inputClass =
  "w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm font-semibold text-white outline-none transition focus:border-blue-400";

function BotaoEditar({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-9 items-center gap-2 rounded-xl border border-blue-400/30 bg-blue-500/10 px-3 text-xs font-black text-blue-200 transition hover:border-blue-300 hover:bg-blue-500/20"
    >
      <Edit3 size={14} />
      Editar
    </button>
  );
}

export default function RiscosPontuacoes() {
  const [probabilidades, setProbabilidades] = useState(probabilidadeInicial);
  const [impactos, setImpactos] = useState(impactoInicial);
  const [faixas, setFaixas] = useState(faixasInicial);
  const [editando, setEditando] = useState<Editando>(null);
  const [mensagem, setMensagem] = useState("");

  const totais = useMemo(
    () => ({
      probabilidade: probabilidades.length,
      impacto: impactos.length,
      faixas: faixas.length,
    }),
    [probabilidades.length, impactos.length, faixas.length],
  );

  function salvarEdicao() {
    if (!editando) return;

    if (editando.tipo === "probabilidade") {
      setProbabilidades((lista) =>
        lista.map((linha) => (linha.id === editando.id ? editando.dados : linha)),
      );
    }

    if (editando.tipo === "impacto") {
      setImpactos((lista) =>
        lista.map((linha) => (linha.id === editando.id ? editando.dados : linha)),
      );
    }

    if (editando.tipo === "faixa") {
      setFaixas((lista) =>
        lista.map((linha) => (linha.id === editando.id ? editando.dados : linha)),
      );
    }

    setEditando(null);
    setMensagem("Linha atualizada nesta tela. A persistência será ligada na próxima etapa.");
    window.setTimeout(() => setMensagem(""), 4000);
  }

  function resetarPadrao() {
    setProbabilidades(probabilidadeInicial);
    setImpactos(impactoInicial);
    setFaixas(faixasInicial);
    setEditando(null);
    setMensagem("Pontuações restauradas para o padrão visual desta tela.");
  }

  function renderTabelaPontuacao(
    titulo: string,
    subtitulo: string,
    tipo: "probabilidade" | "impacto",
    linhas: LinhaPontuacao[],
  ) {
    return (
      <section className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-xl shadow-black/20">
        <div className="flex flex-col gap-2 border-b border-slate-800 pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-black text-white">{titulo}</h2>
            <p className="text-sm font-semibold text-slate-300">{subtitulo}</p>
          </div>
          <span className="rounded-full border border-blue-400/30 bg-blue-500/10 px-3 py-1 text-xs font-black text-blue-200">
            {linhas.length} critérios
          </span>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[720px] border-separate border-spacing-y-2">
            <thead>
              <tr className="text-left text-xs font-black uppercase tracking-[0.18em] text-blue-200">
                <th className="px-3 py-2">Critério</th>
                <th className="px-3 py-2">Descrição</th>
                <th className="px-3 py-2 text-center">Pontuação</th>
                <th className="px-3 py-2 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {linhas.map((linha) => (
                <tr key={linha.id} className="bg-slate-950/70 text-sm font-semibold text-slate-100">
                  <td className="rounded-l-xl px-3 py-3 text-blue-100">{linha.criterio}</td>
                  <td className="px-3 py-3">{linha.descricao}</td>
                  <td className="px-3 py-3 text-center">
                    <span className="inline-flex h-8 min-w-8 items-center justify-center rounded-full bg-lime-400 px-3 text-sm font-black text-slate-950">
                      {linha.pontuacao}
                    </span>
                  </td>
                  <td className="rounded-r-xl px-3 py-3 text-right">
                    <BotaoEditar onClick={() => setEditando({ tipo, id: linha.id, dados: { ...linha } })} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    );
  }

  return (
    <div className="min-h-[calc(100vh-5rem)] bg-slate-950 px-4 py-6 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col gap-4 border-b border-slate-800 pb-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.35em] text-blue-300">
              Análise de Riscos
            </p>
            <h1 className="mt-2 text-3xl font-black text-white">Pontuações</h1>
            <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-slate-300">
              Critérios de probabilidade, impacto e classificação usados como
              base para a pontuação automática das análises.
            </p>
          </div>
          <button
            type="button"
            onClick={resetarPadrao}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-700 px-4 py-3 text-sm font-black text-slate-100 transition hover:border-blue-400 hover:text-white"
          >
            <RotateCcw size={16} />
            Restaurar padrão
          </button>
        </div>

        <div className="mt-6 rounded-2xl border border-amber-400/30 bg-amber-500/10 p-4 text-amber-100">
          <div className="flex gap-3">
            <AlertTriangle className="mt-0.5 shrink-0 text-amber-300" size={22} />
            <div>
              <p className="font-black">Atenção antes de editar</p>
              <p className="mt-1 text-sm font-semibold leading-6 text-amber-50">
                Qualquer alteração em pontuação, faixa ou periodicidade poderá
                impactar registros de análise de riscos já efetuados quando a
                persistência e os cálculos automáticos forem ativados.
              </p>
            </div>
          </div>
        </div>

        {mensagem && (
          <div className="mt-4 rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm font-black text-emerald-100">
            {mensagem}
          </div>
        )}

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {[
            ["Critérios de Probabilidade", totais.probabilidade],
            ["Critérios de Impacto", totais.impacto],
            ["Faixas de Classificação", totais.faixas],
          ].map(([titulo, total]) => (
            <div key={titulo} className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5">
              <Gauge className="text-blue-300" size={22} />
              <p className="mt-3 text-xs font-black uppercase tracking-[0.25em] text-slate-400">{titulo}</p>
              <p className="mt-2 text-3xl font-black text-white">{total}</p>
            </div>
          ))}
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-2">
          {renderTabelaPontuacao(
            "Critério de Probabilidade",
            "Controle, frequência/exposição e intervalo de revisão.",
            "probabilidade",
            probabilidades,
          )}
          {renderTabelaPontuacao(
            "Critério de Impacto",
            "Acidentes/SSE, parada, financeiro, ambiental e imagem.",
            "impacto",
            impactos,
          )}
        </div>

        <section className="mt-6 rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-xl shadow-black/20">
          <div className="border-b border-slate-800 pb-4">
            <h2 className="text-xl font-black text-white">Faixa e Classificação</h2>
            <p className="text-sm font-semibold text-slate-300">
              Periodicidade e ação conforme a faixa de resultado.
            </p>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[760px] border-separate border-spacing-y-2">
              <thead>
                <tr className="text-left text-xs font-black uppercase tracking-[0.18em] text-blue-200">
                  <th className="px-3 py-2">Faixa</th>
                  <th className="px-3 py-2">Classificação</th>
                  <th className="px-3 py-2">Periodicidade / Ação</th>
                  <th className="px-3 py-2 text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {faixas.map((linha) => (
                  <tr key={linha.id} className="bg-slate-950/70 text-sm font-semibold text-slate-100">
                    <td className="rounded-l-xl px-3 py-3 text-blue-100">{linha.faixa}</td>
                    <td className="px-3 py-3">
                      <span className="rounded-full bg-blue-500/15 px-3 py-1 text-xs font-black text-blue-100">
                        {linha.classificacao}
                      </span>
                    </td>
                    <td className="px-3 py-3">{linha.periodicidade}</td>
                    <td className="rounded-r-xl px-3 py-3 text-right">
                      <BotaoEditar onClick={() => setEditando({ tipo: "faixa", id: linha.id, dados: { ...linha } })} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {editando && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur">
          <div className="w-full max-w-2xl rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.3em] text-amber-300">
                  Edição de pontuação
                </p>
                <h2 className="mt-2 text-2xl font-black text-white">Editar linha</h2>
              </div>
              <button
                type="button"
                onClick={() => setEditando(null)}
                className="rounded-xl border border-slate-700 p-2 text-slate-300 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-5 rounded-xl border border-amber-400/30 bg-amber-500/10 p-3 text-sm font-semibold text-amber-50">
              Alterar este valor poderá impactar registros já efetuados quando
              as pontuações forem usadas nos cálculos automáticos.
            </div>

            <div className="mt-5 grid gap-4">
              {editando.tipo === "faixa" ? (
                <>
                  <label className="text-sm font-black text-slate-200">
                    Faixa
                    <input
                      className={`${inputClass} mt-2`}
                      value={editando.dados.faixa}
                      onChange={(event) =>
                        setEditando({
                          ...editando,
                          dados: { ...editando.dados, faixa: event.target.value },
                        })
                      }
                    />
                  </label>
                  <label className="text-sm font-black text-slate-200">
                    Classificação
                    <input
                      className={`${inputClass} mt-2`}
                      value={editando.dados.classificacao}
                      onChange={(event) =>
                        setEditando({
                          ...editando,
                          dados: { ...editando.dados, classificacao: event.target.value },
                        })
                      }
                    />
                  </label>
                  <label className="text-sm font-black text-slate-200">
                    Periodicidade / Ação
                    <input
                      className={`${inputClass} mt-2`}
                      value={editando.dados.periodicidade}
                      onChange={(event) =>
                        setEditando({
                          ...editando,
                          dados: { ...editando.dados, periodicidade: event.target.value },
                        })
                      }
                    />
                  </label>
                </>
              ) : (
                <>
                  <label className="text-sm font-black text-slate-200">
                    Critério
                    <input
                      className={`${inputClass} mt-2`}
                      value={editando.dados.criterio}
                      onChange={(event) =>
                        setEditando({
                          ...editando,
                          dados: { ...editando.dados, criterio: event.target.value },
                        })
                      }
                    />
                  </label>
                  <label className="text-sm font-black text-slate-200">
                    Descrição
                    <input
                      className={`${inputClass} mt-2`}
                      value={editando.dados.descricao}
                      onChange={(event) =>
                        setEditando({
                          ...editando,
                          dados: { ...editando.dados, descricao: event.target.value },
                        })
                      }
                    />
                  </label>
                  <label className="text-sm font-black text-slate-200">
                    Pontuação
                    <input
                      className={`${inputClass} mt-2`}
                      min={1}
                      max={5}
                      type="number"
                      value={editando.dados.pontuacao}
                      onChange={(event) =>
                        setEditando({
                          ...editando,
                          dados: {
                            ...editando.dados,
                            pontuacao: Number(event.target.value || 0),
                          },
                        })
                      }
                    />
                  </label>
                </>
              )}
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setEditando(null)}
                className="rounded-xl border border-slate-700 px-5 py-3 text-sm font-black text-slate-200 hover:text-white"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={salvarEdicao}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-blue-950/30 hover:bg-blue-500"
              >
                <Save size={16} />
                Salvar ajuste
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
