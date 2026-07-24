-- AlterTable
ALTER TABLE "Ocorrencia" ADD COLUMN "fluxoStatus" TEXT NOT NULL DEFAULT 'Aguardando Revisao';
ALTER TABLE "Ocorrencia" ADD COLUMN "revisadoPorId" INTEGER;
ALTER TABLE "Ocorrencia" ADD COLUMN "revisadoEm" DATETIME;
ALTER TABLE "Ocorrencia" ADD COLUMN "aprovadoPorId" INTEGER;
ALTER TABLE "Ocorrencia" ADD COLUMN "aprovadoEm" DATETIME;
ALTER TABLE "Ocorrencia" ADD COLUMN "motivoDevolucao" TEXT;

-- AlterTable
ALTER TABLE "Evento" ADD COLUMN "fluxoStatus" TEXT NOT NULL DEFAULT 'Aguardando Revisao';
ALTER TABLE "Evento" ADD COLUMN "revisadoPorId" INTEGER;
ALTER TABLE "Evento" ADD COLUMN "revisadoEm" DATETIME;
ALTER TABLE "Evento" ADD COLUMN "aprovadoPorId" INTEGER;
ALTER TABLE "Evento" ADD COLUMN "aprovadoEm" DATETIME;
ALTER TABLE "Evento" ADD COLUMN "motivoDevolucao" TEXT;

-- AlterTable
ALTER TABLE "Investigacao" ADD COLUMN "fluxoStatus" TEXT NOT NULL DEFAULT 'Aguardando Revisao';
ALTER TABLE "Investigacao" ADD COLUMN "revisadoPorId" INTEGER;
ALTER TABLE "Investigacao" ADD COLUMN "revisadoEm" DATETIME;
ALTER TABLE "Investigacao" ADD COLUMN "aprovadoPorId" INTEGER;
ALTER TABLE "Investigacao" ADD COLUMN "aprovadoEm" DATETIME;
ALTER TABLE "Investigacao" ADD COLUMN "motivoDevolucao" TEXT;
