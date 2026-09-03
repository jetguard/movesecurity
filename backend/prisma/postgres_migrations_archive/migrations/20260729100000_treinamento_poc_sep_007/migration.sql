CREATE TABLE "TreinamentoPocSep007" (
  "id" SERIAL NOT NULL,
  "token" TEXT NOT NULL,
  "usuarioId" INTEGER,
  "codigo" TEXT,
  "nomeCompleto" TEXT NOT NULL,
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
  "ipInicio" TEXT,
  "navegador" TEXT,
  "sistema" TEXT,
  "dataInicio" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "dataConclusao" TIMESTAMP(3),
  "ultimoAcessoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "TreinamentoPocSep007_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TreinamentoPocSep007_token_key" ON "TreinamentoPocSep007"("token");
CREATE UNIQUE INDEX "TreinamentoPocSep007_codigo_key" ON "TreinamentoPocSep007"("codigo");
CREATE INDEX "TreinamentoPocSep007_email_idx" ON "TreinamentoPocSep007"("email");
CREATE INDEX "TreinamentoPocSep007_status_updatedAt_idx" ON "TreinamentoPocSep007"("status", "updatedAt");
