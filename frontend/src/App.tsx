import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import AdminLayout from "./layouts/AdminLayout";
import ProtectedRoute from "./routes/ProtectedRoute";
import { PERFIS } from "./utils/permissoes";

const Dashboard = lazy(() => import("./pages/Dashboard"));
const Ocorrencias = lazy(() => import("./pages/Relatórios/Ocorrencias"));
const Investigacao = lazy(() => import("./pages/Relatórios/Investigacao"));
const Eventos = lazy(() => import("./pages/Relatórios/Eventos"));
const Naturezas = lazy(() => import("./pages/Cadastros/Naturezas"));
const Login = lazy(() => import("./pages/Login"));
const Perfil = lazy(() => import("./pages/Perfil"));
const Logs = lazy(() => import("./pages/Logs"));
const Usuarios = lazy(() => import("./pages/Usuarios"));
const Riscos = lazy(() => import("./pages/Riscos"));
const AnalisesEstrategicas = lazy(() => import("./pages/AnalisesEstrategicas"));
const Evidencias = lazy(() => import("./pages/Evidencias"));
const Pendencias = lazy(() => import("./pages/Pendencias"));
const Notificacoes = lazy(() => import("./pages/Notificacoes"));
const BuscaGlobal = lazy(() => import("./pages/BuscaGlobal"));
const Timeline = lazy(() => import("./pages/Timeline"));
const InteligenciaOperacional = lazy(() => import("./pages/InteligenciaOperacional"));
const Aprovacoes = lazy(() => import("./pages/Aprovacoes"));
const PlanosAcao = lazy(() => import("./pages/PlanosAcao"));
const MatrizRisco = lazy(() => import("./pages/MatrizRisco"));
const Checklists = lazy(() => import("./pages/Checklists"));
const Mencoes = lazy(() => import("./pages/Mencoes"));
const Tarefas = lazy(() => import("./pages/Tarefas"));
const Historico = lazy(() => import("./pages/Historico"));
const Cameras = lazy(() => import("./pages/Cameras"));
const Configuracoes = lazy(() => import("./pages/Configuracoes"));
const MinhaJornada = lazy(() => import("./pages/MinhaJornada"));
const Anulacoes = lazy(() => import("./pages/Anulacoes"));
const GestaoPatrimonialAvancada = lazy(() => import("./pages/GestaoPatrimonialAvancada"));

function CarregandoPagina() {
  return (
    <div className="flex min-h-80 items-center justify-center rounded-2xl bg-white p-8 text-slate-500 shadow-sm">
      Carregando módulo...
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<CarregandoPagina />}>
        <Routes>
          <Route path="/login" element={<Login />} />

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
            <Route path="evidencias" element={<Evidencias />} />
            <Route path="pendencias" element={<Pendencias />} />
            <Route path="notificacoes" element={<Notificacoes />} />
            <Route path="busca" element={<BuscaGlobal />} />
            <Route path="timeline/:tipo/:id" element={<Timeline />} />
            <Route path="mencoes" element={<Mencoes />} />
            <Route path="tarefas" element={<Tarefas />} />
            <Route path="minha-jornada" element={<MinhaJornada />} />
            <Route path="anulacoes" element={<Anulacoes />} />
            <Route path="cameras" element={<Cameras />} />
            <Route
              path="gestao-patrimonial"
              element={
                <ProtectedRoute perfis={[PERFIS.SUPER_ADMIN, PERFIS.ADMINISTRADOR, PERFIS.ANALISTA]}>
                  <GestaoPatrimonialAvancada />
                </ProtectedRoute>
              }
            />
            <Route path="historico/:tipo/:id" element={<Historico />} />
            <Route
              path="inteligencia"
              element={
                <ProtectedRoute perfis={[PERFIS.SUPER_ADMIN, PERFIS.ADMINISTRADOR, PERFIS.ANALISTA]}>
                  <InteligenciaOperacional />
                </ProtectedRoute>
              }
            />
            <Route
              path="aprovacoes"
              element={
                <ProtectedRoute perfis={[PERFIS.SUPER_ADMIN, PERFIS.ADMINISTRADOR, PERFIS.ANALISTA]}>
                  <Aprovacoes />
                </ProtectedRoute>
              }
            />
            <Route
              path="planos-acao"
              element={
                <ProtectedRoute perfis={[PERFIS.SUPER_ADMIN, PERFIS.ADMINISTRADOR, PERFIS.ANALISTA]}>
                  <PlanosAcao />
                </ProtectedRoute>
              }
            />
            <Route
              path="matriz-risco"
              element={
                <ProtectedRoute perfis={[PERFIS.SUPER_ADMIN, PERFIS.ADMINISTRADOR, PERFIS.ANALISTA]}>
                  <MatrizRisco />
                </ProtectedRoute>
              }
            />
            <Route
              path="checklists"
              element={
                <ProtectedRoute perfis={[PERFIS.SUPER_ADMIN, PERFIS.ADMINISTRADOR, PERFIS.ANALISTA]}>
                  <Checklists />
                </ProtectedRoute>
              }
            />
            <Route
              path="riscos"
              element={
                <ProtectedRoute perfis={[PERFIS.SUPER_ADMIN, PERFIS.ADMINISTRADOR, PERFIS.ANALISTA]}>
                  <Riscos />
                </ProtectedRoute>
              }
            />
            <Route
              path="analises-estrategicas"
              element={
                <ProtectedRoute perfis={[PERFIS.SUPER_ADMIN, PERFIS.ADMINISTRADOR, PERFIS.ANALISTA]}>
                  <AnalisesEstrategicas />
                </ProtectedRoute>
              }
            />
            <Route
              path="naturezas"
              element={
                <ProtectedRoute perfis={[PERFIS.SUPER_ADMIN, PERFIS.ADMINISTRADOR]}>
                  <Naturezas />
                </ProtectedRoute>
              }
            />
            <Route
              path="configuracoes"
              element={
                <ProtectedRoute perfis={[PERFIS.SUPER_ADMIN, PERFIS.ADMINISTRADOR]}>
                  <Configuracoes />
                </ProtectedRoute>
              }
            />
            <Route path="perfil" element={<Perfil />} />
            <Route
              path="logs"
              element={
                <ProtectedRoute perfis={[PERFIS.SUPER_ADMIN, PERFIS.ADMINISTRADOR, PERFIS.ANALISTA]}>
                  <Logs />
                </ProtectedRoute>
              }
            />
            <Route
              path="usuarios"
              element={
                <ProtectedRoute perfis={[PERFIS.SUPER_ADMIN, PERFIS.ADMINISTRADOR]}>
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
