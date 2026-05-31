import { useEffect, useState } from "react";
import { Link, Outlet } from "react-router-dom";
import { useMemo } from "react";
import type { FormEvent, MouseEvent } from "react";
import {
  CalendarDays,
  Activity,
  Bell,
  AtSign,
  BrainCircuit,
  FileText,
  FolderOpen,
  LayoutDashboard,
  LogOut,
  ScrollText,
  Search,
  Settings,
  ShieldAlert,
  ShieldCheck,
  ListChecks,
  CheckCircle2,
  Paperclip,
  ClipboardCheck,
  Target,
  Grid3X3,
  Users,
  Moon,
  Sun,
  Video,
  Menu,
  X,
  AlertTriangle,
  MapPinned,
  Server,
  Columns3,
  PackageSearch,
  Lightbulb,
  Lock,
} from "lucide-react";
import { api } from "../services/api";
import {
  podeAdministrar,
  podeGerenciarRiscos,
  podeTrocarAmbiente,
  podeVerNaturezas,
  podeVerLogs,
  unidadesPermitidasUsuario,
  usuarioAtual,
} from "../utils/permissoes";

export default function AdminLayout() {
  const [open, setOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [relatoriosOpen, setRelatoriosOpen] = useState(true);
  const [operacaoOpen, setOperacaoOpen] = useState(true);
  const [gestaoAvancadaOpen, setGestaoAvancadaOpen] = useState(true);
  const [administracaoOpen, setAdministracaoOpen] = useState(false);
  const [sistemaOpen, setSistemaOpen] = useState(false);
  const [segundosSessao, setSegundosSessao] = useState(0);
  const [notificacoes, setNotificacoes] = useState<Array<{ id: string; titulo: string; mensagem: string; severidade: string }>>([]);
  const [mencoesPendentes, setMencoesPendentes] = useState(0);
  const [passagensAbertas, setPassagensAbertas] = useState(0);
  const [sistemaBloqueado, setSistemaBloqueado] = useState(() => localStorage.getItem("sistemaBloqueado") === "true");
  const [senhaDesbloqueio, setSenhaDesbloqueio] = useState("");
  const [erroDesbloqueio, setErroDesbloqueio] = useState("");
  const [desbloqueando, setDesbloqueando] = useState(false);
  const [tema, setTema] = useState(() => {
    const salvo = localStorage.getItem("tema");
    if (salvo === "dark" || salvo === "light") return salvo;
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  });
  const usuario = usuarioAtual();
  const unidadesDisponiveis = useMemo(() => unidadesPermitidasUsuario(), []);
  const unidadeSalva = sessionStorage.getItem("unidadeAtiva");
  const unidadeInicial =
    unidadeSalva && unidadesDisponiveis.includes(unidadeSalva)
      ? unidadeSalva
      : usuario?.unidade || unidadesDisponiveis[0] || "GJA-T1";
  const [unidadeAtiva, setUnidadeAtiva] = useState(unidadeInicial);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", tema === "dark");
    localStorage.setItem("tema", tema);
  }, [tema]);

  useEffect(() => {
    function sincronizarBloqueio(event: StorageEvent) {
      if (event.key === "sistemaBloqueado") {
        setSistemaBloqueado(event.newValue === "true");
        setSenhaDesbloqueio("");
        setErroDesbloqueio("");
      }
    }

    window.addEventListener("storage", sincronizarBloqueio);
    return () => window.removeEventListener("storage", sincronizarBloqueio);
  }, []);

  useEffect(() => {
    if (!unidadesDisponiveis.includes(unidadeAtiva)) {
      const proximaUnidade = unidadesDisponiveis[0] || usuario?.unidade || "GJA-T1";
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
    const limiteInatividade = 30 * 60 * 1000;
    const atualizarAtividade = () => sessionStorage.setItem("ultimaAtividade", String(Date.now()));
    const eventos = ["click", "keydown", "mousemove", "touchstart"];

    atualizarAtividade();
    eventos.forEach((evento) => window.addEventListener(evento, atualizarAtividade));

    const interval = window.setInterval(() => {
      const ultimaAtividade = Number(sessionStorage.getItem("ultimaAtividade") || Date.now());
      if (Date.now() - ultimaAtividade > limiteInatividade) {
        localStorage.removeItem("token");
        localStorage.removeItem("usuario");
        sessionStorage.removeItem("loginInicio");
        sessionStorage.removeItem("ultimaAtividade");
        window.location.href = "/login";
      }
    }, 30000);

    return () => {
      eventos.forEach((evento) => window.removeEventListener(evento, atualizarAtividade));
      window.clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    function carregarNotificacoes() {
      api.get("/gestao/notificacoes")
      .then((response) => setNotificacoes(response.data))
      .catch(() => setNotificacoes([]));
    }

    carregarNotificacoes();
    window.addEventListener("notificacoes-atualizadas", carregarNotificacoes);

    api.get("/mencoes/contador")
      .then((response) => setMencoesPendentes(response.data.total || 0))
      .catch(() => setMencoesPendentes(0));

    api.get("/operacao/passagens-turno")
      .then((response) => {
        const abertas = Array.isArray(response.data)
          ? response.data.filter((item) => item.status === "Aberto").length
          : 0;
        setPassagensAbertas(abertas);
      })
      .catch(() => setPassagensAbertas(0));

    return () => window.removeEventListener("notificacoes-atualizadas", carregarNotificacoes);
  }, []);

  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss" : "ws";
    const socket = new WebSocket(`${protocol}://${window.location.host}/ws`);

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.tipo === "conectado") return;
        setNotificacoes((atuais) => [
          {
            id: `${data.tipo}-${data.createdAt}`,
            titulo: data.titulo,
            mensagem: data.mensagem,
            severidade: data.severidade || "media",
          },
          ...atuais,
        ].slice(0, 50));
      } catch {
        // Mensagens inválidas do socket são ignoradas para não interromper a sessão.
      }
    };

    return () => socket.close();
  }, []);

  async function logout() {
    try {
      await api.post("/auth/logout");
    } finally {
      localStorage.removeItem("token");
      localStorage.removeItem("usuario");
      localStorage.removeItem("sistemaBloqueado");
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

  function alternarTema() {
    setTema((atual) => (atual === "dark" ? "light" : "dark"));
  }

  function bloquearSistema() {
    const confirmarBloqueio = window.confirm("Deseja realmente bloquear a sessão atual?");
    if (!confirmarBloqueio) return;

    localStorage.setItem("sistemaBloqueado", "true");
    setSenhaDesbloqueio("");
    setErroDesbloqueio("");
    setSistemaBloqueado(true);
  }

  async function desbloquearSistema(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErroDesbloqueio("");

    if (!senhaDesbloqueio) {
      setErroDesbloqueio("Informe sua senha para desbloquear.");
      return;
    }

    try {
      setDesbloqueando(true);
      await api.post("/auth/desbloquear-sessao", { senha: senhaDesbloqueio });
      localStorage.removeItem("sistemaBloqueado");
      sessionStorage.setItem("ultimaAtividade", String(Date.now()));
      setSenhaDesbloqueio("");
      setSistemaBloqueado(false);
    } catch (error: any) {
      setErroDesbloqueio(error.response?.data?.error || "Não foi possível desbloquear o sistema.");
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
  const submenuClass = `ml-6 flex flex-col gap-2 overflow-hidden border-l border-slate-800 pl-4 ${mostrarTextoMenu ? "max-h-[520px] opacity-100" : "max-h-0 opacity-0"}`;

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
        <div className={`flex h-20 items-center border-b border-slate-800 p-4 ${mostrarTextoMenu ? "justify-between" : "justify-center"}`}>
          <div className={`overflow-hidden ${mostrarTextoMenu ? "w-40 opacity-100" : "w-0 opacity-0"}`}>
            <Link to="/" className="flex min-w-0 items-center">
              <img src="/images/movecta-logo.png" alt="Movecta" className="brand-logo h-10 w-40 rounded bg-white object-contain px-3 py-2" />
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
          <button onClick={() => setMobileMenuOpen(false)} className="rounded-lg bg-slate-800 p-2 text-sm hover:bg-slate-700 md:hidden" aria-label="Fechar menu">
            <X size={20} />
          </button>
        </div>

        <nav onClick={fecharMenuMobileAoNavegar} className="mt-6 flex flex-col gap-2 px-2 pb-6 sm:px-3">
          <Link to="/" className={item}>
            <LayoutDashboard size={20} className="shrink-0" />
            <span className={menuText}>Dashboard</span>
          </Link>

          <Link to="/busca" className={item}>
            <Search size={20} className="shrink-0" />
            <span className={menuText}>Busca Global</span>
          </Link>

          <button onClick={() => setRelatoriosOpen(!relatoriosOpen)} className="flex h-11 items-center rounded-xl px-3 text-slate-300 transition-colors duration-100 hover:bg-slate-800 hover:text-white sm:px-4">
            <div className="flex items-center gap-3">
              <FolderOpen size={20} className="shrink-0" />
              <span className={menuText}>Relatorios</span>
            </div>
            <span className={menuToggle}>{relatoriosOpen ? "-" : "+"}</span>
          </button>

          {relatoriosOpen && (
            <div className={submenuClass}>
              <Link to="/ocorrencias" className={subItem}>
                <FileText size={16} />
                Ocorrencias
              </Link>
              <Link to="/investigacao" className={subItem}>
                <Search size={16} />
                Investigacao
              </Link>
              <Link to="/eventos" className={subItem}>
                <CalendarDays size={16} />
                Eventos
              </Link>
              <Link to="/operacao-soc" className={subItem}>
                <Activity size={16} />
                Relatório CCOS
              </Link>
            </div>
          )}

          <button onClick={() => setOperacaoOpen(!operacaoOpen)} className="flex h-11 items-center rounded-xl px-3 text-slate-300 transition-colors duration-100 hover:bg-slate-800 hover:text-white sm:px-4">
            <div className="flex items-center gap-3">
              <ListChecks size={20} className="shrink-0" />
              <span className={menuText}>Operação</span>
            </div>
            <span className={menuToggle}>{operacaoOpen ? "-" : "+"}</span>
          </button>

          {operacaoOpen && (
            <div className={submenuClass}>
              <Link to="/cameras" className={subItem}>
                <Video size={16} />
                Câmeras CFTV
              </Link>
              <Link to="/tarefas" className={subItem}>
                <CheckCircle2 size={16} />
                Central de Tarefas
              </Link>
              <Link to="/planejamento" className={subItem}>
                <Columns3 size={16} />
                Planejamento
              </Link>
              <Link to="/quadra-seguranca" className={subItem}>
                <PackageSearch size={16} />
                Quadra de Segurança
              </Link>
              <Link to="/mapa-operacional" className={subItem}>
                <MapPinned size={16} />
                Mapa Operacional
              </Link>
              <Link to="/notificacoes" className={subItem}>
                <Bell size={16} />
                Notificações
              </Link>
              <Link to="/alertas-operacionais" className={subItem}>
                <ShieldAlert size={16} />
                Alertas Operacionais
              </Link>
              <Link to="/pendencias" className={subItem}>
                <ListChecks size={16} />
                Pendências
              </Link>
              <Link to="/evidencias" className={subItem}>
                <Paperclip size={16} />
                Evidências
              </Link>
              <Link to="/anulacoes" className={subItem}>
                <AlertTriangle size={16} />
                Anulações
              </Link>
            </div>
          )}

          {podeGerenciarRiscos() && (
            <>
              <button onClick={() => setGestaoAvancadaOpen(!gestaoAvancadaOpen)} className="flex h-11 items-center rounded-xl px-3 text-slate-300 transition-colors duration-100 hover:bg-slate-800 hover:text-white sm:px-4">
                <div className="flex items-center gap-3">
                  <BrainCircuit size={20} className="shrink-0" />
                  <span className={menuText}>Gestão Avançada</span>
                </div>
                <span className={menuToggle}>{gestaoAvancadaOpen ? "-" : "+"}</span>
              </button>

              {gestaoAvancadaOpen && (
                <div className={submenuClass}>
                  <Link to="/gestao-patrimonial" className={subItem}>
                    <MapPinned size={16} />
                    Gestão Patrimonial
                  </Link>
                  <Link to="/riscos" className={subItem}>
                    <ShieldAlert size={16} />
                    Análise de Risco
                  </Link>
                  <Link to="/analises-estrategicas" className={subItem}>
                    <ShieldCheck size={16} />
                    Análises Estratégicas
                  </Link>
                  <Link to="/inteligencia" className={subItem}>
                    <BrainCircuit size={16} />
                    Inteligência
                  </Link>
                  <Link to="/matriz-risco" className={subItem}>
                    <Grid3X3 size={16} />
                    Matriz 5x5
                  </Link>
                  <Link to="/planos-acao" className={subItem}>
                    <Target size={16} />
                    Planos de Ação
                  </Link>
                  <Link to="/checklists" className={subItem}>
                    <ClipboardCheck size={16} />
                    Checklist Inspeção Preventiva
                  </Link>
                  <Link to="/aprovacoes" className={subItem}>
                    <CheckCircle2 size={16} />
                    Aprovações
                  </Link>
                </div>
              )}
            </>
          )}

          {(podeAdministrar() || podeVerNaturezas()) && (
            <>
              <button onClick={() => setAdministracaoOpen(!administracaoOpen)} className="flex h-11 items-center rounded-xl px-3 text-slate-300 transition-colors duration-100 hover:bg-slate-800 hover:text-white sm:px-4">
                <div className="flex items-center gap-3">
                  <Settings size={20} className="shrink-0" />
                  <span className={menuText}>Administração</span>
                </div>
                <span className={menuToggle}>{administracaoOpen ? "-" : "+"}</span>
              </button>

              {administracaoOpen && (
                <div className={submenuClass}>
                  {podeAdministrar() && (
                    <Link to="/usuarios" className={subItem}>
                      <Users size={16} />
                      Usuários
                    </Link>
                  )}
                  {podeVerNaturezas() && (
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
                  {podeAdministrar() && (
                    <>
                      <Link to="/configuracoes" className={subItem}>
                        <Settings size={16} />
                        Configurações
                      </Link>
                      <Link to="/sessoes" className={subItem}>
                        <Lock size={16} />
                        Sessões Ativas
                      </Link>
                    </>
                  )}
                </div>
              )}
            </>
          )}

          {(podeAdministrar() || podeVerLogs() || podeVerNaturezas()) && (
            <>
              <button onClick={() => setSistemaOpen(!sistemaOpen)} className="flex h-11 items-center rounded-xl px-3 text-slate-300 transition-colors duration-100 hover:bg-slate-800 hover:text-white sm:px-4">
                <div className="flex items-center gap-3">
                  <Server size={20} className="shrink-0" />
                  <span className={menuText}>Sistema</span>
                </div>
                <span className={menuToggle}>{sistemaOpen ? "-" : "+"}</span>
              </button>

              {sistemaOpen && (
                <div className={submenuClass}>
                  {podeAdministrar() && (
                    <>
                      <Link to="/governanca" className={subItem}>
                        <Server size={16} />
                        Governança
                      </Link>
                      <Link to="/atualizacoes" className={subItem}>
                        <ScrollText size={16} />
                        Atualizações
                      </Link>
                      <Link to="/integridade" className={subItem}>
                        <ShieldCheck size={16} />
                        Integridade
                      </Link>
                    </>
                  )}
                  {podeVerNaturezas() && (
                    <Link to="/sugestoes-melhoria" className={subItem}>
                      <Lightbulb size={16} />
                      Sugestões
                    </Link>
                  )}
                  {podeAdministrar() && (
                    <Link to="/logs" className={subItem}>
                      <ScrollText size={16} />
                      Logs
                    </Link>
                  )}
                </div>
              )}
            </>
          )}

          <button onClick={logout} className="mt-6 flex items-center gap-3 rounded-xl px-4 py-3 text-slate-300 transition-colors duration-100 hover:bg-red-900 hover:text-white">
            <LogOut size={20} className="shrink-0" />
            <span className={menuText}>Sair</span>
          </button>
        </nav>
      </aside>

      <main className={`${mainOffset} min-w-0`}>
        <header className="sticky top-0 z-20 flex min-h-20 flex-col gap-4 border-b border-slate-200 bg-white px-4 py-4 shadow-sm sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
          <div className="flex min-w-0 items-center justify-between gap-2 md:hidden">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="rounded-xl bg-slate-100 p-3 text-slate-700 transition hover:bg-slate-200"
              aria-label="Abrir menu"
            >
              <Menu size={22} />
            </button>

            <div className="flex min-w-0 items-center gap-1.5">
              <Link to="/notificacoes" className="relative rounded-full bg-slate-100 p-2.5 text-slate-700 hover:bg-slate-200">
                <Bell size={17} />
                {notificacoes.length > 0 && (
                  <span className="absolute -right-1 -top-1 rounded-full bg-red-600 px-1.5 text-[10px] font-bold text-white">
                    {notificacoes.length}
                  </span>
                )}
              </Link>
              <Link to="/meus-dados?aba=mencoes" className="relative rounded-full bg-slate-100 p-2.5 text-slate-700 hover:bg-slate-200">
                <AtSign size={17} />
                {mencoesPendentes > 0 && (
                  <span className="absolute -right-1 -top-1 rounded-full bg-blue-600 px-1.5 text-[10px] font-bold text-white">
                    {mencoesPendentes}
                  </span>
                )}
              </Link>
              <Link
                to="/operacao-soc"
                className="relative rounded-full bg-slate-100 p-2.5 text-slate-700 hover:bg-slate-200"
                title={passagensAbertas > 0 ? "Há Relatório CCOS em aberto" : "Relatório CCOS"}
              >
                <Activity size={17} />
                {passagensAbertas > 0 && (
                  <span className="absolute -right-1 -top-1 rounded-full bg-amber-500 px-1.5 text-[10px] font-bold text-white">
                    {passagensAbertas}
                  </span>
                )}
              </Link>
              <button
                type="button"
                onClick={alternarTema}
                className="rounded-full bg-slate-100 p-2.5 text-slate-700 transition hover:bg-slate-200"
                title={tema === "dark" ? "Ativar modo claro" : "Ativar modo escuro"}
              >
                {tema === "dark" ? <Sun size={17} /> : <Moon size={17} />}
              </button>
              <button
                type="button"
                onClick={bloquearSistema}
                className="rounded-full bg-slate-100 p-2.5 text-slate-700 transition hover:bg-slate-200"
                title="Bloquear sistema"
              >
                <Lock size={17} />
              </button>

              <Link to="/meus-dados" className="min-w-0 text-right">
                <p className="hidden truncate text-sm font-semibold text-slate-900 min-[430px]:block">{usuario?.apelido || usuario?.nome || "Usuario"}</p>
                <p className="truncate text-xs font-semibold text-slate-600">Unidade: {unidadeAtiva}</p>
              </Link>
              <Link to="/meus-dados" className="h-10 w-10 shrink-0 overflow-hidden rounded-full bg-slate-200 ring-2 ring-transparent transition hover:ring-blue-400">
                {usuario?.fotoPerfil ? (
                  <img src={usuario.fotoPerfil} alt="Perfil" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center font-bold text-slate-600">
                    {(usuario?.apelido || usuario?.nome || "U").charAt(0).toUpperCase()}
                  </div>
                )}
              </Link>
            </div>
          </div>

          <div className="hidden min-w-0 md:block">
            <p className="text-sm text-slate-500">Ambiente de trabalho</p>
            {podeTrocarAmbiente() ? (
              <select
                value={unidadeAtiva}
                onChange={(e) => alterarUnidade(e.target.value)}
                className="mt-1 w-full max-w-xs rounded-lg border border-slate-300 px-3 py-2 text-sm font-bold text-slate-900"
              >
                {unidadesDisponiveis.map((unidade) => (
                  <option key={unidade} value={unidade}>
                    Unidade: {unidade}
                  </option>
                ))}
              </select>
            ) : (
              <p className="font-bold text-slate-900">Unidade: {usuario?.unidade || "GJA-T1"}</p>
            )}
          </div>

          <div className="hidden min-w-0 items-center justify-end gap-3 sm:gap-4 md:flex">
            <Link to="/notificacoes" className="relative rounded-full bg-slate-100 p-3 text-slate-700 hover:bg-slate-200">
              <Bell size={18} />
              {notificacoes.length > 0 && (
                <span className="absolute -right-1 -top-1 rounded-full bg-red-600 px-1.5 text-xs font-bold text-white">
                  {notificacoes.length}
                </span>
              )}
            </Link>
            <Link to="/meus-dados?aba=mencoes" className="relative rounded-full bg-slate-100 p-3 text-slate-700 hover:bg-slate-200">
              <AtSign size={18} />
              {mencoesPendentes > 0 && (
                <span className="absolute -right-1 -top-1 rounded-full bg-blue-600 px-1.5 text-xs font-bold text-white">
                  {mencoesPendentes}
                </span>
              )}
            </Link>
            <Link
              to="/operacao-soc"
              className="relative rounded-full bg-slate-100 p-3 text-slate-700 hover:bg-slate-200"
              title={passagensAbertas > 0 ? "Há Relatório CCOS em aberto" : "Relatório CCOS"}
            >
              <Activity size={18} />
              {passagensAbertas > 0 && (
                <span className="absolute -right-1 -top-1 rounded-full bg-amber-500 px-1.5 text-xs font-bold text-white">
                  {passagensAbertas}
                </span>
              )}
            </Link>
            <button
              type="button"
              onClick={alternarTema}
              className="rounded-full bg-slate-100 p-3 text-slate-700 transition hover:bg-slate-200"
              title={tema === "dark" ? "Ativar modo claro" : "Ativar modo escuro"}
            >
              {tema === "dark" ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button
              type="button"
              onClick={bloquearSistema}
              className="rounded-full bg-slate-100 p-3 text-slate-700 transition hover:bg-slate-200"
              title="Bloquear sistema"
            >
              <Lock size={18} />
            </button>
            <Link to="/meus-dados" className="hidden min-w-0 text-left sm:text-right md:block">
              <p className="font-semibold text-slate-900">{usuario?.apelido || usuario?.nome || "Usuario"}</p>
              <p className="text-xs text-slate-500">Sessao: {formatarSessao(segundosSessao)}</p>
            </Link>
            <Link to="/meus-dados" className="hidden h-10 w-10 shrink-0 overflow-hidden rounded-full bg-slate-200 ring-2 ring-transparent transition hover:ring-blue-400 md:block">
              {usuario?.fotoPerfil ? (
                <img src={usuario.fotoPerfil} alt="Perfil" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center font-bold text-slate-600">
                  {(usuario?.apelido || usuario?.nome || "U").charAt(0).toUpperCase()}
                </div>
              )}
            </Link>
          </div>
        </header>

        <div className="p-4 sm:p-6 lg:p-8">
          <Outlet />
        </div>
      </main>

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
              <p className="text-sm font-semibold uppercase tracking-[0.25em] text-blue-200">JetGuard bloqueado</p>
              <h2 className="mt-2 text-2xl font-bold">Sessão protegida</h2>
              <p className="mt-2 text-sm text-slate-300">
                O sistema está bloqueado para proteger as informações em tela. Digite a senha do usuário conectado para continuar.
              </p>
            </div>

            <div className="mt-6 flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-900 p-3">
              <div className="h-12 w-12 shrink-0 overflow-hidden rounded-full bg-slate-800">
                {usuario?.fotoPerfil ? (
                  <img src={usuario.fotoPerfil} alt="Perfil" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center font-bold text-slate-300">
                    {(usuario?.apelido || usuario?.nome || "U").charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <p className="truncate font-semibold">{usuario?.apelido || usuario?.nome || "Usuário conectado"}</p>
                <p className="truncate text-xs text-slate-400">{usuario?.email}</p>
              </div>
            </div>

            <label className="mt-5 block">
              <span className="mb-2 block text-sm font-semibold text-slate-200">Senha</span>
              <input
                autoFocus
                type="password"
                value={senhaDesbloqueio}
                onChange={(event) => setSenhaDesbloqueio(event.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-blue-400 focus:ring-2 focus:ring-blue-500/30"
                placeholder="Digite sua senha para desbloquear"
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


