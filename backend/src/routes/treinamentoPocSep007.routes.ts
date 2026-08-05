import { Router } from "express";
import {
  baixarCertificadoPocSep007,
  baixarCertificadosPocSep007Zip,
  concluirEtapaTreinamentoPocSep007,
  concluirTreinamentoPocSep007,
  excluirTreinamentoPocSep007,
  iniciarTreinamentoPocSep007,
  listarTreinamentosPocSep007,
  listarUnidadesTreinamentoPocSep007,
  localizarParticipanteTreinamentoPocSep007,
  reenviarEmailTreinamentoPocSep007,
  responderQuizTreinamentoPocSep007,
} from "../controllers/treinamentoPocSep007.controller";
import { acessoTotal, acessoTreinamentosTerminal, autenticarUsuario, autorizarPerfis } from "../middlewares/auth";

const router = Router();

router.get("/public/treinamento-poc-sep-007/unidades", listarUnidadesTreinamentoPocSep007);
router.get("/public/treinamento-poc-sep-007/participante", localizarParticipanteTreinamentoPocSep007);
router.post("/public/treinamento-poc-sep-007/iniciar", iniciarTreinamentoPocSep007);
router.put("/public/treinamento-poc-sep-007/:token/etapa", concluirEtapaTreinamentoPocSep007);
router.post("/public/treinamento-poc-sep-007/:token/quiz", responderQuizTreinamentoPocSep007);
router.post("/public/treinamento-poc-sep-007/:token/concluir", concluirTreinamentoPocSep007);
router.get("/public/treinamento-poc-sep-007/:token/certificado", baixarCertificadoPocSep007);
router.get("/treinamentos-poc-sep-007", autenticarUsuario, autorizarPerfis(acessoTreinamentosTerminal), listarTreinamentosPocSep007);
router.get("/treinamentos-poc-sep-007/certificados.zip", autenticarUsuario, autorizarPerfis(acessoTreinamentosTerminal), baixarCertificadosPocSep007Zip);
router.post("/treinamentos-poc-sep-007/:id/reenviar-email", autenticarUsuario, autorizarPerfis(acessoTreinamentosTerminal), reenviarEmailTreinamentoPocSep007);
router.delete("/treinamentos-poc-sep-007/:id", autenticarUsuario, autorizarPerfis(acessoTotal), excluirTreinamentoPocSep007);

export default router;
