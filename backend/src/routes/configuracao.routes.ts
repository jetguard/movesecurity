import { Router } from "express";
import { atualizarConfiguracao, buscarConfiguracao } from "../controllers/configuracao.controller";
import { acessoTotal, autenticarUsuario, autorizarPerfis } from "../middlewares/auth";

const router = Router();

router.get("/", autenticarUsuario, autorizarPerfis(acessoTotal), buscarConfiguracao);
router.put("/", autenticarUsuario, autorizarPerfis(acessoTotal), atualizarConfiguracao);

export default router;
