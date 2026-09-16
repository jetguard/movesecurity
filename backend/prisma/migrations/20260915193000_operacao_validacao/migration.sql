ALTER TABLE "OperacaoIndicadorRegistro"
  ADD COLUMN "statusValidacao" TEXT NOT NULL DEFAULT 'Validado',
  ADD COLUMN "validadoPorId" INTEGER,
  ADD COLUMN "validadoEm" TIMESTAMP(3);

ALTER TABLE "ScannerPassagem"
  ADD COLUMN "statusValidacao" TEXT NOT NULL DEFAULT 'Validado',
  ADD COLUMN "validadoPorId" INTEGER,
  ADD COLUMN "validadoEm" TIMESTAMP(3);

CREATE INDEX "OperacaoIndicadorRegistro_unidade_modulo_statusValidacao_idx"
  ON "OperacaoIndicadorRegistro"("unidade", "modulo", "statusValidacao");

ALTER TABLE "OperacaoIndicadorRegistro"
  ADD CONSTRAINT "OperacaoIndicadorRegistro_validadoPorId_fkey"
  FOREIGN KEY ("validadoPorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "ScannerPassagem_unidade_statusValidacao_idx"
  ON "ScannerPassagem"("unidade", "statusValidacao");

ALTER TABLE "ScannerPassagem"
  ADD CONSTRAINT "ScannerPassagem_validadoPorId_fkey"
  FOREIGN KEY ("validadoPorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "OperacaoIndicadorRegistro"
  ALTER COLUMN "statusValidacao" SET DEFAULT 'Pendente';

ALTER TABLE "ScannerPassagem"
  ALTER COLUMN "statusValidacao" SET DEFAULT 'Pendente';
