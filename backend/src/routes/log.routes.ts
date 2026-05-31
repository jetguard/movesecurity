import { Router } from "express";
import { listarLogs, minhaJornada } from "../controllers/log.controller";
import { acessoRelatorios, acessoTotal, autenticarUsuario, autorizarPerfis } from "../middlewares/auth";

const router = Router();

router.get("/", autenticarUsuario, autorizarPerfis(acessoTotal), listarLogs);
router.get("/minha-jornada", autenticarUsuario, autorizarPerfis(acessoRelatorios), minhaJornada);

export default router;

