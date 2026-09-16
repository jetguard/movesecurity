import { useEffect, useMemo, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import {
  BarChart3,
  CalendarDays,
  Camera,
  ChevronDown,
  Clock,
  ChevronLeft,
  ChevronRight,
  Eye,
  FileText,
  ImagePlus,
  Mail,
  MapPin,
  PauseCircle,
  PieChart,
  Pencil,
  PlayCircle,
  Plus,
  RefreshCcw,
  Search,
  Timer,
  Trash2,
  UserCheck,
  X,
} from "lucide-react";
import { api } from "../services/api";
import { solicitarPinOperacional } from "../utils/pinPrompt";
import { PERFIS, perfilAtual, podeNoModulo, usuarioAtual } from "../utils/permissoes";

type UsuarioResumo = {
  id: number;
  nome: string;
  email?: string;
};

type LocalTerminal = {
  id: number;
  nome: string;
  tipo?: string | null;
  status: string;
  unidade: string;
};

type CameraFoco = {
  id: number;
  numeroCamera: string;
  nomeCamera?: string | null;
  numeroServidor?: string | null;
  localInstalado: string;
  areaMonitorada: string;
  status: string;
  rotulo?: string;
};

type Anexo = {
  id: number;
  nomeOriginal: string;
  caminho: string;
  tipoArquivo: string;
  tamanho: number;
  origem: string;
  createdAt: string;
};

type Atendimento = {
  id: number;
  iniciadoEm: string;
  pausadoEm?: string | null;
  tempoSegundos?: number | null;
  motivoPausa?: string | null;
  andamento?: string | null;
  atendente: UsuarioResumo;
};

type Historico = {
  id: number;
  tipoEvento: string;
  descricao: string;
  statusAnterior?: string | null;
  statusNovo?: string | null;
  usuarioNome?: string | null;
  usuario?: UsuarioResumo | null;
  dadosJson?: string | null;
  createdAt: string;
};

type SolicitacaoImagem = {
  id: number;
  protocolo: string;
  unidade: string;
  origem: string;
  titulo: string;
  solicitanteNome: string;
  solicitanteEmail?: string | null;
  solicitanteSetor?: string | null;
  solicitanteCargo?: string | null;
  local?: string | null;
  dataOcorrencia?: string | null;
  dataFinalOcorrencia?: string | null;
  horaInicial?: string | null;
  horaFinal?: string | null;
  descricao?: string | null;
  prioridade: string;
  status: string;
  atendimentoIniciadoEm?: string | null;
  tempoTotalAtendimento: number;
  descricaoConclusao?: string | null;
  motivoAnulacao?: string | null;
  createdAt: string;
  atendente?: UsuarioResumo | null;
  criadoPor?: UsuarioResumo | null;
  anexos?: Anexo[];
  atendimentos?: Atendimento[];
  historico?: Historico[];
};

type PeriodoDashboardSolicitacoes = "dia" | "mes" | "ano";

const prioridades = ["", "Baixa", "Média", "Alta", "Crítica", "Não Classificada"];
const statusOpcoes = [
  "",
  "Aguardando Atendimento",
  "Aguardando Classificação",
  "Em Atendimento",
  "Pausado",
  "Concluído",
  "Anulado",
];
const linkTesteSolicitacaoImagem = "/solicitacao/imagens/teste-desenvolvimento";

const formInicial = {
  titulo: "",
  solicitanteNome: "",
  email: "",
  setor: "",
  cargo: "",
  local: "",
  dataOcorrencia: "",
  dataFinalOcorrencia: "",
  horaInicial: "",
  horaFinal: "",
  descricao: "",
  prioridade: "Baixa",
  status: "Aguardando Atendimento",
  descricaoConclusao: "",
  motivoAnulacao: "",
};

function formatarData(valor?: string | null) {
  if (!valor) return "-";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(valor));
}

function formatarDataInput(valor?: string | null) {
  if (!valor) return "";
  return new Date(valor).toISOString().slice(0, 10);
}

function chaveDataDashboard(valor: string) {
  const data = new Date(valor);
  const offset = data.getTimezoneOffset();
  return new Date(data.getTime() - offset * 60000).toISOString().slice(0, 10);
}

function chaveTemporalDashboard(
  valor: string,
  periodo: PeriodoDashboardSolicitacoes,
) {
  const chaveDia = chaveDataDashboard(valor);
  if (periodo === "ano") return chaveDia.slice(0, 4);
  if (periodo === "mes") return chaveDia.slice(0, 7);
  return chaveDia;
}

function rotuloTemporalDashboard(
  valor: string,
  periodo: PeriodoDashboardSolicitacoes,
) {
  const data = new Date(valor);
  if (periodo === "ano") return data.toLocaleDateString("pt-BR", { year: "numeric" });
  if (periodo === "mes") {
    return data.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  }
  return data.toLocaleDateString("pt-BR");
}

function normalizarStatusSolicitacao(status?: string | null) {
  return status === "Finalizado" ? "Concluído" : status || "";
}

function formatarDataCurta(valor?: string | null) {
  if (!valor) return "";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
  }).format(new Date(valor));
}

function formatarPeriodoOcorrencia(item: SolicitacaoImagem) {
  if (!item.dataOcorrencia) return "-";

  const dataInicial = formatarDataCurta(item.dataOcorrencia);
  const dataFinal = formatarDataCurta(
    item.dataFinalOcorrencia || item.dataOcorrencia,
  );
  const inicio = [dataInicial, item.horaInicial].filter(Boolean).join(" ");
  const fim = [dataFinal, item.horaFinal].filter(Boolean).join(" ");

  return fim ? `${inicio} a ${fim}` : inicio;
}

function formatarTempo(segundos = 0) {
  const horas = Math.floor(segundos / 3600);
  const minutos = Math.floor((segundos % 3600) / 60);
  const segundosRestantes = Math.floor(segundos % 60);
  return `${String(horas).padStart(2, "0")}:${String(minutos).padStart(2, "0")}:${String(segundosRestantes).padStart(2, "0")}`;
}

function resumirTexto(valor?: string | null, limite = 70) {
  const texto = valor?.trim();
  if (!texto) return "-";
  return texto.length > limite ? `${texto.slice(0, limite).trimEnd()}...` : texto;
}

function tempoAcumuladoAtual(item: SolicitacaoImagem, agora = Date.now()) {
  const tempoSalvo = Number(item.tempoTotalAtendimento || 0);
  if (item.status !== "Em Atendimento" || !item.atendimentoIniciadoEm) {
    return tempoSalvo;
  }

  const inicio = new Date(item.atendimentoIniciadoEm).getTime();
  if (!Number.isFinite(inicio)) return tempoSalvo;
  return tempoSalvo + Math.max(0, Math.floor((agora - inicio) / 1000));
}

function evidenciasDaSolicitacao(item: SolicitacaoImagem) {
  return (item.anexos || []).filter((anexo) => anexo.origem === "Evidencia");
}

function anexosDaSolicitacao(item: SolicitacaoImagem) {
  return (item.anexos || []).filter((anexo) => anexo.origem !== "Evidencia");
}

function dadosHistorico(item: Historico) {
  if (!item.dadosJson) return null;
  try {
    return JSON.parse(item.dadosJson);
  } catch {
    return null;
  }
}

function evidenciasDoHistorico(item: Historico, evidencias: Anexo[]) {
  if (!item.tipoEvento.includes("EVIDENCIA")) return [];
  const dados = dadosHistorico(item);
  const arquivos = Array.isArray(dados?.arquivos) ? dados.arquivos : [];
  if (!arquivos.length) return evidencias;

  const nomes = new Set(arquivos.map((arquivo: unknown) => String(arquivo)));
  const encontradas = evidencias.filter((anexo) => nomes.has(anexo.nomeOriginal));
  return encontradas.length ? encontradas : evidencias;
}

function camerasBuscaDoHistorico(item: Historico): CameraFoco[] {
  const dados = dadosHistorico(item);
  const cameras = Array.isArray(dados?.camerasBusca) ? dados.camerasBusca : [];
  return cameras.filter((camera: any) => camera && camera.id);
}

function rotuloCameraFoco(camera: CameraFoco) {
  if (camera.rotulo) return camera.rotulo;
  const nome = camera.nomeCamera ? ` - ${camera.nomeCamera}` : "";
  return `Câmera ${camera.numeroCamera}${nome} | ${camera.areaMonitorada} | ${camera.localInstalado}`;
}

function textoHistorico(item: Historico) {
  const descricao = item.descricao?.trim() || "";
  const dados = dadosHistorico(item);
  const andamento = typeof dados?.andamento === "string" ? dados.andamento.trim() : "";
  const camerasBusca = camerasBuscaDoHistorico(item);
  const camerasTexto = camerasBusca.length
    ? `Câmeras utilizadas na busca:\n${camerasBusca
        .map((camera) => `- ${rotuloCameraFoco(camera)}`)
        .join("\n")}`
    : "";

  return [descricao, andamento ? `Andamento: ${andamento}` : "", camerasTexto]
    .filter(Boolean)
    .join("\n\n");
}

function ehImagemAnexo(anexo: Anexo) {
  return (
    anexo.tipoArquivo?.startsWith("image/") ||
    /\.(png|jpe?g|webp|gif|bmp)$/i.test(anexo.nomeOriginal || anexo.caminho)
  );
}

function eventoClassificacao(item: Historico) {
  return (
    item.tipoEvento === "ALTERACAO_STATUS" &&
    item.statusAnterior === "Aguardando Classificação"
  );
}

function rotuloEvento(item: Historico) {
  const rotulos: Record<string, string> = {
    CRIACAO: "Solicitação criada",
    CRIACAO_EXTERNA: "Solicitação externa criada",
    EDICAO: "Dados atualizados",
    ALTERACAO_STATUS: "Status alterado",
    INICIO_ATENDIMENTO: "Atendimento iniciado",
    RETOMADA_ATENDIMENTO: "Atendimento retomado",
    PAUSA_ATENDIMENTO: "Atendimento pausado",
    ASSUMIU_ATENDIMENTO: "Atendimento assumido",
    COLETA_EVIDENCIAS: "Evidências coletadas",
    EXCLUSAO_EVIDENCIA: "Evidência removida",
    EXCLUSAO: "Solicitação excluída",
  };
  if (eventoClassificacao(item)) return "Classificação realizada";
  const tipoEvento = item.tipoEvento;
  return rotulos[tipoEvento] || tipoEvento.replace(/_/g, " ").toLowerCase();
}

function rotuloResponsavelEvento(item: Historico) {
  if (eventoClassificacao(item)) return "Classificado por";
  if (["EDICAO", "ALTERACAO_STATUS"].includes(item.tipoEvento)) return "Alterado por";
  if (item.tipoEvento.includes("EVIDENCIA")) return "Registrado por";
  return "Responsável";
}

function classeEvento(tipoEvento: string) {
  if (tipoEvento.includes("PAUSA")) return "border-amber-400/30 bg-amber-400/10 text-amber-200";
  if (tipoEvento.includes("EVIDENCIA")) return "border-cyan-400/30 bg-cyan-400/10 text-cyan-200";
  if (tipoEvento.includes("ASSUMIU")) return "border-emerald-400/30 bg-emerald-400/10 text-emerald-200";
  if (tipoEvento.includes("ATENDIMENTO")) return "border-sky-400/30 bg-sky-400/10 text-sky-200";
  if (tipoEvento.includes("EXCLUSAO") || tipoEvento.includes("ANUL")) return "border-red-400/30 bg-red-400/10 text-red-200";
  return "border-slate-500/30 bg-slate-500/10 text-slate-200";
}

function classeStatus(status: string) {
  if (normalizarStatusSolicitacao(status) === "Concluído") return "border-emerald-500/30 bg-emerald-500/10 text-emerald-200";
  if (status === "Em Atendimento") return "border-sky-500/30 bg-sky-500/10 text-sky-200";
  if (status === "Pausado") return "border-amber-500/30 bg-amber-500/10 text-amber-200";
  if (status === "Anulado") return "border-red-500/30 bg-red-500/10 text-red-200";
  return "border-slate-500/30 bg-slate-500/10 text-slate-200";
}

function classePrioridade(prioridade: string) {
  if (prioridade === "Crítica") return "text-red-300";
  if (prioridade === "Alta") return "text-orange-300";
  if (prioridade === "Média") return "text-amber-300";
  if (prioridade === "Baixa") return "text-emerald-300";
  return "text-slate-300";
}

export default function SolicitacoesImagens() {
  const [solicitacoes, setSolicitacoes] = useState<SolicitacaoImagem[]>([]);
  const [locais, setLocais] = useState<LocalTerminal[]>([]);
  const [camerasConectadas, setCamerasConectadas] = useState<CameraFoco[]>([]);
  const [carregandoCameras, setCarregandoCameras] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [busca, setBusca] = useState("");
  const [statusFiltro, setStatusFiltro] = useState("");
  const [prioridadeFiltro, setPrioridadeFiltro] = useState("");
  const [modalForm, setModalForm] = useState<"criar" | "editar" | null>(null);
  const [modalPausa, setModalPausa] = useState<SolicitacaoImagem | null>(null);
  const [modalAssumir, setModalAssumir] = useState<SolicitacaoImagem | null>(null);
  const [modalEvidencias, setModalEvidencias] = useState<SolicitacaoImagem | null>(null);
  const [detalhe, setDetalhe] = useState<SolicitacaoImagem | null>(null);
  const [dashboardAberto, setDashboardAberto] = useState(false);
  const [periodoDashboard, setPeriodoDashboard] =
    useState<PeriodoDashboardSolicitacoes>("mes");
  const [solicitacaoEditando, setSolicitacaoEditando] =
    useState<SolicitacaoImagem | null>(null);
  const [form, setForm] = useState(formInicial);
  const [anexos, setAnexos] = useState<FileList | null>(null);
  const [emailFormulario, setEmailFormulario] = useState("");
  const [linkGerado, setLinkGerado] = useState("");
  const [pausa, setPausa] = useState({ motivo: "", andamento: "" });
  const [camerasPausaSelecionadas, setCamerasPausaSelecionadas] = useState<number[]>([]);
  const [assumir, setAssumir] = useState({ motivo: "", descricao: "" });
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [agoraTempo, setAgoraTempo] = useState(Date.now());

  const usuarioLogado = usuarioAtual();
  const podeCriar = podeNoModulo("solicitacoes_imagens", "criar");
  const podeEditar = podeNoModulo("solicitacoes_imagens", "editar");
  const podeExcluir = [PERFIS.SUPER_ADMIN, PERFIS.ADMINISTRADOR].includes(
    perfilAtual(),
  );

  async function carregarSolicitacoes() {
    setCarregando(true);
    try {
      const resposta = await api.get("/solicitacoes-imagens", {
        params: {
          busca: busca.trim() || undefined,
          status: statusFiltro || undefined,
          prioridade: prioridadeFiltro || undefined,
        },
      });
      setSolicitacoes(resposta.data || []);
    } finally {
      setCarregando(false);
    }
  }

  async function carregarLocais() {
    const resposta = await api.get("/locais", { params: { status: "ativo" } });
    setLocais(resposta.data || []);
  }

  async function carregarCamerasConectadas() {
    setCarregandoCameras(true);
    try {
      const resposta = await api.get("/solicitacoes-imagens/cameras-conectadas");
      setCamerasConectadas(resposta.data || []);
    } catch {
      setCamerasConectadas([]);
    } finally {
      setCarregandoCameras(false);
    }
  }

  function abrirModalPausa(item: SolicitacaoImagem) {
    setErro("");
    setPausa({ motivo: "", andamento: "" });
    setCamerasPausaSelecionadas([]);
    setModalPausa(item);
    carregarCamerasConectadas();
  }

  function fecharModalPausa() {
    setModalPausa(null);
    setPausa({ motivo: "", andamento: "" });
    setCamerasPausaSelecionadas([]);
  }

  function alternarCameraPausa(cameraId: number) {
    setCamerasPausaSelecionadas((atuais) =>
      atuais.includes(cameraId)
        ? atuais.filter((id) => id !== cameraId)
        : [...atuais, cameraId],
    );
  }

  useEffect(() => {
    carregarSolicitacoes();
    carregarLocais().catch(() => setLocais([]));
  }, []);

  useEffect(() => {
    const temAtendimentoAtivo =
      solicitacoes.some(
        (item) => item.status === "Em Atendimento" && item.atendimentoIniciadoEm,
      ) ||
      Boolean(
        detalhe?.status === "Em Atendimento" && detalhe.atendimentoIniciadoEm,
      );

    if (!temAtendimentoAtivo) return;

    const intervalo = window.setInterval(() => setAgoraTempo(Date.now()), 1000);
    return () => window.clearInterval(intervalo);
  }, [solicitacoes, detalhe]);

  const resumo = useMemo(() => {
    const status = new Map<string, number>();
    const prioridadesResumo = new Map<string, number>();
    const locaisResumo = new Map<string, number>();
    const origensResumo = new Map<string, number>();
    const temporal = new Map<
      string,
      {
        chave: string;
        rotulo: string;
        ordem: number;
        total: number;
        concluidas: number;
        anuladas: number;
        criticas: number;
        emAtendimento: number;
      }
    >();

    const base = {
      total: 0,
      atendimento: 0,
      classificacao: 0,
      criticas: 0,
      concluidas: 0,
      anuladas: 0,
      aguardandoAtendimento: 0,
      tempoConclusaoTotal: 0,
      tempoConclusaoQuantidade: 0,
      evidencias: 0,
      anexos: 0,
    };

    solicitacoes.forEach((item) => {
      const statusNormalizado = normalizarStatusSolicitacao(item.status);
      const prioridade = item.prioridade || "Não Classificada";
      const local = item.local?.trim() || "Sem local informado";
      const origem = item.origem || "Não informada";

      base.total += 1;
      base.evidencias += evidenciasDaSolicitacao(item).length;
      base.anexos += anexosDaSolicitacao(item).length;
      if (statusNormalizado === "Em Atendimento") base.atendimento += 1;
      if (statusNormalizado === "Aguardando Classificação") base.classificacao += 1;
      if (statusNormalizado === "Aguardando Atendimento") {
        base.aguardandoAtendimento += 1;
      }
      if (statusNormalizado === "Concluído") {
        base.concluidas += 1;
        base.tempoConclusaoTotal += Number(item.tempoTotalAtendimento || 0);
        base.tempoConclusaoQuantidade += 1;
      }
      if (statusNormalizado === "Anulado") base.anuladas += 1;
      if (prioridade === "Crítica") base.criticas += 1;

      status.set(statusNormalizado || "Não informado", (status.get(statusNormalizado || "Não informado") || 0) + 1);
      prioridadesResumo.set(prioridade, (prioridadesResumo.get(prioridade) || 0) + 1);
      locaisResumo.set(local, (locaisResumo.get(local) || 0) + 1);
      origensResumo.set(origem, (origensResumo.get(origem) || 0) + 1);

      const chave = chaveTemporalDashboard(item.createdAt, periodoDashboard);
      const itemTemporal =
        temporal.get(chave) ||
        {
          chave,
          rotulo: rotuloTemporalDashboard(item.createdAt, periodoDashboard),
          ordem: new Date(item.createdAt).getTime(),
          total: 0,
          concluidas: 0,
          anuladas: 0,
          criticas: 0,
          emAtendimento: 0,
        };
      itemTemporal.total += 1;
      if (statusNormalizado === "Concluído") itemTemporal.concluidas += 1;
      if (statusNormalizado === "Anulado") itemTemporal.anuladas += 1;
      if (statusNormalizado === "Em Atendimento") itemTemporal.emAtendimento += 1;
      if (prioridade === "Crítica") itemTemporal.criticas += 1;
      temporal.set(chave, itemTemporal);
    });

    const ordenarRanking = (mapa: Map<string, number>) =>
      Array.from(mapa.entries())
        .map(([label, valor]) => ({ label, valor }))
        .sort((a, b) => b.valor - a.valor || a.label.localeCompare(b.label));

    const tempoMedioConclusao =
      base.tempoConclusaoQuantidade > 0
        ? Math.round(base.tempoConclusaoTotal / base.tempoConclusaoQuantidade)
        : 0;
    const percentualConclusao =
      base.total > 0 ? Math.round((base.concluidas / base.total) * 100) : 0;

    return {
      ...base,
      tempoMedioConclusao,
      percentualConclusao,
      status: ordenarRanking(status),
      prioridades: ordenarRanking(prioridadesResumo),
      locais: ordenarRanking(locaisResumo).slice(0, 6),
      origens: ordenarRanking(origensResumo),
      temporal: Array.from(temporal.values()).sort((a, b) => a.ordem - b.ordem),
    };
  }, [periodoDashboard, solicitacoes]);

  const maiorTemporal = Math.max(1, ...resumo.temporal.map((item) => item.total));
  const maiorLocal = Math.max(1, ...resumo.locais.map((item) => item.valor));

  function abrirCriacao() {
    setErro("");
    setForm(formInicial);
    setAnexos(null);
    setSolicitacaoEditando(null);
    setModalForm("criar");
  }

  function fecharFormulario() {
    setModalForm(null);
    setSolicitacaoEditando(null);
    setAnexos(null);
  }

  function abrirEdicao(item: SolicitacaoImagem) {
    setErro("");
    setForm({
      titulo: item.titulo || "",
      solicitanteNome: item.solicitanteNome || "",
      email: item.solicitanteEmail || "",
      setor: item.solicitanteSetor || "",
      cargo: item.solicitanteCargo || "",
      local: item.local || "",
      dataOcorrencia: formatarDataInput(item.dataOcorrencia),
      dataFinalOcorrencia: formatarDataInput(
        item.dataFinalOcorrencia || item.dataOcorrencia,
      ),
      horaInicial: item.horaInicial || "",
      horaFinal: item.horaFinal || "",
      descricao: item.descricao || "",
      prioridade: item.prioridade || "Não Classificada",
      status: normalizarStatusSolicitacao(item.status) || "Aguardando Atendimento",
      descricaoConclusao: item.descricaoConclusao || "",
      motivoAnulacao: item.motivoAnulacao || "",
    });
    setAnexos(null);
    setSolicitacaoEditando(item);
    setModalForm("editar");
  }

  function montarFormData(pinOperacional?: string) {
    const dados = new FormData();
    Object.entries(form).forEach(([chave, valor]) => dados.append(chave, valor));
    if (pinOperacional) dados.append("pinOperacional", pinOperacional);
    Array.from(anexos || []).forEach((arquivo) => dados.append("anexos", arquivo));
    return dados;
  }

  async function salvarFormulario(event: FormEvent) {
    event.preventDefault();
    setErro("");
    setSalvando(true);
    try {
      let pinOperacional = "";
      const statusAtual = normalizarStatusSolicitacao(solicitacaoEditando?.status);
      const statusNovo = normalizarStatusSolicitacao(form.status);
      if (
        modalForm === "editar" &&
        ["Concluído", "Anulado"].includes(statusNovo) &&
        statusAtual !== statusNovo
      ) {
        const pinInformado = await solicitarPinOperacional(
          statusNovo === "Concluído"
            ? "Informe seu PIN para concluir esta solicitação."
            : "Informe seu PIN para anular esta solicitação.",
        );
        if (!pinInformado) return;
        pinOperacional = pinInformado;
      }

      if (modalForm === "criar") {
        await api.post("/solicitacoes-imagens", montarFormData());
      } else if (solicitacaoEditando) {
        await api.put(
          `/solicitacoes-imagens/${solicitacaoEditando.id}`,
          montarFormData(pinOperacional),
        );
      }
      fecharFormulario();
      await carregarSolicitacoes();
    } catch (error: any) {
      setErro(error?.response?.data?.error || "Não foi possível salvar.");
    } finally {
      setSalvando(false);
    }
  }

  async function atualizarDetalhe(id: number) {
    const resposta = await api.get(`/solicitacoes-imagens/${id}`);
    setDetalhe(resposta.data);
  }

  function aplicarSolicitacaoAtualizada(atualizada: SolicitacaoImagem) {
    setSolicitacoes((lista) =>
      lista.map((item) => (item.id === atualizada.id ? atualizada : item)),
    );
    setDetalhe((item) => (item?.id === atualizada.id ? atualizada : item));
    setSolicitacaoEditando((item) => (item?.id === atualizada.id ? atualizada : item));
    setModalEvidencias((item) => (item?.id === atualizada.id ? atualizada : item));
  }

  async function salvarEvidencias(arquivos: File[]) {
    if (!modalEvidencias || arquivos.length === 0) return;
    setErro("");
    setSalvando(true);
    try {
      const dados = new FormData();
      arquivos.forEach((arquivo) => dados.append("evidencias", arquivo));
      const resposta = await api.post(
        `/solicitacoes-imagens/${modalEvidencias.id}/evidencias`,
        dados,
      );
      aplicarSolicitacaoAtualizada(resposta.data);
    } catch (error: any) {
      setErro(error?.response?.data?.error || "Não foi possível salvar as evidências.");
    } finally {
      setSalvando(false);
    }
  }

  async function excluirEvidencia(anexo: Anexo) {
    if (!modalEvidencias) return;
    const confirmar = window.confirm(`Excluir a evidência ${anexo.nomeOriginal}?`);
    if (!confirmar) return;
    setErro("");
    setSalvando(true);
    try {
      const resposta = await api.delete(
        `/solicitacoes-imagens/${modalEvidencias.id}/evidencias/${anexo.id}`,
      );
      aplicarSolicitacaoAtualizada(resposta.data);
    } catch (error: any) {
      setErro(error?.response?.data?.error || "Não foi possível excluir a evidência.");
    } finally {
      setSalvando(false);
    }
  }

  async function acaoAtendimento(item: SolicitacaoImagem) {
    setErro("");
    const pinOperacional = await solicitarPinOperacional(
      "Informe seu PIN para iniciar ou retomar o atendimento desta solicitação.",
    );
    if (!pinOperacional) return;
    setSalvando(true);
    try {
      const resposta = await api.post(`/solicitacoes-imagens/${item.id}/atendimento/iniciar`, {
        pinOperacional,
      });
      aplicarSolicitacaoAtualizada(resposta.data);
    } catch (error: any) {
      setErro(error?.response?.data?.error || "Não foi possível iniciar.");
    } finally {
      setSalvando(false);
    }
  }

  async function pausarAtendimento(event: FormEvent) {
    event.preventDefault();
    if (!modalPausa) return;
    setErro("");
    setSalvando(true);
    try {
      const resposta = await api.post(
        `/solicitacoes-imagens/${modalPausa.id}/atendimento/pausar`,
        {
          ...pausa,
          cameraIds: camerasPausaSelecionadas,
        },
      );
      aplicarSolicitacaoAtualizada(resposta.data);
      fecharModalPausa();
    } catch (error: any) {
      setErro(error?.response?.data?.error || "Não foi possível pausar.");
    } finally {
      setSalvando(false);
    }
  }

  async function assumirAtendimento(event: FormEvent) {
    event.preventDefault();
    if (!modalAssumir) return;
    setErro("");
    setSalvando(true);
    try {
      await api.post(
        `/solicitacoes-imagens/${modalAssumir.id}/atendimento/assumir`,
        assumir,
      );
      setModalAssumir(null);
      setAssumir({ motivo: "", descricao: "" });
      await carregarSolicitacoes();
      if (detalhe?.id === modalAssumir.id) await atualizarDetalhe(modalAssumir.id);
    } catch (error: any) {
      setErro(error?.response?.data?.error || "Não foi possível assumir.");
    } finally {
      setSalvando(false);
    }
  }

  async function excluir(item: SolicitacaoImagem) {
    const confirmar = window.confirm(`Excluir a solicitação ${item.protocolo}?`);
    if (!confirmar) return;
    await api.delete(`/solicitacoes-imagens/${item.id}`, {
      data: { motivo: "Exclusão pela tela de solicitações de imagens" },
    });
    await carregarSolicitacoes();
  }

  function abrirRelatorioPdf(item: SolicitacaoImagem) {
    window.open(
      `/api/solicitacoes-imagens/${item.id}/relatorio/pdf`,
      "_blank",
      "noopener,noreferrer",
    );
  }

  async function enviarFormulario(event: FormEvent) {
    event.preventDefault();
    setErro("");
    setLinkGerado("");
    setSalvando(true);
    try {
      const resposta = await api.post("/solicitacoes-imagens/formularios", {
        email: emailFormulario,
      });
      setLinkGerado(resposta.data.link);
    } catch (error: any) {
      setErro(error?.response?.data?.error || "Não foi possível enviar o formulário.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 border-b border-slate-800 pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.28em] text-sky-300">
            Solicitações
          </p>
          <h1 className="mt-2 text-3xl font-black text-white">
            Solicitações de Imagens
          </h1>
          <p className="mt-2 text-slate-300">
            Gestão de pedidos de imagens, evidências e CFTV com protocolo,
            atendimento e linha do tempo.
          </p>
        </div>
        <div className="flex w-full flex-wrap items-start justify-start gap-2 lg:w-auto lg:justify-end">
          {podeCriar && (
            <form
              onSubmit={enviarFormulario}
              className="flex w-full flex-wrap gap-2 sm:w-auto"
            >
              <label className="flex h-10 w-full items-center gap-2 rounded-lg border border-slate-700 bg-slate-950 px-3 sm:w-72">
                <Mail size={16} className="shrink-0 text-slate-400" />
                <input
                  type="email"
                  value={emailFormulario}
                  onChange={(e) => setEmailFormulario(e.target.value)}
                  className="w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-500"
                  placeholder="E-mail do formulário"
                  required
                />
              </label>
              <button
                disabled={salvando}
                className="h-10 rounded-lg bg-slate-800 px-3 text-sm font-bold text-white hover:bg-slate-700 disabled:opacity-60"
              >
                Enviar
              </button>
              {import.meta.env.DEV && (
                <a
                  href={linkTesteSolicitacaoImagem}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-10 items-center rounded-lg border border-sky-500/40 bg-sky-500/10 px-3 text-sm font-bold text-sky-200 hover:border-sky-400 hover:bg-sky-500/20"
                >
                  Link teste
                </a>
              )}
            </form>
          )}
          <button
            onClick={carregarSolicitacoes}
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-700 px-4 text-sm font-bold text-slate-200 hover:border-sky-500 hover:text-white"
          >
            <RefreshCcw size={16} />
            Atualizar
          </button>
          {podeCriar && (
            <button
              onClick={abrirCriacao}
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-sky-600 px-4 text-sm font-bold text-white hover:bg-sky-500"
            >
              <Plus size={16} />
              Nova solicitação
            </button>
          )}
          {linkGerado && (
            <p className="w-full break-all text-right text-xs font-bold text-emerald-300">
              Link gerado: {linkGerado}
            </p>
          )}
        </div>
      </section>

      {erro && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-200">
          {erro}
        </div>
      )}

      <section className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/70 shadow-2xl shadow-black/20">
        <button
          type="button"
          onClick={() => setDashboardAberto((aberto) => !aberto)}
          className="flex w-full items-center justify-between gap-3 border-b border-slate-800 px-5 py-4 text-left"
        >
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-500/15 text-sky-300 ring-1 ring-sky-400/20">
              <BarChart3 size={20} />
            </span>
            <div>
              <h2 className="text-lg font-black text-white">
                Dashboard de Solicitações
              </h2>
              <p className="text-sm text-slate-400">
                Indicadores de atendimento, conclusão, locais e volume temporal.
              </p>
            </div>
          </div>
          <ChevronDown
            className={`text-slate-400 transition ${
              dashboardAberto ? "rotate-180" : ""
            }`}
            size={20}
          />
        </button>

        {dashboardAberto && (
          <div className="space-y-5 p-5">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <CardIndicadorImagem
                titulo="Total de solicitações"
                valor={resumo.total}
                detalhe={`${resumo.evidencias} evidência(s) | ${resumo.anexos} anexo(s)`}
                destaque="text-white"
                icone={<PieChart size={18} />}
              />
              <CardIndicadorImagem
                titulo="Tempo médio de conclusão"
                valor={formatarTempo(resumo.tempoMedioConclusao)}
                detalhe={`${resumo.concluidas} solicitação(ões) concluída(s)`}
                destaque="text-emerald-300"
                icone={<Timer size={18} />}
              />
              <CardIndicadorImagem
                titulo="Em atendimento"
                valor={resumo.atendimento}
                detalhe={`${resumo.aguardandoAtendimento} aguardando atendimento`}
                destaque="text-sky-300"
                icone={<Clock size={18} />}
              />
              <CardIndicadorImagem
                titulo="Conclusão"
                valor={`${resumo.percentualConclusao}%`}
                detalhe={`${resumo.criticas} crítica(s) | ${resumo.anuladas} anulada(s)`}
                destaque="text-amber-300"
                icone={<BarChart3 size={18} />}
              />
            </div>

            <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 text-sm font-black text-slate-200">
                      <CalendarDays size={18} className="text-sky-300" />
                      Solicitações por período
                    </div>
                    <p className="mt-1 text-sm text-slate-400">
                      Acompanhe o volume por dia, mês ou ano.
                    </p>
                  </div>
                  <select
                    value={periodoDashboard}
                    onChange={(event) =>
                      setPeriodoDashboard(
                        event.target.value as PeriodoDashboardSolicitacoes,
                      )
                    }
                    className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm font-bold text-white outline-none"
                  >
                    <option value="dia">Por dia</option>
                    <option value="mes">Por mês</option>
                    <option value="ano">Por ano</option>
                  </select>
                </div>

                <div className="space-y-3">
                  {resumo.temporal.length === 0 ? (
                    <p className="rounded-xl border border-dashed border-slate-700 p-5 text-center text-sm text-slate-400">
                      Nenhuma solicitação para montar o indicador temporal.
                    </p>
                  ) : (
                    resumo.temporal.map((item) => (
                      <div
                        key={item.chave}
                        className="rounded-xl border border-slate-800 bg-slate-950/70 p-3"
                      >
                        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <p className="text-sm font-black capitalize text-white">
                              {item.rotulo}
                            </p>
                            <p className="text-xs text-slate-500">
                              {item.concluidas} concluída(s), {item.emAtendimento} em
                              atendimento, {item.criticas} crítica(s)
                            </p>
                          </div>
                          <span className="rounded-full border border-sky-400/30 bg-sky-400/10 px-3 py-1 text-xs font-black text-sky-200">
                            {item.total}
                          </span>
                        </div>
                        <BarraProgresso
                          valor={item.total}
                          maior={maiorTemporal}
                          cor="bg-gradient-to-r from-sky-400 to-blue-500"
                        />
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <PainelRankingImagem
                  titulo="Locais com mais ocorrências"
                  icone={<MapPin size={18} />}
                  itens={resumo.locais}
                  maior={maiorLocal}
                  vazio="Nenhum local informado."
                />
                <PainelRankingImagem
                  titulo="Distribuição por status"
                  icone={<PieChart size={18} />}
                  itens={resumo.status}
                  maior={Math.max(1, ...resumo.status.map((item) => item.valor))}
                  vazio="Nenhum status encontrado."
                />
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <PainelRankingImagem
                titulo="Prioridades"
                icone={<BarChart3 size={18} />}
                itens={resumo.prioridades}
                maior={Math.max(1, ...resumo.prioridades.map((item) => item.valor))}
                vazio="Nenhuma prioridade encontrada."
              />
              <PainelRankingImagem
                titulo="Origem das solicitações"
                icone={<RefreshCcw size={18} />}
                itens={resumo.origens}
                maior={Math.max(1, ...resumo.origens.map((item) => item.valor))}
                vazio="Nenhuma origem encontrada."
              />
            </div>
          </div>
        )}
      </section>

      <section className="rounded-xl border border-slate-800 bg-slate-950/70">
        <div className="grid gap-3 border-b border-slate-800 p-4 lg:grid-cols-[1fr_220px_220px_auto]">
          <label className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2">
            <Search size={16} className="text-slate-400" />
            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-500"
              placeholder="Buscar protocolo, solicitante, local ou título"
            />
          </label>
          <select
            value={statusFiltro}
            onChange={(e) => setStatusFiltro(e.target.value)}
            className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm font-bold text-white outline-none"
          >
            {statusOpcoes.map((status) => (
              <option key={status || "todos"} value={status}>
                {status || "Todos os status"}
              </option>
            ))}
          </select>
          <select
            value={prioridadeFiltro}
            onChange={(e) => setPrioridadeFiltro(e.target.value)}
            className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm font-bold text-white outline-none"
          >
            {prioridades.map((prioridade) => (
              <option key={prioridade || "todas"} value={prioridade}>
                {prioridade || "Todas as prioridades"}
              </option>
            ))}
          </select>
          <button
            onClick={carregarSolicitacoes}
            className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-bold text-white hover:bg-slate-700"
          >
            Filtrar
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-800 text-sm">
            <thead className="bg-slate-900/80 text-left text-xs uppercase text-slate-400">
              <tr>
                <th className="px-4 py-3">Data</th>
                <th className="px-4 py-3">Protocolo</th>
                <th className="px-4 py-3">Solicitante</th>
                <th className="px-4 py-3">Título</th>
                <th className="px-4 py-3">Prioridade</th>
                <th className="px-4 py-3">Atendente</th>
                <th className="px-4 py-3">Tempo</th>
                <th className="px-4 py-3">Evidências</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {carregando ? (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center text-slate-400">
                    Carregando solicitações...
                  </td>
                </tr>
              ) : solicitacoes.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center text-slate-400">
                    Nenhuma solicitação encontrada.
                  </td>
                </tr>
              ) : (
                solicitacoes.map((item) => {
                  const evidencias = evidenciasDaSolicitacao(item);
                  const podeColetarEvidencia =
                    item.status === "Em Atendimento" &&
                    item.atendente?.id === usuarioLogado?.id;
                  const coletaBloqueada =
                    item.status === "Pausado" ||
                    (item.status === "Em Atendimento" &&
                      item.atendente?.id !== usuarioLogado?.id);

                  return (
                    <tr key={item.id} className="text-slate-200 hover:bg-slate-900/70">
                      <td className="px-4 py-3">{formatarData(item.createdAt)}</td>
                      <td className="px-4 py-3 font-bold text-white">{item.protocolo}</td>
                      <td className="px-4 py-3">{item.solicitanteNome}</td>
                      <td className="px-4 py-3">{item.titulo}</td>
                      <td className={`px-4 py-3 font-bold ${classePrioridade(item.prioridade)}`}>
                        {item.prioridade}
                      </td>
                      <td className="px-4 py-3">{item.atendente?.nome || "-"}</td>
                      <td className="px-4 py-3 font-mono text-xs font-bold text-slate-300">
                        {formatarTempo(tempoAcumuladoAtual(item, agoraTempo))}
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs font-bold text-slate-300">
                          {evidencias.length}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded-full border px-2 py-1 text-xs font-bold ${classeStatus(item.status)}`}>
                          {normalizarStatusSolicitacao(item.status)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <button title="Linha do tempo" onClick={() => atualizarDetalhe(item.id)} className="rounded-lg border border-slate-700 p-2 hover:border-sky-500">
                            <Eye size={16} />
                          </button>
                          <button title="Relatório PDF" onClick={() => abrirRelatorioPdf(item)} className="rounded-lg border border-slate-700 p-2 text-cyan-300 hover:border-cyan-500">
                            <FileText size={16} />
                          </button>
                          {podeEditar && item.status !== "Em Atendimento" && (
                            <button title="Editar" onClick={() => abrirEdicao(item)} className="rounded-lg border border-slate-700 p-2 hover:border-sky-500">
                              <Pencil size={16} />
                            </button>
                          )}
                          {podeEditar && ["Aguardando Atendimento", "Pausado"].includes(item.status) && (
                            <button title="Atender" onClick={() => acaoAtendimento(item)} className="rounded-lg border border-slate-700 p-2 text-sky-300 hover:border-sky-500">
                              <PlayCircle size={16} />
                            </button>
                          )}
                          {podeEditar && (
                            <button
                              title={
                                item.status === "Pausado"
                                  ? "Coleta desabilitada enquanto pausado"
                                  : "Coletar evidências"
                              }
                              onClick={() => setModalEvidencias(item)}
                              disabled={!podeColetarEvidencia}
                              className={`rounded-lg border p-2 ${
                                podeColetarEvidencia
                                  ? "border-slate-700 text-cyan-300 hover:border-cyan-500"
                                  : coletaBloqueada
                                    ? "border-slate-800 text-slate-600 opacity-60"
                                    : "hidden"
                              }`}
                            >
                              <ImagePlus size={16} />
                            </button>
                          )}
                          {podeEditar && item.status === "Em Atendimento" && item.atendente?.id === usuarioLogado?.id && (
                            <button title="Pausar" onClick={() => abrirModalPausa(item)} className="rounded-lg border border-slate-700 p-2 text-amber-300 hover:border-amber-500">
                              <PauseCircle size={16} />
                            </button>
                          )}
                          {podeEditar && item.status === "Em Atendimento" && item.atendente?.id !== usuarioLogado?.id && (
                            <button title="Assumir" onClick={() => setModalAssumir(item)} className="rounded-lg border border-slate-700 p-2 text-emerald-300 hover:border-emerald-500">
                              <UserCheck size={16} />
                            </button>
                          )}
                          {podeExcluir && (
                            <button title="Excluir" onClick={() => excluir(item)} className="rounded-lg border border-slate-700 p-2 text-red-300 hover:border-red-500">
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

      {modalForm && (
        <FormularioModal
          modo={modalForm}
          form={form}
          setForm={setForm}
          locais={locais}
          anexosExistentes={
            solicitacaoEditando ? anexosDaSolicitacao(solicitacaoEditando) : []
          }
          setAnexos={setAnexos}
          onClose={fecharFormulario}
          onSubmit={salvarFormulario}
          salvando={salvando}
        />
      )}

      {modalPausa && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4">
          <form onSubmit={pausarAtendimento} className="w-full max-w-2xl rounded-xl border border-slate-800 bg-slate-950 p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-black text-white">Pausar atendimento</h2>
              <button type="button" onClick={fecharModalPausa} className="rounded-lg p-2 text-slate-400 hover:bg-slate-800">
                <X size={18} />
              </button>
            </div>
            <Campo label="Motivo">
              <input value={pausa.motivo} onChange={(e) => setPausa({ ...pausa, motivo: e.target.value })} className="input-dark" required />
            </Campo>
            <Campo label="Andamento">
              <textarea value={pausa.andamento} onChange={(e) => setPausa({ ...pausa, andamento: e.target.value })} className="input-dark min-h-28" required />
            </Campo>
            <div className="mt-4 rounded-xl border border-slate-800 bg-slate-900/60 p-3">
              <div className="mb-3 flex items-center justify-between gap-3">
                <label className="flex items-center gap-2 text-sm font-black text-slate-100">
                  <Camera size={16} className="text-cyan-300" />
                  Câmeras em foco
                </label>
                <span className="rounded-full border border-cyan-400/30 bg-cyan-500/10 px-2 py-1 text-[11px] font-bold text-cyan-100">
                  {camerasPausaSelecionadas.length} selecionada(s)
                </span>
              </div>
              {carregandoCameras ? (
                <p className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-400">
                  Carregando câmeras conectadas...
                </p>
              ) : camerasConectadas.length > 0 ? (
                <div className="max-h-48 space-y-2 overflow-y-auto pr-1">
                  {camerasConectadas.map((camera) => {
                    const selecionada = camerasPausaSelecionadas.includes(camera.id);
                    return (
                      <label
                        key={camera.id}
                        className={`flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-2 transition ${
                          selecionada
                            ? "border-cyan-400/60 bg-cyan-500/15 text-white"
                            : "border-slate-800 bg-slate-950/70 text-slate-300 hover:border-slate-600"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selecionada}
                          onChange={() => alternarCameraPausa(camera.id)}
                          className="mt-1 h-4 w-4 accent-cyan-500"
                        />
                        <span className="min-w-0">
                          <span className="block text-sm font-black">
                            Câmera {camera.numeroCamera}
                            {camera.nomeCamera ? ` - ${camera.nomeCamera}` : ""}
                          </span>
                          <span className="block text-xs text-slate-400">
                            {camera.areaMonitorada} | {camera.localInstalado}
                          </span>
                        </span>
                      </label>
                    );
                  })}
                </div>
              ) : (
                <p className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-400">
                  Nenhuma câmera conectada encontrada para esta unidade.
                </p>
              )}
            </div>
            <button disabled={salvando} className="mt-4 w-full rounded-lg bg-amber-600 px-4 py-2 font-bold text-white hover:bg-amber-500 disabled:opacity-60">
              Salvar pausa
            </button>
          </form>
        </div>
      )}

      {modalAssumir && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4">
          <form onSubmit={assumirAtendimento} className="w-full max-w-lg rounded-xl border border-slate-800 bg-slate-950 p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-black text-white">Assumir atendimento</h2>
              <button type="button" onClick={() => setModalAssumir(null)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-800">
                <X size={18} />
              </button>
            </div>
            <div className="mb-4 rounded-lg border border-slate-800 bg-slate-900/70 px-3 py-2 text-sm text-slate-300">
              Atendimento atual: <b className="text-white">{modalAssumir.atendente?.nome || "Outro usuário"}</b>
            </div>
            <Campo label="Motivo">
              <input value={assumir.motivo} onChange={(e) => setAssumir({ ...assumir, motivo: e.target.value })} className="input-dark" required />
            </Campo>
            <Campo label="Descrição">
              <textarea value={assumir.descricao} onChange={(e) => setAssumir({ ...assumir, descricao: e.target.value })} className="input-dark min-h-28" required />
            </Campo>
            <button disabled={salvando} className="mt-4 w-full rounded-lg bg-emerald-600 px-4 py-2 font-bold text-white hover:bg-emerald-500 disabled:opacity-60">
              Assumir atendimento
            </button>
          </form>
        </div>
      )}

      {modalEvidencias && (
        <EvidenciasModal
          solicitacao={modalEvidencias}
          usuarioLogado={usuarioLogado}
          salvando={salvando}
          onClose={() => setModalEvidencias(null)}
          onSubmit={salvarEvidencias}
          onDelete={excluirEvidencia}
        />
      )}

      {detalhe && !modalForm && (
        <DetalheSolicitacao
          detalhe={detalhe}
          agoraTempo={agoraTempo}
          onOpenEvidencias={() => setModalEvidencias(detalhe)}
          onClose={() => setDetalhe(null)}
        />
      )}
    </div>
  );
}

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="mb-3 block text-sm font-bold text-slate-300">
      <span className="mb-1 block">{label}</span>
      {children}
    </label>
  );
}

function TextoComResumo({
  texto,
  onAbrir,
}: {
  texto?: string | null;
  onAbrir: (texto: string) => void;
}) {
  const textoLimpo = texto?.trim();
  if (!textoLimpo) {
    return <span className="text-slate-400">-</span>;
  }

  return (
    <span className="inline text-sm font-semibold leading-6 text-slate-200">
      {resumirTexto(textoLimpo)}
      <button
        type="button"
        onClick={() => onAbrir(textoLimpo)}
        className="ml-2 inline-flex rounded-full border border-sky-500/30 bg-sky-500/10 px-2 py-0.5 text-[11px] font-black text-sky-200 transition hover:border-sky-400 hover:bg-sky-500/20"
      >
        ver mais
      </button>
    </span>
  );
}

function PopupTextoCompleto({
  titulo,
  texto,
  onClose,
}: {
  titulo: string;
  texto: string;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-700 bg-slate-950 shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-800 bg-slate-900/80 p-5">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-sky-300">
              Linha do tempo
            </p>
            <h3 className="mt-1 text-xl font-black text-white">{titulo}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-800 hover:text-white"
          >
            <X size={18} />
          </button>
        </div>
        <div className="max-h-[60vh] overflow-y-auto p-5">
          <p className="whitespace-pre-wrap break-words rounded-xl border border-slate-800 bg-slate-900/70 p-4 text-sm leading-7 text-slate-100">
            {texto}
          </p>
        </div>
        <div className="flex justify-end border-t border-slate-800 p-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-black text-white transition hover:bg-blue-500"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}

function CardIndicadorImagem({
  titulo,
  valor,
  detalhe,
  destaque,
  icone,
}: {
  titulo: string;
  valor: string | number;
  detalhe: string;
  destaque: string;
  icone: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 shadow-lg shadow-black/10">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">
          {titulo}
        </p>
        <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-700 bg-slate-950 text-sky-300">
          {icone}
        </span>
      </div>
      <p className={`text-3xl font-black ${destaque}`}>{valor}</p>
      <p className="mt-2 text-xs text-slate-400">{detalhe}</p>
    </div>
  );
}

function BarraProgresso({
  valor,
  maior,
  cor,
}: {
  valor: number;
  maior: number;
  cor: string;
}) {
  const largura = valor > 0 ? Math.max(5, (valor / maior) * 100) : 0;
  return (
    <div className="h-3 overflow-hidden rounded-full bg-slate-800">
      <div className={`h-full rounded-full ${cor}`} style={{ width: `${largura}%` }} />
    </div>
  );
}

function PainelRankingImagem({
  titulo,
  icone,
  itens,
  maior,
  vazio,
}: {
  titulo: string;
  icone: React.ReactNode;
  itens: { label: string; valor: number }[];
  maior: number;
  vazio: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
      <div className="mb-4 flex items-center gap-2 text-sm font-black text-slate-200">
        <span className="text-sky-300">{icone}</span>
        {titulo}
      </div>
      <div className="space-y-3">
        {itens.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-700 p-4 text-center text-sm text-slate-400">
            {vazio}
          </p>
        ) : (
          itens.map((item) => (
            <div key={item.label}>
              <div className="mb-1 flex items-center justify-between gap-3 text-xs">
                <span className="min-w-0 truncate font-bold text-slate-200">
                  {item.label}
                </span>
                <span className="font-black text-white">{item.valor}</span>
              </div>
              <BarraProgresso
                valor={item.valor}
                maior={maior}
                cor="bg-gradient-to-r from-cyan-400 to-sky-500"
              />
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function FormularioModal({
  modo,
  form,
  setForm,
  locais,
  anexosExistentes,
  setAnexos,
  onClose,
  onSubmit,
  salvando,
}: {
  modo: "criar" | "editar";
  form: typeof formInicial;
  setForm: (form: typeof formInicial) => void;
  locais: LocalTerminal[];
  anexosExistentes: Anexo[];
  setAnexos: (files: FileList | null) => void;
  onClose: () => void;
  onSubmit: (event: FormEvent) => void;
  salvando: boolean;
}) {
  const [imagemAberta, setImagemAberta] = useState<{
    anexos: Anexo[];
    indice: number;
    titulo: string;
  } | null>(null);
  const anexosImagem = anexosExistentes.filter(ehImagemAnexo);

  function alterarDataInicial(dataOcorrencia: string) {
    setForm({
      ...form,
      dataOcorrencia,
      dataFinalOcorrencia:
        !form.dataFinalOcorrencia ||
        form.dataFinalOcorrencia === form.dataOcorrencia
          ? dataOcorrencia
          : form.dataFinalOcorrencia,
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4">
      <form onSubmit={onSubmit} className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-xl border border-slate-800 bg-slate-950 p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-black text-white">
            {modo === "criar" ? "Nova solicitação" : "Editar solicitação"}
          </h2>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-800">
            <X size={18} />
          </button>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <Campo label="Título">
            <input value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} className="input-dark" required />
          </Campo>
          <Campo label="Nome do solicitante">
            <input value={form.solicitanteNome} onChange={(e) => setForm({ ...form, solicitanteNome: e.target.value })} className="input-dark" required />
          </Campo>
          <Campo label="E-mail">
            <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="input-dark" />
          </Campo>
          <Campo label="Setor">
            <input value={form.setor} onChange={(e) => setForm({ ...form, setor: e.target.value })} className="input-dark" />
          </Campo>
          <Campo label="Cargo">
            <input value={form.cargo} onChange={(e) => setForm({ ...form, cargo: e.target.value })} className="input-dark" />
          </Campo>
          <Campo label="Local">
            <LocalComFiltro
              valor={form.local}
              locais={locais}
              onChange={(local) => setForm({ ...form, local })}
            />
          </Campo>
          <Campo label="Data da ocorrência">
            <input type="date" value={form.dataOcorrencia} onChange={(e) => alterarDataInicial(e.target.value)} className="input-dark" />
          </Campo>
          <Campo label="Data final">
            <input type="date" value={form.dataFinalOcorrencia} min={form.dataOcorrencia || undefined} onChange={(e) => setForm({ ...form, dataFinalOcorrencia: e.target.value })} className="input-dark" />
          </Campo>
          <Campo label="Hora inicial">
            <input type="time" value={form.horaInicial} onChange={(e) => setForm({ ...form, horaInicial: e.target.value })} className="input-dark" />
          </Campo>
          <Campo label="Hora final">
            <input type="time" value={form.horaFinal} onChange={(e) => setForm({ ...form, horaFinal: e.target.value })} className="input-dark" />
          </Campo>
          <Campo label="Prioridade">
            <select value={form.prioridade} onChange={(e) => setForm({ ...form, prioridade: e.target.value })} className="input-dark">
              {prioridades.filter(Boolean).map((item) => <option key={item}>{item}</option>)}
            </select>
          </Campo>
          {modo === "editar" && (
            <Campo label="Status">
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="input-dark">
                {statusOpcoes.filter(Boolean).map((item) => <option key={item}>{item}</option>)}
              </select>
            </Campo>
          )}
        </div>
        <Campo label="Descrição">
          <textarea value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} className="input-dark min-h-28" />
        </Campo>
        {form.status === "Concluído" && (
          <Campo label="Motivo da conclusão">
            <textarea value={form.descricaoConclusao} onChange={(e) => setForm({ ...form, descricaoConclusao: e.target.value })} className="input-dark min-h-24" required />
          </Campo>
        )}
        {form.status === "Anulado" && (
          <Campo label="Motivo da anulação">
            <textarea value={form.motivoAnulacao} onChange={(e) => setForm({ ...form, motivoAnulacao: e.target.value })} className="input-dark min-h-24" required />
          </Campo>
        )}
        {modo === "editar" && (
          <div className="mb-3 rounded-lg border border-slate-800 bg-slate-900/60 p-3">
            <p className="mb-2 text-sm font-black text-slate-200">
              Anexos já enviados
            </p>
            {anexosExistentes.length > 0 ? (
              <div className="grid gap-2">
                {anexosExistentes.map((anexo) => (
                  <button
                    type="button"
                    key={anexo.id}
                    onClick={() => {
                      const indice = anexosImagem.findIndex((item) => item.id === anexo.id);
                      if (indice >= 0) {
                        setImagemAberta({
                          anexos: anexosImagem,
                          indice,
                          titulo: "Anexos já enviados",
                        });
                      }
                    }}
                    disabled={!ehImagemAnexo(anexo)}
                    className="flex items-center justify-between gap-3 rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm font-bold text-sky-300 hover:border-sky-500"
                  >
                    <span className="min-w-0 truncate">{anexo.nomeOriginal}</span>
                    <span className="shrink-0 text-xs text-slate-500">
                      {ehImagemAnexo(anexo) ? "Visualizar" : "Arquivo"}
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-sm font-semibold text-slate-500">
                Nenhum anexo enviado nesta solicitação.
              </p>
            )}
          </div>
        )}
        <Campo label="Anexos">
          <input type="file" multiple onChange={(e) => setAnexos(e.target.files)} className="block w-full text-sm text-slate-300 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-800 file:px-3 file:py-2 file:font-bold file:text-white" />
        </Campo>
        <button disabled={salvando} className="mt-2 w-full rounded-lg bg-sky-600 px-4 py-2 font-bold text-white hover:bg-sky-500 disabled:opacity-60">
          Salvar
        </button>
      </form>
      {imagemAberta && (
        <LightboxImagem
          anexos={imagemAberta.anexos}
          indiceInicial={imagemAberta.indice}
          titulo={imagemAberta.titulo}
          onClose={() => setImagemAberta(null)}
        />
      )}
    </div>
  );
}

function LocalComFiltro({
  valor,
  locais,
  onChange,
}: {
  valor: string;
  locais: LocalTerminal[];
  onChange: (valor: string) => void;
}) {
  const listaId = "locais-solicitacao-imagem";
  const locaisFiltrados = locais.filter((local) => local.status === "Ativo");

  return (
    <>
      <input
        value={valor}
        onChange={(e) => onChange(e.target.value)}
        list={listaId}
        className="input-dark"
        placeholder="Digite para filtrar um local cadastrado"
        autoComplete="off"
      />
      <datalist id={listaId}>
        {locaisFiltrados.map((local) => (
          <option key={local.id} value={local.nome}>
            {local.tipo ? `${local.tipo} · ${local.unidade}` : local.unidade}
          </option>
        ))}
      </datalist>
      {locaisFiltrados.length === 0 && (
        <span className="mt-1 block text-xs font-medium text-amber-300">
          Nenhum local ativo encontrado para a unidade atual.
        </span>
      )}
    </>
  );
}

function EvidenciasModal({
  solicitacao,
  usuarioLogado,
  salvando,
  onClose,
  onSubmit,
  onDelete,
}: {
  solicitacao: SolicitacaoImagem;
  usuarioLogado: UsuarioResumo | null;
  salvando: boolean;
  onClose: () => void;
  onSubmit: (arquivos: File[]) => Promise<void>;
  onDelete: (anexo: Anexo) => Promise<void>;
}) {
  const [arquivos, setArquivos] = useState<File[]>([]);
  const [inputKey, setInputKey] = useState(0);
  const [imagemAberta, setImagemAberta] = useState<{
    anexos: Anexo[];
    indice: number;
    titulo: string;
  } | null>(null);
  const evidencias = evidenciasDaSolicitacao(solicitacao);
  const evidenciasImagem = evidencias.filter(ehImagemAnexo);
  const podeAlterar =
    solicitacao.status === "Em Atendimento" &&
    solicitacao.atendente?.id === usuarioLogado?.id;

  function selecionarArquivos(event: ChangeEvent<HTMLInputElement>) {
    const selecionados = Array.from(event.target.files || []).filter((arquivo) =>
      arquivo.type.startsWith("image/"),
    );
    setArquivos(selecionados);
  }

  async function enviar(event: FormEvent) {
    event.preventDefault();
    if (!podeAlterar || arquivos.length === 0) return;
    await onSubmit(arquivos);
    setArquivos([]);
    setInputKey((valor) => valor + 1);
  }

  return (
    <div className="fixed inset-0 z-[75] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-xl border border-slate-800 bg-slate-950 p-5 shadow-2xl">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase text-cyan-300">
              {solicitacao.protocolo}
            </p>
            <h3 className="mt-1 text-xl font-black text-white">
              Coleta de evidências
            </h3>
            <p className="mt-1 text-sm font-semibold text-slate-400">
              Evidências coletadas: {evidencias.length}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-800"
          >
            <X size={18} />
          </button>
        </div>

        {podeAlterar ? (
          <form onSubmit={enviar} className="mb-5 rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-4">
            <Campo label="Adicionar print ou imagem">
              <input
                key={inputKey}
                type="file"
                accept="image/*"
                multiple
                onChange={selecionarArquivos}
                className="input-dark"
              />
            </Campo>
            <button
              disabled={salvando || arquivos.length === 0}
              className="inline-flex items-center gap-2 rounded-lg bg-cyan-600 px-4 py-2 text-sm font-black text-white hover:bg-cyan-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <ImagePlus size={16} />
              Salvar evidência
            </button>
          </form>
        ) : (
          <p className="mb-5 rounded-lg border border-slate-800 bg-slate-900/70 px-4 py-3 text-sm font-bold text-slate-400">
            A coleta fica disponível somente durante o atendimento pelo atendente atual.
          </p>
        )}

        {evidencias.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2">
            {evidencias.map((anexo) => (
              <div
                key={anexo.id}
                className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/70"
              >
                <button
                  type="button"
                  onClick={() => {
                    const indice = evidenciasImagem.findIndex((item) => item.id === anexo.id);
                    if (indice >= 0) {
                      setImagemAberta({
                        anexos: evidenciasImagem,
                        indice,
                        titulo: "Evidências coletadas",
                      });
                    }
                  }}
                  className="block w-full"
                >
                  <img
                    src={`/${anexo.caminho}`}
                    alt={anexo.nomeOriginal}
                    className="aspect-video w-full bg-slate-900 object-contain"
                  />
                </button>
                <div className="flex items-center justify-between gap-3 border-t border-slate-800 px-3 py-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-slate-200">
                      {anexo.nomeOriginal}
                    </p>
                    <p className="text-[11px] font-bold text-slate-500">
                      {formatarData(anexo.createdAt)}
                    </p>
                  </div>
                  {podeAlterar && (
                    <button
                      type="button"
                      disabled={salvando}
                      onClick={() => onDelete(anexo)}
                      className="shrink-0 rounded-lg border border-red-500/30 p-2 text-red-300 hover:border-red-400 disabled:opacity-60"
                      title="Excluir evidência"
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="rounded-lg border border-slate-800 bg-slate-900/70 px-4 py-3 text-sm text-slate-300">
            Nenhuma evidência coletada até agora.
          </p>
        )}
        {imagemAberta && (
          <LightboxImagem
            anexos={imagemAberta.anexos}
            indiceInicial={imagemAberta.indice}
            titulo={imagemAberta.titulo}
            onClose={() => setImagemAberta(null)}
          />
        )}
      </div>
    </div>
  );
}

function LightboxImagem({
  anexos,
  indiceInicial,
  titulo,
  onClose,
}: {
  anexos: Anexo[];
  indiceInicial: number;
  titulo: string;
  onClose: () => void;
}) {
  const [indice, setIndice] = useState(
    Math.min(Math.max(indiceInicial, 0), Math.max(anexos.length - 1, 0)),
  );
  const anexo = anexos[indice];
  const temNavegacao = anexos.length > 1;

  useEffect(() => {
    if (!anexos.length) return;

    function atalhos(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowLeft") {
        setIndice((atual) => (atual - 1 + anexos.length) % anexos.length);
      }
      if (event.key === "ArrowRight") {
        setIndice((atual) => (atual + 1) % anexos.length);
      }
    }

    window.addEventListener("keydown", atalhos);
    return () => window.removeEventListener("keydown", atalhos);
  }, [anexos.length, onClose]);

  if (!anexo) return null;

  return (
    <div className="fixed inset-0 z-[95] flex items-center justify-center bg-slate-950/90 p-4 backdrop-blur-md">
      <div className="flex max-h-[94vh] w-full max-w-6xl flex-col overflow-hidden rounded-xl border border-white/10 bg-slate-950 shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-800 px-4 py-3">
          <div className="min-w-0">
            <p className="text-xs font-black uppercase text-sky-300">{titulo}</p>
            <h3 className="mt-1 truncate text-lg font-black text-white">
              {anexo.nomeOriginal}
            </h3>
            <p className="mt-0.5 text-xs font-bold text-slate-500">
              {indice + 1} de {anexos.length}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white"
            title="Fechar"
          >
            <X size={20} />
          </button>
        </div>

        <div className="relative flex min-h-0 flex-1 items-center justify-center bg-slate-900/80 p-3">
          {temNavegacao && (
            <button
              type="button"
              onClick={() =>
                setIndice((atual) => (atual - 1 + anexos.length) % anexos.length)
              }
              className="absolute left-3 top-1/2 z-10 -translate-y-1/2 rounded-full border border-white/10 bg-slate-950/80 p-3 text-white shadow-lg hover:bg-slate-800"
              title="Imagem anterior"
            >
              <ChevronLeft size={22} />
            </button>
          )}

          <img
            src={`/${anexo.caminho}`}
            alt={anexo.nomeOriginal}
            className="max-h-[76vh] w-full rounded-lg object-contain"
          />

          {temNavegacao && (
            <button
              type="button"
              onClick={() => setIndice((atual) => (atual + 1) % anexos.length)}
              className="absolute right-3 top-1/2 z-10 -translate-y-1/2 rounded-full border border-white/10 bg-slate-950/80 p-3 text-white shadow-lg hover:bg-slate-800"
              title="Próxima imagem"
            >
              <ChevronRight size={22} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function DetalheSolicitacao({
  detalhe,
  agoraTempo,
  onOpenEvidencias,
  onClose,
}: {
  detalhe: SolicitacaoImagem;
  agoraTempo: number;
  onOpenEvidencias: () => void;
  onClose: () => void;
}) {
  const [anexosAbertos, setAnexosAbertos] = useState(false);
  const [imagemAberta, setImagemAberta] = useState<{
    anexos: Anexo[];
    indice: number;
    titulo: string;
  } | null>(null);
  const [textoAberto, setTextoAberto] = useState<{
    titulo: string;
    texto: string;
  } | null>(null);
  const anexos = anexosDaSolicitacao(detalhe);
  const evidencias = evidenciasDaSolicitacao(detalhe);
  const anexosImagem = anexos.filter(ehImagemAnexo);

  return (
    <aside className="fixed inset-y-0 right-0 z-40 w-full max-w-3xl overflow-y-auto border-l border-slate-800 bg-slate-950 p-5 shadow-2xl">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-bold text-sky-300">{detalhe.protocolo}</p>
          <h2 className="text-2xl font-black text-white">{detalhe.titulo}</h2>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {anexos.length > 0 && (
            <button
              type="button"
              onClick={() => setAnexosAbertos(true)}
              className="inline-flex items-center gap-2 rounded-lg border border-sky-500/40 bg-sky-500/10 px-3 py-2 text-xs font-black text-sky-200 hover:border-sky-400 hover:bg-sky-500/20"
            >
              <Eye size={15} />
              Ver anexos
            </button>
          )}
          <button onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-800">
            <X size={18} />
          </button>
        </div>
      </div>

      <div className="grid gap-3 text-sm text-slate-300">
        <p><b>Solicitante:</b> {detalhe.solicitanteNome}</p>
        <p><b>Atendente:</b> {detalhe.atendente?.nome || "-"}</p>
        <p><b>Tempo acumulado:</b> {formatarTempo(tempoAcumuladoAtual(detalhe, agoraTempo))}</p>
        <p className="flex flex-wrap items-center gap-2">
          <b>Evidências coletadas:</b> {evidencias.length}
          {evidencias.length > 0 && (
            <button
              type="button"
              onClick={onOpenEvidencias}
              className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-2 py-0.5 text-[11px] font-black text-cyan-200 hover:border-cyan-400"
            >
              Ver evidências
            </button>
          )}
        </p>
        <p><b>Origem:</b> {detalhe.origem}</p>
        <p><b>Local:</b> {detalhe.local || "-"}</p>
        <p><b>Ocorrência:</b> {formatarPeriodoOcorrencia(detalhe)}</p>
        <div>
          <b>Descrição:</b>{" "}
          <TextoComResumo
            texto={detalhe.descricao}
            onAbrir={(texto) =>
              setTextoAberto({ titulo: "Descrição da solicitação", texto })
            }
          />
        </div>
      </div>

      <section className="mt-6">
        <h3 className="mb-3 flex items-center gap-2 text-lg font-black text-white">
          <Clock size={18} />
          Linha do tempo
        </h3>
        <div className="relative space-y-4 before:absolute before:left-[11px] before:top-2 before:h-[calc(100%-16px)] before:w-px before:bg-slate-800">
          {(detalhe.historico || []).map((item) => {
            const evidenciasEvento = evidenciasDoHistorico(item, evidencias).filter(ehImagemAnexo);
            const miniaturas = evidenciasEvento.slice(0, 3);
            const excedente = Math.max(0, evidenciasEvento.length - miniaturas.length);
            const textoDoEvento = textoHistorico(item);
            const camerasBusca = camerasBuscaDoHistorico(item);

            return (
              <div key={item.id} className="relative flex gap-3">
                <span className={`mt-1 h-5 w-5 shrink-0 rounded-full border-4 border-slate-950 ring-1 ${classeEvento(item.tipoEvento)}`} />
                <div className="min-w-0 flex-1 rounded-xl border border-slate-800 bg-slate-900/60 p-3 shadow-lg shadow-black/10">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-black uppercase tracking-normal ${classeEvento(item.tipoEvento)}`}>
                      {rotuloEvento(item)}
                    </span>
                    <span className="text-[11px] font-bold text-slate-500">
                      {formatarData(item.createdAt)}
                    </span>
                  </div>
                  <div className="mt-2">
                    <TextoComResumo
                      texto={textoDoEvento}
                      onAbrir={(texto) =>
                        setTextoAberto({
                          titulo: rotuloEvento(item),
                          texto,
                        })
                      }
                    />
                  </div>
                  {camerasBusca.length > 0 && (
                    <div className="mt-3 rounded-lg border border-cyan-400/20 bg-cyan-500/10 p-3">
                      <p className="mb-2 flex items-center gap-2 text-xs font-black uppercase text-cyan-100">
                        <Camera size={14} />
                        Câmeras utilizadas na busca:
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {camerasBusca.map((camera) => (
                          <span
                            key={camera.id}
                            className="rounded-full border border-cyan-300/20 bg-slate-950/70 px-3 py-1 text-xs font-bold text-cyan-50"
                          >
                            {rotuloCameraFoco(camera)}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {evidenciasEvento.length > 0 && (
                    <button
                      type="button"
                      onClick={onOpenEvidencias}
                      className="mt-3 flex flex-wrap items-center gap-2"
                      title="Visualizar evidências"
                    >
                      {miniaturas.map((anexo) => (
                        <span
                          key={anexo.id}
                          className="h-14 w-20 overflow-hidden rounded-lg border border-cyan-400/30 bg-slate-950 shadow-sm shadow-black/20"
                        >
                          <img
                            src={`/${anexo.caminho}`}
                            alt={anexo.nomeOriginal}
                            className="h-full w-full object-cover"
                          />
                        </span>
                      ))}
                      {excedente > 0 && (
                        <span className="flex h-14 w-20 items-center justify-center rounded-lg border border-cyan-400/30 bg-cyan-500/10 text-sm font-black text-cyan-100">
                          +{excedente}
                        </span>
                      )}
                    </button>
                  )}
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] font-bold text-slate-500">
                    <span className="rounded-full border border-slate-700 bg-slate-950 px-2 py-1 text-slate-300">
                      {rotuloResponsavelEvento(item)}: {item.usuario?.nome || item.usuarioNome || "Sistema"}
                    </span>
                    {item.statusAnterior && item.statusNovo && (
                      <span className="rounded-full border border-slate-700 bg-slate-950 px-2 py-1 text-slate-300">
                        {normalizarStatusSolicitacao(item.statusAnterior)} → {normalizarStatusSolicitacao(item.statusNovo)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          {!detalhe.historico?.length && <p className="text-sm text-slate-400">Sem eventos registrados.</p>}
        </div>
      </section>

      {anexosAbertos && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-xl border border-slate-800 bg-slate-950 p-5 shadow-2xl">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase text-sky-300">
                  {detalhe.protocolo}
                </p>
                <h3 className="mt-1 text-xl font-black text-white">
                  Anexos da solicitação
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setAnexosAbertos(false)}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-800"
              >
                <X size={18} />
              </button>
            </div>

            {anexosImagem.length > 0 && (
              <div className="grid gap-4 md:grid-cols-2">
                {anexosImagem.map((anexo) => (
                  <button
                    type="button"
                    key={anexo.id}
                    onClick={() =>
                      setImagemAberta({
                        anexos: anexosImagem,
                        indice: anexosImagem.findIndex((item) => item.id === anexo.id),
                        titulo: "Anexos da solicitação",
                      })
                    }
                    className="group overflow-hidden rounded-xl border border-slate-800 bg-slate-900/70"
                  >
                    <img
                      src={`/${anexo.caminho}`}
                      alt={anexo.nomeOriginal}
                      className="aspect-video w-full bg-slate-900 object-contain transition group-hover:scale-[1.01]"
                    />
                    <div className="border-t border-slate-800 px-3 py-2">
                      <p className="truncate text-sm font-bold text-slate-200">
                        {anexo.nomeOriginal}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {anexosImagem.length === 0 && (
              <p className="rounded-lg border border-slate-800 bg-slate-900/70 px-4 py-3 text-sm text-slate-300">
                Nenhuma imagem encontrada nos anexos desta solicitação.
              </p>
            )}

            <div className="mt-5 grid gap-2">
              {anexos.map((anexo) => (
                <button
                  type="button"
                  key={anexo.id}
                  onClick={() => {
                    const indice = anexosImagem.findIndex((item) => item.id === anexo.id);
                    if (indice >= 0) {
                      setImagemAberta({
                        anexos: anexosImagem,
                        indice,
                        titulo: "Anexos da solicitação",
                      });
                    }
                  }}
                  disabled={!ehImagemAnexo(anexo)}
                  className="flex items-center justify-between gap-3 rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2 text-sm font-bold text-sky-300 hover:border-sky-500"
                >
                  <span className="min-w-0 truncate">{anexo.nomeOriginal}</span>
                  <span className="shrink-0 text-xs text-slate-500">
                    {ehImagemAnexo(anexo) ? "Visualizar" : "Arquivo"}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
      {imagemAberta && (
        <LightboxImagem
          anexos={imagemAberta.anexos}
          indiceInicial={imagemAberta.indice}
          titulo={imagemAberta.titulo}
          onClose={() => setImagemAberta(null)}
        />
      )}
      {textoAberto && (
        <PopupTextoCompleto
          titulo={textoAberto.titulo}
          texto={textoAberto.texto}
          onClose={() => setTextoAberto(null)}
        />
      )}
    </aside>
  );
}
