import { Navigate, useLocation } from "react-router-dom";
import { PERFIS, temPerfil, usuarioAtual } from "../utils/permissoes";

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

  if (
    usuario.perfilAcesso === PERFIS.PORTARIA &&
    ![
      "/treinamentos-terminal",
      "/integracoes-do-terminal",
      "/treinamentos-poc-sep-007",
      "/treinamentos-poc-sep-006",
      "/treinamentos-dinamicos",
      "/treinamentos-criados",
      "/meus-dados",
      "/perfil",
      "/alterar-senha",
    ].some(
      (rota) =>
        location.pathname === rota || location.pathname.startsWith(`${rota}/`),
    )
  ) {
    return <Navigate to="/treinamentos-terminal" replace />;
  }

  if (
    usuario.perfilAcesso === PERFIS.CADASTRO &&
    ![
      "/integracoes-do-terminal",
      "/meus-dados",
      "/perfil",
      "/alterar-senha",
    ].some(
      (rota) =>
        location.pathname === rota || location.pathname.startsWith(`${rota}/`),
    )
  ) {
    return <Navigate to="/integracoes-do-terminal" replace />;
  }

  if (perfis && !temPerfil(perfis)) {
    return <Navigate to="/" />;
  }

  return children;
}
