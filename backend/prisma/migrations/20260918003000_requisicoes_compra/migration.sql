CREATE TABLE "RequisicaoCompra" (
  "id" SERIAL NOT NULL,
  "unidade" TEXT NOT NULL,
  "contaContabilId" INTEGER NOT NULL,
  "item" TEXT NOT NULL,
  "quantidade" INTEGER NOT NULL,
  "valorMinimo" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "valorMaximo" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "dataPrazo" TIMESTAMP(3) NOT NULL,
  "finalidade" TEXT NOT NULL,
  "fornecedorSugerido" TEXT,
  "contatoFornecedor" TEXT,
  "numeroRequisicao" TEXT,
  "numeroPedidoSap" TEXT,
  "dataAprovacaoRequisicao" TIMESTAMP(3),
  "dataAprovacaoPedido" TIMESTAMP(3),
  "valorConcluido" DECIMAL(14,2),
  "status" TEXT NOT NULL DEFAULT 'PENDENTE',
  "criadoPorId" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "RequisicaoCompra_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "RequisicaoCompra_unidade_status_idx" ON "RequisicaoCompra"("unidade", "status");
CREATE INDEX "RequisicaoCompra_contaContabilId_idx" ON "RequisicaoCompra"("contaContabilId");
ALTER TABLE "RequisicaoCompra" ADD CONSTRAINT "RequisicaoCompra_contaContabilId_fkey" FOREIGN KEY ("contaContabilId") REFERENCES "ContaContabilFinanceira"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
