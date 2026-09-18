CREATE TABLE "FornecedorFinanceiro" (
  "id" SERIAL PRIMARY KEY,
  "unidade" TEXT NOT NULL,
  "nomeEmpresa" TEXT NOT NULL,
  "tipoServico" TEXT NOT NULL,
  "valorMensal" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "status" TEXT NOT NULL DEFAULT 'ATIVO',
  "criadoPorId" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE UNIQUE INDEX "FornecedorFinanceiro_unidade_nomeEmpresa_key" ON "FornecedorFinanceiro"("unidade", "nomeEmpresa");
CREATE INDEX "FornecedorFinanceiro_unidade_status_idx" ON "FornecedorFinanceiro"("unidade", "status");

CREATE TABLE "FornecedorFinanceiroServico" (
  "id" SERIAL PRIMARY KEY,
  "fornecedorId" INTEGER NOT NULL,
  "tipoServico" TEXT NOT NULL,
  "modalidade" TEXT NOT NULL,
  "turno" TEXT,
  "valor" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "valorDiario" DECIMAL(14,2),
  "horasJornada" DECIMAL(6,2),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "FornecedorFinanceiroServico_fornecedorId_fkey" FOREIGN KEY ("fornecedorId") REFERENCES "FornecedorFinanceiro"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "FornecedorFinanceiroServico_fornecedorId_idx" ON "FornecedorFinanceiroServico"("fornecedorId");

CREATE TABLE "ContaContabilFinanceira" (
  "id" SERIAL PRIMARY KEY,
  "unidade" TEXT NOT NULL,
  "nome" TEXT NOT NULL,
  "categoria" TEXT NOT NULL,
  "ano" INTEGER NOT NULL,
  "valorOrcado" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "observacoes" TEXT,
  "status" TEXT NOT NULL DEFAULT 'ATIVO',
  "criadoPorId" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE UNIQUE INDEX "ContaContabilFinanceira_unidade_nome_ano_key" ON "ContaContabilFinanceira"("unidade", "nome", "ano");
CREATE INDEX "ContaContabilFinanceira_unidade_ano_status_idx" ON "ContaContabilFinanceira"("unidade", "ano", "status");
