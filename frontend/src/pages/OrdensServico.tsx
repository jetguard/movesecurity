import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  FileText,
  RefreshCcw,
  Search,
  Wrench,
  X,
} from "lucide-react";
import { PdfLightbox } from "../components/ui/PdfLightbox";
import { api } from "../services/api";
import { podeAtenderManutencao } from "../utils/permissoes";

type UsuarioResumo = {
  id: number;
  nome: string;
  apelido?: string | null;
  email?: string;
};

type CameraResumo = {
  id: number;
  numeroCamera: string;
  nomeCamera?: string | null;
  tipoCamera: string;
  areaMonitorada: string;
  localInstalado: string;
  status: string;
};

type OrdemServico = {
  id: number;
  codigo: string;
  unidade: string;
  status: string;
  descricao?: string | null;
  tratativa?: string | null;
  houveDano: boolean;
  descricaoDano?: string | null;
  requerTrocaCamera: boolean;
  requerCompra: boolean;
  itensNecessarios?: string | null;
  observacoesTecnicas?: string | null;
  desconectadaEm?: string | null;
  atendimentoIniciadoEm?: string | null;
  concluidoEm?: string | null;
  createdAt: string;
  camera: CameraResumo;
  abertaPor?: UsuarioResumo | null;
  atendidoPor?: UsuarioResumo | null;
};

const formularioInicial = {
  tratativa: "",
  houveDano: false,
  descricaoDano: "",
  requerTrocaCamera: false,
  requerCompra: false,
  itensNecessarios: "",
  observacoesTecnicas: "",
  statusCamera: "Em atendimento",
  status: "EM_ATENDIMENTO",
};

function formatarData(valor?: string | null) {
  if (!valor) return "-";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(valor));
}

function labelStatus(status: string) {
  const mapa: Record<string, string> = {
    EM_ABERTO: "Em aberto",
    EM_ATENDIMENTO: "Em atendimento",
    CONCLUIDA: "Concluída",
  };
  return mapa[status] || status;
}

function classeStatus(status: string) {
  if (status === "CONCLUIDA")
    return "border-emerald-500/30 bg-emerald-500/10 text-emerald-200";
  if (status === "EM_ATENDIMENTO")
    return "border-sky-500/30 bg-sky-500/10 text-sky-200";
  return "border-amber-500/30 bg-amber-500/10 text-amber-200";
}

export default function OrdensServico() {
  const [ordens, setOrdens] = useState<OrdemServico[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [busca, setBusca] = useState("");
  const [unidadeFiltro, setUnidadeFiltro] = useState("");
  const [ordemSelecionada, setOrdemSelecionada] = useState<OrdemServico | null>(
    null,
  );
  const [pdfLightbox, setPdfLightbox] = useState<{
    url: string;
    titulo: string;
    nomeArquivo: string;
  } | null>(null);
  const [formulario, setFormulario] = useState(formularioInicial);
  const [salvando, setSalvando] = useState(false);
  const tecnicoPodeTratar = podeAtenderManutencao();

  async function carregarOrdens() {
    setCarregando(true);
    try {
      const resposta = await api.get("/ordens-servico");
      setOrdens(resposta.data || []);
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregarOrdens();
  }, []);

  const ordensFiltradas = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return ordens.filter((ordem) => {
      if (unidadeFiltro && ordem.unidade !== unidadeFiltro) return false;
      if (!termo) return true;
      const texto = [
        ordem.unidade,
        ordem.camera.numeroCamera,
        ordem.camera.nomeCamera,
        ordem.camera.tipoCamera,
        ordem.camera.areaMonitorada,
        ordem.camera.localInstalado,
        ordem.abertaPor?.nome,
        labelStatus(ordem.status),
      ]
        .join(" ")
        .toLowerCase();
      return texto.includes(termo);
    });
  }, [busca, ordens, unidadeFiltro]);

  const unidadesDisponiveis = useMemo(() => {
    return Array.from(
      new Set(ordens.map((ordem) => ordem.unidade).filter(Boolean)),
    ).sort();
  }, [ordens]);

  function abrirTratativa(ordem: OrdemServico) {
    setOrdemSelecionada(ordem);
    setFormulario({
      tratativa: ordem.tratativa || "",
      houveDano: ordem.houveDano || false,
      descricaoDano: ordem.descricaoDano || "",
      requerTrocaCamera: ordem.requerTrocaCamera || false,
      requerCompra: ordem.requerCompra || false,
      itensNecessarios: ordem.itensNecessarios || "",
      observacoesTecnicas: ordem.observacoesTecnicas || "",
      statusCamera:
        ordem.camera.status === "Conectada" ? "Conectada" : "Em atendimento",
      status: ordem.status === "CONCLUIDA" ? "CONCLUIDA" : "EM_ATENDIMENTO",
    });
  }

  function atualizarCampo(
    campo: keyof typeof formularioInicial,
    valor: string | boolean,
  ) {
    setFormulario((atual) => ({ ...atual, [campo]: valor }));
  }

  async function salvarTratativa(e: React.FormEvent) {
    e.preventDefault();
    if (!ordemSelecionada) return;
    setSalvando(true);
    try {
      await api.put(
        `/ordens-servico/${ordemSelecionada.id}/tratativa`,
        formulario,
      );
      await carregarOrdens();
      setOrdemSelecionada(null);
    } finally {
      setSalvando(false);
    }
  }

  async function abrirPdf(ordem: OrdemServico) {
    const resposta = await api.get(`/ordens-servico/${ordem.id}/pdf`, {
      responseType: "blob",
    });
    const url = URL.createObjectURL(
      new Blob([resposta.data], { type: "application/pdf" }),
    );
    setPdfLightbox({
      url,
      titulo: `Ordem de Serviço ${ordem.codigo}`,
      nomeArquivo: `ordem-servico-cftv-${ordem.codigo.replace("/", "-")}.pdf`,
    });
  }

  function fecharPdf() {
    if (pdfLightbox?.url) URL.revokeObjectURL(pdfLightbox.url);
    setPdfLightbox(null);
  }

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-3 border-b border-slate-800 pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.28em] text-sky-300">
            Manutenção
          </p>
          <h1 className="mt-2 text-3xl font-black text-white">
            Ordens de Serviço
          </h1>
          <p className="mt-2 text-slate-300">
            Chamados de manutenção abertos a partir de câmeras CFTV
            desconectadas.
          </p>
        </div>
        <button
          onClick={carregarOrdens}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-4 py-2 text-sm font-bold text-slate-200 hover:border-sky-500 hover:text-white"
        >
          <RefreshCcw size={16} />
          Atualizar
        </button>
      </section>

      <section className="rounded-xl border border-slate-800 bg-slate-950/70">
        <div className="flex flex-col gap-3 border-b border-slate-800 p-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-xl font-black text-white">Chamados CFTV</h2>
            <p className="text-sm text-slate-400">
              {ordensFiltradas.length} registro(s) encontrado(s)
            </p>
          </div>
          <select
            value={unidadeFiltro}
            onChange={(e) => setUnidadeFiltro(e.target.value)}
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm font-bold text-white outline-none lg:max-w-[220px]"
          >
            <option value="">Todas as unidades</option>
            {unidadesDisponiveis.map((unidade) => (
              <option key={unidade} value={unidade}>
                {unidade}
              </option>
            ))}
          </select>
          <label className="flex w-full items-center gap-2 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 lg:max-w-sm">
            <Search size={16} className="text-slate-400" />
            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-500"
              placeholder="Buscar por câmera, área ou operador"
            />
          </label>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1340px] text-left text-sm">
            <thead className="bg-slate-900/70 text-xs uppercase tracking-[0.16em] text-slate-400">
              <tr>
                <th className="px-4 py-3">OS</th>
                <th className="px-4 py-3">Unidade</th>
                <th className="px-4 py-3">Nomenclatura</th>
                <th className="px-4 py-3">Nome</th>
                <th className="px-4 py-3">Tipo</th>
                <th className="px-4 py-3">Área</th>
                <th className="px-4 py-3">Operador</th>
                <th className="px-4 py-3">Desconexão</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Atendimento</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {carregando && (
                <tr>
                  <td
                    className="px-4 py-8 text-center text-slate-400"
                    colSpan={11}
                  >
                    Carregando ordens de serviço...
                  </td>
                </tr>
              )}
              {!carregando && ordensFiltradas.length === 0 && (
                <tr>
                  <td
                    className="px-4 py-8 text-center text-slate-400"
                    colSpan={11}
                  >
                    Nenhuma ordem de serviço encontrada.
                  </td>
                </tr>
              )}
              {!carregando &&
                ordensFiltradas.map((ordem) => (
                  <tr
                    key={ordem.id}
                    className="text-slate-200 hover:bg-slate-900/50"
                  >
                    <td className="px-4 py-3 font-black text-sky-200">
                      {ordem.codigo}
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-full border border-sky-500/30 bg-sky-500/10 px-3 py-1 text-xs font-black text-sky-200">
                        {ordem.unidade || "-"}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-black text-white">
                      CÃ¢mera {ordem.camera.numeroCamera}
                    </td>
                    <td className="px-4 py-3">
                      {ordem.camera.nomeCamera || "-"}
                    </td>
                    <td className="px-4 py-3">{ordem.camera.tipoCamera}</td>
                    <td className="px-4 py-3">{ordem.camera.areaMonitorada}</td>
                    <td className="px-4 py-3">
                      {ordem.abertaPor?.nome || "-"}
                    </td>
                    <td className="px-4 py-3">
                      {formatarData(ordem.desconectadaEm)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full border px-3 py-1 text-xs font-bold ${classeStatus(ordem.status)}`}
                      >
                        {labelStatus(ordem.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-bold text-white">
                        {ordem.atendidoPor?.nome || "-"}
                      </p>
                      <p className="text-xs text-slate-400">
                        {formatarData(ordem.atendimentoIniciadoEm)}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => abrirPdf(ordem)}
                        className="mr-2 inline-flex items-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-xs font-black text-slate-200 hover:border-sky-500 hover:text-white"
                        title="Abrir PDF da ordem de serviço"
                      >
                        <FileText size={14} />
                        PDF
                      </button>
                      <button
                        onClick={() => abrirTratativa(ordem)}
                        disabled={!tecnicoPodeTratar}
                        className="inline-flex items-center gap-2 rounded-lg bg-sky-500 px-3 py-2 text-xs font-black text-white hover:bg-sky-400 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
                      >
                        <Wrench size={14} />
                        Tratar
                      </button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </section>

      {ordemSelecionada && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4">
          <form
            onSubmit={salvarTratativa}
            className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-xl border border-slate-700 bg-slate-950 p-5 shadow-2xl"
          >
            <div className="mb-5 flex items-start justify-between gap-4 border-b border-slate-800 pb-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-sky-300">
                  Tratativa técnica
                </p>
                <h2 className="mt-1 text-2xl font-black text-white">
                  OS #{ordemSelecionada.id} - CÃ¢mera{" "}
                  {ordemSelecionada.camera.numeroCamera}
                </h2>
                <p className="text-sm text-slate-400">
                  {ordemSelecionada.camera.areaMonitorada} |{" "}
                  {ordemSelecionada.camera.localInstalado}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOrdemSelecionada(null)}
                className="rounded-lg border border-slate-700 p-2 text-slate-300 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-2 md:col-span-2">
                <span className="text-sm font-bold text-slate-200">
                  Tratativa realizada
                </span>
                <textarea
                  required
                  value={formulario.tratativa}
                  onChange={(e) => atualizarCampo("tratativa", e.target.value)}
                  className="min-h-28 w-full rounded-lg border border-slate-700 bg-slate-900 p-3 text-white outline-none focus:border-sky-500"
                  placeholder="Descreva diagnóstico, testes, contato com fornecedor e ação aplicada"
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm font-bold text-slate-200">
                  Status da cÃ¢mera
                </span>
                <select
                  value={formulario.statusCamera}
                  onChange={(e) =>
                    atualizarCampo("statusCamera", e.target.value)
                  }
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 p-3 text-white outline-none focus:border-sky-500"
                >
                  <option>Em atendimento</option>
                  <option>Desconectada</option>
                  <option>Conectada</option>
                </select>
              </label>

              <label className="space-y-2">
                <span className="text-sm font-bold text-slate-200">
                  Status da OS
                </span>
                <select
                  value={formulario.status}
                  onChange={(e) => atualizarCampo("status", e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 p-3 text-white outline-none focus:border-sky-500"
                >
                  <option value="EM_ATENDIMENTO">Em atendimento</option>
                  <option value="CONCLUIDA">Concluir chamado</option>
                </select>
              </label>

              <label className="flex items-center gap-3 rounded-lg border border-slate-800 bg-slate-900/60 p-3 text-sm font-bold text-slate-200">
                <input
                  type="checkbox"
                  checked={formulario.houveDano}
                  onChange={(e) =>
                    atualizarCampo("houveDano", e.target.checked)
                  }
                />
                Houve dano no equipamento
              </label>

              <label className="flex items-center gap-3 rounded-lg border border-slate-800 bg-slate-900/60 p-3 text-sm font-bold text-slate-200">
                <input
                  type="checkbox"
                  checked={formulario.requerTrocaCamera}
                  onChange={(e) =>
                    atualizarCampo("requerTrocaCamera", e.target.checked)
                  }
                />
                Necessita troca da cÃ¢mera
              </label>

              <label className="flex items-center gap-3 rounded-lg border border-slate-800 bg-slate-900/60 p-3 text-sm font-bold text-slate-200">
                <input
                  type="checkbox"
                  checked={formulario.requerCompra}
                  onChange={(e) =>
                    atualizarCampo("requerCompra", e.target.checked)
                  }
                />
                Necessita compra
              </label>

              <label className="space-y-2">
                <span className="text-sm font-bold text-slate-200">
                  Itens necessários
                </span>
                <input
                  value={formulario.itensNecessarios}
                  onChange={(e) =>
                    atualizarCampo("itensNecessarios", e.target.value)
                  }
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 p-3 text-white outline-none focus:border-sky-500"
                  placeholder="CÃ¢mera, fonte, conector, cabo..."
                />
              </label>

              <label className="space-y-2 md:col-span-2">
                <span className="text-sm font-bold text-slate-200">
                  Descrição do dano
                </span>
                <textarea
                  value={formulario.descricaoDano}
                  onChange={(e) =>
                    atualizarCampo("descricaoDano", e.target.value)
                  }
                  className="min-h-20 w-full rounded-lg border border-slate-700 bg-slate-900 p-3 text-white outline-none focus:border-sky-500"
                  placeholder="Detalhe o dano encontrado, se houver"
                />
              </label>

              <label className="space-y-2 md:col-span-2">
                <span className="text-sm font-bold text-slate-200">
                  Observações técnicas
                </span>
                <textarea
                  value={formulario.observacoesTecnicas}
                  onChange={(e) =>
                    atualizarCampo("observacoesTecnicas", e.target.value)
                  }
                  className="min-h-20 w-full rounded-lg border border-slate-700 bg-slate-900 p-3 text-white outline-none focus:border-sky-500"
                  placeholder="Informe pendências, orientação ao operador ou próximos passos"
                />
              </label>
            </div>

            <div className="mt-5 flex justify-end gap-3 border-t border-slate-800 pt-4">
              <button
                type="button"
                onClick={() => setOrdemSelecionada(null)}
                className="rounded-lg border border-slate-700 px-4 py-2 font-bold text-slate-200 hover:text-white"
              >
                Cancelar
              </button>
              <button
                disabled={salvando}
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 font-black text-white hover:bg-emerald-400 disabled:opacity-60"
              >
                <CheckCircle2 size={18} />
                {salvando ? "Salvando..." : "Salvar tratativa"}
              </button>
            </div>
          </form>
        </div>
      )}

      {pdfLightbox && (
        <PdfLightbox
          url={pdfLightbox.url}
          titulo={pdfLightbox.titulo}
          nomeArquivo={pdfLightbox.nomeArquivo}
          onClose={fecharPdf}
        />
      )}
    </div>
  );
}
