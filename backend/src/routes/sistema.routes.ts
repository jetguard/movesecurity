import { Router } from "express";
import {
  atualizacoesSistema,
  excluirArquivosQuarentena,
  integridadeSistema,
  moverOrfaosParaQuarentena,
} from "../controllers/sistema.controller";
import { acessoTotal, autenticarUsuario, autorizarPerfis } from "../middlewares/auth";

const router = Router();

router.get(
  "/atualizacoes",
  autenticarUsuario,
  autorizarPerfis(acessoTotal),
  atualizacoesSistema
);

router.get(
  "/integridade",
  autenticarUsuario,
  autorizarPerfis(acessoTotal),
  integridadeSistema
);

router.post(
  "/integridade/orfaos/quarentena",
  autenticarUsuario,
  autorizarPerfis(acessoTotal),
  moverOrfaosParaQuarentena
);

router.post(
  "/integridade/quarentena/excluir",
  autenticarUsuario,
  autorizarPerfis(acessoTotal),
  excluirArquivosQuarentena
);

export default router;
