-- AlterTable
ALTER TABLE "CameraChecklistOperacional" ADD COLUMN "dataInicialGravacao" DATETIME;
ALTER TABLE "CameraChecklistOperacional" ADD COLUMN "dataDesconexaoManual" DATETIME;
ALTER TABLE "CameraChecklistOperacional" ADD COLUMN "dataReconexaoManual" DATETIME;
ALTER TABLE "CameraChecklistOperacional" ADD COLUMN "retencaoEstimadaMinutos" INTEGER;
ALTER TABLE "CameraChecklistOperacional" ADD COLUMN "retencaoEstimadaTexto" TEXT;
