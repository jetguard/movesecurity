import { useEffect, useMemo, useState } from "react";
import {
  Award,
  CheckCircle2,
  Clock3,
  Download,
  FileText,
  Mail,
  PlayCircle,
  Search,
  Trash2,
} from "lucide-react";
import { api } from "../services/api";
import { PERFIS, perfilAtual } from "../utils/permissoes";

type TreinamentoPoc = {
  id: number;
  codigo?: string | null;
  nomeCompleto: string;
  cpf?: string | null;
  email: string;
  cargo?: string | null;
  departamento?: string | null;
  unidade?: string | null;
  empresa?: string | null;
  etapaAtual: number;
  status: string;
  porcentagem: number;
  nota?: number | null;
  tentativas: number;
  emailStatus?: string | null;
  emailEnviadoEm?: string | null;
  certificadoUrl?: string | null;
  dataInicio: string;
  dataConclusao?: string | null;
  ultimoAcessoEm: string;
};

function data(valor?: string | null) {
  return valor ? new Date(valor).toLocaleString("pt-BR") : "-";
}

function estaConcluido(status?: string | null) {
  return String(status || "")
    .toLowerCase()
    .startsWith("conclu");
}

function classeStatus(status: string) {
  if (estaConcluido(status))
    return "border-emerald-400/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-200";
  if (status === "Reprovado")
    return "border-amber-400/40 bg-amber-500/10 text-amber-700 dark:text-amber-200";
  return "border-blue-400/40 bg-blue-500/10 text-blue-700 dark:text-blue-200";
}

function criarIndicadores(lista: TreinamentoPoc[]) {
  return {
    total: lista.length,
    andamento: lista.filter((item) => item.status === "Em andamento").length,
    concluidos: lista.filter((item) => estaConcluido(item.status)).length,
    avaliados: lista.filter(
      (item) => item.nota !== null && item.nota !== undefined,
    ).length,
  };
}

function tentativaConclusao(item: TreinamentoPoc) {
  if (!estaConcluido(item.status))
    return `${item.tentativas} tentativa${item.tentativas === 1 ? "" : "s"}`;
  if (item.tentativas <= 1) return "Concluiu na 1ª tentativa";
  return `Concluiu na ${item.tentativas}ª tentativa`;
}

export default function TreinamentosPocSep006() {
  const [lista, setLista] = useState<TreinamentoPoc[]>([]);
  const [busca, setBusca] = useState("");
  const [status, setStatus] = useState("Todos");
  const [mensagem, setMensagem] = useState("");
  const [enviandoId, setEnviandoId] = useState<number | null>(null);
  const [baixandoCertificados, setBaixandoCertificados] = useState(false);
  const podeExcluir = perfilAtual() === PERFIS.SUPER_ADMIN;

  async function carregar() {
    const response = await api.get("/treinamentos-poc-sep-006");
    setLista(Array.isArray(response.data) ? response.data : []);
  }

  async function reenviarEmail(item: TreinamentoPoc) {
    setEnviandoId(item.id);
    setMensagem("");
    try {
      const response = await api.post(
        `/treinamentos-poc-sep-006/${item.id}/reenviar-email`,
      );
      setLista((atual) =>
        atual.map((treinamento) =>
          treinamento.id === item.id ? response.data.treinamento : treinamento,
        ),
      );
      setMensagem(response.data.mensagem || "E-mail enviado com sucesso.");
    } catch (error: any) {
      setMensagem(
        error.response?.data?.error || "Não foi possível reenviar o e-mail.",
      );
    } finally {
      setEnviandoId(null);
    }
  }

  async function excluirTreinamento(item: TreinamentoPoc) {
    if (
      !confirm(
        `Deseja excluir o treinamento POC-SEP-006 de ${item.nomeCompleto}?`,
      )
    )
      return;
    await api.delete(`/treinamentos-poc-sep-006/${item.id}`);
    setLista((atual) =>
      atual.filter((treinamento) => treinamento.id !== item.id),
    );
    setMensagem("Treinamento excluído com sucesso.");
  }

  async function baixarCertificados() {
    setBaixandoCertificados(true);
    setMensagem("");
    try {
      const response = await api.get(
        "/treinamentos-poc-sep-006/certificados.zip",
        {
          responseType: "blob",
        },
      );
      const url = URL.createObjectURL(response.data);
      const link = document.createElement("a");
      link.href = url;
      link.download = `certificados-poc-sep-006-${new Date().getFullYear()}.zip`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch {
      setMensagem("Não foi possível baixar os certificados.");
    } finally {
      setBaixandoCertificados(false);
    }
  }

  useEffect(() => {
    carregar().catch(() => undefined);
  }, []);

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return lista.filter((item) => {
      const okStatus =
        status === "Todos" ||
        item.status === status ||
        (status === "Concluido" && estaConcluido(item.status));
      const okBusca =
        !termo ||
        [
          item.nomeCompleto,
          item.cpf,
          item.email,
          item.cargo,
          item.departamento,
          item.unidade,
          item.empresa,
          item.codigo,
        ]
          .join(" ")
          .toLowerCase()
          .includes(termo);
      return okStatus && okBusca;
    });
  }, [lista, busca, status]);

  const indicadores = useMemo(() => criarIndicadores(lista), [lista]);
  const cardsIndicadores = [
    { label: "Total", valor: indicadores.total, Icone: Award },
    { label: "Em andamento", valor: indicadores.andamento, Icone: Clock3 },
    { label: "Concluídos", valor: indicadores.concluidos, Icone: CheckCircle2 },
    { label: "Avaliados", valor: indicadores.avaliados, Icone: FileText },
  ];

  return (
    <div className="space-y-6">
      <section className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-5 dark:border-slate-800">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.28em] text-blue-600 dark:text-blue-300">
            Treinamentos
          </p>
          <h1 className="mt-2 text-3xl font-black text-slate-900 dark:text-white">
            POC-SEP-006
          </h1>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Controle de progresso, avaliação e conclusão do treinamento do CCOS.
          </p>
        </div>
        <div className="flex flex-wrap justify-end gap-3">
          <button
            type="button"
            onClick={baixarCertificados}
            disabled={baixandoCertificados || indicadores.concluidos === 0}
            className="inline-flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500 px-4 py-3 text-sm font-black text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Download size={18} />{" "}
            {baixandoCertificados
              ? "Gerando ZIP..."
              : "Baixar todos os certificados"}
          </button>
          <a
            href="/treinamento-poc-sep-006"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-black text-white hover:bg-blue-700"
          >
            <PlayCircle size={18} /> Abrir página pública
          </a>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        {cardsIndicadores.map(({ label, valor, Icone }) => (
          <div
            key={label}
            className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
          >
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
                {label}
              </p>
              <Icone className="h-5 w-5 text-blue-500" />
            </div>
            <p className="mt-3 text-2xl font-black text-slate-900 dark:text-white">
              {valor}
            </p>
          </div>
        ))}
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        {mensagem && (
          <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-black text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-100">
            {mensagem}
          </div>
        )}

        <div className="mb-4 flex flex-wrap items-center gap-3">
          <div className="relative min-w-72 flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por nome, CPF, e-mail, cargo, departamento, unidade ou certificado"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm font-semibold outline-none focus:border-blue-400 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            />
          </div>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
          >
            <option>Todos</option>
            <option>Em andamento</option>
            <option>Reprovado</option>
            <option value="Concluido">Concluído</option>
          </select>
          <button
            type="button"
            onClick={baixarCertificados}
            disabled={baixandoCertificados || indicadores.concluidos === 0}
            className="inline-flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm font-black text-emerald-700 transition hover:bg-emerald-600 hover:text-white disabled:cursor-not-allowed disabled:opacity-50 dark:text-emerald-200"
          >
            <Download size={18} />{" "}
            {baixandoCertificados ? "Gerando ZIP..." : "Baixar certificados"}
          </button>
        </div>

        <div className="max-h-[620px] overflow-auto rounded-xl border border-slate-200 dark:border-slate-800">
          <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
            <thead className="sticky top-0 bg-slate-100 text-left text-xs uppercase tracking-[0.12em] text-slate-500 dark:bg-slate-950">
              <tr>
                <th className="px-4 py-3">Colaborador</th>
                <th className="px-4 py-3">Setor</th>
                <th className="px-4 py-3">Etapa</th>
                <th className="px-4 py-3">Progresso</th>
                <th className="px-4 py-3">Avaliação</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Último acesso</th>
                <th className="px-4 py-3">Certificado</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filtrados.map((item) => (
                <tr
                  key={item.id}
                  className="hover:bg-slate-50 dark:hover:bg-slate-800/60"
                >
                  <td className="px-4 py-3">
                    <p className="font-black text-slate-900 dark:text-white">
                      {item.nomeCompleto}
                    </p>
                    <p className="text-xs text-slate-500">
                      {item.cpf || "-"} - {item.email}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-bold text-slate-700 dark:text-slate-200">
                      {item.departamento || "-"}
                    </p>
                    <p className="text-xs text-slate-500">
                      {item.cargo || "-"} | {item.unidade || "-"}
                    </p>
                  </td>
                  <td className="px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">
                    {Math.min(item.etapaAtual, 7)} de 7
                  </td>
                  <td className="px-4 py-3">
                    <div className="h-2 w-32 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                      <div
                        className="h-full bg-blue-500"
                        style={{ width: `${item.porcentagem}%` }}
                      />
                    </div>
                    <p className="mt-1 text-xs font-bold text-slate-500">
                      {item.porcentagem}%
                    </p>
                  </td>
                  <td className="px-4 py-3 text-xs font-bold text-slate-500">
                    <p>Nota: {item.nota ?? "-"}</p>
                    <p>{tentativaConclusao(item)}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full border px-3 py-1 text-xs font-black ${classeStatus(item.status)}`}
                    >
                      {item.status}
                    </span>
                    <p className="mt-2 inline-flex items-center gap-1 text-xs text-slate-500">
                      <Mail size={12} /> {item.emailStatus || "E-mail pendente"}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {data(item.ultimoAcessoEm)}
                  </td>
                  <td className="px-4 py-3 text-xs font-black text-slate-600 dark:text-slate-300">
                    {item.certificadoUrl ? (
                      <a
                        href={item.certificadoUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-xs font-black text-white hover:bg-blue-700"
                      >
                        PDF
                      </a>
                    ) : (
                      item.codigo || "Não emitido"
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex flex-wrap justify-end gap-2">
                      {item.porcentagem === 100 &&
                        estaConcluido(item.status) && (
                          <button
                            type="button"
                            onClick={() => reenviarEmail(item)}
                            disabled={enviandoId === item.id}
                            className="inline-flex items-center gap-2 rounded-lg border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 text-xs font-black text-emerald-700 transition hover:bg-emerald-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-60 dark:text-emerald-200"
                            title="Reenviar por e-mail"
                          >
                            <Mail size={14} />{" "}
                            {enviandoId === item.id ? "Enviando..." : "Enviar"}
                          </button>
                        )}
                      {podeExcluir && (
                        <button
                          type="button"
                          onClick={() => excluirTreinamento(item)}
                          className="inline-flex items-center gap-2 rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2 text-xs font-black text-red-700 transition hover:bg-red-500 hover:text-white dark:text-red-200"
                          title="Excluir treinamento"
                        >
                          <Trash2 size={14} /> Excluir
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {!filtrados.length && (
                <tr>
                  <td
                    colSpan={9}
                    className="px-4 py-10 text-center text-sm font-semibold text-slate-500"
                  >
                    Nenhum treinamento encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
