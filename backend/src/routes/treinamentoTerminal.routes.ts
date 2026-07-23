import { Router } from "express";
import {
  atualizarProgressoTreinamento,
  baixarCertificadoTreinamento,
  concluirTreinamentoTerminal,
  configTreinamentoTerminal,
  excluirTreinamentoTerminal,
  iniciarTreinamentoTerminal,
  listarTreinamentosTerminal,
} from "../controllers/treinamentoTerminal.controller";
import { acessoAnalise, acessoTotal, autenticarUsuario, autorizarPerfis } from "../middlewares/auth";

const router = Router();

router.get("/public/treinamento-terminal/config", configTreinamentoTerminal);
router.post("/public/treinamento-terminal/iniciar", iniciarTreinamentoTerminal);
router.put("/public/treinamento-terminal/:token/progresso", atualizarProgressoTreinamento);
router.post("/public/treinamento-terminal/:token/concluir", concluirTreinamentoTerminal);
router.get("/public/treinamento-terminal/:token/certificado", baixarCertificadoTreinamento);
router.get("/treinamentos-terminal", autenticarUsuario, autorizarPerfis(acessoAnalise), listarTreinamentosTerminal);
router.delete("/treinamentos-terminal/:id", autenticarUsuario, autorizarPerfis(acessoTotal), excluirTreinamentoTerminal);

export default router;
