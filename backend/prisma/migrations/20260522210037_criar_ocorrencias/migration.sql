-- CreateTable
CREATE TABLE "Ocorrencia" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "numero" INTEGER NOT NULL,
    "ano" INTEGER NOT NULL,
    "codigo" TEXT NOT NULL,
    "assunto" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ABERTO',
    "dataOcorrencia" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "EnvolvidoOcorrencia" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "ocorrenciaId" INTEGER NOT NULL,
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

-- CreateIndex
CREATE UNIQUE INDEX "Ocorrencia_codigo_key" ON "Ocorrencia"("codigo");
