import { Router } from "express";
import { atualizacoesSistema, integridadeSistema } from "../controllers/sistema.controller";
import { acessoTotal, autenticarUsuario, autorizarPerfis } from "../middlewares/auth";

const router = Router();

router.get(
  "/atualizacoes",
  autenticarUsuario,
  autorizarPerfis(acessoTotal),
  atualizacoesSistema
);

router.get(
  "/integridade",
  autenticarUsuario,
  autorizarPerfis(acessoTotal),
  integridadeSistema
);

export default router;
