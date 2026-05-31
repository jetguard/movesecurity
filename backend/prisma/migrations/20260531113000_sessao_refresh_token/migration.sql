ALTER TABLE "SessaoUsuario" ADD COLUMN "refreshTokenHash" TEXT;
ALTER TABLE "SessaoUsuario" ADD COLUMN "refreshExpiraEm" DATETIME;

CREATE UNIQUE INDEX "SessaoUsuario_refreshTokenHash_key" ON "SessaoUsuario"("refreshTokenHash");

