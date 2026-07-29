import { Router } from "express";
import {
  atualizarProgressoIntegracao,
  baixarCertificadoIntegracao,
  concluirIntegracaoTerminal,
  configIntegracaoTerminal,
  excluirIntegracaoTerminal,
  iniciarIntegracaoTerminal,
  listarIntegracoesTerminal,
  responderQuizIntegracao,
  validarCertificadoIntegracao,
} from "../controllers/integracaoTerminal.controller";
import { acessoTotal, acessoTreinamentosTerminal, autenticarUsuario, autorizarPerfis } from "../middlewares/auth";

const router = Router();

router.get("/public/integracao-terminal/config", configIntegracaoTerminal);
router.post("/public/integracao-terminal/iniciar", iniciarIntegracaoTerminal);
router.put("/public/integracao-terminal/:token/progresso", atualizarProgressoIntegracao);
router.post("/public/integracao-terminal/:token/quiz", responderQuizIntegracao);
router.post("/public/integracao-terminal/:token/concluir", concluirIntegracaoTerminal);
router.get("/public/integracao-terminal/:token/certificado", baixarCertificadoIntegracao);
router.get("/public/integracao-terminal/:token/validar", validarCertificadoIntegracao);
router.get("/integracoes-do-terminal", autenticarUsuario, autorizarPerfis(acessoTreinamentosTerminal), listarIntegracoesTerminal);
router.delete("/integracoes-do-terminal/:id", autenticarUsuario, autorizarPerfis(acessoTotal), excluirIntegracaoTerminal);

export default router;
