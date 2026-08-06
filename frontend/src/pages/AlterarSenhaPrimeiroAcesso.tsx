import { useState } from "react";
import type { FormEvent } from "react";
import type { AxiosError } from "axios";
import { LockKeyhole, ShieldCheck } from "lucide-react";
import { api } from "../services/api";
import { usuarioAtual } from "../utils/permissoes";

type ApiError = {
  error?: string;
};

export default function AlterarSenhaPrimeiroAcesso() {
  const usuario = usuarioAtual();
  const [senhaAtual, setSenhaAtual] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [pinOperacional, setPinOperacional] = useState("");
  const [confirmarPinOperacional, setConfirmarPinOperacional] = useState("");
  const [salvando, setSalvando] = useState(false);

  function normalizarPin(valor: string) {
    return valor.replace(/\D/g, "").slice(0, 4);
  }

  async function salvar(event: FormEvent) {
    event.preventDefault();

    try {
      setSalvando(true);
      const response = await api.post("/auth/alterar-senha", {
        senhaAtual,
        novaSenha,
        confirmarSenha,
        pinOperacional,
        confirmarPinOperacional,
      });

      localStorage.setItem("usuario", JSON.stringify(response.data.usuario));
      window.location.href = "/";
    } catch (error) {
      const apiError = error as AxiosError<ApiError>;
      alert(apiError.response?.data?.error || "Erro ao alterar senha.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-5 py-10 text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(37,99,235,0.35),transparent_34%),radial-gradient(circle_at_80%_10%,rgba(14,165,233,0.18),transparent_30%)]" />

      <form
        onSubmit={salvar}
        className="relative z-10 w-full max-w-lg rounded-3xl border border-white/10 bg-white/10 p-7 shadow-2xl backdrop-blur-xl sm:p-8"
      >
        <div className="mb-7 flex items-start gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-blue-500/20 text-blue-200 ring-1 ring-blue-300/20">
            <LockKeyhole size={26} />
          </div>
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-blue-200">
              Primeiro acesso
            </p>
            <h1 className="mt-2 text-2xl font-bold">
              Configure seu acesso seguro
            </h1>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              Olá, {usuario?.apelido || usuario?.nome || "usuário"}. Para
              continuar no JetGuard, cadastre uma senha definitiva e um PIN
              operacional.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-slate-200">
              Senha provisória
            </span>
            <input
              type="password"
              placeholder="Digite a senha provisória recebida"
              value={senhaAtual}
              onChange={(event) => setSenhaAtual(event.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white px-4 py-3 text-slate-900 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-500/20"
              required
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-slate-200">
              Nova senha
            </span>
            <input
              type="password"
              placeholder="Crie uma nova senha definitiva"
              value={novaSenha}
              onChange={(event) => setNovaSenha(event.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white px-4 py-3 text-slate-900 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-500/20"
              minLength={8}
              required
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-slate-200">
              Confirmar nova senha
            </span>
            <input
              type="password"
              placeholder="Repita a nova senha"
              value={confirmarSenha}
              onChange={(event) => setConfirmarSenha(event.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white px-4 py-3 text-slate-900 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-500/20"
              minLength={8}
              required
            />
          </label>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-200">
                PIN operacional
              </span>
              <input
                type="password"
                inputMode="numeric"
                pattern="\d{4}"
                maxLength={4}
                placeholder="4 dígitos"
                value={pinOperacional}
                onChange={(event) =>
                  setPinOperacional(normalizarPin(event.target.value))
                }
                className="w-full rounded-xl border border-white/10 bg-white px-4 py-3 text-slate-900 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-500/20"
                required
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-200">
                Confirmar PIN
              </span>
              <input
                type="password"
                inputMode="numeric"
                pattern="\d{4}"
                maxLength={4}
                placeholder="Repita o PIN"
                value={confirmarPinOperacional}
                onChange={(event) =>
                  setConfirmarPinOperacional(normalizarPin(event.target.value))
                }
                className="w-full rounded-xl border border-white/10 bg-white px-4 py-3 text-slate-900 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-500/20"
                required
              />
            </label>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-blue-300/20 bg-blue-500/10 p-4 text-sm leading-6 text-blue-100">
          <div className="mb-2 flex items-center gap-2 font-bold">
            <ShieldCheck size={18} />
            Regra de segurança
          </div>
          A nova senha deve ter pelo menos 8 caracteres. O PIN deve ter 4
          dígitos e será usado para desbloquear sessão, enviar relatórios e
          assinar ações sensíveis.
        </div>

        <button
          type="submit"
          disabled={salvando}
          className="mt-7 w-full rounded-xl bg-blue-600 px-4 py-3 font-bold text-white shadow-lg shadow-blue-900/40 transition hover:-translate-y-0.5 hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-slate-500"
        >
          {salvando ? "Salvando..." : "Salvar senha, criar PIN e acessar"}
        </button>
      </form>
    </main>
  );
}
