/*
  Warnings:

  - Added the required column `assunto` to the `Investigacao` table without a default value. This is not possible if the table is not empty.
  - Added the required column `dataOcorrencia` to the `Investigacao` table without a default value. This is not possible if the table is not empty.
  - Added the required column `local` to the `Investigacao` table without a default value. This is not possible if the table is not empty.
  - Added the required column `natureza` to the `Investigacao` table without a default value. This is not possible if the table is not empty.
  - Added the required column `numeroOcorrencia` to the `Investigacao` table without a default value. This is not possible if the table is not empty.
  - Added the required column `ocorrenciaId` to the `Investigacao` table without a default value. This is not possible if the table is not empty.
  - Added the required column `subNatureza` to the `Investigacao` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Investigacao` table without a default value. This is not possible if the table is not empty.

*/
-- CreateTable
CREATE TABLE "AnaliseOcorrencia" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "ocorrenciaId" INTEGER NOT NULL,
    "responsavelId" INTEGER NOT NULL,
    "iniciadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "concluidoEm" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'Em Análise',
    "prejuizoFinanceiro" TEXT NOT NULL DEFAULT '0,00',
    "conclusaoAnalise" TEXT,
    "concluidoPorId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AnaliseOcorrencia_ocorrenciaId_fkey" FOREIGN KEY ("ocorrenciaId") REFERENCES "Ocorrencia" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AnaliseOcorrencia_responsavelId_fkey" FOREIGN KEY ("responsavelId") REFERENCES "Usuario" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "AnaliseOcorrencia_concluidoPorId_fkey" FOREIGN KEY ("concluidoPorId") REFERENCES "Usuario" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AnaliseEvento" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "eventoId" INTEGER NOT NULL,
    "responsavelId" INTEGER NOT NULL,
    "iniciadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "concluidoEm" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'Em Análise',
    "valorRecuperado" TEXT NOT NULL DEFAULT '0,00',
    "conclusaoAnalise" TEXT,
    "concluidoPorId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AnaliseEvento_eventoId_fkey" FOREIGN KEY ("eventoId") REFERENCES "Evento" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AnaliseEvento_responsavelId_fkey" FOREIGN KEY ("responsavelId") REFERENCES "Usuario" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "AnaliseEvento_concluidoPorId_fkey" FOREIGN KEY ("concluidoPorId") REFERENCES "Usuario" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "LogAuditoria" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "usuarioId" INTEGER,
    "usuarioNome" TEXT NOT NULL,
    "ip" TEXT,
    "acao" TEXT NOT NULL,
    "tipoRegistro" TEXT NOT NULL,
    "registroId" INTEGER,
    "dadosAnteriores" TEXT,
    "dadosNovos" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LogAuditoria_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Investigacao" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "ocorrenciaId" INTEGER NOT NULL,
    "titulo" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Em Análise',
    "numeroOcorrencia" TEXT NOT NULL,
    "assunto" TEXT NOT NULL,
    "local" TEXT NOT NULL,
    "natureza" TEXT NOT NULL,
    "subNatureza" TEXT NOT NULL,
    "dataOcorrencia" DATETIME NOT NULL,
    "relatoSeguranca" TEXT,
    "descricaoInvestigacao" TEXT,
    "conclusaoFatos" TEXT,
    "responsavelId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Investigacao_ocorrenciaId_fkey" FOREIGN KEY ("ocorrenciaId") REFERENCES "Ocorrencia" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Investigacao_responsavelId_fkey" FOREIGN KEY ("responsavelId") REFERENCES "Usuario" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Investigacao" ("createdAt", "descricao", "id", "status", "titulo") SELECT "createdAt", "descricao", "id", "status", "titulo" FROM "Investigacao";
DROP TABLE "Investigacao";
ALTER TABLE "new_Investigacao" RENAME TO "Investigacao";
CREATE UNIQUE INDEX "Investigacao_ocorrenciaId_key" ON "Investigacao"("ocorrenciaId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "AnaliseOcorrencia_ocorrenciaId_key" ON "AnaliseOcorrencia"("ocorrenciaId");

-- CreateIndex
CREATE UNIQUE INDEX "AnaliseEvento_eventoId_key" ON "AnaliseEvento"("eventoId");
