import { Router } from "express";
import {
  baixarCertificadoPocSep006,
  baixarCertificadosPocSep006Zip,
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
  acessoTreinamentosTerminal,
  autenticarUsuario,
  autorizarPerfis,
  PERFIS,
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
router.get(
  "/treinamentos-poc-sep-006/certificados.zip",
  autenticarUsuario,
  autorizarPerfis(acessoTreinamentosTerminal),
  baixarCertificadosPocSep006Zip,
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
  autorizarPerfis([PERFIS.SUPER_ADMIN]),
  excluirTreinamentoPocSep006,
);

export default router;
