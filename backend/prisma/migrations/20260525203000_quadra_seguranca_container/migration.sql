-- CreateTable
CREATE TABLE "QuadraSegurancaContainer" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "numeroContainer" TEXT NOT NULL,
    "unidade" TEXT NOT NULL DEFAULT 'GJA-T1',
    "dataHoraEntrada" DATETIME NOT NULL,
    "dataHoraSaida" DATETIME,
    "tipoContainer" TEXT NOT NULL,
    "dimensao" TEXT NOT NULL,
    "destino" TEXT NOT NULL,
    "scannerEntrada" BOOLEAN NOT NULL DEFAULT false,
    "scannerSaida" BOOLEAN,
    "estufadoTerminal" BOOLEAN NOT NULL DEFAULT false,
    "numeroLacre" TEXT,
    "novoLacre" TEXT,
    "armador" TEXT,
    "transportadora" TEXT,
    "motoristaResponsavel" TEXT,
    "documentoMotorista" TEXT,
    "placaCavalo" TEXT,
    "placaCarreta" TEXT,
    "tipoCarga" TEXT,
    "pesoCarga" TEXT,
    "prioridade" TEXT NOT NULL DEFAULT 'Baixa',
    "statusOperacional" TEXT NOT NULL DEFAULT 'Dentro do terminal',
    "statusFinal" TEXT,
    "observacoes" TEXT,
    "observacoesSaida" TEXT,
    "criadoPorId" INTEGER,
    "atualizadoPorId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "QuadraSegurancaContainer_criadoPorId_fkey" FOREIGN KEY ("criadoPorId") REFERENCES "Usuario" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "QuadraSegurancaContainer_atualizadoPorId_fkey" FOREIGN KEY ("atualizadoPorId") REFERENCES "Usuario" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "QuadraSegurancaAnexo" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "containerId" INTEGER NOT NULL,
    "categoria" TEXT NOT NULL,
    "nomeOriginal" TEXT NOT NULL,
    "nomeArquivo" TEXT NOT NULL,
    "caminho" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "usuarioId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "QuadraSegurancaAnexo_containerId_fkey" FOREIGN KEY ("containerId") REFERENCES "QuadraSegurancaContainer" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "QuadraSegurancaAnexo_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "QuadraSegurancaHistorico" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "containerId" INTEGER NOT NULL,
    "usuarioId" INTEGER,
    "acao" TEXT NOT NULL,
    "detalhes" TEXT,
    "dadosAnteriores" TEXT,
    "dadosNovos" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "QuadraSegurancaHistorico_containerId_fkey" FOREIGN KEY ("containerId") REFERENCES "QuadraSegurancaContainer" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "QuadraSegurancaHistorico_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "QuadraSegurancaContainer_numeroContainer_unidade_key" ON "QuadraSegurancaContainer"("numeroContainer", "unidade");

-- CreateIndex
CREATE INDEX "QuadraSegurancaContainer_unidade_statusOperacional_idx" ON "QuadraSegurancaContainer"("unidade", "statusOperacional");

-- CreateIndex
CREATE INDEX "QuadraSegurancaContainer_unidade_prioridade_idx" ON "QuadraSegurancaContainer"("unidade", "prioridade");
