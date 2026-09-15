import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { CheckCircle2, Pencil, Paperclip, Send, ShieldAlert } from "lucide-react";
import { useParams } from "react-router-dom";
import { api } from "../services/api";

const campo =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-normal text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-sky-400 focus:ring-2 focus:ring-sky-100";

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

type LocalPublico = {
  id: number;
  nome: string;
  tipo?: string | null;
  status: string;
  unidade: string;
};

export default function SolicitacaoImagemPublica() {
  const { token = "" } = useParams();
  const [form, setForm] = useState(formInicial);
  const [anexos, setAnexos] = useState<FileList | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [protocolo, setProtocolo] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [revisando, setRevisando] = useState(false);
  const [locais, setLocais] = useState<LocalPublico[]>([]);

  useEffect(() => {
    api
      .get(`/public/solicitacoes-imagens/${token}`)
      .then((resposta) => {
        setForm((atual) => ({ ...atual, email: resposta.data.email || "" }));
        setLocais(resposta.data.locais || []);
      })
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

  function abrirRevisao(event: FormEvent) {
    event.preventDefault();
    setErro("");
    setRevisando(true);
  }

  async function confirmarEnvio() {
    setErro("");
    setSalvando(true);
    try {
      const resposta = await api.post(
        `/public/solicitacoes-imagens/${token}`,
        montarFormData(),
      );
      setProtocolo(resposta.data.protocolo);
      setRevisando(false);
    } catch (error: any) {
      setErro(error?.response?.data?.error || "Não foi possível enviar a solicitação.");
    } finally {
      setSalvando(false);
    }
  }

  if (carregando) {
    return (
      <main className="solicitacao-imagem-publica flex min-h-screen items-center justify-center bg-slate-100 p-6 text-slate-700">
        Validando link...
      </main>
    );
  }

  if (protocolo) {
    return (
      <main className="solicitacao-imagem-publica flex min-h-screen items-center justify-center bg-slate-50 p-6">
        <section className="w-full max-w-xl rounded-xl border border-emerald-100 bg-white p-7 text-center shadow-[0_18px_45px_rgb(15_23_42/0.08)]">
          <CheckCircle2 className="mx-auto text-emerald-600" size={42} />
          <h1 className="mt-4 text-2xl font-black text-slate-950">
            Solicitação enviada
          </h1>
          <p className="mt-2 text-slate-600">
            Seu protocolo é <b>{protocolo}</b>. A equipe Segurança Patrimonial seguirá
            com a classificação e atendimento.
          </p>
        </section>
      </main>
    );
  }

  return (
    <main className="solicitacao-imagem-publica min-h-screen bg-slate-50 p-4 text-slate-900 sm:p-6">
      <section className="mx-auto max-w-4xl">
        <div className="mb-6 border-b border-slate-200 pb-6 text-center">
          <img
            src="/images/movecta-logo.png"
            alt="Movecta"
            className="mx-auto h-16 w-56 rounded-lg bg-white object-contain px-4 py-3 shadow-[0_10px_28px_rgb(15_23_42/0.05)]"
          />
          <h1 className="mt-6 text-3xl font-black text-slate-950">
            Investigação de Imagens
          </h1>
          <p className="mx-auto mt-2 max-w-2xl text-slate-600">
            Informe os dados necessários para localização e análise das imagens.
          </p>
        </div>

        {erro && (
          <div className="mb-4 flex gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
            <ShieldAlert size={18} />
            {erro}
          </div>
        )}

        <form onSubmit={abrirRevisao} className="rounded-xl border border-slate-100 bg-white p-5 text-slate-900 shadow-[0_18px_45px_rgb(15_23_42/0.08)]">
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
              <LocalPublicoComFiltro
                valor={form.local}
                locais={locais}
                onChange={(local) => setForm({ ...form, local })}
              />
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
            <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-slate-200 px-3 py-3 text-sm font-normal text-slate-700 hover:border-sky-400">
              <Paperclip size={18} />
              <span>{anexos?.length ? `${anexos.length} arquivo(s) selecionado(s)` : "Selecionar anexos"}</span>
              <input type="file" multiple onChange={(e) => setAnexos(e.target.files)} className="sr-only" />
            </label>
          </Label>
          <button disabled={salvando || Boolean(erro)} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-sky-600 px-4 py-3 font-black text-white hover:bg-sky-500 disabled:opacity-60">
            <Send size={18} />
            Salvar e revisar
          </button>
        </form>

        {revisando && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4">
            <section className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-xl border border-slate-100 bg-white p-5 shadow-[0_24px_70px_rgb(15_23_42/0.16)]">
              <div className="mb-4 border-b border-slate-200 pb-3">
                <p className="text-xs font-black uppercase text-sky-600">
                  Revisão
                </p>
                <h2 className="mt-1 text-2xl font-black text-slate-950">
                  Conferir solicitação antes do envio
                </h2>
              </div>

              <div className="grid gap-3 text-sm text-slate-700 md:grid-cols-2">
                <Resumo label="Nome" valor={form.nome} />
                <Resumo label="E-mail" valor={form.email} />
                <Resumo label="Setor" valor={form.setor} />
                <Resumo label="Cargo" valor={form.cargo} />
                <Resumo label="Título" valor={form.titulo} />
                <Resumo label="Local" valor={form.local} />
                <Resumo label="Data inicial" valor={form.dataOcorrencia} />
                <Resumo label="Data final" valor={form.dataFinalOcorrencia} />
                <Resumo label="Hora inicial" valor={form.horaInicial} />
                <Resumo label="Hora final" valor={form.horaFinal} />
              </div>
              <div className="mt-3">
                <Resumo label="Descrição" valor={form.descricao} />
              </div>
              <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs font-black uppercase text-slate-500">
                  Anexos
                </p>
                {anexos?.length ? (
                  <div className="mt-2 grid gap-2">
                    {Array.from(anexos).map((arquivo) => (
                      <div
                        key={`${arquivo.name}-${arquivo.size}`}
                        className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-normal text-slate-700"
                      >
                        {arquivo.name}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-2 text-sm font-semibold text-slate-500">
                    Nenhum anexo selecionado.
                  </p>
                )}
              </div>

              <div className="mt-5 flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  onClick={() => setRevisando(false)}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-slate-300 px-4 py-3 font-black text-slate-700 hover:border-slate-400"
                >
                  <Pencil size={18} />
                  Editar
                </button>
                <button
                  type="button"
                  disabled={salvando}
                  onClick={confirmarEnvio}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-sky-600 px-4 py-3 font-black text-white hover:bg-sky-500 disabled:opacity-60"
                >
                  <Send size={18} />
                  Confirmar e enviar
                </button>
              </div>
            </section>
          </div>
        )}
      </section>
    </main>
  );
}

function Resumo({ label, valor }: { label: string; valor?: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
      <p className="text-xs font-black uppercase text-slate-500">{label}</p>
      <p className="mt-1 break-words font-normal text-slate-900">
        {valor || "-"}
      </p>
    </div>
  );
}

function LocalPublicoComFiltro({
  valor,
  locais,
  onChange,
}: {
  valor: string;
  locais: LocalPublico[];
  onChange: (valor: string) => void;
}) {
  const listaId = "locais-publicos-solicitacao-imagem";

  return (
    <>
      <input
        value={valor}
        onChange={(event) => onChange(event.target.value)}
        list={listaId}
        className={campo}
        placeholder="Digite para filtrar um local cadastrado"
        autoComplete="off"
        required
      />
      <datalist id={listaId}>
        {locais.map((local) => (
          <option key={local.id} value={local.nome}>
            {local.tipo ? `${local.tipo} - ${local.unidade}` : local.unidade}
          </option>
        ))}
      </datalist>
      {locais.length === 0 && (
        <span className="mt-1 block text-xs font-normal text-amber-700">
          Nenhum local ativo encontrado para a unidade atual.
        </span>
      )}
    </>
  );
}

function Label({ texto, children }: { texto: string; children: React.ReactNode }) {
  return (
    <label className="mb-4 block text-sm font-semibold text-slate-700">
      <span className="mb-1 block">{texto}</span>
      {children}
    </label>
  );
}
