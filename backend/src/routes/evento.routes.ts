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
import { acessoRelatorios, autenticarUsuario, autorizarPerfis } from "../middlewares/auth";
import { tiposAnexoPermitidos, uploadLimits } from "../config/security";

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

router.post("/", autenticarUsuario, autorizarPerfis(acessoRelatorios), upload.array("anexos"), criarEvento);
router.get("/", autenticarUsuario, autorizarPerfis(acessoRelatorios), listarEventos);
router.get("/:id/pdf", autenticarUsuario, gerarPdfEvento);
router.get("/:id", autenticarUsuario, autorizarPerfis(acessoRelatorios), buscarEventoPorId);
router.put("/:id", autenticarUsuario, autorizarPerfis(acessoRelatorios), upload.array("anexos"), atualizarEvento);

export default router;

