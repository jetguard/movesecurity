ALTER TABLE "TreinamentoTerminal" ALTER COLUMN "codigo" DROP NOT NULL;
ALTER TABLE "IntegracaoTerminal" ALTER COLUMN "codigo" DROP NOT NULL;

UPDATE "TreinamentoTerminal"
SET "codigo" = NULL
WHERE LOWER("status") NOT LIKE 'conclu%';

UPDATE "IntegracaoTerminal"
SET "codigo" = NULL
WHERE LOWER("status") NOT LIKE 'conclu%';
