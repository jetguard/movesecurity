import { Router } from "express";
import {
  baixarCertificadoPocSep001,
  concluirEtapaTreinamentoPocSep001,
  concluirTreinamentoPocSep001,
  excluirTreinamentoPocSep001,
  iniciarTreinamentoPocSep001,
  listarTreinamentosPocSep001,
  listarUnidadesTreinamentoPocSep001,
  localizarParticipanteTreinamentoPocSep001,
  reenviarEmailTreinamentoPocSep001,
  responderQuizTreinamentoPocSep001,
} from "../controllers/treinamentoPocSep001.controller";
import {
  acessoTreinamentosTerminal,
  autenticarUsuario,
  autorizarPerfis,
  PERFIS,
} from "../middlewares/auth";

const router = Router();

router.get(
  "/public/treinamento-poc-sep-001/unidades",
  listarUnidadesTreinamentoPocSep001,
);
router.get(
  "/public/treinamento-poc-sep-001/participante",
  localizarParticipanteTreinamentoPocSep001,
);
router.post(
  "/public/treinamento-poc-sep-001/iniciar",
  iniciarTreinamentoPocSep001,
);
router.put(
  "/public/treinamento-poc-sep-001/:token/etapa",
  concluirEtapaTreinamentoPocSep001,
);
router.post(
  "/public/treinamento-poc-sep-001/:token/quiz",
  responderQuizTreinamentoPocSep001,
);
router.post(
  "/public/treinamento-poc-sep-001/:token/concluir",
  concluirTreinamentoPocSep001,
);
router.get(
  "/public/treinamento-poc-sep-001/:token/certificado",
  baixarCertificadoPocSep001,
);
router.get(
  "/treinamentos-poc-sep-001",
  autenticarUsuario,
  autorizarPerfis(acessoTreinamentosTerminal),
  listarTreinamentosPocSep001,
);
router.post(
  "/treinamentos-poc-sep-001/:id/reenviar-email",
  autenticarUsuario,
  autorizarPerfis(acessoTreinamentosTerminal),
  reenviarEmailTreinamentoPocSep001,
);
router.delete(
  "/treinamentos-poc-sep-001/:id",
  autenticarUsuario,
  autorizarPerfis([PERFIS.SUPER_ADMIN]),
  excluirTreinamentoPocSep001,
);

export default router;
