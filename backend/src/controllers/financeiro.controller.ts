import { Response } from "express";
import { prisma } from "../lib/prisma";
import { AuthRequest } from "../middlewares/auth";

const dinheiro = (valor: unknown) => {
  const texto = String(valor ?? 0).replace(/R\$|\s/g, "");
  const normalizado = texto.includes(",")
    ? texto.replace(/\./g, "").replace(",", ".")
    : texto;
  const numero = Number(normalizado);
  return Number.isFinite(numero) && numero >= 0 ? numero : 0;
};

export async function listarFornecedores(req: AuthRequest, res: Response) {
  const fornecedores = await prisma.fornecedorFinanceiro.findMany({
    where: { unidade: req.unidadeAtiva, ...(req.query.ativos === "true" ? { status: "ATIVO" } : {}) },
    include: { servicos: { orderBy: { id: "asc" } }, contaContabil: true },
    orderBy: { nomeEmpresa: "asc" },
  });
  return res.json(fornecedores);
}

export async function salvarFornecedor(req: AuthRequest, res: Response) {
  const nomeEmpresa = String(req.body.nomeEmpresa || "").trim();
  if (!nomeEmpresa) return res.status(400).json({ error: "Informe o nome da empresa." });
  const servicos = Array.isArray(req.body.servicos) ? req.body.servicos : [];
  const contaContabilId = req.body.contaContabilId ? Number(req.body.contaContabilId) : null;
  if (contaContabilId) {
    const conta = await prisma.contaContabilFinanceira.findFirst({
      where: { id: contaContabilId, unidade: req.unidadeAtiva, status: "ATIVO" },
    });
    if (!conta) return res.status(400).json({ error: "Conta contábil inválida para esta unidade." });
  }
  const data = {
    unidade: req.unidadeAtiva || "GJA-T1",
    nomeEmpresa,
    tipoServico: String(req.body.tipoServico || "Outros"),
    valorMensal: dinheiro(req.body.valorMensal),
    contaContabilId,
    status: String(req.body.status || "ATIVO"),
    criadoPorId: req.usuarioId,
    servicos: {
      create: servicos.map((item: any) => ({
        tipoServico: String(item.tipoServico || "").trim(),
        modalidade: String(item.modalidade || "SERVICO"),
        turno: item.turno ? String(item.turno) : null,
        valor: dinheiro(item.valor),
        valorDiario: item.modalidade === "PESSOA" ? dinheiro(item.valorDiario) : null,
        horasJornada: item.modalidade === "PESSOA" ? dinheiro(item.horasJornada || 8) : null,
      })),
    },
  };
  const id = Number(req.params.id || 0);
  const fornecedor = id
    ? await prisma.$transaction(async (tx) => {
        await tx.fornecedorFinanceiroServico.deleteMany({ where: { fornecedorId: id } });
        return tx.fornecedorFinanceiro.update({ where: { id, unidade: req.unidadeAtiva }, data, include: { servicos: true, contaContabil: true } });
      })
    : await prisma.fornecedorFinanceiro.create({ data, include: { servicos: true, contaContabil: true } });
  return res.status(id ? 200 : 201).json(fornecedor);
}

export async function excluirFornecedor(req: AuthRequest, res: Response) {
  await prisma.fornecedorFinanceiro.delete({ where: { id: Number(req.params.id), unidade: req.unidadeAtiva } });
  return res.status(204).send();
}

export async function listarContas(req: AuthRequest, res: Response) {
  return res.json(await prisma.contaContabilFinanceira.findMany({
    where: { unidade: req.unidadeAtiva, ...(req.query.ano ? { ano: Number(req.query.ano) } : {}) },
    orderBy: [{ ano: "desc" }, { nome: "asc" }],
  }));
}

export async function salvarConta(req: AuthRequest, res: Response) {
  const nome = String(req.body.nome || "").trim();
  if (!nome) return res.status(400).json({ error: "Informe o nome da conta contábil." });
  const data = {
    unidade: req.unidadeAtiva || "GJA-T1", nome,
    categoria: String(req.body.categoria || "Outros"), ano: Number(req.body.ano || new Date().getFullYear()),
    valorOrcado: dinheiro(req.body.valorOrcado), observacoes: String(req.body.observacoes || "") || null,
    status: String(req.body.status || "ATIVO"), criadoPorId: req.usuarioId,
  };
  const id = Number(req.params.id || 0);
  const conta = id
    ? await prisma.contaContabilFinanceira.update({ where: { id, unidade: req.unidadeAtiva }, data })
    : await prisma.contaContabilFinanceira.create({ data });
  return res.status(id ? 200 : 201).json(conta);
}

export async function excluirConta(req: AuthRequest, res: Response) {
  await prisma.contaContabilFinanceira.delete({ where: { id: Number(req.params.id), unidade: req.unidadeAtiva } });
  return res.status(204).send();
}

export async function resumoFinanceiro(req: AuthRequest, res: Response) {
  const ano = Number(req.query.ano || new Date().getFullYear());
  const [fornecedores, contas, vigilancia] = await Promise.all([
    prisma.fornecedorFinanceiro.findMany({ where: { unidade: req.unidadeAtiva, status: "ATIVO" }, include: { servicos: true } }),
    prisma.contaContabilFinanceira.findMany({ where: { unidade: req.unidadeAtiva, ano, status: "ATIVO" } }),
    prisma.operacaoIndicadorRegistro.findMany({ where: { unidade: req.unidadeAtiva, modulo: "operacao_vigilancia", statusValidacao: "Validado", dataReferencia: { gte: new Date(ano, 0, 1), lt: new Date(ano + 1, 0, 1) } } }),
  ]);
  const orcadoAnual = contas.reduce((t, i) => t + Number(i.valorOrcado), 0);
  const contratadoMensal = fornecedores.reduce((t, i) => t + Number(i.valorMensal), 0);
  const descontosPorMes = Array.from({ length: 12 }, (_, mes) => ({ mes: mes + 1, valor: 0 }));
  vigilancia.forEach((registro) => {
    const dados = JSON.parse(registro.dadosJson || "{}");
    descontosPorMes[registro.dataReferencia.getMonth()].valor += Number(dados.descontoFinanceiro || 0);
  });
  return res.json({ ano, orcadoAnual, contratadoMensal, contratadoAnual: contratadoMensal * 12, descontosPorMes, fornecedores, contas });
}
