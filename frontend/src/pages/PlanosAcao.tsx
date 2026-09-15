import { useEffect, useMemo, useState } from "react";
import { ClipboardList, Edit3, Link2, Plus, Trash2, X } from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../services/api";
import { podeNoModulo, temModulo } from "../utils/permissoes";

type Plano = {
  id: number;
  codigo: string;
  titulo: string;
  origemModulo?: string;
  origemId?: number;
  fatorRiscoId?: number;
  fatorRiscoCodigo?: string;
  fatorRiscoNome?: string;
  responsavelId?: number;
  prioridade: string;
  status: string;
  percentual: number;
  descricao: string;
  acaoCorretiva?: string;
  acaoPreventiva?: string;
  responsavelNome?: string;
  responsaveis?: Responsavel[];
  mediadores?: Responsavel[];
  prazo: string;
  evidencia?: string;
  comentarios?: string;
};

type Origem = {
  id: number;
  codigo: string;
  titulo: string;
  status?: string;
  complemento?: string;
  fatoresRisco?: {
    id?: number | null;
    codigo?: string | null;
    nome: string;
  }[];
};

type OrigensPorModulo = Record<string, Origem[]>;

type Responsavel = {
  id: number;
  nome: string;
  email: string;
  setor?: string | null;
  cargo?: string | null;
  perfilAcesso?: string | null;
};

const modulosOrigem = [
  { valor: "Independente", label: "Plano independente (sem vínculo)" },
  { valor: "Ocorrencia", label: "Relatório de Ocorrência" },
  { valor: "Evento", label: "Relatório de Evento" },
  { valor: "Investigacao", label: "Relatório de Investigação" },
  { valor: "AnaliseRisco", label: "Análise de Risco" },
  { valor: "AnaliseEstrategica", label: "Análise Estratégica" },
];

function rotuloModulo(valor?: string) {
  return (
    modulosOrigem.find((item) => item.valor === valor)?.label ||
    valor ||
    "Sem vínculo"
  );
}

function normalizarStatusManual(status?: string) {
  if (status === "Concluído") return "Concluido";
  if (status === "Em Andamento") return "Em andamento";
  if (["Pendente", "Em andamento", "Concluido"].includes(status || "")) {
    return status || "";
  }
  return "Pendente";
}

function planoEstaAtrasado(plano: Pick<Plano, "status" | "prazo">) {
  if (normalizarStatusManual(plano.status) === "Concluido") return false;
  const prazo = new Date(plano.prazo);
  return !Number.isNaN(prazo.getTime()) && prazo < new Date();
}

function statusExibicaoPlano(plano: Pick<Plano, "status" | "prazo">) {
  if (planoEstaAtrasado(plano)) return "Em atraso";
  const status = normalizarStatusManual(plano.status);
  return status === "Concluido" ? "Concluído" : status;
}

function classeStatusPlano(plano: Pick<Plano, "status" | "prazo">) {
  if (planoEstaAtrasado(plano)) {
    return "border-red-300/60 bg-red-100 text-red-700 dark:border-red-400/30 dark:bg-red-500/15 dark:text-red-100";
  }
  const status = normalizarStatusManual(plano.status);
  if (status === "Concluido") {
    return "border-emerald-300/60 bg-emerald-100 text-emerald-700 dark:border-emerald-400/30 dark:bg-emerald-500/15 dark:text-emerald-100";
  }
  if (status === "Em andamento") {
    return "border-blue-300/60 bg-blue-100 text-blue-700 dark:border-blue-400/30 dark:bg-blue-500/15 dark:text-blue-100";
  }
  return "border-amber-300/60 bg-amber-100 text-amber-800 dark:border-amber-400/30 dark:bg-amber-500/15 dark:text-amber-100";
}

const vazio = {
  titulo: "",
  origemModulo: "",
  origemId: "",
  fatorRiscoId: "",
  prioridade: "",
  status: "",
  percentual: "0",
  descricao: "",
  acaoCorretiva: "",
  acaoPreventiva: "",
  responsavelId: "",
  responsavelNome: "",
  responsaveisIds: [] as string[],
  mediadoresIds: [] as string[],
  prazo: "",
  evidencia: "",
  comentarios: "",
};

export default function PlanosAcao() {
  const navigate = useNavigate();
  const [planos, setPlanos] = useState<Plano[]>([]);
  const [origens, setOrigens] = useState<OrigensPorModulo>({});
  const [responsaveis, setResponsaveis] = useState<Responsavel[]>([]);
  const [form, setForm] = useState({ ...vazio });
  const [editando, setEditando] = useState<Plano | null>(null);
  const [abrir, setAbrir] = useState(false);
  const [searchParams] = useSearchParams();
  const [parametrosAplicados, setParametrosAplicados] = useState(false);
  const podeCriarPlano = podeNoModulo("plano_acao", "criar");
  const podeEditarPlano = podeNoModulo("plano_acao", "editar");
  const podeExcluirPlano = podeNoModulo("plano_acao", "excluir");

  async function carregar() {
    const [planosResponse, origensResponse, responsaveisResponse] =
      await Promise.all([
        api.get("/planos-acao"),
        api.get("/planos-acao/origens"),
        api.get("/planos-acao/responsaveis"),
      ]);
    setPlanos(planosResponse.data);
    setOrigens(origensResponse.data);
    setResponsaveis(responsaveisResponse.data);
  }

  useEffect(() => {
    carregar();
  }, []);

  useEffect(() => {
    const arcId = searchParams.get("arcId");
    if (!arcId || parametrosAplicados || !origens.AnaliseRisco) return;

    const origem = origens.AnaliseRisco.find(
      (item) => String(item.id) === arcId,
    );
    setForm({
      ...vazio,
      origemModulo: "AnaliseRisco",
      origemId: arcId,
      titulo: origem ? `Plano de ação - ${origem.codigo}` : "",
      status: "Pendente",
      percentual: "0",
    });
    setEditando(null);
    setAbrir(true);
    setParametrosAplicados(true);
  }, [origens.AnaliseRisco, parametrosAplicados, searchParams]);

  const resumo = useMemo(
    () => ({
      total: planos.length,
      atrasados: planos.filter((plano) => planoEstaAtrasado(plano)).length,
      concluidos: planos.filter(
        (plano) => normalizarStatusManual(plano.status) === "Concluido",
      ).length,
      criticos: planos.filter((plano) => plano.prioridade === "Critica").length,
    }),
    [planos],
  );

  function campo(nome: string, valor: string) {
    setForm((atual) => ({
      ...atual,
      [nome]: valor,
      ...(nome === "origemModulo" ? { origemId: "", fatorRiscoId: "" } : {}),
      ...(nome === "origemId" ? { fatorRiscoId: "" } : {}),
      ...(nome === "responsavelId"
        ? {
            mediadoresIds: atual.mediadoresIds.filter(
              (mediadorId) => mediadorId !== valor,
            ),
          }
        : {}),
    }));
  }

  function novo() {
    setForm({ ...vazio });
    setEditando(null);
    setAbrir(true);
  }

  function editar(plano: Plano) {
    setEditando(plano);
    setForm({
      ...vazio,
      ...plano,
      origemModulo: plano.origemModulo || "Independente",
      origemId: plano.origemId ? String(plano.origemId) : "",
      fatorRiscoId: plano.fatorRiscoId ? String(plano.fatorRiscoId) : "",
      responsavelId: plano.responsavelId ? String(plano.responsavelId) : "",
      responsaveisIds: (plano.responsaveis?.length
        ? plano.responsaveis
        : plano.responsavelId
          ? [{ id: plano.responsavelId } as Responsavel]
          : []
      ).map((responsavel) => String(responsavel.id)),
      mediadoresIds: (plano.mediadores || []).map((mediador) =>
        String(mediador.id),
      ),
      status: normalizarStatusManual(plano.status),
      percentual: String(plano.percentual || 0),
      prazo: plano.prazo.slice(0, 16),
    });
    setAbrir(true);
  }

  async function salvar(evento: React.FormEvent) {
    evento.preventDefault();
    const dados = {
      ...form,
      descricao: form.comentarios || form.titulo,
      acaoCorretiva: "",
      acaoPreventiva: "",
      evidencia: "",
      origemModulo:
        form.origemModulo === "Independente" ? null : form.origemModulo,
      origemId: form.origemModulo === "Independente" ? null : form.origemId,
      fatorRiscoId:
        form.origemModulo === "AnaliseRisco" ? form.fatorRiscoId : null,
      responsavelId: form.responsaveisIds[0] || form.responsavelId || "",
      responsavelNome: form.responsaveisIds.length ? "" : form.responsavelNome,
      responsaveisIds: form.responsaveisIds,
      mediadoresIds: form.mediadoresIds,
    };

    if (editando) await api.put(`/planos-acao/${editando.id}`, dados);
    else await api.post("/planos-acao", dados);

    setAbrir(false);
    await carregar();
  }

  async function excluir(plano: Plano) {
    const confirmar = window.confirm(
      `Deseja excluir o plano ${plano.codigo}? O fator de risco ficará disponível novamente para novo plano.`,
    );
    if (!confirmar) return;
    await api.delete(`/planos-acao/${plano.id}`);
    await carregar();
  }

  const registrosOrigem =
    form.origemModulo && form.origemModulo !== "Independente"
      ? origens[form.origemModulo] || []
      : [];
  const origemSelecionada = registrosOrigem.find(
    (item) => String(item.id) === form.origemId,
  );
  const fatoresDaArc =
    form.origemModulo === "AnaliseRisco"
      ? origemSelecionada?.fatoresRisco || []
      : [];
  const fatoresUsadosNaArc = new Set(
    planos
      .filter(
        (plano) =>
          plano.origemModulo === "AnaliseRisco" &&
          String(plano.origemId || "") === form.origemId &&
          plano.id !== editando?.id &&
          plano.fatorRiscoId,
      )
      .map((plano) => String(plano.fatorRiscoId)),
  );
  const fatoresDisponiveisDaArc = fatoresDaArc.filter(
    (fator) => !fatoresUsadosNaArc.has(String(fator.id || "")),
  );
  const responsaveisSelecionados = responsaveis.filter((responsavel) =>
    form.responsaveisIds.includes(String(responsavel.id)),
  );
  const responsaveisDisponiveis = responsaveis.filter(
    (responsavel) =>
      !form.responsaveisIds.includes(String(responsavel.id)) &&
      !form.mediadoresIds.includes(String(responsavel.id)),
  );
  const mediadoresSelecionados = responsaveis.filter((responsavel) =>
    form.mediadoresIds.includes(String(responsavel.id)),
  );
  const mediadoresDisponiveis = responsaveis.filter(
    (responsavel) =>
      !form.responsaveisIds.includes(String(responsavel.id)) &&
      !form.mediadoresIds.includes(String(responsavel.id)),
  );

  function adicionarResponsavel(valor: string) {
    if (!valor) return;
    setForm((atual) => ({
      ...atual,
      responsavelId: atual.responsavelId || valor,
      responsaveisIds: atual.responsaveisIds.includes(valor)
        ? atual.responsaveisIds
        : [...atual.responsaveisIds, valor],
      mediadoresIds: atual.mediadoresIds.filter((item) => item !== valor),
    }));
  }

  function removerResponsavel(valor: string) {
    setForm((atual) => {
      const responsaveisIds = atual.responsaveisIds.filter(
        (item) => item !== valor,
      );
      return {
        ...atual,
        responsaveisIds,
        responsavelId:
          atual.responsavelId === valor
            ? responsaveisIds[0] || ""
            : atual.responsavelId,
      };
    });
  }

  function adicionarMediador(valor: string) {
    if (!valor) return;
    setForm((atual) => ({
      ...atual,
      mediadoresIds: atual.mediadoresIds.includes(valor)
        ? atual.mediadoresIds
        : [...atual.mediadoresIds, valor],
    }));
  }

  function removerMediador(valor: string) {
    setForm((atual) => ({
      ...atual,
      mediadoresIds: atual.mediadoresIds.filter((item) => item !== valor),
    }));
  }

  function origemDoPlano(plano: Plano) {
    if (!plano.origemModulo || !plano.origemId) return null;
    return (
      (origens[plano.origemModulo] || []).find(
        (origem) => String(origem.id) === String(plano.origemId),
      ) || null
    );
  }

  const classeCampo =
    "w-full rounded-lg border border-slate-300 bg-white p-3 text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white";
  const classeCard =
    "rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white sm:text-3xl">
            Planos de Ação
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Controle de ações corretivas e preventivas, com vínculo opcional ao
            registro que originou o plano.
          </p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          {temModulo("analise_riscos") && (
            <Link
              to="/riscos/analise-completa"
              className="flex items-center justify-center gap-2 rounded-lg border border-blue-300/50 bg-blue-50 px-4 py-2 font-bold text-blue-700 transition hover:bg-blue-100 dark:border-blue-400/30 dark:bg-blue-500/10 dark:text-blue-100 dark:hover:bg-blue-500/20"
            >
              Ver análises
            </Link>
          )}
          {podeCriarPlano && (
            <button
              onClick={novo}
              className="flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white transition hover:bg-blue-500"
            >
              <Plus size={18} /> Novo Plano
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className={`${classeCard} p-5`}>
          <p className="text-sm text-slate-500">Total</p>
          <p className="text-3xl font-bold dark:text-white">{resumo.total}</p>
        </div>
        <div className={`${classeCard} p-5`}>
          <p className="text-sm text-slate-500">Atrasados</p>
          <p className="text-3xl font-bold text-red-500">{resumo.atrasados}</p>
        </div>
        <div className={`${classeCard} p-5`}>
          <p className="text-sm text-slate-500">Concluídos</p>
          <p className="text-3xl font-bold text-emerald-500">
            {resumo.concluidos}
          </p>
        </div>
        <div className={`${classeCard} p-5`}>
          <p className="text-sm text-slate-500">Críticos</p>
          <p className="text-3xl font-bold text-amber-500">{resumo.criticos}</p>
        </div>
      </div>

      {abrir && (
        <form
          onSubmit={salvar}
          className={`${classeCard} space-y-5 p-4 sm:p-6`}
        >
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              {editando ? `Editar ${editando.codigo}` : "Novo plano de ação"}
            </h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Selecione a origem para vincular o plano a um documento existente.
              Use “Plano independente” quando a ação não nasceu de outro módulo.
              Para análise de risco, cada plano trata um único fator de risco.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <label className="space-y-1 text-sm font-medium text-slate-700 dark:text-slate-300">
              Título do plano
              <input
                className={classeCampo}
                placeholder="Ex.: Corrigir vulnerabilidade no Gate 1"
                value={form.titulo}
                onChange={(evento) => campo("titulo", evento.target.value)}
                required
              />
            </label>
            <label className="space-y-1 text-sm font-medium text-slate-700 dark:text-slate-300">
              Prazo para conclusão
              <input
                type="datetime-local"
                className={classeCampo}
                value={form.prazo}
                onChange={(evento) => campo("prazo", evento.target.value)}
                required
              />
            </label>
            <label className="space-y-1 text-sm font-medium text-slate-700 dark:text-slate-300">
              Prioridade
              <select
                className={classeCampo}
                value={form.prioridade}
                onChange={(evento) => campo("prioridade", evento.target.value)}
                required
              >
                <option value="" disabled>
                  Selecione a prioridade
                </option>
                <option value="Baixa">Baixa</option>
                <option value="Media">Média</option>
                <option value="Alta">Alta</option>
                <option value="Critica">Crítica</option>
              </select>
            </label>
            <label className="space-y-1 text-sm font-medium text-slate-700 dark:text-slate-300">
              Status do plano
              <select
                className={classeCampo}
                value={form.status}
                onChange={(evento) => campo("status", evento.target.value)}
                required
              >
                <option value="" disabled>
                  Selecione o status atual
                </option>
                <option value="Pendente">Pendente</option>
                <option value="Em andamento">Em andamento</option>
                <option value="Concluido">Concluído</option>
              </select>
              <span className="block text-xs font-normal text-slate-500 dark:text-slate-400">
                O status “Em atraso” aparece automaticamente quando o prazo
                vence antes da conclusão.
              </span>
            </label>
            <label className="space-y-1 text-sm font-medium text-slate-700 dark:text-slate-300">
              Responsáveis pela execução
              <select
                className={classeCampo}
                value=""
                onChange={(evento) => adicionarResponsavel(evento.target.value)}
              >
                <option value="">Selecionar responsável</option>
                {responsaveisDisponiveis.map((responsavel) => (
                  <option key={responsavel.id} value={responsavel.id}>
                    {responsavel.nome}
                    {responsavel.setor ? ` | ${responsavel.setor}` : ""}
                    {responsavel.cargo ? ` | ${responsavel.cargo}` : ""}
                  </option>
                ))}
              </select>
              {responsaveisSelecionados.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {responsaveisSelecionados.map((responsavel) => (
                    <span
                      key={responsavel.id}
                      className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-800 dark:border-emerald-400/30 dark:bg-emerald-500/10 dark:text-emerald-100"
                    >
                      {responsavel.nome}
                      <button
                        type="button"
                        onClick={() => removerResponsavel(String(responsavel.id))}
                        className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-emerald-200 bg-white/80 text-emerald-700 transition hover:border-red-300 hover:text-red-600 dark:border-emerald-400/30 dark:bg-slate-950/70 dark:text-emerald-100 dark:hover:border-red-300/60 dark:hover:text-red-200"
                        aria-label={`Remover responsável ${responsavel.nome}`}
                      >
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </label>
            <label className="space-y-1 text-sm font-medium text-slate-700 dark:text-slate-300">
              Mediadores
              <select
                className={classeCampo}
                value=""
                onChange={(evento) => adicionarMediador(evento.target.value)}
              >
                <option value="">Selecionar mediador</option>
                {mediadoresDisponiveis.map((responsavel) => (
                  <option key={responsavel.id} value={responsavel.id}>
                    {responsavel.nome}
                    {responsavel.setor ? ` | ${responsavel.setor}` : ""}
                    {responsavel.cargo ? ` | ${responsavel.cargo}` : ""}
                  </option>
                ))}
              </select>
              {mediadoresSelecionados.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {mediadoresSelecionados.map((mediador) => (
                    <span
                      key={mediador.id}
                      className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-bold text-blue-800 dark:border-blue-400/30 dark:bg-blue-500/10 dark:text-blue-100"
                    >
                      {mediador.nome}
                      <button
                        type="button"
                        onClick={() => removerMediador(String(mediador.id))}
                        className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-blue-200 bg-white/80 text-blue-700 transition hover:border-red-300 hover:text-red-600 dark:border-blue-400/30 dark:bg-slate-950/70 dark:text-blue-100 dark:hover:border-red-300/60 dark:hover:text-red-200"
                        aria-label={`Remover mediador ${mediador.nome}`}
                      >
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </label>
            <label className="space-y-1 text-sm font-medium text-slate-700 dark:text-slate-300">
              Origem do plano de ação
              <select
                className={classeCampo}
                value={form.origemModulo}
                onChange={(evento) =>
                  campo("origemModulo", evento.target.value)
                }
                required
              >
                <option value="" disabled>
                  Selecione de onde surgiu esta ação
                </option>
                {modulosOrigem.map((modulo) => (
                  <option key={modulo.valor} value={modulo.valor}>
                    {modulo.label}
                  </option>
                ))}
              </select>
            </label>
            {form.origemModulo && form.origemModulo !== "Independente" && (
              <label className="space-y-1 text-sm font-medium text-slate-700 dark:text-slate-300">
                {form.origemModulo === "AnaliseRisco"
                  ? "ARC da análise de risco"
                  : "Registro que originou o plano"}
                <select
                  className={classeCampo}
                  value={form.origemId}
                  onChange={(evento) => campo("origemId", evento.target.value)}
                  required
                >
                  <option value="" disabled>
                    {form.origemModulo === "AnaliseRisco"
                      ? "Selecione a ARC cadastrada"
                      : "Selecione pelo protocolo ou título"}
                  </option>
                  {registrosOrigem.map((origem) => (
                    <option key={origem.id} value={origem.id}>
                      {origem.codigo} | {origem.titulo}
                      {origem.complemento ? ` | ${origem.complemento}` : ""}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {form.origemModulo === "AnaliseRisco" && form.origemId && (
              <label className="space-y-1 text-sm font-medium text-slate-700 dark:text-slate-300">
                Fator de risco tratado neste plano
                <select
                  className={classeCampo}
                  value={form.fatorRiscoId}
                  onChange={(evento) =>
                    campo("fatorRiscoId", evento.target.value)
                  }
                  required
                >
                  <option value="" disabled>
                    Selecione o fator de risco da ARC
                  </option>
                  {fatoresDisponiveisDaArc.map((fator) => (
                    <option
                      key={fator.id || fator.codigo}
                      value={fator.id || ""}
                    >
                      {fator.codigo ? `${fator.codigo} | ` : ""}
                      {fator.nome}
                    </option>
                  ))}
                </select>
                {!fatoresDisponiveisDaArc.length && (
                  <span className="block rounded-lg border border-amber-300/40 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-900 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-100">
                    Todos os fatores desta ARC já possuem plano de ação.
                  </span>
                )}
              </label>
            )}
          </div>

          {origemSelecionada && (
            <div className="flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-100">
              <Link2 className="mt-0.5 shrink-0" size={17} />
              <span>
                <strong>{origemSelecionada.codigo}</strong> vinculado:{" "}
                {origemSelecionada.titulo}. Status atual:{" "}
                {origemSelecionada.status || "não informado"}.
                {form.origemModulo === "AnaliseRisco"
                  ? " Cada plano de ação deve tratar um fator de risco específico desta ARC."
                  : ""}
              </span>
            </div>
          )}

          <textarea
            className={`${classeCampo} min-h-20`}
            placeholder="Observações complementares"
            value={form.comentarios}
            onChange={(evento) => campo("comentarios", evento.target.value)}
          />
          <div className="flex flex-col gap-3 sm:flex-row">
            <button className="rounded-lg bg-emerald-600 px-4 py-2 text-white transition hover:bg-emerald-500">
              Salvar plano
            </button>
            <button
              type="button"
              onClick={() => setAbrir(false)}
              className="rounded-lg bg-slate-200 px-4 py-2 text-slate-800 transition hover:bg-slate-300 dark:bg-slate-800 dark:text-white dark:hover:bg-slate-700"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      <div className="space-y-4">
        {planos.map((plano) => {
          const origemPlano = origemDoPlano(plano);

          return (
            <div
              key={plano.id}
              role="button"
              tabIndex={0}
              onClick={() => navigate(`/planos-acao/${plano.id}`)}
              onKeyDown={(evento) => {
                if (evento.key === "Enter" || evento.key === " ") {
                  navigate(`/planos-acao/${plano.id}`);
                }
              }}
              className={`${classeCard} cursor-pointer p-5 transition hover:border-blue-300 hover:shadow-lg hover:shadow-blue-950/10 dark:hover:border-blue-500/50`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-blue-600">
                    {plano.codigo} | {plano.prioridade}
                  </p>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                    {plano.titulo}
                  </h2>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-slate-500">
                    <span>
                      Responsáveis:{" "}
                      {plano.responsaveis?.length
                        ? plano.responsaveis
                            .map((responsavel) => responsavel.nome)
                            .join(", ")
                        : plano.responsavelNome || "Não informado"}
                    </span>
                    <span className="hidden text-slate-300 dark:text-slate-700 sm:inline">
                      |
                    </span>
                    <span>
                      Prazo: {new Date(plano.prazo).toLocaleString("pt-BR")}
                    </span>
                    <span
                      className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${classeStatusPlano(plano)}`}
                    >
                      Status: {statusExibicaoPlano(plano)}
                    </span>
                  </div>
                  {plano.mediadores?.length ? (
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                      Mediadores:{" "}
                      {plano.mediadores
                        .map((mediador) => mediador.nome)
                        .join(", ")}
                    </p>
                  ) : null}
                  <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
                    <ClipboardList size={14} /> Origem:{" "}
                    {rotuloModulo(plano.origemModulo)}
                    {plano.origemId ? " | registro vinculado" : ""}
                  </p>
                  {plano.origemModulo === "AnaliseRisco" && (
                    <p className="mt-2 inline-flex max-w-full flex-wrap items-center gap-1 rounded-full border border-cyan-300/60 bg-cyan-50 px-3 py-1 text-xs font-bold text-cyan-900 dark:border-cyan-400/30 dark:bg-cyan-400/10 dark:text-cyan-100">
                      ARC atribuída:
                      <span>
                        {origemPlano
                          ? `${origemPlano.codigo} - ${origemPlano.titulo}`
                          : `registro #${plano.origemId}`}
                      </span>
                    </p>
                  )}
                  {plano.fatorRiscoNome && (
                    <p className="mt-2 inline-flex rounded-full border border-amber-300/60 bg-amber-100 px-3 py-1 text-xs font-bold text-amber-900 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-100">
                      Fator tratado:{" "}
                      {plano.fatorRiscoCodigo
                        ? `${plano.fatorRiscoCodigo} - `
                        : ""}
                      {plano.fatorRiscoNome}
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {podeEditarPlano && (
                    <button
                      onClick={(evento) => {
                        evento.stopPropagation();
                        editar(plano);
                      }}
                      className="flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm text-white transition hover:bg-blue-500"
                    >
                      <Edit3 size={16} /> Editar
                    </button>
                  )}
                  {podeExcluirPlano && (
                    <button
                      onClick={(evento) => {
                        evento.stopPropagation();
                        excluir(plano);
                      }}
                      className="flex items-center gap-2 rounded-lg border border-red-400/40 bg-red-500/10 px-3 py-2 text-sm font-bold text-red-600 transition hover:bg-red-500 hover:text-white dark:text-red-200"
                    >
                      <Trash2 size={16} /> Excluir
                    </button>
                  )}
                </div>
              </div>
              {plano.comentarios && (
                <p className="mt-3 text-sm text-slate-700 dark:text-slate-300">
                  {plano.comentarios}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
