CREATE TABLE "RiscoMacroProcesso" (
  "id" SERIAL NOT NULL,
  "numero" INTEGER NOT NULL,
  "codigo" TEXT NOT NULL,
  "nome" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'Ativo',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "RiscoMacroProcesso_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "RiscoMacroProcesso_codigo_key" ON "RiscoMacroProcesso"("codigo");
CREATE UNIQUE INDEX "RiscoMacroProcesso_nome_key" ON "RiscoMacroProcesso"("nome");

CREATE TABLE "RiscoSetor" (
  "id" SERIAL NOT NULL,
  "nome" TEXT NOT NULL,
  "macroProcessoId" INTEGER NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'Ativo',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "RiscoSetor_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "RiscoSetor_nome_macroProcessoId_key" ON "RiscoSetor"("nome", "macroProcessoId");
CREATE INDEX "RiscoSetor_macroProcessoId_status_idx" ON "RiscoSetor"("macroProcessoId", "status");
ALTER TABLE "RiscoSetor" ADD CONSTRAINT "RiscoSetor_macroProcessoId_fkey" FOREIGN KEY ("macroProcessoId") REFERENCES "RiscoMacroProcesso"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "RiscoCadastroGeral" (
  "id" SERIAL NOT NULL,
  "numero" INTEGER NOT NULL,
  "codigo" TEXT NOT NULL,
  "nome" TEXT NOT NULL,
  "descricao" TEXT,
  "status" TEXT NOT NULL DEFAULT 'Ativo',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "RiscoCadastroGeral_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "RiscoCadastroGeral_codigo_key" ON "RiscoCadastroGeral"("codigo");
CREATE UNIQUE INDEX "RiscoCadastroGeral_nome_key" ON "RiscoCadastroGeral"("nome");
CREATE INDEX "RiscoCadastroGeral_status_numero_idx" ON "RiscoCadastroGeral"("status", "numero");

CREATE TABLE "FatorRiscoCadastro" (
  "id" SERIAL NOT NULL,
  "numero" INTEGER NOT NULL,
  "codigo" TEXT NOT NULL,
  "nome" TEXT NOT NULL,
  "descricao" TEXT,
  "status" TEXT NOT NULL DEFAULT 'Ativo',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "FatorRiscoCadastro_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "FatorRiscoCadastro_codigo_key" ON "FatorRiscoCadastro"("codigo");
CREATE UNIQUE INDEX "FatorRiscoCadastro_nome_key" ON "FatorRiscoCadastro"("nome");
CREATE INDEX "FatorRiscoCadastro_status_numero_idx" ON "FatorRiscoCadastro"("status", "numero");

CREATE TABLE "ControlePreventivoCadastro" (
  "id" SERIAL NOT NULL,
  "numero" INTEGER NOT NULL,
  "codigo" TEXT NOT NULL,
  "nome" TEXT NOT NULL,
  "descricao" TEXT,
  "status" TEXT NOT NULL DEFAULT 'Ativo',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ControlePreventivoCadastro_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ControlePreventivoCadastro_codigo_key" ON "ControlePreventivoCadastro"("codigo");
CREATE UNIQUE INDEX "ControlePreventivoCadastro_nome_key" ON "ControlePreventivoCadastro"("nome");
CREATE INDEX "ControlePreventivoCadastro_status_numero_idx" ON "ControlePreventivoCadastro"("status", "numero");
