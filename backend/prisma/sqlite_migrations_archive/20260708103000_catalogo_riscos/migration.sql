CREATE TABLE "RiscoCatalogo" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "numero" INTEGER NOT NULL,
    "codigo" TEXT NOT NULL,
    "unidade" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "tipoRisco" TEXT NOT NULL,
    "naturezaRisco" TEXT NOT NULL,
    "descricaoRisco" TEXT NOT NULL,
    "possivelImpacto" TEXT NOT NULL,
    "medidasPreventivas" TEXT,
    "planoAcaoSugerido" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Ativo',
    "criadoPorId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE "AnaliseRisco" ADD COLUMN "riscoCatalogoId" INTEGER;

CREATE UNIQUE INDEX "RiscoCatalogo_codigo_unidade_key" ON "RiscoCatalogo"("codigo", "unidade");
CREATE UNIQUE INDEX "RiscoCatalogo_nome_unidade_key" ON "RiscoCatalogo"("nome", "unidade");
CREATE INDEX "RiscoCatalogo_unidade_status_idx" ON "RiscoCatalogo"("unidade", "status");
CREATE INDEX "AnaliseRisco_riscoCatalogoId_idx" ON "AnaliseRisco"("riscoCatalogoId");
