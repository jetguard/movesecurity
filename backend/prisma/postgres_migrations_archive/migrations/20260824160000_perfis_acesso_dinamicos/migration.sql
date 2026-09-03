CREATE TABLE "PerfilAcesso" (
  "id" SERIAL NOT NULL,
  "codigo" TEXT NOT NULL,
  "nome" TEXT NOT NULL,
  "descricao" TEXT,
  "permissoesJson" TEXT NOT NULL DEFAULT '[]',
  "sistema" BOOLEAN NOT NULL DEFAULT false,
  "status" TEXT NOT NULL DEFAULT 'ATIVO',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PerfilAcesso_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PerfilAcesso_codigo_key" ON "PerfilAcesso"("codigo");
CREATE INDEX "PerfilAcesso_status_nome_idx" ON "PerfilAcesso"("status", "nome");

INSERT INTO "PerfilAcesso" ("codigo", "nome", "descricao", "permissoesJson", "sistema", "status", "updatedAt")
VALUES
('SUPER_ADMIN', 'Super Admin', 'Acesso total ao sistema.', '["dashboard","relatorios","documentos","treinamentos","operacao","cftv","quadra_seguranca","analise_riscos","plano_acao","cadastros","usuarios","configuracoes","sistema","logs"]', true, 'ATIVO', CURRENT_TIMESTAMP),
('ADMINISTRADOR', 'Administrador', 'Administração geral da plataforma.', '["dashboard","relatorios","documentos","treinamentos","operacao","cftv","quadra_seguranca","analise_riscos","plano_acao","cadastros","usuarios","configuracoes","sistema","logs"]', true, 'ATIVO', CURRENT_TIMESTAMP),
('GESTOR', 'Gestor', 'Acompanhamento gerencial e painéis.', '["dashboard","treinamentos","relatorios","documentos"]', true, 'ATIVO', CURRENT_TIMESTAMP),
('COORDENADOR', 'Coordenador', 'Acompanhamento de equipe e treinamentos.', '["dashboard","treinamentos","relatorios","documentos"]', true, 'ATIVO', CURRENT_TIMESTAMP),
('SUPERVISOR', 'Supervisor', 'Acompanhamento operacional e treinamentos.', '["dashboard","treinamentos","relatorios","documentos"]', true, 'ATIVO', CURRENT_TIMESTAMP),
('ANALISTA', 'Analista', 'Análise operacional, riscos e relatórios.', '["dashboard","relatorios","documentos","treinamentos","operacao","cftv","quadra_seguranca","analise_riscos","plano_acao","cadastros","sistema","logs"]', true, 'ATIVO', CURRENT_TIMESTAMP),
('OPERADOR', 'Operador', 'Operação e registros básicos.', '["dashboard","relatorios","documentos","operacao","cftv","quadra_seguranca","cadastros","sistema"]', true, 'ATIVO', CURRENT_TIMESTAMP),
('PORTARIA', 'Portaria', 'Acesso ao controle de treinamentos e conta pessoal.', '["treinamentos"]', true, 'ATIVO', CURRENT_TIMESTAMP),
('CADASTRO', 'Cadastro', 'Acesso restrito à integração de motoristas.', '["treinamentos"]', true, 'ATIVO', CURRENT_TIMESTAMP),
('TECNICO_MANUTENCAO', 'Técnico/Manutenção', 'Acesso técnico para CFTV e ordens de serviço.', '["cftv"]', true, 'ATIVO', CURRENT_TIMESTAMP)
ON CONFLICT ("codigo") DO NOTHING;
