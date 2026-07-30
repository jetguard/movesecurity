CREATE TABLE "TreinamentoPocSep001" (
  "id" SERIAL NOT NULL,
  "token" TEXT NOT NULL,
  "usuarioId" INTEGER,
  "codigo" TEXT,
  "nomeCompleto" TEXT NOT NULL,
  "cpf" TEXT,
  "email" TEXT NOT NULL,
  "cargo" TEXT,
  "departamento" TEXT,
  "unidade" TEXT,
  "empresa" TEXT,
  "etapaAtual" INTEGER NOT NULL DEFAULT 1,
  "status" TEXT NOT NULL DEFAULT 'Em andamento',
  "porcentagem" INTEGER NOT NULL DEFAULT 0,
  "nota" DOUBLE PRECISION,
  "tentativas" INTEGER NOT NULL DEFAULT 0,
  "respostasQuiz" TEXT,
  "assinaturaDataUrl" TEXT,
  "certificadoArquivo" TEXT,
  "emailStatus" TEXT,
  "emailEnviadoEm" TIMESTAMP(3),
  "ipInicio" TEXT,
  "navegador" TEXT,
  "sistema" TEXT,
  "dataInicio" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "dataConclusao" TIMESTAMP(3),
  "ultimoAcessoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TreinamentoPocSep001_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TreinamentoPocSep001_token_key" ON "TreinamentoPocSep001"("token");
CREATE UNIQUE INDEX "TreinamentoPocSep001_codigo_key" ON "TreinamentoPocSep001"("codigo");
CREATE INDEX "TreinamentoPocSep001_email_idx" ON "TreinamentoPocSep001"("email");
CREATE INDEX "TreinamentoPocSep001_cpf_idx" ON "TreinamentoPocSep001"("cpf");
CREATE INDEX "TreinamentoPocSep001_status_updatedAt_idx" ON "TreinamentoPocSep001"("status", "updatedAt");
