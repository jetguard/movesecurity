import { Router } from "express";
import { gerarPdfPublicoCcos, gerarPdfPublicoRelatorio, validarAssinaturaPublica } from "../controllers/publicRelatorio.controller";

const router = Router();

router.get("/relatorios/:tipo/:id/pdf", gerarPdfPublicoRelatorio);
router.get("/ccos/passagens-turno/:id/pdf", gerarPdfPublicoCcos);
router.get("/assinaturas/:token", validarAssinaturaPublica);

export default router;
