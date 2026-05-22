import { Router } from "express";
import {
  criarOcorrencia,
  listarOcorrencias,
} from "../controllers/ocorrencia.controller";

const router = Router();

router.get("/", listarOcorrencias);
router.post("/", criarOcorrencia);

export default router;