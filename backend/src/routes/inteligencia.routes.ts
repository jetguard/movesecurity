import { Router } from "express";
import { obterInteligencia } from "../controllers/inteligencia.controller";
import { acessoAnalise, autenticarUsuario, autorizarPerfis } from "../middlewares/auth";

const router = Router();

router.get("/", autenticarUsuario, autorizarPerfis(acessoAnalise), obterInteligencia);

export default router;

