import { useCallback, useEffect, useMemo, useState } from "react";
import { Clock, LogOut, RefreshCw, ShieldCheck, UserRound } from "lucide-react";
import { api } from "../services/api";
import { usuarioAtual } from "../utils/permissoes";
import { SkeletonTable } from "../components/ui/Skeleton";

type UsuarioSessao = {
  id: number;
  nome: string;
  apelido?: string | null;
  email: string;
  perfilAcesso: string;
  equipe?: string | null;
  unidade?: string | null;
  fotoPerfil?: string | null;
};

type SessaoUsuario = {
  id: string;
  status: string;
  unidadeAtiva?: string | null;
  equipe?: string | null;
  perfilAcesso?: string | null;
  ipInicio?: string | null;
  ipUltimaAtividade?: string | null;
  navegador?: string | null;
  sistema?: string | null;
  iniciadaEm: string;
  ultimaAtividadeEm: string;
  encerradaEm?: string | null;
  encerradaPor?: string | null;
  motivoEncerramento?: string | null;
  usuario: UsuarioSessao;
};

function dataHora(valor?: string | null) {
  return valor ? new Date(valor).toLocaleString("pt-BR") : "-";
}

function duracao(inicio: string, fim?: string | null) {
  const inicial = new Date(inicio).getTime();
  const final = fim ? new Date(fim).getTime() : Date.now();
  const totalMinutos = Math.max(0, Math.floor((final - inicial) / 60000));
  const horas = Math.floor(totalMinutos / 60);
  const minutos = totalMinutos % 60;
  if (horas <= 0) return `${minutos} min`;
  return `${horas}h ${String(minutos).padStart(2, "0")}min`;
}

function nomeUsuario(usuario: UsuarioSessao) {
  return usuario.apelido || usuario.nome;
}

export default function Sessoes() {
  const [status, setStatus] = useState("ATIVA");
  const [sessoes, setSessoes] = useState<SessaoUsuario[]>([]);
  const [carregando, setCarregando] = useState(true);
  const usuarioLogado = usuarioAtual();

  const carregarSessoes = useCallback(async () => {
    setCarregando(true);
    try {
      const response = await api.get("/sessoes", { params: { status } });
      setSessoes(response.data);
    } finally {
      setCarregando(false);
    }
  }, [status]);

  useEffect(() => {
    carregarSessoes();
  }, [carregarSessoes]);

  const resumo = useMemo(
    () => ({
      total: sessoes.length,
      windows: sessoes.filter((sessao) => sessao.sistema === "Windows").length,
      administradores: sessoes.filter((sessao) =>
        ["SUPER_ADMIN", "ADMINISTRADOR"].includes(
          sessao.perfilAcesso || sessao.usuario.perfilAcesso,
        ),
      ).length,
    }),
    [sessoes],
  );

  async function desconectar(sessao: SessaoUsuario) {
    const motivo = window.prompt(
      `Informe o motivo para desconectar ${nomeUsuario(sessao.usuario)}:`,
      "Sessão encerrada pelo administrador",
    );
    if (!motivo) return;

    await api.post(`/sessoes/${sessao.id}/desconectar`, { motivo });
    await carregarSessoes();
    alert("Sessão desconectada com sucesso.");
  }

  return (
    <div className="space-y-6 text-slate-900 dark:text-slate-100">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-300">
            Administração
          </p>
          <h1 className="text-3xl font-bold">Sessões de usuários</h1>
          <p className="mt-1 text-slate-500 dark:text-slate-400">
            Controle de usuários conectados. Históricos encerrados e
            desconectados exibem somente as últimas 24 horas.
          </p>
        </div>

        <button
          type="button"
          onClick={carregarSessoes}
          className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900"
        >
          <RefreshCw size={16} className={carregando ? "animate-spin" : ""} />
          Atualizar
        </button>
      </div>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <p className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
            <UserRound size={16} /> Sessões no filtro
          </p>
          <p className="mt-2 text-3xl font-bold">{resumo.total}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <p className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
            <ShieldCheck size={16} /> Perfis administrativos
          </p>
          <p className="mt-2 text-3xl font-bold">{resumo.administradores}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <p className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
            <Clock size={16} /> Estações Windows
          </p>
          <p className="mt-2 text-3xl font-bold">{resumo.windows}</p>
        </div>
      </section>

      <div className="flex flex-wrap gap-2">
        {[
          ["ATIVA", "Ativas"],
          ["DESCONECTADA", "Desconectadas"],
          ["ENCERRADA", "Encerradas"],
        ].map(([valor, label]) => (
          <button
            key={valor}
            type="button"
            onClick={() => setStatus(valor)}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
              status === valor
                ? "bg-blue-600 text-white"
                : "bg-white text-slate-600 hover:bg-slate-100 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        {carregando && sessoes.length === 0 ? (
          <SkeletonTable
            rows={7}
            columns={8}
            className="border-0 shadow-none"
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left text-slate-500 dark:bg-slate-950 dark:text-slate-400">
                <tr>
                  <th className="px-4 py-3">Usuário</th>
                  <th className="px-4 py-3">Ambiente</th>
                  <th className="px-4 py-3">Início</th>
                  <th className="px-4 py-3">Ãšltima atividade</th>
                  <th className="px-4 py-3">Término</th>
                  <th className="px-4 py-3">Duração</th>
                  <th className="px-4 py-3">Dispositivo</th>
                  <th className="px-4 py-3">Ação</th>
                </tr>
              </thead>
              <tbody>
                {sessoes.map((sessao) => (
                  <tr
                    key={sessao.id}
                    className="border-t border-slate-100 align-top dark:border-slate-800"
                  >
                    <td className="px-4 py-4">
                      <div className="flex min-w-56 items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-200 text-sm font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                          {sessao.usuario.fotoPerfil ? (
                            <img
                              src={sessao.usuario.fotoPerfil}
                              alt={nomeUsuario(sessao.usuario)}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            nomeUsuario(sessao.usuario).charAt(0).toUpperCase()
                          )}
                        </div>
                        <div>
                          <p className="font-bold">
                            {nomeUsuario(sessao.usuario)}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {sessao.usuario.email}
                          </p>
                          <p className="mt-1 text-xs font-semibold text-blue-600 dark:text-blue-300">
                            {sessao.perfilAcesso || sessao.usuario.perfilAcesso}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <p className="font-semibold">
                        {sessao.unidadeAtiva || sessao.usuario.unidade || "-"}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {sessao.equipe || sessao.usuario.equipe || "Sem equipe"}
                      </p>
                    </td>
                    <td className="px-4 py-4">{dataHora(sessao.iniciadaEm)}</td>
                    <td className="px-4 py-4">
                      {dataHora(sessao.ultimaAtividadeEm)}
                    </td>
                    <td className="px-4 py-4">
                      <p>{dataHora(sessao.encerradaEm)}</p>
                      {sessao.encerradaPor && (
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {sessao.encerradaPor}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-4 font-semibold">
                      {duracao(sessao.iniciadaEm, sessao.encerradaEm)}
                    </td>
                    <td className="px-4 py-4">
                      <p className="font-semibold">
                        {sessao.sistema || "Não identificado"}
                      </p>
                      <p className="max-w-xs truncate text-xs text-slate-500 dark:text-slate-400">
                        {sessao.navegador || "-"}
                      </p>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        IP: {sessao.ipUltimaAtividade || sessao.ipInicio || "-"}
                      </p>
                    </td>
                    <td className="px-4 py-4">
                      {sessao.status === "ATIVA" ? (
                        <button
                          type="button"
                          disabled={sessao.usuario.id === usuarioLogado?.id}
                          onClick={() => desconectar(sessao)}
                          className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500"
                        >
                          <LogOut size={14} />
                          Desconectar
                        </button>
                      ) : (
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                          {sessao.status}
                        </span>
                      )}
                      {sessao.motivoEncerramento && (
                        <p className="mt-2 max-w-xs text-xs text-slate-500 dark:text-slate-400">
                          {sessao.motivoEncerramento}
                        </p>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!carregando && sessoes.length === 0 && (
          <div className="p-8 text-center text-slate-500 dark:text-slate-400">
            Nenhuma sessão encontrada para o filtro atual.
          </div>
        )}
      </section>
    </div>
  );
}
