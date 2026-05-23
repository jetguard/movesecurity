import { Router } from "express";
import fs from "fs";
import multer from "multer";

import {
  buscarEventoPorId,
  atualizarEvento,
  criarEvento,
  gerarPdfEvento,
  listarEventos,
} from "../controllers/evento.controller";
import { autenticarUsuario } from "../middlewares/auth";

const router = Router();

const uploadDir = "uploads/eventos";

fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (req, file, cb) => {
    const nomeUnico = `${Date.now()}-${file.originalname}`;
    cb(null, nomeUnico);
  },
});

const upload = multer({ storage });

router.post("/", upload.array("anexos"), criarEvento);
router.get("/", listarEventos);
router.get("/:id/pdf", autenticarUsuario, gerarPdfEvento);
router.get("/:id", buscarEventoPorId);
router.put("/:id", upload.array("anexos"), atualizarEvento);

export default router;
