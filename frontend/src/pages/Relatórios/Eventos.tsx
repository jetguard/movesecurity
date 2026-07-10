import { useEffect, useMemo, useState } from "react";
import { api } from "../../services/api";
import LexicalEditor from "../../components/editor/LexicalEditor";
import { podeAnalisar } from "../../utils/permissoes";
import { AutoSaveStatus } from "../../components/ui/AutoSaveStatus";
import { useAutoSaveDraft } from "../../hooks/useAutoSaveDraft";
import { PdfLightbox } from "../../components/ui/PdfLightbox";
import { solicitarPinOperacional } from "../../utils/pinPrompt";
import { AtSign, Ban, ClipboardCheck, Edit3, FileText, MapPin, Tags, Users, X } from "lucide-react";

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

type Evento = {
  id: number;
  codigo: string;
  assunto: string;
  local: string;
  natureza: string;
  subNatureza: string;
  status: string;
  fluxoStatus?: string;
  assinaturaAprovacaoValida?: boolean;
  dataEvento: string;
  relatoSeguranca?: string;
  acoesTomadas?: string;
  impactoOperacional?: string;
  envolvidos: Envolvido[];
  anexos?: Anexo[];
  analise?: AnaliseEvento | null;
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

type AnaliseEvento = {
  id: number;
  status: string;
  valorRecuperado: string;
  conclusaoAnalise?: string;
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
const tratativasImpacto = ["Comunicação ao CCOS", "Comunicação à operação", "Comunicação aos transportadores", "Acionamento da autoridade portuária", "Monitoramento da situação"];

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

export default function Eventos() {
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [usuariosMencao, setUsuariosMencao] = useState<UsuarioMencao[]>([]);
  const [eventoVisualizando, setEventoVisualizando] = useState<Evento | null>(null);
  const [eventoMencao, setEventoMencao] = useState<Evento | null>(null);
  const [eventoAnulacao, setEventoAnulacao] = useState<Evento | null>(null);
  const [usuarioMencionadoId, setUsuarioMencionadoId] = useState("");
  const [tipoMencao, setTipoMencao] = useState("Acompanhar");
  const [observacaoMencao, setObservacaoMencao] = useState("");
  const [motivoAnulacao, setMotivoAnulacao] = useState("");
  const [pinAnulacao, setPinAnulacao] = useState("");
  const [comentarios, setComentarios] = useState<ComentarioInterno[]>([]);
  const [novoComentario, setNovoComentario] = useState("");
  const [pdfLightbox, setPdfLightbox] = useState<{ url: string; titulo: string; nomeArquivo: string } | null>(null);
  const [imagemAnexoPreview, setImagemAnexoPreview] = useState<{ url: string; titulo: string } | null>(null);
  const [eventoAnaliseModal, setEventoAnaliseModal] = useState<Evento | null>(null);
  const [naturezas, setNaturezas] = useState<NaturezaCadastro[]>([]);
  const [locais, setLocais] = useState<LocalCadastro[]>([]);
  const [abrirFormulario, setAbrirFormulario] = useState(false);
  const [eventoEditando, setEventoEditando] = useState<Evento | null>(null);
  const [permitirEdicao, setPermitirEdicao] = useState(true);
  const [anexosExistentes, setAnexosExistentes] = useState<Anexo[]>([]);
  const [anexosRemover, setAnexosRemover] = useState<number[]>([]);
  const [anexos, setAnexos] = useState<File[]>([]);
  const [analiseAtual, setAnaliseAtual] = useState<AnaliseEvento | null>(null);
  const [statusAnalise, setStatusAnalise] = useState("Em Análise");
  const [valorRecuperado, setValorRecuperado] = useState("0,00");
  const [conclusaoAnalise, setConclusaoAnalise] = useState("");

  const [assunto, setAssunto] = useState("");
  const [local, setLocal] = useState("");
  const [natureza, setNatureza] = useState("");
  const [subNatureza, setSubNatureza] = useState("");
  const [dataEvento, setDataEvento] = useState("");
  const [etapaFormulario, setEtapaFormulario] = useState(1);
  const [relatoSeguranca, setRelatoSeguranca] = useState("");
  const [acoesTomadas, setAcoesTomadas] = useState("");
  const [impactoOperacional, setImpactoOperacional] = useState<ImpactoOperacional>(impactoOperacionalVazio());
  const [quantidadeEnvolvidos, setQuantidadeEnvolvidos] = useState(1);
  const [envolvidos, setEnvolvidos] = useState<Envolvido[]>([
    { ...envolvidoVazio },
  ]);

  const dadosRascunhoEvento = useMemo(
    () => ({
      assunto,
      local,
      natureza,
      subNatureza,
      dataEvento,
      etapaFormulario,
      relatoSeguranca,
      acoesTomadas,
      impactoOperacional,
      quantidadeEnvolvidos,
      envolvidos,
      statusAnalise,
      valorRecuperado,
      conclusaoAnalise,
    }),
    [
      assunto,
      local,
      natureza,
      subNatureza,
      dataEvento,
      etapaFormulario,
      relatoSeguranca,
      acoesTomadas,
      impactoOperacional,
      quantidadeEnvolvidos,
      envolvidos,
      statusAnalise,
      valorRecuperado,
      conclusaoAnalise,
    ]
  );

  const autoSaveEvento = useAutoSaveDraft({
    modulo: "Evento",
    chave: eventoEditando ? `editar-${eventoEditando.id}` : "novo",
    dados: dadosRascunhoEvento,
    ativo: abrirFormulario,
    onRestore: (dados) => {
      setAssunto(dados.assunto || "");
      setLocal(dados.local || "");
      setNatureza(dados.natureza || "");
      setSubNatureza(dados.subNatureza || "");
      setDataEvento(dados.dataEvento || "");
      setEtapaFormulario(dados.etapaFormulario || 1);
      setRelatoSeguranca(dados.relatoSeguranca || "");
      setAcoesTomadas(dados.acoesTomadas || "");
      setImpactoOperacional(lerImpactoOperacional(dados.impactoOperacional));
      const envolvidosRestaurados = dados.envolvidos?.length ? dados.envolvidos : [{ ...envolvidoVazio }];
      setEnvolvidos(envolvidosRestaurados);
      setQuantidadeEnvolvidos(dados.quantidadeEnvolvidos || envolvidosRestaurados.length || 1);
      setStatusAnalise(dados.statusAnalise || "Em Análise");
      setValorRecuperado(dados.valorRecuperado || "0,00");
      setConclusaoAnalise(dados.conclusaoAnalise || "");
    },
  });

  async function carregarEventos() {
    const response = await api.get("/eventos");
    setEventos(response.data);
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
    if (!eventoMencao || !usuarioMencionadoId) return;
    await api.post("/mencoes", {
      modulo: "Evento",
      registroId: eventoMencao.id,
      codigoRegistro: eventoMencao.codigo,
      tituloRegistro: eventoMencao.assunto,
      usuarioMencionadoId,
      tipoMencao,
      observacao: observacaoMencao,
    });
    setEventoMencao(null);
    setUsuarioMencionadoId("");
    setObservacaoMencao("");
    alert("Usuario mencionado com sucesso");
  }

  async function solicitarAnulacao() {
    if (!eventoAnulacao || !motivoAnulacao.trim()) {
      alert("Informe o motivo da anulação.");
      return;
    }

    if (!/^\d{4}$/.test(pinAnulacao)) {
      alert("Informe seu PIN operacional de 4 dígitos para confirmar a anulação.");
      return;
    }

    await api.post("/anulacoes", {
      modulo: "Evento",
      registroId: eventoAnulacao.id,
      motivo: motivoAnulacao,
      pinOperacional: pinAnulacao,
    });

    setEventoAnulacao(null);
    setMotivoAnulacao("");
    setPinAnulacao("");
    carregarEventos();
    alert("Solicitação de anulação enviada aos analistas e administradores.");
  }

  async function salvarComentario() {
    if (!eventoVisualizando || !novoComentario.trim()) return;
    const response = await api.post(`/comentarios/Evento/${eventoVisualizando.id}`, {
      comentario: novoComentario,
    });
    setComentarios((atuais) => [response.data, ...atuais]);
    setNovoComentario("");
  }

  async function abrirPdfEvento(id: number) {
    const evento = eventos.find((item) => item.id === id);
    const response = await api.get(`/eventos/${id}/pdf`, {
      responseType: "blob",
    });

    const url = URL.createObjectURL(
      new Blob([response.data], { type: "application/pdf" })
    );

    setPdfLightbox({
      url,
      titulo: evento ? `Relatório de Evento ${evento.codigo}` : "Relatório de Evento",
      nomeArquivo: `relatorio-evento-${evento?.codigo || id}.pdf`.replace(/\//g, "-"),
    });
  }

  function fecharPdfLightbox() {
    if (pdfLightbox?.url) URL.revokeObjectURL(pdfLightbox.url);
    setPdfLightbox(null);
  }

  function urlAnexo(arquivo: Anexo) {
    return `/${arquivo.caminho.replaceAll("\\", "/")}`;
  }

  function anexoEhImagem(arquivo: Anexo) {
    return arquivo.tipo.startsWith("image/");
  }

  function visualizarImagemAnexo(arquivo: Anexo) {
    setImagemAnexoPreview({ url: urlAnexo(arquivo), titulo: arquivo.nomeOriginal });
  }

  const subNaturezasDisponiveis =
    naturezas.find((item) => item.nome === natureza)?.subNaturezas || [];
  const localSelecionado = locais.find((item) => item.nome === local);
  const naturezaImpactoOperacional = ehImpactoOperacionalExterno(natureza);

  function alternarImpacto(campo: "operacoesImpactadas" | "tratativas", opcao: string) {
    setImpactoOperacional((atual) => ({
      ...atual,
      [campo]: atual[campo].includes(opcao) ? atual[campo].filter((item) => item !== opcao) : [...atual[campo], opcao],
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
    setEventoEditando(null);
    setPermitirEdicao(true);
    setAnexosExistentes([]);
    setAnexosRemover([]);
    setAnaliseAtual(null);
    setStatusAnalise("Em Análise");
    setValorRecuperado("0,00");
    setConclusaoAnalise("");
    setAssunto("");
    setLocal("");
    setNatureza("");
    setSubNatureza("");
    setDataEvento("");
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

  function documentoBloqueadoParaEdicao(evento?: Evento | null) {
    if (!evento) return false;
    return Boolean(
      evento.status === "Anulado" ||
      evento.assinaturaAprovacaoValida &&
      (evento.fluxoStatus === "Aprovado" || evento.status === "Concluido" || evento.status === "Concluído")
    );
  }

  function mensagemDocumentoBloqueado(evento?: Evento | null) {
    if (evento?.status === "Anulado") {
      alert("Este relatório está anulado e não pode ser editado.");
      return;
    }
    alert("Este documento está concluído e assinado eletronicamente. Não é permitido editar. Solicite a reabertura para realizar alterações.");
  }

  function desbloquearEdicaoEvento() {
    if (documentoBloqueadoParaEdicao(eventoEditando)) {
      mensagemDocumentoBloqueado(eventoEditando);
      return;
    }
    setPermitirEdicao(true);
  }

  function editarEvento(evento: Evento) {
    if (documentoBloqueadoParaEdicao(evento)) {
      mensagemDocumentoBloqueado(evento);
      return;
    }

    setEventoEditando(evento);
    setAssunto(evento.assunto);
    setLocal(evento.local);
    setNatureza(evento.natureza);
    setSubNatureza(evento.subNatureza);
    setDataEvento(formatarDataParaInput(evento.dataEvento));
    setRelatoSeguranca(evento.relatoSeguranca || "");
    setAcoesTomadas(evento.acoesTomadas || "");
    setImpactoOperacional(lerImpactoOperacional(evento.impactoOperacional));
    setQuantidadeEnvolvidos(evento.envolvidos.length || 1);
    setEnvolvidos(
      evento.envolvidos.length ? evento.envolvidos : [{ ...envolvidoVazio }]
    );
    setAnexos([]);
    setEtapaFormulario(1);
    setAbrirFormulario(true);
    setPermitirEdicao(false);
    setAnexosExistentes(evento.anexos || []);
    setAnexosRemover([]);
    setAnaliseAtual(evento.analise || null);
    setStatusAnalise(evento.analise?.status || "Em Análise");
    setValorRecuperado(evento.analise?.valorRecuperado || "0,00");
    setConclusaoAnalise(evento.analise?.conclusaoAnalise || "");
  }

  function cancelarFormulario() {
    const confirmar = window.confirm(
      "As alterações não salvas poderão ser perdidas. Deseja continuar?"
    );

    if (!confirmar) return;

    setAbrirFormulario(false);
    limparFormulario();
  }

  function abrirAnaliseEvento(evento: Evento) {
    setEventoAnaliseModal(evento);
    setAnaliseAtual(evento.analise || null);
    setStatusAnalise(evento.analise?.status || "Em Análise");
    setValorRecuperado(evento.analise?.valorRecuperado || "0,00");
    setConclusaoAnalise(evento.analise?.conclusaoAnalise || "");
  }

  function fecharAnaliseEvento() {
    setEventoAnaliseModal(null);
    setAnaliseAtual(null);
    setStatusAnalise("Em Análise");
    setValorRecuperado("0,00");
    setConclusaoAnalise("");
  }

  async function iniciarAnaliseEvento(id: number, abrirModal = false) {
    const response = await api.post(`/analises/eventos/${id}`);
    setAnaliseAtual(response.data);
    setStatusAnalise(response.data.status);
    setValorRecuperado(response.data.valorRecuperado || "0,00");
    setConclusaoAnalise(response.data.conclusaoAnalise || "");
    if (abrirModal) {
      setEventoAnaliseModal((atual) =>
        atual ? { ...atual, status: response.data.status, analise: response.data } : atual
      );
    }
    setEventoEditando((atual) =>
      atual ? { ...atual, status: response.data.status, analise: response.data } : atual
    );
    carregarEventos();
    alert("Análise iniciada com sucesso");
  }

  async function salvarAnaliseEvento() {
    if (!analiseAtual) return;
    const pinOperacional = statusAnalise === "Concluído"
      ? await solicitarPinOperacional("Informe seu PIN para assinar eletronicamente a conclusão da análise.")
      : "";
    if (statusAnalise === "Concluído" && !pinOperacional) return;

    const response = await api.put(`/analises/eventos/${analiseAtual.id}`, {
      status: statusAnalise,
      valorRecuperado,
      conclusaoAnalise,
      pinOperacional,
    });

    setAnaliseAtual(response.data);
    setEventoAnaliseModal((atual) =>
      atual ? { ...atual, status: response.data.status, analise: response.data } : atual
    );
    setEventoEditando((atual) =>
      atual ? { ...atual, status: response.data.status, analise: response.data } : atual
    );
    carregarEventos();
    alert("Análise salva com sucesso");
  }

  async function salvarEvento(e: React.FormEvent) {
    e.preventDefault();

    const formData = new FormData();

    formData.append("assunto", assunto);
    formData.append("local", local);
    formData.append("natureza", natureza);
    formData.append("subNatureza", subNatureza);
    formData.append("status", eventoEditando?.status || "Aberto");
    formData.append("dataEvento", dataEvento);
    formData.append("relatoSeguranca", relatoSeguranca);
    formData.append("acoesTomadas", acoesTomadas);
    formData.append("impactoOperacional", JSON.stringify(naturezaImpactoOperacional ? impactoOperacional : impactoOperacionalVazio()));
    formData.append("envolvidos", JSON.stringify(envolvidos));
    formData.append("anexosRemover", JSON.stringify(anexosRemover));

    anexos.forEach((arquivo) => {
      formData.append("anexos", arquivo);
    });

    const url = eventoEditando ? `/eventos/${eventoEditando.id}` : "/eventos";
    const request = eventoEditando ? api.put : api.post;

    await request(url, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    await autoSaveEvento.descartar().catch(() => undefined);
    setAbrirFormulario(false);
    limparFormulario();
    carregarEventos();
  }

  useEffect(() => {
    carregarEventos();
    carregarNaturezas();
    carregarLocais();
    carregarUsuariosMencao();
  }, []);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Relatórios de Eventos</h1>
          <p className="text-gray-500 mt-1">
            Gerencie todos os eventos do sistema.
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
          onSubmit={salvarEvento}
          className="bg-white rounded-xl shadow p-6 mb-6 space-y-5"
        >
          <h2 className="text-xl font-bold">
            {eventoEditando
              ? `Editar Evento ${eventoEditando.codigo}`
              : "Novo Evento"}
          </h2>
          <AutoSaveStatus status={autoSaveEvento.status} ultima={autoSaveEvento.ultima} />

          {eventoEditando && (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={desbloquearEdicaoEvento}
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

          <fieldset disabled={!!eventoEditando && !permitirEdicao}>
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
                  <option value="">Selecione o local do evento</option>
                  {locais.map((item) => (
                    <option key={item.id} value={item.nome}>
                      {item.nome}{item.areaSensivel ? " - ÁREA SENSÍVEL" : ""}
                    </option>
                  ))}
                </select>

                {localSelecionado?.areaSensivel && (
                  <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700 md:col-span-2">
                    Local classificado como área sensível. O evento receberá atenção operacional especial.
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
                  <input className="w-full border rounded-lg p-3" type="datetime-local" value={dataEvento} onChange={(e) => setDataEvento(e.target.value)} required />
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
                  <div className="mb-4"><h3 className="font-bold text-orange-950 dark:text-orange-200">Impacto operacional externo</h3><p className="text-sm text-orange-800 dark:text-orange-300">Registre os reflexos operacionais e as tratativas realizadas.</p></div>
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <label className="space-y-1 text-sm font-medium">Data e hora de término<input className="w-full rounded-lg border p-3" type="datetime-local" min={dataEvento} value={impactoOperacional.dataHoraTermino} onChange={(e) => setImpactoOperacional({ ...impactoOperacional, dataHoraTermino: e.target.value })} /></label>
                    <label className="space-y-1 text-sm font-medium">Caminhões estimados na fila<input className="w-full rounded-lg border p-3" type="number" min="0" placeholder="Ex.: 30" value={impactoOperacional.quantidadeCaminhoesFila} onChange={(e) => setImpactoOperacional({ ...impactoOperacional, quantidadeCaminhoesFila: e.target.value })} /></label>
                    <label className="space-y-1 text-sm font-medium">Agendamentos afetados<input className="w-full rounded-lg border p-3" type="number" min="0" placeholder="Ex.: 12" value={impactoOperacional.quantidadeAgendamentosAfetados} onChange={(e) => setImpactoOperacional({ ...impactoOperacional, quantidadeAgendamentosAfetados: e.target.value })} /></label>
                    <label className="space-y-1 text-sm font-medium">Houve atraso operacional?<select className="w-full rounded-lg border p-3" value={impactoOperacional.houveAtrasoOperacional} onChange={(e) => setImpactoOperacional({ ...impactoOperacional, houveAtrasoOperacional: e.target.value })}><option value="">Selecione</option><option>Sim</option><option>Não</option></select></label>
                  </div>
                  <details className="mt-4 rounded-xl border border-orange-200 bg-white/70 p-4 dark:border-orange-900/70 dark:bg-slate-950/40">
                    <summary className="cursor-pointer select-none font-semibold text-orange-950 dark:text-orange-200">Controle de espera da fila <span className="text-xs font-medium text-orange-700 dark:text-orange-300">(opcional)</span></summary>
                    <p className="mt-2 text-sm text-orange-800 dark:text-orange-300">Use a placa do último veículo observado na fila como referência até a chegada na balança.</p>
                    <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                      <label className="space-y-1 text-sm font-medium">Placa do último veículo da fila<input className="w-full rounded-lg border p-3 uppercase" placeholder="Ex.: ABC1D23" value={impactoOperacional.placaUltimoVeiculoFila} onChange={(e) => setImpactoOperacional({ ...impactoOperacional, placaUltimoVeiculoFila: normalizarPlacaFila(e.target.value) })} /></label>
                      <label className="space-y-1 text-sm font-medium">Identificação da placa no final da fila<input className="w-full rounded-lg border p-3" type="datetime-local" min={dataEvento} value={impactoOperacional.dataHoraIdentificacaoUltimoVeiculo} onChange={(e) => setImpactoOperacional({ ...impactoOperacional, dataHoraIdentificacaoUltimoVeiculo: e.target.value })} /></label>
                      <label className="space-y-1 text-sm font-medium">Chegada do veículo na balança<input className="w-full rounded-lg border p-3" type="datetime-local" min={impactoOperacional.dataHoraIdentificacaoUltimoVeiculo || dataEvento} value={impactoOperacional.dataHoraChegadaBalanca} onChange={(e) => setImpactoOperacional({ ...impactoOperacional, dataHoraChegadaBalanca: e.target.value })} /></label>
                      <label className="space-y-1 text-sm font-medium">Tempo calculado de espera<input className="w-full rounded-lg border bg-slate-100 p-3 font-semibold text-slate-700 dark:bg-slate-900 dark:text-slate-100" value={calcularTempoEsperaFila(impactoOperacional)} readOnly /></label>
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
                placeholder="Descreva o relato patrimonial do evento..."
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
              <h3 className="text-lg font-bold">Anexos do Evento</h3>

              <p className="text-sm text-gray-500">
                Anexe fotos ou arquivos PDF relacionados ao evento.
              </p>

              <input
                type="file"
                multiple
                accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
                onChange={selecionarAnexos}
                className="w-full border rounded-lg p-3"
              />

              {anexosExistentes.length > 0 && (
                <div className="bg-gray-50 border rounded-lg p-4">
                  <p className="font-semibold mb-4">Anexos já enviados</p>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {anexosExistentes.map((arquivo) => {
                      const url = urlAnexo(arquivo);
                      const isImagem = anexoEhImagem(arquivo);

                      return (
                        <div
                          key={arquivo.id}
                          className="border rounded-xl overflow-hidden bg-white shadow-sm"
                        >
                          {isImagem ? (
                            <button type="button" onClick={() => visualizarImagemAnexo(arquivo)} className="block w-full">
                              <img
                                src={url}
                                alt={arquivo.nomeOriginal}
                                className="w-full h-32 object-cover"
                              />
                            </button>
                          ) : (
                            <div className="h-32 flex items-center justify-center bg-slate-100 text-slate-700 font-bold text-lg">
                              ARQ
                            </div>
                          )}

                          <div className="p-2 space-y-2">
                            <p className="text-xs text-gray-600 break-all">
                              {arquivo.nomeOriginal}
                            </p>

                            {isImagem ? (
                              <button
                                type="button"
                                onClick={() => visualizarImagemAnexo(arquivo)}
                                className="block w-full text-center bg-slate-900 text-white text-xs py-2 rounded-lg"
                              >
                                Visualizar
                              </button>
                            ) : (
                              <a href={url} target="_blank" rel="noreferrer" className="block text-center bg-slate-900 text-white text-xs py-2 rounded-lg">
                                Abrir arquivo
                              </a>
                            )}
                          </div>

                          <button
                            type="button"
                            onClick={() => removerAnexoExistente(arquivo.id)}
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
                Salvar Evento
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

      {eventos.length === 0 ? (
        <div className="bg-white rounded-xl p-8 shadow text-center text-gray-500">
          Nenhum evento cadastrado.
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <div className="overflow-x-auto">
            <table className="min-w-[1040px] w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-[0.12em] text-slate-500 dark:bg-slate-900 dark:text-slate-400">
                <tr>
                  <th className="px-4 py-3">Evento</th>
                  <th className="px-4 py-3">Assunto</th>
                  <th className="px-4 py-3">Local</th>
                  <th className="px-4 py-3">Natureza</th>
                  <th className="px-4 py-3 text-center">Envolvidos</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {eventos.map((evento) => (
                  <tr key={evento.id} className="transition hover:bg-cyan-50/60 dark:hover:bg-cyan-500/5">
                    <td className="px-4 py-4">
                      <div className="font-black text-slate-900 dark:text-white">{evento.codigo}</div>
                      <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        {new Date(evento.dataEvento).toLocaleString("pt-BR")}
                      </div>
                    </td>
                    <td className="max-w-[260px] px-4 py-4">
                      <p className="line-clamp-2 font-semibold text-slate-800 dark:text-slate-100">{evento.assunto}</p>
                    </td>
                    <td className="px-4 py-4">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 dark:bg-slate-900 dark:text-slate-300">
                        <MapPin size={13} /> {evento.local}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 dark:bg-slate-900 dark:text-slate-300">
                        <Tags size={13} /> {evento.natureza} / {evento.subNatureza}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-cyan-500/10 px-3 py-1 text-xs font-bold text-cyan-600 dark:text-cyan-300">
                        <Users size={13} /> {evento.envolvidos.length}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
                        {evento.status}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex justify-end gap-2">
                        {podeAnalisar() && (
                          <button type="button" onClick={() => evento.analise ? abrirAnaliseEvento(evento) : (setEventoAnaliseModal(evento), iniciarAnaliseEvento(evento.id, true))} className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-amber-400/30 bg-amber-500/10 text-amber-600 transition hover:-translate-y-0.5 hover:bg-amber-500/20 dark:text-amber-200" title={evento.analise ? "Abrir análise" : "Iniciar análise"}>
                            <ClipboardCheck size={17} />
                          </button>
                        )}
                        <button type="button" onClick={() => setEventoMencao(evento)} className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-indigo-400/30 bg-indigo-500/10 text-indigo-600 transition hover:-translate-y-0.5 hover:bg-indigo-500/20 dark:text-indigo-200" title="Mencionar usuário">
                          <AtSign size={17} />
                        </button>
                        <button type="button" onClick={() => editarEvento(evento)} className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-blue-400/30 bg-blue-500/10 text-blue-600 transition hover:-translate-y-0.5 hover:bg-blue-500/20 dark:text-blue-200" title="Editar relatório">
                          <Edit3 size={17} />
                        </button>
                        <button type="button" onClick={() => abrirPdfEvento(evento.id)} className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-red-400/30 bg-red-500/10 text-red-600 transition hover:-translate-y-0.5 hover:bg-red-500/20 dark:text-red-200" title="Abrir PDF">
                          <FileText size={17} />
                        </button>
                        {evento.status !== "Anulado" && (
                          <button type="button" onClick={() => setEventoAnulacao(evento)} className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-orange-400/30 bg-orange-500/10 text-orange-600 transition hover:-translate-y-0.5 hover:bg-orange-500/20 dark:text-orange-200" title="Solicitar anulação">
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

      {eventoAnaliseModal && podeAnalisar() && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
          <div className="max-h-[92vh] w-full max-w-4xl overflow-hidden rounded-3xl border border-amber-500/20 bg-white shadow-2xl dark:bg-slate-950">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-900/70">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20">
                  <ClipboardCheck size={22} />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-amber-600 dark:text-amber-300">
                    Análise do evento
                  </p>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                    {eventoAnaliseModal.codigo} - {eventoAnaliseModal.assunto}
                  </h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Registre a avaliação sem misturar a análise com os dados originais do evento.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={fecharAnaliseEvento}
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
                  <p className="mt-1 font-bold text-slate-900 dark:text-white">{eventoAnaliseModal.status}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900">
                  <p className="text-xs font-bold uppercase text-slate-500">Local</p>
                  <p className="mt-1 font-bold text-slate-900 dark:text-white">{eventoAnaliseModal.local}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900">
                  <p className="text-xs font-bold uppercase text-slate-500">Natureza</p>
                  <p className="mt-1 font-bold text-slate-900 dark:text-white">{eventoAnaliseModal.natureza}</p>
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
                  value={valorRecuperado}
                  onChange={(e) => setValorRecuperado(formatarBrl(e.target.value))}
                  placeholder="Valor recuperado em BRL"
                  inputMode="numeric"
                />
              </div>

              <LexicalEditor
                value={conclusaoAnalise}
                onChange={setConclusaoAnalise}
                title="Descrição da análise"
                placeholder="Descreva a análise do evento, providências avaliadas e conclusão técnica..."
              />

              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={fecharAnaliseEvento}
                  className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-100 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={salvarAnaliseEvento}
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

      {eventoVisualizando && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[92vh] w-full max-w-6xl overflow-auto rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-4 dark:border-slate-800">
              <div>
                <p className="text-xs font-bold uppercase text-blue-600">Visualização do relatório</p>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{eventoVisualizando.codigo}</h2>
                <p className="text-gray-600 dark:text-slate-300">{eventoVisualizando.assunto}</p>
              </div>
              <button onClick={() => setEventoVisualizando(null)} className="rounded bg-slate-200 px-3 py-2">Fechar</button>
            </div>
            <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
              {[
                ["Local", eventoVisualizando.local],
                ["Status", eventoVisualizando.status],
                ["Natureza", eventoVisualizando.natureza],
                ["Subnatureza", eventoVisualizando.subNatureza],
                ["Data", new Date(eventoVisualizando.dataEvento).toLocaleString("pt-BR")],
              ].map(([rotulo, valor]) => (
                <div key={rotulo} className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm dark:border-slate-800 dark:bg-slate-950">
                  <p className="text-xs font-bold uppercase text-slate-500">{rotulo}</p>
                  <p className="mt-1 font-semibold text-slate-900 dark:text-white">{valor}</p>
                </div>
              ))}
            </div>
            <div className="mt-5">
              <h3 className="font-bold">Relato</h3>
              <div className="mt-2 rounded-lg bg-slate-50 p-4 text-sm" dangerouslySetInnerHTML={{ __html: eventoVisualizando.relatoSeguranca || "Sem relato." }} />
            </div>
            <div className="mt-5">
              <h3 className="font-bold">Ações tomadas</h3>
              <div className="mt-2 rounded-lg bg-slate-50 p-4 text-sm" dangerouslySetInnerHTML={{ __html: eventoVisualizando.acoesTomadas || "Nenhuma ação tomada informada." }} />
            </div>
            <div className="mt-5">
              <h3 className="font-bold">Envolvidos</h3>
              <div className="mt-2 grid grid-cols-1 gap-3">
                {eventoVisualizando.envolvidos.map((envolvido, index) => (
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
              {(!eventoVisualizando.anexos || eventoVisualizando.anexos.length === 0) && (
                <p className="mt-2 text-sm text-gray-500">Nenhum anexo cadastrado.</p>
              )}
              <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
                {eventoVisualizando.anexos?.map((arquivo) => {
                  const url = urlAnexo(arquivo);
                  const isImagem = anexoEhImagem(arquivo);

                  return (
                    <div key={arquivo.id} className="overflow-hidden rounded-lg border bg-white">
                      {isImagem ? (
                        <button type="button" onClick={() => visualizarImagemAnexo(arquivo)} className="block w-full">
                          <img src={url} alt={arquivo.nomeOriginal} className="h-40 w-full object-cover" />
                        </button>
                      ) : (
                        <div className="flex h-40 items-center justify-center bg-slate-100 text-sm font-bold text-slate-600">
                          ARQUIVO
                        </div>
                      )}
                      <div className="space-y-2 p-3">
                        <p className="break-all text-xs text-gray-600">{arquivo.nomeOriginal}</p>
                        {isImagem ? (
                          <button type="button" onClick={() => visualizarImagemAnexo(arquivo)} className="block w-full rounded bg-slate-900 px-3 py-2 text-center text-xs text-white">
                            Visualizar
                          </button>
                        ) : (
                          <a href={url} target="_blank" rel="noreferrer" className="block rounded bg-slate-900 px-3 py-2 text-center text-xs text-white">
                            Abrir arquivo
                          </a>
                        )}
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

      {eventoMencao && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-2xl">
            <h2 className="text-xl font-bold">Mencionar usuario</h2>
            <p className="mt-1 text-sm text-gray-500">{eventoMencao.codigo} - {eventoMencao.assunto}</p>
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
                <button onClick={() => setEventoMencao(null)} className="rounded bg-slate-200 px-4 py-2">Cancelar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {eventoAnulacao && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-2xl">
            <h2 className="text-xl font-bold">Solicitar anulação</h2>
            <p className="mt-1 text-sm text-gray-500">
              {eventoAnulacao.codigo} - {eventoAnulacao.assunto}
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
                <button onClick={() => { setEventoAnulacao(null); setPinAnulacao(""); }} className="rounded bg-slate-200 px-4 py-2">
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

      {imagemAnexoPreview && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 p-4">
          <div className="relative w-full max-w-5xl overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Visualização do anexo</p>
                <h3 className="truncate text-base font-bold text-slate-900">{imagemAnexoPreview.titulo}</h3>
              </div>
              <button
                type="button"
                onClick={() => setImagemAnexoPreview(null)}
                className="rounded-full bg-slate-100 p-2 text-slate-600 transition hover:bg-slate-200"
                aria-label="Fechar visualização"
              >
                <X size={18} />
              </button>
            </div>
            <div className="flex max-h-[78vh] items-center justify-center bg-slate-950 p-4">
              <img src={imagemAnexoPreview.url} alt={imagemAnexoPreview.titulo} className="max-h-[72vh] max-w-full rounded-lg object-contain" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

