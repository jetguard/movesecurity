/*
  Warnings:

  - Added the required column `tipoEnvolvimento` to the `EnvolvidoEvento` table without a default value. This is not possible if the table is not empty.
  - Added the required column `local` to the `Evento` table without a default value. This is not possible if the table is not empty.
  - Added the required column `natureza` to the `Evento` table without a default value. This is not possible if the table is not empty.
  - Added the required column `subNatureza` to the `Evento` table without a default value. This is not possible if the table is not empty.

*/
-- CreateTable
CREATE TABLE "AnexoEvento" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "eventoId" INTEGER NOT NULL,
    "nomeOriginal" TEXT NOT NULL,
    "nomeArquivo" TEXT NOT NULL,
    "caminho" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AnexoEvento_eventoId_fkey" FOREIGN KEY ("eventoId") REFERENCES "Evento" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_EnvolvidoEvento" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "eventoId" INTEGER NOT NULL,
    "tipoEnvolvimento" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "tipoDocumento" TEXT NOT NULL,
    "documento" TEXT NOT NULL,
    "empresa" TEXT,
    "possuiVeiculo" BOOLEAN NOT NULL DEFAULT false,
    "placa" TEXT,
    "reboque" TEXT,
    "relato" TEXT NOT NULL,
    CONSTRAINT "EnvolvidoEvento_eventoId_fkey" FOREIGN KEY ("eventoId") REFERENCES "Evento" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_EnvolvidoEvento" ("documento", "empresa", "eventoId", "id", "nome", "placa", "possuiVeiculo", "reboque", "relato", "tipoDocumento") SELECT "documento", "empresa", "eventoId", "id", "nome", "placa", "possuiVeiculo", "reboque", "relato", "tipoDocumento" FROM "EnvolvidoEvento";
DROP TABLE "EnvolvidoEvento";
ALTER TABLE "new_EnvolvidoEvento" RENAME TO "EnvolvidoEvento";
CREATE TABLE "new_Evento" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "numero" INTEGER NOT NULL,
    "ano" INTEGER NOT NULL,
    "codigo" TEXT NOT NULL,
    "assunto" TEXT NOT NULL,
    "local" TEXT NOT NULL,
    "natureza" TEXT NOT NULL,
    "subNatureza" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ABERTO',
    "dataEvento" DATETIME NOT NULL,
    "relatoSeguranca" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_Evento" ("ano", "assunto", "codigo", "createdAt", "dataEvento", "id", "numero", "status") SELECT "ano", "assunto", "codigo", "createdAt", "dataEvento", "id", "numero", "status" FROM "Evento";
DROP TABLE "Evento";
ALTER TABLE "new_Evento" RENAME TO "Evento";
CREATE UNIQUE INDEX "Evento_codigo_key" ON "Evento"("codigo");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
