import { Router } from "express";
import {
  baixarCertificadoPocSep005,
  concluirEtapaTreinamentoPocSep005,
  concluirTreinamentoPocSep005,
  excluirTreinamentoPocSep005,
  iniciarTreinamentoPocSep005,
  listarTreinamentosPocSep005,
  listarUnidadesTreinamentoPocSep005,
  localizarParticipanteTreinamentoPocSep005,
  reenviarEmailTreinamentoPocSep005,
  responderQuizTreinamentoPocSep005,
} from "../controllers/treinamentoPocSep005.controller";
import {
  acessoTreinamentosTerminal,
  autenticarUsuario,
  autorizarPerfis,
  PERFIS,
} from "../middlewares/auth";

const router = Router();

router.get(
  "/public/treinamento-poc-sep-005/unidades",
  listarUnidadesTreinamentoPocSep005,
);
router.get(
  "/public/treinamento-poc-sep-005/participante",
  localizarParticipanteTreinamentoPocSep005,
);
router.post(
  "/public/treinamento-poc-sep-005/iniciar",
  iniciarTreinamentoPocSep005,
);
router.put(
  "/public/treinamento-poc-sep-005/:token/etapa",
  concluirEtapaTreinamentoPocSep005,
);
router.post(
  "/public/treinamento-poc-sep-005/:token/quiz",
  responderQuizTreinamentoPocSep005,
);
router.post(
  "/public/treinamento-poc-sep-005/:token/concluir",
  concluirTreinamentoPocSep005,
);
router.get(
  "/public/treinamento-poc-sep-005/:token/certificado",
  baixarCertificadoPocSep005,
);
router.get(
  "/treinamentos-poc-sep-005",
  autenticarUsuario,
  autorizarPerfis(acessoTreinamentosTerminal),
  listarTreinamentosPocSep005,
);
router.post(
  "/treinamentos-poc-sep-005/:id/reenviar-email",
  autenticarUsuario,
  autorizarPerfis(acessoTreinamentosTerminal),
  reenviarEmailTreinamentoPocSep005,
);
router.delete(
  "/treinamentos-poc-sep-005/:id",
  autenticarUsuario,
  autorizarPerfis([PERFIS.SUPER_ADMIN]),
  excluirTreinamentoPocSep005,
);

export default router;
