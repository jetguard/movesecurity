# Treinamento Operacional JetGuard - Movecta Patrimonial

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
