import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "../../services/api";
import LexicalEditor from "../../components/editor/LexicalEditor";
import { podeAnalisar } from "../../utils/permissoes";
import { AutoSaveStatus } from "../../components/ui/AutoSaveStatus";
import { useAutoSaveDraft } from "../../hooks/useAutoSaveDraft";
import { PdfLightbox } from "../../components/ui/PdfLightbox";
import { solicitarPinOperacional } from "../../utils/pinPrompt";
import { AtSign, Ban, ClipboardCheck, Edit3, FileSearch, FileText, FileUp, Loader2, MapPin, Mic, Sparkles, Square, Tags, Upload, Users, X } from "lucide-react";

type Envolvido = {
  tipoEnvolvimento: string;
  nome: string;
  tipoDocumento: string;
  documento: string;
  empresa: string;
  possuiVeiculo: boolean;
  placa: string;
  reboque: string;
  relato: string;
};

type Ocorrencia = {
  id: number;
  codigo: string;
  assunto: string;
  local: string;
  natureza: string;
  subNatureza: string;
  status: string;
  dataOcorrencia: string;
  relatoSeguranca?: string;
  acoesTomadas?: string;
  impactoOperacional?: string;
  envolvidos: Envolvido[];
  anexos?: Anexo[];
  analise?: AnaliseOcorrencia | null;
  investigacao?: InvestigacaoVinculada | null;
  fluxoStatus?: string;
  assinaturaAprovacaoValida?: boolean;
};

type UsuarioMencao = {
  id: number;
  nome: string;
  apelido?: string;
  email: string;
};

type ComentarioInterno = {
  id: number;
  comentario: string;
  createdAt: string;
  autor: { nome: string; apelido?: string };
};

type Anexo = {
  id: number;
  nomeOriginal: string;
  caminho: string;
  tipo: string;
};

type AnaliseOcorrencia = {
  id: number;
  status: string;
  prejuizoFinanceiro: string;
  conclusaoAnalise?: string;
};

type InvestigacaoVinculada = {
  id: number;
  codigo?: string | null;
  status?: string;
  fluxoStatus?: string;
  createdAt: string;
  numeroOcorrencia?: string;
};

type NaturezaCadastro = {
  id: number;
  nome: string;
  subNaturezas: {
    id: number;
    nome: string;
  }[];
};

type LocalCadastro = {
  id: number;
  nome: string;
  areaSensivel: boolean;
};

type AreaRecorte = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type AssistenteRelato = {
  aberto: boolean;
  envolvidoIndex: number | null;
  arquivo: File | null;
  previewUrl: string;
  sugestao: string;
  aviso: string;
  erro: string;
  carregando: boolean;
  recorte: AreaRecorte | null;
};

type AssistenteAudioRelato = {
  envolvidoIndex: number | null;
  gravando: boolean;
  transcrevendo: boolean;
  erro: string;
  aviso: string;
};

type ApiErro = {
  response?: {
    data?: {
      error?: string;
      detalhe?: string;
    };
  };
};

const envolvidoVazio: Envolvido = {
  tipoEnvolvimento: "Condutor",
  nome: "",
  tipoDocumento: "CPF",
  documento: "",
  empresa: "",
  possuiVeiculo: false,
  placa: "",
  reboque: "",
  relato: "",
};

type ImpactoOperacional = {
  dataHoraTermino: string;
  placaUltimoVeiculoFila: string;
  dataHoraIdentificacaoUltimoVeiculo: string;
  dataHoraChegadaBalanca: string;
  quantidadeCaminhoesFila: string;
  quantidadeAgendamentosAfetados: string;
  operacoesImpactadas: string[];
  houveAtrasoOperacional: string;
  tratativas: string[];
};

const operacoesImpactadas = ["Importação", "Exportação", "Scanner", "Gate", "Armazém"];
const tratativasImpacto = [
  "Comunicação ao CCOS",
  "Comunicação à operação",
  "Comunicação aos transportadores",
  "Acionamento da autoridade portuária",
  "Monitoramento da situação",
];

function impactoOperacionalVazio(): ImpactoOperacional {
  return {
    dataHoraTermino: "",
    placaUltimoVeiculoFila: "",
    dataHoraIdentificacaoUltimoVeiculo: "",
    dataHoraChegadaBalanca: "",
    quantidadeCaminhoesFila: "",
    quantidadeAgendamentosAfetados: "",
    operacoesImpactadas: [],
    houveAtrasoOperacional: "",
    tratativas: [],
  };
}

function ehImpactoOperacionalExterno(natureza: string) {
  return natureza.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase() === "impacto operacional externo";
}

function lerImpactoOperacional(valor?: unknown): ImpactoOperacional {
  try {
    const dados = typeof valor === "string" ? JSON.parse(valor) : valor;
    return { ...impactoOperacionalVazio(), ...(dados && typeof dados === "object" ? dados : {}) };
  } catch {
    return impactoOperacionalVazio();
  }
}

function normalizarPlacaFila(valor: string) {
  return valor.replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 7);
}

function calcularTempoEsperaFila(impacto: ImpactoOperacional) {
  if (!impacto.dataHoraIdentificacaoUltimoVeiculo || !impacto.dataHoraChegadaBalanca) return "Aguardando horários";

  const inicio = new Date(impacto.dataHoraIdentificacaoUltimoVeiculo).getTime();
  const fim = new Date(impacto.dataHoraChegadaBalanca).getTime();
  if (!Number.isFinite(inicio) || !Number.isFinite(fim)) return "Horários inválidos";
  if (fim < inicio) return "Chegada não pode ser anterior à identificação";

  const totalMinutos = Math.round((fim - inicio) / 60000);
  const horas = Math.floor(totalMinutos / 60);
  const minutos = totalMinutos % 60;
  if (horas <= 0) return `${minutos} min`;
  return `${horas}h ${String(minutos).padStart(2, "0")}min`;
}

function formatarBrl(valor: string) {
  const digitos = valor.replace(/\D/g, "");
  const numero = Number(digitos || "0") / 100;
  return numero.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function Ocorrencias() {
  const [ocorrencias, setOcorrencias] = useState<Ocorrencia[]>([]);
  const [usuariosMencao, setUsuariosMencao] = useState<UsuarioMencao[]>([]);
  const [ocorrenciaVisualizando, setOcorrenciaVisualizando] = useState<Ocorrencia | null>(null);
  const [ocorrenciaMencao, setOcorrenciaMencao] = useState<Ocorrencia | null>(null);
  const [ocorrenciaAnulacao, setOcorrenciaAnulacao] = useState<Ocorrencia | null>(null);
  const [usuarioMencionadoId, setUsuarioMencionadoId] = useState("");
  const [tipoMencao, setTipoMencao] = useState("Acompanhar");
  const [observacaoMencao, setObservacaoMencao] = useState("");
  const [motivoAnulacao, setMotivoAnulacao] = useState("");
  const [assistenteRelato, setAssistenteRelato] = useState<AssistenteRelato>({
    aberto: false,
    envolvidoIndex: null,
    arquivo: null,
    previewUrl: "",
    sugestao: "",
    aviso: "",
    erro: "",
    carregando: false,
    recorte: null,
  });
  const [assistenteAudioRelato, setAssistenteAudioRelato] = useState<AssistenteAudioRelato>({
    envolvidoIndex: null,
    gravando: false,
    transcrevendo: false,
    erro: "",
    aviso: "",
  });
  const imagemRelatoRef = useRef<HTMLImageElement | null>(null);
  const inicioRecorteRef = useRef<{ x: number; y: number } | null>(null);
  const mediaRecorderRelatoRef = useRef<MediaRecorder | null>(null);
  const streamRelatoRef = useRef<MediaStream | null>(null);
  const audioChunksRelatoRef = useRef<Blob[]>([]);
  const [pinAnulacao, setPinAnulacao] = useState("");
  const [comentarios, setComentarios] = useState<ComentarioInterno[]>([]);
  const [novoComentario, setNovoComentario] = useState("");
  const [pdfLightbox, setPdfLightbox] = useState<{ url: string; titulo: string; nomeArquivo: string } | null>(null);
  const [ocorrenciaAnaliseModal, setOcorrenciaAnaliseModal] = useState<Ocorrencia | null>(null);
  const [naturezas, setNaturezas] = useState<NaturezaCadastro[]>([]);
  const [locais, setLocais] = useState<LocalCadastro[]>([]);
  const [abrirFormulario, setAbrirFormulario] = useState(false);
  const [ocorrenciaEditando, setOcorrenciaEditando] =
    useState<Ocorrencia | null>(null);
  const [permitirEdicao, setPermitirEdicao] = useState(true);
  const [anexosExistentes, setAnexosExistentes] = useState<Anexo[]>([]);
  const [anexosRemover, setAnexosRemover] = useState<number[]>([]);
  const [anexos, setAnexos] = useState<File[]>([]);
  const [analiseAtual, setAnaliseAtual] = useState<AnaliseOcorrencia | null>(null);
  const [statusAnalise, setStatusAnalise] = useState("Em Análise");
  const [prejuizoFinanceiro, setPrejuizoFinanceiro] = useState("0,00");
  const [conclusaoAnalise, setConclusaoAnalise] = useState("");

  const [assunto, setAssunto] = useState("");
  const [local, setLocal] = useState("");
  const [natureza, setNatureza] = useState("");
  const [subNatureza, setSubNatureza] = useState("");
  const [dataOcorrencia, setDataOcorrencia] = useState("");
  const [etapaFormulario, setEtapaFormulario] = useState(1);
  const [relatoSeguranca, setRelatoSeguranca] = useState("");
  const [acoesTomadas, setAcoesTomadas] = useState("");
  const [impactoOperacional, setImpactoOperacional] = useState<ImpactoOperacional>(impactoOperacionalVazio());
  const [quantidadeEnvolvidos, setQuantidadeEnvolvidos] = useState(1);
  const [envolvidos, setEnvolvidos] = useState<Envolvido[]>([
    { ...envolvidoVazio },
  ]);

  const dadosRascunhoOcorrencia = useMemo(
    () => ({
      assunto,
      local,
      natureza,
      subNatureza,
      dataOcorrencia,
      etapaFormulario,
      relatoSeguranca,
      acoesTomadas,
      impactoOperacional,
      quantidadeEnvolvidos,
      envolvidos,
      statusAnalise,
      prejuizoFinanceiro,
      conclusaoAnalise,
    }),
    [
      assunto,
      local,
      natureza,
      subNatureza,
      dataOcorrencia,
      etapaFormulario,
      relatoSeguranca,
      acoesTomadas,
      impactoOperacional,
      quantidadeEnvolvidos,
      envolvidos,
      statusAnalise,
      prejuizoFinanceiro,
      conclusaoAnalise,
    ]
  );

  const autoSaveOcorrencia = useAutoSaveDraft({
    modulo: "Ocorrencia",
    chave: ocorrenciaEditando ? `editar-${ocorrenciaEditando.id}` : "novo",
    dados: dadosRascunhoOcorrencia,
    ativo: abrirFormulario,
    onRestore: (dados) => {
      setAssunto(dados.assunto || "");
      setLocal(dados.local || "");
      setNatureza(dados.natureza || "");
      setSubNatureza(dados.subNatureza || "");
      setDataOcorrencia(dados.dataOcorrencia || "");
      setEtapaFormulario(dados.etapaFormulario || 1);
      setRelatoSeguranca(dados.relatoSeguranca || "");
      setAcoesTomadas(dados.acoesTomadas || "");
      setImpactoOperacional(lerImpactoOperacional(dados.impactoOperacional));
      const envolvidosRestaurados = dados.envolvidos?.length ? dados.envolvidos : [{ ...envolvidoVazio }];
      setEnvolvidos(envolvidosRestaurados);
      setQuantidadeEnvolvidos(dados.quantidadeEnvolvidos || envolvidosRestaurados.length || 1);
      setStatusAnalise(dados.statusAnalise || "Em Análise");
      setPrejuizoFinanceiro(dados.prejuizoFinanceiro || "0,00");
      setConclusaoAnalise(dados.conclusaoAnalise || "");
    },
  });

  async function carregarOcorrencias() {
    const response = await api.get("/ocorrencias");
    setOcorrencias(response.data);
  }

  async function carregarNaturezas() {
    const response = await api.get("/naturezas");
    setNaturezas(response.data);
  }

  async function carregarLocais() {
    const response = await api.get("/locais?status=ativo");
    setLocais(response.data);
  }

  async function carregarUsuariosMencao() {
    const response = await api.get("/mencoes/usuarios");
    setUsuariosMencao(response.data);
  }

  async function salvarMencao() {
    if (!ocorrenciaMencao || !usuarioMencionadoId) return;
    await api.post("/mencoes", {
      modulo: "Ocorrencia",
      registroId: ocorrenciaMencao.id,
      codigoRegistro: ocorrenciaMencao.codigo,
      tituloRegistro: ocorrenciaMencao.assunto,
      usuarioMencionadoId,
      tipoMencao,
      observacao: observacaoMencao,
    });
    setOcorrenciaMencao(null);
    setUsuarioMencionadoId("");
    setObservacaoMencao("");
    alert("Usuario mencionado com sucesso");
  }

  async function solicitarAnulacao() {
    if (!ocorrenciaAnulacao || !motivoAnulacao.trim()) {
      alert("Informe o motivo da anulação.");
      return;
    }

    if (!/^\d{4}$/.test(pinAnulacao)) {
      alert("Informe seu PIN operacional de 4 dígitos para confirmar a anulação.");
      return;
    }

    await api.post("/anulacoes", {
      modulo: "Ocorrencia",
      registroId: ocorrenciaAnulacao.id,
      motivo: motivoAnulacao,
      pinOperacional: pinAnulacao,
    });

    setOcorrenciaAnulacao(null);
    setMotivoAnulacao("");
    setPinAnulacao("");
    carregarOcorrencias();
    alert("Solicitação de anulação enviada aos analistas e administradores.");
  }

  async function salvarComentario() {
    if (!ocorrenciaVisualizando || !novoComentario.trim()) return;
    const response = await api.post(`/comentarios/Ocorrencia/${ocorrenciaVisualizando.id}`, {
      comentario: novoComentario,
    });
    setComentarios((atuais) => [response.data, ...atuais]);
    setNovoComentario("");
  }

  async function abrirPdfOcorrencia(id: number) {
    const ocorrencia = ocorrencias.find((item) => item.id === id);
    const response = await api.get(`/ocorrencias/${id}/pdf`, {
      responseType: "blob",
    });

    const url = URL.createObjectURL(
      new Blob([response.data], { type: "application/pdf" })
    );

    setPdfLightbox({
      url,
      titulo: ocorrencia ? `Relatório de Ocorrência ${ocorrencia.codigo}` : "Relatório de Ocorrência",
      nomeArquivo: `relatorio-ocorrencia-${ocorrencia?.codigo || id}.pdf`.replace(/\//g, "-"),
    });
  }

  function fecharPdfLightbox() {
    if (pdfLightbox?.url) URL.revokeObjectURL(pdfLightbox.url);
    setPdfLightbox(null);
  }

  const subNaturezasDisponiveis =
    naturezas.find((item) => item.nome === natureza)?.subNaturezas || [];
  const localSelecionado = locais.find((item) => item.nome === local);
  const naturezaImpactoOperacional = ehImpactoOperacionalExterno(natureza);

  function alternarImpacto(campo: "operacoesImpactadas" | "tratativas", opcao: string) {
    setImpactoOperacional((atual) => ({
      ...atual,
      [campo]: atual[campo].includes(opcao)
        ? atual[campo].filter((item) => item !== opcao)
        : [...atual[campo], opcao],
    }));
  }

  function alterarQuantidadeEnvolvidos(qtd: number) {
    const quantidade = Math.max(1, qtd);
    setQuantidadeEnvolvidos(quantidade);

    const novaLista = Array.from({ length: quantidade }, (_, index) => {
      return envolvidos[index] || { ...envolvidoVazio };
    });

    setEnvolvidos(novaLista);
  }

  function atualizarEnvolvido(
    index: number,
    campo: keyof Envolvido,
    valor: string | boolean
  ) {
    const lista = [...envolvidos];

    lista[index] = {
      ...lista[index],
      [campo]: valor,
    };

    setEnvolvidos(lista);
  }

  function limparAssistenteRelato() {
    if (assistenteRelato.previewUrl) {
      URL.revokeObjectURL(assistenteRelato.previewUrl);
    }

    setAssistenteRelato({
      aberto: false,
      envolvidoIndex: null,
      arquivo: null,
      previewUrl: "",
      sugestao: "",
      aviso: "",
      erro: "",
      carregando: false,
      recorte: null,
    });
  }

  function abrirAssistenteRelato(index: number) {
    if (assistenteRelato.previewUrl) {
      URL.revokeObjectURL(assistenteRelato.previewUrl);
    }

    setAssistenteRelato({
      aberto: true,
      envolvidoIndex: index,
      arquivo: null,
      previewUrl: "",
      sugestao: "",
      aviso: "",
      erro: "",
      carregando: false,
      recorte: null,
    });
  }

  function selecionarArquivoRelato(arquivo?: File | null) {
    if (assistenteRelato.previewUrl) {
      URL.revokeObjectURL(assistenteRelato.previewUrl);
    }

    if (!arquivo) {
      setAssistenteRelato((atual) => ({
        ...atual,
        arquivo: null,
        previewUrl: "",
        sugestao: "",
        aviso: "",
        erro: "",
        recorte: null,
      }));
      return;
    }

    setAssistenteRelato((atual) => ({
      ...atual,
      arquivo,
      previewUrl: URL.createObjectURL(arquivo),
      sugestao: "",
      aviso: "",
      erro: "",
      recorte: null,
    }));
  }

  function obterPontoImagem(evento: React.PointerEvent<HTMLElement>) {
    const imagem = imagemRelatoRef.current;
    if (!imagem) return null;

    const rect = imagem.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(evento.clientX - rect.left, rect.width)),
      y: Math.max(0, Math.min(evento.clientY - rect.top, rect.height)),
    };
  }

  function iniciarRecorteRelato(evento: React.PointerEvent<HTMLDivElement>) {
    if (!assistenteRelato.arquivo?.type.startsWith("image/")) return;
    const ponto = obterPontoImagem(evento);
    if (!ponto) return;

    evento.currentTarget.setPointerCapture(evento.pointerId);
    inicioRecorteRef.current = ponto;
    setAssistenteRelato((atual) => ({
      ...atual,
      recorte: { x: ponto.x, y: ponto.y, width: 0, height: 0 },
      erro: "",
    }));
  }

  function moverRecorteRelato(evento: React.PointerEvent<HTMLDivElement>) {
    if (!inicioRecorteRef.current) return;
    const ponto = obterPontoImagem(evento);
    if (!ponto) return;

    const inicio = inicioRecorteRef.current;
    setAssistenteRelato((atual) => ({
      ...atual,
      recorte: {
        x: Math.min(inicio.x, ponto.x),
        y: Math.min(inicio.y, ponto.y),
        width: Math.abs(ponto.x - inicio.x),
        height: Math.abs(ponto.y - inicio.y),
      },
    }));
  }

  function finalizarRecorteRelato(evento: React.PointerEvent<HTMLDivElement>) {
    if (inicioRecorteRef.current) {
      evento.currentTarget.releasePointerCapture(evento.pointerId);
    }
    inicioRecorteRef.current = null;

    setAssistenteRelato((atual) => {
      if (!atual.recorte || atual.recorte.width < 12 || atual.recorte.height < 12) {
        return { ...atual, recorte: null };
      }
      return atual;
    });
  }

  async function criarArquivoRecortadoRelato() {
    const arquivo = assistenteRelato.arquivo;
    const imagem = imagemRelatoRef.current;
    const recorte = assistenteRelato.recorte;

    if (!arquivo || !imagem || !recorte || !arquivo.type.startsWith("image/")) {
      return arquivo;
    }

    if (recorte.width < 20 || recorte.height < 20) {
      return arquivo;
    }

    const escalaX = imagem.naturalWidth / imagem.getBoundingClientRect().width;
    const escalaY = imagem.naturalHeight / imagem.getBoundingClientRect().height;
    const origemX = Math.max(0, Math.round(recorte.x * escalaX));
    const origemY = Math.max(0, Math.round(recorte.y * escalaY));
    const largura = Math.min(imagem.naturalWidth - origemX, Math.round(recorte.width * escalaX));
    const altura = Math.min(imagem.naturalHeight - origemY, Math.round(recorte.height * escalaY));

    if (largura <= 0 || altura <= 0) {
      return arquivo;
    }

    const canvas = document.createElement("canvas");
    canvas.width = largura;
    canvas.height = altura;
    const contexto = canvas.getContext("2d");
    if (!contexto) return arquivo;

    contexto.drawImage(imagem, origemX, origemY, largura, altura, 0, 0, largura, altura);

    return new Promise<File>((resolve) => {
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            resolve(arquivo);
            return;
          }

          const extensao = arquivo.type === "image/png" ? "png" : arquivo.type === "image/webp" ? "webp" : "jpg";
          resolve(new File([blob], `recorte-relato.${extensao}`, { type: arquivo.type }));
        },
        arquivo.type,
        0.95
      );
    });
  }

  async function lerRelatoAssistente() {
    if (!assistenteRelato.arquivo) {
      setAssistenteRelato((atual) => ({
        ...atual,
        erro: "Anexe uma foto ou PDF escaneado do relato manuscrito.",
      }));
      return;
    }

    const arquivoParaLeitura = await criarArquivoRecortadoRelato();
    if (!arquivoParaLeitura) return;

    const formData = new FormData();
    formData.append("documento", arquivoParaLeitura);

    setAssistenteRelato((atual) => ({
      ...atual,
      carregando: true,
      erro: "",
      sugestao: "",
      aviso: "",
    }));

    try {
      const response = await api.post("/inteligencia/relato-ocr", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setAssistenteRelato((atual) => ({
        ...atual,
        carregando: false,
        sugestao: response.data?.relatoSugerido || "",
        aviso: response.data?.aviso || "",
      }));
    } catch (error) {
      const erro = error as ApiErro;
      setAssistenteRelato((atual) => ({
        ...atual,
        carregando: false,
        aviso: "",
        erro:
          erro.response?.data?.detalhe ||
          erro.response?.data?.error ||
          "Não foi possível realizar a leitura inteligente do documento.",
      }));
    }
  }

  function aplicarRelatoAssistente() {
    if (assistenteRelato.envolvidoIndex === null || !assistenteRelato.sugestao.trim()) {
      return;
    }

    atualizarEnvolvido(assistenteRelato.envolvidoIndex, "relato", assistenteRelato.sugestao.trim());
    limparAssistenteRelato();
  }

  async function transcreverAudioRelato(arquivo: Blob, envolvidoIndex: number) {
    const formData = new FormData();
    formData.append("audio", arquivo, `relato-envolvido-${envolvidoIndex + 1}.webm`);

    setAssistenteAudioRelato((atual) => ({
      ...atual,
      envolvidoIndex,
      gravando: false,
      transcrevendo: true,
      erro: "",
      aviso: "",
    }));

    try {
      const response = await api.post("/inteligencia/relato-audio", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const transcricao = String(response.data?.transcricao || "").trim();

      if (transcricao) {
        const relatoAtual = envolvidos[envolvidoIndex]?.relato?.trim();
        atualizarEnvolvido(
          envolvidoIndex,
          "relato",
          relatoAtual ? `${relatoAtual}\n\n${transcricao}` : transcricao
        );
      }

      setAssistenteAudioRelato((atual) => ({
        ...atual,
        transcrevendo: false,
        aviso: response.data?.aviso || "Transcrição aplicada ao relato. Revise o texto antes de salvar.",
      }));
    } catch (error) {
      const erro = error as ApiErro;
      setAssistenteAudioRelato((atual) => ({
        ...atual,
        transcrevendo: false,
        erro:
          erro.response?.data?.detalhe ||
          erro.response?.data?.error ||
          "Não foi possível transcrever o áudio.",
      }));
    }
  }

  async function iniciarGravacaoRelato(envolvidoIndex: number) {
    if (!navigator.mediaDevices?.getUserMedia) {
      setAssistenteAudioRelato({
        envolvidoIndex,
        gravando: false,
        transcrevendo: false,
        aviso: "",
        erro: "Seu navegador não permitiu gravação de áudio.",
      });
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      streamRelatoRef.current = stream;
      mediaRecorderRelatoRef.current = recorder;
      audioChunksRelatoRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRelatoRef.current.push(event.data);
        }
      };
      recorder.onstop = () => {
        const blob = new Blob(audioChunksRelatoRef.current, { type: recorder.mimeType || "audio/webm" });
        streamRelatoRef.current?.getTracks().forEach((track) => track.stop());
        streamRelatoRef.current = null;
        mediaRecorderRelatoRef.current = null;
        audioChunksRelatoRef.current = [];
        if (blob.size > 0) {
          transcreverAudioRelato(blob, envolvidoIndex);
        }
      };

      recorder.start();
      setAssistenteAudioRelato({
        envolvidoIndex,
        gravando: true,
        transcrevendo: false,
        erro: "",
        aviso: "Gravando relato em áudio. Clique em parar para transcrever.",
      });
    } catch {
      setAssistenteAudioRelato({
        envolvidoIndex,
        gravando: false,
        transcrevendo: false,
        aviso: "",
        erro: "Não foi possível acessar o microfone. Verifique a permissão do navegador.",
      });
    }
  }

  function pararGravacaoRelato() {
    if (mediaRecorderRelatoRef.current?.state === "recording") {
      mediaRecorderRelatoRef.current.stop();
    }
  }

  function anexarAudioRelato(event: React.ChangeEvent<HTMLInputElement>, envolvidoIndex: number) {
    const arquivo = event.target.files?.[0];
    event.target.value = "";
    if (!arquivo) return;
    transcreverAudioRelato(arquivo, envolvidoIndex);
  }

  function selecionarAnexos(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files) return;

    const novosArquivos = Array.from(e.target.files);

    setAnexos((arquivosAtuais) => [
      ...arquivosAtuais,
      ...novosArquivos,
    ]);

    e.target.value = "";
  }

  function removerAnexo(index: number) {
    setAnexos((arquivosAtuais) =>
      arquivosAtuais.filter((_, i) => i !== index)
    );
  }

  function removerAnexoExistente(id: number) {
    setAnexosExistentes((arquivosAtuais) =>
      arquivosAtuais.filter((arquivo) => arquivo.id !== id)
    );
    setAnexosRemover((ids) => [...ids, id]);
  }

  function limparFormulario() {
    setOcorrenciaEditando(null);
    setPermitirEdicao(true);
    setAnexosExistentes([]);
    setAnexosRemover([]);
    setAnaliseAtual(null);
    setStatusAnalise("Em Análise");
    setPrejuizoFinanceiro("0,00");
    setConclusaoAnalise("");
    setAssunto("");
    setLocal("");
    setNatureza("");
    setSubNatureza("");
    setDataOcorrencia("");
    setEtapaFormulario(1);
    setRelatoSeguranca("");
    setAcoesTomadas("");
    setImpactoOperacional(impactoOperacionalVazio());
    setQuantidadeEnvolvidos(1);
    setEnvolvidos([{ ...envolvidoVazio }]);
    setAnexos([]);
  }

  function formatarDataParaInput(data: string) {
    const date = new Date(data);
    const offset = date.getTimezoneOffset();
    const localDate = new Date(date.getTime() - offset * 60000);

    return localDate.toISOString().slice(0, 16);
  }

  function formatarNumeroInvestigacao(investigacao?: InvestigacaoVinculada | null) {
    if (!investigacao) return "";
    if (investigacao.codigo) return investigacao.codigo;

    const ano = investigacao.createdAt
      ? new Date(investigacao.createdAt).getFullYear()
      : new Date().getFullYear();

    return `${String(investigacao.id).padStart(4, "0")}/${ano}`;
  }

  function documentoBloqueadoParaEdicao(ocorrencia?: Ocorrencia | null) {
    if (!ocorrencia) return false;
    return Boolean(
      ocorrencia.status === "Anulado" ||
      ocorrencia.assinaturaAprovacaoValida &&
      (ocorrencia.fluxoStatus === "Aprovado" || ocorrencia.status === "Concluido" || ocorrencia.status === "Concluído")
    );
  }

  function mensagemDocumentoBloqueado(ocorrencia?: Ocorrencia | null) {
    if (ocorrencia?.status === "Anulado") {
      alert("Este relatório está anulado e não pode ser editado.");
      return;
    }
    alert("Este documento está concluído e assinado eletronicamente. Não é permitido editar. Solicite a reabertura para realizar alterações.");
  }

  function desbloquearEdicaoOcorrencia() {
    if (documentoBloqueadoParaEdicao(ocorrenciaEditando)) {
      mensagemDocumentoBloqueado(ocorrenciaEditando);
      return;
    }
    setPermitirEdicao(true);
  }

  function editarOcorrencia(ocorrencia: Ocorrencia) {
    if (documentoBloqueadoParaEdicao(ocorrencia)) {
      mensagemDocumentoBloqueado(ocorrencia);
      return;
    }

    setOcorrenciaEditando(ocorrencia);
    setAssunto(ocorrencia.assunto);
    setLocal(ocorrencia.local);
    setNatureza(ocorrencia.natureza);
    setSubNatureza(ocorrencia.subNatureza);
    setDataOcorrencia(formatarDataParaInput(ocorrencia.dataOcorrencia));
    setRelatoSeguranca(ocorrencia.relatoSeguranca || "");
    setAcoesTomadas(ocorrencia.acoesTomadas || "");
    setImpactoOperacional(lerImpactoOperacional(ocorrencia.impactoOperacional));
    setQuantidadeEnvolvidos(ocorrencia.envolvidos.length || 1);
    setEnvolvidos(
      ocorrencia.envolvidos.length
        ? ocorrencia.envolvidos
        : [{ ...envolvidoVazio }]
    );
    setAnexos([]);
    setEtapaFormulario(1);
    setAbrirFormulario(true);
    setPermitirEdicao(false);
    setAnexosExistentes(ocorrencia.anexos || []);
    setAnexosRemover([]);
    setAnaliseAtual(ocorrencia.analise || null);
    setStatusAnalise(ocorrencia.analise?.status || "Em Análise");
    setPrejuizoFinanceiro(ocorrencia.analise?.prejuizoFinanceiro || "0,00");
    setConclusaoAnalise(ocorrencia.analise?.conclusaoAnalise || "");
  }

  function cancelarFormulario() {
    const confirmar = window.confirm(
      "As alterações não salvas poderão ser perdidas. Deseja continuar?"
    );

    if (!confirmar) return;

    setAbrirFormulario(false);
    limparFormulario();
  }

  async function abrirAnaliseOcorrencia(ocorrencia: Ocorrencia) {
    setOcorrenciaAnaliseModal(ocorrencia);
    setAnaliseAtual(ocorrencia.analise || null);
    setStatusAnalise(ocorrencia.analise?.status || "Em Análise");
    setPrejuizoFinanceiro(ocorrencia.analise?.prejuizoFinanceiro || "0,00");
    setConclusaoAnalise(ocorrencia.analise?.conclusaoAnalise || "");
  }

  function fecharAnaliseOcorrencia() {
    setOcorrenciaAnaliseModal(null);
    setAnaliseAtual(null);
    setStatusAnalise("Em Análise");
    setPrejuizoFinanceiro("0,00");
    setConclusaoAnalise("");
  }

  async function iniciarAnaliseOcorrencia(id: number, abrirModal = false) {
    const response = await api.post(`/analises/ocorrencias/${id}`);
    setAnaliseAtual(response.data);
    setStatusAnalise(response.data.status);
    setPrejuizoFinanceiro(response.data.prejuizoFinanceiro || "0,00");
    setConclusaoAnalise(response.data.conclusaoAnalise || "");
    if (abrirModal) {
      setOcorrenciaAnaliseModal((atual) =>
        atual ? { ...atual, status: response.data.status, analise: response.data } : atual
      );
    }
    setOcorrenciaEditando((atual) =>
      atual ? { ...atual, status: response.data.status, analise: response.data } : atual
    );
    carregarOcorrencias();
    alert("Análise iniciada com sucesso");
  }

  async function salvarAnaliseOcorrencia() {
    if (!analiseAtual) return;
    const pinOperacional = statusAnalise === "Concluído"
      ? await solicitarPinOperacional("Informe seu PIN para assinar eletronicamente a conclusão da análise.")
      : "";
    if (statusAnalise === "Concluído" && !pinOperacional) return;

    const response = await api.put(`/analises/ocorrencias/${analiseAtual.id}`, {
      status: statusAnalise,
      prejuizoFinanceiro,
      conclusaoAnalise,
      pinOperacional,
    });

    setAnaliseAtual(response.data);
    setOcorrenciaAnaliseModal((atual) =>
      atual ? { ...atual, status: response.data.status, analise: response.data } : atual
    );
    setOcorrenciaEditando((atual) =>
      atual ? { ...atual, status: response.data.status, analise: response.data } : atual
    );
    carregarOcorrencias();
    alert("Análise salva com sucesso");
  }

  async function converterParaInvestigacao(ocorrencia: Ocorrencia) {
    const confirmar = window.confirm(
      ocorrencia.investigacao?.status === "Anulada"
        ? `Deseja reabrir a R.I Nº ${formatarNumeroInvestigacao(ocorrencia.investigacao)} vinculada à Ocorrência Nº ${ocorrencia.codigo}?`
        : `Deseja iniciar uma investigação para a Ocorrência Nº ${ocorrencia.codigo}?`
    );

    if (!confirmar) return;

    const pinOperacional = ocorrencia.investigacao?.status === "Anulada"
      ? await solicitarPinOperacional("Informe seu PIN para reabrir a R.I anulada.")
      : "";
    if (ocorrencia.investigacao?.status === "Anulada" && !pinOperacional) return;

    const response = await api.post(`/investigacoes/converter/ocorrencias/${ocorrencia.id}`, {
      pinOperacional,
    });
    setOcorrenciaEditando((atual) =>
      atual ? { ...atual, investigacao: response.data } : atual
    );
    carregarOcorrencias();
    alert(ocorrencia.investigacao?.status === "Anulada" ? "Investigação reaberta com sucesso" : "Investigação criada com sucesso");
  }

  async function cancelarConversaoInvestigacao(ocorrencia: Ocorrencia) {
    if (!ocorrencia.investigacao) return;

    const confirmar = window.confirm(
      `Deseja cancelar a conversão para R.I Nº ${formatarNumeroInvestigacao(ocorrencia.investigacao)}? A investigação ficará como anulada e poderá ser reaberta futuramente.`
    );

    if (!confirmar) return;

    const pinOperacional = await solicitarPinOperacional("Informe seu PIN para cancelar a conversão para R.I.");
    if (!pinOperacional) return;

    const response = await api.post(`/investigacoes/converter/ocorrencias/${ocorrencia.id}/cancelar`, {
      pinOperacional,
    });
    setOcorrenciaEditando((atual) =>
      atual ? { ...atual, investigacao: response.data, status: response.data.ocorrencia?.status || atual.status } : atual
    );
    carregarOcorrencias();
    alert("Conversão para R.I cancelada. A investigação foi marcada como anulada.");
  }

  async function salvarOcorrencia(e: React.FormEvent) {
    e.preventDefault();

    const formData = new FormData();

    formData.append("assunto", assunto);
    formData.append("local", local);
    formData.append("natureza", natureza);
    formData.append("subNatureza", subNatureza);
    formData.append("status", ocorrenciaEditando?.status || "Aberto");
    formData.append("dataOcorrencia", dataOcorrencia);
    formData.append("relatoSeguranca", relatoSeguranca);
    formData.append("acoesTomadas", acoesTomadas);
    formData.append("impactoOperacional", JSON.stringify(naturezaImpactoOperacional ? impactoOperacional : impactoOperacionalVazio()));
    formData.append("envolvidos", JSON.stringify(envolvidos));
    formData.append("anexosRemover", JSON.stringify(anexosRemover));

    anexos.forEach((arquivo) => {
      formData.append("anexos", arquivo);
    });

    const url = ocorrenciaEditando
      ? `/ocorrencias/${ocorrenciaEditando.id}`
      : "/ocorrencias";

    const request = ocorrenciaEditando ? api.put : api.post;

    await request(url, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    await autoSaveOcorrencia.descartar().catch(() => undefined);
    setAbrirFormulario(false);
    limparFormulario();
    carregarOcorrencias();
  }

  useEffect(() => {
    carregarOcorrencias();
    carregarNaturezas();
    carregarLocais();
    carregarUsuariosMencao();
  }, []);

  useEffect(() => {
    return () => {
      if (mediaRecorderRelatoRef.current?.state === "recording") {
        mediaRecorderRelatoRef.current.stop();
      }
      streamRelatoRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Relatórios de Ocorrência</h1>
          <p className="text-gray-500 mt-1">
            Gerencie todas as ocorrências do sistema.
          </p>
        </div>

        <button
          onClick={() => {
            limparFormulario();
            setAbrirFormulario(true);
          }}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
        >
          Novo Relatório
        </button>
      </div>

      {abrirFormulario && (
        <form
          onSubmit={salvarOcorrencia}
          className="bg-white rounded-xl shadow p-6 mb-6 space-y-5"
        >
          <h2 className="text-xl font-bold">
            {ocorrenciaEditando
              ? `Editar Ocorrência ${ocorrenciaEditando.codigo}`
              : "Nova Ocorrência"}
          </h2>
          <AutoSaveStatus status={autoSaveOcorrencia.status} ultima={autoSaveOcorrencia.ultima} />

          {ocorrenciaEditando && (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={desbloquearEdicaoOcorrencia}
                  className="bg-slate-900 text-white px-4 py-2 rounded-lg"
                >
                  Editar Dados
                </button>
              </div>

              {analiseAtual && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
                  Este relatório possui uma análise{" "}
                  {analiseAtual.status === "Concluído" ? "concluída" : "em andamento"}.
                </div>
              )}

              {ocorrenciaEditando.investigacao && ocorrenciaEditando.investigacao.status !== "Anulada" && (
                <div className="rounded-lg border border-purple-200 bg-purple-50 px-4 py-3 text-sm font-medium text-purple-800">
                  Este relatório foi convertido para R.I Nº{" "}
                  {formatarNumeroInvestigacao(ocorrenciaEditando.investigacao)}.
                </div>
              )}

              {ocorrenciaEditando.investigacao?.status === "Anulada" && (
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
                  A R.I Nº {formatarNumeroInvestigacao(ocorrenciaEditando.investigacao)} está anulada. Ela será reaberta se a ocorrência for convertida novamente.
                </div>
              )}
            </div>
          )}

          <div className="flex flex-wrap gap-2 mb-4">
            <span
              className={`px-3 py-1 rounded-full text-sm ${
                etapaFormulario === 1
                  ? "bg-blue-600 text-white"
                  : "bg-gray-200"
              }`}
            >
              Etapa 1 - Dados e Envolvidos
            </span>

            <span
              className={`px-3 py-1 rounded-full text-sm ${
                etapaFormulario === 2
                  ? "bg-blue-600 text-white"
                  : "bg-gray-200"
              }`}
            >
              Etapa 2 - Relato Segurança Patrimonial
            </span>

            <span
              className={`px-3 py-1 rounded-full text-sm ${
                etapaFormulario === 3
                  ? "bg-blue-600 text-white"
                  : "bg-gray-200"
              }`}
            >
              Etapa 3 - Anexos
            </span>
          </div>

          <fieldset disabled={!!ocorrenciaEditando && !permitirEdicao}>
          {etapaFormulario === 1 && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  className="w-full border rounded-lg p-3"
                  placeholder="Assunto"
                  value={assunto}
                  onChange={(e) => setAssunto(e.target.value)}
                  required
                />

                <select
                  className="w-full border rounded-lg p-3"
                  value={local}
                  onChange={(e) => setLocal(e.target.value)}
                  required
                >
                  <option value="">Selecione o local da ocorrência</option>
                  {locais.map((item) => (
                    <option key={item.id} value={item.nome}>
                      {item.nome}{item.areaSensivel ? " - ÁREA SENSÍVEL" : ""}
                    </option>
                  ))}
                </select>

                {localSelecionado?.areaSensivel && (
                  <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700 md:col-span-2">
                    Local classificado como área sensível. A ocorrência receberá atenção operacional especial.
                  </div>
                )}

                <select
                  className="w-full border rounded-lg p-3"
                  value={natureza}
                  onChange={(e) => {
                    setNatureza(e.target.value);
                    setSubNatureza("");
                    if (!ehImpactoOperacionalExterno(e.target.value)) setImpactoOperacional(impactoOperacionalVazio());
                  }}
                  required
                >
                  <option value="">Selecione a natureza</option>
                  {naturezas.map((item) => (
                    <option key={item.id} value={item.nome}>
                      {item.nome}
                    </option>
                  ))}
                </select>

                <select
                  className="w-full border rounded-lg p-3"
                  value={subNatureza}
                  onChange={(e) => setSubNatureza(e.target.value)}
                  required
                  disabled={!natureza}
                >
                  <option value="">Selecione a subnatureza</option>
                  {subNaturezasDisponiveis.map((item) => (
                    <option key={item.id} value={item.nome}>
                      {item.nome}
                    </option>
                  ))}
                </select>

                <label className="space-y-1">
                  {naturezaImpactoOperacional && <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">Data e hora de início do impacto</span>}
                  <input
                    className="w-full border rounded-lg p-3"
                    type="datetime-local"
                    value={dataOcorrencia}
                    onChange={(e) => setDataOcorrencia(e.target.value)}
                    required
                  />
                </label>

                <input
                  className="w-full border rounded-lg p-3"
                  type="number"
                  min={1}
                  value={quantidadeEnvolvidos}
                  onChange={(e) =>
                    alterarQuantidadeEnvolvidos(Number(e.target.value))
                  }
                  placeholder="Quantidade de envolvidos"
                  required
                />
              </div>

              {naturezaImpactoOperacional && (
                <section className="mt-4 rounded-xl border border-orange-200 bg-orange-50/70 p-4 dark:border-orange-900/70 dark:bg-orange-950/20">
                  <div className="mb-4">
                    <h3 className="font-bold text-orange-950 dark:text-orange-200">Impacto operacional externo</h3>
                    <p className="text-sm text-orange-800 dark:text-orange-300">Registre o impacto, a fila estimada e as tratativas realizadas.</p>
                  </div>
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <label className="space-y-1 text-sm font-medium">Data e hora de término
                      <input className="w-full rounded-lg border p-3" type="datetime-local" min={dataOcorrencia} value={impactoOperacional.dataHoraTermino} onChange={(e) => setImpactoOperacional({ ...impactoOperacional, dataHoraTermino: e.target.value })} />
                    </label>
                    <label className="space-y-1 text-sm font-medium">Caminhões estimados na fila
                      <input className="w-full rounded-lg border p-3" type="number" min="0" placeholder="Ex.: 30" value={impactoOperacional.quantidadeCaminhoesFila} onChange={(e) => setImpactoOperacional({ ...impactoOperacional, quantidadeCaminhoesFila: e.target.value })} />
                    </label>
                    <label className="space-y-1 text-sm font-medium">Agendamentos afetados
                      <input className="w-full rounded-lg border p-3" type="number" min="0" placeholder="Ex.: 12" value={impactoOperacional.quantidadeAgendamentosAfetados} onChange={(e) => setImpactoOperacional({ ...impactoOperacional, quantidadeAgendamentosAfetados: e.target.value })} />
                    </label>
                    <label className="space-y-1 text-sm font-medium">Houve atraso operacional?
                      <select className="w-full rounded-lg border p-3" value={impactoOperacional.houveAtrasoOperacional} onChange={(e) => setImpactoOperacional({ ...impactoOperacional, houveAtrasoOperacional: e.target.value })}>
                        <option value="">Selecione</option><option>Sim</option><option>Não</option>
                      </select>
                    </label>
                  </div>
                  <details className="mt-4 rounded-xl border border-orange-200 bg-white/70 p-4 dark:border-orange-900/70 dark:bg-slate-950/40">
                    <summary className="cursor-pointer select-none font-semibold text-orange-950 dark:text-orange-200">
                      Controle de espera da fila <span className="text-xs font-medium text-orange-700 dark:text-orange-300">(opcional)</span>
                    </summary>
                    <p className="mt-2 text-sm text-orange-800 dark:text-orange-300">Use a placa do último veículo observado na fila como referência até a chegada na balança.</p>
                    <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                      <label className="space-y-1 text-sm font-medium">Placa do último veículo da fila
                        <input className="w-full rounded-lg border p-3 uppercase" placeholder="Ex.: ABC1D23" value={impactoOperacional.placaUltimoVeiculoFila} onChange={(e) => setImpactoOperacional({ ...impactoOperacional, placaUltimoVeiculoFila: normalizarPlacaFila(e.target.value) })} />
                      </label>
                      <label className="space-y-1 text-sm font-medium">Identificação da placa no final da fila
                        <input className="w-full rounded-lg border p-3" type="datetime-local" min={dataOcorrencia} value={impactoOperacional.dataHoraIdentificacaoUltimoVeiculo} onChange={(e) => setImpactoOperacional({ ...impactoOperacional, dataHoraIdentificacaoUltimoVeiculo: e.target.value })} />
                      </label>
                      <label className="space-y-1 text-sm font-medium">Chegada do veículo na balança
                        <input className="w-full rounded-lg border p-3" type="datetime-local" min={impactoOperacional.dataHoraIdentificacaoUltimoVeiculo || dataOcorrencia} value={impactoOperacional.dataHoraChegadaBalanca} onChange={(e) => setImpactoOperacional({ ...impactoOperacional, dataHoraChegadaBalanca: e.target.value })} />
                      </label>
                      <label className="space-y-1 text-sm font-medium">Tempo calculado de espera
                        <input className="w-full rounded-lg border bg-slate-100 p-3 font-semibold text-slate-700 dark:bg-slate-900 dark:text-slate-100" value={calcularTempoEsperaFila(impactoOperacional)} readOnly />
                      </label>
                    </div>
                  </details>
                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <div><p className="mb-2 text-sm font-semibold">Operação impactada</p><div className="flex flex-wrap gap-2">{operacoesImpactadas.map((opcao) => <label key={opcao} className="flex items-center gap-2 rounded-md border bg-white px-3 py-2 text-sm dark:bg-slate-900"><input type="checkbox" checked={impactoOperacional.operacoesImpactadas.includes(opcao)} onChange={() => alternarImpacto("operacoesImpactadas", opcao)} />{opcao}</label>)}</div></div>
                    <div><p className="mb-2 text-sm font-semibold">Tratativas</p><div className="space-y-2">{tratativasImpacto.map((opcao) => <label key={opcao} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={impactoOperacional.tratativas.includes(opcao)} onChange={() => alternarImpacto("tratativas", opcao)} />{opcao}</label>)}</div></div>
                  </div>
                </section>
              )}

              <div className="space-y-4 mt-4">
                {envolvidos.map((envolvido, index) => (
                  <div
                    key={index}
                    className="border rounded-xl p-4 space-y-4 bg-gray-50"
                  >
                    <h3 className="font-bold text-lg">
                      Dados do {index + 1}º envolvido
                    </h3>

                    <select
                      className="w-full border rounded-lg p-3"
                      value={envolvido.tipoEnvolvimento}
                      onChange={(e) =>
                        atualizarEnvolvido(
                          index,
                          "tipoEnvolvimento",
                          e.target.value
                        )
                      }
                    >
                      <option value="Condutor">Condutor</option>
                      <option value="Informante">Informante</option>
                      <option value="Solicitante">Solicitante</option>
                      <option value="Testemunha">Testemunha</option>
                      <option value="Vítima">Vítima</option>
                    </select>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <input
                        className="w-full border rounded-lg p-3"
                        placeholder="Nome do envolvido"
                        value={envolvido.nome}
                        onChange={(e) =>
                          atualizarEnvolvido(index, "nome", e.target.value)
                        }
                        required
                      />

                      <select
                        className="w-full border rounded-lg p-3"
                        value={envolvido.tipoDocumento}
                        onChange={(e) =>
                          atualizarEnvolvido(
                            index,
                            "tipoDocumento",
                            e.target.value
                          )
                        }
                      >
                        <option value="CPF">CPF</option>
                        <option value="RG">RG</option>
                        <option value="RE">R.E</option>
                        <option value="CNH">CNH</option>
                        <option value="PASSAPORTE">Passaporte</option>
                      </select>

                      <input
                        className="w-full border rounded-lg p-3"
                        placeholder="Documento"
                        value={envolvido.documento}
                        onChange={(e) =>
                          atualizarEnvolvido(index, "documento", e.target.value)
                        }
                        required
                      />

                      <input
                        className="w-full border rounded-lg p-3"
                        placeholder="Empresa"
                        value={envolvido.empresa}
                        onChange={(e) =>
                          atualizarEnvolvido(index, "empresa", e.target.value)
                        }
                      />
                    </div>

                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={envolvido.possuiVeiculo}
                        onChange={(e) =>
                          atualizarEnvolvido(
                            index,
                            "possuiVeiculo",
                            e.target.checked
                          )
                        }
                      />
                      Possui veículo
                    </label>

                    {envolvido.possuiVeiculo && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <input
                          className="w-full border rounded-lg p-3"
                          placeholder="Placa"
                          value={envolvido.placa}
                          onChange={(e) =>
                            atualizarEnvolvido(index, "placa", e.target.value)
                          }
                        />

                        <input
                          className="w-full border rounded-lg p-3"
                          placeholder="Reboque"
                          value={envolvido.reboque}
                          onChange={(e) =>
                            atualizarEnvolvido(index, "reboque", e.target.value)
                          }
                        />
                      </div>
                    )}

                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <label className="text-sm font-bold text-slate-700 dark:text-slate-200">
                          Relato do envolvido
                        </label>
                        <button
                          type="button"
                          onClick={() => abrirAssistenteRelato(index)}
                          className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700 transition hover:bg-blue-100 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-200 dark:hover:bg-blue-500/20"
                        >
                          <Sparkles size={14} />
                          Carregar prévia por OCR
                        </button>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        {assistenteAudioRelato.gravando && assistenteAudioRelato.envolvidoIndex === index ? (
                          <button
                            type="button"
                            onClick={pararGravacaoRelato}
                            className="inline-flex items-center gap-2 rounded-full border border-red-300 bg-red-50 px-3 py-2 text-xs font-bold text-red-700 transition hover:bg-red-100 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200 dark:hover:bg-red-500/20"
                          >
                            <Square size={13} />
                            Parar e transcrever
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled={assistenteAudioRelato.gravando || assistenteAudioRelato.transcrevendo}
                            onClick={() => iniciarGravacaoRelato(index)}
                            className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200 dark:hover:bg-emerald-500/20"
                          >
                            <Mic size={13} />
                            Gravar áudio
                          </button>
                        )}
                        {assistenteAudioRelato.gravando && assistenteAudioRelato.envolvidoIndex === index && (
                          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-300/60 bg-emerald-50 px-3 py-2 text-[11px] font-black text-emerald-700 shadow-sm dark:border-emerald-400/25 dark:bg-emerald-500/10 dark:text-emerald-200">
                            <span className="sr-only">Captação de áudio ativa</span>
                            {[10, 16, 22, 14, 19].map((altura, ondaIndex) => (
                              <span
                                key={ondaIndex}
                                className="w-1 rounded-full bg-emerald-500 motion-safe:animate-pulse dark:bg-emerald-300"
                                style={{
                                  height: `${altura}px`,
                                  animationDelay: `${ondaIndex * 120}ms`,
                                  animationDuration: "720ms",
                                }}
                              />
                            ))}
                            <span className="ml-1 hidden sm:inline">captando</span>
                          </span>
                        )}
                        <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800">
                          <Upload size={13} />
                          Anexar áudio
                          <input
                            type="file"
                            accept="audio/webm,audio/ogg,audio/mpeg,audio/mp3,audio/mp4,audio/wav,audio/aac"
                            className="hidden"
                            disabled={assistenteAudioRelato.gravando || assistenteAudioRelato.transcrevendo}
                            onChange={(event) => anexarAudioRelato(event, index)}
                          />
                        </label>
                        {assistenteAudioRelato.transcrevendo && assistenteAudioRelato.envolvidoIndex === index && (
                          <span className="inline-flex items-center gap-2 text-xs font-bold text-blue-600 dark:text-blue-300">
                            <Loader2 size={13} className="animate-spin" />
                            Transcrevendo áudio...
                          </span>
                        )}
                      </div>
                      {assistenteAudioRelato.envolvidoIndex === index && assistenteAudioRelato.aviso && (
                        <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 dark:border-emerald-500/25 dark:bg-emerald-500/10 dark:text-emerald-200">
                          {assistenteAudioRelato.aviso}
                        </p>
                      )}
                      {assistenteAudioRelato.envolvidoIndex === index && assistenteAudioRelato.erro && (
                        <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 dark:border-red-500/25 dark:bg-red-500/10 dark:text-red-200">
                          {assistenteAudioRelato.erro}
                        </p>
                      )}
                      <textarea
                        className="w-full border rounded-lg p-3 min-h-[120px]"
                        placeholder="Relato deste envolvido"
                        value={envolvido.relato}
                        onChange={(e) =>
                          atualizarEnvolvido(index, "relato", e.target.value)
                        }
                        required
                      />
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {etapaFormulario === 2 && (
            <div className="space-y-4">
              <LexicalEditor
                value={relatoSeguranca}
                onChange={setRelatoSeguranca}
                title="Relato Segurança Patrimonial"
                placeholder="Descreva o relato patrimonial da ocorrência..."
              />

              <LexicalEditor
                value={acoesTomadas}
                onChange={setAcoesTomadas}
                title="Ações tomadas"
                placeholder="Descreva as ações tomadas, tratativas imediatas, orientações, acionamentos e providências executadas..."
              />
            </div>
          )}

          {etapaFormulario === 3 && (
            <div className="space-y-4">
              <h3 className="text-lg font-bold">Anexos da Ocorrência</h3>

              <p className="text-sm text-gray-500">
                Anexe fotos ou arquivos PDF relacionados à ocorrência.
              </p>

              <input
                type="file"
                multiple
                accept="image/*,.pdf"
                onChange={selecionarAnexos}
                className="w-full border rounded-lg p-3"
              />

              {anexosExistentes.length > 0 && (
                <div className="bg-white border rounded-lg p-4">
                  <p className="font-semibold mb-4">Anexos já enviados</p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {anexosExistentes.map((arquivo) => (
                      <div key={arquivo.id} className="border rounded-xl p-3 bg-gray-50">
                        <p className="text-sm break-all mb-3">{arquivo.nomeOriginal}</p>
                        <div className="flex gap-2">
                          <a
                            href={`/${arquivo.caminho.replaceAll("\\", "/")}`}
                            target="_blank"
                            className="bg-blue-600 text-white px-3 py-2 rounded-lg text-xs"
                          >
                            Visualizar
                          </a>
                          <button
                            type="button"
                            onClick={() => removerAnexoExistente(arquivo.id)}
                            className="bg-red-600 text-white px-3 py-2 rounded-lg text-xs"
                          >
                            Remover
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {anexos.length > 0 && (
                <div className="bg-gray-50 border rounded-lg p-4">
                  <p className="font-semibold mb-4">Arquivos selecionados</p>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {anexos.map((arquivo, index) => {
                      const isImagem = arquivo.type.startsWith("image/");

                      return (
                        <div
                          key={index}
                          className="border rounded-xl overflow-hidden bg-white shadow-sm"
                        >
                          {isImagem ? (
                            <img
                              src={URL.createObjectURL(arquivo)}
                              alt={arquivo.name}
                              className="w-full h-32 object-cover"
                            />
                          ) : (
                            <div className="h-32 flex items-center justify-center bg-red-50 text-red-600 font-bold text-lg">
                              PDF
                            </div>
                          )}

                          <div className="p-2">
                            <p className="text-xs text-gray-600 break-all">
                              {arquivo.name}
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={() => removerAnexo(index)}
                            className="w-full bg-red-600 text-white text-xs py-2 hover:bg-red-700"
                          >
                            Remover
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          </fieldset>

          <div className="flex gap-3">
            {etapaFormulario > 1 && (
              <button
                type="button"
                onClick={() => setEtapaFormulario(etapaFormulario - 1)}
                className="bg-gray-300 px-4 py-2 rounded-lg"
              >
                Voltar
              </button>
            )}

            {etapaFormulario < 3 && (
              <button
                type="button"
                onClick={() => setEtapaFormulario(etapaFormulario + 1)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg"
              >
                Próxima Etapa
              </button>
            )}

            {etapaFormulario === 3 && (
              <button className="bg-green-600 text-white px-4 py-2 rounded-lg">
                Salvar Ocorrência
              </button>
            )}

            <button
              type="button"
              onClick={cancelarFormulario}
              className="bg-gray-300 px-4 py-2 rounded-lg"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      {ocorrencias.length === 0 ? (
        <div className="bg-white rounded-xl p-8 shadow text-center text-gray-500">
          Nenhuma ocorrência cadastrada.
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <div className="overflow-x-auto">
            <table className="min-w-[1120px] w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-[0.12em] text-slate-500 dark:bg-slate-900 dark:text-slate-400">
                <tr>
                  <th className="px-4 py-3">Ocorrência</th>
                  <th className="px-4 py-3">Assunto</th>
                  <th className="px-4 py-3">Local</th>
                  <th className="px-4 py-3">Natureza</th>
                  <th className="px-4 py-3 text-center">Envolvidos</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {ocorrencias.map((ocorrencia) => (
                  <tr key={ocorrencia.id} className="transition hover:bg-blue-50/60 dark:hover:bg-blue-500/5">
                    <td className="px-4 py-4">
                      <div className="font-black text-slate-900 dark:text-white">{ocorrencia.codigo}</div>
                      <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        {new Date(ocorrencia.dataOcorrencia).toLocaleString("pt-BR")}
                      </div>
                    </td>
                    <td className="max-w-[260px] px-4 py-4">
                      <p className="line-clamp-2 font-semibold text-slate-800 dark:text-slate-100">{ocorrencia.assunto}</p>
                    </td>
                    <td className="px-4 py-4">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 dark:bg-slate-900 dark:text-slate-300">
                        <MapPin size={13} /> {ocorrencia.local}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 dark:bg-slate-900 dark:text-slate-300">
                        <Tags size={13} /> {ocorrencia.natureza} / {ocorrencia.subNatureza}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/10 px-3 py-1 text-xs font-bold text-blue-600 dark:text-blue-300">
                        <Users size={13} /> {ocorrencia.envolvidos.length}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
                        {ocorrencia.status}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex justify-end gap-2">
                        {podeAnalisar() && (
                          <button type="button" onClick={() => ocorrencia.analise ? abrirAnaliseOcorrencia(ocorrencia) : (setOcorrenciaAnaliseModal(ocorrencia), iniciarAnaliseOcorrencia(ocorrencia.id, true))} className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-amber-400/30 bg-amber-500/10 text-amber-600 transition hover:-translate-y-0.5 hover:bg-amber-500/20 dark:text-amber-200" title={ocorrencia.analise ? "Abrir análise" : "Iniciar análise"}>
                            <ClipboardCheck size={17} />
                          </button>
                        )}
                        {(!ocorrencia.investigacao || ocorrencia.investigacao.status === "Anulada") && podeAnalisar() && (
                          <button type="button" onClick={() => converterParaInvestigacao(ocorrencia)} className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-purple-400/30 bg-purple-500/10 text-purple-600 transition hover:-translate-y-0.5 hover:bg-purple-500/20 dark:text-purple-200" title={ocorrencia.investigacao?.status === "Anulada" ? "Reabrir investigação anulada" : "Converter para investigação"}>
                            <FileSearch size={17} />
                          </button>
                        )}
                        {ocorrencia.investigacao && ocorrencia.investigacao.status !== "Anulada" && podeAnalisar() && (
                          <button type="button" onClick={() => cancelarConversaoInvestigacao(ocorrencia)} className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-400/30 bg-slate-500/10 text-slate-600 transition hover:-translate-y-0.5 hover:bg-slate-500/20 dark:text-slate-200" title="Cancelar conversão para R.I">
                            <X size={17} />
                          </button>
                        )}
                        <button type="button" onClick={() => setOcorrenciaMencao(ocorrencia)} className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-indigo-400/30 bg-indigo-500/10 text-indigo-600 transition hover:-translate-y-0.5 hover:bg-indigo-500/20 dark:text-indigo-200" title="Mencionar usuário">
                          <AtSign size={17} />
                        </button>
                        <button type="button" onClick={() => editarOcorrencia(ocorrencia)} className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-blue-400/30 bg-blue-500/10 text-blue-600 transition hover:-translate-y-0.5 hover:bg-blue-500/20 dark:text-blue-200" title="Editar relatório">
                          <Edit3 size={17} />
                        </button>
                        <button type="button" onClick={() => abrirPdfOcorrencia(ocorrencia.id)} className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-red-400/30 bg-red-500/10 text-red-600 transition hover:-translate-y-0.5 hover:bg-red-500/20 dark:text-red-200" title="Abrir PDF">
                          <FileText size={17} />
                        </button>
                        {ocorrencia.status !== "Anulado" && (
                          <button type="button" onClick={() => setOcorrenciaAnulacao(ocorrencia)} className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-orange-400/30 bg-orange-500/10 text-orange-600 transition hover:-translate-y-0.5 hover:bg-orange-500/20 dark:text-orange-200" title="Solicitar anulação">
                            <Ban size={17} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {ocorrenciaAnaliseModal && podeAnalisar() && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
          <div className="max-h-[92vh] w-full max-w-4xl overflow-hidden rounded-3xl border border-amber-500/20 bg-white shadow-2xl dark:bg-slate-950">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-900/70">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20">
                  <ClipboardCheck size={22} />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-amber-600 dark:text-amber-300">
                    Análise da ocorrência
                  </p>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                    {ocorrenciaAnaliseModal.codigo} - {ocorrenciaAnaliseModal.assunto}
                  </h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Registre a avaliação técnica sem alterar os dados originais do relatório.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={fecharAnaliseOcorrencia}
                className="rounded-full border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
                title="Fechar"
              >
                <X size={18} />
              </button>
            </div>

            <div className="max-h-[calc(92vh-104px)] space-y-5 overflow-auto p-5">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900">
                  <p className="text-xs font-bold uppercase text-slate-500">Status do relatório</p>
                  <p className="mt-1 font-bold text-slate-900 dark:text-white">{ocorrenciaAnaliseModal.status}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900">
                  <p className="text-xs font-bold uppercase text-slate-500">Local</p>
                  <p className="mt-1 font-bold text-slate-900 dark:text-white">{ocorrenciaAnaliseModal.local}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900">
                  <p className="text-xs font-bold uppercase text-slate-500">Natureza</p>
                  <p className="mt-1 font-bold text-slate-900 dark:text-white">{ocorrenciaAnaliseModal.natureza}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <select
                  className="w-full rounded-2xl border border-slate-200 bg-white p-3 text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                  value={statusAnalise}
                  onChange={(e) => setStatusAnalise(e.target.value)}
                >
                  <option value="Em Análise">Em Análise</option>
                  <option value="Concluído">Concluído</option>
                </select>

                <input
                  className="w-full rounded-2xl border border-slate-200 bg-white p-3 text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                  value={prejuizoFinanceiro}
                  onChange={(e) => setPrejuizoFinanceiro(formatarBrl(e.target.value))}
                  placeholder="Prejuízo financeiro em BRL"
                  inputMode="numeric"
                />
              </div>

              <LexicalEditor
                value={conclusaoAnalise}
                onChange={setConclusaoAnalise}
                title="Descrição da análise"
                placeholder="Descreva a análise da ocorrência, providências avaliadas e conclusão técnica..."
              />

              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={fecharAnaliseOcorrencia}
                  className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-100 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={salvarAnaliseOcorrencia}
                  disabled={!analiseAtual}
                  className="rounded-2xl bg-amber-500 px-5 py-3 text-sm font-bold text-slate-950 transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Salvar Análise
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {assistenteRelato.aberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
          <div className="max-h-[92vh] w-full max-w-6xl overflow-hidden rounded-3xl border border-blue-500/20 bg-white shadow-2xl dark:bg-slate-950">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-900/70">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-600/20">
                  <Sparkles size={22} />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-blue-600 dark:text-blue-300">
                    Assistente de relato
                  </p>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                    Ler documento manuscrito ou escaneado
                  </h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    A sugestão deve ser revisada antes de ser aplicada no relatório.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={limparAssistenteRelato}
                className="rounded-full border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
                title="Fechar"
              >
                <X size={18} />
              </button>
            </div>

            <div className="grid max-h-[calc(92vh-104px)] grid-cols-1 overflow-auto lg:grid-cols-[0.95fr_1.05fr]">
              <div className="space-y-4 border-b border-slate-200 p-5 dark:border-slate-800 lg:border-b-0 lg:border-r">
                <label className="group flex min-h-[150px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-blue-200 bg-blue-50/60 p-5 text-center transition hover:border-blue-400 hover:bg-blue-50 dark:border-blue-500/30 dark:bg-blue-500/10 dark:hover:bg-blue-500/15">
                  <FileUp className="mb-3 text-blue-600 dark:text-blue-300" size={34} />
                  <span className="text-sm font-bold text-slate-900 dark:text-white">
                    Clique para anexar a foto ou PDF do relato
                  </span>
                  <span className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    Formatos permitidos: JPG, PNG, WEBP ou PDF.
                  </span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,application/pdf"
                    className="hidden"
                    onChange={(e) => selecionarArquivoRelato(e.target.files?.[0])}
                  />
                </label>

                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 dark:border-slate-800 dark:bg-slate-900">
                  {!assistenteRelato.previewUrl && (
                    <div className="flex h-[360px] items-center justify-center p-6 text-center text-sm text-slate-500 dark:text-slate-400">
                      A prévia do documento aparecerá aqui.
                    </div>
                  )}

                  {assistenteRelato.previewUrl && assistenteRelato.arquivo?.type === "application/pdf" && (
                    <iframe
                      src={assistenteRelato.previewUrl}
                      title="Prévia do PDF anexado"
                      className="h-[420px] w-full bg-white"
                    />
                  )}

                  {assistenteRelato.previewUrl && assistenteRelato.arquivo?.type !== "application/pdf" && (
                    <div className="space-y-3 p-3">
                      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-white px-3 py-2 text-xs text-slate-600 dark:bg-slate-950 dark:text-slate-300">
                        <span>
                          Arraste sobre a imagem para selecionar somente a área do relato. Sem recorte, a leitura usa a imagem inteira.
                        </span>
                        {assistenteRelato.recorte && (
                          <button
                            type="button"
                            onClick={() => setAssistenteRelato((atual) => ({ ...atual, recorte: null }))}
                            className="rounded-full border border-slate-200 px-3 py-1 font-bold text-slate-700 transition hover:bg-slate-100 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-800"
                          >
                            Limpar recorte
                          </button>
                        )}
                      </div>
                      <div
                        className="relative mx-auto inline-block max-w-full touch-none select-none overflow-hidden rounded-xl bg-slate-950/5 dark:bg-slate-950"
                        onPointerDown={iniciarRecorteRelato}
                        onPointerMove={moverRecorteRelato}
                        onPointerUp={finalizarRecorteRelato}
                        onPointerCancel={finalizarRecorteRelato}
                      >
                        <img
                          ref={imagemRelatoRef}
                          src={assistenteRelato.previewUrl}
                          alt="Prévia do relato anexado"
                          className="max-h-[420px] max-w-full object-contain"
                          draggable={false}
                        />
                        {assistenteRelato.recorte && (
                          <div
                            className="pointer-events-none absolute border-2 border-blue-400 bg-blue-500/15 shadow-[0_0_0_9999px_rgba(2,6,23,0.45)]"
                            style={{
                              left: assistenteRelato.recorte.x,
                              top: assistenteRelato.recorte.y,
                              width: assistenteRelato.recorte.width,
                              height: assistenteRelato.recorte.height,
                            }}
                          />
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-4 p-5">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/70">
                  <h3 className="font-bold text-slate-900 dark:text-white">Como funciona</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                    O JetGuard envia o arquivo para leitura inteligente, extrai o texto possível e organiza uma
                    sugestão profissional para o campo Relato do Envolvido. Trechos ilegíveis serão sinalizados.
                  </p>
                </div>

                {assistenteRelato.erro && (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-medium text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100">
                    {assistenteRelato.erro}
                  </div>
                )}

                {assistenteRelato.aviso && (
                  <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm font-medium text-blue-800 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-100">
                    {assistenteRelato.aviso}
                  </div>
                )}

                <button
                  type="button"
                  onClick={lerRelatoAssistente}
                  disabled={assistenteRelato.carregando || !assistenteRelato.arquivo}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {assistenteRelato.carregando ? (
                    <>
                      <Loader2 className="animate-spin" size={18} />
                      Lendo documento...
                    </>
                  ) : (
                    <>
                      <Sparkles size={18} />
                      Gerar sugestão de relato
                    </>
                  )}
                </button>

                <div>
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-200">
                    Sugestão gerada
                  </label>
                  <textarea
                    className="mt-2 min-h-[260px] w-full rounded-2xl border border-slate-200 bg-white p-4 text-sm leading-relaxed text-slate-800 outline-none transition focus:border-blue-400 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
                    placeholder="Após a leitura, a sugestão aparecerá aqui para revisão."
                    value={assistenteRelato.sugestao}
                    onChange={(e) =>
                      setAssistenteRelato((atual) => ({ ...atual, sugestao: e.target.value }))
                    }
                  />
                </div>

                <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={limparAssistenteRelato}
                    className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-100 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={aplicarRelatoAssistente}
                    disabled={!assistenteRelato.sugestao.trim()}
                    className="rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Aplicar ao relato
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {ocorrenciaVisualizando && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[92vh] w-full max-w-6xl overflow-auto rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-4 dark:border-slate-800">
              <div>
                <p className="text-xs font-bold uppercase text-blue-600">Visualização do relatório</p>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{ocorrenciaVisualizando.codigo}</h2>
                <p className="text-gray-600 dark:text-slate-300">{ocorrenciaVisualizando.assunto}</p>
              </div>
              <button onClick={() => setOcorrenciaVisualizando(null)} className="rounded bg-slate-200 px-3 py-2">Fechar</button>
            </div>
            <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
              {[
                ["Local", ocorrenciaVisualizando.local],
                ["Status", ocorrenciaVisualizando.status],
                ["Natureza", ocorrenciaVisualizando.natureza],
                ["Subnatureza", ocorrenciaVisualizando.subNatureza],
                ["Data", new Date(ocorrenciaVisualizando.dataOcorrencia).toLocaleString("pt-BR")],
              ].map(([rotulo, valor]) => (
                <div key={rotulo} className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm dark:border-slate-800 dark:bg-slate-950">
                  <p className="text-xs font-bold uppercase text-slate-500">{rotulo}</p>
                  <p className="mt-1 font-semibold text-slate-900 dark:text-white">{valor}</p>
                </div>
              ))}
            </div>
            <div className="mt-5">
              <h3 className="font-bold">Relato</h3>
              <div className="mt-2 rounded-lg bg-slate-50 p-4 text-sm" dangerouslySetInnerHTML={{ __html: ocorrenciaVisualizando.relatoSeguranca || "Sem relato." }} />
            </div>
            <div className="mt-5">
              <h3 className="font-bold">Ações tomadas</h3>
              <div className="mt-2 rounded-lg bg-slate-50 p-4 text-sm" dangerouslySetInnerHTML={{ __html: ocorrenciaVisualizando.acoesTomadas || "Nenhuma ação tomada informada." }} />
            </div>
            <div className="mt-5">
              <h3 className="font-bold">Envolvidos</h3>
              <div className="mt-2 grid grid-cols-1 gap-3">
                {ocorrenciaVisualizando.envolvidos.map((envolvido, index) => (
                  <div key={index} className="rounded-xl border border-slate-200 bg-white p-4 text-sm shadow-sm dark:border-slate-800 dark:bg-slate-950">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <strong className="text-base text-slate-900 dark:text-white">{envolvido.nome}</strong>
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-200">{envolvido.tipoEnvolvimento}</span>
                    </div>
                    <p className="mt-2 text-slate-600 dark:text-slate-300">{envolvido.documento}</p>
                    <p className="mt-3 whitespace-pre-line rounded-lg bg-slate-50 p-3 leading-relaxed text-slate-700 dark:bg-slate-900 dark:text-slate-200">{envolvido.relato || "Sem relato informado."}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-5">
              <h3 className="font-bold">Anexos</h3>
              {(!ocorrenciaVisualizando.anexos || ocorrenciaVisualizando.anexos.length === 0) && (
                <p className="mt-2 text-sm text-gray-500">Nenhum anexo cadastrado.</p>
              )}
              <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
                {ocorrenciaVisualizando.anexos?.map((arquivo) => {
                  const url = `/${arquivo.caminho.replaceAll("\\", "/")}`;
                  const isImagem = arquivo.tipo.startsWith("image/");

                  return (
                    <div key={arquivo.id} className="overflow-hidden rounded-lg border bg-white">
                      {isImagem ? (
                        <a href={url} target="_blank" rel="noreferrer">
                          <img src={url} alt={arquivo.nomeOriginal} className="h-40 w-full object-cover" />
                        </a>
                      ) : (
                        <div className="flex h-40 items-center justify-center bg-slate-100 text-sm font-bold text-slate-600">
                          ARQUIVO
                        </div>
                      )}
                      <div className="space-y-2 p-3">
                        <p className="break-all text-xs text-gray-600">{arquivo.nomeOriginal}</p>
                        <a href={url} target="_blank" rel="noreferrer" className="block rounded bg-slate-900 px-3 py-2 text-center text-xs text-white">
                          Abrir anexo
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="mt-5">
              <h3 className="font-bold">Comentarios internos</h3>
              <div className="mt-2 flex flex-col gap-3 sm:flex-row">
                <input className="flex-1 rounded-lg border p-3" placeholder="Adicionar comentario interno" value={novoComentario} onChange={(e) => setNovoComentario(e.target.value)} />
                <button onClick={salvarComentario} className="rounded bg-blue-600 px-4 py-2 text-white">Comentar</button>
              </div>
              <div className="mt-3 space-y-2">
                {comentarios.length === 0 && <p className="text-sm text-gray-500">Nenhum comentario interno.</p>}
                {comentarios.map((comentario) => (
                  <div key={comentario.id} className="rounded-lg bg-slate-50 p-3 text-sm">
                    <p>{comentario.comentario}</p>
                    <p className="mt-1 text-xs text-gray-500">{comentario.autor?.apelido || comentario.autor?.nome} - {new Date(comentario.createdAt).toLocaleString("pt-BR")}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {ocorrenciaMencao && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-2xl">
            <h2 className="text-xl font-bold">Mencionar usuario</h2>
            <p className="mt-1 text-sm text-gray-500">{ocorrenciaMencao.codigo} - {ocorrenciaMencao.assunto}</p>
            <div className="mt-4 space-y-3">
              <select className="w-full rounded-lg border p-3" value={usuarioMencionadoId} onChange={(e) => setUsuarioMencionadoId(e.target.value)}>
                <option value="">Selecione o usuario</option>
                {usuariosMencao.map((usuario) => <option key={usuario.id} value={usuario.id}>{usuario.apelido || usuario.nome} - {usuario.email}</option>)}
              </select>
              <select className="w-full rounded-lg border p-3" value={tipoMencao} onChange={(e) => setTipoMencao(e.target.value)}>
                <option>Responsavel por tratar</option>
                <option>Acompanhar</option>
                <option>Apoio</option>
                <option>Validador</option>
              </select>
              <textarea className="w-full rounded-lg border p-3" placeholder="Observacao" value={observacaoMencao} onChange={(e) => setObservacaoMencao(e.target.value)} />
              <div className="flex gap-3">
                <button onClick={salvarMencao} className="rounded bg-blue-600 px-4 py-2 text-white">Salvar</button>
                <button onClick={() => setOcorrenciaMencao(null)} className="rounded bg-slate-200 px-4 py-2">Cancelar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {ocorrenciaAnulacao && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-2xl">
            <h2 className="text-xl font-bold">Solicitar anulação</h2>
            <p className="mt-1 text-sm text-gray-500">
              {ocorrenciaAnulacao.codigo} - {ocorrenciaAnulacao.assunto}
            </p>
            <div className="mt-4 space-y-3">
              <textarea
                className="min-h-[140px] w-full rounded-lg border p-3"
                placeholder="Informe o motivo detalhado da anulação"
                value={motivoAnulacao}
                onChange={(e) => setMotivoAnulacao(e.target.value)}
              />
              <div className="rounded-lg bg-orange-50 p-3 text-sm text-orange-800">
                A anulação será enviada para ciência e acordo dos analistas. O relatório não será excluído.
              </div>
              <label className="space-y-1">
                <span className="text-xs font-bold uppercase text-orange-700">PIN operacional para confirmar</span>
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  className="w-full rounded-lg border border-orange-200 p-3 text-sm font-semibold uppercase outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
                  placeholder="****"
                  value={pinAnulacao}
                  onChange={(e) => setPinAnulacao(e.target.value.replace(/\D/g, "").slice(0, 4))}
                />
              </label>
              <div className="flex gap-3">
                <button onClick={solicitarAnulacao} className="rounded bg-orange-600 px-4 py-2 text-white">
                  Enviar solicitação
                </button>
                <button onClick={() => { setOcorrenciaAnulacao(null); setPinAnulacao(""); }} className="rounded bg-slate-200 px-4 py-2">
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {pdfLightbox && (
        <PdfLightbox
          url={pdfLightbox.url}
          titulo={pdfLightbox.titulo}
          nomeArquivo={pdfLightbox.nomeArquivo}
          onClose={fecharPdfLightbox}
        />
      )}
    </div>
  );
}

