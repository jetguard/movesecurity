# Changelog

Todas as alterações relevantes do JetGuard serão documentadas neste arquivo.

O formato segue uma adaptação do padrão Keep a Changelog e o projeto passa a ser versionado a partir da versão `1.0.0`.

## [1.1.7] - 2026-06-03

### Melhorado

- Central de Documentos passa a concentrar tambem as solicitacoes de anulacao de relatorios.
- Documentos com anulacao vinculada exibem status, motivo, solicitante, acordos dos analistas e decisao administrativa no proprio painel documental.
- A antiga pagina separada de Anulacoes foi removida do menu e redirecionada para a Central de Documentos.
- Pendencias de anulacao no painel de gestao agora apontam para a Central de Documentos.

## [1.1.6] - 2026-06-03

### Melhorado

- Central de Documentos passa a concentrar tambem as tratativas de revisao, aprovacao, devolucao e reabertura de documentos.
- Documentos de Ocorrencia, Evento e Investigacao exibem status de tratativa, motivos de devolucao e acoes operacionais diretamente na previa documental.
- A antiga pagina separada de Aprovacoes foi removida do menu e redirecionada para a Central de Documentos.
- Pendencias de aprovacao no painel de gestao agora apontam para a Central de Documentos.

## [1.1.5] - 2026-06-03

### Corrigido

- Central de Documentos deixa de falhar por completo quando algum modulo documental ainda possui tabela pendente ou inconsistencia na base de producao.
- Consultas da Central agora sao isoladas por modulo, permitindo listar Ocorrencias e demais documentos disponiveis mesmo se outro modulo retornar erro.

## [1.1.4] - 2026-06-03

### Corrigido

- Central de Documentos agora considera todas as unidades permitidas ao usuário, incluindo unidade ativa e unidade principal.
- Relatórios existentes em unidades permitidas passam a aparecer na consulta documental mesmo quando o ambiente ativo não coincide exatamente com a unidade preferencial.

## [1.1.3] - 2026-06-03

### Corrigido

- Central de Documentos passa a consultar corretamente documentos das unidades permitidas para Super Admin e Administrador.
- Adicionado filtro de unidade na Central de Documentos para evitar tela vazia quando a unidade ativa difere da unidade dos registros.
- Middleware de autenticação agora disponibiliza as unidades permitidas para consultas documentais multiambiente.

## [1.1.2] - 2026-06-03

### Adicionado

- Central de Documentos reunindo PDFs de Ocorrências, Eventos, Investigações, Relatório CCOS, Checklist de Inspeção Preventiva, CFTV e Análises de Risco.
- Filtros por protocolo, módulo, unidade, período, status de assinatura e busca textual.
- Painel moderno com lista de documentos à esquerda e prévia do PDF à direita, incluindo ações para abrir, baixar e validar assinatura.
- Serviço base para padronização visual dos PDFs do JetGuard.

### Melhorado

- PDFs de Ocorrência, Eventos, Investigação, Relatório CCOS e CFTV passam a seguir o padrão visual do CIP.
- Cabeçalho, marca d'água, rodapé, paginação, assinatura digital e QR Code de validação foram alinhados entre os principais documentos.
- Prévia de PDFs no próprio sistema liberada de forma controlada para o mesmo domínio.

## [1.1.0] - 2026-05-29

### Adicionado

- Modulo administrativo de Sessoes de usuarios, exibindo usuarios conectados, perfil, unidade, equipe, IP, dispositivo, inicio, ultima atividade, termino e duracao da sessao.
- Historico de sessoes encerradas e desconectadas para auditoria administrativa.
- Acao administrativa para desconectar sessoes ativas de outros usuarios.
- Registro de sessao no login e encerramento no logout, com validacao backend para bloquear tokens de sessoes desconectadas.

### Seguranca

- Administradores passam a conseguir encerrar acessos ativos sem depender do usuario final.
- Usuarios desconectados administrativamente sao redirecionados para login ao tentar continuar usando o sistema.

## [1.0.9] - 2026-05-29

### Seguranca

- Adicionado bloqueio seguro de sessao pelo cabecalho do sistema, com confirmacao antes de bloquear.
- Tela de sessao bloqueada passa a exigir a senha do usuario conectado para liberar o uso do JetGuard.
- Bloqueio sincronizado entre abas do mesmo navegador, evitando acesso por nova aba enquanto a estacao estiver bloqueada.
- Opcao de encerrar sessao diretamente pela tela bloqueada.
- Quando uma sessao bloqueada e encerrada, o proximo login no mesmo navegador inicia automaticamente bloqueado para reduzir risco com senhas salvas.
- Backend passa a validar o desbloqueio por senha e registrar o evento nos logs de auditoria.

## [1.0.8] - 2026-05-28

### Adicionado

- Checklist de equipamentos da portaria e segurança no relatório de Passagem de Turno SOC.
- Botão para carregar automaticamente o último checklist de equipamentos salvo, reaproveitando apenas essas informações no relatório atual.
- Exibição do checklist de equipamentos no PDF da Passagem de Turno, organizado por aparelhos de comunicação, equipamentos de apoio e equipamentos essenciais.
- Endpoint para recuperar o último checklist de equipamentos por unidade e equipe.

### Melhorado

- PDF da Passagem de Turno reorganizado para reduzir páginas em branco, corrigir textos quebrados e apresentar postos em duas colunas.
- Nome do arquivo PDF da Passagem de Turno passa a seguir padrão com número sequencial, data do turno e equipe.

## [1.0.7] - 2026-05-28

### Melhorado

- Informações do Plantão agora possuem apenas o fluxo correto de "Informação do Plantão", sem seleção de Checklist ou Passagem de Serviço.
- Informações adicionadas ao relatório de passagem podem ser editadas ou excluídas em cards antes do envio final.
- PDF da Passagem de Turno passa a exibir o cabeçalho do relatório em duas colunas, com melhor distribuição visual.
- Conteúdo do PDF da Passagem de Turno corrigido para ficar alinhado à esquerda, sem herdar centralização do cabeçalho.

## [1.0.6] - 2026-05-28

### Adicionado

- Módulo completo de Passagem de Turno em Operação SOC.
- Card "Relatório de Passagem de Serviço" ao lado do Livro Eletrônico de Ocorrências.
- Abertura de passagem em tempo real com status "Aberto" e edição contínua durante o plantão.
- Cadastro dinâmico de postos operacionais, colaboradores, R.E e escala.
- Controle de status dos postos Gocil e Scanner com observação obrigatória quando incompleto.
- Seleção de múltiplos colaboradores da mesma unidade/equipe.
- Finalização por botão "Enviar Relatório", com bloqueio de edição e data/hora de encerramento.
- PDF profissional de passagem de turno com cabeçalho, postos, status, informações complementares, CFTV e contêineres na quadra.

### Melhorado

- Informações do Plantão podem ser vinculadas automaticamente à passagem de turno aberta.
- Menu "Checklists" renomeado para "Informações do Plantão" para ficar mais claro para a operação.
- Painel SOC passa a exibir passagens estruturadas, mantendo histórico e rastreabilidade por equipe.

## [1.0.5] - 2026-05-28

### Adicionado

- Página "Sugestão de melhorias" em Administração.
- Envio de sugestões por Operador, Analista, Administrador e Super Admin.
- Campos de assunto, descrição da sugestão e print de tela/PDF.
- Acompanhamento por status: Recebida, Em análise, Aprovada, Implementada e Recusada.
- Resposta administrativa e logs de criação/atualização das sugestões.

## [1.0.4] - 2026-05-28

### Melhorado

- Formulário da Quadra de Segurança simplificado para uso operacional.
- Máscara no número do contêiner no padrão `AAAA 123.456-7`.
- Inclusão do campo Posicionamento para registrar posições como `E13A01`.
- Status operacional reduzido para `Previsão para chegada`, `No terminal` e `Liberado`.
- Tempo no terminal passa a ser exibido apenas em dias, sem classificação crítica por prazo.
- Remoção visual dos campos de transportadora, motorista, documento, placas, tipo/peso de carga, novo lacre, status final e categoria de evidência.

## [1.0.3] - 2026-05-28

### Adicionado

- Campo WYSIWYG "Ações tomadas" em Relatórios de Ocorrência e Relatórios de Eventos.
- Exibição das ações tomadas na visualização rápida e nos PDFs dos relatórios.

### Melhorado

- PDF dos relatórios com paginação mais contínua para textos longos do relato patrimonial, reduzindo espaços em branco entre páginas.
- Dados da análise passam a ser emitidos em página própria após relatos, relato patrimonial e ações tomadas.

## [1.0.2] - 2026-05-28

### Adicionado

- Página administrativa de Últimas Atualizações, exibindo versão atual e changelog do sistema.
- Campo de equipe operacional no cadastro de usuários: Equipe A, Equipe B, Equipe C e Equipe D.
- Filtro por equipe no Painel Operação SOC e relatório de passagem de turno com operador e equipe.
- Numeração própria e sequencial para Relatórios de Investigação, independente da numeração das ocorrências.

### Melhorado

- PDF de ocorrência convertida para R.I. agora inclui o relatório de investigação em página separada, com número da R.I., ocorrência vinculada, data da conversão, responsável, descrição e conclusão dos fatos.
- Listagens e avisos de ocorrência passam a exibir o número formal da R.I. quando existir.

## [1.0.1] - 2026-05-28

### Corrigido

- Checklist CFTV com labels visíveis nos campos de data, retenção estimada e demais campos operacionais.
- Cadastro e edição de câmeras agora aceitam códigos alfanuméricos para câmera e servidor, como `CF001` e `SJJ-1`.
- Migration Prisma para preservar câmeras antigas e converter `Nº da câmera` e `Nº do servidor` para texto.

## [1.0.0] - 2026-05-28

### Adicionado

- Dashboard administrativo com indicadores, filtros, gráficos e visão operacional.
- Módulos de Relatório de Ocorrência, Relatório de Eventos e Investigação.
- Análises vinculadas a ocorrências e eventos, com status, responsáveis, conclusão e valores financeiros quando aplicável.
- Conversão de ocorrência para R.I. com vínculo ao relatório original.
- Geração de PDF para relatórios com cabeçalho, rodapé, assinatura digital, token e QR Code.
- Cadastro de Naturezas e Subnaturezas, com edição e exclusão para Administrador e Analista.
- Cadastro de Locais do terminal com área sensível, status e integração operacional.
- Gestão de usuários com RBAC, Super Admin, Administrador, Analista e Operador.
- Perfil do usuário autenticado com foto, apelido e dados institucionais.
- Controle de unidades/ambientes de trabalho por usuário.
- Logs/auditoria com ações descritivas e rastreabilidade.
- Módulo de Planejamento Operacional em formato de cards e colunas.
- Minha Jornada, com resumo das atividades do usuário conectado.
- Menções, notificações e marcação de leitura.
- Modo escuro e ajustes responsivos para desktop e mobile.
- Módulo de CFTV com cadastro de câmeras, checklist operacional, dashboard SOC, SLA, ranking de instabilidade e alertas automáticos.
- Cálculo de retenção estimada de gravação por câmera no checklist CFTV, com retenção projetada de 180 dias, desconto de indisponibilidade e precisão em dias, horas e minutos.
- Preparação técnica para integração futura com Digifort.
- Módulo de Quadra de Segurança para controle de contêineres, entrada, saída, scanner, lacres, evidências, dossiê e dashboard.
- Dossiê PDF do contêiner com dados operacionais, timeline, anexos e hash de evidências.
- Painel Operação SOC com checklist de turno, passagem de serviço, livro eletrônico, reincidência e indicadores mensais.
- Gestão Patrimonial Avançada, Inteligência Operacional, Matriz 5x5, Planos de Ação, Evidências, Pendências e Aprovações.
- Governança e Produção com saúde do ambiente, backup local, preparação PostgreSQL, comandos de validação e recomendações de produção.
- Manual operacional em PDF para apresentação e treinamento.

### Melhorado

- PDF dos relatórios com layout mais profissional, fluxo contínuo de conteúdo, seções organizadas e melhor aproveitamento da primeira página.
- Relato dos envolvidos no PDF agora flui abaixo dos dados do envolvido, sem cortar textos grandes.
- Interface de login com identidade visual JetGuard/Movecta, favicon e título do sistema.
- Sidebar com grupos mais intuitivos e menu responsivo no mobile.
- Dashboard do Operador sem exibição de valores financeiros sensíveis.
- Formulários com placeholders e textos de orientação.
- Formulários em modo escuro com contraste corrigido.
- Gráficos atualizados com Recharts, tooltips mais suaves e melhor leitura no modo escuro.
- Quadra de Segurança com formulário em sanfona, tabela mais acessível e painéis de alerta.
- CFTV com metas de SLA, alertas de checklist vencido e visão operacional por área.

### Corrigido

- Erro de login inicial para perfis Analista e Operador.
- Persistência e exibição de foto de perfil.
- Exibição de campos de análise ao iniciar análise.
- Exibição de anexos nas edições de relatórios.
- Contraste de etapas e campos nos formulários em modo escuro.
- Página de login ao sair do sistema em ambiente de produção.
- Logs que antes exibiam códigos internos passaram a ter mensagens mais legíveis.
- PDF que deslocava dados para a direita e cortava relato dos envolvidos.

### Segurança

- Controle de acesso por perfil no frontend e backend.
- Super Admin com acesso total e proteção contra exclusão por Administrador.
- Primeiro acesso com troca obrigatória de senha.
- Controle de dispositivo autorizado para Operador e Analista.
- Reset administrativo de dispositivo autorizado.
- Hash SHA-256 em anexos e evidências para cadeia de custódia.
- Política de tentativas de login, expiração de sessão e variáveis sensíveis documentadas em Governança.

### Produção

- Projeto preparado para deploy em VPS com HestiaCP, Nginx, PM2 e domínio próprio.
- Rotina de atualização documentada com `git pull`, migrations Prisma, build frontend e restart PM2.
- Health check administrativo em Governança.
- Backup local do banco SQLite.
- Preparação para migração futura para PostgreSQL.
