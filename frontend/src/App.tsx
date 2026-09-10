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
const RiscosDashboard = lazyWithReload(() => import("./pages/RiscosDashboard"));
const RiscosFluxograma = lazyWithReload(
  () => import("./pages/RiscosFluxograma"),
);
const RiscosAnaliseCompleta = lazyWithReload(
  () => import("./pages/RiscosAnaliseCompleta"),
);
const RiscosAnaliseCompletaDetalhe = lazyWithReload(
  () => import("./pages/RiscosAnaliseCompletaDetalhe"),
);
const RiscosPontuacoes = lazyWithReload(
  () => import("./pages/RiscosPontuacoes"),
);
const PlanosAcao = lazyWithReload(() => import("./pages/PlanosAcao"));
const PlanoAcaoTratamento = lazyWithReload(
  () => import("./pages/PlanoAcaoTratamento"),
);
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
const SolicitacoesImagens = lazyWithReload(
  () => import("./pages/SolicitacoesImagens"),
);
const Configuracoes = lazyWithReload(() => import("./pages/Configuracoes"));
const MinhaJornada = lazyWithReload(() => import("./pages/MinhaJornada"));
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
const TreinamentoPocSep006Publico = lazyWithReload(
  () => import("./pages/TreinamentoPocSep006Publico"),
);
const TreinamentoDinamicoPublico = lazyWithReload(
  () => import("./pages/TreinamentoDinamicoPublico"),
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
const SolicitacaoImagemPublica = lazyWithReload(
  () => import("./pages/SolicitacaoImagemPublica"),
);
const TreinamentosTerminal = lazyWithReload(
  () => import("./pages/TreinamentosTerminal"),
);
const TreinamentosPocSep007 = lazyWithReload(
  () => import("./pages/TreinamentosPocSep007"),
);
const TreinamentosPocSep006 = lazyWithReload(
  () => import("./pages/TreinamentosPocSep006"),
);
const TreinamentosDinamicos = lazyWithReload(
  () => import("./pages/TreinamentosDinamicos"),
);
const TreinamentosCriados = lazyWithReload(
  () => import("./pages/TreinamentosCriados"),
);
const TreinamentosVisitantes = lazyWithReload(
  () => import("./pages/TreinamentosVisitantes"),
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
            element={<Navigate to="/portaria-alfandega-205" replace />}
          />
          <Route
            path="/portaria-alfandega-205"
            element={<TreinamentoTerminalPublico />}
          />
          <Route
            path="/treinamento-poc-sep-007"
            element={<TreinamentoPocSep007Publico />}
          />
          <Route
            path="/treinamento-poc-sep-006"
            element={<TreinamentoPocSep006Publico />}
          />
          <Route
            path="/treinamento/:slug"
            element={<TreinamentoDinamicoPublico />}
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
            path="/solicitacao/imagens/:token"
            element={<SolicitacaoImagemPublica />}
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
              path="solicitacoes/imagens"
              element={
                <ProtectedRoute
                  perfis={[
                    PERFIS.SUPER_ADMIN,
                    PERFIS.ADMINISTRADOR,
                    PERFIS.ANALISTA,
                    PERFIS.OPERADOR,
                  ]}
                >
                  <SolicitacoesImagens />
                </ProtectedRoute>
              }
            />
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
            {[["treinamentos-poc-sep-006", <TreinamentosPocSep006 />]].map(
              ([path, element]) => (
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
              ),
            )}
            <Route
              path="treinamentos-dinamicos"
              element={
                <ProtectedRoute
                  perfis={[
                    PERFIS.SUPER_ADMIN,
                    PERFIS.ADMINISTRADOR,
                    PERFIS.ANALISTA,
                    PERFIS.PORTARIA,
                  ]}
                >
                  <TreinamentosDinamicos />
                </ProtectedRoute>
              }
            />
            <Route
              path="treinamentos-criados"
              element={
                <ProtectedRoute
                  perfis={[
                    PERFIS.SUPER_ADMIN,
                    PERFIS.ADMINISTRADOR,
                    PERFIS.ANALISTA,
                    PERFIS.PORTARIA,
                  ]}
                >
                  <TreinamentosCriados />
                </ProtectedRoute>
              }
            />
            <Route
              path="treinamentos-visitantes"
              element={
                <ProtectedRoute
                  perfis={[
                    PERFIS.SUPER_ADMIN,
                    PERFIS.ADMINISTRADOR,
                    PERFIS.ANALISTA,
                    PERFIS.PORTARIA,
                  ]}
                >
                  <TreinamentosVisitantes />
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
                    PERFIS.PORTARIA,
                    PERFIS.CADASTRO,
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
              path="planos-acao/:id"
              element={
                <ProtectedRoute
                  perfis={[
                    PERFIS.SUPER_ADMIN,
                    PERFIS.ADMINISTRADOR,
                    PERFIS.ANALISTA,
                  ]}
                >
                  <PlanoAcaoTratamento />
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
              element={<Navigate to="/riscos/dashboard" replace />}
            />
            <Route
              path="riscos/dashboard"
              element={
                <ProtectedRoute
                  perfis={[
                    PERFIS.SUPER_ADMIN,
                    PERFIS.ADMINISTRADOR,
                    PERFIS.ANALISTA,
                  ]}
                >
                  <RiscosDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="riscos/fluxograma"
              element={
                <ProtectedRoute
                  perfis={[
                    PERFIS.SUPER_ADMIN,
                    PERFIS.ADMINISTRADOR,
                    PERFIS.ANALISTA,
                  ]}
                >
                  <RiscosFluxograma />
                </ProtectedRoute>
              }
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
                  <RiscosAnaliseCompleta />
                </ProtectedRoute>
              }
            />
            <Route
              path="riscos/analise-completa/:id"
              element={
                <ProtectedRoute
                  perfis={[
                    PERFIS.SUPER_ADMIN,
                    PERFIS.ADMINISTRADOR,
                    PERFIS.ANALISTA,
                  ]}
                >
                  <RiscosAnaliseCompletaDetalhe />
                </ProtectedRoute>
              }
            />
            <Route
              path="riscos/tratativas"
              element={<Navigate to="/planos-acao" replace />}
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
                <ProtectedRoute perfis={[PERFIS.SUPER_ADMIN]}>
                  <Configuracoes />
                </ProtectedRoute>
              }
            />
            <Route
              path="apis/openai"
              element={
                <ProtectedRoute perfis={[PERFIS.SUPER_ADMIN]}>
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
            <Route path="perfil" element={<Perfil />} />
            <Route
              path="logs"
              element={
                <ProtectedRoute perfis={[PERFIS.SUPER_ADMIN]}>
                  <Logs />
                </ProtectedRoute>
              }
            />
            <Route
              path="usuarios"
              element={
                <ProtectedRoute perfis={[PERFIS.SUPER_ADMIN]}>
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
