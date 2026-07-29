import "dotenv/config";
import express from "express";
import { createServer } from "http";
import helmet from "helmet";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";
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
import aprRoutes from "./routes/apr.routes";
import gestaoRoutes from "./routes/gestao.routes";
import workflowRoutes from "./routes/workflow.routes";
import inteligenciaRoutes from "./routes/inteligencia.routes";
import planoAcaoRoutes from "./routes/planoAcao.routes";
import checklistRoutes from "./routes/checklist.routes";
import matrizRiscoRoutes from "./routes/matrizRisco.routes";
import mencaoRoutes from "./routes/mencao.routes";
import comentarioRoutes from "./routes/comentario.routes";
import cameraRoutes from "./routes/camera.routes";
import ordemServicoRoutes from "./routes/ordemServico.routes";
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
import rascunhoRoutes from "./routes/rascunho.routes";
import documentoRoutes from "./routes/documento.routes";
import relatoCampoRoutes from "./routes/relatoCampo.routes";
import treinamentoTerminalRoutes from "./routes/treinamentoTerminal.routes";
import integracaoTerminalRoutes from "./routes/integracaoTerminal.routes";
import treinamentoPocSep007Routes from "./routes/treinamentoPocSep007.routes";
import { garantirSuperAdmin } from "./services/superAdmin.service";
import { corsOrigin } from "./config/security";
import { iniciarRealtime } from "./services/realtime.service";
import { autenticarUsuario } from "./middlewares/auth";
import { protegerCsrf } from "./middlewares/csrf";
import { servirArquivoProtegido } from "./controllers/arquivo.controller";

const app = express();
const httpServer = createServer(app);

app.disable("x-powered-by");
app.set("trust proxy", 1);

app.use(helmet({
  crossOriginResourcePolicy: { policy: "same-site" },
  contentSecurityPolicy: false,
}));

function requisicaoLocalDesenvolvimento(ip?: string) {
  return (
    process.env.NODE_ENV !== "production" &&
    ["127.0.0.1", "::1", "::ffff:127.0.0.1"].includes(ip || "")
  );
}

function chaveLimitLogin(req: express.Request) {
  const email = typeof req.body?.email === "string"
    ? req.body.email.trim().toLowerCase()
    : "sem-email";
  return `${ipKeyGenerator(req.ip || "sem-ip")}::${email}`;
}

const loginLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: Number(process.env.LOGIN_RATE_LIMIT || 20),
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: chaveLimitLogin,
  skipSuccessfulRequests: true,
  skip: (req) => requisicaoLocalDesenvolvimento(req.ip),
  message: { error: "Muitas tentativas. Aguarde alguns minutos e tente novamente." },
});

const refreshLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: Number(process.env.REFRESH_RATE_LIMIT || 120),
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  skip: (req) => requisicaoLocalDesenvolvimento(req.ip),
  message: { error: "Muitas tentativas de renovação de sessão. Aguarde alguns minutos e tente novamente." },
});

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 240,
  standardHeaders: true,
  skip: (req) => requisicaoLocalDesenvolvimento(req.ip),
  legacyHeaders: false,
  message: { error: "Limite de requisições excedido. Tente novamente em instantes." },
});

app.use((req, res, next) => {
  const origemPermitida = corsOrigin();
  res.header("Access-Control-Allow-Origin", origemPermitida === "*" ? String(req.headers.origin || "*") : origemPermitida);
  res.header("Vary", "Origin");
  res.header("Access-Control-Allow-Credentials", "true");
  res.header("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Unidade-Ativa, X-CSRF-Token");
  res.header("X-Content-Type-Options", "nosniff");
  res.header("X-Frame-Options", "SAMEORIGIN");
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
app.use("/api/auth/refresh", refreshLimiter);
app.use("/api", apiLimiter);
app.use(protegerCsrf);
app.get(/^\/uploads\/(.+)$/, autenticarUsuario, servirArquivoProtegido);

app.use("/api/public", publicRelatorioRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/usuarios", usuarioRoutes);
app.use("/api/analises", analiseRoutes);
app.use("/api/analises-estrategicas", analiseEstrategicaRoutes);
app.use("/api/logs", logRoutes);
app.use("/api/riscos", riscoRoutes);
app.use("/api/aprs", aprRoutes);
app.use("/api/gestao", gestaoRoutes);
app.use("/api/workflow", workflowRoutes);
app.use("/api/inteligencia", inteligenciaRoutes);
app.use("/api/planos-acao", planoAcaoRoutes);
app.use("/api/checklists", checklistRoutes);
app.use("/api/matriz-risco", matrizRiscoRoutes);
app.use("/api/mencoes", mencaoRoutes);
app.use("/api/comentarios", comentarioRoutes);
app.use("/api/cameras", cameraRoutes);
app.use("/api/ordens-servico", ordemServicoRoutes);
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
app.use("/api/rascunhos", rascunhoRoutes);
app.use("/api/documentos", documentoRoutes);
app.use("/api/relatos-campo", relatoCampoRoutes);
app.use("/api/public/relatos-campo", relatoCampoRoutes);
app.use("/api", treinamentoTerminalRoutes);
app.use("/api", integracaoTerminalRoutes);
app.use("/api", treinamentoPocSep007Routes);

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
