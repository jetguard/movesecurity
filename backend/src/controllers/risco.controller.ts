import { Response } from "express";
import { prisma } from "../lib/prisma";
import { AuthRequest } from "../middlewares/auth";
import { registrarLog } from "../services/auditoria.service";
import { gerarRiscoPdf } from "../services/riscoPdf.service";

const valores = {
  "Muito Baixa": 1,
  Baixa: 2,
  Média: 3,
  Media: 3,
  Moderada: 3,
  Alta: 4,
  "Muito Alta": 5,
} as Record<string, number>;
const impactos = {
  Insignificante: 1,
  Baixo: 2,
  Moderado: 3,
  Alto: 4,
  Crítico: 5,
  Critico: 5,
} as Record<string, number>;

function numeroProbabilidade(valor: unknown) {
  const numero = Number(valor);
  if (!Number.isFinite(numero)) return null;
  const permitidos = [1, 2, 3, 4, 5];
  return permitidos.includes(numero)
    ? numero
    : Math.min(Math.max(Math.trunc(numero), 1), 5);
}

function numeroImpacto(valor: unknown) {
  const numero = Number(String(valor).replace(",", "."));
  if (!Number.isFinite(numero)) return null;
  const permitidos = [1, 2, 3, 4, 5];
  return permitidos.includes(numero)
    ? numero
    : Math.min(Math.max(Math.trunc(numero), 1), 5);
}

function textoProbabilidade(valor: number) {
  if (valor <= 1) return "Muito Baixa";
  if (valor <= 2) return "Baixa";
  if (valor <= 3) return "Média";
  if (valor <= 4) return "Alta";
  return "Muito Alta";
}

function textoImpacto(valor: number) {
  if (valor <= 1) return "Insignificante";
  if (valor <= 2) return "Baixo";
  if (valor <= 3) return "Moderado";
  if (valor <= 4) return "Alto";
  return "Crítico";
}

function calcularNivelPorResultado(resultado: number) {
  if (resultado <= 5) return "Baixo";
  if (resultado <= 10) return "Moderado";
  if (resultado <= 15) return "Alto";
  return "Crítico";
}

function calcularClassificacao(req: AuthRequest) {
  const probabilidadeValor =
    numeroProbabilidade(req.body.probabilidadeValor) ||
    valores[req.body.probabilidade] ||
    1;
  const impactoValor =
    numeroImpacto(req.body.impactoValor) || impactos[req.body.severidade] || 1;
  const resultadoRisco = probabilidadeValor * impactoValor;
  const nivelRisco = calcularNivelPorResultado(resultadoRisco);

  return {
    probabilidadeValor,
    impactoValor,
    resultadoRisco,
    nivelRisco,
    probabilidadeTexto:
      req.body.probabilidade || textoProbabilidade(probabilidadeValor),
    impactoTexto: req.body.severidade || textoImpacto(impactoValor),
  };
}

function calcularReavaliacao(req: AuthRequest) {
  const novaProbabilidade = numeroProbabilidade(req.body.novaProbabilidade);
  const novoImpacto = numeroImpacto(req.body.novoImpacto);
  if (!novaProbabilidade || !novoImpacto) {
    return {
      novaProbabilidade: null,
      novoImpacto: null,
      novoResultado: null,
      novoNivelRisco: null,
    };
  }

  const novoResultado = novaProbabilidade * novoImpacto;
  return {
    novaProbabilidade,
    novoImpacto,
    novoResultado,
    novoNivelRisco: calcularNivelPorResultado(novoResultado),
  };
}

function validarAnalise(req: AuthRequest) {
  if (
    !numeroProbabilidade(req.body.probabilidadeValor) &&
    !valores[req.body.probabilidade]
  ) {
    return "Informe a probabilidade da análise.";
  }
  if (!numeroImpacto(req.body.impactoValor) && !impactos[req.body.severidade]) {
    return "Informe o impacto da análise.";
  }
  if (!textoObrigatorio(req.body.criteriosAvaliacao)) {
    return "Informe a justificativa da análise.";
  }
  return null;
}

function normalizarId(valor: unknown) {
  const numero = Number(valor);
  return Number.isFinite(numero) && numero > 0 ? numero : null;
}

function normalizarCodigo(valor: unknown) {
  return String(valor || "")
    .trim()
    .toUpperCase();
}

function textoObrigatorio(valor: unknown) {
  return String(valor || "").trim();
}

function dadosCatalogo(req: AuthRequest) {
  const nome = textoObrigatorio(req.body.nome || req.body.tituloRisco);
  const tipoRisco = textoObrigatorio(
    req.body.tipoRisco || req.body.categoriaRisco,
  );

  return {
    unidade: req.unidadeAtiva || req.body.unidade,
    local: textoObrigatorio(req.body.local) || null,
    area: null,
    nome,
    tipoRisco,
    grauRisco: "Não analisado",
    naturezaRisco:
      textoObrigatorio(req.body.naturezaRisco) ||
      tipoRisco ||
      "Risco operacional",
    origemRisco: null,
    fonteRisco: null,
    fatorRisco: null,
    fragilidade: null,
    eventoIncerteza: null,
    objetivoImpactado: null,
    responsavelNome:
      textoObrigatorio(req.body.responsavelNome || req.body.responsavel) ||
      null,
    descricaoRisco: textoObrigatorio(req.body.descricaoRisco),
    possivelImpacto: textoObrigatorio(req.body.possivelImpacto),
    medidasPreventivas: textoObrigatorio(req.body.medidasPreventivas) || null,
    planoAcaoSugerido:
      textoObrigatorio(req.body.planoAcaoSugerido || req.body.planoAcao) ||
      null,
    status: textoObrigatorio(req.body.status) || "Ativo",
  };
}

function codigoRiscoIdentificado(numero: number, ano: number) {
  return `RISCO-${String(numero).padStart(4, "0")}/${ano}`;
}

function codigoCadastro(prefixo: string, numero: number) {
  return `${prefixo}${String(numero).padStart(3, "0")}`;
}

async function proximoCodigoCadastro(
  tx: any,
  delegate: string,
  prefixo: string,
) {
  await tx.$executeRawUnsafe(
    `SELECT pg_advisory_xact_lock(hashtext('jetguard_${delegate}_${prefixo}'))`,
  );
  const ultimo = await tx[delegate].findFirst({ orderBy: { numero: "desc" } });
  const numero = Number(ultimo?.numero || 0) + 1;
  return { numero, codigo: codigoCadastro(prefixo, numero) };
}

function dadosCadastroSimples(req: AuthRequest) {
  const nome = textoObrigatorio(req.body.nome);
  const descricao = textoObrigatorio(req.body.descricao) || null;
  const status = textoObrigatorio(req.body.status) || "Ativo";
  return { nome, descricao, status };
}

function naturezaAnalise(req: AuthRequest) {
  return (
    textoObrigatorio(req.body.naturezaRisco) ||
    textoObrigatorio(req.body.tipoRisco) ||
    "Risco operacional"
  );
}

export async function listarCadastroGeralRiscos(
  req: AuthRequest,
  res: Response,
) {
  try {
    const [macroProcessos, riscos, fatores, controles] = await Promise.all([
      prisma.riscoMacroProcesso.findMany({
        orderBy: { numero: "asc" },
        include: { setores: { orderBy: { nome: "asc" } } },
      }),
      prisma.riscoCadastroGeral.findMany({ orderBy: { numero: "asc" } }),
      prisma.fatorRiscoCadastro.findMany({ orderBy: { numero: "asc" } }),
      prisma.controlePreventivoCadastro.findMany({
        orderBy: { numero: "asc" },
      }),
    ]);

    return res.json({ macroProcessos, riscos, fatores, controles });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ error: "Erro ao listar cadastro geral de riscos." });
  }
}

export async function criarMacroProcessoRisco(req: AuthRequest, res: Response) {
  try {
    const nome = textoObrigatorio(req.body.nome);
    if (!nome)
      return res
        .status(400)
        .json({ error: "Informe o nome do macro processo." });

    const registro = await prisma.$transaction(async (tx) => {
      const sequencial = await proximoCodigoCadastro(
        tx,
        "riscoMacroProcesso",
        "MP",
      );
      return tx.riscoMacroProcesso.create({
        data: {
          ...sequencial,
          nome,
          status: textoObrigatorio(req.body.status) || "Ativo",
        },
      });
    });

    await registrarLog({
      req,
      acao: "Criação de macro processo de risco",
      tipoRegistro: "RiscoMacroProcesso",
      registroId: registro.id,
      dadosNovos: registro,
    });
    return res.status(201).json(registro);
  } catch (error: any) {
    if (error?.code === "P2002")
      return res.status(400).json({ error: "Macro processo já cadastrado." });
    console.error(error);
    return res.status(500).json({ error: "Erro ao cadastrar macro processo." });
  }
}

export async function atualizarMacroProcessoRisco(
  req: AuthRequest,
  res: Response,
) {
  try {
    const id = Number(req.params.id);
    const nome = textoObrigatorio(req.body.nome);
    if (!nome)
      return res
        .status(400)
        .json({ error: "Informe o nome do macro processo." });
    const anterior = await prisma.riscoMacroProcesso.findUnique({
      where: { id },
      include: { setores: true },
    });
    if (!anterior)
      return res.status(404).json({ error: "Macro processo não encontrado." });
    const registro = await prisma.riscoMacroProcesso.update({
      where: { id },
      data: {
        nome,
        status: textoObrigatorio(req.body.status) || anterior.status,
      },
    });
    await registrarLog({
      req,
      acao: "Atualização de macro processo de risco",
      tipoRegistro: "RiscoMacroProcesso",
      registroId: id,
      dadosAnteriores: anterior,
      dadosNovos: registro,
    });
    return res.json(registro);
  } catch (error: any) {
    if (error?.code === "P2002")
      return res.status(400).json({ error: "Macro processo já cadastrado." });
    console.error(error);
    return res.status(500).json({ error: "Erro ao atualizar macro processo." });
  }
}

export async function excluirMacroProcessoRisco(
  req: AuthRequest,
  res: Response,
) {
  try {
    const id = Number(req.params.id);
    const anterior = await prisma.riscoMacroProcesso.findUnique({
      where: { id },
      include: { setores: true },
    });
    if (!anterior)
      return res.status(404).json({ error: "Macro processo não encontrado." });
    await prisma.riscoMacroProcesso.delete({ where: { id } });
    await registrarLog({
      req,
      acao: "Exclusão de macro processo de risco",
      tipoRegistro: "RiscoMacroProcesso",
      registroId: id,
      dadosAnteriores: anterior,
    });
    return res.status(204).send();
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro ao excluir macro processo." });
  }
}

export async function criarSetorRisco(req: AuthRequest, res: Response) {
  try {
    const nome = textoObrigatorio(req.body.nome);
    const macroProcessoId = normalizarId(req.body.macroProcessoId);
    if (!nome || !macroProcessoId)
      return res.status(400).json({ error: "Informe setor e macro processo." });
    const registro = await prisma.riscoSetor.create({
      data: {
        nome,
        macroProcessoId,
        status: textoObrigatorio(req.body.status) || "Ativo",
      },
    });
    await registrarLog({
      req,
      acao: "Criação de setor de risco",
      tipoRegistro: "RiscoSetor",
      registroId: registro.id,
      dadosNovos: registro,
    });
    return res.status(201).json(registro);
  } catch (error: any) {
    if (error?.code === "P2002")
      return res
        .status(400)
        .json({ error: "Setor já cadastrado para este macro processo." });
    if (error?.code === "P2003")
      return res.status(404).json({ error: "Macro processo não encontrado." });
    console.error(error);
    return res.status(500).json({ error: "Erro ao cadastrar setor." });
  }
}

export async function atualizarSetorRisco(req: AuthRequest, res: Response) {
  try {
    const id = Number(req.params.id);
    const nome = textoObrigatorio(req.body.nome);
    const macroProcessoId = normalizarId(req.body.macroProcessoId);
    if (!nome || !macroProcessoId)
      return res.status(400).json({ error: "Informe setor e macro processo." });
    const anterior = await prisma.riscoSetor.findUnique({ where: { id } });
    if (!anterior)
      return res.status(404).json({ error: "Setor não encontrado." });
    const registro = await prisma.riscoSetor.update({
      where: { id },
      data: {
        nome,
        macroProcessoId,
        status: textoObrigatorio(req.body.status) || anterior.status,
      },
    });
    await registrarLog({
      req,
      acao: "Atualização de setor de risco",
      tipoRegistro: "RiscoSetor",
      registroId: id,
      dadosAnteriores: anterior,
      dadosNovos: registro,
    });
    return res.json(registro);
  } catch (error: any) {
    if (error?.code === "P2002")
      return res
        .status(400)
        .json({ error: "Setor já cadastrado para este macro processo." });
    console.error(error);
    return res.status(500).json({ error: "Erro ao atualizar setor." });
  }
}

export async function excluirSetorRisco(req: AuthRequest, res: Response) {
  try {
    const id = Number(req.params.id);
    const anterior = await prisma.riscoSetor.findUnique({ where: { id } });
    if (!anterior)
      return res.status(404).json({ error: "Setor não encontrado." });
    await prisma.riscoSetor.delete({ where: { id } });
    await registrarLog({
      req,
      acao: "Exclusão de setor de risco",
      tipoRegistro: "RiscoSetor",
      registroId: id,
      dadosAnteriores: anterior,
    });
    return res.status(204).send();
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro ao excluir setor." });
  }
}

async function criarCadastroSequencial(
  req: AuthRequest,
  res: Response,
  delegate: string,
  prefixo: string,
  tipoRegistro: string,
  nomeLegivel: string,
) {
  try {
    const dados = dadosCadastroSimples(req);
    if (!dados.nome)
      return res
        .status(400)
        .json({ error: `Informe o nome de ${nomeLegivel}.` });
    const registro = await prisma.$transaction(async (tx) => {
      const sequencial = await proximoCodigoCadastro(tx, delegate, prefixo);
      return (tx as any)[delegate].create({
        data: { ...sequencial, ...dados },
      });
    });
    await registrarLog({
      req,
      acao: `Criação de ${nomeLegivel}`,
      tipoRegistro,
      registroId: registro.id,
      dadosNovos: registro,
    });
    return res.status(201).json(registro);
  } catch (error: any) {
    if (error?.code === "P2002")
      return res.status(400).json({ error: `${nomeLegivel} já cadastrado.` });
    console.error(error);
    return res.status(500).json({ error: `Erro ao cadastrar ${nomeLegivel}.` });
  }
}

async function atualizarCadastroSimples(
  req: AuthRequest,
  res: Response,
  delegate: string,
  tipoRegistro: string,
  nomeLegivel: string,
) {
  try {
    const id = Number(req.params.id);
    const dados = dadosCadastroSimples(req);
    if (!dados.nome)
      return res
        .status(400)
        .json({ error: `Informe o nome de ${nomeLegivel}.` });
    const anterior = await (prisma as any)[delegate].findUnique({
      where: { id },
    });
    if (!anterior)
      return res.status(404).json({ error: `${nomeLegivel} não encontrado.` });
    const registro = await (prisma as any)[delegate].update({
      where: { id },
      data: { ...dados, status: dados.status || anterior.status },
    });
    await registrarLog({
      req,
      acao: `Atualização de ${nomeLegivel}`,
      tipoRegistro,
      registroId: id,
      dadosAnteriores: anterior,
      dadosNovos: registro,
    });
    return res.json(registro);
  } catch (error: any) {
    if (error?.code === "P2002")
      return res.status(400).json({ error: `${nomeLegivel} já cadastrado.` });
    console.error(error);
    return res.status(500).json({ error: `Erro ao atualizar ${nomeLegivel}.` });
  }
}

async function excluirCadastroSimples(
  req: AuthRequest,
  res: Response,
  delegate: string,
  tipoRegistro: string,
  nomeLegivel: string,
) {
  try {
    const id = Number(req.params.id);
    const anterior = await (prisma as any)[delegate].findUnique({
      where: { id },
    });
    if (!anterior)
      return res.status(404).json({ error: `${nomeLegivel} não encontrado.` });
    await (prisma as any)[delegate].delete({ where: { id } });
    await registrarLog({
      req,
      acao: `Exclusão de ${nomeLegivel}`,
      tipoRegistro,
      registroId: id,
      dadosAnteriores: anterior,
    });
    return res.status(204).send();
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: `Erro ao excluir ${nomeLegivel}.` });
  }
}

export const criarRiscoCadastroGeral = (req: AuthRequest, res: Response) =>
  criarCadastroSequencial(
    req,
    res,
    "riscoCadastroGeral",
    "R",
    "RiscoCadastroGeral",
    "risco",
  );
export const atualizarRiscoCadastroGeral = (req: AuthRequest, res: Response) =>
  atualizarCadastroSimples(
    req,
    res,
    "riscoCadastroGeral",
    "RiscoCadastroGeral",
    "risco",
  );
export const excluirRiscoCadastroGeral = (req: AuthRequest, res: Response) =>
  excluirCadastroSimples(
    req,
    res,
    "riscoCadastroGeral",
    "RiscoCadastroGeral",
    "risco",
  );

export const criarFatorRiscoCadastro = (req: AuthRequest, res: Response) =>
  criarCadastroSequencial(
    req,
    res,
    "fatorRiscoCadastro",
    "FR",
    "FatorRiscoCadastro",
    "fator de risco",
  );
export const atualizarFatorRiscoCadastro = (req: AuthRequest, res: Response) =>
  atualizarCadastroSimples(
    req,
    res,
    "fatorRiscoCadastro",
    "FatorRiscoCadastro",
    "fator de risco",
  );
export const excluirFatorRiscoCadastro = (req: AuthRequest, res: Response) =>
  excluirCadastroSimples(
    req,
    res,
    "fatorRiscoCadastro",
    "FatorRiscoCadastro",
    "fator de risco",
  );

export const criarControlePreventivoCadastro = (
  req: AuthRequest,
  res: Response,
) =>
  criarCadastroSequencial(
    req,
    res,
    "controlePreventivoCadastro",
    "CP",
    "ControlePreventivoCadastro",
    "controle preventivo",
  );
export const atualizarControlePreventivoCadastro = (
  req: AuthRequest,
  res: Response,
) =>
  atualizarCadastroSimples(
    req,
    res,
    "controlePreventivoCadastro",
    "ControlePreventivoCadastro",
    "controle preventivo",
  );
export const excluirControlePreventivoCadastro = (
  req: AuthRequest,
  res: Response,
) =>
  excluirCadastroSimples(
    req,
    res,
    "controlePreventivoCadastro",
    "ControlePreventivoCadastro",
    "controle preventivo",
  );

export async function listarCatalogoRiscos(req: AuthRequest, res: Response) {
  try {
    const riscos = await prisma.riscoCatalogo.findMany({
      where: {
        unidade: req.unidadeAtiva,
        status: req.query.todos === "true" ? undefined : "Ativo",
      },
      orderBy: [{ status: "asc" }, { numero: "asc" }],
    });

    return res.json(riscos);
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ error: "Erro ao listar riscos identificados" });
  }
}

export async function listarLocaisRisco(req: AuthRequest, res: Response) {
  try {
    const locais = await prisma.localTerminal.findMany({
      where: {
        unidade: req.unidadeAtiva,
      },
      orderBy: [{ areaSensivel: "desc" }, { nome: "asc" }],
    });

    return res.json(locais);
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ error: "Erro ao listar locais da análise de risco" });
  }
}

export async function criarCatalogoRisco(req: AuthRequest, res: Response) {
  try {
    const dados = dadosCatalogo(req);
    if (
      !dados.nome ||
      !dados.tipoRisco ||
      !dados.descricaoRisco ||
      !dados.possivelImpacto
    ) {
      return res
        .status(400)
        .json({ error: "Preencha nome, tipo, descrição e impacto do risco." });
    }

    const risco = await prisma.$transaction(async (tx) => {
      const ano = new Date().getFullYear();
      const ultimo = await tx.riscoCatalogo.findFirst({
        where: { unidade: dados.unidade, ano },
        orderBy: { numero: "desc" },
      });
      const numero = (ultimo?.numero || 0) + 1;

      return tx.riscoCatalogo.create({
        data: {
          ...dados,
          ano,
          numero,
          codigo: codigoRiscoIdentificado(numero, ano),
          criadoPorId: req.usuarioId,
        },
      });
    });

    await registrarLog({
      req,
      acao: "Criação de risco identificado",
      tipoRegistro: "RiscoCatalogo",
      registroId: risco.id,
      dadosNovos: risco,
    });

    return res.status(201).json(risco);
  } catch (error: any) {
    console.error(error);
    if (error?.code === "P2002")
      return res.status(409).json({
        error: "Já existe um risco identificado com este nome na unidade.",
      });
    return res.status(500).json({ error: "Erro ao criar risco identificado" });
  }
}

export async function atualizarCatalogoRisco(req: AuthRequest, res: Response) {
  try {
    const id = Number(req.params.id);
    const anterior = await prisma.riscoCatalogo.findFirst({
      where: { id, unidade: req.unidadeAtiva },
    });
    if (!anterior)
      return res
        .status(404)
        .json({ error: "Risco identificado não encontrado" });

    const dados = dadosCatalogo(req);
    const risco = await prisma.riscoCatalogo.update({
      where: { id },
      data: dados,
    });

    await registrarLog({
      req,
      acao: "Atualização de risco identificado",
      tipoRegistro: "RiscoCatalogo",
      registroId: risco.id,
      dadosAnteriores: anterior,
      dadosNovos: risco,
    });

    return res.json(risco);
  } catch (error: any) {
    console.error(error);
    if (error?.code === "P2002")
      return res.status(409).json({
        error: "Já existe um risco identificado com este nome na unidade.",
      });
    return res
      .status(500)
      .json({ error: "Erro ao atualizar risco identificado" });
  }
}

export async function removerCatalogoRisco(req: AuthRequest, res: Response) {
  try {
    const id = Number(req.params.id);
    const anterior = await prisma.riscoCatalogo.findFirst({
      where: { id, unidade: req.unidadeAtiva },
    });
    if (!anterior)
      return res
        .status(404)
        .json({ error: "Risco identificado não encontrado" });

    const risco = await prisma.riscoCatalogo.update({
      where: { id },
      data: { status: "Inativo" },
    });

    await registrarLog({
      req,
      acao: "Inativação de risco identificado",
      tipoRegistro: "RiscoCatalogo",
      registroId: risco.id,
      dadosAnteriores: anterior,
      dadosNovos: risco,
    });

    return res.json(risco);
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ error: "Erro ao inativar risco identificado" });
  }
}

export async function excluirCatalogoRisco(req: AuthRequest, res: Response) {
  try {
    return res.status(405).json({
      error:
        "Exclusão definitiva não é permitida. Use inativação, anulação ou encerramento.",
    });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ error: "Erro ao excluir risco identificado" });
  }
}

export async function buscarVinculoRisco(req: AuthRequest, res: Response) {
  try {
    const ocorrenciaCodigo = normalizarCodigo(
      req.query.ocorrenciaCodigo || req.query.ocorrencia,
    );
    const eventoCodigo = normalizarCodigo(
      req.query.eventoCodigo || req.query.evento,
    );
    const investigacaoCodigo = normalizarCodigo(
      req.query.investigacaoCodigo || req.query.investigacao,
    );

    if (!ocorrenciaCodigo && !eventoCodigo && !investigacaoCodigo) {
      return res.status(400).json({
        error: "Informe o número da ocorrência, evento ou investigação.",
      });
    }

    if (investigacaoCodigo) {
      const investigacao = await prisma.investigacao.findFirst({
        where: {
          unidade: req.unidadeAtiva,
          OR: [
            { codigo: { equals: investigacaoCodigo } },
            { numeroOcorrencia: { equals: investigacaoCodigo } },
          ],
        },
        include: {
          ocorrencia: {
            select: {
              id: true,
              codigo: true,
              assunto: true,
              local: true,
              natureza: true,
              subNatureza: true,
            },
          },
        },
      });

      if (!investigacao)
        return res
          .status(404)
          .json({ error: "Investigação não encontrada para esta unidade." });

      return res.json({
        origem: "Investigação",
        codigo: investigacao.codigo || investigacao.numeroOcorrencia,
        titulo: investigacao.titulo || investigacao.assunto,
        assunto: investigacao.assunto,
        local: investigacao.local,
        natureza: investigacao.natureza,
        subNatureza: investigacao.subNatureza,
        status: investigacao.status,
        ocorrenciaId: investigacao.ocorrenciaId,
        investigacaoId: investigacao.id,
        ocorrenciaCodigo: investigacao.numeroOcorrencia,
        investigacaoCodigo:
          investigacao.codigo || investigacao.numeroOcorrencia,
        resumo:
          investigacao.descricaoInvestigacao ||
          investigacao.ocorrencia?.assunto ||
          "",
      });
    }

    if (ocorrenciaCodigo) {
      const ocorrencia = await prisma.ocorrencia.findFirst({
        where: {
          unidade: req.unidadeAtiva,
          codigo: { equals: ocorrenciaCodigo },
        },
        include: {
          investigacao: { select: { id: true, codigo: true, status: true } },
        },
      });

      if (!ocorrencia)
        return res
          .status(404)
          .json({ error: "Ocorrência não encontrada para esta unidade." });

      return res.json({
        origem: "Ocorrência",
        codigo: ocorrencia.codigo,
        titulo: ocorrencia.assunto,
        assunto: ocorrencia.assunto,
        local: ocorrencia.local,
        natureza: ocorrencia.natureza,
        subNatureza: ocorrencia.subNatureza,
        status: ocorrencia.status,
        ocorrenciaId: ocorrencia.id,
        investigacaoId: ocorrencia.investigacao?.id || null,
        ocorrenciaCodigo: ocorrencia.codigo,
        investigacaoCodigo: ocorrencia.investigacao?.codigo || null,
        resumo: ocorrencia.relatoSeguranca || "",
      });
    }

    if (eventoCodigo) {
      const evento = await prisma.evento.findFirst({
        where: { unidade: req.unidadeAtiva, codigo: { equals: eventoCodigo } },
      });

      if (!evento)
        return res
          .status(404)
          .json({ error: "Evento não encontrado para esta unidade." });

      return res.json({
        origem: "Evento",
        codigo: evento.codigo,
        titulo: evento.assunto,
        assunto: evento.assunto,
        local: evento.local,
        natureza: evento.natureza,
        subNatureza: evento.subNatureza,
        status: evento.status,
        eventoId: evento.id,
        eventoCodigo: evento.codigo,
        resumo: evento.relatoSeguranca || "",
      });
    }

    return res.status(400).json({ error: "Vínculo inválido." });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro ao buscar dados vinculados" });
  }
}

type FatorAnaliseCompleta = {
  id?: number | null;
  codigo?: string;
  nome: string;
};

type ControleAnaliseCompleta = {
  id?: number | null;
  codigo?: string;
  nome: string;
};

const camposPontuacaoCompleta = [
  "sc",
  "fe",
  "intervalo",
  "sse",
  "ope",
  "fin",
  "adm",
  "img",
  "lc",
] as const;

function pontuacaoCompleta(valor: unknown) {
  const numero = Number(valor);
  if (!Number.isFinite(numero)) return 1;
  return Math.min(Math.max(Math.trunc(numero), 1), 5);
}

function arredondarRisco(valor: number) {
  return Math.round(valor * 100) / 100;
}

function nivelProbabilidadeCompleta(media: number) {
  if (media >= 4.51) return "FREQUENTE";
  if (media >= 3.51) return "PROVÁVEL";
  if (media >= 2.51) return "POSSÍVEL";
  if (media >= 1.51) return "IMPROVÁVEL";
  if (media >= 1) return "REMOTO";
  return "-";
}

function nivelConsequenciaCompleta(media: number) {
  if (media <= 1.5) return "Menor";
  if (media <= 2.5) return "Moderado";
  if (media <= 3.5) return "Alto";
  if (media <= 4.5) return "Severo";
  return "Crítico";
}

function classificacaoCompleta(resultado: number) {
  if (resultado <= 5) {
    return {
      nivel: "BAIXO",
      classificacao: "BAIXO",
      periodicidade: "Revisão a cada 24 meses",
    };
  }
  if (resultado <= 10) {
    return {
      nivel: "MENOR",
      classificacao: "MENOR",
      periodicidade: "Revisão a cada 12 meses",
    };
  }
  if (resultado <= 15) {
    return {
      nivel: "ALTO",
      classificacao: "ALTO",
      periodicidade: "Revisão a cada 180 dias",
    };
  }
  return {
    nivel: "EXTREMO",
    classificacao: "EXTREMO",
    periodicidade: "Revisão a cada 90 dias",
  };
}

function calcularAnaliseCompleta(body: Record<string, unknown>) {
  const sc = pontuacaoCompleta(body.sc);
  const fe = pontuacaoCompleta(body.fe);
  const intervalo = pontuacaoCompleta(body.intervalo || body.int);
  const sse = pontuacaoCompleta(body.sse);
  const ope = pontuacaoCompleta(body.ope);
  const fin = pontuacaoCompleta(body.fin);
  const adm = pontuacaoCompleta(body.adm);
  const img = pontuacaoCompleta(body.img);
  const lc = pontuacaoCompleta(body.lc);
  const notaProbabilidade = sc * 5 + fe * 4 + intervalo * 3;
  const mediaProbabilidade = arredondarRisco(notaProbabilidade / 12);
  const percentualProbabilidade = arredondarRisco(mediaProbabilidade / 5);
  const impactos = [sse, ope, fin, adm, img, lc];
  const notaConsequencia = impactos.reduce((total, valor) => total + valor, 0);
  const mediaConsequencia = arredondarRisco(notaConsequencia / impactos.length);
  const resultadoInerente = arredondarRisco(
    mediaProbabilidade * mediaConsequencia,
  );
  const classificacao = classificacaoCompleta(resultadoInerente);

  return {
    sc,
    fe,
    intervalo,
    sse,
    ope,
    fin,
    adm,
    img,
    lc,
    notaProbabilidade,
    mediaProbabilidade,
    percentualProbabilidade,
    nivelProbabilidade: nivelProbabilidadeCompleta(mediaProbabilidade),
    notaConsequencia,
    mediaConsequencia,
    nivelConsequencia: nivelConsequenciaCompleta(mediaConsequencia),
    resultadoInerente,
    nivelRiscoInerente: classificacao.nivel,
    classificacaoRisco: classificacao.classificacao,
    periodicidadeAcao: classificacao.periodicidade,
  };
}

function normalizarListaJson<T>(
  valor: unknown,
  normalizar: (item: Record<string, unknown>) => T | null,
) {
  const lista = Array.isArray(valor) ? valor : [];
  return lista
    .map((item) =>
      item && typeof item === "object"
        ? normalizar(item as Record<string, unknown>)
        : null,
    )
    .filter(Boolean) as T[];
}

function normalizarFatores(valor: unknown) {
  return normalizarListaJson<FatorAnaliseCompleta>(valor, (item) => {
    const nome = textoObrigatorio(item.nome);
    if (!nome) return null;
    return {
      id: normalizarId(item.id),
      codigo: textoObrigatorio(item.codigo),
      nome,
    };
  });
}

function normalizarControles(valor: unknown) {
  return normalizarListaJson<ControleAnaliseCompleta>(valor, (item) => {
    const nome = textoObrigatorio(item.nome);
    if (!nome) return null;
    return {
      id: normalizarId(item.id),
      codigo: textoObrigatorio(item.codigo),
      nome,
    };
  });
}

function parseListaJson<T>(valor: string | null | undefined): T[] {
  try {
    const lista = JSON.parse(valor || "[]");
    return Array.isArray(lista) ? lista : [];
  } catch {
    return [];
  }
}

function apresentarAnaliseCompleta(registro: any) {
  return {
    ...registro,
    fatoresRisco: parseListaJson<FatorAnaliseCompleta>(
      registro.fatoresRiscoJson,
    ),
    preventivos: parseListaJson<ControleAnaliseCompleta>(
      registro.preventivosJson,
    ),
    detectivos: parseListaJson<ControleAnaliseCompleta>(
      registro.detectivosJson,
    ),
    corretivos: parseListaJson<ControleAnaliseCompleta>(
      registro.corretivosJson,
    ),
  };
}

async function dadosAnaliseCompleta(req: AuthRequest) {
  const macroProcessoId = normalizarId(req.body.macroProcessoId);
  const setorId = normalizarId(req.body.setorId);
  const riscoId = normalizarId(req.body.riscoId);

  const [macroProcesso, setor, risco] = await Promise.all([
    macroProcessoId
      ? prisma.riscoMacroProcesso.findUnique({ where: { id: macroProcessoId } })
      : null,
    setorId ? prisma.riscoSetor.findUnique({ where: { id: setorId } }) : null,
    riscoId
      ? prisma.riscoCadastroGeral.findUnique({ where: { id: riscoId } })
      : null,
  ]);

  if (!macroProcesso) throw new Error("Selecione o macro processo.");
  if (!setor) throw new Error("Selecione o setor.");
  if (!risco) throw new Error("Selecione o risco.");
  if (setor.macroProcessoId !== macroProcesso.id) {
    throw new Error("O setor selecionado não pertence ao macro processo.");
  }

  const fatores = normalizarFatores(req.body.fatoresRisco);
  if (!fatores.length) throw new Error("Selecione ao menos um fator de risco.");

  return {
    macroProcessoId: macroProcesso.id,
    macroProcessoCodigo: macroProcesso.codigo,
    macroProcessoNome: macroProcesso.nome,
    setorId: setor.id,
    setorNome: setor.nome,
    riscoId: risco.id,
    riscoCodigo: risco.codigo,
    riscoNome: risco.nome,
    fatoresRiscoJson: JSON.stringify(fatores),
    ...calcularAnaliseCompleta(req.body),
  };
}

export async function listarAnalisesCompletasRisco(
  req: AuthRequest,
  res: Response,
) {
  try {
    const registros = await prisma.analiseRiscoCompleta.findMany({
      where: { unidade: req.unidadeAtiva },
      orderBy: { createdAt: "desc" },
    });

    return res.json(registros.map(apresentarAnaliseCompleta));
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ error: "Erro ao listar análises completas." });
  }
}

export async function criarAnaliseCompletaRisco(
  req: AuthRequest,
  res: Response,
) {
  try {
    const ano = new Date().getFullYear();
    const dados = await dadosAnaliseCompleta(req);
    const registro = await prisma.$transaction(async (tx) => {
      await tx.$executeRawUnsafe(
        `SELECT pg_advisory_xact_lock(hashtext('jetguard_analise_risco_completa_${req.unidadeAtiva}_${ano}'))`,
      );
      const ultimo = await tx.analiseRiscoCompleta.findFirst({
        where: { ano, unidade: req.unidadeAtiva },
        orderBy: { numero: "desc" },
      });
      const numero = Number(ultimo?.numero || 0) + 1;
      return tx.analiseRiscoCompleta.create({
        data: {
          numero,
          ano,
          codigo: `ARC-${String(numero).padStart(4, "0")}/${ano}`,
          unidade: req.unidadeAtiva || req.body.unidade,
          responsavelId: req.usuarioId || null,
          ...dados,
        },
      });
    });

    await registrarLog({
      req,
      acao: "Criação de análise completa de risco",
      tipoRegistro: "AnaliseRiscoCompleta",
      registroId: registro.id,
      dadosNovos: registro,
    });

    return res.status(201).json(apresentarAnaliseCompleta(registro));
  } catch (error: any) {
    const mensagem = error?.message || "Erro ao criar análise completa.";
    if (!mensagem.startsWith("Erro"))
      return res.status(400).json({ error: mensagem });
    console.error(error);
    return res.status(500).json({ error: mensagem });
  }
}

export async function atualizarAnaliseCompletaRisco(
  req: AuthRequest,
  res: Response,
) {
  try {
    const id = Number(req.params.id);
    const anterior = await prisma.analiseRiscoCompleta.findFirst({
      where: { id, unidade: req.unidadeAtiva },
    });
    if (!anterior)
      return res
        .status(404)
        .json({ error: "Análise completa não encontrada." });

    const dados = await dadosAnaliseCompleta(req);
    const registro = await prisma.analiseRiscoCompleta.update({
      where: { id },
      data: {
        ...dados,
        preventivosJson:
          req.body.preventivos !== undefined
            ? JSON.stringify(normalizarControles(req.body.preventivos))
            : anterior.preventivosJson,
        detectivosJson:
          req.body.detectivos !== undefined
            ? JSON.stringify(normalizarControles(req.body.detectivos))
            : anterior.detectivosJson,
        corretivosJson:
          req.body.corretivos !== undefined
            ? JSON.stringify(normalizarControles(req.body.corretivos))
            : anterior.corretivosJson,
        status: textoObrigatorio(req.body.status) || anterior.status,
      },
    });

    await registrarLog({
      req,
      acao: "Atualização de análise completa de risco",
      tipoRegistro: "AnaliseRiscoCompleta",
      registroId: registro.id,
      dadosAnteriores: anterior,
      dadosNovos: registro,
    });

    return res.json(apresentarAnaliseCompleta(registro));
  } catch (error: any) {
    const mensagem = error?.message || "Erro ao atualizar análise completa.";
    if (!mensagem.startsWith("Erro"))
      return res.status(400).json({ error: mensagem });
    console.error(error);
    return res.status(500).json({ error: mensagem });
  }
}

export async function atualizarControlesAnaliseCompletaRisco(
  req: AuthRequest,
  res: Response,
) {
  try {
    const id = Number(req.params.id);
    const anterior = await prisma.analiseRiscoCompleta.findFirst({
      where: { id, unidade: req.unidadeAtiva },
    });
    if (!anterior)
      return res
        .status(404)
        .json({ error: "Análise completa não encontrada." });

    const registro = await prisma.analiseRiscoCompleta.update({
      where: { id },
      data: {
        preventivosJson: JSON.stringify(
          normalizarControles(req.body.preventivos),
        ),
        detectivosJson: JSON.stringify(
          normalizarControles(req.body.detectivos),
        ),
        corretivosJson: JSON.stringify(
          normalizarControles(req.body.corretivos),
        ),
      },
    });

    await registrarLog({
      req,
      acao: "Atualização de controles da análise completa de risco",
      tipoRegistro: "AnaliseRiscoCompleta",
      registroId: registro.id,
      dadosAnteriores: anterior,
      dadosNovos: registro,
    });

    return res.json(apresentarAnaliseCompleta(registro));
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ error: "Erro ao atualizar controles da análise completa." });
  }
}

async function resolverVinculos(req: AuthRequest) {
  const ocorrenciaValor = normalizarCodigo(
    req.body.ocorrenciaId || req.body.ocorrenciaCodigo,
  );
  const eventoValor = normalizarCodigo(
    req.body.eventoId || req.body.eventoCodigo,
  );
  const investigacaoValor = normalizarCodigo(
    req.body.investigacaoId || req.body.investigacaoCodigo,
  );

  const [ocorrencia, evento, investigacao] = await Promise.all([
    ocorrenciaValor && Number.isNaN(Number(ocorrenciaValor))
      ? prisma.ocorrencia.findFirst({
          where: { codigo: ocorrenciaValor, unidade: req.unidadeAtiva },
          select: { id: true },
        })
      : null,
    eventoValor && Number.isNaN(Number(eventoValor))
      ? prisma.evento.findFirst({
          where: { codigo: eventoValor, unidade: req.unidadeAtiva },
          select: { id: true },
        })
      : null,
    investigacaoValor && Number.isNaN(Number(investigacaoValor))
      ? prisma.investigacao.findFirst({
          where: { codigo: investigacaoValor, unidade: req.unidadeAtiva },
          select: { id: true },
        })
      : null,
  ]);

  return {
    ocorrenciaId: ocorrencia?.id || normalizarId(req.body.ocorrenciaId),
    eventoId: evento?.id || normalizarId(req.body.eventoId),
    investigacaoId: investigacao?.id || normalizarId(req.body.investigacaoId),
  };
}

function includeRisco() {
  return {
    riscoCatalogo: true,
    responsavel: { select: { id: true, nome: true, apelido: true } },
    responsavelAcao: { select: { id: true, nome: true, apelido: true } },
    ocorrencia: { select: { id: true, codigo: true, assunto: true } },
    evento: { select: { id: true, codigo: true, assunto: true } },
    investigacao: {
      select: { id: true, numeroOcorrencia: true, titulo: true },
    },
    fotos: true,
  };
}

export async function listarRiscos(req: AuthRequest, res: Response) {
  const riscos = await prisma.analiseRisco.findMany({
    where: { unidade: req.unidadeAtiva },
    orderBy: { createdAt: "desc" },
    include: includeRisco(),
  });

  return res.json(riscos);
}

export async function criarRisco(req: AuthRequest, res: Response) {
  try {
    const arquivos = (req.files as Express.Multer.File[]) || [];
    const ano = new Date().getFullYear();
    const ultimo = await prisma.analiseRisco.findFirst({
      where: { ano, unidade: req.unidadeAtiva },
      orderBy: { numero: "desc" },
    });
    const numero = ultimo ? ultimo.numero + 1 : 1;
    const codigo = `AR${String(numero).padStart(3, "0")}/${ano}`;
    const classificacao = calcularClassificacao(req);
    const reavaliacao = calcularReavaliacao(req);
    const vinculos = await resolverVinculos(req);
    const riscoCatalogoId = normalizarId(req.body.riscoCatalogoId);

    if (!riscoCatalogoId) {
      return res.status(400).json({
        error: "Selecione um risco identificado antes de criar a análise.",
      });
    }

    const riscoIdentificado = await prisma.riscoCatalogo.findFirst({
      where: { id: riscoCatalogoId, unidade: req.unidadeAtiva },
    });

    if (!riscoIdentificado) {
      return res.status(404).json({
        error: "Risco identificado não encontrado para a unidade ativa.",
      });
    }
    const erroValidacao = validarAnalise(req);
    if (erroValidacao) return res.status(400).json({ error: erroValidacao });

    const risco = await prisma.analiseRisco.create({
      data: {
        numero,
        ano,
        codigo,
        dataHora: new Date(req.body.dataHora),
        responsavelId: req.usuarioId!,
        riscoCatalogoId,
        unidade: req.unidadeAtiva || req.body.unidade,
        setor: req.body.setor,
        local: req.body.local,
        area: null,
        tipoRisco: req.body.tipoRisco,
        tituloRisco: textoObrigatorio(req.body.tituloRisco) || null,
        origemRisco: null,
        fonteRisco: null,
        fatorRisco: null,
        fragilidade: null,
        eventoIncerteza: null,
        objetivoImpactado: null,
        eficaciaControles: textoObrigatorio(req.body.eficaciaControles) || null,
        criteriosAvaliacao:
          textoObrigatorio(req.body.criteriosAvaliacao) || null,
        controlesInternos: textoObrigatorio(req.body.controlesInternos) || null,
        atividadesControle:
          textoObrigatorio(req.body.atividadesControle) || null,
        monitoramento: textoObrigatorio(req.body.monitoramento) || null,
        comunicacaoConsulta:
          textoObrigatorio(req.body.comunicacaoConsulta) || null,
        naturezaRisco: naturezaAnalise(req),
        descricaoRisco: req.body.descricaoRisco,
        possivelImpacto: req.body.possivelImpacto,
        causaProvavel: textoObrigatorio(req.body.causaProvavel) || null,
        consequencia: textoObrigatorio(req.body.consequencia) || null,
        pessoasAfetadas: textoObrigatorio(req.body.pessoasAfetadas) || null,
        controlesExistentes:
          textoObrigatorio(req.body.controlesExistentes) || null,
        probabilidade: classificacao.probabilidadeTexto,
        severidade: classificacao.impactoTexto,
        probabilidadeValor: classificacao.probabilidadeValor,
        impactoValor: classificacao.impactoValor,
        resultadoRisco: classificacao.resultadoRisco,
        nivelRisco: classificacao.nivelRisco,
        nivelAceitacao: textoObrigatorio(req.body.nivelAceitacao) || null,
        tratamentoRisco: textoObrigatorio(req.body.tratamentoRisco) || null,
        medidasPreventivas: req.body.medidasPreventivas,
        planoAcao: req.body.planoAcao,
        acaoProposta:
          textoObrigatorio(req.body.acaoProposta || req.body.planoAcao) || null,
        responsavelAcaoId: normalizarId(req.body.responsavelAcaoId),
        responsavelAcaoNome: req.body.responsavelAcaoNome,
        prazo: new Date(req.body.prazo),
        custoEstimado: textoObrigatorio(req.body.custoEstimado) || null,
        prioridade: textoObrigatorio(req.body.prioridade) || null,
        statusAcao: textoObrigatorio(req.body.statusAcao) || null,
        observacoes: textoObrigatorio(req.body.observacoes) || null,
        novaProbabilidade: reavaliacao.novaProbabilidade,
        novoImpacto: reavaliacao.novoImpacto,
        novoResultado: reavaliacao.novoResultado,
        novoNivelRisco: reavaliacao.novoNivelRisco,
        observacaoReavaliacao:
          textoObrigatorio(req.body.observacaoReavaliacao) || null,
        dataReavaliacao: req.body.dataReavaliacao
          ? new Date(req.body.dataReavaliacao)
          : null,
        responsavelReavaliacao:
          textoObrigatorio(req.body.responsavelReavaliacao) || null,
        status: req.body.status || "Aberto",
        ocorrenciaId: vinculos.ocorrenciaId,
        eventoId: vinculos.eventoId,
        investigacaoId: vinculos.investigacaoId,
        anulado: String(req.body.status || "").toLowerCase() === "anulado",
        motivoAnulacao: textoObrigatorio(req.body.motivoAnulacao) || null,
        fotos: {
          create: arquivos.map((arquivo) => ({
            nomeOriginal: arquivo.originalname,
            nomeArquivo: arquivo.filename,
            caminho: arquivo.path,
            tipo: arquivo.mimetype,
          })),
        },
      },
      include: includeRisco(),
    });

    await registrarLog({
      req,
      acao: "Criação de análise de risco",
      tipoRegistro: "AnaliseRisco",
      registroId: risco.id,
      dadosNovos: risco,
    });

    return res.status(201).json(risco);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro ao criar análise de risco" });
  }
}

export async function atualizarRisco(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const anterior = await prisma.analiseRisco.findFirst({
      where: { id: Number(id), unidade: req.unidadeAtiva },
      include: includeRisco(),
    });

    if (!anterior)
      return res.status(404).json({ error: "Análise de risco não encontrada" });

    const classificacao = calcularClassificacao(req);
    const reavaliacao = calcularReavaliacao(req);
    const vinculos = await resolverVinculos(req);
    const riscoCatalogoId = normalizarId(req.body.riscoCatalogoId);

    if (!riscoCatalogoId) {
      return res.status(400).json({
        error:
          "A análise precisa permanecer vinculada a um risco identificado.",
      });
    }

    const riscoIdentificado = await prisma.riscoCatalogo.findFirst({
      where: { id: riscoCatalogoId, unidade: req.unidadeAtiva },
    });

    if (!riscoIdentificado) {
      return res.status(404).json({
        error: "Risco identificado não encontrado para a unidade ativa.",
      });
    }
    const erroValidacao = validarAnalise(req);
    if (erroValidacao) return res.status(400).json({ error: erroValidacao });

    const risco = await prisma.analiseRisco.update({
      where: { id: Number(id) },
      data: {
        dataHora: new Date(req.body.dataHora),
        unidade: req.unidadeAtiva || anterior.unidade,
        riscoCatalogoId,
        setor: req.body.setor,
        local: req.body.local,
        area: null,
        tipoRisco: req.body.tipoRisco,
        tituloRisco: textoObrigatorio(req.body.tituloRisco) || null,
        origemRisco: null,
        fonteRisco: null,
        fatorRisco: null,
        fragilidade: null,
        eventoIncerteza: null,
        objetivoImpactado: null,
        eficaciaControles: textoObrigatorio(req.body.eficaciaControles) || null,
        criteriosAvaliacao:
          textoObrigatorio(req.body.criteriosAvaliacao) || null,
        controlesInternos: textoObrigatorio(req.body.controlesInternos) || null,
        atividadesControle:
          textoObrigatorio(req.body.atividadesControle) || null,
        monitoramento: textoObrigatorio(req.body.monitoramento) || null,
        comunicacaoConsulta:
          textoObrigatorio(req.body.comunicacaoConsulta) || null,
        naturezaRisco: naturezaAnalise(req),
        descricaoRisco: req.body.descricaoRisco,
        possivelImpacto: req.body.possivelImpacto,
        causaProvavel: textoObrigatorio(req.body.causaProvavel) || null,
        consequencia: textoObrigatorio(req.body.consequencia) || null,
        pessoasAfetadas: textoObrigatorio(req.body.pessoasAfetadas) || null,
        controlesExistentes:
          textoObrigatorio(req.body.controlesExistentes) || null,
        probabilidade: classificacao.probabilidadeTexto,
        severidade: classificacao.impactoTexto,
        probabilidadeValor: classificacao.probabilidadeValor,
        impactoValor: classificacao.impactoValor,
        resultadoRisco: classificacao.resultadoRisco,
        nivelRisco: classificacao.nivelRisco,
        nivelAceitacao: textoObrigatorio(req.body.nivelAceitacao) || null,
        tratamentoRisco: textoObrigatorio(req.body.tratamentoRisco) || null,
        medidasPreventivas: req.body.medidasPreventivas,
        planoAcao: req.body.planoAcao,
        acaoProposta:
          textoObrigatorio(req.body.acaoProposta || req.body.planoAcao) || null,
        responsavelAcaoId: normalizarId(req.body.responsavelAcaoId),
        responsavelAcaoNome: req.body.responsavelAcaoNome,
        prazo: new Date(req.body.prazo),
        custoEstimado: textoObrigatorio(req.body.custoEstimado) || null,
        prioridade: textoObrigatorio(req.body.prioridade) || null,
        statusAcao: textoObrigatorio(req.body.statusAcao) || null,
        observacoes: textoObrigatorio(req.body.observacoes) || null,
        novaProbabilidade: reavaliacao.novaProbabilidade,
        novoImpacto: reavaliacao.novoImpacto,
        novoResultado: reavaliacao.novoResultado,
        novoNivelRisco: reavaliacao.novoNivelRisco,
        observacaoReavaliacao:
          textoObrigatorio(req.body.observacaoReavaliacao) || null,
        dataReavaliacao: req.body.dataReavaliacao
          ? new Date(req.body.dataReavaliacao)
          : null,
        responsavelReavaliacao:
          textoObrigatorio(req.body.responsavelReavaliacao) || null,
        status: req.body.status,
        ocorrenciaId: vinculos.ocorrenciaId,
        eventoId: vinculos.eventoId,
        investigacaoId: vinculos.investigacaoId,
        anulado: String(req.body.status || "").toLowerCase() === "anulado",
        motivoAnulacao: textoObrigatorio(req.body.motivoAnulacao) || null,
      },
      include: includeRisco(),
    });

    await registrarLog({
      req,
      acao:
        risco.status === "Concluído"
          ? "Conclusão de análise de risco"
          : "Atualização de análise de risco",
      tipoRegistro: "AnaliseRisco",
      registroId: risco.id,
      dadosAnteriores: anterior,
      dadosNovos: risco,
    });

    return res.json(risco);
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ error: "Erro ao atualizar análise de risco" });
  }
}

export async function gerarPdfRisco(req: AuthRequest, res: Response) {
  const risco = await prisma.analiseRisco.findFirst({
    where: { id: Number(req.params.id), unidade: req.unidadeAtiva },
    include: {
      responsavel: { select: { nome: true } },
      riscoCatalogo: { select: { nome: true } },
    },
  });

  if (!risco)
    return res.status(404).json({ error: "Análise de risco não encontrada" });
  const urlValidacao = `${req.protocol}://${req.get("host")}/api/riscos/${risco.id}/pdf`;
  return gerarRiscoPdf(res, risco, urlValidacao);
}
