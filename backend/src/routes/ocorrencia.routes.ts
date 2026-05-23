import { Router } from "express";
import multer from "multer";
import path from "path";

import {
  criarOcorrencia,
  listarOcorrencias,
  buscarOcorrenciaPorId,
} from "../controllers/ocorrencia.controller";

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
router.get("/:id", buscarOcorrenciaPorId);

export default router;