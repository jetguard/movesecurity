import {
  AlertTriangle,
  Car,
  ChevronRight,
  CircleCheck,
  ClipboardCheck,
  Clock3,
  ScanLine,
  ShieldCheck,
  Truck,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../services/api";
import { temModulo, usuarioAtual, type UsuarioLocal } from "../utils/permissoes";

const modulosControleOperacional = [
  {
    titulo: "Equipe de Scanner",
    descricao: "Efetivo, atrasos e operação do equipamento.",
    rota: "/scanner",
    modulos: ["operacao_scanner", "operacao_equipe_scanner"],
    icone: ScanLine,
    cor: "from-emerald-500 to-green-600",
  },
  {
    titulo: "OCR",
    descricao: "Leituras, falhas e assertividade operacional.",
    rota: "/operacoes/operacao_ocr",
    modulos: ["operacao_ocr"],
    icone: ClipboardCheck,
    cor: "from-blue-500 to-blue-700",
  },
  {
    titulo: "Balança",
    descricao: "Atendimentos, paradas e contingências.",
    rota: "/operacoes/operacao_balanca",
    modulos: ["operacao_balanca"],
    icone: Truck,
    cor: "from-orange-500 to-amber-600",
  },
  {
    titulo: "Vigilância Patrimonial",
    descricao: "Efetivo, rondas e não conformidades.",
    rota: "/operacoes/operacao_vigilancia",
    modulos: ["operacao_vigilancia"],
    icone: ShieldCheck,
    cor: "from-sky-800 to-blue-950",
  },
  {
    titulo: "Acesso de Pessoas e Veículos Leves",
    descricao: "Fluxo, bloqueios e irregularidades.",
    rota: "/operacoes/operacao_acesso",
    modulos: ["operacao_acesso"],
    icone: Car,
    cor: "from-violet-500 to-indigo-700",
  },
  {
    titulo: "Filas e Paradas no Sistema",
    descricao: "Registrar filas e indisponibilidades.",
    rota: "/operacoes/operacao_filas",
    modulos: ["operacao_filas"],
    icone: AlertTriangle,
    cor: "from-red-500 to-red-700",
  },
];

type RegistroOperacionalResumo = {
  id: number;
  dataReferencia?: string;
  data?: string;
  criadoPor?: {
    id?: number;
    nome?: string;
    apelido?: string | null;
    email?: string | null;
  } | null;
};

function dataLocal(data?: string) {
  if (data && /^\d{4}-\d{2}-\d{2}/.test(data)) {
    return data.slice(0, 10);
  }
  const valor = data ? new Date(data) : new Date();
  const offset = valor.getTimezoneOffset();
  return new Date(valor.getTime() - offset * 60000).toISOString().slice(0, 10);
}

function enviadoHojePeloUsuario(registros: RegistroOperacionalResumo[], usuarioId?: number) {
  if (!usuarioId) return false;
  const hoje = dataLocal();
  return registros.some((registro) => {
    const dataRegistro = registro.dataReferencia || registro.data;
    return registro.criadoPor?.id === usuarioId && dataLocal(dataRegistro) === hoje;
  });
}

export default function ControleOperacional() {
  const [usuarioSessao, setUsuarioSessao] = useState<UsuarioLocal | null>(() =>
    usuarioAtual(),
  );
  const validadorOperacional = Boolean(usuarioSessao?.validadorOperacional);
  const [statusCards, setStatusCards] = useState<Record<string, boolean>>({});
  const [carregandoStatus, setCarregandoStatus] = useState(false);

  const modulosPermitidos = useMemo(
    () =>
      modulosControleOperacional.filter(
        (modulo) =>
          temModulo("operacao") ||
          modulo.modulos.some((moduloPermitido) => temModulo(moduloPermitido)),
      ),
    [usuarioSessao],
  );

  useEffect(() => {
    let ativo = true;

    api
      .get("/auth/me")
      .then((resposta) => {
        if (!ativo || !resposta.data?.usuario) return;
        localStorage.setItem("usuario", JSON.stringify(resposta.data.usuario));
        setUsuarioSessao(resposta.data.usuario);
      })
      .catch(() => {
        if (ativo) setUsuarioSessao(usuarioAtual());
      });

    return () => {
      ativo = false;
    };
  }, []);

  useEffect(() => {
    let ativo = true;

    async function carregarStatusCards() {
      if (
        validadorOperacional ||
        !usuarioSessao?.id ||
        modulosPermitidos.length === 0
      ) {
        setStatusCards({});
        return;
      }
      setCarregandoStatus(true);
      const proximosStatus: Record<string, boolean> = {};

      await Promise.all(
        modulosPermitidos.map(async (card) => {
          const consultas = await Promise.allSettled(
            card.modulos.map(async (modulo) => {
              if (modulo === "operacao_scanner") {
                const resposta = await api.get("/operacao/scanner");
                return resposta.data || [];
              }
              const resposta = await api.get(`/operacao/indicadores/${modulo}`);
              return resposta.data || [];
            }),
          );

          proximosStatus[card.titulo] = consultas.some(
            (consulta) =>
              consulta.status === "fulfilled" &&
              enviadoHojePeloUsuario(consulta.value, usuarioSessao.id),
          );
        }),
      );

      if (ativo) {
        setStatusCards(proximosStatus);
        setCarregandoStatus(false);
      }
    }

    carregarStatusCards().catch(() => {
      if (ativo) setCarregandoStatus(false);
    });

    return () => {
      ativo = false;
    };
  }, [modulosPermitidos, usuarioSessao?.id, validadorOperacional]);

  return (
    <div className="min-h-[calc(100vh-7rem)] rounded-xl bg-slate-950 p-2 text-white sm:rounded-2xl sm:p-6">
      <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl shadow-black/25">
        <div className="bg-slate-950 p-3 sm:p-7">
          <div className="mb-3 rounded-xl border border-blue-500/20 bg-blue-500/10 px-3 py-2 text-xs font-semibold leading-5 text-blue-100 sm:mb-5 sm:px-4 sm:py-3 sm:text-sm">
            Preencha os cards disponíveis para sua rotina operacional. Os
            módulos aparecem conforme as permissões atribuídas ao seu perfil.
          </div>

          {modulosPermitidos.length > 0 ? (
            <div className="grid gap-2 sm:gap-3 md:grid-cols-2 2xl:grid-cols-3">
              {modulosPermitidos.map((modulo) => {
                const Icone = modulo.icone;
                const enviado = Boolean(statusCards[modulo.titulo]);
                return (
                  <Link
                    key={modulo.titulo}
                    to={modulo.rota}
                    className="group flex min-h-[104px] items-center gap-3 rounded-xl border border-slate-700/80 bg-slate-900 p-3 shadow-lg shadow-black/15 transition hover:-translate-y-0.5 hover:border-blue-500/70 hover:bg-slate-800/90 sm:min-h-36 sm:gap-4 sm:p-4"
                  >
                    <div
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${modulo.cor} text-white shadow-lg shadow-blue-950/10 sm:h-14 sm:w-14`}
                    >
                      <Icone size={22} className="sm:h-7 sm:w-7" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h2 className="text-sm font-black leading-tight text-white sm:text-base">
                        {modulo.titulo}
                      </h2>
                      <p className="mt-1 text-xs leading-4 text-slate-300 sm:text-sm sm:leading-5">
                        {modulo.descricao}
                      </p>
                      {!validadorOperacional && (
                        <span
                          className={`mt-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold ring-1 sm:mt-3 sm:px-2.5 sm:py-1 sm:text-xs ${
                            enviado
                              ? "bg-emerald-500/15 text-emerald-100 ring-emerald-400/25"
                              : "bg-slate-800 text-blue-100 ring-blue-400/20"
                          }`}
                        >
                          {enviado ? <CircleCheck size={13} /> : <Clock3 size={13} />}
                          {enviado
                            ? "Enviado para validação"
                            : carregandoStatus
                              ? "Verificando..."
                              : "Pendente"}
                        </span>
                      )}
                    </div>
                    <ChevronRight
                      size={20}
                      className="text-[#0076ff] transition group-hover:translate-x-1"
                    />
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-slate-700 bg-slate-900 p-6 text-center text-sm text-slate-300">
              Nenhum módulo operacional foi liberado para este perfil.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
