ALTER TABLE "CameraMonitoramento" ADD COLUMN "statusCadastro" TEXT NOT NULL DEFAULT 'Ativa';
ALTER TABLE "CameraMonitoramento" ADD COLUMN "removidaEm" DATETIME;
ALTER TABLE "CameraMonitoramento" ADD COLUMN "removidaPorId" INTEGER;
ALTER TABLE "CameraMonitoramento" ADD COLUMN "motivoRemocao" TEXT;

