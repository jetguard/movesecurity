import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import {
  AlertTriangle,
  BrainCircuit,
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
  probabilidadeResidual?: number | null;
  percentualProbabilidadeResidual?: number | null;
  nivelProbabilidadeResidual?: string | null;
  notaConsequenciaResidual?: number | null;
  consequenciaResidual?: number | null;
  nivelConsequenciaResidual?: string | null;
  resultadoResidual?: number | null;
  nivelRiscoResidual?: string | null;
  classificacaoResidual?: string | null;
  desempenhoNota?: number | null;
  desempenhoProbabilidade?: number | null;
  desempenhoConsequencia?: number | null;
  desempenhoNivelRisco?: number | null;
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

type CampoResidual = keyof ResidualFormulario;

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

const camposProbabilidade: Array<{
  campo: CampoNota;
  label: string;
}> = [
  { campo: "sc", label: "SC" },
  { campo: "fe", label: "FE" },
  { campo: "intervalo", label: "INT" },
];

const camposConsequencia: Array<{
  campo: CampoNota;
  label: string;
}> = [
  { campo: "sse", label: "SSE" },
  { campo: "ope", label: "OPE" },
  { campo: "fin", label: "FIN" },
  { campo: "adm", label: "AMB" },
  { campo: "img", label: "IMG" },
  { campo: "lc", label: "L&C" },
];

const camposProbabilidadeResidual: Array<{
  campo: CampoResidual;
  label: string;
}> = [
  { campo: "scResidual", label: "SC" },
  { campo: "feResidual", label: "FE" },
  { campo: "intervaloResidual", label: "INT" },
];

const camposConsequenciaResidual: Array<{
  campo: CampoResidual;
  label: string;
}> = [
  { campo: "sseResidual", label: "SSE" },
  { campo: "opeResidual", label: "OPE" },
  { campo: "finResidual", label: "FIN" },
  { campo: "admResidual", label: "AMB" },
  { campo: "imgResidual", label: "IMG" },
  { campo: "lcResidual", label: "L&C" },
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
  if (media >= 3.51) return "PROVÃVEL";
  if (media >= 2.51) return "POSSÃVEL";
  if (media >= 1.51) return "IMPROVÃVEL";
  if (media >= 1) return "REMOTO";
  return "-";
}

function nivelConsequencia(media: number) {
  if (media >= 4.51) return "CRÃTICO";
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
      periodicidade: "RevisÃ£o a cada 24 meses",
      cor: "bg-emerald-500 text-slate-950",
    };
  if (resultado <= 10)
    return {
      nivel: "MENOR",
      periodicidade: "RevisÃ£o a cada 12 meses",
      cor: "bg-lime-300 text-slate-950",
    };
  if (resultado <= 15)
    return {
      nivel: "ALTO",
      periodicidade: "RevisÃ£o a cada 180 dias",
      cor: "bg-amber-300 text-slate-950",
    };
  return {
    nivel: "EXTREMO",
    periodicidade: "RevisÃ£o a cada 90 dias",
    cor: "bg-red-600 text-white",
  };
}

function corNivel(texto?: string | null) {
  const valor = String(texto || "").toUpperCase();
  if (["BAIXO", "MENOR", "REMOTO"].includes(valor))
    return "bg-emerald-300 text-slate-950";
  if (["POSSÃVEL", "POSSÃƒÂVEL", "MODERADO"].includes(valor))
    return "bg-yellow-300 text-slate-950";
  if (["ALTO", "MAIOR", "PROVÃVEL", "PROVÃƒÂVEL", "SEVERO"].includes(valor))
    return "bg-orange-500 text-white";
  if (["EXTREMO", "CRÃTICO", "CRÃƒÂTICO", "FREQUENTE"].includes(valor))
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
  const [residual, setResidual] =
    useState<ResidualFormulario>(residualInicial);
  const [filtroFatores, setFiltroFatores] = useState("");
  const [analisesSelecionadas, setAnalisesSelecionadas] = useState<number[]>(
    [],
  );

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
    setAnalisesSelecionadas([]);
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
    const classificacao = resultado !== null ? classificar(resultado) : null;
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
      classificacao: classificacao?.nivel || "-",
      cor: classificacao?.cor || "bg-slate-700 text-slate-100",
      desempenhoNota: desempenho(
        probabilidade,
        controlesEditando?.mediaProbabilidade,
      ),
      desempenhoProbabilidade: desempenho(
        percentualProbabilidade,
        controlesEditando?.percentualProbabilidade,
      ),
      desempenhoConsequencia: desempenho(
        consequencia,
        controlesEditando?.mediaConsequencia,
      ),
      desempenhoNivelRisco: desempenho(
        resultado,
        controlesEditando?.resultadoInerente,
      ),
    };
  }, [controlesEditando, residual]);

  const fatoresFiltrados = useMemo(() => {
    const termo = filtroFatores.trim().toLowerCase();
    if (!termo) return cadastro.fatores;
    return cadastro.fatores.filter((item) =>
      `${item.codigo} ${item.nome}`.toLowerCase().includes(termo),
    );
  }, [cadastro.fatores, filtroFatores]);

  function alterarNota(campo: CampoNota, valor: string) {
    setForm((atual) => ({ ...atual, [campo]: pontuacao(Number(valor)) }));
  }

  function alterarNotaResidual(campo: CampoResidual, valor: string) {
    setResidual((atual) => ({ ...atual, [campo]: pontuacao(Number(valor)) }));
  }

  function formatarVariacao(valor?: number | null) {
    if (valor === null || valor === undefined) return "-";
    return `${Math.round(valor * 100)}%`;
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
      setMensagem("AnÃ¡lise completa cadastrada com sucesso.");
      await carregar();
    } catch (error: any) {
      setErro(
        error?.response?.data?.error || "NÃ£o foi possÃ­vel salvar a anÃ¡lise.",
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
    setResidual({
      scResidual: pontuacao(analise.scResidual || residualInicial.scResidual),
      feResidual: pontuacao(analise.feResidual || residualInicial.feResidual),
      intervaloResidual: pontuacao(
        analise.intervaloResidual || residualInicial.intervaloResidual,
      ),
      sseResidual: pontuacao(
        analise.sseResidual || residualInicial.sseResidual,
      ),
      opeResidual: pontuacao(
        analise.opeResidual || residualInicial.opeResidual,
      ),
      finResidual: pontuacao(
        analise.finResidual || residualInicial.finResidual,
      ),
      admResidual: pontuacao(
        analise.admResidual || residualInicial.admResidual,
      ),
      imgResidual: pontuacao(
        analise.imgResidual || residualInicial.imgResidual,
      ),
      lcResidual: pontuacao(analise.lcResidual || residualInicial.lcResidual),
    });
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
          ...residual,
        },
      );
      setControlesEditando(null);
      setMensagem("Controles atualizados com sucesso.");
      await carregar();
    } catch (error: any) {
      setErro(
        error?.response?.data?.error || "NÃ£o foi possÃ­vel salvar os controles.",
      );
    } finally {
      setSalvando(false);
    }
  }

  function alternarAnaliseSelecionada(id: number) {
    setAnalisesSelecionadas((atuais) =>
      atuais.includes(id)
        ? atuais.filter((item) => item !== id)
        : [...atuais, id],
    );
  }

  function alternarTodasAnalises() {
    setAnalisesSelecionadas((atuais) =>
      atuais.length === analises.length ? [] : analises.map((item) => item.id),
    );
  }

  async function excluirAnalisesSelecionadas() {
    if (!analisesSelecionadas.length) return;
    const confirmar = window.confirm(
      `Excluir definitivamente ${analisesSelecionadas.length} anÃ¡lise(s) selecionada(s)? Esta aÃ§Ã£o nÃ£o poderÃ¡ ser desfeita.`,
    );
    if (!confirmar) return;

    setErro("");
    setMensagem("");
    setSalvando(true);
    try {
      await Promise.all(
        analisesSelecionadas.map((id) =>
          api.delete(`/riscos/analise-completa/${id}`),
        ),
      );
      setMensagem("AnÃ¡lises selecionadas excluÃ­das com sucesso.");
      await carregar();
    } catch (error: any) {
      setErro(
        error?.response?.data?.error ||
          "NÃ£o foi possÃ­vel excluir as anÃ¡lises selecionadas.",
      );
    } finally {
      setSalvando(false);
    }
  }

  function renderCampoNota(campo: CampoNota, label: string) {
    return (
      <label className="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
        <span className="block text-center text-sm font-black text-white">
          {label}
        </span>
        <select
          className={`${inputClass} mt-3 w-full text-center`}
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

  function renderCampoNotaResidual(campo: CampoResidual, label: string) {
    return (
      <label className="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
        <span className="block text-center text-sm font-black text-white">
          {label}
        </span>
        <select
          className={`${inputClass} mt-3 w-full text-center`}
          value={residual[campo]}
          onChange={(event) => alterarNotaResidual(campo, event.target.value)}
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
            AnÃ¡lise de Riscos
          </p>
          <h1 className="mt-2 text-3xl font-black text-white">
            AnÃ¡lise Completa
          </h1>
          <p className="mt-2 max-w-4xl text-sm font-semibold leading-6 text-slate-300">
            Cadastre a anÃ¡lise preenchendo macro processo, setor, risco, fatores
            de risco e notas de probabilidade/consequÃªncia. Os demais campos sÃ£o
            calculados automaticamente.
          </p>
        </header>

        {carregando && (
          <div className="mt-6 rounded-xl border border-slate-800 bg-slate-900 p-5 text-sm font-black text-slate-300">
            Carregando dados da anÃ¡lise...
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
              Nova anÃ¡lise completa
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
              Selecione quantos fatores forem necessÃ¡rios. O sistema nÃ£o limita
              a trÃªs fatores como a planilha.
            </p>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <input
                className={`${inputClass} w-full sm:max-w-md`}
                value={filtroFatores}
                onChange={(event) => setFiltroFatores(event.target.value)}
                placeholder="Buscar por código, número ou palavra"
              />
              <span className="rounded-full border border-blue-400/30 bg-blue-500/10 px-3 py-2 text-xs font-black text-blue-100">
                {fatoresFiltrados.length} de {cadastro.fatores.length} fatores
              </span>
            </div>
            <div className="mt-3 grid max-h-[456px] gap-2 overflow-y-auto pr-2 md:grid-cols-2 xl:grid-cols-3">
              {fatoresFiltrados.map((item) => (
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
              {!fatoresFiltrados.length && (
                <p className="rounded-xl border border-slate-800 bg-slate-900 p-3 text-sm font-bold text-slate-300 md:col-span-2 xl:col-span-3">
                  Nenhum fator encontrado para o filtro informado.
                </p>
              )}
            </div>
          </div>

          <section className="mt-5 rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
            <h3 className="text-sm font-black uppercase tracking-[0.28em] text-blue-200">
              AnÃ¡lise e AvaliaÃ§Ã£o Inerente
            </h3>
            <div className="mt-4 grid gap-4 2xl:grid-cols-[0.72fr_1.28fr]">
              <section>
              <h3 className="text-sm font-black uppercase tracking-[0.18em] text-blue-200">
                Probabilidade
              </h3>
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                {camposProbabilidade.map((item) =>
                  renderCampoNota(item.campo, item.label),
                )}
              </div>
            </section>

            <section>
              <h3 className="text-sm font-black uppercase tracking-[0.18em] text-blue-200">
                ConsequÃªncia
              </h3>
              <div className="mt-3 grid gap-3 sm:grid-cols-3 2xl:grid-cols-6">
                {camposConsequencia.map((item) =>
                  renderCampoNota(item.campo, item.label),
                )}
              </div>
            </section>
            </div>
          </section>

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
                ClassificaÃ§Ã£o
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
              Cadastrar anÃ¡lise
            </button>
          </div>
        </form>

        <section className="mt-6 rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-2xl shadow-black/20">
          <div className="flex flex-col gap-2 border-b border-slate-800 pb-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-xl font-black text-white">
                AnÃ¡lises cadastradas
              </h2>
              <p className="text-sm font-semibold text-slate-300">
                ApÃ³s o cadastro, edite os controles preventivos, detectivos e
                corretivos.
              </p>
            </div>
            <span className="rounded-full border border-blue-400/30 bg-blue-500/10 px-3 py-1 text-xs font-black text-blue-200">
              {analises.length} registros
            </span>
          </div>

          <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-950/50 p-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-bold text-slate-300">
              Clique em uma linha para abrir os controles. Use a primeira coluna
              para selecionar registros.
            </p>
            {analisesSelecionadas.length > 0 && (
              <button
                type="button"
                disabled={salvando}
                onClick={excluirAnalisesSelecionadas}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-2 text-sm font-black text-red-100 transition hover:bg-red-500/20 disabled:opacity-60"
              >
                <Trash2 size={16} />
                Excluir selecionadas ({analisesSelecionadas.length})
              </button>
            )}
          </div>

          <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-800">
            <table className="w-full min-w-[1480px] border-separate border-spacing-y-2">
              <thead>
                <tr className="text-left text-xs font-black uppercase tracking-[0.18em] text-blue-200">
                  <th className="px-3 py-2 text-center">
                    <input
                      type="checkbox"
                      className="h-4 w-4"
                      checked={
                        analises.length > 0 &&
                        analisesSelecionadas.length === analises.length
                      }
                      onChange={alternarTodasAnalises}
                      aria-label="Selecionar todas as anÃ¡lises"
                    />
                  </th>
                  <th className="px-3 py-2">CÃ³digo</th>
                  <th className="px-3 py-2">IdentificaÃ§Ã£o</th>
                  <th className="px-3 py-2">Fatores</th>
                  <th className="px-3 py-2 text-center">Prob.</th>
                  <th className="px-3 py-2 text-center">%P</th>
                  <th className="px-3 py-2 text-center">Cons.</th>
                  <th className="px-3 py-2 text-center">NRI</th>
                  <th className="px-3 py-2">ClassificaÃ§Ã£o</th>
                  <th className="px-3 py-2">Residual</th>
                  <th className="px-3 py-2">Controles</th>
                </tr>
              </thead>
              <tbody>
                {analises.map((analise) => (
                  <tr
                    key={analise.id}
                    onClick={() => abrirControles(analise)}
                    className="cursor-pointer bg-slate-950/70 text-sm font-semibold text-slate-100 transition hover:bg-slate-900"
                  >
                    <td
                      className="rounded-l-xl px-3 py-4 text-center"
                      onClick={(event) => event.stopPropagation()}
                    >
                      <input
                        type="checkbox"
                        className="h-4 w-4"
                        checked={analisesSelecionadas.includes(analise.id)}
                        onChange={() => alternarAnaliseSelecionada(analise.id)}
                        aria-label={`Selecionar ${analise.codigo}`}
                      />
                    </td>
                    <td className="px-3 py-4 font-black text-blue-100">
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
                    <td className="rounded-r-xl px-3 py-4 text-xs text-slate-300">
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
                  </tr>
                ))}
                {!analises.length && (
                  <tr>
                    <td
                      colSpan={11}
                      className="rounded-xl bg-slate-950/70 p-8 text-center text-sm font-bold text-slate-300"
                    >
                      Nenhuma anÃ¡lise completa cadastrada.
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
                  Controles e AvaliaÃ§Ã£o Residual
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
                Selecione os controles e preencha a avaliaÃ§Ã£o residual. O
                sistema calcula automaticamente os nÃ­veis e a classificaÃ§Ã£o
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
                  AvaliaÃ§Ã£o Residual
                </h3>
                <div className="mt-4 grid gap-4">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-300">
                      Probabilidade
                    </p>
                    <div className="mt-2 grid gap-2 sm:grid-cols-3">
                      {camposProbabilidadeResidual.map((item) =>
                        renderCampoNotaResidual(item.campo, item.label),
                      )}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-300">
                      Consequência
                    </p>
                    <div className="mt-2 grid gap-2 sm:grid-cols-3 2xl:grid-cols-6">
                      {camposConsequenciaResidual.map((item) =>
                        renderCampoNotaResidual(item.campo, item.label),
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-xl border border-blue-400/30 bg-blue-500/10 p-4">
                    <p className="text-xs font-black uppercase text-blue-200">
                      Nota / MPP / %P
                    </p>
                    <p className="mt-2 text-lg font-black text-white">
                      {previaResidual.notaProbabilidade} /{" "}
                      {previaResidual.probabilidade} /{" "}
                      {Math.round(previaResidual.percentualProbabilidade * 100)}
                      %
                    </p>
                  </div>
                  <div className="rounded-xl border border-blue-400/30 bg-blue-500/10 p-4">
                    <p className="text-xs font-black uppercase text-blue-200">
                      Nota Conseq. / MPI
                    </p>
                    <p className="mt-2 text-lg font-black text-white">
                      {previaResidual.notaConsequencia} /{" "}
                      {previaResidual.consequencia}
                    </p>
                  </div>
                  <div className="rounded-xl border border-blue-400/30 bg-blue-500/10 p-4">
                    <p className="text-xs font-black uppercase text-blue-200">
                      Desemp. Prob.
                    </p>
                    <p className="mt-2 text-lg font-black text-white">
                      {formatarVariacao(previaResidual.desempenhoProbabilidade)}
                    </p>
                  </div>
                  <div className="rounded-xl border border-blue-400/30 bg-blue-500/10 p-4">
                    <p className="text-xs font-black uppercase text-blue-200">
                      Desemp. Risco
                    </p>
                    <p className="mt-2 text-lg font-black text-white">
                      {formatarVariacao(previaResidual.desempenhoNivelRisco)}
                    </p>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
                    <p className="text-xs font-black uppercase text-slate-400">
                      NÃ­vel de Probabilidade
                    </p>
                    <div className="mt-2">
                      <BadgeNivel>
                        {previaResidual.nivelProbabilidade}
                      </BadgeNivel>
                    </div>
                  </div>
                  <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
                    <p className="text-xs font-black uppercase text-slate-400">
                      NÃ­vel de ConsequÃªncia
                    </p>
                    <div className="mt-2">
                      <BadgeNivel>
                        {previaResidual.nivelConsequencia}
                      </BadgeNivel>
                    </div>
                  </div>
                  <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
                    <p className="text-xs font-black uppercase text-slate-400">
                      NÃ­vel de Risco
                    </p>
                    <p className="mt-2 text-2xl font-black text-white">
                      {previaResidual.resultado ?? "-"}
                    </p>
                  </div>
                  <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
                    <p className="text-xs font-black uppercase text-slate-400">
                      ClassificaÃ§Ã£o do Risco
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
