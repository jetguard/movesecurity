import { useEffect, useState } from "react";
import { api } from "../../services/api";
import LexicalEditor from "../../components/editor/LexicalEditor";
import { podeAnalisar } from "../../utils/permissoes";

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
  envolvidos: Envolvido[];
  anexos?: Anexo[];
  analise?: AnaliseOcorrencia | null;
  investigacao?: InvestigacaoVinculada | null;
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
  const [comentarios, setComentarios] = useState<ComentarioInterno[]>([]);
  const [novoComentario, setNovoComentario] = useState("");
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
  const [quantidadeEnvolvidos, setQuantidadeEnvolvidos] = useState(1);
  const [envolvidos, setEnvolvidos] = useState<Envolvido[]>([
    { ...envolvidoVazio },
  ]);

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

    await api.post("/anulacoes", {
      modulo: "Ocorrencia",
      registroId: ocorrenciaAnulacao.id,
      motivo: motivoAnulacao,
    });

    setOcorrenciaAnulacao(null);
    setMotivoAnulacao("");
    carregarOcorrencias();
    alert("Solicitação de anulação enviada aos analistas e administradores.");
  }

  async function abrirVisualizacao(ocorrencia: Ocorrencia) {
    setOcorrenciaVisualizando(ocorrencia);
    const response = await api.get(`/comentarios/Ocorrencia/${ocorrencia.id}`);
    setComentarios(response.data);
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
    const response = await api.get(`/ocorrencias/${id}/pdf`, {
      responseType: "blob",
    });

    const url = URL.createObjectURL(
      new Blob([response.data], { type: "application/pdf" })
    );

    window.open(url, "_blank");
  }

  const subNaturezasDisponiveis =
    naturezas.find((item) => item.nome === natureza)?.subNaturezas || [];
  const localSelecionado = locais.find((item) => item.nome === local);

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

  function editarOcorrencia(ocorrencia: Ocorrencia) {
    setOcorrenciaEditando(ocorrencia);
    setAssunto(ocorrencia.assunto);
    setLocal(ocorrencia.local);
    setNatureza(ocorrencia.natureza);
    setSubNatureza(ocorrencia.subNatureza);
    setDataOcorrencia(formatarDataParaInput(ocorrencia.dataOcorrencia));
    setRelatoSeguranca(ocorrencia.relatoSeguranca || "");
    setAcoesTomadas(ocorrencia.acoesTomadas || "");
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

  async function iniciarAnaliseOcorrencia(id: number) {
    const response = await api.post(`/analises/ocorrencias/${id}`);
    setAnaliseAtual(response.data);
    setStatusAnalise(response.data.status);
    setPrejuizoFinanceiro(response.data.prejuizoFinanceiro || "0,00");
    setConclusaoAnalise(response.data.conclusaoAnalise || "");
    setOcorrenciaEditando((atual) =>
      atual ? { ...atual, status: response.data.status, analise: response.data } : atual
    );
    carregarOcorrencias();
    alert("Análise iniciada com sucesso");
  }

  async function salvarAnaliseOcorrencia() {
    if (!analiseAtual) return;

    const response = await api.put(`/analises/ocorrencias/${analiseAtual.id}`, {
      status: statusAnalise,
      prejuizoFinanceiro,
      conclusaoAnalise,
    });

    setAnaliseAtual(response.data);
    setOcorrenciaEditando((atual) =>
      atual ? { ...atual, status: response.data.status, analise: response.data } : atual
    );
    carregarOcorrencias();
    alert("Análise salva com sucesso");
  }

  async function converterParaInvestigacao(ocorrencia: Ocorrencia) {
    const confirmar = window.confirm(
      `Deseja iniciar uma investigação para a Ocorrência Nº ${ocorrencia.codigo}?`
    );

    if (!confirmar) return;

    const response = await api.post(`/investigacoes/converter/ocorrencias/${ocorrencia.id}`);
    setOcorrenciaEditando((atual) =>
      atual ? { ...atual, investigacao: response.data } : atual
    );
    carregarOcorrencias();
    alert("Investigação criada com sucesso");
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

          {ocorrenciaEditando && (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => setPermitirEdicao(true)}
                  className="bg-slate-900 text-white px-4 py-2 rounded-lg"
                >
                  Editar Dados
                </button>

                {!analiseAtual && podeAnalisar() && (
                  <button
                    type="button"
                    onClick={() => iniciarAnaliseOcorrencia(ocorrenciaEditando.id)}
                    className="bg-amber-600 text-white px-4 py-2 rounded-lg"
                  >
                    Iniciar Análise
                  </button>
                )}

                {!ocorrenciaEditando.investigacao && podeAnalisar() && (
                  <button
                    type="button"
                    onClick={() => converterParaInvestigacao(ocorrenciaEditando)}
                    className="bg-purple-700 text-white px-4 py-2 rounded-lg"
                  >
                    CONVERTER PARA R.I
                  </button>
                )}
              </div>

              {analiseAtual && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
                  Este relatório possui uma análise{" "}
                  {analiseAtual.status === "Concluído" ? "concluída" : "em andamento"}.
                </div>
              )}

              {ocorrenciaEditando.investigacao && (
                <div className="rounded-lg border border-purple-200 bg-purple-50 px-4 py-3 text-sm font-medium text-purple-800">
                  Este relatório foi convertido para R.I Nº{" "}
                  {formatarNumeroInvestigacao(ocorrenciaEditando.investigacao)}.
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

                <input
                  className="w-full border rounded-lg p-3"
                  type="datetime-local"
                  value={dataOcorrencia}
                  onChange={(e) => setDataOcorrencia(e.target.value)}
                  required
                />

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

          {analiseAtual && podeAnalisar() && (
            <div className="border rounded-xl p-4 space-y-4 bg-amber-50">
              <h3 className="font-bold text-lg">Análise da Ocorrência</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <select
                  className="w-full border rounded-lg p-3"
                  value={statusAnalise}
                  onChange={(e) => setStatusAnalise(e.target.value)}
                >
                  <option value="Em Análise">Em Análise</option>
                  <option value="Concluído">Concluído</option>
                </select>

                <input
                  className="w-full border rounded-lg p-3"
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
                placeholder="Descreva a análise da ocorrência..."
              />

              <button
                type="button"
                onClick={salvarAnaliseOcorrencia}
                className="bg-amber-600 text-white px-4 py-2 rounded-lg"
              >
                Salvar Análise
              </button>
            </div>
          )}

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
        <div className="space-y-4">
          {ocorrencias.map((ocorrencia) => (
            <div key={ocorrencia.id} className="bg-white rounded-xl shadow p-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold">{ocorrencia.codigo}</h2>
                  <p className="text-gray-600 mt-1">{ocorrencia.assunto}</p>
                  <p className="text-sm text-gray-500 mt-1">
                    Local: {ocorrencia.local}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    Natureza: {ocorrencia.natureza} / {ocorrencia.subNatureza}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    Envolvidos: {ocorrencia.envolvidos.length}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full text-sm">
                    {ocorrencia.status}
                  </span>

                  <button
                    type="button"
                    onClick={() => abrirVisualizacao(ocorrencia)}
                    className="bg-slate-700 hover:bg-slate-800 text-white px-3 py-1 rounded-lg text-sm"
                  >
                    Visualizar
                  </button>

                  <button
                    type="button"
                    onClick={() => setOcorrenciaMencao(ocorrencia)}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1 rounded-lg text-sm"
                  >
                    Mencionar
                  </button>

                  <button
                    type="button"
                    onClick={() => editarOcorrencia(ocorrencia)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-lg text-sm"
                  >
                    Editar
                  </button>

                  <button
                    type="button"
                    onClick={() => abrirPdfOcorrencia(ocorrencia.id)}
                    className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded-lg text-sm"
                  >
                    Ver PDF
                  </button>

                  {ocorrencia.status !== "Anulado" && (
                    <button
                      type="button"
                      onClick={() => setOcorrenciaAnulacao(ocorrencia)}
                      className="bg-orange-600 hover:bg-orange-700 text-white px-3 py-1 rounded-lg text-sm"
                    >
                      Solicitar Anulação
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
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
              <div className="flex gap-3">
                <button onClick={solicitarAnulacao} className="rounded bg-orange-600 px-4 py-2 text-white">
                  Enviar solicitação
                </button>
                <button onClick={() => setOcorrenciaAnulacao(null)} className="rounded bg-slate-200 px-4 py-2">
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

