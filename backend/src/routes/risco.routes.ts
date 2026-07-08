import { Router } from "express";
import fs from "fs";
import multer from "multer";
import {
  atualizarRisco,
  atualizarCatalogoRisco,
  buscarVinculoRisco,
  criarCatalogoRisco,
  criarRisco,
  excluirCatalogoRisco,
  gerarPdfRisco,
  listarCatalogoRiscos,
  listarLocaisRisco,
  listarRiscos,
  removerCatalogoRisco,
} from "../controllers/risco.controller";
import { acessoAnalise, autenticarUsuario, autorizarPerfis } from "../middlewares/auth";
import { uploadLimits } from "../config/security";

const router = Router();
const uploadDir = "uploads/riscos";
fs.mkdirSync(uploadDir, { recursive: true });

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
    const tiposPermitidos = ["image/jpeg", "image/png", "image/webp"];
    if (!tiposPermitidos.includes(file.mimetype)) {
      return cb(new Error("Formato de imagem inválido. Use JPG, PNG ou WEBP."));
    }

    cb(null, true);
  },
});

router.get("/", autenticarUsuario, autorizarPerfis(acessoAnalise), listarRiscos);
router.get("/catalogo", autenticarUsuario, autorizarPerfis(acessoAnalise), listarCatalogoRiscos);
router.get("/locais", autenticarUsuario, autorizarPerfis(acessoAnalise), listarLocaisRisco);
router.post("/catalogo", autenticarUsuario, autorizarPerfis(acessoAnalise), criarCatalogoRisco);
router.put("/catalogo/:id", autenticarUsuario, autorizarPerfis(acessoAnalise), atualizarCatalogoRisco);
router.delete("/catalogo/:id/permanente", autenticarUsuario, autorizarPerfis(acessoAnalise), excluirCatalogoRisco);
router.delete("/catalogo/:id", autenticarUsuario, autorizarPerfis(acessoAnalise), removerCatalogoRisco);
router.get("/vinculo", autenticarUsuario, autorizarPerfis(acessoAnalise), buscarVinculoRisco);
router.post("/", autenticarUsuario, autorizarPerfis(acessoAnalise), upload.array("fotos"), criarRisco);
router.put("/:id", autenticarUsuario, autorizarPerfis(acessoAnalise), atualizarRisco);
router.get("/:id/pdf", autenticarUsuario, autorizarPerfis(acessoAnalise), gerarPdfRisco);

export default router;

