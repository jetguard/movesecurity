ALTER TABLE "CameraMonitoramento" ADD COLUMN "nomeCamera" TEXT;
ALTER TABLE "CameraChecklistOperacional" ADD COLUMN "dataMaisRecenteGravacao" DATETIME;
ALTER TABLE "CameraEventoStatus" ADD COLUMN "motivo" TEXT;
