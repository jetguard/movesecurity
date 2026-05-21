import express from "express";
import cors from "cors";

import dashboardRoutes from "./routes/dashboard.routes";
import usuarioRoutes from "./routes/usuario.routes";
import authRoutes from "./routes/auth.routes";

const app = express();

app.use(cors());
app.use(express.json());


app.use("/api/dashboard", dashboardRoutes);
app.use("/api/usuarios", usuarioRoutes);
app.use("/api/auth", authRoutes);

app.get("/", (req, res) => {
  res.json({
    sistema: "JetGuard API",
    status: "online",
  });
});

app.listen(3000, () => {
  console.log("Servidor rodando na porta 3000");
});