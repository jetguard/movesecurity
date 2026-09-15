CREATE TABLE `ScannerPassagem` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `data` DATETIME(3) NOT NULL,
  `scanner` VARCHAR(191) NOT NULL DEFAULT 'NUTECH5S600',
  `leituraComFalha` INTEGER NOT NULL DEFAULT 0,
  `leituraSatisfatoria` INTEGER NOT NULL DEFAULT 0,
  `areaSuspeita` INTEGER NOT NULL DEFAULT 0,
  `insatisfatoria` INTEGER NOT NULL DEFAULT 0,
  `total` INTEGER NOT NULL DEFAULT 0,
  `unidade` VARCHAR(191) NOT NULL,
  `criadoPorId` INTEGER NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE INDEX `ScannerPassagem_unidade_data_idx` ON `ScannerPassagem`(`unidade`, `data`);
