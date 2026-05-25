import { Router } from "express";

import {
  register,
  login,
  logout,
} from "../controllers/auth.controller";
import { acessoTotal, autenticarUsuario, autorizarPerfis } from "../middlewares/auth";

const router = Router();

router.post("/register", autenticarUsuario, autorizarPerfis(acessoTotal), register);
router.post("/login", login);
router.post("/logout", autenticarUsuario, logout);

export default router;

