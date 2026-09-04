-- Visitantes cadastrados para treinamentos publicos com convite temporario.
CREATE TABLE `TreinamentoModeloVisitante` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nomeCompleto` TEXT NOT NULL,
    `cpf` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `dataNascimento` DATETIME(3) NULL,
    `empresa` TEXT NULL,
    `cargo` TEXT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'Ativo',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `TreinamentoModeloVisitante_cpf_key`(`cpf`),
    INDEX `TreinamentoModeloVisitante_email_idx`(`email`),
    INDEX `TreinamentoModeloVisitante_status_updatedAt_idx`(`status`, `updatedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `TreinamentoModeloParticipante`
ADD COLUMN `visitanteId` INTEGER NULL,
ADD COLUMN `tokenExpiraEm` DATETIME(3) NULL,
ADD COLUMN `conviteEnviadoEm` DATETIME(3) NULL;

CREATE INDEX `TreinamentoModeloParticipante_visitanteId_idx` ON `TreinamentoModeloParticipante`(`visitanteId`);

ALTER TABLE `TreinamentoModeloParticipante`
ADD CONSTRAINT `TreinamentoModeloParticipante_visitanteId_fkey`
FOREIGN KEY (`visitanteId`) REFERENCES `TreinamentoModeloVisitante`(`id`)
ON DELETE SET NULL ON UPDATE CASCADE;
