ALTER TABLE "TreinamentoModelo"
ADD COLUMN IF NOT EXISTS "avaliacaoHabilitada" BOOLEAN NOT NULL DEFAULT true;
