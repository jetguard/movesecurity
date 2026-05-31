import { Router } from "express";
import { gerarPdfPublicoCcos, gerarPdfPublicoRelatorio } from "../controllers/publicRelatorio.controller";

const router = Router();

router.get("/relatorios/:tipo/:id/pdf", gerarPdfPublicoRelatorio);
router.get("/ccos/passagens-turno/:id/pdf", gerarPdfPublicoCcos);

export default router;
