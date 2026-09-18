ALTER TABLE "FornecedorFinanceiro"
ADD COLUMN "contaContabilId" INTEGER;

CREATE INDEX "FornecedorFinanceiro_contaContabilId_idx"
ON "FornecedorFinanceiro"("contaContabilId");

ALTER TABLE "FornecedorFinanceiro"
ADD CONSTRAINT "FornecedorFinanceiro_contaContabilId_fkey"
FOREIGN KEY ("contaContabilId") REFERENCES "ContaContabilFinanceira"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
