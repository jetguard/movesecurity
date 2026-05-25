import { useEffect, useState } from "react";
import { api } from "../services/api";

type Configuracao = {
  nomeEmpresa: string;
  slaCameras: number;
  tempoMaximoOffline: number;
  checklistCameraDias: number;
  corsPermitido?: string;
  logoUrl?: string;
  rodapePdf?: string;
};

const inicial: Configuracao = {
  nomeEmpresa: "Movecta S/A",
  slaCameras: 98,
  tempoMaximoOffline: 60,
  checklistCameraDias: 7,
  corsPermitido: "",
  logoUrl: "/images/movecta-logo.png",
  rodapePdf: "Documento validado e elaborado pelo sistema JetGuard.",
};

export default function Configuracoes() {
  const [form, setForm] = useState<Configuracao>(inicial);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    api.get("/configuracoes").then((response) => setForm({ ...inicial, ...response.data }));
  }, []);

  function campo(nome: keyof Configuracao, valor: string) {
    setForm((atual) => ({ ...atual, [nome]: ["slaCameras", "tempoMaximoOffline", "checklistCameraDias"].includes(nome) ? Number(valor) : valor }));
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setSalvando(true);
    await api.put("/configuracoes", form);
    setSalvando(false);
    alert("Configurações salvas com sucesso.");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">Configurações do Sistema</h1>
        <p className="mt-1 text-sm text-slate-500">Parâmetros administrativos para operação, CFTV, PDF e identidade visual.</p>
      </div>

      <form onSubmit={salvar} className="space-y-5 rounded-2xl bg-white p-5 shadow">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-slate-700">Nome da empresa</span>
            <input className="w-full rounded-lg border p-3" placeholder="Informe o nome da empresa exibido no sistema" value={form.nomeEmpresa} onChange={(e) => campo("nomeEmpresa", e.target.value)} />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-slate-700">URL da logo</span>
            <input className="w-full rounded-lg border p-3" placeholder="Exemplo: /images/movecta-logo.png" value={form.logoUrl || ""} onChange={(e) => campo("logoUrl", e.target.value)} />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-slate-700">SLA de câmeras (%)</span>
            <input type="number" className="w-full rounded-lg border p-3" placeholder="Percentual mínimo esperado de disponibilidade" value={form.slaCameras} onChange={(e) => campo("slaCameras", e.target.value)} />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-slate-700">Tempo máximo offline (minutos)</span>
            <input type="number" className="w-full rounded-lg border p-3" placeholder="Tempo limite de câmera offline em minutos" value={form.tempoMaximoOffline} onChange={(e) => campo("tempoMaximoOffline", e.target.value)} />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-slate-700">Periodicidade checklist CFTV (dias)</span>
            <input type="number" className="w-full rounded-lg border p-3" placeholder="Intervalo obrigatório entre checklists" value={form.checklistCameraDias} onChange={(e) => campo("checklistCameraDias", e.target.value)} />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-slate-700">CORS permitido</span>
            <input className="w-full rounded-lg border p-3" placeholder="Domínio autorizado para acessar a API" value={form.corsPermitido || ""} onChange={(e) => campo("corsPermitido", e.target.value)} />
          </label>
        </div>

        <label className="block">
          <span className="mb-2 block text-sm font-semibold text-slate-700">Rodapé padrão dos PDFs</span>
          <textarea className="w-full rounded-lg border p-3" placeholder="Texto padrão exibido no rodapé dos PDFs" value={form.rodapePdf || ""} onChange={(e) => campo("rodapePdf", e.target.value)} />
        </label>

        <button disabled={salvando} className="rounded-lg bg-blue-600 px-5 py-3 font-bold text-white disabled:bg-slate-400">
          {salvando ? "Salvando..." : "Salvar configurações"}
        </button>
      </form>
    </div>
  );
}
