import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Gauge,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
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
import { PERFIS, usuarioAtual } from "../utils/permissoes";
import { SkeletonDashboard } from "../components/ui/Skeleton";

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

type PlanejamentoCard = {
  id: number;
  titulo: string;
  descricao?: string | null;
  prioridade: string;
  prazo?: string | null;
  status: string;
  responsavel?: { id: number; nome: string; apelido?: string | null } | null;
};

type PlanejamentoColuna = {
  titulo: string;
  cards?: PlanejamentoCard[];
};

type CamerasResumo = {
  totalConectadas?: number;
  totalDesconectadas?: number;
  online?: number;
  offline?: number;
  camerasConformidade?: number;
  camerasAtencao?: number;
  camerasCriticas?: number;
  camerasDesconectadas?: number;
};

type QuadraResumo = {
  noTerminal?: number;
  armazenados?: number;
  previstos?: number;
  saidos?: number;
  permanenciaCritica?: number;
};

type DocumentosResumo = {
  total: number;
  assinados: number;
  pendentes: number;
  comPdf: number;
};

type ChecklistInspecao = {
  id: number;
  codigo?: string;
  status?: string;
  itens?: Array<{ conformidade?: string; criticidade?: string }>;
};

type RiscoDashboard = {
  id: number;
  status?: string;
  nivelRisco?: string;
};

type PlanoAcaoDashboard = {
  id: number;
  status?: string;
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
const eixoGrafico = "#94a3b8";
const gridGrafico = "rgba(148, 163, 184, 0.18)";
const cursorGrafico = "rgba(59, 130, 246, 0.08)";

function normalizarStatus(status: string) {
  if (!status) return "Aberto";
  if (status.toUpperCase() === "ABERTO") return "Aberto";
  if (status === "Em Analise") return "Em Análise";
  if (status === "Concluido") return "Concluído";
  return status;
}

function moedaParaNumero(valor?: string) {
  if (!valor) return 0;
  const limpo = valor
    .replace(/[^\d,.-]/g, "")
    .replace(/\./g, "")
    .replace(",", ".");
  const numero = Number(limpo);
  return Number.isFinite(numero) ? numero : 0;
}

function formatarMoeda(valor: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(valor);
}

function idGrafico(texto: string) {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
}

function mesAno(data: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    month: "short",
    year: "2-digit",
  }).format(new Date(data));
}

function dentroDoPeriodo(
  data: string,
  filtro: { periodo: string; mes: string; ano: string },
) {
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
    acc[status] = itens.filter(
      (item) => normalizarStatus(item.status) === status,
    ).length;
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

function normalizarTexto(valor?: string) {
  return (valor || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function percentual(parte: number, total: number) {
  if (total <= 0) return 0;
  return Math.round((parte / total) * 100);
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
    <div className="rounded-2xl border border-blue-400/20 bg-slate-950/95 px-3.5 py-3 text-xs text-slate-100 shadow-2xl shadow-blue-950/20 backdrop-blur">
      {label && <p className="mb-2 font-semibold text-blue-100">{label}</p>}
      <div className="space-y-1">
        {payload.map((item) => (
          <p
            key={item.name}
            className="flex items-center justify-between gap-5"
          >
            <span className="flex items-center gap-2 text-slate-300">
              <span
                className="h-2 w-2 rounded-full shadow-sm"
                style={{ backgroundColor: item.color }}
              />
              {item.name}
            </span>
            <strong className="text-white">{item.value}</strong>
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

function ConformidadeOperacional({
  itens,
}: {
  itens: Array<{
    modulo: string;
    conforme: number;
    naoConforme: number;
    atencao: number;
    descricao: string;
  }>;
}) {
  const totais = itens.reduce(
    (acc, item) => ({
      conforme: acc.conforme + item.conforme,
      naoConforme: acc.naoConforme + item.naoConforme,
      atencao: acc.atencao + item.atencao,
    }),
    { conforme: 0, naoConforme: 0, atencao: 0 },
  );
  const total = totais.conforme + totais.naoConforme + totais.atencao;
  const indiceConformidade = percentual(totais.conforme, total);
  const indiceNaoConformidade = percentual(totais.naoConforme, total);
  const dadosRosca =
    total > 0
      ? [
          { nome: "Conforme", valor: totais.conforme, cor: "#22c55e" },
          { nome: "Atenção", valor: totais.atencao, cor: "#f59e0b" },
          { nome: "Não conforme", valor: totais.naoConforme, cor: "#ef4444" },
        ]
      : [{ nome: "Sem dados", valor: 1, cor: "#334155" }];

  return (
    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <div className="relative p-5 sm:p-6">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(34,197,94,0.16),transparent_34%),radial-gradient(circle_at_bottom_left,rgba(59,130,246,0.14),transparent_30%)] dark:opacity-100" />
        <div className="relative grid gap-6 xl:grid-cols-[330px_1fr]">
          <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5 dark:border-slate-800 dark:bg-slate-900/70">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.22em] text-blue-500 dark:text-blue-300">
                  Índice operacional
                </p>
                <h2 className="mt-2 text-xl font-black text-slate-900 dark:text-white">
                  Conformidade geral
                </h2>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-emerald-400/30 bg-emerald-500/15 text-emerald-500">
                <ShieldCheck size={24} />
              </div>
            </div>

            <div className="mt-5 grid grid-cols-[136px_1fr] items-center gap-4">
              <div className="relative h-32 w-32">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={dadosRosca}
                      dataKey="valor"
                      nameKey="nome"
                      innerRadius={48}
                      outerRadius={62}
                      paddingAngle={4}
                      cornerRadius={12}
                      strokeWidth={0}
                    >
                      {dadosRosca.map((item) => (
                        <Cell key={item.nome} fill={item.cor} />
                      ))}
                    </Pie>
                    <Tooltip
                      content={<TooltipGrafico />}
                      wrapperStyle={{ pointerEvents: "none", outline: "none" }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <strong className="text-2xl text-slate-900 dark:text-white">
                    {indiceConformidade}%
                  </strong>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    conforme
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="rounded-xl border border-emerald-400/20 bg-emerald-500/10 p-3">
                  <p className="flex items-center gap-2 text-xs font-bold text-emerald-600 dark:text-emerald-300">
                    <CheckCircle2 size={15} /> Conformidades
                  </p>
                  <p className="mt-1 text-2xl font-black text-slate-900 dark:text-white">
                    {totais.conforme}
                  </p>
                </div>
                <div className="rounded-xl border border-amber-400/20 bg-amber-500/10 p-3">
                  <p className="flex items-center gap-2 text-xs font-bold text-amber-600 dark:text-amber-300">
                    <AlertTriangle size={15} /> Atenção
                  </p>
                  <p className="mt-1 text-2xl font-black text-slate-900 dark:text-white">
                    {totais.atencao}
                  </p>
                </div>
                <div className="rounded-xl border border-red-400/20 bg-red-500/10 p-3">
                  <p className="flex items-center gap-2 text-xs font-bold text-red-600 dark:text-red-300">
                    <XCircle size={15} /> Não conformidades
                  </p>
                  <p className="mt-1 text-2xl font-black text-slate-900 dark:text-white">
                    {totais.naoConforme}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950/80">
              <p className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
                <Gauge size={17} className="text-blue-500" />
                Leitura executiva
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                {total === 0
                  ? "Ainda não há dados suficientes para calcular o índice de conformidade operacional."
                  : `${indiceConformidade}% dos controles avaliados estão aderentes. ${indiceNaoConformidade}% exigem tratativa ou justificativa operacional.`}
              </p>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {itens.map((item) => {
              const totalModulo =
                item.conforme + item.naoConforme + item.atencao;
              const moduloConforme = percentual(item.conforme, totalModulo);
              return (
                <div
                  key={item.modulo}
                  className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-900/70"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-black text-slate-900 dark:text-white">
                        {item.modulo}
                      </h3>
                      <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                        {item.descricao}
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-black ${moduloConforme >= 80 ? "bg-emerald-500/15 text-emerald-500" : moduloConforme >= 60 ? "bg-amber-500/15 text-amber-500" : "bg-red-500/15 text-red-500"}`}
                    >
                      {moduloConforme}%
                    </span>
                  </div>
                  <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-sky-400 to-blue-500"
                      style={{ width: `${moduloConforme}%` }}
                    />
                  </div>
                  <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="rounded-xl bg-emerald-500/10 p-2 text-emerald-600 dark:text-emerald-300">
                      <strong className="block text-base">
                        {item.conforme}
                      </strong>
                      OK
                    </div>
                    <div className="rounded-xl bg-amber-500/10 p-2 text-amber-600 dark:text-amber-300">
                      <strong className="block text-base">
                        {item.atencao}
                      </strong>
                      Atenção
                    </div>
                    <div className="rounded-xl bg-red-500/10 p-2 text-red-600 dark:text-red-300">
                      <strong className="block text-base">
                        {item.naoConforme}
                      </strong>
                      Desvio
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
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
  const dadosVisuais =
    total > 0 ? dadosRosca : [{ nome: "Sem dados", valor: 1 }];
  const sombraId = `shadow-${idGrafico(titulo)}`;
  const brilhoId = `glow-${idGrafico(titulo)}`;

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg dark:border-slate-800 dark:bg-slate-900/80">
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-slate-800 dark:text-slate-100">
          {titulo}
        </h2>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-700 dark:bg-slate-950 dark:text-slate-100">
          {total}
        </span>
      </div>

      <div className="mt-5 grid grid-cols-1 items-center gap-4 sm:grid-cols-[138px_1fr]">
        <div className="relative h-32 w-32">
          <div className="absolute inset-3 rounded-full bg-slate-100/70 shadow-inner dark:bg-slate-950/70" />
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <defs>
                <filter
                  id={sombraId}
                  x="-20%"
                  y="-20%"
                  width="140%"
                  height="140%"
                >
                  <feDropShadow
                    dx="0"
                    dy="8"
                    stdDeviation="6"
                    floodColor="#0f172a"
                    floodOpacity="0.16"
                  />
                </filter>
                <filter
                  id={brilhoId}
                  x="-20%"
                  y="-20%"
                  width="140%"
                  height="140%"
                >
                  <feDropShadow
                    dx="0"
                    dy="0"
                    stdDeviation="3"
                    floodColor="#60a5fa"
                    floodOpacity="0.22"
                  />
                </filter>
              </defs>
              <Pie
                data={[{ nome: "Base", valor: 1 }]}
                dataKey="valor"
                nameKey="nome"
                innerRadius={52}
                outerRadius={62}
                strokeWidth={0}
                isAnimationActive={false}
              >
                <Cell
                  fill={total > 0 ? "rgba(148, 163, 184, 0.16)" : "#e2e8f0"}
                />
              </Pie>
              <Pie
                data={dadosVisuais}
                dataKey="valor"
                nameKey="nome"
                innerRadius={53}
                outerRadius={62}
                paddingAngle={total > 0 ? 5 : 0}
                cornerRadius={12}
                strokeWidth={0}
                filter={total > 0 ? `url(#${brilhoId})` : `url(#${sombraId})`}
              >
                {dadosVisuais.map((item) => (
                  <Cell
                    key={item.nome}
                    fill={total > 0 ? coresStatus[item.nome] : "#e2e8f0"}
                  />
                ))}
              </Pie>
              <Tooltip
                content={<TooltipGrafico />}
                wrapperStyle={{ pointerEvents: "none", outline: "none" }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <strong className="text-xl text-slate-900 dark:text-white">
              {total}
            </strong>
            <span className="text-[11px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
              total
            </span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 self-center">
          {statusPadrao.map((item) => (
            <div
              key={item}
              className="min-w-0 rounded-xl border border-slate-100 bg-slate-50/70 px-3 py-2.5 dark:border-slate-800 dark:bg-slate-950/45"
            >
              <div className="flex items-center gap-2">
                <span
                  className="h-2 w-2 rounded-full shadow-sm"
                  style={{ backgroundColor: coresStatus[item] }}
                />
                <p className="truncate text-xs font-medium text-slate-500 dark:text-slate-300">
                  {item}
                </p>
              </div>
              <p className="mt-1.5 text-lg font-bold text-slate-900 dark:text-white">
                {status[item] || 0}
              </p>
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
  const gradientId = `bar-${idGrafico(titulo)}`;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/80">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-bold text-slate-800 dark:text-slate-100">
          {titulo}
        </h2>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600 dark:bg-slate-950 dark:text-slate-300">
          Top {dados.length}
        </span>
      </div>

      <div className="mt-5 h-72">
        {dados.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Sem dados no filtro atual.
          </p>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={dadosGrafico}
              layout="vertical"
              margin={{ top: 8, right: 18, left: 8, bottom: 8 }}
            >
              <defs>
                <linearGradient id={gradientId} x1="0" x2="1" y1="0" y2="0">
                  <stop offset="0%" stopColor={cor} stopOpacity={0.68} />
                  <stop offset="100%" stopColor={cor} stopOpacity={1} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                horizontal={false}
                stroke={gridGrafico}
              />
              <XAxis
                type="number"
                allowDecimals={false}
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: eixoGrafico }}
              />
              <YAxis
                dataKey="nome"
                type="category"
                width={122}
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: eixoGrafico }}
              />
              <Tooltip
                content={<TooltipGrafico />}
                cursor={{ fill: cursorGrafico }}
                wrapperStyle={{ pointerEvents: "none", outline: "none" }}
              />
              <Bar
                dataKey="valor"
                name="Quantidade"
                radius={[0, 10, 10, 0]}
                fill={`url(#${gradientId})`}
                barSize={18}
              />
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
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/80 lg:col-span-2">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-bold text-slate-800 dark:text-slate-100">
          Comparativo temporal
        </h2>
        <div className="flex items-center gap-3 text-xs font-semibold text-slate-500 dark:text-slate-300">
          <span className="flex items-center gap-2">
            <span className="h-2 w-5 rounded-full bg-red-500" />
            Ocorrências
          </span>
          <span className="flex items-center gap-2">
            <span className="h-2 w-5 rounded-full bg-sky-500" />
            Eventos
          </span>
        </div>
      </div>

      <div className="mt-6 h-72">
        {dados.length === 0 ? (
          <p className="self-start text-sm text-slate-500 dark:text-slate-400">
            Sem dados no filtro atual.
          </p>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={dados}
              margin={{ top: 12, right: 24, left: 0, bottom: 8 }}
            >
              <defs>
                <linearGradient
                  id="linhaOcorrencias"
                  x1="0"
                  x2="1"
                  y1="0"
                  y2="0"
                >
                  <stop offset="0%" stopColor="#fb7185" />
                  <stop offset="100%" stopColor="#ef4444" />
                </linearGradient>
                <linearGradient id="linhaEventos" x1="0" x2="1" y1="0" y2="0">
                  <stop offset="0%" stopColor="#38bdf8" />
                  <stop offset="100%" stopColor="#2563eb" />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={gridGrafico} />
              <XAxis
                dataKey="mes"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: eixoGrafico }}
              />
              <YAxis
                allowDecimals={false}
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: eixoGrafico }}
              />
              <Tooltip
                content={<TooltipGrafico />}
                cursor={{ stroke: "rgba(59, 130, 246, 0.30)", strokeWidth: 1 }}
                wrapperStyle={{ pointerEvents: "none", outline: "none" }}
                position={{ y: 8 }}
              />
              <Line
                type="monotone"
                dataKey="ocorrencias"
                name="Ocorrências"
                stroke="url(#linhaOcorrencias)"
                strokeWidth={3}
                dot={{ r: 3, fill: "#ef4444", strokeWidth: 0 }}
                activeDot={{
                  r: 6,
                  fill: "#ef4444",
                  stroke: "#fee2e2",
                  strokeWidth: 2,
                }}
              />
              <Line
                type="monotone"
                dataKey="eventos"
                name="Eventos"
                stroke="url(#linhaEventos)"
                strokeWidth={3}
                dot={{ r: 3, fill: "#0ea5e9", strokeWidth: 0 }}
                activeDot={{
                  r: 6,
                  fill: "#0ea5e9",
                  stroke: "#e0f2fe",
                  strokeWidth: 2,
                }}
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
  const [camerasResumo, setCamerasResumo] = useState<CamerasResumo>({});
  const [quadraResumo, setQuadraResumo] = useState<QuadraResumo>({});
  const [documentosResumo, setDocumentosResumo] = useState<DocumentosResumo>({
    total: 0,
    assinados: 0,
    pendentes: 0,
    comPdf: 0,
  });
  const [tarefasAbertas, setTarefasAbertas] = useState<PlanejamentoCard[]>([]);
  const [checklists, setChecklists] = useState<ChecklistInspecao[]>([]);
  const [riscos, setRiscos] = useState<RiscoDashboard[]>([]);
  const [planosAcao, setPlanosAcao] = useState<PlanoAcaoDashboard[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [periodo, setPeriodo] = useState("todos");
  const [mes, setMes] = useState("");
  const [ano, setAno] = useState("");
  const [status, setStatus] = useState("");
  const [local, setLocal] = useState("");
  const usuario = usuarioAtual();
  const isOperador = usuario?.perfilAcesso === PERFIS.OPERADOR;

  async function carregarDashboard() {
    setCarregando(true);
    const [
      ocorrenciasResponse,
      eventosResponse,
      investigacoesResponse,
      camerasResponse,
      quadraResponse,
      planejamentoResponse,
      documentosResponse,
      checklistsResponse,
      riscosResponse,
      planosResponse,
    ] = await Promise.all([
      api.get("/ocorrencias"),
      api.get("/eventos"),
      api.get("/investigacoes"),
      api.get("/cameras/dashboard").catch(() => ({ data: {} })),
      api
        .get(
          `/quadra-seguranca/dashboard?ano=${ano || new Date().getFullYear()}`,
        )
        .catch(() => ({ data: {} })),
      api.get("/planejamento").catch(() => ({ data: { colunas: [] } })),
      api
        .get("/documentos")
        .catch(() => ({
          data: { resumo: { total: 0, assinados: 0, pendentes: 0, comPdf: 0 } },
        })),
      api.get("/checklists").catch(() => ({ data: [] })),
      api.get("/riscos").catch(() => ({ data: [] })),
      api.get("/planos-acao").catch(() => ({ data: [] })),
    ]);

    setOcorrencias(ocorrenciasResponse.data);
    setEventos(eventosResponse.data);
    setInvestigacoes(investigacoesResponse.data);
    setCamerasResumo(camerasResponse.data);
    setQuadraResumo(quadraResponse.data);
    setDocumentosResumo(
      documentosResponse.data.resumo || {
        total: 0,
        assinados: 0,
        pendentes: 0,
        comPdf: 0,
      },
    );
    setChecklists(
      Array.isArray(checklistsResponse.data) ? checklistsResponse.data : [],
    );
    setRiscos(Array.isArray(riscosResponse.data) ? riscosResponse.data : []);
    setPlanosAcao(
      Array.isArray(planosResponse.data) ? planosResponse.data : [],
    );
    const cards = (
      (planejamentoResponse.data.colunas || []) as PlanejamentoColuna[]
    ).flatMap((coluna) =>
      (coluna.cards || []).map((card: PlanejamentoCard) => ({
        ...card,
        status: coluna.titulo,
      })),
    );
    setTarefasAbertas(
      cards
        .filter((card: PlanejamentoCard) => {
          const responsavelAtual =
            !card.responsavel?.id || card.responsavel.id === usuario?.id;
          const statusAberto = ![
            "Concluido",
            "Concluído",
            "Arquivado",
          ].includes(card.status);
          return responsavelAtual && statusAberto;
        })
        .slice(0, 6),
    );
    setCarregando(false);
  }

  useEffect(() => {
    carregarDashboard();
    const intervalo = window.setInterval(carregarDashboard, 30000);
    return () => window.clearInterval(intervalo);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!isOperador) return;
    api
      .get(`/quadra-seguranca/dashboard?ano=${ano || new Date().getFullYear()}`)
      .then((response) => setQuadraResumo(response.data))
      .catch(() => setQuadraResumo({}));
  }, [ano, isOperador]);

  const carregamentoInicial =
    carregando &&
    ocorrencias.length === 0 &&
    eventos.length === 0 &&
    investigacoes.length === 0 &&
    tarefasAbertas.length === 0;

  const locais = useMemo(() => {
    const lista = new Set<string>();
    ocorrencias.forEach((item) => lista.add(item.local));
    eventos.forEach((item) => lista.add(item.local));
    investigacoes.forEach((item) => lista.add(item.local));
    return Array.from(lista).filter(Boolean).sort();
  }, [eventos, investigacoes, ocorrencias]);

  const anos = useMemo(() => {
    const lista = new Set<number>();
    ocorrencias.forEach((item) =>
      lista.add(new Date(item.dataOcorrencia).getFullYear()),
    );
    eventos.forEach((item) =>
      lista.add(new Date(item.dataEvento).getFullYear()),
    );
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
    0,
  );
  const totalRecuperado = eventosFiltrados.reduce(
    (total, item) => total + moedaParaNumero(item.analise?.valorRecuperado),
    0,
  );
  const diferenca = totalPrejuizo - totalRecuperado;

  const temporal = useMemo(() => {
    const mapa = new Map<
      string,
      { mes: string; ocorrencias: number; eventos: number }
    >();

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

  const itensChecklist = checklists.flatMap(
    (checklist) => checklist.itens || [],
  );
  const checklistConformes = itensChecklist.filter(
    (item) => normalizarTexto(item.conformidade) === "conforme",
  ).length;
  const checklistNaoConformes = itensChecklist.filter(
    (item) => normalizarTexto(item.conformidade) === "nao conforme",
  ).length;
  const checklistAtencao = itensChecklist.filter((item) => {
    const conformidade = normalizarTexto(item.conformidade);
    return (
      conformidade === "nao aplicavel" ||
      (!conformidade && normalizarTexto(item.criticidade) !== "")
    );
  }).length;

  const camerasConformes =
    camerasResumo.camerasConformidade ||
    camerasResumo.totalConectadas ||
    camerasResumo.online ||
    0;
  const camerasNaoConformes =
    (camerasResumo.camerasCriticas || 0) +
    (camerasResumo.camerasDesconectadas ||
      camerasResumo.totalDesconectadas ||
      camerasResumo.offline ||
      0);
  const camerasAtencao = camerasResumo.camerasAtencao || 0;

  const riscosConformes = riscos.filter((risco) => {
    const statusRisco = normalizarTexto(risco.status);
    const nivel = normalizarTexto(risco.nivelRisco);
    return (
      statusRisco === "concluido" || nivel === "baixo" || nivel === "moderado"
    );
  }).length;
  const riscosNaoConformes = riscos.filter((risco) => {
    const statusRisco = normalizarTexto(risco.status);
    const nivel = normalizarTexto(risco.nivelRisco);
    return (
      statusRisco !== "concluido" && (nivel === "alto" || nivel === "critico")
    );
  }).length;
  const riscosAtencao = Math.max(
    0,
    riscos.length - riscosConformes - riscosNaoConformes,
  );

  const planosConformes = planosAcao.filter(
    (plano) => normalizarTexto(plano.status) === "concluido",
  ).length;
  const planosNaoConformes = planosAcao.filter((plano) => {
    const statusPlano = normalizarTexto(plano.status);
    return statusPlano === "atrasado" || statusPlano === "vencido";
  }).length;
  const planosAtencao = Math.max(
    0,
    planosAcao.length - planosConformes - planosNaoConformes,
  );

  const documentosConformes = documentosResumo.assinados;
  const documentosNaoConformes = documentosResumo.pendentes;
  const documentosAtencao = Math.max(
    0,
    documentosResumo.total -
      documentosResumo.assinados -
      documentosResumo.pendentes,
  );

  const itensConformidade = [
    {
      modulo: "Inspeções CIP",
      conforme: checklistConformes,
      naoConforme: checklistNaoConformes,
      atencao: checklistAtencao,
      descricao:
        "Itens vistoriados em conformidade, atenção ou desvio operacional.",
    },
    {
      modulo: "CFTV",
      conforme: camerasConformes,
      naoConforme: camerasNaoConformes,
      atencao: camerasAtencao,
      descricao: "Retenção, disponibilidade e status das câmeras monitoradas.",
    },
    {
      modulo: "Riscos",
      conforme: riscosConformes,
      naoConforme: riscosNaoConformes,
      atencao: riscosAtencao,
      descricao:
        "Classificação de riscos e tratativas pendentes por criticidade.",
    },
    {
      modulo: "Planos de ação",
      conforme: planosConformes,
      naoConforme: planosNaoConformes,
      atencao: planosAtencao,
      descricao:
        "Ações corretivas e preventivas concluídas, pendentes ou vencidas.",
    },
    {
      modulo: "Documentos",
      conforme: documentosConformes,
      naoConforme: documentosNaoConformes,
      atencao: documentosAtencao,
      descricao: "Relatórios assinados, pendentes e em tramitação documental.",
    },
  ];

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
            ${
              isOperador
                ? ""
                : `
              <div class="card"><div class="label">Prejuízo total</div><div class="value">${formatarMoeda(totalPrejuizo)}</div></div>
              <div class="card"><div class="label">Valor recuperado</div><div class="value">${formatarMoeda(totalRecuperado)}</div></div>
              <div class="card"><div class="label">Diferença</div><div class="value">${formatarMoeda(diferenca)}</div></div>
            `
            }
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

  if (carregamentoInicial) {
    return <SkeletonDashboard />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">
            {isOperador
              ? "Dashboard Operacional CFTV"
              : "Dashboard Administrativo"}
          </h1>
          <p className="mt-1 text-slate-500">
            {isOperador
              ? "Monitoramento operacional, CFTV, relatórios, tarefas e quadra de segurança."
              : "Indicadores operacionais, financeiros e tendências dos relatórios."}
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

          <select
            value={mes}
            onChange={(e) => setMes(e.target.value)}
            className="rounded-lg border p-3"
          >
            <option value="">Todos os meses</option>
            {Array.from({ length: 12 }, (_, index) => (
              <option key={index + 1} value={index + 1}>
                {new Date(2026, index, 1).toLocaleString("pt-BR", {
                  month: "long",
                })}
              </option>
            ))}
          </select>

          <select
            value={ano}
            onChange={(e) => setAno(e.target.value)}
            className="rounded-lg border p-3"
          >
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

          <select
            value={local}
            onChange={(e) => setLocal(e.target.value)}
            className="rounded-lg border p-3"
          >
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

      <ConformidadeOperacional itens={itensConformidade} />

      {isOperador ? (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            <Indicador
              titulo="Câmeras conectadas"
              valor={camerasResumo.totalConectadas || camerasResumo.online || 0}
              subtitulo="Disponíveis no monitoramento"
              destaque="text-emerald-600"
            />
            <Indicador
              titulo="Câmeras desconectadas"
              valor={
                camerasResumo.totalDesconectadas || camerasResumo.offline || 0
              }
              subtitulo="Exigem atenção operacional"
              destaque="text-red-600"
            />
            <Indicador
              titulo="Tarefas em aberto"
              valor={tarefasAbertas.length}
              subtitulo="Atribuídas ao usuário conectado"
              destaque="text-blue-600"
            />
            <Indicador
              titulo="Contêineres armazenados"
              valor={quadraResumo.armazenados || quadraResumo.noTerminal || 0}
              subtitulo={`${quadraResumo.permanenciaCritica || 0} em permanência crítica no ano`}
              destaque="text-amber-600"
            />
            <Indicador
              titulo="Previsão de chegada"
              valor={quadraResumo.previstos || 0}
              subtitulo={`Filtro anual: ${ano || new Date().getFullYear()}`}
              destaque="text-blue-600"
            />
            <Indicador
              titulo="Contêineres que saíram"
              valor={quadraResumo.saidos || 0}
              subtitulo={`Saídas/finalizados em ${ano || new Date().getFullYear()}`}
              destaque="text-emerald-600"
            />
          </div>

          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-lg font-bold text-slate-900">
              Tarefas em Aberto
            </h2>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
              {tarefasAbertas.map((tarefa) => (
                <div
                  key={tarefa.id}
                  className="rounded-xl border border-slate-200 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="font-bold text-slate-900">
                      {tarefa.titulo}
                    </h3>
                    <span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-bold text-blue-700">
                      {tarefa.prioridade || "Normal"}
                    </span>
                  </div>
                  <p className="mt-2 line-clamp-2 text-sm text-slate-500">
                    {tarefa.descricao || "Sem descrição."}
                  </p>
                  <p className="mt-3 text-xs text-slate-500">
                    Status: {tarefa.status}
                  </p>
                  <p className="text-xs text-slate-500">
                    Prazo:{" "}
                    {tarefa.prazo
                      ? new Date(tarefa.prazo).toLocaleDateString("pt-BR")
                      : "Sem prazo"}
                  </p>
                </div>
              ))}
              {tarefasAbertas.length === 0 && (
                <p className="text-sm text-slate-500">
                  Nenhuma tarefa em aberto atribuída.
                </p>
              )}
            </div>
          </section>
        </>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
            <Indicador
              titulo="Prejuízo total"
              valor={formatarMoeda(totalPrejuizo)}
              subtitulo="Somatório das análises de ocorrência"
              destaque="text-red-600"
            />
            <Indicador
              titulo="Valor recuperado"
              valor={formatarMoeda(totalRecuperado)}
              subtitulo="Somatório das análises de eventos"
              destaque="text-emerald-600"
            />
            <Indicador
              titulo="Diferença financeira"
              valor={formatarMoeda(diferenca)}
              subtitulo="Prejuízo menos recuperação"
              destaque={diferenca > 0 ? "text-amber-600" : "text-emerald-600"}
            />
            <Indicador
              titulo="Tendência"
              valor={variacao > 0 ? `+${variacao}` : variacao}
              subtitulo="Variação contra período anterior"
              destaque={variacao > 0 ? "text-blue-600" : "text-slate-700"}
            />
          </div>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
            <Indicador
              titulo="Documentos emitidos"
              valor={documentosResumo.total}
              subtitulo="Central documental consolidada"
              destaque="text-blue-600"
            />
            <Indicador
              titulo="Assinados"
              valor={documentosResumo.assinados}
              subtitulo="Com validação eletrônica"
              destaque="text-emerald-600"
            />
            <Indicador
              titulo="Pendentes"
              valor={documentosResumo.pendentes}
              subtitulo="Exigem assinatura ou revisão"
              destaque="text-amber-600"
            />
            <Indicador
              titulo="Com PDF"
              valor={documentosResumo.comPdf}
              subtitulo="Disponíveis para consulta e download"
              destaque="text-slate-700"
            />
          </div>
        </>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <GraficoTemporal dados={temporal} />
        <BarraHorizontal
          titulo="Naturezas com maior índice de ocorrências"
          dados={topRegistros(
            agrupar(ocorrenciasFiltradas, (item) => item.natureza),
          )}
          cor="#2563eb"
        />
        <BarraHorizontal
          titulo="Naturezas com maior índice de eventos"
          dados={topRegistros(
            agrupar(eventosFiltrados, (item) => item.natureza),
          )}
          cor="#10b981"
        />
        <BarraHorizontal
          titulo="Locais com maior índice de ocorrências"
          dados={topRegistros(
            agrupar(ocorrenciasFiltradas, (item) => item.local),
          )}
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
