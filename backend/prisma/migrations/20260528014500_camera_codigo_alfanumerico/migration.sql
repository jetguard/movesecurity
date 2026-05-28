PRAGMA foreign_keys=OFF;

CREATE TABLE "new_CameraMonitoramento" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "numeroCamera" TEXT NOT NULL,
    "numeroServidor" TEXT NOT NULL,
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

INSERT INTO "new_CameraMonitoramento" (
    "id",
    "numeroCamera",
    "numeroServidor",
    "tipoSistema",
    "periodoGravacaoDias",
    "status",
    "tecnologia",
    "tipoCamera",
    "localInstalado",
    "areaMonitorada",
    "infravermelho",
    "monitoramento",
    "ultimaManutencao",
    "observacoesTecnicas",
    "unidade",
    "cadastradoPorId",
    "desconectadaDesde",
    "totalIndisponibilidade",
    "totalFalhas",
    "createdAt",
    "updatedAt"
)
SELECT
    "id",
    CAST("numeroCamera" AS TEXT),
    CAST("numeroServidor" AS TEXT),
    "tipoSistema",
    "periodoGravacaoDias",
    "status",
    "tecnologia",
    "tipoCamera",
    "localInstalado",
    "areaMonitorada",
    "infravermelho",
    "monitoramento",
    "ultimaManutencao",
    "observacoesTecnicas",
    "unidade",
    "cadastradoPorId",
    "desconectadaDesde",
    "totalIndisponibilidade",
    "totalFalhas",
    "createdAt",
    "updatedAt"
FROM "CameraMonitoramento";

DROP TABLE "CameraMonitoramento";
ALTER TABLE "new_CameraMonitoramento" RENAME TO "CameraMonitoramento";

CREATE UNIQUE INDEX "CameraMonitoramento_numeroCamera_unidade_key" ON "CameraMonitoramento"("numeroCamera", "unidade");

PRAGMA foreign_keys=ON;
