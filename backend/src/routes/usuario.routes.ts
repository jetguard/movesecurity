import { Router } from "express";
import fs from "fs";
import multer from "multer";
import {
  atualizarPerfil,
  alterarStatusUsuario,
  buscarPerfil,
  criarUsuario,
  excluirUsuario,
  listarUsuarios,
  redefinirSenhaUsuario,
  atualizarUsuario,
} from "../controllers/usuario.controller";
import { acessoTotal, autenticarUsuario, autorizarPerfis } from "../middlewares/auth";
import { uploadLimits } from "../config/security";

const router = Router();

const uploadDir = "uploads/perfis";

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
    const formatosPermitidos = ["image/jpeg", "image/png", "image/webp"];

    if (!formatosPermitidos.includes(file.mimetype)) {
      return cb(new Error("Formato de imagem inválido. Use JPG, PNG ou WEBP."));
    }

    cb(null, true);
  },
});

router.get("/", autenticarUsuario, autorizarPerfis(acessoTotal), listarUsuarios);
router.post("/", autenticarUsuario, autorizarPerfis(acessoTotal), criarUsuario);
router.get("/me", autenticarUsuario, buscarPerfil);
router.put("/me", autenticarUsuario, upload.single("fotoPerfil"), atualizarPerfil);
router.put("/:id", autenticarUsuario, autorizarPerfis(acessoTotal), atualizarUsuario);
router.put("/:id/status", autenticarUsuario, autorizarPerfis(acessoTotal), alterarStatusUsuario);
router.put("/:id/senha", autenticarUsuario, autorizarPerfis(acessoTotal), redefinirSenhaUsuario);
router.delete("/:id", autenticarUsuario, autorizarPerfis(acessoTotal), excluirUsuario);

export default router;

