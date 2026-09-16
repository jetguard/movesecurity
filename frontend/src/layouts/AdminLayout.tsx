import { useEffect, useState } from "react";
import { Link, Navigate, Outlet, useLocation } from "react-router-dom";
import { useMemo } from "react";
import type { FormEvent, MouseEvent } from "react";
import {
  CalendarDays,
  Activity,
  Bell,
  BellRing,
  AtSign,
  BrainCircuit,
  FileText,
  FileCheck2,
  FileBarChart,
  FolderOpen,
  Gauge,
  GitBranch,
  LayoutDashboard,
  LogOut,
  ScrollText,
  Search,
  Settings,
  ShieldAlert,
  ListChecks,
  Paperclip,
  Users,
  Video,
  Menu,
  X,
  MapPinned,
  Server,
  Columns3,
  PackageSearch,
  Lightbulb,
  Lock,
  Wrench,
} from "lucide-react";
import { api } from "../services/api";
import {
  podeAdministrar,
  podeGerenciarRiscos,
  podeTrocarAmbiente,
  podeVerNaturezas,
  podeVerLogs,
  somenteTecnicoManutencao,
  temModulo,
  unidadesPermitidasUsuario,
  usuarioAtual,
  PERFIS,
} from "../utils/permissoes";

const LIMITE_INATIVIDADE_MS = 5 * 60 * 1000;
const CHAVE_ULTIMA_ATIVIDADE = "jetguardUltimaAtividade";

export default function AdminLayout() {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [relatoriosOpen, setRelatoriosOpen] = useState(true);
  const [operacaoOpen, setOperacaoOpen] = useState(true);
  const [solicitacoesOpen, setSolicitacoesOpen] = useState(true);
  const [treinamentosOpen, setTreinamentosOpen] = useState(true);
  const [gestaoAvancadaOpen, setGestaoAvancadaOpen] = useState(true);
  const [administracaoOpen, setAdministracaoOpen] = useState(false);
  const [sistemaOpen, setSistemaOpen] = useState(false);
  const [segundosSessao, setSegundosSessao] = useState(0);
  const [notificacoes, setNotificacoes] = useState<
    Array<{ id: string; titulo: string; mensagem: string; severidade: string }>
  >([]);
  const [toasts, setToasts] = useState<
    Array<{
      id: string;
      titulo: string;
      mensagem: string;
      severidade: string;
      link?: string;
    }>
  >([]);
  const [mencoesPendentes, setMencoesPendentes] = useState(0);
  const [passagensAbertas, setPassagensAbertas] = useState(0);
  const [sistemaBloqueado, setSistemaBloqueado] = useState(
    () => localStorage.getItem("sistemaBloqueado") === "true",
  );
  const [pinDesbloqueio, setPinDesbloqueio] = useState("");
  const [erroDesbloqueio, setErroDesbloqueio] = useState("");
  const [desbloqueando, setDesbloqueando] = useState(false);
  const usuario = usuarioAtual();
  const superAdmin = usuario?.perfilAcesso === PERFIS.SUPER_ADMIN;
  const portaria = usuario?.perfilAcesso === PERFIS.PORTARIA;
  const cadastro = usuario?.perfilAcesso === PERFIS.CADASTRO;
  const tecnicoManutencao = somenteTecnicoManutencao();
  const podeVerDashboard = temModulo("dashboard");
  const podeVerIndicadoresSeguranca = temModulo("indicadores_seguranca_empresarial");
  const podeVerAnaliseRiscos = temModulo("analise_riscos");
  const podeVerPlanoAcao = temModulo("plano_acao");
  const podeVerRelatorios = temModulo("relatorios");
  const podeVerRelatoriosMenu = temModulo("relatorios") || temModulo("documentos");
  const podeVerTreinamentosMenu =
    temModulo("treinamentos") ||
    temModulo("treinamentos_criador") ||
    temModulo("treinamentos_criados") ||
    temModulo("treinamentos_visitantes");
  const podeVerTreinamentosBase = temModulo("treinamentos");
  const podeVerCriadorTreinamentos = temModulo("treinamentos_criador");
  const podeVerTreinamentosCriados = temModulo("treinamentos_criados");
  const podeVerVisitantesTreinamentos = temModulo("treinamentos_visitantes");
  const modulosOperacionaisMenu = [
    "operacao_planejamento",
    "operacao_mapa",
    "operacao_alertas",
    "controle_operacional",
    "operacao_entrada_saida",
    "operacao_vigilancia",
    "operacao_balanca",
    "operacao_ocr",
    "operacao_scanner",
    "operacao_equipe_scanner",
    "operacao_acesso",
    "operacao_motoristas",
    "operacao_filas",
    "operacao_ordens_servico",
    "cftv",
    "quadra_seguranca",
  ];
  const podeVerOperacaoMenu =
    temModulo("operacao") ||
    modulosOperacionaisMenu.some((modulo) => temModulo(modulo));
  const podeVerSolicitacoesMenu = temModulo("solicitacoes_imagens") && !tecnicoManutencao;
  const podeVerAdministracaoMenu =
    temModulo("cadastros") || (superAdmin && temModulo("configuracoes"));
  const podeVerSistemaMenu =
    temModulo("sistema") ||
    (superAdmin && (temModulo("usuarios") || temModulo("logs") || temModulo("configuracoes")));
  const podeVerPainelTreinamentos = [
    PERFIS.SUPER_ADMIN,
    PERFIS.ADMINISTRADOR,
    PERFIS.GESTOR,
    PERFIS.COORDENADOR,
    PERFIS.SUPERVISOR,
  ].includes(usuario?.perfilAcesso || "");
  const rotaTecnicoPermitida =
    location.pathname.startsWith("/cameras") ||
    location.pathname.startsWith("/ordens-servico");
  const unidadesDisponiveis = useMemo(() => unidadesPermitidasUsuario(), []);
  const unidadeSalva = sessionStorage.getItem("unidadeAtiva");
  const unidadeInicial =
    unidadeSalva && unidadesDisponiveis.includes(unidadeSalva)
      ? unidadeSalva
      : usuario?.unidade || unidadesDisponiveis[0] || "GJA-T1";
  const [unidadeAtiva, setUnidadeAtiva] = useState(unidadeInicial);

  useEffect(() => {
    document.documentElement.classList.add("dark");
    localStorage.setItem("tema", "dark");
  }, []);

  useEffect(() => {
    let cancelado = false;
    api
      .get("/auth/me")
      .then((response) => {
        if (cancelado || !response.data?.usuario) return;
        const usuarioAtualizado = response.data.usuario;
        const usuarioCache = localStorage.getItem("usuario");
        const proximoUsuario = JSON.stringify(usuarioAtualizado);
        if (usuarioCache !== proximoUsuario) {
          localStorage.setItem("usuario", proximoUsuario);
        }
      })
      .catch(() => {
        // O interceptor global trata sessão expirada quando necessário.
      });

    return () => {
      cancelado = true;
    };
  }, []);

  useEffect(() => {
    function sincronizarBloqueio(event: StorageEvent) {
      if (event.key === "sistemaBloqueado") {
        setSistemaBloqueado(event.newValue === "true");
        setPinDesbloqueio("");
        setErroDesbloqueio("");
      }
    }

    window.addEventListener("storage", sincronizarBloqueio);
    return () => window.removeEventListener("storage", sincronizarBloqueio);
  }, []);

  useEffect(() => {
    if (!unidadesDisponiveis.includes(unidadeAtiva)) {
      const proximaUnidade =
        unidadesDisponiveis[0] || usuario?.unidade || "GJA-T1";
      setUnidadeAtiva(proximaUnidade);
      sessionStorage.setItem("unidadeAtiva", proximaUnidade);
    }
  }, [unidadeAtiva, unidadesDisponiveis, usuario?.unidade]);

  useEffect(() => {
    const inicio = Number(sessionStorage.getItem("loginInicio") || Date.now());
    sessionStorage.setItem("loginInicio", String(inicio));
    const interval = window.setInterval(() => {
      setSegundosSessao(Math.floor((Date.now() - inicio) / 1000));
    }, 1000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    let ultimaPersistencia = 0;

    const bloquearPorInatividade = () => {
      if (localStorage.getItem("sistemaBloqueado") === "true") return;

      localStorage.setItem("sistemaBloqueado", "true");
      setPinDesbloqueio("");
      setErroDesbloqueio("");
      setSistemaBloqueado(true);
    };

    const verificarInatividade = () => {
      const ultimaAtividade = Number(
        localStorage.getItem(CHAVE_ULTIMA_ATIVIDADE) || Date.now(),
      );
      if (Date.now() - ultimaAtividade >= LIMITE_INATIVIDADE_MS) {
        bloquearPorInatividade();
      }
    };

    const atualizarAtividade = () => {
      if (localStorage.getItem("sistemaBloqueado") === "true") return;

      const agora = Date.now();
      if (agora - ultimaPersistencia < 1000) return;
      ultimaPersistencia = agora;
      localStorage.setItem(CHAVE_ULTIMA_ATIVIDADE, String(agora));
    };

    const verificarAoRetornar = () => {
      if (document.visibilityState === "visible") {
        verificarInatividade();
      }
    };

    if (!localStorage.getItem(CHAVE_ULTIMA_ATIVIDADE)) {
      localStorage.setItem(CHAVE_ULTIMA_ATIVIDADE, String(Date.now()));
    }
    verificarInatividade();

    const eventos = ["click", "keydown", "mousemove", "touchstart", "scroll"];
    eventos.forEach((evento) =>
      window.addEventListener(evento, atualizarAtividade, { passive: true }),
    );
    window.addEventListener("focus", verificarInatividade);
    document.addEventListener("visibilitychange", verificarAoRetornar);

    const interval = window.setInterval(verificarInatividade, 10000);

    return () => {
      eventos.forEach((evento) =>
        window.removeEventListener(evento, atualizarAtividade),
      );
      window.removeEventListener("focus", verificarInatividade);
      document.removeEventListener("visibilitychange", verificarAoRetornar);
      window.clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (portaria || cadastro) {
      setNotificacoes([]);
      setMencoesPendentes(0);
      setPassagensAbertas(0);
      return;
    }

    function carregarNotificacoes() {
      if (!podeVerRelatorios) {
        setNotificacoes([]);
        return;
      }

      api
        .get("/gestao/notificacoes")
        .then((response) => setNotificacoes(response.data))
        .catch(() => setNotificacoes([]));
    }

    carregarNotificacoes();
    window.addEventListener("notificacoes-atualizadas", carregarNotificacoes);

    api
      .get("/mencoes/contador")
      .then((response) => setMencoesPendentes(response.data.total || 0))
      .catch(() => setMencoesPendentes(0));

    if (podeVerRelatorios) {
      api
        .get("/operacao/passagens-turno")
        .then((response) => {
          const abertas = Array.isArray(response.data)
            ? response.data.filter((item) => item.status === "Aberto").length
            : 0;
          setPassagensAbertas(abertas);
        })
        .catch(() => setPassagensAbertas(0));
    } else {
      setPassagensAbertas(0);
    }

    return () =>
      window.removeEventListener(
        "notificacoes-atualizadas",
        carregarNotificacoes,
      );
  }, [portaria, cadastro, podeVerRelatorios]);

  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss" : "ws";
    const socket = new WebSocket(`${protocol}://${window.location.host}/ws`);

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.tipo === "conectado") return;
        if (data.unidade && data.unidade !== unidadeAtiva) return;
        window.dispatchEvent(
          new CustomEvent("movesecurity-realtime", { detail: data }),
        );
        if (data.tipo === "indicadores_seguranca_atualizados") return;
        const id = `${data.tipo}-${data.createdAt || Date.now()}`;
        const novaNotificacao = {
          id,
          titulo: data.titulo,
          mensagem: data.mensagem,
          severidade: data.severidade || "media",
          link: data.link,
        };
        setNotificacoes((atuais) =>
          [
            {
              id,
              titulo: novaNotificacao.titulo,
              mensagem: novaNotificacao.mensagem,
              severidade: novaNotificacao.severidade,
            },
            ...atuais,
          ].slice(0, 50),
        );
        setToasts((atuais) =>
          [novaNotificacao, ...atuais.filter((item) => item.id !== id)].slice(
            0,
            3,
          ),
        );
        window.setTimeout(
          () => {
            setToasts((atuais) => atuais.filter((item) => item.id !== id));
          },
          data.severidade === "alta" ? 9500 : 7000,
        );
      } catch {
        // Mensagens inválidas do socket são ignoradas para não interromper a sessão.
      }
    };

    return () => socket.close();
  }, [unidadeAtiva]);

  async function logout() {
    try {
      await api.post("/auth/logout");
    } finally {
      localStorage.removeItem("token");
      localStorage.removeItem("usuario");
      localStorage.removeItem("sistemaBloqueado");
      localStorage.removeItem(CHAVE_ULTIMA_ATIVIDADE);
      sessionStorage.removeItem("loginInicio");
      window.location.href = "/login";
    }
  }

  async function encerrarSessaoBloqueada() {
    localStorage.setItem("bloquearAposProximoLogin", "true");
    await logout();
  }

  function formatarSessao(segundos: number) {
    const minutos = Math.floor(segundos / 60);
    const horas = Math.floor(minutos / 60);
    return `${String(horas).padStart(2, "0")}:${String(minutos % 60).padStart(2, "0")}:${String(segundos % 60).padStart(2, "0")}`;
  }

  function alterarUnidade(unidade: string) {
    setUnidadeAtiva(unidade);
    sessionStorage.setItem("unidadeAtiva", unidade);
    window.location.reload();
  }

  function bloquearSistema() {
    const confirmarBloqueio = window.confirm(
      "Deseja realmente bloquear a sessão atual?",
    );
    if (!confirmarBloqueio) return;

    localStorage.setItem("sistemaBloqueado", "true");
    setPinDesbloqueio("");
    setErroDesbloqueio("");
    setSistemaBloqueado(true);
  }

  function fecharToast(id: string) {
    setToasts((atuais) => atuais.filter((item) => item.id !== id));
  }

  function classeToast(severidade: string) {
    if (severidade === "alta")
      return "border-red-400/40 bg-red-950/95 text-red-50 shadow-red-950/30";
    if (severidade === "baixa")
      return "border-emerald-400/30 bg-emerald-950/95 text-emerald-50 shadow-emerald-950/30";
    return "border-blue-400/35 bg-slate-950/95 text-white shadow-blue-950/30";
  }

  async function desbloquearSistema(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErroDesbloqueio("");

    if (!pinDesbloqueio) {
      setErroDesbloqueio("Informe seu PIN operacional para desbloquear.");
      return;
    }

    try {
      setDesbloqueando(true);
      await api.post("/auth/desbloquear-sessao", {
        pinOperacional: pinDesbloqueio,
      });
      localStorage.removeItem("sistemaBloqueado");
      localStorage.setItem(CHAVE_ULTIMA_ATIVIDADE, String(Date.now()));
      setPinDesbloqueio("");
      setSistemaBloqueado(false);
    } catch (error: unknown) {
      const apiError = error as { response?: { data?: { error?: string } } };
      setErroDesbloqueio(
        apiError.response?.data?.error ||
          "Não foi possível desbloquear o sistema.",
      );
    } finally {
      setDesbloqueando(false);
    }
  }

  function fecharMenuMobileAoNavegar(event: MouseEvent<HTMLElement>) {
    const alvo = event.target as HTMLElement;
    if (alvo.closest("a")) {
      setMobileMenuOpen(false);
    }
  }

  const mostrarTextoMenu = open || mobileMenuOpen;
  const sidebarWidth = open ? "md:w-64" : "md:w-16";
  const mainOffset = open ? "md:ml-64" : "md:ml-16";
  const item =
    "flex h-11 items-center gap-3 rounded-xl px-3 text-slate-300 transition-colors duration-100 hover:bg-slate-800 hover:text-white sm:px-4";
  const subItem =
    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-400 transition-colors duration-100 hover:bg-slate-800 hover:text-white";
  const menuText = `whitespace-nowrap ${mostrarTextoMenu ? "max-w-48 opacity-100" : "max-w-0 overflow-hidden opacity-0"}`;
  const menuToggle = `ml-auto ${mostrarTextoMenu ? "max-w-8 opacity-100" : "max-w-0 overflow-hidden opacity-0"}`;
  const submenuClass = `ml-6 flex flex-col gap-2 border-l border-slate-800 pl-4 pr-1 [scrollbar-color:rgba(148,163,184,.35)_transparent] [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-700/70 [&::-webkit-scrollbar-track]:bg-transparent ${mostrarTextoMenu ? "max-h-[calc(100vh-10rem)] overflow-y-auto opacity-100" : "max-h-0 overflow-hidden opacity-0"}`;

  if (tecnicoManutencao && !rotaTecnicoPermitida) {
    return <Navigate to="/cameras" replace />;
  }

  if (location.pathname === "/" && !podeVerDashboard) {
    if (temModulo("indicadores_seguranca_empresarial")) {
      return <Navigate to="/indicadores-seguranca-empresarial" replace />;
    }
    if (temModulo("plano_acao")) return <Navigate to="/planos-acao" replace />;
    if (temModulo("analise_riscos")) return <Navigate to="/riscos/dashboard" replace />;
    if (temModulo("solicitacoes_imagens")) return <Navigate to="/solicitacoes/imagens" replace />;
    if (temModulo("relatorios")) return <Navigate to="/ocorrencias" replace />;
    if (temModulo("documentos")) return <Navigate to="/documentos" replace />;
    if (temModulo("treinamentos")) return <Navigate to="/treinamentos-terminal" replace />;
    if (temModulo("cftv")) return <Navigate to="/cameras" replace />;
    if (temModulo("controle_operacional")) return <Navigate to="/controle-operacional" replace />;
    if (temModulo("operacao_planejamento")) return <Navigate to="/planejamento" replace />;
    if (temModulo("operacao_mapa")) return <Navigate to="/mapa-operacional" replace />;
    if (temModulo("operacao_alertas")) return <Navigate to="/alertas-operacionais" replace />;
    if (temModulo("operacao_ordens_servico")) return <Navigate to="/ordens-servico" replace />;
    if (temModulo("operacao")) return <Navigate to="/meus-dados?aba=tarefas" replace />;
    return <Navigate to="/meus-dados" replace />;
  }

  return (
    <div className="min-h-screen bg-slate-100">
      {mobileMenuOpen && (
        <button
          type="button"
          aria-label="Fechar menu"
          onClick={() => setMobileMenuOpen(false)}
          className="fixed inset-0 z-20 bg-slate-950/60 backdrop-blur-sm md:hidden"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-30 w-80 max-w-[86vw] ${sidebarWidth} transform-gpu overflow-y-auto bg-slate-950 text-white shadow-2xl transition-[width,transform] duration-75 ease-out [scrollbar-color:rgba(148,163,184,.35)_transparent] [scrollbar-width:thin] [will-change:width,transform] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-700/70 [&::-webkit-scrollbar-track]:bg-transparent ${mobileMenuOpen ? "translate-x-0" : "-translate-x-full"} md:translate-x-0 md:shadow-none`}
      >
        <div
          className={`flex h-20 items-center border-b border-slate-800 p-4 ${mostrarTextoMenu ? "justify-between" : "justify-center"}`}
        >
          <div
            className={`overflow-hidden ${mostrarTextoMenu ? "w-40 opacity-100" : "w-0 opacity-0"}`}
          >
            <Link to="/" className="flex min-w-0 items-center">
              <img
                src="/images/movecta-logo.png"
                alt="Movecta"
                className="brand-logo h-10 w-40 rounded bg-white object-contain px-3 py-2"
              />
            </Link>
          </div>

          <button
            type="button"
            onClick={() => setOpen(!open)}
            className="hidden h-9 w-9 items-center justify-center rounded-full border border-slate-700 bg-slate-900 text-sm font-bold text-slate-200 shadow-lg transition-colors duration-100 hover:border-blue-400 hover:bg-blue-600 md:flex"
            aria-label={open ? "Encolher menu" : "Expandir menu"}
            title={open ? "Encolher menu" : "Expandir menu"}
          >
            {open ? "<" : ">"}
          </button>
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="rounded-lg bg-slate-800 p-2 text-sm hover:bg-slate-700 md:hidden"
            aria-label="Fechar menu"
          >
            <X size={20} />
          </button>
        </div>

        <nav
          onClick={fecharMenuMobileAoNavegar}
          className="mt-6 flex flex-col gap-2 px-2 pb-6 sm:px-3"
        >
          {!tecnicoManutencao && !portaria && !cadastro && podeVerDashboard && (
            <Link to="/" className={item}>
              <LayoutDashboard size={20} className="shrink-0" />
              <span className={menuText}>Dashboard</span>
            </Link>
          )}

          {!tecnicoManutencao &&
            !portaria &&
            !cadastro &&
            podeVerIndicadoresSeguranca && (
              <Link to="/indicadores-seguranca-empresarial" className={item}>
                <Gauge size={20} className="shrink-0" />
                <span className={menuText}>Indicadores Segurança Empresarial</span>
              </Link>
            )}

          {!tecnicoManutencao && !portaria && !cadastro && podeVerRelatoriosMenu && (
            <>
              <button
                onClick={() => setRelatoriosOpen(!relatoriosOpen)}
                className="flex h-11 items-center rounded-xl px-3 text-slate-300 transition-colors duration-100 hover:bg-slate-800 hover:text-white sm:px-4"
              >
                <div className="flex items-center gap-3">
                  <FolderOpen size={20} className="shrink-0" />
                  <span className={menuText}>Relatórios</span>
                </div>
                <span className={menuToggle}>{relatoriosOpen ? "-" : "+"}</span>
              </button>

              {relatoriosOpen && (
                <div className={submenuClass}>
                  {temModulo("relatorios") && <Link to="/ocorrencias" className={subItem}>
                    <FileText size={16} />
                    Ocorrências
                  </Link>}
                  {temModulo("relatorios") && <Link to="/investigacao" className={subItem}>
                    <Search size={16} />
                    Investigação
                  </Link>}
                  {temModulo("relatorios") && <Link to="/eventos" className={subItem}>
                    <CalendarDays size={16} />
                    Eventos
                  </Link>}
                  {temModulo("documentos") && <Link to="/documentos" className={subItem}>
                    <FolderOpen size={16} />
                    Central de Documentos
                  </Link>}
                  {temModulo("relatorios") && <Link to="/operacao-soc" className={subItem}>
                    <Activity size={16} />
                    Relatório CCOS
                  </Link>}
                  {podeAdministrar() && (
                    <Link to="/relatorio-diario" className={subItem}>
                      <FileBarChart size={16} />
                      Relatório Diário Executivo
                    </Link>
                  )}
                  {temModulo("relatorios") && <Link to="/relatos-campo" className={subItem}>
                    <FileText size={16} />
                    Relatos de Campo
                  </Link>}
                </div>
              )}
            </>
          )}

          {cadastro ? (
            <>
              <button
                onClick={() => setTreinamentosOpen(!treinamentosOpen)}
                className="flex h-11 items-center rounded-xl px-3 text-slate-300 transition-colors duration-100 hover:bg-slate-800 hover:text-white sm:px-4"
              >
                <div className="flex items-center gap-3">
                  <FileCheck2 size={20} className="shrink-0" />
                  <span className={menuText}>Treinamentos</span>
                </div>
                <span className={menuToggle}>
                  {treinamentosOpen ? "-" : "+"}
                </span>
              </button>

              {treinamentosOpen && (
                <div className={submenuClass}>
                  {podeVerTreinamentosBase && (
                    <Link to="/treinamentos-terminal" className={subItem}>
                      <FileCheck2 size={16} />
                      Alfandega Portaria 205
                    </Link>
                  )}
                  {podeVerPainelTreinamentos && (
                    <Link to="/painel-treinamentos" className={subItem}>
                      <FileBarChart size={16} />
                      Painel Analítico
                    </Link>
                  )}
                </div>
              )}
              <Link to="/meus-dados" className={item}>
                <Users size={20} className="shrink-0" />
                <span className={menuText}>Minha Conta</span>
              </Link>
            </>
          ) : portaria ? (
            <>
              <button
                onClick={() => setTreinamentosOpen(!treinamentosOpen)}
                className="flex h-11 items-center rounded-xl px-3 text-slate-300 transition-colors duration-100 hover:bg-slate-800 hover:text-white sm:px-4"
              >
                <div className="flex items-center gap-3">
                  <FileCheck2 size={20} className="shrink-0" />
                  <span className={menuText}>Treinamentos</span>
                </div>
                <span className={menuToggle}>
                  {treinamentosOpen ? "-" : "+"}
                </span>
              </button>

              {treinamentosOpen && (
                <div className={submenuClass}>
                  {podeVerTreinamentosBase && (
                    <Link to="/treinamentos-terminal" className={subItem}>
                      <FileCheck2 size={16} />
                      Alfandega Portaria 205
                    </Link>
                  )}
                  {podeVerPainelTreinamentos && (
                    <Link to="/painel-treinamentos" className={subItem}>
                      <FileBarChart size={16} />
                      Painel Analítico
                    </Link>
                  )}
                  {podeVerCriadorTreinamentos && (
                    <Link to="/treinamentos-dinamicos" className={subItem}>
                      <FileCheck2 size={16} />
                      Criador de Treinamentos
                    </Link>
                  )}
                  {podeVerTreinamentosCriados && (
                    <Link to="/treinamentos-criados" className={subItem}>
                      <FileCheck2 size={16} />
                      Treinamentos Criados
                    </Link>
                  )}
                  {podeVerVisitantesTreinamentos && (
                    <Link to="/treinamentos-visitantes" className={subItem}>
                      <Users size={16} />
                      Cadastro de Visitantes
                    </Link>
                  )}
                </div>
              )}
              <Link to="/meus-dados" className={item}>
                <Users size={20} className="shrink-0" />
                <span className={menuText}>Minha Conta</span>
              </Link>
            </>
          ) : (
            <>
              {!tecnicoManutencao && podeVerTreinamentosMenu && (
                <>
                  <button
                    onClick={() => setTreinamentosOpen(!treinamentosOpen)}
                    className="flex h-11 items-center rounded-xl px-3 text-slate-300 transition-colors duration-100 hover:bg-slate-800 hover:text-white sm:px-4"
                  >
                    <div className="flex items-center gap-3">
                      <FileCheck2 size={20} className="shrink-0" />
                      <span className={menuText}>Treinamentos</span>
                    </div>
                    <span className={menuToggle}>
                      {treinamentosOpen ? "-" : "+"}
                    </span>
                  </button>

                  {treinamentosOpen && (
                    <div className={submenuClass}>
                      {podeVerTreinamentosBase && (
                        <Link to="/treinamentos-terminal" className={subItem}>
                          <FileCheck2 size={16} />
                          Alfandega Portaria 205
                        </Link>
                      )}
                      {podeVerPainelTreinamentos && (
                        <Link to="/painel-treinamentos" className={subItem}>
                          <FileBarChart size={16} />
                          Painel Analítico
                        </Link>
                      )}
                      {podeVerCriadorTreinamentos && (
                        <Link to="/treinamentos-dinamicos" className={subItem}>
                          <FileCheck2 size={16} />
                          Criador de Treinamentos
                        </Link>
                      )}
                      {podeVerTreinamentosCriados && (
                        <Link to="/treinamentos-criados" className={subItem}>
                          <FileCheck2 size={16} />
                          Treinamentos Criados
                        </Link>
                      )}
                      {podeVerVisitantesTreinamentos && (
                        <Link to="/treinamentos-visitantes" className={subItem}>
                          <Users size={16} />
                          Cadastro de Visitantes
                        </Link>
                      )}
                    </div>
                  )}
                </>
              )}

              {podeVerOperacaoMenu && <button
                onClick={() => setOperacaoOpen(!operacaoOpen)}
                className="flex h-11 items-center rounded-xl px-3 text-slate-300 transition-colors duration-100 hover:bg-slate-800 hover:text-white sm:px-4"
              >
                <div className="flex items-center gap-3">
                  <ListChecks size={20} className="shrink-0" />
                  <span className={menuText}>Operação</span>
                </div>
                <span className={menuToggle}>{operacaoOpen ? "-" : "+"}</span>
              </button>}

              {podeVerOperacaoMenu && operacaoOpen && (
                <div className={submenuClass}>
                  {temModulo("cftv") && <Link to="/cameras" className={subItem}>
                    <Video size={16} />
                    Câmeras CFTV
                  </Link>}
                  {(temModulo("operacao_ordens_servico") || temModulo("cftv") || temModulo("operacao")) && <Link to="/ordens-servico" className={subItem}>
                    <Wrench size={16} />
                    Ordens de Serviço
                  </Link>}
                  {!tecnicoManutencao && (
                    <>
                      {(temModulo("operacao_planejamento") || temModulo("operacao")) && <Link to="/planejamento" className={subItem}>
                        <Columns3 size={16} />
                        Quadro de Tarefas
                      </Link>}
                      {temModulo("quadra_seguranca") && <Link to="/quadra-seguranca" className={subItem}>
                        <PackageSearch size={16} />
                        Quadra de Segurança
                      </Link>}
                      {(temModulo("operacao_mapa") || temModulo("operacao")) && <Link to="/mapa-operacional" className={subItem}>
                        <MapPinned size={16} />
                        Mapa Operacional
                      </Link>}
                      {(temModulo("operacao_alertas") || temModulo("operacao")) && <Link to="/alertas-operacionais" className={subItem}>
                        <ShieldAlert size={16} />
                        Alertas Operacionais
                      </Link>}
                      {(temModulo("controle_operacional") || temModulo("operacao")) && <Link to="/controle-operacional" className={subItem}>
                        <Activity size={16} />
                        Controle Operacional
                      </Link>}
                      {(temModulo("operacao_entrada_saida") || temModulo("operacao")) && <Link to="/operacoes/operacao_entrada_saida" className={subItem}>
                        <PackageSearch size={16} />
                        Entrada e Saída
                      </Link>}
                      {(temModulo("operacao_motoristas") || temModulo("operacao")) && <Link to="/operacoes/operacao_motoristas" className={subItem}>
                        <FileText size={16} />
                        Cadastro de Motoristas
                      </Link>}
                    </>
                  )}
                </div>
              )}

              {podeVerSolicitacoesMenu && (
                <>
                  <button
                    onClick={() => setSolicitacoesOpen(!solicitacoesOpen)}
                    className="flex h-11 items-center rounded-xl px-3 text-slate-300 transition-colors duration-100 hover:bg-slate-800 hover:text-white sm:px-4"
                  >
                    <div className="flex items-center gap-3">
                      <Paperclip size={20} className="shrink-0" />
                      <span className={menuText}>Solicitações</span>
                    </div>
                    <span className={menuToggle}>
                      {solicitacoesOpen ? "-" : "+"}
                    </span>
                  </button>

                  {solicitacoesOpen && (
                    <div className={submenuClass}>
                      <Link to="/solicitacoes/imagens" className={subItem}>
                        <Video size={16} />
                        Imagens
                      </Link>
                    </div>
                  )}
                </>
              )}
            </>
          )}

          {podeVerPlanoAcao && !podeVerAnaliseRiscos && (
            <Link
              to="/planos-acao"
              className="flex h-11 items-center gap-3 rounded-xl px-3 text-slate-300 transition-colors duration-100 hover:bg-slate-800 hover:text-white sm:px-4"
            >
              <ListChecks size={20} className="shrink-0" />
              <span className={menuText}>Plano de ação</span>
            </Link>
          )}

          {podeGerenciarRiscos() && podeVerAnaliseRiscos && (
            <>
              <button
                onClick={() => setGestaoAvancadaOpen(!gestaoAvancadaOpen)}
                className="flex h-11 items-center rounded-xl px-3 text-slate-300 transition-colors duration-100 hover:bg-slate-800 hover:text-white sm:px-4"
              >
                <div className="flex items-center gap-3">
                  <BrainCircuit size={20} className="shrink-0" />
                  <span className={menuText}>Análise de Riscos</span>
                </div>
                <span className={menuToggle}>
                  {gestaoAvancadaOpen ? "-" : "+"}
                </span>
              </button>

              {gestaoAvancadaOpen && (
                <div className={submenuClass}>
                  {podeVerAnaliseRiscos && <Link to="/riscos/dashboard" className={subItem}>
                    <LayoutDashboard size={16} />
                    Dashboard
                  </Link>}
                  {podeVerAnaliseRiscos && <Link to="/riscos/fluxograma" className={subItem}>
                    <GitBranch size={16} />
                    Fluxograma
                  </Link>}
                  {podeVerAnaliseRiscos && <Link to="/riscos/cadastro-geral" className={subItem}>
                    <Columns3 size={16} />
                    Cadastro Geral
                  </Link>}
                  {podeVerAnaliseRiscos && <Link to="/riscos/analise-completa" className={subItem}>
                    <FileBarChart size={16} />
                    Análise Completa
                  </Link>}
                  {podeVerPlanoAcao && <Link to="/planos-acao" className={subItem}>
                    <ListChecks size={16} />
                    Plano de ação
                  </Link>}
                  {podeVerAnaliseRiscos && <Link to="/riscos/pontuacoes" className={subItem}>
                    <Gauge size={16} />
                    Pontuações
                  </Link>}
                </div>
              )}
            </>
          )}

          {podeVerAdministracaoMenu && (
            <>
              <button
                onClick={() => setAdministracaoOpen(!administracaoOpen)}
                className="flex h-11 items-center rounded-xl px-3 text-slate-300 transition-colors duration-100 hover:bg-slate-800 hover:text-white sm:px-4"
              >
                <div className="flex items-center gap-3">
                  <Settings size={20} className="shrink-0" />
                  <span className={menuText}>Administração</span>
                </div>
                <span className={menuToggle}>
                  {administracaoOpen ? "-" : "+"}
                </span>
              </button>

              {administracaoOpen && (
                <div className={submenuClass}>
                  {temModulo("cadastros") && (
                    <>
                      <Link to="/naturezas" className={subItem}>
                        <Settings size={16} />
                        Naturezas
                      </Link>
                      <Link to="/locais" className={subItem}>
                        <MapPinned size={16} />
                        Locais
                      </Link>
                    </>
                  )}
                </div>
              )}
            </>
          )}

          {(podeVerSistemaMenu || podeVerLogs() || podeVerNaturezas()) && (
            <>
              <button
                onClick={() => setSistemaOpen(!sistemaOpen)}
                className="flex h-11 items-center rounded-xl px-3 text-slate-300 transition-colors duration-100 hover:bg-slate-800 hover:text-white sm:px-4"
              >
                <div className="flex items-center gap-3">
                  <Server size={20} className="shrink-0" />
                  <span className={menuText}>Sistema</span>
                </div>
                <span className={menuToggle}>{sistemaOpen ? "-" : "+"}</span>
              </button>

              {sistemaOpen && (
                <div className={submenuClass}>
                  {superAdmin && temModulo("usuarios") && (
                    <Link to="/usuarios" className={subItem}>
                      <Users size={16} />
                      Usuários
                    </Link>
                  )}
                  {superAdmin && temModulo("configuracoes") && (
                    <Link to="/configuracoes" className={subItem}>
                      <Settings size={16} />
                      Configurações
                    </Link>
                  )}
                  {superAdmin && temModulo("configuracoes") && (
                    <Link to="/sessoes" className={subItem}>
                      <Lock size={16} />
                      Sessões Ativas
                    </Link>
                  )}
                  {temModulo("configuracoes") && (
                    <Link to="/atualizacoes" className={subItem}>
                      <ScrollText size={16} />
                      Atualizações
                    </Link>
                  )}
                  {podeVerNaturezas() && (
                    <Link to="/sugestoes-melhoria" className={subItem}>
                      <Lightbulb size={16} />
                      Sugestões
                    </Link>
                  )}
                  {superAdmin && temModulo("logs") && (
                    <Link to="/logs" className={subItem}>
                      <ScrollText size={16} />
                      Logs
                    </Link>
                  )}
                </div>
              )}
            </>
          )}

          <button
            onClick={logout}
            className="mt-6 flex items-center gap-3 rounded-xl px-4 py-3 text-slate-300 transition-colors duration-100 hover:bg-red-900 hover:text-white"
          >
            <LogOut size={20} className="shrink-0" />
            <span className={menuText}>Sair</span>
          </button>
        </nav>
      </aside>

      <main className={`${mainOffset} min-w-0 overflow-x-hidden`}>
        <header className="sticky top-0 z-20 border-b border-slate-800 bg-slate-950 px-3 py-3 shadow-sm sm:px-5 md:flex md:min-h-20 md:items-center md:justify-between md:gap-4 md:px-6 lg:px-8">
          <div className="flex min-w-0 items-center justify-between gap-2 md:hidden">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="shrink-0 rounded-xl bg-slate-900 p-2.5 text-slate-100 transition hover:bg-slate-800"
              aria-label="Abrir menu"
            >
              <Menu size={21} />
            </button>

            <div className="flex min-w-0 flex-1 items-center justify-end gap-1">
              {!portaria && podeVerRelatorios && (
                <Link
                  to="/notificacoes"
                  className="relative shrink-0 rounded-full bg-slate-900 p-2.5 text-slate-100 hover:bg-slate-800"
                >
                  <Bell size={16} />
                  {notificacoes.length > 0 && (
                    <span className="absolute -right-1 -top-1 rounded-full bg-red-600 px-1.5 text-[10px] font-bold text-white">
                      {notificacoes.length}
                    </span>
                  )}
                </Link>
              )}
              {!portaria && (
                <Link
                  to="/meus-dados?aba=mencoes"
                  className="relative hidden shrink-0 rounded-full bg-slate-900 p-2.5 text-slate-100 hover:bg-slate-800 min-[390px]:inline-flex"
                >
                  <AtSign size={16} />
                  {mencoesPendentes > 0 && (
                    <span className="absolute -right-1 -top-1 rounded-full bg-blue-600 px-1.5 text-[10px] font-bold text-white">
                      {mencoesPendentes}
                    </span>
                  )}
                </Link>
              )}
              {!portaria && podeVerRelatorios && (
                <Link
                  to="/operacao-soc"
                  className="relative hidden shrink-0 rounded-full bg-slate-900 p-2.5 text-slate-100 hover:bg-slate-800 min-[460px]:inline-flex"
                  title={
                    passagensAbertas > 0
                      ? "Há Relatório CCOS em aberto"
                      : "Relatório CCOS"
                  }
                >
                  <Activity size={16} />
                  {passagensAbertas > 0 && (
                    <span className="absolute -right-1 -top-1 rounded-full bg-amber-500 px-1.5 text-[10px] font-bold text-white">
                      {passagensAbertas}
                    </span>
                  )}
                </Link>
              )}
              <button
                type="button"
                onClick={bloquearSistema}
                className="hidden shrink-0 rounded-full bg-slate-900 p-2.5 text-slate-100 transition hover:bg-slate-800 min-[360px]:inline-flex"
                title="Bloquear sistema"
              >
                <Lock size={16} />
              </button>

              <Link
                to="/meus-dados"
                className="min-w-0 max-w-[6.5rem] text-right min-[430px]:max-w-[9rem]"
              >
                <p className="hidden truncate text-sm font-semibold text-white min-[430px]:block">
                  {usuario?.apelido || usuario?.nome || "Usuario"}
                </p>
                <p className="truncate text-[11px] font-semibold text-slate-300">
                  Unidade: {unidadeAtiva}
                </p>
              </Link>
              <Link
                to="/meus-dados"
                className="h-9 w-9 shrink-0 overflow-hidden rounded-full bg-slate-800 ring-2 ring-transparent transition hover:ring-blue-400 min-[430px]:h-10 min-[430px]:w-10"
              >
                {usuario?.fotoPerfil ? (
                  <img
                    src={usuario.fotoPerfil}
                    alt="Perfil"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center font-bold text-slate-100">
                    {(usuario?.apelido || usuario?.nome || "U")
                      .charAt(0)
                      .toUpperCase()}
                  </div>
                )}
              </Link>
            </div>
          </div>

          <div className="hidden min-w-0 md:block">
            <p className="text-sm text-slate-400">Ambiente de trabalho</p>
            {podeTrocarAmbiente() ? (
              <select
                value={unidadeAtiva}
                onChange={(e) => alterarUnidade(e.target.value)}
                className="mt-1 w-full max-w-xs rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm font-bold text-slate-100"
              >
                {unidadesDisponiveis.map((unidade) => (
                  <option key={unidade} value={unidade}>
                    Unidade: {unidade}
                  </option>
                ))}
              </select>
            ) : (
              <p className="font-bold text-slate-100">
                Unidade: {usuario?.unidade || "GJA-T1"}
              </p>
            )}
          </div>

          <div className="hidden min-w-0 items-center justify-end gap-3 sm:gap-4 md:flex">
            {!portaria && podeVerRelatorios && (
              <Link
                to="/notificacoes"
                  className="relative rounded-full bg-slate-900 p-3 text-slate-100 hover:bg-slate-800"
              >
                <Bell size={18} />
                {notificacoes.length > 0 && (
                  <span className="absolute -right-1 -top-1 rounded-full bg-red-600 px-1.5 text-xs font-bold text-white">
                    {notificacoes.length}
                  </span>
                )}
              </Link>
            )}
            {!portaria && (
              <Link
                to="/meus-dados?aba=mencoes"
                className="relative rounded-full bg-slate-900 p-3 text-slate-100 hover:bg-slate-800"
              >
                <AtSign size={18} />
                {mencoesPendentes > 0 && (
                  <span className="absolute -right-1 -top-1 rounded-full bg-blue-600 px-1.5 text-xs font-bold text-white">
                    {mencoesPendentes}
                  </span>
                )}
              </Link>
            )}
            {!portaria && podeVerRelatorios && (
              <Link
                to="/operacao-soc"
                className="relative rounded-full bg-slate-900 p-3 text-slate-100 hover:bg-slate-800"
                title={
                  passagensAbertas > 0
                    ? "Há Relatório CCOS em aberto"
                    : "Relatório CCOS"
                }
              >
                <Activity size={18} />
                {passagensAbertas > 0 && (
                  <span className="absolute -right-1 -top-1 rounded-full bg-amber-500 px-1.5 text-xs font-bold text-white">
                    {passagensAbertas}
                  </span>
                )}
              </Link>
            )}
            <button
              type="button"
              onClick={bloquearSistema}
              className="rounded-full bg-slate-900 p-3 text-slate-100 transition hover:bg-slate-800"
              title="Bloquear sistema"
            >
              <Lock size={18} />
            </button>
            <Link
              to="/meus-dados"
              className="hidden min-w-0 text-left sm:text-right md:block"
            >
              <p className="font-semibold text-white">
                {usuario?.apelido || usuario?.nome || "Usuario"}
              </p>
              <p className="text-xs text-slate-400">
                Sessão: {formatarSessao(segundosSessao)}
              </p>
            </Link>
            <Link
              to="/meus-dados"
              className="hidden h-10 w-10 shrink-0 overflow-hidden rounded-full bg-slate-800 ring-2 ring-transparent transition hover:ring-blue-400 md:block"
            >
              {usuario?.fotoPerfil ? (
                <img
                  src={usuario.fotoPerfil}
                  alt="Perfil"
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center font-bold text-slate-100">
                  {(usuario?.apelido || usuario?.nome || "U")
                    .charAt(0)
                    .toUpperCase()}
                </div>
              )}
            </Link>
          </div>
        </header>

        <div className="min-w-0 p-3 sm:p-5 lg:p-8">
          <Outlet />
        </div>
      </main>

      {toasts.length > 0 && (
        <div className="pointer-events-none fixed bottom-4 right-4 z-[70] flex w-[calc(100vw-2rem)] max-w-sm flex-col gap-3 sm:bottom-5 sm:right-5">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className={`pointer-events-auto overflow-hidden rounded-2xl border p-4 shadow-2xl backdrop-blur-xl animate-in slide-in-from-right-5 fade-in duration-200 ${classeToast(toast.severidade)}`}
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/15">
                  <BellRing size={19} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="line-clamp-1 font-black">{toast.titulo}</p>
                    <button
                      type="button"
                      onClick={() => fecharToast(toast.id)}
                      className="rounded-full p-1 text-white/70 transition hover:bg-white/10 hover:text-white"
                      aria-label="Fechar notificação"
                    >
                      <X size={15} />
                    </button>
                  </div>
                  <p className="mt-1 line-clamp-2 text-sm text-white/78">
                    {toast.mensagem}
                  </p>
                  <div className="mt-3 flex items-center justify-between gap-2">
                    <span className="rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-white/80">
                      Tempo real
                    </span>
                    {toast.link ? (
                      <Link
                        to={toast.link}
                        onClick={() => fecharToast(toast.id)}
                        className="rounded-full bg-white px-3 py-1.5 text-xs font-black text-slate-950 transition hover:bg-blue-50"
                      >
                        Abrir
                      </Link>
                    ) : (
                      <button
                        type="button"
                        onClick={() => fecharToast(toast.id)}
                        className="rounded-full bg-white px-3 py-1.5 text-xs font-black text-slate-950 transition hover:bg-blue-50"
                      >
                        Ok
                      </button>
                    )}
                  </div>
                </div>
              </div>
              <div className="mt-3 h-1 overflow-hidden rounded-full bg-white/10">
                <div className="h-full w-2/3 animate-pulse rounded-full bg-white/60" />
              </div>
            </div>
          ))}
        </div>
      )}

      {sistemaBloqueado && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-md">
          <form
            onSubmit={desbloquearSistema}
            className="w-full max-w-md rounded-3xl border border-white/10 bg-slate-950/95 p-6 text-white shadow-2xl"
          >
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600/20 text-blue-200 ring-1 ring-blue-400/30">
              <Lock size={26} />
            </div>

            <div className="mt-5 text-center">
              <p className="text-sm font-semibold uppercase tracking-[0.25em] text-blue-200">
                MoveSecurity bloqueado
              </p>
              <h2 className="mt-2 text-2xl font-bold">Sessão protegida</h2>
              <p className="mt-2 text-sm text-slate-300">
                O sistema está bloqueado para proteger as informações em tela.
                Digite o PIN operacional do usuário conectado para continuar.
              </p>
            </div>

            <div className="mt-6 flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-900 p-3">
              <div className="h-12 w-12 shrink-0 overflow-hidden rounded-full bg-slate-800">
                {usuario?.fotoPerfil ? (
                  <img
                    src={usuario.fotoPerfil}
                    alt="Perfil"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center font-bold text-slate-300">
                    {(usuario?.apelido || usuario?.nome || "U")
                      .charAt(0)
                      .toUpperCase()}
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <p className="truncate font-semibold">
                  {usuario?.apelido || usuario?.nome || "Usuário conectado"}
                </p>
                <p className="truncate text-xs text-slate-400">
                  {usuario?.email}
                </p>
              </div>
            </div>

            <label className="mt-5 block">
              <span className="mb-2 block text-sm font-semibold text-slate-200">
                PIN operacional
              </span>
              <input
                autoFocus
                type="password"
                inputMode="numeric"
                maxLength={4}
                value={pinDesbloqueio}
                onChange={(event) =>
                  setPinDesbloqueio(
                    event.target.value.replace(/\D/g, "").slice(0, 4),
                  )
                }
                className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-blue-400 focus:ring-2 focus:ring-blue-500/30"
                placeholder="Digite os 4 dígitos"
              />
            </label>

            {erroDesbloqueio && (
              <p className="mt-3 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                {erroDesbloqueio}
              </p>
            )}

            <button
              type="submit"
              disabled={desbloqueando}
              className="mt-5 w-full rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-slate-700"
            >
              {desbloqueando ? "Validando..." : "Desbloquear sistema"}
            </button>
            <button
              type="button"
              onClick={encerrarSessaoBloqueada}
              className="mt-3 w-full rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 font-semibold text-red-100 transition hover:bg-red-500/20"
            >
              Encerrar sessão
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
