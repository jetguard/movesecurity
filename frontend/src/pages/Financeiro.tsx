import { useEffect, useState } from "react";
import { CircleDollarSign, Plus, Save, Trash2, X } from "lucide-react";
import { api } from "../services/api";

type Servico = { tipoServico: string; modalidade: "PESSOA" | "SERVICO"; turno: string; valor: string; valorDiario: string; horasJornada: string };
type Fornecedor = { id: number; nomeEmpresa: string; tipoServico: string; valorMensal: string; contaContabilId?: number | null; status: string; servicos: Array<Servico & { id: number }> };
type Conta = { id: number; nome: string; categoria: string; ano: number; valorOrcado: string; observacoes?: string };
const moeda = (v: unknown) => Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const numeroMoeda = (valor: unknown) => {
  const texto = String(valor ?? "").replace(/R\$|\s/g, "");
  const normalizado = texto.includes(",") ? texto.replace(/\./g, "").replace(",", ".") : texto;
  const numero = Number(normalizado);
  return Number.isFinite(numero) ? numero : 0;
};
const mascaraMoeda = (valor: string) => {
  const digitos = valor.replace(/\D/g, "");
  if (!digitos) return "";
  return (Number(digitos) / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
};
const moedaInput = (valor: unknown) => valor ? Number(valor).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "";
const servicoVazio = (): Servico => ({ tipoServico: "", modalidade: "PESSOA", turno: "DIURNO", valor: "", valorDiario: "", horasJornada: "8" });

export default function Financeiro() {
  const [aba, setAba] = useState<"resumo" | "fornecedores" | "contas">("resumo");
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [contas, setContas] = useState<Conta[]>([]);
  const [resumo, setResumo] = useState<any>({});
  const [modalFornecedor, setModalFornecedor] = useState(false);
  const [modalConta, setModalConta] = useState(false);
  const [editandoFornecedor, setEditandoFornecedor] = useState<number | null>(null);
  const [editandoConta, setEditandoConta] = useState<number | null>(null);
  const [fornecedor, setFornecedor] = useState({ nomeEmpresa: "", tipoServico: "Manutenção", valorMensal: "", contaContabilId: "", status: "ATIVO", servicos: [servicoVazio()] });
  const [conta, setConta] = useState({ nome: "", categoria: "Segurança", ano: String(new Date().getFullYear()), valorOrcado: "", observacoes: "", status: "ATIVO" });
  async function carregar() { const [f, c, r] = await Promise.all([api.get("/financeiro/fornecedores"), api.get("/financeiro/contas"), api.get("/financeiro/resumo")]); setFornecedores(f.data); setContas(c.data); setResumo(r.data); }
  useEffect(() => { carregar(); }, []);
  useEffect(() => {
    if (!modalFornecedor) return;
    setFornecedor((atual) => ({
      ...atual,
      valorMensal: atual.valorMensal.startsWith("R$") ? atual.valorMensal : moedaInput(atual.valorMensal),
      servicos: atual.servicos.map((servico) => ({
        ...servico,
        valor: servico.valor.startsWith("R$") ? servico.valor : moedaInput(servico.valor),
        valorDiario: servico.valorDiario.startsWith("R$") ? servico.valorDiario : moedaInput(servico.valorDiario),
      })),
    }));
  }, [modalFornecedor]);
  useEffect(() => {
    if (!modalConta) return;
    setConta((atual) => ({
      ...atual,
      valorOrcado: atual.valorOrcado.startsWith("R$") ? atual.valorOrcado : moedaInput(atual.valorOrcado),
    }));
  }, [modalConta]);
  async function salvarFornecedor(e: React.FormEvent) { e.preventDefault(); await api[editandoFornecedor ? "put" : "post"](`/financeiro/fornecedores${editandoFornecedor ? `/${editandoFornecedor}` : ""}`, fornecedor); setModalFornecedor(false); await carregar(); }
  async function salvarConta(e: React.FormEvent) { e.preventDefault(); await api[editandoConta ? "put" : "post"](`/financeiro/contas${editandoConta ? `/${editandoConta}` : ""}`, conta); setModalConta(false); await carregar(); }
  const campo = "h-11 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 text-white outline-none focus:border-blue-400";
  return <div className="space-y-5 text-white">
    <header className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-950 p-5"><div><p className="text-xs font-black uppercase tracking-[.2em] text-emerald-300">Gestão por unidade</p><h1 className="text-2xl font-black">Financeiro</h1><p className="text-sm text-slate-400">Contratos, fornecedores e orçamento contábil.</p></div><CircleDollarSign size={38} className="text-emerald-400" /></header>
    <div className="flex gap-2 overflow-x-auto">{([['resumo','Visão geral'],['fornecedores','Fornecedores'],['contas','Contas contábeis']] as const).map(([id,nome])=><button key={id} onClick={()=>setAba(id)} className={`rounded-xl px-4 py-2 text-sm font-bold ${aba===id?'bg-blue-600':'bg-slate-900 text-slate-300'}`}>{nome}</button>)}</div>
    {aba === "resumo" && <>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{[
        ["Orçamento anual",resumo.orcadoAnual], ["Contratado mensal",resumo.contratadoMensal],
        ["Contratado anual",resumo.contratadoAnual], ["Compras concluídas",resumo.comprasConcluidasValor],
        ["Saldo do orçamento",resumo.saldoOrcamento],
      ].map(([l,v])=><div key={String(l)} className="rounded-2xl border border-slate-800 bg-slate-900 p-5"><p className="text-sm text-slate-400">{l}</p><p className="mt-2 text-3xl font-black text-emerald-300">{moeda(v)}</p>{l === "Compras concluídas" && <p className="mt-1 text-xs text-slate-500">{resumo.comprasConcluidas || 0} pedido(s)</p>}</div>)}</div>
      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5"><h2 className="font-black">Execução por conta contábil</h2><div className="mt-4 overflow-x-auto"><table className="w-full min-w-[650px] text-sm"><thead className="text-left text-xs uppercase text-slate-500"><tr><th className="p-2">Conta</th><th className="p-2">Orçado</th><th className="p-2">Compras concluídas</th><th className="p-2">Saldo</th><th className="p-2">Utilizado</th></tr></thead><tbody>{(resumo.comprasPorConta || []).map((item:any)=><tr key={item.id} className="border-t border-slate-800"><td className="p-2 font-bold">{item.nome}<span className="ml-2 text-xs font-normal text-slate-500">{item.categoria}</span></td><td className="p-2">{moeda(item.orcado)}</td><td className="p-2 text-emerald-300">{moeda(item.realizado)}</td><td className="p-2">{moeda(item.saldo)}</td><td className="p-2">{Number(item.percentualUsado || 0).toFixed(1)}%</td></tr>)}</tbody></table></div></div>
      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5"><h2 className="font-black">Descontos por faltas no ano</h2><div className="mt-4 grid grid-cols-6 gap-2 md:grid-cols-12">{(resumo.descontosPorMes||[]).map((i:any)=><div key={i.mes} className="rounded-lg bg-slate-950 p-2 text-center"><p className="text-xs text-slate-500">{i.mes}</p><p className="text-xs font-bold text-rose-300">{moeda(i.valor)}</p></div>)}</div></div>
    </>}
    {aba === "fornecedores" && <section className="rounded-2xl border border-slate-800 bg-slate-950 p-4"><div className="mb-4 flex justify-between"><h2 className="text-lg font-black">Fornecedores</h2><button onClick={()=>{setEditandoFornecedor(null);setFornecedor({nomeEmpresa:"",tipoServico:"Manutenção",valorMensal:"",contaContabilId:"",status:"ATIVO",servicos:[servicoVazio()]});setModalFornecedor(true)}} className="flex items-center gap-2 rounded-xl bg-blue-600 px-3 py-2 font-bold"><Plus size={16}/>Novo</button></div><div className="space-y-2">{fornecedores.map(f=><div key={f.id} className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900 p-3"><div><p className="font-bold">{f.nomeEmpresa}</p><p className="text-xs text-slate-400">{f.tipoServico} · {moeda(f.valorMensal)}/mês · {f.servicos.length} serviço(s)</p></div><div className="flex gap-2"><button onClick={()=>{setEditandoFornecedor(f.id);setFornecedor({...f,contaContabilId:f.contaContabilId?String(f.contaContabilId):"",valorMensal:String(f.valorMensal),servicos:f.servicos.map(s=>({...s,valor:String(s.valor),valorDiario:String(s.valorDiario||''),horasJornada:String(s.horasJornada||8)}))});setModalFornecedor(true)}} className="rounded-lg bg-slate-800 px-3 py-2">Editar</button><button onClick={async()=>{await api.delete(`/financeiro/fornecedores/${f.id}`);carregar()}} className="p-2 text-rose-300"><Trash2 size={17}/></button></div></div>)}</div></section>}
    {aba === "contas" && <section className="rounded-2xl border border-slate-800 bg-slate-950 p-4"><div className="mb-4 flex justify-between"><h2 className="text-lg font-black">Contas contábeis</h2><button onClick={()=>{setEditandoConta(null);setModalConta(true)}} className="flex items-center gap-2 rounded-xl bg-blue-600 px-3 py-2 font-bold"><Plus size={16}/>Nova</button></div>{contas.map(c=><div key={c.id} className="mb-2 flex justify-between rounded-xl bg-slate-900 p-3"><div><p className="font-bold">{c.nome}</p><p className="text-xs text-slate-400">{c.categoria} · {c.ano} · {moeda(c.valorOrcado)}</p></div><button onClick={()=>{setEditandoConta(c.id);setConta({...c,ano:String(c.ano),valorOrcado:String(c.valorOrcado),observacoes:c.observacoes||'',status:'ATIVO'});setModalConta(true)}}>Editar</button></div>)}</section>}
    {modalFornecedor && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-2"><form onSubmit={salvarFornecedor} className="max-h-[96vh] w-full max-w-3xl overflow-auto rounded-2xl border border-slate-700 bg-slate-950 p-5"><div className="mb-4 flex justify-between"><h2 className="text-xl font-black">Fornecedor</h2><button type="button" onClick={()=>setModalFornecedor(false)}><X/></button></div><div className="grid gap-3 md:grid-cols-2"><input required className={campo} placeholder="Nome da empresa" value={fornecedor.nomeEmpresa} onChange={e=>setFornecedor({...fornecedor,nomeEmpresa:e.target.value})}/><select className={campo} value={fornecedor.tipoServico} onChange={e=>setFornecedor({...fornecedor,tipoServico:e.target.value})}>{["Manutenção","Serviço de vigilância e controlador de acesso","Consultoria","Outros"].map(x=><option key={x}>{x}</option>)}</select><input className={campo} type="text" inputMode="numeric" placeholder="Valor mensal (R$)" value={fornecedor.valorMensal} onChange={e=>setFornecedor({...fornecedor,valorMensal:mascaraMoeda(e.target.value)})}/><select required className={campo} value={fornecedor.contaContabilId} onChange={e=>setFornecedor({...fornecedor,contaContabilId:e.target.value})}><option value="">Selecione a conta contábil</option>{contas.filter(c=>c.ano===new Date().getFullYear()).map(c=><option key={c.id} value={c.id}>{c.nome} · {c.categoria}</option>)}</select></div><h3 className="mb-2 mt-5 font-black">Serviços e profissionais</h3>{fornecedor.servicos.map((s,i)=><div key={i} className="mb-3 grid gap-2 rounded-xl border border-slate-800 p-3 md:grid-cols-3"><input required className={campo} placeholder="Ex.: Vigilante" value={s.tipoServico} onChange={e=>setFornecedor({...fornecedor,servicos:fornecedor.servicos.map((x,n)=>n===i?{...x,tipoServico:e.target.value}:x)})}/><select className={campo} value={s.modalidade} onChange={e=>setFornecedor({...fornecedor,servicos:fornecedor.servicos.map((x,n)=>n===i?{...x,modalidade:e.target.value as any}:x)})}><option value="PESSOA">Por pessoa</option><option value="SERVICO">Por serviço prestado</option></select><select className={campo} value={s.turno} onChange={e=>setFornecedor({...fornecedor,servicos:fornecedor.servicos.map((x,n)=>n===i?{...x,turno:e.target.value}:x)})}><option>DIURNO</option><option>NOTURNO</option><option>AMBOS</option></select><input required className={campo} type="text" inputMode="numeric" placeholder="Valor (R$)" value={s.valor} onChange={e=>setFornecedor({...fornecedor,servicos:fornecedor.servicos.map((x,n)=>n===i?{...x,valor:mascaraMoeda(e.target.value)}:x)})}/>{s.modalidade==='PESSOA'&&<><input required className={campo} type="text" inputMode="numeric" placeholder="Valor diário" value={s.valorDiario} onChange={e=>setFornecedor({...fornecedor,servicos:fornecedor.servicos.map((x,n)=>n===i?{...x,valorDiario:mascaraMoeda(e.target.value)}:x)})}/><input required className={campo} type="number" placeholder="Horas da jornada" value={s.horasJornada} onChange={e=>setFornecedor({...fornecedor,servicos:fornecedor.servicos.map((x,n)=>n===i?{...x,horasJornada:e.target.value}:x)})}/><p className="text-xs text-emerald-300">Média/hora: {moeda(numeroMoeda(s.valorDiario)/Math.max(1,Number(s.horasJornada||8)))}</p></>}<button type="button" onClick={()=>setFornecedor({...fornecedor,servicos:fornecedor.servicos.filter((_,n)=>n!==i)})} className="text-rose-300">Remover</button></div>)}<button type="button" onClick={()=>setFornecedor({...fornecedor,servicos:[...fornecedor.servicos,servicoVazio()]})} className="mb-5 rounded-xl border border-blue-500 px-3 py-2">+ Acrescentar serviço</button><button className="flex w-full justify-center gap-2 rounded-xl bg-emerald-600 p-3 font-black"><Save size={18}/>Salvar</button></form></div>}
    {modalConta && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-2"><form onSubmit={salvarConta} className="w-full max-w-lg rounded-2xl border border-slate-700 bg-slate-950 p-5"><h2 className="mb-4 text-xl font-black">Conta contábil</h2><div className="space-y-3"><input required className={campo} placeholder="Nome da conta" value={conta.nome} onChange={e=>setConta({...conta,nome:e.target.value})}/><select className={campo} value={conta.categoria} onChange={e=>setConta({...conta,categoria:e.target.value})}>{["Segurança","Manutenção","Consultoria","Compras","Outros"].map(x=><option key={x}>{x}</option>)}</select><input required className={campo} type="number" value={conta.ano} onChange={e=>setConta({...conta,ano:e.target.value})}/><input required className={campo} type="text" inputMode="numeric" placeholder="Valor anual orçado (R$)" value={conta.valorOrcado} onChange={e=>setConta({...conta,valorOrcado:mascaraMoeda(e.target.value)})}/><textarea className={campo} placeholder="Observações" value={conta.observacoes} onChange={e=>setConta({...conta,observacoes:e.target.value})}/></div><div className="mt-4 flex justify-end gap-2"><button type="button" onClick={()=>setModalConta(false)} className="rounded-xl border border-slate-700 px-4">Cancelar</button><button className="rounded-xl bg-emerald-600 p-3 font-black">Salvar</button></div></form></div>}
  </div>;
}
