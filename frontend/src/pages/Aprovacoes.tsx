import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle } from "lucide-react";
import { api } from "../services/api";

type ItemWorkflow = {
  id: number;
  modulo: string;
  codigo: string;
  titulo: string;
  local?: string;
  status: string;
  fluxoStatus: string;
  motivoDevolucao?: string;
  createdAt: string;
};

type SolicitacaoAnulacao = {
  id: number;
  status: string;
};

function corFluxo(status: string) {
  if (status === "Aprovado") return "bg-emerald-100 text-emerald-700";
  if (status === "Devolvido") return "bg-red-100 text-red-700";
  if (status === "Em Revisao") return "bg-blue-100 text-blue-700";
  return "bg-amber-100 text-amber-700";
}

export default function Aprovacoes() {
  const [itens, setItens] = useState<ItemWorkflow[]>([]);
  const [anulacoes, setAnulacoes] = useState<SolicitacaoAnulacao[]>([]);
  const [filtro, setFiltro] = useState("");
  const [motivo, setMotivo] = useState("Ajustes solicitados");
  const [motivoReabertura, setMotivoReabertura] = useState("Reabertura para ajuste controlado");

  async function carregar() {
    const [workflowResponse, anulacoesResponse] = await Promise.all([
      api.get("/workflow"),
      api.get("/anulacoes"),
    ]);
    setItens(workflowResponse.data);
    setAnulacoes(anulacoesResponse.data);
  }

  useEffect(() => {
    carregar();
  }, []);

  const filtrados = itens.filter((item) => !filtro || item.fluxoStatus === filtro);
  const anulacoesPendentes = anulacoes.filter((item) => item.status === "Pendente").length;
  const resumo = useMemo(() => ({
    aguardando: itens.filter((item) => item.fluxoStatus === "Aguardando Revisao").length,
    revisao: itens.filter((item) => item.fluxoStatus === "Em Revisao").length,
    aprovados: itens.filter((item) => item.fluxoStatus === "Aprovado").length,
    devolvidos: itens.filter((item) => item.fluxoStatus === "Devolvido").length,
  }), [itens]);

  async function acao(item: ItemWorkflow, acaoWorkflow: string) {
    await api.post(`/workflow/${item.modulo}/${item.id}`, {
      acao: acaoWorkflow,
      motivo,
    });
    await carregar();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">Central de Aprovações</h1>
          <p className="mt-1 text-sm text-slate-500">Revisão, aprovação, devolução e anulações controladas.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link to="/anulacoes" className="inline-flex items-center gap-2 rounded-lg bg-orange-600 px-4 py-3 font-semibold text-white">
            <AlertTriangle size={16} /> Anulações pendentes: {anulacoesPendentes}
          </Link>
          <select className="rounded-lg border bg-white p-3" value={filtro} onChange={(e) => setFiltro(e.target.value)}>
            <option value="">Todos</option>
            <option>Aguardando Revisao</option>
            <option>Em Revisao</option>
            <option>Aprovado</option>
            <option>Devolvido</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <div className="rounded-xl bg-white p-5 shadow"><p className="text-sm text-slate-500">Aguardando</p><p className="text-3xl font-bold text-amber-600">{resumo.aguardando}</p></div>
        <div className="rounded-xl bg-white p-5 shadow"><p className="text-sm text-slate-500">Em revisão</p><p className="text-3xl font-bold text-blue-600">{resumo.revisao}</p></div>
        <div className="rounded-xl bg-white p-5 shadow"><p className="text-sm text-slate-500">Aprovados</p><p className="text-3xl font-bold text-emerald-600">{resumo.aprovados}</p></div>
        <div className="rounded-xl bg-white p-5 shadow"><p className="text-sm text-slate-500">Devolvidos</p><p className="text-3xl font-bold text-red-600">{resumo.devolvidos}</p></div>
        <div className="rounded-xl bg-white p-5 shadow"><p className="text-sm text-slate-500">Anulações</p><p className="text-3xl font-bold text-orange-600">{anulacoesPendentes}</p></div>
      </div>

      <div className="rounded-xl bg-white p-4 shadow">
        <label className="text-sm font-semibold text-slate-700">Motivo padrão para devolução</label>
        <input className="mt-2 w-full rounded-lg border p-3" value={motivo} onChange={(e) => setMotivo(e.target.value)} />
        <label className="mt-4 block text-sm font-semibold text-slate-700">Justificativa para reabertura pelo Super Admin</label>
        <input className="mt-2 w-full rounded-lg border p-3" value={motivoReabertura} onChange={(e) => setMotivoReabertura(e.target.value)} />
      </div>

      <div className="space-y-4">
        {filtrados.length === 0 && (
          <div className="rounded-xl bg-white p-8 text-center text-slate-500 shadow">
            Nenhum item encontrado no filtro atual.
          </div>
        )}

        {filtrados.map((item) => (
          <div key={`${item.modulo}-${item.id}`} className="rounded-xl bg-white p-5 shadow">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-blue-600">{item.modulo} | {item.codigo}</p>
                <h2 className="mt-1 text-xl font-bold text-slate-900">{item.titulo}</h2>
                <p className="mt-1 text-sm text-slate-500">{item.local || "Sem local"} | Status: {item.status}</p>
                {item.motivoDevolucao && <p className="mt-2 text-sm text-red-600">Motivo: {item.motivoDevolucao}</p>}
              </div>
              <span className={`rounded-full px-3 py-1 text-sm font-semibold ${corFluxo(item.fluxoStatus)}`}>{item.fluxoStatus}</span>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <button onClick={() => acao(item, "revisar")} className="rounded bg-blue-600 px-3 py-2 text-sm text-white">Iniciar revisão</button>
              <button onClick={() => acao(item, "aprovar")} className="rounded bg-emerald-600 px-3 py-2 text-sm text-white">Aprovar</button>
              <button onClick={() => acao(item, "devolver")} className="rounded bg-red-600 px-3 py-2 text-sm text-white">Devolver</button>
              <button onClick={() => api.post(`/workflow/${item.modulo}/${item.id}`, { acao: "reabrir", motivo: motivoReabertura }).then(carregar)} className="rounded bg-slate-900 px-3 py-2 text-sm text-white">Reabrir</button>
              <Link to={`/timeline/${item.modulo}/${item.id}`} className="rounded bg-slate-200 px-3 py-2 text-sm text-slate-700">Timeline</Link>
              <Link to={`/historico/${item.modulo}/${item.id}`} className="rounded bg-slate-200 px-3 py-2 text-sm text-slate-700">Histórico</Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
