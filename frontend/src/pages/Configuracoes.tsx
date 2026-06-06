import { useEffect, useState } from "react";
import { BrainCircuit, KeyRound, ShieldCheck } from "lucide-react";
import { api } from "../services/api";
import { podeSuperAdmin } from "../utils/permissoes";

type Configuracao = {
  nomeEmpresa: string;
  slaCameras: number;
  tempoMaximoOffline: number;
  checklistCameraDias: number;
  corsPermitido?: string;
  logoUrl?: string;
  rodapePdf?: string;
  ocrProvider?: string;
  openaiApiKey?: string;
  openaiApiKeyConfigurada?: boolean;
  openaiOcrModel?: string;
  removerOpenaiApiKey?: boolean;
};

const inicial: Configuracao = {
  nomeEmpresa: "Movecta S/A",
  slaCameras: 98,
  tempoMaximoOffline: 60,
  checklistCameraDias: 7,
  corsPermitido: "",
  logoUrl: "/images/movecta-logo.png",
  rodapePdf: "Documento validado e elaborado pelo sistema JetGuard.",
  ocrProvider: "openai",
  openaiApiKey: "",
  openaiOcrModel: "gpt-4.1-mini",
  removerOpenaiApiKey: false,
};

const modelosOpenAiOcr = [
  { valor: "gpt-5.4-mini", label: "GPT-5.4 mini" },
  { valor: "gpt-4.1-mini", label: "GPT-4.1 mini" },
  { valor: "gpt-4.1", label: "GPT-4.1" },
  { valor: "gpt-4o-mini", label: "GPT-4o mini" },
];

export default function Configuracoes() {
  const [form, setForm] = useState<Configuracao>(inicial);
  const [salvando, setSalvando] = useState(false);
  const superAdmin = podeSuperAdmin();

  useEffect(() => {
    api.get("/configuracoes").then((response) => setForm({ ...inicial, ...response.data }));
  }, []);

  function campo(nome: keyof Configuracao, valor: string | boolean) {
    setForm((atual) => ({
      ...atual,
      [nome]: ["slaCameras", "tempoMaximoOffline", "checklistCameraDias"].includes(nome)
        ? Number(valor)
        : valor,
    }));
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setSalvando(true);
    try {
      const payload = { ...form };
      if (!superAdmin) {
        delete payload.ocrProvider;
        delete payload.openaiApiKey;
        delete payload.openaiOcrModel;
        delete payload.removerOpenaiApiKey;
      }

      const response = await api.put("/configuracoes", payload);
      setForm({ ...inicial, ...response.data, removerOpenaiApiKey: false });
      alert("Configurações salvas com sucesso.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white sm:text-3xl">Configurações do Sistema</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Parâmetros administrativos para operação, CFTV, PDF, identidade visual e inteligência do JetGuard.
        </p>
      </div>

      <form onSubmit={salvar} className="space-y-5 rounded-2xl bg-white p-5 shadow dark:bg-slate-900">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">Nome da empresa</span>
            <input className="w-full rounded-lg border p-3 dark:border-slate-700 dark:bg-slate-950 dark:text-white" placeholder="Informe o nome da empresa exibido no sistema" value={form.nomeEmpresa} onChange={(e) => campo("nomeEmpresa", e.target.value)} />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">URL da logo</span>
            <input className="w-full rounded-lg border p-3 dark:border-slate-700 dark:bg-slate-950 dark:text-white" placeholder="Exemplo: /images/movecta-logo.png" value={form.logoUrl || ""} onChange={(e) => campo("logoUrl", e.target.value)} />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">SLA de câmeras (%)</span>
            <input type="number" className="w-full rounded-lg border p-3 dark:border-slate-700 dark:bg-slate-950 dark:text-white" placeholder="Percentual mínimo esperado de disponibilidade" value={form.slaCameras} onChange={(e) => campo("slaCameras", e.target.value)} />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">Tempo máximo offline (minutos)</span>
            <input type="number" className="w-full rounded-lg border p-3 dark:border-slate-700 dark:bg-slate-950 dark:text-white" placeholder="Tempo limite de câmera offline em minutos" value={form.tempoMaximoOffline} onChange={(e) => campo("tempoMaximoOffline", e.target.value)} />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">Periodicidade checklist CFTV (dias)</span>
            <input type="number" className="w-full rounded-lg border p-3 dark:border-slate-700 dark:bg-slate-950 dark:text-white" placeholder="Intervalo obrigatório entre checklists" value={form.checklistCameraDias} onChange={(e) => campo("checklistCameraDias", e.target.value)} />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">CORS permitido</span>
            <input className="w-full rounded-lg border p-3 dark:border-slate-700 dark:bg-slate-950 dark:text-white" placeholder="Domínio autorizado para acessar a API" value={form.corsPermitido || ""} onChange={(e) => campo("corsPermitido", e.target.value)} />
          </label>
        </div>

        <label className="block">
          <span className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">Rodapé padrão dos PDFs</span>
          <textarea className="w-full rounded-lg border p-3 dark:border-slate-700 dark:bg-slate-950 dark:text-white" placeholder="Texto padrão exibido no rodapé dos PDFs" value={form.rodapePdf || ""} onChange={(e) => campo("rodapePdf", e.target.value)} />
        </label>

        {superAdmin && (
          <section className="rounded-2xl border border-blue-200 bg-blue-50/70 p-5 dark:border-blue-500/30 dark:bg-blue-500/10">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="rounded-2xl bg-blue-600 p-3 text-white shadow-lg shadow-blue-600/20">
                  <BrainCircuit size={22} />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-blue-700 dark:text-blue-200">Super Admin</p>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">Inteligência OCR com OpenAI</h2>
                  <p className="mt-1 max-w-2xl text-sm text-slate-600 dark:text-slate-300">
                    Configure a chave usada para ler imagens ou PDFs no assistente de relato. A chave fica mascarada após salvar.
                  </p>
                </div>
              </div>
              <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold ${form.openaiApiKeyConfigurada ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-200" : "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-100"}`}>
                <ShieldCheck size={14} />
                {form.openaiApiKeyConfigurada ? "Chave configurada" : "Chave pendente"}
              </span>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3">
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">Provedor OCR</span>
                <select className="w-full rounded-lg border p-3 dark:border-slate-700 dark:bg-slate-950 dark:text-white" value={form.ocrProvider || "openai"} onChange={(e) => campo("ocrProvider", e.target.value)}>
                  <option value="openai">OpenAI</option>
                </select>
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">Modelo</span>
                <select className="w-full rounded-lg border p-3 dark:border-slate-700 dark:bg-slate-950 dark:text-white" value={form.openaiOcrModel || "gpt-4.1-mini"} onChange={(e) => campo("openaiOcrModel", e.target.value)}>
                  {modelosOpenAiOcr.map((modelo) => (
                    <option key={modelo.valor} value={modelo.valor}>{modelo.label}</option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
                  <KeyRound size={15} />
                  Chave API OpenAI
                </span>
                <input type="password" className="w-full rounded-lg border p-3 dark:border-slate-700 dark:bg-slate-950 dark:text-white" placeholder={form.openaiApiKeyConfigurada ? "********" : "Cole a chave da OpenAI"} value={form.openaiApiKey || ""} onChange={(e) => campo("openaiApiKey", e.target.value)} autoComplete="off" />
              </label>
            </div>

            {form.openaiApiKeyConfigurada && (
              <label className="mt-4 flex items-center gap-2 text-sm font-semibold text-red-700 dark:text-red-200">
                <input type="checkbox" checked={Boolean(form.removerOpenaiApiKey)} onChange={(e) => campo("removerOpenaiApiKey", e.target.checked)} />
                Remover chave OpenAI salva
              </label>
            )}
          </section>
        )}

        <button disabled={salvando} className="rounded-lg bg-blue-600 px-5 py-3 font-bold text-white disabled:bg-slate-400">
          {salvando ? "Salvando..." : "Salvar configurações"}
        </button>
      </form>
    </div>
  );
}
