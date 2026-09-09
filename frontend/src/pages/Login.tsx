import type { AxiosError } from "axios";
import { Building2, KeyRound, LockKeyhole, Mail, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "../services/api";

type ApiError = {
  error?: string;
};

type SsoConfig = {
  ativo: boolean;
  nomeBotao?: string;
  loginLocalEmergencia?: boolean;
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
  const [loadingSso, setLoadingSso] = useState(false);
  const [ssoConfig, setSsoConfig] = useState<SsoConfig | null>(null);
  const [twoFactorToken, setTwoFactorToken] = useState("");
  const [codigo2fa, setCodigo2fa] = useState("");
  const [mensagem2fa, setMensagem2fa] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("sso") === "erro") {
      alert(params.get("motivo") || "Não foi possível concluir o login corporativo.");
      window.history.replaceState({}, document.title, "/login");
    }

    api
      .get<SsoConfig>("/auth/sso/config")
      .then((response) => setSsoConfig(response.data))
      .catch(() => setSsoConfig({ ativo: false, loginLocalEmergencia: true }));
  }, []);

  function concluirLogin(usuario: any) {
    localStorage.setItem("usuario", JSON.stringify(usuario));
    localStorage.setItem("jetguardUltimaAtividade", String(Date.now()));
    sessionStorage.setItem("loginInicio", String(Date.now()));

    if (localStorage.getItem("bloquearAposProximoLogin") === "true") {
      localStorage.setItem("sistemaBloqueado", "true");
      localStorage.removeItem("bloquearAposProximoLogin");
    }

    window.location.href = usuario?.deveAlterarSenha ? "/alterar-senha" : "/";
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();

    try {
      setLoading(true);

      if (twoFactorToken) {
        if (codigo2fa.replace(/\D/g, "").length !== 6) {
          alert("Informe o código de 6 dígitos enviado por e-mail.");
          return;
        }
        const response = await api.post("/auth/login/2fa", {
          twoFactorToken,
          codigo: codigo2fa,
        });
        concluirLogin(response.data.usuario);
        return;
      }

      if (!email || !password) {
        alert("Preencha email e senha");
        return;
      }

      const response = await api.post("/auth/login", {
        email,
        senha: password,
        deviceId: obterDeviceId(),
      });

      if (response.data.twoFactorRequired) {
        setTwoFactorToken(response.data.twoFactorToken || "");
        setMensagem2fa(
          response.data.mensagem ||
            "Código de verificação enviado para seu e-mail.",
        );
        setCodigo2fa("");
        return;
      }

      concluirLogin(response.data.usuario);
    } catch (error) {
      const apiError = error as AxiosError<ApiError>;
      alert(apiError.response?.data?.error || "Erro ao fazer login");
    } finally {
      setLoading(false);
    }
  }

  function iniciarLoginCorporativo() {
    setLoadingSso(true);
    window.location.href = "/api/auth/sso/iniciar";
  }

  function voltarLoginSenha() {
    setTwoFactorToken("");
    setCodigo2fa("");
    setMensagem2fa("");
  }

  const exibirLoginLocal = ssoConfig?.loginLocalEmergencia !== false;

  return (
    <main
      className="movesecurity-login relative min-h-screen overflow-hidden bg-white bg-cover bg-center text-slate-950"
      style={{ backgroundImage: "url('/images/movesecurity-login-bg.png')" }}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-white/58 to-white/12" />
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-white/80 to-transparent" />

      <section className="relative z-10 flex min-h-screen items-center justify-center px-5 py-8 lg:justify-end lg:pr-[calc(8vw+75px)]">
        <form
          onSubmit={handleLogin}
          className="w-full max-w-[410px] rounded-[28px] border border-slate-200/90 bg-white/88 p-6 shadow-[0_26px_80px_rgba(15,23,42,0.18)] backdrop-blur-xl sm:p-7"
        >
          <div className="text-center">
            <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-600/25">
              <ShieldCheck size={23} />
            </div>

            <p className="text-xs font-black uppercase tracking-[0.22em] text-blue-600">
              Acesso seguro
            </p>
            <h1 className="mt-3 text-3xl font-black text-slate-950">
              MoveSecurity
            </h1>
          </div>

          <div className="mt-7 space-y-4">
            {ssoConfig?.ativo && (
              <button
                type="button"
                onClick={iniciarLoginCorporativo}
                disabled={loadingSso}
                className="flex w-full items-center justify-center gap-3 rounded-2xl border border-blue-100 bg-blue-600 px-4 py-3.5 text-sm font-black text-white shadow-lg shadow-blue-600/20 transition hover:-translate-y-0.5 hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-slate-400"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/15">
                  <Building2 size={17} />
                </span>
                {loadingSso
                  ? "Abrindo login corporativo..."
                  : ssoConfig.nomeBotao || "Entrar com conta corporativa"}
              </button>
            )}

            {ssoConfig?.ativo && exibirLoginLocal && (
              <div className="flex items-center gap-3">
                <span className="h-px flex-1 bg-slate-200" />
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                  acesso local
                </span>
                <span className="h-px flex-1 bg-slate-200" />
              </div>
            )}

            {exibirLoginLocal && (
              <>
                {twoFactorToken ? (
                  <>
                    <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-bold text-blue-900">
                      {mensagem2fa}
                    </div>
                    <label className="block">
                      <span className="mb-2 block text-sm font-black text-slate-700">
                        Código de verificação
                      </span>
                      <div className="login-input-shell flex items-center gap-3 rounded-2xl border px-3.5 py-2.5 transition">
                        <span className="login-input-icon flex h-8 w-8 shrink-0 items-center justify-center rounded-xl">
                          <KeyRound size={17} />
                        </span>
                        <input
                          inputMode="numeric"
                          placeholder="000000"
                          value={codigo2fa}
                          onChange={(e) =>
                            setCodigo2fa(e.target.value.replace(/\D/g, "").slice(0, 6))
                          }
                          maxLength={6}
                          style={{
                            backgroundColor: "transparent",
                            boxShadow: "none",
                            WebkitTextFillColor: "#020617",
                          }}
                          className="login-input h-8 w-full appearance-none bg-transparent text-sm font-bold tracking-[0.3em] outline-none"
                        />
                      </div>
                    </label>
                    <button
                      type="button"
                      onClick={voltarLoginSenha}
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-600 transition hover:bg-slate-50"
                    >
                      Voltar para login
                    </button>
                  </>
                ) : (
                  <>
                    <label className="block">
                      <span className="mb-2 block text-sm font-black text-slate-700">
                        Email
                      </span>
                      <div className="login-input-shell flex items-center gap-3 rounded-2xl border px-3.5 py-2.5 transition">
                        <span className="login-input-icon flex h-8 w-8 shrink-0 items-center justify-center rounded-xl">
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
                          className="login-input h-8 w-full appearance-none bg-transparent text-sm font-bold outline-none"
                        />
                      </div>
                    </label>

                    <label className="block">
                      <span className="mb-2 block text-sm font-black text-slate-700">
                        Senha
                      </span>
                      <div className="login-input-shell flex items-center gap-3 rounded-2xl border px-3.5 py-2.5 transition">
                        <span className="login-input-icon flex h-8 w-8 shrink-0 items-center justify-center rounded-xl">
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
                          className="login-input h-8 w-full appearance-none bg-transparent text-sm font-bold outline-none"
                        />
                      </div>
                    </label>
                  </>
                )}
              </>
            )}
          </div>

          {exibirLoginLocal && (
            <button
              type="submit"
              disabled={loading}
              className="mt-6 w-full rounded-2xl bg-blue-600 px-4 py-3 font-black text-white shadow-lg shadow-blue-600/25 transition hover:-translate-y-0.5 hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              {loading
                ? twoFactorToken
                  ? "Validando..."
                  : "Entrando..."
                : twoFactorToken
                  ? "Validar código"
                  : "Entrar"}
            </button>
          )}

          <div className="mt-6 flex items-center justify-between border-t border-slate-200 pt-5 text-xs font-bold text-slate-500">
            <span>Movecta S/A</span>
            <span>MoveSecurity</span>
          </div>
        </form>
      </section>
    </main>
  );
}
