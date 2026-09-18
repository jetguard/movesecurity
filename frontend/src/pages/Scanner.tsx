import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Activity,
  ArrowLeft,
  BarChart3,
  CalendarDays,
  ChevronDown,
  Clock,
  Edit3,
  Filter,
  Hash,
  Plus,
  ScanLine,
  TrendingUp,
  Trash2,
  UserCheck,
  Users,
  X,
} from "lucide-react";
import { api } from "../services/api";
import { podeNoModulo, usuarioValidadorOperacional } from "../utils/permissoes";
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
  quantidadeIndisponibilidades?: number;
  indisponibilidadesJson?: string | null;
  acoesContingencia?: string | null;
  total: number;
  createdAt: string;
  statusValidacao?: string;
  validadoEm?: string | null;
  criadoPor?: {
    nome: string;
    apelido?: string | null;
    email: string;
  } | null;
  validadoPor?: {
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
  quantidadeIndisponibilidades: string;
  indisponibilidades: Array<{ inicio: string; fim: string }>;
  acoesContingencia: string;
};

type AbaScanner = "passagens" | "equipe";

type EquipeScannerRegistro = {
  id: number;
  modulo: string;
  dataReferencia: string;
  dadosJson: string;
  createdAt: string;
  statusValidacao?: string;
  validadoEm?: string | null;
  criadoPor?: {
    nome: string;
    apelido?: string | null;
    email?: string | null;
  } | null;
  validadoPor?: {
    nome: string;
    apelido?: string | null;
    email?: string | null;
  } | null;
};

type EquipeScannerForm = {
  dataReferencia: string;
  efetivoPrevisto: string;
  efetivoPresente: string;
  faltas: string;
  mencionarAtraso: boolean;
  atrasoInicio: string;
  atrasoFim: string;
  atrasoMinutos: string;
  colaboradorAtraso: string;
  observacoes: string;
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

function numeroParaInput(valor: unknown) {
  const numeroValor = Number(valor || 0);
  return numeroValor === 0 || !Number.isFinite(numeroValor) ? "" : String(valor);
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

function formatarHoraSimples(valor?: string | null) {
  if (!valor) return "";
  return valor;
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

function dentroDosFiltrosTemporais(
  data: string,
  filtroDataInicial: string,
  filtroDataFinal: string,
  filtroMes: string,
  filtroAno: string,
) {
  const dataRegistro = chaveData(data);
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
  if (filtroMes && chaveMes(data).slice(5, 7) !== filtroMes) return false;
  if (filtroAno && chaveAno(data) !== filtroAno) return false;
  return true;
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
    leituraComFalha: "",
    leituraSatisfatoria: "",
    areaSuspeita: "",
    insatisfatoria: "",
    falhasEquipamento: "",
    reprocessamentos: "",
    containersInspecao: "",
    aberturasSuspeita: "",
    tiposSuspeita: "",
    registrarIndisponibilidade: false,
    quantidadeIndisponibilidades: "",
    indisponibilidades: [],
    acoesContingencia: "",
  };
}

function equipeFormVazio(): EquipeScannerForm {
  return {
    dataReferencia: dataInput(),
    efetivoPrevisto: "",
    efetivoPresente: "",
    faltas: "",
    mencionarAtraso: false,
    atrasoInicio: "",
    atrasoFim: "",
    atrasoMinutos: "",
    colaboradorAtraso: "",
    observacoes: "",
  };
}

function scannerSemPreenchimento(form: ScannerForm) {
  return (
    numero(form.leituraComFalha) === 0 &&
    numero(form.leituraSatisfatoria) === 0 &&
    numero(form.areaSuspeita) === 0 &&
    numero(form.insatisfatoria) === 0 &&
    numero(form.falhasEquipamento) === 0 &&
    numero(form.reprocessamentos) === 0 &&
    numero(form.containersInspecao) === 0 &&
    numero(form.aberturasSuspeita) === 0 &&
    !form.tiposSuspeita.trim() &&
    !form.acoesContingencia.trim() &&
    !form.registrarIndisponibilidade
  );
}

function equipeSemPreenchimento(form: EquipeScannerForm) {
  return (
    numero(form.efetivoPrevisto) === 0 &&
    numero(form.efetivoPresente) === 0 &&
    numero(form.faltas) === 0 &&
    !form.mencionarAtraso &&
    !form.observacoes.trim()
  );
}

function dadosEquipe(registro: EquipeScannerRegistro) {
  try {
    return JSON.parse(registro.dadosJson || "{}") as Partial<EquipeScannerForm>;
  } catch {
    return {};
  }
}

function intervalosIndisponibilidade(registro: ScannerPassagem) {
  try {
    const intervalos = JSON.parse(registro.indisponibilidadesJson || "[]");
    if (Array.isArray(intervalos) && intervalos.length) {
      return intervalos.map((item) => ({
        inicio: String(item.inicio || "").slice(0, 16),
        fim: String(item.fim || "").slice(0, 16),
      }));
    }
  } catch {
    // Mantém compatibilidade com lançamentos anteriores.
  }
  return registro.indisponibilidadeInicio && registro.indisponibilidadeFim
    ? [{
        inicio: registro.indisponibilidadeInicio.slice(0, 16),
        fim: registro.indisponibilidadeFim.slice(0, 16),
      }]
    : [];
}

function minutosEntreHoras(inicio: string, fim: string) {
  if (!inicio || !fim) return 0;
  const [horaInicio, minutoInicio] = inicio.split(":").map(Number);
  const [horaFim, minutoFim] = fim.split(":").map(Number);
  if (
    !Number.isFinite(horaInicio) ||
    !Number.isFinite(minutoInicio) ||
    !Number.isFinite(horaFim) ||
    !Number.isFinite(minutoFim)
  ) {
    return 0;
  }
  const inicioMinutos = horaInicio * 60 + minutoInicio;
  const fimMinutos = horaFim * 60 + minutoFim;
  return Math.max(0, fimMinutos - inicioMinutos);
}

export default function Scanner() {
  const navigate = useNavigate();
  const [abaAtiva, setAbaAtiva] = useState<AbaScanner>("passagens");
  const [registros, setRegistros] = useState<ScannerPassagem[]>([]);
  const [equipeRegistros, setEquipeRegistros] = useState<EquipeScannerRegistro[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [carregandoEquipe, setCarregandoEquipe] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [salvandoEquipe, setSalvandoEquipe] = useState(false);
  const [modalAberto, setModalAberto] = useState(false);
  const [modalEquipeAberto, setModalEquipeAberto] = useState(false);
  const [editando, setEditando] = useState<ScannerPassagem | null>(null);
  const [editandoEquipe, setEditandoEquipe] = useState<EquipeScannerRegistro | null>(null);
  const [validacaoScanner, setValidacaoScanner] = useState<ScannerPassagem | null>(null);
  const [validacaoEquipe, setValidacaoEquipe] = useState<EquipeScannerRegistro | null>(null);
  const [validando, setValidando] = useState(false);
  const [confirmarEnvioVazio, setConfirmarEnvioVazio] = useState<
    "scanner" | "equipe" | null
  >(null);
  const [indicadoresAbertos, setIndicadoresAbertos] = useState(true);
  const [indicadoresEquipeAbertos, setIndicadoresEquipeAbertos] = useState(false);
  const [filtroDataInicial, setFiltroDataInicial] = useState("");
  const [filtroDataFinal, setFiltroDataFinal] = useState("");
  const [filtroMes, setFiltroMes] = useState("");
  const [filtroAno, setFiltroAno] = useState("");
  const [equipeFiltroDataInicial, setEquipeFiltroDataInicial] = useState("");
  const [equipeFiltroDataFinal, setEquipeFiltroDataFinal] = useState("");
  const [equipeFiltroMes, setEquipeFiltroMes] = useState("");
  const [equipeFiltroAno, setEquipeFiltroAno] = useState("");
  const [form, setForm] = useState<ScannerForm>(formVazio());
  const [equipeForm, setEquipeForm] = useState<EquipeScannerForm>(equipeFormVazio());

  const validadorOperacional = usuarioValidadorOperacional();
  const podeLerScanner =
    podeNoModulo("operacao_scanner", "leitura") || podeNoModulo("operacao", "leitura");
  const podeCriar =
    podeNoModulo("operacao_scanner", "criar") ||
    podeNoModulo("operacao", "criar") ||
    (validadorOperacional && podeLerScanner);
  const podeEditar =
    podeNoModulo("operacao_scanner", "editar") ||
    podeNoModulo("operacao", "editar") ||
    (validadorOperacional && podeLerScanner);
  const podeExcluir =
    podeNoModulo("operacao_scanner", "excluir") || podeNoModulo("operacao", "excluir");
  const podeVerIndicadoresScanner =
    podeNoModulo("operacao_scanner", "indicadores") ||
    podeNoModulo("operacao", "indicadores");
  const podeVerEquipe =
    podeNoModulo("operacao_equipe_scanner", "leitura") || podeNoModulo("operacao", "leitura");
  const podeCriarEquipe =
    podeNoModulo("operacao_equipe_scanner", "criar") ||
    podeNoModulo("operacao", "criar") ||
    (validadorOperacional && podeVerEquipe);
  const podeEditarEquipe =
    podeNoModulo("operacao_equipe_scanner", "editar") ||
    podeNoModulo("operacao", "editar") ||
    (validadorOperacional && podeVerEquipe);
  const podeExcluirEquipe =
    podeNoModulo("operacao_equipe_scanner", "excluir") || podeNoModulo("operacao", "excluir");
  const podeVerIndicadoresEquipe =
    podeNoModulo("operacao_equipe_scanner", "indicadores") ||
    podeNoModulo("operacao", "indicadores");

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

  const atrasoEquipeMinutos = useMemo(
    () =>
      equipeForm.mencionarAtraso
        ? minutosEntreHoras(equipeForm.atrasoInicio, equipeForm.atrasoFim)
        : 0,
    [equipeForm.atrasoFim, equipeForm.atrasoInicio, equipeForm.mencionarAtraso],
  );

  const statusScannerEfetivo = (
    registro: Pick<ScannerPassagem | EquipeScannerRegistro, "statusValidacao" | "validadoPor" | "validadoEm">,
  ) =>
    registro.statusValidacao === "Validado" &&
    (registro.validadoPor || registro.validadoEm)
      ? "Validado"
      : "Pendente";

  const registroEstaValidado = (
    registro: Pick<ScannerPassagem | EquipeScannerRegistro, "statusValidacao" | "validadoPor" | "validadoEm">,
  ) => statusScannerEfetivo(registro) === "Validado";

  const registrosFiltrados = useMemo(
    () =>
      registros.filter((registro) =>
        dentroDosFiltrosTemporais(
          registro.data,
          filtroDataInicial,
          filtroDataFinal,
          filtroMes,
          filtroAno,
        ),
      ),
    [filtroAno, filtroDataFinal, filtroDataInicial, filtroMes, registros],
  );

  const registrosFiltradosValidados = useMemo(
    () =>
      registrosFiltrados.filter((registro) =>
        registroEstaValidado(registro),
      ),
    [registrosFiltrados],
  );

  const equipeRegistrosFiltrados = useMemo(
    () =>
      equipeRegistros.filter((registro) =>
        dentroDosFiltrosTemporais(
          registro.dataReferencia,
          equipeFiltroDataInicial,
          equipeFiltroDataFinal,
          equipeFiltroMes,
          equipeFiltroAno,
        ),
      ),
    [
      equipeFiltroAno,
      equipeFiltroDataFinal,
      equipeFiltroDataInicial,
      equipeFiltroMes,
      equipeRegistros,
    ],
  );

  const equipeRegistrosFiltradosValidados = useMemo(
    () =>
      equipeRegistrosFiltrados.filter((registro) =>
        registroEstaValidado(registro),
      ),
    [equipeRegistrosFiltrados],
  );

  const indicadoresEquipe = useMemo(() => {
    const base = equipeRegistrosFiltradosValidados.reduce(
      (acc, registro) => {
        const item = dadosEquipe(registro);
        acc.efetivoPrevisto += numero(item.efetivoPrevisto || 0);
        acc.efetivoPresente += numero(item.efetivoPresente || 0);
        acc.faltas += numero(item.faltas || 0);
        acc.atrasoMinutos += numero(item.atrasoMinutos || 0);
        acc.registros += 1;
        return acc;
      },
      { efetivoPrevisto: 0, efetivoPresente: 0, faltas: 0, atrasoMinutos: 0, registros: 0 },
    );
    return {
      ...base,
      cobertura:
        base.efetivoPrevisto > 0
          ? (base.efetivoPresente / base.efetivoPrevisto) * 100
          : 0,
      absenteismo:
        base.efetivoPrevisto > 0 ? (base.faltas / base.efetivoPrevisto) * 100 : 0,
    };
  }, [equipeRegistrosFiltradosValidados]);

  const indicadores = useMemo(() => {
    const base = registrosFiltradosValidados.reduce(
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
      new Set(registrosFiltradosValidados.map((registro) => chaveData(registro.data))).size,
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
  }, [registrosFiltradosValidados]);

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

  const anosEquipeDisponiveis = useMemo(() => {
    const anos = equipeRegistros
      .map((registro) => chaveAno(registro.dataReferencia))
      .filter(Boolean);
    return Array.from(new Set(anos)).sort((a, b) => b.localeCompare(a));
  }, [equipeRegistros]);

  const registrosTemporais = registrosFiltrados;

  const periodoTemporal = useMemo<PeriodoTemporal>(() => {
    if (filtroDataInicial || filtroDataFinal) return "dia";
    if (filtroMes && filtroAno) return "dia";
    if (filtroAno) return "mes";
    return "ano";
  }, [filtroAno, filtroDataFinal, filtroDataInicial, filtroMes]);

  const periodoEquipeTemporal = useMemo<PeriodoTemporal>(() => {
    if (equipeFiltroDataInicial || equipeFiltroDataFinal) return "dia";
    if (equipeFiltroMes && equipeFiltroAno) return "dia";
    if (equipeFiltroAno) return "mes";
    return "ano";
  }, [
    equipeFiltroAno,
    equipeFiltroDataFinal,
    equipeFiltroDataInicial,
    equipeFiltroMes,
  ]);

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

  const serieEquipeTemporal = useMemo(() => {
    const mapa = new Map<
      string,
      {
        chave: string;
        rotulo: string;
        ordem: number;
        lancamentos: number;
        efetivoPrevisto: number;
        efetivoPresente: number;
        faltas: number;
        atrasoMinutos: number;
      }
    >();

    equipeRegistrosFiltrados.forEach((registro) => {
      const chave =
        periodoEquipeTemporal === "ano"
          ? chaveAno(registro.dataReferencia)
          : periodoEquipeTemporal === "mes"
            ? chaveMes(registro.dataReferencia)
            : chaveData(registro.dataReferencia);
      const valores = dadosEquipe(registro);
      const atual =
        mapa.get(chave) ||
        {
          chave,
          rotulo: rotuloPeriodo(registro.dataReferencia, periodoEquipeTemporal),
          ordem: new Date(registro.dataReferencia).getTime(),
          lancamentos: 0,
          efetivoPrevisto: 0,
          efetivoPresente: 0,
          faltas: 0,
          atrasoMinutos: 0,
        };

      atual.lancamentos += 1;
      atual.efetivoPrevisto += numero(valores.efetivoPrevisto || 0);
      atual.efetivoPresente += numero(valores.efetivoPresente || 0);
      atual.faltas += numero(valores.faltas || 0);
      atual.atrasoMinutos += numero(valores.atrasoMinutos || 0);
      mapa.set(chave, atual);
    });

    return Array.from(mapa.values()).sort((a, b) => a.ordem - b.ordem);
  }, [equipeRegistrosFiltrados, periodoEquipeTemporal]);

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

  async function carregarEquipeRegistros() {
    if (!podeVerEquipe) return;
    setCarregandoEquipe(true);
    try {
      const response = await api.get("/operacao/indicadores/operacao_equipe_scanner");
      setEquipeRegistros(response.data || []);
    } finally {
      setCarregandoEquipe(false);
    }
  }

  useEffect(() => {
    carregarRegistros();
  }, []);

  useEffect(() => {
    if (podeVerEquipe) carregarEquipeRegistros();
  }, [podeVerEquipe]);

  function abrirNovo() {
    setEditando(null);
    setForm(formVazio());
    setModalAberto(true);
  }

  function abrirNovaEquipe() {
    setEditandoEquipe(null);
    setEquipeForm(equipeFormVazio());
    setModalEquipeAberto(true);
  }

  function abrirEdicao(registro: ScannerPassagem) {
    const indisponibilidades = intervalosIndisponibilidade(registro);
    setEditando(registro);
    setForm({
      data: dataInput(registro.data),
      scanner: registro.scanner || scannerPadrao,
      leituraComFalha: numeroParaInput(registro.leituraComFalha),
      leituraSatisfatoria: numeroParaInput(registro.leituraSatisfatoria),
      areaSuspeita: numeroParaInput(registro.areaSuspeita),
      insatisfatoria: numeroParaInput(registro.insatisfatoria),
      falhasEquipamento: numeroParaInput(registro.falhasEquipamento),
      reprocessamentos: numeroParaInput(registro.reprocessamentos),
      containersInspecao: numeroParaInput(registro.containersInspecao),
      aberturasSuspeita: numeroParaInput(registro.aberturasSuspeita),
      tiposSuspeita: registro.tiposSuspeita || "",
      registrarIndisponibilidade: indisponibilidades.length > 0,
      quantidadeIndisponibilidades: indisponibilidades.length
        ? String(indisponibilidades.length)
        : "",
      indisponibilidades,
      acoesContingencia: registro.acoesContingencia || "",
    });
    setModalAberto(true);
  }

  function abrirEdicaoEquipe(registro: EquipeScannerRegistro) {
    const dados = dadosEquipe(registro);
    const efetivoPrevisto = numero(dados.efetivoPrevisto || 0);
    const efetivoPresente = numero(dados.efetivoPresente || 0);
    setEditandoEquipe(registro);
    setEquipeForm({
      dataReferencia: dataInput(registro.dataReferencia),
      efetivoPrevisto: numeroParaInput(efetivoPrevisto),
      efetivoPresente: numeroParaInput(efetivoPresente),
      faltas: String(Math.max(0, efetivoPrevisto - efetivoPresente)),
      mencionarAtraso: Boolean(dados.mencionarAtraso),
      atrasoInicio: String(dados.atrasoInicio || ""),
      atrasoFim: String(dados.atrasoFim || ""),
      atrasoMinutos: numeroParaInput(dados.atrasoMinutos),
      colaboradorAtraso: String(dados.colaboradorAtraso || ""),
      observacoes: String(dados.observacoes || ""),
    });
    setModalEquipeAberto(true);
  }

  function atualizarCampo(campo: keyof ScannerForm, valor: string) {
    setForm((atual) => ({
      ...atual,
      [campo]:
        campo === "scanner" ||
        campo === "data" ||
        campo === "tiposSuspeita" ||
        campo === "acoesContingencia"
          ? valor
          : valor.replace(/\D/g, ""),
    }));
  }

  function atualizarFlagIndisponibilidade(valor: boolean) {
    setForm((atual) => ({
      ...atual,
      registrarIndisponibilidade: valor,
      quantidadeIndisponibilidades: valor ? atual.quantidadeIndisponibilidades : "",
      indisponibilidades: valor ? atual.indisponibilidades : [],
    }));
  }

  function atualizarQuantidadeIndisponibilidades(valor: string) {
    const quantidade = Math.max(0, numero(valor));
    setForm((atual) => ({
      ...atual,
      quantidadeIndisponibilidades: valor.replace(/\D/g, ""),
      indisponibilidades: Array.from({ length: quantidade }, (_, indice) =>
        atual.indisponibilidades[indice] || { inicio: "", fim: "" },
      ),
    }));
  }

  function atualizarIndisponibilidade(
    indice: number,
    campo: "inicio" | "fim",
    valor: string,
  ) {
    setForm((atual) => ({
      ...atual,
      indisponibilidades: atual.indisponibilidades.map((item, itemIndice) =>
        itemIndice === indice ? { ...item, [campo]: valor } : item,
      ),
    }));
  }

  function atualizarEquipeCampo(campo: keyof EquipeScannerForm, valor: string) {
    setEquipeForm((atual) => ({
      ...atual,
      [campo]:
        campo === "dataReferencia" ||
        campo === "atrasoInicio" ||
        campo === "atrasoFim" ||
        campo === "observacoes" || campo === "colaboradorAtraso"
          ? valor
          : valor.replace(/\D/g, ""),
      ...(campo === "efetivoPrevisto" || campo === "efetivoPresente"
        ? {
            faltas: String(
              Math.max(
                0,
                numero(campo === "efetivoPrevisto" ? valor : atual.efetivoPrevisto) -
                  numero(campo === "efetivoPresente" ? valor : atual.efetivoPresente),
              ),
            ),
          }
        : {}),
    }));
  }

  function atualizarFlagAtraso(valor: boolean) {
    setEquipeForm((atual) => ({
      ...atual,
      mencionarAtraso: valor,
      atrasoInicio: valor ? atual.atrasoInicio : "",
      atrasoFim: valor ? atual.atrasoFim : "",
      atrasoMinutos: valor ? atual.atrasoMinutos : "",
      colaboradorAtraso: valor ? atual.colaboradorAtraso : "",
    }));
  }

  async function enviarRegistroScanner() {
    setSalvando(true);
    setConfirmarEnvioVazio(null);
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
        indisponibilidades: form.registrarIndisponibilidade
          ? form.indisponibilidades
          : [],
        acoesContingencia: form.acoesContingencia,
      };

      if (editando) {
        await api.put(`/operacao/scanner/${editando.id}`, payload);
      } else {
        await api.post("/operacao/scanner", payload);
      }

      setModalAberto(false);
      await carregarRegistros();
      navigate("/controle-operacional");
    } finally {
      setSalvando(false);
    }
  }

  async function salvarRegistro(event: React.FormEvent) {
    event.preventDefault();
    if (scannerSemPreenchimento(form)) {
      setConfirmarEnvioVazio("scanner");
      return;
    }
    await enviarRegistroScanner();
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

  async function validarRegistroScanner(registro: ScannerPassagem) {
    setValidando(true);
    try {
      const response = await api.post(`/operacao/scanner/${registro.id}/validar`);
      setRegistros((lista) =>
        lista.map((item) => (item.id === registro.id ? response.data : item)),
      );
      setValidacaoScanner(response.data);
    } finally {
      setValidando(false);
    }
  }

  async function enviarRegistroEquipe() {
    setSalvandoEquipe(true);
    setConfirmarEnvioVazio(null);
    try {
      const atrasoMinutos = equipeForm.mencionarAtraso
        ? minutosEntreHoras(equipeForm.atrasoInicio, equipeForm.atrasoFim)
        : 0;
      const payload = {
        dataReferencia: `${equipeForm.dataReferencia}T00:00`,
        dados: {
          efetivoPrevisto: numero(equipeForm.efetivoPrevisto),
          efetivoPresente: numero(equipeForm.efetivoPresente),
          faltas: numero(equipeForm.faltas),
          mencionarAtraso: equipeForm.mencionarAtraso,
          atrasoInicio: equipeForm.mencionarAtraso ? equipeForm.atrasoInicio : "",
          atrasoFim: equipeForm.mencionarAtraso ? equipeForm.atrasoFim : "",
          atrasoMinutos,
          colaboradorAtraso: equipeForm.mencionarAtraso
            ? equipeForm.colaboradorAtraso
            : "",
          observacoes: equipeForm.observacoes,
        },
      };

      if (editandoEquipe) {
        await api.put(
          `/operacao/indicadores/operacao_equipe_scanner/${editandoEquipe.id}`,
          payload,
        );
      } else {
        await api.post("/operacao/indicadores/operacao_equipe_scanner", payload);
      }

      setModalEquipeAberto(false);
      await carregarEquipeRegistros();
      navigate("/controle-operacional");
    } finally {
      setSalvandoEquipe(false);
    }
  }

  async function salvarEquipeRegistro(event: React.FormEvent) {
    event.preventDefault();
    if (equipeSemPreenchimento(equipeForm)) {
      setConfirmarEnvioVazio("equipe");
      return;
    }
    await enviarRegistroEquipe();
  }

  async function excluirEquipeRegistro(registro: EquipeScannerRegistro) {
    const confirmar = window.confirm(
      `Deseja excluir o lançamento da equipe do scanner de ${formatarDataReferencia(
        registro.dataReferencia,
      )}?`,
    );
    if (!confirmar) return;

    const pinOperacional = await solicitarPinOperacional(
      "Informe seu PIN para confirmar a exclusão do lançamento da equipe do scanner.",
    );
    if (!pinOperacional) return;

    await api.delete(`/operacao/indicadores/operacao_equipe_scanner/${registro.id}`, {
      data: { pinOperacional },
    });
    await carregarEquipeRegistros();
  }

  async function validarEquipeRegistro(registro: EquipeScannerRegistro) {
    setValidando(true);
    try {
      const response = await api.post(
        `/operacao/indicadores/operacao_equipe_scanner/${registro.id}/validar`,
      );
      setEquipeRegistros((lista) =>
        lista.map((item) => (item.id === registro.id ? response.data : item)),
      );
      setValidacaoEquipe(response.data);
    } finally {
      setValidando(false);
    }
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

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate("/controle-operacional")}
            className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-slate-700 bg-slate-900 text-slate-100 shadow-lg transition hover:border-blue-400 hover:bg-slate-800"
            aria-label="Voltar ao Controle Operacional"
            title="Voltar ao Controle Operacional"
          >
            <ArrowLeft size={19} />
          </button>
          {abaAtiva === "passagens" && podeCriar && (
            <button
              type="button"
              onClick={abrirNovo}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-blue-950/30 transition hover:bg-blue-500"
            >
              <Plus size={18} />
              Novo lançamento
            </button>
          )}
          {abaAtiva === "equipe" && podeCriarEquipe && (
            <button
              type="button"
              onClick={abrirNovaEquipe}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-950/30 transition hover:bg-emerald-500"
            >
              <Plus size={18} />
              Novo lançamento
            </button>
          )}
        </div>
      </div>

      <div className={`grid gap-2 rounded-2xl border border-slate-800 bg-slate-950/70 p-2 ${podeVerEquipe ? "grid-cols-2" : "grid-cols-1"}`}>
        <button
          type="button"
          onClick={() => setAbaAtiva("passagens")}
          className={`inline-flex min-w-0 items-center justify-center gap-2 rounded-xl px-2 py-2.5 text-center text-xs font-bold transition sm:px-4 sm:text-sm ${
            abaAtiva === "passagens"
              ? "bg-blue-600 text-white shadow-lg shadow-blue-950/30"
              : "text-slate-300 hover:bg-slate-900 hover:text-white"
          }`}
        >
          <ScanLine size={17} />
          Passagem Scanner
        </button>
        {podeVerEquipe && (
          <button
            type="button"
            onClick={() => setAbaAtiva("equipe")}
            className={`inline-flex min-w-0 items-center justify-center gap-2 rounded-xl px-2 py-2.5 text-center text-xs font-bold transition sm:px-4 sm:text-sm ${
              abaAtiva === "equipe"
                ? "bg-emerald-600 text-white shadow-lg shadow-emerald-950/30"
                : "text-slate-300 hover:bg-slate-900 hover:text-white"
            }`}
          >
            <Users size={17} />
            Equipe do Scanner
          </button>
        )}
      </div>

      {abaAtiva === "passagens" && (
        <>
      {podeVerIndicadoresScanner && (
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
                detalhe={`${registrosFiltrados.length} lançamento(s) no filtro`}
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
      )}

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
                  "Validação",
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
                  <td colSpan={14} className="px-4 py-8 text-center text-slate-400">
                    Carregando lançamentos...
                  </td>
                </tr>
              ) : registros.length === 0 ? (
                <tr>
                  <td colSpan={14} className="px-4 py-8 text-center text-slate-400">
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
                    <td className="px-4 py-4 text-sm">
                      <span className={`inline-flex rounded-full px-3 py-1 text-xs font-black ${
                        registroEstaValidado(registro)
                          ? "bg-emerald-500/15 text-emerald-200 ring-1 ring-emerald-400/30"
                          : "bg-amber-500/15 text-amber-200 ring-1 ring-amber-400/30"
                      }`}>
                        {statusScannerEfetivo(registro)}
                      </span>
                      {registro.validadoPor && (
                        <p className="mt-1 text-xs text-slate-500">
                          {registro.validadoPor.apelido || registro.validadoPor.nome}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          title={
                            registroEstaValidado(registro)
                              ? "Ver validação"
                              : "Validar lançamento"
                          }
                          aria-label={
                            registroEstaValidado(registro)
                              ? "Ver validação"
                              : "Validar lançamento"
                          }
                          onClick={() => setValidacaoScanner(registro)}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-emerald-500/40 text-emerald-100 transition hover:bg-emerald-500/10"
                        >
                          <BarChart3 size={16} />
                        </button>
                        {podeEditar && (
                          <button
                            type="button"
                            title="Editar lançamento"
                            aria-label="Editar lançamento"
                            onClick={() => abrirEdicao(registro)}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-white transition hover:bg-blue-500"
                          >
                            <Edit3 size={16} />
                          </button>
                        )}
                        {podeExcluir && (
                          <button
                            type="button"
                            title="Excluir lançamento"
                            aria-label="Excluir lançamento"
                            onClick={() => excluirRegistro(registro)}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-red-500/40 text-red-200 transition hover:bg-red-500/10"
                          >
                            <Trash2 size={16} />
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

      {confirmarEnvioVazio && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/80 p-2 backdrop-blur-sm sm:p-4">
          <div className="w-[calc(100vw-1rem)] max-w-md rounded-2xl border border-amber-400/30 bg-slate-950 p-4 text-white shadow-2xl sm:w-full sm:rounded-[1.4rem] sm:p-5">
            <div className="flex items-start gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-200 ring-1 ring-amber-400/30">
                <Activity size={22} />
              </span>
              <div>
                <h3 className="text-lg font-black">
                  Existem informações que não foram preenchidas
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-300">
                  O formulário não recebeu dados operacionais. Deseja enviar
                  mesmo assim ou revisar o preenchimento?
                </p>
              </div>
            </div>
            <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setConfirmarEnvioVazio(null)}
                className="rounded-xl border border-slate-700 px-5 py-3 text-sm font-black text-slate-200 transition hover:bg-slate-800"
              >
                REVISAR
              </button>
              <button
                type="button"
                disabled={salvando || salvandoEquipe}
                onClick={() =>
                  confirmarEnvioVazio === "scanner"
                    ? enviarRegistroScanner()
                    : enviarRegistroEquipe()
                }
                className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-black text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {salvando || salvandoEquipe ? "ENVIANDO..." : "ENVIAR"}
              </button>
            </div>
          </div>
        </div>
      )}

      {validacaoScanner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-2 backdrop-blur-sm sm:p-4">
          <div className="max-h-[96dvh] w-[calc(100vw-1rem)] max-w-4xl overflow-y-auto rounded-2xl border border-slate-700 bg-slate-950 text-white shadow-2xl sm:w-full sm:rounded-[1.4rem]">
            <div className="flex items-start justify-between gap-4 border-b border-slate-800 bg-gradient-to-r from-blue-600/20 to-cyan-500/10 p-5 text-white">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg">
                  <ScanLine size={22} />
                </span>
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.22em] text-blue-300">
                    Validação Scanner
                  </p>
                  <h2 className="text-xl font-black">
                    {validacaoScanner.scanner} - {formatarDataReferencia(validacaoScanner.data)}
                  </h2>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setValidacaoScanner(null)}
                className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-800 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4 p-5">
              <div className="grid gap-3 md:grid-cols-3">
                <InfoScanner label="Status" value={statusScannerEfetivo(validacaoScanner)} />
                <InfoScanner
                  label="Cadastrado por"
                  value={validacaoScanner.criadoPor?.apelido || validacaoScanner.criadoPor?.nome || "Não identificado"}
                />
                <InfoScanner label="Data de cadastro" value={formatarData(validacaoScanner.createdAt)} />
                <InfoScanner
                  label="Validado por"
                  value={validacaoScanner.validadoPor?.apelido || validacaoScanner.validadoPor?.nome || "Aguardando validação"}
                />
                <InfoScanner
                  label="Data de validação"
                  value={validacaoScanner.validadoEm ? formatarData(validacaoScanner.validadoEm) : "Pendente"}
                />
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
                <h3 className="text-sm font-black uppercase tracking-[0.16em] text-blue-300">
                  Dados preenchidos
                </h3>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  {[
                    ["Leitura com falha", validacaoScanner.leituraComFalha],
                    ["Leitura satisfatória", validacaoScanner.leituraSatisfatoria],
                    ["Leitura insatisfatória", validacaoScanner.insatisfatoria],
                    ["Falhas no equipamento", validacaoScanner.falhasEquipamento],
                    ["Reprocessamentos", validacaoScanner.reprocessamentos],
                    ["Imagens suspeitas", validacaoScanner.areaSuspeita],
                    ["Containers para inspeção", validacaoScanner.containersInspecao],
                    ["Aberturas por suspeita", validacaoScanner.aberturasSuspeita],
                    ["Total scanneado", validacaoScanner.total],
                    ["Tipos de suspeita", validacaoScanner.tiposSuspeita || "-"],
                    ["Tempo indisponível", formatarMinutos(validacaoScanner.indisponibilidadeMinutos || 0)],
                    ["Ações de contingência", validacaoScanner.acoesContingencia || "-"],
                  ].map(([label, value]) => (
                    <InfoScanner key={String(label)} label={String(label)} value={String(value)} />
                  ))}
                </div>
              </div>
            </div>

            <div className="flex flex-col-reverse gap-3 border-t border-slate-800 bg-slate-900/60 p-5 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setValidacaoScanner(null)}
                className="rounded-xl border border-slate-700 px-5 py-3 text-sm font-black text-slate-200 transition hover:bg-slate-800"
              >
                Fechar
              </button>
              {!registroEstaValidado(validacaoScanner) && (
                <button
                  type="button"
                  disabled={validando}
                  onClick={() => validarRegistroScanner(validacaoScanner)}
                  className="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-black text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {validando ? "Validando..." : "Validar lançamento"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {modalAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-2 backdrop-blur-sm sm:p-4">
          <form
            onSubmit={salvarRegistro}
            className="max-h-[96dvh] w-[calc(100vw-1rem)] max-w-3xl overflow-y-auto rounded-2xl border border-slate-700 bg-slate-950 text-white shadow-2xl sm:w-full sm:rounded-[1.4rem]"
          >
            <div className="flex items-start justify-between gap-4 border-b border-slate-800 bg-gradient-to-r from-blue-600/20 to-cyan-500/10 p-5">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-950/30 ring-1 ring-blue-300/20">
                  <ScanLine size={22} />
                </span>
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.22em] text-blue-300">
                    Scanner
                  </p>
                  <h2 className="text-xl font-black text-white">
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

            <div className="grid grid-cols-1 gap-3 p-5 md:grid-cols-2">
              <CampoScannerInput
                icon={<CalendarDays size={16} />}
                label="Data referência"
                type="date"
                value={form.data}
                onChange={(valor) => atualizarCampo("data", valor)}
              />

              <label className="space-y-2 text-sm font-bold text-slate-200">
                <span className="inline-flex items-center gap-2">
                  <ScanLine size={16} className="text-blue-400" />
                  Scanner
                </span>
                <select
                  value={form.scanner}
                  onChange={(e) => atualizarCampo("scanner", e.target.value)}
                  className="h-11 w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 font-normal text-white outline-none transition [color-scheme:dark] focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10"
                >
                  <option value={scannerPadrao}>{scannerPadrao}</option>
                </select>
              </label>

              <CampoScannerInput
                icon={<AlertIcon />}
                label="Leitura com falha"
                type="number"
                value={form.leituraComFalha}
                onChange={(valor) => atualizarCampo("leituraComFalha", valor)}
              />
              <CampoScannerInput
                icon={<UserCheck size={16} />}
                label="Leitura satisfatória"
                type="number"
                value={form.leituraSatisfatoria}
                onChange={(valor) => atualizarCampo("leituraSatisfatoria", valor)}
              />
              <CampoScannerInput
                icon={<Activity size={16} />}
                label="Leitura insatisfatória"
                type="number"
                value={form.insatisfatoria}
                onChange={(valor) => atualizarCampo("insatisfatoria", valor)}
              />
              <CampoScannerInput
                icon={<AlertIcon />}
                label="Falhas no equipamento"
                type="number"
                value={form.falhasEquipamento}
                onChange={(valor) => atualizarCampo("falhasEquipamento", valor)}
              />
              <CampoScannerInput
                icon={<TrendingUp size={16} />}
                label="Quantidade de reprocessamento"
                type="number"
                detalhe={`sugerido: ${reprocessamentoSugerido}`}
                value={form.reprocessamentos}
                onChange={(valor) => atualizarCampo("reprocessamentos", valor)}
              />
              <CampoScannerInput
                icon={<ScanLine size={16} />}
                label="Quantidade de imagens suspeitas"
                type="number"
                value={form.areaSuspeita}
                onChange={(valor) => atualizarCampo("areaSuspeita", valor)}
              />
              <CampoScannerInput
                icon={<Filter size={16} />}
                label="Containers encaminhados para inspeção"
                type="number"
                value={form.containersInspecao}
                onChange={(valor) => atualizarCampo("containersInspecao", valor)}
              />
              <CampoScannerInput
                icon={<Activity size={16} />}
                label="Aberturas realizadas por imagem suspeita"
                type="number"
                value={form.aberturasSuspeita}
                onChange={(valor) => atualizarCampo("aberturasSuspeita", valor)}
              />

              <label className="space-y-2 text-sm font-bold text-slate-200 md:col-span-2">
                <span className="inline-flex items-center gap-2">
                  <Edit3 size={16} className="text-blue-400" />
                  Principais tipos de suspeita identificados
                </span>
                <textarea
                  value={form.tiposSuspeita}
                  onChange={(e) => atualizarCampo("tiposSuspeita", e.target.value)}
                  className="min-h-20 w-full resize-none rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 font-normal text-white outline-none transition placeholder:text-slate-500 focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10"
                />
              </label>

              <label className="flex items-center justify-between gap-3 rounded-2xl border border-slate-700 bg-slate-900/80 px-4 py-3 text-sm font-bold text-slate-200 md:col-span-2">
                <span className="inline-flex items-center gap-2">
                  <Clock size={16} className="text-amber-300" />
                  Tempo de indisponibilidade
                </span>
                <input
                  type="checkbox"
                  checked={form.registrarIndisponibilidade}
                  onChange={(e) => atualizarFlagIndisponibilidade(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
              </label>

              {form.registrarIndisponibilidade && (
                <div className="grid gap-3 rounded-2xl border border-amber-400/25 bg-amber-400/5 p-4 md:col-span-2 md:grid-cols-2">
                  <CampoScannerInput
                    icon={<Hash size={16} />}
                    label="Quantidade de indisponibilidades"
                    type="number"
                    min="1"
                    value={form.quantidadeIndisponibilidades}
                    onChange={atualizarQuantidadeIndisponibilidades}
                  />
                  <div className="hidden md:block" />
                  {form.indisponibilidades.map((intervalo, indice) => (
                    <div key={indice} className="grid gap-3 rounded-2xl border border-slate-700 bg-slate-950/70 p-3 md:col-span-2 md:grid-cols-2">
                      <p className="text-xs font-black uppercase tracking-[0.16em] text-amber-200 md:col-span-2">Indisponibilidade {indice + 1}</p>
                      <CampoScannerInput icon={<Clock size={16} />} label="Início" type="datetime-local" value={intervalo.inicio} onChange={(valor) => atualizarIndisponibilidade(indice, "inicio", valor)} />
                      <CampoScannerInput icon={<Clock size={16} />} label="Fim" type="datetime-local" value={intervalo.fim} min={intervalo.inicio || undefined} onChange={(valor) => atualizarIndisponibilidade(indice, "fim", valor)} />
                    </div>
                  ))}
                </div>
              )}

              <label className="space-y-2 text-sm font-bold text-slate-200 md:col-span-2">
                <span className="inline-flex items-center gap-2">
                  <Edit3 size={16} className="text-blue-400" />
                  Ações de contingência
                </span>
                <textarea
                  value={form.acoesContingencia}
                  onChange={(e) => atualizarCampo("acoesContingencia", e.target.value)}
                  className="min-h-20 w-full resize-none rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 font-normal text-white outline-none transition placeholder:text-slate-500 focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10"
                />
              </label>

              <div className="rounded-2xl border border-blue-500/30 bg-blue-500/10 p-4 md:col-span-2">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-200">
                  Total de containers scanneados
                </p>
                <p className="mt-1 text-3xl font-black text-white">
                  {totalFormulario}
                </p>
              </div>
            </div>

            <div className="flex flex-col-reverse gap-3 border-t border-slate-800 bg-slate-900/60 p-5 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setModalAberto(false)}
                className="rounded-xl border border-slate-700 px-5 py-3 text-sm font-black text-slate-200 transition hover:bg-slate-800"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={salvando}
                className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-black text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {salvando ? "Salvando..." : "Salvar"}
              </button>
            </div>
          </form>
        </div>
      )}
        </>
      )}

      {abaAtiva === "equipe" && podeVerEquipe && (
        <section className="overflow-hidden rounded-[1.4rem] border border-emerald-400/20 bg-slate-950 shadow-2xl shadow-black/20">
          <div className="border-b border-slate-800 bg-gradient-to-r from-emerald-500/12 to-blue-500/10 px-5 py-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-400/25">
                  <Users size={21} />
                </span>
                <div>
                  <h2 className="text-lg font-bold text-white">Equipe do Scanner</h2>
                  <p className="text-sm text-slate-400">
                    Efetivo, faltas e atrasos vinculados à operação diária.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-5 p-5">
            {podeVerIndicadoresEquipe && (
              <button
                type="button"
                onClick={() => setIndicadoresEquipeAbertos((aberto) => !aberto)}
                className="flex w-full items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-900/70 px-4 py-4 text-left"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-400/20">
                    <BarChart3 size={20} />
                  </span>
                  <div>
                    <h3 className="text-base font-bold text-white">
                      Indicadores e análise temporal
                    </h3>
                    <p className="text-sm text-slate-400">
                      Filtre por período para analisar efetivo, faltas e atrasos.
                    </p>
                  </div>
                </div>
                <ChevronDown
                  className={`text-slate-400 transition ${
                    indicadoresEquipeAbertos ? "rotate-180" : ""
                  }`}
                  size={20}
                />
              </button>
            )}

            {podeVerIndicadoresEquipe && indicadoresEquipeAbertos && (
              <div className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/45 p-4">
                <div className="grid grid-cols-1 gap-3 lg:grid-cols-5">
                  <FiltroData
                    label="Data inicial"
                    value={equipeFiltroDataInicial}
                    onChange={setEquipeFiltroDataInicial}
                  />
                  <FiltroData
                    label="Data final"
                    value={equipeFiltroDataFinal}
                    onChange={setEquipeFiltroDataFinal}
                  />
                  <FiltroSelect
                    label="Mês"
                    value={equipeFiltroMes}
                    onChange={setEquipeFiltroMes}
                    options={meses}
                    vazio="Todos"
                  />
                  <FiltroSelect
                    label="Ano"
                    value={equipeFiltroAno}
                    onChange={setEquipeFiltroAno}
                    options={anosEquipeDisponiveis.map((ano) => ({
                      valor: ano,
                      label: ano,
                    }))}
                    vazio="Todos"
                  />
                  <div className="flex items-end">
                    <button
                      type="button"
                      onClick={() => {
                        setEquipeFiltroDataInicial("");
                        setEquipeFiltroDataFinal("");
                        setEquipeFiltroMes("");
                        setEquipeFiltroAno("");
                      }}
                      className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-slate-700 px-3 text-sm font-bold text-slate-200 transition hover:bg-slate-800"
                    >
                      <Filter size={16} />
                      Limpar filtros
                    </button>
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-4">
              <IndicadorScanner
                titulo="Efetivo previsto"
                valor={indicadoresEquipe.efetivoPrevisto}
                    detalhe={`${indicadoresEquipe.registros} lançamento(s) no filtro`}
                destaque="text-white"
              />
              <IndicadorScanner
                titulo="Efetivo presente"
                valor={indicadoresEquipe.efetivoPresente}
                detalhe={`${formatarPercentual(indicadoresEquipe.cobertura)} de cobertura`}
                destaque="text-emerald-300"
              />
              <IndicadorScanner
                titulo="Faltas"
                valor={indicadoresEquipe.faltas}
                detalhe={`${formatarPercentual(indicadoresEquipe.absenteismo)} de absenteísmo`}
                destaque="text-rose-300"
              />
              <IndicadorScanner
                titulo="Tempo em atraso"
                valor={formatarMinutos(indicadoresEquipe.atrasoMinutos)}
                detalhe="Soma dos atrasos registrados"
                destaque="text-amber-300"
              />
            </div>

                <div className="space-y-3">
                  {serieEquipeTemporal.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-700 p-5 text-center text-sm text-slate-400">
                      Nenhum lançamento encontrado para o período selecionado.
                    </div>
                  ) : (
                    serieEquipeTemporal.map((item) => {
                      const cobertura =
                        item.efetivoPrevisto > 0
                          ? (item.efetivoPresente / item.efetivoPrevisto) * 100
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
                                {item.lancamentos} lançamento(s)
                              </p>
                            </div>
                            <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-xs font-bold text-emerald-200">
                              {formatarPercentual(cobertura)} cobertura
                            </span>
                          </div>

                          <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-800">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-blue-400"
                              style={{ width: `${Math.max(4, Math.min(100, cobertura))}%` }}
                            />
                          </div>

                          <div className="mt-4 grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
                            <ResumoTemporal label="Previsto" valor={item.efetivoPrevisto} />
                            <ResumoTemporal label="Presente" valor={item.efetivoPresente} />
                            <ResumoTemporal label="Faltas" valor={item.faltas} />
                            <ResumoTemporal
                              label="Atraso min."
                              valor={item.atrasoMinutos}
                              destaque
                            />
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            <div className="overflow-x-auto rounded-2xl border border-slate-800">
              <table className="min-w-full divide-y divide-slate-800">
                <thead className="bg-slate-900/80">
                  <tr>
                    {[
                      "Data referência",
                      "Efetivo previsto",
                      "Efetivo presente",
                      "Faltas",
                      "Atraso",
                      "Observações",
                      "Cadastrado por",
                      "Validação",
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
                  {carregandoEquipe ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-8 text-center text-slate-400">
                        Carregando lançamentos da equipe...
                      </td>
                    </tr>
                  ) : equipeRegistros.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-8 text-center text-slate-400">
                        Nenhum lançamento da equipe do scanner cadastrado.
                      </td>
                    </tr>
                  ) : (
                    equipeRegistros.map((registro) => {
                      const item = dadosEquipe(registro);
                      return (
                        <tr key={registro.id} className="bg-slate-950 transition hover:bg-slate-900/70">
                          <td className="px-4 py-4 text-sm text-slate-200">
                            {formatarDataReferencia(registro.dataReferencia)}
                          </td>
                          <td className="px-4 py-4 text-sm font-bold text-white">
                            {numero(item.efetivoPrevisto || 0)}
                          </td>
                          <td className="px-4 py-4 text-sm text-emerald-200">
                            {numero(item.efetivoPresente || 0)}
                          </td>
                          <td className="px-4 py-4 text-sm text-rose-200">
                            {numero(item.faltas || 0)}
                          </td>
                          <td className="px-4 py-4 text-sm text-amber-200">
                            {item.mencionarAtraso
                              ? `${formatarHoraSimples(String(item.atrasoInicio || ""))} a ${formatarHoraSimples(String(item.atrasoFim || ""))} (${formatarMinutos(numero(item.atrasoMinutos || 0))})`
                              : "Sem atraso"}
                          </td>
                          <td className="max-w-xs px-4 py-4 text-sm text-slate-300">
                            <span className="line-clamp-2">
                              {String(item.observacoes || "Sem observações")}
                            </span>
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
                          <td className="px-4 py-4 text-sm">
                            <span className={`inline-flex rounded-full px-3 py-1 text-xs font-black ${
                              registroEstaValidado(registro)
                                ? "bg-emerald-500/15 text-emerald-200 ring-1 ring-emerald-400/30"
                                : "bg-amber-500/15 text-amber-200 ring-1 ring-amber-400/30"
                            }`}>
                              {statusScannerEfetivo(registro)}
                            </span>
                            {registro.validadoPor && (
                              <p className="mt-1 text-xs text-slate-500">
                                {registro.validadoPor.apelido || registro.validadoPor.nome}
                              </p>
                            )}
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                title={
                                  registroEstaValidado(registro)
                                    ? "Ver validação"
                                    : "Validar lançamento"
                                }
                                aria-label={
                                  registroEstaValidado(registro)
                                    ? "Ver validação"
                                    : "Validar lançamento"
                                }
                                onClick={() => setValidacaoEquipe(registro)}
                                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-emerald-500/40 text-emerald-100 transition hover:bg-emerald-500/10"
                              >
                                <BarChart3 size={16} />
                              </button>
                              {podeEditarEquipe && (
                                <button
                                  type="button"
                                  title="Editar lançamento"
                                  aria-label="Editar lançamento"
                                  onClick={() => abrirEdicaoEquipe(registro)}
                                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-600 text-white transition hover:bg-emerald-500"
                                >
                                  <Edit3 size={16} />
                                </button>
                              )}
                              {podeExcluirEquipe && (
                                <button
                                  type="button"
                                  title="Excluir lançamento"
                                  aria-label="Excluir lançamento"
                                  onClick={() => excluirEquipeRegistro(registro)}
                                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-red-500/40 text-red-200 transition hover:bg-red-500/10"
                                >
                                  <Trash2 size={16} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {validacaoEquipe && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-2 backdrop-blur-sm sm:p-4">
          <div className="max-h-[96dvh] w-[calc(100vw-1rem)] max-w-4xl overflow-y-auto rounded-2xl border border-slate-700 bg-slate-950 text-white shadow-2xl sm:w-full sm:rounded-[1.4rem]">
            <div className="flex items-start justify-between gap-4 border-b border-slate-800 bg-gradient-to-r from-emerald-500/20 to-blue-500/10 p-5 text-white">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-lg">
                  <Users size={22} />
                </span>
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.22em] text-emerald-300">
                    Validação Equipe Scanner
                  </p>
                  <h2 className="text-xl font-black">
                    {formatarDataReferencia(validacaoEquipe.dataReferencia)}
                  </h2>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setValidacaoEquipe(null)}
                className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-800 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4 p-5">
              <div className="grid gap-3 md:grid-cols-3">
                <InfoScanner label="Status" value={statusScannerEfetivo(validacaoEquipe)} />
                <InfoScanner
                  label="Cadastrado por"
                  value={validacaoEquipe.criadoPor?.apelido || validacaoEquipe.criadoPor?.nome || "Não identificado"}
                />
                <InfoScanner label="Data de cadastro" value={formatarData(validacaoEquipe.createdAt)} />
                <InfoScanner
                  label="Validado por"
                  value={validacaoEquipe.validadoPor?.apelido || validacaoEquipe.validadoPor?.nome || "Aguardando validação"}
                />
                <InfoScanner
                  label="Data de validação"
                  value={validacaoEquipe.validadoEm ? formatarData(validacaoEquipe.validadoEm) : "Pendente"}
                />
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
                <h3 className="text-sm font-black uppercase tracking-[0.16em] text-emerald-300">
                  Dados preenchidos
                </h3>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  {(() => {
                    const item = dadosEquipe(validacaoEquipe);
                    return [
                      ["Efetivo previsto", numero(item.efetivoPrevisto || 0)],
                      ["Efetivo presente", numero(item.efetivoPresente || 0)],
                      ["Faltas", numero(item.faltas || 0)],
                      [
                        "Atraso",
                        item.mencionarAtraso
                          ? `${formatarHoraSimples(String(item.atrasoInicio || ""))} a ${formatarHoraSimples(String(item.atrasoFim || ""))} (${formatarMinutos(numero(item.atrasoMinutos || 0))})`
                          : "Sem atraso",
                      ],
                      ["Observações", String(item.observacoes || "-")],
                    ].map(([label, value]) => (
                      <InfoScanner key={String(label)} label={String(label)} value={String(value)} />
                    ));
                  })()}
                </div>
              </div>
            </div>

            <div className="flex flex-col-reverse gap-3 border-t border-slate-800 bg-slate-900/60 p-5 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setValidacaoEquipe(null)}
                className="rounded-xl border border-slate-700 px-5 py-3 text-sm font-black text-slate-200 transition hover:bg-slate-800"
              >
                Fechar
              </button>
              {!registroEstaValidado(validacaoEquipe) && (
                <button
                  type="button"
                  disabled={validando}
                  onClick={() => validarEquipeRegistro(validacaoEquipe)}
                  className="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-black text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {validando ? "Validando..." : "Validar lançamento"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {modalEquipeAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-2 backdrop-blur-sm sm:p-4">
          <form
            onSubmit={salvarEquipeRegistro}
            className="max-h-[96dvh] w-[calc(100vw-1rem)] max-w-2xl overflow-y-auto rounded-2xl border border-slate-700 bg-slate-950 text-white shadow-2xl sm:w-full sm:rounded-[1.4rem]"
          >
            <div className="flex items-start justify-between gap-4 border-b border-slate-800 bg-gradient-to-r from-emerald-500/20 to-blue-500/10 p-5">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-lg shadow-emerald-950/30 ring-1 ring-emerald-300/20">
                  <UserCheck size={22} />
                </span>
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.22em] text-emerald-300">
                    Equipe Scanner
                  </p>
                  <h2 className="text-xl font-black text-white">
                    {editandoEquipe ? "Editar lançamento" : "Novo lançamento"}
                  </h2>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalEquipeAberto(false)}
                className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-800 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>

            <div className="grid gap-3 p-5 sm:grid-cols-2">
              <CampoEquipe
                icon={<CalendarDays size={16} />}
                label="Data referência"
                type="date"
                value={equipeForm.dataReferencia}
                onChange={(valor) => atualizarEquipeCampo("dataReferencia", valor)}
              />
              <CampoEquipe
                icon={<Users size={16} />}
                label="Efetivo previsto"
                type="number"
                value={equipeForm.efetivoPrevisto}
                onChange={(valor) => atualizarEquipeCampo("efetivoPrevisto", valor)}
              />
              <CampoEquipe
                icon={<UserCheck size={16} />}
                label="Efetivo presente"
                type="number"
                value={equipeForm.efetivoPresente}
                onChange={(valor) => atualizarEquipeCampo("efetivoPresente", valor)}
              />
              <CampoEquipe
                icon={<AlertIcon />}
                label="Faltas"
                type="number"
                value={equipeForm.faltas}
                onChange={() => undefined}
                readOnly
              />

              <label className="flex items-center justify-between gap-3 rounded-2xl border border-slate-700 bg-slate-900/80 px-4 py-3 text-sm font-bold text-slate-200 sm:col-span-2">
                <span className="inline-flex items-center gap-2">
                  <Clock size={16} className="text-amber-300" />
                  Mencionar atraso
                </span>
                <input
                  type="checkbox"
                  checked={equipeForm.mencionarAtraso}
                  onChange={(event) => atualizarFlagAtraso(event.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                />
              </label>

              {equipeForm.mencionarAtraso && (
                <>
                  <label className="space-y-2 text-sm font-bold text-slate-200 sm:col-span-2">
                    <span className="inline-flex items-center gap-2"><Users size={16} className="text-emerald-300" />Colaborador em atraso</span>
                    <input type="text" value={equipeForm.colaboradorAtraso} onChange={(event) => atualizarEquipeCampo("colaboradorAtraso", event.target.value)} required className="h-11 w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 font-normal text-white outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-500/10" />
                  </label>
                  <CampoEquipe
                    icon={<Clock size={16} />}
                    label="Início do atraso"
                    type="time"
                    value={equipeForm.atrasoInicio}
                    onChange={(valor) => atualizarEquipeCampo("atrasoInicio", valor)}
                  />
                  <CampoEquipe
                    icon={<Clock size={16} />}
                    label="Fim do atraso"
                    type="time"
                    value={equipeForm.atrasoFim}
                    onChange={(valor) => atualizarEquipeCampo("atrasoFim", valor)}
                  />
                  <div className="rounded-2xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 sm:col-span-2">
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-amber-200">
                      Tempo calculado de atraso
                    </p>
                    <p className="mt-1 text-2xl font-black text-white">
                      {formatarMinutos(atrasoEquipeMinutos)}
                    </p>
                  </div>
                </>
              )}

              <label className="space-y-2 text-sm font-bold text-slate-200 sm:col-span-2">
                <span className="inline-flex items-center gap-2">
                  <Edit3 size={16} className="text-blue-400" />
                  Observações <span className="font-normal text-slate-400">(opcional)</span>
                </span>
                <textarea
                  value={equipeForm.observacoes}
                  onChange={(event) => atualizarEquipeCampo("observacoes", event.target.value)}
                  placeholder="Registre observações do turno, cobertura ou impacto operacional."
                  className="min-h-24 w-full resize-none rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 font-normal text-white outline-none transition placeholder:text-slate-500 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-500/10"
                />
              </label>
            </div>

            <div className="flex flex-col-reverse gap-3 border-t border-slate-800 bg-slate-900/60 p-5 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setModalEquipeAberto(false)}
                className="rounded-xl border border-slate-700 px-5 py-3 text-sm font-black text-slate-200 transition hover:bg-slate-800"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={salvandoEquipe}
                className="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-black text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {salvandoEquipe ? "Salvando..." : "Salvar"}
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

function InfoScanner({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950 px-3 py-2">
      <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">
        {label}
      </p>
      <p className="mt-1 whitespace-pre-wrap text-sm font-bold text-slate-100">
        {value || "-"}
      </p>
    </div>
  );
}

function CampoEquipe({
  icon,
  label,
  type,
  value,
  onChange,
  readOnly = false,
}: {
  icon: React.ReactNode;
  label: string;
  type: "date" | "number" | "time";
  value: string;
  onChange: (value: string) => void;
  readOnly?: boolean;
}) {
  return (
    <label className="space-y-2 text-sm font-bold text-slate-200">
      <span className="inline-flex items-center gap-2">
        <span className="text-emerald-300">{icon}</span>
        {label}
      </span>
      <input
        type={type}
        min={type === "number" ? "0" : undefined}
        step={type === "number" ? "1" : undefined}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        readOnly={readOnly}
        required
        className={`h-11 w-full rounded-2xl border border-slate-700 px-4 font-normal text-white outline-none transition [color-scheme:dark] placeholder:text-slate-500 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-500/10 ${readOnly ? "cursor-not-allowed bg-slate-800 text-slate-300" : "bg-slate-900"}`}
      />
    </label>
  );
}

function CampoScannerInput({
  icon,
  label,
  type,
  value,
  min,
  detalhe,
  onChange,
}: {
  icon: React.ReactNode;
  label: string;
  type: "date" | "number" | "datetime-local";
  value: string;
  min?: string;
  detalhe?: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="space-y-2 text-sm font-bold text-slate-200">
      <span className="flex flex-wrap items-center justify-between gap-2">
        <span className="inline-flex items-center gap-2">
          <span className="text-blue-300">{icon}</span>
          {label}
        </span>
        {detalhe && (
          <span className="rounded-full border border-blue-400/30 bg-blue-400/10 px-2 py-0.5 text-[11px] font-black text-blue-100">
            {detalhe}
          </span>
        )}
      </span>
      <input
        type={type}
        min={min || (type === "number" ? "0" : undefined)}
        step={type === "number" ? "1" : undefined}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required
        className="h-11 w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 font-normal text-white outline-none transition [color-scheme:dark] placeholder:text-slate-500 focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10"
      />
    </label>
  );
}

function FiltroData({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="space-y-2 text-sm font-bold text-slate-200">
      {label}
      <input
        type="date"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 font-normal text-white outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20"
      />
    </label>
  );
}

function FiltroSelect({
  label,
  value,
  onChange,
  options,
  vazio,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ valor: string; label: string }>;
  vazio: string;
}) {
  return (
    <label className="space-y-2 text-sm font-bold text-slate-200">
      {label}
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 font-normal text-white outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20"
      >
        <option value="">{vazio}</option>
        {options.map((option) => (
          <option key={option.valor} value={option.valor}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function AlertIcon() {
  return (
    <span className="flex h-4 w-4 items-center justify-center rounded-full bg-rose-100 text-[10px] font-black text-rose-600">
      !
    </span>
  );
}
