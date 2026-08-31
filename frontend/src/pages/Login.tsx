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
      style={{ backgroundImage: "url('/images/movesecurity-login-bg.png')" }}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-white/58 to-white/12" />
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-white/80 to-transparent" />

      <section className="relative z-10 flex min-h-screen items-center justify-center px-5 py-8">
        <form
          onSubmit={handleLogin}
          className="w-full max-w-[470px] rounded-[32px] border border-slate-200/90 bg-white/88 p-7 shadow-[0_30px_95px_rgba(15,23,42,0.18)] backdrop-blur-xl sm:p-9"
        >
          <div className="text-center">
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-600/25">
              <ShieldCheck size={26} />
            </div>

            <img
              src="/images/movecta-logo.png"
              alt="Movecta"
              className="mx-auto h-auto w-48 object-contain"
            />

            <p className="mt-7 text-xs font-black uppercase tracking-[0.22em] text-blue-600">
              Acesso seguro
            </p>
            <h1 className="mt-3 text-4xl font-black text-slate-950">
              MoveSecurity
            </h1>
          </div>

          <div className="mt-10 space-y-5">
            <label className="block">
              <span className="mb-2 block text-sm font-black text-slate-700">
                Email
              </span>
              <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 shadow-[0_10px_30px_rgba(15,23,42,0.06)] transition focus-within:border-blue-400 focus-within:bg-white focus-within:ring-4 focus-within:ring-blue-100/80">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <Mail size={17} />
                </span>
                <input
                  type="email"
                  placeholder="nome@empresa.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{
                    backgroundColor: "transparent",
                    boxShadow: "none",
                    WebkitTextFillColor: "#020617",
                  }}
                  className="h-9 w-full appearance-none bg-transparent text-sm font-bold text-slate-950 outline-none placeholder:text-slate-400"
                />
              </div>
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-black text-slate-700">
                Senha
              </span>
              <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 shadow-[0_10px_30px_rgba(15,23,42,0.06)] transition focus-within:border-blue-400 focus-within:bg-white focus-within:ring-4 focus-within:ring-blue-100/80">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <LockKeyhole size={17} />
                </span>
                <input
                  type="password"
                  placeholder="Digite sua senha"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{
                    backgroundColor: "transparent",
                    boxShadow: "none",
                    WebkitTextFillColor: "#020617",
                  }}
                  className="h-9 w-full appearance-none bg-transparent text-sm font-bold text-slate-950 outline-none placeholder:text-slate-400"
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
      </section>
    </main>
  );
}
