import { Router } from "express";
import {
  baixarCertificadoTreinamentoModelo,
  baixarCertificadosTreinamentoModeloZip,
  buscarTreinamentoPublico,
  concluirEtapaTreinamentoModelo,
  concluirTreinamentoModelo,
  enviarConvitesTreinamentoModelo,
  excluirParticipanteTreinamentoModelo,
  excluirTreinamentoModelo,
  iniciarTreinamentoModelo,
  listarTreinamentosModelo,
  listarUnidadesTreinamentoModelo,
  localizarParticipanteTreinamentoModelo,
  reenviarEmailTreinamentoModelo,
  responderQuizTreinamentoModelo,
  salvarAvaliacaoTreinamentoModelo,
  salvarTreinamentoModelo,
} from "../controllers/treinamentoModelo.controller";
import {
  acessoTotal,
  acessoTreinamentosTerminal,
  autenticarUsuario,
  autorizarPerfis,
  PERFIS,
} from "../middlewares/auth";

const router = Router();

router.get(
  "/public/treinamentos-dinamicos/unidades",
  listarUnidadesTreinamentoModelo,
);
router.get(
  "/public/treinamentos-dinamicos/participante",
  localizarParticipanteTreinamentoModelo,
);
router.get("/public/treinamentos-dinamicos/:slug", buscarTreinamentoPublico);
router.post(
  "/public/treinamentos-dinamicos/:slug/iniciar",
  iniciarTreinamentoModelo,
);
router.put(
  "/public/treinamentos-dinamicos/:token/etapa",
  concluirEtapaTreinamentoModelo,
);
router.post(
  "/public/treinamentos-dinamicos/:token/quiz",
  responderQuizTreinamentoModelo,
);
router.post(
  "/public/treinamentos-dinamicos/:token/avaliacao",
  salvarAvaliacaoTreinamentoModelo,
);
router.post(
  "/public/treinamentos-dinamicos/:token/concluir",
  concluirTreinamentoModelo,
);
router.get(
  "/public/treinamentos-dinamicos/:token/certificado",
  baixarCertificadoTreinamentoModelo,
);

router.get(
  "/treinamentos-dinamicos",
  autenticarUsuario,
  autorizarPerfis(acessoTreinamentosTerminal),
  listarTreinamentosModelo,
);
router.post(
  "/treinamentos-dinamicos",
  autenticarUsuario,
  autorizarPerfis(acessoTotal),
  salvarTreinamentoModelo,
);
router.put(
  "/treinamentos-dinamicos/:id",
  autenticarUsuario,
  autorizarPerfis([PERFIS.SUPER_ADMIN]),
  salvarTreinamentoModelo,
);
router.post(
  "/treinamentos-dinamicos/:id/enviar",
  autenticarUsuario,
  autorizarPerfis(acessoTotal),
  enviarConvitesTreinamentoModelo,
);
router.get(
  "/treinamentos-dinamicos/:id/certificados.zip",
  autenticarUsuario,
  autorizarPerfis(acessoTreinamentosTerminal),
  baixarCertificadosTreinamentoModeloZip,
);
router.delete(
  "/treinamentos-dinamicos/participantes/:id",
  autenticarUsuario,
  autorizarPerfis([PERFIS.SUPER_ADMIN]),
  excluirParticipanteTreinamentoModelo,
);
router.delete(
  "/treinamentos-dinamicos/:id",
  autenticarUsuario,
  autorizarPerfis([PERFIS.SUPER_ADMIN]),
  excluirTreinamentoModelo,
);
router.post(
  "/treinamentos-dinamicos/participantes/:id/reenviar-email",
  autenticarUsuario,
  autorizarPerfis(acessoTreinamentosTerminal),
  reenviarEmailTreinamentoModelo,
);

export default router;
