-- DropIndex
DROP INDEX "Ocorrencia_codigo_key";

-- DropIndex
DROP INDEX "Evento_codigo_key";

-- DropIndex
DROP INDEX "AnaliseRisco_codigo_key";

-- AlterTable
ALTER TABLE "Ocorrencia" ADD COLUMN "unidade" TEXT NOT NULL DEFAULT 'GJA-T1';

-- AlterTable
ALTER TABLE "Evento" ADD COLUMN "unidade" TEXT NOT NULL DEFAULT 'GJA-T1';

-- AlterTable
ALTER TABLE "Investigacao" ADD COLUMN "unidade" TEXT NOT NULL DEFAULT 'GJA-T1';

-- CreateIndex
CREATE UNIQUE INDEX "Ocorrencia_codigo_unidade_key" ON "Ocorrencia"("codigo", "unidade");

-- CreateIndex
CREATE UNIQUE INDEX "Evento_codigo_unidade_key" ON "Evento"("codigo", "unidade");

-- CreateIndex
CREATE UNIQUE INDEX "AnaliseRisco_codigo_unidade_key" ON "AnaliseRisco"("codigo", "unidade");
