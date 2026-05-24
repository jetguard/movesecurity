import { Router } from "express";
import fs from "fs";
import multer from "multer";

import {
  criarOcorrencia,
  listarOcorrencias,
  buscarOcorrenciaPorId,
  gerarPdfOcorrencia,
  atualizarOcorrencia,
} from "../controllers/ocorrencia.controller";
import { acessoRelatorios, autenticarUsuario, autorizarPerfis } from "../middlewares/auth";
import { tiposAnexoPermitidos, uploadLimits } from "../config/security";

const router = Router();
const uploadDir = "uploads/ocorrencias";
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (req, file, cb) => {
    const nomeUnico = `${Date.now()}-${file.originalname}`;
    cb(null, nomeUnico);
  },
});

const upload = multer({
  storage,
  limits: uploadLimits,
  fileFilter: (req, file, cb) => {
    if (!tiposAnexoPermitidos.includes(file.mimetype)) {
      return cb(new Error("Tipo de arquivo não permitido."));
    }

    cb(null, true);
  },
});

router.post("/", autenticarUsuario, autorizarPerfis(acessoRelatorios), upload.array("anexos"), criarOcorrencia);
router.get("/", autenticarUsuario, autorizarPerfis(acessoRelatorios), listarOcorrencias);
router.get("/:id/pdf", autenticarUsuario, gerarPdfOcorrencia);
router.get("/:id", autenticarUsuario, autorizarPerfis(acessoRelatorios), buscarOcorrenciaPorId);
router.put("/:id", autenticarUsuario, autorizarPerfis(acessoRelatorios), upload.array("anexos"), atualizarOcorrencia);

export default router;

