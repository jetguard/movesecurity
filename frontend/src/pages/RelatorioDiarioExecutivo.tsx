import { useEffect, useState } from "react";
import {
  Bot,
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileBarChart,
  FileText,
  RefreshCw,
  ShieldCheck,
  Users,
} from "lucide-react";
import { api } from "../services/api";
import { PdfLightbox } from "../components/ui/PdfLightbox";
import { solicitarPinOperacional } from "../utils/pinPrompt";

type Registro = {
  codigo: string;
  titulo: string;
  status: string;
  horario: string;
  usuario?: string;
  equipe?: string;
};

type Turno = {
  chave: string;
  nome: string;
  escala: string;
  equipe: string;
  ccos?: {
    codigo: string;
    status: string;
    responsavel: string;
    colaboradores: string[];
    abertura: string;
    encerramento?: string | null;
  };
  operadores: Array<{ horario: string; nome: string; acao: string }>;
  informacoes: Array<{
    horario: string;
    titulo: string;
    local: string;
    descricao: string;
    usuario?: string;
  }>;
  ocorrencias: Registro[];
  eventos: Registro[];
  tarefas: Registro[];
};

type Previa = {
  resumoExecutivo: string;
  aprimoradoPorIa: boolean;
  aprimoramentoOpenAiAtivo: boolean;
  modeloIa?: string | null;
  aviso?: string | null;
  dados: {
    dataOperacional: string;
    unidade: string;
    indicadores: {
      turnos: number;
      informacoes: number;
      ocorrencias: number;
      eventos: number;
      tarefasConcluidas: number;
      tarefasPendentes: number;
    };
    turnos: Turno[];
  };
};

type RelatorioSalvo = {
  id: number;
  codigo: string;
  dataOperacional: string;
  unidade: string;
  aprimoradoPorIa: boolean;
  responsavel: { nome: string; apelido?: string | null };
  createdAt: string;
};

function dataHoje() {
  const hoje = new Date();
  const local = new Date(hoje.getTime() - hoje.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function nomeArquivo(relatorio: RelatorioSalvo) {
  return `${relatorio.codigo.replace("/", "-")}-relatorio-diario-executivo.pdf`;
}

export default function RelatorioDiarioExecutivo() {
  const [data, setData] = useState(dataHoje());
  const [previa, setPrevia] = useState<Previa | null>(null);
  const [relatorios, setRelatorios] = useState<RelatorioSalvo[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [mensagem, setMensagem] = useState("");
  const [pdf, setPdf] = useState<{
    url: string;
    titulo: string;
    nomeArquivo: string;
  } | null>(null);

  async function carregarRelatorios() {
    const response = await api.get("/operacao/relatorios-diarios");
    setRelatorios(response.data);
  }

  useEffect(() => {
    carregarRelatorios();
  }, []);

  async function gerarPrevia() {
    setCarregando(true);
    setMensagem("");
    try {
      const response = await api.get("/operacao/relatorios-diarios/previa", {
        params: { data },
      });
      setPrevia(response.data);
      setMensagem(
        response.data.aviso ||
          (response.data.aprimoradoPorIa
            ? "Resumo aprimorado pela OpenAI e pronto para revisão."
            : "Resumo seguro gerado pelo próprio JetGuard."),
      );
    } catch (error: unknown) {
      const apiError = error as { response?: { data?: { error?: string } } };
      alert(
        apiError.response?.data?.error ||
          "Não foi possível preparar o relatório.",
      );
    } finally {
      setCarregando(false);
    }
  }

  async function consolidar() {
    const pinOperacional = await solicitarPinOperacional(
      "Confirme seu PIN para consolidar e assinar o Relatório Diário Executivo.",
    );
    if (!pinOperacional) return;
    setCarregando(true);
    try {
      const response = await api.post("/operacao/relatorios-diarios", {
        data,
        pinOperacional,
      });
      await carregarRelatorios();
      setMensagem(
        `${response.data.codigo} consolidado e assinado com sucesso.`,
      );
      await abrirPdf(response.data.id, response.data.codigo);
    } catch (error: unknown) {
      const apiError = error as { response?: { data?: { error?: string } } };
      alert(
        apiError.response?.data?.error ||
          "Não foi possível consolidar o relatório.",
      );
    } finally {
      setCarregando(false);
    }
  }

  async function abrirPdf(id: number, codigo: string) {
    const response = await api.get(`/operacao/relatorios-diarios/${id}/pdf`, {
      responseType: "blob",
    });
    const url = URL.createObjectURL(
      new Blob([response.data], { type: "application/pdf" }),
    );
    setPdf({
      url,
      titulo: `Relatório Diário Executivo ${codigo}`,
      nomeArquivo: `${codigo.replace("/", "-")}-relatorio-diario-executivo.pdf`,
    });
  }

  function fecharPdf() {
    if (pdf?.url) URL.revokeObjectURL(pdf.url);
    setPdf(null);
  }

  const indicadores = previa?.dados.indicadores;

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-400">
            Gestão operacional
          </p>
          <h1 className="mt-1 text-3xl font-black text-white">
            Relatório Diário Executivo CCOS
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
            Consolidação dos três turnos, equipes, informações do plantão,
            ocorrências, eventos e tarefas da data operacional.
          </p>
        </div>
        <div className="flex flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-900 p-4 sm:flex-row sm:items-end">
          <label className="text-sm font-bold text-slate-200">
            Data operacional
            <input
              type="date"
              value={data}
              onChange={(evento) => setData(evento.target.value)}
              className="mt-2 block rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white"
            />
          </label>
          <button
            onClick={gerarPrevia}
            disabled={carregando}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 font-bold text-white transition hover:bg-blue-500 disabled:opacity-50"
          >
            <RefreshCw size={17} className={carregando ? "animate-spin" : ""} />
            Gerar prévia
          </button>
        </div>
      </header>

      <section className="grid gap-4 lg:grid-cols-[1fr_auto]">
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <div className="flex items-start gap-3">
            <Bot className="mt-0.5 text-cyan-400" size={22} />
            <div>
              <h2 className="font-bold text-white">Redação do resumo</h2>
              <p className="mt-1 text-sm leading-6 text-slate-400">
                O JetGuard sempre gera a versão oficial com dados do banco. A
                OpenAI apenas melhora a escrita e não pode alterar fatos, nomes
                ou números.
              </p>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-3 rounded-xl border border-slate-700 bg-slate-950 p-4">
            <span
              className={`h-2.5 w-2.5 rounded-full ${previa?.aprimoramentoOpenAiAtivo ? "bg-emerald-400" : "bg-slate-600"}`}
            />
            <span>
              <strong className="block text-sm text-white">
                OpenAI{" "}
                {previa?.aprimoramentoOpenAiAtivo
                  ? "ativada pela administração"
                  : "controlada pela configuração central"}
              </strong>
              <span className="text-xs text-slate-400">
                A preferência é administrada em Sistema &gt; API&apos;s &gt;
                OpenAI.
              </span>
            </span>
          </div>
        </div>
        <button
          onClick={consolidar}
          disabled={!previa || carregando}
          className="inline-flex min-h-28 items-center justify-center gap-3 rounded-2xl bg-emerald-600 px-7 font-black text-white shadow-lg shadow-emerald-950/30 transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-slate-800 disabled:text-slate-500"
        >
          <ShieldCheck size={22} />
          Consolidar e assinar
        </button>
      </section>

      {mensagem && (
        <div className="rounded-xl border border-blue-900 bg-blue-950/40 px-4 py-3 text-sm text-blue-100">
          {mensagem}
        </div>
      )}

      {indicadores && (
        <section className="grid grid-cols-2 gap-3 lg:grid-cols-6">
          {[
            { titulo: "Turnos CCOS", valor: indicadores.turnos, Icone: Users },
            {
              titulo: "Informações",
              valor: indicadores.informacoes,
              Icone: FileText,
            },
            {
              titulo: "Ocorrências",
              valor: indicadores.ocorrencias,
              Icone: ShieldCheck,
            },
            {
              titulo: "Eventos",
              valor: indicadores.eventos,
              Icone: CalendarDays,
            },
            {
              titulo: "Tarefas concluídas",
              valor: indicadores.tarefasConcluidas,
              Icone: CheckCircle2,
            },
            {
              titulo: "Pendentes",
              valor: indicadores.tarefasPendentes,
              Icone: Clock3,
            },
          ].map(({ titulo, valor, Icone }) => (
            <div
              key={titulo}
              className="rounded-2xl border border-slate-800 bg-slate-900 p-4"
            >
              <Icone size={18} className="text-blue-400" />
              <p className="mt-3 text-2xl font-black text-white">{valor}</p>
              <p className="text-xs text-slate-400">{titulo}</p>
            </div>
          ))}
        </section>
      )}

      {previa && (
        <section className="grid gap-5 xl:grid-cols-[0.85fr_1.15fr]">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <div className="flex items-center gap-2">
              <FileBarChart className="text-blue-400" size={20} />
              <h2 className="font-bold text-white">Resumo executivo</h2>
            </div>
            <div className="mt-4 whitespace-pre-line text-sm leading-7 text-slate-300">
              {previa.resumoExecutivo}
            </div>
          </div>

          <div className="space-y-4">
            {previa.dados.turnos.map((turno) => (
              <article
                key={turno.chave}
                className="rounded-2xl border border-slate-800 bg-slate-900 p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-blue-400">
                      {turno.nome} | {turno.escala}
                    </p>
                    <h3 className="mt-1 text-xl font-black text-white">
                      {turno.equipe}
                    </h3>
                    <p className="text-sm text-slate-400">
                      {turno.ccos
                        ? `${turno.ccos.codigo} | ${turno.ccos.status}`
                        : "Sem Relatório CCOS localizado"}
                    </p>
                  </div>
                  <div className="grid grid-cols-4 gap-2 text-center text-xs">
                    <span className="rounded-lg bg-slate-950 px-2 py-2">
                      <b className="block text-white">
                        {turno.informacoes.length}
                      </b>
                      <span className="text-slate-500">Infos</span>
                    </span>
                    <span className="rounded-lg bg-slate-950 px-2 py-2">
                      <b className="block text-white">
                        {turno.ocorrencias.length}
                      </b>
                      <span className="text-slate-500">RO</span>
                    </span>
                    <span className="rounded-lg bg-slate-950 px-2 py-2">
                      <b className="block text-white">{turno.eventos.length}</b>
                      <span className="text-slate-500">Eventos</span>
                    </span>
                    <span className="rounded-lg bg-slate-950 px-2 py-2">
                      <b className="block text-white">{turno.tarefas.length}</b>
                      <span className="text-slate-500">Tarefas</span>
                    </span>
                  </div>
                </div>

                {turno.operadores.length > 0 && (
                  <div className="mt-4 border-t border-slate-800 pt-4">
                    <p className="text-xs font-bold uppercase text-slate-500">
                      Operadores
                    </p>
                    {turno.operadores.map((item, indice) => (
                      <p
                        key={`${item.nome}-${indice}`}
                        className="mt-2 text-sm text-slate-300"
                      >
                        <b className="text-blue-300">{item.horario}</b> -{" "}
                        {item.nome} {item.acao}
                      </p>
                    ))}
                  </div>
                )}
              </article>
            ))}
          </div>
        </section>
      )}

      <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
        <h2 className="font-bold text-white">Relatórios consolidados</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {relatorios.length === 0 ? (
            <p className="text-sm text-slate-400">
              Nenhum relatório diário consolidado nesta unidade.
            </p>
          ) : (
            relatorios.map((relatorio) => (
              <button
                key={relatorio.id}
                onClick={() => abrirPdf(relatorio.id, relatorio.codigo)}
                className="rounded-xl border border-slate-700 bg-slate-950 p-4 text-left transition hover:border-blue-500"
              >
                <div className="flex items-center justify-between gap-3">
                  <strong className="text-white">{relatorio.codigo}</strong>
                  <FileText size={17} className="text-blue-400" />
                </div>
                <p className="mt-2 text-sm text-slate-300">
                  {new Date(relatorio.dataOperacional).toLocaleDateString(
                    "pt-BR",
                  )}{" "}
                  | {relatorio.unidade}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Consolidado por{" "}
                  {relatorio.responsavel.apelido || relatorio.responsavel.nome}
                  {relatorio.aprimoradoPorIa
                    ? " | redação aprimorada por IA"
                    : ""}
                </p>
                <span className="sr-only">{nomeArquivo(relatorio)}</span>
              </button>
            ))
          )}
        </div>
      </section>

      {pdf && (
        <PdfLightbox
          url={pdf.url}
          titulo={pdf.titulo}
          nomeArquivo={pdf.nomeArquivo}
          onClose={fecharPdf}
        />
      )}
    </div>
  );
}
