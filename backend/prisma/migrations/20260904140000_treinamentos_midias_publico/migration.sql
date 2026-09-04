ALTER TABLE `TreinamentoModelo`
ADD COLUMN `acessoPublico` BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN `perguntasHabilitadas` BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN `videoUrl` TEXT NULL,
ADD COLUMN `anexoNome` TEXT NULL,
ADD COLUMN `anexoUrl` TEXT NULL;
