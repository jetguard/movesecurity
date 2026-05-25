-- CreateTable
CREATE TABLE "PlanejamentoColuna" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "titulo" TEXT NOT NULL,
    "unidade" TEXT NOT NULL,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "cor" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "PlanejamentoCard" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "titulo" TEXT NOT NULL,
    "descricao" TEXT,
    "prioridade" TEXT NOT NULL DEFAULT 'Media',
    "prazo" DATETIME,
    "unidade" TEXT NOT NULL,
    "setor" TEXT,
    "local" TEXT,
    "moduloVinculado" TEXT,
    "registroId" INTEGER,
    "codigoRegistro" TEXT,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'Ativo',
    "colunaId" INTEGER NOT NULL,
    "responsavelId" INTEGER,
    "criadoPorId" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PlanejamentoCard_colunaId_fkey" FOREIGN KEY ("colunaId") REFERENCES "PlanejamentoColuna" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PlanejamentoCard_responsavelId_fkey" FOREIGN KEY ("responsavelId") REFERENCES "Usuario" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "PlanejamentoCard_criadoPorId_fkey" FOREIGN KEY ("criadoPorId") REFERENCES "Usuario" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "PlanejamentoColuna_unidade_ordem_idx" ON "PlanejamentoColuna"("unidade", "ordem");

-- CreateIndex
CREATE INDEX "PlanejamentoCard_unidade_colunaId_ordem_idx" ON "PlanejamentoCard"("unidade", "colunaId", "ordem");

-- CreateIndex
CREATE INDEX "PlanejamentoCard_responsavelId_idx" ON "PlanejamentoCard"("responsavelId");
