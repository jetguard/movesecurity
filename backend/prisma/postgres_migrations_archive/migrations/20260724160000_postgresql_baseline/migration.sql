-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "Usuario" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "senha" TEXT NOT NULL,
    "apelido" TEXT,
    "fotoPerfil" TEXT,
    "re" TEXT,
    "setor" TEXT,
    "cargo" TEXT,
    "empresa" TEXT,
    "equipe" TEXT,
    "unidade" TEXT,
    "unidadesPermitidas" TEXT,
    "perfilAcesso" TEXT NOT NULL DEFAULT 'USUARIO',
    "statusUsuario" TEXT NOT NULL DEFAULT 'ATIVO',
    "deveAlterarSenha" BOOLEAN NOT NULL DEFAULT true,
    "senhaAlteradaEm" TIMESTAMP(3),
    "pinOperacionalHash" TEXT,
    "pinOperacionalCriadoEm" TIMESTAMP(3),
    "pinOperacionalAtualizadoEm" TIMESTAMP(3),
    "pinTentativasInvalidas" INTEGER NOT NULL DEFAULT 0,
    "pinBloqueadoAte" TIMESTAMP(3),
    "ultimoAcesso" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TreinamentoTerminal" (
    "id" SERIAL NOT NULL,
    "token" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "nomeCompleto" TEXT NOT NULL,
    "cpf" TEXT NOT NULL,
    "dataNascimento" TIMESTAMP(3) NOT NULL,
    "empresa" TEXT NOT NULL,
    "cargo" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "telefone" TEXT NOT NULL,
    "etapa" TEXT NOT NULL DEFAULT 'video',
    "status" TEXT NOT NULL DEFAULT 'Em andamento',
    "videoUrl" TEXT,
    "progressoSegundos" INTEGER NOT NULL DEFAULT 0,
    "duracaoSegundos" INTEGER NOT NULL DEFAULT 0,
    "videoConcluido" BOOLEAN NOT NULL DEFAULT false,
    "aceiteDeclaracao" BOOLEAN NOT NULL DEFAULT false,
    "assinaturaDataUrl" TEXT,
    "certificadoArquivo" TEXT,
    "emailStatus" TEXT,
    "emailEnviadoEm" TIMESTAMP(3),
    "concluidoEm" TIMESTAMP(3),
    "ultimoAcessoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TreinamentoTerminal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SessaoUsuario" (
    "id" TEXT NOT NULL,
    "usuarioId" INTEGER NOT NULL,
    "tokenHash" TEXT,
    "refreshTokenHash" TEXT,
    "refreshExpiraEm" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'ATIVA',
    "unidadeAtiva" TEXT,
    "equipe" TEXT,
    "perfilAcesso" TEXT,
    "ipInicio" TEXT,
    "ipUltimaAtividade" TEXT,
    "navegador" TEXT,
    "sistema" TEXT,
    "iniciadaEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ultimaAtividadeEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "encerradaEm" TIMESTAMP(3),
    "encerradaPor" TEXT,
    "encerradaPorId" INTEGER,
    "motivoEncerramento" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SessaoUsuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SugestaoMelhoria" (
    "id" SERIAL NOT NULL,
    "assunto" TEXT NOT NULL,
    "sugestao" TEXT NOT NULL,
    "printTela" TEXT,
    "nomeArquivo" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Recebida',
    "resposta" TEXT,
    "unidade" TEXT NOT NULL DEFAULT 'GJA-T1',
    "autorId" INTEGER NOT NULL,
    "avaliadoPorId" INTEGER,
    "avaliadoEm" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SugestaoMelhoria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ocorrencia" (
    "id" SERIAL NOT NULL,
    "numero" INTEGER NOT NULL,
    "ano" INTEGER NOT NULL,
    "codigo" TEXT NOT NULL,
    "assunto" TEXT NOT NULL,
    "local" TEXT NOT NULL,
    "unidade" TEXT NOT NULL DEFAULT 'GJA-T1',
    "natureza" TEXT NOT NULL,
    "subNatureza" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ABERTO',
    "dataOcorrencia" TIMESTAMP(3) NOT NULL,
    "relatoSeguranca" TEXT,
    "acoesTomadas" TEXT,
    "impactoOperacional" TEXT,
    "fluxoStatus" TEXT NOT NULL DEFAULT 'Aguardando Revisao',
    "revisadoPorId" INTEGER,
    "revisadoEm" TIMESTAMP(3),
    "aprovadoPorId" INTEGER,
    "aprovadoEm" TIMESTAMP(3),
    "motivoDevolucao" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Ocorrencia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EnvolvidoOcorrencia" (
    "id" SERIAL NOT NULL,
    "ocorrenciaId" INTEGER NOT NULL,
    "tipoEnvolvimento" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "tipoDocumento" TEXT NOT NULL,
    "documento" TEXT NOT NULL,
    "empresa" TEXT,
    "possuiVeiculo" BOOLEAN NOT NULL DEFAULT false,
    "placa" TEXT,
    "reboque" TEXT,
    "relato" TEXT NOT NULL,

    CONSTRAINT "EnvolvidoOcorrencia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnexoOcorrencia" (
    "id" SERIAL NOT NULL,
    "ocorrenciaId" INTEGER NOT NULL,
    "nomeOriginal" TEXT NOT NULL,
    "nomeArquivo" TEXT NOT NULL,
    "caminho" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "hashArquivo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnexoOcorrencia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Evento" (
    "id" SERIAL NOT NULL,
    "numero" INTEGER NOT NULL,
    "ano" INTEGER NOT NULL,
    "codigo" TEXT NOT NULL,
    "assunto" TEXT NOT NULL,
    "local" TEXT NOT NULL,
    "unidade" TEXT NOT NULL DEFAULT 'GJA-T1',
    "natureza" TEXT NOT NULL,
    "subNatureza" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ABERTO',
    "dataEvento" TIMESTAMP(3) NOT NULL,
    "relatoSeguranca" TEXT,
    "acoesTomadas" TEXT,
    "impactoOperacional" TEXT,
    "fluxoStatus" TEXT NOT NULL DEFAULT 'Aguardando Revisao',
    "revisadoPorId" INTEGER,
    "revisadoEm" TIMESTAMP(3),
    "aprovadoPorId" INTEGER,
    "aprovadoEm" TIMESTAMP(3),
    "motivoDevolucao" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Evento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EnvolvidoEvento" (
    "id" SERIAL NOT NULL,
    "eventoId" INTEGER NOT NULL,
    "tipoEnvolvimento" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "tipoDocumento" TEXT NOT NULL,
    "documento" TEXT NOT NULL,
    "empresa" TEXT,
    "possuiVeiculo" BOOLEAN NOT NULL DEFAULT false,
    "placa" TEXT,
    "reboque" TEXT,
    "relato" TEXT NOT NULL,

    CONSTRAINT "EnvolvidoEvento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnexoEvento" (
    "id" SERIAL NOT NULL,
    "eventoId" INTEGER NOT NULL,
    "nomeOriginal" TEXT NOT NULL,
    "nomeArquivo" TEXT NOT NULL,
    "caminho" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "hashArquivo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnexoEvento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RelatoCampo" (
    "id" SERIAL NOT NULL,
    "token" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Link Gerado',
    "titulo" TEXT,
    "setor" TEXT,
    "local" TEXT,
    "unidade" TEXT NOT NULL DEFAULT 'GJA-T1',
    "responsavelColeta" TEXT,
    "dataOcorrido" TIMESTAMP(3),
    "observacoes" TEXT,
    "checklistColeta" TEXT,
    "expiraEm" TIMESTAMP(3) NOT NULL,
    "enviadoEm" TIMESTAMP(3),
    "finalizadoEm" TIMESTAMP(3),
    "convertidoTipo" TEXT,
    "convertidoRegistroId" INTEGER,
    "convertidoCodigo" TEXT,
    "geradoPorId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RelatoCampo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EnvolvidoRelatoCampo" (
    "id" SERIAL NOT NULL,
    "relatoCampoId" INTEGER NOT NULL,
    "tipoEnvolvimento" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "tipoDocumento" TEXT NOT NULL,
    "documento" TEXT,
    "empresa" TEXT,
    "possuiVeiculo" BOOLEAN NOT NULL DEFAULT false,
    "placa" TEXT,
    "reboque" TEXT,
    "relato" TEXT NOT NULL,
    "audioCaminho" TEXT,
    "audioNome" TEXT,
    "audioTipo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EnvolvidoRelatoCampo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnexoRelatoCampo" (
    "id" SERIAL NOT NULL,
    "relatoCampoId" INTEGER NOT NULL,
    "nomeOriginal" TEXT NOT NULL,
    "nomeArquivo" TEXT NOT NULL,
    "caminho" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "categoria" TEXT NOT NULL DEFAULT 'Evidencia',
    "hashArquivo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnexoRelatoCampo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Investigacao" (
    "id" SERIAL NOT NULL,
    "ocorrenciaId" INTEGER NOT NULL,
    "numero" INTEGER,
    "ano" INTEGER,
    "codigo" TEXT,
    "titulo" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Em Análise',
    "numeroOcorrencia" TEXT NOT NULL,
    "assunto" TEXT NOT NULL,
    "local" TEXT NOT NULL,
    "unidade" TEXT NOT NULL DEFAULT 'GJA-T1',
    "natureza" TEXT NOT NULL,
    "subNatureza" TEXT NOT NULL,
    "dataOcorrencia" TIMESTAMP(3) NOT NULL,
    "relatoSeguranca" TEXT,
    "fluxoStatus" TEXT NOT NULL DEFAULT 'Aguardando Revisao',
    "revisadoPorId" INTEGER,
    "revisadoEm" TIMESTAMP(3),
    "aprovadoPorId" INTEGER,
    "aprovadoEm" TIMESTAMP(3),
    "motivoDevolucao" TEXT,
    "descricaoInvestigacao" TEXT,
    "conclusaoFatos" TEXT,
    "responsavelId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Investigacao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Natureza" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Natureza_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubNatureza" (
    "id" SERIAL NOT NULL,
    "naturezaId" INTEGER NOT NULL,
    "nome" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SubNatureza_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LocalTerminal" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "tipo" TEXT NOT NULL,
    "areaSensivel" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'Ativo',
    "unidade" TEXT NOT NULL DEFAULT 'GJA-T1',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LocalTerminal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuadraSegurancaContainer" (
    "id" SERIAL NOT NULL,
    "numeroContainer" TEXT NOT NULL,
    "unidade" TEXT NOT NULL DEFAULT 'GJA-T1',
    "dataHoraEntrada" TIMESTAMP(3) NOT NULL,
    "dataHoraSaida" TIMESTAMP(3),
    "posicionamento" TEXT,
    "tipoContainer" TEXT NOT NULL,
    "dimensao" TEXT NOT NULL,
    "destino" TEXT NOT NULL,
    "scannerEntrada" BOOLEAN NOT NULL DEFAULT false,
    "scannerSaida" BOOLEAN,
    "estufadoTerminal" BOOLEAN NOT NULL DEFAULT false,
    "numeroLacre" TEXT,
    "novoLacre" TEXT,
    "armador" TEXT,
    "transportadora" TEXT,
    "motoristaResponsavel" TEXT,
    "documentoMotorista" TEXT,
    "placaCavalo" TEXT,
    "placaCarreta" TEXT,
    "tipoCarga" TEXT,
    "pesoCarga" TEXT,
    "prioridade" TEXT NOT NULL DEFAULT 'Baixa',
    "statusOperacional" TEXT NOT NULL DEFAULT 'Dentro do terminal',
    "statusFinal" TEXT,
    "observacoes" TEXT,
    "observacoesSaida" TEXT,
    "criadoPorId" INTEGER,
    "atualizadoPorId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuadraSegurancaContainer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuadraSegurancaAnexo" (
    "id" SERIAL NOT NULL,
    "containerId" INTEGER NOT NULL,
    "categoria" TEXT NOT NULL,
    "nomeOriginal" TEXT NOT NULL,
    "nomeArquivo" TEXT NOT NULL,
    "caminho" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "hashArquivo" TEXT,
    "usuarioId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuadraSegurancaAnexo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DispositivoAutorizado" (
    "id" SERIAL NOT NULL,
    "usuarioId" INTEGER NOT NULL,
    "identificador" TEXT NOT NULL,
    "navegador" TEXT,
    "sistema" TEXT,
    "ipCadastro" TEXT,
    "ipUltimoAcesso" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Autorizado',
    "primeiroAcesso" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ultimoAcesso" TIMESTAMP(3),
    "resetadoEm" TIMESTAMP(3),
    "resetadoPorId" INTEGER,
    "motivoReset" TEXT,

    CONSTRAINT "DispositivoAutorizado_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuadraSegurancaHistorico" (
    "id" SERIAL NOT NULL,
    "containerId" INTEGER NOT NULL,
    "usuarioId" INTEGER,
    "acao" TEXT NOT NULL,
    "detalhes" TEXT,
    "dadosAnteriores" TEXT,
    "dadosNovos" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuadraSegurancaHistorico_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnaliseOcorrencia" (
    "id" SERIAL NOT NULL,
    "ocorrenciaId" INTEGER NOT NULL,
    "responsavelId" INTEGER NOT NULL,
    "iniciadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "concluidoEm" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'Em Análise',
    "prejuizoFinanceiro" TEXT NOT NULL DEFAULT '0,00',
    "conclusaoAnalise" TEXT,
    "concluidoPorId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AnaliseOcorrencia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnaliseEvento" (
    "id" SERIAL NOT NULL,
    "eventoId" INTEGER NOT NULL,
    "responsavelId" INTEGER NOT NULL,
    "iniciadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "concluidoEm" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'Em Análise',
    "valorRecuperado" TEXT NOT NULL DEFAULT '0,00',
    "conclusaoAnalise" TEXT,
    "concluidoPorId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AnaliseEvento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LogAuditoria" (
    "id" SERIAL NOT NULL,
    "usuarioId" INTEGER,
    "usuarioNome" TEXT NOT NULL,
    "ip" TEXT,
    "acao" TEXT NOT NULL,
    "tipoRegistro" TEXT NOT NULL,
    "registroId" INTEGER,
    "dadosAnteriores" TEXT,
    "dadosNovos" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LogAuditoria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssinaturaDocumento" (
    "id" SERIAL NOT NULL,
    "token" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'VALIDA',
    "modulo" TEXT NOT NULL,
    "registroId" INTEGER NOT NULL,
    "codigoRegistro" TEXT NOT NULL,
    "unidade" TEXT NOT NULL,
    "acao" TEXT NOT NULL,
    "usuarioId" INTEGER NOT NULL,
    "usuarioNome" TEXT NOT NULL,
    "perfilAcesso" TEXT,
    "ip" TEXT,
    "sessaoId" TEXT,
    "documentoHash" TEXT NOT NULL,
    "versao" INTEGER NOT NULL DEFAULT 1,
    "invalidadaEm" TIMESTAMP(3),
    "motivoInvalidacao" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AssinaturaDocumento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RascunhoFormulario" (
    "id" SERIAL NOT NULL,
    "usuarioId" INTEGER NOT NULL,
    "modulo" TEXT NOT NULL,
    "chave" TEXT NOT NULL,
    "unidade" TEXT NOT NULL DEFAULT 'GJA-T1',
    "dadosJson" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'EM_PREENCHIMENTO',
    "ultimaAlteracao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RascunhoFormulario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnaliseRisco" (
    "id" SERIAL NOT NULL,
    "numero" INTEGER NOT NULL,
    "ano" INTEGER NOT NULL,
    "codigo" TEXT NOT NULL,
    "riscoCatalogoId" INTEGER,
    "dataHora" TIMESTAMP(3) NOT NULL,
    "responsavelId" INTEGER NOT NULL,
    "unidade" TEXT NOT NULL,
    "setor" TEXT NOT NULL,
    "local" TEXT NOT NULL,
    "area" TEXT,
    "tipoRisco" TEXT NOT NULL,
    "naturezaRisco" TEXT NOT NULL,
    "tituloRisco" TEXT,
    "origemRisco" TEXT,
    "fonteRisco" TEXT,
    "fatorRisco" TEXT,
    "fragilidade" TEXT,
    "eventoIncerteza" TEXT,
    "objetivoImpactado" TEXT,
    "eficaciaControles" TEXT,
    "criteriosAvaliacao" TEXT,
    "controlesInternos" TEXT,
    "atividadesControle" TEXT,
    "monitoramento" TEXT,
    "comunicacaoConsulta" TEXT,
    "descricaoRisco" TEXT NOT NULL,
    "possivelImpacto" TEXT NOT NULL,
    "causaProvavel" TEXT,
    "consequencia" TEXT,
    "pessoasAfetadas" TEXT,
    "controlesExistentes" TEXT,
    "probabilidade" TEXT NOT NULL,
    "severidade" TEXT NOT NULL,
    "probabilidadeValor" INTEGER,
    "impactoValor" DOUBLE PRECISION,
    "resultadoRisco" DOUBLE PRECISION,
    "nivelRisco" TEXT NOT NULL,
    "nivelAceitacao" TEXT,
    "tratamentoRisco" TEXT,
    "medidasPreventivas" TEXT NOT NULL,
    "planoAcao" TEXT NOT NULL,
    "acaoProposta" TEXT,
    "responsavelAcaoId" INTEGER,
    "responsavelAcaoNome" TEXT,
    "prazo" TIMESTAMP(3) NOT NULL,
    "custoEstimado" TEXT,
    "prioridade" TEXT,
    "statusAcao" TEXT,
    "observacoes" TEXT,
    "novaProbabilidade" INTEGER,
    "novoImpacto" DOUBLE PRECISION,
    "novoResultado" DOUBLE PRECISION,
    "novoNivelRisco" TEXT,
    "observacaoReavaliacao" TEXT,
    "dataReavaliacao" TIMESTAMP(3),
    "responsavelReavaliacao" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Pendente',
    "ocorrenciaId" INTEGER,
    "eventoId" INTEGER,
    "investigacaoId" INTEGER,
    "anulado" BOOLEAN NOT NULL DEFAULT false,
    "motivoAnulacao" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AnaliseRisco_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FotoRisco" (
    "id" SERIAL NOT NULL,
    "analiseRiscoId" INTEGER NOT NULL,
    "nomeOriginal" TEXT NOT NULL,
    "nomeArquivo" TEXT NOT NULL,
    "caminho" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FotoRisco_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RiscoCatalogo" (
    "id" SERIAL NOT NULL,
    "numero" INTEGER NOT NULL,
    "ano" INTEGER NOT NULL DEFAULT 2026,
    "codigo" TEXT NOT NULL,
    "unidade" TEXT NOT NULL,
    "local" TEXT,
    "area" TEXT,
    "nome" TEXT NOT NULL,
    "tipoRisco" TEXT NOT NULL,
    "grauRisco" TEXT NOT NULL DEFAULT 'Média',
    "naturezaRisco" TEXT NOT NULL,
    "origemRisco" TEXT,
    "fonteRisco" TEXT,
    "fatorRisco" TEXT,
    "fragilidade" TEXT,
    "eventoIncerteza" TEXT,
    "objetivoImpactado" TEXT,
    "responsavelNome" TEXT,
    "descricaoRisco" TEXT NOT NULL,
    "possivelImpacto" TEXT NOT NULL,
    "medidasPreventivas" TEXT,
    "planoAcaoSugerido" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Ativo',
    "criadoPorId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RiscoCatalogo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AprOperacional" (
    "id" SERIAL NOT NULL,
    "numero" INTEGER NOT NULL,
    "ano" INTEGER NOT NULL,
    "codigo" TEXT NOT NULL,
    "unidade" TEXT NOT NULL,
    "local" TEXT NOT NULL,
    "area" TEXT,
    "atividade" TEXT NOT NULL,
    "descricaoAtividade" TEXT NOT NULL,
    "dataPrevista" TIMESTAMP(3),
    "responsavelAtividade" TEXT NOT NULL,
    "equipeEnvolvida" TEXT,
    "empresaTerceira" TEXT,
    "riscosIds" TEXT,
    "perigos" TEXT NOT NULL,
    "controlesObrigatorios" TEXT NOT NULL,
    "episNecessarios" TEXT,
    "permissoesNecessarias" TEXT,
    "nivelRisco" TEXT NOT NULL DEFAULT 'Moderado',
    "status" TEXT NOT NULL DEFAULT 'Rascunho',
    "criadoPorId" INTEGER,
    "criadoPorNome" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AprOperacional_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AprAprovacao" (
    "id" SERIAL NOT NULL,
    "aprId" INTEGER NOT NULL,
    "usuarioId" INTEGER,
    "usuarioNome" TEXT NOT NULL,
    "perfilAcesso" TEXT,
    "decisao" TEXT NOT NULL DEFAULT 'Pendente',
    "observacao" TEXT,
    "decididoEm" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AprAprovacao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnaliseEstrategica" (
    "id" SERIAL NOT NULL,
    "numero" INTEGER NOT NULL,
    "ano" INTEGER NOT NULL,
    "codigo" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "unidade" TEXT NOT NULL,
    "setor" TEXT,
    "local" TEXT,
    "dataHora" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "responsavelId" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Aberta',
    "descricao" TEXT NOT NULL,
    "diagnostico" TEXT,
    "impacto" TEXT,
    "recomendacoes" TEXT,
    "planoAcao" TEXT,
    "responsavelAcao" TEXT,
    "prazo" TIMESTAMP(3),
    "ocorrenciaId" INTEGER,
    "eventoId" INTEGER,
    "investigacaoId" INTEGER,
    "analiseRiscoId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AnaliseEstrategica_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlanoAcaoCorporativo" (
    "id" SERIAL NOT NULL,
    "numero" INTEGER NOT NULL,
    "ano" INTEGER NOT NULL,
    "codigo" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "unidade" TEXT NOT NULL,
    "origemModulo" TEXT,
    "origemId" INTEGER,
    "prioridade" TEXT NOT NULL DEFAULT 'Media',
    "status" TEXT NOT NULL DEFAULT 'Pendente',
    "percentual" INTEGER NOT NULL DEFAULT 0,
    "descricao" TEXT NOT NULL,
    "acaoCorretiva" TEXT,
    "acaoPreventiva" TEXT,
    "responsavelId" INTEGER,
    "responsavelNome" TEXT,
    "prazo" TIMESTAMP(3) NOT NULL,
    "concluidoEm" TIMESTAMP(3),
    "evidencia" TEXT,
    "comentarios" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlanoAcaoCorporativo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChecklistInspecao" (
    "id" SERIAL NOT NULL,
    "numero" INTEGER NOT NULL,
    "ano" INTEGER NOT NULL,
    "codigo" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "unidade" TEXT NOT NULL,
    "setor" TEXT,
    "local" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "dataHora" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "responsavelId" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Aberto',
    "pontuacao" INTEGER NOT NULL DEFAULT 0,
    "observacoes" TEXT,
    "planoAcaoGerado" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChecklistInspecao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChecklistItem" (
    "id" SERIAL NOT NULL,
    "checklistId" INTEGER NOT NULL,
    "categoria" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "conformidade" TEXT NOT NULL DEFAULT 'Conforme',
    "criticidade" TEXT NOT NULL DEFAULT 'Media',
    "observacao" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChecklistItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PassagemTurno" (
    "id" SERIAL NOT NULL,
    "numero" INTEGER NOT NULL,
    "ano" INTEGER NOT NULL,
    "codigo" TEXT NOT NULL,
    "dataPassagem" TIMESTAMP(3) NOT NULL,
    "horaAbertura" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "horaEncerramento" TIMESTAMP(3),
    "unidade" TEXT NOT NULL,
    "equipe" TEXT NOT NULL,
    "equipeCoberta" TEXT,
    "responsavelId" INTEGER NOT NULL,
    "colaboradoresIds" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Aberto',
    "statusPostoGocil" TEXT NOT NULL DEFAULT 'Completo',
    "observacaoPostoGocil" TEXT,
    "statusPostoScanner" TEXT NOT NULL DEFAULT 'Completo',
    "observacaoPostoScanner" TEXT,
    "informacoesComplementares" TEXT,
    "checklistEquipamentos" TEXT,
    "rondas" TEXT,
    "cftvConectadas" INTEGER,
    "cftvDesconectadas" INTEGER,
    "containersArmazenados" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PassagemTurno_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PassagemTurnoPosto" (
    "id" SERIAL NOT NULL,
    "passagemId" INTEGER NOT NULL,
    "posto" TEXT NOT NULL,
    "colaborador" TEXT NOT NULL,
    "re" TEXT,
    "escala" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PassagemTurnoPosto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RelatorioDiarioExecutivo" (
    "id" SERIAL NOT NULL,
    "numero" INTEGER NOT NULL,
    "ano" INTEGER NOT NULL,
    "codigo" TEXT NOT NULL,
    "dataOperacional" TIMESTAMP(3) NOT NULL,
    "unidade" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Consolidado',
    "resumoExecutivo" TEXT NOT NULL,
    "dadosJson" TEXT NOT NULL,
    "aprimoradoPorIa" BOOLEAN NOT NULL DEFAULT false,
    "modeloIa" TEXT,
    "responsavelId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RelatorioDiarioExecutivo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Mencao" (
    "id" SERIAL NOT NULL,
    "modulo" TEXT NOT NULL,
    "registroId" INTEGER NOT NULL,
    "codigoRegistro" TEXT NOT NULL,
    "tituloRegistro" TEXT NOT NULL,
    "unidade" TEXT NOT NULL,
    "usuarioMencionadoId" INTEGER NOT NULL,
    "autorId" INTEGER,
    "tipoMencao" TEXT NOT NULL DEFAULT 'Acompanhar',
    "status" TEXT NOT NULL DEFAULT 'Pendente',
    "prazo" TIMESTAMP(3),
    "observacao" TEXT,
    "lidaEm" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Mencao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComentarioInterno" (
    "id" SERIAL NOT NULL,
    "modulo" TEXT NOT NULL,
    "registroId" INTEGER NOT NULL,
    "unidade" TEXT NOT NULL,
    "comentario" TEXT NOT NULL,
    "autorId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ComentarioInterno_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CameraMonitoramento" (
    "id" SERIAL NOT NULL,
    "numeroCamera" TEXT NOT NULL,
    "nomeCamera" TEXT,
    "numeroServidor" TEXT NOT NULL,
    "tipoSistema" TEXT NOT NULL DEFAULT 'DIGIFORT',
    "periodoGravacaoDias" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'Conectada',
    "tecnologia" TEXT NOT NULL,
    "tipoCamera" TEXT NOT NULL,
    "localInstalado" TEXT NOT NULL,
    "areaMonitorada" TEXT NOT NULL,
    "infravermelho" TEXT NOT NULL,
    "monitoramento" TEXT NOT NULL DEFAULT 'Ativo',
    "ultimaManutencao" TIMESTAMP(3),
    "observacoesTecnicas" TEXT,
    "unidade" TEXT NOT NULL DEFAULT 'GJA-T1',
    "cadastradoPorId" INTEGER,
    "statusCadastro" TEXT NOT NULL DEFAULT 'Ativa',
    "removidaEm" TIMESTAMP(3),
    "removidaPorId" INTEGER,
    "motivoRemocao" TEXT,
    "desconectadaDesde" TIMESTAMP(3),
    "totalIndisponibilidade" INTEGER NOT NULL DEFAULT 0,
    "totalFalhas" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CameraMonitoramento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrdemServicoCamera" (
    "id" SERIAL NOT NULL,
    "numero" INTEGER NOT NULL,
    "ano" INTEGER NOT NULL,
    "codigo" TEXT NOT NULL,
    "cameraId" INTEGER NOT NULL,
    "unidade" TEXT NOT NULL DEFAULT 'GJA-T1',
    "status" TEXT NOT NULL DEFAULT 'EM_ABERTO',
    "origem" TEXT NOT NULL DEFAULT 'CAMERA_DESCONECTADA',
    "descricao" TEXT,
    "abertaPorId" INTEGER,
    "atendidoPorId" INTEGER,
    "tratativa" TEXT,
    "houveDano" BOOLEAN NOT NULL DEFAULT false,
    "descricaoDano" TEXT,
    "requerTrocaCamera" BOOLEAN NOT NULL DEFAULT false,
    "requerCompra" BOOLEAN NOT NULL DEFAULT false,
    "itensNecessarios" TEXT,
    "observacoesTecnicas" TEXT,
    "desconectadaEm" TIMESTAMP(3),
    "atendimentoIniciadoEm" TIMESTAMP(3),
    "concluidoEm" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrdemServicoCamera_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CameraChecklistOperacional" (
    "id" SERIAL NOT NULL,
    "cameraId" INTEGER NOT NULL,
    "unidade" TEXT NOT NULL DEFAULT 'GJA-T1',
    "responsavelId" INTEGER NOT NULL,
    "statusAtual" TEXT NOT NULL,
    "tempoGravacaoDisponivel" INTEGER NOT NULL,
    "dataInicialGravacao" TIMESTAMP(3),
    "dataMaisRecenteGravacao" TIMESTAMP(3),
    "dataDesconexaoManual" TIMESTAMP(3),
    "dataReconexaoManual" TIMESTAMP(3),
    "retencaoEstimadaMinutos" INTEGER,
    "retencaoEstimadaTexto" TEXT,
    "qualidadeImagem" TEXT NOT NULL,
    "funcionamentoInfravermelho" TEXT NOT NULL,
    "funcionamentoGravacao" TEXT NOT NULL,
    "comunicacaoServidor" TEXT NOT NULL,
    "instabilidadeDetectada" TEXT NOT NULL,
    "necessidadeManutencao" TEXT NOT NULL,
    "observacoesOperacionais" TEXT,
    "indisponibilidadeMinutos" INTEGER NOT NULL DEFAULT 0,
    "falhaRecorrente" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CameraChecklistOperacional_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CameraEventoStatus" (
    "id" SERIAL NOT NULL,
    "cameraId" INTEGER NOT NULL,
    "unidade" TEXT NOT NULL DEFAULT 'GJA-T1',
    "statusAnterior" TEXT,
    "statusNovo" TEXT NOT NULL,
    "iniciadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "encerradoEm" TIMESTAMP(3),
    "duracaoIndisponivel" INTEGER,
    "motivo" TEXT,
    "responsavelId" INTEGER,
    "observacao" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CameraEventoStatus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RelatorioCftv" (
    "id" SERIAL NOT NULL,
    "numero" INTEGER NOT NULL,
    "ano" INTEGER NOT NULL,
    "codigo" TEXT NOT NULL,
    "unidade" TEXT NOT NULL,
    "responsavelId" INTEGER,
    "camerasIdsJson" TEXT NOT NULL,
    "snapshotJson" TEXT,
    "retencaoMedia" INTEGER NOT NULL DEFAULT 0,
    "totalEventos" INTEGER NOT NULL DEFAULT 0,
    "totalIndisponibilidade" INTEGER NOT NULL DEFAULT 0,
    "totalCameras" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RelatorioCftv_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConfiguracaoSistema" (
    "id" SERIAL NOT NULL,
    "chave" TEXT NOT NULL,
    "nomeEmpresa" TEXT NOT NULL DEFAULT 'Movecta S/A',
    "slaCameras" INTEGER NOT NULL DEFAULT 98,
    "tempoMaximoOffline" INTEGER NOT NULL DEFAULT 60,
    "checklistCameraDias" INTEGER NOT NULL DEFAULT 7,
    "corsPermitido" TEXT,
    "logoUrl" TEXT,
    "rodapePdf" TEXT,
    "ocrProvider" TEXT DEFAULT 'openai',
    "openaiApiKey" TEXT,
    "openaiOcrModel" TEXT DEFAULT 'gpt-4.1-mini',
    "openaiAprimoramentoTextoAtivo" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConfiguracaoSistema_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificacaoLida" (
    "id" SERIAL NOT NULL,
    "usuarioId" INTEGER NOT NULL,
    "notificacaoId" TEXT NOT NULL,
    "lidaEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NotificacaoLida_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SolicitacaoAnulacaoRelatorio" (
    "id" SERIAL NOT NULL,
    "modulo" TEXT NOT NULL,
    "registroId" INTEGER NOT NULL,
    "codigoRegistro" TEXT NOT NULL,
    "tituloRegistro" TEXT NOT NULL,
    "unidade" TEXT NOT NULL,
    "motivo" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Pendente',
    "solicitanteId" INTEGER NOT NULL,
    "decididoPorId" INTEGER,
    "decisaoMotivo" TEXT,
    "decididoEm" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SolicitacaoAnulacaoRelatorio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AcordoAnulacaoRelatorio" (
    "id" SERIAL NOT NULL,
    "solicitacaoId" INTEGER NOT NULL,
    "analistaId" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Pendente',
    "observacao" TEXT,
    "decididoEm" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AcordoAnulacaoRelatorio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlanejamentoColuna" (
    "id" SERIAL NOT NULL,
    "titulo" TEXT NOT NULL,
    "unidade" TEXT NOT NULL,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "cor" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlanejamentoColuna_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlanejamentoCard" (
    "id" SERIAL NOT NULL,
    "titulo" TEXT NOT NULL,
    "descricao" TEXT,
    "prioridade" TEXT NOT NULL DEFAULT 'Media',
    "prazo" TIMESTAMP(3),
    "unidade" TEXT NOT NULL,
    "setor" TEXT,
    "local" TEXT,
    "moduloVinculado" TEXT,
    "registroId" INTEGER,
    "codigoRegistro" TEXT,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'Ativo',
    "colunaId" INTEGER NOT NULL,
    "responsavelId" INTEGER,
    "criadoPorId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlanejamentoCard_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_email_key" ON "Usuario"("email");

-- CreateIndex
CREATE UNIQUE INDEX "TreinamentoTerminal_token_key" ON "TreinamentoTerminal"("token");

-- CreateIndex
CREATE UNIQUE INDEX "TreinamentoTerminal_codigo_key" ON "TreinamentoTerminal"("codigo");

-- CreateIndex
CREATE INDEX "TreinamentoTerminal_cpf_email_idx" ON "TreinamentoTerminal"("cpf", "email");

-- CreateIndex
CREATE INDEX "TreinamentoTerminal_status_updatedAt_idx" ON "TreinamentoTerminal"("status", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "SessaoUsuario_tokenHash_key" ON "SessaoUsuario"("tokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "SessaoUsuario_refreshTokenHash_key" ON "SessaoUsuario"("refreshTokenHash");

-- CreateIndex
CREATE INDEX "SessaoUsuario_usuarioId_status_idx" ON "SessaoUsuario"("usuarioId", "status");

-- CreateIndex
CREATE INDEX "SessaoUsuario_status_ultimaAtividadeEm_idx" ON "SessaoUsuario"("status", "ultimaAtividadeEm");

-- CreateIndex
CREATE INDEX "SugestaoMelhoria_status_unidade_idx" ON "SugestaoMelhoria"("status", "unidade");

-- CreateIndex
CREATE INDEX "SugestaoMelhoria_autorId_createdAt_idx" ON "SugestaoMelhoria"("autorId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Ocorrencia_codigo_unidade_key" ON "Ocorrencia"("codigo", "unidade");

-- CreateIndex
CREATE UNIQUE INDEX "Evento_codigo_unidade_key" ON "Evento"("codigo", "unidade");

-- CreateIndex
CREATE UNIQUE INDEX "RelatoCampo_token_key" ON "RelatoCampo"("token");

-- CreateIndex
CREATE INDEX "RelatoCampo_status_unidade_idx" ON "RelatoCampo"("status", "unidade");

-- CreateIndex
CREATE INDEX "RelatoCampo_token_expiraEm_idx" ON "RelatoCampo"("token", "expiraEm");

-- CreateIndex
CREATE UNIQUE INDEX "Investigacao_ocorrenciaId_key" ON "Investigacao"("ocorrenciaId");

-- CreateIndex
CREATE UNIQUE INDEX "Investigacao_codigo_unidade_key" ON "Investigacao"("codigo", "unidade");

-- CreateIndex
CREATE UNIQUE INDEX "Natureza_nome_key" ON "Natureza"("nome");

-- CreateIndex
CREATE UNIQUE INDEX "SubNatureza_naturezaId_nome_key" ON "SubNatureza"("naturezaId", "nome");

-- CreateIndex
CREATE INDEX "LocalTerminal_unidade_status_idx" ON "LocalTerminal"("unidade", "status");

-- CreateIndex
CREATE UNIQUE INDEX "LocalTerminal_nome_unidade_key" ON "LocalTerminal"("nome", "unidade");

-- CreateIndex
CREATE INDEX "QuadraSegurancaContainer_unidade_statusOperacional_idx" ON "QuadraSegurancaContainer"("unidade", "statusOperacional");

-- CreateIndex
CREATE INDEX "QuadraSegurancaContainer_unidade_prioridade_idx" ON "QuadraSegurancaContainer"("unidade", "prioridade");

-- CreateIndex
CREATE UNIQUE INDEX "QuadraSegurancaContainer_numeroContainer_unidade_key" ON "QuadraSegurancaContainer"("numeroContainer", "unidade");

-- CreateIndex
CREATE INDEX "DispositivoAutorizado_usuarioId_status_idx" ON "DispositivoAutorizado"("usuarioId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "DispositivoAutorizado_usuarioId_identificador_key" ON "DispositivoAutorizado"("usuarioId", "identificador");

-- CreateIndex
CREATE UNIQUE INDEX "AnaliseOcorrencia_ocorrenciaId_key" ON "AnaliseOcorrencia"("ocorrenciaId");

-- CreateIndex
CREATE UNIQUE INDEX "AnaliseEvento_eventoId_key" ON "AnaliseEvento"("eventoId");

-- CreateIndex
CREATE UNIQUE INDEX "AssinaturaDocumento_token_key" ON "AssinaturaDocumento"("token");

-- CreateIndex
CREATE INDEX "AssinaturaDocumento_modulo_registroId_status_idx" ON "AssinaturaDocumento"("modulo", "registroId", "status");

-- CreateIndex
CREATE INDEX "AssinaturaDocumento_token_idx" ON "AssinaturaDocumento"("token");

-- CreateIndex
CREATE INDEX "RascunhoFormulario_usuarioId_status_updatedAt_idx" ON "RascunhoFormulario"("usuarioId", "status", "updatedAt");

-- CreateIndex
CREATE INDEX "RascunhoFormulario_modulo_chave_unidade_idx" ON "RascunhoFormulario"("modulo", "chave", "unidade");

-- CreateIndex
CREATE UNIQUE INDEX "RascunhoFormulario_usuarioId_modulo_chave_unidade_key" ON "RascunhoFormulario"("usuarioId", "modulo", "chave", "unidade");

-- CreateIndex
CREATE INDEX "AnaliseRisco_riscoCatalogoId_idx" ON "AnaliseRisco"("riscoCatalogoId");

-- CreateIndex
CREATE UNIQUE INDEX "AnaliseRisco_codigo_unidade_key" ON "AnaliseRisco"("codigo", "unidade");

-- CreateIndex
CREATE INDEX "RiscoCatalogo_unidade_status_idx" ON "RiscoCatalogo"("unidade", "status");

-- CreateIndex
CREATE UNIQUE INDEX "RiscoCatalogo_codigo_unidade_key" ON "RiscoCatalogo"("codigo", "unidade");

-- CreateIndex
CREATE UNIQUE INDEX "RiscoCatalogo_nome_unidade_key" ON "RiscoCatalogo"("nome", "unidade");

-- CreateIndex
CREATE INDEX "AprOperacional_unidade_status_idx" ON "AprOperacional"("unidade", "status");

-- CreateIndex
CREATE INDEX "AprOperacional_local_dataPrevista_idx" ON "AprOperacional"("local", "dataPrevista");

-- CreateIndex
CREATE UNIQUE INDEX "AprOperacional_codigo_unidade_key" ON "AprOperacional"("codigo", "unidade");

-- CreateIndex
CREATE INDEX "AprAprovacao_aprId_decisao_idx" ON "AprAprovacao"("aprId", "decisao");

-- CreateIndex
CREATE INDEX "AprAprovacao_usuarioId_decisao_idx" ON "AprAprovacao"("usuarioId", "decisao");

-- CreateIndex
CREATE UNIQUE INDEX "AnaliseEstrategica_codigo_unidade_key" ON "AnaliseEstrategica"("codigo", "unidade");

-- CreateIndex
CREATE UNIQUE INDEX "PlanoAcaoCorporativo_codigo_unidade_key" ON "PlanoAcaoCorporativo"("codigo", "unidade");

-- CreateIndex
CREATE UNIQUE INDEX "ChecklistInspecao_codigo_unidade_key" ON "ChecklistInspecao"("codigo", "unidade");

-- CreateIndex
CREATE INDEX "PassagemTurno_unidade_equipe_status_idx" ON "PassagemTurno"("unidade", "equipe", "status");

-- CreateIndex
CREATE UNIQUE INDEX "PassagemTurno_codigo_unidade_key" ON "PassagemTurno"("codigo", "unidade");

-- CreateIndex
CREATE INDEX "RelatorioDiarioExecutivo_unidade_dataOperacional_idx" ON "RelatorioDiarioExecutivo"("unidade", "dataOperacional");

-- CreateIndex
CREATE UNIQUE INDEX "RelatorioDiarioExecutivo_codigo_unidade_key" ON "RelatorioDiarioExecutivo"("codigo", "unidade");

-- CreateIndex
CREATE UNIQUE INDEX "RelatorioDiarioExecutivo_dataOperacional_unidade_key" ON "RelatorioDiarioExecutivo"("dataOperacional", "unidade");

-- CreateIndex
CREATE UNIQUE INDEX "CameraMonitoramento_numeroCamera_unidade_key" ON "CameraMonitoramento"("numeroCamera", "unidade");

-- CreateIndex
CREATE INDEX "OrdemServicoCamera_cameraId_status_idx" ON "OrdemServicoCamera"("cameraId", "status");

-- CreateIndex
CREATE INDEX "OrdemServicoCamera_unidade_status_idx" ON "OrdemServicoCamera"("unidade", "status");

-- CreateIndex
CREATE UNIQUE INDEX "OrdemServicoCamera_codigo_unidade_key" ON "OrdemServicoCamera"("codigo", "unidade");

-- CreateIndex
CREATE UNIQUE INDEX "OrdemServicoCamera_numero_ano_unidade_key" ON "OrdemServicoCamera"("numero", "ano", "unidade");

-- CreateIndex
CREATE UNIQUE INDEX "RelatorioCftv_codigo_unidade_key" ON "RelatorioCftv"("codigo", "unidade");

-- CreateIndex
CREATE UNIQUE INDEX "ConfiguracaoSistema_chave_key" ON "ConfiguracaoSistema"("chave");

-- CreateIndex
CREATE UNIQUE INDEX "NotificacaoLida_usuarioId_notificacaoId_key" ON "NotificacaoLida"("usuarioId", "notificacaoId");

-- CreateIndex
CREATE INDEX "SolicitacaoAnulacaoRelatorio_modulo_registroId_status_idx" ON "SolicitacaoAnulacaoRelatorio"("modulo", "registroId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "AcordoAnulacaoRelatorio_solicitacaoId_analistaId_key" ON "AcordoAnulacaoRelatorio"("solicitacaoId", "analistaId");

-- CreateIndex
CREATE INDEX "PlanejamentoColuna_unidade_ordem_idx" ON "PlanejamentoColuna"("unidade", "ordem");

-- CreateIndex
CREATE INDEX "PlanejamentoCard_unidade_colunaId_ordem_idx" ON "PlanejamentoCard"("unidade", "colunaId", "ordem");

-- CreateIndex
CREATE INDEX "PlanejamentoCard_responsavelId_idx" ON "PlanejamentoCard"("responsavelId");

-- AddForeignKey
ALTER TABLE "SessaoUsuario" ADD CONSTRAINT "SessaoUsuario_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SugestaoMelhoria" ADD CONSTRAINT "SugestaoMelhoria_autorId_fkey" FOREIGN KEY ("autorId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SugestaoMelhoria" ADD CONSTRAINT "SugestaoMelhoria_avaliadoPorId_fkey" FOREIGN KEY ("avaliadoPorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnvolvidoOcorrencia" ADD CONSTRAINT "EnvolvidoOcorrencia_ocorrenciaId_fkey" FOREIGN KEY ("ocorrenciaId") REFERENCES "Ocorrencia"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnexoOcorrencia" ADD CONSTRAINT "AnexoOcorrencia_ocorrenciaId_fkey" FOREIGN KEY ("ocorrenciaId") REFERENCES "Ocorrencia"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnvolvidoEvento" ADD CONSTRAINT "EnvolvidoEvento_eventoId_fkey" FOREIGN KEY ("eventoId") REFERENCES "Evento"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnexoEvento" ADD CONSTRAINT "AnexoEvento_eventoId_fkey" FOREIGN KEY ("eventoId") REFERENCES "Evento"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RelatoCampo" ADD CONSTRAINT "RelatoCampo_geradoPorId_fkey" FOREIGN KEY ("geradoPorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnvolvidoRelatoCampo" ADD CONSTRAINT "EnvolvidoRelatoCampo_relatoCampoId_fkey" FOREIGN KEY ("relatoCampoId") REFERENCES "RelatoCampo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnexoRelatoCampo" ADD CONSTRAINT "AnexoRelatoCampo_relatoCampoId_fkey" FOREIGN KEY ("relatoCampoId") REFERENCES "RelatoCampo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Investigacao" ADD CONSTRAINT "Investigacao_ocorrenciaId_fkey" FOREIGN KEY ("ocorrenciaId") REFERENCES "Ocorrencia"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Investigacao" ADD CONSTRAINT "Investigacao_responsavelId_fkey" FOREIGN KEY ("responsavelId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubNatureza" ADD CONSTRAINT "SubNatureza_naturezaId_fkey" FOREIGN KEY ("naturezaId") REFERENCES "Natureza"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuadraSegurancaContainer" ADD CONSTRAINT "QuadraSegurancaContainer_criadoPorId_fkey" FOREIGN KEY ("criadoPorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuadraSegurancaContainer" ADD CONSTRAINT "QuadraSegurancaContainer_atualizadoPorId_fkey" FOREIGN KEY ("atualizadoPorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuadraSegurancaAnexo" ADD CONSTRAINT "QuadraSegurancaAnexo_containerId_fkey" FOREIGN KEY ("containerId") REFERENCES "QuadraSegurancaContainer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuadraSegurancaAnexo" ADD CONSTRAINT "QuadraSegurancaAnexo_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DispositivoAutorizado" ADD CONSTRAINT "DispositivoAutorizado_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuadraSegurancaHistorico" ADD CONSTRAINT "QuadraSegurancaHistorico_containerId_fkey" FOREIGN KEY ("containerId") REFERENCES "QuadraSegurancaContainer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuadraSegurancaHistorico" ADD CONSTRAINT "QuadraSegurancaHistorico_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnaliseOcorrencia" ADD CONSTRAINT "AnaliseOcorrencia_ocorrenciaId_fkey" FOREIGN KEY ("ocorrenciaId") REFERENCES "Ocorrencia"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnaliseOcorrencia" ADD CONSTRAINT "AnaliseOcorrencia_responsavelId_fkey" FOREIGN KEY ("responsavelId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnaliseOcorrencia" ADD CONSTRAINT "AnaliseOcorrencia_concluidoPorId_fkey" FOREIGN KEY ("concluidoPorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnaliseEvento" ADD CONSTRAINT "AnaliseEvento_eventoId_fkey" FOREIGN KEY ("eventoId") REFERENCES "Evento"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnaliseEvento" ADD CONSTRAINT "AnaliseEvento_responsavelId_fkey" FOREIGN KEY ("responsavelId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnaliseEvento" ADD CONSTRAINT "AnaliseEvento_concluidoPorId_fkey" FOREIGN KEY ("concluidoPorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LogAuditoria" ADD CONSTRAINT "LogAuditoria_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssinaturaDocumento" ADD CONSTRAINT "AssinaturaDocumento_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RascunhoFormulario" ADD CONSTRAINT "RascunhoFormulario_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnaliseRisco" ADD CONSTRAINT "AnaliseRisco_responsavelId_fkey" FOREIGN KEY ("responsavelId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnaliseRisco" ADD CONSTRAINT "AnaliseRisco_responsavelAcaoId_fkey" FOREIGN KEY ("responsavelAcaoId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnaliseRisco" ADD CONSTRAINT "AnaliseRisco_riscoCatalogoId_fkey" FOREIGN KEY ("riscoCatalogoId") REFERENCES "RiscoCatalogo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnaliseRisco" ADD CONSTRAINT "AnaliseRisco_ocorrenciaId_fkey" FOREIGN KEY ("ocorrenciaId") REFERENCES "Ocorrencia"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnaliseRisco" ADD CONSTRAINT "AnaliseRisco_eventoId_fkey" FOREIGN KEY ("eventoId") REFERENCES "Evento"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnaliseRisco" ADD CONSTRAINT "AnaliseRisco_investigacaoId_fkey" FOREIGN KEY ("investigacaoId") REFERENCES "Investigacao"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FotoRisco" ADD CONSTRAINT "FotoRisco_analiseRiscoId_fkey" FOREIGN KEY ("analiseRiscoId") REFERENCES "AnaliseRisco"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AprAprovacao" ADD CONSTRAINT "AprAprovacao_aprId_fkey" FOREIGN KEY ("aprId") REFERENCES "AprOperacional"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnaliseEstrategica" ADD CONSTRAINT "AnaliseEstrategica_responsavelId_fkey" FOREIGN KEY ("responsavelId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanoAcaoCorporativo" ADD CONSTRAINT "PlanoAcaoCorporativo_responsavelId_fkey" FOREIGN KEY ("responsavelId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChecklistInspecao" ADD CONSTRAINT "ChecklistInspecao_responsavelId_fkey" FOREIGN KEY ("responsavelId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChecklistItem" ADD CONSTRAINT "ChecklistItem_checklistId_fkey" FOREIGN KEY ("checklistId") REFERENCES "ChecklistInspecao"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PassagemTurno" ADD CONSTRAINT "PassagemTurno_responsavelId_fkey" FOREIGN KEY ("responsavelId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PassagemTurnoPosto" ADD CONSTRAINT "PassagemTurnoPosto_passagemId_fkey" FOREIGN KEY ("passagemId") REFERENCES "PassagemTurno"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RelatorioDiarioExecutivo" ADD CONSTRAINT "RelatorioDiarioExecutivo_responsavelId_fkey" FOREIGN KEY ("responsavelId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mencao" ADD CONSTRAINT "Mencao_usuarioMencionadoId_fkey" FOREIGN KEY ("usuarioMencionadoId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mencao" ADD CONSTRAINT "Mencao_autorId_fkey" FOREIGN KEY ("autorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComentarioInterno" ADD CONSTRAINT "ComentarioInterno_autorId_fkey" FOREIGN KEY ("autorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CameraMonitoramento" ADD CONSTRAINT "CameraMonitoramento_cadastradoPorId_fkey" FOREIGN KEY ("cadastradoPorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrdemServicoCamera" ADD CONSTRAINT "OrdemServicoCamera_cameraId_fkey" FOREIGN KEY ("cameraId") REFERENCES "CameraMonitoramento"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrdemServicoCamera" ADD CONSTRAINT "OrdemServicoCamera_abertaPorId_fkey" FOREIGN KEY ("abertaPorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrdemServicoCamera" ADD CONSTRAINT "OrdemServicoCamera_atendidoPorId_fkey" FOREIGN KEY ("atendidoPorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CameraChecklistOperacional" ADD CONSTRAINT "CameraChecklistOperacional_cameraId_fkey" FOREIGN KEY ("cameraId") REFERENCES "CameraMonitoramento"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CameraChecklistOperacional" ADD CONSTRAINT "CameraChecklistOperacional_responsavelId_fkey" FOREIGN KEY ("responsavelId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CameraEventoStatus" ADD CONSTRAINT "CameraEventoStatus_cameraId_fkey" FOREIGN KEY ("cameraId") REFERENCES "CameraMonitoramento"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RelatorioCftv" ADD CONSTRAINT "RelatorioCftv_responsavelId_fkey" FOREIGN KEY ("responsavelId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificacaoLida" ADD CONSTRAINT "NotificacaoLida_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SolicitacaoAnulacaoRelatorio" ADD CONSTRAINT "SolicitacaoAnulacaoRelatorio_solicitanteId_fkey" FOREIGN KEY ("solicitanteId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SolicitacaoAnulacaoRelatorio" ADD CONSTRAINT "SolicitacaoAnulacaoRelatorio_decididoPorId_fkey" FOREIGN KEY ("decididoPorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AcordoAnulacaoRelatorio" ADD CONSTRAINT "AcordoAnulacaoRelatorio_solicitacaoId_fkey" FOREIGN KEY ("solicitacaoId") REFERENCES "SolicitacaoAnulacaoRelatorio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AcordoAnulacaoRelatorio" ADD CONSTRAINT "AcordoAnulacaoRelatorio_analistaId_fkey" FOREIGN KEY ("analistaId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanejamentoCard" ADD CONSTRAINT "PlanejamentoCard_colunaId_fkey" FOREIGN KEY ("colunaId") REFERENCES "PlanejamentoColuna"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanejamentoCard" ADD CONSTRAINT "PlanejamentoCard_responsavelId_fkey" FOREIGN KEY ("responsavelId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanejamentoCard" ADD CONSTRAINT "PlanejamentoCard_criadoPorId_fkey" FOREIGN KEY ("criadoPorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

