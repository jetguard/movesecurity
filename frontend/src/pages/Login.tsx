import { useState } from "react";
import { api } from "../services/api";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function handleLogin(e: React.FormEvent) {
  e.preventDefault();

  if (!email || !password) {
    alert("Preencha email e senha");
    return;
  }

  try {
    const response = await api.post("/auth/login", {
      email,
      senha: password,
    });

    localStorage.setItem("token", response.data.token);
    localStorage.setItem("usuario", JSON.stringify(response.data.usuario));

    window.location.href = "/";
  } catch (error: any) {
    console.log("ERRO COMPLETO:", error);
    console.log("RESPOSTA:", error.response?.data);
    alert(error.response?.data?.error || "Erro ao fazer login");
  }
}

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "#0f172a"
    }}>
      <form onSubmit={handleLogin} style={{
        width: "360px",
        background: "#ffffff",
        padding: "32px",
        borderRadius: "12px",
        display: "flex",
        flexDirection: "column",
        gap: "16px"
      }}>
        <h1 style={{ textAlign: "center" }}>Login JetGuard</h1>

        <input
          type="email"
          placeholder="Seu email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{ padding: "12px" }}
        />

        <input
          type="password"
          placeholder="Sua senha"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{ padding: "12px" }}
        />

        <button type="submit" style={{
          padding: "12px",
          background: "#1e293b",
          color: "#fff",
          border: "none",
          cursor: "pointer"
        }}>
          Entrar
        </button>
      </form>
    </div>
  );
}