-- CreateTable
CREATE TABLE "LocalTerminal" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "tipo" TEXT NOT NULL,
    "areaSensivel" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'Ativo',
    "unidade" TEXT NOT NULL DEFAULT 'GJA-T1',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

INSERT INTO "LocalTerminal" ("nome", "descricao", "tipo", "areaSensivel", "status", "unidade", "updatedAt") VALUES
('GATE 1', 'Área de acesso operacional do terminal.', 'Acesso', true, 'Ativo', 'GJA-T1', CURRENT_TIMESTAMP),
('GATE 2', 'Área de acesso operacional do terminal.', 'Acesso', true, 'Ativo', 'GJA-T1', CURRENT_TIMESTAMP),
('ARMAZÉM', 'Área de armazenagem de cargas.', 'Armazenagem', true, 'Ativo', 'GJA-T1', CURRENT_TIMESTAMP),
('PORTARIA', 'Controle de entrada e saída.', 'Segurança', true, 'Ativo', 'GJA-T1', CURRENT_TIMESTAMP),
('PÁTIO', 'Área operacional externa.', 'Operacional', false, 'Ativo', 'GJA-T1', CURRENT_TIMESTAMP),
('ÁREA DE INSPEÇÃO', 'Local destinado a inspeções operacionais.', 'Operacional', true, 'Ativo', 'GJA-T1', CURRENT_TIMESTAMP),
('SALA ADMINISTRATIVA', 'Área administrativa da unidade.', 'Administrativo', false, 'Ativo', 'GJA-T1', CURRENT_TIMESTAMP),
('DOCA', 'Área de docas e movimentação.', 'Operacional', true, 'Ativo', 'GJA-T1', CURRENT_TIMESTAMP),
('ESTACIONAMENTO', 'Área de estacionamento.', 'Acesso', false, 'Ativo', 'GJA-T1', CURRENT_TIMESTAMP),
('ÁREA OPERACIONAL', 'Área operacional geral.', 'Operacional', false, 'Ativo', 'GJA-T1', CURRENT_TIMESTAMP);

-- CreateIndex
CREATE INDEX "LocalTerminal_unidade_status_idx" ON "LocalTerminal"("unidade", "status");

-- CreateIndex
CREATE UNIQUE INDEX "LocalTerminal_nome_unidade_key" ON "LocalTerminal"("nome", "unidade");
