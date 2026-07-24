-- CreateTable
CREATE TABLE "AnaliseRisco" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "numero" INTEGER NOT NULL,
    "ano" INTEGER NOT NULL,
    "codigo" TEXT NOT NULL,
    "dataHora" DATETIME NOT NULL,
    "responsavelId" INTEGER NOT NULL,
    "unidade" TEXT NOT NULL,
    "setor" TEXT NOT NULL,
    "local" TEXT NOT NULL,
    "tipoRisco" TEXT NOT NULL,
    "naturezaRisco" TEXT NOT NULL,
    "descricaoRisco" TEXT NOT NULL,
    "possivelImpacto" TEXT NOT NULL,
    "probabilidade" TEXT NOT NULL,
    "severidade" TEXT NOT NULL,
    "nivelRisco" TEXT NOT NULL,
    "medidasPreventivas" TEXT NOT NULL,
    "planoAcao" TEXT NOT NULL,
    "responsavelAcaoId" INTEGER,
    "responsavelAcaoNome" TEXT,
    "prazo" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Pendente',
    "ocorrenciaId" INTEGER,
    "eventoId" INTEGER,
    "investigacaoId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AnaliseRisco_responsavelId_fkey" FOREIGN KEY ("responsavelId") REFERENCES "Usuario" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "AnaliseRisco_responsavelAcaoId_fkey" FOREIGN KEY ("responsavelAcaoId") REFERENCES "Usuario" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "AnaliseRisco_ocorrenciaId_fkey" FOREIGN KEY ("ocorrenciaId") REFERENCES "Ocorrencia" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "AnaliseRisco_eventoId_fkey" FOREIGN KEY ("eventoId") REFERENCES "Evento" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "AnaliseRisco_investigacaoId_fkey" FOREIGN KEY ("investigacaoId") REFERENCES "Investigacao" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FotoRisco" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "analiseRiscoId" INTEGER NOT NULL,
    "nomeOriginal" TEXT NOT NULL,
    "nomeArquivo" TEXT NOT NULL,
    "caminho" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FotoRisco_analiseRiscoId_fkey" FOREIGN KEY ("analiseRiscoId") REFERENCES "AnaliseRisco" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "AnaliseRisco_codigo_key" ON "AnaliseRisco"("codigo");
