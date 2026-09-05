import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import {
  Edit3,
  Mail,
  Plus,
  RefreshCw,
  Search,
  Send,
  Trash2,
  UserPlus,
  X,
} from "lucide-react";
import { api } from "../services/api";
import { cpfVisivelPorPerfil } from "../utils/cpf";

type TreinamentoPublico = {
  id: number;
  codigo: string;
  nome: string;
  slug: string;
};

type ConviteVisitante = {
  id: number;
  treinamentoId: number;
  token: string;
  tokenExpiraEm?: string | null;
  conviteEnviadoEm?: string | null;
  status?: string | null;
  treinamento?: TreinamentoPublico | null;
};

type Visitante = {
  id: number;
  nomeCompleto: string;
  cpf: string;
  email: string;
  dataNascimento?: string | null;
  empresa?: string | null;
  cargo?: string | null;
  status: string;
  updatedAt: string;
  participantes?: ConviteVisitante[];
};

const inicial = {
  nomeCompleto: "",
  cpf: "",
  email: "",
  dataNascimento: "",
  empresa: "",
  cargo: "",
  treinamentoId: "",
};

function mascararCpf(valor: string) {
  const digitos = valor.replace(/\D/g, "").slice(0, 11);
  return digitos
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1-$2");
}

export default function TreinamentosVisitantes() {
  const [visitantes, setVisitantes] = useState<Visitante[]>([]);
  const [treinamentos, setTreinamentos] = useState<TreinamentoPublico[]>([]);
  const [form, setForm] = useState(inicial);
  const [modalAberto, setModalAberto] = useState(false);
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [busca, setBusca] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [enviandoId, setEnviandoId] = useState<number | null>(null);
  const [excluindoId, setExcluindoId] = useState<number | null>(null);
  const [envioPorVisitante, setEnvioPorVisitante] = useState<
    Record<number, string>
  >({});
  const [mensagem, setMensagem] = useState("");
  const [agora, setAgora] = useState(Date.now());

  async function carregar() {
    const response = await api.get("/treinamentos-visitantes");
    setVisitantes(response.data.visitantes || []);
    setTreinamentos(response.data.treinamentosPublicos || []);
  }

  useEffect(() => {
    carregar().catch(() => setMensagem("Erro ao carregar visitantes."));
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => setAgora(Date.now()), 30000);
    return () => window.clearInterval(timer);
  }, []);

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return visitantes;
    return visitantes.filter((visitante) =>
      [
        visitante.nomeCompleto,
        visitante.cpf,
        visitante.email,
        visitante.empresa,
        visitante.cargo,
        visitante.status,
      ]
        .join(" ")
        .toLowerCase()
        .includes(termo),
    );
  }, [busca, visitantes]);

  function alterar(campo: keyof typeof inicial, valor: string) {
    setForm((atual) => ({
      ...atual,
      [campo]: campo === "cpf" ? mascararCpf(valor) : valor,
    }));
  }

  function abrirNovo() {
    setEditandoId(null);
    setForm(inicial);
    setModalAberto(true);
  }

  function editar(visitante: Visitante) {
    setEditandoId(visitante.id);
    setForm({
      nomeCompleto: visitante.nomeCompleto || "",
      cpf: mascararCpf(visitante.cpf || ""),
      email: visitante.email || "",
      dataNascimento: visitante.dataNascimento
        ? visitante.dataNascimento.slice(0, 10)
        : "",
      empresa: visitante.empresa || "",
      cargo: visitante.cargo || "",
      treinamentoId: "",
    });
    setModalAberto(true);
  }

  function fecharModal() {
    if (salvando) return;
    setModalAberto(false);
    setEditandoId(null);
    setForm(inicial);
  }

  function treinamentoSelecionado(visitanteId: number) {
    const treinamentoId = envioPorVisitante[visitanteId];
    return treinamentos.find(
      (treinamento) => String(treinamento.id) === String(treinamentoId),
    );
  }

  function conviteSelecionado(visitante: Visitante) {
    const treinamentoId = envioPorVisitante[visitante.id];
    if (treinamentoId) {
      return visitante.participantes?.find(
        (convite) => String(convite.treinamentoId) === String(treinamentoId),
      );
    }
    return visitante.participantes?.[0] || null;
  }

  function tokenEstaAtivo(convite?: ConviteVisitante | null) {
    if (!convite?.tokenExpiraEm) return false;
    return new Date(convite.tokenExpiraEm).getTime() > agora;
  }

  function tempoToken(convite?: ConviteVisitante | null) {
    if (!convite?.tokenExpiraEm) return "Sem token";
    const diferenca = new Date(convite.tokenExpiraEm).getTime() - agora;
    if (diferenca <= 0) return "Expirado";
    const minutosTotais = Math.ceil(diferenca / 60000);
    const horas = Math.floor(minutosTotais / 60);
    const minutos = minutosTotais % 60;
    if (horas <= 0) return `${minutos}min restantes`;
    return `${horas}h ${String(minutos).padStart(2, "0")}min restantes`;
  }

  async function salvar(event: FormEvent) {
    event.preventDefault();
    setSalvando(true);
    setMensagem("");
    try {
      const payload = {
        ...form,
        treinamentoId: form.treinamentoId ? Number(form.treinamentoId) : null,
      };
      if (editandoId) {
        await api.put(`/treinamentos-visitantes/${editandoId}`, payload);
      } else {
        await api.post("/treinamentos-visitantes", payload);
      }
      setMensagem(
        form.treinamentoId
          ? "Visitante salvo e treinamento enviado por e-mail."
          : "Visitante salvo.",
      );
      setModalAberto(false);
      setEditandoId(null);
      setForm(inicial);
      await carregar();
    } catch (error: any) {
      setMensagem(error.response?.data?.error || "Erro ao salvar visitante.");
    } finally {
      setSalvando(false);
    }
  }

  async function enviar(visitanteId: number) {
    const treinamentoId = envioPorVisitante[visitanteId];
    if (!treinamentoId) return;
    const visitante = visitantes.find((item) => item.id === visitanteId);
    const treinamento = treinamentoSelecionado(visitanteId);
    if (!visitante || !treinamento) return;
    const convite = conviteSelecionado(visitante);
    const treinamentoNome = `${treinamento.codigo} - ${treinamento.nome}`;
    const confirmacao = tokenEstaAtivo(convite)
      ? `Já existe um token ativo para ${treinamentoNome} enviado para ${visitante.nomeCompleto}. Deseja enviar novamente e gerar um novo token?`
      : `Deseja enviar o treinamento ${treinamentoNome} para ${visitante.nomeCompleto}?`;
    if (!window.confirm(confirmacao)) return;

    setEnviandoId(visitanteId);
    setMensagem("");
    try {
      await api.post(`/treinamentos-visitantes/${visitanteId}/enviar`, {
        treinamentoId: Number(treinamentoId),
      });
      setMensagem("Convite enviado com token válido por 24 horas.");
      await carregar();
    } catch (error: any) {
      setMensagem(error.response?.data?.error || "Erro ao enviar convite.");
    } finally {
      setEnviandoId(null);
    }
  }

  async function excluir(visitante: Visitante) {
    if (
      !window.confirm(
        `Deseja excluir o visitante ${visitante.nomeCompleto}? O acompanhamento de treinamentos já enviados permanece na tela de Treinamentos Criados.`,
      )
    ) {
      return;
    }
    setExcluindoId(visitante.id);
    setMensagem("");
    try {
      await api.delete(`/treinamentos-visitantes/${visitante.id}`);
      setMensagem("Visitante excluído.");
      await carregar();
    } catch (error: any) {
      setMensagem(error.response?.data?.error || "Erro ao excluir visitante.");
    } finally {
      setExcluindoId(null);
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.22em] text-blue-400">
            Treinamentos
          </p>
          <h1 className="mt-2 text-3xl font-black text-white">
            Cadastro de Visitantes
          </h1>
          <p className="mt-1 text-sm font-semibold text-slate-400">
            Cadastre visitantes e envie treinamentos públicos com token temporário.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={abrirNovo}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-black text-white shadow-lg shadow-blue-600/20 hover:bg-blue-500"
          >
            <Plus size={17} />
            Novo visitante
          </button>
          <button
            onClick={() => carregar()}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm font-black text-slate-100 hover:border-blue-500"
          >
            <RefreshCw size={16} />
            Atualizar
          </button>
        </div>
      </header>

      {mensagem && (
        <div className="rounded-2xl border border-blue-500/30 bg-blue-500/10 px-4 py-3 text-sm font-bold text-blue-100">
          {mensagem}
        </div>
      )}

      <section className="rounded-2xl border border-slate-800 bg-slate-950/70 shadow-xl">
        <div className="flex flex-col gap-3 border-b border-slate-800 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-400">
              Visitantes cadastrados
            </p>
            <p className="text-sm font-bold text-slate-400">
              {filtrados.length} de {visitantes.length} registro(s)
            </p>
          </div>
          <label className="flex min-w-[280px] items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-slate-400">
            <Search size={16} />
            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar visitante, CPF, e-mail ou empresa"
              className="w-full bg-transparent text-sm font-bold text-white outline-none placeholder:text-slate-500"
            />
          </label>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1120px] text-left text-sm">
            <thead className="text-xs uppercase tracking-[0.18em] text-slate-400">
              <tr className="border-b border-slate-800">
                <th className="px-4 py-3">Visitante</th>
                <th className="px-4 py-3">Empresa / cargo</th>
                <th className="px-4 py-3">Nascimento</th>
                <th className="px-4 py-3">Treinamentos</th>
                <th className="px-4 py-3">Token</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.map((visitante) => {
                const convite = conviteSelecionado(visitante);
                const ativo = tokenEstaAtivo(convite);
                return (
                  <tr
                    key={visitante.id}
                    className="border-b border-slate-800/80"
                  >
                    <td className="px-4 py-4">
                      <p className="font-black text-white">
                        {visitante.nomeCompleto}
                      </p>
                      <p className="mt-1 text-xs font-bold text-slate-400">
                        {cpfVisivelPorPerfil(visitante.cpf)} - {visitante.email}
                      </p>
                    </td>
                    <td className="px-4 py-4">
                      <p className="font-bold text-slate-200">
                        {visitante.empresa || "-"}
                      </p>
                      <p className="mt-1 text-xs font-bold text-slate-500">
                        {visitante.cargo || "-"}
                      </p>
                    </td>
                    <td className="px-4 py-4 text-xs font-bold text-slate-300">
                      {visitante.dataNascimento
                        ? new Date(visitante.dataNascimento).toLocaleDateString(
                            "pt-BR",
                          )
                        : "-"}
                    </td>
                    <td className="px-4 py-4">
                      <select
                        value={envioPorVisitante[visitante.id] || ""}
                        onChange={(event) =>
                          setEnvioPorVisitante((atual) => ({
                            ...atual,
                            [visitante.id]: event.target.value,
                          }))
                        }
                        className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-bold text-white outline-none focus:border-blue-500"
                      >
                        <option value="">
                          {treinamentos.length
                            ? "Selecionar treinamento"
                            : "Nenhum treinamento público publicado"}
                        </option>
                        {treinamentos.map((treinamento) => (
                          <option key={treinamento.id} value={treinamento.id}>
                            {treinamento.codigo} - {treinamento.nome}
                          </option>
                        ))}
                      </select>
                      {convite?.treinamento && (
                        <p className="mt-2 text-[11px] font-bold text-slate-500">
                          Último envio: {convite.treinamento.codigo} -{" "}
                          {convite.treinamento.nome}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <div>
                        <span
                          className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-black uppercase tracking-[0.12em] ${
                            ativo
                              ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-200"
                              : convite
                                ? "border-amber-400/40 bg-amber-400/10 text-amber-200"
                                : "border-slate-700 bg-slate-900 text-slate-400"
                          }`}
                        >
                          {tempoToken(convite)}
                        </span>
                        {convite?.conviteEnviadoEm && (
                          <p className="mt-2 text-[11px] font-bold text-slate-500">
                            Enviado em{" "}
                            {new Date(
                              convite.conviteEnviadoEm,
                            ).toLocaleString("pt-BR")}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => enviar(visitante.id)}
                          disabled={
                            enviandoId === visitante.id ||
                            !envioPorVisitante[visitante.id]
                          }
                          title="Enviar treinamento"
                          className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-blue-500/50 bg-blue-600/15 text-blue-100 hover:bg-blue-600/25 disabled:opacity-60"
                        >
                          <Send size={15} />
                        </button>
                        <button
                          onClick={() => editar(visitante)}
                          title="Editar visitante"
                          className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-600 bg-slate-900 text-slate-100 hover:border-blue-500"
                        >
                          <Edit3 size={15} />
                        </button>
                        <button
                          onClick={() => excluir(visitante)}
                          disabled={excluindoId === visitante.id}
                          title="Excluir visitante"
                          className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-rose-500/50 bg-rose-500/10 text-rose-100 hover:bg-rose-500/20 disabled:opacity-60"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!filtrados.length && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-10 text-center text-sm font-bold text-slate-500"
                  >
                    Nenhum visitante encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {modalAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-4 py-6 backdrop-blur-sm">
          <form
            onSubmit={salvar}
            className="w-full max-w-4xl rounded-2xl border border-slate-700 bg-slate-950 p-5 shadow-2xl"
          >
            <div className="mb-5 flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600 text-white">
                  <UserPlus size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-black text-white">
                    {editandoId ? "Editar visitante" : "Novo visitante"}
                  </h2>
                  <p className="text-xs font-bold text-slate-400">
                    Selecione um treinamento público para enviar ao salvar, ou
                    deixe em branco para cadastrar sem envio.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={fecharModal}
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-700 bg-slate-900 text-slate-200 hover:border-slate-500"
                title="Fechar"
              >
                <X size={18} />
              </button>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <input
                value={form.nomeCompleto}
                onChange={(e) => alterar("nomeCompleto", e.target.value)}
                required
                placeholder="Nome completo"
                className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm font-bold text-white outline-none placeholder:text-slate-500 focus:border-blue-500"
              />
              <input
                value={form.cpf}
                onChange={(e) => alterar("cpf", e.target.value)}
                required
                placeholder="CPF"
                className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm font-bold text-white outline-none placeholder:text-slate-500 focus:border-blue-500"
              />
              <input
                value={form.email}
                onChange={(e) => alterar("email", e.target.value.toLowerCase())}
                required
                type="email"
                placeholder="E-mail"
                className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm font-bold text-white outline-none placeholder:text-slate-500 focus:border-blue-500"
              />
              <input
                value={form.dataNascimento}
                onChange={(e) => alterar("dataNascimento", e.target.value)}
                type="date"
                className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm font-bold text-white outline-none focus:border-blue-500"
              />
              <input
                value={form.empresa}
                onChange={(e) => alterar("empresa", e.target.value)}
                placeholder="Empresa"
                className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm font-bold text-white outline-none placeholder:text-slate-500 focus:border-blue-500"
              />
              <input
                value={form.cargo}
                onChange={(e) => alterar("cargo", e.target.value)}
                placeholder="Cargo"
                className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm font-bold text-white outline-none placeholder:text-slate-500 focus:border-blue-500"
              />
              <select
                value={form.treinamentoId}
                onChange={(e) => alterar("treinamentoId", e.target.value)}
                className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm font-bold text-white outline-none focus:border-blue-500 md:col-span-2"
              >
                <option value="">Cadastrar sem enviar agora</option>
                {treinamentos.map((treinamento) => (
                  <option key={treinamento.id} value={treinamento.id}>
                    {treinamento.codigo} - {treinamento.nome}
                  </option>
                ))}
              </select>
            </div>

            <div className="mt-5 flex flex-wrap justify-end gap-3">
              <button
                type="button"
                onClick={fecharModal}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-5 py-3 text-sm font-black text-slate-200 hover:border-slate-500"
              >
                <X size={17} />
                Cancelar
              </button>
              <button
                disabled={salvando}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-blue-600/20 hover:bg-blue-500 disabled:opacity-60"
              >
                <Mail size={17} />
                {salvando ? "Salvando..." : "Salvar visitante"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
