import { useEffect, useState } from "react";
import { api } from "../services/api";

type LogAuditoria = {
  id: number;
  usuarioId?: number | null;
  usuarioNome: string;
  ip?: string | null;
  acao: string;
  tipoRegistro: string;
  registroId?: number | null;
  dadosAnteriores?: string | null;
  dadosNovos?: string | null;
  createdAt: string;
};

function resumoDados(valor?: string | null) {
  if (!valor) return "Sem dados registrados";

  try {
    return JSON.stringify(JSON.parse(valor), null, 2);
  } catch {
    return valor;
  }
}

export default function Logs() {
  const [logs, setLogs] = useState<LogAuditoria[]>([]);

  async function carregarLogs() {
    const response = await api.get("/logs");
    setLogs(response.data);
  }

  useEffect(() => {
    carregarLogs();
  }, []);

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Logs de Auditoria</h1>
        <p className="text-gray-500 mt-1">
          Registro administrativo de acessos e alterações realizadas no sistema.
        </p>
      </div>

      {logs.length === 0 ? (
        <div className="bg-white rounded-xl p-8 shadow text-center text-gray-500">
          Nenhum log registrado.
        </div>
      ) : (
        <div className="space-y-4">
          {logs.map((log) => (
            <div key={log.id} className="bg-white rounded-xl shadow p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-bold">{log.acao}</h2>
                  <p className="text-sm text-gray-500 mt-1">
                    {log.usuarioNome} | ID: {log.usuarioId || "N/I"} | IP:{" "}
                    {log.ip || "N/I"}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    {new Date(log.createdAt).toLocaleString()}
                  </p>
                </div>

                <span className="bg-slate-100 text-slate-700 px-3 py-1 rounded-full text-sm">
                  {log.tipoRegistro} #{log.registroId || "N/I"}
                </span>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
                <div>
                  <p className="font-semibold mb-2">Valores anteriores</p>
                  <pre className="max-h-72 overflow-auto rounded-lg bg-slate-950 p-3 text-xs text-slate-100 whitespace-pre-wrap">
                    {resumoDados(log.dadosAnteriores)}
                  </pre>
                </div>

                <div>
                  <p className="font-semibold mb-2">Novos valores</p>
                  <pre className="max-h-72 overflow-auto rounded-lg bg-slate-950 p-3 text-xs text-slate-100 whitespace-pre-wrap">
                    {resumoDados(log.dadosNovos)}
                  </pre>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

