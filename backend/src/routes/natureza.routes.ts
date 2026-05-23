import { Router } from "express";
import {
  criarNatureza,
  criarSubNatureza,
  listarNaturezas,
} from "../controllers/natureza.controller";

const router = Router();

router.get("/", listarNaturezas);
router.post("/", criarNatureza);
router.post("/:naturezaId/subnaturezas", criarSubNatureza);

export default router;
