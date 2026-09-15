import { Router } from "express";
import fs from "fs";
import multer from "multer";
import { tiposAnexoPermitidos, uploadLimits } from "../config/security";
import {
  atualizarPlanoAcao,
  buscarPlanoAcao,
  concluirAnaliseMediadorPlanoAcao,
  criarPlanoAcao,
  excluirPlanoAcao,
  listarOrigensPlanoAcao,
  listarPlanosAcao,
  listarResponsaveisPlanoAcao,
  tratarPlanoAcao,
} from "../controllers/planoAcao.controller";
import {
  acessoAnalise,
  autenticarUsuario,
  autorizarPerfis,
} from "../middlewares/auth";

const router = Router();
const uploadDir = "uploads/planos-acao";
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

router.get(
  "/",
  autenticarUsuario,
  autorizarPerfis(acessoAnalise),
  listarPlanosAcao,
);
router.get(
  "/origens",
  autenticarUsuario,
  autorizarPerfis(acessoAnalise),
  listarOrigensPlanoAcao,
);
router.get(
  "/responsaveis",
  autenticarUsuario,
  autorizarPerfis(acessoAnalise),
  listarResponsaveisPlanoAcao,
);
router.get(
  "/:id",
  autenticarUsuario,
  autorizarPerfis(acessoAnalise),
  buscarPlanoAcao,
);
router.post(
  "/",
  autenticarUsuario,
  autorizarPerfis(acessoAnalise),
  criarPlanoAcao,
);
router.post(
  "/:id/tratamento",
  autenticarUsuario,
  autorizarPerfis(acessoAnalise),
  upload.array("anexos"),
  tratarPlanoAcao,
);
router.post(
  "/:id/mediadores/concluir",
  autenticarUsuario,
  autorizarPerfis(acessoAnalise),
  concluirAnaliseMediadorPlanoAcao,
);
router.put(
  "/:id",
  autenticarUsuario,
  autorizarPerfis(acessoAnalise),
  atualizarPlanoAcao,
);
router.delete(
  "/:id",
  autenticarUsuario,
  autorizarPerfis(acessoAnalise),
  excluirPlanoAcao,
);

export default router;
