import { Router } from "express";
import fs from "fs";
import multer from "multer";
import {
  atualizarContainer,
  buscarContainer,
  criarContainer,
  dashboardQuadra,
  excluirContainer,
  listarContainers,
} from "../controllers/quadraSeguranca.controller";
import { acessoRelatorios, autenticarUsuario, autorizarPerfis } from "../middlewares/auth";
import { tiposAnexoPermitidos, uploadLimits } from "../config/security";

const router = Router();
const uploadDir = "uploads/quadra-seguranca";
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

router.get("/", autenticarUsuario, autorizarPerfis(acessoRelatorios), listarContainers);
router.get("/dashboard", autenticarUsuario, autorizarPerfis(acessoRelatorios), dashboardQuadra);
router.get("/:id", autenticarUsuario, autorizarPerfis(acessoRelatorios), buscarContainer);
router.post("/", autenticarUsuario, autorizarPerfis(acessoRelatorios), upload.array("anexos"), criarContainer);
router.put("/:id", autenticarUsuario, autorizarPerfis(acessoRelatorios), upload.array("anexos"), atualizarContainer);
router.delete("/:id", autenticarUsuario, autorizarPerfis(acessoRelatorios), excluirContainer);

export default router;
