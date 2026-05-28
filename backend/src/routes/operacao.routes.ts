import { Router } from "express";
import {
  adicionarInformacaoPassagem,
  atualizarPassagemTurno,
  criarPassagemTurno,
  criarRegistroOperacional,
  excluirPassagemTurno,
  finalizarPassagemTurno,
  gerarPdfPassagemTurno,
  listarPassagensTurno,
  listarUsuariosMesmaEquipe,
  ultimoChecklistEquipamentosPassagem,
  painelOperacionalSoc,
} from "../controllers/operacao.controller";
import { acessoRelatorios, acessoTotal, autenticarUsuario, autorizarPerfis } from "../middlewares/auth";

const router = Router();

router.get("/soc", autenticarUsuario, autorizarPerfis(acessoRelatorios), painelOperacionalSoc);
router.post("/registros", autenticarUsuario, autorizarPerfis(acessoRelatorios), criarRegistroOperacional);
router.get("/usuarios-equipe", autenticarUsuario, autorizarPerfis(acessoRelatorios), listarUsuariosMesmaEquipe);
router.get("/passagens-turno", autenticarUsuario, autorizarPerfis(acessoRelatorios), listarPassagensTurno);
router.get("/passagens-turno/ultimo-checklist-equipamentos", autenticarUsuario, autorizarPerfis(acessoRelatorios), ultimoChecklistEquipamentosPassagem);
router.post("/passagens-turno", autenticarUsuario, autorizarPerfis(acessoRelatorios), criarPassagemTurno);
router.post("/passagens-turno/adicionar-informacao", autenticarUsuario, autorizarPerfis(acessoRelatorios), adicionarInformacaoPassagem);
router.put("/passagens-turno/:id", autenticarUsuario, autorizarPerfis(acessoRelatorios), atualizarPassagemTurno);
router.post("/passagens-turno/:id/finalizar", autenticarUsuario, autorizarPerfis(acessoRelatorios), finalizarPassagemTurno);
router.get("/passagens-turno/:id/pdf", autenticarUsuario, autorizarPerfis(acessoRelatorios), gerarPdfPassagemTurno);
router.delete("/passagens-turno/:id", autenticarUsuario, autorizarPerfis(acessoTotal), excluirPassagemTurno);

export default router;
