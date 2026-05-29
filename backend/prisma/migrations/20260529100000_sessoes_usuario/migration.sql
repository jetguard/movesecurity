CREATE TABLE "SessaoUsuario" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "usuarioId" INTEGER NOT NULL,
    "tokenHash" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ATIVA',
    "unidadeAtiva" TEXT,
    "equipe" TEXT,
    "perfilAcesso" TEXT,
    "ipInicio" TEXT,
    "ipUltimaAtividade" TEXT,
    "navegador" TEXT,
    "sistema" TEXT,
    "iniciadaEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ultimaAtividadeEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "encerradaEm" DATETIME,
    "encerradaPor" TEXT,
    "encerradaPorId" INTEGER,
    "motivoEncerramento" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SessaoUsuario_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "SessaoUsuario_tokenHash_key" ON "SessaoUsuario"("tokenHash");
CREATE INDEX "SessaoUsuario_usuarioId_status_idx" ON "SessaoUsuario"("usuarioId", "status");
CREATE INDEX "SessaoUsuario_status_ultimaAtividadeEm_idx" ON "SessaoUsuario"("status", "ultimaAtividadeEm");
