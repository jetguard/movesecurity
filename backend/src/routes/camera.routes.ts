import { Router } from "express";
import {
  atualizarCamera,
  criarCamera,
  criarChecklistCamera,
  dashboardCameras,
  excluirCamera,
  exportarHistoricoCameras,
  exportarInventarioCameras,
  gerarRelatorioDisponibilidadeCameras,
  atualizarIndisponibilidadeCamera,
  listarCameras,
  listarChecklistCamera,
  listarIndisponibilidadesCamera,
  registrarIndisponibilidadeCamera,
} from "../controllers/camera.controller";
import { acessoAnalise, acessoRelatorios, acessoTotal, autenticarUsuario, autorizarPerfis } from "../middlewares/auth";

const router = Router();

router.get("/", autenticarUsuario, autorizarPerfis(acessoRelatorios), listarCameras);
router.get("/exportar/inventario", autenticarUsuario, autorizarPerfis(acessoRelatorios), exportarInventarioCameras);
router.get("/exportar/historico", autenticarUsuario, autorizarPerfis(acessoRelatorios), exportarHistoricoCameras);
router.post("/relatorio-disponibilidade/pdf", autenticarUsuario, autorizarPerfis(acessoRelatorios), gerarRelatorioDisponibilidadeCameras);
router.post("/", autenticarUsuario, autorizarPerfis(acessoAnalise), criarCamera);
router.put("/:id", autenticarUsuario, autorizarPerfis(acessoAnalise), atualizarCamera);
router.delete("/:id", autenticarUsuario, autorizarPerfis(acessoAnalise), excluirCamera);
router.get("/dashboard", autenticarUsuario, autorizarPerfis(acessoRelatorios), dashboardCameras);
router.get("/:cameraId/checklists", autenticarUsuario, autorizarPerfis(acessoRelatorios), listarChecklistCamera);
router.post("/:cameraId/checklists", autenticarUsuario, autorizarPerfis(acessoRelatorios), criarChecklistCamera);
router.get("/:cameraId/indisponibilidades", autenticarUsuario, autorizarPerfis(acessoRelatorios), listarIndisponibilidadesCamera);
router.post("/:cameraId/indisponibilidades", autenticarUsuario, autorizarPerfis(acessoRelatorios), registrarIndisponibilidadeCamera);
router.put("/:cameraId/indisponibilidades/:eventoId", autenticarUsuario, autorizarPerfis(acessoTotal), atualizarIndisponibilidadeCamera);

export default router;
