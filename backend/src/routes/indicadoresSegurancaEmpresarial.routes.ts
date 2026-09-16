import { Router } from "express";
import { indicadoresSegurancaEmpresarial } from "../controllers/indicadoresSegurancaEmpresarial.controller";
import { autenticarUsuario, autorizarPerfis, PERFIS } from "../middlewares/auth";

const router = Router();

router.get(
  "/",
  autenticarUsuario,
  autorizarPerfis([
    PERFIS.SUPER_ADMIN,
    PERFIS.ADMINISTRADOR,
    PERFIS.GESTOR,
    PERFIS.COORDENADOR,
    PERFIS.SUPERVISOR,
    PERFIS.ANALISTA,
    PERFIS.OPERADOR,
  ]),
  indicadoresSegurancaEmpresarial,
);

export default router;
