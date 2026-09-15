import { useEffect, useState } from "react";
import { api } from "../services/api";

type Mencao = {
  id: number;
  modulo: string;
  registroId: number;
  codigoRegistro: string;
  tituloRegistro: string;
  tipoMencao: string;
  status: string;
  prazo?: string;
  observacao?: string;
  lidaEm?: string;
  createdAt: string;
  autor?: { nome: string; apelido?: string };
};

export default function Mencoes() {
  const [mencoes, setMencoes] = useState<Mencao[]>([]);

  async function carregar() {
    const response = await api.get("/mencoes");
    setMencoes(response.data);
  }

  useEffect(() => {
    carregar();
  }, []);

  async function marcarLida(id: number) {
    await api.put(`/mencoes/${id}/lida`);
    await carregar();
  }

  function linkDaMencao(mencao: Mencao) {
    if (mencao.modulo === "PlanoAcao") {
      return `/planos-acao/${mencao.registroId}`;
    }
    return `/timeline/${mencao.modulo}/${mencao.registroId}`;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
          Minhas Mencoes
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Registros em que voce foi mencionado para tratar, apoiar, validar ou
          acompanhar.
        </p>
      </div>

      <div className="space-y-4">
        {mencoes.length === 0 && (
          <div className="rounded-xl bg-white p-8 text-center text-slate-500 shadow">
            Nenhuma mencao recebida.
          </div>
        )}
        {mencoes.map((mencao) => (
          <div
            key={mencao.id}
            className={`rounded-xl bg-white p-5 shadow ${!mencao.lidaEm ? "ring-2 ring-blue-200" : ""}`}
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-blue-600">
                  {mencao.modulo} | {mencao.codigoRegistro}
                </p>
                <h2 className="mt-1 text-xl font-bold text-slate-900">
                  {mencao.tituloRegistro}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Tipo: {mencao.tipoMencao} | Status: {mencao.status}
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  Autor:{" "}
                  {mencao.autor?.apelido ||
                    mencao.autor?.nome ||
                    "Nao informado"}
                </p>
                {mencao.prazo && (
                  <p className="mt-1 text-sm text-amber-700">
                    Prazo: {new Date(mencao.prazo).toLocaleString("pt-BR")}
                  </p>
                )}
                {mencao.observacao && (
                  <p className="mt-3 text-sm text-slate-700">
                    {mencao.observacao}
                  </p>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {!mencao.lidaEm && (
                  <button
                    onClick={() => marcarLida(mencao.id)}
                    className="rounded bg-blue-600 px-3 py-2 text-sm text-white"
                  >
                    Marcar como lida
                  </button>
                )}
                <a
                  href={linkDaMencao(mencao)}
                  className="rounded bg-slate-200 px-3 py-2 text-sm text-slate-700"
                >
                  {mencao.modulo === "PlanoAcao" ? "Abrir plano" : "Timeline"}
                </a>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
