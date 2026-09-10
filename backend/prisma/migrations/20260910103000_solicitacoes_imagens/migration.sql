CREATE TABLE `SolicitacaoImagem` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `numero` INTEGER NOT NULL,
    `ano` INTEGER NOT NULL,
    `protocolo` VARCHAR(191) NOT NULL,
    `unidade` VARCHAR(191) NOT NULL DEFAULT 'GJA-T1',
    `origem` VARCHAR(191) NOT NULL DEFAULT 'Interna',
    `titulo` TEXT NOT NULL,
    `solicitanteNome` TEXT NOT NULL,
    `solicitanteEmail` TEXT NULL,
    `solicitanteSetor` TEXT NULL,
    `solicitanteCargo` TEXT NULL,
    `local` TEXT NULL,
    `dataOcorrencia` DATETIME(3) NULL,
    `horaInicial` VARCHAR(191) NULL,
    `horaFinal` VARCHAR(191) NULL,
    `descricao` TEXT NULL,
    `prioridade` VARCHAR(191) NOT NULL DEFAULT 'Não Classificada',
    `status` VARCHAR(191) NOT NULL DEFAULT 'Aguardando Atendimento',
    `atendenteId` INTEGER NULL,
    `atendimentoIniciadoEm` DATETIME(3) NULL,
    `tempoTotalAtendimento` INTEGER NOT NULL DEFAULT 0,
    `criadoPorId` INTEGER NULL,
    `descricaoConclusao` TEXT NULL,
    `concluidoPorId` INTEGER NULL,
    `concluidoEm` DATETIME(3) NULL,
    `motivoAnulacao` TEXT NULL,
    `anuladoPorId` INTEGER NULL,
    `anuladoEm` DATETIME(3) NULL,
    `excluidoPorId` INTEGER NULL,
    `excluidoEm` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `SolicitacaoImagem_protocolo_key`(`protocolo`),
    UNIQUE INDEX `SolicitacaoImagem_numero_ano_key`(`numero`, `ano`),
    INDEX `SolicitacaoImagem_status_prioridade_idx`(`status`, `prioridade`),
    INDEX `SolicitacaoImagem_unidade_status_idx`(`unidade`, `status`),
    INDEX `SolicitacaoImagem_atendenteId_status_idx`(`atendenteId`, `status`),
    INDEX `SolicitacaoImagem_excluidoEm_idx`(`excluidoEm`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `AtendimentoSolicitacaoImagem` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `solicitacaoId` INTEGER NOT NULL,
    `atendenteId` INTEGER NOT NULL,
    `iniciadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `pausadoEm` DATETIME(3) NULL,
    `tempoSegundos` INTEGER NULL,
    `motivoPausa` TEXT NULL,
    `andamento` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `AtendimentoSolicitacaoImagem_solicitacaoId_pausadoEm_idx`(`solicitacaoId`, `pausadoEm`),
    INDEX `AtendimentoSolicitacaoImagem_atendenteId_iniciadoEm_idx`(`atendenteId`, `iniciadoEm`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `HistoricoSolicitacaoImagem` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `solicitacaoId` INTEGER NOT NULL,
    `usuarioId` INTEGER NULL,
    `usuarioNome` TEXT NULL,
    `tipoEvento` VARCHAR(191) NOT NULL,
    `descricao` TEXT NOT NULL,
    `statusAnterior` VARCHAR(191) NULL,
    `statusNovo` VARCHAR(191) NULL,
    `dadosJson` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `HistoricoSolicitacaoImagem_solicitacaoId_createdAt_idx`(`solicitacaoId`, `createdAt`),
    INDEX `HistoricoSolicitacaoImagem_tipoEvento_idx`(`tipoEvento`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `AnexoSolicitacaoImagem` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `solicitacaoId` INTEGER NOT NULL,
    `nomeOriginal` TEXT NOT NULL,
    `nomeArquivo` TEXT NOT NULL,
    `caminho` TEXT NOT NULL,
    `tipoArquivo` VARCHAR(191) NOT NULL,
    `tamanho` INTEGER NOT NULL,
    `origem` VARCHAR(191) NOT NULL DEFAULT 'Interna',
    `enviadoPorId` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `AnexoSolicitacaoImagem_solicitacaoId_idx`(`solicitacaoId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `TokenSolicitacaoImagem` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `tokenHash` VARCHAR(191) NOT NULL,
    `email` TEXT NOT NULL,
    `expiraEm` DATETIME(3) NOT NULL,
    `usadoEm` DATETIME(3) NULL,
    `criadoPorId` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `TokenSolicitacaoImagem_tokenHash_key`(`tokenHash`),
    INDEX `TokenSolicitacaoImagem_expiraEm_usadoEm_idx`(`expiraEm`, `usadoEm`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `SolicitacaoImagem` ADD CONSTRAINT `SolicitacaoImagem_criadoPorId_fkey` FOREIGN KEY (`criadoPorId`) REFERENCES `Usuario`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `SolicitacaoImagem` ADD CONSTRAINT `SolicitacaoImagem_atendenteId_fkey` FOREIGN KEY (`atendenteId`) REFERENCES `Usuario`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `SolicitacaoImagem` ADD CONSTRAINT `SolicitacaoImagem_concluidoPorId_fkey` FOREIGN KEY (`concluidoPorId`) REFERENCES `Usuario`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `SolicitacaoImagem` ADD CONSTRAINT `SolicitacaoImagem_anuladoPorId_fkey` FOREIGN KEY (`anuladoPorId`) REFERENCES `Usuario`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `SolicitacaoImagem` ADD CONSTRAINT `SolicitacaoImagem_excluidoPorId_fkey` FOREIGN KEY (`excluidoPorId`) REFERENCES `Usuario`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `AtendimentoSolicitacaoImagem` ADD CONSTRAINT `AtendimentoSolicitacaoImagem_solicitacaoId_fkey` FOREIGN KEY (`solicitacaoId`) REFERENCES `SolicitacaoImagem`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `AtendimentoSolicitacaoImagem` ADD CONSTRAINT `AtendimentoSolicitacaoImagem_atendenteId_fkey` FOREIGN KEY (`atendenteId`) REFERENCES `Usuario`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `HistoricoSolicitacaoImagem` ADD CONSTRAINT `HistoricoSolicitacaoImagem_solicitacaoId_fkey` FOREIGN KEY (`solicitacaoId`) REFERENCES `SolicitacaoImagem`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `HistoricoSolicitacaoImagem` ADD CONSTRAINT `HistoricoSolicitacaoImagem_usuarioId_fkey` FOREIGN KEY (`usuarioId`) REFERENCES `Usuario`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `AnexoSolicitacaoImagem` ADD CONSTRAINT `AnexoSolicitacaoImagem_solicitacaoId_fkey` FOREIGN KEY (`solicitacaoId`) REFERENCES `SolicitacaoImagem`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `AnexoSolicitacaoImagem` ADD CONSTRAINT `AnexoSolicitacaoImagem_enviadoPorId_fkey` FOREIGN KEY (`enviadoPorId`) REFERENCES `Usuario`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `TokenSolicitacaoImagem` ADD CONSTRAINT `TokenSolicitacaoImagem_criadoPorId_fkey` FOREIGN KEY (`criadoPorId`) REFERENCES `Usuario`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
