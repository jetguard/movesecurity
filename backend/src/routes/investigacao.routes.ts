import { Router } from "express";
import { listarInvestigacoes } from "../controllers/investigacao.controller";

const router = Router();

router.get("/", listarInvestigacoes);

export default router;