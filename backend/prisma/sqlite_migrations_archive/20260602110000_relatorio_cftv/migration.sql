-- CreateTable
CREATE TABLE "RelatorioCftv" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "numero" INTEGER NOT NULL,
    "ano" INTEGER NOT NULL,
    "codigo" TEXT NOT NULL,
    "unidade" TEXT NOT NULL,
    "responsavelId" INTEGER,
    "camerasIdsJson" TEXT NOT NULL,
    "snapshotJson" TEXT,
    "retencaoMedia" INTEGER NOT NULL DEFAULT 0,
    "totalEventos" INTEGER NOT NULL DEFAULT 0,
    "totalIndisponibilidade" INTEGER NOT NULL DEFAULT 0,
    "totalCameras" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RelatorioCftv_responsavelId_fkey" FOREIGN KEY ("responsavelId") REFERENCES "Usuario" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "RelatorioCftv_codigo_unidade_key" ON "RelatorioCftv"("codigo", "unidade");
