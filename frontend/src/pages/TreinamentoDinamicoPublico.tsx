import axios from "axios";
import { useEffect, useRef, useState } from "react";
import type { FormEvent, PointerEvent } from "react";
import { useParams } from "react-router-dom";
import { Award, CheckCircle2, FileSignature, ShieldCheck } from "lucide-react";

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
  tentativas: number;
  certificadoUrl?: string | null;
};

const formInicial = {
  nomeCompleto: "",
  cpf: "",
  email: "",
  cargo: "",
  departamento: "",
  unidade: "",
  empresa: "",
};

function limparCpf(cpf: string) {
  return cpf.replace(/\D/g, "");
}

function mascararCpf(cpf: string) {
  const digitos = limparCpf(cpf).slice(0, 11);
  return digitos
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1-$2");
}

function cpfValido(cpf: string) {
  const digitos = limparCpf(cpf);
  if (digitos.length !== 11 || /^(\d)\1{10}$/.test(digitos)) return false;
  const calcular = (tamanho: number) => {
    const soma = digitos
      .slice(0, tamanho)
      .split("")
      .reduce(
        (total, numero, index) => total + Number(numero) * (tamanho + 1 - index),
        0,
      );
    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  };
  return calcular(9) === Number(digitos[9]) && calcular(10) === Number(digitos[10]);
}

function emailValido(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());
}

export default function TreinamentoDinamicoPublico() {
  const { slug = "" } = useParams();
  const [modelo, setModelo] = useState<Modelo | null>(null);
  const [participante, setParticipante] = useState<Participante | null>(null);
  const [form, setForm] = useState(formInicial);
  const [unidades, setUnidades] = useState<string[]>([]);
  const [indice, setIndice] = useState(0);
  const [mensagem, setMensagem] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [perguntaAtual, setPerguntaAtual] = useState(0);
  const [respostas, setRespostas] = useState<Record<string, number>>({});
  const [resultado, setResultado] = useState<{ aprovado: boolean; nota: number; acertos: number } | null>(null);
  const [assinaturaVazia, setAssinaturaVazia] = useState(true);
  const [assinando, setAssinando] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const perguntas = modelo?.perguntas || [];
  const totalEtapas = modelo?.etapas.length || 0;
  const indiceQuiz = totalEtapas;
  const indiceResultado = totalEtapas + 1;
  const indiceAssinatura = totalEtapas + 2;
  const etapa = modelo?.etapas[indice];

  useEffect(() => {
    axios
      .get(`/api/public/treinamentos-dinamicos/${slug}`)
      .then((response) => setModelo(response.data?.treinamento))
      .catch(() => setMensagem("Treinamento não encontrado ou indisponível."));
    axios
      .get("/api/public/treinamentos-dinamicos/unidades")
      .then((response) => setUnidades(Array.isArray(response.data?.unidades) ? response.data.unidades : []))
      .catch(() => undefined);
  }, [slug]);

  function alterar(campo: keyof typeof formInicial, valor: string) {
    setForm((atual) => ({ ...atual, [campo]: campo === "cpf" ? mascararCpf(valor) : valor }));
  }

  async function buscarCadastro(identificador: string) {
    const valor = identificador.trim();
    if (!valor || (!emailValido(valor) && !cpfValido(valor))) return;
    try {
      const response = await axios.get("/api/public/treinamentos-dinamicos/participante", {
        params: { identificador: valor },
      });
      const participanteLocalizado = response.data?.participante;
      if (!participanteLocalizado) return;
      setForm((atual) => ({
        ...atual,
        nomeCompleto: participanteLocalizado.nomeCompleto || atual.nomeCompleto,
        cpf: mascararCpf(participanteLocalizado.cpf || atual.cpf),
        email: participanteLocalizado.email || atual.email,
        cargo: participanteLocalizado.cargo || atual.cargo,
        departamento: participanteLocalizado.departamento || atual.departamento,
        unidade: participanteLocalizado.unidade || atual.unidade,
        empresa: participanteLocalizado.empresa || atual.empresa,
      }));
      setMensagem("Cadastro localizado no JetGuard. Confira os dados e continue.");
    } catch {
      return;
    }
  }

  async function iniciar(event: FormEvent) {
    event.preventDefault();
    if (!form.nomeCompleto.trim() || !cpfValido(form.cpf) || !emailValido(form.email) || !form.unidade) {
      setMensagem("Informe nome completo, CPF válido, e-mail válido e unidade.");
      return;
    }
    setCarregando(true);
    setMensagem("");
    try {
      const response = await axios.post(`/api/public/treinamentos-dinamicos/${slug}/iniciar`, form);
      const treinamentoRecebido = response.data.treinamento as Modelo;
      setModelo(treinamentoRecebido);
      const registro = response.data.participante as Participante;
      setParticipante(registro);
      const etapaAssinaturaRecebida = (treinamentoRecebido.etapas?.length || 0) + 2;
      setIndice(Math.max(0, Math.min(etapaAssinaturaRecebida, (registro.etapaAtual || 1) - 1)));
    } catch (error: any) {
      setMensagem(error.response?.data?.error || "Não foi possível iniciar o treinamento.");
    } finally {
      setCarregando(false);
    }
  }

  function rolarTopo() {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function concluirEtapa() {
    if (!participante) return;
    setCarregando(true);
    setMensagem("");
    try {
      const response = await axios.put(`/api/public/treinamentos-dinamicos/${participante.token}/etapa`, {
        etapa: indice + 1,
      });
      setParticipante(response.data.participante);
      setIndice((atual) => Math.min(indiceQuiz, atual + 1));
      rolarTopo();
    } catch (error: any) {
      setMensagem(error.response?.data?.error || "Não foi possível salvar a etapa.");
    } finally {
      setCarregando(false);
    }
  }

  async function validarQuiz() {
    if (!participante || !modelo) return;
    if (Object.keys(respostas).length < perguntas.length) {
      setMensagem("Responda todas as perguntas antes de validar.");
      return;
    }
    setCarregando(true);
    setMensagem("");
    try {
      const response = await axios.post(`/api/public/treinamentos-dinamicos/${participante.token}/quiz`, {
        respostas,
      });
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
          ? "Você atingiu a nota mínima. Avance para assinar e emitir o certificado."
          : "Você não atingiu a nota mínima. Revise as perguntas e tente novamente.",
      );
    } catch (error: any) {
      setMensagem(error.response?.data?.error || "Não foi possível validar a avaliação.");
    } finally {
      setCarregando(false);
    }
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
      const response = await axios.post(`/api/public/treinamentos-dinamicos/${participante.token}/concluir`, {
        assinaturaDataUrl: canvasRef.current.toDataURL("image/png"),
      });
      setParticipante(response.data.participante);
      setMensagem(response.data.mensagem || "Certificado emitido com sucesso.");
    } catch (error: any) {
      setMensagem(error.response?.data?.error || "Não foi possível emitir o certificado.");
    } finally {
      setCarregando(false);
    }
  }

  if (!modelo && !mensagem) {
    return <div className="min-h-screen bg-slate-950 p-8 text-white">Carregando treinamento...</div>;
  }

  return (
    <main className="treinamento-dinamico-publico relative min-h-screen overflow-hidden bg-[#eef0f7] text-slate-950">
      <picture className="fixed inset-0 z-0 block h-full w-full">
        <source media="(min-width: 768px)" srcSet={fundoDesktopUrl} />
        <img src={fundoMobileUrl} alt="" aria-hidden="true" className="h-full w-full object-cover object-center" />
      </picture>
      <div className="fixed inset-0 z-0 bg-white/55" />

      <section className="relative z-10 mx-auto flex min-h-screen w-full max-w-6xl flex-col px-3 py-5 sm:px-6 sm:py-8 lg:px-8">
        <div className="mb-5 flex items-center justify-between gap-4 rounded-2xl border border-blue-200 bg-white/92 px-4 py-3 shadow-xl backdrop-blur sm:mb-8 sm:px-5 sm:py-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-blue-700">
              {modelo?.codigo || "Movecta"}
            </p>
            <h1 className="mt-2 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
              {modelo?.nome || "Treinamento"}
            </h1>
          </div>
          <ShieldCheck className="h-9 w-9 shrink-0 text-blue-600 sm:h-10 sm:w-10" />
        </div>

        {mensagem && (
          <div className="mb-5 rounded-2xl border border-blue-200 bg-white/95 px-4 py-3 text-sm font-black text-blue-950 shadow-lg">
            {mensagem}
          </div>
        )}

        {!participante && modelo && (
          <form onSubmit={iniciar} className="rounded-2xl border border-blue-200 bg-white/96 p-5 text-slate-950 shadow-2xl backdrop-blur sm:p-6 [&_input]:text-slate-950 [&_input]:placeholder:text-slate-500 [&_select]:text-slate-950">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-blue-700">Acesso ao treinamento</p>
            <h2 className="mt-2 text-2xl font-black text-slate-950">Identificação do participante</h2>
            <p className="mt-2 text-sm font-extrabold leading-6 text-slate-800">
              Preencha seus dados para iniciar ou continuar este treinamento.
            </p>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <input value={form.nomeCompleto} onChange={(e) => alterar("nomeCompleto", e.target.value)} required placeholder="Nome completo" className="rounded-2xl border border-blue-300 bg-white px-4 py-3.5 text-sm font-bold text-slate-950 outline-none placeholder:text-slate-500 focus:border-blue-500" />
              <input value={form.cpf} onChange={(e) => alterar("cpf", e.target.value)} onBlur={(e) => buscarCadastro(e.target.value)} required placeholder="CPF" maxLength={14} className="rounded-2xl border border-blue-300 bg-white px-4 py-3.5 text-sm font-bold text-slate-950 outline-none placeholder:text-slate-500 focus:border-blue-500" />
              <input value={form.email} onChange={(e) => alterar("email", e.target.value)} onBlur={(e) => buscarCadastro(e.target.value)} required type="email" placeholder="E-mail" className="rounded-2xl border border-blue-300 bg-white px-4 py-3.5 text-sm font-bold text-slate-950 outline-none placeholder:text-slate-500 focus:border-blue-500" />
              <select value={form.unidade} onChange={(e) => alterar("unidade", e.target.value)} required className="rounded-2xl border border-blue-300 bg-white px-4 py-3.5 text-sm font-bold text-slate-950 outline-none focus:border-blue-500">
                <option value="">Selecione sua unidade</option>
                {unidades.map((unidade) => <option key={unidade}>{unidade}</option>)}
              </select>
              <input value={form.cargo} onChange={(e) => alterar("cargo", e.target.value)} placeholder="Cargo" className="rounded-2xl border border-blue-300 bg-white px-4 py-3.5 text-sm font-bold text-slate-950 outline-none placeholder:text-slate-500 focus:border-blue-500" />
              <input value={form.empresa} onChange={(e) => alterar("empresa", e.target.value)} placeholder="Empresa" className="rounded-2xl border border-blue-300 bg-white px-4 py-3.5 text-sm font-bold text-slate-950 outline-none placeholder:text-slate-500 focus:border-blue-500" />
            </div>
            <button disabled={carregando} className="mt-6 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white shadow-lg hover:bg-blue-700 disabled:opacity-60">
              {carregando ? "Iniciando..." : "Iniciar treinamento"}
            </button>
          </form>
        )}

        {participante && modelo && (
          <div className="space-y-5">
            <div className="grid gap-2 md:grid-cols-4">
              {["Etapas", "Avaliação", "Resultado", "Assinatura"].map((label, pos) => {
                const ativo =
                  (pos === 0 && indice < indiceQuiz) ||
                  (pos === 1 && indice === indiceQuiz) ||
                  (pos === 2 && indice === indiceResultado) ||
                  (pos === 3 && indice >= indiceAssinatura);
                return (
                  <div key={label} className={`rounded-2xl px-4 py-3 text-sm font-black shadow ${ativo ? "bg-blue-600 text-white" : "bg-white/90 text-blue-950"}`}>
                    {label}
                  </div>
                );
              })}
            </div>

            {etapa && indice < indiceQuiz && (
              <section className="rounded-2xl border border-blue-200 bg-white/97 p-5 text-slate-950 shadow-2xl backdrop-blur sm:p-6">
                <p className="text-xs font-black uppercase tracking-[0.22em] text-blue-700">Etapa {indice + 1}</p>
                <h2 className="mt-2 text-3xl font-black text-slate-950">{etapa.titulo}</h2>
                {etapa.objetivo && <p className="mt-4 rounded-2xl bg-blue-50 p-4 text-sm font-black text-blue-950">{etapa.objetivo}</p>}
                <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-4 text-base font-semibold leading-8 text-slate-950 shadow-sm">
                  <p className="whitespace-pre-line text-slate-950">{etapa.conteudo}</p>
                </div>
                {!!etapa.topicos?.length && (
                  <ul className="mt-5 grid gap-2">
                    {etapa.topicos.map((topico) => (
                      <li key={topico} className="rounded-xl border border-blue-200 bg-white px-4 py-3 text-sm font-bold text-slate-950 shadow-sm">
                        {topico}
                      </li>
                    ))}
                  </ul>
                )}
                {etapa.atencao && <p className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-black text-amber-950">{etapa.atencao}</p>}
                <button disabled={carregando} onClick={concluirEtapa} className="mt-6 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white shadow-lg hover:bg-blue-700 disabled:opacity-60">
                  Li e compreendi esta etapa
                </button>
              </section>
            )}

            {indice === indiceQuiz && (
              <section className="rounded-2xl border border-blue-200 bg-white/94 p-5 shadow-2xl backdrop-blur sm:p-6">
                <p className="text-xs font-black uppercase tracking-[0.22em] text-blue-700">Avaliação final</p>
                <h2 className="mt-2 text-3xl font-black text-slate-950">Pergunta {perguntaAtual + 1} de {perguntas.length}</h2>
                {perguntas[perguntaAtual] && (
                  <div className="mt-5">
                    <p className="text-lg font-black text-slate-950">{perguntas[perguntaAtual].pergunta}</p>
                    <div className="mt-4 grid gap-3">
                      {perguntas[perguntaAtual].alternativas.map((alternativa) => (
                        <button
                          key={alternativa.id}
                          type="button"
                          onClick={() =>
                            setRespostas((atual) => ({
                              ...atual,
                              [String(perguntas[perguntaAtual].id)]: alternativa.id,
                            }))
                          }
                          className={`rounded-2xl border px-4 py-4 text-left text-sm font-black shadow-sm ${
                            respostas[String(perguntas[perguntaAtual].id)] === alternativa.id
                              ? "border-blue-600 bg-blue-600 text-white"
                              : "border-blue-200 bg-white text-blue-950 hover:border-blue-500"
                          }`}
                        >
                          {alternativa.texto}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <div className="mt-6 flex flex-wrap gap-3">
                  <button type="button" onClick={() => setPerguntaAtual((atual) => Math.max(0, atual - 1))} className="rounded-xl border border-blue-200 bg-white px-4 py-3 text-sm font-black text-blue-700">
                    Voltar
                  </button>
                  {perguntaAtual < perguntas.length - 1 ? (
                    <button type="button" onClick={() => setPerguntaAtual((atual) => Math.min(perguntas.length - 1, atual + 1))} className="rounded-xl bg-blue-600 px-4 py-3 text-sm font-black text-white">
                      Próxima pergunta
                    </button>
                  ) : (
                    <button type="button" onClick={validarQuiz} disabled={carregando} className="rounded-xl bg-emerald-600 px-4 py-3 text-sm font-black text-white disabled:opacity-60">
                      Validar avaliação
                    </button>
                  )}
                </div>
              </section>
            )}

            {indice === indiceResultado && (
              <section className="rounded-2xl border border-blue-200 bg-white/94 p-5 shadow-2xl backdrop-blur sm:p-6">
                <Award className="h-10 w-10 text-blue-600" />
                <h2 className="mt-3 text-3xl font-black text-slate-950">Resultado da avaliação</h2>
                <p className="mt-4 rounded-2xl bg-blue-50 p-4 text-lg font-black text-blue-950">
                  {resultado?.acertos || 0} acertos · nota {resultado?.nota || participante.nota || 0}% · mínimo {modelo.notaMinima}%
                </p>
                {resultado?.aprovado ? (
                  <button onClick={() => setIndice(indiceAssinatura)} className="mt-6 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-black text-white">
                    Avançar para assinatura
                  </button>
                ) : (
                  <button onClick={() => { setIndice(indiceQuiz); setPerguntaAtual(0); }} className="mt-6 rounded-xl bg-blue-600 px-5 py-3 text-sm font-black text-white">
                    Revisar perguntas
                  </button>
                )}
              </section>
            )}

            {indice >= indiceAssinatura && (
              <section className="rounded-2xl border border-blue-200 bg-white/94 p-5 shadow-2xl backdrop-blur sm:p-6">
                <FileSignature className="h-10 w-10 text-blue-600" />
                <h2 className="mt-3 text-3xl font-black text-slate-950">Declaração e assinatura</h2>
                <p className="mt-4 rounded-2xl border border-blue-200 bg-white p-4 text-sm font-black leading-6 text-slate-950">
                  Declaro que li integralmente o conteúdo, respondi à avaliação e estou ciente das orientações apresentadas neste treinamento.
                </p>
                {!participante.certificadoUrl && (
                  <div className="mt-5 rounded-2xl border border-blue-200 bg-white p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <span className="text-sm font-black text-slate-950">Assinatura</span>
                      <button type="button" onClick={prepararCanvas} className="rounded-xl border border-blue-200 px-3 py-2 text-xs font-black text-blue-700">
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
                    <button disabled={carregando} onClick={concluir} className="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-black text-white disabled:opacity-60">
                      Emitir certificado
                    </button>
                  ) : (
                    <>
                      <div className="inline-flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-black text-emerald-800">
                        <CheckCircle2 size={18} /> Certificado emitido
                      </div>
                      <a href={participante.certificadoUrl} target="_blank" rel="noreferrer" className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-black text-white">
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
