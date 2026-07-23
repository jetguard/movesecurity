import { useEffect, useMemo, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { Award, CheckCircle2, Clock3, Download, Mail, PlayCircle, Search, Trash2 } from "lucide-react";
import { api } from "../services/api";

type Treinamento = {
  id: number;
  codigo: string;
  nomeCompleto: string;
  cpf: string;
  empresa: string;
  cargo: string;
  email: string;
  telefone: string;
  etapa: string;
  status: string;
  progressoSegundos: number;
  duracaoSegundos: number;
  videoConcluido: boolean;
  certificadoUrl?: string | null;
  emailStatus?: string | null;
  emailEnviadoEm?: string | null;
  concluidoEm?: string | null;
  ultimoAcessoEm: string;
  createdAt: string;
};

function data(valor?: string | null) {
  return valor ? new Date(valor).toLocaleString("pt-BR") : "-";
}

function progresso(item: Treinamento) {
  if (item.status === "Concluído") return 100;
  if (!item.duracaoSegundos) return 0;
  return Math.min(99, Math.round((item.progressoSegundos / item.duracaoSegundos) * 100));
}

function classeStatus(status: string) {
  if (status === "Concluído") return "border-emerald-400/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-200";
  return "border-blue-400/40 bg-blue-500/10 text-blue-700 dark:text-blue-200";
}

const cardsIndicadores: Array<[string, keyof ReturnType<typeof criarIndicadores>, LucideIcon]> = [
  ["Total", "total", Award],
  ["Em andamento", "andamento", Clock3],
  ["Concluídos", "concluidos", CheckCircle2],
  ["Certificados", "certificados", Download],
];

function criarIndicadores(lista: Treinamento[]) {
  return {
    total: lista.length,
    andamento: lista.filter((item) => item.status === "Em andamento").length,
    concluidos: lista.filter((item) => item.status === "Concluído").length,
    certificados: lista.filter((item) => item.certificadoUrl).length,
  };
}

export default function TreinamentosTerminal() {
  const [lista, setLista] = useState<Treinamento[]>([]);
  const [busca, setBusca] = useState("");
  const [status, setStatus] = useState("Todos");

  async function carregar() {
    const response = await api.get("/treinamentos-terminal");
    setLista(Array.isArray(response.data) ? response.data : []);
  }

  async function excluirTreinamento(item: Treinamento) {
    if (!confirm(`Deseja excluir o treinamento de ${item.nomeCompleto}?`)) return;
    await api.delete(`/treinamentos-terminal/${item.id}`);
    setLista((atual) => atual.filter((treinamento) => treinamento.id !== item.id));
  }

  useEffect(() => {
    carregar().catch(() => undefined);
  }, []);

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return lista.filter((item) => {
      const okStatus = status === "Todos" || item.status === status;
      const okBusca = !termo || [item.nomeCompleto, item.cpf, item.email, item.empresa, item.codigo].join(" ").toLowerCase().includes(termo);
      return okStatus && okBusca;
    });
  }, [lista, busca, status]);

  const indicadores = useMemo(() => criarIndicadores(lista), [lista]);

  return (
    <div className="space-y-6">
      <section className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-5 dark:border-slate-800">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.28em] text-blue-600 dark:text-blue-300">Acesso ao terminal</p>
          <h1 className="mt-2 text-3xl font-black text-slate-900 dark:text-white">Treinamentos públicos</h1>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Acompanhe participantes, progresso do vídeo, certificados e envio por e-mail.</p>
        </div>
        <a href="/treinamento-terminal" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-black text-white hover:bg-blue-700">
          <PlayCircle size={18} /> Abrir página pública
        </a>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        {cardsIndicadores.map(([label, chave, Icon]) => (
          <div key={label} className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">{label}</p>
              <Icon className="h-5 w-5 text-blue-500" />
            </div>
            <p className="mt-3 text-2xl font-black text-slate-900 dark:text-white">{indicadores[chave]}</p>
          </div>
        ))}
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-4 flex flex-wrap gap-3">
          <div className="relative min-w-72 flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por nome, CPF, e-mail, empresa ou certificado" className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm font-semibold outline-none focus:border-blue-400 dark:border-slate-700 dark:bg-slate-950 dark:text-white" />
          </div>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white">
            <option>Todos</option>
            <option>Em andamento</option>
            <option>Concluído</option>
          </select>
        </div>

        <div className="max-h-[620px] overflow-auto rounded-xl border border-slate-200 dark:border-slate-800">
          <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
            <thead className="sticky top-0 bg-slate-100 text-left text-xs uppercase tracking-[0.12em] text-slate-500 dark:bg-slate-950">
              <tr>
                <th className="px-4 py-3">Participante</th>
                <th className="px-4 py-3">Empresa / cargo</th>
                <th className="px-4 py-3">Etapa</th>
                <th className="px-4 py-3">Progresso</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Último acesso</th>
                <th className="px-4 py-3">Certificado</th>
                <th className="px-4 py-3 text-right">Acoes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filtrados.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/60">
                  <td className="px-4 py-3">
                    <p className="font-black text-slate-900 dark:text-white">{item.nomeCompleto}</p>
                    <p className="text-xs text-slate-500">{item.cpf} - {item.email}</p>
                    <p className="text-xs text-slate-500">{item.telefone}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-bold text-slate-700 dark:text-slate-200">{item.empresa}</p>
                    <p className="text-xs text-slate-500">{item.cargo}</p>
                  </td>
                  <td className="px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">{item.etapa}</td>
                  <td className="px-4 py-3">
                    <div className="h-2 w-32 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                      <div className="h-full bg-blue-500" style={{ width: `${progresso(item)}%` }} />
                    </div>
                    <p className="mt-1 text-xs font-bold text-slate-500">{progresso(item)}%</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full border px-3 py-1 text-xs font-black ${classeStatus(item.status)}`}>{item.status}</span>
                    <p className="mt-2 inline-flex items-center gap-1 text-xs text-slate-500"><Mail size={12} /> {item.emailStatus || "E-mail pendente"}</p>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">{data(item.ultimoAcessoEm)}</td>
                  <td className="px-4 py-3">
                    {item.certificadoUrl ? (
                      <a href={item.certificadoUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-xs font-black text-white hover:bg-blue-700">
                        <Download size={14} /> PDF
                      </a>
                    ) : (
                      <span className="text-xs text-slate-500">Não emitido</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => excluirTreinamento(item)}
                      className="inline-flex items-center gap-2 rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2 text-xs font-black text-red-700 transition hover:bg-red-500 hover:text-white dark:text-red-200"
                      title="Excluir treinamento"
                    >
                      <Trash2 size={14} /> Excluir
                    </button>
                  </td>
                </tr>
              ))}
              {!filtrados.length && (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-sm font-semibold text-slate-500">Nenhum treinamento encontrado.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
