import { Router } from "express";
import { listarLogs, minhaJornada } from "../controllers/log.controller";
import { acessoAnalise, acessoRelatorios, autenticarUsuario, autorizarPerfis } from "../middlewares/auth";

const router = Router();

router.get("/", autenticarUsuario, autorizarPerfis(acessoAnalise), listarLogs);
router.get("/minha-jornada", autenticarUsuario, autorizarPerfis(acessoRelatorios), minhaJornada);

export default router;

