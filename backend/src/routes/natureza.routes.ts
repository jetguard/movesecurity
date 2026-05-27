import { Router } from "express";
import {
  atualizarNatureza,
  atualizarSubNatureza,
  criarNatureza,
  criarSubNatureza,
  excluirNatureza,
  excluirSubNatureza,
  listarNaturezas,
} from "../controllers/natureza.controller";
import { acessoAnalise, autenticarUsuario, autorizarPerfis } from "../middlewares/auth";

const router = Router();

router.get("/", autenticarUsuario, listarNaturezas);
router.post("/", autenticarUsuario, autorizarPerfis(acessoAnalise), criarNatureza);
router.put("/:id", autenticarUsuario, autorizarPerfis(acessoAnalise), atualizarNatureza);
router.delete("/:id", autenticarUsuario, autorizarPerfis(acessoAnalise), excluirNatureza);
router.post("/:naturezaId/subnaturezas", autenticarUsuario, autorizarPerfis(acessoAnalise), criarSubNatureza);
router.put("/subnaturezas/:subNaturezaId", autenticarUsuario, autorizarPerfis(acessoAnalise), atualizarSubNatureza);
router.delete("/subnaturezas/:subNaturezaId", autenticarUsuario, autorizarPerfis(acessoAnalise), excluirSubNatureza);

export default router;

