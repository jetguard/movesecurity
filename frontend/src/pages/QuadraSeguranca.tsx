import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent, PointerEvent } from "react";
import { ChevronDown, Download, Eye, FileText, MapPinned, PackageSearch, Pencil, Trash2 } from "lucide-react";
import { api } from "../services/api";
import { podeAdministrar, podeAnalisar, usuarioAtual } from "../utils/permissoes";
import { SkeletonTable } from "../components/ui/Skeleton";

type Anexo = {
  id: number;
  categoria: string;
  nomeOriginal: string;
  caminho: string;
  tipo: string;
  createdAt: string;
  usuario?: { nome: string; apelido?: string | null };
};

type Historico = {
  id: number;
  acao: string;
  detalhes?: string | null;
  createdAt: string;
  usuario?: { nome: string; apelido?: string | null };
};

type ContainerQuadra = {
  id: number;
  numeroContainer: string;
  unidade: string;
  dataHoraEntrada: string;
  dataHoraSaida?: string | null;
  posicionamento?: string | null;
  tipoContainer: string;
  dimensao: string;
  destino: string;
  scannerEntrada: boolean;
  scannerSaida?: boolean | null;
  estufadoTerminal: boolean;
  numeroLacre?: string | null;
  armador?: string | null;
  prioridade: string;
  statusOperacional: string;
  observacoes?: string | null;
  observacoesSaida?: string | null;
  tempoTerminal: string;
  anexos?: Anexo[];
  historico?: Historico[];
};

const inicial = {
  numeroContainer: "",
  dataHoraEntrada: "",
  dataHoraSaida: "",
  posicionamento: "",
  tipoContainer: "",
  dimensao: "",
  destino: "",
  scannerEntrada: "",
  scannerSaida: "",
  estufadoTerminal: "",
  numeroLacre: "",
  armador: "",
  prioridade: "",
  statusOperacional: "Previsão para chegada",
  observacoes: "",
  observacoesSaida: "",
};

const tiposContainer = ["Dry", "Reefer", "Tank", "Open Top", "Flat Rack"];
const dimensoes = ["20 pés", "40 pés", "40 HC"];
const destinos = ["África", "Europa", "Ásia", "América do Norte", "América do Sul", "América Central", "Oriente Médio", "Oceania"];
const prioridades = ["Baixa", "Média", "Alta", "Crítica"];
const statusOperacionais = ["Previsão para chegada", "No terminal", "Liberado"];

const quadrasMapa = ["A06", "A07", "A08", "A09", "A10", "A11"];
const pilhasMapa = ["01", "02", "03", "04", "05"];
const alturasMapa = ["5", "4", "3", "2", "1"];
const posicoes40: Record<string, string> = { A09: "A08", A11: "A10" };

function inputData(data?: string | null) {
  if (!data) return "";
  const date = new Date(data);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

function nomeUsuario(usuario?: { nome: string; apelido?: string | null }) {
  return usuario?.apelido || usuario?.nome || "Sistema";
}

function mascararContainer(valor: string) {
  const limpo = valor.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 11);
  const letras = limpo.slice(0, 4).replace(/[^A-Z]/g, "");
  const numeros = limpo.slice(4).replace(/\D/g, "").slice(0, 7);

  if (!numeros) return letras;

  const parte1 = numeros.slice(0, 3);
  const parte2 = numeros.slice(3, 6);
  const digito = numeros.slice(6, 7);

  let formatado = `${letras} ${parte1}`;
  if (parte2) formatado += `.${parte2}`;
  if (digito) formatado += `-${digito}`;

  return formatado.trim();
}

function normalizarPosicao(valor?: string | null) {
  return String(valor || "").toLocaleUpperCase("pt-BR").replace(/[^A-Z0-9]/g, "").slice(0, 6);
}

function interpretarPosicao(valor?: string | null) {
  const posicao = normalizarPosicao(valor);
  const match = /^A(0[6-9]|1[01])([0-9]{2})([1-5])$/.exec(posicao);
  if (!match) return null;
  return {
    posicao,
    quadra: `A${match[1]}`,
    pilha: match[2],
    altura: match[3],
  };
}

function dimensaoMapa(dimensao: string) {
  return String(dimensao || "").includes("40") ? "40" : "20";
}

function slotChave(quadra: string, pilha: string, altura: string) {
  return `${quadra}${pilha}${altura}`;
}

function slotsContainer(container: ContainerQuadra) {
  const posicao = interpretarPosicao(container.posicionamento);
  if (!posicao) return [];
  if (dimensaoMapa(container.dimensao) === "40") {
    const quadraAnterior = posicoes40[posicao.quadra];
    return quadraAnterior
      ? [slotChave(quadraAnterior, posicao.pilha, posicao.altura), slotChave(posicao.quadra, posicao.pilha, posicao.altura)]
      : [posicao.posicao];
  }
  return [posicao.posicao];
}

function calcularPosicoesDisponiveis(containers: ContainerQuadra[], dimensaoValor: string, posicaoAtual?: string | null) {
  const dimensao = dimensaoMapa(dimensaoValor || "20 pés");
  const candidatosQuadra = dimensao === "40" ? ["A09", "A11"] : ["A06", "A07"];
  const slotsOcupados = new Set<string>();
  const pilhasPorDimensao = new Map<string, string>();

  containers.forEach((container) => {
    slotsContainer(container).forEach((slot) => slotsOcupados.add(slot));
    const posicao = interpretarPosicao(container.posicionamento);
    if (!posicao) return;
    const dimensaoContainer = dimensaoMapa(container.dimensao);
    const quadras = dimensaoContainer === "40" && posicoes40[posicao.quadra]
      ? [posicoes40[posicao.quadra], posicao.quadra]
      : [posicao.quadra];
    quadras.forEach((quadra) => pilhasPorDimensao.set(`${quadra}-${posicao.pilha}`, dimensaoContainer));
  });

  const atual = normalizarPosicao(posicaoAtual);
  const sugestoes: string[] = [];
  candidatosQuadra.forEach((quadra) => {
    pilhasMapa.forEach((pilha) => {
      alturasMapa.slice().reverse().forEach((altura) => {
        const posicao = slotChave(quadra, pilha, altura);
        const slots = dimensao === "40" && posicoes40[quadra]
          ? [slotChave(posicoes40[quadra], pilha, altura), posicao]
          : [posicao];
        const pilhas = dimensao === "40" && posicoes40[quadra]
          ? [`${posicoes40[quadra]}-${pilha}`, `${quadra}-${pilha}`]
          : [`${quadra}-${pilha}`];
        const temSlotOcupado = slots.some((slot) => slotsOcupados.has(slot));
        const misturaDimensao = pilhas.some((pilhaChave) => {
          const dimensaoExistente = pilhasPorDimensao.get(pilhaChave);
          return dimensaoExistente && dimensaoExistente !== dimensao;
        });

        if ((!temSlotOcupado && !misturaDimensao) || posicao === atual) sugestoes.push(posicao);
      });
    });
  });

  return Array.from(new Set(sugestoes)).slice(0, 100);
}

export default function QuadraSeguranca() {
  const [containers, setContainers] = useState<ContainerQuadra[]>([]);
  const [form, setForm] = useState({ ...inicial });
  const [arquivos, setArquivos] = useState<File[]>([]);
  const [editando, setEditando] = useState<ContainerQuadra | null>(null);
  const [reposicionando, setReposicionando] = useState<ContainerQuadra | null>(null);
  const [novaPosicao, setNovaPosicao] = useState("");
  const [dossie, setDossie] = useState<ContainerQuadra | null>(null);
  const [containerMapaSelecionado, setContainerMapaSelecionado] = useState<ContainerQuadra | null>(null);
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("");
  const [filtroDimensao, setFiltroDimensao] = useState("");
  const [filtroDestino, setFiltroDestino] = useState("");
  const [pilhaMapa, setPilhaMapa] = useState("05");
  const [quadraMapa, setQuadraMapa] = useState<string | null>(null);
  const [pilhaManual, setPilhaManual] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [formularioAberto, setFormularioAberto] = useState(false);
  const [anguloMapa, setAnguloMapa] = useState({ x: 60, z: -36 });
  const [arrastoMapa, setArrastoMapa] = useState<{ x: number; y: number; anguloX: number; anguloZ: number } | null>(null);
  const [giroAutomaticoMapa, setGiroAutomaticoMapa] = useState(true);
  const retomadaGiroMapa = useRef<number | null>(null);
  const podeExcluir = podeAdministrar() || podeAnalisar();
  const usuario = usuarioAtual();

  async function carregar() {
    setCarregando(true);
    const response = await api.get("/quadra-seguranca");
    setContainers(response.data);
    setCarregando(false);
  }

  useEffect(() => {
    carregar().catch(() => setCarregando(false));
  }, []);

  useEffect(() => {
    if (!giroAutomaticoMapa || arrastoMapa) return;
    const intervalo = window.setInterval(() => {
      setAnguloMapa((atual) => ({ ...atual, z: normalizarGiro(atual.z + 0.16) }));
    }, 80);

    return () => window.clearInterval(intervalo);
  }, [arrastoMapa, giroAutomaticoMapa]);

  useEffect(() => () => {
    if (retomadaGiroMapa.current) window.clearTimeout(retomadaGiroMapa.current);
  }, []);

  const filtrados = useMemo(() => {
    return containers.filter((item) => {
      const texto = `${item.numeroContainer} ${item.armador || ""} ${item.posicionamento || ""}`.toLowerCase();
      return (
        (!busca || texto.includes(busca.toLowerCase())) &&
        (!filtroStatus || item.statusOperacional === filtroStatus) &&
        (!filtroTipo || item.tipoContainer === filtroTipo) &&
        (!filtroDimensao || item.dimensao === filtroDimensao) &&
        (!filtroDestino || item.destino === filtroDestino)
      );
    });
  }, [busca, containers, filtroDestino, filtroDimensao, filtroStatus, filtroTipo]);

  const resumo = useMemo(() => ({
    total: containers.length,
    previstos: containers.filter((item) => item.statusOperacional === "Previsão para chegada" || item.statusOperacional === "Previsto para chegada").length,
    terminal: containers.filter((item) => item.statusOperacional === "No terminal" || item.statusOperacional === "Dentro do terminal").length,
    liberados: containers.filter((item) => item.statusOperacional === "Liberado").length,
    mapaPosicoes: Object.entries(containers.reduce<Record<string, number>>((acc, item) => {
      const posicao = item.posicionamento || "Sem posição";
      acc[posicao] = (acc[posicao] || 0) + 1;
      return acc;
    }, {})).map(([posicao, total]) => ({ posicao, total })).sort((a, b) => b.total - a.total),
  }), [containers]);

  const containersNoPatio = useMemo(
    () => containers.filter((item) => item.statusOperacional !== "Liberado" && interpretarPosicao(item.posicionamento)),
    [containers]
  );

  const containerDestacado = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return null;
    return containersNoPatio.find((item) => `${item.numeroContainer} ${item.posicionamento || ""} ${item.armador || ""}`.toLowerCase().includes(termo)) || null;
  }, [busca, containersNoPatio]);

  const containerPainelMapa = useMemo(() => {
    const selecionadoAtual = containerMapaSelecionado
      ? containersNoPatio.find((item) => item.id === containerMapaSelecionado.id) || null
      : null;
    return selecionadoAtual || containerDestacado || null;
  }, [containerDestacado, containerMapaSelecionado, containersNoPatio]);

  const ocupacaoMapa = useMemo(() => {
    const mapa = new Map<string, ContainerQuadra>();
    containersNoPatio.forEach((container) => {
      slotsContainer(container).forEach((slot) => mapa.set(slot, container));
    });
    return mapa;
  }, [containersNoPatio]);

  const ocupacaoPorPilha = useMemo(() => {
    const mapa = new Map<string, number>();
    containersNoPatio.forEach((container) => {
      const posicao = interpretarPosicao(container.posicionamento);
      if (!posicao) return;
      mapa.set(posicao.pilha, (mapa.get(posicao.pilha) || 0) + 1);
    });
    return mapa;
  }, [containersNoPatio]);

  const ocupacaoPorQuadra = useMemo(() => {
    const mapa = new Map<string, number>();
    containersNoPatio.forEach((container) => {
      const posicao = interpretarPosicao(container.posicionamento);
      if (!posicao) return;
      mapa.set(posicao.quadra, (mapa.get(posicao.quadra) || 0) + 1);
    });
    return mapa;
  }, [containersNoPatio]);

  const referenciasMapa = useMemo(() => {
    const mapa = new Map<string, ContainerQuadra[]>();
    containersNoPatio.forEach((container) => {
      const posicao = interpretarPosicao(container.posicionamento);
      if (!posicao || posicao.pilha === pilhaMapa) return;

      slotsContainer(container).forEach((slot) => {
        const slotInterpretado = interpretarPosicao(slot);
        if (!slotInterpretado) return;
        const chave = slotChave(slotInterpretado.quadra, pilhaMapa, slotInterpretado.altura);
        const lista = mapa.get(chave) || [];
        lista.push(container);
        mapa.set(chave, lista);
      });
    });
    return mapa;
  }, [containersNoPatio, pilhaMapa]);

  useEffect(() => {
    if (quadraMapa && !ocupacaoPorQuadra.has(quadraMapa)) setQuadraMapa(null);
  }, [ocupacaoPorQuadra, quadraMapa]);

  useEffect(() => {
    if (pilhaManual || containersNoPatio.length === 0 || ocupacaoPorPilha.has(pilhaMapa)) return;
    const primeiraPilhaComConteudo = pilhasMapa.slice().reverse().find((pilha) => ocupacaoPorPilha.has(pilha));
    if (primeiraPilhaComConteudo) setPilhaMapa(primeiraPilhaComConteudo);
  }, [containersNoPatio.length, ocupacaoPorPilha, pilhaManual, pilhaMapa]);

  const posicaoDestacada = containerDestacado ? new Set(slotsContainer(containerDestacado)) : new Set<string>();

  const containersMapa3D = useMemo(() => {
    const slotLargura = 112;
    const slotAltura = 74;

    return containersNoPatio
      .map((container) => {
        const posicao = interpretarPosicao(container.posicionamento);
        if (!posicao) return null;

        const eh40 = dimensaoMapa(container.dimensao) === "40";
        const quadraBase = eh40 && posicoes40[posicao.quadra] ? posicoes40[posicao.quadra] : posicao.quadra;
        const quadraIndice = quadrasMapa.indexOf(quadraBase);
        const pilhaIndice = pilhasMapa.indexOf(posicao.pilha);
        const alturaIndice = Number(posicao.altura) - 1;
        if (quadraIndice < 0 || pilhaIndice < 0 || alturaIndice < 0) return null;

        const destaque = containerDestacado?.id === container.id || containerPainelMapa?.id === container.id;
        const pilhaAtiva = posicao.pilha === pilhaMapa;
        const quadraAtiva = !quadraMapa || posicao.quadra === quadraMapa;

        return {
          container,
          posicao,
          eh40,
          destaque,
          pilhaAtiva,
          quadraAtiva,
          left: 62 + quadraIndice * slotLargura,
          top: 76 + pilhaIndice * slotAltura,
          width: eh40 ? 222 : 102,
          height: 46,
          depth: 58,
          z: alturaIndice * 42,
          zIndex: 60 + pilhaIndice * 12 + alturaIndice + (destaque ? 220 : pilhaAtiva ? 80 : 0),
        };
      })
      .filter(Boolean)
      .sort((a, b) => (a!.zIndex - b!.zIndex)) as Array<{
        container: ContainerQuadra;
        posicao: NonNullable<ReturnType<typeof interpretarPosicao>>;
        eh40: boolean;
        destaque: boolean;
        pilhaAtiva: boolean;
        quadraAtiva: boolean;
        left: number;
        top: number;
        width: number;
        height: number;
        depth: number;
        z: number;
        zIndex: number;
      }>;
  }, [containerDestacado, containerPainelMapa, containersNoPatio, pilhaMapa, quadraMapa]);

  useEffect(() => {
    const posicao = interpretarPosicao(containerDestacado?.posicionamento);
    if (!posicao || posicao.pilha === pilhaMapa) return;
    setPilhaMapa(posicao.pilha);
  }, [containerDestacado, pilhaMapa]);

  const posicoesSugeridas = useMemo(() => {
    if (form.statusOperacional === "Previsão para chegada") return [];

    const containersBase = containersNoPatio.filter((container) => container.id !== editando?.id);
    return calcularPosicoesDisponiveis(containersBase, form.dimensao, editando?.posicionamento);
  }, [containersNoPatio, editando?.id, editando?.posicionamento, form.dimensao, form.statusOperacional]);

  const posicoesReposicionamento = useMemo(() => {
    if (!reposicionando) return [];
    const containersBase = containersNoPatio.filter((container) => container.id !== reposicionando.id);
    return calcularPosicoesDisponiveis(containersBase, reposicionando.dimensao, reposicionando.posicionamento);
  }, [containersNoPatio, reposicionando]);

  function campo(nome: string, valor: string) {
    setForm((atual) => ({
      ...atual,
      ...(nome === "statusOperacional" && valor === "Previsão para chegada" ? { posicionamento: "" } : {}),
      [nome]: nome === "numeroContainer"
        ? mascararContainer(valor)
        : nome === "posicionamento"
          ? normalizarPosicao(valor)
        : ["posicionamento", "numeroLacre", "armador"].includes(nome)
          ? valor.toLocaleUpperCase("pt-BR")
          : valor,
    }));
  }

  function novo() {
    setEditando(null);
    setArquivos([]);
    setForm({ ...inicial, dataHoraEntrada: inputData(new Date().toISOString()) });
    setFormularioAberto(true);
  }

  function editar(item: ContainerQuadra) {
    setEditando(item);
    setArquivos([]);
    setForm({
      numeroContainer: item.numeroContainer,
      dataHoraEntrada: inputData(item.dataHoraEntrada),
      dataHoraSaida: inputData(item.dataHoraSaida),
      posicionamento: item.posicionamento || "",
      tipoContainer: item.tipoContainer,
      dimensao: item.dimensao,
      destino: item.destino,
      scannerEntrada: item.scannerEntrada ? "Sim" : "Não",
      scannerSaida: item.scannerSaida === null || item.scannerSaida === undefined ? "" : item.scannerSaida ? "Sim" : "Não",
      estufadoTerminal: item.estufadoTerminal ? "Sim" : "Não",
      numeroLacre: item.numeroLacre || "",
      armador: item.armador || "",
      prioridade: item.prioridade,
      statusOperacional: item.statusOperacional === "Dentro do terminal" ? "No terminal" : item.statusOperacional,
      observacoes: item.observacoes || "",
      observacoesSaida: item.observacoesSaida || "",
    });
    setFormularioAberto(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function salvar(event: FormEvent) {
    event.preventDefault();
    const formData = new FormData();
    Object.entries(form).forEach(([chave, valor]) => {
      if (valor !== "") formData.append(chave, valor);
    });
    arquivos.forEach((arquivo) => formData.append("anexos", arquivo));

    if (editando) {
      await api.put(`/quadra-seguranca/${editando.id}`, formData, { headers: { "Content-Type": "multipart/form-data" } });
    } else {
      await api.post("/quadra-seguranca", formData, { headers: { "Content-Type": "multipart/form-data" } });
    }

    novo();
    await carregar();
  }

  function abrirReposicionamento(item: ContainerQuadra) {
    setReposicionando(item);
    setNovaPosicao(normalizarPosicao(item.posicionamento));
  }

  async function salvarReposicionamento(event: FormEvent) {
    event.preventDefault();
    if (!reposicionando) return;

    const posicao = normalizarPosicao(novaPosicao);
    if (!posicao) {
      alert("Selecione uma posição disponível para reposicionar o contêiner.");
      return;
    }

    await api.put(`/quadra-seguranca/${reposicionando.id}`, {
      posicionamento: posicao,
      statusOperacional: reposicionando.statusOperacional,
    });
    setReposicionando(null);
    setNovaPosicao("");
    await carregar();
  }

  async function abrirDossie(item: ContainerQuadra) {
    const response = await api.get(`/quadra-seguranca/${item.id}`);
    setDossie(response.data);
  }

  async function baixarDossiePdf(item: ContainerQuadra) {
    const response = await api.get(`/quadra-seguranca/${item.id}/pdf`, { responseType: "blob" });
    const url = URL.createObjectURL(response.data);
    window.open(url, "_blank", "noopener,noreferrer");
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }

  async function excluir(item: ContainerQuadra) {
    if (!confirm(`Deseja excluir o contêiner ${item.numeroContainer}?`)) return;
    await api.delete(`/quadra-seguranca/${item.id}`);
    await carregar();
  }

  function limitarAngulo(valor: number, minimo: number, maximo: number) {
    return Math.min(maximo, Math.max(minimo, valor));
  }

  function normalizarGiro(valor: number) {
    return ((valor % 360) + 360) % 360;
  }

  function pausarGiroAutomatico(tempoRetorno = 4500) {
    setGiroAutomaticoMapa(false);
    if (retomadaGiroMapa.current) window.clearTimeout(retomadaGiroMapa.current);
    retomadaGiroMapa.current = window.setTimeout(() => {
      setGiroAutomaticoMapa(true);
      retomadaGiroMapa.current = null;
    }, tempoRetorno);
  }

  function iniciarArrastoMapa(event: PointerEvent<HTMLDivElement>) {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    pausarGiroAutomatico();
    setArrastoMapa({
      x: event.clientX,
      y: event.clientY,
      anguloX: anguloMapa.x,
      anguloZ: normalizarGiro(anguloMapa.z),
    });
  }

  function moverArrastoMapa(event: PointerEvent<HTMLDivElement>) {
    if (!arrastoMapa) return;
    const deltaX = event.clientX - arrastoMapa.x;
    const deltaY = event.clientY - arrastoMapa.y;
    setAnguloMapa({
      x: limitarAngulo(arrastoMapa.anguloX - deltaY * 0.18, 38, 74),
      z: normalizarGiro(arrastoMapa.anguloZ + deltaX * 0.18),
    });
  }

  function encerrarArrastoMapa(event: PointerEvent<HTMLDivElement>) {
    if (arrastoMapa) event.currentTarget.releasePointerCapture(event.pointerId);
    setArrastoMapa(null);
  }

  return (
    <div className="space-y-6 text-slate-900 dark:text-slate-100">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Quadra de Segurança</h1>
          <p className="mt-1 text-slate-500 dark:text-slate-400">
            Controle operacional, posicionamento e rastreabilidade de contêineres.
          </p>
        </div>
        <button onClick={novo} className="rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700">
          Novo Contêiner
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <p className="text-sm text-slate-500">Total cadastrado</p>
          <p className="mt-2 text-3xl font-bold">{resumo.total}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <p className="text-sm text-slate-500">Previsão para chegada</p>
          <p className="mt-2 text-3xl font-bold text-amber-600">{resumo.previstos}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <p className="text-sm text-slate-500">No terminal</p>
          <p className="mt-2 text-3xl font-bold text-blue-600">{resumo.terminal}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <p className="text-sm text-slate-500">Liberados</p>
          <p className="mt-2 text-3xl font-bold text-emerald-600">{resumo.liberados}</p>
        </div>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <button
          type="button"
          onClick={() => setFormularioAberto((aberto) => !aberto)}
          className="flex w-full items-center justify-between gap-4 p-5 text-left"
        >
          <div className="flex items-center gap-2">
            <PackageSearch className="text-blue-600" />
            <div>
              <h2 className="text-xl font-bold">{editando ? `Editar ${editando.numeroContainer}` : "Cadastro de Contêiner"}</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {formularioAberto ? "Preencha os dados operacionais do contêiner." : "Clique para expandir o formulário."}
              </p>
            </div>
          </div>
          <ChevronDown className={`text-slate-500 transition ${formularioAberto ? "rotate-180" : ""}`} />
        </button>

        {formularioAberto && (
          <form onSubmit={salvar} className="border-t border-slate-200 p-5 dark:border-slate-800">
            <div className="space-y-5">
              <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-4 dark:border-blue-500/20 dark:bg-blue-500/5">
                <div className="mb-4">
                  <h3 className="text-sm font-black uppercase tracking-wide text-blue-700 dark:text-blue-200">Informações de entrada</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Dados usados para chegada, posição, permanência e rastreabilidade operacional.</p>
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <input className="rounded-lg border p-3 uppercase dark:border-slate-700 dark:bg-slate-950" placeholder="Número do contêiner: AAAA 123.456-7" value={form.numeroContainer} onChange={(e) => campo("numeroContainer", e.target.value)} required />
              <input
                className="rounded-lg border p-3 uppercase disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400 dark:border-slate-700 dark:bg-slate-950 dark:disabled:bg-slate-900/70"
                placeholder={form.statusOperacional === "Previsão para chegada" ? "Indisponível para previsão de chegada" : "Posicionamento. Ex: A09051"}
                value={form.posicionamento}
                onChange={(e) => campo("posicionamento", e.target.value)}
                list="posicoes-quadra-livres"
                maxLength={6}
                disabled={form.statusOperacional === "Previsão para chegada"}
              />
              <datalist id="posicoes-quadra-livres">
                {posicoesSugeridas.map((posicao) => <option key={posicao} value={posicao} />)}
              </datalist>
              <select className="rounded-lg border p-3 dark:border-slate-700 dark:bg-slate-950" value={form.statusOperacional} onChange={(e) => campo("statusOperacional", e.target.value)}>
                {statusOperacionais.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>

              <label className="space-y-1 text-sm font-semibold text-slate-600 dark:text-slate-300">
                Data de entrada
                <input className="w-full rounded-lg border p-3 font-normal dark:border-slate-700 dark:bg-slate-950" type="datetime-local" value={form.dataHoraEntrada} onChange={(e) => campo("dataHoraEntrada", e.target.value)} required />
              </label>
              <select className="rounded-lg border p-3 dark:border-slate-700 dark:bg-slate-950" value={form.prioridade} onChange={(e) => campo("prioridade", e.target.value)}>
                <option value="">Prioridade</option>
                {prioridades.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>

              <select className="rounded-lg border p-3 dark:border-slate-700 dark:bg-slate-950" value={form.tipoContainer} onChange={(e) => campo("tipoContainer", e.target.value)} required>
                <option value="">Tipo do contêiner</option>
                {tiposContainer.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
              <select className="rounded-lg border p-3 dark:border-slate-700 dark:bg-slate-950" value={form.dimensao} onChange={(e) => campo("dimensao", e.target.value)} required>
                <option value="">Dimensão</option>
                {dimensoes.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
              <select className="rounded-lg border p-3 dark:border-slate-700 dark:bg-slate-950" value={form.destino} onChange={(e) => campo("destino", e.target.value)} required>
                <option value="">Destino</option>
                {destinos.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>

              <select className="rounded-lg border p-3 dark:border-slate-700 dark:bg-slate-950" value={form.scannerEntrada} onChange={(e) => campo("scannerEntrada", e.target.value)}>
                <option value="">Scanner na entrada</option>
                <option value="Não">Não</option>
                <option value="Sim">Sim</option>
              </select>
              <select className="rounded-lg border p-3 dark:border-slate-700 dark:bg-slate-950" value={form.estufadoTerminal} onChange={(e) => campo("estufadoTerminal", e.target.value)}>
                <option value="">Estufado no terminal</option>
                <option value="Não">Não</option>
                <option value="Sim">Sim</option>
              </select>

              <input className="rounded-lg border p-3 uppercase dark:border-slate-700 dark:bg-slate-950" placeholder="Número do lacre" value={form.numeroLacre} onChange={(e) => campo("numeroLacre", e.target.value)} />
              <input className="rounded-lg border p-3 uppercase dark:border-slate-700 dark:bg-slate-950" placeholder="Armador" value={form.armador} onChange={(e) => campo("armador", e.target.value)} />
              <input className="rounded-lg border p-3 dark:border-slate-700 dark:bg-slate-950 md:col-span-3" type="file" multiple accept="image/*,.pdf" onChange={(e) => setArquivos(Array.from(e.target.files || []))} />

              <textarea className="min-h-24 rounded-lg border p-3 md:col-span-3 dark:border-slate-700 dark:bg-slate-950" placeholder="Observações operacionais" value={form.observacoes} onChange={(e) => campo("observacoes", e.target.value)} />
                </div>
              </div>

              <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4 dark:border-emerald-500/20 dark:bg-emerald-500/5">
                <div className="mb-4">
                  <h3 className="text-sm font-black uppercase tracking-wide text-emerald-700 dark:text-emerald-200">Informações de saída</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Preencha somente quando houver liberação ou atualização de saída do contêiner.</p>
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <label className="space-y-1 text-sm font-semibold text-slate-600 dark:text-slate-300">
                    Data de saída
                    <input className="w-full rounded-lg border p-3 font-normal dark:border-slate-700 dark:bg-slate-950" type="datetime-local" value={form.dataHoraSaida} onChange={(e) => campo("dataHoraSaida", e.target.value)} />
                  </label>
                  <select className="rounded-lg border p-3 dark:border-slate-700 dark:bg-slate-950" value={form.scannerSaida} onChange={(e) => campo("scannerSaida", e.target.value)}>
                    <option value="">Scanner na saída</option>
                    <option value="Não">Não</option>
                    <option value="Sim">Sim</option>
                  </select>
                  <textarea className="min-h-24 rounded-lg border p-3 md:col-span-3 dark:border-slate-700 dark:bg-slate-950" placeholder="Observações na saída" value={form.observacoesSaida} onChange={(e) => campo("observacoesSaida", e.target.value)} />
                </div>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-3">
              <button className="rounded-lg bg-green-600 px-4 py-2 font-semibold text-white hover:bg-green-700">Salvar</button>
              {editando && <button type="button" onClick={novo} className="rounded-lg bg-slate-200 px-4 py-2 dark:bg-slate-800">Cancelar edição</button>}
            </div>
          </form>
        )}
      </section>

      <section className="overflow-hidden rounded-3xl border border-blue-400/10 bg-slate-950 shadow-2xl shadow-blue-950/20">
        <div className="flex flex-col gap-4 border-b border-slate-800 p-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3">
            <div className="rounded-2xl bg-blue-600 p-3 text-white shadow-lg shadow-blue-500/20">
              <MapPinned size={22} />
            </div>
            <div>
              <h2 className="text-xl font-black text-white">Mapa 3D de posicionamento</h2>
              <p className="mt-1 text-sm text-slate-300">
                Visão operacional por quadra, pilha e altura. Contêineres de 40 pés ocupam dois vãos e mantêm a posição oficial na segunda quadra.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-blue-400/20 bg-blue-500/10 px-3 py-1 text-xs font-black text-blue-100">20 pes: A06 e A07</span>
            <span className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1 text-xs font-black text-emerald-100">40 pes: A08/A09 e A10/A11</span>
            <select
              value={pilhaMapa}
              onChange={(e) => {
                setPilhaManual(true);
                setPilhaMapa(e.target.value);
              }}
              className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm font-bold text-white"
            >
              {pilhasMapa.map((pilha) => <option key={pilha} value={pilha}>Pilha {pilha}{ocupacaoPorPilha.has(pilha) ? ` (${ocupacaoPorPilha.get(pilha)})` : ""}</option>)}
            </select>
          </div>
        </div>

        <div className="grid gap-5 p-5 xl:grid-cols-[1fr_280px]">
          <div
            className={`relative min-h-[560px] select-none overflow-hidden rounded-3xl border border-blue-400/10 bg-[radial-gradient(circle_at_50%_25%,rgba(37,99,235,0.25),transparent_32%),linear-gradient(145deg,#020617,#071426_48%,#020617)] ${arrastoMapa ? "cursor-grabbing" : "cursor-grab"}`}
            style={{ userSelect: "none", WebkitUserSelect: "none", touchAction: "none" }}
            onPointerDown={iniciarArrastoMapa}
            onPointerMove={moverArrastoMapa}
            onPointerUp={encerrarArrastoMapa}
            onPointerCancel={encerrarArrastoMapa}
            onPointerLeave={(event) => {
              if (arrastoMapa) encerrarArrastoMapa(event);
            }}
          >
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(148,163,184,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.06)_1px,transparent_1px)] bg-[size:34px_34px]" />
            <div className="absolute left-5 top-5 z-20 rounded-2xl border border-slate-700/70 bg-slate-950/70 px-4 py-3 backdrop-blur">
              <p className="text-xs font-black uppercase tracking-[0.25em] text-blue-200">Visão operacional</p>
              <p className="mt-1 text-sm text-slate-300">Pilha ativa <span className="font-black text-white">{pilhaMapa}</span> | {containersMapa3D.length} contêineres no pátio</p>
            </div>

            <div
              className="absolute left-5 top-32 z-20 w-44 rounded-2xl border border-slate-700/70 bg-slate-950/70 p-3 backdrop-blur"
              onPointerDown={(event) => event.stopPropagation()}
            >
              <div className="mb-3 flex items-center justify-between gap-2">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-200">Quadras ocupadas</p>
                {quadraMapa && (
                  <button
                    type="button"
                    onClick={() => setQuadraMapa(null)}
                    className="rounded-full border border-slate-700 px-2 py-0.5 text-[10px] font-black text-slate-300 transition hover:border-blue-400 hover:text-white"
                  >
                    Todas
                  </button>
                )}
              </div>
              <div className="grid gap-2">
                {quadrasMapa.filter((quadra) => ocupacaoPorQuadra.has(quadra)).map((quadra) => {
                  const total = ocupacaoPorQuadra.get(quadra) || 0;
                  const ativo = quadraMapa === quadra;

                  return (
                    <button
                      key={quadra}
                      type="button"
                      onPointerDown={(event) => event.stopPropagation()}
                      onClick={() => setQuadraMapa((atual) => atual === quadra ? null : quadra)}
                      className={`flex items-center justify-between rounded-xl border px-3 py-2 text-left text-xs font-black transition ${
                        ativo
                          ? "border-blue-300 bg-blue-500 text-white shadow-lg shadow-blue-500/25"
                          : "border-slate-700 bg-slate-950/80 text-slate-300 hover:border-blue-400 hover:text-white"
                      }`}
                    >
                      <span>{quadra}</span>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] ${ativo ? "bg-white/20 text-white" : "bg-blue-500/10 text-blue-200"}`}>
                        {total}
                      </span>
                    </button>
                  );
                })}
                {quadrasMapa.every((quadra) => !ocupacaoPorQuadra.has(quadra)) && (
                  <p className="text-xs text-slate-400">Nenhuma quadra ocupada.</p>
                )}
              </div>
            </div>

            <div
              className="absolute right-5 top-5 z-30 w-72 rounded-2xl border border-slate-700/70 bg-slate-950/80 p-4 text-white shadow-2xl shadow-black/30 backdrop-blur"
              onPointerDown={(event) => event.stopPropagation()}
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-black uppercase tracking-[0.22em] text-blue-200">Giro 3D 360</p>
                <button
                  type="button"
                  onClick={() => {
                    pausarGiroAutomatico();
                    setAnguloMapa({ x: 60, z: 324 });
                  }}
                  className="rounded-full border border-slate-700 px-3 py-1 text-[11px] font-black text-slate-300 transition hover:border-blue-400 hover:text-white"
                >
                  Reset
                </button>
              </div>
              <div className="mt-3 flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/70 px-3 py-2">
                <span className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Rotação automática</span>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${giroAutomaticoMapa ? "bg-emerald-500/15 text-emerald-200" : "bg-amber-500/15 text-amber-200"}`}>
                  {giroAutomaticoMapa ? "Girando" : "Pausado"}
                </span>
              </div>
              <div className="mt-4 grid grid-cols-4 gap-2">
                <button type="button" onClick={() => { pausarGiroAutomatico(); setAnguloMapa((atual) => ({ ...atual, z: normalizarGiro(atual.z - 18) })); }} className="rounded-xl border border-slate-700 bg-slate-900 px-2 py-2 text-xs font-black transition hover:border-blue-400 hover:bg-blue-500/20">Esq.</button>
                <button type="button" onClick={() => { pausarGiroAutomatico(); setAnguloMapa((atual) => ({ ...atual, z: normalizarGiro(atual.z + 18) })); }} className="rounded-xl border border-slate-700 bg-slate-900 px-2 py-2 text-xs font-black transition hover:border-blue-400 hover:bg-blue-500/20">Dir.</button>
                <button type="button" onClick={() => { pausarGiroAutomatico(); setAnguloMapa((atual) => ({ ...atual, x: limitarAngulo(atual.x - 8, 38, 74) })); }} className="rounded-xl border border-slate-700 bg-slate-900 px-2 py-2 text-xs font-black transition hover:border-blue-400 hover:bg-blue-500/20">Baixo</button>
                <button type="button" onClick={() => { pausarGiroAutomatico(); setAnguloMapa((atual) => ({ ...atual, x: limitarAngulo(atual.x + 8, 38, 74) })); }} className="rounded-xl border border-slate-700 bg-slate-900 px-2 py-2 text-xs font-black transition hover:border-blue-400 hover:bg-blue-500/20">Topo</button>
              </div>
              <label className="mt-4 block text-[11px] font-bold uppercase tracking-wide text-slate-400">
                Inclinação
                <input
                  type="range"
                  min={38}
                  max={74}
                  value={anguloMapa.x}
                  onChange={(event) => {
                    pausarGiroAutomatico();
                    setAnguloMapa((atual) => ({ ...atual, x: Number(event.target.value) }));
                  }}
                  className="mt-2 w-full accent-blue-500"
                />
              </label>
              <label className="mt-3 block text-[11px] font-bold uppercase tracking-wide text-slate-400">
                Giro lateral 360º
                <input
                  type="range"
                  min={0}
                  max={360}
                  value={normalizarGiro(anguloMapa.z)}
                  onChange={(event) => {
                    pausarGiroAutomatico();
                    setAnguloMapa((atual) => ({ ...atual, z: Number(event.target.value) }));
                  }}
                  className="mt-2 w-full accent-blue-500"
                />
              </label>
              <p className="mt-3 text-[11px] text-slate-400">Arraste o mapa para pausar, girar e inspecionar. A rotação volta sozinha em alguns segundos.</p>
            </div>

            <div
              className="absolute inset-x-4 bottom-4 z-20 flex flex-wrap justify-center gap-2"
              onPointerDown={(event) => event.stopPropagation()}
            >
              {pilhasMapa.map((pilha) => (
                <button
                  key={pilha}
                  type="button"
                  onClick={() => {
                    setPilhaManual(true);
                    setPilhaMapa(pilha);
                  }}
                  className={`rounded-full border px-3 py-1.5 text-xs font-black transition ${
                    pilhaMapa === pilha
                      ? "border-blue-300 bg-blue-500 text-white shadow-lg shadow-blue-500/25"
                      : "border-slate-700 bg-slate-950/80 text-slate-300 hover:border-blue-400 hover:text-white"
                  }`}
                >
                  Pilha {pilha}{ocupacaoPorPilha.has(pilha) ? ` - ${ocupacaoPorPilha.get(pilha)}` : ""}
                </button>
              ))}
            </div>

            <div className="absolute left-1/2 top-[52%] h-[470px] w-[790px] max-w-none" style={{ perspective: "1200px", transform: "translate(-50%, -50%)" }}>
              <div
                className="relative h-full w-full"
                style={{ transform: `rotateX(${anguloMapa.x}deg) rotateZ(${anguloMapa.z}deg)`, transformStyle: "preserve-3d" }}
              >
                <div className="absolute left-8 top-12 h-[390px] w-[720px] rounded-[34px] border border-blue-300/20 bg-slate-900/80 shadow-[0_0_70px_rgba(37,99,235,0.24)]" />
                <div className="absolute left-8 top-12 h-[390px] w-[720px] rounded-[34px] bg-[linear-gradient(90deg,rgba(96,165,250,0.22)_1px,transparent_1px),linear-gradient(rgba(96,165,250,0.18)_1px,transparent_1px)] bg-[size:112px_74px]" />

                {quadrasMapa.map((quadra, quadraIndex) => (
                  <div
                    key={quadra}
                    className="absolute rounded-xl border border-blue-300/20 bg-blue-500/10 px-3 py-1 text-center text-[11px] font-black text-blue-100 shadow-lg"
                    style={{ left: 62 + quadraIndex * 112, top: 28, width: 94, transform: "translateZ(2px)" }}
                  >
                    {quadra}
                  </div>
                ))}

                {pilhasMapa.map((pilha, pilhaIndex) => (
                  <div
                    key={pilha}
                    className={`absolute rounded-full border px-3 py-1 text-[10px] font-black ${
                      pilha === pilhaMapa
                        ? "border-amber-300 bg-amber-400/25 text-amber-50"
                        : "border-slate-600 bg-slate-950/50 text-slate-400"
                    }`}
                    style={{ left: 6, top: 91 + pilhaIndex * 74, transform: "translateZ(8px)" }}
                  >
                    P{pilha}
                  </div>
                ))}

                {containersMapa3D.map(({ container, posicao, eh40, destaque, pilhaAtiva, quadraAtiva, left, top, width, height, depth, z, zIndex }) => {
                  const opacidade = destaque ? 1 : quadraAtiva && pilhaAtiva ? 0.96 : quadraAtiva ? 0.48 : 0.12;
                  const faceBackground = destaque
                    ? "repeating-linear-gradient(90deg, rgba(255,255,255,.28) 0 1px, transparent 1px 13px), repeating-linear-gradient(0deg, rgba(255,255,255,.13) 0 1px, transparent 1px 9px), linear-gradient(135deg, rgba(251,191,36,.46), rgba(245,158,11,.20))"
                    : eh40
                      ? "repeating-linear-gradient(90deg, rgba(255,255,255,.22) 0 1px, transparent 1px 13px), repeating-linear-gradient(0deg, rgba(255,255,255,.10) 0 1px, transparent 1px 9px), linear-gradient(135deg, rgba(20,184,166,.40), rgba(16,185,129,.16))"
                      : "repeating-linear-gradient(90deg, rgba(255,255,255,.23) 0 1px, transparent 1px 13px), repeating-linear-gradient(0deg, rgba(255,255,255,.11) 0 1px, transparent 1px 9px), linear-gradient(135deg, rgba(59,130,246,.40), rgba(37,99,235,.16))";
                  const faceBorder = destaque ? "rgba(254,240,138,.88)" : eh40 ? "rgba(94,234,212,.58)" : "rgba(147,197,253,.58)";
                  const faceShadow = destaque
                    ? "inset 0 0 26px rgba(255,255,255,.20), inset 0 -10px 24px rgba(120,53,15,.22), 0 0 34px rgba(251,191,36,.42), 0 18px 42px rgba(0,0,0,.38)"
                    : "inset 0 0 22px rgba(255,255,255,.12), inset 0 -12px 24px rgba(2,8,23,.30), 0 0 20px rgba(34,211,238,.16), 0 14px 36px rgba(0,0,0,.38)";
                  const faceStyle = {
                    position: "absolute" as const,
                    border: `1px solid ${faceBorder}`,
                    background: faceBackground,
                    boxShadow: faceShadow,
                    backdropFilter: "blur(2px)",
                    opacity: 0.86,
                  };

                  return (
                    <button
                      key={container.id}
                      type="button"
                      onPointerDown={(event) => event.stopPropagation()}
                      onClick={() => {
                        setPilhaManual(true);
                        setPilhaMapa(posicao.pilha);
                        setContainerMapaSelecionado(container);
                      }}
                      className={`group absolute border text-left transition duration-200 hover:scale-[1.03] ${
                        destaque
                          ? "border-amber-200/60 shadow-[0_0_34px_rgba(251,191,36,0.58)]"
                          : quadraMapa && quadraAtiva
                            ? "border-cyan-200/40 shadow-[0_0_26px_rgba(34,211,238,0.24)]"
                          : "border-white/10 shadow-[0_16px_35px_rgba(0,0,0,0.35)]"
                      }`}
                      style={{
                        left,
                        top,
                        width,
                        height,
                        opacity: opacidade,
                        zIndex,
                        transform: `translateZ(${z}px)`,
                        transformStyle: "preserve-3d",
                      }}
                      title={`${container.numeroContainer} - ${container.posicionamento}`}
                    >
                      <span
                        style={{
                          ...faceStyle,
                          left: 0,
                          top: 0,
                          width,
                          height,
                          borderRadius: 2,
                          transform: `translateZ(${depth / 2}px)`,
                        }}
                      />
                      <span
                        style={{
                          ...faceStyle,
                          left: 0,
                          top: 0,
                          width,
                          height,
                          borderRadius: 2,
                          filter: "brightness(.70)",
                          transform: `rotateY(180deg) translateZ(${depth / 2}px)`,
                        }}
                      />
                      <span
                        style={{
                          ...faceStyle,
                          left: (width - depth) / 2,
                          top: 0,
                          width: depth,
                          height,
                          borderRadius: 2,
                          filter: "brightness(.78)",
                          transform: `rotateY(-90deg) translateZ(${width / 2}px)`,
                        }}
                      />
                      <span
                        style={{
                          ...faceStyle,
                          left: (width - depth) / 2,
                          top: 0,
                          width: depth,
                          height,
                          borderRadius: 2,
                          filter: "brightness(.82)",
                          transform: `rotateY(90deg) translateZ(${width / 2}px)`,
                        }}
                      />
                      <span
                        style={{
                          ...faceStyle,
                          left: 0,
                          top: (height - depth) / 2,
                          width,
                          height: depth,
                          borderRadius: 2,
                          filter: "brightness(1.12)",
                          transform: `rotateX(90deg) translateZ(${height / 2}px)`,
                        }}
                      />
                      <span
                        style={{
                          ...faceStyle,
                          left: 0,
                          top: (height - depth) / 2,
                          width,
                          height: depth,
                          borderRadius: 2,
                          filter: "brightness(.58)",
                          transform: `rotateX(-90deg) translateZ(${height / 2}px)`,
                        }}
                      />
                      <span
                        className="absolute z-10 flex h-full flex-col justify-center px-3"
                        style={{ inset: 0, transform: `translateZ(${depth / 2 + 1}px)` }}
                      >
                        <span className="truncate text-[11px] font-black text-white drop-shadow">{container.numeroContainer}</span>
                        <span className="mt-0.5 flex items-center justify-between gap-2 text-[9px] font-black uppercase tracking-wide text-white/80">
                          <span>{container.posicionamento}</span>
                          <span>{container.dimensao}</span>
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <aside className="space-y-3">
            <div className="rounded-3xl border border-blue-400/20 bg-[linear-gradient(180deg,rgba(15,23,42,0.92),rgba(2,8,23,0.88))] p-4 shadow-2xl shadow-blue-950/20">
              <p className="text-xs font-black uppercase tracking-[0.22em] text-blue-200">Contêiner selecionado</p>
              {containerPainelMapa ? (
                <div className="mt-4 space-y-4">
                  <div className="rounded-2xl border border-cyan-300/20 bg-cyan-500/10 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xl font-black text-white">{containerPainelMapa.numeroContainer}</p>
                        <p className="mt-1 text-sm text-cyan-100">{containerPainelMapa.posicionamento || "Sem posição"}</p>
                      </div>
                      <span className="rounded-full border border-cyan-300/20 bg-cyan-400/10 px-3 py-1 text-[10px] font-black uppercase text-cyan-100">
                        {containerPainelMapa.dimensao}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded-2xl border border-slate-700 bg-slate-950/70 p-3">
                      <p className="font-black uppercase tracking-wide text-slate-500">Status</p>
                      <p className="mt-1 font-black text-white">{containerPainelMapa.statusOperacional}</p>
                    </div>
                    <div className="rounded-2xl border border-slate-700 bg-slate-950/70 p-3">
                      <p className="font-black uppercase tracking-wide text-slate-500">Prioridade</p>
                      <p className="mt-1 font-black text-white">{containerPainelMapa.prioridade || "Não informada"}</p>
                    </div>
                    <div className="rounded-2xl border border-slate-700 bg-slate-950/70 p-3">
                      <p className="font-black uppercase tracking-wide text-slate-500">Entrada</p>
                      <p className="mt-1 font-black text-white">{new Date(containerPainelMapa.dataHoraEntrada).toLocaleDateString("pt-BR")}</p>
                    </div>
                    <div className="rounded-2xl border border-slate-700 bg-slate-950/70 p-3">
                      <p className="font-black uppercase tracking-wide text-slate-500">Terminal</p>
                      <p className="mt-1 font-black text-white">{containerPainelMapa.tempoTerminal}</p>
                    </div>
                  </div>

                  <div className="space-y-2 rounded-2xl border border-slate-700 bg-slate-950/70 p-3 text-sm text-slate-300">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-slate-500">Armador</span>
                      <strong className="text-right text-white">{containerPainelMapa.armador || "Não informado"}</strong>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-slate-500">Lacre</span>
                      <strong className="text-right text-white">{containerPainelMapa.numeroLacre || "Não informado"}</strong>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-slate-500">Destino</span>
                      <strong className="text-right text-white">{containerPainelMapa.destino}</strong>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-slate-500">Scanner entrada</span>
                      <strong className="text-right text-white">{containerPainelMapa.scannerEntrada ? "Sim" : "Não"}</strong>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => abrirDossie(containerPainelMapa)}
                      className="rounded-2xl border border-blue-400/30 bg-blue-500/15 px-3 py-3 text-xs font-black text-blue-100 transition hover:bg-blue-500/25"
                    >
                      Ver dossiê
                    </button>
                    <button
                      type="button"
                      onClick={() => baixarDossiePdf(containerPainelMapa)}
                      className="rounded-2xl border border-emerald-400/30 bg-emerald-500/15 px-3 py-3 text-xs font-black text-emerald-100 transition hover:bg-emerald-500/25"
                    >
                      Baixar PDF
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mt-4 rounded-2xl border border-slate-700 bg-slate-950/70 p-4 text-sm text-slate-400">
                  Pesquise ou clique em um bloco no mapa para visualizar os dados operacionais do contêiner.
                </div>
              )}
            </div>

            <div className="rounded-3xl border border-slate-700 bg-slate-950/80 p-4">
              <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">Legenda</p>
              <div className="mt-4 space-y-3 text-sm text-slate-300">
                <div className="flex items-center gap-3"><span className="h-3 w-7 rounded-full bg-blue-500" /> 20 pes</div>
                <div className="flex items-center gap-3"><span className="h-3 w-7 rounded-full bg-emerald-500" /> 40 pes / 40 HC</div>
                <div className="flex items-center gap-3"><span className="h-3 w-7 rounded-full bg-amber-400" /> Container pesquisado</div>
                <div className="flex items-center gap-3"><span className="h-3 w-7 rounded-full border border-white/40 bg-slate-500/30" /> Outras pilhas</div>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-700 bg-slate-950/80 p-4">
              <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">Ocupacao por pilha</p>
              <div className="mt-4 space-y-3">
                {pilhasMapa.map((pilha) => {
                  const total = ocupacaoPorPilha.get(pilha) || 0;
                  const percentual = Math.min(100, Math.round((total / Math.max(1, containersNoPatio.length)) * 100));
                  return (
                    <button
                      key={pilha}
                      type="button"
                      onPointerDown={(event) => event.stopPropagation()}
                      onClick={() => {
                        setPilhaManual(true);
                        setPilhaMapa(pilha);
                      }}
                      className="w-full text-left"
                    >
                      <div className="mb-1 flex items-center justify-between text-xs font-bold text-slate-300">
                        <span>Pilha {pilha}</span>
                        <span>{total}</span>
                      </div>
                      <div className="h-2 rounded-full bg-slate-800">
                        <div className={`h-2 rounded-full ${pilha === pilhaMapa ? "bg-blue-400" : "bg-slate-500"}`} style={{ width: `${percentual}%` }} />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </aside>
        </div>

        <div className="hidden">
          <div className="min-w-[760px]">
            <div className="grid grid-cols-[56px_repeat(6,minmax(92px,1fr))] gap-2">
              <div />
              {quadrasMapa.map((quadra) => (
                <div key={quadra} className="rounded-xl bg-slate-100 px-3 py-2 text-center text-sm font-black text-slate-700 dark:bg-slate-950 dark:text-slate-200">
                  {quadra}
                </div>
              ))}

              {alturasMapa.map((altura) => (
                <Fragment key={altura}>
                  <div key={`altura-${altura}`} className="flex items-center justify-center rounded-xl bg-slate-100 text-xs font-black text-slate-500 dark:bg-slate-950 dark:text-slate-400">
                    H{altura}
                  </div>
                  {quadrasMapa.map((quadra) => {
                    const posicaoCodigo = slotChave(quadra, pilhaMapa, altura);
                    const ocupante = ocupacaoMapa.get(posicaoCodigo);
                    const referencia = !ocupante ? referenciasMapa.get(posicaoCodigo)?.[0] : null;
                    const posicaoOcupante = interpretarPosicao(ocupante?.posicionamento);
                    const posicaoReferencia = interpretarPosicao(referencia?.posicionamento);
                    const eh40 = ocupante && dimensaoMapa(ocupante.dimensao) === "40";
                    const referenciaEh40 = referencia && dimensaoMapa(referencia.dimensao) === "40";
                    const quadraInicial40 = eh40 && posicaoOcupante ? posicoes40[posicaoOcupante.quadra] : null;
                    const quadraInicialReferencia40 = referenciaEh40 && posicaoReferencia ? posicoes40[posicaoReferencia.quadra] : null;
                    if (eh40 && posicaoOcupante?.quadra === quadra && quadraInicial40) return null;
                    if (!ocupante && referenciaEh40 && posicaoReferencia?.quadra === quadra && quadraInicialReferencia40) return null;

                    const colSpan = eh40 && quadraInicial40 === quadra ? 2 : referenciaEh40 && quadraInicialReferencia40 === quadra ? 2 : 1;
                    const destaque = ocupante ? slotsContainer(ocupante).some((slot) => posicaoDestacada.has(slot)) : false;
                    const baseOcupado = eh40
                      ? "border-emerald-300 bg-emerald-500/15 text-emerald-800 dark:border-emerald-400/40 dark:bg-emerald-500/15 dark:text-emerald-100"
                      : "border-blue-300 bg-blue-500/15 text-blue-800 dark:border-blue-400/40 dark:bg-blue-500/15 dark:text-blue-100";
                    const baseReferencia = referenciaEh40
                      ? "border-emerald-200 bg-emerald-500/5 text-emerald-700 opacity-55 hover:opacity-90 dark:border-emerald-400/20 dark:bg-emerald-500/5 dark:text-emerald-100"
                      : "border-blue-200 bg-blue-500/5 text-blue-700 opacity-55 hover:opacity-90 dark:border-blue-400/20 dark:bg-blue-500/5 dark:text-blue-100";

                    return (
                      <button
                        key={posicaoCodigo}
                        type="button"
                        onClick={() => {
                          if (ocupante) {
                            abrirDossie(ocupante);
                            return;
                          }
                          if (referencia && posicaoReferencia) {
                            setPilhaManual(true);
                            setPilhaMapa(posicaoReferencia.pilha);
                            return;
                          }
                          setForm((atual) => ({ ...atual, posicionamento: posicaoCodigo }));
                          setFormularioAberto(true);
                        }}
                        style={{ gridColumn: `span ${colSpan}` }}
                        className={`min-h-[74px] rounded-2xl border p-2 text-left transition hover:-translate-y-0.5 hover:shadow-lg ${
                          ocupante
                            ? baseOcupado
                            : referencia
                              ? baseReferencia
                            : "border-slate-200 bg-slate-50 text-slate-400 hover:border-blue-300 dark:border-slate-800 dark:bg-slate-950/70 dark:text-slate-600"
                        } ${destaque ? "ring-4 ring-amber-300 ring-offset-2 ring-offset-white dark:ring-amber-400 dark:ring-offset-slate-900" : ""}`}
                        title={ocupante ? `${ocupante.numeroContainer} - ${ocupante.posicionamento}` : referencia ? `Ir para pilha ${posicaoReferencia?.pilha} - ${referencia.numeroContainer}` : posicaoCodigo}
                      >
                        <span className="block text-[10px] font-black uppercase tracking-wide opacity-70">{ocupante?.posicionamento || referencia?.posicionamento || posicaoCodigo}</span>
                        {ocupante ? (
                          <>
                            <span className="mt-1 block truncate text-sm font-black">{ocupante.numeroContainer}</span>
                            <span className="mt-1 inline-flex rounded-full bg-white/70 px-2 py-0.5 text-[10px] font-black text-slate-700 dark:bg-slate-950/60 dark:text-slate-100">{ocupante.dimensao}</span>
                          </>
                        ) : referencia ? (
                          <>
                            <span className="mt-1 block truncate text-sm font-black">{referencia.numeroContainer}</span>
                            <span className="mt-1 inline-flex rounded-full bg-white/70 px-2 py-0.5 text-[10px] font-black text-slate-700 dark:bg-slate-950/60 dark:text-slate-100">Pilha {posicaoReferencia?.pilha}</span>
                          </>
                        ) : (
                          <span className="mt-3 block text-xs font-bold">Livre</span>
                        )}
                      </button>
                    );
                  })}
                </Fragment>
              ))}
            </div>
          </div>
        </div>

        {containerDestacado && (
          <div className="border-t border-amber-400/20 bg-amber-500/10 px-5 py-3 text-sm font-bold text-amber-100">
            Destaque da busca: {containerDestacado.numeroContainer} em {containerDestacado.posicionamento} ({containerDestacado.dimensao})
          </div>
        )}
      </section>

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-4">
          <input className="rounded-lg border p-3 dark:border-slate-700 dark:bg-slate-950" placeholder="Buscar contêiner, posição ou armador" value={busca} onChange={(e) => setBusca(e.target.value)} />
          <select className="rounded-lg border p-3 dark:border-slate-700 dark:bg-slate-950" value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value)}>
            <option value="">Todos os status</option>
            {statusOperacionais.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
          <select className="rounded-lg border p-3 dark:border-slate-700 dark:bg-slate-950" value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)}>
            <option value="">Todos os tipos</option>
            {tiposContainer.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
          <select className="rounded-lg border p-3 dark:border-slate-700 dark:bg-slate-950" value={filtroDimensao} onChange={(e) => setFiltroDimensao(e.target.value)}>
            <option value="">Todas as dimensões</option>
            {dimensoes.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
          <select className="rounded-lg border p-3 dark:border-slate-700 dark:bg-slate-950" value={filtroDestino} onChange={(e) => setFiltroDestino(e.target.value)}>
            <option value="">Todos os destinos</option>
            {destinos.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </div>

        <div className="max-h-[470px] overflow-x-auto overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-800">
          {carregando && filtrados.length === 0 ? (
            <SkeletonTable rows={6} columns={10} className="border-0 shadow-none" />
          ) : (
          <table className="min-w-full text-sm">
            <thead className="sticky top-0 z-10 bg-slate-100 text-left text-slate-600 shadow-sm dark:bg-slate-950 dark:text-slate-300">
              <tr>
                <th className="p-3">Contêiner</th>
                <th className="p-3">Posição</th>
                <th className="p-3">Unidade</th>
                <th className="p-3">Entrada</th>
                <th className="p-3">Tipo</th>
                <th className="p-3">Dimensão</th>
                <th className="p-3">Destino</th>
                <th className="p-3">Status</th>
                <th className="p-3">Tempo no Terminal</th>
                <th className="p-3">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.map((item) => (
                <tr key={item.id} className="border-t border-slate-200 dark:border-slate-800">
                  <td className="p-3 font-bold">{item.numeroContainer}</td>
                  <td className="p-3">{item.posicionamento || "Não informado"}</td>
                  <td className="p-3">{item.unidade}</td>
                  <td className="p-3">{new Date(item.dataHoraEntrada).toLocaleString("pt-BR")}</td>
                  <td className="p-3">{item.tipoContainer}</td>
                  <td className="p-3">{item.dimensao}</td>
                  <td className="p-3">{item.destino}</td>
                  <td className="p-3"><span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-700 dark:bg-blue-950/40 dark:text-blue-200">{item.statusOperacional}</span></td>
                  <td className="p-3">{item.tempoTerminal}</td>
                  <td className="p-3">
                    <div className="flex gap-2">
                      {item.statusOperacional !== "Liberado" && item.statusOperacional !== "Previsão para chegada" && (
                        <button onClick={() => abrirReposicionamento(item)} className="rounded bg-emerald-600 p-2 text-white" title="Reposicionar contêiner"><MapPinned size={16} /></button>
                      )}
                      <button onClick={() => editar(item)} className="rounded bg-blue-600 p-2 text-white" title="Editar"><Pencil size={16} /></button>
                      <button onClick={() => abrirDossie(item)} className="rounded bg-slate-700 p-2 text-white" title="Ver dossiê"><Eye size={16} /></button>
                      {podeExcluir && usuario?.perfilAcesso !== "OPERADOR" && (
                        <button onClick={() => excluir(item)} className="rounded bg-red-600 p-2 text-white" title="Excluir"><Trash2 size={16} /></button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filtrados.length === 0 && (
                <tr><td colSpan={10} className="p-6 text-center text-slate-500">{carregando ? "Carregando..." : "Nenhum contêiner encontrado."}</td></tr>
              )}
            </tbody>
          </table>
          )}
        </div>
      </div>

      {reposicionando && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4">
          <form onSubmit={salvarReposicionamento} className="w-full max-w-xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <div className="border-b border-slate-200 p-5 dark:border-slate-800">
              <div className="flex items-start gap-3">
                <div className="rounded-2xl bg-emerald-600 p-3 text-white">
                  <MapPinned size={22} />
                </div>
                <div>
                  <h2 className="text-xl font-black">Reposicionar contêiner</h2>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    {reposicionando.numeroContainer} • {reposicionando.dimensao} • posição atual {reposicionando.posicionamento || "não informada"}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4 p-5">
              <label className="space-y-2 text-sm font-bold text-slate-700 dark:text-slate-200">
                Nova posição disponível
                <input
                  className="w-full rounded-xl border border-slate-200 bg-white p-3 uppercase dark:border-slate-700 dark:bg-slate-950"
                  value={novaPosicao}
                  onChange={(event) => setNovaPosicao(normalizarPosicao(event.target.value))}
                  list="posicoes-reposicionamento"
                  maxLength={6}
                  placeholder="Selecione ou digite. Ex: A09051"
                  required
                />
                <datalist id="posicoes-reposicionamento">
                  {posicoesReposicionamento.map((posicao) => <option key={posicao} value={posicao} />)}
                </datalist>
              </label>

              <div className="rounded-2xl bg-slate-50 p-3 dark:bg-slate-950/70">
                <p className="text-xs font-black uppercase tracking-wide text-slate-500">Sugestões rápidas</p>
                <div className="mt-3 flex max-h-36 flex-wrap gap-2 overflow-y-auto pr-1">
                  {posicoesReposicionamento.slice(0, 30).map((posicao) => (
                    <button
                      key={posicao}
                      type="button"
                      onClick={() => setNovaPosicao(posicao)}
                      className={`rounded-full border px-3 py-1.5 text-xs font-black transition hover:border-emerald-400 hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-emerald-500/10 dark:hover:text-emerald-100 ${
                        novaPosicao === posicao
                          ? "border-emerald-500 bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-100"
                          : "border-slate-200 bg-white text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
                      }`}
                    >
                      {posicao}
                    </button>
                  ))}
                  {posicoesReposicionamento.length === 0 && (
                    <span className="text-sm text-slate-500">Nenhuma posição disponível para esta dimensão.</span>
                  )}
                </div>
              </div>

              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-100">
                O sistema respeita a regra de 20/40 pés e bloqueia posições ocupadas ou pilhas incompatíveis.
              </div>
            </div>

            <div className="flex flex-wrap justify-end gap-3 border-t border-slate-200 p-5 dark:border-slate-800">
              <button type="button" onClick={() => setReposicionando(null)} className="rounded-xl bg-slate-100 px-4 py-2 font-bold text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700">
                Cancelar
              </button>
              <button className="rounded-xl bg-emerald-600 px-4 py-2 font-bold text-white hover:bg-emerald-700">
                Confirmar posição
              </button>
            </div>
          </form>
        </div>
      )}

      {dossie && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 p-4">
          <div className="mx-auto my-6 max-w-6xl rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold">Dossiê {dossie.numeroContainer}</h2>
                <p className="text-slate-500">Posição: {dossie.posicionamento || "Não informado"}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => baixarDossiePdf(dossie)} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white">
                  <Download size={16} />
                  Dossiê PDF
                </button>
                <button onClick={() => setDossie(null)} className="rounded-lg bg-slate-100 px-4 py-2 dark:bg-slate-800">Fechar</button>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="rounded-xl border p-4 dark:border-slate-800">
                <h3 className="font-bold">Entrada</h3>
                <p>Entrada: {new Date(dossie.dataHoraEntrada).toLocaleString("pt-BR")}</p>
                <p>Scanner: {dossie.scannerEntrada ? "Sim" : "Não"}</p>
                <p>Lacre: {dossie.numeroLacre || "Não informado"}</p>
              </div>
              <div className="rounded-xl border p-4 dark:border-slate-800">
                <h3 className="font-bold">Saída</h3>
                <p>Saída: {dossie.dataHoraSaida ? new Date(dossie.dataHoraSaida).toLocaleString("pt-BR") : "Não informada"}</p>
                <p>Scanner: {dossie.scannerSaida === undefined || dossie.scannerSaida === null ? "Não informado" : dossie.scannerSaida ? "Sim" : "Não"}</p>
              </div>
              <div className="rounded-xl border p-4 dark:border-slate-800">
                <h3 className="font-bold">Operacional</h3>
                <p>Status: {dossie.statusOperacional}</p>
                <p>Prioridade: {dossie.prioridade || "Não informada"}</p>
                <p>Tempo: {dossie.tempoTerminal}</p>
                <p>Armador: {dossie.armador || "Não informado"}</p>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
              <section>
                <h3 className="mb-3 flex items-center gap-2 font-bold"><FileText size={18} /> Anexos</h3>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {(dossie.anexos || []).map((anexo) => (
                    <a key={anexo.id} href={`/${anexo.caminho.replace(/\\/g, "/")}`} target="_blank" className="rounded-xl border p-3 hover:border-blue-400 dark:border-slate-800" rel="noreferrer">
                      {anexo.tipo.startsWith("image/") ? (
                        <img src={`/${anexo.caminho.replace(/\\/g, "/")}`} className="mb-2 h-32 w-full rounded-lg object-cover" />
                      ) : (
                        <div className="mb-2 flex h-32 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800"><FileText /></div>
                      )}
                      <p className="truncate font-semibold">{anexo.nomeOriginal}</p>
                      <p className="text-xs text-slate-500">{new Date(anexo.createdAt).toLocaleString("pt-BR")}</p>
                      <p className="mt-1 inline-flex items-center gap-1 text-xs text-blue-600"><Download size={12} /> Abrir/baixar</p>
                    </a>
                  ))}
                  {(dossie.anexos || []).length === 0 && <p className="text-slate-500">Nenhum anexo registrado.</p>}
                </div>
              </section>

              <section>
                <h3 className="mb-3 font-bold">Timeline Operacional</h3>
                <div className="space-y-3">
                  {(dossie.historico || []).map((item) => (
                    <div key={item.id} className="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
                      <p className="font-semibold">{item.acao}</p>
                      <p className="text-sm text-slate-500">{item.detalhes}</p>
                      <p className="mt-1 text-xs text-slate-400">{nomeUsuario(item.usuario)} - {new Date(item.createdAt).toLocaleString("pt-BR")}</p>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
