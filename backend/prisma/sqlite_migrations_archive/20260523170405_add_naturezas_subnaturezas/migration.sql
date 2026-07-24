-- CreateTable
CREATE TABLE "Natureza" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nome" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "SubNatureza" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "naturezaId" INTEGER NOT NULL,
    "nome" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SubNatureza_naturezaId_fkey" FOREIGN KEY ("naturezaId") REFERENCES "Natureza" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Natureza_nome_key" ON "Natureza"("nome");

-- CreateIndex
CREATE UNIQUE INDEX "SubNatureza_naturezaId_nome_key" ON "SubNatureza"("naturezaId", "nome");
