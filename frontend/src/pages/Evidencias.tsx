import { useEffect, useMemo, useState } from "react";
import {
  Download,
  Eye,
  FileCheck2,
  Fingerprint,
  Link as LinkIcon,
  ShieldCheck,
} from "lucide-react";
import { api } from "../services/api";

type Evidencia = {
  id: string;
  modulo: string;
  registroId: number;
  codigo: string;
  titulo: string;
  unidade: string;
  nomeOriginal: string;
  tipo: string;
  url: string;
  hashSha256?: string | null;
  createdAt: string;
};

export default function Evidencias() {
  const [evidencias, setEvidencias] = useState<Evidencia[]>([]);
  const [busca, setBusca] = useState("");
  const [modulo, setModulo] = useState("");

  useEffect(() => {
    api
      .get("/gestao/evidencias")
      .then((response) => setEvidencias(response.data));
  }, []);

  const filtradas = useMemo(() => {
    return evidencias.filter((item) => {
      const texto =
        `${item.modulo} ${item.codigo} ${item.titulo} ${item.nomeOriginal}`.toLowerCase();
      return (
        (!modulo || item.modulo === modulo) &&
        (!busca || texto.includes(busca.toLowerCase()))
      );
    });
  }, [evidencias, busca, modulo]);

  const modulos = Array.from(new Set(evidencias.map((item) => item.modulo)));
  const indicadores = {
    total: evidencias.length,
    imagens: evidencias.filter((item) => item.tipo.startsWith("image/")).length,
    validadas: evidencias.filter((item) => item.hashSha256).length,
    semHash: evidencias.filter((item) => !item.hashSha256).length,
  };

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-950 text-white shadow-2xl">
        <div className="border-b border-slate-800 bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.28),transparent_34%),linear-gradient(135deg,#020617,#111827)] p-6">
          <p className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-cyan-300">
            <ShieldCheck size={16} /> Cadeia de custódia digital
          </p>
          <h1 className="mt-3 text-2xl font-black sm:text-3xl">
            Centro de Evidências
          </h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-300">
            Arquivos anexados aos módulos operacionais com rastreabilidade,
            hash, origem e vínculo para auditoria.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">Evidências</p>
            <p className="mt-2 text-3xl font-black">{indicadores.total}</p>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">Imagens</p>
            <p className="mt-2 text-3xl font-black text-cyan-200">
              {indicadores.imagens}
            </p>
          </div>
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-5">
            <p className="text-sm text-emerald-200">Validadas por hash</p>
            <p className="mt-2 text-3xl font-black text-emerald-200">
              {indicadores.validadas}
            </p>
          </div>
          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5">
            <p className="text-sm text-amber-200">Sem hash</p>
            <p className="mt-2 text-3xl font-black text-amber-200">
              {indicadores.semHash}
            </p>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 rounded-xl bg-white p-4 shadow md:grid-cols-3">
        <input
          className="rounded-lg border p-3 md:col-span-2"
          placeholder="Buscar por arquivo, código ou título"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
        <select
          className="rounded-lg border p-3"
          value={modulo}
          onChange={(e) => setModulo(e.target.value)}
        >
          <option value="">Todos os módulos</option>
          {modulos.map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filtradas.map((item) => (
          <div
            key={item.id}
            className="overflow-hidden rounded-2xl bg-white shadow"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 p-4">
                <p className="text-sm font-semibold text-blue-600">
                  {item.modulo} | {item.codigo}
                </p>
                <h2 className="mt-1 truncate font-bold text-slate-900">
                  {item.nomeOriginal}
                </h2>
                <p className="mt-1 text-sm text-slate-500">{item.titulo}</p>
                <p className="mt-2 text-xs text-slate-400">
                  Coletado em {new Date(item.createdAt).toLocaleString("pt-BR")}{" "}
                  | Unidade {item.unidade}
                </p>
              </div>
              <div className="p-4">
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">
                  {item.tipo}
                </span>
              </div>
            </div>

            {item.tipo.startsWith("image/") && (
              <img
                src={item.url}
                alt={item.nomeOriginal}
                className="h-44 w-full object-cover"
              />
            )}

            <div className="grid grid-cols-2 gap-2 p-4">
              <div className="rounded-xl bg-slate-50 p-3">
                <p className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                  <FileCheck2 size={14} /> Status
                </p>
                <p
                  className={`mt-1 text-sm font-bold ${item.hashSha256 ? "text-emerald-700" : "text-amber-700"}`}
                >
                  {item.hashSha256 ? "Validada" : "Pendente de hash"}
                </p>
              </div>
              <div className="rounded-xl bg-slate-50 p-3">
                <p className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                  <LinkIcon size={14} /> Origem
                </p>
                <p className="mt-1 text-sm font-bold text-slate-800">
                  {item.modulo}
                </p>
              </div>
            </div>

            <div className="mx-4 rounded-xl bg-slate-50 p-3">
              <p className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                <Fingerprint size={14} /> Hash SHA-256
              </p>
              <p className="break-all text-xs text-slate-700">
                {item.hashSha256 || "Arquivo indisponível para hash"}
              </p>
            </div>

            <div className="flex flex-wrap gap-2 p-4">
              <a
                href={item.url}
                target="_blank"
                className="inline-flex items-center gap-2 rounded bg-blue-600 px-3 py-2 text-sm text-white"
              >
                <Eye size={15} /> Visualizar
              </a>
              <a
                href={item.url}
                download
                className="inline-flex items-center gap-2 rounded bg-slate-900 px-3 py-2 text-sm text-white"
              >
                <Download size={15} /> Baixar
              </a>
              <a
                href={`/timeline/${item.modulo}/${item.registroId}`}
                className="rounded bg-slate-200 px-3 py-2 text-sm text-slate-700"
              >
                Timeline
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
