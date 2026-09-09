ALTER TABLE "Usuario"
ADD COLUMN "doisFatoresAtivo" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "doisFatoresCodigoHash" TEXT,
ADD COLUMN "doisFatoresExpiraEm" TIMESTAMP(3),
ADD COLUMN "doisFatoresTentativas" INTEGER NOT NULL DEFAULT 0;
