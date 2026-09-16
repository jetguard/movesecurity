CREATE TABLE `OperacaoIndicadorRegistro` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `modulo` VARCHAR(191) NOT NULL,
  `dataReferencia` DATETIME(3) NOT NULL,
  `dadosJson` LONGTEXT NOT NULL,
  `unidade` VARCHAR(191) NOT NULL,
  `criadoPorId` INTEGER NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  INDEX `OperacaoIndicadorRegistro_unidade_modulo_dataReferencia_idx`(`unidade`, `modulo`, `dataReferencia`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `OperacaoIndicadorRegistro`
  ADD CONSTRAINT `OperacaoIndicadorRegistro_criadoPorId_fkey`
  FOREIGN KEY (`criadoPorId`) REFERENCES `Usuario`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;
