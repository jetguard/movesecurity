import { useEffect, useState } from "react";
import { Activity, Clock, Database, Download, FileText, Lock, RefreshCw, Server, ShieldCheck } from "lucide-react";
import { api } from "../services/api";

type GovernancaStatus = {
  ambiente: {
    nodeEnv: string;
    api: string;
    banco: string;
    sqlitePath: string;
    uploads: string;
    ultimoBackup: string;
  };
  seguranca: {
    jwtSecret: string;
    databaseUrl: string;
    superAdminPassword: string;
    corsRestrito: string;
    jwtExpiracao: string;
    maxTentativasLogin: number;
    bloqueioLoginMinutos: number;
    inatividadeSessaoMinutos: number;
  };
  automacaoExecutiva: Array<{
    nome: string;
    frequencia: string;
    conteudo: string;
    status: string;
  }>;
  indicadores: {
    ocorrencias: number;
    eventos: number;
    investigacoes: number;
    riscosCriticos: number;
    camerasOffline: number;
    logsHoje: number;
  };
  recomendacoes: string[];
  atualizadoEm: string;
};

const indicadorClasses = "rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900";

export default function Governanca() {
  const [dados, setDados] = useState<GovernancaStatus | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [backup, setBackup] = useState("");
  const [gerandoBackup, setGerandoBackup] = useState(false);

  async function carregar() {
    setCarregando(true);
    const response = await api.get("/governanca/saude");
    setDados(response.data);
    setCarregando(false);
  }

  async function gerarBackup() {
    if (!confirm("Deseja gerar um backup local do banco de dados agora?")) return;

    setGerandoBackup(true);
    try {
      const response = await api.post("/governanca/backup");
      setBackup(response.data.arquivo);
      await carregar();
    } finally {
      setGerandoBackup(false);
    }
  }

  useEffect(() => {
    carregar().catch(() => setCarregando(false));
  }, []);

  if (carregando) {
    return (
      <div className="rounded-2xl bg-white p-8 text-slate-500 shadow-sm dark:bg-slate-900 dark:text-slate-300">
        Carregando governanca do ambiente...
      </div>
    );
  }

  if (!dados) {
    return (
      <div className="rounded-2xl bg-white p-8 text-red-600 shadow-sm dark:bg-slate-900">
        Nao foi possivel consultar a governanca do sistema.
      </div>
    );
  }

  const indicadores = [
    { label: "Ocorrencias", valor: dados.indicadores.ocorrencias, icon: FileText },
    { label: "Eventos", valor: dados.indicadores.eventos, icon: Activity },
    { label: "Investigacoes", valor: dados.indicadores.investigacoes, icon: ShieldCheck },
    { label: "Riscos criticos", valor: dados.indicadores.riscosCriticos, icon: Lock },
    { label: "Cameras offline", valor: dados.indicadores.camerasOffline, icon: Server },
    { label: "Logs hoje", valor: dados.indicadores.logsHoje, icon: Clock },
  ];

  const seguranca = [
    ["JWT Secret", dados.seguranca.jwtSecret],
    ["DATABASE_URL", dados.seguranca.databaseUrl],
    ["Senha Super Admin", dados.seguranca.superAdminPassword],
    ["CORS restrito", dados.seguranca.corsRestrito],
    ["Expiracao JWT", dados.seguranca.jwtExpiracao],
    ["Tentativas de login", `${dados.seguranca.maxTentativasLogin}`],
    ["Bloqueio por falha", `${dados.seguranca.bloqueioLoginMinutos} min`],
    ["Inatividade de sessao", `${dados.seguranca.inatividadeSessaoMinutos} min`],
  ];

  return (
    <div className="space-y-6 text-slate-900 dark:text-slate-100">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-300">Administracao</p>
          <h1 className="text-2xl font-bold sm:text-3xl">Governanca e Producao</h1>
          <p className="mt-1 max-w-3xl text-sm text-slate-500 dark:text-slate-400">
            Monitoramento tecnico do ambiente, politicas de seguranca, backup local e automacao executiva do JetGuard.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={carregar}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
          >
            <RefreshCw size={18} />
            Atualizar
          </button>
          <button
            type="button"
            disabled={gerandoBackup}
            onClick={gerarBackup}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white shadow-sm hover:bg-blue-700 disabled:bg-slate-400"
          >
            <Download size={18} />
            {gerandoBackup ? "Gerando..." : "Gerar backup"}
          </button>
        </div>
      </div>

      {backup && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200">
          Backup gerado: {backup}
        </div>
      )}

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-6">
        {indicadores.map((item) => {
          const Icone = item.icon;
          return (
            <div key={item.label} className={indicadorClasses}>
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-300">
                <Icone size={21} />
              </div>
              <p className="text-3xl font-bold">{item.valor}</p>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{item.label}</p>
            </div>
          );
        })}
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_1.15fr]">
        <div className={indicadorClasses}>
          <div className="mb-5 flex items-center gap-3">
            <Server className="text-blue-600 dark:text-blue-300" size={22} />
            <h2 className="text-lg font-bold">Saude do ambiente</h2>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {Object.entries(dados.ambiente).map(([chave, valor]) => (
              <div key={chave} className="rounded-xl bg-slate-50 p-4 dark:bg-slate-950">
                <p className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">{chave}</p>
                <p className="mt-1 break-words font-bold">{valor}</p>
              </div>
            ))}
          </div>
        </div>

        <div className={indicadorClasses}>
          <div className="mb-5 flex items-center gap-3">
            <Lock className="text-blue-600 dark:text-blue-300" size={22} />
            <h2 className="text-lg font-bold">Politicas de seguranca</h2>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {seguranca.map(([label, valor]) => (
              <div key={label} className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 p-4 dark:bg-slate-950">
                <span className="text-sm text-slate-500 dark:text-slate-400">{label}</span>
                <span className="text-right text-sm font-bold">{valor}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className={indicadorClasses}>
          <div className="mb-5 flex items-center gap-3">
            <Database className="text-blue-600 dark:text-blue-300" size={22} />
            <h2 className="text-lg font-bold">Automacao executiva</h2>
          </div>
          <div className="space-y-3">
            {dados.automacaoExecutiva.map((item) => (
              <div key={item.nome} className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="font-bold">{item.nome}</p>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{item.conteudo}</p>
                  </div>
                  <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700 dark:bg-blue-950 dark:text-blue-200">
                    {item.frequencia}
                  </span>
                </div>
                <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">{item.status}</p>
              </div>
            ))}
          </div>
        </div>

        <div className={indicadorClasses}>
          <div className="mb-5 flex items-center gap-3">
            <ShieldCheck className="text-blue-600 dark:text-blue-300" size={22} />
            <h2 className="text-lg font-bold">Checklist de producao</h2>
          </div>
          <div className="space-y-3">
            {dados.recomendacoes.map((item) => (
              <div key={item} className="rounded-xl bg-slate-50 p-4 text-sm text-slate-700 dark:bg-slate-950 dark:text-slate-300">
                {item}
              </div>
            ))}
          </div>
          <p className="mt-5 text-xs text-slate-500 dark:text-slate-400">
            Ultima atualizacao: {new Date(dados.atualizadoEm).toLocaleString("pt-BR")}
          </p>
        </div>
      </section>
    </div>
  );
}
