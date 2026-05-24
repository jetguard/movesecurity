import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Clock, XCircle } from "lucide-react";
import { api } from "../services/api";
import { podeAdministrar, usuarioAtual } from "../utils/permissoes";

type Acordo = {
  id: number;
  status: string;
  observacao?: string | null;
  decididoEm?: string | null;
  analista: { nome: string; apelido?: string; email: string };
  analistaId: number;
};

type Solicitacao = {
  id: number;
  modulo: string;
  registroId: number;
  codigoRegistro: string;
  tituloRegistro: string;
  unidade: string;
  motivo: string;
  status: string;
  decisaoMotivo?: string | null;
  createdAt: string;
  solicitante: { nome: string; apelido?: string; email: string };
  decididoPor?: { nome: string; apelido?: string } | null;
  acordos: Acordo[];
};

export default function Anulacoes() {
  const [solicitacoes, setSolicitacoes] = useState<Solicitacao[]>([]);
  const [observacao, setObservacao] = useState("");
  const [justificativa, setJustificativa] = useState("");
  const usuario = usuarioAtual();

  async function carregar() {
    const response = await api.get("/anulacoes");
    setSolicitacoes(response.data);
  }

  async function registrarAcordo(id: number, status: string) {
    await api.put(`/anulacoes/${id}/acordo`, { status, observacao });
    setObservacao("");
    carregar();
  }

  async function decidir(id: number, decisao: string) {
    await api.put(`/anulacoes/${id}/decisao`, { decisao, justificativa });
    setJustificativa("");
    carregar();
  }

  useEffect(() => {
    carregar();
  }, []);

  const totais = useMemo(() => ({
    pendentes: solicitacoes.filter((item) => item.status === "Pendente").length,
    anuladas: solicitacoes.filter((item) => item.status === "Anulado").length,
    recusadas: solicitacoes.filter((item) => item.status === "Recusado").length,
  }), [solicitacoes]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Solicitações de Anulação</h1>
        <p className="mt-1 text-slate-500">Acompanhe pedidos de anulação, acordos dos analistas e decisão administrativa.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-xl bg-white p-5 shadow">
          <p className="flex items-center gap-2 text-sm text-slate-500"><Clock size={16} /> Pendentes</p>
          <p className="mt-2 text-3xl font-bold text-amber-600">{totais.pendentes}</p>
        </div>
        <div className="rounded-xl bg-white p-5 shadow">
          <p className="flex items-center gap-2 text-sm text-slate-500"><CheckCircle2 size={16} /> Anuladas</p>
          <p className="mt-2 text-3xl font-bold text-emerald-600">{totais.anuladas}</p>
        </div>
        <div className="rounded-xl bg-white p-5 shadow">
          <p className="flex items-center gap-2 text-sm text-slate-500"><XCircle size={16} /> Recusadas</p>
          <p className="mt-2 text-3xl font-bold text-red-600">{totais.recusadas}</p>
        </div>
      </div>

      <div className="space-y-4">
        {solicitacoes.length === 0 && (
          <div className="rounded-xl bg-white p-8 text-center text-slate-500 shadow">
            Nenhuma solicitação de anulação encontrada.
          </div>
        )}

        {solicitacoes.map((solicitacao) => {
          const meuAcordo = solicitacao.acordos.find((acordo) => acordo.analistaId === usuario?.id);
          const todosAprovados = solicitacao.acordos.length === 0 || solicitacao.acordos.every((acordo) => acordo.status === "Aprovado");
          const podeResponder = solicitacao.status === "Pendente" && meuAcordo?.status === "Pendente";
          const podeAprovar = podeAdministrar() && solicitacao.status === "Pendente";

          return (
            <section key={solicitacao.id} className="rounded-xl bg-white p-5 shadow">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-wide text-orange-600">{solicitacao.modulo}</p>
                  <h2 className="mt-1 text-xl font-bold text-slate-900">
                    {solicitacao.codigoRegistro} - {solicitacao.tituloRegistro}
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Solicitado por {solicitacao.solicitante.apelido || solicitacao.solicitante.nome} em{" "}
                    {new Date(solicitacao.createdAt).toLocaleString("pt-BR")}
                  </p>
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-bold text-slate-700">
                  {solicitacao.status}
                </span>
              </div>

              <div className="mt-4 rounded-lg bg-slate-50 p-4 text-sm text-slate-700">
                <strong>Motivo:</strong> {solicitacao.motivo}
              </div>

              <div className="mt-5">
                <h3 className="font-bold text-slate-900">Acordo dos analistas</h3>
                <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                  {solicitacao.acordos.map((acordo) => (
                    <div key={acordo.id} className="rounded-lg border border-slate-200 p-3 text-sm">
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-semibold">{acordo.analista.apelido || acordo.analista.nome}</span>
                        <span className="rounded-full bg-slate-100 px-2 py-1 text-xs">{acordo.status}</span>
                      </div>
                      {acordo.observacao && <p className="mt-2 text-slate-500">{acordo.observacao}</p>}
                    </div>
                  ))}
                </div>
              </div>

              {podeResponder && (
                <div className="mt-5 rounded-lg border border-blue-200 bg-blue-50 p-4">
                  <p className="mb-3 flex items-center gap-2 text-sm font-bold text-blue-800">
                    <AlertTriangle size={16} /> Registrar seu acordo
                  </p>
                  <textarea
                    className="min-h-[90px] w-full rounded-lg border p-3"
                    placeholder="Observação opcional"
                    value={observacao}
                    onChange={(e) => setObservacao(e.target.value)}
                  />
                  <div className="mt-3 flex gap-3">
                    <button onClick={() => registrarAcordo(solicitacao.id, "Aprovado")} className="rounded bg-emerald-600 px-4 py-2 text-white">
                      Concordo
                    </button>
                    <button onClick={() => registrarAcordo(solicitacao.id, "Recusado")} className="rounded bg-red-600 px-4 py-2 text-white">
                      Recusar
                    </button>
                  </div>
                </div>
              )}

              {podeAprovar && (
                <div className="mt-5 rounded-lg border border-slate-200 p-4">
                  <p className="text-sm font-semibold text-slate-700">
                    Decisão administrativa {todosAprovados ? "" : "(aguardando acordo de todos os analistas)"}
                  </p>
                  <textarea
                    className="mt-3 min-h-[90px] w-full rounded-lg border p-3"
                    placeholder="Justificativa da decisão"
                    value={justificativa}
                    onChange={(e) => setJustificativa(e.target.value)}
                  />
                  <div className="mt-3 flex gap-3">
                    <button
                      disabled={!todosAprovados}
                      onClick={() => decidir(solicitacao.id, "Aprovado")}
                      className="rounded bg-orange-600 px-4 py-2 text-white disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Aprovar anulação
                    </button>
                    <button onClick={() => decidir(solicitacao.id, "Recusado")} className="rounded bg-slate-800 px-4 py-2 text-white">
                      Recusar solicitação
                    </button>
                  </div>
                </div>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
