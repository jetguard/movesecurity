-- Campos técnicos para aderência ao fluxo de gestão de riscos:
-- identificação, análise, avaliação, tratamento, monitoramento e comunicação.
ALTER TABLE "AnaliseRisco" ADD COLUMN "fonteRisco" TEXT;
ALTER TABLE "AnaliseRisco" ADD COLUMN "fatorRisco" TEXT;
ALTER TABLE "AnaliseRisco" ADD COLUMN "fragilidade" TEXT;
ALTER TABLE "AnaliseRisco" ADD COLUMN "eventoIncerteza" TEXT;
ALTER TABLE "AnaliseRisco" ADD COLUMN "objetivoImpactado" TEXT;
ALTER TABLE "AnaliseRisco" ADD COLUMN "eficaciaControles" TEXT;
ALTER TABLE "AnaliseRisco" ADD COLUMN "criteriosAvaliacao" TEXT;
ALTER TABLE "AnaliseRisco" ADD COLUMN "controlesInternos" TEXT;
ALTER TABLE "AnaliseRisco" ADD COLUMN "atividadesControle" TEXT;
ALTER TABLE "AnaliseRisco" ADD COLUMN "monitoramento" TEXT;
ALTER TABLE "AnaliseRisco" ADD COLUMN "comunicacaoConsulta" TEXT;

ALTER TABLE "RiscoCatalogo" ADD COLUMN "fonteRisco" TEXT;
ALTER TABLE "RiscoCatalogo" ADD COLUMN "fatorRisco" TEXT;
ALTER TABLE "RiscoCatalogo" ADD COLUMN "fragilidade" TEXT;
ALTER TABLE "RiscoCatalogo" ADD COLUMN "eventoIncerteza" TEXT;
ALTER TABLE "RiscoCatalogo" ADD COLUMN "objetivoImpactado" TEXT;
