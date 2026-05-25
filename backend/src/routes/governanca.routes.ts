import { Router } from "express";
import { gerarBackup, statusGovernanca } from "../controllers/governanca.controller";
import { acessoTotal, autenticarUsuario, autorizarPerfis } from "../middlewares/auth";

const router = Router();

router.get("/saude", autenticarUsuario, autorizarPerfis(acessoTotal), statusGovernanca);
router.post("/backup", autenticarUsuario, autorizarPerfis(acessoTotal), gerarBackup);

export default router;
