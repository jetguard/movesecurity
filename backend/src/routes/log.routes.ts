import { Router } from "express";
import { listarLogs } from "../controllers/log.controller";
import { acessoAnalise, autenticarUsuario, autorizarPerfis } from "../middlewares/auth";

const router = Router();

router.get("/", autenticarUsuario, autorizarPerfis(acessoAnalise), listarLogs);

export default router;

