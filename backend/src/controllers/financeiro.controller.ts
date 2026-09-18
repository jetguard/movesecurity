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

const STATUS_REQUISICAO = new Set([
  "PENDENTE", "EM_COTACAO", "PEDIDO_ENVIADO", "PEDIDO_APROVADO",
  "AGUARDANDO_FORNECEDOR", "CONCLUIDO", "CANCELADO",
]);

const dataOpcional = (valor: unknown) => valor ? new Date(String(valor)) : null;

export async function listarRequisicoes(req: AuthRequest, res: Response) {
  const requisicoes = await prisma.requisicaoCompra.findMany({
    where: { unidade: req.unidadeAtiva },
    include: { contaContabil: true },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
  });
  return res.json(requisicoes);
}

export async function salvarRequisicao(req: AuthRequest, res: Response) {
  const id = Number(req.params.id || 0);
  const contaContabilId = Number(req.body.contaContabilId);
  const item = String(req.body.item || "").trim();
  const quantidade = Number(req.body.quantidade);
  const valorMinimo = dinheiro(req.body.valorMinimo);
  const valorMaximo = dinheiro(req.body.valorMaximo);
  const dataPrazo = new Date(String(req.body.dataPrazo || ""));
  const finalidade = String(req.body.finalidade || "").trim();
  if (!contaContabilId || !item || !Number.isInteger(quantidade) || quantidade < 1 || !finalidade || Number.isNaN(dataPrazo.getTime())) {
    return res.status(400).json({ error: "Preencha conta contábil, item, quantidade, prazo e finalidade." });
  }
  if (valorMaximo < valorMinimo) return res.status(400).json({ error: "O valor máximo não pode ser menor que o valor mínimo." });
  const conta = await prisma.contaContabilFinanceira.findFirst({
    where: { id: contaContabilId, unidade: req.unidadeAtiva, status: "ATIVO" },
  });
  if (!conta) return res.status(400).json({ error: "Conta contábil inválida para esta unidade." });
  const statusSolicitado = String(req.body.status || "PENDENTE").toUpperCase();
  const status = id && STATUS_REQUISICAO.has(statusSolicitado) ? statusSolicitado : "PENDENTE";
  const valorConcluido = status === "CONCLUIDO" ? dinheiro(req.body.valorConcluido) : null;
  if (status === "CONCLUIDO" && !valorConcluido) {
    return res.status(400).json({ error: "Informe o valor final da compra para concluir a requisição." });
  }
  const data = {
    unidade: req.unidadeAtiva || "GJA-T1", contaContabilId, item, quantidade,
    valorMinimo, valorMaximo, dataPrazo, finalidade,
    fornecedorSugerido: String(req.body.fornecedorSugerido || "").trim() || null,
    contatoFornecedor: String(req.body.contatoFornecedor || "").trim() || null,
    numeroRequisicao: id ? String(req.body.numeroRequisicao || "").trim() || null : null,
    numeroPedidoSap: id ? String(req.body.numeroPedidoSap || "").trim() || null : null,
    dataAprovacaoRequisicao: id ? dataOpcional(req.body.dataAprovacaoRequisicao) : null,
    dataAprovacaoPedido: id ? dataOpcional(req.body.dataAprovacaoPedido) : null,
    valorConcluido, status, criadoPorId: req.usuarioId,
  };
  const requisicao = id
    ? await prisma.requisicaoCompra.update({ where: { id, unidade: req.unidadeAtiva }, data, include: { contaContabil: true } })
    : await prisma.requisicaoCompra.create({ data, include: { contaContabil: true } });
  return res.status(id ? 200 : 201).json(requisicao);
}

export async function excluirRequisicao(req: AuthRequest, res: Response) {
  await prisma.requisicaoCompra.delete({ where: { id: Number(req.params.id), unidade: req.unidadeAtiva } });
  return res.status(204).send();
}

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
        valor: item.modalidade === "PESSOA" ? dinheiro(item.valorDiario) : dinheiro(item.valor),
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
    categoria: "Conta contábil", ano: Number(req.body.ano || new Date().getFullYear()),
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
  const [fornecedores, contas, vigilancia, compras] = await Promise.all([
    prisma.fornecedorFinanceiro.findMany({ where: { unidade: req.unidadeAtiva, status: "ATIVO" }, include: { servicos: true } }),
    prisma.contaContabilFinanceira.findMany({ where: { unidade: req.unidadeAtiva, ano, status: "ATIVO" } }),
    prisma.operacaoIndicadorRegistro.findMany({ where: { unidade: req.unidadeAtiva, modulo: "operacao_vigilancia", statusValidacao: "Validado", dataReferencia: { gte: new Date(ano, 0, 1), lt: new Date(ano + 1, 0, 1) } } }),
    prisma.requisicaoCompra.findMany({ where: { unidade: req.unidadeAtiva, status: "CONCLUIDO", contaContabil: { ano } }, include: { contaContabil: true } }),
  ]);
  const orcadoAnual = contas.reduce((t, i) => t + Number(i.valorOrcado), 0);
  const contratadoMensal = fornecedores.reduce((t, i) => t + Number(i.valorMensal), 0);
  const descontosPorMes = Array.from({ length: 12 }, (_, mes) => ({ mes: mes + 1, valor: 0 }));
  vigilancia.forEach((registro) => {
    const dados = JSON.parse(registro.dadosJson || "{}");
    descontosPorMes[registro.dataReferencia.getMonth()].valor += Number(dados.descontoFinanceiro || 0);
  });
  const comprasConcluidasValor = compras.reduce((total, compra) => total + Number(compra.valorConcluido || 0), 0);
  const comprasPorConta = contas.map((conta) => {
    const realizado = compras.filter((compra) => compra.contaContabilId === conta.id).reduce((total, compra) => total + Number(compra.valorConcluido || 0), 0);
    const orcado = Number(conta.valorOrcado);
    return { id: conta.id, nome: conta.nome, categoria: conta.categoria, orcado, realizado, saldo: orcado - realizado, percentualUsado: orcado ? (realizado / orcado) * 100 : 0 };
  });
  return res.json({ ano, orcadoAnual, contratadoMensal, contratadoAnual: contratadoMensal * 12, descontosPorMes, fornecedores, contas, comprasConcluidas: compras.length, comprasConcluidasValor, saldoOrcamento: orcadoAnual - comprasConcluidasValor, comprasPorConta });
}
