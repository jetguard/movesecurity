import { Router } from "express";
import { gerarPdfPublicoRelatorio } from "../controllers/publicRelatorio.controller";

const router = Router();

router.get("/relatorios/:tipo/:id/pdf", gerarPdfPublicoRelatorio);

export default router;
