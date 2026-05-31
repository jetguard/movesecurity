import { useEffect, useState } from "react";
import { AlertTriangle, Archive, Database, FileWarning, RefreshCw, ShieldCheck } from "lucide-react";
import { api } from "../services/api";
import { SkeletonPage } from "../components/ui/Skeleton";

type Integridade = {
  resumo: {
    evidenciasBanco: number;
    arquivosDisco: number;
    arquivosOrfaos: number;
    arquivosAusentes: number;
    evidenciasSemHash: number;
    backups: number;
    sessoesAtivas: number;
    sessoesHistoricas: number;
    falhasLoginHoje: number;
    alertas: number;
  };
  alertas: string[];
  arquivosOrfaos: string[];
  arquivosAusentes: Array<{ modulo: string; id: number; caminho: string; unidade: string; codigo: string }>;
  evidenciasSemHash: Array<{ modulo: string; id: number; caminho: string; unidade: string; codigo: string }>;
  backups: Array<{ arquivo: string; tamanhoMb: number; criadoEm: string }>;
  atualizadoEm: string;
};

const card = "rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900";

export default function IntegridadeSistema() {
  const [dados, setDados] = useState<Integridade | null>(null);
  const [carregando, setCarregando] = useState(true);

  async function carregar() {
    setCarregando(true);
    try {
      const response = await api.get("/sistema/integridade");
      setDados(response.data);
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregar();
  }, []);

  if (carregando) return <SkeletonPage />;

  if (!dados) {
    return <div className={card}>Não foi possível consultar a integridade do sistema.</div>;
  }

  const indicadores = [
    { label: "Evidências no banco", valor: dados.resumo.evidenciasBanco, icon: Database },
    { label: "Arquivos em uploads", valor: dados.resumo.arquivosDisco, icon: Archive },
    { label: "Arquivos órfãos", valor: dados.resumo.arquivosOrfaos, icon: FileWarning },
    { label: "Arquivos ausentes", valor: dados.resumo.arquivosAusentes, icon: AlertTriangle },
    { label: "Sem hash", valor: dados.resumo.evidenciasSemHash, icon: ShieldCheck },
    { label: "Backups locais", valor: dados.resumo.backups, icon: Archive },
  ];

  return (
    <div className="space-y-6 text-slate-900 dark:text-slate-100">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-300">Sistema</p>
          <h1 className="text-2xl font-bold sm:text-3xl">Integridade do Sistema</h1>
          <p className="mt-1 max-w-3xl text-sm text-slate-500 dark:text-slate-400">
            Auditoria técnica de evidências, uploads, backups, sessões e políticas críticas do JetGuard.
          </p>
        </div>
        <button
          type="button"
          onClick={carregar}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
        >
          <RefreshCw size={18} />
          Atualizar
        </button>
      </div>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-6">
        {indicadores.map((item) => {
          const Icone = item.icon;
          const alerta = ["Arquivos órfãos", "Arquivos ausentes", "Sem hash"].includes(item.label) && item.valor > 0;
          return (
            <div key={item.label} className={`${card} ${alerta ? "border-amber-300 dark:border-amber-700" : ""}`}>
              <div className={`mb-4 flex h-11 w-11 items-center justify-center rounded-xl ${alerta ? "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-200" : "bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-300"}`}>
                <Icone size={21} />
              </div>
              <p className="text-3xl font-bold">{item.valor}</p>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{item.label}</p>
            </div>
          );
        })}
      </section>

      {dados.alertas.length > 0 && (
        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">
          <h2 className="flex items-center gap-2 text-lg font-bold"><AlertTriangle size={20} /> Alertas de integridade</h2>
          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
            {dados.alertas.map((alerta) => (
              <div key={alerta} className="rounded-xl bg-white/70 p-4 text-sm font-semibold dark:bg-slate-950/40">{alerta}</div>
            ))}
          </div>
        </section>
      )}

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Lista titulo="Evidências sem hash" itens={dados.evidenciasSemHash.map((item) => `${item.modulo} ${item.codigo} | ${item.unidade} | ${item.caminho}`)} vazio="Todas as evidências possuem hash ou validação localizada." />
        <Lista titulo="Arquivos ausentes" itens={dados.arquivosAusentes.map((item) => `${item.modulo} ${item.codigo} | ${item.unidade} | ${item.caminho}`)} vazio="Nenhum registro aponta para arquivo ausente." />
        <Lista titulo="Arquivos órfãos" itens={dados.arquivosOrfaos} vazio="Nenhum arquivo órfão encontrado em uploads." />
      </section>

      <section className={card}>
        <h2 className="text-lg font-bold">Últimos backups locais</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-xs uppercase text-slate-500 dark:text-slate-400">
              <tr>
                <th className="px-3 py-2">Arquivo</th>
                <th className="px-3 py-2">Tamanho</th>
                <th className="px-3 py-2">Data</th>
              </tr>
            </thead>
            <tbody>
              {dados.backups.map((backup) => (
                <tr key={backup.arquivo} className="border-t border-slate-100 dark:border-slate-800">
                  <td className="px-3 py-3 font-semibold">{backup.arquivo}</td>
                  <td className="px-3 py-3">{backup.tamanhoMb} MB</td>
                  <td className="px-3 py-3">{new Date(backup.criadoEm).toLocaleString("pt-BR")}</td>
                </tr>
              ))}
              {dados.backups.length === 0 && (
                <tr><td className="px-3 py-4 text-slate-500" colSpan={3}>Nenhum backup local encontrado.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <p className="mt-4 text-xs text-slate-500 dark:text-slate-400">
          Última verificação: {new Date(dados.atualizadoEm).toLocaleString("pt-BR")}
        </p>
      </section>
    </div>
  );
}

function Lista({ titulo, itens, vazio }: { titulo: string; itens: string[]; vazio: string }) {
  return (
    <div className={card}>
      <h2 className="text-lg font-bold">{titulo}</h2>
      <div className="mt-4 max-h-96 space-y-2 overflow-auto pr-1">
        {itens.slice(0, 50).map((item) => (
          <div key={item} className="break-all rounded-xl bg-slate-50 p-3 text-xs text-slate-700 dark:bg-slate-950 dark:text-slate-300">
            {item}
          </div>
        ))}
        {itens.length === 0 && <p className="text-sm text-slate-500 dark:text-slate-400">{vazio}</p>}
      </div>
    </div>
  );
}
