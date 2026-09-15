import { Router } from "express";
import {
  adicionarInformacaoPassagem,
  atualizarPassagemTurno,
  atualizarScannerPassagem,
  criarPassagemTurno,
  criarRegistroOperacional,
  criarScannerPassagem,
  excluirPassagemTurno,
  excluirScannerPassagem,
  finalizarPassagemTurno,
  gerarPdfPassagemTurno,
  listarPassagensTurno,
  listarScannerPassagens,
  listarUsuariosMesmaEquipe,
  ultimoChecklistEquipamentosPassagem,
  painelOperacionalSoc,
} from "../controllers/operacao.controller";
import {
  consolidarRelatorioDiario,
  gerarPdfRelatorioDiario,
  listarRelatoriosDiarios,
  previsualizarRelatorioDiario,
} from "../controllers/relatorioDiario.controller";
import { acessoRelatorios, acessoTotal, autenticarUsuario, autorizarPerfis } from "../middlewares/auth";

const router = Router();

router.get("/soc", autenticarUsuario, autorizarPerfis(acessoRelatorios), painelOperacionalSoc);
router.post("/registros", autenticarUsuario, autorizarPerfis(acessoRelatorios), criarRegistroOperacional);
router.get("/usuarios-equipe", autenticarUsuario, autorizarPerfis(acessoRelatorios), listarUsuariosMesmaEquipe);
router.get("/scanner", autenticarUsuario, autorizarPerfis(acessoRelatorios), listarScannerPassagens);
router.post("/scanner", autenticarUsuario, autorizarPerfis(acessoRelatorios), criarScannerPassagem);
router.put("/scanner/:id", autenticarUsuario, autorizarPerfis(acessoRelatorios), atualizarScannerPassagem);
router.delete("/scanner/:id", autenticarUsuario, autorizarPerfis(acessoTotal), excluirScannerPassagem);
router.get("/passagens-turno", autenticarUsuario, autorizarPerfis(acessoRelatorios), listarPassagensTurno);
router.get("/passagens-turno/ultimo-checklist-equipamentos", autenticarUsuario, autorizarPerfis(acessoRelatorios), ultimoChecklistEquipamentosPassagem);
router.post("/passagens-turno", autenticarUsuario, autorizarPerfis(acessoRelatorios), criarPassagemTurno);
router.post("/passagens-turno/adicionar-informacao", autenticarUsuario, autorizarPerfis(acessoRelatorios), adicionarInformacaoPassagem);
router.put("/passagens-turno/:id", autenticarUsuario, autorizarPerfis(acessoRelatorios), atualizarPassagemTurno);
router.post("/passagens-turno/:id/finalizar", autenticarUsuario, autorizarPerfis(acessoRelatorios), finalizarPassagemTurno);
router.get("/passagens-turno/:id/pdf", autenticarUsuario, autorizarPerfis(acessoRelatorios), gerarPdfPassagemTurno);
router.delete("/passagens-turno/:id", autenticarUsuario, autorizarPerfis(acessoTotal), excluirPassagemTurno);
router.get("/relatorios-diarios", autenticarUsuario, autorizarPerfis(acessoTotal), listarRelatoriosDiarios);
router.get("/relatorios-diarios/previa", autenticarUsuario, autorizarPerfis(acessoTotal), previsualizarRelatorioDiario);
router.post("/relatorios-diarios", autenticarUsuario, autorizarPerfis(acessoTotal), consolidarRelatorioDiario);
router.get("/relatorios-diarios/:id/pdf", autenticarUsuario, autorizarPerfis(acessoTotal), gerarPdfRelatorioDiario);

export default router;
