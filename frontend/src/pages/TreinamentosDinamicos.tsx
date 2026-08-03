import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import {
  CheckCircle2,
  Copy,
  ExternalLink,
  FileCheck2,
  Mail,
  Plus,
  Save,
  Search,
  Trash2,
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
  notaMinima: number;
  validadeMeses: number;
  status: string;
  textoCertificado: string;
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
  notaMinima: 80,
  validadeMeses: 24,
  status: "Publicado",
  textoCertificado:
    "Certificamos que {{nome}}, portador(a) do CPF nº {{cpf}}, concluiu com aproveitamento o treinamento {{codigo}} - {{treinamento}} na data de {{data}}.",
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

function data(valor?: string | null) {
  return valor ? new Date(valor).toLocaleString("pt-BR") : "-";
}

function concluido(status?: string | null) {
  return String(status || "").toLowerCase().startsWith("conclu");
}

function copiarLink(link: string) {
  const absoluto = `${window.location.origin}${link}`;
  navigator.clipboard?.writeText(absoluto).catch(() => undefined);
}

export default function TreinamentosDinamicos() {
  const [modelos, setModelos] = useState<Modelo[]>([]);
  const [selecionadoId, setSelecionadoId] = useState<number | null>(null);
  const [form, setForm] = useState<ModeloForm>(modeloInicial);
  const [busca, setBusca] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [salvando, setSalvando] = useState(false);
  const podeEditar = [PERFIS.SUPER_ADMIN, PERFIS.ADMINISTRADOR].includes(
    perfilAtual(),
  );

  async function carregar() {
    const response = await api.get("/treinamentos-dinamicos");
    setModelos(Array.isArray(response.data) ? response.data : []);
  }

  useEffect(() => {
    carregar().catch(() => undefined);
  }, []);

  const modeloSelecionado = useMemo(
    () => modelos.find((item) => item.id === selecionadoId) || null,
    [modelos, selecionadoId],
  );

  const participantes = modeloSelecionado?.participantes || [];
  const filtrados = participantes.filter((item) =>
    [item.nomeCompleto, item.cpf, item.email, item.codigo, item.status]
      .join(" ")
      .toLowerCase()
      .includes(busca.trim().toLowerCase()),
  );

  function editar(modelo: Modelo) {
    setSelecionadoId(modelo.id);
    setForm({
      id: modelo.id,
      codigo: modelo.codigo,
      slug: modelo.slug,
      tipo: modelo.tipo,
      nome: modelo.nome,
      descricao: modelo.descricao || "",
      subtitulo: modelo.subtitulo || "",
      notaMinima: modelo.notaMinima || 80,
      validadeMeses: modelo.validadeMeses || 24,
      status: modelo.status || "Publicado",
      textoCertificado: modelo.textoCertificado || modeloInicial.textoCertificado,
      etapas: modelo.etapas?.length ? modelo.etapas : modeloInicial.etapas,
      perguntas: modelo.perguntas?.length ? modelo.perguntas : modeloInicial.perguntas,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function novo() {
    setSelecionadoId(null);
    setForm(modeloInicial);
    setMensagem("");
  }

  function atualizarEtapa(index: number, campo: keyof EtapaForm, valor: string | string[]) {
    setForm((atual) => ({
      ...atual,
      etapas: atual.etapas.map((etapa, pos) =>
        pos === index ? { ...etapa, [campo]: valor } : etapa,
      ),
    }));
  }

  function atualizarPergunta(index: number, campo: keyof PerguntaForm, valor: string | number) {
    setForm((atual) => ({
      ...atual,
      perguntas: atual.perguntas.map((pergunta, pos) =>
        pos === index ? { ...pergunta, [campo]: valor } : pergunta,
      ),
    }));
  }

  function atualizarAlternativa(perguntaIndex: number, alternativaIndex: number, valor: string) {
    setForm((atual) => ({
      ...atual,
      perguntas: atual.perguntas.map((pergunta, pos) =>
        pos === perguntaIndex
          ? {
              ...pergunta,
              alternativas: pergunta.alternativas.map((alternativa, altPos) =>
                altPos === alternativaIndex ? { ...alternativa, texto: valor } : alternativa,
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
              alternativas: pergunta.alternativas.map((alternativa, altPos) => ({
                ...alternativa,
                correta: altPos === alternativaIndex,
              })),
            }
          : pergunta,
      ),
    }));
  }

  async function salvar(event: FormEvent) {
    event.preventDefault();
    if (!podeEditar) return;
    setSalvando(true);
    setMensagem("");
    try {
      const url = form.id ? `/treinamentos-dinamicos/${form.id}` : "/treinamentos-dinamicos";
      const method = form.id ? api.put : api.post;
      const response = await method(url, form);
      await carregar();
      setForm((atual) => ({ ...atual, id: response.data.id }));
      setSelecionadoId(response.data.id);
      setMensagem("Treinamento salvo com sucesso. O link público já está disponível.");
    } catch (error: any) {
      setMensagem(error.response?.data?.error || "Não foi possível salvar o treinamento.");
    } finally {
      setSalvando(false);
    }
  }

  async function reenviarEmail(item: Participante) {
    setMensagem("");
    try {
      const response = await api.post(
        `/treinamentos-dinamicos/participantes/${item.id}/reenviar-email`,
      );
      setMensagem(response.data?.mensagem || "E-mail enviado com sucesso.");
      await carregar();
    } catch (error: any) {
      setMensagem(error.response?.data?.error || "Não foi possível reenviar o e-mail.");
    }
  }

  async function excluirModelo(modelo: Modelo) {
    if (!podeEditar) return;
    if (!confirm(`Deseja excluir o treinamento ${modelo.codigo}?`)) return;
    await api.delete(`/treinamentos-dinamicos/${modelo.id}`);
    setMensagem("Treinamento excluído.");
    novo();
    await carregar();
  }

  return (
    <div className="space-y-6">
      <section className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-5 dark:border-slate-800">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.28em] text-blue-600 dark:text-blue-300">
            Treinamentos
          </p>
          <h1 className="mt-2 text-3xl font-black text-slate-900 dark:text-white">
            Criador de treinamentos
          </h1>
          <p className="mt-2 text-sm font-semibold text-slate-600 dark:text-slate-300">
            Monte etapas, perguntas, link público, assinatura e certificado sem criar uma página fixa nova.
          </p>
        </div>
        <button
          type="button"
          onClick={novo}
          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-black text-white hover:bg-blue-700"
        >
          <Plus size={18} /> Novo treinamento
        </button>
      </section>

      {mensagem && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-black text-blue-900 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-100">
          {mensagem}
        </div>
      )}

      <section className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
        <form
          onSubmit={salvar}
          className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
        >
          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
              Tipo
              <select
                value={form.tipo}
                onChange={(event) => setForm({ ...form, tipo: event.target.value })}
                className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold normal-case tracking-normal text-slate-900 outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              >
                <option>Operacional</option>
                <option>Procedimento operacional</option>
                <option>CCOS</option>
                <option>Segurança patrimonial</option>
                <option>Integração</option>
              </select>
            </label>
            <label className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
              Código
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
                className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-black normal-case tracking-normal text-slate-900 outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              />
            </label>
            <label className="md:col-span-2 text-xs font-black uppercase tracking-[0.16em] text-slate-500">
              Nome do treinamento
              <input
                value={form.nome}
                onChange={(event) => setForm({ ...form, nome: event.target.value })}
                placeholder="Ex.: Controle de acesso de pessoas e veículos"
                className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold normal-case tracking-normal text-slate-900 outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              />
            </label>
            <label className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
              Link público
              <input
                value={form.slug}
                onChange={(event) => setForm({ ...form, slug: event.target.value })}
                className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold normal-case tracking-normal text-slate-900 outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              />
            </label>
            <label className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
              Status
              <select
                value={form.status}
                onChange={(event) => setForm({ ...form, status: event.target.value })}
                className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold normal-case tracking-normal text-slate-900 outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              >
                <option>Publicado</option>
                <option>Rascunho</option>
              </select>
            </label>
            <label className="md:col-span-2 text-xs font-black uppercase tracking-[0.16em] text-slate-500">
              Texto do certificado
              <textarea
                value={form.textoCertificado}
                onChange={(event) => setForm({ ...form, textoCertificado: event.target.value })}
                rows={3}
                className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-semibold normal-case tracking-normal text-slate-900 outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              />
              <span className="mt-1 block text-[11px] font-bold normal-case tracking-normal text-slate-500">
                Variáveis: {"{{nome}}"}, {"{{cpf}}"}, {"{{data}}"}, {"{{codigo}}"}, {"{{treinamento}}"}.
              </span>
            </label>
          </div>

          <div className="mt-6 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-xl font-black text-slate-900 dark:text-white">Etapas</h2>
              <button
                type="button"
                onClick={() =>
                  setForm({
                    ...form,
                    etapas: [
                      ...form.etapas,
                      { titulo: "", objetivo: "", conteudo: "", topicos: [], atencao: "" },
                    ],
                  })
                }
                className="rounded-xl border border-blue-200 px-3 py-2 text-xs font-black text-blue-700 dark:border-blue-500/30 dark:text-blue-200"
              >
                Adicionar etapa
              </button>
            </div>
            {form.etapas.map((etapa, index) => (
              <div key={index} className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
                <div className="mb-3 flex items-center justify-between">
                  <p className="font-black text-slate-900 dark:text-white">Etapa {index + 1}</p>
                  {form.etapas.length > 1 && (
                    <button
                      type="button"
                      onClick={() =>
                        setForm({ ...form, etapas: form.etapas.filter((_, pos) => pos !== index) })
                      }
                      className="text-red-500"
                    >
                      <Trash2 size={18} />
                    </button>
                  )}
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <input
                    value={etapa.titulo}
                    onChange={(event) => atualizarEtapa(index, "titulo", event.target.value)}
                    placeholder="Título"
                    className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  />
                  <input
                    value={etapa.objetivo}
                    onChange={(event) => atualizarEtapa(index, "objetivo", event.target.value)}
                    placeholder="Objetivo"
                    className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  />
                  <textarea
                    value={etapa.conteudo}
                    onChange={(event) => atualizarEtapa(index, "conteudo", event.target.value)}
                    placeholder="Conteúdo resumido em linguagem simples"
                    rows={4}
                    className="md:col-span-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-semibold outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  />
                  <input
                    value={etapa.topicos.join("; ")}
                    onChange={(event) =>
                      atualizarEtapa(
                        index,
                        "topicos",
                        event.target.value.split(";").map((item) => item.trim()).filter(Boolean),
                      )
                    }
                    placeholder="Pontos importantes separados por ;"
                    className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  />
                  <input
                    value={etapa.atencao}
                    onChange={(event) => atualizarEtapa(index, "atencao", event.target.value)}
                    placeholder="Caixa de atenção"
                    className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-xl font-black text-slate-900 dark:text-white">Perguntas</h2>
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
                className="rounded-xl border border-blue-200 px-3 py-2 text-xs font-black text-blue-700 dark:border-blue-500/30 dark:text-blue-200"
              >
                Adicionar pergunta
              </button>
            </div>
            {form.perguntas.map((pergunta, index) => (
              <div key={index} className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
                <div className="mb-3 flex items-center justify-between">
                  <p className="font-black text-slate-900 dark:text-white">Pergunta {index + 1}</p>
                  {form.perguntas.length > 1 && (
                    <button
                      type="button"
                      onClick={() =>
                        setForm({ ...form, perguntas: form.perguntas.filter((_, pos) => pos !== index) })
                      }
                      className="text-red-500"
                    >
                      <Trash2 size={18} />
                    </button>
                  )}
                </div>
                <div className="grid gap-3">
                  <select
                    value={pergunta.etapaOrdem}
                    onChange={(event) => atualizarPergunta(index, "etapaOrdem", Number(event.target.value))}
                    className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  >
                    {form.etapas.map((etapa, etapaIndex) => (
                      <option key={etapaIndex} value={etapaIndex + 1}>
                        Etapa {etapaIndex + 1} - {etapa.titulo || "Sem título"}
                      </option>
                    ))}
                  </select>
                  <input
                    value={pergunta.pergunta}
                    onChange={(event) => atualizarPergunta(index, "pergunta", event.target.value)}
                    placeholder="Texto da pergunta"
                    className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  />
                  <div className="grid gap-2 md:grid-cols-2">
                    {pergunta.alternativas.map((alternativa, altIndex) => (
                      <label
                        key={altIndex}
                        className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-2 dark:border-slate-700 dark:bg-slate-950"
                      >
                        <input
                          type="radio"
                          checked={alternativa.correta}
                          onChange={() => marcarCorreta(index, altIndex)}
                          className="accent-blue-600"
                        />
                        <input
                          value={alternativa.texto}
                          onChange={(event) => atualizarAlternativa(index, altIndex, event.target.value)}
                          placeholder={`Alternativa ${altIndex + 1}`}
                          className="min-w-0 flex-1 bg-transparent text-sm font-bold text-slate-900 outline-none dark:text-white"
                        />
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <button
            type="submit"
            disabled={!podeEditar || salvando}
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-black text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            <Save size={18} /> {salvando ? "Salvando..." : "Salvar treinamento"}
          </button>
        </form>

        <aside className="space-y-5">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-lg font-black text-slate-900 dark:text-white">Treinamentos criados</h2>
            <div className="mt-4 space-y-3">
              {modelos.map((modelo) => (
                <div
                  key={modelo.id}
                  className={`rounded-2xl border p-3 ${selecionadoId === modelo.id ? "border-blue-400 bg-blue-50 dark:bg-blue-500/10" : "border-slate-200 dark:border-slate-800"}`}
                >
                  <button type="button" onClick={() => editar(modelo)} className="block w-full text-left">
                    <p className="font-black text-slate-900 dark:text-white">{modelo.codigo}</p>
                    <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">{modelo.nome}</p>
                  </button>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <a
                      href={modelo.publicUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-2.5 py-1.5 text-xs font-black text-white"
                    >
                      <ExternalLink size={14} /> Abrir
                    </a>
                    <button
                      type="button"
                      onClick={() => copiarLink(modelo.publicUrl)}
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-black text-slate-700 dark:border-slate-700 dark:text-slate-200"
                    >
                      <Copy size={14} /> Copiar link
                    </button>
                    {podeEditar && (
                      <button
                        type="button"
                        onClick={() => excluirModelo(modelo)}
                        className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-2.5 py-1.5 text-xs font-black text-red-600 dark:border-red-500/30"
                      >
                        <Trash2 size={14} /> Excluir
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {!modelos.length && (
                <p className="rounded-xl bg-slate-50 p-3 text-sm font-semibold text-slate-600 dark:bg-slate-950 dark:text-slate-300">
                  Nenhum treinamento dinâmico criado.
                </p>
              )}
            </div>
          </div>

          {modeloSelecionado && (
            <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
              <h2 className="text-lg font-black text-slate-900 dark:text-white">Controle de participantes</h2>
              <div className="relative mt-4">
                <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <input
                  value={busca}
                  onChange={(event) => setBusca(event.target.value)}
                  placeholder="Buscar por nome, CPF, e-mail ou certificado"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm font-semibold outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                />
              </div>
              <div className="mt-4 max-h-[520px] space-y-3 overflow-auto pr-1">
                {filtrados.map((item) => (
                  <div key={item.id} className="rounded-2xl border border-slate-200 p-3 dark:border-slate-800">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-black text-slate-900 dark:text-white">{item.nomeCompleto}</p>
                        <p className="text-xs font-semibold text-slate-500">{item.email}</p>
                        <p className="mt-1 text-xs font-bold text-slate-600 dark:text-slate-300">
                          {item.codigo || "Sem certificado"} · {item.porcentagem}% · nota {item.nota ?? "-"} · {item.tentativas} tentativa(s)
                        </p>
                      </div>
                      {concluido(item.status) ? (
                        <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                      ) : (
                        <FileCheck2 className="h-5 w-5 text-blue-500" />
                      )}
                    </div>
                    <p className="mt-2 text-xs font-bold text-slate-500">{item.status} · {data(item.updatedAt)}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {item.certificadoUrl && (
                        <a
                          href={item.certificadoUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-lg bg-blue-600 px-2.5 py-1.5 text-xs font-black text-white"
                        >
                          Certificado
                        </a>
                      )}
                      {concluido(item.status) && (
                        <button
                          type="button"
                          onClick={() => reenviarEmail(item)}
                          className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 px-2.5 py-1.5 text-xs font-black text-emerald-700 dark:border-emerald-500/30 dark:text-emerald-200"
                        >
                          <Mail size={14} /> Reenviar
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                {!filtrados.length && (
                  <p className="rounded-xl bg-slate-50 p-3 text-sm font-semibold text-slate-600 dark:bg-slate-950 dark:text-slate-300">
                    Nenhum participante encontrado.
                  </p>
                )}
              </div>
            </div>
          )}
        </aside>
      </section>
    </div>
  );
}
