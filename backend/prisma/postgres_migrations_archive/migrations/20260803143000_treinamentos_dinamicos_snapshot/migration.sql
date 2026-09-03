ALTER TABLE "TreinamentoModelo"
ADD COLUMN "versao" INTEGER NOT NULL DEFAULT 1;

ALTER TABLE "TreinamentoModeloParticipante"
ADD COLUMN "versao" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN "snapshotJson" TEXT;
