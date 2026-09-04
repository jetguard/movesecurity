import { Router } from "express";
import fs from "fs";
import multer from "multer";
import path from "path";
import {
  baixarAnexoTreinamentoModelo,
  baixarCertificadoTreinamentoModelo,
  baixarCertificadosTreinamentoModeloZip,
  buscarTreinamentoPublico,
  concluirEtapaTreinamentoModelo,
  concluirTreinamentoModelo,
  enviarConvitesTreinamentoModelo,
  excluirParticipanteTreinamentoModelo,
  excluirTreinamentoModelo,
  iniciarTreinamentoModelo,
  listarTreinamentosModelo,
  listarUnidadesTreinamentoModelo,
  localizarParticipanteTreinamentoModelo,
  reenviarEmailTreinamentoModelo,
  responderQuizTreinamentoModelo,
  salvarAvaliacaoTreinamentoModelo,
  salvarTreinamentoModelo,
  uploadAnexoTreinamentoModelo,
} from "../controllers/treinamentoModelo.controller";
import { tiposAnexoPermitidos, uploadLimits } from "../config/security";
import {
  acessoTotal,
  acessoTreinamentosTerminal,
  autenticarUsuario,
  autorizarPerfis,
  PERFIS,
} from "../middlewares/auth";

const router = Router();
const uploadDir = "uploads/treinamentos-dinamicos";
fs.mkdirSync(uploadDir, { recursive: true });

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
  uploadAnexoTreinamentoModelo,
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
