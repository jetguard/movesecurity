import { Router } from "express";
import { desconectarSessao, listarSessoes } from "../controllers/sessao.controller";
import { acessoTotal, autenticarUsuario, autorizarPerfis } from "../middlewares/auth";

const router = Router();

router.get("/", autenticarUsuario, autorizarPerfis(acessoTotal), listarSessoes);
router.post("/:id/desconectar", autenticarUsuario, autorizarPerfis(acessoTotal), desconectarSessao);

export default router;
