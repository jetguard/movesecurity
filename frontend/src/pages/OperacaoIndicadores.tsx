import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  CalendarDays,
  Edit3,
  Hash,
  Plus,
  Save,
  Trash2,
  X,
} from "lucide-react";
import { api } from "../services/api";
import { podeNoModulo, usuarioValidadorOperacional } from "../utils/permissoes";
import { solicitarPinOperacional } from "../utils/pinPrompt";

type CampoTipo = "number" | "text" | "textarea" | "datetime";

type CampoConfig = {
  chave: string;
  label: string;
  tipo?: CampoTipo;
  destaque?: boolean;
  calculado?: boolean;
};

type IndicadorConfig = {
  titulo: string;
  detalhe?: string;
  cor: string;
  calcular: (registros: RegistroOperacional[]) => number | string;
};

type ModuloConfig = {
  chave: string;
  titulo: string;
  subtitulo: string;
  destaque: string;
  campos: CampoConfig[];
  indicadores: IndicadorConfig[];
};

type RegistroOperacional = {
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

type Formulario = {
  dataReferencia: string;
  dados: Record<string, string>;
};

function numero(valor: unknown) {
  const parsed = Number(valor || 0);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return Math.trunc(parsed);
}

function numeroParaInput(valor: unknown) {
  const numeroValor = Number(valor || 0);
  return numeroValor === 0 || !Number.isFinite(numeroValor) ? "" : String(valor);
}

function campoNumerico(campo: CampoConfig) {
  return !campo.tipo && !campo.calculado;
}

function soma(registros: RegistroOperacional[], chave: string) {
  return registros.reduce((total, registro) => total + numero(dados(registro)[chave]), 0);
}

function percentual(parte: number, total: number) {
  if (!total) return "0,0%";
  return `${((parte / total) * 100).toFixed(1).replace(".", ",")}%`;
}

function minutos(valor: number) {
  const total = Math.max(0, Math.round(valor || 0));
  const horas = Math.floor(total / 60);
  const mins = total % 60;
  if (!horas) return `${mins}min`;
  return `${horas}h ${String(mins).padStart(2, "0")}min`;
}

function dataInput(data?: string) {
  const valor = data ? new Date(data) : new Date();
  const offset = valor.getTimezoneOffset();
  return new Date(valor.getTime() - offset * 60000).toISOString().slice(0, 10);
}

function dataHoraInput(data?: string) {
  if (!data) return "";
  const valor = new Date(data);
  if (Number.isNaN(valor.getTime())) return "";
  const offset = valor.getTimezoneOffset();
  return new Date(valor.getTime() - offset * 60000).toISOString().slice(0, 16);
}

function formatarData(data: string) {
  return new Date(data).toLocaleDateString("pt-BR");
}

function formatarDataHora(data: string) {
  return new Date(data).toLocaleString("pt-BR");
}

function formatarValorCampo(campo: CampoConfig, valor: unknown) {
  if (campo.chave === "tempoTotalImpactoMin") {
    return minutos(numero(valor));
  }
  if (campo.tipo === "datetime") {
    const texto = String(valor || "");
    if (!texto) return "-";
    const data = new Date(texto);
    return Number.isNaN(data.getTime()) ? texto : data.toLocaleString("pt-BR");
  }
  return String(valor ?? "-") || "-";
}

function dados(registro: RegistroOperacional) {
  try {
    return JSON.parse(registro.dadosJson || "{}") as Record<string, string | number>;
  } catch {
    return {};
  }
}

function textoCurto(valor: unknown, limite = 36) {
  const texto = String(valor || "").trim();
  if (!texto) return "-";
  return texto.length > limite ? `${texto.slice(0, limite).trim()}...` : texto;
}

function principaisTextos(registros: RegistroOperacional[], chave: string) {
  const contagem = new Map<string, number>();
  registros.forEach((registro) => {
    const texto = textoCurto(dados(registro)[chave], 42);
    if (texto === "-") return;
    contagem.set(texto, (contagem.get(texto) || 0) + 1);
  });
  const principais = Array.from(contagem.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([texto, total]) => `${texto} (${total})`);
  return principais.length ? principais.join(" | ") : "-";
}

function calcularMinutosEntre(inicio?: string, fim?: string) {
  if (!inicio || !fim) return 0;
  const inicioDate = new Date(inicio);
  const fimDate = new Date(fim);
  if (Number.isNaN(inicioDate.getTime()) || Number.isNaN(fimDate.getTime())) {
    return 0;
  }
  const diferenca = fimDate.getTime() - inicioDate.getTime();
  if (!Number.isFinite(diferenca) || diferenca <= 0) return 0;
  return Math.round(diferenca / 60000);
}

function normalizarDadosModulo(modulo: string, dadosForm: Record<string, string>) {
  const dadosNormalizados = { ...dadosForm };
  if (modulo === "operacao_filas") {
    dadosNormalizados.tempoTotalImpactoMin = String(
      calcularMinutosEntre(
        dadosNormalizados.horarioInicioFila,
        dadosNormalizados.horarioNormalizado,
      ),
    );
    dadosNormalizados.tempoMedioEvento = String(
      Math.round(
        numero(dadosNormalizados.tempoTotalImpactoMin) /
          Math.max(1, numero(dadosNormalizados.eventosFila)),
      ),
    );
  }
  return dadosNormalizados;
}

function statusValidacaoEfetivo(registro: RegistroOperacional) {
  return registro.statusValidacao === "Validado" &&
    (registro.validadoPor || registro.validadoEm)
    ? "Validado"
    : "Pendente";
}

const modulos: Record<string, ModuloConfig> = {
  operacao_entrada_saida: {
    chave: "operacao_entrada_saida",
    titulo: "Entrada e Saída",
    subtitulo: "Auditoria de veículos, contêineres, lacres e divergências operacionais.",
    destaque: "from-blue-600 to-cyan-500",
    campos: [
      { chave: "totalProcessos", label: "Total de processos auditáveis" },
      { chave: "veiculosAuditados", label: "Veículos auditados" },
      { chave: "conteineresFotoCompleta", label: "Contêineres com registro fotográfico completo" },
      { chave: "lacresEntrada", label: "Lacres fotografados na entrada" },
      { chave: "lacresSaida", label: "Lacres fotografados na saída" },
      { chave: "divergencias", label: "Divergências identificadas" },
      { chave: "falhasRegistro", label: "Falhas de registro" },
      { chave: "naoConformidades", label: "Não conformidades" },
      { chave: "observacoes", label: "Observações", tipo: "textarea" },
    ],
    indicadores: [
      {
        titulo: "% veículos auditados",
        cor: "text-blue-300",
        calcular: (r) => percentual(soma(r, "veiculosAuditados"), soma(r, "totalProcessos")),
      },
      {
        titulo: "% registro fotográfico completo",
        cor: "text-emerald-300",
        calcular: (r) => percentual(soma(r, "conteineresFotoCompleta"), soma(r, "totalProcessos")),
      },
      {
        titulo: "Divergências",
        cor: "text-amber-300",
        calcular: (r) => soma(r, "divergencias"),
      },
      {
        titulo: "% conformidade",
        cor: "text-cyan-300",
        calcular: (r) => {
          const total = soma(r, "totalProcessos");
          const desvios = soma(r, "falhasRegistro") + soma(r, "naoConformidades");
          return percentual(Math.max(0, total - desvios), total);
        },
      },
    ],
  },
  operacao_vigilancia: {
    chave: "operacao_vigilancia",
    titulo: "Vigilância Patrimonial",
    subtitulo: "Efetivo, cobertura dos postos, rondas e não conformidades.",
    destaque: "from-slate-700 to-blue-600",
    campos: [
      { chave: "efetivoPrevisto", label: "Efetivo previsto" },
      { chave: "efetivoPresente", label: "Efetivo presente" },
      { chave: "faltas", label: "Faltas" },
      { chave: "atrasos", label: "Atrasos" },
      { chave: "postosDescobertos", label: "Postos descobertos" },
      { chave: "coberturas", label: "Coberturas realizadas" },
      { chave: "servicosExtras", label: "Serviços extras" },
      { chave: "horasPostoDescoberto", label: "Horas de posto descoberto" },
      { chave: "rondas", label: "Rondas realizadas" },
      { chave: "desviosRonda", label: "Desvios em ronda" },
      { chave: "desviosTratados", label: "Desvios tratados no prazo" },
      { chave: "ocorrencias", label: "Principais ocorrências", tipo: "textarea" },
    ],
    indicadores: [
      {
        titulo: "% cobertura dos postos",
        cor: "text-emerald-300",
        calcular: (r) => percentual(soma(r, "efetivoPresente"), soma(r, "efetivoPrevisto")),
      },
      {
        titulo: "Absenteísmo",
        cor: "text-rose-300",
        calcular: (r) => percentual(soma(r, "faltas"), soma(r, "efetivoPrevisto")),
      },
      { titulo: "Rondas realizadas", cor: "text-blue-300", calcular: (r) => soma(r, "rondas") },
      {
        titulo: "% desvios tratados",
        cor: "text-cyan-300",
        calcular: (r) => percentual(soma(r, "desviosTratados"), soma(r, "desviosRonda")),
      },
    ],
  },
  operacao_balanca: {
    chave: "operacao_balanca",
    titulo: "Balança",
    subtitulo: "Atendimentos, pesagens, paradas, indisponibilidade e contingências.",
    destaque: "from-orange-500 to-amber-400",
    campos: [
      { chave: "atendimentos", label: "Total de atendimentos" },
      { chave: "pesagens", label: "Pesagens realizadas" },
      { chave: "tempoMedioAtendimento", label: "Tempo médio de atendimento (min)" },
      { chave: "paradas", label: "Quantidade de paradas" },
      { chave: "horasIndisponibilidade", label: "Tempo de indisponibilidade (min)" },
      { chave: "acionamentosManutencao", label: "Acionamentos manutenção/TI" },
      { chave: "tempoNormalizacao", label: "Tempo para normalização (min)" },
      { chave: "contingencias", label: "Contingências acionadas" },
      { chave: "motivoParada", label: "Motivo da parada / impacto operacional", tipo: "textarea" },
    ],
    indicadores: [
      { titulo: "Atendimentos", cor: "text-white", calcular: (r) => soma(r, "atendimentos") },
      {
        titulo: "Disponibilidade",
        cor: "text-emerald-300",
        calcular: (r) => {
          const dias = Math.max(1, new Set(r.map((i) => dataInput(i.dataReferencia))).size);
          const minutosPeriodo = dias * 24 * 60;
          return percentual(
            Math.max(0, minutosPeriodo - soma(r, "horasIndisponibilidade")),
            minutosPeriodo,
          );
        },
      },
      { titulo: "Paradas", cor: "text-amber-300", calcular: (r) => soma(r, "paradas") },
      {
        titulo: "Tempo médio recuperação",
        cor: "text-blue-300",
        calcular: (r) => minutos(soma(r, "tempoNormalizacao") / Math.max(1, soma(r, "paradas"))),
      },
    ],
  },
  operacao_ocr: {
    chave: "operacao_ocr",
    titulo: "OCR",
    subtitulo: "Assertividade das leituras, falhas, intervenções e indisponibilidade.",
    destaque: "from-blue-600 to-indigo-600",
    campos: [
      { chave: "totalLeituras", label: "Total de leituras" },
      { chave: "leiturasCorretas", label: "Leituras corretas" },
      { chave: "falhas", label: "Falhas" },
      { chave: "intervencoesManuais", label: "Intervenções manuais" },
      { chave: "indisponibilidadeMinutos", label: "Tempo de indisponibilidade (min)" },
      { chave: "motivoFalha", label: "Motivo da falha / plano de ação", tipo: "textarea" },
    ],
    indicadores: [
      {
        titulo: "Assertividade OCR",
        cor: "text-emerald-300",
        calcular: (r) => percentual(soma(r, "leiturasCorretas"), soma(r, "totalLeituras")),
      },
      {
        titulo: "% falhas",
        cor: "text-rose-300",
        calcular: (r) => percentual(soma(r, "falhas"), soma(r, "totalLeituras")),
      },
      { titulo: "Intervenções manuais", cor: "text-amber-300", calcular: (r) => soma(r, "intervencoesManuais") },
      { titulo: "Indisponibilidade", cor: "text-blue-300", calcular: (r) => minutos(soma(r, "indisponibilidadeMinutos")) },
    ],
  },
  operacao_equipe_scanner: {
    chave: "operacao_equipe_scanner",
    titulo: "Equipe do Scanner",
    subtitulo: "Efetivo, faltas, atrasos, postos descobertos, horas extras e glosas.",
    destaque: "from-green-600 to-emerald-500",
    campos: [
      { chave: "efetivoPrevisto", label: "Efetivo previsto" },
      { chave: "efetivoPresente", label: "Efetivo presente" },
      { chave: "faltas", label: "Faltas" },
      { chave: "ausencias", label: "Ausências" },
      { chave: "atrasos", label: "Atrasos" },
      { chave: "postosDescobertos", label: "Postos descobertos" },
      { chave: "horasExtras", label: "Horas extras" },
      { chave: "glosas", label: "Descontos/glosas aplicáveis" },
      { chave: "substituicoes", label: "Necessidade de substituição" },
      { chave: "impacto", label: "Impacto da ausência", tipo: "textarea" },
    ],
    indicadores: [
      {
        titulo: "Absenteísmo",
        cor: "text-rose-300",
        calcular: (r) => percentual(soma(r, "faltas") + soma(r, "ausencias"), soma(r, "efetivoPrevisto")),
      },
      { titulo: "Atrasos", cor: "text-amber-300", calcular: (r) => soma(r, "atrasos") },
      {
        titulo: "% cobertura operacional",
        cor: "text-emerald-300",
        calcular: (r) => percentual(soma(r, "efetivoPresente"), soma(r, "efetivoPrevisto")),
      },
      { titulo: "Glosas", cor: "text-blue-300", calcular: (r) => soma(r, "glosas") },
    ],
  },
  operacao_acesso: {
    chave: "operacao_acesso",
    titulo: "Acesso de Pessoas e Veículos Leves",
    subtitulo: "Fluxo de pessoas, veículos leves, bloqueios e irregularidades.",
    destaque: "from-violet-600 to-blue-500",
    campos: [
      { chave: "atendimentos", label: "Atendimentos nas portarias" },
      { chave: "pessoas", label: "Pessoas" },
      { chave: "veiculosLeves", label: "Veículos leves" },
      { chave: "visitantes", label: "Visitantes" },
      { chave: "prestadores", label: "Prestadores" },
      { chave: "colaboradores", label: "Colaboradores" },
      { chave: "bloqueios", label: "Recusas/bloqueios" },
      { chave: "irregularidades", label: "Irregularidades" },
      { chave: "acessosContingencia", label: "Acessos em contingência" },
      { chave: "tempoMedioAtendimento", label: "Tempo médio de atendimento (min)" },
      { chave: "observacoes", label: "Observações", tipo: "textarea" },
    ],
    indicadores: [
      { titulo: "Volume de acessos", cor: "text-white", calcular: (r) => soma(r, "pessoas") + soma(r, "veiculosLeves") },
      { titulo: "Bloqueios", cor: "text-rose-300", calcular: (r) => soma(r, "bloqueios") },
      { titulo: "Irregularidades", cor: "text-amber-300", calcular: (r) => soma(r, "irregularidades") },
      {
        titulo: "% conformidade",
        cor: "text-emerald-300",
        calcular: (r) => {
          const total = soma(r, "atendimentos");
          const desvios = soma(r, "bloqueios") + soma(r, "irregularidades");
          return percentual(Math.max(0, total - desvios), total);
        },
      },
    ],
  },
  operacao_motoristas: {
    chave: "operacao_motoristas",
    titulo: "Cadastro de Motoristas",
    subtitulo: "Novos cadastros, recadastros, bloqueios e conformidade documental.",
    destaque: "from-cyan-600 to-blue-500",
    campos: [
      { chave: "novosCadastros", label: "Novos cadastros" },
      { chave: "recadastros", label: "Recadastros" },
      { chave: "bloqueados", label: "Motoristas bloqueados" },
      { chave: "irregularidades", label: "Irregularidades identificadas" },
      { chave: "documentosInvalidos", label: "Documentos inválidos" },
      { chave: "cnhInconsistente", label: "CNH com inconsistência" },
      { chave: "divergenciaDocumental", label: "Divergência documental" },
      { chave: "tentativasIrregulares", label: "Tentativas de acesso irregular" },
      { chave: "tempoMedioCadastro", label: "Tempo médio de cadastro (min)" },
      { chave: "observacoes", label: "Observações", tipo: "textarea" },
    ],
    indicadores: [
      { titulo: "Novos cadastros", cor: "text-white", calcular: (r) => soma(r, "novosCadastros") },
      { titulo: "Recadastros", cor: "text-blue-300", calcular: (r) => soma(r, "recadastros") },
      { titulo: "Bloqueios preventivos", cor: "text-rose-300", calcular: (r) => soma(r, "bloqueados") },
      {
        titulo: "% conformidade documental",
        cor: "text-emerald-300",
        calcular: (r) => {
          const total = soma(r, "novosCadastros") + soma(r, "recadastros");
          const desvios = soma(r, "documentosInvalidos") + soma(r, "cnhInconsistente") + soma(r, "divergenciaDocumental");
          return percentual(Math.max(0, total - desvios), total);
        },
      },
    ],
  },
  operacao_filas: {
    chave: "operacao_filas",
    titulo: "Filas e Paradas de Sistema",
    subtitulo: "Impactos por filas, falhas sistêmicas, contingência e reincidência.",
    destaque: "from-red-600 to-orange-500",
    campos: [
      { chave: "eventosFila", label: "Quantidade de eventos de fila" },
      { chave: "horarioInicioFila", label: "Horário de início", tipo: "datetime" },
      { chave: "horarioNormalizado", label: "Horário normalizado", tipo: "datetime" },
      { chave: "tempoTotalImpactoMin", label: "Tempo total de impacto", calculado: true },
      { chave: "veiculosImpactados", label: "Veículos/pessoas impactadas" },
      { chave: "contingencias", label: "Contingências acionadas" },
      { chave: "reincidencias", label: "Reincidências" },
      { chave: "areaResponsavel", label: "Área responsável", tipo: "text" },
      { chave: "motivoFila", label: "Principais causas / sistema ou equipamento envolvido / plano de ação", tipo: "textarea" },
    ],
    indicadores: [
      { titulo: "Eventos de fila", cor: "text-white", calcular: (r) => soma(r, "eventosFila") },
      { titulo: "Horas totais em fila", cor: "text-amber-300", calcular: (r) => minutos(soma(r, "tempoTotalImpactoMin")) },
      {
        titulo: "Tempo médio por evento",
        cor: "text-blue-300",
        calcular: (r) => minutos(soma(r, "tempoTotalImpactoMin") / Math.max(1, soma(r, "eventosFila"))),
      },
      { titulo: "Veículos impactados", cor: "text-rose-300", calcular: (r) => soma(r, "veiculosImpactados") },
      { titulo: "Contingências", cor: "text-cyan-300", calcular: (r) => soma(r, "contingencias") },
      { titulo: "Principais causas", cor: "text-slate-100", calcular: (r) => principaisTextos(r, "motivoFila") },
      {
        titulo: "% reincidência",
        cor: "text-violet-300",
        calcular: (r) => percentual(soma(r, "reincidencias"), soma(r, "eventosFila")),
      },
    ],
  },
};

function formularioInicial(config: ModuloConfig): Formulario {
  return {
    dataReferencia: dataInput(),
    dados: Object.fromEntries(
      config.campos.map((campo) => [
        campo.chave,
        campo.tipo === "text" ||
        campo.tipo === "textarea" ||
        campo.tipo === "datetime" ||
        campo.calculado
          ? ""
          : "",
      ]),
    ),
  };
}

function iconeCampo(campo: CampoConfig) {
  if (campo.tipo === "textarea") {
    return <Edit3 size={16} className="text-blue-400" />;
  }
  if (campo.tipo === "text") {
    return <Activity size={16} className="text-blue-400" />;
  }
  if (campo.tipo === "datetime") {
    return <CalendarDays size={16} className="text-blue-400" />;
  }
  return <Hash size={16} className="text-blue-400" />;
}

function InfoValidacao({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-3">
      <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">
        {label}
      </p>
      <p className="mt-1 text-sm font-bold text-slate-100">{value}</p>
    </div>
  );
}

function formularioSemPreenchimento(config: ModuloConfig, form: Formulario) {
  const dadosNormalizados = normalizarDadosModulo(config.chave, form.dados);
  return config.campos
    .filter((campo) => !campo.calculado)
    .every((campo) => {
      const valor = dadosNormalizados[campo.chave];
      if (
        campo.tipo === "text" ||
        campo.tipo === "textarea" ||
        campo.tipo === "datetime"
      ) {
        return !String(valor || "").trim();
      }
      return numero(valor) === 0;
    });
}

export { modulos as MODULOS_OPERACIONAIS_CONFIG };

export default function OperacaoIndicadores() {
  const { modulo = "" } = useParams();
  const navigate = useNavigate();
  const config = modulos[modulo];
  const [registros, setRegistros] = useState<RegistroOperacional[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const [modalAberto, setModalAberto] = useState(false);
  const [editando, setEditando] = useState<RegistroOperacional | null>(null);
  const [registroValidacao, setRegistroValidacao] =
    useState<RegistroOperacional | null>(null);
  const [validando, setValidando] = useState(false);
  const [confirmarEnvioVazio, setConfirmarEnvioVazio] = useState(false);
  const [form, setForm] = useState<Formulario>(() =>
    config ? formularioInicial(config) : { dataReferencia: dataInput(), dados: {} },
  );

  const validadorOperacional = usuarioValidadorOperacional();
  const podeLerModulo = config ? podeNoModulo(config.chave, "leitura") : false;
  const podeCriar = config
    ? podeNoModulo(config.chave, "criar") ||
      (validadorOperacional && podeLerModulo)
    : false;
  const podeEditar = config
    ? podeNoModulo(config.chave, "editar") ||
      (validadorOperacional && podeLerModulo)
    : false;
  const podeExcluir = config ? podeNoModulo(config.chave, "excluir") : false;
  const podeVerIndicadores = config
    ? podeNoModulo(config.chave, "indicadores")
    : false;

  async function carregar() {
    if (!config) return;
    setCarregando(true);
    setErro("");
    try {
      const resposta = await api.get(`/operacao/indicadores/${config.chave}`);
      setRegistros(resposta.data || []);
    } catch (error: any) {
      setErro(error?.response?.data?.error || "Não foi possível carregar os registros.");
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    if (!config) return;
    setForm(formularioInicial(config));
    setEditando(null);
    setModalAberto(false);
    carregar();
  }, [config?.chave]);

  const registrosValidados = useMemo(
    () => registros.filter((registro) => statusValidacaoEfetivo(registro) === "Validado"),
    [registros],
  );
  const registrosValidadosMes = useMemo(() => {
    const mesAtual = dataInput().slice(0, 7);
    return registrosValidados.filter((registro) =>
      dataInput(registro.dataReferencia).startsWith(mesAtual),
    );
  }, [registrosValidados]);

  function abrirNovo() {
    if (!config) return;
    setEditando(null);
    setForm(formularioInicial(config));
    setModalAberto(true);
  }

  function abrirEdicao(registro: RegistroOperacional) {
    if (!config) return;
    const valores = dados(registro);
    setEditando(registro);
    setForm({
      dataReferencia: dataInput(registro.dataReferencia),
      dados: Object.fromEntries(
        config.campos.map((campo) => [
          campo.chave,
          campo.tipo === "datetime"
            ? dataHoraInput(String(valores[campo.chave] || ""))
            : campo.tipo === "text" || campo.tipo === "textarea" || campo.calculado
              ? String(valores[campo.chave] ?? "")
              : numeroParaInput(valores[campo.chave]),
        ]),
      ),
    });
    setModalAberto(true);
  }

  function atualizarCampo(campo: CampoConfig, valor: string) {
    if (campo.calculado) return;
    setForm((atual) => {
      const proximosDados = {
        ...atual.dados,
        [campo.chave]:
          campo.tipo === "textarea" || campo.tipo === "text" || campo.tipo === "datetime"
            ? valor
            : valor.replace(/\D/g, ""),
      };
      return {
        ...atual,
        dados: normalizarDadosModulo(config?.chave || "", proximosDados),
      };
    });
  }

  async function enviarFormulario() {
    if (!config) return;
    setSalvando(true);
    setConfirmarEnvioVazio(false);
    setErro("");
    const payload = {
      dataReferencia: `${form.dataReferencia}T00:00`,
      dados: normalizarDadosModulo(config.chave, form.dados),
    };

    try {
      if (editando) {
        const resposta = await api.put(
          `/operacao/indicadores/${config.chave}/${editando.id}`,
          payload,
        );
        setRegistros((lista) =>
          lista.map((item) => (item.id === editando.id ? resposta.data : item)),
        );
      } else {
        const resposta = await api.post(`/operacao/indicadores/${config.chave}`, payload);
        setRegistros((lista) => [resposta.data, ...lista]);
      }
      setModalAberto(false);
      setEditando(null);
      navigate("/controle-operacional");
    } catch (error: any) {
      setErro(error?.response?.data?.error || "Não foi possível salvar.");
    } finally {
      setSalvando(false);
    }
  }

  async function salvar(event: React.FormEvent) {
    event.preventDefault();
    if (!config) return;
    if (formularioSemPreenchimento(config, form)) {
      setConfirmarEnvioVazio(true);
      return;
    }
    await enviarFormulario();
  }

  async function excluir(registro: RegistroOperacional) {
    if (!config) return;
    const pin = await solicitarPinOperacional(
      "Informe seu PIN para excluir este lançamento operacional.",
    );
    if (!pin) return;
    await api.delete(`/operacao/indicadores/${config.chave}/${registro.id}`, {
      data: { pinOperacional: pin },
    });
    setRegistros((lista) => lista.filter((item) => item.id !== registro.id));
  }

  async function validarRegistro(registro: RegistroOperacional) {
    if (!config) return;
    setValidando(true);
    setErro("");
    try {
      const resposta = await api.post(
        `/operacao/indicadores/${config.chave}/${registro.id}/validar`,
      );
      setRegistros((lista) =>
        lista.map((item) => (item.id === registro.id ? resposta.data : item)),
      );
      setRegistroValidacao(resposta.data);
    } catch (error: any) {
      setErro(error?.response?.data?.error || "Não foi possível validar.");
    } finally {
      setValidando(false);
    }
  }

  if (!config) {
    return (
      <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-5 text-red-100">
        Módulo operacional não encontrado.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className={`overflow-hidden rounded-3xl bg-gradient-to-br ${config.destaque} p-[1px] shadow-2xl shadow-black/20`}>
        <div className="rounded-3xl bg-slate-900 p-5 text-white">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <span className={`flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${config.destaque} text-white shadow-lg`}>
                <Activity size={26} />
              </span>
              <div>
                <p className="text-xs font-black uppercase tracking-[0.24em] text-blue-300">
                  Operações
                </p>
                <h1 className="mt-1 text-3xl font-black text-white">{config.titulo}</h1>
                <p className="mt-1 max-w-3xl text-sm text-slate-300">{config.subtitulo}</p>
              </div>
            </div>
            {podeCriar && (
              <button
                type="button"
                onClick={abrirNovo}
                className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-4 py-3 text-sm font-black text-white shadow-lg shadow-blue-950/30 transition hover:bg-blue-500"
              >
                <Plus size={18} />
                Novo lançamento
              </button>
            )}
          </div>
        </div>
      </section>

      {erro && (
        <div className="flex items-center gap-2 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm font-bold text-red-100">
          <AlertTriangle size={18} />
          {erro}
        </div>
      )}

      {podeVerIndicadores && (
        <section className="rounded-3xl border border-slate-800 bg-slate-950 p-5 shadow-2xl shadow-black/20">
          <div className="mb-4 flex items-center gap-2 text-white">
            <BarChart3 size={20} className="text-blue-300" />
            <h2 className="text-lg font-black">Indicadores</h2>
            <span className="rounded-full border border-slate-700 px-3 py-1 text-xs font-bold text-slate-300">
              mês atual: {registrosValidadosMes.length} validado(s)
            </span>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {config.indicadores.map((indicador) => (
              <div key={indicador.titulo} className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                  {indicador.titulo}
                </p>
                <p className={`mt-2 text-3xl font-black ${indicador.cor}`}>
                  {indicador.calcular(registrosValidados)}
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  {indicador.detalhe || "Consolidado da unidade ativa"}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-950 shadow-2xl shadow-black/20">
        <div className="border-b border-slate-800 px-5 py-4">
          <h2 className="text-lg font-black text-white">Lançamentos</h2>
          <p className="text-sm text-slate-400">Registros diários enviados pelos líderes da operação.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-800">
            <thead className="bg-slate-900/80">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-wider text-slate-400">
                  Data referência
                </th>
                {config.campos.slice(0, 5).map((campo) => (
                  <th key={campo.chave} className="px-4 py-3 text-left text-xs font-black uppercase tracking-wider text-slate-400">
                    {campo.label}
                  </th>
                ))}
                <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-wider text-slate-400">
                  Cadastrado por
                </th>
                <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-wider text-slate-400">
                  Validação
                </th>
                <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-wider text-slate-400">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {carregando ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-slate-400">
                    Carregando lançamentos...
                  </td>
                </tr>
              ) : registros.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-slate-400">
                    Nenhum lançamento cadastrado.
                  </td>
                </tr>
              ) : (
                registros.map((registro) => {
                  const valores = dados(registro);
                  return (
                    <tr key={registro.id} className="bg-slate-950 transition hover:bg-slate-900/70">
                      <td className="px-4 py-4 text-sm font-bold text-white">
                        {formatarData(registro.dataReferencia)}
                      </td>
                      {config.campos.slice(0, 5).map((campo) => (
                        <td key={campo.chave} className="max-w-[220px] truncate px-4 py-4 text-sm text-slate-300">
                      {formatarValorCampo(campo, valores[campo.chave])}
                        </td>
                      ))}
                      <td className="px-4 py-4 text-sm">
                        <p className="font-bold text-white">
                          {registro.criadoPor?.apelido || registro.criadoPor?.nome || "Não identificado"}
                        </p>
                        <p className="text-xs text-slate-500">{formatarDataHora(registro.createdAt)}</p>
                      </td>
                      <td className="px-4 py-4 text-sm">
                        <span className={`inline-flex rounded-full px-3 py-1 text-xs font-black ${
                          statusValidacaoEfetivo(registro) === "Validado"
                            ? "bg-emerald-500/15 text-emerald-200 ring-1 ring-emerald-400/30"
                            : "bg-amber-500/15 text-amber-200 ring-1 ring-amber-400/30"
                        }`}>
                          {statusValidacaoEfetivo(registro)}
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
                              statusValidacaoEfetivo(registro) === "Validado"
                                ? "Ver validação"
                                : "Validar lançamento"
                            }
                            aria-label={
                              statusValidacaoEfetivo(registro) === "Validado"
                                ? "Ver validação"
                                : "Validar lançamento"
                            }
                            onClick={() => setRegistroValidacao(registro)}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-emerald-500/40 text-emerald-100 transition hover:bg-emerald-500/10"
                          >
                            <BarChart3 size={16} />
                          </button>
                          {podeEditar && (
                            <button
                              type="button"
                              title="Editar lançamento"
                              aria-label="Editar lançamento"
                              onClick={() => abrirEdicao(registro)}
                              className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white transition hover:bg-blue-500"
                            >
                              <Edit3 size={16} />
                            </button>
                          )}
                          {podeExcluir && (
                            <button
                              type="button"
                              title="Excluir lançamento"
                              aria-label="Excluir lançamento"
                              onClick={() => excluir(registro)}
                              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-red-500/40 text-red-200 transition hover:bg-red-500/10"
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
      </section>

      {registroValidacao && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-2 backdrop-blur-sm sm:p-4">
          <div className="max-h-[96dvh] w-[calc(100vw-1rem)] max-w-4xl overflow-y-auto rounded-2xl border border-slate-700 bg-slate-950 text-white shadow-2xl sm:w-full sm:rounded-[1.4rem]">
            <div className="flex items-start justify-between gap-4 border-b border-slate-800 bg-gradient-to-r from-emerald-500/20 to-blue-500/10 p-5 text-white">
              <div className="flex items-center gap-3">
                <span className={`flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br ${config.destaque} text-white shadow-lg`}>
                  <BarChart3 size={22} />
                </span>
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.22em] text-emerald-300">
                    Validação
                  </p>
                  <h2 className="text-xl font-black">
                    {config.titulo} - {formatarData(registroValidacao.dataReferencia)}
                  </h2>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setRegistroValidacao(null)}
                className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-800 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4 p-5">
              <div className="grid gap-3 md:grid-cols-3">
                <InfoValidacao
                  label="Status"
                  value={statusValidacaoEfetivo(registroValidacao)}
                />
                <InfoValidacao
                  label="Cadastrado por"
                  value={
                    registroValidacao.criadoPor?.apelido ||
                    registroValidacao.criadoPor?.nome ||
                    "Não identificado"
                  }
                />
                <InfoValidacao
                  label="Data de cadastro"
                  value={formatarDataHora(registroValidacao.createdAt)}
                />
                <InfoValidacao
                  label="Validado por"
                  value={
                    registroValidacao.validadoPor?.apelido ||
                    registroValidacao.validadoPor?.nome ||
                    "Aguardando validação"
                  }
                />
                <InfoValidacao
                  label="Data de validação"
                  value={
                    registroValidacao.validadoEm
                      ? formatarDataHora(registroValidacao.validadoEm)
                      : "Pendente"
                  }
                />
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
                <h3 className="text-sm font-black uppercase tracking-[0.16em] text-blue-300">
                  Dados preenchidos
                </h3>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  {config.campos.map((campo) => {
                    const valores = dados(registroValidacao);
                    return (
                      <div
                        key={campo.chave}
                        className={campo.tipo === "textarea" ? "md:col-span-2" : ""}
                      >
                        <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">
                          {campo.label}
                        </p>
                        <p className="mt-1 whitespace-pre-wrap rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100">
                          {formatarValorCampo(campo, valores[campo.chave])}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex flex-col-reverse gap-3 border-t border-slate-800 bg-slate-900/60 p-5 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setRegistroValidacao(null)}
                className="rounded-xl border border-slate-700 px-5 py-3 text-sm font-black text-slate-200 transition hover:bg-slate-800"
              >
                Fechar
              </button>
              {statusValidacaoEfetivo(registroValidacao) !== "Validado" && (
                <button
                  type="button"
                  disabled={validando}
                  onClick={() => validarRegistro(registroValidacao)}
                  className="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-black text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {validando ? "Validando..." : "Validar lançamento"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {confirmarEnvioVazio && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/80 p-2 backdrop-blur-sm sm:p-4">
          <div className="w-[calc(100vw-1rem)] max-w-md rounded-2xl border border-amber-400/30 bg-slate-950 p-4 text-white shadow-2xl sm:w-full sm:rounded-[1.4rem] sm:p-5">
            <div className="flex items-start gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-200 ring-1 ring-amber-400/30">
                <AlertTriangle size={22} />
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
                onClick={() => setConfirmarEnvioVazio(false)}
                className="rounded-xl border border-slate-700 px-5 py-3 text-sm font-black text-slate-200 transition hover:bg-slate-800"
              >
                REVISAR
              </button>
              <button
                type="button"
                disabled={salvando}
                onClick={enviarFormulario}
                className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-black text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {salvando ? "ENVIANDO..." : "ENVIAR"}
              </button>
            </div>
          </div>
        </div>
      )}

      {modalAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-2 backdrop-blur-sm sm:p-4">
          <form
            onSubmit={salvar}
            className="max-h-[96dvh] w-[calc(100vw-1rem)] max-w-5xl overflow-y-auto rounded-2xl border border-slate-700 bg-slate-950 text-white shadow-2xl sm:w-full sm:rounded-[1.4rem]"
          >
            <div className="flex items-start justify-between gap-4 border-b border-slate-800 bg-gradient-to-r from-blue-600/20 to-slate-800/80 p-5 text-white">
              <div className="flex items-center gap-3">
                <span className={`flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br ${config.destaque} text-white shadow-lg`}>
                  <Activity size={22} />
                </span>
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.22em] text-blue-300">
                    {config.titulo}
                  </p>
                  <h2 className="text-xl font-black">
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

            <div className="grid gap-3 p-5 md:grid-cols-2">
              <label className="space-y-2 text-sm font-bold text-slate-200">
                <span className="inline-flex items-center gap-2">
                  <CalendarDays size={16} className="text-blue-400" />
                  Data referência
                </span>
                <input
                  type="date"
                  value={form.dataReferencia}
                  onChange={(event) =>
                    setForm((atual) => ({ ...atual, dataReferencia: event.target.value }))
                  }
                  required
                  className="h-12 w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 font-normal text-white outline-none transition [color-scheme:dark] placeholder:text-slate-500 focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10"
                />
              </label>

              {config.campos.map((campo) => (
                <label
                  key={campo.chave}
                  className={`space-y-2 text-sm font-bold text-slate-200 ${
                    campo.tipo === "textarea" ? "md:col-span-2" : ""
                  }`}
                >
                  <span className="inline-flex items-center gap-2">
                    {iconeCampo(campo)}
                    {campo.label}
                  </span>
                  {campo.tipo === "textarea" ? (
                    <textarea
                      value={form.dados[campo.chave] || ""}
                      onChange={(event) => atualizarCampo(campo, event.target.value)}
                      className="min-h-28 w-full resize-none rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 font-normal text-white outline-none transition placeholder:text-slate-500 focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10"
                    />
                  ) : campo.calculado ? (
                    <div className="flex h-12 w-full items-center rounded-2xl border border-blue-500/30 bg-blue-500/10 px-4 font-black text-blue-100">
                      {campo.chave === "tempoTotalImpactoMin"
                        ? form.dados.horarioInicioFila && form.dados.horarioNormalizado
                          ? minutos(numero(form.dados[campo.chave]))
                          : ""
                        : form.dados[campo.chave] || ""}
                    </div>
                  ) : (
                    <input
                      type={
                        campo.tipo === "text"
                          ? "text"
                          : campo.tipo === "datetime"
                            ? "datetime-local"
                            : "number"
                      }
                      min={campoNumerico(campo) ? 0 : undefined}
                      step={campoNumerico(campo) ? 1 : undefined}
                      value={form.dados[campo.chave] || ""}
                      onChange={(event) => atualizarCampo(campo, event.target.value)}
                      required={campoNumerico(campo)}
                      className="h-12 w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 font-normal text-white outline-none transition placeholder:text-slate-500 focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10"
                    />
                  )}
                </label>
              ))}
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
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-black text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Save size={17} />
                {salvando ? "Salvando..." : "Salvar"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
