import { Router } from "express";
import { atualizarWorkflow, listarWorkflow } from "../controllers/workflow.controller";
import { acessoAnalise, autenticarUsuario, autorizarPerfis } from "../middlewares/auth";

const router = Router();

router.get("/", autenticarUsuario, autorizarPerfis(acessoAnalise), listarWorkflow);
router.post("/:modulo/:id", autenticarUsuario, autorizarPerfis(acessoAnalise), atualizarWorkflow);

export default router;

