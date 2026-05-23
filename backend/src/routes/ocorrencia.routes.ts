import { Router } from "express";
import multer from "multer";
import path from "path";

import {
  criarOcorrencia,
  listarOcorrencias,
  buscarOcorrenciaPorId,
  gerarPdfOcorrencia,
} from "../controllers/ocorrencia.controller";
import { autenticarUsuario } from "../middlewares/auth";

const router = Router();

const storage = multer.diskStorage({
  destination: "uploads/ocorrencias",
  filename: (req, file, cb) => {
    const nomeUnico = `${Date.now()}-${file.originalname}`;
    cb(null, nomeUnico);
  },
});

const upload = multer({ storage });

router.post("/", upload.array("anexos"), criarOcorrencia);
router.get("/", listarOcorrencias);
router.get("/:id/pdf", autenticarUsuario, gerarPdfOcorrencia);
router.get("/:id", buscarOcorrenciaPorId);

export default router;
