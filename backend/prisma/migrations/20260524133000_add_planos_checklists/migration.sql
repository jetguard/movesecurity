-- CreateTable
CREATE TABLE "PlanoAcaoCorporativo" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "numero" INTEGER NOT NULL,
    "ano" INTEGER NOT NULL,
    "codigo" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "unidade" TEXT NOT NULL,
    "origemModulo" TEXT,
    "origemId" INTEGER,
    "prioridade" TEXT NOT NULL DEFAULT 'Media',
    "status" TEXT NOT NULL DEFAULT 'Pendente',
    "percentual" INTEGER NOT NULL DEFAULT 0,
    "descricao" TEXT NOT NULL,
    "acaoCorretiva" TEXT,
    "acaoPreventiva" TEXT,
    "responsavelId" INTEGER,
    "responsavelNome" TEXT,
    "prazo" DATETIME NOT NULL,
    "concluidoEm" DATETIME,
    "evidencia" TEXT,
    "comentarios" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PlanoAcaoCorporativo_responsavelId_fkey" FOREIGN KEY ("responsavelId") REFERENCES "Usuario" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ChecklistInspecao" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "numero" INTEGER NOT NULL,
    "ano" INTEGER NOT NULL,
    "codigo" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "unidade" TEXT NOT NULL,
    "setor" TEXT,
    "local" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "dataHora" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "responsavelId" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Aberto',
    "pontuacao" INTEGER NOT NULL DEFAULT 0,
    "observacoes" TEXT,
    "planoAcaoGerado" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ChecklistInspecao_responsavelId_fkey" FOREIGN KEY ("responsavelId") REFERENCES "Usuario" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ChecklistItem" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "checklistId" INTEGER NOT NULL,
    "categoria" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "conformidade" TEXT NOT NULL DEFAULT 'Conforme',
    "criticidade" TEXT NOT NULL DEFAULT 'Media',
    "observacao" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ChecklistItem_checklistId_fkey" FOREIGN KEY ("checklistId") REFERENCES "ChecklistInspecao" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "PlanoAcaoCorporativo_codigo_unidade_key" ON "PlanoAcaoCorporativo"("codigo", "unidade");

-- CreateIndex
CREATE UNIQUE INDEX "ChecklistInspecao_codigo_unidade_key" ON "ChecklistInspecao"("codigo", "unidade");
