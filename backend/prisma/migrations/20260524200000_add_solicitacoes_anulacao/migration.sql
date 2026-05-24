CREATE TABLE "SolicitacaoAnulacaoRelatorio" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "modulo" TEXT NOT NULL,
    "registroId" INTEGER NOT NULL,
    "codigoRegistro" TEXT NOT NULL,
    "tituloRegistro" TEXT NOT NULL,
    "unidade" TEXT NOT NULL,
    "motivo" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Pendente',
    "solicitanteId" INTEGER NOT NULL,
    "decididoPorId" INTEGER,
    "decisaoMotivo" TEXT,
    "decididoEm" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SolicitacaoAnulacaoRelatorio_solicitanteId_fkey" FOREIGN KEY ("solicitanteId") REFERENCES "Usuario" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "SolicitacaoAnulacaoRelatorio_decididoPorId_fkey" FOREIGN KEY ("decididoPorId") REFERENCES "Usuario" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE "AcordoAnulacaoRelatorio" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "solicitacaoId" INTEGER NOT NULL,
    "analistaId" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Pendente',
    "observacao" TEXT,
    "decididoEm" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AcordoAnulacaoRelatorio_solicitacaoId_fkey" FOREIGN KEY ("solicitacaoId") REFERENCES "SolicitacaoAnulacaoRelatorio" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AcordoAnulacaoRelatorio_analistaId_fkey" FOREIGN KEY ("analistaId") REFERENCES "Usuario" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "SolicitacaoAnulacaoRelatorio_modulo_registroId_status_idx" ON "SolicitacaoAnulacaoRelatorio"("modulo", "registroId", "status");
CREATE UNIQUE INDEX "AcordoAnulacaoRelatorio_solicitacaoId_analistaId_key" ON "AcordoAnulacaoRelatorio"("solicitacaoId", "analistaId");
