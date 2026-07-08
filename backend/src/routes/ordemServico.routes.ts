import { Router } from "express";
import {
  abrirOrdemServico,
  gerarPdfOrdemServico,
  listarOrdensServico,
  tratarOrdemServico,
} from "../controllers/ordemServico.controller";
import { acessoManutencao, acessoRelatorios, autenticarUsuario, autorizarPerfis } from "../middlewares/auth";

const router = Router();

router.get("/", autenticarUsuario, autorizarPerfis(acessoRelatorios), listarOrdensServico);
router.get("/:id/pdf", autenticarUsuario, autorizarPerfis(acessoRelatorios), gerarPdfOrdemServico);
router.post("/", autenticarUsuario, autorizarPerfis(acessoRelatorios), abrirOrdemServico);
router.put("/:id/tratativa", autenticarUsuario, autorizarPerfis(acessoManutencao), tratarOrdemServico);

export default router;
