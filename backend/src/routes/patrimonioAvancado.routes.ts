import { Router } from "express";
import {
  pdfRelatorioExecutivoPatrimonial,
  resumoPatrimonialAvancado,
} from "../controllers/patrimonioAvancado.controller";
import { acessoAnalise, autenticarUsuario, autorizarPerfis } from "../middlewares/auth";

const router = Router();

router.get("/resumo", autenticarUsuario, autorizarPerfis(acessoAnalise), resumoPatrimonialAvancado);
router.get("/relatorio-executivo/pdf", autenticarUsuario, autorizarPerfis(acessoAnalise), pdfRelatorioExecutivoPatrimonial);

export default router;
