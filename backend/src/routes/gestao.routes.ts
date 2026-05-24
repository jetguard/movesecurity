import { Router } from "express";
import {
  buscaGlobal,
  centralTarefas,
  historicoLegivel,
  listarEvidencias,
  listarNotificacoes,
  listarPendencias,
  marcarNotificacaoLida,
  marcarTodasNotificacoesLidas,
  timelineRegistro,
} from "../controllers/gestao.controller";
import { acessoRelatorios, autenticarUsuario, autorizarPerfis } from "../middlewares/auth";

const router = Router();

router.get("/evidencias", autenticarUsuario, autorizarPerfis(acessoRelatorios), listarEvidencias);
router.get("/pendencias", autenticarUsuario, autorizarPerfis(acessoRelatorios), listarPendencias);
router.get("/notificacoes", autenticarUsuario, autorizarPerfis(acessoRelatorios), listarNotificacoes);
router.post("/notificacoes/lidas", autenticarUsuario, autorizarPerfis(acessoRelatorios), marcarTodasNotificacoesLidas);
router.post("/notificacoes/:id/lida", autenticarUsuario, autorizarPerfis(acessoRelatorios), marcarNotificacaoLida);
router.get("/busca", autenticarUsuario, autorizarPerfis(acessoRelatorios), buscaGlobal);
router.get("/tarefas", autenticarUsuario, autorizarPerfis(acessoRelatorios), centralTarefas);
router.get("/historico/:tipo/:id", autenticarUsuario, autorizarPerfis(acessoRelatorios), historicoLegivel);
router.get("/timeline/:tipo/:id", autenticarUsuario, autorizarPerfis(acessoRelatorios), timelineRegistro);

export default router;

