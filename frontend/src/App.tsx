import { BrowserRouter, Routes, Route } from "react-router-dom";

import AdminLayout from "./layouts/AdminLayout";
import Dashboard from "./pages/Dashboard";
import Ocorrencias from "./pages/Relatórios/Ocorrencias";
import Investigacao from "./pages/Relatórios/Investigacao";
import Eventos from "./pages/Relatórios/Eventos";
import Naturezas from "./pages/Cadastros/Naturezas";
import Login from "./pages/Login";
import Perfil from "./pages/Perfil";
import Logs from "./pages/Logs";
import Usuarios from "./pages/Usuarios";
import Riscos from "./pages/Riscos";
import AnalisesEstrategicas from "./pages/AnalisesEstrategicas";
import Evidencias from "./pages/Evidencias";
import Pendencias from "./pages/Pendencias";
import BuscaGlobal from "./pages/BuscaGlobal";
import Timeline from "./pages/Timeline";
import InteligenciaOperacional from "./pages/InteligenciaOperacional";
import Aprovacoes from "./pages/Aprovacoes";
import PlanosAcao from "./pages/PlanosAcao";
import MatrizRisco from "./pages/MatrizRisco";
import Checklists from "./pages/Checklists";
import Mencoes from "./pages/Mencoes";
import Tarefas from "./pages/Tarefas";
import Historico from "./pages/Historico";

import ProtectedRoute from "./routes/ProtectedRoute";
import { PERFIS } from "./utils/permissoes";

export default function App() {
  return (
    <BrowserRouter>
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
          <Route path="busca" element={<BuscaGlobal />} />
          <Route path="timeline/:tipo/:id" element={<Timeline />} />
          <Route path="mencoes" element={<Mencoes />} />
          <Route path="tarefas" element={<Tarefas />} />
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
    </BrowserRouter>
  );
}

