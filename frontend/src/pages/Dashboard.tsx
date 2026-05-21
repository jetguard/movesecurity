import { useEffect, useState } from "react";

interface DashboardData {
  sistema: string;
  usuario: string;
  status: string;
}

export default function Dashboard() {
  const [dados, setDados] = useState<DashboardData | null>(null);

  useEffect(() => {
    fetch("http://localhost:3000/api/dashboard")
      .then((response) => response.json())
      .then((data) => {
        setDados(data);
      });
  }, []);

  return (
    <div>
      <h1 className="mb-6 text-3xl font-bold text-slate-800">
        Dashboard
      </h1>

      <div className="rounded-2xl bg-white p-6 shadow">
        {dados ? (
          <div className="space-y-2">
            <p>
              <strong>Sistema:</strong> {dados.sistema}
            </p>

            <p>
              <strong>Usuário:</strong> {dados.usuario}
            </p>

            <p>
              <strong>Status:</strong> {dados.status}
            </p>
          </div>
        ) : (
          <p>Carregando dados...</p>
        )}
      </div>
    </div>
  );
}