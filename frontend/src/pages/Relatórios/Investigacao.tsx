import { useEffect, useState } from "react";
import LexicalEditor from "../../components/editor/LexicalEditor";
import { api } from "../../services/api";
import { Edit3, FileSearch, Link2, MapPin, Tags, UserRound } from "lucide-react";

type UsuarioResumo = {
  id: number;
  nome: string;
};

type Anexo = {
  id: number;
  nomeOriginal: string;
  caminho: string;
  tipo: string;
};

type OcorrenciaVinculada = {
  id: number;
  codigo: string;
  assunto: string;
  anexos?: Anexo[];
};

type InvestigacaoItem = {
  id: number;
  codigo?: string | null;
  titulo: string;
  descricao: string;
  status: string;
  numeroOcorrencia: string;
  assunto: string;
  local: string;
  natureza: string;
  subNatureza: string;
  dataOcorrencia: string;
  relatoSeguranca?: string;
  descricaoInvestigacao?: string;
  conclusaoFatos?: string;
  createdAt: string;
  responsavel?: UsuarioResumo | null;
  ocorrencia: OcorrenciaVinculada;
};

type LocalCadastro = {
  id: number;
  nome: string;
  areaSensivel: boolean;
};

export default function Investigacao() {
  const [investigacoes, setInvestigacoes] = useState<InvestigacaoItem[]>([]);
  const [investigacaoEditando, setInvestigacaoEditando] =
    useState<InvestigacaoItem | null>(null);
  const [permitirEdicao, setPermitirEdicao] = useState(false);
  const [status, setStatus] = useState("Em Análise");
  const [local, setLocal] = useState("");
  const [locais, setLocais] = useState<LocalCadastro[]>([]);
  const [descricaoInvestigacao, setDescricaoInvestigacao] = useState("");
  const [conclusaoFatos, setConclusaoFatos] = useState("");

  async function carregarInvestigacoes() {
    const response = await api.get("/investigacoes");
    setInvestigacoes(response.data);
  }

  async function carregarLocais() {
    const response = await api.get("/locais?status=ativo");
    setLocais(response.data);
  }

  function abrirEdicao(item: InvestigacaoItem) {
    if (item.status === "Anulada") {
      alert("Esta R.I está anulada e não pode ser editada. Reabra a investigação a partir da ocorrência vinculada.");
      return;
    }

    setInvestigacaoEditando(item);
    setPermitirEdicao(false);
    setStatus(item.status);
    setLocal(item.local);
    setDescricaoInvestigacao(item.descricaoInvestigacao || "");
    setConclusaoFatos(item.conclusaoFatos || "");
  }

  function cancelarFormulario() {
    const confirmar = window.confirm(
      "As alterações não salvas poderão ser perdidas. Deseja continuar?"
    );

    if (!confirmar) return;

    setInvestigacaoEditando(null);
    setPermitirEdicao(false);
  }

  async function salvarInvestigacao(e: React.FormEvent) {
    e.preventDefault();
    if (!investigacaoEditando) return;

    await api.put(`/investigacoes/${investigacaoEditando.id}`, {
      status,
      local,
      descricaoInvestigacao,
      conclusaoFatos,
    });

    setInvestigacaoEditando(null);
    setPermitirEdicao(false);
    carregarInvestigacoes();
  }

  useEffect(() => {
    carregarInvestigacoes();
    carregarLocais();
  }, []);

  const localSelecionado = locais.find((item) => item.nome === local);
  const numeroInvestigacao = (item: InvestigacaoItem) => {
    if (item.codigo) return item.codigo;
    return `${String(item.id).padStart(4, "0")}/${new Date(item.createdAt).getFullYear()}`;
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Relatórios de Investigação</h1>
        <p className="text-gray-500 mt-1">
          Investigações criadas a partir dos relatórios de ocorrência.
        </p>
      </div>

      {investigacaoEditando && (
        <form
          onSubmit={salvarInvestigacao}
          className="bg-white rounded-xl shadow p-6 mb-6 space-y-5"
        >
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold">
                R.I. {numeroInvestigacao(investigacaoEditando)} - ocorrência {investigacaoEditando.numeroOcorrencia}
              </h2>
              <p className="text-gray-500">{investigacaoEditando.assunto}</p>
            </div>

            <button
              type="button"
              onClick={() => {
                if (investigacaoEditando.status === "Anulada") {
                  alert("Esta R.I está anulada e não pode ser editada. Reabra a investigação a partir da ocorrência vinculada.");
                  return;
                }
                setPermitirEdicao(true);
              }}
              className="bg-slate-900 text-white px-4 py-2 rounded-lg"
            >
              Editar Dados
            </button>
          </div>

          <fieldset disabled={!permitirEdicao} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                className="w-full border rounded-lg p-3"
                value={`R.I. ${numeroInvestigacao(investigacaoEditando)}`}
                readOnly
              />

              <select
                className="w-full border rounded-lg p-3"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="Em Análise">Em Análise</option>
                <option value="Concluído">Concluído</option>
              </select>

              {permitirEdicao ? (
                <select
                  className="w-full border rounded-lg p-3"
                  value={local}
                  onChange={(e) => setLocal(e.target.value)}
                >
                  <option value="">Selecione o local investigado</option>
                  {locais.map((item) => (
                    <option key={item.id} value={item.nome}>
                      {item.nome}{item.areaSensivel ? " - ÁREA SENSÍVEL" : ""}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  className="w-full border rounded-lg p-3"
                  value={local}
                  readOnly
                />
              )}

              <input
                className="w-full border rounded-lg p-3"
                value={`${investigacaoEditando.natureza} / ${investigacaoEditando.subNatureza}`}
                readOnly
              />
            </div>

            {localSelecionado?.areaSensivel && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">
                Local classificado como área sensível. A investigação deve receber atenção operacional especial.
              </div>
            )}

            <div className="space-y-2">
              <h3 className="font-bold">Descrição da Investigação</h3>
              {permitirEdicao ? (
                <LexicalEditor
                  value={descricaoInvestigacao}
                  onChange={setDescricaoInvestigacao}
                />
              ) : (
                <p className="border rounded-lg p-3 min-h-[96px] whitespace-pre-wrap text-gray-700">
                  {descricaoInvestigacao || "Nenhuma descrição informada."}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <h3 className="font-bold">Conclusão dos Fatos</h3>
              {permitirEdicao ? (
                <LexicalEditor value={conclusaoFatos} onChange={setConclusaoFatos} />
              ) : (
                <p className="border rounded-lg p-3 min-h-[96px] whitespace-pre-wrap text-gray-700">
                  {conclusaoFatos || "Nenhuma conclusão informada."}
                </p>
              )}
            </div>
          </fieldset>

          {investigacaoEditando.ocorrencia.anexos &&
            investigacaoEditando.ocorrencia.anexos.length > 0 && (
              <div className="bg-gray-50 border rounded-lg p-4">
                <p className="font-semibold mb-4">Anexos da ocorrência original</p>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {investigacaoEditando.ocorrencia.anexos.map((arquivo) => (
                    <a
                      key={arquivo.id}
                      href={`/${arquivo.caminho.replaceAll("\\", "/")}`}
                      target="_blank"
                      rel="noreferrer"
                      className="border rounded-xl bg-white p-3 text-sm text-slate-700 hover:border-blue-500"
                    >
                      <span className="block font-semibold break-all">
                        {arquivo.nomeOriginal}
                      </span>
                      <span className="text-xs text-gray-500">Visualizar arquivo</span>
                    </a>
                  ))}
                </div>
              </div>
            )}

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={!permitirEdicao}
              className="bg-green-600 disabled:bg-gray-300 text-white px-4 py-2 rounded-lg"
            >
              Salvar Investigação
            </button>

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

      {investigacoes.length === 0 ? (
        <div className="bg-white rounded-xl p-8 shadow text-center text-gray-500">
          Nenhuma investigação cadastrada.
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <div className="overflow-x-auto">
            <table className="min-w-[1060px] w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-[0.12em] text-slate-500 dark:bg-slate-900 dark:text-slate-400">
                <tr>
                  <th className="px-4 py-3">Investigação</th>
                  <th className="px-4 py-3">Título</th>
                  <th className="px-4 py-3">Ocorrência</th>
                  <th className="px-4 py-3">Local</th>
                  <th className="px-4 py-3">Natureza</th>
                  <th className="px-4 py-3">Responsável</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {investigacoes.map((item) => (
                  <tr key={item.id} className="transition hover:bg-violet-50/60 dark:hover:bg-violet-500/5">
                    <td className="px-4 py-4">
                      <div className="inline-flex items-center gap-2 font-black text-slate-900 dark:text-white">
                        <FileSearch size={17} className="text-violet-600 dark:text-violet-300" />
                        R.I. {numeroInvestigacao(item)}
                      </div>
                      <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        {new Date(item.createdAt).toLocaleString("pt-BR")}
                      </div>
                    </td>
                    <td className="max-w-[240px] px-4 py-4">
                      <p className="line-clamp-2 font-semibold text-slate-800 dark:text-slate-100">{item.titulo}</p>
                    </td>
                    <td className="px-4 py-4">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 dark:bg-slate-900 dark:text-slate-300">
                        <Link2 size={13} /> {item.numeroOcorrencia}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 dark:bg-slate-900 dark:text-slate-300">
                        <MapPin size={13} /> {item.local}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 dark:bg-slate-900 dark:text-slate-300">
                        <Tags size={13} /> {item.natureza} / {item.subNatureza}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-500/10 px-3 py-1 text-xs font-bold text-violet-600 dark:text-violet-300">
                        <UserRound size={13} /> {item.responsavel?.nome || "Não informado"}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
                        {item.status}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => abrirEdicao(item)}
                          disabled={item.status === "Anulada"}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-blue-400/30 bg-blue-500/10 text-blue-600 transition hover:-translate-y-0.5 hover:bg-blue-500/20 disabled:cursor-not-allowed disabled:opacity-40 dark:text-blue-200"
                          title={item.status === "Anulada" ? "Investigação anulada" : "Editar investigação"}
                        >
                          <Edit3 size={17} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}



