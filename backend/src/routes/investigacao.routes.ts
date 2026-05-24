import { Router } from "express";
import {
  atualizarInvestigacao,
  converterOcorrenciaParaInvestigacao,
  listarInvestigacoes,
} from "../controllers/investigacao.controller";
import { acessoAnalise, acessoRelatorios, autenticarUsuario, autorizarPerfis } from "../middlewares/auth";

const router = Router();

router.get("/", autenticarUsuario, autorizarPerfis(acessoRelatorios), listarInvestigacoes);
router.post(
  "/converter/ocorrencias/:ocorrenciaId",
  autenticarUsuario,
  autorizarPerfis(acessoAnalise),
  converterOcorrenciaParaInvestigacao
);
router.put("/:id", autenticarUsuario, autorizarPerfis(acessoAnalise), atualizarInvestigacao);

export default router;

