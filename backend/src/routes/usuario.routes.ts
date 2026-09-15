import { Router } from "express";
import fs from "fs";
import multer from "multer";
import {
  atualizarPerfilAcesso,
  atualizarPerfil,
  atualizarDoisFatores,
  confirmarDoisFatoresAutenticador,
  alterarStatusUsuario,
  buscarPerfil,
  criarPerfilAcesso,
  criarUsuario,
  excluirPerfilAcesso,
  excluirUsuario,
  listarPerfisAcesso,
  listarUsuarios,
  prepararDoisFatoresAutenticador,
  redefinirSenhaUsuario,
  resetarDispositivoUsuario,
  resetarPinUsuario,
  atualizarPinOperacional,
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
router.get(
  "/perfis-acesso",
  autenticarUsuario,
  autorizarPerfis(acessoTotal),
  listarPerfisAcesso,
);
router.post(
  "/perfis-acesso",
  autenticarUsuario,
  autorizarPerfis(["SUPER_ADMIN"]),
  criarPerfilAcesso,
);
router.get("/me", autenticarUsuario, buscarPerfil);
router.put("/me", autenticarUsuario, upload.single("fotoPerfil"), atualizarPerfil);
router.put("/me/2fa", autenticarUsuario, atualizarDoisFatores);
router.post(
  "/me/2fa/authenticator/setup",
  autenticarUsuario,
  prepararDoisFatoresAutenticador,
);
router.post(
  "/me/2fa/authenticator/confirm",
  autenticarUsuario,
  confirmarDoisFatoresAutenticador,
);
router.put("/me/pin", autenticarUsuario, atualizarPinOperacional);
router.put(
  "/perfis-acesso/:id",
  autenticarUsuario,
  autorizarPerfis(["SUPER_ADMIN"]),
  atualizarPerfilAcesso,
);
router.delete(
  "/perfis-acesso/:id",
  autenticarUsuario,
  autorizarPerfis(["SUPER_ADMIN"]),
  excluirPerfilAcesso,
);
router.put("/:id", autenticarUsuario, autorizarPerfis(acessoTotal), atualizarUsuario);
router.put("/:id/status", autenticarUsuario, autorizarPerfis(acessoTotal), alterarStatusUsuario);
router.put("/:id/senha", autenticarUsuario, autorizarPerfis(acessoTotal), redefinirSenhaUsuario);
router.put("/:id/dispositivo/reset", autenticarUsuario, autorizarPerfis(acessoTotal), resetarDispositivoUsuario);
router.put("/:id/pin/reset", autenticarUsuario, autorizarPerfis(["SUPER_ADMIN"]), resetarPinUsuario);
router.delete("/:id", autenticarUsuario, autorizarPerfis(acessoTotal), excluirUsuario);

export default router;

