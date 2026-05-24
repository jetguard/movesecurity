import { Router } from "express";
import {
  atualizarAnaliseEstrategica,
  criarAnaliseEstrategica,
  listarAnalisesEstrategicas,
} from "../controllers/analiseEstrategica.controller";
import { acessoAnalise, autenticarUsuario, autorizarPerfis } from "../middlewares/auth";

const router = Router();

router.get("/", autenticarUsuario, autorizarPerfis(acessoAnalise), listarAnalisesEstrategicas);
router.post("/", autenticarUsuario, autorizarPerfis(acessoAnalise), criarAnaliseEstrategica);
router.put("/:id", autenticarUsuario, autorizarPerfis(acessoAnalise), atualizarAnaliseEstrategica);

export default router;

