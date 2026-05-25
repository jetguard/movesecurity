import { Router } from "express";
import {
  atualizarLocal,
  criarLocal,
  excluirLocal,
  listarLocais,
} from "../controllers/local.controller";
import { acessoRelatorios, acessoTotal, autenticarUsuario, autorizarPerfis } from "../middlewares/auth";

const router = Router();

router.get("/", autenticarUsuario, autorizarPerfis(acessoRelatorios), listarLocais);
router.post("/", autenticarUsuario, autorizarPerfis(acessoTotal), criarLocal);
router.put("/:id", autenticarUsuario, autorizarPerfis(acessoTotal), atualizarLocal);
router.delete("/:id", autenticarUsuario, autorizarPerfis(acessoTotal), excluirLocal);

export default router;
