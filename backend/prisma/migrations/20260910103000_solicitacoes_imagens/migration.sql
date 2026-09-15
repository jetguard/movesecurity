CREATE TABLE "SolicitacaoImagem" (
    "id" SERIAL NOT NULL,
    "numero" INTEGER NOT NULL,
    "ano" INTEGER NOT NULL,
    "protocolo" TEXT NOT NULL,
    "unidade" TEXT NOT NULL DEFAULT 'GJA-T1',
    "origem" TEXT NOT NULL DEFAULT 'Interna',
    "titulo" TEXT NOT NULL,
    "solicitanteNome" TEXT NOT NULL,
    "solicitanteEmail" TEXT,
    "solicitanteSetor" TEXT,
    "solicitanteCargo" TEXT,
    "local" TEXT,
    "dataOcorrencia" TIMESTAMP(3),
    "horaInicial" TEXT,
    "horaFinal" TEXT,
    "descricao" TEXT,
    "prioridade" TEXT NOT NULL DEFAULT 'Não Classificada',
    "status" TEXT NOT NULL DEFAULT 'Aguardando Atendimento',
    "atendenteId" INTEGER,
    "atendimentoIniciadoEm" TIMESTAMP(3),
    "tempoTotalAtendimento" INTEGER NOT NULL DEFAULT 0,
    "criadoPorId" INTEGER,
    "descricaoConclusao" TEXT,
    "concluidoPorId" INTEGER,
    "concluidoEm" TIMESTAMP(3),
    "motivoAnulacao" TEXT,
    "anuladoPorId" INTEGER,
    "anuladoEm" TIMESTAMP(3),
    "excluidoPorId" INTEGER,
    "excluidoEm" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SolicitacaoImagem_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SolicitacaoImagem_protocolo_key" ON "SolicitacaoImagem"("protocolo");
CREATE UNIQUE INDEX "SolicitacaoImagem_numero_ano_key" ON "SolicitacaoImagem"("numero", "ano");
CREATE INDEX "SolicitacaoImagem_status_prioridade_idx" ON "SolicitacaoImagem"("status", "prioridade");
CREATE INDEX "SolicitacaoImagem_unidade_status_idx" ON "SolicitacaoImagem"("unidade", "status");
CREATE INDEX "SolicitacaoImagem_atendenteId_status_idx" ON "SolicitacaoImagem"("atendenteId", "status");
CREATE INDEX "SolicitacaoImagem_excluidoEm_idx" ON "SolicitacaoImagem"("excluidoEm");

CREATE TABLE "AtendimentoSolicitacaoImagem" (
    "id" SERIAL NOT NULL,
    "solicitacaoId" INTEGER NOT NULL,
    "atendenteId" INTEGER NOT NULL,
    "iniciadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "pausadoEm" TIMESTAMP(3),
    "tempoSegundos" INTEGER,
    "motivoPausa" TEXT,
    "andamento" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AtendimentoSolicitacaoImagem_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AtendimentoSolicitacaoImagem_solicitacaoId_pausadoEm_idx" ON "AtendimentoSolicitacaoImagem"("solicitacaoId", "pausadoEm");
CREATE INDEX "AtendimentoSolicitacaoImagem_atendenteId_iniciadoEm_idx" ON "AtendimentoSolicitacaoImagem"("atendenteId", "iniciadoEm");

CREATE TABLE "HistoricoSolicitacaoImagem" (
    "id" SERIAL NOT NULL,
    "solicitacaoId" INTEGER NOT NULL,
    "usuarioId" INTEGER,
    "usuarioNome" TEXT,
    "tipoEvento" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "statusAnterior" TEXT,
    "statusNovo" TEXT,
    "dadosJson" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "HistoricoSolicitacaoImagem_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "HistoricoSolicitacaoImagem_solicitacaoId_createdAt_idx" ON "HistoricoSolicitacaoImagem"("solicitacaoId", "createdAt");
CREATE INDEX "HistoricoSolicitacaoImagem_tipoEvento_idx" ON "HistoricoSolicitacaoImagem"("tipoEvento");

CREATE TABLE "AnexoSolicitacaoImagem" (
    "id" SERIAL NOT NULL,
    "solicitacaoId" INTEGER NOT NULL,
    "nomeOriginal" TEXT NOT NULL,
    "nomeArquivo" TEXT NOT NULL,
    "caminho" TEXT NOT NULL,
    "tipoArquivo" TEXT NOT NULL,
    "tamanho" INTEGER NOT NULL,
    "origem" TEXT NOT NULL DEFAULT 'Interna',
    "enviadoPorId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AnexoSolicitacaoImagem_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AnexoSolicitacaoImagem_solicitacaoId_idx" ON "AnexoSolicitacaoImagem"("solicitacaoId");

CREATE TABLE "TokenSolicitacaoImagem" (
    "id" SERIAL NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "expiraEm" TIMESTAMP(3) NOT NULL,
    "usadoEm" TIMESTAMP(3),
    "criadoPorId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TokenSolicitacaoImagem_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TokenSolicitacaoImagem_tokenHash_key" ON "TokenSolicitacaoImagem"("tokenHash");
CREATE INDEX "TokenSolicitacaoImagem_expiraEm_usadoEm_idx" ON "TokenSolicitacaoImagem"("expiraEm", "usadoEm");

ALTER TABLE "SolicitacaoImagem" ADD CONSTRAINT "SolicitacaoImagem_criadoPorId_fkey" FOREIGN KEY ("criadoPorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SolicitacaoImagem" ADD CONSTRAINT "SolicitacaoImagem_atendenteId_fkey" FOREIGN KEY ("atendenteId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SolicitacaoImagem" ADD CONSTRAINT "SolicitacaoImagem_concluidoPorId_fkey" FOREIGN KEY ("concluidoPorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SolicitacaoImagem" ADD CONSTRAINT "SolicitacaoImagem_anuladoPorId_fkey" FOREIGN KEY ("anuladoPorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SolicitacaoImagem" ADD CONSTRAINT "SolicitacaoImagem_excluidoPorId_fkey" FOREIGN KEY ("excluidoPorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AtendimentoSolicitacaoImagem" ADD CONSTRAINT "AtendimentoSolicitacaoImagem_solicitacaoId_fkey" FOREIGN KEY ("solicitacaoId") REFERENCES "SolicitacaoImagem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AtendimentoSolicitacaoImagem" ADD CONSTRAINT "AtendimentoSolicitacaoImagem_atendenteId_fkey" FOREIGN KEY ("atendenteId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "HistoricoSolicitacaoImagem" ADD CONSTRAINT "HistoricoSolicitacaoImagem_solicitacaoId_fkey" FOREIGN KEY ("solicitacaoId") REFERENCES "SolicitacaoImagem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HistoricoSolicitacaoImagem" ADD CONSTRAINT "HistoricoSolicitacaoImagem_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AnexoSolicitacaoImagem" ADD CONSTRAINT "AnexoSolicitacaoImagem_solicitacaoId_fkey" FOREIGN KEY ("solicitacaoId") REFERENCES "SolicitacaoImagem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AnexoSolicitacaoImagem" ADD CONSTRAINT "AnexoSolicitacaoImagem_enviadoPorId_fkey" FOREIGN KEY ("enviadoPorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TokenSolicitacaoImagem" ADD CONSTRAINT "TokenSolicitacaoImagem_criadoPorId_fkey" FOREIGN KEY ("criadoPorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;
