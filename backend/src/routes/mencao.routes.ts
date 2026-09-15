import { Router } from "express";
import {
  contarMencoes,
  criarMencao,
  listarUsuariosMencao,
  marcarMencaoLida,
  minhasMencoes,
} from "../controllers/mencao.controller";
import { acessoRelatorios, autenticarUsuario, autorizarPerfis } from "../middlewares/auth";

const router = Router();

router.get("/", autenticarUsuario, minhasMencoes);
router.get("/contador", autenticarUsuario, contarMencoes);
router.get("/usuarios", autenticarUsuario, autorizarPerfis(acessoRelatorios), listarUsuariosMencao);
router.post("/", autenticarUsuario, autorizarPerfis(acessoRelatorios), criarMencao);
router.put("/:id/lida", autenticarUsuario, marcarMencaoLida);

export default router;

