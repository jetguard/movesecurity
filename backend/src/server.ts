import express from "express";
import dotenv from "dotenv";
import authRoutes from "./routes/auth.routes";
import ocorrenciaRoutes from "./routes/ocorrencia.routes";
import eventoRoutes from "./routes/evento.routes";
//import investigacaoRoutes from "./routes/investigacao.routes";

dotenv.config();

const app = express();

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "https://improved-funicular-94g6465ggwp2pjwp-5173.app.github.dev");
  res.header("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }

  next();
});

app.use(express.json());

app.use("/api/auth", authRoutes);

app.use("/api/ocorrencias", ocorrenciaRoutes);
app.use("/api/eventos", eventoRoutes);
//app.use("/api/investigacoes", investigacaoRoutes);

app.get("/", (req, res) => {
  return res.json({
    sistema: "JetGuard API",
    status: "online",
  });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});