# Manual Completo do Sistema JetGuard - Movecta Patrimonial

## Identificacao do Projeto

**Sistema:** JetGuard - Movecta Patrimonial  
**Finalidade:** Gestao de seguranca patrimonial, operacoes SOC, CFTV, ocorrencias, eventos, investigacoes, riscos e inteligencia operacional.  
**Criador e arquiteto do sistema:** Fernando Nunes  
**Apoio tecnico:** O desenvolvimento contou com apoio de inteligencia artificial como ferramenta auxiliar para aceleracao de codigo, estruturacao de funcionalidades, revisoes tecnicas e documentacao. As regras de negocio, direcionamento operacional, arquitetura funcional, criterios de uso e validacoes do sistema foram definidos e conduzidos por Fernando Nunes.

## Objetivo Geral

O JetGuard foi concebido para centralizar a rotina de Seguranca Patrimonial em ambiente alfandegado, permitindo registro padronizado de informacoes, rastreabilidade, analise de dados, controle de evidencias, gestao de CFTV, acompanhamento de containers, passagem de turno, auditoria e apoio a tomada de decisao.

O sistema busca reduzir registros dispersos, melhorar a confiabilidade das informacoes, preservar historico operacional e transformar dados do dia a dia em indicadores gerenciais.

## Conceitos Principais

### Unidade de Trabalho

Cada usuario atua dentro de uma unidade operacional, como GJA-T1, GJA-T2, ITAJAI-SC, SUAPE-T1, SUAPE-T2 e ANHANGUERA.

Usuarios com permissao podem alternar o ambiente de trabalho. Operadores acessam somente as unidades atribuidas ao seu cadastro.

### Perfil de Acesso

O JetGuard utiliza controle de acesso por perfil. Cada perfil visualiza apenas os modulos e acoes permitidas.

**Super Admin:** acesso total, incluindo todas as unidades, usuarios, configuracoes, integridade, logs, sessoes e acoes sensiveis.  
**Administrador:** acesso administrativo amplo, exceto acoes reservadas ao Super Admin.  
**Analista:** acesso operacional e analitico, com permissao para analises, investigacoes e acompanhamento.  
**Operador:** acesso operacional para registros, acompanhamento, CFTV, CCOS, quadra de seguranca e tarefas permitidas.

### Rastreabilidade

Toda acao relevante deve gerar historico, incluindo usuario, data, hora, IP, modulo afetado e dados alterados. Esse conceito protege a operacao e permite auditoria posterior.

## Acesso ao Sistema

1. Acesse a URL do sistema.
2. Informe e-mail e senha.
3. No primeiro acesso, caso configurado, o sistema solicita alteracao obrigatoria de senha.
4. O usuario entra na unidade preferencial cadastrada.
5. O cabecalho mostra usuario, foto de perfil, unidade ativa e atalhos.

### Bloqueio Seguro de Sessao

O icone de cadeado permite bloquear a sessao sem encerrar completamente o login. A tela fica protegida por uma sobreposicao solicitando senha para desbloqueio.

Caso o usuario prefira encerrar, existe a opcao de finalizar a sessao na tela bloqueada.

### Sessoes Ativas

Administradores podem visualizar sessoes ativas. O sistema evita multiplas sessoes administrativas simultaneas, favorecendo seguranca e controle.

## Estrutura Geral do Menu

### Dashboard

Tela inicial com indicadores, graficos e filtros.

### Relatorios

Inclui:

- Relatorios de Ocorrencia;
- Relatorios de Eventos;
- Relatorios de Investigacao;
- Relatorio CCOS;
- Anulacoes;
- Evidencias;
- Pendencias;
- Notificacoes.

### Operacao

Inclui:

- Cameras CFTV;
- Planejamento;
- Quadra de Seguranca;
- Mapa Operacional;
- Tarefas;
- Alertas operacionais.

### Gestao Avancada

Inclui:

- Gestao Patrimonial;
- Analise de Risco;
- Analises Estrategicas;
- Inteligencia;
- Matriz 5x5;
- Planos de Acao;
- Checklist Inspecao Preventiva;
- Aprovacoes.

### Administracao

Inclui:

- Usuarios;
- Naturezas;
- Locais;
- Configuracoes;
- Sessoes ativas.

### Sistema

Reservado a perfis administrativos:

- Governanca;
- Atualizacoes;
- Integridade;
- Sugestoes;
- Logs.

## Dashboard

O Dashboard apresenta a visao consolidada da operacao.

### Cards de Status

Mostram totais de ocorrencias, eventos e investigacoes por status:

- Aberto;
- Em Analise;
- Concluido.

Esses cards ajudam a identificar volume de trabalho, atrasos e demanda acumulada.

### Graficos de Rosca

Apresentam a proporcao de registros por status. Sao uteis para reunioes rapidas e acompanhamento visual.

### Graficos Financeiros

Exibem prejuizo, valor recuperado e diferenca. Devem ser usados para demonstrar impacto financeiro e resultado das acoes.

### Graficos por Natureza e Local

Permitem identificar recorrencia de problemas por tipo e por area do terminal.

### Grafico Temporal

Mostra evolucao mensal/anual de ocorrencias e eventos, permitindo observar tendencias, crescimento ou reducao.

### Relatorio por Filtro

O botao de gerar relatorio permite emitir PDF com base nos filtros aplicados.

## Relatorios de Ocorrencia

O Relatorio de Ocorrencia registra fatos relevantes de seguranca patrimonial.

### Campos Principais

- Assunto;
- Local;
- Natureza;
- Subnatureza;
- Data e hora;
- Status;
- Envolvidos;
- Empresa;
- Relato dos envolvidos;
- Relato da seguranca patrimonial;
- Acoes tomadas;
- Anexos.

### Fluxo Operacional

1. Criar novo relatorio.
2. Preencher dados basicos.
3. Selecionar natureza e subnatureza.
4. Informar envolvidos, quando houver.
5. Registrar relato patrimonial e acoes tomadas.
6. Anexar fotos, documentos ou evidencias.
7. Salvar.
8. Gerar PDF, se necessario.

### Analise da Ocorrencia

Quando uma analise e iniciada, o status passa para Em Analise. Ao concluir, o status passa para Concluido.

O botao de iniciar analise fica oculto quando ja existe analise em andamento.

### Conversao para Investigacao

Uma ocorrencia pode ser convertida para Relatorio de Investigacao. O sistema gera um numero proprio para a investigacao e mantem vinculo com a ocorrencia original.

## Relatorios de Eventos

O Relatorio de Evento segue estrutura semelhante ao de ocorrencia, porem voltado a registros operacionais, preventivos ou informativos.

Pode possuir analise, anexos, status, natureza, subnatureza e PDF.

## Investigacoes

O modulo de Investigacao aprofunda uma ocorrencia convertida ou cria tratamento especifico para fatos relevantes.

### Campos Complementares

- Descricao da investigacao;
- Conclusao dos fatos;
- Vinculo com ocorrencia original;
- Historico;
- Anexos;
- PDF proprio.

## Anulacao de Relatorios

O sistema nao incentiva exclusao simples de relatorios. Em vez disso, utiliza fluxo de anulacao.

### Objetivo

Preservar rastreabilidade, evitar perda de historico e permitir acordo entre usuarios responsaveis.

### Fluxo

1. Usuario solicita anulacao.
2. Informa motivo.
3. Analistas podem se manifestar.
4. Administrador decide.
5. Tudo fica registrado em logs.

## PDF dos Relatorios

Os PDFs possuem layout profissional com:

- Logo;
- Tipo do relatorio;
- Numero sequencial;
- Dados principais;
- Envolvidos;
- Relatos;
- Acoes tomadas;
- Investigacao vinculada, quando houver;
- Analises vinculadas;
- Assinatura digital;
- Token de validacao;
- QR Code para acesso ao PDF.

## Naturezas e Subnaturezas

Permitem padronizar classificacoes.

Exemplo:

- Natureza: Intemperies;
- Subnaturezas: Alagamento, ventania, chuva forte.

Ao selecionar uma natureza em relatorios, o sistema carrega apenas as subnaturezas vinculadas.

## Locais

O cadastro de locais organiza a base de areas do terminal.

### Campos

- Nome do local;
- Descricao;
- Tipo;
- Area sensivel;
- Status.

Locais ativos aparecem nos formularios. Locais inativos deixam de aparecer como opcao.

## Cameras CFTV

O modulo CFTV controla cadastro, checklist, historico, indisponibilidade e indicadores de cameras.

### Cadastro da Camera

Contem dados permanentes:

- Numero da camera;
- Nome;
- Unidade;
- Servidor;
- Local instalado;
- Area monitorada;
- Tecnologia;
- Infravermelho;
- Monitoramento;
- Status.

### Checklist CFTV

O operador registra a realidade encontrada no Digifort.

Campos principais:

- Data mais antiga encontrada no Digifort;
- Data mais recente encontrada no Digifort, quando aplicavel;
- Status da camera;
- Observacoes;
- Qualidade da imagem;
- Gravacao;
- Comunicacao com servidor;
- Infravermelho;
- Necessidade de manutencao.

### Regra de Datas

A data mais antiga encontrada no Digifort nao pode ser maior que a data mais recente. Essa regra garante consistencia da retencao.

### Retencao

O JetGuard trabalha com a logica operacional de retencao baseada em ate 181 dias, considerando a realidade informada no checklist e os periodos de indisponibilidade.

### Historico de Indisponibilidade

Registra periodos em que a camera ficou sem gravacao ou desconectada.

Campos:

- Data/hora inicial;
- Data/hora final;
- Motivo;
- Observacao;
- Tempo calculado;
- Usuario responsavel.

A data/hora inicial nao pode ser maior que a data/hora final.

## Quadra de Seguranca

Modulo para controle operacional de containers no terminal.

### Cadastro

- Numero do container;
- Unidade;
- Data/hora de entrada;
- Tipo;
- Dimensao;
- Destino;
- Scanner na entrada;
- Estufado no terminal;
- Lacre;
- Armador;
- Prioridade;
- Status;
- Posicionamento;
- Observacoes.

### Status

- Previsao para chegada;
- No terminal;
- Liberado.

### Dossie

O dossie consolida historico, anexos, movimentacoes, status e evidencias do container.

## Relatorio CCOS

O Relatorio CCOS substitui registros soltos de passagem de turno.

### Finalidade

Registrar em tempo real a rotina do plantao, mantendo historico organizado e gerando PDF ao final.

### Campos

- Data;
- Hora de abertura;
- Hora de encerramento;
- Unidade;
- Equipe;
- Responsavel;
- Colaboradores;
- Postos operacionais;
- Status dos postos;
- Informacoes do plantao;
- Rondas;
- Checklist de equipamentos;
- Informacoes automaticas de CFTV e containers.

### Fluxo

1. Abrir novo relatorio.
2. Alimentar durante o turno.
3. Registrar informacoes do plantao.
4. Preencher rondas e checklist.
5. Revisar dados.
6. Enviar relatorio.
7. O sistema bloqueia edicao e gera PDF.

## Planejamento Operacional

Funciona como painel de tarefas em estilo quadro.

Permite:

- Criar colunas;
- Criar cards;
- Atribuir responsaveis;
- Definir prioridade;
- Filtrar tarefas;
- Acompanhar andamento.

## Minha Jornada

Mostra ao usuario conectado um resumo das atividades realizadas no dia, com possibilidade de filtro por periodo.

## Mencoes

Permitem mencionar usuarios em relatorios, analises e registros. O usuario mencionado recebe indicacao para acompanhar ou tratar o item.

## Analise de Risco

Modulo para identificar, classificar e acompanhar riscos operacionais.

### Campos

- Numero da analise;
- Unidade;
- Setor;
- Local;
- Tipo de risco;
- Natureza;
- Subnatureza;
- Descricao;
- Impacto;
- Probabilidade;
- Severidade;
- Nivel;
- Medidas preventivas;
- Plano de acao;
- Responsavel;
- Prazo;
- Status.

### Matriz de Risco

Utiliza probabilidade e severidade para classificar riscos como baixo, moderado, alto ou critico.

### Vinculo com Relatorios

A Analise de Risco pode ser vinculada a um Relatorio de Ocorrencia, Relatorio de Evento ou Relatorio de Investigacao. Esse vinculo e importante quando o risco foi identificado a partir de um fato ja registrado no sistema.

Exemplos:

- uma ocorrencia de acesso indevido pode gerar uma analise de risco sobre falha de controle de acesso;
- um evento de camera desconectada pode gerar uma analise de risco sobre cobertura CFTV insuficiente;
- uma investigacao concluida pode gerar uma analise de risco sobre vulnerabilidade de processo, local sensivel ou reincidencia.

Ao informar o numero do relatorio vinculado, o sistema pode buscar os dados principais do registro, como local, unidade, natureza, subnatureza e contexto operacional. Isso reduz retrabalho e evita divergencia entre o relatorio original e a analise gerada.

### Como Interpretar o Vinculo

O relatorio original representa o fato ocorrido. A Analise de Risco representa a avaliacao preventiva ou corretiva gerada a partir desse fato.

Na pratica:

1. O fato e registrado em Ocorrencia, Evento ou Investigacao.
2. O analista identifica que existe um risco associado.
3. A Analise de Risco e criada e vinculada ao numero do relatorio.
4. O sistema passa a tratar os documentos como parte do mesmo ciclo de acompanhamento.
5. O PDF do relatorio pode consolidar a analise vinculada, tornando o documento mais completo.

### Beneficio Operacional

Esse vinculo permite demonstrar que a area de Seguranca Patrimonial nao apenas registrou o fato, mas tambem avaliou risco, impacto, probabilidade, severidade e plano de acao.

## Analises Estrategicas

Permitem transformar dados operacionais em diagnostico e plano de acao.

Podem ser vinculadas a ocorrencias, eventos, investigacoes ou analises de risco.

### Finalidade da Analise Estrategica

A Analise Estrategica e usada quando o registro operacional exige uma leitura mais ampla, envolvendo padroes, reincidencia, tendencia, vulnerabilidade, causa provavel e recomendacao gerencial.

Ela nao substitui a Analise de Risco. Cada uma possui funcao diferente:

- Analise de Risco: mede probabilidade, severidade, impacto e nivel de risco;
- Analise Estrategica: interpreta contexto, recorrencia, tendencia, causa e recomendacao de decisao.

### Vinculos Possiveis

A Analise Estrategica pode ser vinculada a:

- Relatorio de Ocorrencia;
- Relatorio de Evento;
- Relatorio de Investigacao;
- Analise de Risco.

Quando vinculada a uma Analise de Risco, o ideal e usar o numero de protocolo da AR, por exemplo AR001/2026. Quando vinculada a relatorio, o ideal e usar o numero do documento, por exemplo 0001/2026.

### Exemplos de Uso

**Exemplo 1 - Ocorrencia com reincidencia**  
Um relatorio de ocorrencia registra avaria em area sensivel. Se o mesmo local ja apresentou eventos semelhantes, cria-se uma Analise Estrategica para avaliar reincidencia, horario, vulnerabilidade e recomendacao.

**Exemplo 2 - Evento operacional recorrente**  
Eventos repetidos de falha de comunicacao com servidor CFTV podem gerar Analise Estrategica para avaliar impacto no monitoramento, necessidade de manutencao, SLA e prioridade de investimento.

**Exemplo 3 - Investigacao com conclusao critica**  
Uma investigacao conclui que houve falha de procedimento. A Analise Estrategica pode consolidar causa, consequencia, recomendacao de treinamento, revisao de processo e plano preventivo.

**Exemplo 4 - Analise de Risco elevada**  
Uma AR classificada como Critica pode gerar Analise Estrategica para apoiar decisao gerencial, justificativa de investimento, reforco operacional ou mudanca de procedimento.

### Como Aparece no Documento Final

Quando uma ocorrencia, evento ou investigacao possui Analise de Risco ou Analise Estrategica vinculada, essas informacoes devem compor o historico do documento e podem aparecer no PDF final em paginas ou secoes proprias.

Essa consolidacao transforma o relatorio em um dossie completo:

- fato registrado;
- envolvidos;
- evidencias;
- analise operacional;
- investigacao, quando houver;
- analise de risco;
- analise estrategica;
- plano de acao;
- conclusao e rastreabilidade.

### Beneficio Gerencial

O vinculo entre relatorios, analises de risco e analises estrategicas permite apresentar uma linha de raciocinio completa:

1. O que aconteceu.
2. Onde aconteceu.
3. Qual o impacto.
4. Qual risco foi identificado.
5. Qual padrao ou tendencia existe.
6. Qual plano de acao foi definido.
7. Quem e responsavel.
8. Qual evidencia sustenta a decisao.

## Inteligencia Operacional

Consolida reincidencias por local, natureza, horario e unidade. Ajuda a identificar padroes e pontos criticos.

## Gestao Patrimonial

Modulo de visao avancada para indicadores patrimoniais, cadeia de custodia, criticidade, planos e relatorios executivos.

## Planos de Acao

Usados para acompanhar tratativas, responsaveis, prazos e status.

## Checklist Inspecao Preventiva

Modulo para registrar inspeções preventivas por local cadastrado, categoria, conformidade, criticidade e observacoes.

## Sugestoes de Melhoria

Permite que qualquer perfil envie sugestoes de melhoria com assunto, descricao e print de tela.

O status pode ser acompanhado pela administracao.

## Governanca

Modulo administrativo para saude do ambiente, backup local, configuracoes tecnicas, politicas e recomendacoes de producao.

### Backup

O backup local copia o banco SQLite para uma pasta de backups no backend. Ele serve como medida operacional de seguranca, mas nao substitui uma politica profissional de backup externo.

## Integridade do Sistema

Audita evidencias, uploads, arquivos ausentes, arquivos orfaos, quarentena, backups e configuracoes criticas.

### Arquivos Orfaos

Sao arquivos existentes em uploads que nao possuem mais vinculo no banco.

O Super Admin pode mover esses arquivos para quarentena e, apos validacao, excluir definitivamente.

## Logs

Registram acoes do sistema, incluindo:

- Login;
- Logout;
- Criacao;
- Edicao;
- Exclusao ou remocao;
- Inicio e conclusao de analise;
- Conversao para investigacao;
- Alteracao de status;
- Acoes administrativas.

## Boas Praticas de Uso

- Preencher campos com clareza.
- Evitar abreviacoes sem padrao.
- Anexar evidencias relevantes.
- Usar natureza e subnatureza corretamente.
- Conferir local e unidade antes de salvar.
- Revisar relatorios antes de enviar ou finalizar.
- Nunca excluir evidencias sem validacao.
- Utilizar logs e integridade para auditoria.

## Consideracoes Finais

O JetGuard foi criado para ser uma plataforma evolutiva, adaptada a realidade de seguranca patrimonial em ambiente alfandegado. Sua forca esta na integracao entre registro operacional, analise, evidencia, CFTV, quadra, riscos, governanca e inteligencia.

A autoria funcional, conceitual e arquitetural do sistema e de Fernando Nunes, com apoio de inteligencia artificial como ferramenta auxiliar de desenvolvimento e documentacao.
