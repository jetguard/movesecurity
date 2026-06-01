import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  BookOpen,
  ClipboardCheck,
  FileDown,
  Pencil,
  Plus,
  RadioTower,
  RefreshCw,
  Save,
  Send,
  Trash2,
} from "lucide-react";
import { api } from "../services/api";
import { podeAdministrar, podeAnalisar, usuarioAtual } from "../utils/permissoes";
import { SkeletonDashboard } from "../components/ui/Skeleton";
import { AutoSaveStatus } from "../components/ui/AutoSaveStatus";
import { useAutoSaveDraft } from "../hooks/useAutoSaveDraft";
import { PdfLightbox } from "../components/ui/PdfLightbox";

type UsuarioEquipe = {
  id: number;
  nome: string;
  apelido?: string;
  equipe?: string | null;
};

type PostoPassagem = {
  id?: number;
  posto: string;
  colaborador: string;
  re: string;
  escala: string;
};

type ChecklistEquipamento = {
  categoria: string;
  nome: string;
  funcionando: string;
  observacao: string;
  chamado: string;
};

type RondaOperacional = {
  ponto: string;
  horaInicio: string;
  horaTermino: string;
  nome: string;
  alteracao: string;
  observacoes: string;
};

type PassagemTurno = {
  id: number;
  codigo: string;
  dataPassagem: string;
  horaAbertura: string;
  horaEncerramento?: string | null;
  unidade: string;
  equipe: string;
  status: string;
  colaboradoresIds: number[];
  statusPostoGocil: string;
  observacaoPostoGocil?: string | null;
  statusPostoScanner: string;
  observacaoPostoScanner?: string | null;
  informacoesComplementares?: string | null;
  checklistEquipamentos?: ChecklistEquipamento[];
  rondas?: RondaOperacional[];
  cftvConectadas?: number | null;
  cftvDesconectadas?: number | null;
  containersArmazenados?: number | null;
  responsavel?: { id?: number; nome: string; apelido?: string; equipe?: string | null };
  postos: PostoPassagem[];
};

type SocData = {
  unidade: string;
  filtroEquipe?: string | null;
  equipes: string[];
  atualizadoEm: string;
  soc: Record<string, number>;
  passagensTurno: PassagemTurno[];
  passagensServico: Array<{ id: number; codigo: string; titulo: string; observacoes?: string; dataHora: string; responsavel?: { nome: string; apelido?: string; equipe?: string | null } }>;
  livroEletronico: Array<{ tipo: string; titulo: string; detalhe: string; data: string }>;
  reincidencia: Record<string, Array<{ nome: string; total: number }>>;
  indicadoresMensais: Record<string, number>;
  relatoriosExecutivosAutomaticos: string[];
  tarefas: Array<{ id: number; titulo: string; status: string; prioridade: string; responsavel: string; prazo?: string }>;
};

const metricas = [
  ["ocorrenciasAbertas", "Ocorrências abertas"],
  ["eventosAbertos", "Eventos abertos"],
  ["investigacoesAbertas", "Investigações"],
  ["camerasOffline", "Câmeras offline"],
  ["containersCriticos", "Contêineres no terminal"],
  ["tarefasAbertas", "Tarefas abertas"],
  ["checklistsHoje", "Registros hoje"],
];

const postosDisponiveis = [
  "Gate 1",
  "Gate 2",
  "Gate 3",
  "Portaria de Serviço",
  "Portaria Social",
  "Balança de Saída",
  "Balança de Entrada",
  "Rotatória",
  "Scanner",
  "Scanner Novo",
];

const escalas = ["06x18", "18x06", "07x19", "19x07", "07x15", "15x23", "23x07"];
const equipesPadrao = ["Equipe A", "Equipe B", "Equipe C", "Equipe D", "Administrativo"];

const postoVazio: PostoPassagem = { posto: "", colaborador: "", re: "", escala: "" };
const checklistEquipamentosPadrao: ChecklistEquipamento[] = [
  ...["Rádio Base Fixa", "Rádios PAM / PAMG", "Rádio HT e Bateria", "Telefone Emergência", "Telefone Ramal", "Celular Corporativo"].map((nome) => ({ categoria: "Aparelhos de comunicação", nome, funcionando: "N/A", observacao: "", chamado: "" })),
  ...["Catracas", "Leitoras de crachá", "Leitora facial", "Urnas coletoras", "Totens", "Cancelas", "Torniquetes", "Lanternas", "Portais detectores", "Bastões detectores", "Scanner(s) de bagagem", "Ar-condicionado", "Botão de pânico", "Impressora(s)"].map((nome) => ({ categoria: "Equipamentos de apoio", nome, funcionando: "N/A", observacao: "", chamado: "" })),
  ...["PC's", "Monitores", "Mesas Controladoras", "Teclados/Mouses", "Vídeo Wall / Telas", "Mobília"].map((nome) => ({ categoria: "Equipamentos essenciais", nome, funcionando: "N/A", observacao: "", chamado: "" })),
];
const rondasPadrao: RondaOperacional[] = ["Perímetro", "Pátio", "Armazém", "Pontos Sensíveis", "Extra 01", "Extra 02"].map((ponto) => ({
  ponto,
  horaInicio: "",
  horaTermino: "",
  nome: "",
  alteracao: "Não",
  observacoes: "",
}));

function dataInput(data?: string | null) {
  if (!data) return new Date().toISOString().slice(0, 10);
  return new Date(data).toISOString().slice(0, 10);
}

function separarInformacoes(texto: string) {
  return texto
    .split(/\n\n---\n\n|\n{2,}/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function montarInformacao(titulo: string, local: string, observacoes: string) {
  const linhas = [
    `Título: ${titulo.trim() || "Informação do Plantão"}`,
    `Local: ${local.trim() || "Centro de Operações"}`,
    `Descrição: ${observacoes.trim() || "Sem descrição informada"}`,
  ];
  return linhas.join("\n");
}

function mascaraHora(valor: string) {
  const numeros = valor.replace(/\D/g, "").slice(0, 4);
  if (numeros.length <= 2) return numeros;
  return `${numeros.slice(0, 2)}:${numeros.slice(2)}`;
}

export default function OperacaoSOC() {
  const usuario = usuarioAtual();
  const gerenciaPassagem = podeAnalisar();
  const podeExcluirPassagem = podeAdministrar();
  const [dados, setDados] = useState<SocData | null>(null);
  const [usuariosEquipe, setUsuariosEquipe] = useState<UsuarioEquipe[]>([]);
  const [passagemSelecionada, setPassagemSelecionada] = useState<PassagemTurno | null>(null);
  const [filtroEquipe, setFiltroEquipe] = useState("");
  const [titulo, setTitulo] = useState("");
  const [local, setLocal] = useState("Centro de Operações");
  const [observacoes, setObservacoes] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [editandoInformacao, setEditandoInformacao] = useState<number | null>(null);
  const [rondasAberto, setRondasAberto] = useState(false);
  const [pdfLightbox, setPdfLightbox] = useState<{ url: string; titulo: string; nomeArquivo: string } | null>(null);
  const [form, setForm] = useState({
    dataPassagem: dataInput(),
    colaboradoresIds: [] as number[],
    postos: [{ ...postoVazio }],
    statusPostoGocil: "Completo",
    observacaoPostoGocil: "",
    statusPostoScanner: "Completo",
    observacaoPostoScanner: "",
    informacoesComplementares: "",
    checklistEquipamentos: checklistEquipamentosPadrao,
    rondas: rondasPadrao,
  });

  const equipeAtual = filtroEquipe || usuario?.equipe || "";
  const dadosRascunhoCcos = useMemo(
    () => ({
      filtroEquipe,
      titulo,
      local,
      observacoes,
      form,
    }),
    [filtroEquipe, titulo, local, observacoes, form]
  );

  const autoSaveCcos = useAutoSaveDraft({
    modulo: "RelatorioCCOS",
    chave: passagemSelecionada ? `passagem-${passagemSelecionada.id}` : "novo",
    dados: dadosRascunhoCcos,
    ativo: Boolean(passagemSelecionada?.status === "Aberto"),
    onRestore: (dados) => {
      setFiltroEquipe(dados.filtroEquipe || usuario?.equipe || "");
      setTitulo(dados.titulo || "");
      setLocal(dados.local || "Centro de Operações");
      setObservacoes(dados.observacoes || "");
      setForm({
        dataPassagem: dados.form?.dataPassagem || dataInput(),
        colaboradoresIds: dados.form?.colaboradoresIds || [],
        postos: dados.form?.postos?.length ? dados.form.postos : [{ ...postoVazio }],
        statusPostoGocil: dados.form?.statusPostoGocil || "Completo",
        observacaoPostoGocil: dados.form?.observacaoPostoGocil || "",
        statusPostoScanner: dados.form?.statusPostoScanner || "Completo",
        observacaoPostoScanner: dados.form?.observacaoPostoScanner || "",
        informacoesComplementares: dados.form?.informacoesComplementares || "",
        checklistEquipamentos: dados.form?.checklistEquipamentos?.length ? dados.form.checklistEquipamentos : checklistEquipamentosPadrao,
        rondas: dados.form?.rondas?.length ? dados.form.rondas : rondasPadrao,
      });
    },
  });

  const carregar = useCallback(async () => {
    const response = await api.get("/operacao/soc", { params: filtroEquipe ? { equipe: filtroEquipe } : {} });
    setDados(response.data);
    const passagemAberta = response.data.passagensTurno?.find((item: PassagemTurno) => item.status === "Aberto");
    if (!passagemSelecionada && passagemAberta) preencherPassagem(passagemAberta);
  }, [filtroEquipe, passagemSelecionada]);

  const carregarUsuariosEquipe = useCallback(async () => {
    const response = await api.get("/operacao/usuarios-equipe", { params: equipeAtual ? { equipe: equipeAtual } : {} });
    setUsuariosEquipe(response.data);
  }, [equipeAtual]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  useEffect(() => {
    carregarUsuariosEquipe();
  }, [carregarUsuariosEquipe]);

  function preencherPassagem(passagem: PassagemTurno) {
    setPassagemSelecionada(passagem);
    setFiltroEquipe(passagem.equipe || usuario?.equipe || "");
    setForm({
      dataPassagem: dataInput(passagem.dataPassagem),
      colaboradoresIds: passagem.colaboradoresIds || [],
      postos: passagem.postos?.length ? passagem.postos.map((posto) => ({ ...posto, re: posto.re || "" })) : [{ ...postoVazio }],
      statusPostoGocil: passagem.statusPostoGocil || "Completo",
      observacaoPostoGocil: passagem.observacaoPostoGocil || "",
      statusPostoScanner: passagem.statusPostoScanner || "Completo",
      observacaoPostoScanner: passagem.observacaoPostoScanner || "",
      informacoesComplementares: passagem.informacoesComplementares || "",
      checklistEquipamentos: passagem.checklistEquipamentos?.length ? passagem.checklistEquipamentos : checklistEquipamentosPadrao,
      rondas: passagem.rondas?.length ? passagem.rondas : rondasPadrao,
    });
  }

  function novoPosto() {
    setForm((atual) => ({ ...atual, postos: [...atual.postos, { ...postoVazio }] }));
  }

  function removerPosto(index: number) {
    setForm((atual) => ({ ...atual, postos: atual.postos.filter((_, i) => i !== index) }));
  }

  function atualizarPosto(index: number, campo: keyof PostoPassagem, valor: string) {
    setForm((atual) => ({
      ...atual,
      postos: atual.postos.map((posto, i) => (i === index ? { ...posto, [campo]: valor } : posto)),
    }));
  }

  function atualizarEquipamento(index: number, campo: keyof ChecklistEquipamento, valor: string) {
    setForm((atual) => ({
      ...atual,
      checklistEquipamentos: atual.checklistEquipamentos.map((item, i) => (i === index ? { ...item, [campo]: valor } : item)),
    }));
  }

  function atualizarRonda(index: number, campo: keyof RondaOperacional, valor: string) {
    setForm((atual) => ({
      ...atual,
      rondas: atual.rondas.map((item, i) => (i === index ? { ...item, [campo]: campo.includes("hora") ? mascaraHora(valor) : valor } : item)),
    }));
  }

  function alternarColaborador(id: number) {
    if (!podeEditarPassagem) return;
    setForm((atual) => ({
      ...atual,
      colaboradoresIds: atual.colaboradoresIds.includes(id)
        ? atual.colaboradoresIds.filter((item) => item !== id)
        : [...atual.colaboradoresIds, id],
    }));
  }

  const informacoesPlantao = separarInformacoes(form.informacoesComplementares);

  async function abrirNovaPassagem() {
    const passagemAbertaDia = dados?.passagensTurno.find((item) => {
      const mesmaData = dataInput(item.dataPassagem) === form.dataPassagem;
      const mesmaEquipe = !equipeAtual || item.equipe === equipeAtual;
      return item.status === "Aberto" && mesmaData && mesmaEquipe;
    });

    if (passagemAbertaDia) {
      preencherPassagem(passagemAbertaDia);
      alert(`Já existe um Relatório CCOS aberto para este dia: ${passagemAbertaDia.codigo}.`);
      return;
    }

    const confirmar = window.confirm("Deseja realmente abrir um novo Relatório CCOS?");
    if (!confirmar) return;

    setSalvando(true);
    try {
      const response = await api.post("/operacao/passagens-turno", {
        equipe: equipeAtual,
        dataPassagem: form.dataPassagem,
        colaboradoresIds: form.colaboradoresIds,
        postos: form.postos,
      });
      preencherPassagem(response.data);
      await carregar();
    } finally {
      setSalvando(false);
    }
  }

  async function salvarPassagem(formOverride = form) {
    if (formOverride.statusPostoGocil === "Incompleto" && !formOverride.observacaoPostoGocil.trim()) {
      alert("Informe as observações do Posto Gocil.");
      return;
    }
    if (formOverride.statusPostoScanner === "Incompleto" && !formOverride.observacaoPostoScanner.trim()) {
      alert("Informe as observações do Posto Scanner.");
      return;
    }
    setSalvando(true);
    try {
      const payload = { ...formOverride, equipe: equipeAtual };
      const response = passagemSelecionada
        ? await api.put(`/operacao/passagens-turno/${passagemSelecionada.id}`, payload)
        : await api.post("/operacao/passagens-turno", payload);
      preencherPassagem(response.data);
      await carregar();
    } finally {
      setSalvando(false);
    }
  }

  async function finalizarPassagem() {
    if (!passagemSelecionada) return;
    const confirmar = window.confirm("Deseja realmente finalizar e enviar este relatório?");
    if (!confirmar) return;
    const senhaAssinatura = window.prompt("Confirme sua senha para assinar eletronicamente o Relatório CCOS:");
    if (!senhaAssinatura) return;
    setSalvando(true);
    try {
      const response = await api.post(`/operacao/passagens-turno/${passagemSelecionada.id}/finalizar`, { senhaAssinatura });
      await autoSaveCcos.descartar().catch(() => undefined);
      preencherPassagem(response.data);
      await carregar();
      alert("Relatório enviado com sucesso. Obrigado!");
      baixarPdf(response.data.id);
    } finally {
      setSalvando(false);
    }
  }

  async function baixarPdf(id = passagemSelecionada?.id) {
    if (!id) return;
    const response = await api.get(`/operacao/passagens-turno/${id}/pdf`, { responseType: "blob" });
    const passagem = dados?.passagensTurno.find((item) => item.id === id) || passagemSelecionada;
    const url = URL.createObjectURL(new Blob([response.data], { type: "application/pdf" }));
    setPdfLightbox({
      url,
      titulo: passagem ? `Relatório CCOS ${passagem.codigo}` : "Relatório CCOS",
      nomeArquivo: `relatorio-ccos-${passagem?.codigo || id}.pdf`.replace(/\//g, "-"),
    });
  }

  function fecharPdfLightbox() {
    if (pdfLightbox?.url) URL.revokeObjectURL(pdfLightbox.url);
    setPdfLightbox(null);
  }

  async function excluirPassagem(passagem: PassagemTurno) {
    const confirmar = window.confirm(`Deseja realmente excluir o Relatório CCOS ${passagem.codigo}? Esta ação não poderá ser desfeita.`);
    if (!confirmar) return;
    setSalvando(true);
    try {
      await api.delete(`/operacao/passagens-turno/${passagem.id}`);
      if (passagemSelecionada?.id === passagem.id) {
        await autoSaveCcos.descartar().catch(() => undefined);
        setPassagemSelecionada(null);
        setForm({
          dataPassagem: dataInput(),
          colaboradoresIds: [],
          postos: [{ ...postoVazio }],
          statusPostoGocil: "Completo",
          observacaoPostoGocil: "",
          statusPostoScanner: "Completo",
          observacaoPostoScanner: "",
          informacoesComplementares: "",
          checklistEquipamentos: checklistEquipamentosPadrao,
          rondas: rondasPadrao,
        });
      }
      await carregar();
    } finally {
      setSalvando(false);
    }
  }

  async function carregarUltimoChecklistEquipamentos() {
    if (!equipeAtual) {
      alert("Selecione a equipe para buscar o checklist anterior.");
      return;
    }
    const confirmar = window.confirm("Deseja carregar o checklist de equipamentos do relatório anterior? Os itens atuais serão substituídos.");
    if (!confirmar) return;
    setSalvando(true);
    try {
      const response = await api.get("/operacao/passagens-turno/ultimo-checklist-equipamentos", {
        params: {
          equipe: equipeAtual,
          ignorarId: passagemSelecionada?.id,
        },
      });
      const checklist = response.data.checklistEquipamentos?.length ? response.data.checklistEquipamentos : checklistEquipamentosPadrao;
      setForm((atual) => ({ ...atual, checklistEquipamentos: checklist }));
      alert(`Checklist carregado do relatório ${response.data.codigo}. Revise as informações antes de enviar.`);
    } catch (error) {
      const mensagem = error && typeof error === "object" && "response" in error
        ? (error as { response?: { data?: { error?: string } } }).response?.data?.error
        : undefined;
      alert(mensagem || "Não foi possível carregar o checklist anterior.");
    } finally {
      setSalvando(false);
    }
  }

  async function salvarRegistro(e: React.FormEvent) {
    e.preventDefault();
    if (!passagemSelecionada) {
      alert("Abra ou selecione uma passagem de turno antes de registrar uma informação do plantão.");
      return;
    }
    if (!podeEditarPassagem) {
      alert("Este relatório já foi enviado e não pode ser alterado por este perfil.");
      return;
    }
    const novaInformacao = montarInformacao(titulo, local, observacoes);
    const informacoes = [...informacoesPlantao];
    if (editandoInformacao !== null) {
      informacoes[editandoInformacao] = novaInformacao;
    } else {
      informacoes.push(novaInformacao);
    }
    const proximoForm = { ...form, informacoesComplementares: informacoes.join("\n\n---\n\n") };
    setForm(proximoForm);
    setSalvando(true);
    try {
      await salvarPassagem(proximoForm);
      setTitulo("");
      setObservacoes("");
      setEditandoInformacao(null);
    } finally {
      setSalvando(false);
    }
  }

  function editarInformacaoPlantao(index: number) {
    const info = informacoesPlantao[index] || "";
    const tituloInfo = info.match(/^Título:\s*(.*)$/m)?.[1] || "Informação do Plantão";
    const localInfo = info.match(/^Local:\s*(.*)$/m)?.[1] || "Centro de Operações";
    const descricaoInfo = info.match(/^Descrição:\s*([\s\S]*)$/m)?.[1] || info;
    setTitulo(tituloInfo);
    setLocal(localInfo);
    setObservacoes(descricaoInfo);
    setEditandoInformacao(index);
  }

  async function excluirInformacaoPlantao(index: number) {
    if (!window.confirm("Deseja remover esta informação do relatório de passagem de turno?")) return;
    const informacoes = informacoesPlantao.filter((_, i) => i !== index);
    const proximoForm = { ...form, informacoesComplementares: informacoes.join("\n\n---\n\n") };
    setForm(proximoForm);
    await salvarPassagem(proximoForm);
  }

  const maxReincidencia = useMemo(() => {
    if (!dados) return 1;
    return Math.max(1, ...Object.values(dados.reincidencia).flat().map((item) => item.total));
  }, [dados]);

  const relatorioEmAberto = passagemSelecionada?.status === "Aberto";
  const podeEditarPassagem = Boolean(relatorioEmAberto);

  if (!dados) {
    return <SkeletonDashboard />;
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white sm:text-3xl">Relatório CCOS</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">
            Passagem de turno, livro eletrônico, informações do plantão e inteligência operacional da unidade {dados.unidade}.
          </p>
        </div>
        <button onClick={carregar} className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white dark:bg-blue-600">
          <RefreshCw size={16} />
          Atualizar
        </button>
      </div>
      <AutoSaveStatus status={autoSaveCcos.status} ultima={autoSaveCcos.ultima} />

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <label className="block text-sm font-bold text-slate-700 dark:text-slate-200">Filtrar informações por equipe</label>
        <select value={filtroEquipe} onChange={(e) => setFiltroEquipe(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 bg-white p-3 dark:border-slate-700 dark:bg-slate-950 dark:text-white md:max-w-xs">
          <option value="">Minha equipe / todas permitidas</option>
          {(dados.equipes || equipesPadrao).map((equipe) => (
            <option key={equipe} value={equipe}>{equipe}</option>
          ))}
        </select>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {metricas.map(([chave, tituloCard]) => (
          <div key={chave} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <p className="text-sm text-slate-500 dark:text-slate-400">{tituloCard}</p>
            <p className="mt-2 text-3xl font-black text-slate-900 dark:text-white">{dados.soc[chave] || 0}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-4 flex items-center gap-2">
            <BookOpen className="text-emerald-600" size={20} />
            <h2 className="font-bold text-slate-900 dark:text-white">Livro eletrônico de ocorrências</h2>
          </div>
          <div className="max-h-[430px] space-y-3 overflow-auto pr-2">
            {dados.livroEletronico.map((item, index) => (
              <div key={`${item.tipo}-${index}`} className="rounded-xl border border-slate-100 p-3 text-sm dark:border-slate-800">
                <div className="flex items-center justify-between gap-3">
                  <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-200">{item.tipo}</span>
                  <span className="text-xs text-slate-500">{new Date(item.data).toLocaleString("pt-BR")}</span>
                </div>
                <p className="mt-2 font-bold text-slate-900 dark:text-white">{item.titulo}</p>
                <p className="mt-1 text-slate-500 dark:text-slate-400">{item.detalhe}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <ClipboardCheck className="text-cyan-600" size={20} />
              <h2 className="font-bold text-slate-900 dark:text-white">Relatório CCOS</h2>
            </div>
            <button type="button" onClick={abrirNovaPassagem} disabled={salvando} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-3 py-2 text-sm font-bold text-white disabled:bg-slate-400">
              <Plus size={16} />
              Novo Relatório
            </button>
          </div>
          <div className="grid gap-3">
            {dados.passagensTurno.length === 0 ? (
              <p className="rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                Nenhuma passagem de turno encontrada. Abra uma nova passagem para criar o card em aberto do plantão.
              </p>
            ) : (
              dados.passagensTurno.map((passagem) => (
                <div
                  key={passagem.id}
                  className={`rounded-xl border p-4 text-left text-sm transition hover:border-blue-500 ${passagemSelecionada?.id === passagem.id ? "border-blue-500 bg-blue-50 dark:bg-blue-950/30" : "border-slate-100 dark:border-slate-800"}`}
                >
                  <button type="button" onClick={() => preencherPassagem(passagem)} className="w-full text-left">
                    <div className="flex items-center justify-between gap-3">
                      <strong className="text-slate-900 dark:text-white">{passagem.codigo}</strong>
                      <span className={`rounded-full px-2 py-1 text-xs font-bold ${passagem.status === "Aberto" ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200" : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200"}`}>
                        {passagem.status}
                      </span>
                    </div>
                    <p className="mt-2 text-slate-600 dark:text-slate-300">{passagem.unidade} | {passagem.equipe}</p>
                    <p className="text-slate-500 dark:text-slate-400">Responsável: {passagem.responsavel?.apelido || passagem.responsavel?.nome || "Não informado"}</p>
                    <p className="mt-1 text-xs text-slate-500">Aberto em {new Date(passagem.horaAbertura).toLocaleString("pt-BR")}</p>
                  </button>
                  {podeExcluirPassagem && (
                    <button
                      type="button"
                      onClick={() => excluirPassagem(passagem)}
                      disabled={salvando}
                      className="mt-3 inline-flex items-center gap-2 rounded-lg border border-red-200 px-3 py-2 text-xs font-bold text-red-700 transition hover:bg-red-50 disabled:text-slate-400 dark:border-red-900 dark:text-red-200 dark:hover:bg-red-950/40"
                    >
                      <Trash2 size={14} />
                      Excluir relatório
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Relatório CCOS em tempo real</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {passagemSelecionada ? `${passagemSelecionada.codigo} | ${passagemSelecionada.status}` : "Abra ou selecione uma passagem para alimentar o relatório durante o plantão."}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => salvarPassagem()} disabled={salvando || !relatorioEmAberto} className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white disabled:bg-slate-400 dark:bg-blue-600">
              <Save size={16} />
              Salvar
            </button>
            <button type="button" onClick={() => setRondasAberto(true)} disabled={!relatorioEmAberto} className="inline-flex items-center gap-2 rounded-xl border border-blue-300 px-4 py-2 text-sm font-bold text-blue-700 disabled:border-slate-200 disabled:text-slate-400 dark:border-blue-900 dark:text-blue-100">
              <ClipboardCheck size={16} />
              Rondas
            </button>
            <button type="button" onClick={finalizarPassagem} disabled={salvando || !passagemSelecionada || passagemSelecionada.status === "Enviado"} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white disabled:bg-slate-400">
              <Send size={16} />
              Enviar Relatório
            </button>
            <button type="button" onClick={() => baixarPdf()} disabled={!passagemSelecionada} className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700 disabled:text-slate-400 dark:border-slate-700 dark:text-slate-100">
              <FileDown size={16} />
              PDF
            </button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <label className="text-sm font-bold text-slate-700 dark:text-slate-200">
            Data da passagem
            <input type="date" value={form.dataPassagem} onChange={(e) => setForm((atual) => ({ ...atual, dataPassagem: e.target.value }))} disabled={!podeEditarPassagem} className="mt-2 w-full rounded-xl border border-slate-300 bg-white p-3 font-normal dark:border-slate-700 dark:bg-slate-950 dark:text-white" />
          </label>
          <label className="text-sm font-bold text-slate-700 dark:text-slate-200">
            Unidade
            <input value={dados.unidade} readOnly className="mt-2 w-full rounded-xl border border-slate-300 bg-slate-50 p-3 font-normal dark:border-slate-700 dark:bg-slate-950 dark:text-white" />
          </label>
          <label className="text-sm font-bold text-slate-700 dark:text-slate-200">
            Equipe
            <select value={equipeAtual} onChange={(e) => setFiltroEquipe(e.target.value)} disabled={!gerenciaPassagem || !podeEditarPassagem} className="mt-2 w-full rounded-xl border border-slate-300 bg-white p-3 font-normal dark:border-slate-700 dark:bg-slate-950 dark:text-white">
              <option value="">Selecione a equipe</option>
              {(dados.equipes || equipesPadrao).map((equipe) => <option key={equipe} value={equipe}>{equipe}</option>)}
            </select>
          </label>
          <label className="text-sm font-bold text-slate-700 dark:text-slate-200">
            Colaboradores da equipe
            <div className="mt-2 min-h-24 rounded-xl border border-slate-300 bg-white p-2 font-normal dark:border-slate-700 dark:bg-slate-950">
              {usuariosEquipe.length === 0 ? (
                <p className="p-2 text-sm text-slate-500">Nenhum colaborador encontrado para esta equipe.</p>
              ) : (
                <div className="grid gap-2">
                  {usuariosEquipe.map((item) => {
                    const selecionado = form.colaboradoresIds.includes(item.id);
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => alternarColaborador(item.id)}
                        disabled={!podeEditarPassagem}
                        className={`rounded-lg border px-3 py-2 text-left text-sm transition ${
                          selecionado
                            ? "border-blue-500 bg-blue-50 font-bold text-blue-700 dark:bg-blue-950/40 dark:text-blue-100"
                            : "border-slate-200 text-slate-700 hover:border-blue-300 dark:border-slate-800 dark:text-slate-200"
                        } disabled:opacity-60`}
                      >
                        {item.apelido || item.nome}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </label>
        </div>

        <div className="mt-6">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-bold text-slate-900 dark:text-white">Postos Operacionais</h3>
            <button type="button" onClick={novoPosto} disabled={!podeEditarPassagem} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-bold text-white disabled:bg-slate-400">
              <Plus size={15} />
              Adicionar novo posto
            </button>
          </div>
          <div className="space-y-3">
            {form.postos.map((posto, index) => (
              <div key={index} className="grid gap-3 rounded-xl border border-slate-200 p-3 dark:border-slate-800 md:grid-cols-[1fr_1fr_0.7fr_0.7fr_auto]">
                <select value={posto.posto} onChange={(e) => atualizarPosto(index, "posto", e.target.value)} disabled={!podeEditarPassagem} className="rounded-xl border border-slate-300 bg-white p-3 dark:border-slate-700 dark:bg-slate-950 dark:text-white">
                  <option value="">Selecione o posto</option>
                  {postosDisponiveis.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
                <input value={posto.colaborador} onChange={(e) => atualizarPosto(index, "colaborador", e.target.value)} disabled={!podeEditarPassagem} placeholder="Nome do colaborador alocado" className="rounded-xl border border-slate-300 bg-white p-3 dark:border-slate-700 dark:bg-slate-950 dark:text-white" />
                <input value={posto.re} onChange={(e) => atualizarPosto(index, "re", e.target.value)} disabled={!podeEditarPassagem} placeholder="R.E do colaborador" className="rounded-xl border border-slate-300 bg-white p-3 dark:border-slate-700 dark:bg-slate-950 dark:text-white" />
                <select value={posto.escala} onChange={(e) => atualizarPosto(index, "escala", e.target.value)} disabled={!podeEditarPassagem} className="rounded-xl border border-slate-300 bg-white p-3 dark:border-slate-700 dark:bg-slate-950 dark:text-white">
                  <option value="">Escala</option>
                  {escalas.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
                <button type="button" onClick={() => removerPosto(index)} disabled={!podeEditarPassagem || form.postos.length === 1} className="rounded-xl border border-red-200 p-3 text-red-600 disabled:border-slate-200 disabled:text-slate-300 dark:border-red-900">
                  <Trash2 size={18} />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
            <label className="text-sm font-bold text-slate-700 dark:text-slate-200">
              Status do Posto Gocil
              <select value={form.statusPostoGocil} onChange={(e) => setForm((atual) => ({ ...atual, statusPostoGocil: e.target.value }))} disabled={!podeEditarPassagem} className="mt-2 w-full rounded-xl border border-slate-300 bg-white p-3 font-normal dark:border-slate-700 dark:bg-slate-950 dark:text-white">
                <option>Completo</option>
                <option>Incompleto</option>
              </select>
            </label>
            {form.statusPostoGocil === "Incompleto" && (
              <textarea value={form.observacaoPostoGocil} onChange={(e) => setForm((atual) => ({ ...atual, observacaoPostoGocil: e.target.value }))} disabled={!podeEditarPassagem} required placeholder="Observações obrigatórias do Posto Gocil" rows={4} className="mt-3 w-full rounded-xl border border-slate-300 bg-white p-3 dark:border-slate-700 dark:bg-slate-950 dark:text-white" />
            )}
          </div>
          <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
            <label className="text-sm font-bold text-slate-700 dark:text-slate-200">
              Status do Posto Scanner
              <select value={form.statusPostoScanner} onChange={(e) => setForm((atual) => ({ ...atual, statusPostoScanner: e.target.value }))} disabled={!podeEditarPassagem} className="mt-2 w-full rounded-xl border border-slate-300 bg-white p-3 font-normal dark:border-slate-700 dark:bg-slate-950 dark:text-white">
                <option>Completo</option>
                <option>Incompleto</option>
              </select>
            </label>
            {form.statusPostoScanner === "Incompleto" && (
              <textarea value={form.observacaoPostoScanner} onChange={(e) => setForm((atual) => ({ ...atual, observacaoPostoScanner: e.target.value }))} disabled={!podeEditarPassagem} required placeholder="Observações obrigatórias do Posto Scanner" rows={4} className="mt-3 w-full rounded-xl border border-slate-300 bg-white p-3 dark:border-slate-700 dark:bg-slate-950 dark:text-white" />
            )}
          </div>
        </div>

        <div className="mt-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white">Checklist de equipamentos da portaria e segurança</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">Use o último checklist como base e altere somente o que mudou no turno.</p>
            </div>
            <button type="button" onClick={carregarUltimoChecklistEquipamentos} disabled={!podeEditarPassagem || salvando} className="inline-flex items-center justify-center gap-2 rounded-xl border border-blue-200 px-4 py-2 text-sm font-bold text-blue-700 transition hover:bg-blue-50 disabled:border-slate-200 disabled:text-slate-400 dark:border-blue-900 dark:text-blue-200 dark:hover:bg-blue-950">
              <RefreshCw size={16} />
              Carregar último checklist
            </button>
          </div>
          <div className="mt-3 space-y-4">
            {Array.from(new Set(form.checklistEquipamentos.map((item) => item.categoria))).map((categoria) => (
              <div key={categoria} className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800">
                <div className="bg-blue-600 px-4 py-2 text-sm font-bold uppercase text-white">{categoria}</div>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="bg-slate-100 text-left text-xs uppercase text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                      <tr>
                        <th className="p-3">Equipamento</th>
                        <th className="p-3">Funcionando</th>
                        <th className="p-3">Observação</th>
                        <th className="p-3">Nº chamado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                      {form.checklistEquipamentos.map((item, index) => ({ item, index })).filter(({ item }) => item.categoria === categoria).map(({ item, index }) => (
                        <tr key={`${item.categoria}-${item.nome}`}>
                          <td className="p-3 font-semibold text-slate-800 dark:text-slate-100">{item.nome}</td>
                          <td className="p-3">
                            <select value={item.funcionando} onChange={(e) => atualizarEquipamento(index, "funcionando", e.target.value)} disabled={!podeEditarPassagem} className="w-full rounded-lg border border-slate-300 bg-white p-2 dark:border-slate-700 dark:bg-slate-950 dark:text-white">
                              <option>Sim</option>
                              <option>Não</option>
                              <option>N/A</option>
                            </select>
                          </td>
                          <td className="p-3">
                            <input value={item.observacao} onChange={(e) => atualizarEquipamento(index, "observacao", e.target.value)} disabled={!podeEditarPassagem} placeholder="Observação operacional" className="w-full rounded-lg border border-slate-300 bg-white p-2 dark:border-slate-700 dark:bg-slate-950 dark:text-white" />
                          </td>
                          <td className="p-3">
                            <input value={item.chamado} onChange={(e) => atualizarEquipamento(index, "chamado", e.target.value)} disabled={!podeEditarPassagem} placeholder="Nº chamado" className="w-full rounded-lg border border-slate-300 bg-white p-2 dark:border-slate-700 dark:bg-slate-950 dark:text-white" />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6">
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-bold text-slate-900 dark:text-white">Informações adicionadas ao relatório</h3>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-200">{informacoesPlantao.length} registro(s)</span>
          </div>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            {informacoesPlantao.length === 0 ? (
              <p className="rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">Nenhuma informação adicionada ao relatório atual.</p>
            ) : informacoesPlantao.map((info, index) => (
              <div key={`${index}-${info.slice(0, 20)}`} className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm dark:border-slate-800 dark:bg-slate-950">
                <p className="whitespace-pre-line text-slate-700 dark:text-slate-200">{info}</p>
                {podeEditarPassagem && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button type="button" onClick={() => editarInformacaoPlantao(index)} className="inline-flex items-center gap-2 rounded-lg border border-blue-200 px-3 py-2 text-xs font-bold text-blue-700 dark:border-blue-900 dark:text-blue-200">
                      <Pencil size={14} />
                      Editar
                    </button>
                    <button type="button" onClick={() => excluirInformacaoPlantao(index)} className="inline-flex items-center gap-2 rounded-lg border border-red-200 px-3 py-2 text-xs font-bold text-red-700 dark:border-red-900 dark:text-red-200">
                      <Trash2 size={14} />
                      Excluir
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {passagemSelecionada && (
          <div className="mt-6 grid gap-3 rounded-xl bg-slate-50 p-4 text-sm dark:bg-slate-950 md:grid-cols-3">
            <p><strong>CFTV conectadas:</strong> {passagemSelecionada.cftvConectadas ?? "calculado ao enviar"}</p>
            <p><strong>CFTV desconectadas:</strong> {passagemSelecionada.cftvDesconectadas ?? "calculado ao enviar"}</p>
            <p><strong>Contêineres na quadra:</strong> {passagemSelecionada.containersArmazenados ?? "calculado ao enviar"}</p>
          </div>
        )}
      </section>

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <form onSubmit={salvarRegistro} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-4 flex items-center gap-2">
            <ClipboardCheck className="text-blue-600" size={20} />
            <h2 className="font-bold text-slate-900 dark:text-white">Informações do Plantão</h2>
          </div>
          <div className="grid gap-3">
            <input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Título do registro operacional" className="rounded-xl border border-slate-300 bg-white p-3 dark:border-slate-700 dark:bg-slate-950 dark:text-white" />
            <input value={local} onChange={(e) => setLocal(e.target.value)} placeholder="Local operacional" className="rounded-xl border border-slate-300 bg-white p-3 dark:border-slate-700 dark:bg-slate-950 dark:text-white" />
            <textarea value={observacoes} onChange={(e) => setObservacoes(e.target.value)} placeholder="Observações, pendências, alertas e orientações para o próximo turno" rows={6} className="rounded-xl border border-slate-300 bg-white p-3 dark:border-slate-700 dark:bg-slate-950 dark:text-white" />
            <button disabled={salvando} className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 font-bold text-white disabled:bg-slate-400">
              <Send size={16} />
              {salvando ? "Salvando..." : "Registrar informação"}
            </button>
          </div>
        </form>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-4 flex items-center gap-2">
            <AlertTriangle className="text-amber-600" size={20} />
            <h2 className="font-bold text-slate-900 dark:text-white">Governança operacional</h2>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {Object.entries(dados.indicadoresMensais).map(([chave, valor]) => (
              <div key={chave} className="rounded-xl bg-slate-50 p-4 dark:bg-slate-950">
                <p className="text-xs uppercase text-slate-500">{chave}</p>
                <p className="mt-1 text-2xl font-black text-slate-900 dark:text-white">{valor}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-950/30">
            <p className="mb-2 flex items-center gap-2 font-bold text-blue-900 dark:text-blue-100"><Activity size={16} /> Relatórios automáticos preparados</p>
            <ul className="space-y-1 text-sm text-blue-800 dark:text-blue-100">
              {dados.relatoriosExecutivosAutomaticos.map((item) => <li key={item}>{item}</li>)}
            </ul>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-4 flex items-center gap-2">
          <RadioTower className="text-purple-600" size={20} />
          <h2 className="font-bold text-slate-900 dark:text-white">Reincidência e inteligência</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Object.entries(dados.reincidencia).map(([grupo, itens]) => (
            <div key={grupo} className="rounded-xl bg-slate-50 p-4 dark:bg-slate-950">
              <p className="mb-3 text-sm font-bold capitalize text-slate-700 dark:text-slate-200">{grupo.replace("por", "Por ")}</p>
              <div className="space-y-2">
                {itens.slice(0, 5).map((item) => (
                  <div key={item.nome}>
                    <div className="flex justify-between text-xs text-slate-500"><span>{item.nome}</span><span>{item.total}</span></div>
                    <div className="mt-1 h-2 rounded-full bg-slate-200 dark:bg-slate-800">
                      <div className="h-2 rounded-full bg-blue-600" style={{ width: `${Math.max(8, (item.total / maxReincidencia) * 100)}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {rondasAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="max-h-[92vh] w-full max-w-6xl overflow-auto rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900">
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-4 dark:border-slate-800">
              <div>
                <p className="text-xs font-bold uppercase text-blue-600">Relatório CCOS</p>
                <h2 className="text-2xl font-black text-slate-900 dark:text-white">Rondas Operacionais</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">Registre horários, responsável, alteração e observações das rondas do turno.</p>
              </div>
              <button type="button" onClick={() => setRondasAberto(false)} className="rounded-lg bg-slate-100 px-4 py-2 font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-100">Fechar</button>
            </div>
            <div className="mt-5 grid gap-4 lg:grid-cols-2">
              {form.rondas.map((ronda, index) => (
                <div key={ronda.ponto} className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
                  <h3 className="font-black uppercase text-slate-900 dark:text-white">{ronda.ponto}</h3>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <input value={ronda.horaInicio} onChange={(e) => atualizarRonda(index, "horaInicio", e.target.value)} placeholder="Hora início 22:10" maxLength={5} className="rounded-lg border p-3 dark:border-slate-700 dark:bg-slate-900 dark:text-white" />
                    <input value={ronda.horaTermino} onChange={(e) => atualizarRonda(index, "horaTermino", e.target.value)} placeholder="Hora término 22:40" maxLength={5} className="rounded-lg border p-3 dark:border-slate-700 dark:bg-slate-900 dark:text-white" />
                    <input value={ronda.nome} onChange={(e) => atualizarRonda(index, "nome", e.target.value)} placeholder="Nome do responsável" className="rounded-lg border p-3 dark:border-slate-700 dark:bg-slate-900 dark:text-white sm:col-span-2" />
                    <select value={ronda.alteracao} onChange={(e) => atualizarRonda(index, "alteracao", e.target.value)} className="rounded-lg border p-3 dark:border-slate-700 dark:bg-slate-900 dark:text-white">
                      <option>Não</option>
                      <option>Sim</option>
                    </select>
                    <input value={ronda.observacoes} onChange={(e) => atualizarRonda(index, "observacoes", e.target.value)} placeholder="Observações da ronda" className="rounded-lg border p-3 dark:border-slate-700 dark:bg-slate-900 dark:text-white" />
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-5 flex justify-end gap-3">
              <button type="button" onClick={() => setRondasAberto(false)} className="rounded-xl bg-slate-200 px-4 py-2 font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-100">Continuar editando</button>
              <button type="button" onClick={() => { setRondasAberto(false); salvarPassagem(); }} className="rounded-xl bg-blue-600 px-4 py-2 font-bold text-white">Salvar rondas</button>
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


