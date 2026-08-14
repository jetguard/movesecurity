import { Router } from "express";
import {
  atualizarPlanoAcao,
  criarPlanoAcao,
  excluirPlanoAcao,
  listarOrigensPlanoAcao,
  listarPlanosAcao,
  listarResponsaveisPlanoAcao,
} from "../controllers/planoAcao.controller";
import {
  acessoAnalise,
  autenticarUsuario,
  autorizarPerfis,
} from "../middlewares/auth";

const router = Router();

router.get(
  "/",
  autenticarUsuario,
  autorizarPerfis(acessoAnalise),
  listarPlanosAcao,
);
router.get(
  "/origens",
  autenticarUsuario,
  autorizarPerfis(acessoAnalise),
  listarOrigensPlanoAcao,
);
router.get(
  "/responsaveis",
  autenticarUsuario,
  autorizarPerfis(acessoAnalise),
  listarResponsaveisPlanoAcao,
);
router.post(
  "/",
  autenticarUsuario,
  autorizarPerfis(acessoAnalise),
  criarPlanoAcao,
);
router.put(
  "/:id",
  autenticarUsuario,
  autorizarPerfis(acessoAnalise),
  atualizarPlanoAcao,
);
router.delete(
  "/:id",
  autenticarUsuario,
  autorizarPerfis(acessoAnalise),
  excluirPlanoAcao,
);

export default router;
