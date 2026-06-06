import { Router } from "express";
import fs from "fs";
import multer from "multer";
import {
  buscarRelatoCampoPublico,
  converterRelatoCampo,
  enviarRelatoCampoPublico,
  gerarLinkRelatoCampo,
  listarRelatosCampo,
} from "../controllers/relatoCampo.controller";
import { tiposAnexoPermitidos, uploadLimits } from "../config/security";
import { acessoRelatorios, autenticarUsuario, autorizarPerfis } from "../middlewares/auth";

const router = Router();
const uploadDir = "uploads/relatos-campo";
fs.mkdirSync(uploadDir, { recursive: true });

const tiposPermitidosRelatoCampo = [
  ...tiposAnexoPermitidos,
  "audio/webm",
  "audio/ogg",
  "audio/mpeg",
  "audio/mp3",
  "audio/mp4",
  "audio/wav",
  "audio/x-wav",
  "audio/aac",
];

const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const upload = multer({
  storage,
  limits: uploadLimits,
  fileFilter: (req, file, cb) => {
    if (!tiposPermitidosRelatoCampo.includes(file.mimetype)) {
      return cb(new Error("Tipo de arquivo não permitido."));
    }
    cb(null, true);
  },
});

router.get("/", autenticarUsuario, autorizarPerfis(acessoRelatorios), listarRelatosCampo);
router.post("/links", autenticarUsuario, autorizarPerfis(acessoRelatorios), gerarLinkRelatoCampo);
router.post("/:id/converter", autenticarUsuario, autorizarPerfis(acessoRelatorios), converterRelatoCampo);

router.get("/coleta/:token", buscarRelatoCampoPublico);
router.post("/coleta/:token", upload.any(), enviarRelatoCampoPublico);

export default router;
