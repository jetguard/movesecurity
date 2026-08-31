import type { AxiosError } from "axios";
import { LockKeyhole, Mail, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { api } from "../services/api";

type ApiError = {
  error?: string;
};

function obterDeviceId() {
  const existente = localStorage.getItem("jetguardDeviceId");
  if (existente) return existente;

  const novo =
    typeof crypto !== "undefined" && "randomUUID" in crypto
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

      localStorage.setItem("usuario", JSON.stringify(response.data.usuario));
      localStorage.setItem("jetguardUltimaAtividade", String(Date.now()));
      sessionStorage.setItem("loginInicio", String(Date.now()));

      if (localStorage.getItem("bloquearAposProximoLogin") === "true") {
        localStorage.setItem("sistemaBloqueado", "true");
        localStorage.removeItem("bloquearAposProximoLogin");
      }

      window.location.href = response.data.usuario?.deveAlterarSenha
        ? "/alterar-senha"
        : "/";
    } catch (error) {
      const apiError = error as AxiosError<ApiError>;
      alert(apiError.response?.data?.error || "Erro ao fazer login");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main
      className="relative min-h-screen overflow-hidden bg-white bg-cover bg-center text-slate-950"
      style={{ backgroundImage: "url('/images/movesecurity-login-bg.jpg')" }}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-white/95 via-white/82 to-white/44" />
      <div className="absolute inset-x-0 bottom-0 h-44 bg-gradient-to-t from-white via-white/80 to-transparent" />

      <section className="relative z-10 flex min-h-screen items-center px-5 py-8 sm:px-8 lg:px-14">
        <div className="grid w-full grid-cols-1 items-center gap-8 lg:grid-cols-[minmax(0,1fr)_430px]">
          <div className="max-w-3xl">
            <div className="mb-10 inline-flex items-center gap-3 rounded-full border border-blue-100 bg-white/85 px-4 py-2 text-sm font-bold text-blue-700 shadow-sm backdrop-blur">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-white">
                <ShieldCheck size={17} />
              </span>
              Segurança corporativa Movecta
            </div>

            <img
              src="/images/movecta-logo.png"
              alt="Movecta"
              className="h-auto w-56 object-contain sm:w-64"
            />

            <h1 className="mt-8 text-5xl font-black tracking-normal text-slate-950 sm:text-6xl lg:text-7xl">
              MoveSecurity
            </h1>
            <p className="mt-4 max-w-2xl text-lg font-semibold leading-8 text-slate-600 sm:text-xl">
              Plataforma nacional de segurança patrimonial, treinamentos,
              certificados, ocorrências, análises de risco e planos de ação.
            </p>

            <div className="mt-9 grid max-w-2xl grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 bg-white/85 p-4 shadow-sm backdrop-blur">
                <p className="text-2xl font-black text-blue-600">24h</p>
                <p className="mt-1 text-sm font-semibold text-slate-600">
                  Controle operacional
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white/85 p-4 shadow-sm backdrop-blur">
                <p className="text-2xl font-black text-blue-600">PDF</p>
                <p className="mt-1 text-sm font-semibold text-slate-600">
                  Relatórios validados
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white/85 p-4 shadow-sm backdrop-blur">
                <p className="text-2xl font-black text-blue-600">SSO</p>
                <p className="mt-1 text-sm font-semibold text-slate-600">
                  Login corporativo
                </p>
              </div>
            </div>
          </div>

          <form
            onSubmit={handleLogin}
            className="w-full rounded-[28px] border border-slate-200 bg-white/92 p-7 shadow-2xl shadow-blue-900/10 backdrop-blur-xl md:p-8"
          >
            <div className="mb-8">
              <p className="text-xs font-black uppercase tracking-[0.22em] text-blue-600">
                Acesso seguro
              </p>
              <h2 className="mt-3 text-3xl font-black text-slate-950">
                Entrar no MoveSecurity
              </h2>
              <p className="mt-2 text-sm font-semibold text-slate-500">
                Use suas credenciais para continuar.
              </p>
            </div>

            <div className="space-y-5">
              <label className="block">
                <span className="mb-2 block text-sm font-black text-slate-700">
                  Email
                </span>
                <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm transition focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-100">
                  <Mail size={18} className="text-blue-600" />
                  <input
                    type="email"
                    placeholder="nome@empresa.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-transparent text-sm font-bold text-slate-950 outline-none placeholder:text-slate-400"
                  />
                </div>
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-black text-slate-700">
                  Senha
                </span>
                <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm transition focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-100">
                  <LockKeyhole size={18} className="text-blue-600" />
                  <input
                    type="password"
                    placeholder="Digite sua senha"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-transparent text-sm font-bold text-slate-950 outline-none placeholder:text-slate-400"
                  />
                </div>
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-7 w-full rounded-2xl bg-blue-600 px-4 py-3.5 font-black text-white shadow-lg shadow-blue-600/25 transition hover:-translate-y-0.5 hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              {loading ? "Entrando..." : "Entrar"}
            </button>

            <div className="mt-6 flex items-center justify-between border-t border-slate-200 pt-5 text-xs font-bold text-slate-500">
              <span>Movecta S/A</span>
              <span>MoveSecurity</span>
            </div>
          </form>
        </div>
      </section>
    </main>
  );
}
