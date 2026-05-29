import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { ChevronDown, Download, Eye, FileText, PackageSearch, Pencil, Trash2 } from "lucide-react";
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
  const [carregando, setCarregando] = useState(true);
  const [formularioAberto, setFormularioAberto] = useState(false);
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

  function campo(nome: string, valor: string) {
    setForm((atual) => ({
      ...atual,
      [nome]: nome === "numeroContainer"
        ? mascararContainer(valor)
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
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <input className="rounded-lg border p-3 uppercase dark:border-slate-700 dark:bg-slate-950" placeholder="Número do contêiner: AAAA 123.456-7" value={form.numeroContainer} onChange={(e) => campo("numeroContainer", e.target.value)} required />
              <input className="rounded-lg border p-3 uppercase dark:border-slate-700 dark:bg-slate-950" placeholder="Posicionamento. Ex: E13A01" value={form.posicionamento} onChange={(e) => campo("posicionamento", e.target.value)} />
              <select className="rounded-lg border p-3 dark:border-slate-700 dark:bg-slate-950" value={form.statusOperacional} onChange={(e) => campo("statusOperacional", e.target.value)}>
                {statusOperacionais.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>

              <label className="space-y-1 text-sm font-semibold text-slate-600 dark:text-slate-300">
                Data de entrada
                <input className="w-full rounded-lg border p-3 font-normal dark:border-slate-700 dark:bg-slate-950" type="datetime-local" value={form.dataHoraEntrada} onChange={(e) => campo("dataHoraEntrada", e.target.value)} required />
              </label>
              <label className="space-y-1 text-sm font-semibold text-slate-600 dark:text-slate-300">
                Data de saída
                <input className="w-full rounded-lg border p-3 font-normal dark:border-slate-700 dark:bg-slate-950" type="datetime-local" value={form.dataHoraSaida} onChange={(e) => campo("dataHoraSaida", e.target.value)} />
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
              <select className="rounded-lg border p-3 dark:border-slate-700 dark:bg-slate-950" value={form.scannerSaida} onChange={(e) => campo("scannerSaida", e.target.value)}>
                <option value="">Scanner na saída</option>
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
              <input className="rounded-lg border p-3 dark:border-slate-700 dark:bg-slate-950" type="file" multiple accept="image/*,.pdf" onChange={(e) => setArquivos(Array.from(e.target.files || []))} />

              <textarea className="min-h-24 rounded-lg border p-3 md:col-span-3 dark:border-slate-700 dark:bg-slate-950" placeholder="Observações operacionais" value={form.observacoes} onChange={(e) => campo("observacoes", e.target.value)} />
              <textarea className="min-h-24 rounded-lg border p-3 md:col-span-3 dark:border-slate-700 dark:bg-slate-950" placeholder="Observações da saída" value={form.observacoesSaida} onChange={(e) => campo("observacoesSaida", e.target.value)} />
            </div>
            <div className="mt-4 flex flex-wrap gap-3">
              <button className="rounded-lg bg-green-600 px-4 py-2 font-semibold text-white hover:bg-green-700">Salvar</button>
              {editando && <button type="button" onClick={novo} className="rounded-lg bg-slate-200 px-4 py-2 dark:bg-slate-800">Cancelar edição</button>}
            </div>
          </form>
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

        <div className="overflow-x-auto">
          {carregando && filtrados.length === 0 ? (
            <SkeletonTable rows={6} columns={10} className="border-0 shadow-none" />
          ) : (
          <table className="min-w-full text-sm">
            <thead className="bg-slate-100 text-left text-slate-600 dark:bg-slate-950 dark:text-slate-300">
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

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h2 className="font-bold">Mapa operacional por posição</h2>
        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {resumo.mapaPosicoes.slice(0, 12).map((item) => (
            <div key={item.posicao} className="rounded-lg bg-slate-50 p-3 text-sm dark:bg-slate-950">
              <div className="flex justify-between gap-2">
                <strong>{item.posicao}</strong>
                <span>{item.total}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

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
