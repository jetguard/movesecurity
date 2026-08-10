import { Router } from "express";
import {
  baixarCertificadoPocSep004,
  concluirEtapaTreinamentoPocSep004,
  concluirTreinamentoPocSep004,
  excluirTreinamentoPocSep004,
  iniciarTreinamentoPocSep004,
  listarTreinamentosPocSep004,
  listarUnidadesTreinamentoPocSep004,
  localizarParticipanteTreinamentoPocSep004,
  reenviarEmailTreinamentoPocSep004,
  responderQuizTreinamentoPocSep004,
} from "../controllers/treinamentoPocSep004.controller";
import {
  acessoTreinamentosTerminal,
  autenticarUsuario,
  autorizarPerfis,
  PERFIS,
} from "../middlewares/auth";

const router = Router();

router.get(
  "/public/treinamento-poc-sep-004/unidades",
  listarUnidadesTreinamentoPocSep004,
);
router.get(
  "/public/treinamento-poc-sep-004/participante",
  localizarParticipanteTreinamentoPocSep004,
);
router.post(
  "/public/treinamento-poc-sep-004/iniciar",
  iniciarTreinamentoPocSep004,
);
router.put(
  "/public/treinamento-poc-sep-004/:token/etapa",
  concluirEtapaTreinamentoPocSep004,
);
router.post(
  "/public/treinamento-poc-sep-004/:token/quiz",
  responderQuizTreinamentoPocSep004,
);
router.post(
  "/public/treinamento-poc-sep-004/:token/concluir",
  concluirTreinamentoPocSep004,
);
router.get(
  "/public/treinamento-poc-sep-004/:token/certificado",
  baixarCertificadoPocSep004,
);
router.get(
  "/treinamentos-poc-sep-004",
  autenticarUsuario,
  autorizarPerfis(acessoTreinamentosTerminal),
  listarTreinamentosPocSep004,
);
router.post(
  "/treinamentos-poc-sep-004/:id/reenviar-email",
  autenticarUsuario,
  autorizarPerfis(acessoTreinamentosTerminal),
  reenviarEmailTreinamentoPocSep004,
);
router.delete(
  "/treinamentos-poc-sep-004/:id",
  autenticarUsuario,
  autorizarPerfis([PERFIS.SUPER_ADMIN]),
  excluirTreinamentoPocSep004,
);

export default router;
