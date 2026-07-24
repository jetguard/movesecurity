CREATE TABLE "RelatorioDiarioExecutivo" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "numero" INTEGER NOT NULL,
    "ano" INTEGER NOT NULL,
    "codigo" TEXT NOT NULL,
    "dataOperacional" DATETIME NOT NULL,
    "unidade" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Consolidado',
    "resumoExecutivo" TEXT NOT NULL,
    "dadosJson" TEXT NOT NULL,
    "aprimoradoPorIa" BOOLEAN NOT NULL DEFAULT false,
    "modeloIa" TEXT,
    "responsavelId" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "RelatorioDiarioExecutivo_responsavelId_fkey"
      FOREIGN KEY ("responsavelId") REFERENCES "Usuario" ("id")
      ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "RelatorioDiarioExecutivo_codigo_unidade_key"
ON "RelatorioDiarioExecutivo"("codigo", "unidade");

CREATE UNIQUE INDEX "RelatorioDiarioExecutivo_dataOperacional_unidade_key"
ON "RelatorioDiarioExecutivo"("dataOperacional", "unidade");

CREATE INDEX "RelatorioDiarioExecutivo_unidade_dataOperacional_idx"
ON "RelatorioDiarioExecutivo"("unidade", "dataOperacional");
