import axios from "axios";
import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent, PointerEvent } from "react";
import { ArrowLeft, CheckCircle2, Clock3, Download, FastForward, FileCheck2, Maximize2, Pause, Play, RotateCcw, ShieldCheck, SkipForward } from "lucide-react";

type Config = {
  titulo: string;
  portaria: string;
  resumo: string[];
  videoUrl: string;
};

type Integracao = {
  token: string;
  codigo: string;
  nomeCompleto: string;
  cpf: string;
  email: string;
  etapa: string;
  status: string;
  progressoSegundos: number;
  duracaoSegundos: number;
  videoConcluido: boolean;
  quizAprovado: boolean;
  aceiteDeclaracao: boolean;
  certificadoUrl?: string | null;
};

const perguntasQuiz = [
  { texto: "O limite de velocidade dentro da Movecta e de 30 km/h?", correta: false },
  { texto: "E seguro transitar entre as pilhas de conteiner?", correta: false },
  { texto: "Em caso de emergencia devo descer do meu caminhao e correr pelo patio de conteiner?", correta: false },
  { texto: "Apos o carregamento e antes de seguir viagem devo efetuar o travamento dos locks do conteiner?", correta: true },
  { texto: "Meu acesso na Movecta portando armas ou sob efeito de alcool ou substancias ilicitas e proibido?", correta: true },
];

const vazio = {
  nomeCompleto: "",
  cpf: "",
  dataNascimento: "",
  empresa: "",
  cargo: "",
  email: "",
  telefone: "",
};

const fundoMobileUrl = "/images/treinamento-terminal/fundo-para-movel.png";
const fundoDesktopUrl = "/images/treinamento-terminal/fundo-para-desktop.jpeg";

function campoClasse() {
  return "terminal-input w-full rounded-2xl border px-4 py-3.5 text-[15px] font-semibold outline-none transition";
}

function labelClasse() {
  return "terminal-label block text-sm font-extrabold";
}

function painelClasse(extra = "") {
  return `terminal-panel rounded-2xl border p-4 shadow-2xl sm:p-6 ${extra}`;
}

function botaoSecundarioClasse(extra = "") {
  return `terminal-secondary-action inline-flex w-full items-center justify-center gap-2 rounded-xl border px-5 py-3 text-sm font-black shadow-lg transition sm:w-auto ${extra}`;
}

function botaoPrimarioClasse(extra = "") {
  return `terminal-primary-action inline-flex w-full items-center justify-center gap-2 rounded-xl border px-5 py-3 text-sm font-black shadow-lg transition disabled:opacity-60 sm:w-auto ${extra}`;
}

function botaoSucessoClasse(extra = "") {
  return `terminal-success-action inline-flex w-full items-center justify-center gap-2 rounded-xl border px-5 py-3 text-sm font-black shadow-lg transition disabled:opacity-60 sm:w-auto ${extra}`;
}

function apenasDigitos(valor: string) {
  return valor.replace(/\D/g, "");
}

function mascararCpf(valor: string) {
  const digitos = apenasDigitos(valor).slice(0, 11);
  return digitos
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}

function cpfValido(cpf: string) {
  const digitos = apenasDigitos(cpf);
  if (digitos.length !== 11 || /^(\d)\1{10}$/.test(digitos)) return false;

  const calcularDigito = (tamanho: number) => {
    const soma = digitos
      .slice(0, tamanho)
      .split("")
      .reduce((total, numero, index) => total + Number(numero) * (tamanho + 1 - index), 0);
    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  };

  return calcularDigito(9) === Number(digitos[9]) && calcularDigito(10) === Number(digitos[10]);
}

function mascararTelefone(valor: string) {
  const digitos = apenasDigitos(valor).slice(0, 11);
  if (digitos.length <= 10) {
    return digitos.replace(/(\d{2})(\d)/, "($1) $2").replace(/(\d{4})(\d)/, "$1-$2");
  }
  return digitos.replace(/(\d{2})(\d)/, "($1) $2").replace(/(\d{5})(\d)/, "$1-$2");
}

function formatarTempo(segundos: number) {
  const total = Math.max(0, Math.floor(segundos || 0));
  const min = Math.floor(total / 60);
  const seg = total % 60;
  return `${String(min).padStart(2, "0")}:${String(seg).padStart(2, "0")}`;
}

function integracaoConcluido(integracao?: Integracao | null) {
  return String(integracao?.status || "").toLowerCase().startsWith("conclu");
}

export default function IntegracaoTerminalPublico() {
  const [config, setConfig] = useState<Config | null>(null);
  const [etapa, setEtapa] = useState(0);
  const [form, setForm] = useState(vazio);
  const [integracao, setIntegracao] = useState<Integracao | null>(null);
  const [respostas, setRespostas] = useState<Array<boolean | null>>(perguntasQuiz.map(() => null));
  const [carregando, setCarregando] = useState(false);
  const [mensagem, setMensagem] = useState("");
  const [tocando, setTocando] = useState(false);
  const [velocidadeVideo, setVelocidadeVideo] = useState(1);
  const [duracao, setDuracao] = useState(0);
  const [tempoAtual, setTempoAtual] = useState(0);
  const [aceite, setAceite] = useState(false);
  const [assinando, setAssinando] = useState(false);
  const [assinaturaVazia, setAssinaturaVazia] = useState(true);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const maiorTempoRef = useRef(0);
  const ultimoEnvioRef = useRef(0);

  useEffect(() => {
    axios.get("/api/public/integracao-terminal/config").then((response) => setConfig(response.data));
  }, []);

  useEffect(() => {
    if (!integracao) return;
    maiorTempoRef.current = integracao.progressoSegundos || 0;
    setTempoAtual(integracao.progressoSegundos || 0);
    setDuracao(integracao.duracaoSegundos || 0);
    if (integracaoConcluido(integracao)) {
      setEtapa(5);
      return;
    }
    if (integracao.quizAprovado) setEtapa(4);
    else if (integracao.videoConcluido) setEtapa(3);
  }, [integracao]);

  const restante = useMemo(() => Math.max(0, (duracao || integracao?.duracaoSegundos || 0) - tempoAtual), [duracao, tempoAtual, integracao]);

  async function salvarProgresso(videoConcluido = false) {
    if (!integracao) return;
    const agora = Date.now();
    if (!videoConcluido && agora - ultimoEnvioRef.current < 5000) return;
    ultimoEnvioRef.current = agora;
    const progressoSegundos = Math.floor(maiorTempoRef.current);
    const duracaoSegundos = Math.floor(duracao || videoRef.current?.duration || 0);
    const response = await axios.put(`/api/public/integracao-terminal/${integracao.token}/progresso`, {
      progressoSegundos,
      duracaoSegundos,
      videoConcluido,
    });
    setIntegracao(response.data.integracao);
  }

  function voltarPara(novaEtapa: number) {
    if (etapa === 5) return;
    if (videoRef.current && !videoRef.current.paused) {
      videoRef.current.pause();
      setTocando(false);
      salvarProgresso().catch(() => undefined);
    }
    setMensagem("");
    setEtapa(novaEtapa);
  }

  function alterar(nome: keyof typeof vazio, valor: string) {
    if (nome === "cpf") valor = mascararCpf(valor);
    if (nome === "telefone") valor = mascararTelefone(valor);
    setForm((atual) => ({ ...atual, [nome]: valor }));
  }

  async function iniciar(event: FormEvent) {
    event.preventDefault();
    if (!cpfValido(form.cpf)) {
      setMensagem("Informe um CPF valido para continuar.");
      return;
    }
    setCarregando(true);
    setMensagem("");
    try {
      const response = await axios.post("/api/public/integracao-terminal/iniciar", form);
      setIntegracao(response.data.integracao);
      if (response.data.concluido) {
        setMensagem("Integracao ja concluida. Certificado disponivel para download.");
        setEtapa(5);
      } else {
        setMensagem(response.data.emAndamento ? "Integracao em andamento encontrada. Voce pode continuar de onde parou." : "Cadastro registrado. Inicie o video de orientacao.");
        setEtapa(2);
      }
    } catch (error: any) {
      setMensagem(error.response?.data?.error || "Nao foi possivel iniciar a integracao.");
    } finally {
      setCarregando(false);
    }
  }

  function prepararVideo() {
    const video = videoRef.current;
    if (!video || !integracao) return;
    if (integracao.progressoSegundos > 0 && video.currentTime < 1) {
      video.currentTime = integracao.progressoSegundos;
    }
    setDuracao(video.duration || 0);
  }

  function atualizarTempo() {
    const video = videoRef.current;
    if (!video) return;
    if (video.playbackRate !== velocidadeVideo) video.playbackRate = velocidadeVideo;
    if (video.currentTime > maiorTempoRef.current + 1.5) {
      video.currentTime = maiorTempoRef.current;
      return;
    }
    maiorTempoRef.current = Math.max(maiorTempoRef.current, video.currentTime);
    setTempoAtual(video.currentTime);
    setDuracao(video.duration || duracao);
    salvarProgresso().catch(() => undefined);
  }

  function alternarVideo() {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.playbackRate = velocidadeVideo;
      video.play().then(() => setTocando(true)).catch(() => setMensagem("Nao foi possivel iniciar o video."));
    } else {
      video.pause();
      setTocando(false);
      salvarProgresso().catch(() => undefined);
    }
  }

  function abrirTelaCheia() {
    const video = videoRef.current;
    if (!video) return;
    video.requestFullscreen?.().catch(() => setMensagem("Nao foi possivel abrir o video em tela cheia."));
  }

  function alternarVelocidadeVideo() {
    const proximaVelocidade = velocidadeVideo === 1 ? 1.5 : 1;
    setVelocidadeVideo(proximaVelocidade);
    if (videoRef.current) videoRef.current.playbackRate = proximaVelocidade;
  }

  function pularVideoTeste() {
    const video = videoRef.current;
    if (video) {
      video.pause();
      maiorTempoRef.current = Math.max(maiorTempoRef.current, video.duration || tempoAtual);
      setTempoAtual(video.duration || tempoAtual);
    }
    setTocando(false);
    salvarProgresso(true).then(() => setEtapa(3)).catch(() => setMensagem("Nao foi possivel liberar o quiz."));
  }

  function finalizarVideo() {
    maiorTempoRef.current = Math.max(maiorTempoRef.current, videoRef.current?.duration || tempoAtual);
    setTocando(false);
    salvarProgresso(true).then(() => setEtapa(3)).catch(() => setMensagem("Nao foi possivel registrar a conclusao do video."));
  }

  async function enviarQuiz() {
    if (!integracao) return;
    if (respostas.some((resposta) => resposta === null)) {
      setMensagem("Responda todas as perguntas para continuar.");
      return;
    }
    setCarregando(true);
    setMensagem("");
    try {
      const response = await axios.post(`/api/public/integracao-terminal/${integracao.token}/quiz`, {
        respostas,
      });
      setIntegracao(response.data.integracao);
      setEtapa(4);
      setMensagem("Quiz aprovado. Registre a declaracao e assinatura.");
    } catch (error: any) {
      setMensagem(error.response?.data?.error || "Revise as respostas do quiz para continuar.");
    } finally {
      setCarregando(false);
    }
  }

  function pontoCanvas(event: PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * canvas.width,
      y: ((event.clientY - rect.top) / rect.height) * canvas.height,
    };
  }

  function iniciarAssinatura(event: PointerEvent<HTMLCanvasElement>) {
    setAssinando(true);
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    const p = pontoCanvas(event);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
  }

  function desenhar(event: PointerEvent<HTMLCanvasElement>) {
    if (!assinando) return;
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    const p = pontoCanvas(event);
    ctx.lineTo(p.x, p.y);
    ctx.strokeStyle = "#0f172a";
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.stroke();
    setAssinaturaVazia(false);
  }

  function limparAssinatura() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height);
    setAssinaturaVazia(true);
  }

  async function concluir() {
    if (!integracao || !aceite || assinaturaVazia) {
      setMensagem("Confirme a declaracao e registre sua assinatura.");
      return;
    }
    setCarregando(true);
    try {
      const assinaturaDataUrl = canvasRef.current!.toDataURL("image/png");
      const response = await axios.post(`/api/public/integracao-terminal/${integracao.token}/concluir`, {
        aceiteDeclaracao: aceite,
        assinaturaDataUrl,
      });
      setIntegracao(response.data.integracao);
      setEtapa(5);
      setMensagem("Certificado emitido com sucesso.");
    } catch (error: any) {
      setMensagem(error.response?.data?.error || "Nao foi possivel emitir o certificado.");
    } finally {
      setCarregando(false);
    }
  }

  return (
    <main className="treinamento-terminal-publico integracao-terminal-publico relative min-h-screen overflow-hidden bg-[#eef0f7] text-slate-950">
      <picture className="fixed inset-0 z-0 block h-full w-full">
        <source media="(min-width: 768px)" srcSet={fundoDesktopUrl} />
        <img src={fundoMobileUrl} alt="" aria-hidden="true" className="h-full w-full object-cover object-center" />
      </picture>
      <div className="fixed inset-0 z-0 bg-white/35" />
      <section className="relative z-10 mx-auto flex min-h-screen w-full max-w-6xl flex-col px-3 py-5 sm:px-6 sm:py-8 lg:px-8">
        <div className="terminal-panel mb-5 flex items-center justify-between gap-4 rounded-2xl border px-4 py-3 shadow-xl sm:mb-8 sm:px-5 sm:py-4">
          <div>
            <p className="terminal-eyebrow text-xs font-black uppercase text-blue-700">Movecta</p>
            <h1 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">Integração de condutores</h1>
          </div>
          <ShieldCheck className="h-9 w-9 shrink-0 text-blue-600 sm:h-10 sm:w-10" />
        </div>

        <div className="mb-5 grid grid-cols-2 gap-2 sm:mb-6 sm:grid-cols-5 sm:gap-3">
          {["Orientacoes", "Dados", "Video", "Quiz", "Assinatura"].map((item, index) => (
            <div key={item} className={`terminal-step rounded-2xl border px-3 py-2 text-xs font-black shadow-lg shadow-slate-900/10 sm:px-4 sm:py-3 sm:text-sm ${etapa >= index ? "terminal-step-active" : "terminal-step-idle"}`}>
              {index + 1}. {item}
            </div>
          ))}
        </div>

        {mensagem && <div className="terminal-message mb-5 rounded-xl border px-4 py-3 text-sm font-black shadow-lg">{mensagem}</div>}

        {etapa === 0 && (
          <div className={painelClasse()}>
            <p className="terminal-eyebrow text-sm font-black uppercase text-blue-700">{config?.portaria || "Portaria de acesso"}</p>
            <h2 className="mt-3 text-xl font-black sm:text-2xl">Antes de iniciar</h2>
            <div className="mt-5 grid gap-4">
              {(config?.resumo || []).map((texto) => (
                <p key={texto} className="terminal-info-card rounded-xl border p-4 text-sm font-bold leading-6 shadow-sm">{texto}</p>
              ))}
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <button onClick={() => setEtapa(1)} className={botaoPrimarioClasse()}>
                Entendi, avancar
              </button>
            </div>
          </div>
        )}

        {etapa === 1 && (
          <form onSubmit={iniciar} className={painelClasse()}>
            <h2 className="text-xl font-black sm:text-2xl">Identificacao do participante</h2>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <label className={labelClasse()}>Nome completo<input className={`${campoClasse()} mt-2.5`} value={form.nomeCompleto} onChange={(e) => alterar("nomeCompleto", e.target.value)} required /></label>
              <label className={labelClasse()}>CPF<input className={`${campoClasse()} mt-2.5`} value={form.cpf} onChange={(e) => alterar("cpf", e.target.value)} inputMode="numeric" maxLength={14} aria-invalid={form.cpf.length === 14 && !cpfValido(form.cpf)} title="Digite um CPF valido" required /></label>
              <label className={labelClasse()}>Data de nascimento<input className={`${campoClasse()} mt-2.5`} type="date" value={form.dataNascimento} onChange={(e) => alterar("dataNascimento", e.target.value)} required /></label>
              <label className={labelClasse()}>Empresa<input className={`${campoClasse()} mt-2.5`} value={form.empresa} onChange={(e) => alterar("empresa", e.target.value)} required /></label>
              <label className={labelClasse()}>Funcao/Cargo<input className={`${campoClasse()} mt-2.5`} value={form.cargo} onChange={(e) => alterar("cargo", e.target.value)} required /></label>
              <label className={labelClasse()}>E-mail<input className={`${campoClasse()} mt-2.5`} type="email" value={form.email} onChange={(e) => alterar("email", e.target.value)} required /></label>
              <label className={labelClasse()}>Telefone / WhatsApp<input className={`${campoClasse()} mt-2.5`} value={form.telefone} onChange={(e) => alterar("telefone", e.target.value)} required /></label>
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <button type="button" onClick={() => voltarPara(0)} className={botaoSecundarioClasse()}>
                <ArrowLeft size={18} /> Voltar para orientacoes
              </button>
              <button disabled={carregando} className={botaoPrimarioClasse()}>
                {carregando ? "Verificando..." : "Avancar para o video"}
              </button>
            </div>
          </form>
        )}

        {etapa === 2 && integracao && (
          <div className={painelClasse()}>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-black sm:text-2xl">Video obrigatorio</h2>
                <p className="mt-1 text-sm font-bold text-slate-900">Modo de testes ativo: use os controles abaixo para acelerar ou pular o video.</p>
              </div>
              <div className="terminal-info-card rounded-xl border px-4 py-3 text-sm font-black shadow-sm">
                <Clock3 className="mr-2 inline h-4 w-4 text-blue-700" />
                Restante: {formatarTempo(restante)}
              </div>
            </div>
            <video
              ref={videoRef}
              src={config?.videoUrl}
              className="terminal-integration-video mt-5 w-full rounded-2xl border border-blue-200 bg-white"
              onLoadedMetadata={prepararVideo}
              onTimeUpdate={atualizarTempo}
              onEnded={finalizarVideo}
              onRateChange={() => { if (videoRef.current && videoRef.current.playbackRate !== velocidadeVideo) videoRef.current.playbackRate = velocidadeVideo; }}
              onSeeking={() => {
                if (videoRef.current && videoRef.current.currentTime > maiorTempoRef.current + 1) {
                  videoRef.current.currentTime = maiorTempoRef.current;
                }
              }}
            />
            <div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-800">
              <div className="h-full rounded-full bg-blue-500" style={{ width: `${Math.min(100, ((tempoAtual || 0) / Math.max(1, duracao || 1)) * 100)}%` }} />
            </div>
            <div className="mt-5 flex flex-wrap gap-3">
              <button type="button" onClick={() => voltarPara(1)} className={botaoSecundarioClasse()}>
                <ArrowLeft size={18} /> Voltar para dados
              </button>
              <button onClick={alternarVideo} className={botaoPrimarioClasse()}>
                {tocando ? <Pause size={18} /> : <Play size={18} />}
                {tocando ? "Pausar" : "Continuar"}
              </button>
              <button type="button" onClick={abrirTelaCheia} className={botaoSecundarioClasse()}>
                <Maximize2 size={18} /> Tela cheia
              </button>
              <button type="button" onClick={alternarVelocidadeVideo} className={botaoSecundarioClasse()}>
                <FastForward size={18} /> {velocidadeVideo === 1 ? "Acelerar 1.5x" : "Voltar para 1x"}
              </button>
              <button type="button" onClick={pularVideoTeste} className={botaoSecundarioClasse()}>
                <SkipForward size={18} /> Pular video
              </button>
            </div>
          </div>
        )}

        {etapa === 3 && integracao && (
          <div className={painelClasse()}>
            <h2 className="text-xl font-black sm:text-2xl">Quiz de seguranca operacional</h2>
            <p className="mt-2 text-sm font-bold text-slate-700">Selecione Verdadeiro ou Falso em todas as perguntas para liberar a assinatura.</p>
            <div className="mt-6 grid gap-4">
              {perguntasQuiz.map((pergunta, index) => (
                <div key={pergunta.texto} className="terminal-info-card rounded-2xl border p-4 shadow-sm">
                  <p className="text-sm font-black text-slate-950">{index + 1}. {pergunta.texto}</p>
                  <div className="mt-4 grid gap-2 sm:grid-cols-2">
                    {[true, false].map((valor) => {
                      const selecionado = respostas[index] === valor;
                      return (
                        <button
                          key={String(valor)}
                          type="button"
                          onClick={() => setRespostas((atuais) => atuais.map((item, posicao) => (posicao === index ? valor : item)))}
                          className={`terminal-quiz-option rounded-2xl border px-4 py-3 text-sm font-black transition ${selecionado ? "terminal-quiz-option-active shadow-lg shadow-blue-700/20" : "terminal-quiz-option-idle"}`}
                        >
                          {valor ? "Verdadeiro" : "Falso"}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <button type="button" onClick={() => voltarPara(2)} className={botaoSecundarioClasse()}>
                <ArrowLeft size={18} /> Voltar para video
              </button>
              <button type="button" disabled={carregando} onClick={enviarQuiz} className={botaoPrimarioClasse()}>
                {carregando ? "Validando..." : "Validar respostas"}
              </button>
            </div>
          </div>
        )}

        {etapa === 4 && integracao && (
          <div className={painelClasse()}>
            <h2 className="text-xl font-black sm:text-2xl">Declaracao e assinatura</h2>
            <label className="terminal-info-card mt-5 flex items-start gap-3 rounded-xl border p-4 text-sm font-bold shadow-sm">
              <input type="checkbox" className="mt-1 h-5 w-5 accent-blue-600" checked={aceite} onChange={(e) => setAceite(e.target.checked)} />
              <span>Declaro que assisti integralmente ao video, compreendi as orientacoes apresentadas e estou ciente das regras de acesso, seguranca e conduta aplicaveis ao terminal.</span>
            </label>
            <div className="terminal-info-card mt-5 rounded-xl border p-4 shadow-sm">
              <div className="mb-3 flex items-center justify-between gap-3">
                <p className="terminal-label text-sm font-extrabold">Assinatura</p>
                <button type="button" onClick={limparAssinatura} className="terminal-secondary-action inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-black">
                  <RotateCcw size={14} /> Limpar
                </button>
              </div>
              <canvas ref={canvasRef} width={900} height={220} className="h-48 w-full touch-none rounded-xl bg-white ring-1 ring-slate-200" onPointerDown={iniciarAssinatura} onPointerMove={desenhar} onPointerUp={() => setAssinando(false)} onPointerLeave={() => setAssinando(false)} />
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <button type="button" onClick={() => voltarPara(3)} className={botaoSecundarioClasse()}>
                <ArrowLeft size={18} /> Voltar para quiz
              </button>
              <button disabled={carregando} onClick={concluir} className={botaoSucessoClasse()}>
                <FileCheck2 size={18} /> Emitir certificado
              </button>
            </div>
          </div>
        )}

        {etapa === 5 && integracao && (
          <div className={painelClasse("text-center")}>
            <CheckCircle2 className="mx-auto h-14 w-14 text-emerald-600" />
            <h2 className="mt-4 text-2xl font-black">Integracao concluida</h2>
            <p className="mt-2 text-sm font-bold text-emerald-950">Certificado {integracao.codigo} emitido. O envio por e-mail sera realizado quando o SMTP estiver configurado no servidor.</p>
            {integracao.certificadoUrl && (
              <a href={integracao.certificadoUrl} download className="mt-6 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-black text-white transition hover:bg-emerald-500">
                <Download size={18} /> Baixar certificado
              </a>
            )}
          </div>
        )}
      </section>

    </main>
  );
}
