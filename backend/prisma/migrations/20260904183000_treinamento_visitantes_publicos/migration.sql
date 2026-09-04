-- Visitantes cadastrados para treinamentos publicos com convite temporario.
CREATE TABLE "TreinamentoModeloVisitante" (
    "id" SERIAL NOT NULL,
    "nomeCompleto" TEXT NOT NULL,
    "cpf" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "dataNascimento" TIMESTAMP(3),
    "empresa" TEXT,
    "cargo" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Ativo',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TreinamentoModeloVisitante_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TreinamentoModeloVisitante_cpf_key" ON "TreinamentoModeloVisitante"("cpf");
CREATE INDEX "TreinamentoModeloVisitante_email_idx" ON "TreinamentoModeloVisitante"("email");
CREATE INDEX "TreinamentoModeloVisitante_status_updatedAt_idx" ON "TreinamentoModeloVisitante"("status", "updatedAt");

ALTER TABLE "TreinamentoModeloParticipante"
ADD COLUMN "visitanteId" INTEGER,
ADD COLUMN "tokenExpiraEm" TIMESTAMP(3),
ADD COLUMN "conviteEnviadoEm" TIMESTAMP(3);

CREATE INDEX "TreinamentoModeloParticipante_visitanteId_idx" ON "TreinamentoModeloParticipante"("visitanteId");

ALTER TABLE "TreinamentoModeloParticipante"
ADD CONSTRAINT "TreinamentoModeloParticipante_visitanteId_fkey"
FOREIGN KEY ("visitanteId") REFERENCES "TreinamentoModeloVisitante"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
