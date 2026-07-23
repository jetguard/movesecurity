CREATE TABLE "TreinamentoTerminal" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "token" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "nomeCompleto" TEXT NOT NULL,
    "cpf" TEXT NOT NULL,
    "dataNascimento" DATETIME NOT NULL,
    "empresa" TEXT NOT NULL,
    "cargo" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "telefone" TEXT NOT NULL,
    "etapa" TEXT NOT NULL DEFAULT 'video',
    "status" TEXT NOT NULL DEFAULT 'Em andamento',
    "videoUrl" TEXT,
    "progressoSegundos" INTEGER NOT NULL DEFAULT 0,
    "duracaoSegundos" INTEGER NOT NULL DEFAULT 0,
    "videoConcluido" BOOLEAN NOT NULL DEFAULT false,
    "aceiteDeclaracao" BOOLEAN NOT NULL DEFAULT false,
    "assinaturaDataUrl" TEXT,
    "certificadoArquivo" TEXT,
    "emailStatus" TEXT,
    "emailEnviadoEm" DATETIME,
    "concluidoEm" DATETIME,
    "ultimoAcessoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

CREATE UNIQUE INDEX "TreinamentoTerminal_token_key" ON "TreinamentoTerminal"("token");
CREATE UNIQUE INDEX "TreinamentoTerminal_codigo_key" ON "TreinamentoTerminal"("codigo");
CREATE INDEX "TreinamentoTerminal_cpf_email_idx" ON "TreinamentoTerminal"("cpf", "email");
CREATE INDEX "TreinamentoTerminal_status_updatedAt_idx" ON "TreinamentoTerminal"("status", "updatedAt");
