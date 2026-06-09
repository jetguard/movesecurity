import { Router } from "express";
import {
  atualizarPlanoAcao,
  criarPlanoAcao,
  listarOrigensPlanoAcao,
  listarPlanosAcao,
} from "../controllers/planoAcao.controller";
import { acessoAnalise, autenticarUsuario, autorizarPerfis } from "../middlewares/auth";

const router = Router();

router.get("/", autenticarUsuario, autorizarPerfis(acessoAnalise), listarPlanosAcao);
router.get("/origens", autenticarUsuario, autorizarPerfis(acessoAnalise), listarOrigensPlanoAcao);
router.post("/", autenticarUsuario, autorizarPerfis(acessoAnalise), criarPlanoAcao);
router.put("/:id", autenticarUsuario, autorizarPerfis(acessoAnalise), atualizarPlanoAcao);

export default router;

