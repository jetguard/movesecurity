import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Award,
  BookOpen,
  CheckCircle2,
  FileCheck2,
  Image,
  Lightbulb,
  Mail,
  Plus,
  Save,
  Search,
  Sparkles,
  Trash2,
  Upload,
  Users,
  Video,
} from "lucide-react";
import { api } from "../services/api";
import { PERFIS, perfilAtual } from "../utils/permissoes";

type AlternativaForm = { texto: string; correta: boolean };
type EtapaForm = {
  titulo: string;
  objetivo: string;
  conteudo: string;
  topicos: string[];
  atencao: string;
};
type PerguntaForm = {
  etapaOrdem: number;
  pergunta: string;
  alternativas: AlternativaForm[];
};
type ModeloForm = {
  id?: number;
  codigo: string;
  slug: string;
  tipo: string;
  nome: string;
  descricao: string;
  subtitulo: string;
  acessoPublico: boolean;
  perguntasHabilitadas: boolean;
  avaliacaoHabilitada: boolean;
  videoUrl: string;
  anexoNome: string;
  anexoUrl: string;
  anexoArquivo: string;
  notaMinima: number;
  validadeMeses: number;
  versao?: number;
  status: string;
  textoCertificado: string;
  gruposPermitidos: string[];
  etapas: EtapaForm[];
  perguntas: PerguntaForm[];
};

type Participante = {
  id: number;
  codigo?: string | null;
  nomeCompleto: string;
  cpf?: string | null;
  email: string;
  unidade?: string | null;
  status: string;
  porcentagem: number;
  nota?: number | null;
  tentativas: number;
  versao?: number;
  certificadoUrl?: string | null;
  updatedAt: string;
};

type Modelo = ModeloForm & {
  id: number;
  publicUrl: string;
  participantes?: Participante[];
};

const modeloInicial: ModeloForm = {
  codigo: "POC-SEP-008",
  slug: "poc-sep-008",
  tipo: "Procedimento operacional",
  nome: "",
  descricao: "",
  subtitulo: "",
  acessoPublico: false,
  perguntasHabilitadas: true,
  avaliacaoHabilitada: true,
  videoUrl: "",
  anexoNome: "",
  anexoUrl: "",
  anexoArquivo: "",
  notaMinima: 80,
  validadeMeses: 24,
  status: "Publicado",
  textoCertificado:
    "Certificamos que {{nome}}, portador(a) do CPF nº {{cpf}}, concluiu com aproveitamento o treinamento {{codigo}} - {{treinamento}} na data de {{data}}.",
  gruposPermitidos: [],
  etapas: [
    {
      titulo: "Introdução",
      objetivo: "Apresentar o conteúdo principal do treinamento.",
      conteudo: "",
      topicos: ["Ponto importante do procedimento"],
      atencao: "Leia esta etapa com atenção antes de avançar.",
    },
  ],
  perguntas: [
    {
      etapaOrdem: 1,
      pergunta: "",
      alternativas: [
        { texto: "", correta: true },
        { texto: "", correta: false },
        { texto: "", correta: false },
        { texto: "", correta: false },
      ],
    },
  ],
};

const gruposTreinamento = [
  { valor: "CCOS", label: "CCOS" },
  { valor: "LIDERANCA", label: "Liderança" },
  { valor: "BALANCA", label: "Balança" },
  { valor: "PORTARIA", label: "Portaria" },
  { valor: "TERCEIRIZADO", label: "Terceirizado" },
];

function normalizarGrupoTreinamento(valor: string) {
  const semAcento = String(valor || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toUpperCase();
  const compacto = semAcento.replace(/[^A-Z0-9]/g, "");
  const mapa: Record<string, string> = {
    CCOS: "CCOS",
    LIDERANCA: "LIDERANCA",
    LIDERANAA: "LIDERANCA",
    BALANCA: "BALANCA",
    BALANAA: "BALANCA",
    PORTARIA: "PORTARIA",
    TERCEIRIZADO: "TERCEIRIZADO",
  };
  return mapa[semAcento] || mapa[compacto] || "";
}

function normalizarGruposTreinamento(valores?: string[]) {
  return Array.from(
    new Set((valores || []).map(normalizarGrupoTreinamento).filter(Boolean)),
  );
}

export default function TreinamentosDinamicos() {
  const [searchParams] = useSearchParams();
  const [modelos, setModelos] = useState<Modelo[]>([]);
  const [selecionadoId, setSelecionadoId] = useState<number | null>(null);
  const [form, setForm] = useState<ModeloForm>(modeloInicial);
  const [busca, setBusca] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [anexando, setAnexando] = useState(false);
  const [videoAnexando, setVideoAnexando] = useState(false);
  const [enviandoId, setEnviandoId] = useState<number | null>(null);
  const [etapaCriacao, setEtapaCriacao] = useState(1);
  const perfil = perfilAtual();
  const podeEditar = perfil === PERFIS.SUPER_ADMIN;
  const podeSalvar = !form.id || podeEditar;
  const podeEnviar = [PERFIS.SUPER_ADMIN, PERFIS.ADMINISTRADOR].includes(
    perfil,
  );

  async function carregar() {
    const response = await api.get("/treinamentos-dinamicos");
    setModelos(Array.isArray(response.data) ? response.data : []);
  }

  useEffect(() => {
    carregar().catch(() => undefined);
  }, []);

  useEffect(() => {
    const id = Number(searchParams.get("editar") || 0);
    if (!id || !modelos.length) return;
    const modelo = modelos.find((item) => item.id === id);
    if (modelo) editar(modelo);
  }, [modelos, searchParams]);

  function editar(modelo: Modelo) {
    setSelecionadoId(modelo.id);
    setForm(modeloParaFormulario(modelo));
    setEtapaCriacao(1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function modeloParaFormulario(modelo: Modelo): ModeloForm {
    return {
      id: modelo.id,
      codigo: modelo.codigo,
      slug: modelo.slug,
      tipo: modelo.tipo,
      nome: modelo.nome,
      descricao: modelo.descricao || "",
      subtitulo: modelo.subtitulo || "",
      acessoPublico: Boolean(modelo.acessoPublico),
      perguntasHabilitadas: modelo.perguntasHabilitadas !== false,
      avaliacaoHabilitada: modelo.avaliacaoHabilitada !== false,
      videoUrl: modelo.videoUrl || "",
      anexoNome: modelo.anexoNome || "",
      anexoUrl: modelo.anexoUrl || "",
      anexoArquivo: modelo.anexoArquivo || "",
      notaMinima: modelo.notaMinima || 80,
      validadeMeses: modelo.validadeMeses || 24,
      status: modelo.status || "Publicado",
      textoCertificado:
        modelo.textoCertificado || modeloInicial.textoCertificado,
      gruposPermitidos: normalizarGruposTreinamento(modelo.gruposPermitidos),
      etapas: modelo.etapas?.length ? modelo.etapas : modeloInicial.etapas,
      perguntas: modelo.perguntas?.length
        ? modelo.perguntas
        : modeloInicial.perguntas,
    };
  }

  function novo() {
    setSelecionadoId(null);
    setForm(modeloInicial);
    setEtapaCriacao(1);
    setMensagem("");
  }

  function alternarGrupo(grupo: string) {
    if (form.acessoPublico) return;
    const grupoNormalizado = normalizarGrupoTreinamento(grupo);
    if (!grupoNormalizado) return;
    setForm((atual) => ({
      ...atual,
      gruposPermitidos: atual.gruposPermitidos.includes(grupoNormalizado)
        ? atual.gruposPermitidos.filter((item) => item !== grupoNormalizado)
        : [...atual.gruposPermitidos, grupoNormalizado],
    }));
  }

  function atualizarEtapa(
    index: number,
    campo: keyof EtapaForm,
    valor: string | string[],
  ) {
    setForm((atual) => ({
      ...atual,
      etapas: atual.etapas.map((etapa, pos) =>
        pos === index ? { ...etapa, [campo]: valor } : etapa,
      ),
    }));
  }

  function atualizarPergunta(
    index: number,
    campo: keyof PerguntaForm,
    valor: string | number,
  ) {
    setForm((atual) => ({
      ...atual,
      perguntas: atual.perguntas.map((pergunta, pos) =>
        pos === index ? { ...pergunta, [campo]: valor } : pergunta,
      ),
    }));
  }

  function atualizarAlternativa(
    perguntaIndex: number,
    alternativaIndex: number,
    valor: string,
  ) {
    setForm((atual) => ({
      ...atual,
      perguntas: atual.perguntas.map((pergunta, pos) =>
        pos === perguntaIndex
          ? {
              ...pergunta,
              alternativas: pergunta.alternativas.map((alternativa, altPos) =>
                altPos === alternativaIndex
                  ? { ...alternativa, texto: valor }
                  : alternativa,
              ),
            }
          : pergunta,
      ),
    }));
  }

  function marcarCorreta(perguntaIndex: number, alternativaIndex: number) {
    setForm((atual) => ({
      ...atual,
      perguntas: atual.perguntas.map((pergunta, pos) =>
        pos === perguntaIndex
          ? {
              ...pergunta,
              alternativas: pergunta.alternativas.map(
                (alternativa, altPos) => ({
                  ...alternativa,
                  correta: altPos === alternativaIndex,
                }),
              ),
            }
          : pergunta,
      ),
    }));
  }

  async function salvar(event?: FormEvent, statusForcado?: string) {
    event?.preventDefault();
    if (!podeSalvar) return;
    setSalvando(true);
    setMensagem("");
    try {
      const url = form.id
        ? `/treinamentos-dinamicos/${form.id}`
        : "/treinamentos-dinamicos";
      const method = form.id ? api.put : api.post;
      const payload = statusForcado ? { ...form, status: statusForcado } : form;
      const response = await method(url, payload);
      await carregar();
      setForm(modeloParaFormulario(response.data as Modelo));
      setSelecionadoId(response.data.id);
      setMensagem(
        response.data.status === "Rascunho"
          ? "Rascunho salvo com sucesso. Você pode completar e publicar depois."
          : "Treinamento salvo com sucesso. Use o botão Enviar treinamento para disparar o link aos grupos selecionados.",
      );
    } catch (error: any) {
      setMensagem(
        error.response?.data?.error || "Não foi possível salvar o treinamento.",
      );
    } finally {
      setSalvando(false);
    }
  }

  async function enviarTreinamento(modelo?: Pick<Modelo, "id">) {
    const id = modelo?.id || form.id;
    if (!id || !podeEnviar) return;
    setEnviandoId(id);
    setMensagem("");
    try {
      const response = await api.post(`/treinamentos-dinamicos/${id}/enviar`, {
        gruposPermitidos: modelo ? undefined : form.gruposPermitidos,
      });
      setMensagem(
        response.data?.mensagem || "Treinamento enviado com sucesso.",
      );
      await carregar();
    } catch (error: any) {
      setMensagem(
        error.response?.data?.error || "Não foi possível enviar o treinamento.",
      );
    } finally {
      setEnviandoId(null);
    }
  }

  async function anexarArquivo(arquivo?: File | null) {
    if (!arquivo) return;
    setAnexando(true);
    setMensagem("");
    try {
      const dados = new FormData();
      dados.append("anexo", arquivo);
      const response = await api.post("/treinamentos-dinamicos/anexo", dados);
      setForm((atual) => ({
        ...atual,
        anexoNome: response.data?.anexoNome || arquivo.name,
        anexoUrl: response.data?.anexoUrl || atual.anexoUrl,
        anexoArquivo: response.data?.anexoArquivo || atual.anexoArquivo,
      }));
      setMensagem(
        "Arquivo anexado. Salve o treinamento para vincular o anexo.",
      );
    } catch (error: any) {
      setMensagem(
        error.response?.data?.error || "Não foi possível anexar o arquivo.",
      );
    } finally {
      setAnexando(false);
    }
  }

  async function anexarVideo(arquivo?: File | null) {
    if (!arquivo) return;
    setVideoAnexando(true);
    setMensagem("");
    try {
      const dados = new FormData();
      dados.append("video", arquivo);
      const response = await api.post("/treinamentos-dinamicos/video", dados);
      setForm((atual) => ({
        ...atual,
        videoUrl: response.data?.videoUrl || atual.videoUrl,
      }));
      setMensagem("Vídeo anexado. Salve o treinamento para vincular o MP4.");
    } catch (error: any) {
      setMensagem(
        error.response?.data?.error || "Não foi possível anexar o vídeo.",
      );
    } finally {
      setVideoAnexando(false);
    }
  }

  const passosCriacao = useMemo(() => [
    {
      numero: 1,
      titulo: "Informações",
      descricao: "Dados gerais",
      icone: FileCheck2,
    },
    { numero: 2, titulo: "Conteúdo", descricao: "Etapas de leitura", icone: BookOpen },
    {
      numero: 3,
      titulo: "Avaliação",
      descricao: "Questões e regras",
      icone: CheckCircle2,
    },
    {
      numero: 4,
      titulo: "Certificação",
      descricao: "Conclusão e validade",
      icone: Award,
    },
    { numero: 5, titulo: "Revisão", descricao: "Confira e publique", icone: Search },
  ], []);
  const campoClaro =
    "mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-semibold normal-case tracking-normal text-slate-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:bg-slate-100";
  const labelClaro =
    "text-xs font-black uppercase tracking-[0.08em] text-slate-600";
  const cardClaro =
    "rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/60";
  const podeVoltar = etapaCriacao > 1;
  const podeProsseguir = etapaCriacao < 5;

  return (
    <div
      className="treinamentos-dinamicos-admin min-h-screen px-4 py-5 text-white sm:px-6 lg:px-8"
      data-treinamento-id={selecionadoId || undefined}
    >
      <section className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="relative w-full max-w-xl">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={busca}
            onChange={(event) => setBusca(event.target.value)}
            placeholder="Buscar no sistema..."
            className="h-11 w-full rounded-lg border border-slate-200 bg-white pl-11 pr-4 text-sm font-semibold text-slate-700 shadow-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
          />
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => salvar(undefined, "Rascunho")}
            disabled={!podeSalvar || salvando}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-black text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50"
          >
            <Save size={16} /> {salvando ? "Salvando..." : "Salvar rascunho"}
          </button>
          <button
            type="button"
            onClick={novo}
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 shadow-sm hover:text-blue-600"
            title="Novo treinamento"
          >
            <Plus size={18} />
          </button>
        </div>
      </section>

      <section className="mb-6">
        <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-slate-400">
          <span className="text-blue-300">Treinamentos</span>
          <span>&gt;</span>
          <span>{form.id ? "Editar treinamento" : "Novo treinamento"}</span>
        </div>
        <h1 className="mt-2 text-3xl font-black text-white">
          {form.id ? "Editar treinamento" : "Criar novo treinamento"}
        </h1>
        <p className="mt-1 text-base font-semibold text-slate-300">
          Configure o conteúdo, avaliação e regras de conclusão.
        </p>
      </section>

      <section className="mb-6 overflow-x-auto">
        <div className="grid min-w-[760px] grid-cols-5 gap-3">
          {passosCriacao.map((passo, index) => {
            const ativo = etapaCriacao === passo.numero;
            const concluidoPasso = etapaCriacao > passo.numero;
            return (
              <button
                key={passo.numero}
                type="button"
                onClick={() => setEtapaCriacao(passo.numero)}
                className="group flex items-center gap-3 text-left"
              >
                <span
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full border text-sm font-black transition ${
                    ativo
                      ? "border-blue-600 bg-blue-600 text-white shadow-lg shadow-blue-500/30"
                      : concluidoPasso
                        ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                        : "border-slate-200 bg-white text-slate-600"
                  }`}
                >
                  {passo.numero}
                </span>
                <span className="min-w-0">
                  <span
                    className={`block text-sm font-black ${
                      ativo ? "text-blue-700" : "text-slate-700"
                    }`}
                  >
                    {passo.titulo}
                  </span>
                  <span className="block text-xs font-semibold text-slate-500">
                    {passo.descricao}
                  </span>
                </span>
                {index < passosCriacao.length - 1 && (
                  <span className="h-px flex-1 bg-slate-200" />
                )}
              </button>
            );
          })}
        </div>
      </section>

      {mensagem && (
        <div className="mb-5 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-black text-blue-900">
          {mensagem}
        </div>
      )}

      <section>
        <form
          onSubmit={(event) => {
            if (podeProsseguir) {
              event.preventDefault();
              setEtapaCriacao((atual) => Math.min(5, atual + 1));
              window.scrollTo({ top: 0, behavior: "smooth" });
              return;
            }
            salvar(event, "Publicado");
          }}
          className="space-y-5"
        >
          {etapaCriacao === 1 && (
            <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_330px]">
              <div className={cardClaro}>
                <div className="mb-5 flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                    <FileCheck2 size={20} />
                  </span>
                  <h2 className="text-xl font-black text-slate-900">
                    Informações do treinamento
                  </h2>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <label className={`${labelClaro} md:col-span-2`}>
                    Título do treinamento *
                    <input
                      value={form.nome}
                      onChange={(event) =>
                        setForm({ ...form, nome: event.target.value })
                      }
                      placeholder="Ex.: Uso indevido de equipamentos corporativos"
                      className={campoClaro}
                    />
                  </label>
                  <label className={labelClaro}>
                    Código / POC
                    <input
                      value={form.codigo}
                      onChange={(event) =>
                        setForm({
                          ...form,
                          codigo: event.target.value.toUpperCase(),
                          slug: event.target.value
                            .toLowerCase()
                            .replace(/[^a-z0-9]+/g, "-")
                            .replace(/^-+|-+$/g, ""),
                        })
                      }
                      className={campoClaro}
                    />
                  </label>
                  <label className={labelClaro}>
                    Categoria *
                    <select
                      value={form.tipo}
                      onChange={(event) =>
                        setForm({ ...form, tipo: event.target.value })
                      }
                      className={campoClaro}
                    >
                      <option>Operacional</option>
                      <option>Procedimento operacional</option>
                      <option>CCOS</option>
                      <option>Segurança patrimonial</option>
                      <option>Integração</option>
                    </select>
                  </label>
                  <label className={labelClaro}>
                    Público-alvo *
                    <select
                      value={form.acessoPublico ? "PUBLICO" : "GRUPOS"}
                      onChange={(event) =>
                        setForm({
                          ...form,
                          acessoPublico: event.target.value === "PUBLICO",
                          gruposPermitidos:
                            event.target.value === "PUBLICO"
                              ? []
                              : form.gruposPermitidos,
                        })
                      }
                      className={campoClaro}
                    >
                      <option value="GRUPOS">Grupos selecionados</option>
                      <option value="PUBLICO">Treinamento público</option>
                    </select>
                  </label>
                  <label className={labelClaro}>
                    Link público
                    <input
                      value={form.slug}
                      onChange={(event) =>
                        setForm({ ...form, slug: event.target.value })
                      }
                      className={campoClaro}
                    />
                  </label>
                  <label className={`${labelClaro} md:col-span-2`}>
                    Descrição *
                    <textarea
                      value={form.descricao}
                      onChange={(event) =>
                        setForm({ ...form, descricao: event.target.value })
                      }
                      placeholder="Descreva o objetivo do treinamento, público e principais cuidados."
                      rows={4}
                      maxLength={500}
                      className={campoClaro}
                    />
                    <span className="mt-1 block text-right text-[11px] font-bold normal-case tracking-normal text-slate-400">
                      {form.descricao.length}/500
                    </span>
                  </label>
                  <label className={labelClaro}>
                    Carga horária estimada
                    <select className={campoClaro} defaultValue="30 minutos">
                      <option>15 minutos</option>
                      <option>30 minutos</option>
                      <option>45 minutos</option>
                      <option>60 minutos</option>
                    </select>
                  </label>
                  <label className={labelClaro}>
                    Idioma
                    <select className={campoClaro} defaultValue="Português (Brasil)">
                      <option>Português (Brasil)</option>
                    </select>
                  </label>
                  <label className={labelClaro}>
                    Validade
                    <select
                      value={form.validadeMeses}
                      onChange={(event) =>
                        setForm({
                          ...form,
                          validadeMeses: Number(event.target.value),
                        })
                      }
                      className={campoClaro}
                    >
                      <option value={6}>6 meses</option>
                      <option value={12}>12 meses</option>
                      <option value={24}>24 meses</option>
                      <option value={36}>36 meses</option>
                    </select>
                  </label>
                  <label className={labelClaro}>
                    Status
                    <select
                      value={form.status}
                      onChange={(event) =>
                        setForm({ ...form, status: event.target.value })
                      }
                      className={campoClaro}
                    >
                      <option>Publicado</option>
                      <option>Rascunho</option>
                    </select>
                  </label>
                </div>
              </div>

              <aside className="space-y-4">
                <div className={cardClaro}>
                  <p className="text-sm font-black text-slate-900">
                    Imagem de capa
                  </p>
                  <div className="mt-3 flex aspect-video items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 text-center">
                    <div>
                      <Image className="mx-auto h-8 w-8 text-slate-400" />
                      <p className="mt-2 text-xs font-bold text-slate-500">
                        Clique para adicionar uma imagem de capa
                      </p>
                      <p className="mt-1 text-[11px] font-semibold text-slate-400">
                        JPG, PNG recomendado 1280 x 720
                      </p>
                    </div>
                  </div>
                </div>
                <div className="rounded-2xl border border-blue-100 bg-blue-50 p-5">
                  <div className="flex items-center gap-2 text-sm font-black text-blue-900">
                    <Lightbulb size={18} className="text-amber-500" />
                    Dicas para um bom treinamento
                  </div>
                  <ul className="mt-3 space-y-2 text-xs font-semibold text-slate-700">
                    <li>Utilize um título claro e objetivo.</li>
                    <li>Organize o conteúdo em etapas curtas.</li>
                    <li>Mantenha a carga horária realista.</li>
                    <li>Use avaliação para reforçar o aprendizado.</li>
                  </ul>
                </div>
                <div className="rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-600 to-blue-500 p-5 text-white shadow-lg shadow-blue-500/20">
                  <div className="flex items-start gap-3">
                    <Sparkles size={20} />
                    <div>
                      <p className="font-black">Dica MoveSecurity</p>
                      <p className="mt-1 text-xs font-semibold text-blue-50">
                        Você também pode salvar como rascunho e completar o
                        conteúdo depois.
                      </p>
                    </div>
                  </div>
                </div>
              </aside>
            </div>
          )}

          {etapaCriacao === 2 && (
            <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_330px]">
              <div className={`${cardClaro} space-y-4`}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.12em] text-blue-600">
                      Conteúdo
                    </p>
                    <h2 className="text-xl font-black text-slate-900">
                      Etapas de leitura
                    </h2>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setForm({
                        ...form,
                        etapas: [
                          ...form.etapas,
                          {
                            titulo: "",
                            objetivo: "",
                            conteudo: "",
                            topicos: [],
                            atencao: "",
                          },
                        ],
                      })
                    }
                    className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-black text-white hover:bg-blue-700"
                  >
                    <Plus size={16} /> Adicionar etapa
                  </button>
                </div>
                {form.etapas.map((etapa, index) => (
                  <div
                    key={index}
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                  >
                    <div className="mb-3 flex items-center justify-between">
                      <p className="font-black text-slate-900">
                        Etapa {index + 1} de {form.etapas.length}
                      </p>
                      {form.etapas.length > 1 && (
                        <button
                          type="button"
                          onClick={() =>
                            setForm({
                              ...form,
                              etapas: form.etapas.filter(
                                (_, pos) => pos !== index,
                              ),
                            })
                          }
                          className="rounded-lg border border-red-100 bg-white p-2 text-red-500 hover:bg-red-50"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                      <input
                        value={etapa.titulo}
                        onChange={(event) =>
                          atualizarEtapa(index, "titulo", event.target.value)
                        }
                        placeholder="Assunto da etapa"
                        className={campoClaro}
                      />
                      <input
                        value={etapa.objetivo}
                        onChange={(event) =>
                          atualizarEtapa(index, "objetivo", event.target.value)
                        }
                        placeholder="Objetivo da etapa"
                        className={campoClaro}
                      />
                      <textarea
                        value={etapa.conteudo}
                        onChange={(event) =>
                          atualizarEtapa(index, "conteudo", event.target.value)
                        }
                        placeholder="Conteúdo resumido em linguagem simples"
                        rows={5}
                        className={`${campoClaro} md:col-span-2`}
                      />
                      <input
                        value={etapa.topicos.join("; ")}
                        onChange={(event) =>
                          atualizarEtapa(
                            index,
                            "topicos",
                            event.target.value
                              .split(";")
                              .map((item) => item.trim())
                              .filter(Boolean),
                          )
                        }
                        placeholder="Pontos importantes separados por ;"
                        className={campoClaro}
                      />
                      <input
                        value={etapa.atencao}
                        onChange={(event) =>
                          atualizarEtapa(index, "atencao", event.target.value)
                        }
                        placeholder="Mensagem de atenção"
                        className={campoClaro}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <aside className="space-y-4">
                <div className={cardClaro}>
                  <div className="flex items-center gap-2 text-sm font-black text-slate-900">
                    <Video size={18} className="text-blue-600" />
                    Vídeo do treinamento
                  </div>
                  <label className="mt-3 block cursor-pointer rounded-xl border border-dashed border-blue-200 bg-blue-50 p-4">
                    <p className="text-sm font-black text-blue-900">
                      {form.videoUrl?.startsWith("uploads/")
                        ? "Vídeo MP4 anexado"
                        : "Anexar vídeo MP4"}
                    </p>
                    <p className="mt-1 text-xs font-semibold text-blue-700">
                      MP4, WebM ou OGG salvo no servidor.
                    </p>
                    <input
                      type="file"
                      disabled={videoAnexando}
                      accept="video/mp4,video/webm,video/ogg,.mp4,.webm,.ogg"
                      onChange={(event) => {
                        anexarVideo(event.target.files?.[0]);
                        event.target.value = "";
                      }}
                      className="sr-only"
                    />
                  </label>
                  {form.videoUrl && (
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, videoUrl: "" })}
                      className="mt-3 inline-flex items-center gap-2 rounded-lg border border-red-100 px-3 py-2 text-xs font-black text-red-600 hover:bg-red-50"
                    >
                      <Trash2 size={14} /> Remover vídeo
                    </button>
                  )}
                </div>
                <div className={cardClaro}>
                  <div className="flex items-center gap-2 text-sm font-black text-slate-900">
                    <Upload size={18} className="text-blue-600" />
                    Arquivo de apoio
                  </div>
                  <label className="mt-3 block cursor-pointer rounded-xl border border-dashed border-blue-200 bg-blue-50 p-4">
                    <p className="text-sm font-black text-blue-900">
                      {form.anexoNome || "Anexar PDF ou arquivo"}
                    </p>
                    <p className="mt-1 text-xs font-semibold text-blue-700">
                      O anexo aparece como botão na primeira etapa.
                    </p>
                    <input
                      type="file"
                      disabled={anexando}
                      accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.jpg,.jpeg,.png,.webp"
                      onChange={(event) => {
                        anexarArquivo(event.target.files?.[0]);
                        event.target.value = "";
                      }}
                      className="sr-only"
                    />
                  </label>
                  <input
                    value={form.anexoNome}
                    onChange={(event) =>
                      setForm({ ...form, anexoNome: event.target.value })
                    }
                    placeholder="Nome do anexo"
                    className={campoClaro}
                  />
                  {(form.anexoUrl || form.anexoArquivo || form.anexoNome) && (
                    <button
                      type="button"
                      onClick={() =>
                        setForm({
                          ...form,
                          anexoNome: "",
                          anexoUrl: "",
                          anexoArquivo: "",
                        })
                      }
                      className="mt-3 inline-flex items-center gap-2 rounded-lg border border-red-100 px-3 py-2 text-xs font-black text-red-600 hover:bg-red-50"
                    >
                      <Trash2 size={14} /> Remover anexo
                    </button>
                  )}
                </div>
              </aside>
            </div>
          )}

          {etapaCriacao === 3 && (
            <div className={`${cardClaro} space-y-5`}>
              <div className="grid gap-3 lg:grid-cols-2">
                <label className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-black text-slate-800">
                  <input
                    type="checkbox"
                    checked={form.perguntasHabilitadas}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        perguntasHabilitadas: event.target.checked,
                      })
                    }
                    className="mt-1 h-5 w-5 accent-blue-600"
                  />
                  <span>
                    Habilitar perguntas
                    <small className="mt-1 block text-xs font-semibold text-slate-500">
                      Cria a etapa de avaliação objetiva.
                    </small>
                  </span>
                </label>
                <label className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-black text-slate-800">
                  <input
                    type="checkbox"
                    checked={form.avaliacaoHabilitada}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        avaliacaoHabilitada: event.target.checked,
                      })
                    }
                    className="mt-1 h-5 w-5 accent-emerald-600"
                  />
                  <span>
                    Coletar opinião do usuário
                    <small className="mt-1 block text-xs font-semibold text-slate-500">
                      Quando desligado, vai direto para assinatura.
                    </small>
                  </span>
                </label>
              </div>

              {form.perguntasHabilitadas ? (
                <>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h2 className="text-xl font-black text-slate-900">
                      Perguntas
                    </h2>
                    <button
                      type="button"
                      onClick={() =>
                        setForm({
                          ...form,
                          perguntas: [
                            ...form.perguntas,
                            {
                              etapaOrdem: 1,
                              pergunta: "",
                              alternativas: [
                                { texto: "", correta: true },
                                { texto: "", correta: false },
                                { texto: "", correta: false },
                                { texto: "", correta: false },
                              ],
                            },
                          ],
                        })
                      }
                      className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-black text-white hover:bg-blue-700"
                    >
                      <Plus size={16} /> Adicionar pergunta
                    </button>
                  </div>
                  {form.perguntas.map((pergunta, index) => (
                    <div
                      key={index}
                      className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                    >
                      <div className="mb-3 flex items-center justify-between">
                        <p className="font-black text-slate-900">
                          Pergunta {index + 1}
                        </p>
                        {form.perguntas.length > 1 && (
                          <button
                            type="button"
                            onClick={() =>
                              setForm({
                                ...form,
                                perguntas: form.perguntas.filter(
                                  (_, pos) => pos !== index,
                                ),
                              })
                            }
                            className="rounded-lg border border-red-100 bg-white p-2 text-red-500 hover:bg-red-50"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                      <div className="grid gap-3">
                        <select
                          value={pergunta.etapaOrdem}
                          onChange={(event) =>
                            atualizarPergunta(
                              index,
                              "etapaOrdem",
                              Number(event.target.value),
                            )
                          }
                          className={campoClaro}
                        >
                          {form.etapas.map((etapa, etapaIndex) => (
                            <option key={etapaIndex} value={etapaIndex + 1}>
                              Etapa {etapaIndex + 1} -{" "}
                              {etapa.titulo || "Sem título"}
                            </option>
                          ))}
                        </select>
                        <input
                          value={pergunta.pergunta}
                          onChange={(event) =>
                            atualizarPergunta(
                              index,
                              "pergunta",
                              event.target.value,
                            )
                          }
                          placeholder="Texto da pergunta"
                          className={campoClaro}
                        />
                        <div className="grid gap-2 md:grid-cols-2">
                          {pergunta.alternativas.map(
                            (alternativa, altIndex) => (
                              <label
                                key={altIndex}
                                className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-2"
                              >
                                <input
                                  type="radio"
                                  checked={alternativa.correta}
                                  onChange={() =>
                                    marcarCorreta(index, altIndex)
                                  }
                                  className="accent-blue-600"
                                />
                                <input
                                  value={alternativa.texto}
                                  onChange={(event) =>
                                    atualizarAlternativa(
                                      index,
                                      altIndex,
                                      event.target.value,
                                    )
                                  }
                                  placeholder={`Alternativa ${altIndex + 1}`}
                                  className="min-w-0 flex-1 bg-transparent text-sm font-bold text-slate-950 outline-none"
                                />
                              </label>
                            ),
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </>
              ) : (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                  <p className="text-sm font-black text-slate-900">
                    Perguntas desabilitadas
                  </p>
                  <p className="mt-1 text-sm font-semibold text-slate-500">
                    O participante fará as etapas de conteúdo e seguirá para as
                    próximas etapas configuradas.
                  </p>
                </div>
              )}
            </div>
          )}

          {etapaCriacao === 4 && (
            <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_330px]">
              <div className={cardClaro}>
                <div className="mb-5 flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                    <Award size={20} />
                  </span>
                  <h2 className="text-xl font-black text-slate-900">
                    Certificação
                  </h2>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <label className={labelClaro}>
                    Nota mínima
                    <input
                      type="number"
                      value={form.notaMinima}
                      onChange={(event) =>
                        setForm({
                          ...form,
                          notaMinima: Number(event.target.value),
                        })
                      }
                      className={campoClaro}
                    />
                  </label>
                  <label className={labelClaro}>
                    Validade do certificado
                    <input
                      type="number"
                      value={form.validadeMeses}
                      onChange={(event) =>
                        setForm({
                          ...form,
                          validadeMeses: Number(event.target.value),
                        })
                      }
                      className={campoClaro}
                    />
                  </label>
                  <label className={`${labelClaro} md:col-span-2`}>
                    Texto do certificado
                    <textarea
                      value={form.textoCertificado}
                      onChange={(event) =>
                        setForm({
                          ...form,
                          textoCertificado: event.target.value,
                        })
                      }
                      rows={5}
                      className={campoClaro}
                    />
                    <span className="mt-1 block text-[11px] font-bold normal-case tracking-normal text-slate-500">
                      Variáveis: {"{{nome}}"}, {"{{cpf}}"}, {"{{data}}"},{" "}
                      {"{{codigo}}"}, {"{{treinamento}}"}.
                    </span>
                  </label>
                </div>
              </div>
              <aside className={cardClaro}>
                <p className="text-sm font-black text-slate-900">
                  Regras de conclusão
                </p>
                <div className="mt-4 space-y-3">
                  <div className="rounded-xl bg-slate-50 p-4">
                    <p className="text-xs font-black uppercase text-slate-500">
                      Conteúdo
                    </p>
                    <p className="mt-1 text-2xl font-black text-slate-900">
                      {form.etapas.length} etapa(s)
                    </p>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-4">
                    <p className="text-xs font-black uppercase text-slate-500">
                      Avaliação objetiva
                    </p>
                    <p className="mt-1 text-2xl font-black text-slate-900">
                      {form.perguntasHabilitadas
                        ? `${form.perguntas.length} pergunta(s)`
                        : "Desativada"}
                    </p>
                  </div>
                </div>
              </aside>
            </div>
          )}

          {etapaCriacao === 5 && (
            <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_330px]">
              <div className={`${cardClaro} space-y-4`}>
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.12em] text-blue-600">
                    Revisão
                  </p>
                  <h2 className="text-xl font-black text-slate-900">
                    Confira antes de publicar
                  </h2>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  {[
                    ["Código", form.codigo || "-"],
                    ["Treinamento", form.nome || "-"],
                    ["Categoria", form.tipo || "-"],
                    [
                      "Acesso",
                      form.acessoPublico
                        ? "Público"
                        : form.gruposPermitidos.length
                          ? form.gruposPermitidos.join(", ")
                          : "Sem grupo selecionado",
                    ],
                    ["Etapas", String(form.etapas.length)],
                    [
                      "Perguntas",
                      form.perguntasHabilitadas
                        ? String(form.perguntas.length)
                        : "Desativadas",
                    ],
                    [
                      "Opinião",
                      form.avaliacaoHabilitada ? "Obrigatória" : "Opcional",
                    ],
                    ["Validade", `${form.validadeMeses} meses`],
                  ].map(([titulo, valor]) => (
                    <div
                      key={titulo}
                      className="rounded-xl border border-slate-200 bg-slate-50 p-4"
                    >
                      <p className="text-xs font-black uppercase text-slate-500">
                        {titulo}
                      </p>
                      <p className="mt-1 text-sm font-black text-slate-900">
                        {valor}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
              <aside className={`${cardClaro} space-y-3`}>
                <p className="text-sm font-black text-slate-900">
                  Publicação
                </p>
                <p className="text-sm font-semibold text-slate-500">
                  Salve como rascunho para continuar depois ou publique para
                  liberar o envio conforme as regras de acesso.
                </p>
                {form.id && (
                  <button
                    type="button"
                    onClick={() => enviarTreinamento()}
                    disabled={!podeEnviar || enviandoId === form.id}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-black text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    <Mail size={18} />{" "}
                    {enviandoId === form.id
                      ? "Enviando..."
                      : "Enviar treinamento"}
                  </button>
                )}
              </aside>
            </div>
          )}

          {etapaCriacao === 1 && (
            <div className={cardClaro}>
              <div className="flex items-center gap-2 text-sm font-black text-slate-900">
                <Users size={18} className="text-blue-600" />
                Grupos liberados
              </div>
              <p className="mt-1 text-sm font-semibold text-slate-500">
                Selecione os grupos que poderão acessar este treinamento. Se for
                público, os grupos ficam bloqueados.
              </p>
              <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
                {gruposTreinamento.map((grupo) => (
                  <label
                    key={grupo.valor}
                    className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-black ${
                      form.acessoPublico
                        ? "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400"
                        : form.gruposPermitidos.includes(grupo.valor)
                          ? "border-blue-500 bg-blue-600 text-white"
                          : "border-slate-200 bg-white text-slate-700"
                    }`}
                  >
                    <input
                      type="checkbox"
                      disabled={form.acessoPublico}
                      checked={form.gruposPermitidos.includes(grupo.valor)}
                      onChange={() => alternarGrupo(grupo.valor)}
                    />
                    {grupo.label}
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <button
              type="button"
              onClick={novo}
              className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-600 shadow-sm hover:bg-slate-50"
            >
              Cancelar
            </button>
            <div className="flex flex-wrap gap-3">
              {podeVoltar && (
                <button
                  type="button"
                  onClick={() =>
                    setEtapaCriacao((atual) => Math.max(1, atual - 1))
                  }
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 shadow-sm hover:bg-slate-50"
                >
                  <ArrowLeft size={17} /> Voltar
                </button>
              )}
              <button
                type="submit"
                disabled={!podeSalvar || salvando}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-black text-white shadow-lg shadow-blue-500/20 hover:bg-blue-700 disabled:opacity-50"
              >
                {salvando
                  ? "Salvando..."
                  : podeProsseguir
                    ? "Próxima etapa"
                    : "Publicar treinamento"}
                {podeProsseguir ? <ArrowRight size={17} /> : <Save size={17} />}
              </button>
            </div>
          </div>
        </form>

      </section>
    </div>
  );
}
