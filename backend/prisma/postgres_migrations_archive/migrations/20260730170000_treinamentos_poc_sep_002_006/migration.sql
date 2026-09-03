CREATE TABLE "TreinamentoPocSep002" (
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
  CONSTRAINT "TreinamentoPocSep002_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TreinamentoPocSep002_token_key" ON "TreinamentoPocSep002"("token");
CREATE UNIQUE INDEX "TreinamentoPocSep002_codigo_key" ON "TreinamentoPocSep002"("codigo");
CREATE INDEX "TreinamentoPocSep002_email_idx" ON "TreinamentoPocSep002"("email");
CREATE INDEX "TreinamentoPocSep002_cpf_idx" ON "TreinamentoPocSep002"("cpf");
CREATE INDEX "TreinamentoPocSep002_status_updatedAt_idx" ON "TreinamentoPocSep002"("status", "updatedAt");

CREATE TABLE "TreinamentoPocSep003" (
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
  CONSTRAINT "TreinamentoPocSep003_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TreinamentoPocSep003_token_key" ON "TreinamentoPocSep003"("token");
CREATE UNIQUE INDEX "TreinamentoPocSep003_codigo_key" ON "TreinamentoPocSep003"("codigo");
CREATE INDEX "TreinamentoPocSep003_email_idx" ON "TreinamentoPocSep003"("email");
CREATE INDEX "TreinamentoPocSep003_cpf_idx" ON "TreinamentoPocSep003"("cpf");
CREATE INDEX "TreinamentoPocSep003_status_updatedAt_idx" ON "TreinamentoPocSep003"("status", "updatedAt");

CREATE TABLE "TreinamentoPocSep004" (
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
  CONSTRAINT "TreinamentoPocSep004_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TreinamentoPocSep004_token_key" ON "TreinamentoPocSep004"("token");
CREATE UNIQUE INDEX "TreinamentoPocSep004_codigo_key" ON "TreinamentoPocSep004"("codigo");
CREATE INDEX "TreinamentoPocSep004_email_idx" ON "TreinamentoPocSep004"("email");
CREATE INDEX "TreinamentoPocSep004_cpf_idx" ON "TreinamentoPocSep004"("cpf");
CREATE INDEX "TreinamentoPocSep004_status_updatedAt_idx" ON "TreinamentoPocSep004"("status", "updatedAt");

CREATE TABLE "TreinamentoPocSep005" (
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
  CONSTRAINT "TreinamentoPocSep005_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TreinamentoPocSep005_token_key" ON "TreinamentoPocSep005"("token");
CREATE UNIQUE INDEX "TreinamentoPocSep005_codigo_key" ON "TreinamentoPocSep005"("codigo");
CREATE INDEX "TreinamentoPocSep005_email_idx" ON "TreinamentoPocSep005"("email");
CREATE INDEX "TreinamentoPocSep005_cpf_idx" ON "TreinamentoPocSep005"("cpf");
CREATE INDEX "TreinamentoPocSep005_status_updatedAt_idx" ON "TreinamentoPocSep005"("status", "updatedAt");

CREATE TABLE "TreinamentoPocSep006" (
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
  CONSTRAINT "TreinamentoPocSep006_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TreinamentoPocSep006_token_key" ON "TreinamentoPocSep006"("token");
CREATE UNIQUE INDEX "TreinamentoPocSep006_codigo_key" ON "TreinamentoPocSep006"("codigo");
CREATE INDEX "TreinamentoPocSep006_email_idx" ON "TreinamentoPocSep006"("email");
CREATE INDEX "TreinamentoPocSep006_cpf_idx" ON "TreinamentoPocSep006"("cpf");
CREATE INDEX "TreinamentoPocSep006_status_updatedAt_idx" ON "TreinamentoPocSep006"("status", "updatedAt");

