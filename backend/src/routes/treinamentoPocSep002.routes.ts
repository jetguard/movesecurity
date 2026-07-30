import { Router } from "express";
import {
  baixarCertificadoPocSep002,
  concluirEtapaTreinamentoPocSep002,
  concluirTreinamentoPocSep002,
  excluirTreinamentoPocSep002,
  iniciarTreinamentoPocSep002,
  listarTreinamentosPocSep002,
  listarUnidadesTreinamentoPocSep002,
  localizarParticipanteTreinamentoPocSep002,
  reenviarEmailTreinamentoPocSep002,
  responderQuizTreinamentoPocSep002,
} from "../controllers/treinamentoPocSep002.controller";
import {
  acessoTotal,
  acessoTreinamentosTerminal,
  autenticarUsuario,
  autorizarPerfis,
} from "../middlewares/auth";

const router = Router();

router.get(
  "/public/treinamento-poc-sep-002/unidades",
  listarUnidadesTreinamentoPocSep002,
);
router.get(
  "/public/treinamento-poc-sep-002/participante",
  localizarParticipanteTreinamentoPocSep002,
);
router.post(
  "/public/treinamento-poc-sep-002/iniciar",
  iniciarTreinamentoPocSep002,
);
router.put(
  "/public/treinamento-poc-sep-002/:token/etapa",
  concluirEtapaTreinamentoPocSep002,
);
router.post(
  "/public/treinamento-poc-sep-002/:token/quiz",
  responderQuizTreinamentoPocSep002,
);
router.post(
  "/public/treinamento-poc-sep-002/:token/concluir",
  concluirTreinamentoPocSep002,
);
router.get(
  "/public/treinamento-poc-sep-002/:token/certificado",
  baixarCertificadoPocSep002,
);
router.get(
  "/treinamentos-poc-sep-002",
  autenticarUsuario,
  autorizarPerfis(acessoTreinamentosTerminal),
  listarTreinamentosPocSep002,
);
router.post(
  "/treinamentos-poc-sep-002/:id/reenviar-email",
  autenticarUsuario,
  autorizarPerfis(acessoTreinamentosTerminal),
  reenviarEmailTreinamentoPocSep002,
);
router.delete(
  "/treinamentos-poc-sep-002/:id",
  autenticarUsuario,
  autorizarPerfis(acessoTotal),
  excluirTreinamentoPocSep002,
);

export default router;
