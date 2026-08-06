import { Link, useLocation } from "react-router-dom";
import { ArrowLeft, BrainCircuit } from "lucide-react";

function tituloModulo(pathname: string) {
  if (pathname.includes("analise-simplificada")) return "Análise Simplificada";
  return "Análise Completa";
}

export default function RiscosModuloEmConstrucao() {
  const location = useLocation();
  const titulo = tituloModulo(location.pathname);

  return (
    <div className="min-h-[calc(100vh-5rem)] bg-slate-950 px-4 py-6 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <Link
          to="/riscos/cadastro-geral"
          className="inline-flex items-center gap-2 rounded-xl border border-slate-700 px-4 py-2 text-sm font-bold text-slate-200 transition hover:border-blue-400 hover:text-white"
        >
          <ArrowLeft size={16} />
          Voltar para Cadastro Geral
        </Link>

        <section className="mt-6 rounded-2xl border border-slate-800 bg-slate-900/80 p-8 shadow-2xl shadow-black/20">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600/20 text-blue-300">
            <BrainCircuit size={28} />
          </div>
          <p className="mt-6 text-xs font-black uppercase tracking-[0.35em] text-blue-300">
            Análise de Riscos
          </p>
          <h1 className="mt-3 text-3xl font-black text-white">{titulo}</h1>
          <p className="mt-4 max-w-2xl text-sm font-semibold leading-7 text-slate-300">
            Este módulo será construído no novo padrão da análise de riscos. O
            Cadastro Geral já está disponível para preparar macro processos,
            setores, riscos, fatores de risco e controles preventivos.
          </p>
        </section>
      </div>
    </div>
  );
}
