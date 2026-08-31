import { useEffect, useMemo, useState } from "react";
import {
  Award,
  CheckCircle2,
  Clock3,
  Copy,
  Download,
  Edit,
  ExternalLink,
  FileText,
  Mail,
  Search,
  Trash2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { api } from "../services/api";
import { cpfVisivelPorPerfil } from "../utils/cpf";
import { PERFIS, perfilAtual } from "../utils/permissoes";

type Participante = {
  id: number;
  codigo?: string | null;
  nomeCompleto: string;
  cpf?: string | null;
  email: string;
  unidade?: string | null;
  status: string;
  porcentagem: number;
  nota?: number | null;
  tentativas: number;
  versao?: number;
  certificadoUrl?: string | null;
  updatedAt: string;
};

type Modelo = {
  id: number;
  codigo: string;
  slug: string;
  nome: string;
  tipo: string;
  status: string;
  versao?: number;
  publicUrl: string;
  participantes?: Participante[];
};

function data(valor?: string | null) {
  return valor ? new Date(valor).toLocaleString("pt-BR") : "-";
}

function concluido(status?: string | null) {
  return String(status || "")
    .toLowerCase()
    .startsWith("conclu");
}

function copiarLink(link: string) {
  const absoluto = `${window.location.origin}${link}`;
  navigator.clipboard?.writeText(absoluto).catch(() => undefined);
}

function indicadores(lista: Participante[]) {
  return {
    total: lista.length,
    andamento: lista.filter((item) => item.status === "Em andamento").length,
    concluidos: lista.filter((item) => concluido(item.status)).length,
    certificados: lista.filter((item) => !!item.certificadoUrl || !!item.codigo)
      .length,
  };
}

export default function TreinamentosCriados() {
  const navigate = useNavigate();
  const [modelos, setModelos] = useState<Modelo[]>([]);
  const [selecionadoId, setSelecionadoId] = useState<number | "">("");
  const [busca, setBusca] = useState("");
  const [status, setStatus] = useState("Todos");
  const [mensagem, setMensagem] = useState("");
  const [enviandoId, setEnviandoId] = useState<number | null>(null);
  const [excluindoId, setExcluindoId] = useState<number | null>(null);
  const [baixandoCertificados, setBaixandoCertificados] = useState(false);
  const podeEditar = perfilAtual() === PERFIS.SUPER_ADMIN;

  async function carregar() {
    const response = await api.get("/treinamentos-dinamicos");
    const dados = Array.isArray(response.data) ? response.data : [];
    setModelos(dados);
    setSelecionadoId((atual) => atual || dados[0]?.id || "");
  }

  useEffect(() => {
    carregar().catch(() => undefined);
  }, []);

  const modeloSelecionado = useMemo(
    () => modelos.find((item) => item.id === Number(selecionadoId)) || null,
    [modelos, selecionadoId],
  );

  const participantes = modeloSelecionado?.participantes || [];
  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return participantes.filter((item) => {
      const okStatus =
        status === "Todos" ||
        item.status === status ||
        (status === "Concluido" && concluido(item.status));
      const okBusca =
        !termo ||
        [
          item.nomeCompleto,
          item.cpf,
          item.email,
          item.unidade,
          item.codigo,
          item.status,
        ]
          .join(" ")
          .toLowerCase()
          .includes(termo);
      return okStatus && okBusca;
    });
  }, [participantes, busca, status]);

  const resumo = useMemo(() => indicadores(participantes), [participantes]);
  const cards = [
    { label: "Total", valor: resumo.total, Icone: Award },
    { label: "Em andamento", valor: resumo.andamento, Icone: Clock3 },
    { label: "Concluídos", valor: resumo.concluidos, Icone: CheckCircle2 },
    { label: "Certificados", valor: resumo.certificados, Icone: FileText },
  ];

  async function reenviarEmail(item: Participante) {
    setEnviandoId(item.id);
    setMensagem("");
    try {
      const response = await api.post(
        `/treinamentos-dinamicos/participantes/${item.id}/reenviar-email`,
      );
      setMensagem(response.data?.mensagem || "E-mail enviado com sucesso.");
      await carregar();
    } catch (error: any) {
      setMensagem(
        error.response?.data?.error || "Não foi possível reenviar o e-mail.",
      );
    } finally {
      setEnviandoId(null);
    }
  }

  async function excluirModelo(modelo: Modelo) {
    if (!podeEditar) return;
    if (
      !confirm(
        `Deseja excluir o treinamento ${modelo.codigo}? Essa ação remove o modelo e seus participantes.`,
      )
    )
      return;
    setMensagem("");
    try {
      await api.delete(`/treinamentos-dinamicos/${modelo.id}`);
      setMensagem("Treinamento excluído com sucesso.");
      setSelecionadoId("");
      await carregar();
    } catch (error: any) {
      setMensagem(
        error.response?.data?.error ||
          "Não foi possível excluir o treinamento.",
      );
    }
  }

  async function excluirParticipante(item: Participante) {
    if (!podeEditar) return;
    if (!confirm(`Deseja excluir o registro de ${item.nomeCompleto}?`)) return;
    setExcluindoId(item.id);
    setMensagem("");
    try {
      await api.delete(`/treinamentos-dinamicos/participantes/${item.id}`);
      setMensagem("Registro excluído com sucesso.");
      await carregar();
    } catch (error: any) {
      setMensagem(
        error.response?.data?.error || "Não foi possível excluir o registro.",
      );
    } finally {
      setExcluindoId(null);
    }
  }

  async function baixarCertificadosFiltrados() {
    if (!modeloSelecionado) return;
    const participantesComCertificado = filtrados.filter((item) =>
      concluido(item.status),
    );
    if (!participantesComCertificado.length) {
      setMensagem(
        "Nenhum certificado concluído encontrado nos filtros atuais.",
      );
      return;
    }

    setBaixandoCertificados(true);
    setMensagem("");
    try {
      const response = await api.get(
        `/treinamentos-dinamicos/${modeloSelecionado.id}/certificados.zip`,
        {
          params: {
            ids: participantesComCertificado.map((item) => item.id).join(","),
          },
          responseType: "blob",
        },
      );
      const blob = new Blob([response.data], { type: "application/zip" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `certificados-${modeloSelecionado.codigo || modeloSelecionado.slug}.zip`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      setMensagem(
        `${participantesComCertificado.length} certificado(s) preparado(s) para download.`,
      );
    } catch (error: any) {
      setMensagem(
        error.response?.data?.error ||
          "Não foi possível baixar os certificados filtrados.",
      );
    } finally {
      setBaixandoCertificados(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-5 dark:border-slate-800">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.28em] text-blue-600 dark:text-blue-300">
            Treinamentos
          </p>
          <h1 className="mt-2 text-3xl font-black text-slate-900 dark:text-white">
            Treinamentos criados
          </h1>
          <p className="mt-2 text-sm font-semibold text-slate-600 dark:text-slate-300">
            Acompanhe participantes, progresso, avaliação, certificados e envio
            por e-mail.
          </p>
        </div>
        {modeloSelecionado && (
          <div className="flex flex-wrap gap-2">
            {podeEditar && (
              <>
                <button
                  type="button"
                  onClick={() =>
                    navigate(
                      `/treinamentos-dinamicos?editar=${modeloSelecionado.id}`,
                    )
                  }
                  className="inline-flex items-center gap-2 rounded-xl border border-blue-200 px-4 py-3 text-sm font-black text-blue-700 hover:bg-blue-50 dark:border-blue-500/30 dark:text-blue-200 dark:hover:bg-blue-500/10"
                >
                  <Edit size={18} /> Editar treinamento
                </button>
                <button
                  type="button"
                  onClick={() => excluirModelo(modeloSelecionado)}
                  className="inline-flex items-center gap-2 rounded-xl border border-red-200 px-4 py-3 text-sm font-black text-red-700 hover:bg-red-50 dark:border-red-500/30 dark:text-red-200 dark:hover:bg-red-500/10"
                >
                  <Trash2 size={18} /> Excluir treinamento
                </button>
              </>
            )}
            <a
              href={modeloSelecionado.publicUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-black text-white hover:bg-blue-700"
            >
              <ExternalLink size={18} /> Abrir página pública
            </a>
            <button
              type="button"
              onClick={() => copiarLink(modeloSelecionado.publicUrl)}
              className="inline-flex items-center gap-2 rounded-xl border border-blue-200 px-4 py-3 text-sm font-black text-blue-700 dark:border-blue-500/30 dark:text-blue-200"
            >
              <Copy size={18} /> Copiar link
            </button>
          </div>
        )}
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <div className="grid gap-3 md:grid-cols-[minmax(260px,420px)_1fr_minmax(180px,220px)_auto]">
          <select
            value={selecionadoId}
            onChange={(event) => {
              setSelecionadoId(Number(event.target.value) || "");
              setBusca("");
            }}
            className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-black outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
          >
            <option value="">Selecione um treinamento</option>
            {modelos.map((modelo) => (
              <option key={modelo.id} value={modelo.id}>
                {modelo.codigo} - {modelo.nome || modelo.slug}
              </option>
            ))}
          </select>
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <input
              value={busca}
              onChange={(event) => setBusca(event.target.value)}
              placeholder="Buscar por nome, CPF, e-mail, unidade ou certificado"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm font-semibold outline-none focus:border-blue-400 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            />
          </div>
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
          >
            <option>Todos</option>
            <option>Em andamento</option>
            <option>Reprovado</option>
            <option value="Concluido">Concluído</option>
          </select>
          <button
            type="button"
            onClick={baixarCertificadosFiltrados}
            disabled={!modeloSelecionado || baixandoCertificados}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-black text-white shadow-lg transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Download size={18} />
            {baixandoCertificados ? "Baixando..." : "Baixar certificados"}
          </button>
        </div>
      </section>

      {modeloSelecionado && (
        <section className="grid gap-4 md:grid-cols-4">
          {cards.map(({ label, valor, Icone }) => (
            <div
              key={label}
              className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-300">
                  {label}
                </p>
                <Icone className="h-5 w-5 text-blue-500" />
              </div>
              <p className="mt-3 text-2xl font-black text-slate-900 dark:text-white">
                {valor}
              </p>
            </div>
          ))}
        </section>
      )}

      <section className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        {mensagem && (
          <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-black text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-100">
            {mensagem}
          </div>
        )}

        <div className="max-h-[620px] overflow-auto rounded-xl border border-slate-200 dark:border-slate-800">
          <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
            <thead className="sticky top-0 bg-slate-100 text-left text-xs uppercase tracking-[0.12em] text-slate-500 dark:bg-slate-950 dark:text-slate-300">
              <tr>
                <th className="px-4 py-3">Participante</th>
                <th className="px-4 py-3">Unidade</th>
                <th className="px-4 py-3">Progresso</th>
                <th className="px-4 py-3">Avaliação</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Ãšltimo acesso</th>
                <th className="px-4 py-3">Certificado</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filtrados.map((item) => (
                <tr
                  key={item.id}
                  className="hover:bg-slate-50 dark:hover:bg-slate-800/60"
                >
                  <td className="px-4 py-3">
                    <p className="font-black text-slate-900 dark:text-white">
                      {item.nomeCompleto}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {cpfVisivelPorPerfil(item.cpf) || "-"} - {item.email}
                    </p>
                  </td>
                  <td className="px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">
                    {item.unidade || "-"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="h-2 w-32 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                      <div
                        className="h-full bg-blue-500"
                        style={{ width: `${item.porcentagem}%` }}
                      />
                    </div>
                    <p className="mt-1 text-xs font-bold text-slate-500 dark:text-slate-400">
                      {item.porcentagem}%
                    </p>
                  </td>
                  <td className="px-4 py-3 text-xs font-bold text-slate-500 dark:text-slate-400">
                    <p>Nota: {item.nota ?? "-"}</p>
                    <p>{item.tentativas} tentativa(s)</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded-full border border-blue-400/40 bg-blue-500/10 px-3 py-1 text-xs font-black text-blue-700 dark:text-blue-200">
                      {item.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400">
                    {data(item.updatedAt)}
                  </td>
                  <td className="px-4 py-3 text-xs font-black text-slate-600 dark:text-slate-300">
                    {item.certificadoUrl ? (
                      <a
                        href={item.certificadoUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center rounded-lg bg-blue-600 px-3 py-2 text-xs font-black text-white hover:bg-blue-700"
                      >
                        PDF
                      </a>
                    ) : (
                      item.codigo || "Não emitido"
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex flex-wrap justify-end gap-2">
                      {item.certificadoUrl && (
                        <a
                          href={item.certificadoUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-2 rounded-lg border border-blue-400/30 bg-blue-500/10 px-3 py-2 text-xs font-black text-blue-700 transition hover:bg-blue-600 hover:text-white dark:text-blue-200"
                        >
                          <FileText size={14} /> PDF
                        </a>
                      )}
                      {concluido(item.status) && (
                        <button
                          type="button"
                          onClick={() => reenviarEmail(item)}
                          disabled={enviandoId === item.id}
                          className="inline-flex items-center gap-2 rounded-lg border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 text-xs font-black text-emerald-700 transition hover:bg-emerald-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-60 dark:text-emerald-200"
                        >
                          <Mail size={14} />{" "}
                          {enviandoId === item.id ? "Enviando..." : "Enviar"}
                        </button>
                      )}
                      {podeEditar && (
                        <button
                          type="button"
                          onClick={() => excluirParticipante(item)}
                          disabled={excluindoId === item.id}
                          className="inline-flex items-center gap-2 rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2 text-xs font-black text-red-700 transition hover:bg-red-600 hover:text-white disabled:cursor-not-allowed disabled:opacity-60 dark:text-red-200"
                        >
                          <Trash2 size={14} />{" "}
                          {excluindoId === item.id ? "Excluindo..." : "Excluir"}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {!filtrados.length && (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-10 text-center text-sm font-semibold text-slate-500"
                  >
                    Nenhum treinamento encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
