import axios from "axios";
import { useEffect, useRef, useState } from "react";
import type { FormEvent, PointerEvent } from "react";
import { useParams } from "react-router-dom";
import {
  Award,
  CheckCircle2,
  ExternalLink,
  FileSignature,
  Paperclip,
  PlayCircle,
  ShieldCheck,
} from "lucide-react";

const fundoMobileUrl = "/images/treinamento-terminal/fundo-para-movel.png";
const fundoDesktopUrl = "/images/treinamento-terminal/fundo-para-desktop.jpeg";

type Etapa = {
  id: number;
  ordem: number;
  titulo: string;
  objetivo?: string | null;
  conteudo: string;
  topicos?: string[];
  atencao?: string | null;
};

type Alternativa = {
  id: number;
  texto: string;
};

type Pergunta = {
  id: number;
  pergunta: string;
  alternativas: Alternativa[];
};

type Modelo = {
  id: number;
  codigo: string;
  nome: string;
  tipo: string;
  descricao?: string | null;
  acessoPublico?: boolean;
  perguntasHabilitadas?: boolean;
  videoUrl?: string | null;
  anexoNome?: string | null;
  anexoUrl?: string | null;
  notaMinima: number;
  etapas: Etapa[];
  perguntas: Pergunta[];
};

type Participante = {
  token: string;
  codigo?: string | null;
  nomeCompleto: string;
  cpf?: string | null;
  email: string;
  unidade?: string | null;
  etapaAtual: number;
  status: string;
  porcentagem: number;
  nota?: number | null;
  acertos?: number | null;
  tentativas: number;
  certificadoUrl?: string | null;
};

const formInicial = {
  email: "",
  terceirizado: false,
};

const perguntasAvaliacaoTreinamento = [
  {
    id: "satisfacao",
    titulo: "Satisfação com o treinamento",
    pergunta: "Como você avalia sua satisfação com o treinamento?",
    opcoes: [
      "Muito satisfeito(a)",
      "Satisfeito(a)",
      "Neutro(a)",
      "Insatisfeito(a)",
      "Muito insatisfeito(a)",
    ],
  },
  {
    id: "aprendizado",
    titulo: "Aprendizado",
    pergunta: "Você considera que aprendeu algo novo durante o treinamento?",
    opcoes: [
      "Sim, aprendi muito.",
      "Sim, aprendi um pouco.",
      "Não aprendi nada novo.",
      "Já conhecia todo o conteúdo.",
    ],
  },
  {
    id: "aplicacao",
    titulo: "Aplicação do conhecimento",
    pergunta:
      "Você acredita que conseguirá aplicar o que aprendeu no seu trabalho?",
    opcoes: [
      "Sim, totalmente.",
      "Sim, parcialmente.",
      "Ainda tenho dúvidas.",
      "Não.",
    ],
  },
  {
    id: "qualidade",
    titulo: "Qualidade do conteúdo",
    pergunta: "O conteúdo apresentado foi claro e fácil de entender?",
    opcoes: [
      "Muito claro.",
      "Claro.",
      "Regular.",
      "Pouco claro.",
      "Nada claro.",
    ],
  },
  {
    id: "instrutor",
    titulo: "Avaliação do instrutor",
    pergunta: "Como você avalia a condução do instrutor?",
    opcoes: ["Excelente.", "Boa.", "Regular.", "Ruim.", "Péssima."],
  },
  {
    id: "duracao",
    titulo: "Duração do treinamento",
    pergunta: "A duração do treinamento foi adequada?",
    opcoes: [
      "Sim.",
      "Poderia ser um pouco maior.",
      "Poderia ser um pouco menor.",
    ],
  },
  {
    id: "avaliacaoGeral",
    titulo: "Avaliação geral",
    pergunta: "De forma geral, como você avalia este treinamento?",
    opcoes: ["Excelente.", "Bom.", "Regular.", "Ruim.", "Péssimo."],
  },
];

function emailValido(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());
}

function avaliacaoTreinamentoPadrao() {
  return perguntasAvaliacaoTreinamento.reduce<Record<string, string>>(
    (respostas, pergunta) => ({
      ...respostas,
      [pergunta.id]: pergunta.opcoes[0],
    }),
    {},
  );
}

function resultadoDoParticipante(participante: Participante, modelo: Modelo) {
  if (!modelo.perguntasHabilitadas || !modelo.perguntas.length) {
    return { aprovado: true, nota: 100, acertos: 0 };
  }
  if (participante.nota == null) return null;
  const nota = Number(participante.nota) || 0;
  return {
    aprovado: nota >= modelo.notaMinima,
    nota,
    acertos: Number(participante.acertos ?? 0),
  };
}

function urlVideoIncorporado(url?: string | null) {
  const valor = String(url || "").trim();
  if (!valor) return "";
  try {
    const parsed = new URL(valor);
    if (parsed.hostname.includes("youtu.be")) {
      return `https://www.youtube.com/embed/${parsed.pathname.replace("/", "")}`;
    }
    if (parsed.hostname.includes("youtube.com")) {
      const videoId = parsed.searchParams.get("v");
      if (videoId) return `https://www.youtube.com/embed/${videoId}`;
    }
    if (parsed.hostname.includes("drive.google.com")) {
      const fileId = parsed.pathname.match(/\/file\/d\/([^/]+)/)?.[1];
      if (fileId) return `https://drive.google.com/file/d/${fileId}/preview`;
      const id = parsed.searchParams.get("id");
      if (id) return `https://drive.google.com/file/d/${id}/preview`;
    }
    return valor;
  } catch {
    return valor;
  }
}

export default function TreinamentoDinamicoPublico() {
  const { slug = "" } = useParams();
  const [modelo, setModelo] = useState<Modelo | null>(null);
  const [participante, setParticipante] = useState<Participante | null>(null);
  const [form, setForm] = useState(formInicial);
  const [indice, setIndice] = useState(0);
  const [mensagem, setMensagem] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [perguntaAtual, setPerguntaAtual] = useState(0);
  const [respostas, setRespostas] = useState<Record<string, number>>({});
  const [resultado, setResultado] = useState<{
    aprovado: boolean;
    nota: number;
    acertos: number;
  } | null>(null);
  const [avaliacaoTreinamento, setAvaliacaoTreinamento] = useState<
    Record<string, string>
  >(() => avaliacaoTreinamentoPadrao());
  const [perguntaAvaliacaoAtual, setPerguntaAvaliacaoAtual] = useState(0);
  const [comentarioAvaliacao, setComentarioAvaliacao] = useState("");
  const [assinaturaVazia, setAssinaturaVazia] = useState(true);
  const [assinando, setAssinando] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const perguntas =
    modelo?.perguntasHabilitadas === false ? [] : modelo?.perguntas || [];
  const temQuiz = perguntas.length > 0;
  const temVideo = Boolean(modelo?.videoUrl);
  const totalEtapas = modelo?.etapas.length || 0;
  const indiceVideo = temVideo ? totalEtapas : -1;
  const indiceQuiz = totalEtapas + (temVideo ? 1 : 0);
  const indiceResultado = temQuiz ? indiceQuiz + 1 : -1;
  const indiceAvaliacaoTreinamento = temQuiz ? indiceQuiz + 2 : indiceQuiz;
  const indiceAssinatura = indiceAvaliacaoTreinamento + 1;
  const etapa = modelo?.etapas[indice];
  const totalAvaliacaoTreinamento = perguntasAvaliacaoTreinamento.length + 1;
  const perguntaAvaliacao =
    perguntasAvaliacaoTreinamento[perguntaAvaliacaoAtual];
  const progressoAvaliacaoTreinamento = Math.round(
    ((perguntaAvaliacaoAtual + 1) / totalAvaliacaoTreinamento) * 100,
  );
  const resultadoAtual =
    participante && modelo
      ? resultado || resultadoDoParticipante(participante, modelo)
      : resultado;
  const fluxoTreinamento = [
    { label: "Etapas", ativo: indice < totalEtapas },
    ...(temVideo ? [{ label: "Vídeo", ativo: indice === indiceVideo }] : []),
    ...(temQuiz
      ? [
          { label: "Perguntas", ativo: indice === indiceQuiz },
          { label: "Resultado", ativo: indice === indiceResultado },
        ]
      : []),
    { label: "Opinião", ativo: indice === indiceAvaliacaoTreinamento },
    { label: "Assinatura", ativo: indice >= indiceAssinatura },
  ];
  const videoIncorporado = urlVideoIncorporado(modelo?.videoUrl);

  useEffect(() => {
    axios
      .get(`/api/public/treinamentos-dinamicos/${slug}`)
      .then((response) => setModelo(response.data?.treinamento))
      .catch(() => setMensagem("Treinamento não encontrado ou indisponível."));
  }, [slug]);

  function alterarEmail(valor: string) {
    setForm((atual) => ({ ...atual, email: valor.trim().toLowerCase() }));
  }

  function alterarTerceirizado(valor: boolean) {
    setForm((atual) => ({ ...atual, terceirizado: valor }));
  }
  async function iniciar(event: FormEvent) {
    event.preventDefault();
    if (!emailValido(form.email)) {
      setMensagem("Informe o e-mail cadastrado para iniciar.");
      return;
    }
    setCarregando(true);
    setMensagem("");
    try {
      const response = await axios.post(
        `/api/public/treinamentos-dinamicos/${slug}/iniciar`,
        form,
      );
      const treinamentoRecebido = response.data.treinamento as Modelo;
      setModelo(treinamentoRecebido);
      const registro = response.data.participante as Participante;
      setParticipante(registro);
      setResultado(resultadoDoParticipante(registro, treinamentoRecebido));
      const totalConteudoRecebido = treinamentoRecebido.etapas?.length || 0;
      const temVideoRecebido = Boolean(treinamentoRecebido.videoUrl);
      const temQuizRecebido =
        treinamentoRecebido.perguntasHabilitadas !== false &&
        (treinamentoRecebido.perguntas?.length || 0) > 0;
      const etapaMaximaRecebida =
        totalConteudoRecebido +
        (temVideoRecebido ? 1 : 0) +
        (temQuizRecebido ? 3 : 1);
      setIndice(
        Math.max(
          0,
          Math.min(etapaMaximaRecebida, (registro.etapaAtual || 1) - 1),
        ),
      );
    } catch (error: any) {
      setMensagem(
        error.response?.data?.error ||
          "Não foi possível iniciar o treinamento.",
      );
    } finally {
      setCarregando(false);
    }
  }

  function rolarTopo() {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function voltarEtapaConteudo() {
    setIndice((atual) => Math.max(0, atual - 1));
    setMensagem("");
    rolarTopo();
  }

  async function concluirEtapa() {
    if (!participante) return;
    setCarregando(true);
    setMensagem("");
    try {
      const response = await axios.put(
        `/api/public/treinamentos-dinamicos/${participante.token}/etapa`,
        {
          etapa: indice + 1,
        },
      );
      setParticipante(response.data.participante);
      setIndice((atual) => Math.min(indiceAvaliacaoTreinamento, atual + 1));
      rolarTopo();
    } catch (error: any) {
      setMensagem(
        error.response?.data?.error || "Não foi possível salvar a etapa.",
      );
    } finally {
      setCarregando(false);
    }
  }

  async function validarQuiz() {
    if (!participante || !modelo) return;
    if (!temQuiz) {
      setResultado({ aprovado: true, nota: 100, acertos: 0 });
      setIndice(indiceAvaliacaoTreinamento);
      rolarTopo();
      return;
    }
    if (Object.keys(respostas).length < perguntas.length) {
      setMensagem("Responda todas as perguntas antes de validar.");
      return;
    }
    setCarregando(true);
    setMensagem("");
    try {
      const response = await axios.post(
        `/api/public/treinamentos-dinamicos/${participante.token}/quiz`,
        {
          respostas,
        },
      );
      setParticipante(response.data.participante);
      setResultado({
        aprovado: response.data.aprovado,
        nota: response.data.nota,
        acertos: response.data.acertos,
      });
      setIndice(indiceResultado);
      rolarTopo();
      setMensagem(
        response.data.aprovado
          ? "Você atingiu a nota mínima. Avance para avaliar o treinamento."
          : "Você não atingiu a nota mínima. Revise as perguntas e tente novamente.",
      );
    } catch (error: any) {
      setMensagem(
        error.response?.data?.error || "Não foi possível validar a avaliação.",
      );
    } finally {
      setCarregando(false);
    }
  }

  async function salvarAvaliacaoTreinamento() {
    if (!participante) return;
    const respostas = {
      ...avaliacaoTreinamentoPadrao(),
      ...avaliacaoTreinamento,
    };
    const faltantes = perguntasAvaliacaoTreinamento.filter(
      (pergunta) => !respostas[pergunta.id],
    );
    if (faltantes.length) {
      setMensagem(
        "Responda todos os itens obrigatórios da avaliação do treinamento.",
      );
      return;
    }
    setCarregando(true);
    setMensagem("");
    try {
      const response = await axios.post(
        `/api/public/treinamentos-dinamicos/${participante.token}/avaliacao`,
        {
          respostas,
          comentario: comentarioAvaliacao,
        },
      );
      setParticipante(response.data.participante);
      setMensagem(
        response.data.mensagem ||
          "Avaliação do treinamento registrada com sucesso.",
      );
      setIndice(indiceAssinatura);
      rolarTopo();
    } catch (error: any) {
      setMensagem(
        error.response?.data?.error ||
          "Não foi possível salvar a avaliação do treinamento.",
      );
    } finally {
      setCarregando(false);
    }
  }

  function avancarAvaliacaoTreinamento() {
    if (perguntaAvaliacaoAtual < perguntasAvaliacaoTreinamento.length) {
      const atual = perguntasAvaliacaoTreinamento[perguntaAvaliacaoAtual];
      if (!avaliacaoTreinamento[atual.id]) {
        setAvaliacaoTreinamento((respostas) => ({
          ...respostas,
          [atual.id]: atual.opcoes[0],
        }));
      }
    }
    setMensagem("");
    setPerguntaAvaliacaoAtual((atual) =>
      Math.min(totalAvaliacaoTreinamento - 1, atual + 1),
    );
    rolarTopo();
  }

  function voltarAvaliacaoTreinamento() {
    setMensagem("");
    setPerguntaAvaliacaoAtual((atual) => Math.max(0, atual - 1));
    rolarTopo();
  }

  function prepararCanvas() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const escala = window.devicePixelRatio || 1;
    canvas.width = rect.width * escala;
    canvas.height = rect.height * escala;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(escala, escala);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, rect.width, rect.height);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#0f172a";
    ctx.lineWidth = 2.4;
    setAssinaturaVazia(true);
  }

  useEffect(() => {
    if (indice >= indiceAssinatura) setTimeout(prepararCanvas, 80);
  }, [indice, indiceAssinatura]);

  function pontoCanvas(event: PointerEvent<HTMLCanvasElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  function iniciarAssinatura(event: PointerEvent<HTMLCanvasElement>) {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx || !canvasRef.current) return;
    canvasRef.current.setPointerCapture(event.pointerId);
    const ponto = pontoCanvas(event);
    ctx.beginPath();
    ctx.moveTo(ponto.x, ponto.y);
    setAssinando(true);
    setAssinaturaVazia(false);
  }

  function moverAssinatura(event: PointerEvent<HTMLCanvasElement>) {
    if (!assinando) return;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const ponto = pontoCanvas(event);
    ctx.lineTo(ponto.x, ponto.y);
    ctx.stroke();
  }

  async function concluir() {
    if (!participante || !canvasRef.current) return;
    if (assinaturaVazia) {
      setMensagem("Assine no campo indicado para emitir o certificado.");
      return;
    }
    setCarregando(true);
    setMensagem("");
    try {
      const response = await axios.post(
        `/api/public/treinamentos-dinamicos/${participante.token}/concluir`,
        {
          assinaturaDataUrl: canvasRef.current.toDataURL("image/png"),
        },
      );
      setParticipante(response.data.participante);
      setMensagem(response.data.mensagem || "Certificado emitido com sucesso.");
    } catch (error: any) {
      setMensagem(
        error.response?.data?.error || "Não foi possível emitir o certificado.",
      );
    } finally {
      setCarregando(false);
    }
  }

  if (!modelo && !mensagem) {
    return (
      <div className="min-h-screen bg-slate-950 p-8 text-white">
        Carregando treinamento...
      </div>
    );
  }

  return (
    <main className="treinamento-dinamico-publico relative min-h-screen overflow-hidden bg-[#eef0f7] text-slate-950">
      <picture className="fixed inset-0 z-0 block h-full w-full">
        <source media="(min-width: 768px)" srcSet={fundoDesktopUrl} />
        <img
          src={fundoMobileUrl}
          alt=""
          aria-hidden="true"
          className="h-full w-full object-cover object-center"
        />
      </picture>
      <div className="fixed inset-0 z-0 bg-white/68" />

      <section className="relative z-10 mx-auto flex min-h-screen w-full max-w-5xl flex-col px-3 py-4 sm:px-6 sm:py-7 lg:px-8">
        <div className="mb-4 flex items-center justify-between gap-4 rounded-2xl border border-blue-100 bg-white/90 px-4 py-3 shadow-sm backdrop-blur sm:mb-6 sm:px-5 sm:py-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-blue-700">
              {modelo?.codigo || "Movecta"}
            </p>
            <h1 className="mt-1.5 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
              {modelo?.nome || "Treinamento"}
            </h1>
          </div>
          <ShieldCheck className="h-8 w-8 shrink-0 text-blue-600 sm:h-9 sm:w-9" />
        </div>

        {mensagem && (
          <div className="mb-4 rounded-2xl border border-blue-100 bg-white/95 px-4 py-3 text-sm font-black text-blue-950 shadow-sm">
            {mensagem}
          </div>
        )}

        {!participante && modelo && (
          <form
            onSubmit={iniciar}
            className="rounded-2xl border border-blue-200 bg-white/96 p-5 text-slate-950 shadow-2xl backdrop-blur sm:p-6 [&_input]:text-slate-950 [&_input]:placeholder:text-slate-500 [&_select]:text-slate-950"
          >
            <p className="text-xs font-black uppercase tracking-[0.22em] text-blue-700">
              Acesso ao treinamento
            </p>
            <h2 className="mt-2 text-2xl font-black text-slate-950">
              Identificação do participante
            </h2>
            <p className="mt-2 text-sm font-extrabold leading-6 text-slate-800">
              Preencha seus dados para iniciar ou continuar este treinamento.
            </p>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-4 text-sm font-bold text-blue-950">
                Este treinamento é restrito, informe seu e-mail corporativo para
                continuar.
              </div>
              <input
                value={form.email}
                onChange={(e) => alterarEmail(e.target.value)}
                required
                type="email"
                placeholder={
                  form.terceirizado
                    ? "E-mail pessoal cadastrado"
                    : "E-mail corporativo cadastrado"
                }
                className="md:col-span-2 rounded-2xl border border-blue-300 bg-white px-4 py-3.5 text-sm font-bold text-slate-950 outline-none placeholder:text-slate-500 focus:border-blue-500"
              />
              <label className="md:col-span-2 flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-800 shadow-sm">
                <input
                  type="checkbox"
                  checked={form.terceirizado}
                  onChange={(e) => alterarTerceirizado(e.target.checked)}
                  className="h-5 w-5 rounded border-blue-300 accent-blue-600"
                />
                Sou terceirizado
              </label>
            </div>
            <button
              disabled={carregando}
              className="mt-6 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white shadow-lg hover:bg-blue-700 disabled:opacity-60"
            >
              {carregando ? "Iniciando..." : "Iniciar treinamento"}
            </button>
          </form>
        )}

        {participante && modelo && (
          <div className="space-y-4">
            <div className="sticky top-3 z-20 flex justify-end">
              <div className="rounded-full border border-blue-100 bg-white/90 px-3 py-1.5 text-xs font-black text-blue-950 shadow-sm backdrop-blur">
                Olá, {participante.nomeCompleto}
              </div>
            </div>

            <div className="grid gap-1.5 rounded-2xl border border-blue-100 bg-white/82 p-2 shadow-sm backdrop-blur sm:grid-cols-2 lg:grid-cols-5">
              {fluxoTreinamento.map((item) => {
                return (
                  <div
                    key={item.label}
                    className={`rounded-xl px-3 py-2.5 text-center text-xs font-black transition ${
                      item.ativo
                        ? "bg-blue-600 text-white shadow-sm"
                        : "bg-transparent text-slate-500"
                    }`}
                  >
                    {item.label}
                  </div>
                );
              })}
            </div>

            {etapa && indice < indiceQuiz && (
              <section className="rounded-2xl border border-blue-100 bg-white/95 p-4 text-slate-950 shadow-lg shadow-blue-900/5 backdrop-blur sm:p-6">
                <p className="text-sm font-black uppercase tracking-[0.22em] text-blue-700">
                  Etapa {indice + 1}
                </p>
                <div className="mt-3 border-b border-blue-100 pb-4">
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-700">
                    Assunto
                  </p>
                  <h2 className="mt-1.5 text-2xl font-black leading-tight text-slate-950 sm:text-3xl">
                    {etapa.titulo}
                  </h2>
                </div>
                {etapa.objetivo && (
                  <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50/70 p-4 text-slate-950">
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-700">
                      Objetivo
                    </p>
                    <p className="mt-2 text-base font-black leading-7 text-slate-950 sm:text-lg">
                      {etapa.objetivo}
                    </p>
                  </div>
                )}
                <div className="mt-4 rounded-xl border border-slate-100 bg-white/85 p-4 text-base font-semibold leading-7 text-slate-950 shadow-sm shadow-slate-200/40 sm:text-[17px]">
                  <p className="whitespace-pre-line text-slate-950">
                    {etapa.conteudo}
                  </p>
                </div>
                {!!etapa.topicos?.length && (
                  <ul className="mt-4 grid gap-2">
                    {etapa.topicos.map((topico) => (
                      <li
                        key={topico}
                        className="rounded-xl border border-blue-100 bg-blue-50/45 px-4 py-3 text-sm font-bold text-slate-900"
                      >
                        {topico}
                      </li>
                    ))}
                  </ul>
                )}
                {etapa.atencao && (
                  <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50/90 p-4 text-sm font-black text-amber-950">
                    {etapa.atencao}
                  </p>
                )}
                {indice === 0 && modelo.anexoUrl && (
                  <a
                    href={modelo.anexoUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-4 inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-black text-blue-800 shadow-sm hover:border-blue-500 hover:bg-blue-100"
                  >
                    <Paperclip size={18} />
                    Ver anexo
                    <span className="text-xs font-bold text-blue-600">
                      {modelo.anexoNome || "Documento de apoio"}
                    </span>
                    <ExternalLink size={16} />
                  </a>
                )}
                <div className="mt-5 flex flex-wrap gap-3">
                  {indice > 0 && (
                    <button
                      type="button"
                      onClick={voltarEtapaConteudo}
                      className="rounded-xl border border-blue-200 bg-white px-5 py-3 text-sm font-black text-blue-700 shadow-sm hover:border-blue-500 hover:bg-blue-50"
                    >
                      Voltar etapa
                    </button>
                  )}
                  <button
                    disabled={carregando}
                    onClick={concluirEtapa}
                    className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-black text-white shadow-sm hover:bg-blue-700 disabled:opacity-60"
                  >
                    Li e compreendi esta etapa
                  </button>
                </div>
              </section>
            )}

            {indice === indiceVideo && modelo.videoUrl && (
              <section className="rounded-2xl border border-blue-100 bg-white/95 p-4 text-slate-950 shadow-lg shadow-blue-900/5 backdrop-blur sm:p-6">
                <p className="text-sm font-black uppercase tracking-[0.22em] text-blue-700">
                  Etapa {totalEtapas + 1}
                </p>
                <div className="mt-3 flex items-start gap-3 border-b border-blue-100 pb-4">
                  <PlayCircle className="mt-1 h-8 w-8 shrink-0 text-blue-600" />
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-700">
                      Vídeo
                    </p>
                    <h2 className="mt-1.5 text-2xl font-black leading-tight text-slate-950 sm:text-3xl">
                      Assista ao conteúdo complementar
                    </h2>
                  </div>
                </div>
                <div className="mt-5 overflow-hidden rounded-2xl border border-blue-100 bg-slate-950 shadow-sm">
                  <iframe
                    src={videoIncorporado}
                    title="Vídeo do treinamento"
                    className="aspect-video w-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                  />
                </div>
                <div className="mt-4 flex flex-wrap gap-3">
                  <a
                    href={modelo.videoUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-white px-4 py-3 text-sm font-black text-blue-700 shadow-sm hover:bg-blue-50"
                  >
                    <ExternalLink size={18} /> Abrir vídeo em nova aba
                  </a>
                  <button
                    type="button"
                    onClick={() => {
                      setIndice(
                        temQuiz ? indiceQuiz : indiceAvaliacaoTreinamento,
                      );
                      rolarTopo();
                    }}
                    className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-black text-white shadow-sm hover:bg-blue-700"
                  >
                    Continuar treinamento
                  </button>
                </div>
              </section>
            )}

            {temQuiz && indice === indiceQuiz && (
              <section className="rounded-2xl border border-blue-100 bg-white/95 p-4 shadow-lg shadow-blue-900/5 backdrop-blur sm:p-6">
                <p className="text-xs font-black uppercase tracking-[0.22em] text-blue-700">
                  Avaliação final
                </p>
                <h2 className="mt-2 text-2xl font-black text-slate-950 sm:text-3xl">
                  Pergunta {perguntaAtual + 1} de {perguntas.length}
                </h2>
                {perguntas[perguntaAtual] && (
                  <div className="mt-5">
                    <p className="text-lg font-black text-slate-950">
                      {perguntas[perguntaAtual].pergunta}
                    </p>
                    <div className="mt-4 grid gap-3">
                      {perguntas[perguntaAtual].alternativas.map(
                        (alternativa) => (
                          <button
                            key={alternativa.id}
                            type="button"
                            onClick={() =>
                              setRespostas((atual) => ({
                                ...atual,
                                [String(perguntas[perguntaAtual].id)]:
                                  alternativa.id,
                              }))
                            }
                            className={`rounded-xl border px-4 py-4 text-left text-sm font-black shadow-sm ${
                              respostas[String(perguntas[perguntaAtual].id)] ===
                              alternativa.id
                                ? "border-blue-600 bg-blue-600 text-white"
                                : "border-blue-100 bg-white text-blue-950 hover:border-blue-500 hover:bg-blue-50"
                            }`}
                          >
                            {alternativa.texto}
                          </button>
                        ),
                      )}
                    </div>
                  </div>
                )}
                <div className="mt-6 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      setPerguntaAtual((atual) => Math.max(0, atual - 1))
                    }
                    className="rounded-xl border border-blue-200 bg-white px-4 py-3 text-sm font-black text-blue-700"
                  >
                    Voltar
                  </button>
                  {perguntaAtual < perguntas.length - 1 ? (
                    <button
                      type="button"
                      onClick={() =>
                        setPerguntaAtual((atual) =>
                          Math.min(perguntas.length - 1, atual + 1),
                        )
                      }
                      className="rounded-xl bg-blue-600 px-4 py-3 text-sm font-black text-white"
                    >
                      Próxima pergunta
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={validarQuiz}
                      disabled={carregando}
                      className="rounded-xl bg-emerald-600 px-4 py-3 text-sm font-black text-white disabled:opacity-60"
                    >
                      Validar avaliação
                    </button>
                  )}
                </div>
              </section>
            )}

            {temQuiz && indice === indiceResultado && (
              <section className="rounded-2xl border border-blue-100 bg-white/95 p-4 shadow-lg shadow-blue-900/5 backdrop-blur sm:p-6">
                <Award className="h-10 w-10 text-blue-600" />
                <h2 className="mt-3 text-2xl font-black text-slate-950 sm:text-3xl">
                  Resultado da avaliação
                </h2>
                <p className="mt-4 rounded-xl border border-blue-100 bg-blue-50/80 p-4 text-lg font-black text-blue-950">
                  {resultadoAtual?.acertos ?? 0} acertos · nota{" "}
                  {resultadoAtual?.nota ?? participante.nota ?? 0}% · mínimo{" "}
                  {modelo.notaMinima}%
                </p>
                {resultadoAtual?.aprovado ? (
                  <button
                    onClick={() => {
                      setPerguntaAvaliacaoAtual(0);
                      setIndice(indiceAvaliacaoTreinamento);
                    }}
                    className="mt-6 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-black text-white"
                  >
                    Avaliar treinamento
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      setIndice(indiceQuiz);
                      setPerguntaAtual(0);
                    }}
                    className="mt-6 rounded-xl bg-blue-600 px-5 py-3 text-sm font-black text-white"
                  >
                    Revisar perguntas
                  </button>
                )}
              </section>
            )}

            {indice === indiceAvaliacaoTreinamento && (
              <section className="rounded-2xl border border-blue-100 bg-white/95 p-4 text-slate-950 shadow-lg shadow-blue-900/5 backdrop-blur sm:p-5">
                <p className="text-xs font-black uppercase tracking-[0.22em] text-blue-700">
                  Avaliação do treinamento
                </p>
                <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <h2 className="text-2xl font-black text-slate-950 sm:text-3xl">
                      Conte como foi sua experiência
                    </h2>
                    <p className="mt-2 max-w-3xl text-sm font-bold leading-6 text-slate-700">
                      Sua opinião ajuda a melhorar os próximos treinamentos.
                      Responda os itens abaixo para liberar a assinatura e
                      emissão do certificado.
                    </p>
                  </div>
                  <div className="rounded-xl border border-blue-100 bg-blue-50/80 px-4 py-2.5 text-sm font-black text-blue-800">
                    Etapa {perguntaAvaliacaoAtual + 1} de{" "}
                    {totalAvaliacaoTreinamento}
                  </div>
                </div>

                <div className="mt-5">
                  <div className="h-1.5 overflow-hidden rounded-full bg-blue-100">
                    <div
                      className="h-full rounded-full bg-blue-600 transition-all"
                      style={{ width: `${progressoAvaliacaoTreinamento}%` }}
                    />
                  </div>
                  <div className="mt-3 hidden rounded-xl border border-blue-100 bg-slate-50/80 p-2 shadow-sm sm:block">
                    <div className="grid grid-cols-4 gap-2 sm:grid-cols-8">
                      {Array.from({ length: totalAvaliacaoTreinamento }).map(
                        (_, index) => {
                          const preenchida =
                            index < perguntasAvaliacaoTreinamento.length
                              ? Boolean(
                                  avaliacaoTreinamento[
                                    perguntasAvaliacaoTreinamento[index].id
                                  ],
                                )
                              : true;
                          const atual = index === perguntaAvaliacaoAtual;
                          return (
                            <button
                              key={index}
                              type="button"
                              onClick={() => setPerguntaAvaliacaoAtual(index)}
                              className={`min-h-9 rounded-lg border px-2 py-1.5 text-xs font-black transition ${
                                atual
                                  ? "border-blue-600 bg-blue-600 text-white"
                                  : preenchida
                                    ? "border-emerald-200 bg-white text-emerald-800"
                                    : "border-blue-100 bg-white text-blue-950 hover:border-blue-500 hover:bg-blue-50"
                              }`}
                            >
                              {index + 1}
                            </button>
                          );
                        },
                      )}
                    </div>
                  </div>
                </div>

                {perguntaAvaliacao ? (
                  <article className="mt-5 rounded-2xl border border-blue-100 bg-white/90 p-4 shadow-sm sm:p-5">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-base font-black text-white">
                        {perguntaAvaliacaoAtual + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-700">
                          {perguntaAvaliacao.titulo}
                        </p>
                        <h3 className="mt-2 text-xl font-black leading-tight text-slate-950 sm:text-2xl">
                          {perguntaAvaliacao.pergunta}
                        </h3>
                        <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
                          {perguntaAvaliacao.opcoes.map((opcao) => {
                            const ativo =
                              avaliacaoTreinamento[perguntaAvaliacao.id] ===
                              opcao;
                            return (
                              <button
                                key={opcao}
                                type="button"
                                onClick={() =>
                                  setAvaliacaoTreinamento((atual) => ({
                                    ...atual,
                                    [perguntaAvaliacao.id]: opcao,
                                  }))
                                }
                                className={`min-h-12 rounded-xl border px-4 py-3 text-left text-sm font-black transition ${
                                  ativo
                                    ? "border-blue-500 bg-blue-50 text-blue-950 ring-2 ring-blue-500/20"
                                    : "border-blue-100 bg-white text-blue-950 hover:border-blue-500 hover:bg-blue-50"
                                }`}
                              >
                                {opcao}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </article>
                ) : (
                  <article className="mt-5 rounded-2xl border border-blue-100 bg-white/90 p-4 shadow-sm sm:p-5">
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-700">
                      Etapa final da opinião
                    </p>
                    <h3 className="mt-2 text-xl font-black text-slate-950 sm:text-2xl">
                      Comentários ou sugestões
                    </h3>
                    <p className="mt-2 text-sm font-bold leading-6 text-slate-700">
                      Este campo é opcional. Use se quiser registrar alguma
                      ideia para melhorar os próximos treinamentos.
                    </p>
                    <textarea
                      value={comentarioAvaliacao}
                      onChange={(event) =>
                        setComentarioAvaliacao(event.target.value)
                      }
                      rows={5}
                      placeholder="Escreva aqui sua sugestão."
                      className="mt-4 w-full resize-none rounded-xl border border-blue-100 bg-white px-4 py-3 text-sm font-bold text-slate-950 outline-none placeholder:text-slate-500 focus:border-blue-500"
                    />
                    <div className="mt-4 rounded-xl bg-slate-50 p-3 text-sm font-black text-slate-700">
                      Respostas marcadas:{" "}
                      {Object.keys(avaliacaoTreinamento).length} de{" "}
                      {perguntasAvaliacaoTreinamento.length}
                    </div>
                  </article>
                )}

                <div className="mt-6 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={
                      perguntaAvaliacaoAtual === 0
                        ? () =>
                            setIndice(
                              temQuiz
                                ? indiceResultado
                                : temVideo
                                  ? indiceVideo
                                  : Math.max(0, totalEtapas - 1),
                            )
                        : voltarAvaliacaoTreinamento
                    }
                    className="rounded-xl border border-blue-200 bg-white px-5 py-3 text-sm font-black text-blue-700 shadow-sm hover:bg-blue-50"
                  >
                    {perguntaAvaliacaoAtual === 0
                      ? "Voltar ao resultado"
                      : "Voltar etapa"}
                  </button>
                  {perguntaAvaliacaoAtual < totalAvaliacaoTreinamento - 1 ? (
                    <button
                      type="button"
                      onClick={avancarAvaliacaoTreinamento}
                      className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-black text-white shadow-sm hover:bg-blue-700"
                    >
                      Próxima etapa
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={carregando}
                      onClick={salvarAvaliacaoTreinamento}
                      className="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-black text-white shadow-sm hover:bg-emerald-700 disabled:opacity-60"
                    >
                      Salvar avaliação e assinar
                    </button>
                  )}
                </div>
              </section>
            )}

            {indice >= indiceAssinatura && (
              <section className="rounded-2xl border border-blue-100 bg-white/95 p-4 shadow-lg shadow-blue-900/5 backdrop-blur sm:p-6">
                <FileSignature className="h-10 w-10 text-blue-600" />
                <h2 className="mt-3 text-2xl font-black text-slate-950 sm:text-3xl">
                  Declaração e assinatura
                </h2>
                <p className="mt-4 rounded-xl border border-blue-100 bg-blue-50/55 p-4 text-sm font-black leading-6 text-slate-950">
                  Declaro que li integralmente o conteúdo, respondi à avaliação
                  e estou ciente das orientações apresentadas neste treinamento.
                </p>
                {!participante.certificadoUrl && (
                  <div className="mt-5 rounded-xl border border-blue-100 bg-white p-4 shadow-sm">
                    <div className="mb-3 flex items-center justify-between">
                      <span className="text-sm font-black text-slate-950">
                        Assinatura
                      </span>
                      <button
                        type="button"
                        onClick={prepararCanvas}
                        className="rounded-xl border border-blue-200 px-3 py-2 text-xs font-black text-blue-700"
                      >
                        Limpar
                      </button>
                    </div>
                    <canvas
                      ref={canvasRef}
                      onPointerDown={iniciarAssinatura}
                      onPointerMove={moverAssinatura}
                      onPointerUp={() => setAssinando(false)}
                      onPointerLeave={() => setAssinando(false)}
                      className="h-44 w-full touch-none rounded-xl border border-blue-200 bg-white"
                    />
                  </div>
                )}
                <div className="mt-6 flex flex-wrap gap-3">
                  {!participante.certificadoUrl ? (
                    <button
                      disabled={carregando}
                      onClick={concluir}
                      className="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-black text-white disabled:opacity-60"
                    >
                      Emitir certificado
                    </button>
                  ) : (
                    <>
                      <div className="inline-flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-black text-emerald-800">
                        <CheckCircle2 size={18} /> Certificado emitido
                      </div>
                      <a
                        href={participante.certificadoUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-black text-white"
                      >
                        Baixar certificado
                      </a>
                    </>
                  )}
                </div>
              </section>
            )}
          </div>
        )}
      </section>
    </main>
  );
}
