import { useState } from "react";
import { Link, Outlet } from "react-router-dom";

export default function AdminLayout() {
  const [open, setOpen] = useState(true);
  const [relatoriosOpen, setRelatoriosOpen] = useState(true);

  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("usuario");

    window.location.href = "/login";
  }

  return (
    <div className="flex min-h-screen bg-slate-100">
      <aside
        className={`${
          open ? "w-64" : "w-20"
        } bg-slate-950 text-white transition-all duration-300 ease-in-out`}
      >
        <div className="flex items-center justify-between border-b border-slate-800 p-4">
          {open && (
            <h1 className="text-xl font-bold tracking-wide">
              Movecta S/A
            </h1>
          )}

          <button
            onClick={() => setOpen(!open)}
            className="rounded-lg bg-slate-800 px-3 py-2 text-sm hover:bg-slate-700"
          >
            {open ? "←" : "→"}
          </button>
        </div>

        <nav className="mt-6 flex flex-col gap-2 px-3">

          <Link
            to="/"
            className="flex items-center gap-3 rounded-xl px-4 py-3 text-slate-300 transition hover:bg-slate-800 hover:text-white"
          >
            <span>🏠</span>
            {open && <span>Dashboard</span>}
          </Link>

          <Link
            to="/perfil"
            className="flex items-center gap-3 rounded-xl px-4 py-3 text-slate-300 transition hover:bg-slate-800 hover:text-white"
          >
            <span>👤</span>
            {open && <span>Meu Perfil</span>}
          </Link>

          <button
            onClick={() => setRelatoriosOpen(!relatoriosOpen)}
            className="flex items-center justify-between rounded-xl px-4 py-3 text-slate-300 transition hover:bg-slate-800 hover:text-white"
          >
            <div className="flex items-center gap-3">
              <span>📂</span>
              {open && <span>Relatórios</span>}
            </div>

            {open && (
              <span>
                {relatoriosOpen ? "−" : "+"}
              </span>
            )}
          </button>

          {relatoriosOpen && open && (
            <div className="ml-6 flex flex-col gap-2 border-l border-slate-800 pl-4">

              <Link
                to="/ocorrencias"
                className="rounded-lg px-3 py-2 text-sm text-slate-400 transition hover:bg-slate-800 hover:text-white"
              >
                📄 Ocorrências
              </Link>

              <Link
                to="/investigacao"
                className="rounded-lg px-3 py-2 text-sm text-slate-400 transition hover:bg-slate-800 hover:text-white"
              >
                🔎 Investigação
              </Link>

              <Link
                to="/eventos"
                className="rounded-lg px-3 py-2 text-sm text-slate-400 transition hover:bg-slate-800 hover:text-white"
              >
                📅 Eventos
              </Link>

            </div>
          )}

          <Link
            to="/naturezas"
            className="flex items-center gap-3 rounded-xl px-4 py-3 text-slate-300 transition hover:bg-slate-800 hover:text-white"
          >
            <span>⚙</span>
            {open && <span>Naturezas</span>}
          </Link>

          <button
            onClick={logout}
            className="mt-6 flex items-center gap-3 rounded-xl px-4 py-3 text-slate-300 transition hover:bg-red-900 hover:text-white"
          >
            <span>🚪</span>
            {open && <span>Sair</span>}
          </button>

        </nav>
      </aside>

      <main className="flex-1 p-8">
        <Outlet />
      </main>
    </div>
  );
}
