CREATE TABLE "ScannerPassagem" (
  "id" SERIAL NOT NULL,
  "data" TIMESTAMP(3) NOT NULL,
  "scanner" TEXT NOT NULL DEFAULT 'NUTECH5S600',
  "leituraComFalha" INTEGER NOT NULL DEFAULT 0,
  "leituraSatisfatoria" INTEGER NOT NULL DEFAULT 0,
  "areaSuspeita" INTEGER NOT NULL DEFAULT 0,
  "insatisfatoria" INTEGER NOT NULL DEFAULT 0,
  "total" INTEGER NOT NULL DEFAULT 0,
  "unidade" TEXT NOT NULL,
  "criadoPorId" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ScannerPassagem_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ScannerPassagem_unidade_data_idx" ON "ScannerPassagem"("unidade", "data");

ALTER TABLE "ScannerPassagem"
  ADD CONSTRAINT "ScannerPassagem_criadoPorId_fkey"
  FOREIGN KEY ("criadoPorId") REFERENCES "Usuario"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
