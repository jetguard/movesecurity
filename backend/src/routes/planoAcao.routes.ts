import { Router } from "express";
import { atualizarPlanoAcao, criarPlanoAcao, listarPlanosAcao } from "../controllers/planoAcao.controller";
import { acessoAnalise, autenticarUsuario, autorizarPerfis } from "../middlewares/auth";

const router = Router();

router.get("/", autenticarUsuario, autorizarPerfis(acessoAnalise), listarPlanosAcao);
router.post("/", autenticarUsuario, autorizarPerfis(acessoAnalise), criarPlanoAcao);
router.put("/:id", autenticarUsuario, autorizarPerfis(acessoAnalise), atualizarPlanoAcao);

export default router;

