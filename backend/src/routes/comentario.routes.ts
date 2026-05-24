import { Router } from "express";
import { criarComentario, listarComentarios } from "../controllers/comentario.controller";
import { acessoRelatorios, autenticarUsuario, autorizarPerfis } from "../middlewares/auth";

const router = Router();

router.get("/:modulo/:registroId", autenticarUsuario, autorizarPerfis(acessoRelatorios), listarComentarios);
router.post("/:modulo/:registroId", autenticarUsuario, autorizarPerfis(acessoRelatorios), criarComentario);

export default router;

