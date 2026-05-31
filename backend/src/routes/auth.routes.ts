import { Router } from "express";

import {
  register,
  login,
  logout,
  renovarSessao,
  emitirCsrf,
  alterarSenhaObrigatoria,
  desbloquearSessao,
} from "../controllers/auth.controller";
import { acessoTotal, autenticarUsuario, autorizarPerfis } from "../middlewares/auth";

const router = Router();

router.post("/register", autenticarUsuario, autorizarPerfis(acessoTotal), register);
router.post("/login", login);
router.post("/refresh", renovarSessao);
router.get("/csrf", emitirCsrf);
router.post("/alterar-senha", autenticarUsuario, alterarSenhaObrigatoria);
router.post("/desbloquear-sessao", autenticarUsuario, desbloquearSessao);
router.post("/logout", autenticarUsuario, logout);

export default router;

