import "dotenv/config";
import express from "express";
import { createServer } from "http";
import authRoutes from "./routes/auth.routes";
import ocorrenciaRoutes from "./routes/ocorrencia.routes";
import eventoRoutes from "./routes/evento.routes";
import investigacaoRoutes from "./routes/investigacao.routes";
import naturezaRoutes from "./routes/natureza.routes";
import localRoutes from "./routes/local.routes";
import usuarioRoutes from "./routes/usuario.routes";
import analiseRoutes from "./routes/analise.routes";
import analiseEstrategicaRoutes from "./routes/analiseEstrategica.routes";
import logRoutes from "./routes/log.routes";
import riscoRoutes from "./routes/risco.routes";
import gestaoRoutes from "./routes/gestao.routes";
import workflowRoutes from "./routes/workflow.routes";
import inteligenciaRoutes from "./routes/inteligencia.routes";
import planoAcaoRoutes from "./routes/planoAcao.routes";
import checklistRoutes from "./routes/checklist.routes";
import matrizRiscoRoutes from "./routes/matrizRisco.routes";
import mencaoRoutes from "./routes/mencao.routes";
import comentarioRoutes from "./routes/comentario.routes";
import cameraRoutes from "./routes/camera.routes";
import configuracaoRoutes from "./routes/configuracao.routes";
import anulacaoRoutes from "./routes/anulacao.routes";
import patrimonioAvancadoRoutes from "./routes/patrimonioAvancado.routes";
import governancaRoutes from "./routes/governanca.routes";
import planejamentoRoutes from "./routes/planejamento.routes";
import quadraSegurancaRoutes from "./routes/quadraSeguranca.routes";
import operacaoRoutes from "./routes/operacao.routes";
import { garantirSuperAdmin } from "./services/superAdmin.service";
import { corsOrigin } from "./config/security";
import { iniciarRealtime } from "./services/realtime.service";

const app = express();
const httpServer = createServer(app);

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", corsOrigin());
  res.header("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Unidade-Ativa");

  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }

  next();
});

app.use(express.json());
app.use("/uploads", express.static("uploads"));

app.use("/api/auth", authRoutes);
app.use("/api/usuarios", usuarioRoutes);
app.use("/api/analises", analiseRoutes);
app.use("/api/analises-estrategicas", analiseEstrategicaRoutes);
app.use("/api/logs", logRoutes);
app.use("/api/riscos", riscoRoutes);
app.use("/api/gestao", gestaoRoutes);
app.use("/api/workflow", workflowRoutes);
app.use("/api/inteligencia", inteligenciaRoutes);
app.use("/api/planos-acao", planoAcaoRoutes);
app.use("/api/checklists", checklistRoutes);
app.use("/api/matriz-risco", matrizRiscoRoutes);
app.use("/api/mencoes", mencaoRoutes);
app.use("/api/comentarios", comentarioRoutes);
app.use("/api/cameras", cameraRoutes);
app.use("/api/configuracoes", configuracaoRoutes);
app.use("/api/anulacoes", anulacaoRoutes);
app.use("/api/patrimonio-avancado", patrimonioAvancadoRoutes);
app.use("/api/governanca", governancaRoutes);
app.use("/api/planejamento", planejamentoRoutes);
app.use("/api/quadra-seguranca", quadraSegurancaRoutes);
app.use("/api/operacao", operacaoRoutes);

app.use("/api/ocorrencias", ocorrenciaRoutes);
app.use("/api/eventos", eventoRoutes);
app.use("/api/investigacoes", investigacaoRoutes);
app.use("/api/naturezas", naturezaRoutes);
app.use("/api/locais", localRoutes);

app.get("/", (req, res) => {
  return res.json({
    sistema: "JetGuard API",
    status: "online",
    realtime: "/ws",
  });
});

app.get("/api/health", (req, res) => {
  return res.json({
    sistema: "JetGuard API",
    status: "online",
    timestamp: new Date().toISOString(),
  });
});

const PORT = process.env.PORT || 3000;

garantirSuperAdmin()
  .catch((error) => {
    console.error("Erro ao garantir Super Admin:", error);
  })
  .finally(() => {
    iniciarRealtime(httpServer);
    httpServer.listen(PORT, () => {
      console.log(`Servidor rodando na porta ${PORT}`);
    });
  });

export { app, httpServer };
