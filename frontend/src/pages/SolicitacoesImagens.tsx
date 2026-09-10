import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import {
  Clock,
  Eye,
  Mail,
  PauseCircle,
  Pencil,
  PlayCircle,
  Plus,
  RefreshCcw,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { api } from "../services/api";
import { podeNoModulo } from "../utils/permissoes";

type UsuarioResumo = {
  id: number;
  nome: string;
  email?: string;
};

type LocalTerminal = {
  id: number;
  nome: string;
  tipo?: string | null;
  status: string;
  unidade: string;
};

type Anexo = {
  id: number;
  nomeOriginal: string;
  caminho: string;
  tipoArquivo: string;
  tamanho: number;
  origem: string;
  createdAt: string;
};

type Atendimento = {
  id: number;
  iniciadoEm: string;
  pausadoEm?: string | null;
  tempoSegundos?: number | null;
  motivoPausa?: string | null;
  andamento?: string | null;
  atendente: UsuarioResumo;
};

type Historico = {
  id: number;
  tipoEvento: string;
  descricao: string;
  statusAnterior?: string | null;
  statusNovo?: string | null;
  usuarioNome?: string | null;
  usuario?: UsuarioResumo | null;
  createdAt: string;
};

type SolicitacaoImagem = {
  id: number;
  protocolo: string;
  unidade: string;
  origem: string;
  titulo: string;
  solicitanteNome: string;
  solicitanteEmail?: string | null;
  solicitanteSetor?: string | null;
  solicitanteCargo?: string | null;
  local?: string | null;
  dataOcorrencia?: string | null;
  horaInicial?: string | null;
  horaFinal?: string | null;
  descricao?: string | null;
  prioridade: string;
  status: string;
  atendimentoIniciadoEm?: string | null;
  tempoTotalAtendimento: number;
  descricaoConclusao?: string | null;
  motivoAnulacao?: string | null;
  createdAt: string;
  atendente?: UsuarioResumo | null;
  criadoPor?: UsuarioResumo | null;
  anexos?: Anexo[];
  atendimentos?: Atendimento[];
  historico?: Historico[];
};

const prioridades = ["", "Baixa", "Média", "Alta", "Crítica", "Não Classificada"];
const statusOpcoes = [
  "",
  "Aguardando Atendimento",
  "Aguardando Classificação",
  "Em Atendimento",
  "Pausado",
  "Finalizado",
  "Anulado",
];

const formInicial = {
  titulo: "",
  solicitanteNome: "",
  email: "",
  setor: "",
  cargo: "",
  local: "",
  dataOcorrencia: "",
  horaInicial: "",
  horaFinal: "",
  descricao: "",
  prioridade: "Baixa",
  status: "Aguardando Atendimento",
  descricaoConclusao: "",
  motivoAnulacao: "",
};

function formatarData(valor?: string | null) {
  if (!valor) return "-";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(valor));
}

function formatarDataInput(valor?: string | null) {
  if (!valor) return "";
  return new Date(valor).toISOString().slice(0, 10);
}

function formatarTempo(segundos = 0) {
  const horas = Math.floor(segundos / 3600);
  const minutos = Math.floor((segundos % 3600) / 60);
  return `${String(horas).padStart(2, "0")}:${String(minutos).padStart(2, "0")}`;
}

function classeStatus(status: string) {
  if (status === "Finalizado") return "border-emerald-500/30 bg-emerald-500/10 text-emerald-200";
  if (status === "Em Atendimento") return "border-sky-500/30 bg-sky-500/10 text-sky-200";
  if (status === "Pausado") return "border-amber-500/30 bg-amber-500/10 text-amber-200";
  if (status === "Anulado") return "border-red-500/30 bg-red-500/10 text-red-200";
  return "border-slate-500/30 bg-slate-500/10 text-slate-200";
}

function classePrioridade(prioridade: string) {
  if (prioridade === "Crítica") return "text-red-300";
  if (prioridade === "Alta") return "text-orange-300";
  if (prioridade === "Média") return "text-amber-300";
  if (prioridade === "Baixa") return "text-emerald-300";
  return "text-slate-300";
}

export default function SolicitacoesImagens() {
  const [solicitacoes, setSolicitacoes] = useState<SolicitacaoImagem[]>([]);
  const [locais, setLocais] = useState<LocalTerminal[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [busca, setBusca] = useState("");
  const [statusFiltro, setStatusFiltro] = useState("");
  const [prioridadeFiltro, setPrioridadeFiltro] = useState("");
  const [modalForm, setModalForm] = useState<"criar" | "editar" | null>(null);
  const [modalPausa, setModalPausa] = useState<SolicitacaoImagem | null>(null);
  const [detalhe, setDetalhe] = useState<SolicitacaoImagem | null>(null);
  const [form, setForm] = useState(formInicial);
  const [anexos, setAnexos] = useState<FileList | null>(null);
  const [emailFormulario, setEmailFormulario] = useState("");
  const [linkGerado, setLinkGerado] = useState("");
  const [pausa, setPausa] = useState({ motivo: "", andamento: "" });
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);

  const podeCriar = podeNoModulo("cftv", "criar");
  const podeEditar = podeNoModulo("cftv", "editar");
  const podeExcluir = podeNoModulo("cftv", "excluir");

  async function carregarSolicitacoes() {
    setCarregando(true);
    try {
      const resposta = await api.get("/solicitacoes-imagens", {
        params: {
          busca: busca.trim() || undefined,
          status: statusFiltro || undefined,
          prioridade: prioridadeFiltro || undefined,
        },
      });
      setSolicitacoes(resposta.data || []);
    } finally {
      setCarregando(false);
    }
  }

  async function carregarLocais() {
    const resposta = await api.get("/locais", { params: { status: "ativo" } });
    setLocais(resposta.data || []);
  }

  useEffect(() => {
    carregarSolicitacoes();
    carregarLocais().catch(() => setLocais([]));
  }, []);

  const resumo = useMemo(() => {
    return solicitacoes.reduce(
      (acc, item) => {
        acc.total += 1;
        if (item.status === "Em Atendimento") acc.atendimento += 1;
        if (item.status === "Aguardando Classificação") acc.classificacao += 1;
        if (item.prioridade === "Crítica") acc.criticas += 1;
        return acc;
      },
      { total: 0, atendimento: 0, classificacao: 0, criticas: 0 },
    );
  }, [solicitacoes]);

  function abrirCriacao() {
    setErro("");
    setForm(formInicial);
    setAnexos(null);
    setModalForm("criar");
  }

  function abrirEdicao(item: SolicitacaoImagem) {
    setErro("");
    setForm({
      titulo: item.titulo || "",
      solicitanteNome: item.solicitanteNome || "",
      email: item.solicitanteEmail || "",
      setor: item.solicitanteSetor || "",
      cargo: item.solicitanteCargo || "",
      local: item.local || "",
      dataOcorrencia: formatarDataInput(item.dataOcorrencia),
      horaInicial: item.horaInicial || "",
      horaFinal: item.horaFinal || "",
      descricao: item.descricao || "",
      prioridade: item.prioridade || "Não Classificada",
      status: item.status || "Aguardando Atendimento",
      descricaoConclusao: item.descricaoConclusao || "",
      motivoAnulacao: item.motivoAnulacao || "",
    });
    setAnexos(null);
    setDetalhe(item);
    setModalForm("editar");
  }

  function montarFormData() {
    const dados = new FormData();
    Object.entries(form).forEach(([chave, valor]) => dados.append(chave, valor));
    Array.from(anexos || []).forEach((arquivo) => dados.append("anexos", arquivo));
    return dados;
  }

  async function salvarFormulario(event: FormEvent) {
    event.preventDefault();
    setErro("");
    setSalvando(true);
    try {
      if (modalForm === "criar") {
        await api.post("/solicitacoes-imagens", montarFormData());
      } else if (detalhe) {
        await api.put(`/solicitacoes-imagens/${detalhe.id}`, montarFormData());
      }
      setModalForm(null);
      await carregarSolicitacoes();
    } catch (error: any) {
      setErro(error?.response?.data?.error || "Não foi possível salvar.");
    } finally {
      setSalvando(false);
    }
  }

  async function atualizarDetalhe(id: number) {
    const resposta = await api.get(`/solicitacoes-imagens/${id}`);
    setDetalhe(resposta.data);
  }

  async function acaoAtendimento(item: SolicitacaoImagem) {
    setErro("");
    setSalvando(true);
    try {
      await api.post(`/solicitacoes-imagens/${item.id}/atendimento/iniciar`);
      await carregarSolicitacoes();
      if (detalhe?.id === item.id) await atualizarDetalhe(item.id);
    } catch (error: any) {
      setErro(error?.response?.data?.error || "Não foi possível iniciar.");
    } finally {
      setSalvando(false);
    }
  }

  async function pausarAtendimento(event: FormEvent) {
    event.preventDefault();
    if (!modalPausa) return;
    setErro("");
    setSalvando(true);
    try {
      await api.post(`/solicitacoes-imagens/${modalPausa.id}/atendimento/pausar`, pausa);
      setModalPausa(null);
      setPausa({ motivo: "", andamento: "" });
      await carregarSolicitacoes();
      if (detalhe?.id === modalPausa.id) await atualizarDetalhe(modalPausa.id);
    } catch (error: any) {
      setErro(error?.response?.data?.error || "Não foi possível pausar.");
    } finally {
      setSalvando(false);
    }
  }

  async function excluir(item: SolicitacaoImagem) {
    const confirmar = window.confirm(`Excluir a solicitação ${item.protocolo}?`);
    if (!confirmar) return;
    await api.delete(`/solicitacoes-imagens/${item.id}`, {
      data: { motivo: "Exclusão pela tela de solicitações de imagens" },
    });
    await carregarSolicitacoes();
  }

  async function enviarFormulario(event: FormEvent) {
    event.preventDefault();
    setErro("");
    setLinkGerado("");
    setSalvando(true);
    try {
      const resposta = await api.post("/solicitacoes-imagens/formularios", {
        email: emailFormulario,
      });
      setLinkGerado(resposta.data.link);
    } catch (error: any) {
      setErro(error?.response?.data?.error || "Não foi possível enviar o formulário.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 border-b border-slate-800 pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.28em] text-sky-300">
            Solicitações
          </p>
          <h1 className="mt-2 text-3xl font-black text-white">
            Solicitações de Imagens
          </h1>
          <p className="mt-2 text-slate-300">
            Gestão de pedidos de imagens, evidências e CFTV com protocolo,
            atendimento e linha do tempo.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={carregarSolicitacoes}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-4 py-2 text-sm font-bold text-slate-200 hover:border-sky-500 hover:text-white"
          >
            <RefreshCcw size={16} />
            Atualizar
          </button>
          {podeCriar && (
            <button
              onClick={abrirCriacao}
              className="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2 text-sm font-bold text-white hover:bg-sky-500"
            >
              <Plus size={16} />
              Nova solicitação
            </button>
          )}
        </div>
      </section>

      {erro && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-200">
          {erro}
        </div>
      )}

      <section className="grid gap-3 md:grid-cols-4">
        {[
          ["Total", resumo.total],
          ["Em atendimento", resumo.atendimento],
          ["Aguardando classificação", resumo.classificacao],
          ["Críticas", resumo.criticas],
        ].map(([label, valor]) => (
          <div key={String(label)} className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
            <p className="text-xs font-bold uppercase text-slate-400">{label}</p>
            <p className="mt-2 text-2xl font-black text-white">{valor}</p>
          </div>
        ))}
      </section>

      <section className="rounded-xl border border-slate-800 bg-slate-950/70">
        <div className="grid gap-3 border-b border-slate-800 p-4 lg:grid-cols-[1fr_220px_220px_auto]">
          <label className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2">
            <Search size={16} className="text-slate-400" />
            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-500"
              placeholder="Buscar protocolo, solicitante, local ou título"
            />
          </label>
          <select
            value={statusFiltro}
            onChange={(e) => setStatusFiltro(e.target.value)}
            className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm font-bold text-white outline-none"
          >
            {statusOpcoes.map((status) => (
              <option key={status || "todos"} value={status}>
                {status || "Todos os status"}
              </option>
            ))}
          </select>
          <select
            value={prioridadeFiltro}
            onChange={(e) => setPrioridadeFiltro(e.target.value)}
            className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm font-bold text-white outline-none"
          >
            {prioridades.map((prioridade) => (
              <option key={prioridade || "todas"} value={prioridade}>
                {prioridade || "Todas as prioridades"}
              </option>
            ))}
          </select>
          <button
            onClick={carregarSolicitacoes}
            className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-bold text-white hover:bg-slate-700"
          >
            Filtrar
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-800 text-sm">
            <thead className="bg-slate-900/80 text-left text-xs uppercase text-slate-400">
              <tr>
                <th className="px-4 py-3">Data</th>
                <th className="px-4 py-3">Protocolo</th>
                <th className="px-4 py-3">Solicitante</th>
                <th className="px-4 py-3">Título</th>
                <th className="px-4 py-3">Prioridade</th>
                <th className="px-4 py-3">Atendente</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {carregando ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-400">
                    Carregando solicitações...
                  </td>
                </tr>
              ) : solicitacoes.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-400">
                    Nenhuma solicitação encontrada.
                  </td>
                </tr>
              ) : (
                solicitacoes.map((item) => (
                  <tr key={item.id} className="text-slate-200 hover:bg-slate-900/70">
                    <td className="px-4 py-3">{formatarData(item.createdAt)}</td>
                    <td className="px-4 py-3 font-bold text-white">{item.protocolo}</td>
                    <td className="px-4 py-3">{item.solicitanteNome}</td>
                    <td className="px-4 py-3">{item.titulo}</td>
                    <td className={`px-4 py-3 font-bold ${classePrioridade(item.prioridade)}`}>
                      {item.prioridade}
                    </td>
                    <td className="px-4 py-3">{item.atendente?.nome || "-"}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full border px-2 py-1 text-xs font-bold ${classeStatus(item.status)}`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <button title="Linha do tempo" onClick={() => atualizarDetalhe(item.id)} className="rounded-lg border border-slate-700 p-2 hover:border-sky-500">
                          <Eye size={16} />
                        </button>
                        {podeEditar && item.status !== "Em Atendimento" && (
                          <button title="Editar" onClick={() => abrirEdicao(item)} className="rounded-lg border border-slate-700 p-2 hover:border-sky-500">
                            <Pencil size={16} />
                          </button>
                        )}
                        {podeEditar && ["Aguardando Atendimento", "Pausado"].includes(item.status) && (
                          <button title="Atender" onClick={() => acaoAtendimento(item)} className="rounded-lg border border-slate-700 p-2 text-sky-300 hover:border-sky-500">
                            <PlayCircle size={16} />
                          </button>
                        )}
                        {podeEditar && item.status === "Em Atendimento" && (
                          <button title="Pausar" onClick={() => setModalPausa(item)} className="rounded-lg border border-slate-700 p-2 text-amber-300 hover:border-amber-500">
                            <PauseCircle size={16} />
                          </button>
                        )}
                        {podeExcluir && (
                          <button title="Excluir" onClick={() => excluir(item)} className="rounded-lg border border-slate-700 p-2 text-red-300 hover:border-red-500">
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {podeCriar && (
        <section className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
          <form onSubmit={enviarFormulario} className="grid gap-3 lg:grid-cols-[1fr_auto]">
            <label className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2">
              <Mail size={16} className="text-slate-400" />
              <input
                type="email"
                value={emailFormulario}
                onChange={(e) => setEmailFormulario(e.target.value)}
                className="w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-500"
                placeholder="E-mail para enviar formulário externo"
                required
              />
            </label>
            <button disabled={salvando} className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-bold text-white hover:bg-slate-700 disabled:opacity-60">
              Enviar Formulário
            </button>
          </form>
          {linkGerado && (
            <p className="mt-3 break-all text-sm text-emerald-300">
              Link gerado: {linkGerado}
            </p>
          )}
        </section>
      )}

      {modalForm && (
        <FormularioModal
          modo={modalForm}
          form={form}
          setForm={setForm}
          locais={locais}
          setAnexos={setAnexos}
          onClose={() => setModalForm(null)}
          onSubmit={salvarFormulario}
          salvando={salvando}
        />
      )}

      {modalPausa && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4">
          <form onSubmit={pausarAtendimento} className="w-full max-w-lg rounded-xl border border-slate-800 bg-slate-950 p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-black text-white">Pausar atendimento</h2>
              <button type="button" onClick={() => setModalPausa(null)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-800">
                <X size={18} />
              </button>
            </div>
            <Campo label="Motivo">
              <input value={pausa.motivo} onChange={(e) => setPausa({ ...pausa, motivo: e.target.value })} className="input-dark" required />
            </Campo>
            <Campo label="Andamento">
              <textarea value={pausa.andamento} onChange={(e) => setPausa({ ...pausa, andamento: e.target.value })} className="input-dark min-h-28" required />
            </Campo>
            <button disabled={salvando} className="mt-4 w-full rounded-lg bg-amber-600 px-4 py-2 font-bold text-white hover:bg-amber-500 disabled:opacity-60">
              Salvar pausa
            </button>
          </form>
        </div>
      )}

      {detalhe && !modalForm && (
        <DetalheSolicitacao detalhe={detalhe} onClose={() => setDetalhe(null)} />
      )}
    </div>
  );
}

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="mb-3 block text-sm font-bold text-slate-300">
      <span className="mb-1 block">{label}</span>
      {children}
    </label>
  );
}

function FormularioModal({
  modo,
  form,
  setForm,
  locais,
  setAnexos,
  onClose,
  onSubmit,
  salvando,
}: {
  modo: "criar" | "editar";
  form: typeof formInicial;
  setForm: (form: typeof formInicial) => void;
  locais: LocalTerminal[];
  setAnexos: (files: FileList | null) => void;
  onClose: () => void;
  onSubmit: (event: FormEvent) => void;
  salvando: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4">
      <form onSubmit={onSubmit} className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-xl border border-slate-800 bg-slate-950 p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-black text-white">
            {modo === "criar" ? "Nova solicitação" : "Editar solicitação"}
          </h2>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-800">
            <X size={18} />
          </button>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <Campo label="Título">
            <input value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} className="input-dark" required />
          </Campo>
          <Campo label="Nome do solicitante">
            <input value={form.solicitanteNome} onChange={(e) => setForm({ ...form, solicitanteNome: e.target.value })} className="input-dark" required />
          </Campo>
          <Campo label="E-mail">
            <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="input-dark" />
          </Campo>
          <Campo label="Setor">
            <input value={form.setor} onChange={(e) => setForm({ ...form, setor: e.target.value })} className="input-dark" />
          </Campo>
          <Campo label="Cargo">
            <input value={form.cargo} onChange={(e) => setForm({ ...form, cargo: e.target.value })} className="input-dark" />
          </Campo>
          <Campo label="Local">
            <LocalComFiltro
              valor={form.local}
              locais={locais}
              onChange={(local) => setForm({ ...form, local })}
            />
          </Campo>
          <Campo label="Data da ocorrência">
            <input type="date" value={form.dataOcorrencia} onChange={(e) => setForm({ ...form, dataOcorrencia: e.target.value })} className="input-dark" />
          </Campo>
          <div className="grid grid-cols-2 gap-3">
            <Campo label="Hora inicial">
              <input type="time" value={form.horaInicial} onChange={(e) => setForm({ ...form, horaInicial: e.target.value })} className="input-dark" />
            </Campo>
            <Campo label="Hora final">
              <input type="time" value={form.horaFinal} onChange={(e) => setForm({ ...form, horaFinal: e.target.value })} className="input-dark" />
            </Campo>
          </div>
          <Campo label="Prioridade">
            <select value={form.prioridade} onChange={(e) => setForm({ ...form, prioridade: e.target.value })} className="input-dark">
              {prioridades.filter(Boolean).map((item) => <option key={item}>{item}</option>)}
            </select>
          </Campo>
          {modo === "editar" && (
            <Campo label="Status">
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="input-dark">
                {statusOpcoes.filter(Boolean).map((item) => <option key={item}>{item}</option>)}
              </select>
            </Campo>
          )}
        </div>
        <Campo label="Descrição">
          <textarea value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} className="input-dark min-h-28" />
        </Campo>
        {form.status === "Finalizado" && (
          <Campo label="Conclusão">
            <textarea value={form.descricaoConclusao} onChange={(e) => setForm({ ...form, descricaoConclusao: e.target.value })} className="input-dark min-h-24" required />
          </Campo>
        )}
        {form.status === "Anulado" && (
          <Campo label="Motivo da anulação">
            <textarea value={form.motivoAnulacao} onChange={(e) => setForm({ ...form, motivoAnulacao: e.target.value })} className="input-dark min-h-24" required />
          </Campo>
        )}
        <Campo label="Anexos">
          <input type="file" multiple onChange={(e) => setAnexos(e.target.files)} className="block w-full text-sm text-slate-300 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-800 file:px-3 file:py-2 file:font-bold file:text-white" />
        </Campo>
        <button disabled={salvando} className="mt-2 w-full rounded-lg bg-sky-600 px-4 py-2 font-bold text-white hover:bg-sky-500 disabled:opacity-60">
          Salvar
        </button>
      </form>
    </div>
  );
}

function LocalComFiltro({
  valor,
  locais,
  onChange,
}: {
  valor: string;
  locais: LocalTerminal[];
  onChange: (valor: string) => void;
}) {
  const listaId = "locais-solicitacao-imagem";
  const locaisFiltrados = locais.filter((local) => local.status === "Ativo");

  return (
    <>
      <input
        value={valor}
        onChange={(e) => onChange(e.target.value)}
        list={listaId}
        className="input-dark"
        placeholder="Digite para filtrar um local cadastrado"
        autoComplete="off"
      />
      <datalist id={listaId}>
        {locaisFiltrados.map((local) => (
          <option key={local.id} value={local.nome}>
            {local.tipo ? `${local.tipo} · ${local.unidade}` : local.unidade}
          </option>
        ))}
      </datalist>
      {locaisFiltrados.length === 0 && (
        <span className="mt-1 block text-xs font-medium text-amber-300">
          Nenhum local ativo encontrado para a unidade atual.
        </span>
      )}
    </>
  );
}

function DetalheSolicitacao({
  detalhe,
  onClose,
}: {
  detalhe: SolicitacaoImagem;
  onClose: () => void;
}) {
  return (
    <aside className="fixed inset-y-0 right-0 z-40 w-full max-w-xl overflow-y-auto border-l border-slate-800 bg-slate-950 p-5 shadow-2xl">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-bold text-sky-300">{detalhe.protocolo}</p>
          <h2 className="text-2xl font-black text-white">{detalhe.titulo}</h2>
        </div>
        <button onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-800">
          <X size={18} />
        </button>
      </div>

      <div className="grid gap-3 text-sm text-slate-300">
        <p><b>Solicitante:</b> {detalhe.solicitanteNome}</p>
        <p><b>Atendente:</b> {detalhe.atendente?.nome || "-"}</p>
        <p><b>Tempo acumulado:</b> {formatarTempo(detalhe.tempoTotalAtendimento)}</p>
        <p><b>Origem:</b> {detalhe.origem}</p>
        <p><b>Local:</b> {detalhe.local || "-"}</p>
        <p><b>Ocorrência:</b> {detalhe.dataOcorrencia ? formatarData(detalhe.dataOcorrencia) : "-"} {detalhe.horaInicial || ""} {detalhe.horaFinal ? `até ${detalhe.horaFinal}` : ""}</p>
        <p><b>Descrição:</b> {detalhe.descricao || "-"}</p>
      </div>

      <section className="mt-6">
        <h3 className="mb-3 flex items-center gap-2 text-lg font-black text-white">
          <Clock size={18} />
          Linha do tempo
        </h3>
        <div className="space-y-3">
          {(detalhe.historico || []).map((item) => (
            <div key={item.id} className="rounded-lg border border-slate-800 bg-slate-900/60 p-3">
              <p className="text-xs font-bold uppercase text-slate-500">{formatarData(item.createdAt)} · {item.usuario?.nome || item.usuarioNome || "Sistema"}</p>
              <p className="mt-1 font-bold text-white">{item.tipoEvento}</p>
              <p className="text-sm text-slate-300">{item.descricao}</p>
            </div>
          ))}
          {!detalhe.historico?.length && <p className="text-sm text-slate-400">Sem eventos registrados.</p>}
        </div>
      </section>

      <section className="mt-6">
        <h3 className="mb-3 text-lg font-black text-white">Anexos</h3>
        <div className="space-y-2">
          {(detalhe.anexos || []).map((anexo) => (
            <a key={anexo.id} href={`/${anexo.caminho}`} target="_blank" rel="noreferrer" className="block rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2 text-sm font-bold text-sky-300 hover:border-sky-500">
              {anexo.nomeOriginal}
            </a>
          ))}
          {!detalhe.anexos?.length && <p className="text-sm text-slate-400">Nenhum anexo.</p>}
        </div>
      </section>
    </aside>
  );
}
