import { Router } from "express";
import { atualizarChecklist, criarChecklist, listarChecklists } from "../controllers/checklist.controller";
import { acessoAnalise, autenticarUsuario, autorizarPerfis } from "../middlewares/auth";

const router = Router();

router.get("/", autenticarUsuario, autorizarPerfis(acessoAnalise), listarChecklists);
router.post("/", autenticarUsuario, autorizarPerfis(acessoAnalise), criarChecklist);
router.put("/:id", autenticarUsuario, autorizarPerfis(acessoAnalise), atualizarChecklist);

export default router;

