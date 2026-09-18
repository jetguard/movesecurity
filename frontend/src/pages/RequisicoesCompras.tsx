import { useEffect, useState } from "react";
import { CalendarDays, Edit3, Plus, Save, ShoppingCart, Trash2, X } from "lucide-react";
import { api } from "../services/api";

type Conta = { id: number; nome: string; categoria: string; ano: number };
type Requisicao = {
  id: number; contaContabilId: number; item: string; quantidade: number; valorMinimo: string;
  valorMaximo: string; dataPrazo: string; finalidade: string; fornecedorSugerido?: string;
  contatoFornecedor?: string; numeroRequisicao?: string; numeroPedidoSap?: string;
  dataAprovacaoRequisicao?: string; dataAprovacaoPedido?: string; valorConcluido?: string;
  status: string; contaContabil: Conta;
};

const statusOpcoes = [
  ["PENDENTE", "Pendente"], ["EM_COTACAO", "Em cotação"], ["PEDIDO_ENVIADO", "Pedido enviado"],
  ["PEDIDO_APROVADO", "Pedido aprovado"], ["AGUARDANDO_FORNECEDOR", "Aguardando fornecedor"],
  ["CONCLUIDO", "Concluído"], ["CANCELADO", "Cancelado"],
];
const rotuloStatus = (status: string) => statusOpcoes.find(([valor]) => valor === status)?.[1] || status;
const moeda = (valor: unknown) => Number(valor || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const mascaraMoeda = (valor: string) => {
  const digitos = valor.replace(/\D/g, "");
  return digitos ? (Number(digitos) / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "";
};
const moedaInput = (valor: unknown) => valor ? moeda(valor) : "";
const dataInput = (valor?: string) => valor ? valor.slice(0, 10) : "";
const formularioVazio = () => ({
  contaContabilId: "", item: "", quantidade: "", valorMinimo: "", valorMaximo: "", dataPrazo: "",
  finalidade: "", fornecedorSugerido: "", contatoFornecedor: "", numeroRequisicao: "",
  numeroPedidoSap: "", dataAprovacaoRequisicao: "", dataAprovacaoPedido: "", valorConcluido: "", status: "PENDENTE",
});

export default function RequisicoesCompras() {
  const [requisicoes, setRequisicoes] = useState<Requisicao[]>([]);
  const [contas, setContas] = useState<Conta[]>([]);
  const [modal, setModal] = useState(false);
  const [editando, setEditando] = useState<number | null>(null);
  const [form, setForm] = useState(formularioVazio());
  const campo = "h-11 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 text-sm text-white outline-none focus:border-blue-400";

  async function carregar() {
    const [requisicoesResposta, contasResposta] = await Promise.all([
      api.get("/financeiro/requisicoes"), api.get("/financeiro/contas"),
    ]);
    setRequisicoes(requisicoesResposta.data);
    setContas(contasResposta.data);
  }
  useEffect(() => { carregar(); }, []);

  function abrirNova() { setEditando(null); setForm(formularioVazio()); setModal(true); }
  function abrirEdicao(item: Requisicao) {
    setEditando(item.id);
    setForm({
      contaContabilId: String(item.contaContabilId), item: item.item, quantidade: String(item.quantidade),
      valorMinimo: moedaInput(item.valorMinimo), valorMaximo: moedaInput(item.valorMaximo), dataPrazo: dataInput(item.dataPrazo),
      finalidade: item.finalidade, fornecedorSugerido: item.fornecedorSugerido || "", contatoFornecedor: item.contatoFornecedor || "",
      numeroRequisicao: item.numeroRequisicao || "", numeroPedidoSap: item.numeroPedidoSap || "",
      dataAprovacaoRequisicao: dataInput(item.dataAprovacaoRequisicao), dataAprovacaoPedido: dataInput(item.dataAprovacaoPedido),
      valorConcluido: moedaInput(item.valorConcluido), status: item.status,
    });
    setModal(true);
  }
  async function salvar(evento: React.FormEvent) {
    evento.preventDefault();
    await api[editando ? "put" : "post"](`/financeiro/requisicoes${editando ? `/${editando}` : ""}`, form);
    setModal(false);
    await carregar();
  }

  return <div className="space-y-5 text-white">
    <header className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-950 p-5">
      <div className="flex items-center gap-3"><span className="rounded-xl bg-blue-600 p-3"><ShoppingCart /></span><div><p className="text-xs font-black uppercase tracking-[.2em] text-blue-300">Financeiro</p><h1 className="text-2xl font-black">Requisições de compras</h1><p className="text-sm text-slate-400">Solicitações, aprovações e acompanhamento de pedidos.</p></div></div>
      <button onClick={abrirNova} className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-3 font-bold"><Plus size={18} />Nova requisição</button>
    </header>

    <section className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-950">
      <div className="overflow-x-auto"><table className="w-full min-w-[1050px] text-left text-sm"><thead className="bg-slate-900 text-xs uppercase text-slate-400"><tr>
        <th className="p-3">Item</th><th className="p-3">Conta contábil</th><th className="p-3">Qtd.</th><th className="p-3">Faixa estimada</th><th className="p-3">Prazo</th><th className="p-3">Req. / SAP</th><th className="p-3">Status</th><th className="p-3 text-center">Ações</th>
      </tr></thead><tbody>{requisicoes.map((item) => <tr key={item.id} className="border-t border-slate-800 hover:bg-slate-900/60">
        <td className="p-3"><p className="font-bold">{item.item}</p><p className="max-w-xs truncate text-xs text-slate-500">{item.finalidade}</p></td>
        <td className="p-3 text-slate-300">{item.contaContabil.nome}</td><td className="p-3">{item.quantidade}</td>
        <td className="p-3 text-slate-300">{moeda(item.valorMinimo)} a {moeda(item.valorMaximo)}</td>
        <td className="p-3">{new Date(item.dataPrazo).toLocaleDateString("pt-BR", { timeZone: "UTC" })}</td>
        <td className="p-3 text-xs"><p>{item.numeroRequisicao || "-"}</p><p className="text-slate-500">{item.numeroPedidoSap || "-"}</p></td>
        <td className="p-3"><span className={`rounded-full px-2 py-1 text-xs font-bold ${item.status === "CONCLUIDO" ? "bg-emerald-500/15 text-emerald-300" : item.status === "CANCELADO" ? "bg-rose-500/15 text-rose-300" : "bg-blue-500/15 text-blue-300"}`}>{rotuloStatus(item.status)}</span></td>
        <td className="p-3"><div className="flex justify-center gap-1"><button title="Editar" onClick={() => abrirEdicao(item)} className="rounded-lg p-2 text-blue-300 hover:bg-slate-800"><Edit3 size={17} /></button><button title="Excluir" onClick={async () => { if (confirm("Excluir esta requisição?")) { await api.delete(`/financeiro/requisicoes/${item.id}`); await carregar(); } }} className="rounded-lg p-2 text-rose-300 hover:bg-slate-800"><Trash2 size={17} /></button></div></td>
      </tr>)}</tbody></table></div>
      {!requisicoes.length && <p className="p-8 text-center text-slate-500">Nenhuma requisição cadastrada.</p>}
    </section>

    {modal && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-0 sm:p-3"><form onSubmit={salvar} className="max-h-screen w-full overflow-auto border-slate-700 bg-slate-950 sm:max-h-[96vh] sm:max-w-4xl sm:rounded-2xl sm:border">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-800 bg-slate-950 p-5"><div><p className="text-xs font-black uppercase tracking-[.2em] text-blue-300">Compras</p><h2 className="text-xl font-black">{editando ? "Atualizar requisição" : "Nova requisição"}</h2></div><button type="button" onClick={() => setModal(false)} className="p-2 text-slate-400"><X /></button></header>
      <div className="grid gap-4 p-5 md:grid-cols-2">
        <label className="space-y-1 text-sm font-bold md:col-span-2">Conta contábil<select required className={campo} value={form.contaContabilId} onChange={e => setForm({ ...form, contaContabilId: e.target.value })}><option value="">Selecione</option>{contas.map(conta => <option key={conta.id} value={conta.id}>{conta.nome} · {conta.ano}</option>)}</select></label>
        <label className="space-y-1 text-sm font-bold md:col-span-2">Item a ser comprado<input required className={campo} value={form.item} onChange={e => setForm({ ...form, item: e.target.value })} /></label>
        <label className="space-y-1 text-sm font-bold">Quantidade<input required min="1" type="number" className={campo} value={form.quantidade} onChange={e => setForm({ ...form, quantidade: e.target.value })} /></label>
        <label className="space-y-1 text-sm font-bold">Data prazo<span className="relative block"><input required type="date" className={campo} value={form.dataPrazo} onChange={e => setForm({ ...form, dataPrazo: e.target.value })} /><CalendarDays className="pointer-events-none absolute right-3 top-3 text-slate-500" size={17} /></span></label>
        <label className="space-y-1 text-sm font-bold">Valor mínimo<input required inputMode="numeric" className={campo} value={form.valorMinimo} onChange={e => setForm({ ...form, valorMinimo: mascaraMoeda(e.target.value) })} /></label>
        <label className="space-y-1 text-sm font-bold">Valor máximo<input required inputMode="numeric" className={campo} value={form.valorMaximo} onChange={e => setForm({ ...form, valorMaximo: mascaraMoeda(e.target.value) })} /></label>
        <label className="space-y-1 text-sm font-bold md:col-span-2">Finalidade<textarea required className={`${campo} h-24 py-3`} value={form.finalidade} onChange={e => setForm({ ...form, finalidade: e.target.value })} /></label>
        <label className="space-y-1 text-sm font-bold">Fornecedor sugerido <span className="font-normal text-slate-500">(opcional)</span><input className={campo} value={form.fornecedorSugerido} onChange={e => setForm({ ...form, fornecedorSugerido: e.target.value })} /></label>
        <label className="space-y-1 text-sm font-bold">Contato do fornecedor <span className="font-normal text-slate-500">(opcional)</span><input className={campo} value={form.contatoFornecedor} onChange={e => setForm({ ...form, contatoFornecedor: e.target.value })} /></label>
        {editando && <><div className="md:col-span-2 mt-2 border-t border-slate-800 pt-4"><h3 className="font-black text-blue-300">Acompanhamento da compra</h3></div>
          <label className="space-y-1 text-sm font-bold">Número da requisição<input className={campo} value={form.numeroRequisicao} onChange={e => setForm({ ...form, numeroRequisicao: e.target.value })} /></label>
          <label className="space-y-1 text-sm font-bold">Número do pedido no SAP<input className={campo} value={form.numeroPedidoSap} onChange={e => setForm({ ...form, numeroPedidoSap: e.target.value })} /></label>
          <label className="space-y-1 text-sm font-bold">Aprovação da requisição<input type="date" className={campo} value={form.dataAprovacaoRequisicao} onChange={e => setForm({ ...form, dataAprovacaoRequisicao: e.target.value })} /></label>
          <label className="space-y-1 text-sm font-bold">Aprovação do pedido<input type="date" className={campo} value={form.dataAprovacaoPedido} onChange={e => setForm({ ...form, dataAprovacaoPedido: e.target.value })} /></label>
          <label className="space-y-1 text-sm font-bold">Status<select className={campo} value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>{statusOpcoes.map(([valor, nome]) => <option key={valor} value={valor}>{nome}</option>)}</select></label>
          {form.status === "CONCLUIDO" && <label className="space-y-1 text-sm font-bold">Valor final da compra<input required inputMode="numeric" className={campo} value={form.valorConcluido} onChange={e => setForm({ ...form, valorConcluido: mascaraMoeda(e.target.value) })} /></label>}
        </>}
      </div>
      <footer className="sticky bottom-0 flex justify-end gap-2 border-t border-slate-800 bg-slate-950 p-4"><button type="button" onClick={() => setModal(false)} className="rounded-xl border border-slate-700 px-4 py-3 font-bold">Cancelar</button><button className="flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 font-black"><Save size={18} />Salvar</button></footer>
    </form></div>}
  </div>;
}
