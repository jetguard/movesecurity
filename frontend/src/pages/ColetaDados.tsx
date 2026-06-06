import axios from "axios";
import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { useParams } from "react-router-dom";
import { AlertTriangle, CheckCircle2, FileUp, Loader2, Plus, Trash2 } from "lucide-react";

type EnvolvidoColeta = {
  tipoEnvolvimento: string;
  nome: string;
  tipoDocumento: string;
  documento: string;
  empresa: string;
  possuiVeiculo: boolean;
  placa: string;
  reboque: string;
  relato: string;
  audio?: File | null;
};

type LocalColeta = {
  id: number;
  nome: string;
  tipo: string;
  areaSensivel: boolean;
};

const envolvidoVazio: EnvolvidoColeta = {
  tipoEnvolvimento: "Envolvido",
  nome: "",
  tipoDocumento: "CPF",
  documento: "",
  empresa: "",
  possuiVeiculo: false,
  placa: "",
  reboque: "",
  relato: "",
  audio: null,
};

export default function ColetaDados() {
  const { token } = useParams();
  const [status, setStatus] = useState<"carregando" | "valido" | "erro" | "enviado">("carregando");
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [online, setOnline] = useState(navigator.onLine);
  const [rascunhoCarregado, setRascunhoCarregado] = useState(false);
  const [rascunhoSalvoEm, setRascunhoSalvoEm] = useState<string | null>(null);
  const [unidade, setUnidade] = useState("");
  const [locais, setLocais] = useState<LocalColeta[]>([]);
  const [evidencias, setEvidencias] = useState<File[]>([]);
  const [form, setForm] = useState({
    titulo: "",
    responsavelColeta: "",
    setor: "",
    local: "",
    dataOcorrido: "",
    observacoes: "",
  });
  const [envolvidos, setEnvolvidos] = useState<EnvolvidoColeta[]>([{ ...envolvidoVazio }]);
  const draftKey = useMemo(() => `jetguard-coleta-dados-${token || "sem-token"}`, [token]);

  useEffect(() => {
    axios.get(`/api/public/relatos-campo/coleta/${token}`)
      .then((response) => {
        setUnidade(response.data.unidade || "");
        setLocais(Array.isArray(response.data.locais) ? response.data.locais : []);
        setStatus("valido");
      })
      .catch((error) => {
        setErro(error.response?.data?.error || "Link de coleta inválido ou expirado.");
        setStatus("erro");
      });
  }, [token]);

  useEffect(() => {
    function atualizarOnline() {
      setOnline(navigator.onLine);
    }

    window.addEventListener("online", atualizarOnline);
    window.addEventListener("offline", atualizarOnline);
    return () => {
      window.removeEventListener("online", atualizarOnline);
      window.removeEventListener("offline", atualizarOnline);
    };
  }, []);

  useEffect(() => {
    const salvo = localStorage.getItem(draftKey);
    if (salvo) {
      try {
        const dados = JSON.parse(salvo) as {
          form?: typeof form;
          envolvidos?: Array<Omit<EnvolvidoColeta, "audio">>;
          salvoEm?: string;
        };
        if (dados.form) setForm((atual) => ({ ...atual, ...dados.form }));
        if (Array.isArray(dados.envolvidos) && dados.envolvidos.length > 0) {
          setEnvolvidos(dados.envolvidos.map((envolvido) => ({ ...envolvido, audio: null })));
        }
        setRascunhoSalvoEm(dados.salvoEm || null);
      } catch {
        // Rascunho corrompido é ignorado para não impedir a coleta.
      }
    }
    setRascunhoCarregado(true);
  }, [draftKey]);

  useEffect(() => {
    if (!rascunhoCarregado || status === "enviado") return;

    const timeout = window.setTimeout(() => {
      const salvoEm = new Date().toISOString();
      localStorage.setItem(
        draftKey,
        JSON.stringify({
          form,
          envolvidos: envolvidos.map(({ audio, ...envolvido }) => envolvido),
          salvoEm,
        })
      );
      setRascunhoSalvoEm(salvoEm);
    }, 350);

    return () => window.clearTimeout(timeout);
  }, [draftKey, envolvidos, form, rascunhoCarregado, status]);

  function atualizarEnvolvido(index: number, campo: keyof EnvolvidoColeta, valor: string | boolean | File | null) {
    setEnvolvidos((atuais) => atuais.map((item, i) => i === index ? { ...item, [campo]: valor } : item));
  }

  function adicionarEnvolvido() {
    setEnvolvidos((atuais) => [...atuais, { ...envolvidoVazio }]);
  }

  function removerEnvolvido(index: number) {
    setEnvolvidos((atuais) => atuais.length === 1 ? atuais : atuais.filter((_, i) => i !== index));
  }

  async function enviar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!online) {
      setErro("Você está offline. Os dados foram preservados neste aparelho. Conecte-se à internet para enviar.");
      return;
    }

    const confirmar = window.confirm(
      "Deseja realmente enviar os dados coletados?\n\nApós o envio, esta ação não poderá ser refeita por este link. Caso falte alguma informação, entre em contato imediatamente com Centro de Controle Operacional de Segurança - CCOS."
    );
    if (!confirmar) return;

    setEnviando(true);
    setErro("");

    try {
      const formData = new FormData();
      Object.entries(form).forEach(([chave, valor]) => formData.append(chave, valor));
      formData.append("envolvidos", JSON.stringify(envolvidos.map(({ audio, ...envolvido }) => envolvido)));
      evidencias.forEach((arquivo) => formData.append("anexos", arquivo));
      envolvidos.forEach((envolvido, index) => {
        if (envolvido.audio) formData.append(`audio_${index}`, envolvido.audio);
      });

      await axios.post(`/api/public/relatos-campo/coleta/${token}`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      localStorage.removeItem(draftKey);
      setStatus("enviado");
    } catch (error: unknown) {
      const apiError = error as { response?: { data?: { error?: string } } };
      setErro(apiError.response?.data?.error || "Não foi possível enviar a coleta.");
    } finally {
      setEnviando(false);
    }
  }

  if (status === "carregando") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        <div className="flex items-center gap-3 rounded-3xl border border-white/10 bg-white/5 px-6 py-5">
          <Loader2 className="animate-spin" />
          Validando link de coleta...
        </div>
      </div>
    );
  }

  if (status === "erro") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 p-4 text-white">
        <div className="max-w-md rounded-3xl border border-red-400/30 bg-red-500/10 p-6 text-center">
          <AlertTriangle className="mx-auto text-red-200" size={40} />
          <h1 className="mt-4 text-2xl font-black">Link indisponível</h1>
          <p className="mt-2 text-sm text-red-100">{erro}</p>
        </div>
      </div>
    );
  }

  if (status === "enviado") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 p-4 text-white">
        <div className="max-w-lg rounded-3xl border border-emerald-400/30 bg-emerald-500/10 p-8 text-center">
          <CheckCircle2 className="mx-auto text-emerald-200" size={46} />
          <h1 className="mt-4 text-2xl font-black">Coleta enviada com sucesso</h1>
          <p className="mt-2 text-sm text-emerald-100">Obrigado. O link foi finalizado e os dados já estão disponíveis para análise no JetGuard.</p>
        </div>
      </div>
    );
  }

  const localSelecionado = locais.find((local) => local.nome === form.local);

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-6 text-white sm:px-6">
      <div className="mx-auto max-w-5xl">
        <header className="mb-6 rounded-3xl border border-white/10 bg-white/5 p-5 shadow-2xl">
          <p className="text-xs font-black uppercase tracking-[0.28em] text-blue-300">JetGuard</p>
          <h1 className="mt-2 text-3xl font-black">Coleta de Dados para Relatório Patrimonial</h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-300">
            Preencha as informações coletadas em campo. Este link é temporário e será encerrado automaticamente após o envio.
          </p>
          <span className="mt-4 inline-flex rounded-full bg-blue-500/15 px-3 py-1 text-xs font-black text-blue-100">Unidade: {unidade}</span>
          <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold">
            <span className={`rounded-full px-3 py-1 ${online ? "bg-emerald-500/15 text-emerald-100" : "bg-red-500/15 text-red-100"}`}>
              {online ? "Online" : "Offline - rascunho preservado"}
            </span>
            <span className="rounded-full bg-white/10 px-3 py-1 text-slate-200">
              {rascunhoSalvoEm ? `Salvo automaticamente em ${new Date(rascunhoSalvoEm).toLocaleString("pt-BR")}` : "Salvamento automático ativo"}
            </span>
          </div>
        </header>

        <div className="mb-5 rounded-3xl border border-amber-400/25 bg-amber-500/10 p-4 text-sm font-semibold text-amber-50">
          Os campos digitados são salvos automaticamente neste aparelho, inclusive se a conexão cair ou a bateria acabar. Se a página for reaberta, confira os dados e reanexe arquivos/áudios se necessário antes de enviar.
        </div>

        <form onSubmit={enviar} className="space-y-5">
          <section className="rounded-3xl border border-white/10 bg-white/5 p-5">
            <h2 className="mb-4 text-lg font-black">Dados do acontecimento</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <input required value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} placeholder="Título do acontecimento" className="rounded-xl border border-white/10 bg-slate-900 px-4 py-3 outline-none focus:border-blue-400" />
              <input required value={form.responsavelColeta} onChange={(e) => setForm({ ...form, responsavelColeta: e.target.value })} placeholder="Nome do responsável pela coleta" className="rounded-xl border border-white/10 bg-slate-900 px-4 py-3 outline-none focus:border-blue-400" />
              <input value={form.setor} onChange={(e) => setForm({ ...form, setor: e.target.value })} placeholder="Setor" className="rounded-xl border border-white/10 bg-slate-900 px-4 py-3 outline-none focus:border-blue-400" />
              <label className="space-y-2">
                <select
                  required
                  value={form.local}
                  onChange={(e) => setForm({ ...form, local: e.target.value })}
                  className="w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 outline-none focus:border-blue-400"
                >
                  <option value="">Selecione o local do ocorrido</option>
                  {locais.map((local) => (
                    <option key={local.id} value={local.nome}>
                      {local.nome} - {local.tipo}{local.areaSensivel ? " - ÁREA SENSÍVEL" : ""}
                    </option>
                  ))}
                </select>
                {locais.length === 0 && (
                  <span className="block text-xs font-semibold text-amber-200">
                    Nenhum local ativo cadastrado para esta unidade. Acione o CCOS para regularizar o cadastro.
                  </span>
                )}
                {localSelecionado?.areaSensivel && (
                  <span className="inline-flex rounded-full border border-amber-300/40 bg-amber-500/15 px-3 py-1 text-xs font-black text-amber-100">
                    Área sensível
                  </span>
                )}
              </label>
              <label className="md:col-span-2">
                <span className="mb-2 block text-sm font-bold text-slate-300">Data e hora do ocorrido</span>
                <input required type="datetime-local" value={form.dataOcorrido} onChange={(e) => setForm({ ...form, dataOcorrido: e.target.value })} className="w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 outline-none focus:border-blue-400" />
              </label>
            </div>
            <textarea value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} placeholder="Observações gerais da coleta" className="mt-4 min-h-24 w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 outline-none focus:border-blue-400" />
          </section>

          <section className="rounded-3xl border border-white/10 bg-white/5 p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-black">Partes envolvidas</h2>
              <button type="button" onClick={adicionarEnvolvido} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-3 py-2 text-sm font-black transition hover:bg-blue-500">
                <Plus size={16} />
                Adicionar envolvido
              </button>
            </div>
            <div className="space-y-4">
              {envolvidos.map((envolvido, index) => (
                <div key={index} className="rounded-2xl border border-white/10 bg-slate-900/80 p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <p className="font-black">Envolvido {index + 1}</p>
                    {envolvidos.length > 1 && (
                      <button type="button" onClick={() => removerEnvolvido(index)} className="rounded-xl bg-red-500/15 p-2 text-red-100 transition hover:bg-red-500/25">
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <select value={envolvido.tipoEnvolvimento} onChange={(e) => atualizarEnvolvido(index, "tipoEnvolvimento", e.target.value)} className="rounded-xl border border-white/10 bg-slate-950 px-4 py-3">
                      <option>Envolvido</option>
                      <option>Condutor</option>
                      <option>Testemunha</option>
                      <option>Vítima</option>
                      <option>Funcionário</option>
                      <option>Terceiro</option>
                    </select>
                    <input required value={envolvido.nome} onChange={(e) => atualizarEnvolvido(index, "nome", e.target.value)} placeholder="Nome do envolvido" className="rounded-xl border border-white/10 bg-slate-950 px-4 py-3" />
                    <select value={envolvido.tipoDocumento} onChange={(e) => atualizarEnvolvido(index, "tipoDocumento", e.target.value)} className="rounded-xl border border-white/10 bg-slate-950 px-4 py-3">
                      <option>CPF</option>
                      <option>RG</option>
                      <option>CNH</option>
                      <option>Passaporte</option>
                      <option>Outro</option>
                    </select>
                    <input value={envolvido.documento} onChange={(e) => atualizarEnvolvido(index, "documento", e.target.value)} placeholder="Documento" className="rounded-xl border border-white/10 bg-slate-950 px-4 py-3" />
                    <input value={envolvido.empresa} onChange={(e) => atualizarEnvolvido(index, "empresa", e.target.value)} placeholder="Empresa" className="rounded-xl border border-white/10 bg-slate-950 px-4 py-3" />
                    <label className="flex items-center gap-2 rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-sm font-bold">
                      <input type="checkbox" checked={envolvido.possuiVeiculo} onChange={(e) => atualizarEnvolvido(index, "possuiVeiculo", e.target.checked)} />
                      Possui veículo
                    </label>
                    {envolvido.possuiVeiculo && (
                      <>
                        <input value={envolvido.placa} onChange={(e) => atualizarEnvolvido(index, "placa", e.target.value.toUpperCase())} placeholder="Placa" className="rounded-xl border border-white/10 bg-slate-950 px-4 py-3 uppercase" />
                        <input value={envolvido.reboque} onChange={(e) => atualizarEnvolvido(index, "reboque", e.target.value.toUpperCase())} placeholder="Reboque" className="rounded-xl border border-white/10 bg-slate-950 px-4 py-3 uppercase" />
                      </>
                    )}
                  </div>
                  <textarea required value={envolvido.relato} onChange={(e) => atualizarEnvolvido(index, "relato", e.target.value)} placeholder="Relato do envolvido" className="mt-3 min-h-28 w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3" />
                  <label className="mt-3 flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-blue-400/40 bg-blue-500/10 px-4 py-4 text-center text-sm font-bold text-blue-100 transition hover:bg-blue-500/15">
                    <FileUp size={20} />
                    {envolvido.audio ? envolvido.audio.name : "Anexar áudio do relato, se houver"}
                    <input type="file" accept="audio/*" className="hidden" onChange={(e) => atualizarEnvolvido(index, "audio", e.target.files?.[0] || null)} />
                  </label>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-3xl border border-white/10 bg-white/5 p-5">
            <h2 className="mb-4 text-lg font-black">Evidências do local</h2>
            <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-blue-400/40 bg-slate-900 px-4 py-8 text-center text-sm font-bold text-blue-100 transition hover:bg-blue-500/10">
              <FileUp size={24} />
              Anexar fotos, PDFs ou documentos
              <input type="file" multiple accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.txt" className="hidden" onChange={(e) => setEvidencias(Array.from(e.target.files || []))} />
            </label>
            {evidencias.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {evidencias.map((arquivo, index) => <span key={`${arquivo.name}-${index}`} className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold">{arquivo.name}</span>)}
              </div>
            )}
          </section>

          {erro && <p className="rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-100">{erro}</p>}

          <button disabled={enviando} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-4 text-base font-black text-white shadow-2xl shadow-blue-950/30 transition hover:bg-blue-500 disabled:bg-slate-600">
            {enviando ? <Loader2 className="animate-spin" /> : <CheckCircle2 />}
            Enviar coleta de dados
          </button>
        </form>
      </div>
    </div>
  );
}
