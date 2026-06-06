import { Router } from "express";
import multer from "multer";
import { obterInteligencia, sugerirRelatoPorOcr, transcreverRelatoAudio } from "../controllers/inteligencia.controller";
import { acessoAnalise, acessoRelatorios, autenticarUsuario, autorizarPerfis } from "../middlewares/auth";

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: Number(process.env.UPLOAD_MAX_FILE_SIZE || 10 * 1024 * 1024),
  },
});

router.get("/", autenticarUsuario, autorizarPerfis(acessoAnalise), obterInteligencia);
router.post(
  "/relato-ocr",
  autenticarUsuario,
  autorizarPerfis(acessoRelatorios),
  upload.single("documento"),
  sugerirRelatoPorOcr
);
router.post(
  "/relato-audio",
  autenticarUsuario,
  autorizarPerfis(acessoRelatorios),
  upload.single("audio"),
  transcreverRelatoAudio
);

export default router;
