import { BrowserRouter, Routes, Route } from "react-router-dom";

import AdminLayout from "./layouts/AdminLayout";
import Dashboard from "./pages/Dashboard";
import Ocorrencias from "./pages/Relatórios/Ocorrencias";
import Investigacao from "./pages/Relatórios/Investigacao";
import Eventos from "./pages/Relatórios/Eventos";
import Login from "./pages/Login";

import ProtectedRoute from "./routes/ProtectedRoute";

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
        </Route>

      </Routes>
    </BrowserRouter>
  );
}