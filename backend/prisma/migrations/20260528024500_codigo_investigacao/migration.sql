ALTER TABLE "Investigacao" ADD COLUMN "numero" INTEGER;
ALTER TABLE "Investigacao" ADD COLUMN "ano" INTEGER;
ALTER TABLE "Investigacao" ADD COLUMN "codigo" TEXT;

WITH numeradas AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY unidade, CAST(strftime('%Y', createdAt) AS INTEGER)
      ORDER BY createdAt, id
    ) AS novoNumero,
    CAST(strftime('%Y', createdAt) AS INTEGER) AS novoAno
  FROM "Investigacao"
)
UPDATE "Investigacao"
SET
  "numero" = (SELECT novoNumero FROM numeradas WHERE numeradas.id = "Investigacao".id),
  "ano" = (SELECT novoAno FROM numeradas WHERE numeradas.id = "Investigacao".id),
  "codigo" = printf(
    '%04d/%d',
    (SELECT novoNumero FROM numeradas WHERE numeradas.id = "Investigacao".id),
    (SELECT novoAno FROM numeradas WHERE numeradas.id = "Investigacao".id)
  )
WHERE "codigo" IS NULL;

CREATE UNIQUE INDEX "Investigacao_codigo_unidade_key" ON "Investigacao"("codigo", "unidade");
