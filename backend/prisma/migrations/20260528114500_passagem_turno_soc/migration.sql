CREATE TABLE "PassagemTurno" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "numero" INTEGER NOT NULL,
    "ano" INTEGER NOT NULL,
    "codigo" TEXT NOT NULL,
    "dataPassagem" DATETIME NOT NULL,
    "horaAbertura" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "horaEncerramento" DATETIME,
    "unidade" TEXT NOT NULL,
    "equipe" TEXT NOT NULL,
    "responsavelId" INTEGER NOT NULL,
    "colaboradoresIds" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Aberto',
    "statusPostoGocil" TEXT NOT NULL DEFAULT 'Completo',
    "observacaoPostoGocil" TEXT,
    "statusPostoScanner" TEXT NOT NULL DEFAULT 'Completo',
    "observacaoPostoScanner" TEXT,
    "informacoesComplementares" TEXT,
    "cftvConectadas" INTEGER,
    "cftvDesconectadas" INTEGER,
    "containersArmazenados" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PassagemTurno_responsavelId_fkey" FOREIGN KEY ("responsavelId") REFERENCES "Usuario" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "PassagemTurnoPosto" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "passagemId" INTEGER NOT NULL,
    "posto" TEXT NOT NULL,
    "colaborador" TEXT NOT NULL,
    "re" TEXT,
    "escala" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PassagemTurnoPosto_passagemId_fkey" FOREIGN KEY ("passagemId") REFERENCES "PassagemTurno" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "PassagemTurno_codigo_unidade_key" ON "PassagemTurno"("codigo", "unidade");
CREATE INDEX "PassagemTurno_unidade_equipe_status_idx" ON "PassagemTurno"("unidade", "equipe", "status");
