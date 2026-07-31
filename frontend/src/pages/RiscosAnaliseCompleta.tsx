import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import {
  AlertTriangle,
  BrainCircuit,
  Edit3,
  Plus,
  Save,
  Trash2,
  X,
} from "lucide-react";
import { api } from "../services/api";

type Setor = {
  id: number;
  nome: string;
  macroProcessoId: number;
};

type MacroProcesso = {
  id: number;
  codigo: string;
  nome: string;
  setores: Setor[];
};

type Cadastro = {
  id: number;
  codigo: string;
  nome: string;
};

type CadastroGeral = {
  macroProcessos: MacroProcesso[];
  riscos: Cadastro[];
  fatores: Cadastro[];
  controles: Cadastro[];
};

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
  percentualProbabilidade: number;
  nivelProbabilidade: string;
  mediaConsequencia: number;
  nivelConsequencia: string;
  resultadoInerente: number;
  nivelRiscoInerente: string;
  classificacaoRisco: string;
  periodicidadeAcao: string;
  preventivos: ControleSelecionado[];
  detectivos: ControleSelecionado[];
  corretivos: ControleSelecionado[];
  probabilidadeResidual?: number | null;
  nivelProbabilidadeResidual?: string | null;
  consequenciaResidual?: number | null;
  nivelConsequenciaResidual?: string | null;
  resultadoResidual?: number | null;
  nivelRiscoResidual?: string | null;
  classificacaoResidual?: string | null;
  createdAt: string;
};

type Formulario = {
  macroProcessoId: string;
  setorId: string;
  riscoId: string;
  fatoresIds: string[];
  sc: number;
  fe: number;
  intervalo: number;
  sse: number;
  ope: number;
  fin: number;
  adm: number;
  img: number;
  lc: number;
};

type CampoNota = keyof Pick<
  Formulario,
  "sc" | "fe" | "intervalo" | "sse" | "ope" | "fin" | "adm" | "img" | "lc"
>;

const cadastroVazio: CadastroGeral = {
  macroProcessos: [],
  riscos: [],
  fatores: [],
  controles: [],
};

const formularioInicial: Formulario = {
  macroProcessoId: "",
  setorId: "",
  riscoId: "",
  fatoresIds: [],
  sc: 1,
  fe: 1,
  intervalo: 1,
  sse: 1,
  ope: 1,
  fin: 1,
  adm: 1,
  img: 1,
  lc: 1,
};

const camposProbabilidade: Array<{
  campo: CampoNota;
  label: string;
  ajuda: string;
}> = [
  { campo: "sc", label: "SC", ajuda: "Controle" },
  { campo: "fe", label: "FE", ajuda: "Frequência / Exposição" },
  { campo: "intervalo", label: "INT", ajuda: "Intervalo" },
];

const camposConsequencia: Array<{
  campo: CampoNota;
  label: string;
  ajuda: string;
}> = [
  { campo: "sse", label: "SSE", ajuda: "Segurança / Saúde / Meio ambiente" },
  { campo: "ope", label: "OPE", ajuda: "Operação" },
  { campo: "fin", label: "FIN", ajuda: "Financeiro" },
  { campo: "adm", label: "AMB", ajuda: "Ambiental" },
  { campo: "img", label: "IMG", ajuda: "Imagem da empresa" },
  { campo: "lc", label: "L&C", ajuda: "Legal e Compliance" },
];

const inputClass =
  "h-12 rounded-xl border border-slate-700 bg-slate-950 px-4 text-sm font-bold text-white outline-none transition focus:border-blue-400";

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
  if (resultado <= 5)
    return {
      nivel: "BAIXO",
      periodicidade: "Revisão a cada 24 meses",
      cor: "bg-emerald-500 text-slate-950",
    };
  if (resultado <= 10)
    return {
      nivel: "MENOR",
      periodicidade: "Revisão a cada 12 meses",
      cor: "bg-lime-300 text-slate-950",
    };
  if (resultado <= 15)
    return {
      nivel: "ALTO",
      periodicidade: "Revisão a cada 180 dias",
      cor: "bg-amber-300 text-slate-950",
    };
  return {
    nivel: "EXTREMO",
    periodicidade: "Revisão a cada 90 dias",
    cor: "bg-red-600 text-white",
  };
}

function corNivel(texto?: string | null) {
  const valor = String(texto || "").toUpperCase();
  if (["BAIXO", "MENOR", "REMOTO"].includes(valor))
    return "bg-emerald-300 text-slate-950";
  if (["POSSÍVEL", "POSSÃVEL", "MODERADO"].includes(valor))
    return "bg-yellow-300 text-slate-950";
  if (["ALTO", "MAIOR", "PROVÁVEL", "PROVÃVEL", "SEVERO"].includes(valor))
    return "bg-orange-500 text-white";
  if (["EXTREMO", "CRÍTICO", "CRÃTICO", "FREQUENTE"].includes(valor))
    return "bg-red-600 text-white";
  return "bg-slate-700 text-slate-100";
}

function BadgeNivel({ children }: { children: string }) {
  return (
    <span
      className={`inline-flex items-center justify-center rounded-full px-3 py-1 text-xs font-black ${corNivel(
        children,
      )}`}
    >
      {children || "-"}
    </span>
  );
}

function etiquetaControle(item: ControleSelecionado) {
  return item.codigo ? `${item.codigo} - ${item.nome}` : item.nome;
}

export default function RiscosAnaliseCompleta() {
  const [cadastro, setCadastro] = useState<CadastroGeral>(cadastroVazio);
  const [analises, setAnalises] = useState<AnaliseCompleta[]>([]);
  const [form, setForm] = useState<Formulario>(formularioInicial);
  const [carregando, setCarregando] = useState(true);
  const [mensagem, setMensagem] = useState("");
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [controlesEditando, setControlesEditando] =
    useState<AnaliseCompleta | null>(null);
  const [preventivos, setPreventivos] = useState<string[]>([]);
  const [detectivos, setDetectivos] = useState<string[]>([]);
  const [corretivos, setCorretivos] = useState<string[]>([]);
  const [probabilidadeResidual, setProbabilidadeResidual] = useState("");
  const [consequenciaResidual, setConsequenciaResidual] = useState("");

  useEffect(() => {
    carregar();
  }, []);

  async function carregar() {
    setCarregando(true);
    const [cadastroResponse, analisesResponse] = await Promise.all([
      api.get("/riscos/cadastro-geral"),
      api.get("/riscos/analise-completa"),
    ]);
    setCadastro(cadastroResponse.data);
    setAnalises(analisesResponse.data);
    setCarregando(false);
  }

  const setoresDisponiveis = useMemo(() => {
    const macro = cadastro.macroProcessos.find(
      (item) => String(item.id) === form.macroProcessoId,
    );
    return macro?.setores || [];
  }, [cadastro.macroProcessos, form.macroProcessoId]);

  const previa = useMemo(() => {
    const sc = pontuacao(form.sc);
    const fe = pontuacao(form.fe);
    const intervalo = pontuacao(form.intervalo);
    const sse = pontuacao(form.sse);
    const ope = pontuacao(form.ope);
    const fin = pontuacao(form.fin);
    const adm = pontuacao(form.adm);
    const img = pontuacao(form.img);
    const lc = pontuacao(form.lc);
    const notaProbabilidade = sc * 5 + fe * 4 + intervalo * 3;
    const mediaProbabilidade = arredondar(notaProbabilidade / 12);
    const percentualProbabilidade = arredondar(mediaProbabilidade / 5);
    const notaConsequencia =
      sse * 3 + ope * 5 + fin * 3 + adm * 1 + img * 2 + lc * 3;
    const mediaConsequencia = arredondar(notaConsequencia / 17);
    const resultado = arredondar(mediaProbabilidade * mediaConsequencia);
    return {
      mediaProbabilidade,
      percentualProbabilidade,
      nivelProbabilidade: nivelProbabilidade(mediaProbabilidade),
      notaConsequencia,
      mediaConsequencia,
      nivelConsequencia: nivelConsequencia(mediaConsequencia),
      resultado,
      ...classificar(resultado),
    };
  }, [form]);

  const previaResidual = useMemo(() => {
    const prob = probabilidadeResidual
      ? Number(String(probabilidadeResidual).replace(",", "."))
      : null;
    const cons = consequenciaResidual
      ? Number(String(consequenciaResidual).replace(",", "."))
      : null;
    const probValido = prob !== null && Number.isFinite(prob);
    const consValido = cons !== null && Number.isFinite(cons);
    const resultado =
      probValido && consValido ? arredondar(Number(prob) * Number(cons)) : null;
    const classificacao = resultado !== null ? classificar(resultado) : null;

    return {
      probabilidade: probValido ? Number(prob) : null,
      nivelProbabilidade: probValido ? nivelProbabilidade(Number(prob)) : "-",
      consequencia: consValido ? Number(cons) : null,
      nivelConsequencia: consValido ? nivelConsequencia(Number(cons)) : "-",
      resultado,
      classificacao: classificacao?.nivel || "-",
      cor: classificacao?.cor || "bg-slate-700 text-slate-100",
    };
  }, [probabilidadeResidual, consequenciaResidual]);

  function alterarNota(campo: CampoNota, valor: string) {
    setForm((atual) => ({ ...atual, [campo]: pontuacao(Number(valor)) }));
  }

  function alternarFator(id: string) {
    setForm((atual) => ({
      ...atual,
      fatoresIds: atual.fatoresIds.includes(id)
        ? atual.fatoresIds.filter((item) => item !== id)
        : [...atual.fatoresIds, id],
    }));
  }

  function itensSelecionados(ids: string[]) {
    return ids
      .map((id) => cadastro.controles.find((item) => String(item.id) === id))
      .filter(Boolean)
      .map((item) => ({
        id: item!.id,
        codigo: item!.codigo,
        nome: item!.nome,
      }));
  }

  function fatoresSelecionados() {
    return form.fatoresIds
      .map((id) => cadastro.fatores.find((item) => String(item.id) === id))
      .filter(Boolean)
      .map((item) => ({
        id: item!.id,
        codigo: item!.codigo,
        nome: item!.nome,
      }));
  }

  async function salvarAnalise(event: FormEvent) {
    event.preventDefault();
    setErro("");
    setMensagem("");
    setSalvando(true);
    try {
      await api.post("/riscos/analise-completa", {
        macroProcessoId: Number(form.macroProcessoId),
        setorId: Number(form.setorId),
        riscoId: Number(form.riscoId),
        fatoresRisco: fatoresSelecionados(),
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
      setForm(formularioInicial);
      setMensagem("Análise completa cadastrada com sucesso.");
      await carregar();
    } catch (error: any) {
      setErro(
        error?.response?.data?.error || "Não foi possível salvar a análise.",
      );
    } finally {
      setSalvando(false);
    }
  }

  function abrirControles(analise: AnaliseCompleta) {
    setControlesEditando(analise);
    setPreventivos(analise.preventivos.map((item) => String(item.id || "")));
    setDetectivos(analise.detectivos.map((item) => String(item.id || "")));
    setCorretivos(analise.corretivos.map((item) => String(item.id || "")));
    setProbabilidadeResidual(
      analise.probabilidadeResidual
        ? String(analise.probabilidadeResidual)
        : "",
    );
    setConsequenciaResidual(
      analise.consequenciaResidual ? String(analise.consequenciaResidual) : "",
    );
  }

  function alternarControle(
    lista: string[],
    setLista: (ids: string[]) => void,
    id: string,
  ) {
    setLista(
      lista.includes(id) ? lista.filter((item) => item !== id) : [...lista, id],
    );
  }

  async function salvarControles() {
    if (!controlesEditando) return;
    setSalvando(true);
    try {
      await api.patch(
        `/riscos/analise-completa/${controlesEditando.id}/controles`,
        {
          preventivos: itensSelecionados(preventivos),
          detectivos: itensSelecionados(detectivos),
          corretivos: itensSelecionados(corretivos),
          probabilidadeResidual,
          consequenciaResidual,
        },
      );
      setControlesEditando(null);
      setMensagem("Controles atualizados com sucesso.");
      await carregar();
    } catch (error: any) {
      setErro(
        error?.response?.data?.error || "Não foi possível salvar os controles.",
      );
    } finally {
      setSalvando(false);
    }
  }

  async function excluirAnalise(analise: AnaliseCompleta) {
    const confirmar = window.confirm(
      `Excluir definitivamente a análise ${analise.codigo}? Esta ação não poderá ser desfeita.`,
    );
    if (!confirmar) return;

    setErro("");
    setMensagem("");
    try {
      await api.delete(`/riscos/analise-completa/${analise.id}`);
      setMensagem("Análise excluída com sucesso.");
      await carregar();
    } catch (error: any) {
      setErro(
        error?.response?.data?.error || "Não foi possível excluir a análise.",
      );
    }
  }

  function renderCampoNota(campo: CampoNota, label: string, ajuda: string) {
    return (
      <label className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
        <span className="block text-sm font-black text-white">{label}</span>
        <span className="mt-1 block min-h-10 text-xs font-semibold text-slate-300">
          {ajuda}
        </span>
        <select
          className={`${inputClass} mt-3 w-full`}
          value={form[campo]}
          onChange={(event) => alterarNota(campo, event.target.value)}
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

  function renderListaControles(
    titulo: string,
    selecionados: string[],
    setSelecionados: (ids: string[]) => void,
  ) {
    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
        <h3 className="text-sm font-black text-white">{titulo}</h3>
        <div className="mt-3 grid max-h-56 gap-2 overflow-auto pr-1">
          {cadastro.controles.map((controle) => (
            <label
              key={controle.id}
              className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 text-sm font-bold transition ${
                selecionados.includes(String(controle.id))
                  ? "border-blue-400 bg-blue-600 text-white"
                  : "border-slate-700 bg-slate-900 text-slate-200 hover:border-blue-500"
              }`}
            >
              <input
                type="checkbox"
                className="h-4 w-4"
                checked={selecionados.includes(String(controle.id))}
                onChange={() =>
                  alternarControle(
                    selecionados,
                    setSelecionados,
                    String(controle.id),
                  )
                }
              />
              {controle.codigo} - {controle.nome}
            </label>
          ))}
          {!cadastro.controles.length && (
            <p className="rounded-xl bg-slate-900 p-3 text-sm font-bold text-slate-300">
              Nenhum CP cadastrado em Cadastro Geral.
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-5rem)] bg-slate-950 px-4 py-6 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1800px]">
        <header className="border-b border-slate-800 pb-6">
          <p className="text-xs font-black uppercase tracking-[0.35em] text-blue-300">
            Análise de Riscos
          </p>
          <h1 className="mt-2 text-3xl font-black text-white">
            Análise Completa
          </h1>
          <p className="mt-2 max-w-4xl text-sm font-semibold leading-6 text-slate-300">
            Cadastre a análise preenchendo macro processo, setor, risco, fatores
            de risco e notas de probabilidade/consequência. Os demais campos são
            calculados automaticamente.
          </p>
        </header>

        {carregando && (
          <div className="mt-6 rounded-xl border border-slate-800 bg-slate-900 p-5 text-sm font-black text-slate-300">
            Carregando dados da análise...
          </div>
        )}

        {mensagem && (
          <div className="mt-6 rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm font-black text-emerald-100">
            {mensagem}
          </div>
        )}
        {erro && (
          <div className="mt-6 rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm font-black text-red-100">
            {erro}
          </div>
        )}

        <form
          onSubmit={salvarAnalise}
          className="mt-6 rounded-2xl border border-slate-800 bg-slate-900/80 p-4 shadow-2xl shadow-black/20 sm:p-5"
        >
          <div className="flex items-center gap-3">
            <BrainCircuit className="text-blue-300" size={22} />
            <h2 className="text-xl font-black text-white">
              Nova análise completa
            </h2>
          </div>

          <div className="mt-5 grid gap-4 xl:grid-cols-3">
            <label className="text-sm font-black text-slate-200">
              Macro Processo
              <select
                className={`${inputClass} mt-2 w-full`}
                value={form.macroProcessoId}
                onChange={(event) =>
                  setForm((atual) => ({
                    ...atual,
                    macroProcessoId: event.target.value,
                    setorId: "",
                  }))
                }
                required
              >
                <option value="">Selecione</option>
                {cadastro.macroProcessos.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.codigo} - {item.nome}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-sm font-black text-slate-200">
              Setor
              <select
                className={`${inputClass} mt-2 w-full`}
                value={form.setorId}
                onChange={(event) =>
                  setForm((atual) => ({
                    ...atual,
                    setorId: event.target.value,
                  }))
                }
                required
                disabled={!form.macroProcessoId}
              >
                <option value="">Selecione</option>
                {setoresDisponiveis.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.nome}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-sm font-black text-slate-200">
              Risco
              <select
                className={`${inputClass} mt-2 w-full`}
                value={form.riscoId}
                onChange={(event) =>
                  setForm((atual) => ({
                    ...atual,
                    riscoId: event.target.value,
                  }))
                }
                required
              >
                <option value="">Selecione</option>
                {cadastro.riscos.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.codigo} - {item.nome}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="mt-5 rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
            <p className="text-sm font-black text-white">Fatores de Risco</p>
            <p className="mt-1 text-xs font-semibold text-slate-300">
              Selecione quantos fatores forem necessários. O sistema não limita
              a três fatores como a planilha.
            </p>
            <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
              {cadastro.fatores.map((item) => (
                <label
                  key={item.id}
                  className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 text-sm font-bold transition ${
                    form.fatoresIds.includes(String(item.id))
                      ? "border-blue-400 bg-blue-600 text-white"
                      : "border-slate-700 bg-slate-900 text-slate-200 hover:border-blue-500"
                  }`}
                >
                  <input
                    type="checkbox"
                    className="h-4 w-4"
                    checked={form.fatoresIds.includes(String(item.id))}
                    onChange={() => alternarFator(String(item.id))}
                  />
                  {item.codigo} - {item.nome}
                </label>
              ))}
            </div>
          </div>

          <div className="mt-5 grid gap-5 2xl:grid-cols-[0.9fr_1.5fr]">
            <section>
              <h3 className="text-sm font-black uppercase tracking-[0.18em] text-blue-200">
                Probabilidade
              </h3>
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                {camposProbabilidade.map((item) =>
                  renderCampoNota(item.campo, item.label, item.ajuda),
                )}
              </div>
            </section>

            <section>
              <h3 className="text-sm font-black uppercase tracking-[0.18em] text-blue-200">
                Consequência
              </h3>
              <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {camposConsequencia.map((item) =>
                  renderCampoNota(item.campo, item.label, item.ajuda),
                )}
              </div>
            </section>
          </div>

          <div className="mt-5 grid gap-3 rounded-2xl border border-blue-400/30 bg-blue-500/10 p-4 sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-8">
            <div>
              <p className="text-xs font-black uppercase text-blue-200">Nota</p>
              <p className="mt-1 text-xl font-black text-white">
                {form.sc * 5 + form.fe * 4 + form.intervalo * 3}
              </p>
            </div>
            <div>
              <p className="text-xs font-black uppercase text-blue-200">MPP</p>
              <p className="mt-1 text-xl font-black text-white">
                {previa.mediaProbabilidade}
              </p>
              <p className="text-xs font-bold text-blue-100">
                {previa.nivelProbabilidade}
              </p>
            </div>
            <div>
              <p className="text-xs font-black uppercase text-blue-200">%P</p>
              <p className="mt-1 text-xl font-black text-white">
                {Math.round(previa.percentualProbabilidade * 100)}%
              </p>
            </div>
            <div>
              <p className="text-xs font-black uppercase text-blue-200">
                Nota Conseq.
              </p>
              <p className="mt-1 text-xl font-black text-white">
                {previa.notaConsequencia}
              </p>
            </div>
            <div>
              <p className="text-xs font-black uppercase text-blue-200">MPI</p>
              <p className="mt-1 text-xl font-black text-white">
                {previa.mediaConsequencia}
              </p>
              <p className="text-xs font-bold text-blue-100">
                {previa.nivelConsequencia}
              </p>
            </div>
            <div>
              <p className="text-xs font-black uppercase text-blue-200">NRI</p>
              <p className="mt-1 text-xl font-black text-white">
                {previa.resultado}
              </p>
            </div>
            <div>
              <p className="text-xs font-black uppercase text-blue-200">
                Classificação
              </p>
              <span
                className={`mt-2 inline-flex rounded-full px-3 py-1 text-xs font-black ${previa.cor}`}
              >
                {previa.nivel}
              </span>
            </div>
            <div>
              <p className="text-xs font-black uppercase text-blue-200">
                Periodicidade
              </p>
              <p className="mt-1 text-sm font-black text-white">
                {previa.periodicidade}
              </p>
            </div>
          </div>

          <div className="mt-5 flex justify-end">
            <button
              disabled={salvando}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-blue-950/30 hover:bg-blue-500 disabled:opacity-60"
            >
              <Plus size={16} />
              Cadastrar análise
            </button>
          </div>
        </form>

        <section className="mt-6 rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-2xl shadow-black/20">
          <div className="flex flex-col gap-2 border-b border-slate-800 pb-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-xl font-black text-white">
                Análises cadastradas
              </h2>
              <p className="text-sm font-semibold text-slate-300">
                Após o cadastro, edite os controles preventivos, detectivos e
                corretivos.
              </p>
            </div>
            <span className="rounded-full border border-blue-400/30 bg-blue-500/10 px-3 py-1 text-xs font-black text-blue-200">
              {analises.length} registros
            </span>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[1480px] border-separate border-spacing-y-2">
              <thead>
                <tr className="text-left text-xs font-black uppercase tracking-[0.18em] text-blue-200">
                  <th className="px-3 py-2">Código</th>
                  <th className="px-3 py-2">Identificação</th>
                  <th className="px-3 py-2">Fatores</th>
                  <th className="px-3 py-2 text-center">Prob.</th>
                  <th className="px-3 py-2 text-center">%P</th>
                  <th className="px-3 py-2 text-center">Cons.</th>
                  <th className="px-3 py-2 text-center">NRI</th>
                  <th className="px-3 py-2">Classificação</th>
                  <th className="px-3 py-2">Residual</th>
                  <th className="px-3 py-2">Controles</th>
                  <th className="px-3 py-2 text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {analises.map((analise) => (
                  <tr
                    key={analise.id}
                    className="bg-slate-950/70 text-sm font-semibold text-slate-100"
                  >
                    <td className="rounded-l-xl px-3 py-4 font-black text-blue-100">
                      {analise.codigo}
                    </td>
                    <td className="px-3 py-4">
                      <p className="font-black text-white">
                        {analise.riscoCodigo} - {analise.riscoNome}
                      </p>
                      <p className="mt-1 text-xs text-slate-300">
                        {analise.macroProcessoCodigo} -{" "}
                        {analise.macroProcessoNome} / {analise.setorNome}
                      </p>
                    </td>
                    <td className="px-3 py-4 text-xs text-slate-300">
                      {analise.fatoresRisco.map(etiquetaControle).join(", ")}
                    </td>
                    <td className="px-3 py-4 text-center">
                      {analise.mediaProbabilidade}
                      <p className="mt-1">
                        <BadgeNivel>{analise.nivelProbabilidade}</BadgeNivel>
                      </p>
                    </td>
                    <td className="px-3 py-4 text-center font-black">
                      {Math.round((analise.percentualProbabilidade || 0) * 100)}
                      %
                    </td>
                    <td className="px-3 py-4 text-center">
                      {analise.mediaConsequencia}
                      <p className="mt-1">
                        <BadgeNivel>{analise.nivelConsequencia}</BadgeNivel>
                      </p>
                    </td>
                    <td className="px-3 py-4 text-center font-black">
                      {analise.resultadoInerente}
                    </td>
                    <td className="px-3 py-4">
                      <BadgeNivel>{analise.classificacaoRisco}</BadgeNivel>
                      <p className="mt-1 text-xs text-slate-400">
                        {analise.periodicidadeAcao}
                      </p>
                    </td>
                    <td className="px-3 py-4 text-xs text-slate-300">
                      <p>
                        Prob.:{" "}
                        <span className="font-black text-white">
                          {analise.probabilidadeResidual ?? "-"}
                        </span>{" "}
                        <BadgeNivel>
                          {analise.nivelProbabilidadeResidual || "-"}
                        </BadgeNivel>
                      </p>
                      <p className="mt-1">
                        Cons.:{" "}
                        <span className="font-black text-white">
                          {analise.consequenciaResidual ?? "-"}
                        </span>{" "}
                        <BadgeNivel>
                          {analise.nivelConsequenciaResidual || "-"}
                        </BadgeNivel>
                      </p>
                      <p className="mt-1">
                        Class.:{" "}
                        <BadgeNivel>
                          {analise.classificacaoResidual || "-"}
                        </BadgeNivel>
                      </p>
                    </td>
                    <td className="px-3 py-4 text-xs text-slate-300">
                      <p>Prev.: {analise.preventivos.length}</p>
                      <p>Det.: {analise.detectivos.length}</p>
                      <p>Corr.: {analise.corretivos.length}</p>
                    </td>
                    <td className="rounded-r-xl px-3 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => abrirControles(analise)}
                          className="inline-flex items-center gap-2 rounded-xl border border-blue-400/30 bg-blue-500/10 px-3 py-2 text-xs font-black text-blue-100 hover:bg-blue-500/20"
                        >
                          <Edit3 size={14} />
                          Controles
                        </button>
                        <button
                          type="button"
                          onClick={() => excluirAnalise(analise)}
                          className="inline-flex items-center gap-2 rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2 text-xs font-black text-red-100 hover:bg-red-500/20"
                        >
                          <Trash2 size={14} />
                          Excluir
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!analises.length && (
                  <tr>
                    <td
                      colSpan={11}
                      className="rounded-xl bg-slate-950/70 p-8 text-center text-sm font-bold text-slate-300"
                    >
                      Nenhuma análise completa cadastrada.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {controlesEditando && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur">
          <div className="max-h-[92vh] w-full max-w-7xl overflow-auto rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.3em] text-blue-300">
                  Controles e Avaliação Residual
                </p>
                <h2 className="mt-2 text-2xl font-black text-white">
                  {controlesEditando.codigo}
                </h2>
                <p className="mt-1 text-sm font-semibold text-slate-300">
                  {controlesEditando.riscoCodigo} -{" "}
                  {controlesEditando.riscoNome}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setControlesEditando(null)}
                className="rounded-xl border border-slate-700 p-2 text-slate-300 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-5 flex gap-3 rounded-xl border border-amber-400/30 bg-amber-500/10 p-4 text-amber-50">
              <AlertTriangle className="mt-0.5 shrink-0 text-amber-300" />
              <p className="text-sm font-semibold leading-6">
                Selecione os controles e preencha a avaliação residual. O
                sistema calcula automaticamente os níveis e a classificação
                residual conforme as faixas da planilha.
              </p>
            </div>

            <div className="mt-5 grid gap-4 xl:grid-cols-[1.5fr_1fr]">
              <div className="grid gap-4 lg:grid-cols-3">
                {renderListaControles(
                  "Preventivo",
                  preventivos,
                  setPreventivos,
                )}
                {renderListaControles("Detectivo", detectivos, setDetectivos)}
                {renderListaControles("Corretivo", corretivos, setCorretivos)}
              </div>

              <section className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                <h3 className="text-sm font-black uppercase tracking-[0.18em] text-blue-200">
                  Avaliação Residual
                </h3>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <label className="text-sm font-black text-slate-200">
                    Probabilidade residual
                    <input
                      className={`${inputClass} mt-2 w-full`}
                      type="number"
                      min="1"
                      max="5"
                      step="0.01"
                      value={probabilidadeResidual}
                      onChange={(event) =>
                        setProbabilidadeResidual(event.target.value)
                      }
                      placeholder="Ex: 3.51"
                    />
                  </label>
                  <label className="text-sm font-black text-slate-200">
                    Consequência residual
                    <input
                      className={`${inputClass} mt-2 w-full`}
                      type="number"
                      min="1"
                      max="5"
                      step="0.01"
                      value={consequenciaResidual}
                      onChange={(event) =>
                        setConsequenciaResidual(event.target.value)
                      }
                      placeholder="Ex: 2.40"
                    />
                  </label>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
                    <p className="text-xs font-black uppercase text-slate-400">
                      Nível de Probabilidade
                    </p>
                    <div className="mt-2">
                      <BadgeNivel>
                        {previaResidual.nivelProbabilidade}
                      </BadgeNivel>
                    </div>
                  </div>
                  <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
                    <p className="text-xs font-black uppercase text-slate-400">
                      Nível de Consequência
                    </p>
                    <div className="mt-2">
                      <BadgeNivel>
                        {previaResidual.nivelConsequencia}
                      </BadgeNivel>
                    </div>
                  </div>
                  <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
                    <p className="text-xs font-black uppercase text-slate-400">
                      Nível de Risco
                    </p>
                    <p className="mt-2 text-2xl font-black text-white">
                      {previaResidual.resultado ?? "-"}
                    </p>
                  </div>
                  <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
                    <p className="text-xs font-black uppercase text-slate-400">
                      Classificação do Risco
                    </p>
                    <div className="mt-2">
                      <BadgeNivel>{previaResidual.classificacao}</BadgeNivel>
                    </div>
                  </div>
                </div>
              </section>
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setControlesEditando(null)}
                className="rounded-xl border border-slate-700 px-5 py-3 text-sm font-black text-slate-200 hover:text-white"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={salvando}
                onClick={salvarControles}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-blue-950/30 hover:bg-blue-500 disabled:opacity-60"
              >
                <Save size={16} />
                Salvar controles
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
