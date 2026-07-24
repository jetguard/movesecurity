-- CreateTable
CREATE TABLE "NotificacaoLida" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "usuarioId" INTEGER NOT NULL,
    "notificacaoId" TEXT NOT NULL,
    "lidaEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "NotificacaoLida_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "NotificacaoLida_usuarioId_notificacaoId_key" ON "NotificacaoLida"("usuarioId", "notificacaoId");
