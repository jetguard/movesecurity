import { Router } from "express";
import { buscarRascunho, descartarRascunho, salvarRascunho } from "../controllers/rascunho.controller";
import { acessoRelatorios, autenticarUsuario, autorizarPerfis } from "../middlewares/auth";

const router = Router();

router.get("/", autenticarUsuario, autorizarPerfis(acessoRelatorios), buscarRascunho);
router.post("/", autenticarUsuario, autorizarPerfis(acessoRelatorios), salvarRascunho);
router.delete("/:id", autenticarUsuario, autorizarPerfis(acessoRelatorios), descartarRascunho);

export default router;
