-- CreateTable
CREATE TABLE "AnaliseEstrategica" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "numero" INTEGER NOT NULL,
    "ano" INTEGER NOT NULL,
    "codigo" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "unidade" TEXT NOT NULL,
    "setor" TEXT,
    "local" TEXT,
    "dataHora" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "responsavelId" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Aberta',
    "descricao" TEXT NOT NULL,
    "diagnostico" TEXT,
    "impacto" TEXT,
    "recomendacoes" TEXT,
    "planoAcao" TEXT,
    "responsavelAcao" TEXT,
    "prazo" DATETIME,
    "ocorrenciaId" INTEGER,
    "eventoId" INTEGER,
    "investigacaoId" INTEGER,
    "analiseRiscoId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AnaliseEstrategica_responsavelId_fkey" FOREIGN KEY ("responsavelId") REFERENCES "Usuario" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "AnaliseEstrategica_codigo_unidade_key" ON "AnaliseEstrategica"("codigo", "unidade");
