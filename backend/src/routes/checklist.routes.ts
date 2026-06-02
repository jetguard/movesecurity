import { Router } from "express";
import { assinarChecklist, atualizarChecklist, criarChecklist, gerarPdfChecklist, listarChecklists } from "../controllers/checklist.controller";
import { acessoAnalise, autenticarUsuario, autorizarPerfis } from "../middlewares/auth";

const router = Router();

router.get("/", autenticarUsuario, autorizarPerfis(acessoAnalise), listarChecklists);
router.post("/", autenticarUsuario, autorizarPerfis(acessoAnalise), criarChecklist);
router.post("/:id/assinar", autenticarUsuario, autorizarPerfis(acessoAnalise), assinarChecklist);
router.get("/:id/pdf", autenticarUsuario, autorizarPerfis(acessoAnalise), gerarPdfChecklist);
router.put("/:id", autenticarUsuario, autorizarPerfis(acessoAnalise), atualizarChecklist);

export default router;

