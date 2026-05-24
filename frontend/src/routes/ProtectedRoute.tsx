import { Navigate } from "react-router-dom";
import { temPerfil } from "../utils/permissoes";

interface Props {
  children: React.ReactNode;
  perfis?: string[];
}

export default function ProtectedRoute({ children, perfis }: Props) {
  const token = localStorage.getItem("token");

  if (!token) {
    return <Navigate to="/login" />;
  }

  if (perfis && !temPerfil(perfis)) {
    return <Navigate to="/" />;
  }

  return children;
}

