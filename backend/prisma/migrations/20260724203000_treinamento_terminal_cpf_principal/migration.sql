DROP INDEX IF EXISTS "TreinamentoTerminal_cpf_email_idx";

CREATE INDEX IF NOT EXISTS "TreinamentoTerminal_cpf_idx" ON "TreinamentoTerminal"("cpf");
