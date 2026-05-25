import { Router } from "express";
import {
  arquivarCard,
  atualizarCard,
  atualizarColuna,
  criarCard,
  criarColuna,
  listarPlanejamento,
  moverCard,
  reordenarColunas,
} from "../controllers/planejamento.controller";
import { acessoRelatorios, autenticarUsuario, autorizarPerfis } from "../middlewares/auth";

const router = Router();

router.get("/", autenticarUsuario, autorizarPerfis(acessoRelatorios), listarPlanejamento);
router.post("/colunas", autenticarUsuario, autorizarPerfis(acessoRelatorios), criarColuna);
router.put("/colunas/ordem", autenticarUsuario, autorizarPerfis(acessoRelatorios), reordenarColunas);
router.put("/colunas/:id", autenticarUsuario, autorizarPerfis(acessoRelatorios), atualizarColuna);
router.post("/cards", autenticarUsuario, autorizarPerfis(acessoRelatorios), criarCard);
router.put("/cards/:id", autenticarUsuario, autorizarPerfis(acessoRelatorios), atualizarCard);
router.put("/cards/:id/mover", autenticarUsuario, autorizarPerfis(acessoRelatorios), moverCard);
router.delete("/cards/:id", autenticarUsuario, autorizarPerfis(acessoRelatorios), arquivarCard);

export default router;
