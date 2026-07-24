-- CreateTable
CREATE TABLE "ConfiguracaoSistema" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "chave" TEXT NOT NULL,
    "nomeEmpresa" TEXT NOT NULL DEFAULT 'Movecta S/A',
    "slaCameras" INTEGER NOT NULL DEFAULT 98,
    "tempoMaximoOffline" INTEGER NOT NULL DEFAULT 60,
    "checklistCameraDias" INTEGER NOT NULL DEFAULT 7,
    "corsPermitido" TEXT,
    "logoUrl" TEXT,
    "rodapePdf" TEXT,
    "updatedAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "ConfiguracaoSistema_chave_key" ON "ConfiguracaoSistema"("chave");
