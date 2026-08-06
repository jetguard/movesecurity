import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  Clock3,
  Database,
  Download,
  FileText,
  HardDrive,
  KeyRound,
  LockKeyhole,
  RefreshCw,
  Server,
  ShieldCheck,
  Users,
  Video,
} from "lucide-react";
import { api } from "../services/api";
import { SkeletonPage } from "../components/ui/Skeleton";

type AbaGovernanca = "operacional" | "seguranca" | "plataforma";

type GovernancaStatus = {
  unidade?: string;
  permissoes: {
    operacional: boolean;
    seguranca: boolean;
    plataforma: boolean;
  };
  ambiente?: {
    nodeEnv: string;
    api: string;
    banco: string;
    sqlitePath: string;
    uploads: string;
    ultimoBackup: string;
  };
  seguranca?: {
    jwtSecret: string;
    databaseUrl: string;
    superAdminPassword: string;
    corsRestrito: string;
    jwtExpiracao: string;
    maxTentativasLogin: number;
    bloqueioLoginMinutos: number;
    inatividadeSessaoMinutos: number;
    sessoesAtivas: number;
    eventosSegurancaHoje: number;
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
  producao?: Record<
    string,
    {
      status?: string;
      recomendacao?: string;
      comandos?: string[];
      api?: string;
      banco?: string;
      uploads?: string;
    }
  >;
  recomendacoes?: string[];
  atualizadoEm: string;
};

const painel = "rounded-xl border border-slate-800 bg-slate-900 p-5 shadow-sm";
const bloco = "rounded-lg border border-slate-800 bg-slate-950/70 p-4";

function statusSaudavel(valor?: string) {
  const texto = String(valor || "").toLowerCase();
  return [
    "online",
    "configurado",
    "disponível",
    "ativo",
    "encontrado",
    "base ativa",
  ].some((status) => texto.includes(status));
}

export default function Governanca() {
  const [dados, setDados] = useState<GovernancaStatus | null>(null);
  const [aba, setAba] = useState<AbaGovernanca>("operacional");
  const [carregando, setCarregando] = useState(true);
  const [backup, setBackup] = useState("");
  const [gerandoBackup, setGerandoBackup] = useState(false);
  const [erro, setErro] = useState("");

  async function carregar() {
    setCarregando(true);
    setErro("");
    try {
      const response = await api.get("/governanca/saude");
      setDados(response.data);
    } catch (error) {
      setDados(null);
      setErro(
        axios.isAxiosError(error)
          ? error.response?.data?.error ||
              "Não foi possível consultar a governança do sistema."
          : "Não foi possível consultar a governança do sistema.",
      );
    } finally {
      setCarregando(false);
    }
  }

  async function gerarBackup() {
    if (!confirm("Deseja gerar um backup local do banco de dados agora?")) {
      return;
    }

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
    carregar();
  }, []);

  const abas = useMemo(
    () =>
      [
        {
          id: "operacional" as const,
          titulo: "Governança Operacional",
          descricao: "Operação, indicadores e decisões do cliente",
          icon: BarChart3,
          permitido: dados?.permissoes.operacional,
        },
        {
          id: "seguranca" as const,
          titulo: "Governança de Segurança",
          descricao: "Proteção de dados, acessos e sessões",
          icon: ShieldCheck,
          permitido: dados?.permissoes.seguranca,
        },
        {
          id: "plataforma" as const,
          titulo: "Saúde da Plataforma",
          descricao: "Health Check técnico do ambiente JetGuard",
          icon: Server,
          permitido: dados?.permissoes.plataforma,
        },
      ].filter((item) => item.permitido),
    [dados],
  );

  if (carregando) return <SkeletonPage />;

  if (!dados) {
    return (
      <div className="rounded-xl border border-red-900 bg-red-950/30 p-8 text-red-200">
        {erro || "Não foi possível consultar a governança do sistema."}
      </div>
    );
  }

  const indicadores = [
    {
      label: "Ocorrências",
      valor: dados.indicadores.ocorrencias,
      icon: FileText,
      cor: "text-blue-300 bg-blue-950/70",
    },
    {
      label: "Eventos",
      valor: dados.indicadores.eventos,
      icon: Activity,
      cor: "text-cyan-300 bg-cyan-950/70",
    },
    {
      label: "Investigações",
      valor: dados.indicadores.investigacoes,
      icon: ShieldCheck,
      cor: "text-violet-300 bg-violet-950/70",
    },
    {
      label: "Riscos críticos",
      valor: dados.indicadores.riscosCriticos,
      icon: AlertTriangle,
      cor: "text-amber-300 bg-amber-950/70",
    },
    {
      label: "CÃ¢meras offline",
      valor: dados.indicadores.camerasOffline,
      icon: Video,
      cor: "text-red-300 bg-red-950/70",
    },
    {
      label: "Movimentos hoje",
      valor: dados.indicadores.logsHoje,
      icon: Clock3,
      cor: "text-emerald-300 bg-emerald-950/70",
    },
  ];

  const politicas = dados.seguranca
    ? [
        ["JWT Secret", dados.seguranca.jwtSecret],
        ["DATABASE_URL", dados.seguranca.databaseUrl],
        ["Senha Super Admin", dados.seguranca.superAdminPassword],
        ["CORS restrito", dados.seguranca.corsRestrito],
        ["Expiração JWT", dados.seguranca.jwtExpiracao],
        ["Tentativas de login", String(dados.seguranca.maxTentativasLogin)],
        ["Bloqueio por falha", `${dados.seguranca.bloqueioLoginMinutos} min`],
        [
          "Bloqueio por inatividade",
          `${dados.seguranca.inatividadeSessaoMinutos} min`,
        ],
      ]
    : [];

  return (
    <div className="space-y-6 text-slate-100">
      <header className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-300">
            Centro de Governança
          </p>
          <h1 className="mt-2 text-2xl font-bold sm:text-3xl">
            Governança JetGuard
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
            Separe a gestão da operação, a proteção dos acessos e a saúde
            técnica da plataforma em visões próprias e auditáveis.
          </p>
        </div>
        <button
          type="button"
          onClick={carregar}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-4 text-sm font-bold text-slate-200 transition hover:border-blue-500 hover:bg-slate-800"
        >
          <RefreshCw size={17} />
          Atualizar indicadores
        </button>
      </header>

      <nav className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        {abas.map((item) => {
          const Icone = item.icon;
          const ativo = aba === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setAba(item.id)}
              className={`flex min-h-20 items-center gap-4 rounded-xl border p-4 text-left transition ${
                ativo
                  ? "border-blue-500 bg-blue-950/45 shadow-[0_12px_30px_rgba(37,99,235,0.13)]"
                  : "border-slate-800 bg-slate-900 hover:border-slate-600"
              }`}
            >
              <span
                className={`grid h-11 w-11 shrink-0 place-items-center rounded-lg ${
                  ativo
                    ? "bg-blue-600 text-white"
                    : "bg-slate-800 text-slate-300"
                }`}
              >
                <Icone size={21} />
              </span>
              <span>
                <strong className="block text-sm">{item.titulo}</strong>
                <span className="mt-1 block text-xs leading-5 text-slate-400">
                  {item.descricao}
                </span>
              </span>
            </button>
          );
        })}
      </nav>

      {aba === "operacional" && (
        <>
          <section className="flex flex-col gap-3 rounded-xl border border-blue-900/60 bg-blue-950/25 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-blue-300">
                Ambiente operacional
              </p>
              <h2 className="mt-1 text-lg font-bold">
                Unidade {dados.unidade || "atual"}
              </h2>
              <p className="mt-1 text-sm text-slate-400">
                Indicadores consolidados conforme o ambiente de trabalho
                selecionado no cabeçalho.
              </p>
            </div>
            <span className="rounded-full border border-emerald-800 bg-emerald-950/60 px-3 py-1.5 text-xs font-bold text-emerald-300">
              Monitoramento ativo
            </span>
          </section>

          <section className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
            {indicadores.map((item) => {
              const Icone = item.icon;
              return (
                <article key={item.label} className={painel}>
                  <span
                    className={`grid h-10 w-10 place-items-center rounded-lg ${item.cor}`}
                  >
                    <Icone size={19} />
                  </span>
                  <p className="mt-4 text-2xl font-bold">{item.valor}</p>
                  <p className="mt-1 text-xs text-slate-400">{item.label}</p>
                </article>
              );
            })}
          </section>

          <section className="grid grid-cols-1 gap-5 xl:grid-cols-[1.2fr_0.8fr]">
            <div className={painel}>
              <div className="mb-4 flex items-center gap-3">
                <BarChart3 className="text-blue-300" size={20} />
                <div>
                  <h2 className="font-bold">Automação executiva</h2>
                  <p className="text-xs text-slate-400">
                    Rotinas de consolidação e apoio à decisão.
                  </p>
                </div>
              </div>
              <div className="space-y-3">
                {dados.automacaoExecutiva.map((item) => (
                  <article key={item.nome} className={bloco}>
                    <div className="flex flex-col gap-2 sm:flex-row sm:justify-between">
                      <div>
                        <p className="font-bold">{item.nome}</p>
                        <p className="mt-1 text-sm leading-6 text-slate-400">
                          {item.conteudo}
                        </p>
                      </div>
                      <span className="h-fit rounded-full bg-blue-950 px-3 py-1 text-xs font-bold text-blue-300">
                        {item.frequencia}
                      </span>
                    </div>
                    <p className="mt-3 text-xs text-slate-500">{item.status}</p>
                  </article>
                ))}
              </div>
            </div>

            <div className={painel}>
              <div className="mb-4 flex items-center gap-3">
                <CheckCircle2 className="text-emerald-300" size={20} />
                <div>
                  <h2 className="font-bold">Direcionadores operacionais</h2>
                  <p className="text-xs text-slate-400">
                    Pontos para acompanhamento da gestão.
                  </p>
                </div>
              </div>
              <div className="space-y-3">
                {[
                  "Acompanhar registros aguardando análise ou aprovação.",
                  "Priorizar riscos críticos e câmeras desconectadas.",
                  "Monitorar reincidências, SLA e planos de ação.",
                  "Consolidar indicadores por unidade e equipe.",
                ].map((item) => (
                  <div
                    key={item}
                    className="flex gap-3 rounded-lg bg-slate-950/70 p-4 text-sm text-slate-300"
                  >
                    <CheckCircle2
                      className="mt-0.5 shrink-0 text-emerald-400"
                      size={16}
                    />
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </section>
        </>
      )}

      {aba === "seguranca" && dados.seguranca && (
        <>
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <article className={painel}>
              <Users className="text-blue-300" size={21} />
              <p className="mt-4 text-2xl font-bold">
                {dados.seguranca.sessoesAtivas}
              </p>
              <p className="text-xs text-slate-400">Sessões ativas</p>
            </article>
            <article className={painel}>
              <ShieldCheck className="text-amber-300" size={21} />
              <p className="mt-4 text-2xl font-bold">
                {dados.seguranca.eventosSegurancaHoje}
              </p>
              <p className="text-xs text-slate-400">
                Eventos de segurança hoje
              </p>
            </article>
            <article className={painel}>
              <LockKeyhole className="text-emerald-300" size={21} />
              <p className="mt-4 text-2xl font-bold">
                {dados.seguranca.inatividadeSessaoMinutos} min
              </p>
              <p className="text-xs text-slate-400">Bloqueio por inatividade</p>
            </article>
            <article className={painel}>
              <KeyRound className="text-violet-300" size={21} />
              <p className="mt-4 text-2xl font-bold">
                {dados.seguranca.maxTentativasLogin}
              </p>
              <p className="text-xs text-slate-400">Limite de tentativas</p>
            </article>
          </section>

          <section className="grid grid-cols-1 gap-5 xl:grid-cols-[1.15fr_0.85fr]">
            <div className={painel}>
              <div className="mb-4">
                <h2 className="font-bold">Políticas de proteção</h2>
                <p className="mt-1 text-xs text-slate-400">
                  Configurações sensíveis são exibidas apenas pelo estado, sem
                  revelar seus valores.
                </p>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {politicas.map(([label, valor]) => (
                  <div
                    key={label}
                    className="flex items-center justify-between gap-3 rounded-lg border border-slate-800 bg-slate-950/70 p-4"
                  >
                    <span className="text-sm text-slate-400">{label}</span>
                    <span
                      className={`text-right text-xs font-bold ${
                        statusSaudavel(valor)
                          ? "text-emerald-300"
                          : "text-amber-300"
                      }`}
                    >
                      {valor}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className={painel}>
              <h2 className="font-bold">Ações de segurança</h2>
              <p className="mt-1 text-xs text-slate-400">
                Acesse as áreas administrativas relacionadas.
              </p>
              <div className="mt-5 grid gap-3">
                <Link
                  to="/sessoes"
                  className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950/70 p-4 transition hover:border-blue-600"
                >
                  <span className="flex items-center gap-3">
                    <Users size={18} className="text-blue-300" />
                    <span>
                      <strong className="block text-sm">Sessões ativas</strong>
                      <small className="text-slate-500">
                        Consultar e desconectar acessos
                      </small>
                    </span>
                  </span>
                  <span className="text-blue-300">â†’</span>
                </Link>
                <Link
                  to="/logs"
                  className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950/70 p-4 transition hover:border-blue-600"
                >
                  <span className="flex items-center gap-3">
                    <FileText size={18} className="text-blue-300" />
                    <span>
                      <strong className="block text-sm">
                        Logs de auditoria
                      </strong>
                      <small className="text-slate-500">
                        Acessos, alterações e decisões
                      </small>
                    </span>
                  </span>
                  <span className="text-blue-300">â†’</span>
                </Link>
              </div>
            </div>
          </section>
        </>
      )}

      {aba === "plataforma" && dados.ambiente && (
        <>
          <section className="grid grid-cols-1 gap-5 xl:grid-cols-[0.9fr_1.1fr]">
            <div className={painel}>
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h2 className="font-bold">Health Check</h2>
                  <p className="mt-1 text-xs text-slate-400">
                    Estado atual dos componentes essenciais.
                  </p>
                </div>
                <span className="rounded-full border border-emerald-800 bg-emerald-950/50 px-3 py-1 text-xs font-bold text-emerald-300">
                  Ambiente consultado
                </span>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {Object.entries(dados.ambiente).map(([chave, valor]) => (
                  <div key={chave} className={bloco}>
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                      {chave}
                    </p>
                    <p
                      className={`mt-2 break-words text-sm font-bold ${
                        statusSaudavel(valor)
                          ? "text-emerald-300"
                          : "text-amber-300"
                      }`}
                    >
                      {valor}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className={painel}>
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h2 className="font-bold">Backup e continuidade</h2>
                  <p className="mt-1 text-xs text-slate-400">
                    Proteção local do banco de dados do ambiente.
                  </p>
                </div>
                <Database className="text-blue-300" size={22} />
              </div>
              <div className="rounded-lg border border-blue-900/60 bg-blue-950/20 p-4 text-sm leading-6 text-slate-300">
                O backup local cria uma cópia do banco SQLite na pasta{" "}
                <code className="text-blue-300">backend/backups</code>. Para
                produção, ele deve ser complementado por cópia externa e
                retenção automatizada.
              </div>
              <button
                type="button"
                disabled={gerandoBackup}
                onClick={gerarBackup}
                className="mt-4 inline-flex h-10 items-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-bold text-white transition hover:bg-blue-500 disabled:opacity-60"
              >
                <Download size={17} />
                {gerandoBackup ? "Gerando backup..." : "Gerar backup agora"}
              </button>
              {backup && (
                <p className="mt-3 text-xs font-semibold text-emerald-300">
                  Backup gerado: {backup}
                </p>
              )}
            </div>
          </section>

          {dados.producao && (
            <section className={painel}>
              <div className="mb-4 flex items-center gap-3">
                <HardDrive className="text-blue-300" size={21} />
                <div>
                  <h2 className="font-bold">Infraestrutura e produção</h2>
                  <p className="text-xs text-slate-400">
                    Preparação técnica e recomendações do ambiente.
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                {Object.entries(dados.producao).map(([chave, item]) => {
                  const status =
                    item.status ||
                    [item.api, item.banco, item.uploads]
                      .filter(Boolean)
                      .join(" | ");
                  return (
                    <article key={chave} className={bloco}>
                      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                        {chave}
                      </p>
                      <p
                        className={`mt-2 text-sm font-bold ${
                          statusSaudavel(status)
                            ? "text-emerald-300"
                            : "text-amber-300"
                        }`}
                      >
                        {status}
                      </p>
                      {item.recomendacao && (
                        <p className="mt-3 text-xs leading-5 text-slate-400">
                          {item.recomendacao}
                        </p>
                      )}
                    </article>
                  );
                })}
              </div>
            </section>
          )}

          <section className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_0.75fr]">
            <div className={painel}>
              <h2 className="font-bold">Recomendações de produção</h2>
              <div className="mt-4 space-y-3">
                {(dados.recomendacoes || []).map((item) => (
                  <div
                    key={item}
                    className="flex gap-3 rounded-lg bg-slate-950/70 p-4 text-sm text-slate-300"
                  >
                    <CheckCircle2
                      size={16}
                      className="mt-0.5 shrink-0 text-blue-300"
                    />
                    {item}
                  </div>
                ))}
              </div>
            </div>
            <div className={painel}>
              <h2 className="font-bold">Integridade técnica</h2>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                Consulte arquivos órfãos, evidências ausentes, quarentena e
                histórico de backups.
              </p>
              <Link
                to="/integridade"
                className="mt-5 inline-flex h-10 items-center gap-2 rounded-lg border border-slate-700 px-4 text-sm font-bold text-slate-200 transition hover:border-blue-500 hover:bg-slate-800"
              >
                <ShieldCheck size={17} />
                Abrir Integridade
              </Link>
            </div>
          </section>
        </>
      )}

      <p className="text-right text-xs text-slate-500">
        Última atualização:{" "}
        {new Date(dados.atualizadoEm).toLocaleString("pt-BR")}
      </p>
    </div>
  );
}
