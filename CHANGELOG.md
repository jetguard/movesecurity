# Changelog

Todas as alterações relevantes do JetGuard serão documentadas neste arquivo.

O formato segue uma adaptação do padrão Keep a Changelog e o projeto passa a ser versionado a partir da versão `1.0.0`.

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
