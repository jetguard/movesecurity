import { useNavigate } from "react-router-dom";

export default function Login() {
  const navigate = useNavigate();

  function handleLogin(event: React.FormEvent) {
    event.preventDefault();

    // Login temporário
    localStorage.setItem("token", "usuario-logado");

    navigate("/");
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
            Acesse sua conta para continuar
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              E-mail
            </label>
            <input
              type="email"
              required
              placeholder="seuemail@empresa.com"
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