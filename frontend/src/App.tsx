import { Suspense } from "react";
import { BrowserRouter, Navigate, Routes, Route } from "react-router-dom";

import AdminLayout from "./layouts/AdminLayout";
import ProtectedRoute from "./routes/ProtectedRoute";
import { PERFIS } from "./utils/permissoes";
import { SkeletonPage } from "./components/ui/Skeleton";
import { lazyWithReload } from "./utils/lazyWithReload";

const Dashboard = lazyWithReload(() => import("./pages/Dashboard"));
const Ocorrencias = lazyWithReload(
  () => import("./pages/Relatórios/Ocorrencias"),
);
const Investigacao = lazyWithReload(
  () => import("./pages/Relatórios/Investigacao"),
);
const Eventos = lazyWithReload(() => import("./pages/Relatórios/Eventos"));
const CentralDocumentos = lazyWithReload(
  () => import("./pages/CentralDocumentos"),
);
const Naturezas = lazyWithReload(() => import("./pages/Cadastros/Naturezas"));
const Locais = lazyWithReload(() => import("./pages/Cadastros/Locais"));
const Login = lazyWithReload(() => import("./pages/Login"));
const ColetaDados = lazyWithReload(() => import("./pages/ColetaDados"));
const AlterarSenhaPrimeiroAcesso = lazyWithReload(
  () => import("./pages/AlterarSenhaPrimeiroAcesso"),
);
const Perfil = lazyWithReload(() => import("./pages/Perfil"));
const MeusDados = lazyWithReload(() => import("./pages/MeusDados"));
const Logs = lazyWithReload(() => import("./pages/Logs"));
const Usuarios = lazyWithReload(() => import("./pages/Usuarios"));
const Riscos = lazyWithReload(() => import("./pages/Riscos"));
const APRs = lazyWithReload(() => import("./pages/APRs"));
const Evidencias = lazyWithReload(() => import("./pages/Evidencias"));
const Pendencias = lazyWithReload(() => import("./pages/Pendencias"));
const Notificacoes = lazyWithReload(() => import("./pages/Notificacoes"));
const AlertasOperacionais = lazyWithReload(
  () => import("./pages/AlertasOperacionais"),
);
const Timeline = lazyWithReload(() => import("./pages/Timeline"));
const Checklists = lazyWithReload(() => import("./pages/Checklists"));
const Mencoes = lazyWithReload(() => import("./pages/Mencoes"));
const Tarefas = lazyWithReload(() => import("./pages/Tarefas"));
const Historico = lazyWithReload(() => import("./pages/Historico"));
const Cameras = lazyWithReload(() => import("./pages/Cameras"));
const OrdensServico = lazyWithReload(() => import("./pages/OrdensServico"));
const Configuracoes = lazyWithReload(() => import("./pages/Configuracoes"));
const MinhaJornada = lazyWithReload(() => import("./pages/MinhaJornada"));
const Governanca = lazyWithReload(() => import("./pages/Governanca"));
const Planejamento = lazyWithReload(() => import("./pages/Planejamento"));
const QuadraSeguranca = lazyWithReload(() => import("./pages/QuadraSeguranca"));
const OperacaoSOC = lazyWithReload(() => import("./pages/OperacaoSOC"));
const RelatosCampo = lazyWithReload(() => import("./pages/RelatosCampo"));
const MapaOperacional = lazyWithReload(() => import("./pages/MapaOperacional"));
const AtualizacoesSistema = lazyWithReload(
  () => import("./pages/AtualizacoesSistema"),
);
const SugestoesMelhoria = lazyWithReload(
  () => import("./pages/SugestoesMelhoria"),
);
const Sessoes = lazyWithReload(() => import("./pages/Sessoes"));
const APIsOpenAI = lazyWithReload(() => import("./pages/APIsOpenAI"));
const RelatorioDiarioExecutivo = lazyWithReload(
  () => import("./pages/RelatorioDiarioExecutivo"),
);
const TreinamentoTerminalPublico = lazyWithReload(
  () => import("./pages/TreinamentoTerminalPublico"),
);
const IntegracaoTerminalPublico = lazyWithReload(
  () => import("./pages/IntegracaoTerminalPublico"),
);
const ValidarCertificadoTreinamento = lazyWithReload(
  () => import("./pages/ValidarCertificadoTreinamento"),
);
const ValidarCertificadoIntegracao = lazyWithReload(
  () => import("./pages/ValidarCertificadoIntegracao"),
);
const TreinamentosTerminal = lazyWithReload(
  () => import("./pages/TreinamentosTerminal"),
);
const IntegracoesTerminal = lazyWithReload(
  () => import("./pages/IntegracoesTerminal"),
);

function CarregandoPagina() {
  return <SkeletonPage />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<CarregandoPagina />}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/coleta-dados/:token" element={<ColetaDados />} />
          <Route path="/treinamento-terminal" element={<TreinamentoTerminalPublico />} />
          <Route path="/integracao-terminal" element={<IntegracaoTerminalPublico />} />
          <Route path="/validar-certificado/:token" element={<ValidarCertificadoTreinamento />} />
          <Route path="/validar-integracao/:token" element={<ValidarCertificadoIntegracao />} />
          <Route
            path="/alterar-senha"
            element={
              <ProtectedRoute>
                <AlterarSenhaPrimeiroAcesso />
              </ProtectedRoute>
            }
          />

          <Route
            path="/"
            element={
              <ProtectedRoute>
                <AdminLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="ocorrencias" element={<Ocorrencias />} />
            <Route path="investigacao" element={<Investigacao />} />
            <Route path="eventos" element={<Eventos />} />
            <Route path="documentos" element={<CentralDocumentos />} />
            <Route path="evidencias" element={<Evidencias />} />
            <Route path="pendencias" element={<Pendencias />} />
            <Route path="notificacoes" element={<Notificacoes />} />
            <Route
              path="alertas-operacionais"
              element={<AlertasOperacionais />}
            />
            <Route path="timeline/:tipo/:id" element={<Timeline />} />
            <Route path="meus-dados" element={<MeusDados />} />
            <Route path="mencoes" element={<Mencoes />} />
            <Route path="tarefas" element={<Tarefas />} />
            <Route path="minha-jornada" element={<MinhaJornada />} />
            <Route
              path="anulacoes"
              element={<Navigate to="/documentos" replace />}
            />
            <Route path="cameras" element={<Cameras />} />
            <Route
              path="ordens-servico"
              element={
                <ProtectedRoute
                  perfis={[
                    PERFIS.SUPER_ADMIN,
                    PERFIS.ADMINISTRADOR,
                    PERFIS.TECNICO_MANUTENCAO,
                  ]}
                >
                  <OrdensServico />
                </ProtectedRoute>
              }
            />
            <Route path="operacao-soc" element={<OperacaoSOC />} />
            <Route
              path="treinamentos-terminal"
              element={
                <ProtectedRoute
                  perfis={[
                    PERFIS.SUPER_ADMIN,
                    PERFIS.ADMINISTRADOR,
                    PERFIS.ANALISTA,
                  ]}
                >
                  <TreinamentosTerminal />
                </ProtectedRoute>
              }
            />
            <Route
              path="integracoes-do-terminal"
              element={
                <ProtectedRoute
                  perfis={[
                    PERFIS.SUPER_ADMIN,
                    PERFIS.ADMINISTRADOR,
                    PERFIS.ANALISTA,
                  ]}
                >
                  <IntegracoesTerminal />
                </ProtectedRoute>
              }
            />
            <Route
              path="relatorio-diario"
              element={
                <ProtectedRoute
                  perfis={[PERFIS.SUPER_ADMIN, PERFIS.ADMINISTRADOR]}
                >
                  <RelatorioDiarioExecutivo />
                </ProtectedRoute>
              }
            />
            <Route path="relatos-campo" element={<RelatosCampo />} />
            <Route path="mapa-operacional" element={<MapaOperacional />} />
            <Route path="planejamento" element={<Planejamento />} />
            <Route path="quadra-seguranca" element={<QuadraSeguranca />} />
            <Route path="gestao-patrimonial" element={<Navigate to="/riscos" replace />} />
            <Route path="historico/:tipo/:id" element={<Historico />} />
            <Route path="inteligencia" element={<Navigate to="/riscos" replace />} />
            <Route
              path="aprovacoes"
              element={
                <ProtectedRoute
                  perfis={[
                    PERFIS.SUPER_ADMIN,
                    PERFIS.ADMINISTRADOR,
                    PERFIS.ANALISTA,
                  ]}
                >
                  <Navigate to="/documentos" replace />
                </ProtectedRoute>
              }
            />
            <Route path="planos-acao" element={<Navigate to="/riscos" replace />} />
            <Route path="matriz-risco" element={<Navigate to="/riscos" replace />} />
            <Route
              path="checklists"
              element={
                <ProtectedRoute
                  perfis={[
                    PERFIS.SUPER_ADMIN,
                    PERFIS.ADMINISTRADOR,
                    PERFIS.ANALISTA,
                  ]}
                >
                  <Checklists />
                </ProtectedRoute>
              }
            />
            <Route
              path="riscos"
              element={
                <ProtectedRoute
                  perfis={[
                    PERFIS.SUPER_ADMIN,
                    PERFIS.ADMINISTRADOR,
                    PERFIS.ANALISTA,
                  ]}
                >
                  <Riscos />
                </ProtectedRoute>
              }
            />
            <Route
              path="aprs"
              element={
                <ProtectedRoute
                  perfis={[
                    PERFIS.SUPER_ADMIN,
                    PERFIS.ADMINISTRADOR,
                    PERFIS.ANALISTA,
                  ]}
                >
                  <APRs />
                </ProtectedRoute>
              }
            />
            <Route path="analises-estrategicas" element={<Navigate to="/riscos" replace />} />
            <Route
              path="naturezas"
              element={
                <ProtectedRoute
                  perfis={[
                    PERFIS.SUPER_ADMIN,
                    PERFIS.ADMINISTRADOR,
                    PERFIS.ANALISTA,
                    PERFIS.OPERADOR,
                  ]}
                >
                  <Naturezas />
                </ProtectedRoute>
              }
            />
            <Route
              path="locais"
              element={
                <ProtectedRoute
                  perfis={[
                    PERFIS.SUPER_ADMIN,
                    PERFIS.ADMINISTRADOR,
                    PERFIS.ANALISTA,
                    PERFIS.OPERADOR,
                  ]}
                >
                  <Locais />
                </ProtectedRoute>
              }
            />
            <Route
              path="configuracoes"
              element={
                <ProtectedRoute
                  perfis={[PERFIS.SUPER_ADMIN, PERFIS.ADMINISTRADOR]}
                >
                  <Configuracoes />
                </ProtectedRoute>
              }
            />
            <Route
              path="apis/openai"
              element={
                <ProtectedRoute
                  perfis={[PERFIS.SUPER_ADMIN, PERFIS.ADMINISTRADOR]}
                >
                  <APIsOpenAI />
                </ProtectedRoute>
              }
            />
            <Route
              path="atualizacoes"
              element={
                <ProtectedRoute
                  perfis={[PERFIS.SUPER_ADMIN, PERFIS.ADMINISTRADOR]}
                >
                  <AtualizacoesSistema />
                </ProtectedRoute>
              }
            />
            <Route path="integridade" element={<Navigate to="/governanca" replace />} />
            <Route
              path="sessoes"
              element={
                <ProtectedRoute
                  perfis={[PERFIS.SUPER_ADMIN, PERFIS.ADMINISTRADOR]}
                >
                  <Sessoes />
                </ProtectedRoute>
              }
            />
            <Route
              path="sugestoes-melhoria"
              element={
                <ProtectedRoute
                  perfis={[
                    PERFIS.SUPER_ADMIN,
                    PERFIS.ADMINISTRADOR,
                    PERFIS.ANALISTA,
                    PERFIS.OPERADOR,
                  ]}
                >
                  <SugestoesMelhoria />
                </ProtectedRoute>
              }
            />
            <Route
              path="governanca"
              element={
                <ProtectedRoute
                  perfis={[
                    PERFIS.SUPER_ADMIN,
                    PERFIS.ADMINISTRADOR,
                    PERFIS.ANALISTA,
                  ]}
                >
                  <Governanca />
                </ProtectedRoute>
              }
            />
            <Route path="perfil" element={<Perfil />} />
            <Route
              path="logs"
              element={
                <ProtectedRoute
                  perfis={[PERFIS.SUPER_ADMIN, PERFIS.ADMINISTRADOR]}
                >
                  <Logs />
                </ProtectedRoute>
              }
            />
            <Route
              path="usuarios"
              element={
                <ProtectedRoute
                  perfis={[PERFIS.SUPER_ADMIN, PERFIS.ADMINISTRADOR]}
                >
                  <Usuarios />
                </ProtectedRoute>
              }
            />
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
