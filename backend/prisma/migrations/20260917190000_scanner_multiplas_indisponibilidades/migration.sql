ALTER TABLE "ScannerPassagem"
ADD COLUMN "quantidadeIndisponibilidades" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "indisponibilidadesJson" TEXT;
