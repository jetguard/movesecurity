import { Router } from "express";
import {
  atualizarAnaliseEvento,
  atualizarAnaliseOcorrencia,
  iniciarAnaliseEvento,
  iniciarAnaliseOcorrencia,
} from "../controllers/analise.controller";
import { acessoAnalise, autenticarUsuario, autorizarPerfis } from "../middlewares/auth";

const router = Router();

router.post("/ocorrencias/:ocorrenciaId", autenticarUsuario, autorizarPerfis(acessoAnalise), iniciarAnaliseOcorrencia);
router.put("/ocorrencias/:id", autenticarUsuario, autorizarPerfis(acessoAnalise), atualizarAnaliseOcorrencia);
router.post("/eventos/:eventoId", autenticarUsuario, autorizarPerfis(acessoAnalise), iniciarAnaliseEvento);
router.put("/eventos/:id", autenticarUsuario, autorizarPerfis(acessoAnalise), atualizarAnaliseEvento);

export default router;

