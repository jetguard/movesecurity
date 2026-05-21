import express from "express";
import cors from "cors";

import dashboardRoutes from "./routes/dashboard.routes";

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/dashboard", dashboardRoutes);

app.listen(3000, () => {
  console.log("Servidor rodando na porta 3000");
});