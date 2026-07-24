-- CreateTable
CREATE TABLE "CameraMonitoramento" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "numeroCamera" INTEGER NOT NULL,
    "numeroServidor" INTEGER NOT NULL,
    "tipoSistema" TEXT NOT NULL DEFAULT 'DIGIFORT',
    "periodoGravacaoDias" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Conectada',
    "tecnologia" TEXT NOT NULL,
    "tipoCamera" TEXT NOT NULL,
    "localInstalado" TEXT NOT NULL,
    "areaMonitorada" TEXT NOT NULL,
    "infravermelho" TEXT NOT NULL,
    "monitoramento" TEXT NOT NULL DEFAULT 'Ativo',
    "ultimaManutencao" DATETIME,
    "observacoesTecnicas" TEXT,
    "unidade" TEXT NOT NULL DEFAULT 'GJA-T1',
    "cadastradoPorId" INTEGER,
    "desconectadaDesde" DATETIME,
    "totalIndisponibilidade" INTEGER NOT NULL DEFAULT 0,
    "totalFalhas" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CameraMonitoramento_cadastradoPorId_fkey" FOREIGN KEY ("cadastradoPorId") REFERENCES "Usuario" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CameraChecklistOperacional" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "cameraId" INTEGER NOT NULL,
    "unidade" TEXT NOT NULL DEFAULT 'GJA-T1',
    "responsavelId" INTEGER NOT NULL,
    "statusAtual" TEXT NOT NULL,
    "tempoGravacaoDisponivel" INTEGER NOT NULL,
    "qualidadeImagem" TEXT NOT NULL,
    "funcionamentoInfravermelho" TEXT NOT NULL,
    "funcionamentoGravacao" TEXT NOT NULL,
    "comunicacaoServidor" TEXT NOT NULL,
    "instabilidadeDetectada" TEXT NOT NULL,
    "necessidadeManutencao" TEXT NOT NULL,
    "observacoesOperacionais" TEXT,
    "indisponibilidadeMinutos" INTEGER NOT NULL DEFAULT 0,
    "falhaRecorrente" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CameraChecklistOperacional_cameraId_fkey" FOREIGN KEY ("cameraId") REFERENCES "CameraMonitoramento" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CameraChecklistOperacional_responsavelId_fkey" FOREIGN KEY ("responsavelId") REFERENCES "Usuario" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CameraEventoStatus" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "cameraId" INTEGER NOT NULL,
    "unidade" TEXT NOT NULL DEFAULT 'GJA-T1',
    "statusAnterior" TEXT,
    "statusNovo" TEXT NOT NULL,
    "iniciadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "encerradoEm" DATETIME,
    "duracaoIndisponivel" INTEGER,
    "responsavelId" INTEGER,
    "observacao" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CameraEventoStatus_cameraId_fkey" FOREIGN KEY ("cameraId") REFERENCES "CameraMonitoramento" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "CameraMonitoramento_numeroCamera_unidade_key" ON "CameraMonitoramento"("numeroCamera", "unidade");
