ALTER TABLE "ScannerPassagem"
  ADD COLUMN "falhasEquipamento" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "reprocessamentos" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "containersInspecao" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "aberturasSuspeita" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "tiposSuspeita" TEXT,
  ADD COLUMN "indisponibilidadeInicio" TIMESTAMP(3),
  ADD COLUMN "indisponibilidadeFim" TIMESTAMP(3),
  ADD COLUMN "indisponibilidadeMinutos" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "acoesContingencia" TEXT;

UPDATE "ScannerPassagem"
SET "total" = "leituraSatisfatoria" + "insatisfatoria" + "falhasEquipamento";
