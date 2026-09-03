CREATE TABLE "TreinamentoModelo" (
    "id" SERIAL NOT NULL,
    "codigo" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "subtitulo" TEXT,
    "notaMinima" INTEGER NOT NULL DEFAULT 80,
    "validadeMeses" INTEGER NOT NULL DEFAULT 24,
    "textoCertificado" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Rascunho',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TreinamentoModelo_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TreinamentoModeloEtapa" (
    "id" SERIAL NOT NULL,
    "treinamentoId" INTEGER NOT NULL,
    "ordem" INTEGER NOT NULL,
    "titulo" TEXT NOT NULL,
    "objetivo" TEXT,
    "conteudo" TEXT NOT NULL,
    "topicosJson" TEXT NOT NULL DEFAULT '[]',
    "atencao" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TreinamentoModeloEtapa_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TreinamentoModeloPergunta" (
    "id" SERIAL NOT NULL,
    "treinamentoId" INTEGER NOT NULL,
    "etapaId" INTEGER,
    "ordem" INTEGER NOT NULL,
    "pergunta" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TreinamentoModeloPergunta_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TreinamentoModeloAlternativa" (
    "id" SERIAL NOT NULL,
    "perguntaId" INTEGER NOT NULL,
    "ordem" INTEGER NOT NULL,
    "texto" TEXT NOT NULL,
    "correta" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TreinamentoModeloAlternativa_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TreinamentoModeloParticipante" (
    "id" SERIAL NOT NULL,
    "treinamentoId" INTEGER NOT NULL,
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

    CONSTRAINT "TreinamentoModeloParticipante_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TreinamentoModelo_codigo_key" ON "TreinamentoModelo"("codigo");
CREATE UNIQUE INDEX "TreinamentoModelo_slug_key" ON "TreinamentoModelo"("slug");
CREATE INDEX "TreinamentoModelo_status_updatedAt_idx" ON "TreinamentoModelo"("status", "updatedAt");
CREATE UNIQUE INDEX "TreinamentoModeloEtapa_treinamentoId_ordem_key" ON "TreinamentoModeloEtapa"("treinamentoId", "ordem");
CREATE INDEX "TreinamentoModeloEtapa_treinamentoId_idx" ON "TreinamentoModeloEtapa"("treinamentoId");
CREATE UNIQUE INDEX "TreinamentoModeloPergunta_treinamentoId_ordem_key" ON "TreinamentoModeloPergunta"("treinamentoId", "ordem");
CREATE INDEX "TreinamentoModeloPergunta_treinamentoId_idx" ON "TreinamentoModeloPergunta"("treinamentoId");
CREATE INDEX "TreinamentoModeloPergunta_etapaId_idx" ON "TreinamentoModeloPergunta"("etapaId");
CREATE INDEX "TreinamentoModeloAlternativa_perguntaId_idx" ON "TreinamentoModeloAlternativa"("perguntaId");
CREATE UNIQUE INDEX "TreinamentoModeloParticipante_token_key" ON "TreinamentoModeloParticipante"("token");
CREATE UNIQUE INDEX "TreinamentoModeloParticipante_codigo_key" ON "TreinamentoModeloParticipante"("codigo");
CREATE INDEX "TreinamentoModeloParticipante_treinamentoId_status_updatedAt_idx" ON "TreinamentoModeloParticipante"("treinamentoId", "status", "updatedAt");
CREATE INDEX "TreinamentoModeloParticipante_email_idx" ON "TreinamentoModeloParticipante"("email");
CREATE INDEX "TreinamentoModeloParticipante_cpf_idx" ON "TreinamentoModeloParticipante"("cpf");

ALTER TABLE "TreinamentoModeloEtapa" ADD CONSTRAINT "TreinamentoModeloEtapa_treinamentoId_fkey" FOREIGN KEY ("treinamentoId") REFERENCES "TreinamentoModelo"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TreinamentoModeloPergunta" ADD CONSTRAINT "TreinamentoModeloPergunta_treinamentoId_fkey" FOREIGN KEY ("treinamentoId") REFERENCES "TreinamentoModelo"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TreinamentoModeloPergunta" ADD CONSTRAINT "TreinamentoModeloPergunta_etapaId_fkey" FOREIGN KEY ("etapaId") REFERENCES "TreinamentoModeloEtapa"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TreinamentoModeloAlternativa" ADD CONSTRAINT "TreinamentoModeloAlternativa_perguntaId_fkey" FOREIGN KEY ("perguntaId") REFERENCES "TreinamentoModeloPergunta"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TreinamentoModeloParticipante" ADD CONSTRAINT "TreinamentoModeloParticipante_treinamentoId_fkey" FOREIGN KEY ("treinamentoId") REFERENCES "TreinamentoModelo"("id") ON DELETE CASCADE ON UPDATE CASCADE;
