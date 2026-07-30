import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Award,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Gauge,
  Search,
  ShieldCheck,
  Target,
  Timer,
  TrendingUp,
  UserRound,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { api } from "../services/api";

type HistoricoTreinamento = {
  id: string;
  treinamento: string;
  poc?: string;
  dataInicio?: string | null;
  dataConclusao?: string | null;
  ultimoAcesso?: string | null;
  tempoHoras?: number | null;
  nota?: number | null;
  tentativas: number;
  certificadoUrl?: string | null;
  status: string;
  porcentagem: number;
  vencido: boolean;
};

type Colaborador = {
  id: string;
  foto?: string | null;
  nome: string;
  matricula?: string | null;
  cpf?: string | null;
  email: string;
  cargo?: string | null;
  departamento?: string | null;
  unidade?: string | null;
  equipe?: string | null;
  gestor?: string | null;
  dataAdmissao?: string | null;
  tempoEmpresa?: string;
  quantidadeTreinamentos: number;
  treinamentosConcluidos: number;
  treinamentosPendentes: number;
  notaMedia: number;
  maiorNota?: number | null;
  menorNota?: number | null;
  ultimaAvaliacao?: string | null;
  ultimoAcesso?: string | null;
  situacao: string;
  ico: number;
  classificacaoIco: string;
  pontosFortes: string[];
  pontosFracos: string[];
  recomendacoes: string[];
  historico: HistoricoTreinamento[];
};

type PainelDados = {
  kpis: Record<string, number>;
  graficos: {
    mediaTreinamento: Array<{ nome: string; media: number; total: number }>;
    aprovadosReprovados: Array<{ nome: string; valor: number }>;
    evolucaoNotas: Array<{ mes: string; media: number }>;
    maiorReprovacao: Array<{ nome: string; taxaReprovacao: number }>;
    maiorAprovacao: Array<{ nome: string; taxaAprovacao: number }>;
    tempoMedioTreinamento: Array<{ nome: string; tempoMedio: number }>;
    notasUnidade: Array<{ nome: string; media: number; total: number }>;
    notasDepartamento: Array<{ nome: string; media: number; total: number }>;
    notasCargo: Array<{ nome: string; media: number; total: number }>;
    rankingColaboradores: Colaborador[];
    rankingUnidades: Array<{ nome: string; media: number; total: number }>;
    rankingDepartamentos: Array<{ nome: string; media: number; total: number }>;
    rankingTreinamentosDificeis: Array<{
      nome: string;
      taxaReprovacao: number;
      media: number;
    }>;
    assuntosErro: Array<{ assunto: string; indiceErro: number }>;
    competencias: Array<{ competencia: string; nota: number }>;
  };
  colaboradores: Colaborador[];
  opcoes: {
    unidades: string[];
    departamentos: string[];
    cargos: string[];
    treinamentos: string[];
    status: string[];
  };
};

const vazio: PainelDados = {
  kpis: {},
  graficos: {
    mediaTreinamento: [],
    aprovadosReprovados: [],
    evolucaoNotas: [],
    maiorReprovacao: [],
    maiorAprovacao: [],
    tempoMedioTreinamento: [],
    notasUnidade: [],
    notasDepartamento: [],
    notasCargo: [],
    rankingColaboradores: [],
    rankingUnidades: [],
    rankingDepartamentos: [],
    rankingTreinamentosDificeis: [],
    assuntosErro: [],
    competencias: [],
  },
  colaboradores: [],
  opcoes: {
    unidades: [],
    departamentos: [],
    cargos: [],
    treinamentos: [],
    status: [],
  },
};

const cores = ["#2563eb", "#16a34a", "#f59e0b", "#dc2626", "#7c3aed"];

function formatarData(data?: string | null) {
  if (!data) return "-";
  return new Date(data).toLocaleDateString("pt-BR");
}

function numero(valor?: number | null) {
  return typeof valor === "number" && Number.isFinite(valor) ? valor : 0;
}

function baixarCsv(
  nomeArquivo: string,
  linhas: Array<Record<string, unknown>>,
) {
  const colunas = Object.keys(linhas[0] || {});
  const csv = [
    colunas.join(";"),
    ...linhas.map((linha) =>
      colunas
        .map((coluna) => `"${String(linha[coluna] ?? "").replace(/"/g, '""')}"`)
        .join(";"),
    ),
  ].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = nomeArquivo;
  link.click();
  URL.revokeObjectURL(url);
}

function Kpi({
  titulo,
  valor,
  detalhe,
  icon: Icon,
}: {
  titulo: string;
  valor: string | number;
  detalhe: string;
  icon: LucideIcon;
}) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-4 shadow-lg">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.28em] text-blue-300">
            {titulo}
          </p>
          <p className="mt-3 text-3xl font-black text-white">{valor}</p>
        </div>
        <Icon className="text-blue-400" size={22} />
      </div>
      <p className="mt-2 text-xs font-semibold text-slate-300">{detalhe}</p>
    </div>
  );
}

function ChartBox({
  titulo,
  children,
}: {
  titulo: string;
  children: ReactNode;
}) {
  return (
    <section className="min-h-[310px] rounded-xl border border-slate-800 bg-slate-900/80 p-4 shadow-lg">
      <h2 className="mb-4 text-sm font-black uppercase tracking-[0.2em] text-slate-100">
        {titulo}
      </h2>
      <div className="h-64">{children}</div>
    </section>
  );
}

export default function PainelTreinamentos() {
  const [dados, setDados] = useState<PainelDados>(vazio);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [selecionado, setSelecionado] = useState<Colaborador | null>(null);
  const [filtros, setFiltros] = useState({
    nome: "",
    matricula: "",
    unidade: "",
    departamento: "",
    cargo: "",
    treinamento: "",
    situacao: "",
    status: "",
    notaMin: "",
    notaMax: "",
    inicio: "",
    fim: "",
  });

  const parametros = useMemo(() => {
    const params = new URLSearchParams();
    Object.entries(filtros).forEach(([chave, valor]) => {
      if (valor) params.set(chave, valor);
    });
    return params.toString();
  }, [filtros]);

  useEffect(() => {
    setCarregando(true);
    setErro("");
    api
      .get(`/painel-treinamentos${parametros ? `?${parametros}` : ""}`)
      .then((response) => setDados(response.data))
      .catch((error) =>
        setErro(error.response?.data?.error || "Erro ao carregar painel."),
      )
      .finally(() => setCarregando(false));
  }, [parametros]);

  const atualizarFiltro = (campo: keyof typeof filtros, valor: string) => {
    setFiltros((atual) => ({ ...atual, [campo]: valor }));
  };

  const exportar = () => {
    baixarCsv(
      "painel-analitico-treinamentos.csv",
      dados.colaboradores.map((item) => ({
        Nome: item.nome,
        Matricula: item.matricula || "",
        CPF: item.cpf || "",
        Cargo: item.cargo || "",
        Departamento: item.departamento || "",
        Unidade: item.unidade || "",
        Treinamentos: item.quantidadeTreinamentos,
        Concluidos: item.treinamentosConcluidos,
        Pendentes: item.treinamentosPendentes,
        NotaMedia: item.notaMedia,
        ICO: item.ico,
        Situacao: item.situacao,
      })),
    );
  };

  return (
    <div className="min-h-screen bg-slate-950 p-6 text-slate-100">
      <header className="mb-6 flex flex-col gap-4 border-b border-slate-800 pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.35em] text-blue-300">
            Gestão de competências
          </p>
          <h1 className="mt-2 text-3xl font-black text-white">
            Painel Analítico de Treinamentos
          </h1>
          <p className="mt-2 max-w-3xl text-sm font-semibold text-slate-300">
            Acompanhe desempenho, conformidade, evolução, reciclagens e aptidão
            técnica dos colaboradores.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-700 px-4 py-3 text-sm font-black text-slate-100 hover:bg-slate-900"
          >
            <Download size={18} />
            PDF
          </button>
          <button
            onClick={exportar}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-black text-white hover:bg-blue-500"
          >
            <FileSpreadsheet size={18} />
            CSV / Excel
          </button>
        </div>
      </header>

      <section className="mb-6 rounded-xl border border-slate-800 bg-slate-900/70 p-4">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
          <label className="xl:col-span-2">
            <span className="mb-1 block text-xs font-black uppercase tracking-[0.18em] text-slate-300">
              Nome, CPF ou e-mail
            </span>
            <div className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-950 px-3">
              <Search size={17} className="text-slate-400" />
              <input
                className="h-11 w-full bg-transparent text-sm font-bold outline-none placeholder:text-slate-500"
                value={filtros.nome}
                onChange={(e) => atualizarFiltro("nome", e.target.value)}
                placeholder="Buscar colaborador"
              />
            </div>
          </label>
          <label>
            <span className="mb-1 block text-xs font-black uppercase tracking-[0.18em] text-slate-300">
              Matrícula
            </span>
            <input
              className="h-11 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 text-sm font-bold outline-none placeholder:text-slate-500"
              value={filtros.matricula}
              onChange={(e) => atualizarFiltro("matricula", e.target.value)}
              placeholder="RE"
            />
          </label>
          {[
            ["unidade", "Unidade", dados.opcoes.unidades],
            ["departamento", "Departamento", dados.opcoes.departamentos],
            ["cargo", "Cargo", dados.opcoes.cargos],
            ["treinamento", "Treinamento", dados.opcoes.treinamentos],
            ["situacao", "Situação", ["Concluído", "Pendente", "Vencido"]],
            ["status", "Status", dados.opcoes.status],
          ].map(([campo, label, opcoes]) => (
            <label key={String(campo)}>
              <span className="mb-1 block text-xs font-black uppercase tracking-[0.18em] text-slate-300">
                {String(label)}
              </span>
              <select
                className="h-11 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 text-sm font-bold text-slate-100 outline-none"
                value={filtros[campo as keyof typeof filtros]}
                onChange={(e) =>
                  atualizarFiltro(campo as keyof typeof filtros, e.target.value)
                }
              >
                <option value="">Todos</option>
                {(opcoes as string[]).map((opcao) => (
                  <option key={opcao} value={opcao}>
                    {opcao}
                  </option>
                ))}
              </select>
            </label>
          ))}
          <label>
            <span className="mb-1 block text-xs font-black uppercase tracking-[0.18em] text-slate-300">
              Nota mínima
            </span>
            <input
              type="number"
              className="h-11 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 text-sm font-bold outline-none"
              value={filtros.notaMin}
              onChange={(e) => atualizarFiltro("notaMin", e.target.value)}
            />
          </label>
          <label>
            <span className="mb-1 block text-xs font-black uppercase tracking-[0.18em] text-slate-300">
              Nota máxima
            </span>
            <input
              type="number"
              className="h-11 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 text-sm font-bold outline-none"
              value={filtros.notaMax}
              onChange={(e) => atualizarFiltro("notaMax", e.target.value)}
            />
          </label>
          <label>
            <span className="mb-1 block text-xs font-black uppercase tracking-[0.18em] text-slate-300">
              Início
            </span>
            <input
              type="date"
              className="h-11 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 text-sm font-bold outline-none"
              value={filtros.inicio}
              onChange={(e) => atualizarFiltro("inicio", e.target.value)}
            />
          </label>
          <label>
            <span className="mb-1 block text-xs font-black uppercase tracking-[0.18em] text-slate-300">
              Fim
            </span>
            <input
              type="date"
              className="h-11 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 text-sm font-bold outline-none"
              value={filtros.fim}
              onChange={(e) => atualizarFiltro("fim", e.target.value)}
            />
          </label>
        </div>
      </section>

      {erro && (
        <div className="mb-6 rounded-xl border border-red-800 bg-red-950 p-4 text-sm font-bold text-red-100">
          {erro}
        </div>
      )}
      {carregando && (
        <div className="mb-6 rounded-xl border border-slate-800 bg-slate-900 p-6 text-sm font-bold text-slate-300">
          Carregando painel analítico...
        </div>
      )}

      <section className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi
          titulo="Colaboradores"
          valor={numero(dados.kpis.totalColaboradores)}
          detalhe="Com registros de treinamento"
          icon={UserRound}
        />
        <Kpi
          titulo="Concluídos"
          valor={numero(dados.kpis.treinamentosConcluidos)}
          detalhe="Treinamentos finalizados"
          icon={CheckCircle2}
        />
        <Kpi
          titulo="Pendentes"
          valor={numero(dados.kpis.treinamentosPendentes)}
          detalhe="Obrigatórios em aberto"
          icon={AlertTriangle}
        />
        <Kpi
          titulo="Conformidade"
          valor={`${numero(dados.kpis.percentualConformidade)}%`}
          detalhe="Percentual geral"
          icon={ShieldCheck}
        />
        <Kpi
          titulo="Média geral"
          valor={numero(dados.kpis.mediaGeralAvaliacoes)}
          detalhe="Avaliações com nota"
          icon={Target}
        />
        <Kpi
          titulo="Maior nota"
          valor={numero(dados.kpis.maiorNota)}
          detalhe="Melhor avaliação"
          icon={Award}
        />
        <Kpi
          titulo="Menor nota"
          valor={numero(dados.kpis.menorNota)}
          detalhe="Ponto de atenção"
          icon={Gauge}
        />
        <Kpi
          titulo="Tempo médio"
          valor={`${numero(dados.kpis.tempoMedioConclusao)}h`}
          detalhe="Conclusão dos cursos"
          icon={Timer}
        />
      </section>

      <section className="mb-6 grid gap-4 xl:grid-cols-2">
        <ChartBox titulo="Média das notas por treinamento">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={dados.graficos.mediaTreinamento}
              margin={{ left: 0, right: 10, bottom: 60 }}
            >
              <CartesianGrid stroke="#1e293b" />
              <XAxis
                dataKey="nome"
                interval={0}
                angle={-35}
                textAnchor="end"
                height={80}
                tick={{ fill: "#cbd5e1", fontSize: 11 }}
              />
              <YAxis tick={{ fill: "#cbd5e1", fontSize: 12 }} />
              <Tooltip
                contentStyle={{
                  background: "#020617",
                  border: "1px solid #334155",
                  color: "#fff",
                }}
              />
              <Bar dataKey="media" fill="#2563eb" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartBox>
        <ChartBox titulo="Aprovados x reprovados x pendentes">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={dados.graficos.aprovadosReprovados}
                dataKey="valor"
                nameKey="nome"
                innerRadius={62}
                outerRadius={96}
                paddingAngle={4}
              >
                {dados.graficos.aprovadosReprovados.map((_, index) => (
                  <Cell key={index} fill={cores[index % cores.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: "#020617",
                  border: "1px solid #334155",
                  color: "#fff",
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </ChartBox>
        <ChartBox titulo="Evolução das notas">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={dados.graficos.evolucaoNotas}>
              <CartesianGrid stroke="#1e293b" />
              <XAxis dataKey="mes" tick={{ fill: "#cbd5e1", fontSize: 12 }} />
              <YAxis tick={{ fill: "#cbd5e1", fontSize: 12 }} />
              <Tooltip
                contentStyle={{
                  background: "#020617",
                  border: "1px solid #334155",
                  color: "#fff",
                }}
              />
              <Line
                type="monotone"
                dataKey="media"
                stroke="#22c55e"
                strokeWidth={3}
                dot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartBox>
        <ChartBox titulo="Mapa de competências">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={dados.graficos.competencias}>
              <PolarGrid stroke="#334155" />
              <PolarAngleAxis
                dataKey="competencia"
                tick={{ fill: "#cbd5e1", fontSize: 11 }}
              />
              <Radar
                dataKey="nota"
                stroke="#60a5fa"
                fill="#2563eb"
                fillOpacity={0.45}
              />
              <Tooltip
                contentStyle={{
                  background: "#020617",
                  border: "1px solid #334155",
                  color: "#fff",
                }}
              />
            </RadarChart>
          </ResponsiveContainer>
        </ChartBox>
      </section>

      <section className="mb-6 grid gap-4 xl:grid-cols-3">
        <ChartBox titulo="Maior índice de reprovação">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={dados.graficos.maiorReprovacao}
              layout="vertical"
              margin={{ left: 30, right: 10 }}
            >
              <CartesianGrid stroke="#1e293b" />
              <XAxis type="number" tick={{ fill: "#cbd5e1", fontSize: 12 }} />
              <YAxis
                type="category"
                dataKey="nome"
                width={120}
                tick={{ fill: "#cbd5e1", fontSize: 11 }}
              />
              <Tooltip
                contentStyle={{
                  background: "#020617",
                  border: "1px solid #334155",
                  color: "#fff",
                }}
              />
              <Bar
                dataKey="taxaReprovacao"
                fill="#dc2626"
                radius={[0, 6, 6, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartBox>
        <ChartBox titulo="Notas por unidade">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dados.graficos.notasUnidade}>
              <CartesianGrid stroke="#1e293b" />
              <XAxis dataKey="nome" tick={{ fill: "#cbd5e1", fontSize: 11 }} />
              <YAxis tick={{ fill: "#cbd5e1", fontSize: 12 }} />
              <Tooltip
                contentStyle={{
                  background: "#020617",
                  border: "1px solid #334155",
                  color: "#fff",
                }}
              />
              <Bar dataKey="media" fill="#16a34a" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartBox>
        <ChartBox titulo="Assuntos com maior índice de erro">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={dados.graficos.assuntosErro.slice(0, 8)}
              layout="vertical"
              margin={{ left: 30, right: 10 }}
            >
              <CartesianGrid stroke="#1e293b" />
              <XAxis type="number" tick={{ fill: "#cbd5e1", fontSize: 12 }} />
              <YAxis
                type="category"
                dataKey="assunto"
                width={120}
                tick={{ fill: "#cbd5e1", fontSize: 11 }}
              />
              <Tooltip
                contentStyle={{
                  background: "#020617",
                  border: "1px solid #334155",
                  color: "#fff",
                }}
              />
              <Bar dataKey="indiceErro" fill="#f59e0b" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartBox>
      </section>

      <section className="rounded-xl border border-slate-800 bg-slate-900/80 p-4 shadow-lg">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-black text-white">
              Listagem dos colaboradores
            </h2>
            <p className="text-sm font-semibold text-slate-300">
              Clique em um colaborador para abrir o detalhamento completo.
            </p>
          </div>
          <TrendingUp className="text-blue-400" />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1180px] border-separate border-spacing-0 text-sm">
            <thead>
              <tr className="bg-slate-950 text-left text-xs uppercase tracking-[0.18em] text-blue-200">
                {[
                  "Foto",
                  "Nome",
                  "Matrícula",
                  "Cargo",
                  "Departamento",
                  "Unidade",
                  "Qtd.",
                  "Concluídos",
                  "Pendentes",
                  "Nota média",
                  "Maior",
                  "Menor",
                  "Última avaliação",
                  "Situação",
                ].map((titulo) => (
                  <th key={titulo} className="border-b border-slate-800 p-3">
                    {titulo}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {dados.colaboradores.map((item) => (
                <tr
                  key={item.id}
                  onClick={() => setSelecionado(item)}
                  className="cursor-pointer border-b border-slate-800 text-slate-200 hover:bg-slate-800/70"
                >
                  <td className="p-3">
                    {item.foto ? (
                      <img
                        src={item.foto}
                        className="h-9 w-9 rounded-full object-cover"
                      />
                    ) : (
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-950 text-blue-200">
                        <UserRound size={18} />
                      </div>
                    )}
                  </td>
                  <td className="p-3 font-black text-white">{item.nome}</td>
                  <td className="p-3">{item.matricula || "-"}</td>
                  <td className="p-3">{item.cargo || "-"}</td>
                  <td className="p-3">{item.departamento || "-"}</td>
                  <td className="p-3">{item.unidade || "-"}</td>
                  <td className="p-3">{item.quantidadeTreinamentos}</td>
                  <td className="p-3 text-emerald-300">
                    {item.treinamentosConcluidos}
                  </td>
                  <td className="p-3 text-amber-300">
                    {item.treinamentosPendentes}
                  </td>
                  <td className="p-3 font-black">{item.notaMedia}</td>
                  <td className="p-3">{item.maiorNota ?? "-"}</td>
                  <td className="p-3">{item.menorNota ?? "-"}</td>
                  <td className="p-3">{formatarData(item.ultimaAvaliacao)}</td>
                  <td className="p-3">
                    <span className="rounded-full border border-blue-500/40 bg-blue-950 px-3 py-1 text-xs font-black text-blue-100">
                      {item.situacao}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {selecionado && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/80 p-4 backdrop-blur-sm"
          onClick={() => setSelecionado(null)}
        >
          <aside
            className="ml-auto h-full w-full max-w-5xl overflow-y-auto rounded-xl border border-slate-700 bg-slate-950 p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-5 flex items-start justify-between gap-4">
              <div className="flex gap-4">
                {selecionado.foto ? (
                  <img
                    src={selecionado.foto}
                    className="h-16 w-16 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-950 text-blue-200">
                    <UserRound size={28} />
                  </div>
                )}
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.28em] text-blue-300">
                    Detalhamento do colaborador
                  </p>
                  <h2 className="mt-1 text-2xl font-black text-white">
                    {selecionado.nome}
                  </h2>
                  <p className="text-sm font-semibold text-slate-300">
                    {selecionado.cargo || "-"} ·{" "}
                    {selecionado.departamento || "-"} ·{" "}
                    {selecionado.unidade || "-"}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelecionado(null)}
                className="rounded-lg border border-slate-700 p-2 text-slate-300 hover:bg-slate-900"
              >
                <X size={20} />
              </button>
            </div>

            <div className="mb-5 grid gap-3 md:grid-cols-4">
              <Kpi
                titulo="ICO"
                valor={selecionado.ico}
                detalhe={selecionado.classificacaoIco}
                icon={Gauge}
              />
              <Kpi
                titulo="Nota média"
                valor={selecionado.notaMedia}
                detalhe="Desempenho geral"
                icon={Target}
              />
              <Kpi
                titulo="Concluídos"
                valor={selecionado.treinamentosConcluidos}
                detalhe="Histórico aprovado"
                icon={CheckCircle2}
              />
              <Kpi
                titulo="Pendentes"
                valor={selecionado.treinamentosPendentes}
                detalhe="Ações necessárias"
                icon={AlertTriangle}
              />
            </div>

            <div className="mb-5 grid gap-4 lg:grid-cols-3">
              <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
                <h3 className="mb-3 font-black text-white">Perfil</h3>
                {[
                  ["CPF", selecionado.cpf],
                  ["Matrícula", selecionado.matricula],
                  ["E-mail", selecionado.email],
                  ["Equipe", selecionado.equipe],
                  ["Gestor imediato", selecionado.gestor],
                  ["Tempo na empresa", selecionado.tempoEmpresa],
                ].map(([label, valor]) => (
                  <p key={label} className="mb-2 text-sm text-slate-300">
                    <strong className="text-slate-100">{label}:</strong>{" "}
                    {valor || "-"}
                  </p>
                ))}
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
                <h3 className="mb-3 font-black text-white">
                  Análise de desempenho
                </h3>
                <p className="text-sm font-bold text-emerald-300">
                  Pontos fortes
                </p>
                <p className="mb-3 text-sm text-slate-300">
                  {selecionado.pontosFortes.join(", ") ||
                    "Sem destaque consolidado."}
                </p>
                <p className="text-sm font-bold text-amber-300">
                  Pontos de desenvolvimento
                </p>
                <p className="text-sm text-slate-300">
                  {selecionado.pontosFracos.join(", ") ||
                    "Sem dificuldade crítica."}
                </p>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
                <h3 className="mb-3 font-black text-white">
                  Recomendações automáticas
                </h3>
                <ul className="space-y-2 text-sm font-semibold text-slate-300">
                  {selecionado.recomendacoes.map((item) => (
                    <li key={item} className="rounded-lg bg-slate-950 p-2">
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-800">
              <table className="w-full min-w-[900px] text-sm">
                <thead className="bg-slate-900 text-left text-xs uppercase tracking-[0.18em] text-blue-200">
                  <tr>
                    {[
                      "Treinamento",
                      "POC",
                      "Início",
                      "Conclusão",
                      "Tempo",
                      "Nota",
                      "Tentativas",
                      "Certificado",
                      "Status",
                    ].map((titulo) => (
                      <th key={titulo} className="p-3">
                        {titulo}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {selecionado.historico.map((item) => (
                    <tr
                      key={item.id}
                      className="border-t border-slate-800 text-slate-200"
                    >
                      <td className="p-3 font-bold text-white">
                        {item.treinamento}
                      </td>
                      <td className="p-3">{item.poc || "-"}</td>
                      <td className="p-3">{formatarData(item.dataInicio)}</td>
                      <td className="p-3">
                        {formatarData(item.dataConclusao)}
                      </td>
                      <td className="p-3">{item.tempoHoras ?? "-"}h</td>
                      <td className="p-3">{item.nota ?? "-"}</td>
                      <td className="p-3">{item.tentativas}</td>
                      <td className="p-3">
                        {item.certificadoUrl ? (
                          <a
                            href={item.certificadoUrl}
                            target="_blank"
                            className="font-black text-blue-300"
                          >
                            Abrir
                          </a>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td className="p-3">{item.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </aside>
        </div>
      )}

      <footer className="mt-6 text-xs font-semibold text-slate-400">
        Indicadores calculados a partir dos registros existentes de
        treinamentos, avaliações, certificados, progresso e auditoria
        operacional.
      </footer>
    </div>
  );
}
