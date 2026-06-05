import { Router } from "express";
import { excluirDocumentoCentral, listarDocumentos } from "../controllers/documento.controller";
import { acessoRelatorios, autenticarUsuario, autorizarPerfis, PERFIS } from "../middlewares/auth";

const router = Router();

router.get("/", autenticarUsuario, autorizarPerfis(acessoRelatorios), listarDocumentos);
router.delete("/:modulo/:id", autenticarUsuario, autorizarPerfis([PERFIS.SUPER_ADMIN]), excluirDocumentoCentral);

export default router;
