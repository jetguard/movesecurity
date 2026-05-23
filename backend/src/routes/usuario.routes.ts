import { Router } from "express";
import fs from "fs";
import multer from "multer";
import {
  atualizarPerfil,
  buscarPerfil,
  listarUsuarios,
} from "../controllers/usuario.controller";
import { autenticarUsuario } from "../middlewares/auth";

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

const upload = multer({ storage });

router.get("/", listarUsuarios);
router.get("/me", autenticarUsuario, buscarPerfil);
router.put("/me", autenticarUsuario, upload.single("fotoPerfil"), atualizarPerfil);

export default router;
