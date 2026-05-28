import { Router } from "express";
import fs from "fs";
import multer from "multer";
import {
  atualizarStatusSugestaoMelhoria,
  criarSugestaoMelhoria,
  listarSugestoesMelhoria,
} from "../controllers/sugestaoMelhoria.controller";
import { acessoRelatorios, autenticarUsuario, autorizarPerfis } from "../middlewares/auth";
import { uploadLimits } from "../config/security";

const router = Router();
const uploadDir = "uploads/sugestoes-melhoria";
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
    if (!file.mimetype.startsWith("image/") && file.mimetype !== "application/pdf") {
      return cb(new Error("Envie uma imagem ou PDF como print de tela."));
    }

    cb(null, true);
  },
});

router.get("/", autenticarUsuario, autorizarPerfis(acessoRelatorios), listarSugestoesMelhoria);
router.post("/", autenticarUsuario, autorizarPerfis(acessoRelatorios), upload.single("printTela"), criarSugestaoMelhoria);
router.put("/:id/status", autenticarUsuario, autorizarPerfis(acessoRelatorios), atualizarStatusSugestaoMelhoria);

export default router;
