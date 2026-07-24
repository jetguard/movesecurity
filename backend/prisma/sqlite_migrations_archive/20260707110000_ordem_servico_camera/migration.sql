-- CreateTable
CREATE TABLE "OrdemServicoCamera" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "numero" INTEGER NOT NULL,
    "ano" INTEGER NOT NULL,
    "codigo" TEXT NOT NULL,
    "cameraId" INTEGER NOT NULL,
    "unidade" TEXT NOT NULL DEFAULT 'GJA-T1',
    "status" TEXT NOT NULL DEFAULT 'EM_ABERTO',
    "origem" TEXT NOT NULL DEFAULT 'CAMERA_DESCONECTADA',
    "descricao" TEXT,
    "abertaPorId" INTEGER,
    "atendidoPorId" INTEGER,
    "tratativa" TEXT,
    "houveDano" BOOLEAN NOT NULL DEFAULT false,
    "descricaoDano" TEXT,
    "requerTrocaCamera" BOOLEAN NOT NULL DEFAULT false,
    "requerCompra" BOOLEAN NOT NULL DEFAULT false,
    "itensNecessarios" TEXT,
    "observacoesTecnicas" TEXT,
    "desconectadaEm" DATETIME,
    "atendimentoIniciadoEm" DATETIME,
    "concluidoEm" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "OrdemServicoCamera_cameraId_fkey" FOREIGN KEY ("cameraId") REFERENCES "CameraMonitoramento" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "OrdemServicoCamera_abertaPorId_fkey" FOREIGN KEY ("abertaPorId") REFERENCES "Usuario" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "OrdemServicoCamera_atendidoPorId_fkey" FOREIGN KEY ("atendidoPorId") REFERENCES "Usuario" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "OrdemServicoCamera_cameraId_status_idx" ON "OrdemServicoCamera"("cameraId", "status");

-- CreateIndex
CREATE INDEX "OrdemServicoCamera_unidade_status_idx" ON "OrdemServicoCamera"("unidade", "status");

-- CreateIndex
CREATE UNIQUE INDEX "OrdemServicoCamera_codigo_unidade_key" ON "OrdemServicoCamera"("codigo", "unidade");

-- CreateIndex
CREATE UNIQUE INDEX "OrdemServicoCamera_numero_ano_unidade_key" ON "OrdemServicoCamera"("numero", "ano", "unidade");
