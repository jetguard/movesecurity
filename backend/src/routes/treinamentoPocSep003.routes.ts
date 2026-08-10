import { Router } from "express";
import {
  baixarCertificadoPocSep003,
  concluirEtapaTreinamentoPocSep003,
  concluirTreinamentoPocSep003,
  excluirTreinamentoPocSep003,
  iniciarTreinamentoPocSep003,
  listarTreinamentosPocSep003,
  listarUnidadesTreinamentoPocSep003,
  localizarParticipanteTreinamentoPocSep003,
  reenviarEmailTreinamentoPocSep003,
  responderQuizTreinamentoPocSep003,
} from "../controllers/treinamentoPocSep003.controller";
import {
  acessoTreinamentosTerminal,
  autenticarUsuario,
  autorizarPerfis,
  PERFIS,
} from "../middlewares/auth";

const router = Router();

router.get(
  "/public/treinamento-poc-sep-003/unidades",
  listarUnidadesTreinamentoPocSep003,
);
router.get(
  "/public/treinamento-poc-sep-003/participante",
  localizarParticipanteTreinamentoPocSep003,
);
router.post(
  "/public/treinamento-poc-sep-003/iniciar",
  iniciarTreinamentoPocSep003,
);
router.put(
  "/public/treinamento-poc-sep-003/:token/etapa",
  concluirEtapaTreinamentoPocSep003,
);
router.post(
  "/public/treinamento-poc-sep-003/:token/quiz",
  responderQuizTreinamentoPocSep003,
);
router.post(
  "/public/treinamento-poc-sep-003/:token/concluir",
  concluirTreinamentoPocSep003,
);
router.get(
  "/public/treinamento-poc-sep-003/:token/certificado",
  baixarCertificadoPocSep003,
);
router.get(
  "/treinamentos-poc-sep-003",
  autenticarUsuario,
  autorizarPerfis(acessoTreinamentosTerminal),
  listarTreinamentosPocSep003,
);
router.post(
  "/treinamentos-poc-sep-003/:id/reenviar-email",
  autenticarUsuario,
  autorizarPerfis(acessoTreinamentosTerminal),
  reenviarEmailTreinamentoPocSep003,
);
router.delete(
  "/treinamentos-poc-sep-003/:id",
  autenticarUsuario,
  autorizarPerfis([PERFIS.SUPER_ADMIN]),
  excluirTreinamentoPocSep003,
);

export default router;
