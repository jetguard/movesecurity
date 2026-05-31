import { Navigate, useLocation } from "react-router-dom";
import { temPerfil, usuarioAtual } from "../utils/permissoes";

interface Props {
  children: React.ReactNode;
  perfis?: string[];
}

export default function ProtectedRoute({ children, perfis }: Props) {
  const location = useLocation();
  const usuario = usuarioAtual();

  if (!usuario) {
    return <Navigate to="/login" />;
  }

  if (usuario?.deveAlterarSenha && location.pathname !== "/alterar-senha") {
    return <Navigate to="/alterar-senha" />;
  }

  if (!usuario?.deveAlterarSenha && location.pathname === "/alterar-senha") {
    return <Navigate to="/" />;
  }

  if (perfis && !temPerfil(perfis)) {
    return <Navigate to="/" />;
  }

  return children;
}
