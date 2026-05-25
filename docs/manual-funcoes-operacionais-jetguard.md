# Manual de Funções Operacionais JetGuard - Movecta Patrimonial

## Objetivo do Sistema

O JetGuard é uma plataforma operacional para Segurança Patrimonial, desenvolvida para registrar, acompanhar, analisar e auditar ocorrências, eventos, investigações, riscos, câmeras CFTV, planos de ação, checklists e atividades dos usuários por unidade operacional.

O sistema foi estruturado para apoiar decisões, preservar histórico, gerar evidências, controlar permissões por perfil e manter rastreabilidade completa das ações executadas.

## Perfis de Acesso

### Super Admin

Possui acesso total ao sistema, incluindo todas as unidades, usuários, logs, relatórios, análises, configurações, aprovações e anulações.

### Administrador

Gerencia usuários, relatórios, logs, dashboards, análises, configurações, aprovações e anulações dentro do ambiente permitido.

### Analista

Pode acompanhar relatórios, iniciar/concluir análises, atuar em investigações, consultar logs, registrar acordo em anulações e utilizar módulos analíticos.

### Operador

Registra e acompanha ocorrências, eventos, câmeras, checklists operacionais e dashboards permitidos. Não deve executar ações administrativas sensíveis.

## Login e Ambiente de Trabalho

1. Acesse a tela de login.
2. Informe e-mail e senha.
3. Após autenticação, o sistema apresenta o ambiente de trabalho conforme a unidade do usuário.
4. Super Admin, Administrador e Analista podem alternar unidade quando permitido.
5. Operadores permanecem restritos à unidade de cadastro.

## Dashboard

O dashboard apresenta indicadores consolidados, filtros e gráficos para acompanhamento gerencial.

Principais informações:

- total de ocorrências;
- total de eventos;
- investigações;
- status aberto, em análise e concluído;
- indicadores financeiros;
- gráficos por natureza;
- gráficos por local;
- evolução temporal;
- geração de relatório conforme filtros.

## Gráficos e Indicadores do Dashboard

Os gráficos do JetGuard foram criados para transformar registros operacionais em visão gerencial. Eles ajudam a identificar volume, tendência, recorrência, impacto financeiro, locais críticos e riscos prioritários.

### Cards por Status

Mostram a quantidade de relatórios, eventos e investigações separados por status.

Função:

- identificar rapidamente o volume aberto;
- acompanhar registros em análise;
- visualizar registros concluídos;
- apoiar priorização da equipe.

Como interpretar:

- muitos itens abertos indicam demanda operacional acumulada;
- muitos itens em análise indicam concentração de trabalho técnico;
- poucos itens concluídos podem indicar necessidade de revisão de fluxo.

### Gráficos de Rosca

Apresentam a distribuição visual dos registros por status, normalmente aberto, em análise e concluído.

Função:

- comparar proporcionalmente os status;
- facilitar leitura rápida em reuniões;
- identificar desequilíbrio entre criação e conclusão.

Como interpretar:

- rosca com maior parte em aberto indica fila de atendimento;
- rosca com maior parte concluída indica bom avanço operacional;
- crescimento da parte em análise pode indicar necessidade de reforço analítico.

### Gráfico Financeiro

Mostra valores de prejuízo, valor recuperado e diferença entre perdas e recuperação.

Função:

- medir impacto financeiro;
- acompanhar recuperação;
- demonstrar resultado das ações preventivas e corretivas;
- apoiar apresentação gerencial.

Como interpretar:

- prejuízo alto com baixa recuperação indica ponto de atenção;
- aumento de recuperação demonstra efetividade das ações;
- diferença elevada entre perda e recuperação exige plano de ação.

### Gráfico por Natureza

Mostra quais naturezas aparecem com maior frequência em ocorrências e eventos.

Função:

- identificar tipos de problemas recorrentes;
- apoiar criação de campanhas preventivas;
- orientar capacitações e ações preventivas;
- direcionar fiscalização.

Como interpretar:

- uma natureza muito recorrente indica padrão operacional;
- aumento de determinada natureza pode indicar falha de processo;
- queda após ação corretiva indica melhoria.

### Gráfico por Local

Aponta os locais com maior concentração de ocorrências ou eventos.

Função:

- identificar áreas críticas;
- reforçar patrulhamento;
- priorizar câmeras;
- direcionar planos de ação.

Como interpretar:

- local com alto volume precisa de análise específica;
- reincidência em área monitorada pode indicar necessidade de ajuste no CFTV;
- redução após tratativa demonstra efetividade operacional.

### Gráfico Temporal

Mostra a evolução de ocorrências e eventos por período, mês ou ano.

Função:

- acompanhar crescimento ou redução;
- identificar sazonalidade;
- comparar períodos;
- apoiar análise de tendência.

Como interpretar:

- linha ascendente indica aumento de volume;
- picos isolados indicam eventos pontuais;
- repetição de picos em horários ou meses específicos indica padrão.

### Ranking de Câmeras Instáveis

Mostra quais câmeras apresentam maior número de falhas ou maior tempo offline.

Função:

- priorizar manutenção;
- identificar equipamentos críticos;
- avaliar desempenho de servidores;
- reduzir indisponibilidade.

Como interpretar:

- câmera no topo do ranking precisa de inspeção;
- várias câmeras do mesmo servidor indicam possível falha de infraestrutura;
- falhas repetidas exigem plano de manutenção.

### Indicador de Disponibilidade CFTV

Mostra o percentual de câmeras conectadas e desconectadas.

Função:

- acompanhar saúde do parque de câmeras;
- medir SLA operacional;
- identificar indisponibilidade;
- apoiar tomada de decisão rápida.

Como interpretar:

- disponibilidade alta indica estabilidade;
- indisponibilidade crescente exige ação imediata;
- SLA abaixo da meta deve gerar tratativa.

### Mapa ou Painel Operacional de Câmeras

Apresenta visão por área monitorada, status e criticidade.

Função:

- facilitar monitoramento em tempo real;
- orientar operadores;
- destacar áreas sem cobertura ou com falha;
- apoiar tomada de decisão no Centro de Operações.

Como interpretar:

- áreas com alerta indicam necessidade de verificação;
- concentração de falhas em uma área indica risco operacional;
- áreas críticas devem ter prioridade de manutenção.

### Heatmap de Risco

Mostra a concentração de riscos por probabilidade e severidade.

Função:

- destacar riscos críticos;
- apoiar priorização de planos de ação;
- facilitar apresentação executiva;
- mostrar evolução da exposição operacional.

Como interpretar:

- concentração em alto/crítico exige ação imediata;
- concentração em baixo/moderado indica risco controlado;
- deslocamento para níveis menores indica melhoria.

### Tendência Mensal

Mostra a evolução mensal dos registros, riscos ou falhas.

Função:

- comparar meses;
- visualizar tendência;
- identificar aumento ou redução;
- apoiar planejamento.

Como interpretar:

- tendência crescente exige investigação;
- tendência estável indica padrão previsível;
- tendência decrescente após ação mostra resultado.

### Filtros dos Gráficos

Os filtros permitem refinar os indicadores por período, unidade, status, local, natureza e outros campos.

Função:

- analisar somente uma unidade;
- comparar períodos;
- verificar status específicos;
- gerar relatórios gerenciais mais precisos.

Boa prática:

- antes de apresentar os números, confirme os filtros aplicados;
- utilize período mensal para reuniões operacionais;
- utilize período anual para análise estratégica;
- salve ou gere PDF quando precisar compartilhar o resultado.

## Relatórios de Ocorrência

Utilizado para registrar fatos de Segurança Patrimonial com impacto operacional, patrimonial ou disciplinar.

Passo a passo:

1. Acesse Relatórios > Ocorrências.
2. Clique em Novo Relatório.
3. Preencha assunto, local, natureza, subnatureza e data.
4. Informe os envolvidos.
5. Descreva o relato de Segurança Patrimonial.
6. Anexe fotos, PDFs ou documentos permitidos.
7. Salve o relatório.

Funções disponíveis:

- visualizar relatório em popup;
- editar dados mediante botão Editar Dados;
- iniciar análise;
- converter para investigação;
- solicitar anulação;
- mencionar usuários;
- gerar PDF com cabeçalho, corpo, assinatura digital, token e QR Code.

## Relatórios de Eventos

Utilizado para registrar eventos operacionais relevantes que precisam de acompanhamento, análise ou histórico.

O fluxo é semelhante ao de ocorrências:

1. Acesse Relatórios > Eventos.
2. Clique em Novo Relatório.
3. Preencha os dados principais.
4. Informe envolvidos quando houver.
5. Registre o relato.
6. Adicione anexos.
7. Salve o relatório.

Funções disponíveis:

- visualizar;
- editar;
- iniciar análise;
- mencionar usuários;
- solicitar anulação;
- gerar PDF.

## Naturezas e Subnaturezas

Permite padronizar a classificação dos registros.

Exemplo:

- Natureza: Intempéries.
- Subnaturezas: Alagamento, Ventania, Chuva Forte.

Ao criar ocorrências ou eventos, o usuário escolhe a natureza e o sistema apresenta apenas as subnaturezas vinculadas.

## Análise de Ocorrência e Evento

Permite aprofundar a avaliação de um relatório.

Ocorrência:

- responsável;
- início;
- conclusão;
- status;
- prejuízo financeiro;
- descrição da análise;
- usuário que concluiu.

Evento:

- responsável;
- início;
- conclusão;
- status;
- valor recuperado;
- descrição da análise;
- usuário que concluiu.

Ao iniciar análise, o status do relatório passa para Em Análise. Ao concluir, passa para Concluído.

## Investigação

Uma ocorrência pode ser convertida em R.I.

Fluxo:

1. Na edição da ocorrência, clique em Converter para R.I.
2. Confirme a abertura.
3. O sistema cria uma investigação vinculada.
4. A investigação passa a aparecer na listagem própria.

A investigação mantém dados da ocorrência original e adiciona:

- descrição da investigação;
- conclusão dos fatos.

## Solicitação de Anulação

Relatórios não são excluídos diretamente. O sistema utiliza anulação controlada para preservar auditoria.

Fluxo:

1. Usuário clica em Solicitar Anulação.
2. Informa motivo obrigatório.
3. O sistema registra log.
4. Analistas e administradores são mencionados.
5. Analistas registram acordo ou recusa.
6. Administrador ou Super Admin decide.
7. Se aprovado, o relatório recebe status Anulado.

O número do relatório não é reutilizado, preservando rastreabilidade.

## Menções

Permite direcionar um registro para outro usuário acompanhar, tratar, apoiar ou validar.

As menções aparecem em Meus Dados > Minhas Menções e também na Central de Tarefas.

## Minha Jornada

Mostra tudo que o usuário conectado realizou no sistema.

Recursos:

- filtro por data;
- filtro por módulo;
- pesquisa textual;
- total de ações;
- primeira e última atividade;
- linha do tempo;
- movimento por hora.

## Central de Tarefas

Concentra atividades pendentes do usuário.

Pode incluir:

- menções;
- planos de ação;
- riscos;
- aprovações;
- anulações pendentes;
- fluxos de revisão.

## Planejamento Operacional

Funciona como um quadro colaborativo no estilo Kanban para organizar demandas, lembretes e tratativas entre operadores, analistas e administradores.

Principais recursos:

- criação de colunas por unidade;
- criação de cards com título, descrição, prioridade, prazo, setor, local e responsável;
- exibição do usuário que criou cada card;
- movimentação de cards entre colunas por arrastar e soltar;
- reorganização das colunas;
- exclusão segura de colunas vazias;
- arquivamento de cards;
- filtros por prioridade, responsável e texto.

Uso recomendado:

1. Acesse Operação > Planejamento.
2. Crie uma coluna quando precisar representar uma etapa específica do fluxo.
3. Cadastre o card com responsável e prazo.
4. Arraste o card conforme a evolução da tratativa.
5. Arquive o card quando a atividade for encerrada.

Boa prática:

- use cards para tarefas operacionais que precisam de acompanhamento;
- evite excluir colunas com fluxo ativo;
- mantenha responsáveis e prazos atualizados para não perder rastreabilidade.

## Central de Notificações

Exibe alertas operacionais e pendências críticas.

Recursos:

- filtros por tipo;
- filtros por prioridade;
- pesquisa;
- mostrar lidas;
- marcar uma ou todas como lidas;
- atualização periódica.

## Câmeras CFTV

Módulo voltado para gestão e monitoramento de câmeras por unidade.

Campos principais:

- número da câmera;
- servidor;
- sistema;
- período de gravação;
- status;
- tecnologia;
- tipo da câmera;
- local instalado;
- área monitorada;
- infravermelho;
- monitoramento;
- última manutenção;
- observações técnicas.

Quando uma câmera fica desconectada, o sistema inicia contagem de indisponibilidade. Ao reconectar, calcula o tempo offline e registra histórico.

## Checklist Operacional CFTV

Usado para inspeção semanal das câmeras.

Itens avaliados:

- status atual;
- gravação disponível;
- qualidade da imagem;
- infravermelho;
- gravação;
- comunicação com servidor;
- instabilidade;
- necessidade de manutenção;
- observações.

## Análise de Risco

Registra e acompanha riscos operacionais.

Campos principais:

- número automático;
- unidade;
- setor;
- local;
- tipo de risco;
- natureza;
- descrição;
- impacto;
- probabilidade;
- severidade;
- nível automático;
- medidas preventivas;
- plano de ação;
- responsável;
- prazo;
- status.

O nível de risco é calculado com base em probabilidade e severidade.

## Matriz de Risco 5x5

Ferramenta visual para cruzar probabilidade e severidade.

Ajuda a classificar riscos como:

- baixo;
- moderado;
- alto;
- crítico.

## Gestão Patrimonial Avançada

Consolida informações estratégicas da operação patrimonial para apoiar decisões de segurança, prevenção e governança.

O módulo reúne:

- cadeia de custódia de evidências;
- SLA operacional;
- mapa operacional do terminal;
- reincidência e inteligência de padrões;
- criticidade automática;
- relatórios executivos patrimoniais.

Funções principais:

- identificar áreas mais críticas;
- verificar padrões de recorrência;
- acompanhar indicadores de SLA;
- gerar relatório executivo em PDF;
- apoiar reuniões gerenciais e auditorias internas.

Uso recomendado:

1. Acesse Gestão Avançada > Gestão Patrimonial.
2. Verifique os indicadores consolidados.
3. Analise reincidências e criticidades.
4. Gere o relatório executivo quando necessário.
5. Utilize os dados para orientar planos de ação e ações preventivas.

## Planos de Ação

Controla tratativas preventivas e corretivas.

Contém:

- título;
- descrição;
- origem;
- prioridade;
- responsável;
- prazo;
- status;
- percentual;
- evidências;
- comentários.

## Checklists

Permite registrar inspeções operacionais e gerar histórico de conformidade.

## Evidências

Centraliza anexos e arquivos vinculados aos registros.

Inclui:

- origem;
- arquivo;
- tipo;
- hash SHA-256;
- link de visualização.

## Logs e Auditoria

Toda ação relevante é registrada:

- usuário;
- data e hora;
- IP;
- ação;
- módulo;
- registro afetado;
- dados anteriores;
- dados novos.

Exemplos:

- criação de relatório;
- edição;
- início de análise;
- conclusão;
- anulação;
- login;
- alteração de perfil;
- mudança de status.

## Governança e Produção

Área administrativa para acompanhar a saúde técnica do sistema e preparar o ambiente para operação profissional.

O módulo apresenta:

- status da API;
- status do banco de dados;
- situação da pasta de uploads;
- configuração de variáveis sensíveis;
- política de expiração de sessão;
- limite de tentativas de login;
- status de backup local;
- recomendações de produção;
- automações executivas sugeridas.

Funções principais:

- gerar backup local do banco SQLite;
- verificar pendências de configuração;
- confirmar se a segurança básica está aplicada;
- apoiar implantação em produção;
- orientar migração futura para PostgreSQL;
- acompanhar indicadores executivos do ambiente.

Uso recomendado:

1. Acesse Administração > Governança.
2. Confira os cards de saúde do ambiente.
3. Verifique se `JWT_SECRET`, `SUPER_ADMIN_PASSWORD` e `DATABASE_URL` estão configurados.
4. Gere backup antes de alterações importantes.
5. Use as recomendações como checklist de produção.

## Usuários e Permissões

Administradores podem:

- criar usuários;
- editar;
- bloquear;
- ativar;
- redefinir senha;
- filtrar;
- pesquisar.

O Super Admin não pode ser excluído por Administrador.

## Perfil do Usuário

Cada usuário pode alterar:

- foto de perfil;
- apelido.

Dados administrativos como nome completo, e-mail, R.E, setor, cargo, unidade, empresa e perfil são alterados apenas por administrador.

## Boas Práticas Operacionais

1. Registrar ocorrências e eventos no mesmo dia do fato.
2. Usar natureza e subnatureza corretamente.
3. Anexar evidências sempre que possível.
4. Evitar editar relatórios concluídos sem justificativa.
5. Usar menções para envolver responsáveis.
6. Solicitar anulação apenas com motivo claro.
7. Manter checklists CFTV atualizados.
8. Concluir análises com descrição objetiva.
9. Acompanhar Central de Tarefas diariamente.
10. Consultar logs para auditoria e rastreabilidade.

## Encerramento

O JetGuard foi estruturado para elevar o nível de controle, rastreabilidade e gestão da Segurança Patrimonial, permitindo que a empresa tenha visão operacional, analítica e auditável dos eventos relevantes em suas unidades.
