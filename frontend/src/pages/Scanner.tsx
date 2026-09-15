import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  BarChart3,
  CalendarDays,
  ChevronDown,
  Edit3,
  Filter,
  Plus,
  ScanLine,
  TrendingUp,
  Trash2,
  X,
} from "lucide-react";
import { api } from "../services/api";
import { podeNoModulo } from "../utils/permissoes";
import { solicitarPinOperacional } from "../utils/pinPrompt";

type ScannerPassagem = {
  id: number;
  data: string;
  scanner: string;
  leituraComFalha: number;
  leituraSatisfatoria: number;
  areaSuspeita: number;
  insatisfatoria: number;
  falhasEquipamento: number;
  reprocessamentos: number;
  containersInspecao: number;
  aberturasSuspeita: number;
  tiposSuspeita?: string | null;
  indisponibilidadeInicio?: string | null;
  indisponibilidadeFim?: string | null;
  indisponibilidadeMinutos: number;
  acoesContingencia?: string | null;
  total: number;
  createdAt: string;
  criadoPor?: {
    nome: string;
    apelido?: string | null;
    email: string;
  } | null;
};

type ScannerForm = {
  data: string;
  scanner: string;
  leituraComFalha: string;
  leituraSatisfatoria: string;
  areaSuspeita: string;
  insatisfatoria: string;
  falhasEquipamento: string;
  reprocessamentos: string;
  containersInspecao: string;
  aberturasSuspeita: string;
  tiposSuspeita: string;
  registrarIndisponibilidade: boolean;
  indisponibilidadeInicio: string;
  indisponibilidadeFim: string;
  acoesContingencia: string;
};

type PeriodoTemporal = "dia" | "mes" | "ano";

const scannerPadrao = "NUTECH5S600";
const meses = [
  { valor: "01", label: "Janeiro" },
  { valor: "02", label: "Fevereiro" },
  { valor: "03", label: "Março" },
  { valor: "04", label: "Abril" },
  { valor: "05", label: "Maio" },
  { valor: "06", label: "Junho" },
  { valor: "07", label: "Julho" },
  { valor: "08", label: "Agosto" },
  { valor: "09", label: "Setembro" },
  { valor: "10", label: "Outubro" },
  { valor: "11", label: "Novembro" },
  { valor: "12", label: "Dezembro" },
];

function dataInput(data?: string) {
  const valor = data ? new Date(data) : new Date();
  const offset = valor.getTimezoneOffset();
  return new Date(valor.getTime() - offset * 60000).toISOString().slice(0, 10);
}

function numero(valor: string | number) {
  const parsed = Number(valor || 0);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return Math.trunc(parsed);
}

function formatarData(data: string) {
  return new Date(data).toLocaleString("pt-BR");
}

function formatarPercentual(valor: number) {
  if (!Number.isFinite(valor)) return "0%";
  return `${valor.toFixed(1).replace(".", ",")}%`;
}

function formatarMinutos(minutos: number) {
  const total = Math.max(0, Math.round(minutos || 0));
  const horas = Math.floor(total / 60);
  const mins = total % 60;
  if (!horas) return `${mins}min`;
  return `${horas}h ${String(mins).padStart(2, "0")}min`;
}

function formatarDataReferencia(data: string) {
  return new Date(data).toLocaleDateString("pt-BR");
}

function chaveData(data: string) {
  return dataInput(data);
}

function chaveMes(data: string) {
  return chaveData(data).slice(0, 7);
}

function chaveAno(data: string) {
  return chaveData(data).slice(0, 4);
}

function rotuloPeriodo(data: string, periodo: PeriodoTemporal) {
  const valor = new Date(data);
  if (periodo === "ano") {
    return valor.toLocaleDateString("pt-BR", { year: "numeric" });
  }
  if (periodo === "mes") {
    return valor.toLocaleDateString("pt-BR", {
      month: "long",
      year: "numeric",
    });
  }
  return valor.toLocaleDateString("pt-BR");
}

function formVazio(): ScannerForm {
  return {
    data: dataInput(),
    scanner: scannerPadrao,
    leituraComFalha: "0",
    leituraSatisfatoria: "0",
    areaSuspeita: "0",
    insatisfatoria: "0",
    falhasEquipamento: "0",
    reprocessamentos: "0",
    containersInspecao: "0",
    aberturasSuspeita: "0",
    tiposSuspeita: "",
    registrarIndisponibilidade: false,
    indisponibilidadeInicio: "",
    indisponibilidadeFim: "",
    acoesContingencia: "",
  };
}

export default function Scanner() {
  const [registros, setRegistros] = useState<ScannerPassagem[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [modalAberto, setModalAberto] = useState(false);
  const [editando, setEditando] = useState<ScannerPassagem | null>(null);
  const [indicadoresAbertos, setIndicadoresAbertos] = useState(true);
  const [filtroDataInicial, setFiltroDataInicial] = useState("");
  const [filtroDataFinal, setFiltroDataFinal] = useState("");
  const [filtroMes, setFiltroMes] = useState("");
  const [filtroAno, setFiltroAno] = useState("");
  const [form, setForm] = useState<ScannerForm>(formVazio());

  const podeCriar = podeNoModulo("operacao", "criar");
  const podeEditar = podeNoModulo("operacao", "editar");
  const podeExcluir = podeNoModulo("operacao", "excluir");

  const totalFormulario = useMemo(
    () =>
      numero(form.leituraComFalha) +
      numero(form.leituraSatisfatoria) +
      numero(form.insatisfatoria) +
      numero(form.falhasEquipamento),
    [form],
  );
  const reprocessamentoSugerido = useMemo(
    () =>
      numero(form.leituraComFalha) +
      numero(form.insatisfatoria) +
      numero(form.falhasEquipamento),
    [form],
  );

  const indicadores = useMemo(() => {
    const base = registros.reduce(
      (acc, item) => {
        acc.leituraComFalha += item.leituraComFalha || 0;
        acc.leituraSatisfatoria += item.leituraSatisfatoria || 0;
        acc.areaSuspeita += item.areaSuspeita || 0;
        acc.insatisfatoria += item.insatisfatoria || 0;
        acc.falhasEquipamento += item.falhasEquipamento || 0;
        acc.reprocessamentos += item.reprocessamentos || 0;
        acc.containersInspecao += item.containersInspecao || 0;
        acc.aberturasSuspeita += item.aberturasSuspeita || 0;
        acc.indisponibilidadeMinutos += item.indisponibilidadeMinutos || 0;
        acc.indisponibilidades += item.indisponibilidadeMinutos > 0 ? 1 : 0;
        acc.total += item.total || 0;
        return acc;
      },
      {
        leituraComFalha: 0,
        leituraSatisfatoria: 0,
        areaSuspeita: 0,
        insatisfatoria: 0,
        falhasEquipamento: 0,
        reprocessamentos: 0,
        containersInspecao: 0,
        aberturasSuspeita: 0,
        indisponibilidadeMinutos: 0,
        indisponibilidades: 0,
        total: 0,
      },
    );

    const diasOperacao = Math.max(
      1,
      new Set(registros.map((registro) => chaveData(registro.data))).size,
    );
    const minutosOperacao = diasOperacao * 24 * 60;
    const percentualImagensSuspeitas =
      base.total > 0 ? (base.areaSuspeita / base.total) * 100 : 0;
    const percentualFalhas =
      base.total > 0
        ? ((base.leituraComFalha + base.insatisfatoria + base.falhasEquipamento) /
            base.total) *
          100
        : 0;
    const disponibilidade =
      minutosOperacao > 0
        ? Math.max(
            0,
            Math.min(
              100,
              ((minutosOperacao - base.indisponibilidadeMinutos) / minutosOperacao) *
                100,
            ),
          )
        : 100;
    const tempoMedioRecuperacao =
      base.indisponibilidades > 0
        ? base.indisponibilidadeMinutos / base.indisponibilidades
        : 0;
    const efetividadeInspecoes =
      base.areaSuspeita > 0
        ? (base.aberturasSuspeita / base.areaSuspeita) * 100
        : 0;

    return {
      ...base,
      percentualImagensSuspeitas,
      percentualFalhas,
      disponibilidade,
      tempoMedioRecuperacao,
      efetividadeInspecoes,
    };
  }, [registros]);

  const barras = [
    {
      titulo: "Leitura satisfatória",
      valor: indicadores.leituraSatisfatoria,
      cor: "bg-emerald-400",
    },
    {
      titulo: "Leitura com falha",
      valor: indicadores.leituraComFalha,
      cor: "bg-amber-400",
    },
    {
      titulo: "Imagens suspeitas",
      valor: indicadores.areaSuspeita,
      cor: "bg-sky-400",
    },
    {
      titulo: "Insatisfatória",
      valor: indicadores.insatisfatoria,
      cor: "bg-rose-400",
    },
    {
      titulo: "Falhas no equipamento",
      valor: indicadores.falhasEquipamento,
      cor: "bg-red-400",
    },
  ];

  const anosDisponiveis = useMemo(() => {
    const anos = registros
      .map((registro) => chaveAno(registro.data))
      .filter(Boolean);
    return Array.from(new Set(anos)).sort((a, b) => b.localeCompare(a));
  }, [registros]);

  const registrosTemporais = useMemo(
    () =>
      registros.filter((registro) => {
        const dataRegistro = chaveData(registro.data);
        const primeiraData = filtroDataInicial || filtroDataFinal;
        const segundaData = filtroDataFinal || filtroDataInicial;
        const inicio =
          primeiraData && segundaData && primeiraData > segundaData
            ? segundaData
            : primeiraData;
        const fim =
          primeiraData && segundaData && primeiraData > segundaData
            ? primeiraData
            : segundaData;
        if (inicio && dataRegistro < inicio) return false;
        if (fim && dataRegistro > fim) return false;
        if (filtroMes && chaveMes(registro.data).slice(5, 7) !== filtroMes) {
          return false;
        }
        if (filtroAno && chaveAno(registro.data) !== filtroAno) return false;
        return true;
      }),
    [filtroAno, filtroDataFinal, filtroDataInicial, filtroMes, registros],
  );

  const periodoTemporal = useMemo<PeriodoTemporal>(() => {
    if (filtroDataInicial || filtroDataFinal) return "dia";
    if (filtroMes && filtroAno) return "dia";
    if (filtroAno) return "mes";
    return "ano";
  }, [filtroAno, filtroDataFinal, filtroDataInicial, filtroMes]);

  const serieTemporal = useMemo(() => {
    const mapa = new Map<
      string,
      {
        chave: string;
        rotulo: string;
        ordem: number;
        passagens: number;
        leituraComFalha: number;
        leituraSatisfatoria: number;
        areaSuspeita: number;
        insatisfatoria: number;
        falhasEquipamento: number;
        reprocessamentos: number;
        containersInspecao: number;
        aberturasSuspeita: number;
        indisponibilidadeMinutos: number;
        total: number;
      }
    >();

    registrosTemporais.forEach((registro) => {
      const chave =
        periodoTemporal === "ano"
          ? chaveAno(registro.data)
          : periodoTemporal === "mes"
            ? chaveMes(registro.data)
            : chaveData(registro.data);
      const atual =
        mapa.get(chave) ||
        {
          chave,
          rotulo: rotuloPeriodo(registro.data, periodoTemporal),
          ordem: new Date(registro.data).getTime(),
          passagens: 0,
          leituraComFalha: 0,
          leituraSatisfatoria: 0,
          areaSuspeita: 0,
          insatisfatoria: 0,
          falhasEquipamento: 0,
          reprocessamentos: 0,
          containersInspecao: 0,
          aberturasSuspeita: 0,
          indisponibilidadeMinutos: 0,
          total: 0,
        };

      atual.passagens += 1;
      atual.leituraComFalha += registro.leituraComFalha || 0;
      atual.leituraSatisfatoria += registro.leituraSatisfatoria || 0;
      atual.areaSuspeita += registro.areaSuspeita || 0;
      atual.insatisfatoria += registro.insatisfatoria || 0;
      atual.falhasEquipamento += registro.falhasEquipamento || 0;
      atual.reprocessamentos += registro.reprocessamentos || 0;
      atual.containersInspecao += registro.containersInspecao || 0;
      atual.aberturasSuspeita += registro.aberturasSuspeita || 0;
      atual.indisponibilidadeMinutos += registro.indisponibilidadeMinutos || 0;
      atual.total += registro.total || 0;
      mapa.set(chave, atual);
    });

    return Array.from(mapa.values()).sort((a, b) => a.ordem - b.ordem);
  }, [periodoTemporal, registrosTemporais]);

  const maiorFalhaTemporal = Math.max(
    1,
    ...serieTemporal.map(
      (item) =>
        item.leituraComFalha + item.insatisfatoria + item.falhasEquipamento,
    ),
  );

  const periodoComMaisFalhas = serieTemporal.reduce<
    (typeof serieTemporal)[number] | null
  >((maior, item) => {
    const falhasItem =
      item.leituraComFalha + item.insatisfatoria + item.falhasEquipamento;
    const falhasMaior = maior
      ? maior.leituraComFalha + maior.insatisfatoria + maior.falhasEquipamento
      : -1;
    return falhasItem > falhasMaior ? item : maior;
  }, null);

  async function carregarRegistros() {
    setCarregando(true);
    try {
      const response = await api.get("/operacao/scanner");
      setRegistros(response.data);
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregarRegistros();
  }, []);

  function abrirNovo() {
    setEditando(null);
    setForm(formVazio());
    setModalAberto(true);
  }

  function abrirEdicao(registro: ScannerPassagem) {
    setEditando(registro);
    setForm({
      data: dataInput(registro.data),
      scanner: registro.scanner || scannerPadrao,
      leituraComFalha: String(registro.leituraComFalha || 0),
      leituraSatisfatoria: String(registro.leituraSatisfatoria || 0),
      areaSuspeita: String(registro.areaSuspeita || 0),
      insatisfatoria: String(registro.insatisfatoria || 0),
      falhasEquipamento: String(registro.falhasEquipamento || 0),
      reprocessamentos: String(registro.reprocessamentos || 0),
      containersInspecao: String(registro.containersInspecao || 0),
      aberturasSuspeita: String(registro.aberturasSuspeita || 0),
      tiposSuspeita: registro.tiposSuspeita || "",
      registrarIndisponibilidade: Boolean(registro.indisponibilidadeInicio),
      indisponibilidadeInicio: registro.indisponibilidadeInicio
        ? registro.indisponibilidadeInicio.slice(0, 16)
        : "",
      indisponibilidadeFim: registro.indisponibilidadeFim
        ? registro.indisponibilidadeFim.slice(0, 16)
        : "",
      acoesContingencia: registro.acoesContingencia || "",
    });
    setModalAberto(true);
  }

  function atualizarCampo(campo: keyof ScannerForm, valor: string) {
    setForm((atual) => ({
      ...atual,
      [campo]:
        campo === "scanner" ||
        campo === "data" ||
        campo === "tiposSuspeita" ||
        campo === "indisponibilidadeInicio" ||
        campo === "indisponibilidadeFim" ||
        campo === "acoesContingencia"
          ? valor
          : valor.replace(/\D/g, ""),
    }));
  }

  function atualizarFlagIndisponibilidade(valor: boolean) {
    setForm((atual) => ({
      ...atual,
      registrarIndisponibilidade: valor,
      indisponibilidadeInicio: valor ? atual.indisponibilidadeInicio : "",
      indisponibilidadeFim: valor ? atual.indisponibilidadeFim : "",
    }));
  }

  async function salvarRegistro(event: React.FormEvent) {
    event.preventDefault();
    setSalvando(true);
    try {
      const payload = {
        ...form,
        data: `${form.data}T00:00`,
        leituraComFalha: numero(form.leituraComFalha),
        leituraSatisfatoria: numero(form.leituraSatisfatoria),
        areaSuspeita: numero(form.areaSuspeita),
        insatisfatoria: numero(form.insatisfatoria),
        falhasEquipamento: numero(form.falhasEquipamento),
        reprocessamentos: numero(form.reprocessamentos),
        containersInspecao: numero(form.containersInspecao),
        aberturasSuspeita: numero(form.aberturasSuspeita),
        tiposSuspeita: form.tiposSuspeita,
        registrarIndisponibilidade: form.registrarIndisponibilidade,
        indisponibilidadeInicio: form.registrarIndisponibilidade
          ? form.indisponibilidadeInicio
          : "",
        indisponibilidadeFim: form.registrarIndisponibilidade
          ? form.indisponibilidadeFim
          : "",
        acoesContingencia: form.acoesContingencia,
      };

      if (editando) {
        await api.put(`/operacao/scanner/${editando.id}`, payload);
      } else {
        await api.post("/operacao/scanner", payload);
      }

      setModalAberto(false);
      await carregarRegistros();
    } finally {
      setSalvando(false);
    }
  }

  async function excluirRegistro(registro: ScannerPassagem) {
    const confirmar = window.confirm(
      `Deseja excluir o lançamento do scanner ${registro.scanner} de ${formatarData(
        registro.data,
      )}?`,
    );
    if (!confirmar) return;

    const pinOperacional = await solicitarPinOperacional(
      "Informe seu PIN para confirmar a exclusão do lançamento do scanner.",
    );
    if (!pinOperacional) return;

    await api.delete(`/operacao/scanner/${registro.id}`, {
      data: { pinOperacional },
    });
    await carregarRegistros();
  }

  const maiorBarra = Math.max(1, ...barras.map((item) => item.valor));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.35em] text-blue-500">
            Operações
          </p>
          <h1 className="mt-2 text-3xl font-bold text-white">
            Controle de Passagem Scanner
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Monitoramento diário de leituras, falhas e áreas suspeitas.
          </p>
        </div>

        {podeCriar && (
          <button
            type="button"
            onClick={abrirNovo}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-blue-950/30 transition hover:bg-blue-500"
          >
            <Plus size={18} />
            Novo lançamento
          </button>
        )}
      </div>

      <section className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/70 shadow-2xl shadow-black/20">
        <button
          type="button"
          onClick={() => setIndicadoresAbertos((aberto) => !aberto)}
          className="flex w-full items-center justify-between gap-3 border-b border-slate-800 px-5 py-4 text-left"
        >
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600/15 text-blue-300 ring-1 ring-blue-400/20">
              <BarChart3 size={20} />
            </span>
            <div>
              <h2 className="text-lg font-bold text-white">
                Indicadores do Scanner
              </h2>
              <p className="text-sm text-slate-400">
                Totais consolidados dos lançamentos cadastrados.
              </p>
            </div>
          </div>
          <ChevronDown
            className={`text-slate-400 transition ${
              indicadoresAbertos ? "rotate-180" : ""
            }`}
            size={20}
          />
        </button>

        {indicadoresAbertos && (
          <div className="space-y-5 p-5">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              <IndicadorScanner
                titulo="Total de containers scanneados"
                valor={indicadores.total}
                detalhe={`${registros.length} lançamento(s)`}
                destaque="text-white"
              />
              <IndicadorScanner
                titulo="% de imagens suspeitas"
                valor={formatarPercentual(indicadores.percentualImagensSuspeitas)}
                detalhe={`${indicadores.areaSuspeita} imagem(ns) suspeita(s)`}
                destaque="text-sky-300"
              />
              <IndicadorScanner
                titulo="Aberturas por suspeita"
                valor={indicadores.aberturasSuspeita}
                detalhe={`${indicadores.containersInspecao} container(s) para inspeção`}
                destaque="text-amber-300"
              />
              <IndicadorScanner
                titulo="% falhas"
                valor={formatarPercentual(indicadores.percentualFalhas)}
                detalhe={`${indicadores.leituraComFalha + indicadores.insatisfatoria + indicadores.falhasEquipamento} falha(s)`}
                destaque="text-amber-300"
              />
              <IndicadorScanner
                titulo="Disponibilidade do scanner"
                valor={formatarPercentual(indicadores.disponibilidade)}
                detalhe={`${formatarMinutos(indicadores.indisponibilidadeMinutos)} indisponível`}
                destaque="text-emerald-300"
              />
              <IndicadorScanner
                titulo="Tempo médio de recuperação"
                valor={formatarMinutos(indicadores.tempoMedioRecuperacao)}
                detalhe={`${indicadores.indisponibilidades} evento(s) de indisponibilidade`}
                destaque="text-blue-300"
              />
              <IndicadorScanner
                titulo="Efetividade das inspeções"
                valor={formatarPercentual(indicadores.efetividadeInspecoes)}
                detalhe={`${indicadores.aberturasSuspeita} abertura(s) / ${indicadores.areaSuspeita} suspeita(s)`}
                destaque="text-purple-300"
              />
              <IndicadorScanner
                titulo="Reprocessamentos"
                valor={indicadores.reprocessamentos}
                detalhe="Repassagens por falha ou imagem insatisfatória"
                destaque="text-rose-300"
              />
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
              <div className="mb-4 flex items-center gap-2 text-sm font-bold text-slate-200">
                <Activity size={18} className="text-blue-300" />
                Distribuição das leituras
              </div>
              <div className="space-y-3">
                {barras.map((item) => (
                  <div
                    key={item.titulo}
                    className="grid grid-cols-[150px_1fr_64px] items-center gap-3 text-sm"
                  >
                    <span className="text-slate-300">{item.titulo}</span>
                    <div className="h-3 overflow-hidden rounded-full bg-slate-800">
                      <div
                        className={`h-full rounded-full ${item.cor}`}
                        style={{
                          width: `${Math.max(4, (item.valor / maiorBarra) * 100)}%`,
                        }}
                      />
                    </div>
                    <span className="text-right font-bold text-white">
                      {item.valor}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
              <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 text-sm font-bold text-slate-200">
                    <CalendarDays size={18} className="text-blue-300" />
                    Análise temporal
                  </div>
                  <p className="mt-1 text-sm text-slate-400">
                    Use intervalo de datas, mês e ano para encontrar quando as
                    falhas acontecem com mais frequência.
                  </p>
                </div>

                {periodoComMaisFalhas && (
                  <div className="rounded-2xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm">
                    <div className="flex items-center gap-2 font-bold text-amber-200">
                      <TrendingUp size={16} />
                      Maior incidência
                    </div>
                    <p className="mt-1 text-slate-200">
                      {periodoComMaisFalhas.rotulo}:{" "}
                      <strong>
                        {periodoComMaisFalhas.leituraComFalha +
                          periodoComMaisFalhas.insatisfatoria +
                          periodoComMaisFalhas.falhasEquipamento}
                      </strong>{" "}
                      falha(s)
                    </p>
                  </div>
                )}
              </div>

              <div className="mb-5 grid grid-cols-1 gap-3 lg:grid-cols-5">
                <label className="space-y-2 text-sm font-bold text-slate-200">
                  Data inicial
                  <input
                    type="date"
                    value={filtroDataInicial}
                    onChange={(e) => setFiltroDataInicial(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 font-normal text-white outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20"
                  />
                </label>

                <label className="space-y-2 text-sm font-bold text-slate-200">
                  Data final
                  <input
                    type="date"
                    value={filtroDataFinal}
                    onChange={(e) => setFiltroDataFinal(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 font-normal text-white outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20"
                  />
                </label>

                <label className="space-y-2 text-sm font-bold text-slate-200">
                  Mês
                  <select
                    value={filtroMes}
                    onChange={(e) => setFiltroMes(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 font-normal text-white outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20"
                  >
                    <option value="">Todos</option>
                    {meses.map((mes) => (
                      <option key={mes.valor} value={mes.valor}>
                        {mes.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="space-y-2 text-sm font-bold text-slate-200">
                  Ano
                  <select
                    value={filtroAno}
                    onChange={(e) => setFiltroAno(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 font-normal text-white outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20"
                  >
                    <option value="">Todos</option>
                    {anosDisponiveis.map((ano) => (
                      <option key={ano} value={ano}>
                        {ano}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={() => {
                      setFiltroDataInicial("");
                      setFiltroDataFinal("");
                      setFiltroMes("");
                      setFiltroAno("");
                    }}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-700 px-3 py-2.5 text-sm font-bold text-slate-200 transition hover:bg-slate-800"
                  >
                    <Filter size={16} />
                    Limpar filtros
                  </button>
                </div>
              </div>

              <div className="mb-5 rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-3 text-sm text-slate-300">
                Agrupamento atual:{" "}
                <strong className="capitalize text-white">
                  {periodoTemporal === "dia"
                    ? "por dia"
                    : periodoTemporal === "mes"
                      ? "por mês"
                      : "por ano"}
                </strong>
                .
              </div>

              <div className="space-y-3">
                {serieTemporal.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-700 p-6 text-center text-sm text-slate-400">
                    Nenhum lançamento encontrado para o período selecionado.
                  </div>
                ) : (
                  serieTemporal.map((item) => {
                    const falhasEAlertas =
                      item.leituraComFalha + item.insatisfatoria + item.falhasEquipamento;
                    const larguraFalhas =
                      falhasEAlertas > 0
                        ? Math.max(4, (falhasEAlertas / maiorFalhaTemporal) * 100)
                        : 0;

                    return (
                      <div
                        key={item.chave}
                        className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <p className="text-sm font-bold capitalize text-white">
                              {item.rotulo}
                            </p>
                            <p className="text-xs text-slate-400">
                              {item.passagens} passagem(ns) | {item.total} leitura(s)
                            </p>
                          </div>
                          <span className="rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1 text-xs font-bold text-amber-200">
                            {falhasEAlertas} falha(s)
                          </span>
                        </div>

                        <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-800">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-amber-400 via-orange-400 to-rose-400"
                            style={{ width: `${larguraFalhas}%` }}
                          />
                        </div>

                        <div className="mt-4 grid grid-cols-2 gap-3 text-xs sm:grid-cols-4 xl:grid-cols-8">
                          <ResumoTemporal label="Falhas" valor={item.leituraComFalha} />
                          <ResumoTemporal
                            label="Satisfatórias"
                            valor={item.leituraSatisfatoria}
                          />
                          <ResumoTemporal label="Suspeitas" valor={item.areaSuspeita} />
                          <ResumoTemporal
                            label="Insatisfatórias"
                            valor={item.insatisfatoria}
                          />
                          <ResumoTemporal
                            label="Falhas equip."
                            valor={item.falhasEquipamento}
                          />
                          <ResumoTemporal
                            label="Reprocess."
                            valor={item.reprocessamentos}
                          />
                          <ResumoTemporal
                            label="Aberturas"
                            valor={item.aberturasSuspeita}
                          />
                          <ResumoTemporal label="Total" valor={item.total} destaque />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 shadow-2xl shadow-black/20">
        <div className="border-b border-slate-800 px-5 py-4">
          <h2 className="text-lg font-bold text-white">Lançamentos</h2>
          <p className="text-sm text-slate-400">
            Histórico de passagens registradas por scanner.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-800">
            <thead className="bg-slate-900/80">
              <tr>
                {[
                  "Data referência",
                  "Scanner",
                  "Leitura com falha",
                  "Leitura satisfatória",
                  "Insatisfatória",
                  "Falhas equipamento",
                  "Reprocessamentos",
                  "Imagens suspeitas",
                  "Inspeção",
                  "Aberturas",
                  "Total scanneado",
                  "Cadastrado por",
                  "Ações",
                ].map((item) => (
                  <th
                    key={item}
                    className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-400"
                  >
                    {item}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {carregando ? (
                <tr>
                  <td colSpan={13} className="px-4 py-8 text-center text-slate-400">
                    Carregando lançamentos...
                  </td>
                </tr>
              ) : registros.length === 0 ? (
                <tr>
                  <td colSpan={13} className="px-4 py-8 text-center text-slate-400">
                    Nenhum lançamento de scanner cadastrado.
                  </td>
                </tr>
              ) : (
                registros.map((registro) => (
                  <tr
                    key={registro.id}
                    className="bg-slate-950 transition hover:bg-slate-900/70"
                  >
                    <td className="px-4 py-4 text-sm text-slate-200">
                      {formatarDataReferencia(registro.data)}
                    </td>
                    <td className="px-4 py-4 text-sm font-bold text-white">
                      {registro.scanner}
                    </td>
                    <td className="px-4 py-4 text-sm text-amber-200">
                      {registro.leituraComFalha}
                    </td>
                    <td className="px-4 py-4 text-sm text-emerald-200">
                      {registro.leituraSatisfatoria}
                    </td>
                    <td className="px-4 py-4 text-sm text-rose-200">
                      {registro.insatisfatoria}
                    </td>
                    <td className="px-4 py-4 text-sm text-red-200">
                      {registro.falhasEquipamento}
                    </td>
                    <td className="px-4 py-4 text-sm text-blue-200">
                      {registro.reprocessamentos}
                    </td>
                    <td className="px-4 py-4 text-sm text-sky-200">
                      {registro.areaSuspeita}
                    </td>
                    <td className="px-4 py-4 text-sm text-violet-200">
                      {registro.containersInspecao}
                    </td>
                    <td className="px-4 py-4 text-sm text-amber-200">
                      {registro.aberturasSuspeita}
                    </td>
                    <td className="px-4 py-4 text-sm font-bold text-white">
                      {registro.total}
                    </td>
                    <td className="px-4 py-4 text-sm">
                      <p className="font-bold text-white">
                        {registro.criadoPor?.apelido ||
                          registro.criadoPor?.nome ||
                          "Não identificado"}
                      </p>
                      <p className="text-xs text-slate-400">
                        {formatarData(registro.createdAt)}
                      </p>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-wrap gap-2">
                        {podeEditar && (
                          <button
                            type="button"
                            onClick={() => abrirEdicao(registro)}
                            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-blue-500"
                          >
                            <Edit3 size={14} />
                            Editar
                          </button>
                        )}
                        {podeExcluir && (
                          <button
                            type="button"
                            onClick={() => excluirRegistro(registro)}
                            className="inline-flex items-center gap-2 rounded-lg border border-red-500/40 px-3 py-2 text-xs font-bold text-red-200 transition hover:bg-red-500/10"
                          >
                            <Trash2 size={14} />
                            Excluir
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {modalAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
          <form
            onSubmit={salvarRegistro}
            className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-3xl border border-slate-700 bg-slate-950 shadow-2xl"
          >
            <div className="flex items-start justify-between gap-4 border-b border-slate-800 bg-slate-900/80 p-5">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-600/15 text-blue-300 ring-1 ring-blue-400/20">
                  <ScanLine size={22} />
                </span>
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.24em] text-blue-300">
                    Scanner
                  </p>
                  <h2 className="text-xl font-bold text-white">
                    {editando ? "Editar lançamento" : "Novo lançamento"}
                  </h2>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalAberto(false)}
                className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-800 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4 p-5 md:grid-cols-2">
              <label className="space-y-2 text-sm font-bold text-slate-200">
                Data referência
                <input
                  type="date"
                  value={form.data}
                  onChange={(e) => atualizarCampo("data", e.target.value)}
                  required
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 font-normal text-white outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20"
                />
              </label>

              <label className="space-y-2 text-sm font-bold text-slate-200">
                Scanner
                <select
                  value={form.scanner}
                  onChange={(e) => atualizarCampo("scanner", e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 font-normal text-white outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20"
                >
                  <option value={scannerPadrao}>{scannerPadrao}</option>
                </select>
              </label>

              <CampoNumero
                label="Leitura com falha"
                value={form.leituraComFalha}
                onChange={(valor) => atualizarCampo("leituraComFalha", valor)}
              />
              <CampoNumero
                label="Leitura satisfatória"
                value={form.leituraSatisfatoria}
                onChange={(valor) => atualizarCampo("leituraSatisfatoria", valor)}
              />
              <CampoNumero
                label="Leitura insatisfatória"
                value={form.insatisfatoria}
                onChange={(valor) => atualizarCampo("insatisfatoria", valor)}
              />
              <CampoNumero
                label="Falhas no equipamento"
                value={form.falhasEquipamento}
                onChange={(valor) => atualizarCampo("falhasEquipamento", valor)}
              />
              <CampoNumero
                label="Quantidade de reprocessamento"
                detalhe={`sugerido: ${reprocessamentoSugerido}`}
                value={form.reprocessamentos}
                onChange={(valor) => atualizarCampo("reprocessamentos", valor)}
              />
              <CampoNumero
                label="Quantidade de imagens suspeitas"
                value={form.areaSuspeita}
                onChange={(valor) => atualizarCampo("areaSuspeita", valor)}
              />
              <CampoNumero
                label="Containers encaminhados para inspeção"
                value={form.containersInspecao}
                onChange={(valor) => atualizarCampo("containersInspecao", valor)}
              />
              <CampoNumero
                label="Aberturas realizadas por imagem suspeita"
                value={form.aberturasSuspeita}
                onChange={(valor) => atualizarCampo("aberturasSuspeita", valor)}
              />

              <label className="space-y-2 text-sm font-bold text-slate-200 md:col-span-2">
                Principais tipos de suspeita identificados
                <textarea
                  value={form.tiposSuspeita}
                  onChange={(e) => atualizarCampo("tiposSuspeita", e.target.value)}
                  className="min-h-24 w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 font-normal text-white outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20"
                />
              </label>

              <label className="flex items-center gap-3 rounded-2xl border border-slate-700 bg-slate-900/70 p-4 text-sm font-bold text-slate-200 md:col-span-2">
                <input
                  type="checkbox"
                  checked={form.registrarIndisponibilidade}
                  onChange={(e) => atualizarFlagIndisponibilidade(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-600 bg-slate-950 text-blue-600 focus:ring-blue-500"
                />
                Tempo de indisponibilidade
              </label>

              {form.registrarIndisponibilidade && (
                <>
                  <label className="space-y-2 text-sm font-bold text-slate-200">
                    Início da indisponibilidade
                    <input
                      type="datetime-local"
                      value={form.indisponibilidadeInicio}
                      onChange={(e) =>
                        atualizarCampo("indisponibilidadeInicio", e.target.value)
                      }
                      required
                      className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 font-normal text-white outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20"
                    />
                  </label>
                  <label className="space-y-2 text-sm font-bold text-slate-200">
                    Fim da indisponibilidade
                    <input
                      type="datetime-local"
                      value={form.indisponibilidadeFim}
                      min={form.indisponibilidadeInicio || undefined}
                      onChange={(e) =>
                        atualizarCampo("indisponibilidadeFim", e.target.value)
                      }
                      required
                      className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 font-normal text-white outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20"
                    />
                  </label>
                </>
              )}

              <label className="space-y-2 text-sm font-bold text-slate-200 md:col-span-2">
                Ações de contingência
                <textarea
                  value={form.acoesContingencia}
                  onChange={(e) => atualizarCampo("acoesContingencia", e.target.value)}
                  className="min-h-24 w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 font-normal text-white outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20"
                />
              </label>

              <div className="rounded-2xl border border-blue-500/30 bg-blue-500/10 p-4 md:col-span-2">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-200">
                  Total de containers scanneados
                </p>
                <p className="mt-1 text-3xl font-bold text-white">
                  {totalFormulario}
                </p>
              </div>
            </div>

            <div className="flex flex-col-reverse gap-3 border-t border-slate-800 p-5 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setModalAberto(false)}
                className="rounded-xl border border-slate-700 px-5 py-3 text-sm font-bold text-slate-200 transition hover:bg-slate-900"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={salvando}
                className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {salvando ? "Salvando..." : "Salvar"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

function IndicadorScanner({
  titulo,
  valor,
  detalhe,
  destaque,
}: {
  titulo: string;
  valor: number | string;
  detalhe: string;
  destaque: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
        {titulo}
      </p>
      <p className={`mt-2 text-3xl font-black ${destaque}`}>{valor}</p>
      <p className="mt-1 text-xs text-slate-400">{detalhe}</p>
    </div>
  );
}

function ResumoTemporal({
  label,
  valor,
  destaque = false,
}: {
  label: string;
  valor: number;
  destaque?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border px-3 py-2 ${
        destaque
          ? "border-blue-400/30 bg-blue-500/10"
          : "border-slate-800 bg-slate-900/70"
      }`}
    >
      <p className="text-slate-400">{label}</p>
      <p className="mt-1 text-lg font-black text-white">{valor}</p>
    </div>
  );
}

function CampoNumero({
  label,
  detalhe,
  value,
  onChange,
}: {
  label: string;
  detalhe?: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="space-y-2 text-sm font-bold text-slate-200">
      <span className="flex flex-wrap items-center justify-between gap-2">
        <span>{label}</span>
        {detalhe && (
          <span className="rounded-full border border-blue-400/30 bg-blue-500/10 px-2 py-0.5 text-[11px] font-black text-blue-200">
            {detalhe}
          </span>
        )}
      </span>
      <input
        type="number"
        min="0"
        step="1"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 font-normal text-white outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20"
      />
    </label>
  );
}
