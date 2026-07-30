import { Router } from "express";
import {
  baixarCertificadoPocSep006,
  concluirEtapaTreinamentoPocSep006,
  concluirTreinamentoPocSep006,
  excluirTreinamentoPocSep006,
  iniciarTreinamentoPocSep006,
  listarTreinamentosPocSep006,
  listarUnidadesTreinamentoPocSep006,
  localizarParticipanteTreinamentoPocSep006,
  reenviarEmailTreinamentoPocSep006,
  responderQuizTreinamentoPocSep006,
} from "../controllers/treinamentoPocSep006.controller";
import {
  acessoTotal,
  acessoTreinamentosTerminal,
  autenticarUsuario,
  autorizarPerfis,
} from "../middlewares/auth";

const router = Router();

router.get(
  "/public/treinamento-poc-sep-006/unidades",
  listarUnidadesTreinamentoPocSep006,
);
router.get(
  "/public/treinamento-poc-sep-006/participante",
  localizarParticipanteTreinamentoPocSep006,
);
router.post(
  "/public/treinamento-poc-sep-006/iniciar",
  iniciarTreinamentoPocSep006,
);
router.put(
  "/public/treinamento-poc-sep-006/:token/etapa",
  concluirEtapaTreinamentoPocSep006,
);
router.post(
  "/public/treinamento-poc-sep-006/:token/quiz",
  responderQuizTreinamentoPocSep006,
);
router.post(
  "/public/treinamento-poc-sep-006/:token/concluir",
  concluirTreinamentoPocSep006,
);
router.get(
  "/public/treinamento-poc-sep-006/:token/certificado",
  baixarCertificadoPocSep006,
);
router.get(
  "/treinamentos-poc-sep-006",
  autenticarUsuario,
  autorizarPerfis(acessoTreinamentosTerminal),
  listarTreinamentosPocSep006,
);
router.post(
  "/treinamentos-poc-sep-006/:id/reenviar-email",
  autenticarUsuario,
  autorizarPerfis(acessoTreinamentosTerminal),
  reenviarEmailTreinamentoPocSep006,
);
router.delete(
  "/treinamentos-poc-sep-006/:id",
  autenticarUsuario,
  autorizarPerfis(acessoTotal),
  excluirTreinamentoPocSep006,
);

export default router;
