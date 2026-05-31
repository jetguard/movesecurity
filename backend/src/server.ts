import "dotenv/config";
import express from "express";
import { createServer } from "http";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
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
import publicRelatorioRoutes from "./routes/publicRelatorio.routes";
import sistemaRoutes from "./routes/sistema.routes";
import sugestaoMelhoriaRoutes from "./routes/sugestaoMelhoria.routes";
import sessaoRoutes from "./routes/sessao.routes";
import { garantirSuperAdmin } from "./services/superAdmin.service";
import { corsOrigin } from "./config/security";
import { iniciarRealtime } from "./services/realtime.service";
import { autenticarUsuario } from "./middlewares/auth";

const app = express();
const httpServer = createServer(app);

app.disable("x-powered-by");
app.set("trust proxy", 1);

app.use(helmet({
  crossOriginResourcePolicy: { policy: "same-site" },
  contentSecurityPolicy: false,
}));

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 8,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Muitas tentativas. Aguarde alguns minutos e tente novamente." },
});

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 240,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Limite de requisições excedido. Tente novamente em instantes." },
});

app.use((req, res, next) => {
  const origemPermitida = corsOrigin();
  res.header("Access-Control-Allow-Origin", origemPermitida === "*" ? String(req.headers.origin || "*") : origemPermitida);
  res.header("Vary", "Origin");
  res.header("Access-Control-Allow-Credentials", "true");
  res.header("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Unidade-Ativa");
  res.header("X-Content-Type-Options", "nosniff");
  res.header("X-Frame-Options", "DENY");
  res.header("Referrer-Policy", "no-referrer");
  res.header("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  res.header("Cross-Origin-Resource-Policy", "same-site");

  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }

  next();
});

app.use(express.json({ limit: "2mb" }));
app.use("/api/auth/login", loginLimiter);
app.use("/api/auth/refresh", loginLimiter);
app.use("/api", apiLimiter);
app.use("/uploads", autenticarUsuario, express.static("uploads", {
  dotfiles: "deny",
  etag: true,
  maxAge: "1h",
  setHeaders: (res) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Cache-Control", "private, max-age=3600");
  },
}));

app.use("/api/public", publicRelatorioRoutes);
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
app.use("/api/sistema", sistemaRoutes);
app.use("/api/sugestoes-melhoria", sugestaoMelhoriaRoutes);
app.use("/api/sessoes", sessaoRoutes);

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
