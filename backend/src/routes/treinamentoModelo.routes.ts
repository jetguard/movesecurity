import { Router } from "express";
import {
  baixarCertificadoTreinamentoModelo,
  buscarTreinamentoPublico,
  concluirEtapaTreinamentoModelo,
  concluirTreinamentoModelo,
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
} from "../middlewares/auth";

const router = Router();

router.get("/public/treinamentos-dinamicos/unidades", listarUnidadesTreinamentoModelo);
router.get("/public/treinamentos-dinamicos/participante", localizarParticipanteTreinamentoModelo);
router.get("/public/treinamentos-dinamicos/:slug", buscarTreinamentoPublico);
router.post("/public/treinamentos-dinamicos/:slug/iniciar", iniciarTreinamentoModelo);
router.put("/public/treinamentos-dinamicos/:token/etapa", concluirEtapaTreinamentoModelo);
router.post("/public/treinamentos-dinamicos/:token/quiz", responderQuizTreinamentoModelo);
router.post("/public/treinamentos-dinamicos/:token/avaliacao", salvarAvaliacaoTreinamentoModelo);
router.post("/public/treinamentos-dinamicos/:token/concluir", concluirTreinamentoModelo);
router.get("/public/treinamentos-dinamicos/:token/certificado", baixarCertificadoTreinamentoModelo);

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
  autorizarPerfis(acessoTotal),
  salvarTreinamentoModelo,
);
router.delete(
  "/treinamentos-dinamicos/participantes/:id",
  autenticarUsuario,
  autorizarPerfis(acessoTotal),
  excluirParticipanteTreinamentoModelo,
);
router.delete(
  "/treinamentos-dinamicos/:id",
  autenticarUsuario,
  autorizarPerfis(acessoTotal),
  excluirTreinamentoModelo,
);
router.post(
  "/treinamentos-dinamicos/participantes/:id/reenviar-email",
  autenticarUsuario,
  autorizarPerfis(acessoTreinamentosTerminal),
  reenviarEmailTreinamentoModelo,
);

export default router;
