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
const RiscosCadastroGeral = lazyWithReload(
  () => import("./pages/RiscosCadastroGeral"),
);
const RiscosModuloEmConstrucao = lazyWithReload(
  () => import("./pages/RiscosModuloEmConstrucao"),
);
const RiscosPontuacoes = lazyWithReload(
  () => import("./pages/RiscosPontuacoes"),
);
const PlanosAcao = lazyWithReload(() => import("./pages/PlanosAcao"));
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
const PainelTreinamentos = lazyWithReload(
  () => import("./pages/PainelTreinamentos"),
);
const TreinamentoTerminalPublico = lazyWithReload(
  () => import("./pages/TreinamentoTerminalPublico"),
);
const TreinamentoPocSep007Publico = lazyWithReload(
  () => import("./pages/TreinamentoPocSep007Publico"),
);
const TreinamentoPocSep001Publico = lazyWithReload(
  () => import("./pages/TreinamentoPocSep001Publico"),
);
const TreinamentoPocSep002Publico = lazyWithReload(
  () => import("./pages/TreinamentoPocSep002Publico"),
);
const TreinamentoPocSep003Publico = lazyWithReload(
  () => import("./pages/TreinamentoPocSep003Publico"),
);
const TreinamentoPocSep004Publico = lazyWithReload(
  () => import("./pages/TreinamentoPocSep004Publico"),
);
const TreinamentoPocSep005Publico = lazyWithReload(
  () => import("./pages/TreinamentoPocSep005Publico"),
);
const TreinamentoPocSep006Publico = lazyWithReload(
  () => import("./pages/TreinamentoPocSep006Publico"),
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
const TreinamentosPocSep007 = lazyWithReload(
  () => import("./pages/TreinamentosPocSep007"),
);
const TreinamentosPocSep001 = lazyWithReload(
  () => import("./pages/TreinamentosPocSep001"),
);
const TreinamentosPocSep002 = lazyWithReload(
  () => import("./pages/TreinamentosPocSep002"),
);
const TreinamentosPocSep003 = lazyWithReload(
  () => import("./pages/TreinamentosPocSep003"),
);
const TreinamentosPocSep004 = lazyWithReload(
  () => import("./pages/TreinamentosPocSep004"),
);
const TreinamentosPocSep005 = lazyWithReload(
  () => import("./pages/TreinamentosPocSep005"),
);
const TreinamentosPocSep006 = lazyWithReload(
  () => import("./pages/TreinamentosPocSep006"),
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
          <Route
            path="/treinamento-terminal"
            element={<TreinamentoTerminalPublico />}
          />
          <Route
            path="/treinamento-poc-sep-007"
            element={<TreinamentoPocSep007Publico />}
          />
          <Route
            path="/treinamento-poc-sep-001"
            element={<TreinamentoPocSep001Publico />}
          />
          <Route
            path="/treinamento-poc-sep-002"
            element={<TreinamentoPocSep002Publico />}
          />
          <Route
            path="/treinamento-poc-sep-003"
            element={<TreinamentoPocSep003Publico />}
          />
          <Route
            path="/treinamento-poc-sep-004"
            element={<TreinamentoPocSep004Publico />}
          />
          <Route
            path="/treinamento-poc-sep-005"
            element={<TreinamentoPocSep005Publico />}
          />
          <Route
            path="/treinamento-poc-sep-006"
            element={<TreinamentoPocSep006Publico />}
          />
          <Route
            path="/integracao-terminal"
            element={<IntegracaoTerminalPublico />}
          />
          <Route
            path="/integracao-motoristas"
            element={<IntegracaoTerminalPublico />}
          />
          <Route
            path="/validar-certificado/:token"
            element={<ValidarCertificadoTreinamento />}
          />
          <Route
            path="/validar-integracao/:token"
            element={<ValidarCertificadoIntegracao />}
          />
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
              path="painel-treinamentos"
              element={
                <ProtectedRoute
                  perfis={[
                    PERFIS.SUPER_ADMIN,
                    PERFIS.ADMINISTRADOR,
                    PERFIS.GESTOR,
                    PERFIS.COORDENADOR,
                    PERFIS.SUPERVISOR,
                  ]}
                >
                  <PainelTreinamentos />
                </ProtectedRoute>
              }
            />
            <Route
              path="treinamentos-terminal"
              element={
                <ProtectedRoute
                  perfis={[
                    PERFIS.SUPER_ADMIN,
                    PERFIS.ADMINISTRADOR,
                    PERFIS.ANALISTA,
                    PERFIS.PORTARIA,
                  ]}
                >
                  <TreinamentosTerminal />
                </ProtectedRoute>
              }
            />
            <Route
              path="treinamentos-poc-sep-007"
              element={
                <ProtectedRoute
                  perfis={[
                    PERFIS.SUPER_ADMIN,
                    PERFIS.ADMINISTRADOR,
                    PERFIS.ANALISTA,
                    PERFIS.PORTARIA,
                  ]}
                >
                  <TreinamentosPocSep007 />
                </ProtectedRoute>
              }
            />
            <Route
              path="treinamentos-poc-sep-001"
              element={
                <ProtectedRoute
                  perfis={[
                    PERFIS.SUPER_ADMIN,
                    PERFIS.ADMINISTRADOR,
                    PERFIS.ANALISTA,
                    PERFIS.PORTARIA,
                  ]}
                >
                  <TreinamentosPocSep001 />
                </ProtectedRoute>
              }
            />
            {[
              ["treinamentos-poc-sep-002", <TreinamentosPocSep002 />],
              ["treinamentos-poc-sep-003", <TreinamentosPocSep003 />],
              ["treinamentos-poc-sep-004", <TreinamentosPocSep004 />],
              ["treinamentos-poc-sep-005", <TreinamentosPocSep005 />],
              ["treinamentos-poc-sep-006", <TreinamentosPocSep006 />],
            ].map(([path, element]) => (
              <Route
                key={String(path)}
                path={String(path)}
                element={
                  <ProtectedRoute
                    perfis={[
                      PERFIS.SUPER_ADMIN,
                      PERFIS.ADMINISTRADOR,
                      PERFIS.ANALISTA,
                      PERFIS.PORTARIA,
                    ]}
                  >
                    {element}
                  </ProtectedRoute>
                }
              />
            ))}
            <Route
              path="integracoes-do-terminal"
              element={
                <ProtectedRoute
                  perfis={[
                    PERFIS.SUPER_ADMIN,
                    PERFIS.ADMINISTRADOR,
                    PERFIS.ANALISTA,
                    PERFIS.PORTARIA,
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
            <Route
              path="gestao-patrimonial"
              element={<Navigate to="/riscos" replace />}
            />
            <Route path="historico/:tipo/:id" element={<Historico />} />
            <Route
              path="inteligencia"
              element={<Navigate to="/riscos" replace />}
            />
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
            <Route
              path="planos-acao"
              element={
                <ProtectedRoute
                  perfis={[
                    PERFIS.SUPER_ADMIN,
                    PERFIS.ADMINISTRADOR,
                    PERFIS.ANALISTA,
                  ]}
                >
                  <PlanosAcao />
                </ProtectedRoute>
              }
            />
            <Route
              path="matriz-risco"
              element={<Navigate to="/riscos" replace />}
            />
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
              element={<Navigate to="/riscos/cadastro-geral" replace />}
            />
            <Route
              path="riscos/cadastro-geral"
              element={
                <ProtectedRoute
                  perfis={[
                    PERFIS.SUPER_ADMIN,
                    PERFIS.ADMINISTRADOR,
                    PERFIS.ANALISTA,
                  ]}
                >
                  <RiscosCadastroGeral />
                </ProtectedRoute>
              }
            />
            <Route
              path="riscos/analise-completa"
              element={
                <ProtectedRoute
                  perfis={[
                    PERFIS.SUPER_ADMIN,
                    PERFIS.ADMINISTRADOR,
                    PERFIS.ANALISTA,
                  ]}
                >
                  <RiscosModuloEmConstrucao />
                </ProtectedRoute>
              }
            />
            <Route
              path="riscos/analise-simplificada"
              element={
                <ProtectedRoute
                  perfis={[
                    PERFIS.SUPER_ADMIN,
                    PERFIS.ADMINISTRADOR,
                    PERFIS.ANALISTA,
                  ]}
                >
                  <RiscosModuloEmConstrucao />
                </ProtectedRoute>
              }
            />
            <Route
              path="riscos/pontuacoes"
              element={
                <ProtectedRoute
                  perfis={[
                    PERFIS.SUPER_ADMIN,
                    PERFIS.ADMINISTRADOR,
                    PERFIS.ANALISTA,
                  ]}
                >
                  <RiscosPontuacoes />
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
            <Route
              path="analises-estrategicas"
              element={<Navigate to="/riscos" replace />}
            />
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
            <Route
              path="integridade"
              element={<Navigate to="/governanca" replace />}
            />
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
