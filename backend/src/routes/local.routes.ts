import { Router } from "express";
import {
  atualizarLocal,
  criarLocal,
  excluirLocal,
  listarLocais,
} from "../controllers/local.controller";
import { acessoAnalise, acessoRelatorios, acessoTotal, autenticarUsuario, autorizarPerfis } from "../middlewares/auth";

const router = Router();

router.get("/", autenticarUsuario, autorizarPerfis(Array.from(new Set([...acessoRelatorios, ...acessoAnalise]))), listarLocais);
router.post("/", autenticarUsuario, autorizarPerfis(acessoTotal), criarLocal);
router.put("/:id", autenticarUsuario, autorizarPerfis(acessoTotal), atualizarLocal);
router.delete("/:id", autenticarUsuario, autorizarPerfis(acessoTotal), excluirLocal);

export default router;
