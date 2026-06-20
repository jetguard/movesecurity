import { Router } from "express";
import {
  gerarBackup,
  statusGovernanca,
} from "../controllers/governanca.controller";
import {
  acessoAnalise,
  acessoTotal,
  autenticarUsuario,
  autorizarPerfis,
} from "../middlewares/auth";

const router = Router();

router.get(
  "/saude",
  autenticarUsuario,
  autorizarPerfis(acessoAnalise),
  statusGovernanca,
);
router.post(
  "/backup",
  autenticarUsuario,
  autorizarPerfis(acessoTotal),
  gerarBackup,
);

export default router;
