import { Router } from "express";
import {
  atualizarAnaliseEstrategica,
  buscarVinculoAnaliseEstrategica,
  criarAnaliseEstrategica,
  listarAnalisesEstrategicas,
} from "../controllers/analiseEstrategica.controller";
import { acessoAnalise, autenticarUsuario, autorizarPerfis } from "../middlewares/auth";

const router = Router();

router.get("/", autenticarUsuario, autorizarPerfis(acessoAnalise), listarAnalisesEstrategicas);
router.get("/vinculo", autenticarUsuario, autorizarPerfis(acessoAnalise), buscarVinculoAnaliseEstrategica);
router.post("/", autenticarUsuario, autorizarPerfis(acessoAnalise), criarAnaliseEstrategica);
router.put("/:id", autenticarUsuario, autorizarPerfis(acessoAnalise), atualizarAnaliseEstrategica);

export default router;

