import { Router } from "express";

import {
  register,
  login,
  confirmarLogin2fa,
  logout,
  renovarSessao,
  emitirCsrf,
  alterarSenhaObrigatoria,
  desbloquearSessao,
  configuracaoSsoPublica,
  iniciarSso,
  callbackSso,
} from "../controllers/auth.controller";
import { acessoTotal, autenticarUsuario, autorizarPerfis } from "../middlewares/auth";

const router = Router();

router.post("/register", autenticarUsuario, autorizarPerfis(acessoTotal), register);
router.post("/login", login);
router.post("/login/2fa", confirmarLogin2fa);
router.get("/sso/config", configuracaoSsoPublica);
router.get("/sso/iniciar", iniciarSso);
router.get("/sso/callback", callbackSso);
router.post("/refresh", renovarSessao);
router.get("/csrf", emitirCsrf);
router.post("/alterar-senha", autenticarUsuario, alterarSenhaObrigatoria);
router.post("/desbloquear-sessao", autenticarUsuario, desbloquearSessao);
router.post("/logout", autenticarUsuario, logout);

export default router;

