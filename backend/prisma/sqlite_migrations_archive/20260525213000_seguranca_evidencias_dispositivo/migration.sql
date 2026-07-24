-- AlterTable
ALTER TABLE "AnexoOcorrencia" ADD COLUMN "hashArquivo" TEXT;

-- AlterTable
ALTER TABLE "AnexoEvento" ADD COLUMN "hashArquivo" TEXT;

-- AlterTable
ALTER TABLE "QuadraSegurancaAnexo" ADD COLUMN "hashArquivo" TEXT;

-- CreateTable
CREATE TABLE "DispositivoAutorizado" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "usuarioId" INTEGER NOT NULL,
    "identificador" TEXT NOT NULL,
    "navegador" TEXT,
    "sistema" TEXT,
    "ipCadastro" TEXT,
    "ipUltimoAcesso" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Autorizado',
    "primeiroAcesso" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ultimoAcesso" DATETIME,
    "resetadoEm" DATETIME,
    "resetadoPorId" INTEGER,
    "motivoReset" TEXT,
    CONSTRAINT "DispositivoAutorizado_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "DispositivoAutorizado_usuarioId_identificador_key" ON "DispositivoAutorizado"("usuarioId", "identificador");

-- CreateIndex
CREATE INDEX "DispositivoAutorizado_usuarioId_status_idx" ON "DispositivoAutorizado"("usuarioId", "status");
