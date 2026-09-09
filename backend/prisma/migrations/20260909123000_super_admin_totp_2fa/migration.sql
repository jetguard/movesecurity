ALTER TABLE `Usuario`
ADD COLUMN `doisFatoresMetodo` VARCHAR(191) NULL DEFAULT 'EMAIL',
ADD COLUMN `doisFatoresTotpSecret` VARCHAR(191) NULL,
ADD COLUMN `doisFatoresTotpConfirmadoEm` DATETIME(3) NULL;
