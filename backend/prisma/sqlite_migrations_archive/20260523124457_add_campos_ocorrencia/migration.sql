/*
  Warnings:

  - Added the required column `local` to the `Ocorrencia` table without a default value. This is not possible if the table is not empty.
  - Added the required column `natureza` to the `Ocorrencia` table without a default value. This is not possible if the table is not empty.
  - Added the required column `subNatureza` to the `Ocorrencia` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Ocorrencia" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "numero" INTEGER NOT NULL,
    "ano" INTEGER NOT NULL,
    "codigo" TEXT NOT NULL,
    "assunto" TEXT NOT NULL,
    "local" TEXT NOT NULL,
    "natureza" TEXT NOT NULL,
    "subNatureza" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ABERTO',
    "dataOcorrencia" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_Ocorrencia" ("ano", "assunto", "codigo", "createdAt", "dataOcorrencia", "id", "numero", "status") SELECT "ano", "assunto", "codigo", "createdAt", "dataOcorrencia", "id", "numero", "status" FROM "Ocorrencia";
DROP TABLE "Ocorrencia";
ALTER TABLE "new_Ocorrencia" RENAME TO "Ocorrencia";
CREATE UNIQUE INDEX "Ocorrencia_codigo_key" ON "Ocorrencia"("codigo");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
