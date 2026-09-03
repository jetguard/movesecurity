CREATE TABLE "IntegracaoTerminal" (
    "id" SERIAL NOT NULL,
    "token" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "nomeCompleto" TEXT NOT NULL,
    "cpf" TEXT NOT NULL,
    "dataNascimento" TIMESTAMP(3) NOT NULL,
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
    "quizAprovado" BOOLEAN NOT NULL DEFAULT false,
    "respostasQuiz" TEXT,
    "aceiteDeclaracao" BOOLEAN NOT NULL DEFAULT false,
    "assinaturaDataUrl" TEXT,
    "certificadoArquivo" TEXT,
    "emailStatus" TEXT,
    "emailEnviadoEm" TIMESTAMP(3),
    "concluidoEm" TIMESTAMP(3),
    "ultimoAcessoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IntegracaoTerminal_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "IntegracaoTerminal_token_key" ON "IntegracaoTerminal"("token");
CREATE UNIQUE INDEX "IntegracaoTerminal_codigo_key" ON "IntegracaoTerminal"("codigo");
CREATE INDEX "IntegracaoTerminal_cpf_idx" ON "IntegracaoTerminal"("cpf");
CREATE INDEX "IntegracaoTerminal_status_updatedAt_idx" ON "IntegracaoTerminal"("status", "updatedAt");
