CREATE TABLE "SugestaoMelhoria" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "assunto" TEXT NOT NULL,
    "sugestao" TEXT NOT NULL,
    "printTela" TEXT,
    "nomeArquivo" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Recebida',
    "resposta" TEXT,
    "unidade" TEXT NOT NULL DEFAULT 'GJA-T1',
    "autorId" INTEGER NOT NULL,
    "avaliadoPorId" INTEGER,
    "avaliadoEm" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SugestaoMelhoria_autorId_fkey" FOREIGN KEY ("autorId") REFERENCES "Usuario" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SugestaoMelhoria_avaliadoPorId_fkey" FOREIGN KEY ("avaliadoPorId") REFERENCES "Usuario" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "SugestaoMelhoria_status_unidade_idx" ON "SugestaoMelhoria"("status", "unidade");
CREATE INDEX "SugestaoMelhoria_autorId_createdAt_idx" ON "SugestaoMelhoria"("autorId", "createdAt");
