import { Router } from "express";
import {
  adicionarInformacaoPassagem,
  atualizarPassagemTurno,
  atualizarOperacaoIndicador,
  atualizarScannerPassagem,
  criarPassagemTurno,
  criarOperacaoIndicador,
  criarRegistroOperacional,
  criarScannerPassagem,
  excluirOperacaoIndicador,
  excluirPassagemTurno,
  excluirScannerPassagem,
  finalizarPassagemTurno,
  gerarPdfPassagemTurno,
  listarOperacaoIndicadores,
  listarPassagensTurno,
  listarScannerPassagens,
  listarUsuariosMesmaEquipe,
  ultimoChecklistEquipamentosPassagem,
  painelOperacionalSoc,
  validarOperacaoIndicador,
  validarScannerPassagem,
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
router.post("/scanner/:id/validar", autenticarUsuario, validarScannerPassagem);
router.delete("/scanner/:id", autenticarUsuario, autorizarPerfis(acessoTotal), excluirScannerPassagem);
router.get("/indicadores/:modulo", autenticarUsuario, listarOperacaoIndicadores);
router.post("/indicadores/:modulo", autenticarUsuario, criarOperacaoIndicador);
router.put("/indicadores/:modulo/:id", autenticarUsuario, atualizarOperacaoIndicador);
router.post("/indicadores/:modulo/:id/validar", autenticarUsuario, validarOperacaoIndicador);
router.delete("/indicadores/:modulo/:id", autenticarUsuario, excluirOperacaoIndicador);
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
