CREATE TABLE "AprOperacional" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "numero" INTEGER NOT NULL,
    "ano" INTEGER NOT NULL,
    "codigo" TEXT NOT NULL,
    "unidade" TEXT NOT NULL,
    "local" TEXT NOT NULL,
    "area" TEXT,
    "atividade" TEXT NOT NULL,
    "descricaoAtividade" TEXT NOT NULL,
    "dataPrevista" DATETIME,
    "responsavelAtividade" TEXT NOT NULL,
    "equipeEnvolvida" TEXT,
    "empresaTerceira" TEXT,
    "riscosIds" TEXT,
    "perigos" TEXT NOT NULL,
    "controlesObrigatorios" TEXT NOT NULL,
    "episNecessarios" TEXT,
    "permissoesNecessarias" TEXT,
    "nivelRisco" TEXT NOT NULL DEFAULT 'Moderado',
    "status" TEXT NOT NULL DEFAULT 'Rascunho',
    "criadoPorId" INTEGER,
    "criadoPorNome" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

CREATE TABLE "AprAprovacao" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "aprId" INTEGER NOT NULL,
    "usuarioId" INTEGER,
    "usuarioNome" TEXT NOT NULL,
    "perfilAcesso" TEXT,
    "decisao" TEXT NOT NULL DEFAULT 'Pendente',
    "observacao" TEXT,
    "decididoEm" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AprAprovacao_aprId_fkey" FOREIGN KEY ("aprId") REFERENCES "AprOperacional" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "AprOperacional_codigo_unidade_key" ON "AprOperacional"("codigo", "unidade");
CREATE INDEX "AprOperacional_unidade_status_idx" ON "AprOperacional"("unidade", "status");
CREATE INDEX "AprOperacional_local_dataPrevista_idx" ON "AprOperacional"("local", "dataPrevista");
CREATE INDEX "AprAprovacao_aprId_decisao_idx" ON "AprAprovacao"("aprId", "decisao");
CREATE INDEX "AprAprovacao_usuarioId_decisao_idx" ON "AprAprovacao"("usuarioId", "decisao");
