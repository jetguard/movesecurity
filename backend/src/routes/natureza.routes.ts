import { Router } from "express";
import {
  criarNatureza,
  criarSubNatureza,
  listarNaturezas,
} from "../controllers/natureza.controller";
import { acessoTotal, autenticarUsuario, autorizarPerfis } from "../middlewares/auth";

const router = Router();

router.get("/", autenticarUsuario, listarNaturezas);
router.post("/", autenticarUsuario, autorizarPerfis(acessoTotal), criarNatureza);
router.post("/:naturezaId/subnaturezas", autenticarUsuario, autorizarPerfis(acessoTotal), criarSubNatureza);

export default router;

