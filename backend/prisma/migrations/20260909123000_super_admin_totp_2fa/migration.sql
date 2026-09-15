ALTER TABLE "Usuario"
ADD COLUMN "doisFatoresMetodo" TEXT DEFAULT 'EMAIL',
ADD COLUMN "doisFatoresTotpSecret" TEXT,
ADD COLUMN "doisFatoresTotpConfirmadoEm" TIMESTAMP(3);
