import { useEffect, useState } from "react";
import { Link, Outlet } from "react-router-dom";
import type { MouseEvent } from "react";
import {
  CalendarDays,
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
  UserCircle,
  Users,
  Moon,
  Sun,
  Video,
  Menu,
  X,
  ClipboardList,
} from "lucide-react";
import { api } from "../services/api";
import {
  podeAdministrar,
  podeGerenciarRiscos,
  podeTrocarAmbiente,
  podeVerLogs,
  usuarioAtual,
} from "../utils/permissoes";

const unidades = ["GJA-T1", "GJA-T2", "ITAJAI-SC", "SUAPE-T1", "SUAPE-T2", "ANHANGUERA"];

export default function AdminLayout() {
  const [open, setOpen] = useState(() => window.innerWidth >= 768);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [relatoriosOpen, setRelatoriosOpen] = useState(true);
  const [segundosSessao, setSegundosSessao] = useState(0);
  const [notificacoes, setNotificacoes] = useState<Array<{ id: string; titulo: string; mensagem: string; severidade: string }>>([]);
  const [mencoesPendentes, setMencoesPendentes] = useState(0);
  const [tema, setTema] = useState(() => {
    const salvo = localStorage.getItem("tema");
    if (salvo === "dark" || salvo === "light") return salvo;
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  });
  const [unidadeAtiva, setUnidadeAtiva] = useState(
    sessionStorage.getItem("unidadeAtiva") || usuarioAtual()?.unidade || "GJA-T1"
  );
  const usuario = usuarioAtual();

  useEffect(() => {
    document.documentElement.classList.toggle("dark", tema === "dark");
    localStorage.setItem("tema", tema);
  }, [tema]);

  useEffect(() => {
    const inicio = Number(sessionStorage.getItem("loginInicio") || Date.now());
    sessionStorage.setItem("loginInicio", String(inicio));
    const interval = window.setInterval(() => {
      setSegundosSessao(Math.floor((Date.now() - inicio) / 1000));
    }, 1000);
    return () => window.clearInterval(interval);
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

  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("usuario");
    sessionStorage.removeItem("loginInicio");
    window.location.href = "/login";
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

  function fecharMenuMobileAoNavegar(event: MouseEvent<HTMLElement>) {
    const alvo = event.target as HTMLElement;
    if (alvo.closest("a")) {
      setMobileMenuOpen(false);
    }
  }

  const mostrarTextoMenu = open || mobileMenuOpen;
  const sidebarWidth = open ? "md:w-64" : "md:w-20";
  const mainOffset = open ? "md:ml-64" : "md:ml-20";
  const item =
    "flex items-center gap-3 rounded-xl px-3 py-3 text-slate-300 transition hover:bg-slate-800 hover:text-white sm:px-4";
  const subItem =
    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-400 transition hover:bg-slate-800 hover:text-white";

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

      <aside className={`fixed inset-y-0 left-0 z-30 w-80 max-w-[86vw] ${sidebarWidth} overflow-y-auto bg-slate-950 text-white shadow-2xl transition-all duration-300 ease-in-out ${mobileMenuOpen ? "translate-x-0" : "-translate-x-full"} md:translate-x-0 md:shadow-none`}>
        <div className={`flex h-20 items-center border-b border-slate-800 p-4 ${mostrarTextoMenu ? "justify-between" : "justify-center"}`}>
          {mostrarTextoMenu && (
            <Link to="/" className="flex min-w-0 items-center">
              <img src="/images/movecta-logo.png" alt="Movecta" className="brand-logo h-10 w-40 rounded bg-white object-contain px-3 py-2" />
            </Link>
          )}

          <button onClick={() => setOpen(!open)} className="hidden rounded-lg bg-slate-800 px-2 py-2 text-sm hover:bg-slate-700 sm:px-3 md:block">
            {open ? "<" : ">"}
          </button>
          <button onClick={() => setMobileMenuOpen(false)} className="rounded-lg bg-slate-800 p-2 text-sm hover:bg-slate-700 md:hidden" aria-label="Fechar menu">
            <X size={20} />
          </button>
        </div>

        <nav onClick={fecharMenuMobileAoNavegar} className="mt-6 flex flex-col gap-2 px-2 pb-6 sm:px-3">
          <Link to="/" className={item}>
            <LayoutDashboard size={20} />
            {mostrarTextoMenu && <span>Dashboard</span>}
          </Link>

          <Link to="/perfil" className={item}>
            <UserCircle size={20} />
            {mostrarTextoMenu && <span>Meu Perfil</span>}
          </Link>

          <Link to="/busca" className={item}>
            <Search size={20} />
            {mostrarTextoMenu && <span>Busca Global</span>}
          </Link>

          <button onClick={() => setRelatoriosOpen(!relatoriosOpen)} className="flex items-center justify-between rounded-xl px-3 py-3 text-slate-300 transition hover:bg-slate-800 hover:text-white sm:px-4">
            <div className="flex items-center gap-3">
              <FolderOpen size={20} />
              {mostrarTextoMenu && <span>Relatorios</span>}
            </div>
            {mostrarTextoMenu && <span>{relatoriosOpen ? "-" : "+"}</span>}
          </button>

          {relatoriosOpen && mostrarTextoMenu && (
            <div className="ml-6 flex flex-col gap-2 border-l border-slate-800 pl-4">
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
            </div>
          )}

          <Link to="/evidencias" className={item}>
            <Paperclip size={20} />
            {mostrarTextoMenu && <span>Evidencias</span>}
          </Link>

          <Link to="/pendencias" className={item}>
            <ListChecks size={20} />
            {mostrarTextoMenu && <span>Pendencias</span>}
          </Link>

          <Link to="/notificacoes" className={item}>
            <Bell size={20} />
            {mostrarTextoMenu && <span>Notificações</span>}
          </Link>

          <Link to="/tarefas" className={item}>
            <CheckCircle2 size={20} />
            {mostrarTextoMenu && <span>Central de Tarefas</span>}
          </Link>

          <Link to="/minha-jornada" className={item}>
            <ClipboardList size={20} />
            {mostrarTextoMenu && <span>Minha Jornada</span>}
          </Link>

          <Link to="/cameras" className={item}>
            <Video size={20} />
            {mostrarTextoMenu && <span>Câmeras CFTV</span>}
          </Link>

          <Link to="/mencoes" className={item}>
            <AtSign size={20} />
            {mostrarTextoMenu && <span>Mencoes</span>}
          </Link>

          {podeGerenciarRiscos() && (
            <Link to="/riscos" className={item}>
              <ShieldAlert size={20} />
              {mostrarTextoMenu && <span>Analise de Risco</span>}
            </Link>
          )}

          {podeGerenciarRiscos() && (
            <Link to="/analises-estrategicas" className={item}>
              <ShieldCheck size={20} />
              {mostrarTextoMenu && <span>Analises Estrategicas</span>}
            </Link>
          )}

          {podeGerenciarRiscos() && (
            <Link to="/inteligencia" className={item}>
              <BrainCircuit size={20} />
              {mostrarTextoMenu && <span>Inteligencia</span>}
            </Link>
          )}

          {podeGerenciarRiscos() && (
            <Link to="/aprovacoes" className={item}>
              <CheckCircle2 size={20} />
              {mostrarTextoMenu && <span>Aprovacoes</span>}
            </Link>
          )}

          {podeGerenciarRiscos() && (
            <Link to="/planos-acao" className={item}>
              <Target size={20} />
              {mostrarTextoMenu && <span>Planos de Acao</span>}
            </Link>
          )}

          {podeGerenciarRiscos() && (
            <Link to="/matriz-risco" className={item}>
              <Grid3X3 size={20} />
              {mostrarTextoMenu && <span>Matriz 5x5</span>}
            </Link>
          )}

          {podeGerenciarRiscos() && (
            <Link to="/checklists" className={item}>
              <ClipboardCheck size={20} />
              {mostrarTextoMenu && <span>Checklists</span>}
            </Link>
          )}

          {podeAdministrar() && (
            <>
              <Link to="/usuarios" className={item}>
                <Users size={20} />
                {mostrarTextoMenu && <span>Usuarios</span>}
              </Link>
              <Link to="/naturezas" className={item}>
                <Settings size={20} />
                {mostrarTextoMenu && <span>Naturezas</span>}
              </Link>
              <Link to="/configuracoes" className={item}>
                <Settings size={20} />
                {mostrarTextoMenu && <span>Configurações</span>}
              </Link>
            </>
          )}

          {podeVerLogs() && (
            <Link to="/logs" className={item}>
              <ScrollText size={20} />
              {mostrarTextoMenu && <span>Logs</span>}
            </Link>
          )}

          <button onClick={logout} className="mt-6 flex items-center gap-3 rounded-xl px-4 py-3 text-slate-300 transition hover:bg-red-900 hover:text-white">
            <LogOut size={20} />
            {mostrarTextoMenu && <span>Sair</span>}
          </button>
        </nav>
      </aside>

      <main className={`${mainOffset} min-w-0 transition-all duration-300 ease-in-out`}>
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
              <Link to="/mencoes" className="relative rounded-full bg-slate-100 p-2.5 text-slate-700 hover:bg-slate-200">
                <AtSign size={17} />
                {mencoesPendentes > 0 && (
                  <span className="absolute -right-1 -top-1 rounded-full bg-blue-600 px-1.5 text-[10px] font-bold text-white">
                    {mencoesPendentes}
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

              <div className="min-w-0 text-right">
                <p className="hidden truncate text-sm font-semibold text-slate-900 min-[430px]:block">{usuario?.apelido || usuario?.nome || "Usuario"}</p>
                <p className="truncate text-xs font-semibold text-slate-600">Unidade: {unidadeAtiva}</p>
              </div>
              <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full bg-slate-200">
                {usuario?.fotoPerfil ? (
                  <img src={usuario.fotoPerfil} alt="Perfil" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center font-bold text-slate-600">
                    {(usuario?.apelido || usuario?.nome || "U").charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
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
                {unidades.map((unidade) => (
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
            <Link to="/mencoes" className="relative rounded-full bg-slate-100 p-3 text-slate-700 hover:bg-slate-200">
              <AtSign size={18} />
              {mencoesPendentes > 0 && (
                <span className="absolute -right-1 -top-1 rounded-full bg-blue-600 px-1.5 text-xs font-bold text-white">
                  {mencoesPendentes}
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
            <div className="hidden min-w-0 text-left sm:text-right md:block">
              <p className="font-semibold text-slate-900">{usuario?.apelido || usuario?.nome || "Usuario"}</p>
              <p className="text-xs text-slate-500">Sessao: {formatarSessao(segundosSessao)}</p>
            </div>
            <div className="hidden h-10 w-10 shrink-0 overflow-hidden rounded-full bg-slate-200 md:block">
              {usuario?.fotoPerfil ? (
                <img src={usuario.fotoPerfil} alt="Perfil" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center font-bold text-slate-600">
                  {(usuario?.apelido || usuario?.nome || "U").charAt(0).toUpperCase()}
                </div>
              )}
            </div>
          </div>
        </header>

        <div className="p-4 sm:p-6 lg:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}


