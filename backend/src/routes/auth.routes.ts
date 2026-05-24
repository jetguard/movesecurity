import { Router } from "express";

import {
  register,
  login,
} from "../controllers/auth.controller";
import { acessoTotal, autenticarUsuario, autorizarPerfis } from "../middlewares/auth";

const router = Router();

router.post("/register", autenticarUsuario, autorizarPerfis(acessoTotal), register);
router.post("/login", login);

export default router;

