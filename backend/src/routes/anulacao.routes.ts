import { Router } from "express";
import {
  decidirAnulacao,
  listarSolicitacoesAnulacao,
  registrarAcordoAnulacao,
  solicitarAnulacaoRelatorio,
} from "../controllers/anulacao.controller";
import { acessoRelatorios, autenticarUsuario, autorizarPerfis } from "../middlewares/auth";

const router = Router();

router.get("/", autenticarUsuario, autorizarPerfis(acessoRelatorios), listarSolicitacoesAnulacao);
router.post("/", autenticarUsuario, autorizarPerfis(acessoRelatorios), solicitarAnulacaoRelatorio);
router.put("/:id/acordo", autenticarUsuario, autorizarPerfis(acessoRelatorios), registrarAcordoAnulacao);
router.put("/:id/decisao", autenticarUsuario, autorizarPerfis(acessoRelatorios), decidirAnulacao);

export default router;
