import axios from "axios";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { CheckCircle2, Download, ShieldCheck, XCircle } from "lucide-react";

type CertificadoValidado = {
  valido: boolean;
  codigo: string;
  nomeCompleto: string;
  cpf: string;
  empresa: string;
  cargo: string;
  email: string;
  concluidoEm: string;
  certificadoUrl: string;
};

function data(valor?: string) {
  return valor ? new Date(valor).toLocaleString("pt-BR") : "-";
}

export default function ValidarCertificadoIntegracao() {
  const { token } = useParams();
  const [certificado, setCertificado] = useState<CertificadoValidado | null>(null);
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    setCarregando(true);
    axios
      .get(`/api/public/integracao-terminal/${token}/validar`)
      .then((response) => setCertificado(response.data))
      .catch((error) => setErro(error.response?.data?.error || "Certificado nao encontrado."))
      .finally(() => setCarregando(false));
  }, [token]);

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-white">
      <section className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-3xl items-center justify-center">
        <div className="w-full rounded-2xl border border-slate-800 bg-slate-900/90 p-5 shadow-2xl sm:p-8">
          <div className="flex items-center justify-between gap-4 border-b border-slate-800 pb-5">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.24em] text-blue-300">Movecta</p>
              <h1 className="mt-2 text-2xl font-black sm:text-3xl">Validacao de certificado</h1>
            </div>
            <ShieldCheck className="h-10 w-10 shrink-0 text-blue-300" />
          </div>

          {carregando && <p className="mt-8 text-sm font-semibold text-slate-300">Validando certificado...</p>}

          {!carregando && erro && (
            <div className="mt-8 rounded-2xl border border-red-400/30 bg-red-500/10 p-5">
              <XCircle className="h-10 w-10 text-red-300" />
              <h2 className="mt-4 text-xl font-black text-red-100">Documento nao validado</h2>
              <p className="mt-2 text-sm text-red-100/80">{erro}</p>
            </div>
          )}

          {!carregando && certificado && (
            <div className="mt-8 rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-5">
              <CheckCircle2 className="h-12 w-12 text-emerald-300" />
              <h2 className="mt-4 text-xl font-black text-emerald-100">Certificado verdadeiro</h2>
              <p className="mt-2 text-sm text-emerald-100/80">Este certificado foi emitido pela plataforma Movecta e consta como valido.</p>

              <div className="mt-6 grid gap-3 text-sm sm:grid-cols-2">
                <div className="rounded-xl border border-slate-700 bg-slate-950/70 p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">Codigo</p>
                  <p className="mt-1 font-black">{certificado.codigo}</p>
                </div>
                <div className="rounded-xl border border-slate-700 bg-slate-950/70 p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">Concluido em</p>
                  <p className="mt-1 font-black">{data(certificado.concluidoEm)}</p>
                </div>
                <div className="rounded-xl border border-slate-700 bg-slate-950/70 p-4 sm:col-span-2">
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">Participante</p>
                  <p className="mt-1 font-black">{certificado.nomeCompleto}</p>
                  <p className="mt-1 text-xs text-slate-400">{certificado.empresa} - {certificado.cargo}</p>
                </div>
              </div>

              <a href={certificado.certificadoUrl} className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-black text-white transition hover:bg-emerald-500 sm:w-auto">
                <Download size={18} /> Baixar certificado
              </a>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
