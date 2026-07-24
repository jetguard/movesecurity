/*
  Warnings:

  - Added the required column `tipoEnvolvimento` to the `EnvolvidoOcorrencia` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_EnvolvidoOcorrencia" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "ocorrenciaId" INTEGER NOT NULL,
    "tipoEnvolvimento" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "tipoDocumento" TEXT NOT NULL,
    "documento" TEXT NOT NULL,
    "empresa" TEXT,
    "possuiVeiculo" BOOLEAN NOT NULL DEFAULT false,
    "placa" TEXT,
    "reboque" TEXT,
    "relato" TEXT NOT NULL,
    CONSTRAINT "EnvolvidoOcorrencia_ocorrenciaId_fkey" FOREIGN KEY ("ocorrenciaId") REFERENCES "Ocorrencia" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_EnvolvidoOcorrencia" ("documento", "empresa", "id", "nome", "ocorrenciaId", "placa", "possuiVeiculo", "reboque", "relato", "tipoDocumento") SELECT "documento", "empresa", "id", "nome", "ocorrenciaId", "placa", "possuiVeiculo", "reboque", "relato", "tipoDocumento" FROM "EnvolvidoOcorrencia";
DROP TABLE "EnvolvidoOcorrencia";
ALTER TABLE "new_EnvolvidoOcorrencia" RENAME TO "EnvolvidoOcorrencia";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
