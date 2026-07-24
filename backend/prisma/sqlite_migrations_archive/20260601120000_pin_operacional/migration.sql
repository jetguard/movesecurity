ALTER TABLE "Usuario" ADD COLUMN "pinOperacionalHash" TEXT;
ALTER TABLE "Usuario" ADD COLUMN "pinOperacionalCriadoEm" DATETIME;
ALTER TABLE "Usuario" ADD COLUMN "pinOperacionalAtualizadoEm" DATETIME;
ALTER TABLE "Usuario" ADD COLUMN "pinTentativasInvalidas" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Usuario" ADD COLUMN "pinBloqueadoAte" DATETIME;
