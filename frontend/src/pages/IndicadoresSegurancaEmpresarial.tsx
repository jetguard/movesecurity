import { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  Camera,
  Image as ImageIcon,
  Maximize2,
  Minimize2,
  RefreshCw,
  ScanLine,
  ShieldCheck,
  ClipboardCheck,
  Shield,
  TrendingUp,
  Truck,
  Users,
  UserRoundCheck,
  AlertTriangle,
} from "lucide-react";
import { api } from "../services/api";

type IndicadorCard = {
  titulo: string;
  valor: string | number;
  detalhe?: string;
};

type RankingItem = {
  label: string;
  valor: number;
};

type BlocoIndicadores = {
  cards: IndicadorCard[];
  rankings: Record<string, RankingItem[]>;
};

type DadosIndicadores = {
  atualizadoEm: string;
  unidade: string;
  ocorrenciasEventos: BlocoIndicadores;
  scanner: BlocoIndicadores;
  ocr: BlocoIndicadores;
  entradaSaida: BlocoIndicadores;
  vigilancia: BlocoIndicadores;
  balanca: BlocoIndicadores;
  acesso: BlocoIndicadores;
  motoristas: BlocoIndicadores;
  filas: BlocoIndicadores;
  solicitacoesImagens: BlocoIndicadores;
  camerasCftv: BlocoIndicadores;
};

type AbaIndicador = {
  id: keyof Omit<DadosIndicadores, "atualizadoEm" | "unidade">;
  titulo: string;
  subtitulo: string;
  icone: typeof BarChart3;
  cor: string;
};

const abas: AbaIndicador[] = [
  {
    id: "ocorrenciasEventos",
    titulo: "Ocorrências e eventos",
    subtitulo: "Indicadores gerais do dashboard operacional",
    icone: ShieldCheck,
    cor: "from-blue-500 to-cyan-400",
  },
  {
    id: "scanner",
    titulo: "Scanner",
    subtitulo: "Passagens, falhas, suspeitas e disponibilidade",
    icone: ScanLine,
    cor: "from-emerald-500 to-lime-400",
  },
  {
    id: "ocr",
    titulo: "OCR",
    subtitulo: "Leituras, assertividade e indisponibilidade",
    icone: ClipboardCheck,
    cor: "from-indigo-500 to-blue-400",
  },
  {
    id: "entradaSaida",
    titulo: "Entrada e saída",
    subtitulo: "Auditorias, lacres, divergências e conformidade",
    icone: Truck,
    cor: "from-cyan-500 to-blue-400",
  },
  {
    id: "balanca",
    titulo: "Balança",
    subtitulo: "Atendimentos, paradas e contingências",
    icone: BarChart3,
    cor: "from-orange-500 to-amber-400",
  },
  {
    id: "vigilancia",
    titulo: "Vigilância patrimonial",
    subtitulo: "Efetivo, rondas, cobertura e desvios",
    icone: Shield,
    cor: "from-slate-500 to-blue-500",
  },
  {
    id: "acesso",
    titulo: "Acesso",
    subtitulo: "Pessoas, veículos leves e irregularidades",
    icone: Users,
    cor: "from-violet-500 to-blue-400",
  },
  {
    id: "motoristas",
    titulo: "Motoristas",
    subtitulo: "Cadastros, bloqueios e conformidade documental",
    icone: UserRoundCheck,
    cor: "from-teal-500 to-cyan-400",
  },
  {
    id: "filas",
    titulo: "Filas e paradas",
    subtitulo: "Impactos, contingências e reincidência",
    icone: AlertTriangle,
    cor: "from-red-500 to-orange-400",
  },
  {
    id: "solicitacoesImagens",
    titulo: "Solicitações de imagens",
    subtitulo: "Atendimentos, status e evidências",
    icone: ImageIcon,
    cor: "from-fuchsia-500 to-violet-400",
  },
  {
    id: "camerasCftv",
    titulo: "Câmeras CFTV",
    subtitulo: "Conectividade, falhas e áreas monitoradas",
    icone: Camera,
    cor: "from-amber-500 to-orange-400",
  },
];

function formatarData(valor?: string) {
  if (!valor) return "--";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(valor));
}

function normalizarTitulo(valor: string) {
  return valor
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (letra) => letra.toUpperCase())
    .trim();
}

export default function IndicadoresSegurancaEmpresarial() {
  const [dados, setDados] = useState<DadosIndicadores | null>(null);
  const [abaAtiva, setAbaAtiva] = useState<AbaIndicador["id"]>("ocorrenciasEventos");
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [estendido, setEstendido] = useState(false);

  async function carregarIndicadores() {
    try {
      setErro("");
      const resposta = await api.get<DadosIndicadores>("/indicadores-seguranca-empresarial");
      setDados(resposta.data);
    } catch (error) {
      console.error("Erro ao carregar indicadores de segurança empresarial:", error);
      setErro("Não foi possível carregar os indicadores agora.");
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregarIndicadores();
    const intervalo = window.setInterval(carregarIndicadores, 30000);
    return () => window.clearInterval(intervalo);
  }, []);

  useEffect(() => {
    document.body.classList.toggle("overflow-hidden", estendido);
    return () => document.body.classList.remove("overflow-hidden");
  }, [estendido]);

  const aba = abas.find((item) => item.id === abaAtiva) || abas[0];
  const bloco = dados?.[aba.id];
  const rankings = useMemo(() => Object.entries(bloco?.rankings || {}), [bloco]);
  const IconeAba = aba.icone;

  const conteudo = (
    <div
      className={`min-h-screen bg-slate-950 text-white ${
        estendido ? "fixed inset-0 z-[80] overflow-y-auto p-4 sm:p-6" : "rounded-3xl border border-slate-800 p-4 shadow-2xl sm:p-6"
      }`}
    >
      <div className="mb-5 flex flex-col gap-4 border-b border-slate-800 pb-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-4">
          <div className={`flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${aba.cor} shadow-lg`}>
            <IconeAba size={28} />
          </div>
          <div>
            <p className="text-xs font-black uppercase tracking-[0.32em] text-blue-300">
              Segurança empresarial
            </p>
            <h1 className="text-2xl font-black text-white sm:text-3xl">
              Indicadores Segurança Empresarial
            </h1>
            <p className="text-sm text-slate-300">
              Painel consolidado para acompanhamento contínuo do setor.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="rounded-2xl border border-slate-700 bg-slate-900/70 px-4 py-2">
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400">
              Unidade
            </p>
            <p className="text-sm font-black text-white">{dados?.unidade || "--"}</p>
          </div>
          <div className="rounded-2xl border border-slate-700 bg-slate-900/70 px-4 py-2">
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400">
              Atualizado
            </p>
            <p className="text-sm font-black text-white">{formatarData(dados?.atualizadoEm)}</p>
          </div>
          <button
            type="button"
            onClick={carregarIndicadores}
            className="inline-flex h-11 items-center gap-2 rounded-2xl border border-slate-700 bg-slate-900 px-4 text-sm font-bold text-slate-100 transition hover:border-blue-400 hover:bg-blue-600"
          >
            <RefreshCw size={16} />
            Atualizar
          </button>
          <button
            type="button"
            onClick={() => setEstendido((valor) => !valor)}
            className="inline-flex h-11 items-center gap-2 rounded-2xl bg-blue-600 px-4 text-sm font-black text-white shadow-lg shadow-blue-950/30 transition hover:bg-blue-500"
          >
            {estendido ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            {estendido ? "Sair da tela estendida" : "Estender tela"}
          </button>
        </div>
      </div>

      <div className="mb-5 flex gap-2 overflow-x-auto pb-2 [scrollbar-width:thin]">
        {abas.map((item) => {
          const Icone = item.icone;
          const ativo = item.id === abaAtiva;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setAbaAtiva(item.id)}
              className={`flex min-w-[220px] items-center gap-3 rounded-2xl border px-4 py-3 text-left transition ${
                ativo
                  ? "border-blue-400 bg-blue-600/20 text-white"
                  : "border-slate-800 bg-slate-900/70 text-slate-300 hover:border-slate-600"
              }`}
            >
              <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${item.cor}`}>
                <Icone size={20} />
              </span>
              <span>
                <span className="block text-sm font-black">{item.titulo}</span>
                <span className="block text-xs text-slate-400">{item.subtitulo}</span>
              </span>
            </button>
          );
        })}
      </div>

      {erro && (
        <div className="mb-5 rounded-2xl border border-red-500/40 bg-red-950/50 px-4 py-3 text-sm font-bold text-red-100">
          {erro}
        </div>
      )}

      {carregando ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="h-32 animate-pulse rounded-2xl border border-slate-800 bg-slate-900" />
          ))}
        </div>
      ) : (
        <>
          <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
            {(bloco?.cards || []).map((card) => (
              <div
                key={card.titulo}
                className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 shadow-lg shadow-slate-950/30"
              >
                <div className="mb-4 flex items-center justify-between gap-3">
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
                    {card.titulo}
                  </p>
                  <TrendingUp size={18} className="text-blue-300" />
                </div>
                <p className="text-3xl font-black text-white">{card.valor}</p>
                {card.detalhe && <p className="mt-2 text-xs text-slate-400">{card.detalhe}</p>}
              </div>
            ))}
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            {rankings.map(([titulo, itens]) => (
              <div
                key={titulo}
                className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 shadow-lg shadow-slate-950/30"
              >
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.22em] text-blue-300">
                      Ranking
                    </p>
                    <h2 className="text-lg font-black text-white">
                      {normalizarTitulo(titulo)}
                    </h2>
                  </div>
                  <BarChart3 className="text-slate-400" size={22} />
                </div>
                {itens.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-700 px-4 py-8 text-center text-sm text-slate-400">
                    Nenhum dado encontrado para este indicador.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {itens.map((item, index) => {
                      const maior = Math.max(...itens.map((registro) => registro.valor), 1);
                      const largura = Math.max(8, (item.valor / maior) * 100);
                      return (
                        <div key={`${item.label}-${index}`}>
                          <div className="mb-1 flex items-center justify-between gap-3 text-sm">
                            <span className="line-clamp-1 font-bold text-slate-100">
                              {item.label}
                            </span>
                            <span className="font-black text-white">{item.valor}</span>
                          </div>
                          <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                            <div
                              className={`h-full rounded-full bg-gradient-to-r ${aba.cor}`}
                              style={{ width: `${largura}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );

  if (estendido) {
    return conteudo;
  }

  return <div className="bg-slate-950 p-3 sm:p-6">{conteudo}</div>;
}
