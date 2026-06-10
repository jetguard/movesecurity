import { Router } from "express";
import { gerarPdfPublicoCcos, gerarPdfPublicoChecklist, gerarPdfPublicoRelatorio, validarAssinaturaPublica } from "../controllers/publicRelatorio.controller";
import { gerarPdfPublicoRelatorioDiario } from "../controllers/relatorioDiario.controller";

const router = Router();

router.get("/relatorios/:tipo/:id/pdf", gerarPdfPublicoRelatorio);
router.get("/ccos/passagens-turno/:id/pdf", gerarPdfPublicoCcos);
router.get("/checklists/:id/pdf", gerarPdfPublicoChecklist);
router.get("/relatorios-diarios/:id/pdf", gerarPdfPublicoRelatorioDiario);
router.get("/assinaturas/:token", validarAssinaturaPublica);

export default router;
