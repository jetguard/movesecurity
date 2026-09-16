import { Router } from "express";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import multer from "multer";
import {
  atualizarSolicitacaoImagem,
  assumirAtendimentoSolicitacaoImagem,
  buscarSolicitacaoImagem,
  coletarEvidenciasSolicitacaoImagem,
  criarSolicitacaoImagem,
  criarSolicitacaoImagemPublica,
  enviarFormularioSolicitacaoImagem,
  excluirEvidenciaSolicitacaoImagem,
  excluirSolicitacaoImagem,
  iniciarAtendimentoSolicitacaoImagem,
  listarCamerasConectadasSolicitacaoImagem,
  listarSolicitacoesImagem,
  pausarAtendimentoSolicitacaoImagem,
  validarTokenSolicitacaoImagem,
} from "../controllers/solicitacaoImagem.controller";
import {
  acessoCftvOperacional,
  autenticarUsuario,
  autorizarPerfis,
} from "../middlewares/auth";
import { tiposAnexoPermitidos, uploadLimits } from "../config/security";

const router = Router();
const publicRouter = Router();
const uploadDir = "uploads/solicitacoes-imagens";
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (req, file, cb) => {
    const extensao = path.extname(file.originalname || "").toLowerCase();
    cb(null, `${Date.now()}-${crypto.randomBytes(8).toString("hex")}${extensao}`);
  },
});

const upload = multer({
  storage,
  limits: { ...uploadLimits, files: 10 },
  fileFilter: (req, file, cb) => {
    if (!tiposAnexoPermitidos.includes(file.mimetype)) {
      return cb(new Error("Tipo de arquivo não permitido."));
    }
    cb(null, true);
  },
});

router.use(autenticarUsuario, autorizarPerfis(acessoCftvOperacional));
router.get("/", listarSolicitacoesImagem);
router.post("/", upload.array("anexos"), criarSolicitacaoImagem);
router.post("/formularios", enviarFormularioSolicitacaoImagem);
router.get("/cameras-conectadas", listarCamerasConectadasSolicitacaoImagem);
router.get("/:id", buscarSolicitacaoImagem);
router.put("/:id", upload.array("anexos"), atualizarSolicitacaoImagem);
router.post("/:id/atendimento/iniciar", iniciarAtendimentoSolicitacaoImagem);
router.post("/:id/atendimento/assumir", assumirAtendimentoSolicitacaoImagem);
router.post("/:id/atendimento/pausar", pausarAtendimentoSolicitacaoImagem);
router.post("/:id/evidencias", upload.array("evidencias"), coletarEvidenciasSolicitacaoImagem);
router.delete("/:id/evidencias/:anexoId", excluirEvidenciaSolicitacaoImagem);
router.delete("/:id", excluirSolicitacaoImagem);

publicRouter.get("/:token", validarTokenSolicitacaoImagem);
publicRouter.post("/:token", upload.array("anexos"), criarSolicitacaoImagemPublica);

export { publicRouter as publicSolicitacaoImagemRoutes };
export default router;
