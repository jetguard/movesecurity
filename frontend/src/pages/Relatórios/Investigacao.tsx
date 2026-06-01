import { useEffect, useState } from "react";
import LexicalEditor from "../../components/editor/LexicalEditor";
import { api } from "../../services/api";

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
              onClick={() => setPermitirEdicao(true)}
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
        <div className="space-y-4">
          {investigacoes.map((item) => (
            <div key={item.id} className="bg-white rounded-xl shadow p-5">
              <div className="listing-card-header flex flex-wrap items-center justify-between gap-4 md:flex-row">
                <div className="min-w-0">
                  <h2 className="text-xl font-bold">
                    R.I. {numeroInvestigacao(item)}
                  </h2>
                  <p className="text-gray-700 mt-1">
                    Ocorrência vinculada {item.numeroOcorrencia} - {item.titulo}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    Solicitada em: {new Date(item.createdAt).toLocaleString()}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    Responsável: {item.responsavel?.nome || "Não informado"}
                  </p>
                </div>

                <div className="listing-actions flex items-center gap-2 md:w-auto md:flex-nowrap">
                  <span className="bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full text-sm">
                    {item.status}
                  </span>

                  <button
                    type="button"
                    onClick={() => abrirEdicao(item)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-lg text-sm"
                  >
                    Editar
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

