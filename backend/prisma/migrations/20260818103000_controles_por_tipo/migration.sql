ALTER TABLE "ControlePreventivoCadastro"
ADD COLUMN "tipoControle" TEXT NOT NULL DEFAULT 'CP';

DROP INDEX IF EXISTS "ControlePreventivoCadastro_nome_key";

CREATE UNIQUE INDEX "ControlePreventivoCadastro_tipoControle_nome_key"
ON "ControlePreventivoCadastro"("tipoControle", "nome");

CREATE INDEX "ControlePreventivoCadastro_tipoControle_status_numero_idx"
ON "ControlePreventivoCadastro"("tipoControle", "status", "numero");
