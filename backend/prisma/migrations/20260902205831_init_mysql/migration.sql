-- CreateTable
CREATE TABLE `SequenciaControle` (
    `chave` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`chave`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Usuario` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nome` TEXT NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `cpf` VARCHAR(191) NULL,
    `senha` TEXT NOT NULL,
    `apelido` TEXT NULL,
    `fotoPerfil` TEXT NULL,
    `re` TEXT NULL,
    `setor` TEXT NULL,
    `cargo` TEXT NULL,
    `empresa` TEXT NULL,
    `terceirizado` BOOLEAN NOT NULL DEFAULT false,
    `equipe` TEXT NULL,
    `unidade` TEXT NULL,
    `unidadesPermitidas` TEXT NULL,
    `perfilAcesso` VARCHAR(191) NOT NULL DEFAULT 'USUARIO',
    `statusUsuario` VARCHAR(191) NOT NULL DEFAULT 'ATIVO',
    `deveAlterarSenha` BOOLEAN NOT NULL DEFAULT true,
    `somenteCadastro` BOOLEAN NOT NULL DEFAULT false,
    `gruposTreinamentoJson` VARCHAR(191) NOT NULL DEFAULT '[]',
    `senhaAlteradaEm` DATETIME(3) NULL,
    `pinOperacionalHash` TEXT NULL,
    `pinOperacionalCriadoEm` DATETIME(3) NULL,
    `pinOperacionalAtualizadoEm` DATETIME(3) NULL,
    `pinTentativasInvalidas` INTEGER NOT NULL DEFAULT 0,
    `pinBloqueadoAte` DATETIME(3) NULL,
    `ultimoAcesso` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `Usuario_email_key`(`email`),
    UNIQUE INDEX `Usuario_cpf_key`(`cpf`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PerfilAcesso` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `codigo` VARCHAR(191) NOT NULL,
    `nome` VARCHAR(191) NOT NULL,
    `descricao` TEXT NULL,
    `permissoesJson` VARCHAR(191) NOT NULL DEFAULT '[]',
    `sistema` BOOLEAN NOT NULL DEFAULT false,
    `status` VARCHAR(191) NOT NULL DEFAULT 'ATIVO',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `PerfilAcesso_codigo_key`(`codigo`),
    INDEX `PerfilAcesso_status_nome_idx`(`status`, `nome`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TreinamentoTerminal` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `token` VARCHAR(191) NOT NULL,
    `codigo` VARCHAR(191) NULL,
    `nomeCompleto` TEXT NOT NULL,
    `cpf` VARCHAR(191) NOT NULL,
    `dataNascimento` DATETIME(3) NOT NULL,
    `empresa` TEXT NOT NULL,
    `cargo` TEXT NOT NULL,
    `email` TEXT NOT NULL,
    `telefone` TEXT NOT NULL,
    `etapa` VARCHAR(191) NOT NULL DEFAULT 'video',
    `status` VARCHAR(191) NOT NULL DEFAULT 'Em andamento',
    `videoUrl` TEXT NULL,
    `progressoSegundos` INTEGER NOT NULL DEFAULT 0,
    `duracaoSegundos` INTEGER NOT NULL DEFAULT 0,
    `videoConcluido` BOOLEAN NOT NULL DEFAULT false,
    `aceiteDeclaracao` BOOLEAN NOT NULL DEFAULT false,
    `assinaturaDataUrl` LONGTEXT NULL,
    `certificadoArquivo` TEXT NULL,
    `emailStatus` TEXT NULL,
    `emailEnviadoEm` DATETIME(3) NULL,
    `concluidoEm` DATETIME(3) NULL,
    `ultimoAcessoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `TreinamentoTerminal_token_key`(`token`),
    UNIQUE INDEX `TreinamentoTerminal_codigo_key`(`codigo`),
    INDEX `TreinamentoTerminal_cpf_idx`(`cpf`),
    INDEX `TreinamentoTerminal_status_updatedAt_idx`(`status`, `updatedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `IntegracaoTerminal` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `token` VARCHAR(191) NOT NULL,
    `codigo` VARCHAR(191) NULL,
    `nomeCompleto` TEXT NOT NULL,
    `cpf` VARCHAR(191) NOT NULL,
    `dataNascimento` DATETIME(3) NOT NULL,
    `empresa` TEXT NOT NULL,
    `cargo` TEXT NOT NULL,
    `email` TEXT NOT NULL,
    `telefone` TEXT NOT NULL,
    `etapa` VARCHAR(191) NOT NULL DEFAULT 'video',
    `status` VARCHAR(191) NOT NULL DEFAULT 'Em andamento',
    `videoUrl` TEXT NULL,
    `progressoSegundos` INTEGER NOT NULL DEFAULT 0,
    `duracaoSegundos` INTEGER NOT NULL DEFAULT 0,
    `videoConcluido` BOOLEAN NOT NULL DEFAULT false,
    `quizAprovado` BOOLEAN NOT NULL DEFAULT false,
    `respostasQuiz` TEXT NULL,
    `aceiteDeclaracao` BOOLEAN NOT NULL DEFAULT false,
    `assinaturaDataUrl` LONGTEXT NULL,
    `certificadoArquivo` TEXT NULL,
    `emailStatus` TEXT NULL,
    `emailEnviadoEm` DATETIME(3) NULL,
    `concluidoEm` DATETIME(3) NULL,
    `ultimoAcessoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `IntegracaoTerminal_token_key`(`token`),
    UNIQUE INDEX `IntegracaoTerminal_codigo_key`(`codigo`),
    INDEX `IntegracaoTerminal_cpf_idx`(`cpf`),
    INDEX `IntegracaoTerminal_status_updatedAt_idx`(`status`, `updatedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TreinamentoPocSep007` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `token` VARCHAR(191) NOT NULL,
    `usuarioId` INTEGER NULL,
    `codigo` VARCHAR(191) NULL,
    `nomeCompleto` TEXT NOT NULL,
    `cpf` VARCHAR(191) NULL,
    `email` VARCHAR(191) NOT NULL,
    `cargo` TEXT NULL,
    `departamento` TEXT NULL,
    `unidade` TEXT NULL,
    `empresa` TEXT NULL,
    `etapaAtual` INTEGER NOT NULL DEFAULT 1,
    `status` VARCHAR(191) NOT NULL DEFAULT 'Em andamento',
    `porcentagem` INTEGER NOT NULL DEFAULT 0,
    `nota` DOUBLE NULL,
    `tentativas` INTEGER NOT NULL DEFAULT 0,
    `respostasQuiz` TEXT NULL,
    `assinaturaDataUrl` LONGTEXT NULL,
    `certificadoArquivo` TEXT NULL,
    `emailStatus` TEXT NULL,
    `emailEnviadoEm` DATETIME(3) NULL,
    `ipInicio` TEXT NULL,
    `navegador` TEXT NULL,
    `sistema` TEXT NULL,
    `dataInicio` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `dataConclusao` DATETIME(3) NULL,
    `ultimoAcessoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `TreinamentoPocSep007_token_key`(`token`),
    UNIQUE INDEX `TreinamentoPocSep007_codigo_key`(`codigo`),
    INDEX `TreinamentoPocSep007_email_idx`(`email`),
    INDEX `TreinamentoPocSep007_cpf_idx`(`cpf`),
    INDEX `TreinamentoPocSep007_status_updatedAt_idx`(`status`, `updatedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TreinamentoPocSep001` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `token` VARCHAR(191) NOT NULL,
    `usuarioId` INTEGER NULL,
    `codigo` VARCHAR(191) NULL,
    `nomeCompleto` TEXT NOT NULL,
    `cpf` VARCHAR(191) NULL,
    `email` VARCHAR(191) NOT NULL,
    `cargo` TEXT NULL,
    `departamento` TEXT NULL,
    `unidade` TEXT NULL,
    `empresa` TEXT NULL,
    `etapaAtual` INTEGER NOT NULL DEFAULT 1,
    `status` VARCHAR(191) NOT NULL DEFAULT 'Em andamento',
    `porcentagem` INTEGER NOT NULL DEFAULT 0,
    `nota` DOUBLE NULL,
    `tentativas` INTEGER NOT NULL DEFAULT 0,
    `respostasQuiz` TEXT NULL,
    `assinaturaDataUrl` LONGTEXT NULL,
    `certificadoArquivo` TEXT NULL,
    `emailStatus` TEXT NULL,
    `emailEnviadoEm` DATETIME(3) NULL,
    `ipInicio` TEXT NULL,
    `navegador` TEXT NULL,
    `sistema` TEXT NULL,
    `dataInicio` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `dataConclusao` DATETIME(3) NULL,
    `ultimoAcessoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `TreinamentoPocSep001_token_key`(`token`),
    UNIQUE INDEX `TreinamentoPocSep001_codigo_key`(`codigo`),
    INDEX `TreinamentoPocSep001_email_idx`(`email`),
    INDEX `TreinamentoPocSep001_cpf_idx`(`cpf`),
    INDEX `TreinamentoPocSep001_status_updatedAt_idx`(`status`, `updatedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SessaoUsuario` (
    `id` VARCHAR(191) NOT NULL,
    `usuarioId` INTEGER NOT NULL,
    `tokenHash` VARCHAR(191) NULL,
    `refreshTokenHash` VARCHAR(191) NULL,
    `refreshExpiraEm` DATETIME(3) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'ATIVA',
    `unidadeAtiva` TEXT NULL,
    `equipe` TEXT NULL,
    `perfilAcesso` TEXT NULL,
    `ipInicio` TEXT NULL,
    `ipUltimaAtividade` TEXT NULL,
    `navegador` TEXT NULL,
    `sistema` TEXT NULL,
    `iniciadaEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `ultimaAtividadeEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `encerradaEm` DATETIME(3) NULL,
    `encerradaPor` TEXT NULL,
    `encerradaPorId` INTEGER NULL,
    `motivoEncerramento` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `SessaoUsuario_tokenHash_key`(`tokenHash`),
    UNIQUE INDEX `SessaoUsuario_refreshTokenHash_key`(`refreshTokenHash`),
    INDEX `SessaoUsuario_usuarioId_status_idx`(`usuarioId`, `status`),
    INDEX `SessaoUsuario_status_ultimaAtividadeEm_idx`(`status`, `ultimaAtividadeEm`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SugestaoMelhoria` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `assunto` TEXT NOT NULL,
    `sugestao` TEXT NOT NULL,
    `printTela` TEXT NULL,
    `nomeArquivo` TEXT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'Recebida',
    `resposta` TEXT NULL,
    `unidade` VARCHAR(191) NOT NULL DEFAULT 'GJA-T1',
    `autorId` INTEGER NOT NULL,
    `avaliadoPorId` INTEGER NULL,
    `avaliadoEm` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `SugestaoMelhoria_status_unidade_idx`(`status`, `unidade`),
    INDEX `SugestaoMelhoria_autorId_createdAt_idx`(`autorId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Ocorrencia` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `numero` INTEGER NOT NULL,
    `ano` INTEGER NOT NULL,
    `codigo` VARCHAR(191) NOT NULL,
    `assunto` TEXT NOT NULL,
    `local` TEXT NOT NULL,
    `unidade` VARCHAR(191) NOT NULL DEFAULT 'GJA-T1',
    `natureza` TEXT NOT NULL,
    `subNatureza` TEXT NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'ABERTO',
    `dataOcorrencia` DATETIME(3) NOT NULL,
    `relatoSeguranca` TEXT NULL,
    `acoesTomadas` TEXT NULL,
    `impactoOperacional` TEXT NULL,
    `fluxoStatus` VARCHAR(191) NOT NULL DEFAULT 'Aguardando Revisao',
    `revisadoPorId` INTEGER NULL,
    `revisadoEm` DATETIME(3) NULL,
    `aprovadoPorId` INTEGER NULL,
    `aprovadoEm` DATETIME(3) NULL,
    `motivoDevolucao` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `Ocorrencia_codigo_unidade_key`(`codigo`, `unidade`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `EnvolvidoOcorrencia` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `ocorrenciaId` INTEGER NOT NULL,
    `tipoEnvolvimento` TEXT NOT NULL,
    `nome` TEXT NOT NULL,
    `tipoDocumento` TEXT NOT NULL,
    `documento` TEXT NOT NULL,
    `empresa` TEXT NULL,
    `possuiVeiculo` BOOLEAN NOT NULL DEFAULT false,
    `placa` TEXT NULL,
    `reboque` TEXT NULL,
    `relato` TEXT NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AnexoOcorrencia` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `ocorrenciaId` INTEGER NOT NULL,
    `nomeOriginal` TEXT NOT NULL,
    `nomeArquivo` TEXT NOT NULL,
    `caminho` TEXT NOT NULL,
    `tipo` TEXT NOT NULL,
    `hashArquivo` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Evento` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `numero` INTEGER NOT NULL,
    `ano` INTEGER NOT NULL,
    `codigo` VARCHAR(191) NOT NULL,
    `assunto` TEXT NOT NULL,
    `local` TEXT NOT NULL,
    `unidade` VARCHAR(191) NOT NULL DEFAULT 'GJA-T1',
    `natureza` TEXT NOT NULL,
    `subNatureza` TEXT NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'ABERTO',
    `dataEvento` DATETIME(3) NOT NULL,
    `relatoSeguranca` TEXT NULL,
    `acoesTomadas` TEXT NULL,
    `impactoOperacional` TEXT NULL,
    `fluxoStatus` VARCHAR(191) NOT NULL DEFAULT 'Aguardando Revisao',
    `revisadoPorId` INTEGER NULL,
    `revisadoEm` DATETIME(3) NULL,
    `aprovadoPorId` INTEGER NULL,
    `aprovadoEm` DATETIME(3) NULL,
    `motivoDevolucao` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `Evento_codigo_unidade_key`(`codigo`, `unidade`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `EnvolvidoEvento` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `eventoId` INTEGER NOT NULL,
    `tipoEnvolvimento` TEXT NOT NULL,
    `nome` TEXT NOT NULL,
    `tipoDocumento` TEXT NOT NULL,
    `documento` TEXT NOT NULL,
    `empresa` TEXT NULL,
    `possuiVeiculo` BOOLEAN NOT NULL DEFAULT false,
    `placa` TEXT NULL,
    `reboque` TEXT NULL,
    `relato` TEXT NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AnexoEvento` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `eventoId` INTEGER NOT NULL,
    `nomeOriginal` TEXT NOT NULL,
    `nomeArquivo` TEXT NOT NULL,
    `caminho` TEXT NOT NULL,
    `tipo` TEXT NOT NULL,
    `hashArquivo` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RelatoCampo` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `token` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'Link Gerado',
    `titulo` TEXT NULL,
    `setor` TEXT NULL,
    `local` TEXT NULL,
    `unidade` VARCHAR(191) NOT NULL DEFAULT 'GJA-T1',
    `responsavelColeta` TEXT NULL,
    `dataOcorrido` DATETIME(3) NULL,
    `observacoes` TEXT NULL,
    `checklistColeta` TEXT NULL,
    `expiraEm` DATETIME(3) NOT NULL,
    `enviadoEm` DATETIME(3) NULL,
    `finalizadoEm` DATETIME(3) NULL,
    `convertidoTipo` TEXT NULL,
    `convertidoRegistroId` INTEGER NULL,
    `convertidoCodigo` TEXT NULL,
    `geradoPorId` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `RelatoCampo_token_key`(`token`),
    INDEX `RelatoCampo_status_unidade_idx`(`status`, `unidade`),
    INDEX `RelatoCampo_token_expiraEm_idx`(`token`, `expiraEm`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `EnvolvidoRelatoCampo` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `relatoCampoId` INTEGER NOT NULL,
    `tipoEnvolvimento` TEXT NOT NULL,
    `nome` TEXT NOT NULL,
    `tipoDocumento` TEXT NOT NULL,
    `documento` TEXT NULL,
    `empresa` TEXT NULL,
    `possuiVeiculo` BOOLEAN NOT NULL DEFAULT false,
    `placa` TEXT NULL,
    `reboque` TEXT NULL,
    `relato` TEXT NOT NULL,
    `audioCaminho` TEXT NULL,
    `audioNome` TEXT NULL,
    `audioTipo` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AnexoRelatoCampo` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `relatoCampoId` INTEGER NOT NULL,
    `nomeOriginal` TEXT NOT NULL,
    `nomeArquivo` TEXT NOT NULL,
    `caminho` TEXT NOT NULL,
    `tipo` TEXT NOT NULL,
    `categoria` VARCHAR(191) NOT NULL DEFAULT 'Evidencia',
    `hashArquivo` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Investigacao` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `ocorrenciaId` INTEGER NOT NULL,
    `numero` INTEGER NULL,
    `ano` INTEGER NULL,
    `codigo` VARCHAR(191) NULL,
    `titulo` TEXT NOT NULL,
    `descricao` TEXT NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'Em Análise',
    `numeroOcorrencia` TEXT NOT NULL,
    `assunto` TEXT NOT NULL,
    `local` TEXT NOT NULL,
    `unidade` VARCHAR(191) NOT NULL DEFAULT 'GJA-T1',
    `natureza` TEXT NOT NULL,
    `subNatureza` TEXT NOT NULL,
    `dataOcorrencia` DATETIME(3) NOT NULL,
    `relatoSeguranca` TEXT NULL,
    `fluxoStatus` VARCHAR(191) NOT NULL DEFAULT 'Aguardando Revisao',
    `revisadoPorId` INTEGER NULL,
    `revisadoEm` DATETIME(3) NULL,
    `aprovadoPorId` INTEGER NULL,
    `aprovadoEm` DATETIME(3) NULL,
    `motivoDevolucao` TEXT NULL,
    `descricaoInvestigacao` TEXT NULL,
    `conclusaoFatos` TEXT NULL,
    `responsavelId` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Investigacao_ocorrenciaId_key`(`ocorrenciaId`),
    UNIQUE INDEX `Investigacao_codigo_unidade_key`(`codigo`, `unidade`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Natureza` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nome` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `Natureza_nome_key`(`nome`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SubNatureza` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `naturezaId` INTEGER NOT NULL,
    `nome` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `SubNatureza_naturezaId_nome_key`(`naturezaId`, `nome`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `LocalTerminal` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nome` VARCHAR(191) NOT NULL,
    `descricao` TEXT NULL,
    `tipo` TEXT NOT NULL,
    `areaSensivel` BOOLEAN NOT NULL DEFAULT false,
    `status` VARCHAR(191) NOT NULL DEFAULT 'Ativo',
    `unidade` VARCHAR(191) NOT NULL DEFAULT 'GJA-T1',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `LocalTerminal_unidade_status_idx`(`unidade`, `status`),
    UNIQUE INDEX `LocalTerminal_nome_unidade_key`(`nome`, `unidade`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `QuadraSegurancaContainer` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `numeroContainer` VARCHAR(191) NOT NULL,
    `unidade` VARCHAR(191) NOT NULL DEFAULT 'GJA-T1',
    `dataHoraEntrada` DATETIME(3) NOT NULL,
    `dataHoraSaida` DATETIME(3) NULL,
    `posicionamento` TEXT NULL,
    `tipoContainer` TEXT NOT NULL,
    `dimensao` TEXT NOT NULL,
    `destino` TEXT NOT NULL,
    `scannerEntrada` BOOLEAN NOT NULL DEFAULT false,
    `scannerSaida` BOOLEAN NULL,
    `estufadoTerminal` BOOLEAN NOT NULL DEFAULT false,
    `numeroLacre` TEXT NULL,
    `novoLacre` TEXT NULL,
    `armador` TEXT NULL,
    `transportadora` TEXT NULL,
    `motoristaResponsavel` TEXT NULL,
    `documentoMotorista` TEXT NULL,
    `placaCavalo` TEXT NULL,
    `placaCarreta` TEXT NULL,
    `tipoCarga` TEXT NULL,
    `pesoCarga` TEXT NULL,
    `prioridade` VARCHAR(191) NOT NULL DEFAULT 'Baixa',
    `statusOperacional` VARCHAR(191) NOT NULL DEFAULT 'Dentro do terminal',
    `statusFinal` TEXT NULL,
    `observacoes` TEXT NULL,
    `observacoesSaida` TEXT NULL,
    `criadoPorId` INTEGER NULL,
    `atualizadoPorId` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `QuadraSegurancaContainer_unidade_statusOperacional_idx`(`unidade`, `statusOperacional`),
    INDEX `QuadraSegurancaContainer_unidade_prioridade_idx`(`unidade`, `prioridade`),
    UNIQUE INDEX `QuadraSegurancaContainer_numeroContainer_unidade_key`(`numeroContainer`, `unidade`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `QuadraSegurancaAnexo` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `containerId` INTEGER NOT NULL,
    `categoria` TEXT NOT NULL,
    `nomeOriginal` TEXT NOT NULL,
    `nomeArquivo` TEXT NOT NULL,
    `caminho` TEXT NOT NULL,
    `tipo` TEXT NOT NULL,
    `hashArquivo` TEXT NULL,
    `usuarioId` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DispositivoAutorizado` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `usuarioId` INTEGER NOT NULL,
    `identificador` VARCHAR(191) NOT NULL,
    `navegador` TEXT NULL,
    `sistema` TEXT NULL,
    `ipCadastro` TEXT NULL,
    `ipUltimoAcesso` TEXT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'Autorizado',
    `primeiroAcesso` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `ultimoAcesso` DATETIME(3) NULL,
    `resetadoEm` DATETIME(3) NULL,
    `resetadoPorId` INTEGER NULL,
    `motivoReset` TEXT NULL,

    INDEX `DispositivoAutorizado_usuarioId_status_idx`(`usuarioId`, `status`),
    UNIQUE INDEX `DispositivoAutorizado_usuarioId_identificador_key`(`usuarioId`, `identificador`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `QuadraSegurancaHistorico` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `containerId` INTEGER NOT NULL,
    `usuarioId` INTEGER NULL,
    `acao` TEXT NOT NULL,
    `detalhes` TEXT NULL,
    `dadosAnteriores` TEXT NULL,
    `dadosNovos` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AnaliseOcorrencia` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `ocorrenciaId` INTEGER NOT NULL,
    `responsavelId` INTEGER NOT NULL,
    `iniciadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `concluidoEm` DATETIME(3) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'Em Análise',
    `prejuizoFinanceiro` VARCHAR(191) NOT NULL DEFAULT '0,00',
    `conclusaoAnalise` TEXT NULL,
    `concluidoPorId` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `AnaliseOcorrencia_ocorrenciaId_key`(`ocorrenciaId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AnaliseEvento` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `eventoId` INTEGER NOT NULL,
    `responsavelId` INTEGER NOT NULL,
    `iniciadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `concluidoEm` DATETIME(3) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'Em Análise',
    `valorRecuperado` VARCHAR(191) NOT NULL DEFAULT '0,00',
    `conclusaoAnalise` TEXT NULL,
    `concluidoPorId` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `AnaliseEvento_eventoId_key`(`eventoId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `LogAuditoria` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `usuarioId` INTEGER NULL,
    `usuarioNome` TEXT NOT NULL,
    `ip` TEXT NULL,
    `acao` TEXT NOT NULL,
    `tipoRegistro` TEXT NOT NULL,
    `registroId` INTEGER NULL,
    `dadosAnteriores` TEXT NULL,
    `dadosNovos` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AssinaturaDocumento` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `token` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'VALIDA',
    `modulo` VARCHAR(191) NOT NULL,
    `registroId` INTEGER NOT NULL,
    `codigoRegistro` TEXT NOT NULL,
    `unidade` TEXT NOT NULL,
    `acao` TEXT NOT NULL,
    `usuarioId` INTEGER NOT NULL,
    `usuarioNome` TEXT NOT NULL,
    `perfilAcesso` TEXT NULL,
    `ip` TEXT NULL,
    `sessaoId` TEXT NULL,
    `documentoHash` TEXT NOT NULL,
    `versao` INTEGER NOT NULL DEFAULT 1,
    `invalidadaEm` DATETIME(3) NULL,
    `motivoInvalidacao` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `AssinaturaDocumento_token_key`(`token`),
    INDEX `AssinaturaDocumento_modulo_registroId_status_idx`(`modulo`, `registroId`, `status`),
    INDEX `AssinaturaDocumento_token_idx`(`token`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RascunhoFormulario` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `usuarioId` INTEGER NOT NULL,
    `modulo` VARCHAR(191) NOT NULL,
    `chave` VARCHAR(191) NOT NULL,
    `unidade` VARCHAR(191) NOT NULL DEFAULT 'GJA-T1',
    `dadosJson` TEXT NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'EM_PREENCHIMENTO',
    `ultimaAlteracao` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `RascunhoFormulario_usuarioId_status_updatedAt_idx`(`usuarioId`, `status`, `updatedAt`),
    INDEX `RascunhoFormulario_modulo_chave_unidade_idx`(`modulo`, `chave`, `unidade`),
    UNIQUE INDEX `RascunhoFormulario_usuarioId_modulo_chave_unidade_key`(`usuarioId`, `modulo`, `chave`, `unidade`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AnaliseRisco` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `numero` INTEGER NOT NULL,
    `ano` INTEGER NOT NULL,
    `codigo` VARCHAR(191) NOT NULL,
    `riscoCatalogoId` INTEGER NULL,
    `dataHora` DATETIME(3) NOT NULL,
    `responsavelId` INTEGER NOT NULL,
    `unidade` VARCHAR(191) NOT NULL,
    `setor` TEXT NOT NULL,
    `local` TEXT NOT NULL,
    `area` TEXT NULL,
    `tipoRisco` TEXT NOT NULL,
    `naturezaRisco` TEXT NOT NULL,
    `tituloRisco` TEXT NULL,
    `origemRisco` TEXT NULL,
    `fonteRisco` TEXT NULL,
    `fatorRisco` TEXT NULL,
    `fragilidade` TEXT NULL,
    `eventoIncerteza` TEXT NULL,
    `objetivoImpactado` TEXT NULL,
    `eficaciaControles` TEXT NULL,
    `criteriosAvaliacao` TEXT NULL,
    `controlesInternos` TEXT NULL,
    `atividadesControle` TEXT NULL,
    `monitoramento` TEXT NULL,
    `comunicacaoConsulta` TEXT NULL,
    `descricaoRisco` TEXT NOT NULL,
    `possivelImpacto` TEXT NOT NULL,
    `causaProvavel` TEXT NULL,
    `consequencia` TEXT NULL,
    `pessoasAfetadas` TEXT NULL,
    `controlesExistentes` TEXT NULL,
    `probabilidade` TEXT NOT NULL,
    `severidade` TEXT NOT NULL,
    `probabilidadeValor` INTEGER NULL,
    `impactoValor` DOUBLE NULL,
    `resultadoRisco` DOUBLE NULL,
    `nivelRisco` TEXT NOT NULL,
    `nivelAceitacao` TEXT NULL,
    `tratamentoRisco` TEXT NULL,
    `medidasPreventivas` TEXT NOT NULL,
    `planoAcao` TEXT NOT NULL,
    `acaoProposta` TEXT NULL,
    `responsavelAcaoId` INTEGER NULL,
    `responsavelAcaoNome` TEXT NULL,
    `prazo` DATETIME(3) NOT NULL,
    `custoEstimado` TEXT NULL,
    `prioridade` TEXT NULL,
    `statusAcao` TEXT NULL,
    `observacoes` TEXT NULL,
    `novaProbabilidade` INTEGER NULL,
    `novoImpacto` DOUBLE NULL,
    `novoResultado` DOUBLE NULL,
    `novoNivelRisco` TEXT NULL,
    `observacaoReavaliacao` TEXT NULL,
    `dataReavaliacao` DATETIME(3) NULL,
    `responsavelReavaliacao` TEXT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'Pendente',
    `ocorrenciaId` INTEGER NULL,
    `eventoId` INTEGER NULL,
    `investigacaoId` INTEGER NULL,
    `anulado` BOOLEAN NOT NULL DEFAULT false,
    `motivoAnulacao` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `AnaliseRisco_riscoCatalogoId_idx`(`riscoCatalogoId`),
    UNIQUE INDEX `AnaliseRisco_codigo_unidade_key`(`codigo`, `unidade`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `FotoRisco` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `analiseRiscoId` INTEGER NOT NULL,
    `nomeOriginal` TEXT NOT NULL,
    `nomeArquivo` TEXT NOT NULL,
    `caminho` TEXT NOT NULL,
    `tipo` TEXT NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RiscoCatalogo` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `numero` INTEGER NOT NULL,
    `ano` INTEGER NOT NULL DEFAULT 2026,
    `codigo` VARCHAR(191) NOT NULL,
    `unidade` VARCHAR(191) NOT NULL,
    `local` TEXT NULL,
    `area` TEXT NULL,
    `nome` VARCHAR(191) NOT NULL,
    `tipoRisco` TEXT NOT NULL,
    `grauRisco` VARCHAR(191) NOT NULL DEFAULT 'Média',
    `naturezaRisco` TEXT NOT NULL,
    `origemRisco` TEXT NULL,
    `fonteRisco` TEXT NULL,
    `fatorRisco` TEXT NULL,
    `fragilidade` TEXT NULL,
    `eventoIncerteza` TEXT NULL,
    `objetivoImpactado` TEXT NULL,
    `responsavelNome` TEXT NULL,
    `descricaoRisco` TEXT NOT NULL,
    `possivelImpacto` TEXT NOT NULL,
    `medidasPreventivas` TEXT NULL,
    `planoAcaoSugerido` TEXT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'Ativo',
    `criadoPorId` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `RiscoCatalogo_unidade_status_idx`(`unidade`, `status`),
    UNIQUE INDEX `RiscoCatalogo_codigo_unidade_key`(`codigo`, `unidade`),
    UNIQUE INDEX `RiscoCatalogo_nome_unidade_key`(`nome`, `unidade`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RiscoMacroProcesso` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `numero` INTEGER NOT NULL,
    `codigo` VARCHAR(191) NOT NULL,
    `nome` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'Ativo',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `RiscoMacroProcesso_codigo_key`(`codigo`),
    UNIQUE INDEX `RiscoMacroProcesso_nome_key`(`nome`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RiscoSetor` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nome` VARCHAR(191) NOT NULL,
    `macroProcessoId` INTEGER NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'Ativo',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `RiscoSetor_macroProcessoId_status_idx`(`macroProcessoId`, `status`),
    UNIQUE INDEX `RiscoSetor_nome_macroProcessoId_key`(`nome`, `macroProcessoId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RiscoCadastroGeral` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `numero` INTEGER NOT NULL,
    `codigo` VARCHAR(191) NOT NULL,
    `nome` VARCHAR(191) NOT NULL,
    `descricao` TEXT NULL,
    `fatoresRiscoJson` VARCHAR(191) NOT NULL DEFAULT '[]',
    `status` VARCHAR(191) NOT NULL DEFAULT 'Ativo',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `RiscoCadastroGeral_codigo_key`(`codigo`),
    UNIQUE INDEX `RiscoCadastroGeral_nome_key`(`nome`),
    INDEX `RiscoCadastroGeral_status_numero_idx`(`status`, `numero`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `FatorRiscoCadastro` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `numero` INTEGER NOT NULL,
    `codigo` VARCHAR(191) NOT NULL,
    `nome` VARCHAR(191) NOT NULL,
    `descricao` TEXT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'Ativo',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `FatorRiscoCadastro_codigo_key`(`codigo`),
    UNIQUE INDEX `FatorRiscoCadastro_nome_key`(`nome`),
    INDEX `FatorRiscoCadastro_status_numero_idx`(`status`, `numero`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ControlePreventivoCadastro` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `numero` INTEGER NOT NULL,
    `codigo` VARCHAR(191) NOT NULL,
    `tipoControle` VARCHAR(191) NOT NULL DEFAULT 'CP',
    `nome` VARCHAR(191) NOT NULL,
    `descricao` TEXT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'Ativo',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `ControlePreventivoCadastro_codigo_key`(`codigo`),
    INDEX `ControlePreventivoCadastro_status_numero_idx`(`status`, `numero`),
    INDEX `ControlePreventivoCadastro_tipoControle_status_numero_idx`(`tipoControle`, `status`, `numero`),
    UNIQUE INDEX `ControlePreventivoCadastro_tipoControle_nome_key`(`tipoControle`, `nome`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AnaliseRiscoCompleta` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `numero` INTEGER NOT NULL,
    `ano` INTEGER NOT NULL,
    `codigo` VARCHAR(191) NOT NULL,
    `unidade` VARCHAR(191) NOT NULL,
    `macroProcessoId` INTEGER NULL,
    `macroProcessoCodigo` TEXT NOT NULL,
    `macroProcessoNome` TEXT NOT NULL,
    `setorId` INTEGER NULL,
    `setorNome` TEXT NOT NULL,
    `riscoId` INTEGER NULL,
    `riscoCodigo` TEXT NOT NULL,
    `riscoNome` TEXT NOT NULL,
    `fatoresRiscoJson` VARCHAR(191) NOT NULL DEFAULT '[]',
    `sc` INTEGER NOT NULL,
    `fe` INTEGER NOT NULL,
    `intervalo` INTEGER NOT NULL,
    `sse` INTEGER NOT NULL,
    `ope` INTEGER NOT NULL,
    `fin` INTEGER NOT NULL,
    `adm` INTEGER NOT NULL,
    `img` INTEGER NOT NULL,
    `lc` INTEGER NOT NULL,
    `notaProbabilidade` DOUBLE NOT NULL,
    `mediaProbabilidade` DOUBLE NOT NULL,
    `percentualProbabilidade` DOUBLE NOT NULL,
    `nivelProbabilidade` TEXT NOT NULL,
    `notaConsequencia` DOUBLE NOT NULL,
    `mediaConsequencia` DOUBLE NOT NULL,
    `nivelConsequencia` TEXT NOT NULL,
    `resultadoInerente` DOUBLE NOT NULL,
    `nivelRiscoInerente` TEXT NOT NULL,
    `classificacaoRisco` TEXT NOT NULL,
    `periodicidadeAcao` TEXT NOT NULL,
    `estrategiaTratamento` TEXT NULL,
    `preventivosJson` VARCHAR(191) NOT NULL DEFAULT '[]',
    `detectivosJson` VARCHAR(191) NOT NULL DEFAULT '[]',
    `corretivosJson` VARCHAR(191) NOT NULL DEFAULT '[]',
    `scResidual` INTEGER NULL,
    `feResidual` INTEGER NULL,
    `intervaloResidual` INTEGER NULL,
    `sseResidual` INTEGER NULL,
    `opeResidual` INTEGER NULL,
    `finResidual` INTEGER NULL,
    `admResidual` INTEGER NULL,
    `imgResidual` INTEGER NULL,
    `lcResidual` INTEGER NULL,
    `notaProbabilidadeResidual` DOUBLE NULL,
    `probabilidadeResidual` DOUBLE NULL,
    `percentualProbabilidadeResidual` DOUBLE NULL,
    `nivelProbabilidadeResidual` TEXT NULL,
    `notaConsequenciaResidual` DOUBLE NULL,
    `consequenciaResidual` DOUBLE NULL,
    `nivelConsequenciaResidual` TEXT NULL,
    `resultadoResidual` DOUBLE NULL,
    `nivelRiscoResidual` TEXT NULL,
    `classificacaoResidual` TEXT NULL,
    `desempenhoNota` DOUBLE NULL,
    `desempenhoProbabilidade` DOUBLE NULL,
    `desempenhoConsequencia` DOUBLE NULL,
    `desempenhoNivelRisco` DOUBLE NULL,
    `responsavelId` INTEGER NULL,
    `tratativaStatus` VARCHAR(191) NOT NULL DEFAULT 'Aberta',
    `tratativaResponsavelId` INTEGER NULL,
    `tratativaResponsavelNome` TEXT NULL,
    `tratativaPrazo` DATETIME(3) NULL,
    `tratativaAcao` TEXT NULL,
    `tratativaEvidencia` TEXT NULL,
    `tratativaValidacao` TEXT NULL,
    `tratativaConcluidaEm` DATETIME(3) NULL,
    `finalizacaoStatus` VARCHAR(191) NOT NULL DEFAULT 'Aberta',
    `finalizacaoDecisao` TEXT NULL,
    `finalizacaoJustificativa` TEXT NULL,
    `finalizacaoAprovadorId` INTEGER NULL,
    `finalizacaoAprovadorNome` TEXT NULL,
    `finalizacaoObservacoes` TEXT NULL,
    `finalizadaEm` DATETIME(3) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'Ativo',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `AnaliseRiscoCompleta_unidade_status_idx`(`unidade`, `status`),
    INDEX `AnaliseRiscoCompleta_unidade_tratativaStatus_idx`(`unidade`, `tratativaStatus`),
    INDEX `AnaliseRiscoCompleta_macroProcessoId_idx`(`macroProcessoId`),
    INDEX `AnaliseRiscoCompleta_setorId_idx`(`setorId`),
    UNIQUE INDEX `AnaliseRiscoCompleta_codigo_unidade_key`(`codigo`, `unidade`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AprOperacional` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `numero` INTEGER NOT NULL,
    `ano` INTEGER NOT NULL,
    `codigo` VARCHAR(191) NOT NULL,
    `unidade` VARCHAR(191) NOT NULL,
    `local` VARCHAR(191) NOT NULL,
    `area` TEXT NULL,
    `atividade` TEXT NOT NULL,
    `descricaoAtividade` TEXT NOT NULL,
    `dataPrevista` DATETIME(3) NULL,
    `responsavelAtividade` TEXT NOT NULL,
    `equipeEnvolvida` TEXT NULL,
    `empresaTerceira` TEXT NULL,
    `riscosIds` TEXT NULL,
    `perigos` TEXT NOT NULL,
    `controlesObrigatorios` TEXT NOT NULL,
    `episNecessarios` TEXT NULL,
    `permissoesNecessarias` TEXT NULL,
    `nivelRisco` VARCHAR(191) NOT NULL DEFAULT 'Moderado',
    `status` VARCHAR(191) NOT NULL DEFAULT 'Rascunho',
    `criadoPorId` INTEGER NULL,
    `criadoPorNome` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `AprOperacional_unidade_status_idx`(`unidade`, `status`),
    INDEX `AprOperacional_local_dataPrevista_idx`(`local`, `dataPrevista`),
    UNIQUE INDEX `AprOperacional_codigo_unidade_key`(`codigo`, `unidade`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AprAprovacao` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `aprId` INTEGER NOT NULL,
    `usuarioId` INTEGER NULL,
    `usuarioNome` TEXT NOT NULL,
    `perfilAcesso` TEXT NULL,
    `decisao` VARCHAR(191) NOT NULL DEFAULT 'Pendente',
    `observacao` TEXT NULL,
    `decididoEm` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `AprAprovacao_aprId_decisao_idx`(`aprId`, `decisao`),
    INDEX `AprAprovacao_usuarioId_decisao_idx`(`usuarioId`, `decisao`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AnaliseEstrategica` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `numero` INTEGER NOT NULL,
    `ano` INTEGER NOT NULL,
    `codigo` VARCHAR(191) NOT NULL,
    `tipo` TEXT NOT NULL,
    `titulo` TEXT NOT NULL,
    `unidade` VARCHAR(191) NOT NULL,
    `setor` TEXT NULL,
    `local` TEXT NULL,
    `dataHora` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `responsavelId` INTEGER NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'Aberta',
    `descricao` TEXT NOT NULL,
    `diagnostico` TEXT NULL,
    `impacto` TEXT NULL,
    `recomendacoes` TEXT NULL,
    `planoAcao` TEXT NULL,
    `responsavelAcao` TEXT NULL,
    `prazo` DATETIME(3) NULL,
    `ocorrenciaId` INTEGER NULL,
    `eventoId` INTEGER NULL,
    `investigacaoId` INTEGER NULL,
    `analiseRiscoId` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `AnaliseEstrategica_codigo_unidade_key`(`codigo`, `unidade`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PlanoAcaoCorporativo` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `numero` INTEGER NOT NULL,
    `ano` INTEGER NOT NULL,
    `codigo` VARCHAR(191) NOT NULL,
    `titulo` TEXT NOT NULL,
    `unidade` VARCHAR(191) NOT NULL,
    `origemModulo` VARCHAR(191) NULL,
    `origemId` INTEGER NULL,
    `fatorRiscoId` INTEGER NULL,
    `fatorRiscoCodigo` TEXT NULL,
    `fatorRiscoNome` TEXT NULL,
    `prioridade` VARCHAR(191) NOT NULL DEFAULT 'Media',
    `status` VARCHAR(191) NOT NULL DEFAULT 'Pendente',
    `percentual` INTEGER NOT NULL DEFAULT 0,
    `descricao` TEXT NOT NULL,
    `acaoCorretiva` TEXT NULL,
    `acaoPreventiva` TEXT NULL,
    `responsavelId` INTEGER NULL,
    `responsavelNome` TEXT NULL,
    `mediadoresJson` VARCHAR(191) NOT NULL DEFAULT '[]',
    `prazo` DATETIME(3) NOT NULL,
    `concluidoEm` DATETIME(3) NULL,
    `evidencia` TEXT NULL,
    `comentarios` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `PlanoAcaoCorporativo_origemModulo_origemId_idx`(`origemModulo`, `origemId`),
    INDEX `PlanoAcaoCorporativo_fatorRiscoId_idx`(`fatorRiscoId`),
    UNIQUE INDEX `PlanoAcaoCorporativo_codigo_unidade_key`(`codigo`, `unidade`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ChecklistInspecao` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `numero` INTEGER NOT NULL,
    `ano` INTEGER NOT NULL,
    `codigo` VARCHAR(191) NOT NULL,
    `titulo` TEXT NOT NULL,
    `unidade` VARCHAR(191) NOT NULL,
    `setor` TEXT NULL,
    `local` TEXT NOT NULL,
    `tipo` TEXT NOT NULL,
    `dataHora` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `responsavelId` INTEGER NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'Aberto',
    `pontuacao` INTEGER NOT NULL DEFAULT 0,
    `observacoes` TEXT NULL,
    `planoAcaoGerado` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `ChecklistInspecao_codigo_unidade_key`(`codigo`, `unidade`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ChecklistItem` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `checklistId` INTEGER NOT NULL,
    `categoria` TEXT NOT NULL,
    `descricao` TEXT NOT NULL,
    `conformidade` VARCHAR(191) NOT NULL DEFAULT 'Conforme',
    `criticidade` VARCHAR(191) NOT NULL DEFAULT 'Media',
    `observacao` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PassagemTurno` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `numero` INTEGER NOT NULL,
    `ano` INTEGER NOT NULL,
    `codigo` VARCHAR(191) NOT NULL,
    `dataPassagem` DATETIME(3) NOT NULL,
    `horaAbertura` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `horaEncerramento` DATETIME(3) NULL,
    `unidade` VARCHAR(191) NOT NULL,
    `equipe` VARCHAR(191) NOT NULL,
    `equipeCoberta` TEXT NULL,
    `responsavelId` INTEGER NOT NULL,
    `colaboradoresIds` TEXT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'Aberto',
    `statusPostoGocil` VARCHAR(191) NOT NULL DEFAULT 'Completo',
    `observacaoPostoGocil` TEXT NULL,
    `statusPostoScanner` VARCHAR(191) NOT NULL DEFAULT 'Completo',
    `observacaoPostoScanner` TEXT NULL,
    `informacoesComplementares` TEXT NULL,
    `checklistEquipamentos` TEXT NULL,
    `rondas` TEXT NULL,
    `cftvConectadas` INTEGER NULL,
    `cftvDesconectadas` INTEGER NULL,
    `containersArmazenados` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `PassagemTurno_unidade_equipe_status_idx`(`unidade`, `equipe`, `status`),
    UNIQUE INDEX `PassagemTurno_codigo_unidade_key`(`codigo`, `unidade`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PassagemTurnoPosto` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `passagemId` INTEGER NOT NULL,
    `posto` TEXT NOT NULL,
    `colaborador` TEXT NOT NULL,
    `re` TEXT NULL,
    `escala` TEXT NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RelatorioDiarioExecutivo` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `numero` INTEGER NOT NULL,
    `ano` INTEGER NOT NULL,
    `codigo` VARCHAR(191) NOT NULL,
    `dataOperacional` DATETIME(3) NOT NULL,
    `unidade` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'Consolidado',
    `resumoExecutivo` TEXT NOT NULL,
    `dadosJson` TEXT NOT NULL,
    `aprimoradoPorIa` BOOLEAN NOT NULL DEFAULT false,
    `modeloIa` TEXT NULL,
    `responsavelId` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `RelatorioDiarioExecutivo_unidade_dataOperacional_idx`(`unidade`, `dataOperacional`),
    UNIQUE INDEX `RelatorioDiarioExecutivo_codigo_unidade_key`(`codigo`, `unidade`),
    UNIQUE INDEX `RelatorioDiarioExecutivo_dataOperacional_unidade_key`(`dataOperacional`, `unidade`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Mencao` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `modulo` TEXT NOT NULL,
    `registroId` INTEGER NOT NULL,
    `codigoRegistro` TEXT NOT NULL,
    `tituloRegistro` TEXT NOT NULL,
    `unidade` TEXT NOT NULL,
    `usuarioMencionadoId` INTEGER NOT NULL,
    `autorId` INTEGER NULL,
    `tipoMencao` VARCHAR(191) NOT NULL DEFAULT 'Acompanhar',
    `status` VARCHAR(191) NOT NULL DEFAULT 'Pendente',
    `prazo` DATETIME(3) NULL,
    `observacao` TEXT NULL,
    `lidaEm` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ComentarioInterno` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `modulo` TEXT NOT NULL,
    `registroId` INTEGER NOT NULL,
    `unidade` TEXT NOT NULL,
    `comentario` TEXT NOT NULL,
    `autorId` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CameraMonitoramento` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `numeroCamera` VARCHAR(191) NOT NULL,
    `nomeCamera` TEXT NULL,
    `numeroServidor` TEXT NOT NULL,
    `tipoSistema` VARCHAR(191) NOT NULL DEFAULT 'DIGIFORT',
    `periodoGravacaoDias` INTEGER NOT NULL DEFAULT 0,
    `status` VARCHAR(191) NOT NULL DEFAULT 'Conectada',
    `tecnologia` TEXT NOT NULL,
    `tipoCamera` TEXT NOT NULL,
    `localInstalado` TEXT NOT NULL,
    `areaMonitorada` TEXT NOT NULL,
    `infravermelho` TEXT NOT NULL,
    `monitoramento` VARCHAR(191) NOT NULL DEFAULT 'Ativo',
    `ultimaManutencao` DATETIME(3) NULL,
    `observacoesTecnicas` TEXT NULL,
    `unidade` VARCHAR(191) NOT NULL DEFAULT 'GJA-T1',
    `cadastradoPorId` INTEGER NULL,
    `statusCadastro` VARCHAR(191) NOT NULL DEFAULT 'Ativa',
    `removidaEm` DATETIME(3) NULL,
    `removidaPorId` INTEGER NULL,
    `motivoRemocao` TEXT NULL,
    `desconectadaDesde` DATETIME(3) NULL,
    `totalIndisponibilidade` INTEGER NOT NULL DEFAULT 0,
    `totalFalhas` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `CameraMonitoramento_numeroCamera_unidade_key`(`numeroCamera`, `unidade`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `OrdemServicoCamera` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `numero` INTEGER NOT NULL,
    `ano` INTEGER NOT NULL,
    `codigo` VARCHAR(191) NOT NULL,
    `cameraId` INTEGER NOT NULL,
    `unidade` VARCHAR(191) NOT NULL DEFAULT 'GJA-T1',
    `status` VARCHAR(191) NOT NULL DEFAULT 'EM_ABERTO',
    `origem` VARCHAR(191) NOT NULL DEFAULT 'CAMERA_DESCONECTADA',
    `descricao` TEXT NULL,
    `abertaPorId` INTEGER NULL,
    `atendidoPorId` INTEGER NULL,
    `tratativa` TEXT NULL,
    `houveDano` BOOLEAN NOT NULL DEFAULT false,
    `descricaoDano` TEXT NULL,
    `requerTrocaCamera` BOOLEAN NOT NULL DEFAULT false,
    `requerCompra` BOOLEAN NOT NULL DEFAULT false,
    `itensNecessarios` TEXT NULL,
    `observacoesTecnicas` TEXT NULL,
    `desconectadaEm` DATETIME(3) NULL,
    `atendimentoIniciadoEm` DATETIME(3) NULL,
    `concluidoEm` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `OrdemServicoCamera_cameraId_status_idx`(`cameraId`, `status`),
    INDEX `OrdemServicoCamera_unidade_status_idx`(`unidade`, `status`),
    UNIQUE INDEX `OrdemServicoCamera_codigo_unidade_key`(`codigo`, `unidade`),
    UNIQUE INDEX `OrdemServicoCamera_numero_ano_unidade_key`(`numero`, `ano`, `unidade`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CameraChecklistOperacional` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `cameraId` INTEGER NOT NULL,
    `unidade` VARCHAR(191) NOT NULL DEFAULT 'GJA-T1',
    `responsavelId` INTEGER NOT NULL,
    `statusAtual` TEXT NOT NULL,
    `tempoGravacaoDisponivel` INTEGER NOT NULL,
    `dataInicialGravacao` DATETIME(3) NULL,
    `dataMaisRecenteGravacao` DATETIME(3) NULL,
    `dataDesconexaoManual` DATETIME(3) NULL,
    `dataReconexaoManual` DATETIME(3) NULL,
    `retencaoEstimadaMinutos` INTEGER NULL,
    `retencaoEstimadaTexto` TEXT NULL,
    `qualidadeImagem` TEXT NOT NULL,
    `funcionamentoInfravermelho` TEXT NOT NULL,
    `funcionamentoGravacao` TEXT NOT NULL,
    `comunicacaoServidor` TEXT NOT NULL,
    `instabilidadeDetectada` TEXT NOT NULL,
    `necessidadeManutencao` TEXT NOT NULL,
    `observacoesOperacionais` TEXT NULL,
    `indisponibilidadeMinutos` INTEGER NOT NULL DEFAULT 0,
    `falhaRecorrente` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CameraEventoStatus` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `cameraId` INTEGER NOT NULL,
    `unidade` VARCHAR(191) NOT NULL DEFAULT 'GJA-T1',
    `statusAnterior` TEXT NULL,
    `statusNovo` TEXT NOT NULL,
    `iniciadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `encerradoEm` DATETIME(3) NULL,
    `duracaoIndisponivel` INTEGER NULL,
    `motivo` TEXT NULL,
    `responsavelId` INTEGER NULL,
    `observacao` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RelatorioCftv` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `numero` INTEGER NOT NULL,
    `ano` INTEGER NOT NULL,
    `codigo` VARCHAR(191) NOT NULL,
    `unidade` VARCHAR(191) NOT NULL,
    `responsavelId` INTEGER NULL,
    `camerasIdsJson` TEXT NOT NULL,
    `snapshotJson` TEXT NULL,
    `retencaoMedia` INTEGER NOT NULL DEFAULT 0,
    `totalEventos` INTEGER NOT NULL DEFAULT 0,
    `totalIndisponibilidade` INTEGER NOT NULL DEFAULT 0,
    `totalCameras` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `RelatorioCftv_codigo_unidade_key`(`codigo`, `unidade`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ConfiguracaoSistema` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `chave` VARCHAR(191) NOT NULL,
    `nomeEmpresa` VARCHAR(191) NOT NULL DEFAULT 'Movecta S/A',
    `slaCameras` INTEGER NOT NULL DEFAULT 98,
    `tempoMaximoOffline` INTEGER NOT NULL DEFAULT 60,
    `checklistCameraDias` INTEGER NOT NULL DEFAULT 7,
    `corsPermitido` TEXT NULL,
    `logoUrl` TEXT NULL,
    `rodapePdf` TEXT NULL,
    `ocrProvider` VARCHAR(191) NULL DEFAULT 'openai',
    `openaiApiKey` TEXT NULL,
    `openaiOcrModel` VARCHAR(191) NULL DEFAULT 'gpt-4.1-mini',
    `openaiAprimoramentoTextoAtivo` BOOLEAN NOT NULL DEFAULT false,
    `ssoAtivo` BOOLEAN NOT NULL DEFAULT false,
    `ssoProvider` VARCHAR(191) NULL DEFAULT 'azure-ad',
    `ssoNomeBotao` VARCHAR(191) NULL DEFAULT 'Entrar com conta corporativa',
    `ssoDominioPermitido` TEXT NULL,
    `ssoClientId` TEXT NULL,
    `ssoClientSecret` TEXT NULL,
    `ssoTenantId` TEXT NULL,
    `ssoCallbackUrl` TEXT NULL,
    `ssoFrontendUrl` TEXT NULL,
    `ssoAuthorizationUrl` TEXT NULL,
    `ssoTokenUrl` TEXT NULL,
    `ssoUserInfoUrl` TEXT NULL,
    `ssoLogoutUrl` TEXT NULL,
    `ssoMetadataUrl` TEXT NULL,
    `ssoCertificado` TEXT NULL,
    `ssoModoPermissao` VARCHAR(191) NULL DEFAULT 'perfil_manual',
    `ssoLoginLocalEmergencia` BOOLEAN NOT NULL DEFAULT true,
    `updatedAt` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `ConfiguracaoSistema_chave_key`(`chave`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `NotificacaoLida` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `usuarioId` INTEGER NOT NULL,
    `notificacaoId` VARCHAR(191) NOT NULL,
    `lidaEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `NotificacaoLida_usuarioId_notificacaoId_key`(`usuarioId`, `notificacaoId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SolicitacaoAnulacaoRelatorio` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `modulo` VARCHAR(191) NOT NULL,
    `registroId` INTEGER NOT NULL,
    `codigoRegistro` TEXT NOT NULL,
    `tituloRegistro` TEXT NOT NULL,
    `unidade` TEXT NOT NULL,
    `motivo` TEXT NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'Pendente',
    `solicitanteId` INTEGER NOT NULL,
    `decididoPorId` INTEGER NULL,
    `decisaoMotivo` TEXT NULL,
    `decididoEm` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `SolicitacaoAnulacaoRelatorio_modulo_registroId_status_idx`(`modulo`, `registroId`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AcordoAnulacaoRelatorio` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `solicitacaoId` INTEGER NOT NULL,
    `analistaId` INTEGER NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'Pendente',
    `observacao` TEXT NULL,
    `decididoEm` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `AcordoAnulacaoRelatorio_solicitacaoId_analistaId_key`(`solicitacaoId`, `analistaId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PlanejamentoColuna` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `titulo` TEXT NOT NULL,
    `unidade` VARCHAR(191) NOT NULL,
    `ordem` INTEGER NOT NULL DEFAULT 0,
    `cor` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `PlanejamentoColuna_unidade_ordem_idx`(`unidade`, `ordem`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PlanejamentoCard` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `titulo` TEXT NOT NULL,
    `descricao` TEXT NULL,
    `prioridade` VARCHAR(191) NOT NULL DEFAULT 'Media',
    `prazo` DATETIME(3) NULL,
    `unidade` VARCHAR(191) NOT NULL,
    `setor` TEXT NULL,
    `local` TEXT NULL,
    `moduloVinculado` TEXT NULL,
    `registroId` INTEGER NULL,
    `codigoRegistro` TEXT NULL,
    `ordem` INTEGER NOT NULL DEFAULT 0,
    `status` VARCHAR(191) NOT NULL DEFAULT 'Ativo',
    `colunaId` INTEGER NOT NULL,
    `responsavelId` INTEGER NULL,
    `criadoPorId` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `PlanejamentoCard_unidade_colunaId_ordem_idx`(`unidade`, `colunaId`, `ordem`),
    INDEX `PlanejamentoCard_responsavelId_idx`(`responsavelId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TreinamentoPocSep002` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `token` VARCHAR(191) NOT NULL,
    `usuarioId` INTEGER NULL,
    `codigo` VARCHAR(191) NULL,
    `nomeCompleto` TEXT NOT NULL,
    `cpf` VARCHAR(191) NULL,
    `email` VARCHAR(191) NOT NULL,
    `cargo` TEXT NULL,
    `departamento` TEXT NULL,
    `unidade` TEXT NULL,
    `empresa` TEXT NULL,
    `etapaAtual` INTEGER NOT NULL DEFAULT 1,
    `status` VARCHAR(191) NOT NULL DEFAULT 'Em andamento',
    `porcentagem` INTEGER NOT NULL DEFAULT 0,
    `nota` DOUBLE NULL,
    `tentativas` INTEGER NOT NULL DEFAULT 0,
    `respostasQuiz` TEXT NULL,
    `assinaturaDataUrl` LONGTEXT NULL,
    `certificadoArquivo` TEXT NULL,
    `emailStatus` TEXT NULL,
    `emailEnviadoEm` DATETIME(3) NULL,
    `ipInicio` TEXT NULL,
    `navegador` TEXT NULL,
    `sistema` TEXT NULL,
    `dataInicio` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `dataConclusao` DATETIME(3) NULL,
    `ultimoAcessoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `TreinamentoPocSep002_token_key`(`token`),
    UNIQUE INDEX `TreinamentoPocSep002_codigo_key`(`codigo`),
    INDEX `TreinamentoPocSep002_email_idx`(`email`),
    INDEX `TreinamentoPocSep002_cpf_idx`(`cpf`),
    INDEX `TreinamentoPocSep002_status_updatedAt_idx`(`status`, `updatedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TreinamentoPocSep003` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `token` VARCHAR(191) NOT NULL,
    `usuarioId` INTEGER NULL,
    `codigo` VARCHAR(191) NULL,
    `nomeCompleto` TEXT NOT NULL,
    `cpf` VARCHAR(191) NULL,
    `email` VARCHAR(191) NOT NULL,
    `cargo` TEXT NULL,
    `departamento` TEXT NULL,
    `unidade` TEXT NULL,
    `empresa` TEXT NULL,
    `etapaAtual` INTEGER NOT NULL DEFAULT 1,
    `status` VARCHAR(191) NOT NULL DEFAULT 'Em andamento',
    `porcentagem` INTEGER NOT NULL DEFAULT 0,
    `nota` DOUBLE NULL,
    `tentativas` INTEGER NOT NULL DEFAULT 0,
    `respostasQuiz` TEXT NULL,
    `assinaturaDataUrl` LONGTEXT NULL,
    `certificadoArquivo` TEXT NULL,
    `emailStatus` TEXT NULL,
    `emailEnviadoEm` DATETIME(3) NULL,
    `ipInicio` TEXT NULL,
    `navegador` TEXT NULL,
    `sistema` TEXT NULL,
    `dataInicio` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `dataConclusao` DATETIME(3) NULL,
    `ultimoAcessoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `TreinamentoPocSep003_token_key`(`token`),
    UNIQUE INDEX `TreinamentoPocSep003_codigo_key`(`codigo`),
    INDEX `TreinamentoPocSep003_email_idx`(`email`),
    INDEX `TreinamentoPocSep003_cpf_idx`(`cpf`),
    INDEX `TreinamentoPocSep003_status_updatedAt_idx`(`status`, `updatedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TreinamentoPocSep004` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `token` VARCHAR(191) NOT NULL,
    `usuarioId` INTEGER NULL,
    `codigo` VARCHAR(191) NULL,
    `nomeCompleto` TEXT NOT NULL,
    `cpf` VARCHAR(191) NULL,
    `email` VARCHAR(191) NOT NULL,
    `cargo` TEXT NULL,
    `departamento` TEXT NULL,
    `unidade` TEXT NULL,
    `empresa` TEXT NULL,
    `etapaAtual` INTEGER NOT NULL DEFAULT 1,
    `status` VARCHAR(191) NOT NULL DEFAULT 'Em andamento',
    `porcentagem` INTEGER NOT NULL DEFAULT 0,
    `nota` DOUBLE NULL,
    `tentativas` INTEGER NOT NULL DEFAULT 0,
    `respostasQuiz` TEXT NULL,
    `assinaturaDataUrl` LONGTEXT NULL,
    `certificadoArquivo` TEXT NULL,
    `emailStatus` TEXT NULL,
    `emailEnviadoEm` DATETIME(3) NULL,
    `ipInicio` TEXT NULL,
    `navegador` TEXT NULL,
    `sistema` TEXT NULL,
    `dataInicio` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `dataConclusao` DATETIME(3) NULL,
    `ultimoAcessoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `TreinamentoPocSep004_token_key`(`token`),
    UNIQUE INDEX `TreinamentoPocSep004_codigo_key`(`codigo`),
    INDEX `TreinamentoPocSep004_email_idx`(`email`),
    INDEX `TreinamentoPocSep004_cpf_idx`(`cpf`),
    INDEX `TreinamentoPocSep004_status_updatedAt_idx`(`status`, `updatedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TreinamentoPocSep005` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `token` VARCHAR(191) NOT NULL,
    `usuarioId` INTEGER NULL,
    `codigo` VARCHAR(191) NULL,
    `nomeCompleto` TEXT NOT NULL,
    `cpf` VARCHAR(191) NULL,
    `email` VARCHAR(191) NOT NULL,
    `cargo` TEXT NULL,
    `departamento` TEXT NULL,
    `unidade` TEXT NULL,
    `empresa` TEXT NULL,
    `etapaAtual` INTEGER NOT NULL DEFAULT 1,
    `status` VARCHAR(191) NOT NULL DEFAULT 'Em andamento',
    `porcentagem` INTEGER NOT NULL DEFAULT 0,
    `nota` DOUBLE NULL,
    `tentativas` INTEGER NOT NULL DEFAULT 0,
    `respostasQuiz` TEXT NULL,
    `assinaturaDataUrl` LONGTEXT NULL,
    `certificadoArquivo` TEXT NULL,
    `emailStatus` TEXT NULL,
    `emailEnviadoEm` DATETIME(3) NULL,
    `ipInicio` TEXT NULL,
    `navegador` TEXT NULL,
    `sistema` TEXT NULL,
    `dataInicio` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `dataConclusao` DATETIME(3) NULL,
    `ultimoAcessoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `TreinamentoPocSep005_token_key`(`token`),
    UNIQUE INDEX `TreinamentoPocSep005_codigo_key`(`codigo`),
    INDEX `TreinamentoPocSep005_email_idx`(`email`),
    INDEX `TreinamentoPocSep005_cpf_idx`(`cpf`),
    INDEX `TreinamentoPocSep005_status_updatedAt_idx`(`status`, `updatedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TreinamentoPocSep006` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `token` VARCHAR(191) NOT NULL,
    `usuarioId` INTEGER NULL,
    `codigo` VARCHAR(191) NULL,
    `nomeCompleto` TEXT NOT NULL,
    `cpf` VARCHAR(191) NULL,
    `email` VARCHAR(191) NOT NULL,
    `cargo` TEXT NULL,
    `departamento` TEXT NULL,
    `unidade` TEXT NULL,
    `empresa` TEXT NULL,
    `etapaAtual` INTEGER NOT NULL DEFAULT 1,
    `status` VARCHAR(191) NOT NULL DEFAULT 'Em andamento',
    `porcentagem` INTEGER NOT NULL DEFAULT 0,
    `nota` DOUBLE NULL,
    `tentativas` INTEGER NOT NULL DEFAULT 0,
    `respostasQuiz` TEXT NULL,
    `assinaturaDataUrl` LONGTEXT NULL,
    `certificadoArquivo` TEXT NULL,
    `emailStatus` TEXT NULL,
    `emailEnviadoEm` DATETIME(3) NULL,
    `ipInicio` TEXT NULL,
    `navegador` TEXT NULL,
    `sistema` TEXT NULL,
    `dataInicio` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `dataConclusao` DATETIME(3) NULL,
    `ultimoAcessoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `TreinamentoPocSep006_token_key`(`token`),
    UNIQUE INDEX `TreinamentoPocSep006_codigo_key`(`codigo`),
    INDEX `TreinamentoPocSep006_email_idx`(`email`),
    INDEX `TreinamentoPocSep006_cpf_idx`(`cpf`),
    INDEX `TreinamentoPocSep006_status_updatedAt_idx`(`status`, `updatedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TreinamentoModelo` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `codigo` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `tipo` TEXT NOT NULL,
    `nome` TEXT NOT NULL,
    `descricao` TEXT NULL,
    `subtitulo` TEXT NULL,
    `notaMinima` INTEGER NOT NULL DEFAULT 80,
    `validadeMeses` INTEGER NOT NULL DEFAULT 24,
    `textoCertificado` TEXT NULL,
    `gruposPermitidosJson` VARCHAR(191) NOT NULL DEFAULT '[]',
    `versao` INTEGER NOT NULL DEFAULT 1,
    `status` VARCHAR(191) NOT NULL DEFAULT 'Rascunho',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `TreinamentoModelo_codigo_key`(`codigo`),
    UNIQUE INDEX `TreinamentoModelo_slug_key`(`slug`),
    INDEX `TreinamentoModelo_status_updatedAt_idx`(`status`, `updatedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TreinamentoModeloEtapa` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `treinamentoId` INTEGER NOT NULL,
    `ordem` INTEGER NOT NULL,
    `titulo` TEXT NOT NULL,
    `objetivo` TEXT NULL,
    `conteudo` TEXT NOT NULL,
    `topicosJson` VARCHAR(191) NOT NULL DEFAULT '[]',
    `atencao` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `TreinamentoModeloEtapa_treinamentoId_idx`(`treinamentoId`),
    UNIQUE INDEX `TreinamentoModeloEtapa_treinamentoId_ordem_key`(`treinamentoId`, `ordem`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TreinamentoModeloPergunta` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `treinamentoId` INTEGER NOT NULL,
    `etapaId` INTEGER NULL,
    `ordem` INTEGER NOT NULL,
    `pergunta` TEXT NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `TreinamentoModeloPergunta_treinamentoId_idx`(`treinamentoId`),
    INDEX `TreinamentoModeloPergunta_etapaId_idx`(`etapaId`),
    UNIQUE INDEX `TreinamentoModeloPergunta_treinamentoId_ordem_key`(`treinamentoId`, `ordem`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TreinamentoModeloAlternativa` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `perguntaId` INTEGER NOT NULL,
    `ordem` INTEGER NOT NULL,
    `texto` TEXT NOT NULL,
    `correta` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `TreinamentoModeloAlternativa_perguntaId_idx`(`perguntaId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TreinamentoModeloParticipante` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `treinamentoId` INTEGER NOT NULL,
    `token` VARCHAR(191) NOT NULL,
    `usuarioId` INTEGER NULL,
    `codigo` VARCHAR(191) NULL,
    `nomeCompleto` TEXT NOT NULL,
    `cpf` VARCHAR(191) NULL,
    `email` VARCHAR(191) NOT NULL,
    `cargo` TEXT NULL,
    `departamento` TEXT NULL,
    `unidade` TEXT NULL,
    `empresa` TEXT NULL,
    `etapaAtual` INTEGER NOT NULL DEFAULT 1,
    `status` VARCHAR(191) NOT NULL DEFAULT 'Em andamento',
    `porcentagem` INTEGER NOT NULL DEFAULT 0,
    `nota` DOUBLE NULL,
    `tentativas` INTEGER NOT NULL DEFAULT 0,
    `respostasQuiz` TEXT NULL,
    `avaliacaoTreinamentoJson` TEXT NULL,
    `avaliacaoTreinamentoEm` DATETIME(3) NULL,
    `versao` INTEGER NOT NULL DEFAULT 1,
    `snapshotJson` TEXT NULL,
    `assinaturaDataUrl` LONGTEXT NULL,
    `certificadoArquivo` TEXT NULL,
    `emailStatus` TEXT NULL,
    `emailEnviadoEm` DATETIME(3) NULL,
    `ipInicio` TEXT NULL,
    `navegador` TEXT NULL,
    `sistema` TEXT NULL,
    `dataInicio` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `dataConclusao` DATETIME(3) NULL,
    `ultimoAcessoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `TreinamentoModeloParticipante_token_key`(`token`),
    UNIQUE INDEX `TreinamentoModeloParticipante_codigo_key`(`codigo`),
    INDEX `TreinamentoModeloParticipante_treinamentoId_status_updatedAt_idx`(`treinamentoId`, `status`, `updatedAt`),
    INDEX `TreinamentoModeloParticipante_email_idx`(`email`),
    INDEX `TreinamentoModeloParticipante_cpf_idx`(`cpf`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `SessaoUsuario` ADD CONSTRAINT `SessaoUsuario_usuarioId_fkey` FOREIGN KEY (`usuarioId`) REFERENCES `Usuario`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SugestaoMelhoria` ADD CONSTRAINT `SugestaoMelhoria_autorId_fkey` FOREIGN KEY (`autorId`) REFERENCES `Usuario`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SugestaoMelhoria` ADD CONSTRAINT `SugestaoMelhoria_avaliadoPorId_fkey` FOREIGN KEY (`avaliadoPorId`) REFERENCES `Usuario`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EnvolvidoOcorrencia` ADD CONSTRAINT `EnvolvidoOcorrencia_ocorrenciaId_fkey` FOREIGN KEY (`ocorrenciaId`) REFERENCES `Ocorrencia`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AnexoOcorrencia` ADD CONSTRAINT `AnexoOcorrencia_ocorrenciaId_fkey` FOREIGN KEY (`ocorrenciaId`) REFERENCES `Ocorrencia`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EnvolvidoEvento` ADD CONSTRAINT `EnvolvidoEvento_eventoId_fkey` FOREIGN KEY (`eventoId`) REFERENCES `Evento`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AnexoEvento` ADD CONSTRAINT `AnexoEvento_eventoId_fkey` FOREIGN KEY (`eventoId`) REFERENCES `Evento`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RelatoCampo` ADD CONSTRAINT `RelatoCampo_geradoPorId_fkey` FOREIGN KEY (`geradoPorId`) REFERENCES `Usuario`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EnvolvidoRelatoCampo` ADD CONSTRAINT `EnvolvidoRelatoCampo_relatoCampoId_fkey` FOREIGN KEY (`relatoCampoId`) REFERENCES `RelatoCampo`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AnexoRelatoCampo` ADD CONSTRAINT `AnexoRelatoCampo_relatoCampoId_fkey` FOREIGN KEY (`relatoCampoId`) REFERENCES `RelatoCampo`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Investigacao` ADD CONSTRAINT `Investigacao_ocorrenciaId_fkey` FOREIGN KEY (`ocorrenciaId`) REFERENCES `Ocorrencia`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Investigacao` ADD CONSTRAINT `Investigacao_responsavelId_fkey` FOREIGN KEY (`responsavelId`) REFERENCES `Usuario`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SubNatureza` ADD CONSTRAINT `SubNatureza_naturezaId_fkey` FOREIGN KEY (`naturezaId`) REFERENCES `Natureza`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `QuadraSegurancaContainer` ADD CONSTRAINT `QuadraSegurancaContainer_criadoPorId_fkey` FOREIGN KEY (`criadoPorId`) REFERENCES `Usuario`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `QuadraSegurancaContainer` ADD CONSTRAINT `QuadraSegurancaContainer_atualizadoPorId_fkey` FOREIGN KEY (`atualizadoPorId`) REFERENCES `Usuario`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `QuadraSegurancaAnexo` ADD CONSTRAINT `QuadraSegurancaAnexo_containerId_fkey` FOREIGN KEY (`containerId`) REFERENCES `QuadraSegurancaContainer`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `QuadraSegurancaAnexo` ADD CONSTRAINT `QuadraSegurancaAnexo_usuarioId_fkey` FOREIGN KEY (`usuarioId`) REFERENCES `Usuario`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DispositivoAutorizado` ADD CONSTRAINT `DispositivoAutorizado_usuarioId_fkey` FOREIGN KEY (`usuarioId`) REFERENCES `Usuario`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `QuadraSegurancaHistorico` ADD CONSTRAINT `QuadraSegurancaHistorico_containerId_fkey` FOREIGN KEY (`containerId`) REFERENCES `QuadraSegurancaContainer`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `QuadraSegurancaHistorico` ADD CONSTRAINT `QuadraSegurancaHistorico_usuarioId_fkey` FOREIGN KEY (`usuarioId`) REFERENCES `Usuario`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AnaliseOcorrencia` ADD CONSTRAINT `AnaliseOcorrencia_ocorrenciaId_fkey` FOREIGN KEY (`ocorrenciaId`) REFERENCES `Ocorrencia`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AnaliseOcorrencia` ADD CONSTRAINT `AnaliseOcorrencia_responsavelId_fkey` FOREIGN KEY (`responsavelId`) REFERENCES `Usuario`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AnaliseOcorrencia` ADD CONSTRAINT `AnaliseOcorrencia_concluidoPorId_fkey` FOREIGN KEY (`concluidoPorId`) REFERENCES `Usuario`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AnaliseEvento` ADD CONSTRAINT `AnaliseEvento_eventoId_fkey` FOREIGN KEY (`eventoId`) REFERENCES `Evento`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AnaliseEvento` ADD CONSTRAINT `AnaliseEvento_responsavelId_fkey` FOREIGN KEY (`responsavelId`) REFERENCES `Usuario`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AnaliseEvento` ADD CONSTRAINT `AnaliseEvento_concluidoPorId_fkey` FOREIGN KEY (`concluidoPorId`) REFERENCES `Usuario`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LogAuditoria` ADD CONSTRAINT `LogAuditoria_usuarioId_fkey` FOREIGN KEY (`usuarioId`) REFERENCES `Usuario`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AssinaturaDocumento` ADD CONSTRAINT `AssinaturaDocumento_usuarioId_fkey` FOREIGN KEY (`usuarioId`) REFERENCES `Usuario`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RascunhoFormulario` ADD CONSTRAINT `RascunhoFormulario_usuarioId_fkey` FOREIGN KEY (`usuarioId`) REFERENCES `Usuario`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AnaliseRisco` ADD CONSTRAINT `AnaliseRisco_responsavelId_fkey` FOREIGN KEY (`responsavelId`) REFERENCES `Usuario`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AnaliseRisco` ADD CONSTRAINT `AnaliseRisco_responsavelAcaoId_fkey` FOREIGN KEY (`responsavelAcaoId`) REFERENCES `Usuario`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AnaliseRisco` ADD CONSTRAINT `AnaliseRisco_riscoCatalogoId_fkey` FOREIGN KEY (`riscoCatalogoId`) REFERENCES `RiscoCatalogo`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AnaliseRisco` ADD CONSTRAINT `AnaliseRisco_ocorrenciaId_fkey` FOREIGN KEY (`ocorrenciaId`) REFERENCES `Ocorrencia`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AnaliseRisco` ADD CONSTRAINT `AnaliseRisco_eventoId_fkey` FOREIGN KEY (`eventoId`) REFERENCES `Evento`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AnaliseRisco` ADD CONSTRAINT `AnaliseRisco_investigacaoId_fkey` FOREIGN KEY (`investigacaoId`) REFERENCES `Investigacao`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FotoRisco` ADD CONSTRAINT `FotoRisco_analiseRiscoId_fkey` FOREIGN KEY (`analiseRiscoId`) REFERENCES `AnaliseRisco`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RiscoSetor` ADD CONSTRAINT `RiscoSetor_macroProcessoId_fkey` FOREIGN KEY (`macroProcessoId`) REFERENCES `RiscoMacroProcesso`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AprAprovacao` ADD CONSTRAINT `AprAprovacao_aprId_fkey` FOREIGN KEY (`aprId`) REFERENCES `AprOperacional`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AnaliseEstrategica` ADD CONSTRAINT `AnaliseEstrategica_responsavelId_fkey` FOREIGN KEY (`responsavelId`) REFERENCES `Usuario`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PlanoAcaoCorporativo` ADD CONSTRAINT `PlanoAcaoCorporativo_responsavelId_fkey` FOREIGN KEY (`responsavelId`) REFERENCES `Usuario`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ChecklistInspecao` ADD CONSTRAINT `ChecklistInspecao_responsavelId_fkey` FOREIGN KEY (`responsavelId`) REFERENCES `Usuario`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ChecklistItem` ADD CONSTRAINT `ChecklistItem_checklistId_fkey` FOREIGN KEY (`checklistId`) REFERENCES `ChecklistInspecao`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PassagemTurno` ADD CONSTRAINT `PassagemTurno_responsavelId_fkey` FOREIGN KEY (`responsavelId`) REFERENCES `Usuario`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PassagemTurnoPosto` ADD CONSTRAINT `PassagemTurnoPosto_passagemId_fkey` FOREIGN KEY (`passagemId`) REFERENCES `PassagemTurno`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RelatorioDiarioExecutivo` ADD CONSTRAINT `RelatorioDiarioExecutivo_responsavelId_fkey` FOREIGN KEY (`responsavelId`) REFERENCES `Usuario`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Mencao` ADD CONSTRAINT `Mencao_usuarioMencionadoId_fkey` FOREIGN KEY (`usuarioMencionadoId`) REFERENCES `Usuario`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Mencao` ADD CONSTRAINT `Mencao_autorId_fkey` FOREIGN KEY (`autorId`) REFERENCES `Usuario`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ComentarioInterno` ADD CONSTRAINT `ComentarioInterno_autorId_fkey` FOREIGN KEY (`autorId`) REFERENCES `Usuario`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CameraMonitoramento` ADD CONSTRAINT `CameraMonitoramento_cadastradoPorId_fkey` FOREIGN KEY (`cadastradoPorId`) REFERENCES `Usuario`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `OrdemServicoCamera` ADD CONSTRAINT `OrdemServicoCamera_cameraId_fkey` FOREIGN KEY (`cameraId`) REFERENCES `CameraMonitoramento`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `OrdemServicoCamera` ADD CONSTRAINT `OrdemServicoCamera_abertaPorId_fkey` FOREIGN KEY (`abertaPorId`) REFERENCES `Usuario`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `OrdemServicoCamera` ADD CONSTRAINT `OrdemServicoCamera_atendidoPorId_fkey` FOREIGN KEY (`atendidoPorId`) REFERENCES `Usuario`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CameraChecklistOperacional` ADD CONSTRAINT `CameraChecklistOperacional_cameraId_fkey` FOREIGN KEY (`cameraId`) REFERENCES `CameraMonitoramento`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CameraChecklistOperacional` ADD CONSTRAINT `CameraChecklistOperacional_responsavelId_fkey` FOREIGN KEY (`responsavelId`) REFERENCES `Usuario`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CameraEventoStatus` ADD CONSTRAINT `CameraEventoStatus_cameraId_fkey` FOREIGN KEY (`cameraId`) REFERENCES `CameraMonitoramento`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RelatorioCftv` ADD CONSTRAINT `RelatorioCftv_responsavelId_fkey` FOREIGN KEY (`responsavelId`) REFERENCES `Usuario`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `NotificacaoLida` ADD CONSTRAINT `NotificacaoLida_usuarioId_fkey` FOREIGN KEY (`usuarioId`) REFERENCES `Usuario`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SolicitacaoAnulacaoRelatorio` ADD CONSTRAINT `SolicitacaoAnulacaoRelatorio_solicitanteId_fkey` FOREIGN KEY (`solicitanteId`) REFERENCES `Usuario`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SolicitacaoAnulacaoRelatorio` ADD CONSTRAINT `SolicitacaoAnulacaoRelatorio_decididoPorId_fkey` FOREIGN KEY (`decididoPorId`) REFERENCES `Usuario`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AcordoAnulacaoRelatorio` ADD CONSTRAINT `AcordoAnulacaoRelatorio_solicitacaoId_fkey` FOREIGN KEY (`solicitacaoId`) REFERENCES `SolicitacaoAnulacaoRelatorio`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AcordoAnulacaoRelatorio` ADD CONSTRAINT `AcordoAnulacaoRelatorio_analistaId_fkey` FOREIGN KEY (`analistaId`) REFERENCES `Usuario`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PlanejamentoCard` ADD CONSTRAINT `PlanejamentoCard_colunaId_fkey` FOREIGN KEY (`colunaId`) REFERENCES `PlanejamentoColuna`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PlanejamentoCard` ADD CONSTRAINT `PlanejamentoCard_responsavelId_fkey` FOREIGN KEY (`responsavelId`) REFERENCES `Usuario`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PlanejamentoCard` ADD CONSTRAINT `PlanejamentoCard_criadoPorId_fkey` FOREIGN KEY (`criadoPorId`) REFERENCES `Usuario`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TreinamentoModeloEtapa` ADD CONSTRAINT `TreinamentoModeloEtapa_treinamentoId_fkey` FOREIGN KEY (`treinamentoId`) REFERENCES `TreinamentoModelo`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TreinamentoModeloPergunta` ADD CONSTRAINT `TreinamentoModeloPergunta_treinamentoId_fkey` FOREIGN KEY (`treinamentoId`) REFERENCES `TreinamentoModelo`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TreinamentoModeloPergunta` ADD CONSTRAINT `TreinamentoModeloPergunta_etapaId_fkey` FOREIGN KEY (`etapaId`) REFERENCES `TreinamentoModeloEtapa`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TreinamentoModeloAlternativa` ADD CONSTRAINT `TreinamentoModeloAlternativa_perguntaId_fkey` FOREIGN KEY (`perguntaId`) REFERENCES `TreinamentoModeloPergunta`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TreinamentoModeloParticipante` ADD CONSTRAINT `TreinamentoModeloParticipante_treinamentoId_fkey` FOREIGN KEY (`treinamentoId`) REFERENCES `TreinamentoModelo`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
