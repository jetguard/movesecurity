import { Router } from "express";
import { obterMatrizRisco } from "../controllers/matrizRisco.controller";
import { acessoAnalise, autenticarUsuario, autorizarPerfis } from "../middlewares/auth";

const router = Router();

router.get("/", autenticarUsuario, autorizarPerfis(acessoAnalise), obterMatrizRisco);

export default router;

