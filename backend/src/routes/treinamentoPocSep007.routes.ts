import { Router } from "express";
import {
  concluirEtapaTreinamentoPocSep007,
  iniciarTreinamentoPocSep007,
  listarTreinamentosPocSep007,
  responderQuizTreinamentoPocSep007,
} from "../controllers/treinamentoPocSep007.controller";
import { acessoTreinamentosTerminal, autenticarUsuario, autorizarPerfis } from "../middlewares/auth";

const router = Router();

router.post("/public/treinamento-poc-sep-007/iniciar", iniciarTreinamentoPocSep007);
router.put("/public/treinamento-poc-sep-007/:token/etapa", concluirEtapaTreinamentoPocSep007);
router.post("/public/treinamento-poc-sep-007/:token/quiz", responderQuizTreinamentoPocSep007);
router.get("/treinamentos-poc-sep-007", autenticarUsuario, autorizarPerfis(acessoTreinamentosTerminal), listarTreinamentosPocSep007);

export default router;
