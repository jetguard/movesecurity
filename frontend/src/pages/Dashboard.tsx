import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { api } from "../services/api";

type AnaliseOcorrencia = {
  prejuizoFinanceiro?: string;
  status?: string;
};

type AnaliseEvento = {
  valorRecuperado?: string;
  status?: string;
};

type RelatorioBase = {
  id: number;
  codigo: string;
  assunto: string;
  local: string;
  natureza: string;
  status: string;
};

type Ocorrencia = RelatorioBase & {
  dataOcorrencia: string;
  analise?: AnaliseOcorrencia | null;
};

type Evento = RelatorioBase & {
  dataEvento: string;
  analise?: AnaliseEvento | null;
};

type Investigacao = {
  id: number;
  numeroOcorrencia: string;
  local: string;
  status: string;
  createdAt: string;
};

type TooltipPayloadItem = {
  name?: string;
  value?: number | string;
  color?: string;
};

const statusPadrao = ["Aberto", "Em Análise", "Concluído"];
const coresStatus: Record<string, string> = {
  Aberto: "#2563eb",
  "Em Análise": "#f59e0b",
  Concluído: "#10b981",
};

function normalizarStatus(status: string) {
  if (!status) return "Aberto";
  if (status.toUpperCase() === "ABERTO") return "Aberto";
  if (status === "Em Analise") return "Em Análise";
  if (status === "Concluido") return "Concluído";
  return status;
}

function moedaParaNumero(valor?: string) {
  if (!valor) return 0;
  const limpo = valor.replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", ".");
  const numero = Number(limpo);
  return Number.isFinite(numero) ? numero : 0;
}

function formatarMoeda(valor: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(valor);
}

function mesAno(data: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    month: "short",
    year: "2-digit",
  }).format(new Date(data));
}

function dentroDoPeriodo(data: string, filtro: { periodo: string; mes: string; ano: string }) {
  const date = new Date(data);
  const hoje = new Date();

  if (filtro.ano && date.getFullYear() !== Number(filtro.ano)) return false;
  if (filtro.mes && date.getMonth() + 1 !== Number(filtro.mes)) return false;

  if (filtro.periodo === "30") {
    const limite = new Date();
    limite.setDate(hoje.getDate() - 30);
    return date >= limite;
  }

  if (filtro.periodo === "90") {
    const limite = new Date();
    limite.setDate(hoje.getDate() - 90);
    return date >= limite;
  }

  if (filtro.periodo === "ano") {
    return date.getFullYear() === hoje.getFullYear();
  }

  return true;
}

function contarPorStatus<T extends { status: string }>(itens: T[]) {
  return statusPadrao.reduce<Record<string, number>>((acc, status) => {
    acc[status] = itens.filter((item) => normalizarStatus(item.status) === status).length;
    return acc;
  }, {});
}

function agrupar<T>(itens: T[], chave: (item: T) => string) {
  return itens.reduce<Record<string, number>>((acc, item) => {
    const nome = chave(item) || "Não informado";
    acc[nome] = (acc[nome] || 0) + 1;
    return acc;
  }, {});
}

function topRegistros(dados: Record<string, number>, limite = 6) {
  return Object.entries(dados)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limite);
}

function TooltipGrafico({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-xl border border-slate-700/60 bg-slate-950/90 px-3 py-2 text-xs text-slate-100 shadow-xl backdrop-blur">
      {label && <p className="mb-1 font-semibold text-slate-300">{label}</p>}
      <div className="space-y-1">
        {payload.map((item) => (
          <p key={item.name} className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
            <span>{item.name}:</span>
            <strong>{item.value}</strong>
          </p>
        ))}
      </div>
    </div>
  );
}

function Indicador({
  titulo,
  valor,
  subtitulo,
  destaque,
}: {
  titulo: string;
  valor: string | number;
  subtitulo: string;
  destaque?: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <p className="text-sm font-medium text-slate-500">{titulo}</p>
      <p className={`mt-3 text-3xl font-bold ${destaque || "text-slate-900"}`}>
        {valor}
      </p>
      <p className="mt-2 text-sm text-slate-500">{subtitulo}</p>
    </div>
  );
}

function StatusCards({
  titulo,
  total,
  status,
}: {
  titulo: string;
  total: number;
  status: Record<string, number>;
}) {
  const dadosRosca = statusPadrao.map((nome) => ({
    nome,
    valor: status[nome] || 0,
  }));
  const dadosVisuais = total > 0 ? dadosRosca : [{ nome: "Sem dados", valor: 1 }];

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-slate-800">{titulo}</h2>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-700">
          {total}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[150px_1fr]">
        <div className="relative h-36">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={dadosVisuais}
                dataKey="valor"
                nameKey="nome"
                innerRadius={44}
                outerRadius={64}
                paddingAngle={total > 0 ? 3 : 0}
                stroke="none"
              >
                {dadosVisuais.map((item) => (
                  <Cell key={item.nome} fill={total > 0 ? coresStatus[item.nome] : "#e2e8f0"} />
                ))}
              </Pie>
              <Tooltip content={<TooltipGrafico />} cursor={{ fill: "rgba(148, 163, 184, 0.12)" }} wrapperStyle={{ pointerEvents: "none", outline: "none" }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <strong className="text-2xl text-slate-900">{total}</strong>
            <span className="text-xs text-slate-500">total</span>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 xl:grid-cols-1">
          {statusPadrao.map((item) => (
            <div key={item} className="rounded-lg bg-slate-50 p-3">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: coresStatus[item] }} />
                <p className="text-xs text-slate-500">{item}</p>
              </div>
              <p className="mt-1 text-xl font-bold text-slate-900">{status[item] || 0}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function BarraHorizontal({
  titulo,
  dados,
  cor,
}: {
  titulo: string;
  dados: [string, number][];
  cor: string;
}) {
  const dadosGrafico = dados.map(([nome, valor]) => ({ nome, valor }));

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="font-bold text-slate-800">{titulo}</h2>

      <div className="mt-5 h-72">
        {dados.length === 0 ? (
          <p className="text-sm text-slate-500">Sem dados no filtro atual.</p>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dadosGrafico} layout="vertical" margin={{ top: 8, right: 18, left: 16, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
              <XAxis type="number" allowDecimals={false} />
              <YAxis dataKey="nome" type="category" width={118} tick={{ fontSize: 12 }} />
              <Tooltip content={<TooltipGrafico />} cursor={{ fill: "rgba(148, 163, 184, 0.12)" }} wrapperStyle={{ pointerEvents: "none", outline: "none" }} />
              <Bar dataKey="valor" name="Quantidade" radius={[0, 8, 8, 0]} fill={cor} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

function GraficoTemporal({
  dados,
}: {
  dados: { mes: string; ocorrencias: number; eventos: number }[];
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-bold text-slate-800">Comparativo temporal</h2>
      </div>

      <div className="mt-6 h-72">
        {dados.length === 0 ? (
          <p className="self-start text-sm text-slate-500">Sem dados no filtro atual.</p>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={dados} margin={{ top: 12, right: 24, left: 0, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.22)" />
              <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
              <Tooltip
                content={<TooltipGrafico />}
                cursor={{ stroke: "rgba(148, 163, 184, 0.35)", strokeWidth: 1 }}
                wrapperStyle={{ pointerEvents: "none", outline: "none" }}
                position={{ y: 8 }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="ocorrencias"
                name="Ocorrências"
                stroke="#ef4444"
                strokeWidth={2}
                dot={{ r: 3, fill: "#ef4444", strokeWidth: 0 }}
                activeDot={{ r: 5, fill: "#ef4444", stroke: "#fee2e2", strokeWidth: 2 }}
              />
              <Line
                type="monotone"
                dataKey="eventos"
                name="Eventos"
                stroke="#0ea5e9"
                strokeWidth={2}
                dot={{ r: 3, fill: "#0ea5e9", strokeWidth: 0 }}
                activeDot={{ r: 5, fill: "#0ea5e9", stroke: "#e0f2fe", strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [ocorrencias, setOcorrencias] = useState<Ocorrencia[]>([]);
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [investigacoes, setInvestigacoes] = useState<Investigacao[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [periodo, setPeriodo] = useState("todos");
  const [mes, setMes] = useState("");
  const [ano, setAno] = useState("");
  const [status, setStatus] = useState("");
  const [local, setLocal] = useState("");

  async function carregarDashboard() {
    setCarregando(true);
    const [ocorrenciasResponse, eventosResponse, investigacoesResponse] =
      await Promise.all([
        api.get("/ocorrencias"),
        api.get("/eventos"),
        api.get("/investigacoes"),
      ]);

    setOcorrencias(ocorrenciasResponse.data);
    setEventos(eventosResponse.data);
    setInvestigacoes(investigacoesResponse.data);
    setCarregando(false);
  }

  useEffect(() => {
    carregarDashboard();
    const intervalo = window.setInterval(carregarDashboard, 30000);
    return () => window.clearInterval(intervalo);
  }, []);

  const locais = useMemo(() => {
    const lista = new Set<string>();
    ocorrencias.forEach((item) => lista.add(item.local));
    eventos.forEach((item) => lista.add(item.local));
    investigacoes.forEach((item) => lista.add(item.local));
    return Array.from(lista).filter(Boolean).sort();
  }, [eventos, investigacoes, ocorrencias]);

  const anos = useMemo(() => {
    const lista = new Set<number>();
    ocorrencias.forEach((item) => lista.add(new Date(item.dataOcorrencia).getFullYear()));
    eventos.forEach((item) => lista.add(new Date(item.dataEvento).getFullYear()));
    return Array.from(lista).sort((a, b) => b - a);
  }, [eventos, ocorrencias]);

  const filtros = { periodo, mes, ano };

  const ocorrenciasFiltradas = ocorrencias.filter((item) => {
    return (
      dentroDoPeriodo(item.dataOcorrencia, filtros) &&
      (!status || normalizarStatus(item.status) === status) &&
      (!local || item.local === local)
    );
  });

  const eventosFiltrados = eventos.filter((item) => {
    return (
      dentroDoPeriodo(item.dataEvento, filtros) &&
      (!status || normalizarStatus(item.status) === status) &&
      (!local || item.local === local)
    );
  });

  const investigacoesFiltradas = investigacoes.filter((item) => {
    return (
      dentroDoPeriodo(item.createdAt, filtros) &&
      (!status || normalizarStatus(item.status) === status) &&
      (!local || item.local === local)
    );
  });

  const totalPrejuizo = ocorrenciasFiltradas.reduce(
    (total, item) => total + moedaParaNumero(item.analise?.prejuizoFinanceiro),
    0
  );
  const totalRecuperado = eventosFiltrados.reduce(
    (total, item) => total + moedaParaNumero(item.analise?.valorRecuperado),
    0
  );
  const diferenca = totalPrejuizo - totalRecuperado;

  const temporal = useMemo(() => {
    const mapa = new Map<string, { mes: string; ocorrencias: number; eventos: number }>();

    ocorrenciasFiltradas.forEach((item) => {
      const chave = mesAno(item.dataOcorrencia);
      mapa.set(chave, {
        mes: chave,
        ocorrencias: (mapa.get(chave)?.ocorrencias || 0) + 1,
        eventos: mapa.get(chave)?.eventos || 0,
      });
    });

    eventosFiltrados.forEach((item) => {
      const chave = mesAno(item.dataEvento);
      mapa.set(chave, {
        mes: chave,
        ocorrencias: mapa.get(chave)?.ocorrencias || 0,
        eventos: (mapa.get(chave)?.eventos || 0) + 1,
      });
    });

    return Array.from(mapa.values()).slice(-12);
  }, [eventosFiltrados, ocorrenciasFiltradas]);

  const totalMesAtual = temporal.at(-1);
  const totalMesAnterior = temporal.at(-2);
  const variacao =
    totalMesAtual && totalMesAnterior
      ? totalMesAtual.ocorrencias +
        totalMesAtual.eventos -
        (totalMesAnterior.ocorrencias + totalMesAnterior.eventos)
      : 0;

  function gerarRelatorioPdf() {
    const janela = window.open("", "_blank");
    if (!janela) return;

    janela.document.write(`
      <html>
        <head>
          <title>Relatório de Análise</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 32px; color: #0f172a; }
            header { display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #cbd5e1; padding-bottom: 16px; margin-bottom: 24px; }
            img { width: 180px; }
            h1 { font-size: 24px; margin: 0; }
            .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin: 20px 0; }
            .card { border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px; }
            .label { color: #64748b; font-size: 12px; }
            .value { font-size: 22px; font-weight: 700; margin-top: 6px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #e2e8f0; padding: 8px; text-align: left; font-size: 12px; }
            th { background: #f8fafc; }
          </style>
        </head>
        <body>
          <header>
            <img src="/images/movecta-logo.png" />
            <div><h1>Relatório de Análise</h1><p>Gerado em ${new Date().toLocaleString()}</p></div>
          </header>
          <p><strong>Filtros:</strong> período ${periodo}, mês ${mes || "todos"}, ano ${ano || "todos"}, status ${status || "todos"}, local ${local || "todos"}</p>
          <div class="grid">
            <div class="card"><div class="label">Ocorrências</div><div class="value">${ocorrenciasFiltradas.length}</div></div>
            <div class="card"><div class="label">Eventos</div><div class="value">${eventosFiltrados.length}</div></div>
            <div class="card"><div class="label">Investigações</div><div class="value">${investigacoesFiltradas.length}</div></div>
            <div class="card"><div class="label">Prejuízo total</div><div class="value">${formatarMoeda(totalPrejuizo)}</div></div>
            <div class="card"><div class="label">Valor recuperado</div><div class="value">${formatarMoeda(totalRecuperado)}</div></div>
            <div class="card"><div class="label">Diferença</div><div class="value">${formatarMoeda(diferenca)}</div></div>
          </div>
          <table>
            <thead><tr><th>Mês</th><th>Ocorrências</th><th>Eventos</th></tr></thead>
            <tbody>${temporal.map((item) => `<tr><td>${item.mes}</td><td>${item.ocorrencias}</td><td>${item.eventos}</td></tr>`).join("")}</tbody>
          </table>
          <script>window.print();</script>
        </body>
      </html>
    `);
    janela.document.close();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Dashboard Administrativo</h1>
          <p className="mt-1 text-slate-500">
            Indicadores operacionais, financeiros e tendências dos relatórios.
          </p>
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={gerarRelatorioPdf}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700"
          >
            Gerar PDF
          </button>
          <button
            type="button"
            onClick={carregarDashboard}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            {carregando ? "Atualizando..." : "Atualizar"}
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
          <select
            value={periodo}
            onChange={(e) => setPeriodo(e.target.value)}
            className="rounded-lg border p-3"
          >
            <option value="todos">Todo período</option>
            <option value="30">Últimos 30 dias</option>
            <option value="90">Últimos 90 dias</option>
            <option value="ano">Ano atual</option>
          </select>

          <select value={mes} onChange={(e) => setMes(e.target.value)} className="rounded-lg border p-3">
            <option value="">Todos os meses</option>
            {Array.from({ length: 12 }, (_, index) => (
              <option key={index + 1} value={index + 1}>
                {new Date(2026, index, 1).toLocaleString("pt-BR", { month: "long" })}
              </option>
            ))}
          </select>

          <select value={ano} onChange={(e) => setAno(e.target.value)} className="rounded-lg border p-3">
            <option value="">Todos os anos</option>
            {anos.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>

          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="rounded-lg border p-3"
          >
            <option value="">Todos os status</option>
            {statusPadrao.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>

          <select value={local} onChange={(e) => setLocal(e.target.value)} className="rounded-lg border p-3">
            <option value="">Todos os locais</option>
            {locais.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <StatusCards
          titulo="Relatórios de Ocorrência"
          total={ocorrenciasFiltradas.length}
          status={contarPorStatus(ocorrenciasFiltradas)}
        />
        <StatusCards
          titulo="Relatórios de Eventos"
          total={eventosFiltrados.length}
          status={contarPorStatus(eventosFiltrados)}
        />
        <StatusCards
          titulo="Investigações"
          total={investigacoesFiltradas.length}
          status={contarPorStatus(investigacoesFiltradas)}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
        <Indicador titulo="Prejuízo total" valor={formatarMoeda(totalPrejuizo)} subtitulo="Somatório das análises de ocorrência" destaque="text-red-600" />
        <Indicador titulo="Valor recuperado" valor={formatarMoeda(totalRecuperado)} subtitulo="Somatório das análises de eventos" destaque="text-emerald-600" />
        <Indicador titulo="Diferença financeira" valor={formatarMoeda(diferenca)} subtitulo="Prejuízo menos recuperação" destaque={diferenca > 0 ? "text-amber-600" : "text-emerald-600"} />
        <Indicador titulo="Tendência" valor={variacao > 0 ? `+${variacao}` : variacao} subtitulo="Variação contra período anterior" destaque={variacao > 0 ? "text-blue-600" : "text-slate-700"} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <GraficoTemporal dados={temporal} />
        <BarraHorizontal
          titulo="Naturezas com maior índice de ocorrências"
          dados={topRegistros(agrupar(ocorrenciasFiltradas, (item) => item.natureza))}
          cor="#2563eb"
        />
        <BarraHorizontal
          titulo="Naturezas com maior índice de eventos"
          dados={topRegistros(agrupar(eventosFiltrados, (item) => item.natureza))}
          cor="#10b981"
        />
        <BarraHorizontal
          titulo="Locais com maior índice de ocorrências"
          dados={topRegistros(agrupar(ocorrenciasFiltradas, (item) => item.local))}
          cor="#6366f1"
        />
        <BarraHorizontal
          titulo="Locais com maior índice de eventos"
          dados={topRegistros(agrupar(eventosFiltrados, (item) => item.local))}
          cor="#14b8a6"
        />
      </div>
    </div>
  );
}

