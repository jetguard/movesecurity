import { Router } from "express";
import { painelAnaliticoTreinamentos } from "../controllers/painelTreinamentos.controller";
import {
  acessoPainelTreinamentos,
  autenticarUsuario,
  autorizarPerfis,
} from "../middlewares/auth";

const router = Router();

router.get(
  "/",
  autenticarUsuario,
  autorizarPerfis(acessoPainelTreinamentos),
  painelAnaliticoTreinamentos,
);

export default router;
