ALTER TABLE "TreinamentoPocSep007" ADD COLUMN "cpf" TEXT;

CREATE INDEX "TreinamentoPocSep007_cpf_idx" ON "TreinamentoPocSep007"("cpf");
