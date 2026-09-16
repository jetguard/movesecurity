CREATE TABLE "OperacaoIndicadorRegistro" (
  "id" SERIAL NOT NULL,
  "modulo" TEXT NOT NULL,
  "dataReferencia" TIMESTAMP(3) NOT NULL,
  "dadosJson" TEXT NOT NULL,
  "unidade" TEXT NOT NULL,
  "criadoPorId" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "OperacaoIndicadorRegistro_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "OperacaoIndicadorRegistro_unidade_modulo_dataReferencia_idx"
  ON "OperacaoIndicadorRegistro"("unidade", "modulo", "dataReferencia");

ALTER TABLE "OperacaoIndicadorRegistro"
  ADD CONSTRAINT "OperacaoIndicadorRegistro_criadoPorId_fkey"
  FOREIGN KEY ("criadoPorId") REFERENCES "Usuario"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
