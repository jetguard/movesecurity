import { Router } from "express";
import {
  criarEvento,
  listarEventos,
} from "../controllers/evento.controller";

const router = Router();

router.post("/", criarEvento);
router.get("/", listarEventos);

export default router;