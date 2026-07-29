import { randomUUID } from "node:crypto";
import { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { AuthRequest } from "../middlewares/auth";
import { UNIDADES_SISTEMA } from "../config/unidades";

const TOTAL_ETAPAS_CONTEUDO = 15;
const TOTAL_ETAPAS = 16;
const NOTA_MINIMA = 80;
const respostasCorretas = [0, 1, 2, 0, 1, 1, 2, 2, 0, 1, 1, 1, 1, 2, 1];

function texto(valor: unknown) {
  return String(valor || "").trim();
}

function limparCpf(cpf: string) {
  return String(cpf || "").replace(/\D/g, "");
}

function cpfValido(cpf: string) {
  const digitos = limparCpf(cpf);
  if (digitos.length !== 11 || /^(\d)\1{10}$/.test(digitos)) return false;

  const calcularDigito = (tamanho: number) => {
    const soma = digitos
      .slice(0, tamanho)
      .split("")
      .reduce((total, numero, index) => total + Number(numero) * (tamanho + 1 - index), 0);
    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  };

  return calcularDigito(9) === Number(digitos[9]) && calcularDigito(10) === Number(digitos[10]);
}

function emailCorporativo(email: string) {
  return texto(email).toLowerCase();
}

function dominioMovecta(email: string) {
  return emailCorporativo(email).endsWith("@movecta.com.br");
}

function unidadeValida(unidade: string) {
  return UNIDADES_SISTEMA.includes(unidade);
}

function emailValido(email: string) {
  const normalizado = String(email || "").trim();
  if (!normalizado || normalizado.length > 254 || normalizado.includes("..")) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(normalizado);
}

function userAgent(req: Request) {
  return texto(req.headers["user-agent"]);
}

function porcentagem(etapaAtual: number, status?: string | null) {
  if (String(status || "").toLowerCase().startsWith("conclu")) return 100;
  return Math.max(0, Math.min(99, Math.round(((etapaAtual - 1) / TOTAL_ETAPAS) * 100)));
}

async function proximoCodigo(tx: any) {
  const ano = new Date().getFullYear();
  await tx.$executeRawUnsafe(`SELECT pg_advisory_xact_lock(hashtext('movecta_poc_sep_007_certificado_${ano}'))`);
  const ultimo = await tx.treinamentoPocSep007.findFirst({
    where: { codigo: { endsWith: `/${ano}` } },
    orderBy: { id: "desc" },
  });
  const numero = ultimo?.codigo ? Number(ultimo.codigo.match(/POC-(\d+)\//)?.[1] || 0) + 1 : 1;
  return `POC-${String(numero).padStart(5, "0")}/${ano}`;
}

function respostaPublica(registro: any) {
  return {
    token: registro.token,
    codigo: registro.codigo,
    nomeCompleto: registro.nomeCompleto,
    cpf: registro.cpf,
    email: registro.email,
    cargo: registro.cargo,
    departamento: registro.departamento,
    unidade: registro.unidade,
    empresa: registro.empresa,
    etapaAtual: registro.etapaAtual,
    status: registro.status,
    porcentagem: registro.porcentagem,
    nota: registro.nota,
    tentativas: registro.tentativas,
    dataConclusao: registro.dataConclusao,
  };
}

export async function listarUnidadesTreinamentoPocSep007(req: Request, res: Response) {
  return res.json({ unidades: UNIDADES_SISTEMA });
}

export async function localizarParticipanteTreinamentoPocSep007(req: Request, res: Response) {
  const identificador = texto(req.query.identificador).toLowerCase();
  const cpf = limparCpf(identificador);
  const email = emailValido(identificador) ? identificador : "";

  if (!email && !cpfValido(cpf)) {
    return res.json({ participante: null });
  }

  const usuario = await prisma.usuario.findFirst({
    where: {
      OR: [
        ...(email ? [{ email }] : []),
        ...(cpfValido(cpf) ? [{ cpf }] : []),
      ],
    },
    select: {
      id: true,
      nome: true,
      cpf: true,
      email: true,
      cargo: true,
      setor: true,
      unidade: true,
      empresa: true,
      statusUsuario: true,
    },
  });

  if (!usuario || usuario.statusUsuario !== "ATIVO") {
    return res.json({ participante: null });
  }

  return res.json({
    participante: {
      nomeCompleto: usuario.nome,
      cpf: usuario.cpf,
      email: usuario.email,
      cargo: usuario.cargo,
      departamento: usuario.setor,
      unidade: usuario.unidade,
      empresa: usuario.empresa,
    },
  });
}

export async function iniciarTreinamentoPocSep007(req: Request, res: Response) {
  try {
    const email = emailCorporativo(req.body.email);
    const nomeCompleto = texto(req.body.nomeCompleto);
    const cpf = limparCpf(req.body.cpf);
    const unidade = texto(req.body.unidade);
    if (!dominioMovecta(email)) {
      return res.status(403).json({
        error: "Acesso não autorizado.\n\nEste treinamento é exclusivo para colaboradores da Movecta.\n\nUtilize seu e-mail corporativo (@movecta.com.br). Caso ainda não possua acesso, procure o administrador do sistema.",
      });
    }

    if (!nomeCompleto || !cpfValido(cpf) || !unidadeValida(unidade)) {
      return res.status(400).json({ error: "Informe nome completo, CPF válido, e-mail corporativo e unidade para iniciar." });
    }

    const usuario = await prisma.usuario.findFirst({
      where: {
        OR: [
          { email },
          { cpf },
        ],
      },
    });

    const existente = await prisma.treinamentoPocSep007.findFirst({
      where: {
        OR: [
          { cpf },
          { email },
        ],
      },
      orderBy: { updatedAt: "desc" },
    });

    if (existente) {
      const atualizado = await prisma.treinamentoPocSep007.update({
        where: { id: existente.id },
        data: {
          nomeCompleto,
          cpf,
          email,
          usuarioId: usuario?.id || existente.usuarioId,
          cargo: usuario?.cargo || existente.cargo,
          departamento: usuario?.setor || existente.departamento,
          unidade,
          empresa: usuario?.empresa || existente.empresa || "Movecta",
          ultimoAcessoEm: new Date(),
          navegador: userAgent(req),
        },
      });
      return res.json({ treinamento: respostaPublica(atualizado) });
    }

    const treinamento = await prisma.treinamentoPocSep007.create({
      data: {
        token: randomUUID(),
        usuarioId: usuario?.id,
        nomeCompleto,
        cpf,
        email,
        cargo: usuario?.cargo,
        departamento: usuario?.setor,
        unidade,
        empresa: usuario?.empresa || "Movecta",
        etapaAtual: 1,
        porcentagem: 0,
        ipInicio: req.ip,
        navegador: userAgent(req),
        sistema: userAgent(req),
      },
    });

    return res.status(201).json({ treinamento: respostaPublica(treinamento) });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro ao iniciar treinamento POC-SEP-007." });
  }
}

export async function concluirEtapaTreinamentoPocSep007(req: Request, res: Response) {
  try {
    const token = texto(req.params.token);
    const etapa = Number(req.body.etapa);
    if (!Number.isInteger(etapa) || etapa < 1 || etapa > TOTAL_ETAPAS_CONTEUDO) {
      return res.status(400).json({ error: "Etapa inválida." });
    }

    const treinamento = await prisma.treinamentoPocSep007.findUnique({ where: { token } });
    if (!treinamento) return res.status(404).json({ error: "Treinamento não encontrado." });
    if (etapa > treinamento.etapaAtual) return res.status(403).json({ error: "Conclua as etapas anteriores antes de avançar." });

    const proximaEtapa = Math.min(TOTAL_ETAPAS, Math.max(treinamento.etapaAtual, etapa + 1));
    const atualizado = await prisma.treinamentoPocSep007.update({
      where: { id: treinamento.id },
      data: {
        etapaAtual: proximaEtapa,
        porcentagem: porcentagem(proximaEtapa, treinamento.status),
        ultimoAcessoEm: new Date(),
        navegador: userAgent(req),
      },
    });

    return res.json({ treinamento: respostaPublica(atualizado) });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro ao salvar etapa." });
  }
}

export async function responderQuizTreinamentoPocSep007(req: Request, res: Response) {
  try {
    const token = texto(req.params.token);
    const respostas: number[] = Array.isArray(req.body.respostas) ? req.body.respostas.map(Number) : [];
    if (respostas.length !== respostasCorretas.length || respostas.some((item) => !Number.isInteger(item))) {
      return res.status(400).json({ error: "Responda todas as questões para finalizar a avaliação." });
    }

    const treinamento = await prisma.treinamentoPocSep007.findUnique({ where: { token } });
    if (!treinamento) return res.status(404).json({ error: "Treinamento não encontrado." });
    if (treinamento.etapaAtual < TOTAL_ETAPAS) return res.status(403).json({ error: "Conclua todas as etapas antes da avaliação." });

    const acertos = respostas.reduce((total, resposta, index) => total + (resposta === respostasCorretas[index] ? 1 : 0), 0);
    const nota = Math.round((acertos / respostasCorretas.length) * 100);
    const aprovado = nota >= NOTA_MINIMA;

    const atualizado = await prisma.$transaction(async (tx) => {
      const codigo = aprovado && !treinamento.codigo ? await proximoCodigo(tx) : treinamento.codigo;
      return tx.treinamentoPocSep007.update({
        where: { id: treinamento.id },
        data: {
          codigo,
          nota,
          respostasQuiz: JSON.stringify(respostas),
          tentativas: { increment: 1 },
          status: aprovado ? "Concluido" : "Reprovado",
          porcentagem: aprovado ? 100 : porcentagem(TOTAL_ETAPAS),
          dataConclusao: aprovado ? (treinamento.dataConclusao || new Date()) : null,
          ultimoAcessoEm: new Date(),
          navegador: userAgent(req),
        },
      });
    });

    return res.json({
      aprovado,
      acertos,
      nota,
      treinamento: respostaPublica(atualizado),
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro ao validar avaliação." });
  }
}

export async function listarTreinamentosPocSep007(req: AuthRequest, res: Response) {
  const treinamentos = await prisma.treinamentoPocSep007.findMany({
    orderBy: { updatedAt: "desc" },
    take: 300,
  });

  return res.json(treinamentos);
}
