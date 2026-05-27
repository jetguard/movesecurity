import { useEffect, useMemo, useState } from "react";
import { Activity, AlertTriangle, BookOpen, ClipboardCheck, RadioTower, RefreshCw, Send } from "lucide-react";
import { api } from "../services/api";

type SocData = {
  unidade: string;
  atualizadoEm: string;
  soc: Record<string, number>;
  checklistTurno?: { codigo: string; titulo: string; status: string; dataHora: string } | null;
  passagensServico: Array<{ id: number; codigo: string; titulo: string; observacoes?: string; dataHora: string; responsavel?: { nome: string; apelido?: string } }>;
  livroEletronico: Array<{ tipo: string; titulo: string; detalhe: string; data: string }>;
  reincidencia: Record<string, Array<{ nome: string; total: number }>>;
  indicadoresMensais: Record<string, number>;
  relatoriosExecutivosAutomaticos: string[];
  tarefas: Array<{ id: number; titulo: string; status: string; prioridade: string; responsavel: string; prazo?: string }>;
};

const metricas = [
  ["ocorrenciasAbertas", "Ocorrências abertas"],
  ["eventosAbertos", "Eventos abertos"],
  ["investigacoesAbertas", "Investigações"],
  ["camerasOffline", "Câmeras offline"],
  ["containersCriticos", "Contêineres críticos"],
  ["tarefasAbertas", "Tarefas abertas"],
  ["checklistsHoje", "Checklists hoje"],
];

export default function OperacaoSOC() {
  const [dados, setDados] = useState<SocData | null>(null);
  const [tipo, setTipo] = useState("Checklist de Turno");
  const [titulo, setTitulo] = useState("");
  const [local, setLocal] = useState("Centro de Operações");
  const [observacoes, setObservacoes] = useState("");
  const [salvando, setSalvando] = useState(false);

  async function carregar() {
    const response = await api.get("/operacao/soc");
    setDados(response.data);
  }

  async function salvarRegistro(e: React.FormEvent) {
    e.preventDefault();
    setSalvando(true);
    try {
      await api.post("/operacao/registros", {
        tipo,
        titulo: titulo || tipo,
        local,
        observacoes,
        itens: [
          {
            categoria: tipo,
            descricao: observacoes || titulo || tipo,
            conformidade: "Conforme",
            criticidade: tipo === "Passagem de Serviço" ? "Media" : "Baixa",
          },
        ],
      });
      setTitulo("");
      setObservacoes("");
      carregar();
    } finally {
      setSalvando(false);
    }
  }

  useEffect(() => {
    carregar();
  }, []);

  const maxReincidencia = useMemo(() => {
    if (!dados) return 1;
    return Math.max(1, ...Object.values(dados.reincidencia).flat().map((item) => item.total));
  }, [dados]);

  if (!dados) {
    return <div className="p-6 text-slate-500">Carregando painel SOC operacional...</div>;
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white sm:text-3xl">Operação SOC</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">
            Checklist de turno, passagem de serviço, livro eletrônico e inteligência operacional da unidade {dados.unidade}.
          </p>
        </div>
        <button onClick={carregar} className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white dark:bg-blue-600">
          <RefreshCw size={16} />
          Atualizar
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {metricas.map(([chave, tituloCard]) => (
          <div key={chave} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <p className="text-sm text-slate-500 dark:text-slate-400">{tituloCard}</p>
            <p className="mt-2 text-3xl font-black text-slate-900 dark:text-white">{dados.soc[chave] || 0}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <form onSubmit={salvarRegistro} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-4 flex items-center gap-2">
            <ClipboardCheck className="text-blue-600" size={20} />
            <h2 className="font-bold text-slate-900 dark:text-white">Registro operacional</h2>
          </div>
          <div className="grid gap-3">
            <select value={tipo} onChange={(e) => setTipo(e.target.value)} className="rounded-xl border border-slate-300 bg-white p-3 dark:border-slate-700 dark:bg-slate-950 dark:text-white">
              <option>Checklist de Turno</option>
              <option>Passagem de Serviço</option>
            </select>
            <input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Título do registro" className="rounded-xl border border-slate-300 bg-white p-3 dark:border-slate-700 dark:bg-slate-950 dark:text-white" />
            <input value={local} onChange={(e) => setLocal(e.target.value)} placeholder="Local operacional" className="rounded-xl border border-slate-300 bg-white p-3 dark:border-slate-700 dark:bg-slate-950 dark:text-white" />
            <textarea value={observacoes} onChange={(e) => setObservacoes(e.target.value)} placeholder="Observações, pendências, alertas e orientações para o próximo turno" rows={6} className="rounded-xl border border-slate-300 bg-white p-3 dark:border-slate-700 dark:bg-slate-950 dark:text-white" />
            <button disabled={salvando} className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 font-bold text-white disabled:bg-slate-400">
              <Send size={16} />
              {salvando ? "Salvando..." : "Registrar"}
            </button>
          </div>
        </form>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-4 flex items-center gap-2">
            <BookOpen className="text-emerald-600" size={20} />
            <h2 className="font-bold text-slate-900 dark:text-white">Livro eletrônico de ocorrências</h2>
          </div>
          <div className="max-h-[430px] space-y-3 overflow-auto pr-2">
            {dados.livroEletronico.map((item, index) => (
              <div key={`${item.tipo}-${index}`} className="rounded-xl border border-slate-100 p-3 text-sm dark:border-slate-800">
                <div className="flex items-center justify-between gap-3">
                  <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-200">{item.tipo}</span>
                  <span className="text-xs text-slate-500">{new Date(item.data).toLocaleString("pt-BR")}</span>
                </div>
                <p className="mt-2 font-bold text-slate-900 dark:text-white">{item.titulo}</p>
                <p className="mt-1 text-slate-500 dark:text-slate-400">{item.detalhe}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-4 flex items-center gap-2">
            <RadioTower className="text-purple-600" size={20} />
            <h2 className="font-bold text-slate-900 dark:text-white">Reincidência e inteligência</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {Object.entries(dados.reincidencia).map(([grupo, itens]) => (
              <div key={grupo} className="rounded-xl bg-slate-50 p-4 dark:bg-slate-950">
                <p className="mb-3 text-sm font-bold capitalize text-slate-700 dark:text-slate-200">{grupo.replace("por", "Por ")}</p>
                <div className="space-y-2">
                  {itens.slice(0, 5).map((item) => (
                    <div key={item.nome}>
                      <div className="flex justify-between text-xs text-slate-500"><span>{item.nome}</span><span>{item.total}</span></div>
                      <div className="mt-1 h-2 rounded-full bg-slate-200 dark:bg-slate-800">
                        <div className="h-2 rounded-full bg-blue-600" style={{ width: `${Math.max(8, (item.total / maxReincidencia) * 100)}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-4 flex items-center gap-2">
            <AlertTriangle className="text-amber-600" size={20} />
            <h2 className="font-bold text-slate-900 dark:text-white">Governança operacional</h2>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {Object.entries(dados.indicadoresMensais).map(([chave, valor]) => (
              <div key={chave} className="rounded-xl bg-slate-50 p-4 dark:bg-slate-950">
                <p className="text-xs uppercase text-slate-500">{chave}</p>
                <p className="mt-1 text-2xl font-black text-slate-900 dark:text-white">{valor}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-950/30">
            <p className="mb-2 flex items-center gap-2 font-bold text-blue-900 dark:text-blue-100"><Activity size={16} /> Relatórios automáticos preparados</p>
            <ul className="space-y-1 text-sm text-blue-800 dark:text-blue-100">
              {dados.relatoriosExecutivosAutomaticos.map((item) => <li key={item}>{item}</li>)}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
