import { Router } from "express";
import {
  atualizarConfiguracao,
  buscarConfiguracao,
  buscarConfiguracaoOpenAi,
  rankingUsoOpenAi,
  testarSmtpConfiguracao,
} from "../controllers/configuracao.controller";
import {
  acessoTotal,
  autenticarUsuario,
  autorizarPerfis,
  PERFIS,
} from "../middlewares/auth";

const router = Router();

router.get("/openai", autenticarUsuario, autorizarPerfis(acessoTotal), buscarConfiguracaoOpenAi);
router.get("/openai/consumo", autenticarUsuario, autorizarPerfis(acessoTotal), rankingUsoOpenAi);
router.post(
  "/smtp/teste",
  autenticarUsuario,
  autorizarPerfis([PERFIS.SUPER_ADMIN]),
  testarSmtpConfiguracao,
);
router.get("/", autenticarUsuario, autorizarPerfis(acessoTotal), buscarConfiguracao);
router.put("/", autenticarUsuario, autorizarPerfis(acessoTotal), atualizarConfiguracao);

export default router;
