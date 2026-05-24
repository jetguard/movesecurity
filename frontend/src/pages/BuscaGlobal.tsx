import { useState } from "react";
import { api } from "../services/api";

type Resultado = {
  tipo: string;
  id: number;
  codigo: string;
  titulo: string;
};

export default function BuscaGlobal() {
  const [termo, setTermo] = useState("");
  const [resultados, setResultados] = useState<Resultado[]>([]);
  const [carregando, setCarregando] = useState(false);

  async function buscar(e?: React.FormEvent) {
    e?.preventDefault();
    if (termo.trim().length < 2) return;
    setCarregando(true);
    const response = await api.get("/gestao/busca", { params: { q: termo } });
    setResultados(response.data);
    setCarregando(false);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">Busca Global</h1>
        <p className="mt-1 text-sm text-slate-500">Pesquise por numero, pessoa, placa, local, natureza ou texto do relato.</p>
      </div>

      <form onSubmit={buscar} className="flex flex-col gap-3 rounded-xl bg-white p-4 shadow sm:flex-row">
        <input className="flex-1 rounded-lg border p-3" placeholder="Digite o termo de busca" value={termo} onChange={(e) => setTermo(e.target.value)} />
        <button className="rounded-lg bg-blue-600 px-5 py-3 text-white">Buscar</button>
      </form>

      {carregando && <p className="text-sm text-slate-500">Buscando...</p>}

      <div className="space-y-4">
        {resultados.map((item) => (
          <div key={`${item.tipo}-${item.id}`} className="rounded-xl bg-white p-5 shadow">
            <p className="text-sm font-semibold text-blue-600">{item.tipo} | {item.codigo}</p>
            <h2 className="mt-1 text-xl font-bold text-slate-900">{item.titulo}</h2>
            <a href={`/timeline/${item.tipo}/${item.id}`} className="mt-3 inline-block rounded bg-slate-200 px-3 py-2 text-sm text-slate-700">Ver timeline</a>
          </div>
        ))}
      </div>
    </div>
  );
}

