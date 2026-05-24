-- CreateTable
CREATE TABLE "Mencao" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "modulo" TEXT NOT NULL,
    "registroId" INTEGER NOT NULL,
    "codigoRegistro" TEXT NOT NULL,
    "tituloRegistro" TEXT NOT NULL,
    "unidade" TEXT NOT NULL,
    "usuarioMencionadoId" INTEGER NOT NULL,
    "autorId" INTEGER,
    "tipoMencao" TEXT NOT NULL DEFAULT 'Acompanhar',
    "status" TEXT NOT NULL DEFAULT 'Pendente',
    "prazo" DATETIME,
    "observacao" TEXT,
    "lidaEm" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Mencao_usuarioMencionadoId_fkey" FOREIGN KEY ("usuarioMencionadoId") REFERENCES "Usuario" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Mencao_autorId_fkey" FOREIGN KEY ("autorId") REFERENCES "Usuario" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
