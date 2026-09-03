ALTER TABLE "AnaliseRiscoCompleta"
  ADD COLUMN "finalizacaoStatus" TEXT NOT NULL DEFAULT 'Aberta',
  ADD COLUMN "finalizacaoDecisao" TEXT,
  ADD COLUMN "finalizacaoJustificativa" TEXT,
  ADD COLUMN "finalizacaoAprovadorId" INTEGER,
  ADD COLUMN "finalizacaoAprovadorNome" TEXT,
  ADD COLUMN "finalizacaoObservacoes" TEXT,
  ADD COLUMN "finalizadaEm" TIMESTAMP(3);
