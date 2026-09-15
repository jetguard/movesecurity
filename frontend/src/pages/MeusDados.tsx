import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { AtSign, ClipboardList, UserCircle } from "lucide-react";
import Perfil from "./Perfil";
import MinhaJornada from "./MinhaJornada";
import Mencoes from "./Mencoes";
import Tarefas from "./Tarefas";

const abas = [
  { id: "perfil", label: "Meu Perfil", icon: UserCircle },
  { id: "jornada", label: "Minha Jornada", icon: ClipboardList },
  { id: "mencoes", label: "Minhas Menções", icon: AtSign },
  { id: "tarefas", label: "Minhas Tarefas", icon: ClipboardList },
];

export default function MeusDados() {
  const [params, setParams] = useSearchParams();
  const [abaAtiva, setAbaAtiva] = useState(params.get("aba") || "perfil");

  useEffect(() => {
    const aba = params.get("aba") || "perfil";
    setAbaAtiva(abas.some((item) => item.id === aba) ? aba : "perfil");
  }, [params]);

  function selecionarAba(aba: string) {
    setAbaAtiva(aba);
    setParams(aba === "perfil" ? {} : { aba });
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-blue-600">
          Área do usuário
        </p>
        <h1 className="mt-2 text-2xl font-black text-slate-900 sm:text-3xl">
          Meus Dados
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Perfil, jornada operacional e menções reunidos em um só lugar.
        </p>

        <div className="mt-5 flex flex-wrap gap-2">
          {abas.map((aba) => {
            const Icone = aba.icon;
            const ativo = abaAtiva === aba.id;
            return (
              <button
                key={aba.id}
                type="button"
                onClick={() => selecionarAba(aba.id)}
                className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition ${
                  ativo
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-900/20"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                <Icone size={17} />
                {aba.label}
              </button>
            );
          })}
        </div>
      </section>

      {abaAtiva === "perfil" && <Perfil />}
      {abaAtiva === "jornada" && <MinhaJornada />}
      {abaAtiva === "mencoes" && <Mencoes />}
      {abaAtiva === "tarefas" && <Tarefas />}
    </div>
  );
}
