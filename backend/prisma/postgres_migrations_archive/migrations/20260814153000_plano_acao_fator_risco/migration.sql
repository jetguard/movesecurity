ALTER TABLE "PlanoAcaoCorporativo"
ADD COLUMN "fatorRiscoId" INTEGER,
ADD COLUMN "fatorRiscoCodigo" TEXT,
ADD COLUMN "fatorRiscoNome" TEXT;

CREATE INDEX "PlanoAcaoCorporativo_origemModulo_origemId_idx"
ON "PlanoAcaoCorporativo"("origemModulo", "origemId");

CREATE INDEX "PlanoAcaoCorporativo_fatorRiscoId_idx"
ON "PlanoAcaoCorporativo"("fatorRiscoId");
