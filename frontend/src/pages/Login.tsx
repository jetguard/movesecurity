import { useState } from "react";
import type { AxiosError } from "axios";
import { api } from "../services/api";

type ApiError = {
  error?: string;
};

function obterDeviceId() {
  const existente = localStorage.getItem("jetguardDeviceId");
  if (existente) return existente;

  const novo = typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  localStorage.setItem("jetguardDeviceId", novo);
  return novo;
}

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();

    if (!email || !password) {
      alert("Preencha email e senha");
      return;
    }

    try {
      setLoading(true);

      const response = await api.post("/auth/login", {
        email,
        senha: password,
        deviceId: obterDeviceId(),
      });

      localStorage.setItem("token", response.data.token);
      localStorage.setItem("usuario", JSON.stringify(response.data.usuario));
      sessionStorage.setItem("loginInicio", String(Date.now()));

      window.location.href = response.data.usuario?.deveAlterarSenha ? "/alterar-senha" : "/";
    } catch (error) {
      const apiError = error as AxiosError<ApiError>;
      alert(apiError.response?.data?.error || "Erro ao fazer login");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main
      className="relative min-h-screen overflow-hidden bg-slate-950 bg-cover bg-center text-white"
      style={{ backgroundImage: "url('/images/login-bg.png')" }}
    >
      <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/80 to-slate-950/20" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_28%_38%,rgba(37,99,235,0.36),transparent_32%),linear-gradient(to_top,rgba(2,6,23,0.82),transparent_46%)]" />

      <section className="relative z-10 flex min-h-screen items-center px-6 py-10 md:px-12 lg:px-20">
        <div className="grid w-full max-w-6xl grid-cols-1 items-center gap-10 lg:grid-cols-[1fr_420px]">
          <div className="max-w-2xl">
            <div className="mb-8 inline-flex items-center gap-3 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm text-blue-100 shadow-lg backdrop-blur">
              <span className="h-2 w-2 rounded-full bg-blue-400 shadow-[0_0_18px_rgba(96,165,250,0.9)]" />
              Plataforma de segurança patrimonial
            </div>

            <img
              src="/images/jetguard-login-logo.png"
              alt="JetGuard"
              className="w-full max-w-xl rounded-2xl object-contain shadow-2xl shadow-blue-950/40"
            />

            <p className="mt-5 max-w-xl text-lg leading-8 text-slate-200">
              Gestão inteligente de ocorrências, eventos, análises e
              investigações para operações portuárias e ambientes críticos.
            </p>

            <div className="mt-10 grid max-w-xl grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-white/10 bg-white/10 p-4 backdrop-blur">
                <p className="text-2xl font-bold">24h</p>
                <p className="mt-1 text-sm text-slate-300">Controle operacional</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/10 p-4 backdrop-blur">
                <p className="text-2xl font-bold">PDF</p>
                <p className="mt-1 text-sm text-slate-300">Relatórios validados</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/10 p-4 backdrop-blur">
                <p className="text-2xl font-bold">Logs</p>
                <p className="mt-1 text-sm text-slate-300">Auditoria completa</p>
              </div>
            </div>
          </div>

          <form
            onSubmit={handleLogin}
            className="w-full rounded-2xl border border-white/15 bg-slate-950/62 p-7 shadow-2xl shadow-blue-950/40 backdrop-blur-xl md:p-8"
          >
            <div className="mb-8">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-300">
                Acesso seguro
              </p>
              <h2 className="mt-3 text-3xl font-bold">Entrar no sistema</h2>
              <p className="mt-2 text-sm text-slate-300">
                Use suas credenciais para continuar.
              </p>
            </div>

            <div className="space-y-5">
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-200">
                  Email
                </span>
                <input
                  type="email"
                  placeholder="nome@empresa.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-white/95 px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-500/20"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-200">
                  Senha
                </span>
                <input
                  type="password"
                  placeholder="Digite sua senha"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-white/95 px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-500/20"
                />
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-7 w-full rounded-xl bg-blue-600 px-4 py-3 font-bold text-white shadow-lg shadow-blue-900/40 transition hover:-translate-y-0.5 hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-slate-500"
            >
              {loading ? "Entrando..." : "Entrar"}
            </button>

            <div className="mt-6 flex items-center justify-between border-t border-white/10 pt-5 text-xs text-slate-400">
              <span>Movecta S/A</span>
              <span>Powered by Fernando Nunes</span>
            </div>
          </form>
        </div>
      </section>
    </main>
  );
}



