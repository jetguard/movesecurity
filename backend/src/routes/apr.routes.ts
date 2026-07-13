import { Router } from "express";
import { atualizarApr, criarApr, decidirApr, listarAprs } from "../controllers/apr.controller";
import { acessoAnalise, autenticarUsuario, autorizarPerfis } from "../middlewares/auth";

const router = Router();

router.get("/", autenticarUsuario, autorizarPerfis(acessoAnalise), listarAprs);
router.post("/", autenticarUsuario, autorizarPerfis(acessoAnalise), criarApr);
router.put("/:id", autenticarUsuario, autorizarPerfis(acessoAnalise), atualizarApr);
router.post("/:id/decisao", autenticarUsuario, autorizarPerfis(acessoAnalise), decidirApr);

export default router;
