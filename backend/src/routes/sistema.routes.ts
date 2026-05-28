import { Router } from "express";
import { atualizacoesSistema } from "../controllers/sistema.controller";
import { acessoTotal, autenticarUsuario, autorizarPerfis } from "../middlewares/auth";

const router = Router();

router.get(
  "/atualizacoes",
  autenticarUsuario,
  autorizarPerfis(acessoTotal),
  atualizacoesSistema
);

export default router;
