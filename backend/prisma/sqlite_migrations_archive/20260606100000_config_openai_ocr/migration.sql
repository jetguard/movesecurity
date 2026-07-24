ALTER TABLE "ConfiguracaoSistema" ADD COLUMN "ocrProvider" TEXT DEFAULT 'openai';
ALTER TABLE "ConfiguracaoSistema" ADD COLUMN "openaiApiKey" TEXT;
ALTER TABLE "ConfiguracaoSistema" ADD COLUMN "openaiOcrModel" TEXT DEFAULT 'gpt-4.1-mini';
