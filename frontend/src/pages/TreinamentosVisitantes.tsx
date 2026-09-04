import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { Mail, RefreshCw, Search, Send, UserPlus } from "lucide-react";
import { api } from "../services/api";
import { cpfVisivelPorPerfil } from "../utils/cpf";

type TreinamentoPublico = {
  id: number;
  codigo: string;
  nome: string;
  slug: string;
};

type ParticipanteVisitante = {
  id: number;
  status: string;
  porcentagem: number;
  tokenExpiraEm?: string | null;
  conviteEnviadoEm?: string | null;
  treinamento?: TreinamentoPublico;
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
  participantes?: ParticipanteVisitante[];
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

function data(valor?: string | null) {
  return valor ? new Date(valor).toLocaleString("pt-BR") : "-";
}

export default function TreinamentosVisitantes() {
  const [visitantes, setVisitantes] = useState<Visitante[]>([]);
  const [treinamentos, setTreinamentos] = useState<TreinamentoPublico[]>([]);
  const [form, setForm] = useState(inicial);
  const [busca, setBusca] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [enviandoId, setEnviandoId] = useState<number | null>(null);
  const [envioPorVisitante, setEnvioPorVisitante] = useState<Record<number, string>>({});
  const [mensagem, setMensagem] = useState("");

  async function carregar() {
    const response = await api.get("/treinamentos-visitantes");
    setVisitantes(response.data.visitantes || []);
    setTreinamentos(response.data.treinamentosPublicos || []);
  }

  useEffect(() => {
    carregar().catch(() => setMensagem("Erro ao carregar visitantes."));
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

  async function salvar(event: FormEvent) {
    event.preventDefault();
    setSalvando(true);
    setMensagem("");
    try {
      await api.post("/treinamentos-visitantes", {
        ...form,
        treinamentoId: form.treinamentoId ? Number(form.treinamentoId) : null,
      });
      setForm(inicial);
      setMensagem(
        form.treinamentoId
          ? "Visitante cadastrado e treinamento enviado por e-mail."
          : "Visitante cadastrado.",
      );
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
        <button
          onClick={() => carregar()}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm font-black text-slate-100 hover:border-blue-500"
        >
          <RefreshCw size={16} />
          Atualizar
        </button>
      </header>

      {mensagem && (
        <div className="rounded-2xl border border-blue-500/30 bg-blue-500/10 px-4 py-3 text-sm font-bold text-blue-100">
          {mensagem}
        </div>
      )}

      <form
        onSubmit={salvar}
        className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5 shadow-xl"
      >
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600 text-white">
            <UserPlus size={20} />
          </div>
          <div>
            <h2 className="text-lg font-black text-white">Novo visitante</h2>
            <p className="text-xs font-bold text-slate-400">
              O treinamento selecionado será enviado ao salvar.
            </p>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
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
            className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm font-bold text-white outline-none focus:border-blue-500 xl:col-span-2"
          >
            <option value="">Cadastrar sem enviar agora</option>
            {treinamentos.map((treinamento) => (
              <option key={treinamento.id} value={treinamento.id}>
                {treinamento.id} - {treinamento.codigo} - {treinamento.nome}
              </option>
            ))}
          </select>
        </div>

        <button
          disabled={salvando}
          className="mt-5 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-blue-600/20 hover:bg-blue-500 disabled:opacity-60"
        >
          <Mail size={17} />
          {salvando ? "Salvando..." : "Salvar visitante"}
        </button>
      </form>

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
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="text-xs uppercase tracking-[0.18em] text-slate-400">
              <tr className="border-b border-slate-800">
                <th className="px-4 py-3">Visitante</th>
                <th className="px-4 py-3">Empresa / cargo</th>
                <th className="px-4 py-3">Último treinamento</th>
                <th className="px-4 py-3">Validade</th>
                <th className="px-4 py-3">Enviar treinamento</th>
                <th className="px-4 py-3 text-right">Ação</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.map((visitante) => {
                const ultimo = visitante.participantes?.[0];
                return (
                  <tr key={visitante.id} className="border-b border-slate-800/80">
                    <td className="px-4 py-4">
                      <p className="font-black text-white">{visitante.nomeCompleto}</p>
                      <p className="mt-1 text-xs font-bold text-slate-400">
                        {cpfVisivelPorPerfil(visitante.cpf)} - {visitante.email}
                      </p>
                    </td>
                    <td className="px-4 py-4">
                      <p className="font-bold text-slate-200">{visitante.empresa || "-"}</p>
                      <p className="mt-1 text-xs font-bold text-slate-500">
                        {visitante.cargo || "-"}
                      </p>
                    </td>
                    <td className="px-4 py-4">
                      <p className="font-black text-slate-100">
                        {ultimo?.treinamento
                          ? `${ultimo.treinamento.codigo} - ${ultimo.treinamento.nome}`
                          : "-"}
                      </p>
                      <p className="mt-1 text-xs font-bold text-slate-500">
                        {ultimo?.status || "Sem envio"}
                      </p>
                    </td>
                    <td className="px-4 py-4 text-xs font-bold text-slate-300">
                      {data(ultimo?.tokenExpiraEm)}
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
                        <option value="">Selecionar treinamento</option>
                        {treinamentos.map((treinamento) => (
                          <option key={treinamento.id} value={treinamento.id}>
                            {treinamento.codigo} - {treinamento.nome}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <button
                        onClick={() => enviar(visitante.id)}
                        disabled={enviandoId === visitante.id || !envioPorVisitante[visitante.id]}
                        className="inline-flex items-center gap-2 rounded-xl border border-blue-500/50 bg-blue-600/15 px-3 py-2 text-xs font-black text-blue-100 hover:bg-blue-600/25 disabled:opacity-60"
                      >
                        <Send size={15} />
                        Enviar
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
