ALTER TABLE `AnaliseOcorrencia`
  ADD COLUMN `houveDanoPrejuizo` TEXT NULL,
  ADD COLUMN `tipoImpactoFinanceiro` TEXT NULL,
  ADD COLUMN `valorPrejuizo` VARCHAR(191) NOT NULL DEFAULT '0,00',
  ADD COLUMN `valorRecuperado` VARCHAR(191) NOT NULL DEFAULT '0,00';

ALTER TABLE `AnaliseEvento`
  ADD COLUMN `houveDanoPrejuizo` TEXT NULL,
  ADD COLUMN `tipoImpactoFinanceiro` TEXT NULL,
  ADD COLUMN `valorPrejuizo` VARCHAR(191) NOT NULL DEFAULT '0,00';
