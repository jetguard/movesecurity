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

router.get("/", autenticarUsuario, autorizarPerfis(acessoRelatorios), minhasMencoes);
router.get("/contador", autenticarUsuario, autorizarPerfis(acessoRelatorios), contarMencoes);
router.get("/usuarios", autenticarUsuario, autorizarPerfis(acessoRelatorios), listarUsuariosMencao);
router.post("/", autenticarUsuario, autorizarPerfis(acessoRelatorios), criarMencao);
router.put("/:id/lida", autenticarUsuario, autorizarPerfis(acessoRelatorios), marcarMencaoLida);

export default router;

