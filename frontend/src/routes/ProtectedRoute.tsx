import { Navigate, useLocation } from "react-router-dom";
import {
  PERFIS,
  temPerfilOuModulo,
  usuarioAtual,
} from "../utils/permissoes";

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

  if (perfis && !temPerfilOuModulo(perfis, moduloDaRota(location.pathname))) {
    return <Navigate to="/" />;
  }

  return children;
}

function moduloDaRota(pathname: string) {
  if (pathname.startsWith("/treinamentos") || pathname.startsWith("/integracoes-do-terminal") || pathname.startsWith("/painel-treinamentos")) return "treinamentos";
  if (pathname.startsWith("/riscos")) return "analise_riscos";
  if (pathname.startsWith("/planos-acao")) return "plano_acao";
  if (pathname.startsWith("/usuarios")) return "usuarios";
  if (pathname.startsWith("/configuracoes")) return "configuracoes";
  if (pathname.startsWith("/apis") || pathname.startsWith("/atualizacoes")) return "configuracoes";
  if (pathname.startsWith("/sessoes")) return "logs";
  if (pathname.startsWith("/logs")) return "logs";
  if (pathname.startsWith("/naturezas") || pathname.startsWith("/locais")) return "cadastros";
  if (pathname.startsWith("/cameras") || pathname.startsWith("/ordens-servico")) return "cftv";
  if (pathname.startsWith("/quadra-seguranca")) return "quadra_seguranca";
  if (pathname.startsWith("/documentos") || pathname.startsWith("/evidencias")) return "documentos";
  if (pathname.startsWith("/ocorrencias") || pathname.startsWith("/eventos") || pathname.startsWith("/investigacao") || pathname.startsWith("/relatos-campo")) return "relatorios";
  if (pathname.startsWith("/relatorio-diario")) return "relatorios";
  if (pathname === "/") return "dashboard";
  return undefined;
}
