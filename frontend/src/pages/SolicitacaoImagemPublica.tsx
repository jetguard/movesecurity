import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { CheckCircle2, Paperclip, Send, ShieldAlert } from "lucide-react";
import { useParams } from "react-router-dom";
import { api } from "../services/api";

const campo =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20";

const formInicial = {
  nome: "",
  email: "",
  setor: "",
  cargo: "",
  titulo: "",
  dataOcorrencia: "",
  dataFinalOcorrencia: "",
  horaInicial: "",
  horaFinal: "",
  local: "",
  descricao: "",
};

export default function SolicitacaoImagemPublica() {
  const { token = "" } = useParams();
  const [form, setForm] = useState(formInicial);
  const [anexos, setAnexos] = useState<FileList | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [protocolo, setProtocolo] = useState("");
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    api
      .get(`/public/solicitacoes-imagens/${token}`)
      .then((resposta) =>
        setForm((atual) => ({ ...atual, email: resposta.data.email || "" })),
      )
      .catch((error) =>
        setErro(error?.response?.data?.error || "Link inválido ou expirado."),
      )
      .finally(() => setCarregando(false));
  }, [token]);

  function montarFormData() {
    const dados = new FormData();
    Object.entries(form).forEach(([chave, valor]) => dados.append(chave, valor));
    Array.from(anexos || []).forEach((arquivo) => dados.append("anexos", arquivo));
    return dados;
  }

  function alterarDataInicial(dataOcorrencia: string) {
    setForm({
      ...form,
      dataOcorrencia,
      dataFinalOcorrencia:
        !form.dataFinalOcorrencia ||
        form.dataFinalOcorrencia === form.dataOcorrencia
          ? dataOcorrencia
          : form.dataFinalOcorrencia,
    });
  }

  async function enviar(event: FormEvent) {
    event.preventDefault();
    setErro("");
    setSalvando(true);
    try {
      const resposta = await api.post(
        `/public/solicitacoes-imagens/${token}`,
        montarFormData(),
      );
      setProtocolo(resposta.data.protocolo);
    } catch (error: any) {
      setErro(error?.response?.data?.error || "Não foi possível enviar a solicitação.");
    } finally {
      setSalvando(false);
    }
  }

  if (carregando) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100 p-6 text-slate-700">
        Validando link...
      </main>
    );
  }

  if (protocolo) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100 p-6">
        <section className="w-full max-w-xl rounded-xl border border-emerald-200 bg-white p-6 text-center shadow-sm">
          <CheckCircle2 className="mx-auto text-emerald-600" size={42} />
          <h1 className="mt-4 text-2xl font-black text-slate-950">
            Solicitação enviada
          </h1>
          <p className="mt-2 text-slate-600">
            Seu protocolo é <b>{protocolo}</b>. A equipe MoveSecurity seguirá
            com a classificação e atendimento.
          </p>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 p-4 sm:p-6">
      <section className="mx-auto max-w-4xl">
        <div className="mb-6 border-b border-slate-300 pb-5">
          <img
            src="/images/movecta-logo.png"
            alt="Movecta"
            className="h-12 w-44 rounded bg-white object-contain px-3 py-2"
          />
          <h1 className="mt-5 text-3xl font-black text-slate-950">
            Solicitação de Imagens
          </h1>
          <p className="mt-2 text-slate-600">
            Informe os dados necessários para localização das imagens.
          </p>
        </div>

        {erro && (
          <div className="mb-4 flex gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
            <ShieldAlert size={18} />
            {erro}
          </div>
        )}

        <form onSubmit={enviar} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="grid gap-4 md:grid-cols-2">
            <Label texto="Nome">
              <input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} className={campo} required />
            </Label>
            <Label texto="E-mail">
              <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={campo} required />
            </Label>
            <Label texto="Setor">
              <input value={form.setor} onChange={(e) => setForm({ ...form, setor: e.target.value })} className={campo} />
            </Label>
            <Label texto="Cargo">
              <input value={form.cargo} onChange={(e) => setForm({ ...form, cargo: e.target.value })} className={campo} />
            </Label>
            <Label texto="Título">
              <input value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} className={campo} required />
            </Label>
            <Label texto="Local">
              <input value={form.local} onChange={(e) => setForm({ ...form, local: e.target.value })} className={campo} />
            </Label>
            <Label texto="Data da ocorrência">
              <input type="date" value={form.dataOcorrencia} onChange={(e) => alterarDataInicial(e.target.value)} className={campo} />
            </Label>
            <Label texto="Data final">
              <input type="date" value={form.dataFinalOcorrencia} min={form.dataOcorrencia || undefined} onChange={(e) => setForm({ ...form, dataFinalOcorrencia: e.target.value })} className={campo} />
            </Label>
            <Label texto="Hora inicial">
              <input type="time" value={form.horaInicial} onChange={(e) => setForm({ ...form, horaInicial: e.target.value })} className={campo} />
            </Label>
            <Label texto="Hora final">
              <input type="time" value={form.horaFinal} onChange={(e) => setForm({ ...form, horaFinal: e.target.value })} className={campo} />
            </Label>
          </div>
          <Label texto="Descrição">
            <textarea value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} className={`${campo} min-h-32`} required />
          </Label>
          <Label texto="Anexos">
            <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-slate-300 px-3 py-3 text-sm font-bold text-slate-700 hover:border-sky-500">
              <Paperclip size={18} />
              <span>{anexos?.length ? `${anexos.length} arquivo(s) selecionado(s)` : "Selecionar anexos"}</span>
              <input type="file" multiple onChange={(e) => setAnexos(e.target.files)} className="sr-only" />
            </label>
          </Label>
          <button disabled={salvando || Boolean(erro)} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-sky-600 px-4 py-3 font-black text-white hover:bg-sky-500 disabled:opacity-60">
            <Send size={18} />
            Enviar solicitação
          </button>
        </form>
      </section>
    </main>
  );
}

function Label({ texto, children }: { texto: string; children: React.ReactNode }) {
  return (
    <label className="mb-4 block text-sm font-bold text-slate-700">
      <span className="mb-1 block">{texto}</span>
      {children}
    </label>
  );
}
