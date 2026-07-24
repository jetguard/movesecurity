-- CreateTable
CREATE TABLE "AssinaturaDocumento" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "token" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'VALIDA',
    "modulo" TEXT NOT NULL,
    "registroId" INTEGER NOT NULL,
    "codigoRegistro" TEXT NOT NULL,
    "unidade" TEXT NOT NULL,
    "acao" TEXT NOT NULL,
    "usuarioId" INTEGER NOT NULL,
    "usuarioNome" TEXT NOT NULL,
    "perfilAcesso" TEXT,
    "ip" TEXT,
    "sessaoId" TEXT,
    "documentoHash" TEXT NOT NULL,
    "versao" INTEGER NOT NULL DEFAULT 1,
    "invalidadaEm" DATETIME,
    "motivoInvalidacao" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AssinaturaDocumento_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "AssinaturaDocumento_token_key" ON "AssinaturaDocumento"("token");

-- CreateIndex
CREATE INDEX "AssinaturaDocumento_modulo_registroId_status_idx" ON "AssinaturaDocumento"("modulo", "registroId", "status");

-- CreateIndex
CREATE INDEX "AssinaturaDocumento_token_idx" ON "AssinaturaDocumento"("token");
