-- CreateTable
CREATE TABLE "ComentarioInterno" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "modulo" TEXT NOT NULL,
    "registroId" INTEGER NOT NULL,
    "unidade" TEXT NOT NULL,
    "comentario" TEXT NOT NULL,
    "autorId" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ComentarioInterno_autorId_fkey" FOREIGN KEY ("autorId") REFERENCES "Usuario" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
