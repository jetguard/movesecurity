import { Router } from "express";
import fs from "fs";
import multer from "multer";
import {
  atualizarRisco,
  atualizarCatalogoRisco,
  atualizarAnaliseCompletaRisco,
  atualizarControlesAnaliseCompletaRisco,
  atualizarTratativaAnaliseCompletaRisco,
  atualizarControlePreventivoCadastro,
  atualizarFatorRiscoCadastro,
  atualizarMacroProcessoRisco,
  atualizarRiscoCadastroGeral,
  atualizarSetorRisco,
  buscarVinculoRisco,
  criarCatalogoRisco,
  criarAnaliseCompletaRisco,
  criarControlePreventivoCadastro,
  criarFatorRiscoCadastro,
  criarMacroProcessoRisco,
  criarRiscoCadastroGeral,
  criarRisco,
  criarSetorRisco,
  excluirCatalogoRisco,
  excluirAnaliseCompletaRisco,
  excluirControlePreventivoCadastro,
  excluirFatorRiscoCadastro,
  excluirMacroProcessoRisco,
  excluirRiscoCadastroGeral,
  excluirSetorRisco,
  finalizarAnaliseCompletaRisco,
  gerarPdfAnaliseCompletaRisco,
  gerarPdfRisco,
  listarAnalisesCompletasRisco,
  listarCadastroGeralRiscos,
  listarCatalogoRiscos,
  listarLocaisRisco,
  listarResponsaveisTratativaRisco,
  listarRiscos,
  listarTratativasAnaliseCompletaRisco,
  removerCatalogoRisco,
} from "../controllers/risco.controller";
import {
  acessoAnalise,
  autenticarUsuario,
  autorizarPerfis,
} from "../middlewares/auth";
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

router.get(
  "/",
  autenticarUsuario,
  autorizarPerfis(acessoAnalise),
  listarRiscos,
);
router.get(
  "/cadastro-geral",
  autenticarUsuario,
  autorizarPerfis(acessoAnalise),
  listarCadastroGeralRiscos,
);
router.get(
  "/analise-completa",
  autenticarUsuario,
  autorizarPerfis(acessoAnalise),
  listarAnalisesCompletasRisco,
);
router.get(
  "/tratativas",
  autenticarUsuario,
  autorizarPerfis(acessoAnalise),
  listarTratativasAnaliseCompletaRisco,
);
router.get(
  "/responsaveis",
  autenticarUsuario,
  autorizarPerfis(acessoAnalise),
  listarResponsaveisTratativaRisco,
);
router.post(
  "/analise-completa",
  autenticarUsuario,
  autorizarPerfis(acessoAnalise),
  criarAnaliseCompletaRisco,
);
router.put(
  "/analise-completa/:id",
  autenticarUsuario,
  autorizarPerfis(acessoAnalise),
  atualizarAnaliseCompletaRisco,
);
router.patch(
  "/analise-completa/:id/controles",
  autenticarUsuario,
  autorizarPerfis(acessoAnalise),
  atualizarControlesAnaliseCompletaRisco,
);
router.patch(
  "/analise-completa/:id/tratativa",
  autenticarUsuario,
  autorizarPerfis(acessoAnalise),
  atualizarTratativaAnaliseCompletaRisco,
);
router.patch(
  "/analise-completa/:id/finalizacao",
  autenticarUsuario,
  autorizarPerfis(acessoAnalise),
  finalizarAnaliseCompletaRisco,
);
router.get(
  "/analise-completa/:id/pdf",
  autenticarUsuario,
  autorizarPerfis(acessoAnalise),
  gerarPdfAnaliseCompletaRisco,
);
router.delete(
  "/analise-completa/:id",
  autenticarUsuario,
  autorizarPerfis(acessoAnalise),
  excluirAnaliseCompletaRisco,
);
router.post(
  "/cadastro-geral/macro-processos",
  autenticarUsuario,
  autorizarPerfis(acessoAnalise),
  criarMacroProcessoRisco,
);
router.put(
  "/cadastro-geral/macro-processos/:id",
  autenticarUsuario,
  autorizarPerfis(acessoAnalise),
  atualizarMacroProcessoRisco,
);
router.delete(
  "/cadastro-geral/macro-processos/:id",
  autenticarUsuario,
  autorizarPerfis(acessoAnalise),
  excluirMacroProcessoRisco,
);
router.post(
  "/cadastro-geral/setores",
  autenticarUsuario,
  autorizarPerfis(acessoAnalise),
  criarSetorRisco,
);
router.put(
  "/cadastro-geral/setores/:id",
  autenticarUsuario,
  autorizarPerfis(acessoAnalise),
  atualizarSetorRisco,
);
router.delete(
  "/cadastro-geral/setores/:id",
  autenticarUsuario,
  autorizarPerfis(acessoAnalise),
  excluirSetorRisco,
);
router.post(
  "/cadastro-geral/riscos",
  autenticarUsuario,
  autorizarPerfis(acessoAnalise),
  criarRiscoCadastroGeral,
);
router.put(
  "/cadastro-geral/riscos/:id",
  autenticarUsuario,
  autorizarPerfis(acessoAnalise),
  atualizarRiscoCadastroGeral,
);
router.delete(
  "/cadastro-geral/riscos/:id",
  autenticarUsuario,
  autorizarPerfis(acessoAnalise),
  excluirRiscoCadastroGeral,
);
router.post(
  "/cadastro-geral/fatores",
  autenticarUsuario,
  autorizarPerfis(acessoAnalise),
  criarFatorRiscoCadastro,
);
router.put(
  "/cadastro-geral/fatores/:id",
  autenticarUsuario,
  autorizarPerfis(acessoAnalise),
  atualizarFatorRiscoCadastro,
);
router.delete(
  "/cadastro-geral/fatores/:id",
  autenticarUsuario,
  autorizarPerfis(acessoAnalise),
  excluirFatorRiscoCadastro,
);
router.post(
  "/cadastro-geral/controles",
  autenticarUsuario,
  autorizarPerfis(acessoAnalise),
  criarControlePreventivoCadastro,
);
router.put(
  "/cadastro-geral/controles/:id",
  autenticarUsuario,
  autorizarPerfis(acessoAnalise),
  atualizarControlePreventivoCadastro,
);
router.delete(
  "/cadastro-geral/controles/:id",
  autenticarUsuario,
  autorizarPerfis(acessoAnalise),
  excluirControlePreventivoCadastro,
);
router.get(
  "/catalogo",
  autenticarUsuario,
  autorizarPerfis(acessoAnalise),
  listarCatalogoRiscos,
);
router.get(
  "/locais",
  autenticarUsuario,
  autorizarPerfis(acessoAnalise),
  listarLocaisRisco,
);
router.post(
  "/catalogo",
  autenticarUsuario,
  autorizarPerfis(acessoAnalise),
  criarCatalogoRisco,
);
router.put(
  "/catalogo/:id",
  autenticarUsuario,
  autorizarPerfis(acessoAnalise),
  atualizarCatalogoRisco,
);
router.delete(
  "/catalogo/:id/permanente",
  autenticarUsuario,
  autorizarPerfis(acessoAnalise),
  excluirCatalogoRisco,
);
router.delete(
  "/catalogo/:id",
  autenticarUsuario,
  autorizarPerfis(acessoAnalise),
  removerCatalogoRisco,
);
router.get(
  "/vinculo",
  autenticarUsuario,
  autorizarPerfis(acessoAnalise),
  buscarVinculoRisco,
);
router.post(
  "/",
  autenticarUsuario,
  autorizarPerfis(acessoAnalise),
  upload.array("fotos"),
  criarRisco,
);
router.put(
  "/:id",
  autenticarUsuario,
  autorizarPerfis(acessoAnalise),
  atualizarRisco,
);
router.get(
  "/:id/pdf",
  autenticarUsuario,
  autorizarPerfis(acessoAnalise),
  gerarPdfRisco,
);

export default router;
