import { useEffect, useMemo, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { CheckCircle2, Clock3, FileCheck2, ShieldAlert, XCircle } from "lucide-react";
import { api } from "../services/api";

type RiscoCatalogo = {
  id: number;
  codigo: string;
  nome: string;
  grauRisco?: string;
  tipoRisco?: string;
  local?: string;
  status?: string;
};

type AprAprovacao = {
  id: number;
  usuarioNome: string;
  perfilAcesso?: string | null;
  decisao: "Pendente" | "Aprovado" | "Reprovado";
  observacao?: string | null;
  decididoEm?: string | null;
};

type Apr = {
  id: number;
  codigo: string;
  unidade: string;
  local: string;
  area?: string | null;
  atividade: string;
  descricaoAtividade: string;
  dataPrevista?: string | null;
  responsavelAtividade: string;
  equipeEnvolvida?: string | null;
  empresaTerceira?: string | null;
  riscosIds?: string | null;
  riscos?: RiscoCatalogo[];
  perigos: string;
  controlesObrigatorios: string;
  episNecessarios?: string | null;
  permissoesNecessarias?: string | null;
  nivelRisco: string;
  status: string;
  criadoPorNome?: string | null;
  aprovacoes: AprAprovacao[];
  createdAt: string;
};

const vazio = {
  local: "",
  area: "",
  atividade: "",
  descricaoAtividade: "",
  dataPrevista: "",
  responsavelAtividade: "",
  equipeEnvolvida: "",
  empresaTerceira: "",
  riscosIds: [] as number[],
  perigos: "",
  controlesObrigatorios: "",
  episNecessarios: "",
  permissoesNecessarias: "",
  nivelRisco: "Moderado",
  status: "Rascunho",
  aprovadores: "",
};

const niveis = ["Baixo", "Moderado", "Alto", "Crítico"];
const statusApr = ["Rascunho", "Aguardando aprovação", "Aprovada", "Reprovada", "Em execução", "Encerrada"];

function campoClasse() {
  return "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-900 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white";
}

function Label({ texto, children, className = "" }: { texto: string; children: ReactNode; className?: string }) {
  return <label className={`block text-sm font-bold text-slate-700 dark:text-slate-200 ${className}`}><span className="mb-1 block">{texto}</span>{children}</label>;
}

function dataCurta(valor?: string | null) {
  if (!valor) return "-";
  return new Date(valor).toLocaleString("pt-BR");
}

function corStatus(status: string) {
  if (status === "Aprovada") return "border-emerald-400/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-200";
  if (status === "Reprovada") return "border-red-400/40 bg-red-500/10 text-red-700 dark:text-red-200";
  if (status === "Em execução") return "border-blue-400/40 bg-blue-500/10 text-blue-700 dark:text-blue-200";
  return "border-amber-400/40 bg-amber-500/10 text-amber-700 dark:text-amber-200";
}

function iconeDecisao(decisao: AprAprovacao["decisao"]) {
  if (decisao === "Aprovado") return <CheckCircle2 size={18} className="text-emerald-500" />;
  if (decisao === "Reprovado") return <XCircle size={18} className="text-red-500" />;
  return <Clock3 size={18} className="text-amber-500" />;
}

export default function APRs() {
  const [aprs, setAprs] = useState<Apr[]>([]);
  const [catalogo, setCatalogo] = useState<RiscoCatalogo[]>([]);
  const [form, setForm] = useState(vazio);
  const [selecionada, setSelecionada] = useState<Apr | null>(null);
  const [editando, setEditando] = useState<Apr | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [observacao, setObservacao] = useState("");

  async function carregar() {
    const [aprsResponse, riscosResponse] = await Promise.all([
      api.get("/aprs"),
      api.get("/riscos/catalogo"),
    ]);
    const lista = Array.isArray(aprsResponse.data) ? aprsResponse.data : [];
    setAprs(lista);
    setCatalogo(Array.isArray(riscosResponse.data) ? riscosResponse.data.filter((item: RiscoCatalogo) => item.status !== "Inativo") : []);
    setSelecionada((atual) => atual ? lista.find((item: Apr) => item.id === atual.id) || lista[0] || null : lista[0] || null);
  }

  useEffect(() => {
    carregar().catch(() => undefined);
  }, []);

  const indicadores = useMemo(() => ({
    total: aprs.length,
    aguardando: aprs.filter((apr) => apr.status === "Aguardando aprovação").length,
    aprovadas: aprs.filter((apr) => apr.status === "Aprovada").length,
    reprovadas: aprs.filter((apr) => apr.status === "Reprovada").length,
  }), [aprs]);

  function alterar(nome: string, valor: string) {
    setForm((atual) => ({ ...atual, [nome]: valor }));
  }

  function alternarRisco(id: number) {
    setForm((atual) => ({
      ...atual,
      riscosIds: atual.riscosIds.includes(id) ? atual.riscosIds.filter((item) => item !== id) : [...atual.riscosIds, id],
    }));
  }

  function editar(apr: Apr) {
    setEditando(apr);
    setSelecionada(apr);
    setForm({
      local: apr.local || "",
      area: apr.area || "",
      atividade: apr.atividade || "",
      descricaoAtividade: apr.descricaoAtividade || "",
      dataPrevista: apr.dataPrevista ? apr.dataPrevista.slice(0, 16) : "",
      responsavelAtividade: apr.responsavelAtividade || "",
      equipeEnvolvida: apr.equipeEnvolvida || "",
      empresaTerceira: apr.empresaTerceira || "",
      riscosIds: String(apr.riscosIds || "").split(",").map(Number).filter(Boolean),
      perigos: apr.perigos || "",
      controlesObrigatorios: apr.controlesObrigatorios || "",
      episNecessarios: apr.episNecessarios || "",
      permissoesNecessarias: apr.permissoesNecessarias || "",
      nivelRisco: apr.nivelRisco || "Moderado",
      status: apr.status || "Rascunho",
      aprovadores: apr.aprovacoes.map((item) => item.usuarioNome).join(", "),
    });
  }

  function limpar() {
    setForm(vazio);
    setEditando(null);
  }

  async function salvar(event: FormEvent) {
    event.preventDefault();
    setCarregando(true);
    try {
      const payload = {
        ...form,
        aprovadores: form.aprovadores.split(",").map((item) => item.trim()).filter(Boolean),
      };
      if (editando) await api.put(`/aprs/${editando.id}`, payload);
      else await api.post("/aprs", payload);
      limpar();
      await carregar();
    } catch (error: unknown) {
      const apiError = error as { response?: { data?: { error?: string } } };
      alert(apiError.response?.data?.error || "Erro ao salvar APR.");
    } finally {
      setCarregando(false);
    }
  }

  async function decidir(decisao: "Aprovado" | "Reprovado") {
    if (!selecionada) return;
    await api.post(`/aprs/${selecionada.id}/decisao`, { decisao, observacao });
    setObservacao("");
    await carregar();
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-blue-600">Gestão avançada</p>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">APR Operacional</h1>
          <p className="mt-1 text-slate-500">Análise preliminar para liberar atividades com risco, controles e aprovações.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
        {[
          ["APRs cadastradas", indicadores.total],
          ["Aguardando aprovação", indicadores.aguardando],
          ["Aprovadas", indicadores.aprovadas],
          ["Reprovadas", indicadores.reprovadas],
        ].map(([titulo, valor]) => (
          <div key={titulo} className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{titulo}</p>
            <p className="mt-2 text-2xl font-black text-slate-900 dark:text-white">{valor}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_360px]">
        <main className="space-y-5">
          <form onSubmit={salvar} className="rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">{editando ? `Editar ${editando.codigo}` : "Nova APR"}</h2>
                <p className="text-sm text-slate-500">Cadastre a atividade, riscos, controles e aprovadores.</p>
              </div>
              {editando && <button type="button" onClick={limpar} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-bold text-slate-600 dark:border-slate-700 dark:text-slate-200">Cancelar</button>}
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
              <Label texto="Atividade" className="lg:col-span-2"><input className={campoClasse()} value={form.atividade} onChange={(e) => alterar("atividade", e.target.value)} required /></Label>
              <Label texto="Data/hora prevista"><input type="datetime-local" className={campoClasse()} value={form.dataPrevista} onChange={(e) => alterar("dataPrevista", e.target.value)} /></Label>
              <Label texto="Nível de risco"><select className={campoClasse()} value={form.nivelRisco} onChange={(e) => alterar("nivelRisco", e.target.value)}>{niveis.map((item) => <option key={item}>{item}</option>)}</select></Label>
              <Label texto="Local"><input className={campoClasse()} value={form.local} onChange={(e) => alterar("local", e.target.value)} required /></Label>
              <Label texto="Área"><input className={campoClasse()} value={form.area} onChange={(e) => alterar("area", e.target.value)} /></Label>
              <Label texto="Responsável pela atividade"><input className={campoClasse()} value={form.responsavelAtividade} onChange={(e) => alterar("responsavelAtividade", e.target.value)} required /></Label>
              <Label texto="Status"><select className={campoClasse()} value={form.status} onChange={(e) => alterar("status", e.target.value)}>{statusApr.map((item) => <option key={item}>{item}</option>)}</select></Label>
              <Label texto="Equipe envolvida" className="lg:col-span-2"><input className={campoClasse()} value={form.equipeEnvolvida} onChange={(e) => alterar("equipeEnvolvida", e.target.value)} /></Label>
              <Label texto="Empresa / terceiro" className="lg:col-span-2"><input className={campoClasse()} value={form.empresaTerceira} onChange={(e) => alterar("empresaTerceira", e.target.value)} /></Label>
              <Label texto="Descrição da atividade" className="lg:col-span-4"><textarea rows={3} className={campoClasse()} value={form.descricaoAtividade} onChange={(e) => alterar("descricaoAtividade", e.target.value)} required /></Label>
              <Label texto="Perigos da atividade" className="lg:col-span-2"><textarea rows={4} className={campoClasse()} value={form.perigos} onChange={(e) => alterar("perigos", e.target.value)} required /></Label>
              <Label texto="Controles obrigatórios" className="lg:col-span-2"><textarea rows={4} className={campoClasse()} value={form.controlesObrigatorios} onChange={(e) => alterar("controlesObrigatorios", e.target.value)} required /></Label>
              <Label texto="EPIs necessários" className="lg:col-span-2"><textarea rows={3} className={campoClasse()} value={form.episNecessarios} onChange={(e) => alterar("episNecessarios", e.target.value)} /></Label>
              <Label texto="Permissões necessárias" className="lg:col-span-2"><textarea rows={3} className={campoClasse()} value={form.permissoesNecessarias} onChange={(e) => alterar("permissoesNecessarias", e.target.value)} /></Label>
              <Label texto="Aprovadores, separados por vírgula" className="lg:col-span-4"><input className={campoClasse()} value={form.aprovadores} onChange={(e) => alterar("aprovadores", e.target.value)} placeholder="Ex.: Supervisor Operacional, Técnico de Segurança, Gestor" /></Label>
            </div>

            <div className="mt-4 rounded-lg border border-slate-200 p-4 dark:border-slate-800">
              <p className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500">Riscos identificados vinculados</p>
              <div className="grid max-h-56 grid-cols-1 gap-2 overflow-y-auto pr-1 md:grid-cols-2">
                {catalogo.map((risco) => (
                  <label key={risco.id} className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm dark:border-slate-800 dark:bg-slate-950">
                    <input type="checkbox" checked={form.riscosIds.includes(risco.id)} onChange={() => alternarRisco(risco.id)} className="mt-1" />
                    <span>
                      <strong className="block text-slate-900 dark:text-white">{risco.codigo} - {risco.nome}</strong>
                      <span className="text-xs text-slate-500">{risco.tipoRisco} | {risco.grauRisco} | {risco.local || "Sem local"}</span>
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <div className="mt-5 flex gap-3">
              <button disabled={carregando} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700 disabled:bg-slate-400">{carregando ? "Salvando..." : "Salvar APR"}</button>
              <button type="button" onClick={limpar} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-bold text-slate-600 dark:border-slate-700 dark:text-slate-200">Limpar</button>
            </div>
          </form>

          <section className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <h2 className="mb-3 text-lg font-bold text-slate-900 dark:text-white">APRs cadastradas</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
                <thead className="bg-slate-50 text-left text-xs font-bold uppercase tracking-wide text-slate-500 dark:bg-slate-950">
                  <tr>
                    <th className="px-3 py-3">Código</th>
                    <th className="px-3 py-3">Atividade</th>
                    <th className="px-3 py-3">Local</th>
                    <th className="px-3 py-3">Risco</th>
                    <th className="px-3 py-3">Status</th>
                    <th className="px-3 py-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {aprs.map((apr) => (
                    <tr key={apr.id} className={`cursor-pointer align-top transition hover:bg-slate-50 dark:hover:bg-slate-800/40 ${selecionada?.id === apr.id ? "bg-blue-50/70 dark:bg-blue-950/20" : ""}`} onClick={() => setSelecionada(apr)}>
                      <td className="whitespace-nowrap px-3 py-3 font-bold text-slate-900 dark:text-white">{apr.codigo}</td>
                      <td className="px-3 py-3"><p className="font-bold text-slate-900 dark:text-white">{apr.atividade}</p><p className="text-xs text-slate-500">{dataCurta(apr.dataPrevista)}</p></td>
                      <td className="px-3 py-3 text-slate-600 dark:text-slate-300">{apr.local}<br /><span className="text-xs">{apr.area || "-"}</span></td>
                      <td className="px-3 py-3"><span className="rounded-full border border-slate-300 px-2 py-1 text-xs font-bold text-slate-600 dark:border-slate-700 dark:text-slate-200">{apr.nivelRisco}</span></td>
                      <td className="px-3 py-3"><span className={`rounded-full border px-2 py-1 text-xs font-bold ${corStatus(apr.status)}`}>{apr.status}</span></td>
                      <td className="px-3 py-3 text-right"><button type="button" onClick={(e) => { e.stopPropagation(); editar(apr); }} className="rounded-md bg-slate-900 px-3 py-1.5 text-xs font-bold text-white dark:bg-slate-700">Editar</button></td>
                    </tr>
                  ))}
                  {!aprs.length && <tr><td colSpan={6} className="px-3 py-8 text-center text-slate-500">Nenhuma APR cadastrada.</td></tr>}
                </tbody>
              </table>
            </div>
          </section>
        </main>

        <aside className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-4 flex items-center gap-2">
            <FileCheck2 className="text-blue-500" size={22} />
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Acompanhamento</h2>
              <p className="text-xs text-slate-500">{selecionada ? selecionada.codigo : "Selecione uma APR"}</p>
            </div>
          </div>

          {selecionada ? (
            <div className="space-y-4">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Atividade</p>
                <p className="mt-1 font-bold text-slate-900 dark:text-white">{selecionada.atividade}</p>
                <p className="mt-1 text-sm text-slate-500">{selecionada.local} | {selecionada.nivelRisco}</p>
              </div>

              <div>
                <p className="mb-2 text-sm font-bold uppercase tracking-wide text-slate-500">Aprovadores</p>
                <div className="space-y-2">
                  {selecionada.aprovacoes.map((aprovacao) => (
                    <div key={aprovacao.id} className="rounded-lg border border-slate-200 p-3 dark:border-slate-800">
                      <div className="flex items-start gap-3">
                        {iconeDecisao(aprovacao.decisao)}
                        <div className="min-w-0">
                          <p className="font-bold text-slate-900 dark:text-white">{aprovacao.usuarioNome}</p>
                          <p className="text-xs uppercase tracking-wide text-slate-500">{aprovacao.perfilAcesso || "Aprovador"} | {aprovacao.decisao}</p>
                          {aprovacao.decididoEm && <p className="mt-1 text-xs text-slate-500">{dataCurta(aprovacao.decididoEm)}</p>}
                          {aprovacao.observacao && <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{aprovacao.observacao}</p>}
                        </div>
                      </div>
                    </div>
                  ))}
                  {!selecionada.aprovacoes.length && <p className="rounded-lg border border-dashed border-slate-300 p-3 text-sm text-slate-500 dark:border-slate-700">Nenhum aprovador informado.</p>}
                </div>
              </div>

              <div>
                <p className="mb-2 text-sm font-bold uppercase tracking-wide text-slate-500">Riscos vinculados</p>
                <div className="space-y-2">
                  {(selecionada.riscos || []).map((risco) => (
                    <div key={risco.id} className="rounded-lg border border-slate-200 p-3 text-sm dark:border-slate-800">
                      <strong className="text-slate-900 dark:text-white">{risco.codigo}</strong>
                      <p className="text-slate-500">{risco.nome}</p>
                    </div>
                  ))}
                </div>
              </div>

              <textarea className={campoClasse()} rows={3} value={observacao} onChange={(e) => setObservacao(e.target.value)} placeholder="Observação da decisão" />
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => decidir("Aprovado")} className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-bold text-white hover:bg-emerald-700">Aprovar</button>
                <button onClick={() => decidir("Reprovado")} className="rounded-lg bg-red-600 px-3 py-2 text-sm font-bold text-white hover:bg-red-700">Reprovar</button>
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500 dark:border-slate-700">
              <ShieldAlert className="mx-auto mb-2 text-slate-400" />
              Selecione uma APR para visualizar aprovações.
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
