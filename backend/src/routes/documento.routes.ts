import { Router } from "express";
import { listarDocumentos } from "../controllers/documento.controller";
import { acessoRelatorios, autenticarUsuario, autorizarPerfis } from "../middlewares/auth";

const router = Router();

router.get("/", autenticarUsuario, autorizarPerfis(acessoRelatorios), listarDocumentos);

export default router;
