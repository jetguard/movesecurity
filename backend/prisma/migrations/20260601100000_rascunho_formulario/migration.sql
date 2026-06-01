CREATE TABLE "RascunhoFormulario" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "usuarioId" INTEGER NOT NULL,
  "modulo" TEXT NOT NULL,
  "chave" TEXT NOT NULL,
  "unidade" TEXT NOT NULL DEFAULT 'GJA-T1',
  "dadosJson" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'EM_PREENCHIMENTO',
  "ultimaAlteracao" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "RascunhoFormulario_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "RascunhoFormulario_usuarioId_modulo_chave_unidade_key" ON "RascunhoFormulario"("usuarioId", "modulo", "chave", "unidade");
CREATE INDEX "RascunhoFormulario_usuarioId_status_updatedAt_idx" ON "RascunhoFormulario"("usuarioId", "status", "updatedAt");
CREATE INDEX "RascunhoFormulario_modulo_chave_unidade_idx" ON "RascunhoFormulario"("modulo", "chave", "unidade");
