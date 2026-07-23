import axios from "axios";
import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent, PointerEvent } from "react";
import { ArrowLeft, CheckCircle2, Clock3, Download, FileCheck2, FileText, Pause, Play, RotateCcw, ShieldCheck, X } from "lucide-react";

type Config = {
  titulo: string;
  portaria: string;
  resumo: string[];
  videoUrl: string;
};

type Treinamento = {
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
  aceiteDeclaracao: boolean;
  certificadoUrl?: string | null;
};

const vazio = {
  nomeCompleto: "",
  cpf: "",
  dataNascimento: "",
  empresa: "",
  cargo: "",
  email: "",
  telefone: "",
};

const portariaPdfUrl = "/docs/portaria-alf-sts-205-2026.pdf";

function campoClasse() {
  return "w-full rounded-xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-sm font-semibold text-white outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20";
}

function labelClasse() {
  return "block text-xs font-semibold uppercase tracking-[0.16em] text-slate-400";
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

export default function TreinamentoTerminalPublico() {
  const [config, setConfig] = useState<Config | null>(null);
  const [etapa, setEtapa] = useState(0);
  const [form, setForm] = useState(vazio);
  const [treinamento, setTreinamento] = useState<Treinamento | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [mensagem, setMensagem] = useState("");
  const [tocando, setTocando] = useState(false);
  const [duracao, setDuracao] = useState(0);
  const [tempoAtual, setTempoAtual] = useState(0);
  const [aceite, setAceite] = useState(false);
  const [assinando, setAssinando] = useState(false);
  const [assinaturaVazia, setAssinaturaVazia] = useState(true);
  const [portariaAberta, setPortariaAberta] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const maiorTempoRef = useRef(0);
  const ultimoEnvioRef = useRef(0);

  useEffect(() => {
    axios.get("/api/public/treinamento-terminal/config").then((response) => setConfig(response.data));
  }, []);

  useEffect(() => {
    if (!treinamento) return;
    maiorTempoRef.current = treinamento.progressoSegundos || 0;
    setTempoAtual(treinamento.progressoSegundos || 0);
    setDuracao(treinamento.duracaoSegundos || 0);
    if (treinamento.videoConcluido) setEtapa(3);
  }, [treinamento]);

  const restante = useMemo(() => Math.max(0, (duracao || treinamento?.duracaoSegundos || 0) - tempoAtual), [duracao, tempoAtual, treinamento]);

  async function salvarProgresso(videoConcluido = false) {
    if (!treinamento) return;
    const agora = Date.now();
    if (!videoConcluido && agora - ultimoEnvioRef.current < 5000) return;
    ultimoEnvioRef.current = agora;
    const progressoSegundos = Math.floor(maiorTempoRef.current);
    const duracaoSegundos = Math.floor(duracao || videoRef.current?.duration || 0);
    const response = await axios.put(`/api/public/treinamento-terminal/${treinamento.token}/progresso`, {
      progressoSegundos,
      duracaoSegundos,
      videoConcluido,
    });
    setTreinamento(response.data.treinamento);
  }

  function voltarPara(novaEtapa: number) {
    if (etapa === 4) return;
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
    setCarregando(true);
    setMensagem("");
    try {
      const response = await axios.post("/api/public/treinamento-terminal/iniciar", form);
      setTreinamento(response.data.treinamento);
      setMensagem(response.data.emAndamento ? "Treinamento em andamento encontrado. Voce pode continuar de onde parou." : "Cadastro registrado. Inicie o video de orientacao.");
      setEtapa(2);
    } catch (error: any) {
      setMensagem(error.response?.data?.error || "Nao foi possivel iniciar o treinamento.");
    } finally {
      setCarregando(false);
    }
  }

  function prepararVideo() {
    const video = videoRef.current;
    if (!video || !treinamento) return;
    if (treinamento.progressoSegundos > 0 && video.currentTime < 1) {
      video.currentTime = treinamento.progressoSegundos;
    }
    setDuracao(video.duration || 0);
  }

  function atualizarTempo() {
    const video = videoRef.current;
    if (!video) return;
    video.playbackRate = 1;
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
      video.playbackRate = 1;
      video.play().then(() => setTocando(true)).catch(() => setMensagem("Nao foi possivel iniciar o video."));
    } else {
      video.pause();
      setTocando(false);
      salvarProgresso().catch(() => undefined);
    }
  }

  function finalizarVideo() {
    maiorTempoRef.current = Math.max(maiorTempoRef.current, videoRef.current?.duration || tempoAtual);
    setTocando(false);
    salvarProgresso(true).then(() => setEtapa(3)).catch(() => setMensagem("Nao foi possivel registrar a conclusao do video."));
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
    ctx.strokeStyle = "#e2e8f0";
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
    if (!treinamento || !aceite || assinaturaVazia) {
      setMensagem("Confirme a declaracao e registre sua assinatura.");
      return;
    }
    setCarregando(true);
    try {
      const assinaturaDataUrl = canvasRef.current!.toDataURL("image/png");
      const response = await axios.post(`/api/public/treinamento-terminal/${treinamento.token}/concluir`, {
        aceiteDeclaracao: aceite,
        assinaturaDataUrl,
      });
      setTreinamento(response.data.treinamento);
      setEtapa(4);
      setMensagem("Certificado emitido com sucesso.");
    } catch (error: any) {
      setMensagem(error.response?.data?.error || "Nao foi possivel emitir o certificado.");
    } finally {
      setCarregando(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.3em] text-blue-300">JetGuard Movecta</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Treinamento de acesso ao terminal</h1>
          </div>
          <ShieldCheck className="h-10 w-10 text-blue-300" />
        </div>

        <div className="mb-6 grid gap-3 sm:grid-cols-4">
          {["Orientacoes", "Dados", "Video", "Declaracao"].map((item, index) => (
            <div key={item} className={`rounded-xl border px-4 py-3 text-sm font-bold ${etapa >= index ? "border-blue-400/50 bg-blue-500/15 text-blue-100" : "border-slate-800 bg-slate-900 text-slate-500"}`}>
              {index + 1}. {item}
            </div>
          ))}
        </div>

        {mensagem && <div className="mb-5 rounded-xl border border-blue-400/30 bg-blue-500/10 px-4 py-3 text-sm font-semibold text-blue-100">{mensagem}</div>}

        {etapa === 0 && (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl">
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-blue-300">{config?.portaria || "Portaria de acesso"}</p>
            <h2 className="mt-3 text-2xl font-black">Antes de iniciar</h2>
            <div className="mt-5 grid gap-4">
              {(config?.resumo || []).map((texto) => (
                <p key={texto} className="rounded-xl border border-slate-800 bg-slate-950/70 p-4 text-sm leading-6 text-slate-300">{texto}</p>
              ))}
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <button onClick={() => setPortariaAberta(true)} className="inline-flex items-center gap-2 rounded-xl border border-slate-700 px-5 py-3 text-sm font-black text-slate-100 transition hover:border-blue-400 hover:text-blue-100">
                <FileText size={18} /> Ver Portaria
              </button>
              <button onClick={() => setEtapa(1)} className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-black text-white transition hover:bg-blue-500">
                Entendi, avancar
              </button>
            </div>
          </div>
        )}

        {etapa === 1 && (
          <form onSubmit={iniciar} className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl">
            <h2 className="text-2xl font-black">Identificacao do participante</h2>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <label className={labelClasse()}>Nome completo<input className={`${campoClasse()} mt-2`} value={form.nomeCompleto} onChange={(e) => alterar("nomeCompleto", e.target.value)} required /></label>
              <label className={labelClasse()}>CPF<input className={`${campoClasse()} mt-2`} value={form.cpf} onChange={(e) => alterar("cpf", e.target.value)} required /></label>
              <label className={labelClasse()}>Data de nascimento<input className={`${campoClasse()} mt-2`} type="date" value={form.dataNascimento} onChange={(e) => alterar("dataNascimento", e.target.value)} required /></label>
              <label className={labelClasse()}>Empresa<input className={`${campoClasse()} mt-2`} value={form.empresa} onChange={(e) => alterar("empresa", e.target.value)} required /></label>
              <label className={labelClasse()}>Funcao/Cargo<input className={`${campoClasse()} mt-2`} value={form.cargo} onChange={(e) => alterar("cargo", e.target.value)} required /></label>
              <label className={labelClasse()}>E-mail<input className={`${campoClasse()} mt-2`} type="email" value={form.email} onChange={(e) => alterar("email", e.target.value)} required /></label>
              <label className={labelClasse()}>Telefone / WhatsApp<input className={`${campoClasse()} mt-2`} value={form.telefone} onChange={(e) => alterar("telefone", e.target.value)} required /></label>
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <button type="button" onClick={() => voltarPara(0)} className="inline-flex items-center gap-2 rounded-xl border border-slate-700 px-5 py-3 text-sm font-black text-slate-100 transition hover:border-blue-400 hover:text-blue-100">
                <ArrowLeft size={18} /> Voltar para orientacoes
              </button>
              <button disabled={carregando} className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-black text-white transition hover:bg-blue-500 disabled:opacity-60">
                {carregando ? "Verificando..." : "Avancar para o video"}
              </button>
            </div>
          </form>
        )}

        {etapa === 2 && treinamento && (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-black">Video obrigatorio</h2>
                <p className="mt-1 text-sm text-slate-400">O video nao pode ser acelerado nem avancado manualmente.</p>
              </div>
              <div className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm font-bold text-slate-200">
                <Clock3 className="mr-2 inline h-4 w-4 text-blue-300" />
                Restante: {formatarTempo(restante)}
              </div>
            </div>
            <video
              ref={videoRef}
              src={config?.videoUrl}
              className="mt-5 aspect-video w-full rounded-2xl border border-slate-800 bg-black"
              onLoadedMetadata={prepararVideo}
              onTimeUpdate={atualizarTempo}
              onEnded={finalizarVideo}
              onRateChange={() => { if (videoRef.current) videoRef.current.playbackRate = 1; }}
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
              <button type="button" onClick={() => voltarPara(1)} className="inline-flex items-center gap-2 rounded-xl border border-slate-700 px-5 py-3 text-sm font-black text-slate-100 transition hover:border-blue-400 hover:text-blue-100">
                <ArrowLeft size={18} /> Voltar para dados
              </button>
              <button onClick={alternarVideo} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-black text-white transition hover:bg-blue-500">
                {tocando ? <Pause size={18} /> : <Play size={18} />}
                {tocando ? "Pausar" : "Continuar"}
              </button>
            </div>
          </div>
        )}

        {etapa === 3 && treinamento && (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl">
            <h2 className="text-2xl font-black">Declaracao e assinatura</h2>
            <label className="mt-5 flex items-start gap-3 rounded-xl border border-slate-800 bg-slate-950/70 p-4 text-sm text-slate-300">
              <input type="checkbox" className="mt-1 h-5 w-5 accent-blue-600" checked={aceite} onChange={(e) => setAceite(e.target.checked)} />
              <span>Declaro que assisti integralmente ao video, compreendi as orientacoes apresentadas e estou ciente das regras de acesso, seguranca e conduta aplicaveis ao terminal.</span>
            </label>
            <div className="mt-5 rounded-xl border border-slate-800 bg-slate-950 p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">Assinatura</p>
                <button type="button" onClick={limparAssinatura} className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-xs font-bold text-slate-200 hover:border-blue-400">
                  <RotateCcw size={14} /> Limpar
                </button>
              </div>
              <canvas ref={canvasRef} width={900} height={220} className="h-48 w-full touch-none rounded-xl bg-slate-900 ring-1 ring-slate-800" onPointerDown={iniciarAssinatura} onPointerMove={desenhar} onPointerUp={() => setAssinando(false)} onPointerLeave={() => setAssinando(false)} />
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <button type="button" onClick={() => voltarPara(2)} className="inline-flex items-center gap-2 rounded-xl border border-slate-700 px-5 py-3 text-sm font-black text-slate-100 transition hover:border-blue-400 hover:text-blue-100">
                <ArrowLeft size={18} /> Voltar para video
              </button>
              <button disabled={carregando} onClick={concluir} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-black text-white transition hover:bg-emerald-500 disabled:opacity-60">
                <FileCheck2 size={18} /> Emitir certificado
              </button>
            </div>
          </div>
        )}

        {etapa === 4 && treinamento && (
          <div className="rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-6 text-center shadow-2xl">
            <CheckCircle2 className="mx-auto h-14 w-14 text-emerald-300" />
            <h2 className="mt-4 text-2xl font-black">Treinamento concluido</h2>
            <p className="mt-2 text-sm text-emerald-100">Certificado {treinamento.codigo} emitido. O envio por e-mail sera realizado quando o SMTP estiver configurado no servidor.</p>
            {treinamento.certificadoUrl && (
              <a href={treinamento.certificadoUrl} className="mt-6 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-black text-white transition hover:bg-emerald-500">
                Salvar certificado
              </a>
            )}
          </div>
        )}
      </section>

      {portariaAberta && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
          <div className="flex h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-slate-700 bg-slate-950 shadow-2xl">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 px-5 py-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-300">Documento oficial</p>
                <h2 className="text-lg font-black text-white">Portaria ALF/STS 205/2026</h2>
              </div>
              <div className="flex items-center gap-2">
                <a href={portariaPdfUrl} download className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-black text-white transition hover:bg-blue-500">
                  <Download size={16} /> Download
                </a>
                <button onClick={() => setPortariaAberta(false)} className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-700 text-slate-200 transition hover:border-red-400 hover:text-red-200" aria-label="Fechar">
                  <X size={18} />
                </button>
              </div>
            </div>
            <iframe title="Portaria ALF/STS 205/2026" src={portariaPdfUrl} className="min-h-0 flex-1 bg-white" />
          </div>
        </div>
      )}
    </main>
  );
}
