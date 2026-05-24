import { useEffect, useMemo, useState } from "react";
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
    api.get("/gestao/evidencias").then((response) => setEvidencias(response.data));
  }, []);

  const filtradas = useMemo(() => {
    return evidencias.filter((item) => {
      const texto = `${item.modulo} ${item.codigo} ${item.titulo} ${item.nomeOriginal}`.toLowerCase();
      return (!modulo || item.modulo === modulo) && (!busca || texto.includes(busca.toLowerCase()));
    });
  }, [evidencias, busca, modulo]);

  const modulos = Array.from(new Set(evidencias.map((item) => item.modulo)));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">Centro de Evidencias</h1>
        <p className="mt-1 text-sm text-slate-500">Arquivos anexados em ocorrencias, eventos e analises de risco.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 rounded-xl bg-white p-4 shadow md:grid-cols-3">
        <input className="rounded-lg border p-3 md:col-span-2" placeholder="Buscar por arquivo, codigo ou titulo" value={busca} onChange={(e) => setBusca(e.target.value)} />
        <select className="rounded-lg border p-3" value={modulo} onChange={(e) => setModulo(e.target.value)}>
          <option value="">Todos os modulos</option>
          {modulos.map((item) => <option key={item}>{item}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filtradas.map((item) => (
          <div key={item.id} className="rounded-xl bg-white p-4 shadow">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-blue-600">{item.modulo} | {item.codigo}</p>
                <h2 className="mt-1 truncate font-bold text-slate-900">{item.nomeOriginal}</h2>
                <p className="mt-1 text-sm text-slate-500">{item.titulo}</p>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">{item.tipo}</span>
            </div>
            {item.tipo.startsWith("image/") && (
              <img src={item.url} alt={item.nomeOriginal} className="mt-4 h-44 w-full rounded-lg object-cover" />
            )}
            <div className="mt-4 flex flex-wrap gap-2">
              <a href={item.url} target="_blank" className="rounded bg-blue-600 px-3 py-2 text-sm text-white">Visualizar</a>
              <a href={`/timeline/${item.modulo}/${item.registroId}`} className="rounded bg-slate-200 px-3 py-2 text-sm text-slate-700">Timeline</a>
            </div>
            <div className="mt-3 rounded bg-slate-50 p-2">
              <p className="text-xs font-semibold text-slate-500">Hash SHA-256</p>
              <p className="break-all text-xs text-slate-700">{item.hashSha256 || "Arquivo indisponivel para hash"}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

