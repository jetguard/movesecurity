ALTER TABLE `OperacaoIndicadorRegistro`
  ADD COLUMN `statusValidacao` VARCHAR(191) NOT NULL DEFAULT 'Validado',
  ADD COLUMN `validadoPorId` INTEGER NULL,
  ADD COLUMN `validadoEm` DATETIME(3) NULL;

ALTER TABLE `ScannerPassagem`
  ADD COLUMN `statusValidacao` VARCHAR(191) NOT NULL DEFAULT 'Validado',
  ADD COLUMN `validadoPorId` INTEGER NULL,
  ADD COLUMN `validadoEm` DATETIME(3) NULL;

ALTER TABLE `OperacaoIndicadorRegistro`
  ADD INDEX `OperacaoIndicadorRegistro_unidade_modulo_statusValidacao_idx` (`unidade`, `modulo`, `statusValidacao`),
  ADD CONSTRAINT `OperacaoIndicadorRegistro_validadoPorId_fkey`
    FOREIGN KEY (`validadoPorId`) REFERENCES `Usuario`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `ScannerPassagem`
  ADD INDEX `ScannerPassagem_unidade_statusValidacao_idx` (`unidade`, `statusValidacao`),
  ADD CONSTRAINT `ScannerPassagem_validadoPorId_fkey`
    FOREIGN KEY (`validadoPorId`) REFERENCES `Usuario`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `OperacaoIndicadorRegistro`
  ALTER `statusValidacao` SET DEFAULT 'Pendente';

ALTER TABLE `ScannerPassagem`
  ALTER `statusValidacao` SET DEFAULT 'Pendente';
