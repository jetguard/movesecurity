import { NextFunction, Request, Response, Router } from "express";
import fs from "fs";
import multer from "multer";
import path from "path";
import {
  baixarAnexoTreinamentoModelo,
  baixarCertificadoTreinamentoModelo,
  baixarCertificadosTreinamentoModeloZip,
  baixarVideoTreinamentoModelo,
  buscarTreinamentoPublico,
  concluirEtapaTreinamentoModelo,
  concluirTreinamentoModelo,
  enviarConvitesTreinamentoModelo,
  enviarConviteVisitanteTreinamentoModelo,
  excluirParticipanteTreinamentoModelo,
  excluirTreinamentoModelo,
  excluirVisitanteTreinamentoModelo,
  iniciarTreinamentoModelo,
  iniciarTreinamentoModeloTesteSuperAdmin,
  listarTreinamentosModelo,
  listarUnidadesTreinamentoModelo,
  listarVisitantesTreinamentoModelo,
  localizarParticipanteTreinamentoModelo,
  reenviarEmailTreinamentoModelo,
  responderQuizTreinamentoModelo,
  salvarAvaliacaoTreinamentoModelo,
  salvarTreinamentoModelo,
  salvarVisitanteTreinamentoModelo,
  uploadAnexoTreinamentoModelo,
  uploadVideoTreinamentoModelo,
} from "../controllers/treinamentoModelo.controller";
import {
  tiposAnexoPermitidos,
  tiposVideoPermitidos,
  uploadLimits,
  videoUploadLimits,
} from "../config/security";
import {
  acessoTotal,
  acessoTreinamentosTerminal,
  autenticarUsuario,
  autorizarPerfis,
  PERFIS,
} from "../middlewares/auth";

const router = Router();
const uploadDir = "uploads/treinamentos-dinamicos";
const videoUploadDir = "uploads/treinamentos-dinamicos/videos";
fs.mkdirSync(uploadDir, { recursive: true });
fs.mkdirSync(videoUploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: uploadLimits,
  fileFilter: (req, file, cb) => {
    if (!tiposAnexoPermitidos.includes(file.mimetype)) {
      return cb(new Error("Tipo de arquivo não permitido."));
    }
    return cb(null, true);
  },
});

function tratarErroUpload(
  erro: unknown,
  req: Request,
  res: Response,
  next: NextFunction,
) {
  if (!erro) return next();
  if (erro instanceof multer.MulterError && erro.code === "LIMIT_FILE_SIZE") {
    return res.status(413).json({
      error:
        "Arquivo muito grande para upload. Reduza o tamanho ou compacte o arquivo antes de anexar.",
    });
  }
  if (erro instanceof Error) {
    return res.status(400).json({ error: erro.message });
  }
  return res.status(400).json({ error: "Não foi possível processar o upload." });
}

const videoStorage = multer.diskStorage({
  destination: videoUploadDir,
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || ".mp4";
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
  },
});

const uploadVideo = multer({
  storage: videoStorage,
  limits: videoUploadLimits,
  fileFilter: (req, file, cb) => {
    const extensao = path.extname(file.originalname).toLowerCase();
    const tipoPermitido =
      tiposVideoPermitidos.includes(file.mimetype) ||
      (file.mimetype === "application/octet-stream" &&
        [".mp4", ".webm", ".ogg"].includes(extensao));
    if (!tipoPermitido) {
      return cb(new Error("Tipo de vídeo não permitido."));
    }
    return cb(null, true);
  },
});

router.get(
  "/public/treinamentos-dinamicos/unidades",
  listarUnidadesTreinamentoModelo,
);
router.get(
  "/public/treinamentos-dinamicos/participante",
  localizarParticipanteTreinamentoModelo,
);
router.get("/public/treinamentos-dinamicos/:slug", buscarTreinamentoPublico);
router.get(
  "/public/treinamentos-dinamicos/:slug/anexo",
  baixarAnexoTreinamentoModelo,
);
router.get(
  "/public/treinamentos-dinamicos/:slug/video",
  baixarVideoTreinamentoModelo,
);
router.post(
  "/treinamentos-dinamicos/:slug/teste-super-admin",
  autenticarUsuario,
  autorizarPerfis([PERFIS.SUPER_ADMIN]),
  iniciarTreinamentoModeloTesteSuperAdmin,
);
router.post(
  "/public/treinamentos-dinamicos/:slug/iniciar",
  iniciarTreinamentoModelo,
);
router.put(
  "/public/treinamentos-dinamicos/:token/etapa",
  concluirEtapaTreinamentoModelo,
);
router.post(
  "/public/treinamentos-dinamicos/:token/quiz",
  responderQuizTreinamentoModelo,
);
router.post(
  "/public/treinamentos-dinamicos/:token/avaliacao",
  salvarAvaliacaoTreinamentoModelo,
);
router.post(
  "/public/treinamentos-dinamicos/:token/concluir",
  concluirTreinamentoModelo,
);
router.get(
  "/public/treinamentos-dinamicos/:token/certificado",
  baixarCertificadoTreinamentoModelo,
);

router.get(
  "/treinamentos-dinamicos",
  autenticarUsuario,
  autorizarPerfis(acessoTreinamentosTerminal),
  listarTreinamentosModelo,
);
router.post(
  "/treinamentos-dinamicos",
  autenticarUsuario,
  autorizarPerfis(acessoTotal),
  salvarTreinamentoModelo,
);
router.post(
  "/treinamentos-dinamicos/anexo",
  autenticarUsuario,
  autorizarPerfis(acessoTotal),
  upload.single("anexo"),
  tratarErroUpload,
  uploadAnexoTreinamentoModelo,
);
router.post(
  "/treinamentos-dinamicos/video",
  autenticarUsuario,
  autorizarPerfis(acessoTotal),
  uploadVideo.single("video"),
  tratarErroUpload,
  uploadVideoTreinamentoModelo,
);
router.put(
  "/treinamentos-dinamicos/:id",
  autenticarUsuario,
  autorizarPerfis([PERFIS.SUPER_ADMIN]),
  salvarTreinamentoModelo,
);
router.post(
  "/treinamentos-dinamicos/:id/enviar",
  autenticarUsuario,
  autorizarPerfis(acessoTotal),
  enviarConvitesTreinamentoModelo,
);
router.get(
  "/treinamentos-visitantes",
  autenticarUsuario,
  autorizarPerfis(acessoTreinamentosTerminal),
  listarVisitantesTreinamentoModelo,
);
router.post(
  "/treinamentos-visitantes",
  autenticarUsuario,
  autorizarPerfis(acessoTotal),
  salvarVisitanteTreinamentoModelo,
);
router.put(
  "/treinamentos-visitantes/:id",
  autenticarUsuario,
  autorizarPerfis(acessoTotal),
  salvarVisitanteTreinamentoModelo,
);
router.post(
  "/treinamentos-visitantes/:id/enviar",
  autenticarUsuario,
  autorizarPerfis(acessoTotal),
  enviarConviteVisitanteTreinamentoModelo,
);
router.delete(
  "/treinamentos-visitantes/:id",
  autenticarUsuario,
  autorizarPerfis(acessoTotal),
  excluirVisitanteTreinamentoModelo,
);
router.get(
  "/treinamentos-dinamicos/:id/certificados.zip",
  autenticarUsuario,
  autorizarPerfis(acessoTreinamentosTerminal),
  baixarCertificadosTreinamentoModeloZip,
);
router.delete(
  "/treinamentos-dinamicos/participantes/:id",
  autenticarUsuario,
  autorizarPerfis([PERFIS.SUPER_ADMIN]),
  excluirParticipanteTreinamentoModelo,
);
router.delete(
  "/treinamentos-dinamicos/:id",
  autenticarUsuario,
  autorizarPerfis([PERFIS.SUPER_ADMIN]),
  excluirTreinamentoModelo,
);
router.post(
  "/treinamentos-dinamicos/participantes/:id/reenviar-email",
  autenticarUsuario,
  autorizarPerfis(acessoTreinamentosTerminal),
  reenviarEmailTreinamentoModelo,
);

export default router;
