ALTER TABLE `ScannerPassagem`
  ADD COLUMN `falhasEquipamento` INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN `reprocessamentos` INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN `containersInspecao` INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN `aberturasSuspeita` INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN `tiposSuspeita` LONGTEXT NULL,
  ADD COLUMN `indisponibilidadeInicio` DATETIME(3) NULL,
  ADD COLUMN `indisponibilidadeFim` DATETIME(3) NULL,
  ADD COLUMN `indisponibilidadeMinutos` INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN `acoesContingencia` LONGTEXT NULL;

UPDATE `ScannerPassagem`
SET `total` = `leituraSatisfatoria` + `insatisfatoria` + `falhasEquipamento`;
