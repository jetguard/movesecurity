import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");

  async function handleLogin(
    event: React.FormEvent
  ) {
    event.preventDefault();

    try {
      const response = await fetch(
        "https://shiny-waddle-rv57v765vgxhx676-3000.app.github.dev/api/auth/login",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email,
            senha,
          }),
        }
      );

      const data = await response.json();

      if (data.error) {
        alert(data.error);
        return;
      }

      localStorage.setItem("token", data.token);

      navigate("/");

    } catch (error) {
      alert("Erro ao conectar com servidor");
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
      <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-2xl">

        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-950 text-2xl text-white">
            JG
          </div>

          <h1 className="text-3xl font-bold text-slate-900">
            JetGuard
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Acesse sua conta
          </p>
        </div>

        <form
          onSubmit={handleLogin}
          className="space-y-5"
        >
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              E-mail
            </label>

            <input
              type="email"
              required
              value={email}
              onChange={(e) =>
                setEmail(e.target.value)
              }
              placeholder="Digite seu e-mail"
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-slate-950 focus:ring-2 focus:ring-slate-200"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Senha
            </label>

            <input
              type="password"
              required
              value={senha}
              onChange={(e) =>
                setSenha(e.target.value)
              }
              placeholder="Digite sua senha"
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-slate-950 focus:ring-2 focus:ring-slate-200"
            />
          </div>

          <button
            type="submit"
            className="w-full rounded-xl bg-slate-950 py-3 font-semibold text-white transition hover:bg-slate-800"
          >
            Entrar no sistema
          </button>
        </form>
      </div>
    </div>
  );
}