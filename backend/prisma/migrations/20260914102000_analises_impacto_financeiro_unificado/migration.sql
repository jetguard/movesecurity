ALTER TABLE "AnaliseOcorrencia"
  ADD COLUMN "houveDanoPrejuizo" TEXT,
  ADD COLUMN "tipoImpactoFinanceiro" TEXT,
  ADD COLUMN "valorPrejuizo" TEXT NOT NULL DEFAULT '0,00',
  ADD COLUMN "valorRecuperado" TEXT NOT NULL DEFAULT '0,00';

ALTER TABLE "AnaliseEvento"
  ADD COLUMN "houveDanoPrejuizo" TEXT,
  ADD COLUMN "tipoImpactoFinanceiro" TEXT,
  ADD COLUMN "valorPrejuizo" TEXT NOT NULL DEFAULT '0,00';
