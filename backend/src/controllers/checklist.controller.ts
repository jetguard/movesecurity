import { Response } from "express";
import { prisma } from "../lib/prisma";
import { AuthRequest } from "../middlewares/auth";
import { registrarLog } from "../services/auditoria.service";

function normalizarItens(valor: unknown) {
  if (Array.isArray(valor)) return valor;
  if (typeof valor === "string" && valor.trim()) return JSON.parse(valor);
  return [];
}

function calcularPontuacao(itens: Array<{ conformidade: string; criticidade: string }>) {
  const pesos: Record<string, number> = { Baixa: 1, Media: 2, Alta: 3, Critica: 4 };
  return itens.reduce((total, item) => {
    if (item.conformidade === "Conforme") return total;
    return total + (pesos[item.criticidade] || 2) * 10;
  }, 0);
}

export async function listarChecklists(req: AuthRequest, res: Response) {
  try {
    const checklists = await prisma.checklistInspecao.findMany({
      where: { unidade: req.unidadeAtiva },
      orderBy: { createdAt: "desc" },
      include: {
        responsavel: { select: { id: true, nome: true, apelido: true } },
        itens: true,
      },
    });
    return res.json(checklists);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro ao listar checklists" });
  }
}

export async function criarChecklist(req: AuthRequest, res: Response) {
  try {
    const { titulo, local, tipo } = req.body;
    const itens = normalizarItens(req.body.itens);
    if (!titulo || !local || !tipo || itens.length === 0) {
      return res.status(400).json({ error: "Informe titulo, local, tipo e itens." });
    }

    const ano = new Date().getFullYear();
    const ultimo = await prisma.checklistInspecao.findFirst({
      where: { ano, unidade: req.unidadeAtiva },
      orderBy: { numero: "desc" },
    });
    const numero = ultimo ? ultimo.numero + 1 : 1;
    const codigo = `CI${String(numero).padStart(4, "0")}/${ano}`;
    const pontuacao = calcularPontuacao(itens);

    const checklist = await prisma.checklistInspecao.create({
      data: {
        numero,
        ano,
        codigo,
        titulo,
        unidade: req.unidadeAtiva || "GJA-T1",
        setor: req.body.setor,
        local,
        tipo,
        dataHora: req.body.dataHora ? new Date(req.body.dataHora) : new Date(),
        responsavelId: req.usuarioId!,
        status: req.body.status || "Aberto",
        pontuacao,
        observacoes: req.body.observacoes,
        itens: {
          create: itens.map((item: any) => ({
            categoria: item.categoria,
            descricao: item.descricao,
            conformidade: item.conformidade || "Conforme",
            criticidade: item.criticidade || "Media",
            observacao: item.observacao,
          })),
        },
      },
      include: { responsavel: { select: { id: true, nome: true, apelido: true } }, itens: true },
    });

    await registrarLog({ req, acao: `Criacao de checklist ${checklist.codigo}`, tipoRegistro: "ChecklistInspecao", registroId: checklist.id, dadosNovos: checklist });
    return res.status(201).json(checklist);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro ao criar checklist" });
  }
}

export async function atualizarChecklist(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const anterior = await prisma.checklistInspecao.findFirst({
      where: { id: Number(id), unidade: req.unidadeAtiva },
      include: { itens: true },
    });
    if (!anterior) return res.status(404).json({ error: "Checklist nao encontrado" });

    const itens = normalizarItens(req.body.itens);
    const pontuacao = calcularPontuacao(itens);

    const checklist = await prisma.$transaction(async (tx) => {
      await tx.checklistItem.deleteMany({ where: { checklistId: Number(id) } });
      return tx.checklistInspecao.update({
        where: { id: Number(id) },
        data: {
          titulo: req.body.titulo,
          setor: req.body.setor,
          local: req.body.local,
          tipo: req.body.tipo,
          dataHora: req.body.dataHora ? new Date(req.body.dataHora) : anterior.dataHora,
          status: req.body.status || anterior.status,
          pontuacao,
          observacoes: req.body.observacoes,
          itens: {
            create: itens.map((item: any) => ({
              categoria: item.categoria,
              descricao: item.descricao,
              conformidade: item.conformidade || "Conforme",
              criticidade: item.criticidade || "Media",
              observacao: item.observacao,
            })),
          },
        },
        include: { responsavel: { select: { id: true, nome: true, apelido: true } }, itens: true },
      });
    });

    await registrarLog({ req, acao: `Atualizacao de checklist ${checklist.codigo}`, tipoRegistro: "ChecklistInspecao", registroId: checklist.id, dadosAnteriores: anterior, dadosNovos: checklist });
    return res.json(checklist);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro ao atualizar checklist" });
  }
}

