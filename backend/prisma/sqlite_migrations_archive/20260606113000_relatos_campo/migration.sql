CREATE TABLE "RelatoCampo" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "token" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Link Gerado',
    "titulo" TEXT,
    "setor" TEXT,
    "local" TEXT,
    "unidade" TEXT NOT NULL DEFAULT 'GJA-T1',
    "responsavelColeta" TEXT,
    "dataOcorrido" DATETIME,
    "observacoes" TEXT,
    "expiraEm" DATETIME NOT NULL,
    "enviadoEm" DATETIME,
    "finalizadoEm" DATETIME,
    "convertidoTipo" TEXT,
    "convertidoRegistroId" INTEGER,
    "convertidoCodigo" TEXT,
    "geradoPorId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "RelatoCampo_geradoPorId_fkey" FOREIGN KEY ("geradoPorId") REFERENCES "Usuario" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE "EnvolvidoRelatoCampo" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "relatoCampoId" INTEGER NOT NULL,
    "tipoEnvolvimento" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "tipoDocumento" TEXT NOT NULL,
    "documento" TEXT,
    "empresa" TEXT,
    "possuiVeiculo" BOOLEAN NOT NULL DEFAULT false,
    "placa" TEXT,
    "reboque" TEXT,
    "relato" TEXT NOT NULL,
    "audioCaminho" TEXT,
    "audioNome" TEXT,
    "audioTipo" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EnvolvidoRelatoCampo_relatoCampoId_fkey" FOREIGN KEY ("relatoCampoId") REFERENCES "RelatoCampo" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "AnexoRelatoCampo" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "relatoCampoId" INTEGER NOT NULL,
    "nomeOriginal" TEXT NOT NULL,
    "nomeArquivo" TEXT NOT NULL,
    "caminho" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "categoria" TEXT NOT NULL DEFAULT 'Evidencia',
    "hashArquivo" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AnexoRelatoCampo_relatoCampoId_fkey" FOREIGN KEY ("relatoCampoId") REFERENCES "RelatoCampo" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "RelatoCampo_token_key" ON "RelatoCampo"("token");
CREATE INDEX "RelatoCampo_status_unidade_idx" ON "RelatoCampo"("status", "unidade");
CREATE INDEX "RelatoCampo_token_expiraEm_idx" ON "RelatoCampo"("token", "expiraEm");
