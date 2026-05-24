import { Router } from "express";
import {
  atualizarCamera,
  criarCamera,
  criarChecklistCamera,
  dashboardCameras,
  exportarHistoricoCameras,
  exportarInventarioCameras,
  listarCameras,
  listarChecklistCamera,
} from "../controllers/camera.controller";
import { acessoAnalise, acessoRelatorios, autenticarUsuario, autorizarPerfis } from "../middlewares/auth";

const router = Router();

router.get("/", autenticarUsuario, autorizarPerfis(acessoRelatorios), listarCameras);
router.get("/exportar/inventario", autenticarUsuario, autorizarPerfis(acessoRelatorios), exportarInventarioCameras);
router.get("/exportar/historico", autenticarUsuario, autorizarPerfis(acessoRelatorios), exportarHistoricoCameras);
router.post("/", autenticarUsuario, autorizarPerfis(acessoAnalise), criarCamera);
router.put("/:id", autenticarUsuario, autorizarPerfis(acessoAnalise), atualizarCamera);
router.get("/dashboard", autenticarUsuario, autorizarPerfis(acessoRelatorios), dashboardCameras);
router.get("/:cameraId/checklists", autenticarUsuario, autorizarPerfis(acessoRelatorios), listarChecklistCamera);
router.post("/:cameraId/checklists", autenticarUsuario, autorizarPerfis(acessoRelatorios), criarChecklistCamera);

export default router;
