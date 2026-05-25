import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { Camera, Download, Eye, FileText, PackageSearch, Pencil, Trash2 } from "lucide-react";
import { api } from "../services/api";
import { podeAdministrar, podeAnalisar, usuarioAtual } from "../utils/permissoes";

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
  tipoContainer: string;
  dimensao: string;
  destino: string;
  scannerEntrada: boolean;
  scannerSaida?: boolean | null;
  estufadoTerminal: boolean;
  numeroLacre?: string | null;
  novoLacre?: string | null;
  armador?: string | null;
  transportadora?: string | null;
  motoristaResponsavel?: string | null;
  documentoMotorista?: string | null;
  placaCavalo?: string | null;
  placaCarreta?: string | null;
  tipoCarga?: string | null;
  pesoCarga?: string | null;
  prioridade: string;
  statusOperacional: string;
  statusFinal?: string | null;
  observacoes?: string | null;
  observacoesSaida?: string | null;
  tempoTerminal: string;
  nivelPermanencia: string;
  anexos?: Anexo[];
  historico?: Historico[];
};

const inicial = {
  numeroContainer: "",
  dataHoraEntrada: "",
  dataHoraSaida: "",
  tipoContainer: "Dry",
  dimensao: "20 pés",
  destino: "América do Sul",
  scannerEntrada: "Não",
  scannerSaida: "",
  estufadoTerminal: "Não",
  numeroLacre: "",
  novoLacre: "",
  armador: "",
  transportadora: "",
  motoristaResponsavel: "",
  documentoMotorista: "",
  placaCavalo: "",
  placaCarreta: "",
  tipoCarga: "",
  pesoCarga: "",
  prioridade: "Baixa",
  statusOperacional: "Previsto para chegada",
  statusFinal: "",
  observacoes: "",
  observacoesSaida: "",
  categoriaAnexo: "Entrada",
};

const tipoContainer = ["Dry", "Reefer", "Tank", "Open Top", "Flat Rack"];
const dimensoes = ["20 pés", "40 pés", "40 HC"];
const destinos = ["África", "Europa", "Ásia", "América do Norte", "América do Sul", "América Central", "Oriente Médio", "Oceania"];
const prioridades = ["Baixa", "Média", "Alta", "Crítica"];
const statusOperacionais = ["Previsto para chegada", "Dentro do terminal", "Liberado", "Pendente de verificação", "Bloqueado"];
const statusFinais = ["", "Liberado", "Retido", "Encaminhado para verificação", "Finalizado"];
const categorias = ["Entrada", "Saída", "Evidências Operacionais"];

const nivelClasse: Record<string, string> = {
  normal: "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200",
  atencao: "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200",
  critico: "border-red-300 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-200",
  finalizado: "border-slate-300 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200",
};

function inputData(data?: string | null) {
  if (!data) return "";
  const date = new Date(data);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

function nomeUsuario(usuario?: { nome: string; apelido?: string | null }) {
  return usuario?.apelido || usuario?.nome || "Sistema";
}

export default function QuadraSeguranca() {
  const [containers, setContainers] = useState<ContainerQuadra[]>([]);
  const [form, setForm] = useState({ ...inicial });
  const [arquivos, setArquivos] = useState<File[]>([]);
  const [editando, setEditando] = useState<ContainerQuadra | null>(null);
  const [dossie, setDossie] = useState<ContainerQuadra | null>(null);
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("");
  const [filtroDimensao, setFiltroDimensao] = useState("");
  const [filtroDestino, setFiltroDestino] = useState("");
  const [filtroScanner, setFiltroScanner] = useState("");
  const [filtroEstufado, setFiltroEstufado] = useState("");
  const [carregando, setCarregando] = useState(true);
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

  const filtrados = useMemo(() => {
    return containers.filter((item) => {
      const texto = `${item.numeroContainer} ${item.armador || ""} ${item.transportadora || ""} ${item.motoristaResponsavel || ""}`.toLowerCase();
      return (
        (!busca || texto.includes(busca.toLowerCase())) &&
        (!filtroStatus || item.statusOperacional === filtroStatus) &&
        (!filtroTipo || item.tipoContainer === filtroTipo) &&
        (!filtroDimensao || item.dimensao === filtroDimensao) &&
        (!filtroDestino || item.destino === filtroDestino) &&
        (!filtroScanner || (filtroScanner === "Sim" ? item.scannerEntrada : !item.scannerEntrada)) &&
        (!filtroEstufado || (filtroEstufado === "Sim" ? item.estufadoTerminal : !item.estufadoTerminal))
      );
    });
  }, [busca, containers, filtroDestino, filtroDimensao, filtroEstufado, filtroScanner, filtroStatus, filtroTipo]);

  const resumo = useMemo(() => ({
    total: containers.length,
    terminal: containers.filter((item) => ["Dentro do terminal", "Pendente de verificação", "Bloqueado"].includes(item.statusOperacional)).length,
    criticos: containers.filter((item) => item.nivelPermanencia === "critico" || item.prioridade === "Crítica").length,
    scannerPendente: containers.filter((item) => !item.scannerEntrada).length,
  }), [containers]);

  function campo(nome: string, valor: string) {
    setForm((atual) => ({
      ...atual,
      [nome]: ["numeroContainer", "placaCavalo", "placaCarreta"].includes(nome)
        ? valor.toLocaleUpperCase("pt-BR")
        : valor,
    }));
  }

  function novo() {
    setEditando(null);
    setArquivos([]);
    setForm({
      ...inicial,
      dataHoraEntrada: inputData(new Date().toISOString()),
    });
  }

  function editar(item: ContainerQuadra) {
    setEditando(item);
    setArquivos([]);
    setForm({
      numeroContainer: item.numeroContainer,
      dataHoraEntrada: inputData(item.dataHoraEntrada),
      dataHoraSaida: inputData(item.dataHoraSaida),
      tipoContainer: item.tipoContainer,
      dimensao: item.dimensao,
      destino: item.destino,
      scannerEntrada: item.scannerEntrada ? "Sim" : "Não",
      scannerSaida: item.scannerSaida === null || item.scannerSaida === undefined ? "" : item.scannerSaida ? "Sim" : "Não",
      estufadoTerminal: item.estufadoTerminal ? "Sim" : "Não",
      numeroLacre: item.numeroLacre || "",
      novoLacre: item.novoLacre || "",
      armador: item.armador || "",
      transportadora: item.transportadora || "",
      motoristaResponsavel: item.motoristaResponsavel || "",
      documentoMotorista: item.documentoMotorista || "",
      placaCavalo: item.placaCavalo || "",
      placaCarreta: item.placaCarreta || "",
      tipoCarga: item.tipoCarga || "",
      pesoCarga: item.pesoCarga || "",
      prioridade: item.prioridade,
      statusOperacional: item.statusOperacional,
      statusFinal: item.statusFinal || "",
      observacoes: item.observacoes || "",
      observacoesSaida: item.observacoesSaida || "",
      categoriaAnexo: "Evidências Operacionais",
    });
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

  async function abrirDossie(item: ContainerQuadra) {
    const response = await api.get(`/quadra-seguranca/${item.id}`);
    setDossie(response.data);
  }

  async function excluir(item: ContainerQuadra) {
    if (!confirm(`Deseja excluir o contêiner ${item.numeroContainer}?`)) return;
    await api.delete(`/quadra-seguranca/${item.id}`);
    await carregar();
  }

  return (
    <div className="space-y-6 text-slate-900 dark:text-slate-100">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Quadra de Segurança</h1>
          <p className="mt-1 text-slate-500 dark:text-slate-400">
            Controle operacional, scanner, evidências e rastreabilidade de contêineres.
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
          <p className="text-sm text-slate-500">No terminal</p>
          <p className="mt-2 text-3xl font-bold text-blue-600">{resumo.terminal}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <p className="text-sm text-slate-500">Críticos</p>
          <p className="mt-2 text-3xl font-bold text-red-600">{resumo.criticos}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <p className="text-sm text-slate-500">Sem scanner entrada</p>
          <p className="mt-2 text-3xl font-bold text-amber-600">{resumo.scannerPendente}</p>
        </div>
      </div>

      <form onSubmit={salvar} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-4 flex items-center gap-2">
          <PackageSearch className="text-blue-600" />
          <h2 className="text-xl font-bold">{editando ? `Editar ${editando.numeroContainer}` : "Cadastro de Entrada"}</h2>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <input className="rounded-lg border p-3 dark:border-slate-700 dark:bg-slate-950" placeholder="Número do Contêiner" value={form.numeroContainer} onChange={(e) => campo("numeroContainer", e.target.value)} required />
          <input className="rounded-lg border p-3 dark:border-slate-700 dark:bg-slate-950" type="datetime-local" value={form.dataHoraEntrada} onChange={(e) => campo("dataHoraEntrada", e.target.value)} required />
          <select className="rounded-lg border p-3 dark:border-slate-700 dark:bg-slate-950" value={form.tipoContainer} onChange={(e) => campo("tipoContainer", e.target.value)}>
            {tipoContainer.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
          <select className="rounded-lg border p-3 dark:border-slate-700 dark:bg-slate-950" value={form.dimensao} onChange={(e) => campo("dimensao", e.target.value)}>
            {dimensoes.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
          <select className="rounded-lg border p-3 dark:border-slate-700 dark:bg-slate-950" value={form.destino} onChange={(e) => campo("destino", e.target.value)}>
            {destinos.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
          <select className="rounded-lg border p-3 dark:border-slate-700 dark:bg-slate-950" value={form.scannerEntrada} onChange={(e) => campo("scannerEntrada", e.target.value)}>
            <option value="Não">Scanner entrada: Não</option>
            <option value="Sim">Scanner entrada: Sim</option>
          </select>
          <select className="rounded-lg border p-3 dark:border-slate-700 dark:bg-slate-950" value={form.estufadoTerminal} onChange={(e) => campo("estufadoTerminal", e.target.value)}>
            <option value="Não">Estufado no terminal: Não</option>
            <option value="Sim">Estufado no terminal: Sim</option>
          </select>
          <input className="rounded-lg border p-3 dark:border-slate-700 dark:bg-slate-950" placeholder="Número do lacre" value={form.numeroLacre} onChange={(e) => campo("numeroLacre", e.target.value)} />
          <input className="rounded-lg border p-3 dark:border-slate-700 dark:bg-slate-950" placeholder="Armador" value={form.armador} onChange={(e) => campo("armador", e.target.value)} />
          <input className="rounded-lg border p-3 dark:border-slate-700 dark:bg-slate-950" placeholder="Transportadora" value={form.transportadora} onChange={(e) => campo("transportadora", e.target.value)} />
          <input className="rounded-lg border p-3 dark:border-slate-700 dark:bg-slate-950" placeholder="Motorista responsável" value={form.motoristaResponsavel} onChange={(e) => campo("motoristaResponsavel", e.target.value)} />
          <input className="rounded-lg border p-3 dark:border-slate-700 dark:bg-slate-950" placeholder="Documento do motorista" value={form.documentoMotorista} onChange={(e) => campo("documentoMotorista", e.target.value)} />
          <input className="rounded-lg border p-3 uppercase dark:border-slate-700 dark:bg-slate-950" placeholder="Placa do cavalo mecânico" value={form.placaCavalo} onChange={(e) => campo("placaCavalo", e.target.value)} />
          <input className="rounded-lg border p-3 uppercase dark:border-slate-700 dark:bg-slate-950" placeholder="Placa da carreta" value={form.placaCarreta} onChange={(e) => campo("placaCarreta", e.target.value)} />
          <input className="rounded-lg border p-3 dark:border-slate-700 dark:bg-slate-950" placeholder="Tipo de carga" value={form.tipoCarga} onChange={(e) => campo("tipoCarga", e.target.value)} />
          <input className="rounded-lg border p-3 dark:border-slate-700 dark:bg-slate-950" placeholder="Peso da carga" value={form.pesoCarga} onChange={(e) => campo("pesoCarga", e.target.value)} />
          <select className="rounded-lg border p-3 dark:border-slate-700 dark:bg-slate-950" value={form.prioridade} onChange={(e) => campo("prioridade", e.target.value)}>
            {prioridades.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
          <select className="rounded-lg border p-3 dark:border-slate-700 dark:bg-slate-950" value={form.statusOperacional} onChange={(e) => campo("statusOperacional", e.target.value)}>
            {statusOperacionais.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
          <input className="rounded-lg border p-3 dark:border-slate-700 dark:bg-slate-950" type="datetime-local" value={form.dataHoraSaida} onChange={(e) => campo("dataHoraSaida", e.target.value)} placeholder="Data e hora da saída" />
          <select className="rounded-lg border p-3 dark:border-slate-700 dark:bg-slate-950" value={form.scannerSaida} onChange={(e) => campo("scannerSaida", e.target.value)}>
            <option value="">Scanner saída: não informado</option>
            <option value="Não">Scanner saída: Não</option>
            <option value="Sim">Scanner saída: Sim</option>
          </select>
          <select className="rounded-lg border p-3 dark:border-slate-700 dark:bg-slate-950" value={form.statusFinal} onChange={(e) => campo("statusFinal", e.target.value)}>
            {statusFinais.map((item) => <option key={item || "vazio"} value={item}>{item || "Status final não informado"}</option>)}
          </select>
          <input className="rounded-lg border p-3 dark:border-slate-700 dark:bg-slate-950" placeholder="Novo lacre na saída" value={form.novoLacre} onChange={(e) => campo("novoLacre", e.target.value)} />
          <select className="rounded-lg border p-3 dark:border-slate-700 dark:bg-slate-950" value={form.categoriaAnexo} onChange={(e) => campo("categoriaAnexo", e.target.value)}>
            {categorias.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
          <input className="rounded-lg border p-3 dark:border-slate-700 dark:bg-slate-950" type="file" multiple accept="image/*,.pdf" onChange={(e) => setArquivos(Array.from(e.target.files || []))} />
          <textarea className="min-h-24 rounded-lg border p-3 md:col-span-3 dark:border-slate-700 dark:bg-slate-950" placeholder="Observações da entrada" value={form.observacoes} onChange={(e) => campo("observacoes", e.target.value)} />
          <textarea className="min-h-24 rounded-lg border p-3 md:col-span-3 dark:border-slate-700 dark:bg-slate-950" placeholder="Observações da saída" value={form.observacoesSaida} onChange={(e) => campo("observacoesSaida", e.target.value)} />
        </div>
        <div className="mt-4 flex flex-wrap gap-3">
          <button className="rounded-lg bg-green-600 px-4 py-2 font-semibold text-white hover:bg-green-700">Salvar</button>
          {editando && <button type="button" onClick={novo} className="rounded-lg bg-slate-200 px-4 py-2 dark:bg-slate-800">Cancelar edição</button>}
        </div>
      </form>

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-4">
          <input className="rounded-lg border p-3 dark:border-slate-700 dark:bg-slate-950" placeholder="Buscar contêiner, motorista, armador" value={busca} onChange={(e) => setBusca(e.target.value)} />
          <select className="rounded-lg border p-3 dark:border-slate-700 dark:bg-slate-950" value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value)}>
            <option value="">Todos os status</option>
            {statusOperacionais.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
          <select className="rounded-lg border p-3 dark:border-slate-700 dark:bg-slate-950" value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)}>
            <option value="">Todos os tipos</option>
            {tipoContainer.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
          <select className="rounded-lg border p-3 dark:border-slate-700 dark:bg-slate-950" value={filtroDimensao} onChange={(e) => setFiltroDimensao(e.target.value)}>
            <option value="">Todas as dimensões</option>
            {dimensoes.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
          <select className="rounded-lg border p-3 dark:border-slate-700 dark:bg-slate-950" value={filtroDestino} onChange={(e) => setFiltroDestino(e.target.value)}>
            <option value="">Todos os destinos</option>
            {destinos.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
          <select className="rounded-lg border p-3 dark:border-slate-700 dark:bg-slate-950" value={filtroScanner} onChange={(e) => setFiltroScanner(e.target.value)}>
            <option value="">Scanner entrada</option>
            <option value="Sim">Sim</option>
            <option value="Não">Não</option>
          </select>
          <select className="rounded-lg border p-3 dark:border-slate-700 dark:bg-slate-950" value={filtroEstufado} onChange={(e) => setFiltroEstufado(e.target.value)}>
            <option value="">Estufado</option>
            <option value="Sim">Sim</option>
            <option value="Não">Não</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-100 text-left text-slate-600 dark:bg-slate-950 dark:text-slate-300">
              <tr>
                <th className="p-3">Contêiner</th>
                <th className="p-3">Unidade</th>
                <th className="p-3">Entrada</th>
                <th className="p-3">Tipo</th>
                <th className="p-3">Dimensão</th>
                <th className="p-3">Destino</th>
                <th className="p-3">Scanner Entrada</th>
                <th className="p-3">Estufado</th>
                <th className="p-3">Status</th>
                <th className="p-3">Tempo no Terminal</th>
                <th className="p-3">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.map((item) => (
                <tr key={item.id} className="border-t border-slate-200 dark:border-slate-800">
                  <td className="p-3 font-bold">{item.numeroContainer}</td>
                  <td className="p-3">{item.unidade}</td>
                  <td className="p-3">{new Date(item.dataHoraEntrada).toLocaleString("pt-BR")}</td>
                  <td className="p-3">{item.tipoContainer}</td>
                  <td className="p-3">{item.dimensao}</td>
                  <td className="p-3">{item.destino}</td>
                  <td className="p-3">{item.scannerEntrada ? "Sim" : "Não"}</td>
                  <td className="p-3">{item.estufadoTerminal ? "Sim" : "Não"}</td>
                  <td className="p-3"><span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-700 dark:bg-blue-950/40 dark:text-blue-200">{item.statusOperacional}</span></td>
                  <td className="p-3"><span className={`rounded-full border px-3 py-1 text-xs font-bold ${nivelClasse[item.nivelPermanencia] || nivelClasse.normal}`}>{item.tempoTerminal}</span></td>
                  <td className="p-3">
                    <div className="flex gap-2">
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
                <tr><td colSpan={11} className="p-6 text-center text-slate-500">{carregando ? "Carregando..." : "Nenhum contêiner encontrado."}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {dossie && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 p-4">
          <div className="mx-auto my-6 max-w-6xl rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold">Dossiê {dossie.numeroContainer}</h2>
                <p className="text-slate-500">Responsável atual: {nomeUsuario(dossie.historico?.[0]?.usuario)}</p>
              </div>
              <button onClick={() => setDossie(null)} className="rounded-lg bg-slate-100 px-4 py-2 dark:bg-slate-800">Fechar</button>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="rounded-xl border p-4 dark:border-slate-800">
                <h3 className="font-bold">Entrada</h3>
                <p>Entrada: {new Date(dossie.dataHoraEntrada).toLocaleString("pt-BR")}</p>
                <p>Scanner: {dossie.scannerEntrada ? "Sim" : "Não"}</p>
                <p>Lacre: {dossie.numeroLacre || "Não informado"}</p>
                <p>Motorista: {dossie.motoristaResponsavel || "Não informado"}</p>
              </div>
              <div className="rounded-xl border p-4 dark:border-slate-800">
                <h3 className="font-bold">Saída</h3>
                <p>Saída: {dossie.dataHoraSaida ? new Date(dossie.dataHoraSaida).toLocaleString("pt-BR") : "Não informada"}</p>
                <p>Scanner: {dossie.scannerSaida === undefined || dossie.scannerSaida === null ? "Não informado" : dossie.scannerSaida ? "Sim" : "Não"}</p>
                <p>Novo lacre: {dossie.novoLacre || "Não informado"}</p>
                <p>Status final: {dossie.statusFinal || "Não informado"}</p>
              </div>
              <div className="rounded-xl border p-4 dark:border-slate-800">
                <h3 className="font-bold">Operacional</h3>
                <p>Status: {dossie.statusOperacional}</p>
                <p>Prioridade: {dossie.prioridade}</p>
                <p>Tempo: {dossie.tempoTerminal}</p>
                <p>Carga: {dossie.tipoCarga || "Não informada"}</p>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
              <section>
                <h3 className="mb-3 flex items-center gap-2 font-bold"><Camera size={18} /> Anexos e Evidências</h3>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {(dossie.anexos || []).map((anexo) => (
                    <a key={anexo.id} href={`/${anexo.caminho.replace(/\\/g, "/")}`} target="_blank" className="rounded-xl border p-3 hover:border-blue-400 dark:border-slate-800" rel="noreferrer">
                      {anexo.tipo.startsWith("image/") ? (
                        <img src={`/${anexo.caminho.replace(/\\/g, "/")}`} className="mb-2 h-32 w-full rounded-lg object-cover" />
                      ) : (
                        <div className="mb-2 flex h-32 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800"><FileText /></div>
                      )}
                      <p className="truncate font-semibold">{anexo.nomeOriginal}</p>
                      <p className="text-xs text-slate-500">{anexo.categoria} - {new Date(anexo.createdAt).toLocaleString("pt-BR")}</p>
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
