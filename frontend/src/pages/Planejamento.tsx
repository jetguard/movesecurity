import { useEffect, useMemo, useState } from "react";
import type { DragEvent, FormEvent } from "react";
import { Archive, CalendarClock, GripVertical, Plus, RefreshCw, Trash2, UserRound } from "lucide-react";
import { api } from "../services/api";

type Usuario = {
  id: number;
  nome: string;
  apelido?: string | null;
  cargo?: string | null;
  unidade?: string | null;
};

type Card = {
  id: number;
  titulo: string;
  descricao?: string | null;
  prioridade: string;
  prazo?: string | null;
  unidade: string;
  setor?: string | null;
  local?: string | null;
  moduloVinculado?: string | null;
  codigoRegistro?: string | null;
  ordem: number;
  status: string;
  colunaId: number;
  responsavel?: {
    id: number;
    nome: string;
    apelido?: string | null;
    fotoPerfil?: string | null;
  } | null;
  criadoPor?: {
    id: number;
    nome: string;
    apelido?: string | null;
  };
};

type Coluna = {
  id: number;
  titulo: string;
  unidade: string;
  ordem: number;
  cards: Card[];
};

type FormCard = {
  titulo: string;
  descricao: string;
  prioridade: string;
  prazo: string;
  setor: string;
  local: string;
  responsavelId: string;
  colunaId: string;
};

const inicial: FormCard = {
  titulo: "",
  descricao: "",
  prioridade: "",
  prazo: "",
  setor: "",
  local: "",
  responsavelId: "",
  colunaId: "",
};

const prioridadeClasse: Record<string, string> = {
  Baixa: "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-200 dark:ring-emerald-800",
  Media: "bg-blue-50 text-blue-700 ring-blue-200 dark:bg-blue-950/50 dark:text-blue-200 dark:ring-blue-800",
  Alta: "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-950/50 dark:text-amber-200 dark:ring-amber-800",
  Critica: "bg-red-50 text-red-700 ring-red-200 dark:bg-red-950/50 dark:text-red-200 dark:ring-red-800",
};

function nomeUsuario(usuario?: Card["responsavel"] | Usuario | null) {
  return usuario?.apelido || usuario?.nome || "Sem responsavel";
}

function nomeCriador(card: Card) {
  return card.criadoPor?.apelido || card.criadoPor?.nome || "Criador nao informado";
}

function prazoTexto(prazo: string | null | undefined, agora: number) {
  if (!prazo) return "Sem prazo";
  const data = new Date(prazo);
  const dias = Math.ceil((data.getTime() - agora) / 86400000);
  const complemento = dias < 0 ? `${Math.abs(dias)} dia(s) vencido` : `${dias} dia(s)`;
  return `${data.toLocaleDateString("pt-BR")} - ${complemento}`;
}

export default function Planejamento() {
  const [colunas, setColunas] = useState<Coluna[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [unidade, setUnidade] = useState("");
  const [form, setForm] = useState<FormCard>(inicial);
  const [novaColuna, setNovaColuna] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [busca, setBusca] = useState("");
  const [prioridade, setPrioridade] = useState("");
  const [responsavel, setResponsavel] = useState("");
  const [dragCardId, setDragCardId] = useState<number | null>(null);
  const [dragColunaId, setDragColunaId] = useState<number | null>(null);
  const [agora] = useState(() => Date.now());

  async function carregar() {
    setCarregando(true);
    const response = await api.get("/planejamento");
    setColunas(response.data.colunas);
    setUsuarios(response.data.usuarios);
    setUnidade(response.data.unidade);
    setForm((atual) => ({
      ...atual,
      colunaId: atual.colunaId || String(response.data.colunas[0]?.id || ""),
    }));
    setCarregando(false);
  }

  useEffect(() => {
    carregar().catch(() => setCarregando(false));
  }, []);

  const filtradas = useMemo(() => {
    return colunas.map((coluna) => ({
      ...coluna,
      cards: coluna.cards.filter((card) => {
        const texto = `${card.titulo} ${card.descricao || ""} ${card.local || ""} ${card.setor || ""}`.toLowerCase();
        const combinaBusca = !busca || texto.includes(busca.toLowerCase());
        const combinaPrioridade = !prioridade || card.prioridade === prioridade;
        const combinaResponsavel = !responsavel || String(card.responsavel?.id || "") === responsavel;
        return combinaBusca && combinaPrioridade && combinaResponsavel;
      }),
    }));
  }, [busca, colunas, prioridade, responsavel]);

  const resumo = useMemo(() => {
    const cards = colunas.flatMap((coluna) => coluna.cards);
    return {
      total: cards.length,
      vencidos: cards.filter((card) => card.prazo && new Date(card.prazo).getTime() < agora).length,
      criticos: cards.filter((card) => card.prioridade === "Critica").length,
      concluidos: colunas.find((coluna) => coluna.titulo.toLowerCase().includes("concluido"))?.cards.length || 0,
    };
  }, [agora, colunas]);

  function campo(nome: keyof FormCard, valor: string) {
    setForm((atual) => ({ ...atual, [nome]: valor }));
  }

  async function criarCard(event: FormEvent) {
    event.preventDefault();
    await api.post("/planejamento/cards", {
      ...form,
      responsavelId: form.responsavelId || undefined,
      prazo: form.prazo || undefined,
    });
    setForm((atual) => ({ ...inicial, colunaId: atual.colunaId }));
    await carregar();
  }

  async function criarColuna() {
    if (!novaColuna.trim()) return;
    await api.post("/planejamento/colunas", { titulo: novaColuna.trim() });
    setNovaColuna("");
    await carregar();
  }

  async function excluirColuna(coluna: Coluna) {
    if (coluna.cards.length > 0) {
      alert("Mova ou arquive todos os cards antes de excluir esta coluna.");
      return;
    }

    if (!confirm(`Deseja excluir a coluna "${coluna.titulo}"?`)) return;
    await api.delete(`/planejamento/colunas/${coluna.id}`);
    await carregar();
  }

  async function moverCard(colunaId: number) {
    if (!dragCardId) return;
    const colunaDestino = colunas.find((coluna) => coluna.id === colunaId);
    await api.put(`/planejamento/cards/${dragCardId}/mover`, {
      colunaId,
      ordem: colunaDestino?.cards.length || 0,
    });
    setDragCardId(null);
    await carregar();
  }

  async function arquivarCard(id: number) {
    if (!confirm("Deseja arquivar este card do planejamento?")) return;
    await api.delete(`/planejamento/cards/${id}`);
    await carregar();
  }

  async function soltarColuna(alvoId: number) {
    if (!dragColunaId || dragColunaId === alvoId) return;
    const atual = [...colunas];
    const origemIndex = atual.findIndex((coluna) => coluna.id === dragColunaId);
    const alvoIndex = atual.findIndex((coluna) => coluna.id === alvoId);
    const [removida] = atual.splice(origemIndex, 1);
    atual.splice(alvoIndex, 0, removida);
    setColunas(atual);
    setDragColunaId(null);
    await api.put("/planejamento/colunas/ordem", { colunas: atual.map((coluna) => coluna.id) });
    await carregar();
  }

  function permitirDrop(event: DragEvent) {
    event.preventDefault();
  }

  if (carregando) {
    return <div className="rounded-2xl bg-white p-8 text-slate-500 shadow dark:bg-slate-900 dark:text-slate-300">Carregando planejamento...</div>;
  }

  return (
    <div className="space-y-6 text-slate-900 dark:text-slate-100">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-300">Operacao</p>
          <h1 className="text-2xl font-bold sm:text-3xl">Planejamento Operacional</h1>
          <p className="mt-1 max-w-3xl text-sm text-slate-500 dark:text-slate-400">
            Quadro colaborativo para operadores, analistas e administradores acompanharem tratativas, prazos e prioridades da unidade {unidade}.
          </p>
        </div>

        <button
          type="button"
          onClick={carregar}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
        >
          <RefreshCw size={18} />
          Atualizar
        </button>
      </div>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <div className="rounded-2xl bg-white p-5 shadow-sm dark:bg-slate-900"><p className="text-sm text-slate-500 dark:text-slate-400">Cards ativos</p><p className="mt-1 text-3xl font-bold">{resumo.total}</p></div>
        <div className="rounded-2xl bg-white p-5 shadow-sm dark:bg-slate-900"><p className="text-sm text-slate-500 dark:text-slate-400">Vencidos</p><p className="mt-1 text-3xl font-bold text-red-600">{resumo.vencidos}</p></div>
        <div className="rounded-2xl bg-white p-5 shadow-sm dark:bg-slate-900"><p className="text-sm text-slate-500 dark:text-slate-400">Criticos</p><p className="mt-1 text-3xl font-bold text-amber-600">{resumo.criticos}</p></div>
        <div className="rounded-2xl bg-white p-5 shadow-sm dark:bg-slate-900"><p className="text-sm text-slate-500 dark:text-slate-400">Concluidos</p><p className="mt-1 text-3xl font-bold text-emerald-600">{resumo.concluidos}</p></div>
      </section>

      <section className="rounded-2xl bg-white p-5 shadow-sm dark:bg-slate-900">
        <form onSubmit={criarCard} className="grid grid-cols-1 gap-3 lg:grid-cols-12">
          <input className="rounded-xl border border-slate-200 p-3 text-sm dark:border-slate-800 dark:bg-slate-950 lg:col-span-3" placeholder="Titulo do card ou lembrete operacional" value={form.titulo} onChange={(e) => campo("titulo", e.target.value)} required />
          <input className="rounded-xl border border-slate-200 p-3 text-sm dark:border-slate-800 dark:bg-slate-950 lg:col-span-3" placeholder="Descricao resumida da atividade" value={form.descricao} onChange={(e) => campo("descricao", e.target.value)} />
          <select className="rounded-xl border border-slate-200 p-3 text-sm dark:border-slate-800 dark:bg-slate-950 lg:col-span-2" value={form.responsavelId} onChange={(e) => campo("responsavelId", e.target.value)}>
            <option value="">Selecione o responsavel</option>
            {usuarios.map((usuario) => <option key={usuario.id} value={usuario.id}>{nomeUsuario(usuario)}</option>)}
          </select>
          <select className="rounded-xl border border-slate-200 p-3 text-sm dark:border-slate-800 dark:bg-slate-950 lg:col-span-2" value={form.colunaId} onChange={(e) => campo("colunaId", e.target.value)} required>
            <option value="">Selecione a coluna</option>
            {colunas.map((coluna) => <option key={coluna.id} value={coluna.id}>{coluna.titulo}</option>)}
          </select>
          <select className="rounded-xl border border-slate-200 p-3 text-sm dark:border-slate-800 dark:bg-slate-950" value={form.prioridade} onChange={(e) => campo("prioridade", e.target.value)}>
            <option value="">Prioridade</option>
            <option>Baixa</option>
            <option>Media</option>
            <option>Alta</option>
            <option>Critica</option>
          </select>
          <input type="date" className="rounded-xl border border-slate-200 p-3 text-sm dark:border-slate-800 dark:bg-slate-950" value={form.prazo} onChange={(e) => campo("prazo", e.target.value)} />
          <input className="rounded-xl border border-slate-200 p-3 text-sm dark:border-slate-800 dark:bg-slate-950 lg:col-span-2" placeholder="Setor relacionado" value={form.setor} onChange={(e) => campo("setor", e.target.value)} />
          <input className="rounded-xl border border-slate-200 p-3 text-sm dark:border-slate-800 dark:bg-slate-950 lg:col-span-3" placeholder="Local ou area da atividade" value={form.local} onChange={(e) => campo("local", e.target.value)} />
          <button className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white hover:bg-blue-700 lg:col-span-2">
            <Plus size={18} />
            Criar card
          </button>
        </form>
      </section>

      <section className="flex flex-col gap-3 rounded-2xl bg-white p-5 shadow-sm dark:bg-slate-900 lg:flex-row">
        <input className="min-w-0 flex-1 rounded-xl border border-slate-200 p-3 text-sm dark:border-slate-800 dark:bg-slate-950" placeholder="Pesquisar por titulo, descricao, setor ou local" value={busca} onChange={(e) => setBusca(e.target.value)} />
        <select className="rounded-xl border border-slate-200 p-3 text-sm dark:border-slate-800 dark:bg-slate-950" value={prioridade} onChange={(e) => setPrioridade(e.target.value)}>
          <option value="">Todas as prioridades</option>
          <option>Baixa</option>
          <option>Media</option>
          <option>Alta</option>
          <option>Critica</option>
        </select>
        <select className="rounded-xl border border-slate-200 p-3 text-sm dark:border-slate-800 dark:bg-slate-950" value={responsavel} onChange={(e) => setResponsavel(e.target.value)}>
          <option value="">Todos os responsaveis</option>
          {usuarios.map((usuario) => <option key={usuario.id} value={usuario.id}>{nomeUsuario(usuario)}</option>)}
        </select>
        <div className="flex gap-2">
          <input className="w-full rounded-xl border border-slate-200 p-3 text-sm dark:border-slate-800 dark:bg-slate-950" placeholder="Nome da nova coluna" value={novaColuna} onChange={(e) => setNovaColuna(e.target.value)} />
          <button type="button" onClick={criarColuna} className="rounded-xl bg-slate-900 px-4 py-3 text-sm font-bold text-white dark:bg-blue-600">
            <Plus size={18} />
          </button>
        </div>
      </section>

      <section className="overflow-x-auto pb-3">
        <div className="flex min-h-[520px] gap-4">
          {filtradas.map((coluna) => (
            <div
              key={coluna.id}
              draggable
              onDragStart={() => setDragColunaId(coluna.id)}
              onDragOver={permitirDrop}
              onDrop={() => dragColunaId ? soltarColuna(coluna.id) : moverCard(coluna.id)}
              className="flex w-[310px] shrink-0 flex-col rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950"
            >
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2">
                  <GripVertical size={18} className="shrink-0 text-slate-400" />
                  <h2 className="truncate font-bold">{coluna.titulo}</h2>
                </div>
                <div className="flex items-center gap-1">
                  <span className="rounded-full bg-white px-2 py-1 text-xs font-bold text-slate-500 dark:bg-slate-900 dark:text-slate-300">{coluna.cards.length}</span>
                  <button
                    type="button"
                    onClick={() => excluirColuna(coluna)}
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40"
                    title="Excluir coluna vazia"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>

              <div className="flex flex-1 flex-col gap-3">
                {coluna.cards.map((card) => (
                  <article
                    key={card.id}
                    draggable
                    onDragStart={(event) => {
                      event.stopPropagation();
                      setDragCardId(card.id);
                    }}
                    className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-sm font-bold leading-5">{card.titulo}</h3>
                      <button type="button" onClick={() => arquivarCard(card.id)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-red-600 dark:hover:bg-slate-800" title="Arquivar">
                        <Archive size={16} />
                      </button>
                    </div>
                    {card.descricao && <p className="mt-2 line-clamp-3 text-sm text-slate-500 dark:text-slate-400">{card.descricao}</p>}
                    <div className="mt-3 flex flex-wrap gap-2">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-bold ring-1 ${prioridadeClasse[card.prioridade] || prioridadeClasse.Media}`}>
                        {card.prioridade}
                      </span>
                      {card.codigoRegistro && <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-200">{card.codigoRegistro}</span>}
                    </div>
                    <div className="mt-4 space-y-2 text-xs text-slate-500 dark:text-slate-400">
                      <p className="flex items-center gap-2"><UserRound size={14} /> Responsavel: {nomeUsuario(card.responsavel)}</p>
                      <p>Criado por: {nomeCriador(card)}</p>
                      <p className="flex items-center gap-2"><CalendarClock size={14} /> {prazoTexto(card.prazo, agora)}</p>
                      {(card.setor || card.local) && <p>{[card.setor, card.local].filter(Boolean).join(" - ")}</p>}
                    </div>
                  </article>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
