ALTER TABLE "AnaliseRiscoCompleta"
ADD COLUMN "tratativaStatus" TEXT NOT NULL DEFAULT 'Aberta',
ADD COLUMN "tratativaResponsavelId" INTEGER,
ADD COLUMN "tratativaResponsavelNome" TEXT,
ADD COLUMN "tratativaPrazo" TIMESTAMP(3),
ADD COLUMN "tratativaAcao" TEXT,
ADD COLUMN "tratativaEvidencia" TEXT,
ADD COLUMN "tratativaValidacao" TEXT,
ADD COLUMN "tratativaConcluidaEm" TIMESTAMP(3);

CREATE INDEX "AnaliseRiscoCompleta_unidade_tratativaStatus_idx"
ON "AnaliseRiscoCompleta"("unidade", "tratativaStatus");
