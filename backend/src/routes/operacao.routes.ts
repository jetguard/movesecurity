import { Router } from "express";
import { criarRegistroOperacional, painelOperacionalSoc } from "../controllers/operacao.controller";
import { acessoRelatorios, autenticarUsuario, autorizarPerfis } from "../middlewares/auth";

const router = Router();

router.get("/soc", autenticarUsuario, autorizarPerfis(acessoRelatorios), painelOperacionalSoc);
router.post("/registros", autenticarUsuario, autorizarPerfis(acessoRelatorios), criarRegistroOperacional);

export default router;
