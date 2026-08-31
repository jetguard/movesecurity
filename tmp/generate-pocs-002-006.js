const fs = require("fs");
const path = require("path");

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const write = (file, content) => fs.writeFileSync(path.join(root, file), content, "utf8");
const mkdir = (dir) => fs.mkdirSync(path.join(root, dir), { recursive: true });
const rep = (text, from, to) => text.split(from).join(to);

const pocs = {
  "002": {
    title: "Ronda Patrimonial",
    description: "Controle de progresso, avaliação e conclusão do treinamento de ronda patrimonial.",
    sections: [
      sec("5.1", "Ronda física", "Orientar preparação, execução e registro da ronda física.", "A ronda física exige verificação de EPIs, rádio HT, acessos, deslocamento pelo trajeto definido e observação ativa de irregularidades.", ["Verificar EPIs, comunicação e acessos antes do deslocamento.", "Percorrer o trajeto observando sons, odores, fumaça, gás e alterações visuais.", "Inspecionar barreiras físicas, utilidades e locais críticos."], ["Teste fechaduras, cadeados, portões, janelas, cercas, mourões, muros e concertinas.", "Reporte ao CCOS início, metade, fim ou interrupção da ronda.", "Registre a marcação dos pontos definidos para comprovar cobertura da área."], "A ronda física deve ser preventiva, registrada e comunicada ao CCOS durante todo o deslocamento."),
      sec("5.2", "Ronda via câmera", "Padronizar a ronda remota realizada pelo sistema de CFTV.", "A ronda via câmera depende de câmeras online, imagens nítidas, conectividade adequada e observação de perímetro, áreas internas e pontos críticos.", ["Verificar status das câmeras e nitidez das imagens.", "Validar conectividade para evitar travamentos em câmeras PTZ.", "Observar intrusão, sinistros, eventos e patrimônio."], ["A observação pode iniciar pelo perímetro e seguir para áreas internas.", "Em pontos críticos, use zoom e PTZ para verificar detalhes.", "Quando houver agente em campo, a ronda virtual deve acompanhar o deslocamento."], "A ronda virtual apoia a proteção das equipes e não substitui a atenção operacional."),
      sec("5.3", "Protocolo de incidentes - ronda física", "Definir ações imediatas para incidentes encontrados durante ronda física.", "O agente deve agir de forma segura diante de intrusão, porta aberta, arrombamento, princípio de incêndio ou falha de iluminação.", ["Não confrontar intrusão ou invasão sozinho.", "Isolar a área, recuar e acionar reforço via rádio quando necessário.", "Registrar falhas para posterior confecção de RE e apontamentos de vulnerabilidade."], ["Porta aberta ou arrombada exige comunicação ao CCOS e varredura antes de fechamento.", "Princípio de incêndio exige avaliação segura e acionamento da brigada, SSMA ou Bombeiros.", "Falha de iluminação deve gerar registro, correção e intensificação da vigilância."], "A segurança do agente vem antes da intervenção direta."),
      sec("5.4", "Protocolo de incidentes - ronda via câmera", "Definir ações imediatas do CCOS diante de incidentes identificados por câmera.", "O CCOS deve manter a câmera no evento, ampliar campo de visão, acionar equipes e registrar o fato conforme procedimento.", ["Manter a câmera no evento e acionar câmeras adjacentes.", "Acionar equipes de pronta resposta ou autoridades quando necessário.", "Informar liderança para averiguação de portas abertas ou arrombadas."], ["Princípio de incêndio exige acionamento da brigada, SSMA ou Bombeiros.", "Falhas de iluminação devem gerar RE e direcionamento para correção.", "Relatórios devem considerar POC-SEP-001 e matriz FC-1114."], "A preservação da imagem e o acionamento rápido são essenciais para a resposta."),
      sec("5.5", "Auditorias de Vulnerabilidade Patrimonial - AVP", "Apresentar a ronda mensal de auditoria patrimonial.", "A Segurança Patrimonial executa auditorias mensais em perímetro, armazéns, escritórios, pátio de contêineres e pontos sensíveis para identificar vulnerabilidades.", ["Consolidar inconformidades no FC-2158 AVP.", "Emitir análise de nível de segurança com fotos, descrições e localização.", "Direcionar correções aos responsáveis de cada departamento."], ["Apontamentos são classificados por classe e nível de urgência.", "Classes previstas: emergencial, crítica e preventiva.", "A análise considera probabilidade, impacto e urgência."], "A AVP reduz vulnerabilidades e orienta correções com base em criticidade."),
      sec("5.6", "Conclusão", "Reforçar a importância da padronização das rondas patrimoniais.", "A padronização garante controle rigoroso, rastreabilidade, mitigação de incidentes e fortalecimento das barreiras de segurança física.", ["Cumprir o procedimento de ronda patrimonial.", "Registrar e comunicar desvios identificados.", "Contribuir para a integridade do patrimônio, colaboradores e continuidade do negócio."], ["Rondas reduzem vulnerabilidades operacionais.", "O procedimento preserva a imagem institucional da organização.", "A rastreabilidade fortalece a resposta e a melhoria contínua."], "O cumprimento estrito do procedimento é parte essencial da segurança patrimonial."),
    ],
  },
  "003": {
    title: "Apuração e Investigação",
    description: "Controle de progresso, avaliação e conclusão do treinamento de apuração e investigação.",
    sections: [
      sec("5", "Descrição", "Orientar o recebimento e tratamento de informações e informes.", "A Segurança Patrimonial pode receber informações por flagrante, HT, ligação interna, aplicativo de mensagem, meios oficiais, e-mail, Teams ou canal de denúncia.", ["Reportar as informações à liderança de Segurança Patrimonial.", "Validar o conteúdo recebido antes das tratativas.", "Preservar sigilo, confidencialidade, integridade, disponibilidade e autenticidade."], ["Denúncias anônimas devem usar o FC-2237 com o máximo de detalhes.", "Após validação, inicia-se apuração e relatório de investigação quando aplicável.", "Ocorrências podem evoluir para Relatório de Investigação conforme natureza."], "O sigilo dos informes é condição indispensável para proteger fontes e a organização."),
      sec("5.1", "Definição de importância", "Definir o grau de importância das informações recebidas.", "As ameaças identificadas devem ter seu grau de importância definido por análise de risco para orientar as tratativas necessárias.", ["Avaliar consequências potenciais da concretização das informações.", "Definir importância com base em análise de risco.", "Encaminhar tratativas conforme criticidade."], ["Consequências podem ser imensuráveis.", "A análise de risco direciona prioridades.", "A liderança valida o conteúdo antes da sequência das ações."], "Não trate informações sensíveis sem avaliar sua criticidade."),
      sec("5.2", "Métodos e aplicações", "Apresentar ferramentas usadas na investigação.", "O procedimento orienta o uso de métodos como 5 Porquês, 5W2H e Matriz SWOT no planejamento, execução e relatório da investigação.", ["Aplicar método adequado ao tipo de apuração.", "Usar ferramentas para estruturar causas, plano de ação e riscos.", "Manter evidências válidas e rastreáveis."], ["Métodos organizam a investigação e evitam conclusões frágeis.", "O uso correto apoia decisões administrativas.", "A ferramenta escolhida deve servir ao esclarecimento dos fatos."], "Método sem evidência não sustenta decisão; evidência sem método perde força."),
      sec("5.2.1", "Os 5 Porquês", "Explicar o uso dos 5 Porquês para análise de causa raiz.", "O método busca chegar à origem do problema e impedir que a investigação pare em uma causa aparente ou bode expiatório.", ["Perguntar sucessivamente por que o controle falhou.", "Buscar causa raiz antes de concluir responsabilidades.", "Aplicar em casos como desvio de estoque ou falha de controle."], ["Ajuda a entender por que o fato ocorreu.", "Evita parar no primeiro culpado aparente.", "Contribui para corrigir controles vulneráveis."], "A investigação deve chegar à causa raiz, não apenas ao efeito visível."),
      sec("5.3", "5W2H", "Organizar plano de ação e execução da investigação.", "Após identificar culpado ou falha, o 5W2H organiza o que será feito para coletar provas ou corrigir danos.", ["Definir o que será investigado.", "Definir por que, quem, onde, quando, como e quanto custa.", "Planejar cronograma para evitar prescrição."], ["What define o objeto investigado.", "Why define o indício ou motivo.", "Who, Where, When, How e How Much estruturam execução e custo."], "Sem plano de ação, a investigação pode perder prazo, foco e evidência."),
      sec("5.4", "Matriz SWOT", "Aplicar SWOT ao planejamento de risco da investigação.", "A matriz SWOT é usada para avaliar forças, fraquezas, oportunidades e ameaças da própria investigação.", ["Avaliar robustez de provas digitais.", "Analisar influência de suspeitos e riscos externos.", "Usar o caso para melhoria de compliance quando aplicável."], ["Forças: provas digitais robustas.", "Fraquezas: suspeito em cargo influente.", "Ameaças: vazamento para imprensa ou processo trabalhista."], "A SWOT deve apoiar o relatório final e sugerir melhorias estratégicas."),
      sec("5.5", "Conclusão", "Reforçar neutralidade, sigilo e validade das evidências.", "A aplicação rigorosa garante apurações com neutralidade, sigilo e integridade, servindo de base para decisões administrativas e medidas disciplinares quando cabíveis.", ["Conduzir apuração com neutralidade.", "Preservar sigilo e integridade dos envolvidos.", "Transformar cada investigação em diagnóstico de vulnerabilidades."], ["O relatório final deve ser auditável e resistente a questionamentos jurídicos.", "Métodos padronizados fortalecem validade das evidências.", "Dados consolidados alimentam melhoria dos controles internos."], "A investigação deve buscar a verdade real e fortalecer a cultura de transparência."),
    ],
  },
  "004": {
    title: "Gerenciamento do Contrato da Empresa de Segurança",
    description: "Controle de progresso, avaliação e conclusão do treinamento de gerenciamento do contrato da empresa de segurança.",
    sections: [
      sec("5.1", "Contrato da empresa de segurança", "Orientar a gestão do contrato da empresa de segurança.", "A liderança de Segurança Patrimonial deve comunicar a gestão da contratada, manter reuniões mensais registradas e garantir treinamentos, integração e efetivo adequado.", ["Estabelecer cronograma de reuniões mensais ROG.", "Registrar necessidades de melhoria da equipe contratada.", "Garantir treinamentos, integração Movecta e efetivo suficiente."], ["Colaboradores contratados devem cumprir descanso e intervalo de refeição.", "Demandas de melhoria devem ser discutidas em ROG.", "A integração da Movecta é obrigatória antes do exercício das funções."], "A gestão do contrato deve ser documentada e acompanhada continuamente."),
      sec("5.2", "Monitoramento do desempenho", "Definir critérios de acompanhamento do contrato.", "O desempenho da contratada é monitorado por aderência a procedimentos, treinamentos, apresentação, disciplina, auditorias de conduta e controle de postos vagos.", ["Verificar atendimento aos procedimentos da contratante.", "Acompanhar treinamentos internos por unidade e função.", "Controlar apresentação, formulários, disciplina, bem-estar e postos vagos."], ["Auditoria de conduta avalia apontamentos e pronta resposta a não conformidades.", "Postos vagos devem ser controlados.", "A apresentação da equipe faz parte da medição de desempenho."], "O desempenho deve ser medido por critérios objetivos e recorrentes."),
      sec("5.3", "Gerenciamento e supervisão", "Definir a supervisão da prestação de serviços.", "Líderes de Segurança Patrimonial atuam como ponto de contato, supervisionam desempenho e reportam inconformidades e melhorias.", ["Realizar visitas periódicas em campo.", "Assegurar nível apropriado de serviços no terminal.", "Manter contato com coordenação, gerência e superintendência da contratada."], ["Colaboradores devem ser supervisionados em todas as unidades.", "A contratada apresenta ROG e trata demandas e negociações.", "A liderança Movecta centraliza comunicação sobre desempenho."], "A supervisão em campo garante aderência entre contrato e execução."),
      sec("5.4", "Vestimenta e equipamentos", "Estabelecer exigências de uniforme e EPIs.", "A empresa contratada deve certificar que funcionários usem uniforme adequado, apresentável e aprovado, além dos EPIs necessários às atividades.", ["Garantir uniforme adequado e aprovado.", "Assegurar porte dos EPIs necessários.", "Manter apresentação compatível com as atividades do posto."], ["A exigência considera a Lei nº 14.967/2024, Art. 29.", "Uniforme e EPI fazem parte da conformidade operacional.", "A contratada responde por essa condição."], "Equipe sem vestimenta adequada ou EPI compromete qualidade e segurança do serviço."),
      sec("5.5", "Greve", "Definir comunicação e plano alternativo em caso de greve.", "Na eventualidade de greve, a Coordenação de Segurança da contratada deve informar providências e planos alternativos à liderança, supervisão e coordenação Movecta.", ["Comunicar imediatamente situações de greve.", "Apresentar providências e plano alternativo.", "Evitar impacto aos terminais Movecta."], ["A comunicação deve envolver liderança, supervisão e coordenação de Segurança Patrimonial.", "Planos alternativos devem preservar continuidade.", "A contratada deve atuar preventivamente."], "Greve exige comunicação rápida e plano de continuidade."),
      sec("5.6", "Acionamento emergencial", "Orientar aumento emergencial de efetivo.", "Em emergências, a Coordenação de Segurança Patrimonial Movecta solicita à coordenação da contratada aumento de efetivo em tempo acordado.", ["Identificar necessidade emergencial de aumento de efetivo.", "Solicitar reforço à coordenação da contratada.", "Acompanhar atendimento dentro do tempo acordado."], ["O acionamento ocorre em situações emergenciais.", "O atendimento deve seguir prazo acordado a partir da solicitação.", "A coordenação Movecta formaliza a necessidade."], "Reforço emergencial deve ser rápido e rastreável."),
      sec("5.7", "Avaliação de conduta", "Padronizar avaliação mensal da conduta da contratada.", "A empresa contratada passa por avaliações mensais em todos os postos para verificar qualidade do serviço, cumprimento de PNPs e POCs e execução operacional.", ["Programar e conduzir avaliações.", "Informar formalmente o resultado à contratada.", "Registrar avaliação no FC-2236 RAC."], ["O RAC aponta desvios e melhorias necessárias.", "Inconformidades graves geram notificações por ofício via jurídico.", "A contratada pode acompanhar a avaliação quando possível."], "A avaliação de conduta sustenta correções formais e melhoria do serviço."),
    ],
  },
  "005": {
    title: "Operação de Escaneamento de Contêineres",
    description: "Controle de progresso, avaliação e conclusão do treinamento de operação de escaneamento de contêineres.",
    sections: [
      sec("5.1", "Fluxo de escaneamento", "Apresentar o fluxo de escaneamento nas unidades Movecta.", "No T1 Guarujá, todos os contêineres que acessam o terminal passam por escaneamento devido à posição do equipamento após a balança de entrada.", ["Acompanhar parametrizações no sistema Novvs.", "Direcionar unidades de importação do T2 Guarujá ao T1 quando houver obrigatoriedade.", "Cumprir definições aplicáveis à operação do scanner."], ["Unidades definidas para scanner são demonstradas no Novvs.", "Contêineres de importação do T2 podem passar pelo scanner no T1.", "O fluxo apoia conformidade aduaneira."], "O escaneamento é condicionante de segurança e conformidade com requisitos da Receita Federal."),
      sec("5.2", "Monitoramento de contêineres", "Orientar monitoramento de contêineres no sistema Novvs.", "Segurança Patrimonial e Processos Aduaneiros monitoram contêineres de importação e exportação e notificam Operações sobre pendências de escaneamento.", ["Monitorar pendências de escaneamento.", "Notificar o setor Operacional quando houver pendência.", "Informar exceções de Flat Rack e Open Top ao COV via Processos Aduaneiros."], ["A conformidade observa a Portaria nº 119 da ALF/STS.", "Flat Rack e Open Top com excesso acima de 30 cm podem ser dispensados conforme acordo.", "Exceções devem ser comunicadas pelo fluxo definido."], "Pendências de escaneamento devem ser tratadas para manter conformidade."),
      sec("5.3", "Análise das imagens escaneadas", "Explicar a análise de imagens de raio-X.", "O Inspetor de Imagem/Carga analisa imagens para identificar anormalidades e áreas suspeitas usando critérios de peso atômico, densidade e colorações.", ["Analisar imagens para detectar anormalidades.", "Liberar imagens dentro dos padrões no sistema operacional.", "Reportar anormalidades a Processos Aduaneiros e Segurança Patrimonial."], ["Cores indicam orgânicos, mistos e inorgânicos.", "Status CHEIO ou VAZIO deve ser conferido com Novvs e imagem.", "Divergências devem ser comunicadas imediatamente por e-mail com número do contêiner."], "O tempo de análise do Inspetor é inegociável e não deve sofrer interferência."),
      sec("5.4", "Diretório da Receita Federal", "Definir disponibilidade e qualidade das imagens para Receita Federal.", "As imagens devem estar disponíveis com qualidade satisfatória no Diretório Movecta na mesma data do escaneamento e migrar diariamente para a pasta Scanner.", ["Garantir qualidade satisfatória das imagens.", "Solicitar retorno do caminhão quando a imagem não atender padrões.", "Regularizar pendências de migração automática no Novvs com a prestadora."], ["Imagem insatisfatória exige retorno ao canal de inspeção.", "Processos Aduaneiros identifica pendências no Novvs.", "A prestadora deve regularizar imagens pendentes."], "Imagem pendente ou sem qualidade pode comprometer conformidade com a Receita Federal."),
      sec("5.5", "Área suspeita no primeiro escaneamento", "Definir comunicação de área suspeita no primeiro escaneamento.", "Toda unidade identificada com área suspeita pela prestadora deve ser informada a Segurança Patrimonial e Processos Aduaneiros por e-mail.", ["Informar contêineres cheios e vazios com área suspeita.", "Abranger fluxos de importação e exportação.", "Anexar imagem extraída diretamente do sistema de análise."], ["A comunicação deve conter nomenclatura da unidade.", "A imagem deve seguir anexada.", "A comunicação ocorre durante o turno quando identificada."], "Toda área suspeita deve ser comunicada formalmente e com evidência."),
      sec("5.6", "Segundo escaneamento em rotas críticas", "Orientar o segundo escaneamento de exportação para rotas críticas.", "O segundo escaneamento compara dados de imagem da origem e destino para identificar discrepâncias durante armazenamento, conforme análise de risco e destino.", ["Acompanhar programação de recebimento e destino.", "Implementar ações antes do contêiner deixar o terminal.", "Fiscalizar armazenamento e entrega conforme portarias aplicáveis."], ["Transporte e Planejamento apoiam com programação de cargas de rotas críticas.", "Novvs apoia detalhamento e posicionamento das unidades.", "Receita Federal decide sobre ações potenciais em imagens suspeitas."], "A comunicação de imagens suspeitas à Receita Federal cabe a Processos Aduaneiros."),
      sec("5.7", "Relatório de passagem de serviço", "Padronizar relatório de inspeção por turno.", "A empresa responsável pela operação de scanner envia relatório de inspeção no término de cada turno para Segurança Patrimonial e Processos Aduaneiros.", ["Enviar informações ocorridas no turno.", "Respeitar escalas e períodos operacionais definidos.", "Encaminhar relatório à gestão dos departamentos responsáveis."], ["Sudeste opera em escala 12x36 com turnos 07:00-19:00 e 19:00-07:00.", "Nordeste opera em escala 6x1 em turnos definidos.", "O relatório registra a passagem de serviço."], "A passagem de serviço mantém continuidade e rastreabilidade da operação."),
      sec("5.8", "Ausência da prestadora", "Definir tratativa em ausência da empresa contratada.", "Em ausência de membros das equipes contratadas, cabe à própria empresa providenciar cobertura para não impactar as operações Movecta.", ["Identificar ausência de equipe contratada.", "Acionar cobertura pela própria prestadora.", "Evitar impacto às operações Movecta."], ["A responsabilidade de cobertura é da prestadora.", "A ausência não deve interromper a operação.", "A gestão deve acompanhar a reposição."], "A operação de scanner não deve ser impactada por ausência de equipe contratada."),
    ],
  },
  "006": {
    title: "CCOS - Centro de Controle Operacional de Segurança",
    description: "Controle de progresso, avaliação e conclusão do treinamento do CCOS.",
    sections: [
      sec("5", "Descrição", "Apresentar o papel do CCOS nas operações de segurança.", "O CCOS é a central de monitoramento das instalações, responsável por acompanhar operações de segurança por CFTV, alarmes e sensores eletrônicos em regime 24/7.", ["Monitorar áreas internas e perímetros.", "Identificar eventos e situações suspeitas.", "Acionar equipes de segurança e apoiar investigações."], ["O CCOS coordena segurança eletrônica e apoia equipes de campo.", "Registra e acompanha ocorrências.", "Apoia rondas físicas conforme POC-SEP-002."], "O CCOS deve operar de forma contínua, coordenada e registrada."),
      sec("5.1", "Passagem de posto", "Padronizar a troca de turno no CCOS.", "Ao assumir o turno, o Assistente de Segurança - CFTV realiza rendição formal, verifica relatórios anteriores, câmeras, equipamentos e meios de comunicação.", ["Realizar rendição formal do turno anterior.", "Verificar relatórios operacionais anteriores.", "Confirmar funcionamento de câmeras, HT, telefone e sistemas internos."], ["A passagem garante continuidade do monitoramento.", "As informações operacionais devem permanecer íntegras.", "Falhas devem ser conhecidas no início do turno."], "Troca de turno sem rendição compromete continuidade e rastreabilidade."),
      sec("5.2", "Monitoramento operacional", "Orientar o monitoramento durante o turno.", "Durante o turno, o Assistente de Segurança - CFTV monitora CFTV, verifica falhas de câmeras, faz varredura visual, identifica situações suspeitas e mantém comunicação com a equipe.", ["Monitorar continuamente o CFTV.", "Verificar falhas ou interrupções de câmeras.", "Comunicar imediatamente a equipe responsável quando houver evento relevante."], ["Ao identificar evento, manter câmera focada.", "Acionar câmeras adjacentes para ampliar visão.", "Registrar evento conforme POC-SEP-001."], "Evento relevante deve ser acompanhado, comunicado e registrado imediatamente."),
      sec("5.3", "Ronda eletrônica", "Definir critérios da ronda eletrônica por CFTV.", "O operador realiza rondas eletrônicas observando perímetro, áreas restritas, iluminação, objetos ou veículos suspeitos e sinais de incidentes ou sinistros.", ["Realizar ronda eletrônica preventiva.", "Observar integridade de muros, cercas e portões.", "Verificar movimentação em áreas restritas e áreas críticas."], ["A ronda eletrônica complementa a ronda física.", "Deve seguir princípios definidos no POC-SEP-002.", "Deve observar iluminação e sinais de sinistro."], "Ronda eletrônica não é apenas visualização; é prevenção ativa."),
      sec("5.4", "Apoio às rondas de segurança", "Orientar apoio do CCOS às equipes em ronda física.", "Quando houver equipes em ronda física, o CCOS acompanha deslocamento por CFTV, observa riscos, mantém comunicação e registra irregularidades.", ["Acompanhar deslocamento das equipes por CFTV.", "Manter comunicação permanente com agentes.", "Registrar irregularidades identificadas durante a ronda."], ["O CFTV apoia a segurança do agente em campo.", "Riscos nas áreas percorridas devem ser observados.", "O apoio segue diretrizes do POC-SEP-002."], "O CCOS deve proteger e orientar a equipe de campo durante a ronda."),
      sec("5.5", "Gestão de ocorrências", "Definir conduta do CCOS ao identificar ocorrência.", "Ao identificar ocorrência, o Assistente de Segurança - CFTV registra o fato, informa a liderança, aciona equipe responsável, acompanha pelas câmeras e registra evidências.", ["Registrar fato em relatório operacional.", "Informar imediatamente o Líder de Segurança.", "Acionar equipe responsável e acompanhar pelas câmeras."], ["Evidências disponíveis devem ser registradas.", "A liderança deve ser informada sem demora.", "A equipe de segurança responsável deve ser acionada."], "Ocorrência identificada pelo CCOS exige registro, comunicação e acompanhamento por imagem."),
    ],
  },
};

function sec(numero, titulo, objetivo, resumo, responsabilidades, pontos, atencao) {
  return { numero, titulo, objetivo, resumo, responsabilidades, pontos, atencao };
}

function className(code) { return `TreinamentoPocSep${code}`; }
function camel(code) { return `treinamentoPocSep${code}`; }
function slug(code) { return `poc-sep-${code}`; }
function prefix(code) { return `POC${code}`; }

function buildQuestions(cfg) {
  const wrong = [
    "Apenas comunicação informal sem registro.",
    "Somente acompanhamento financeiro do contrato.",
    "Atividade sem relação com segurança patrimonial.",
    "Ação opcional sem necessidade de evidências.",
    "Procedimento externo sem aplicação operacional.",
  ];
  const questions = [];
  for (const section of cfg.sections) {
    questions.push({
      pergunta: `Qual é o foco da etapa ${section.numero} - ${section.titulo}?`,
      opcoes: [section.objetivo, wrong[0], wrong[1], wrong[2]],
      correta: 0,
    });
    if (section.pontos[0]) {
      questions.push({
        pergunta: `Na etapa ${section.titulo}, qual ponto deve ser observado?`,
        opcoes: [section.pontos[0], wrong[3], wrong[1], wrong[4]],
        correta: 0,
      });
    }
  }
  while (questions.length < 15) {
    const section = cfg.sections[questions.length % cfg.sections.length];
    questions.push({
      pergunta: `Conforme a ${section.titulo}, qual responsabilidade faz parte do procedimento?`,
      opcoes: [section.responsabilidades[0], wrong[2], wrong[0], wrong[4]],
      correta: 0,
    });
  }
  return questions.slice(0, 15);
}

function replaceBlock(source, startMarker, endMarker, replacement) {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start);
  if (start < 0 || end < 0) throw new Error(`Bloco não encontrado: ${startMarker}`);
  return source.slice(0, start) + replacement + source.slice(end);
}

function makeArray(name, value) {
  return `const ${name} = ${JSON.stringify(value, null, 2)};\n\n`;
}

const controllerTemplate = read("backend/src/controllers/treinamentoPocSep001.controller.ts");
const routeTemplate = read("backend/src/routes/treinamentoPocSep001.routes.ts");
const publicTemplate = read("frontend/src/pages/TreinamentoPocSep001Publico.tsx");
const adminTemplate = read("frontend/src/pages/TreinamentosPocSep001.tsx");

for (const [code, cfg] of Object.entries(pocs)) {
  const totalEtapas = cfg.sections.length + 1;
  const questions = buildQuestions(cfg);

  let controller = controllerTemplate;
  controller = rep(controller, "PocSep001", `PocSep${code}`);
  controller = rep(controller, "pocSep001", `pocSep${code}`);
  controller = rep(controller, "TreinamentoPocSep001", className(code));
  controller = rep(controller, "treinamentoPocSep001", camel(code));
  controller = rep(controller, "POC-SEP-001", `POC-SEP-${code}`);
  controller = rep(controller, "poc-sep-001", slug(code));
  controller = rep(controller, "certificados-poc-sep-001", `certificados-${slug(code)}`);
  controller = rep(controller, "certificado-poc-sep-001", `certificado-${slug(code)}`);
  controller = rep(controller, "movecta_poc_sep_001_certificado_", `movecta_poc_sep_${code}_certificado_`);
  controller = rep(controller, "POC001-", `${prefix(code)}-`);
  controller = rep(controller, "/POC001-(\\d+)\\/", `/${prefix(code)}-(\\d+)\\/`);
  controller = controller.replace("const TOTAL_ETAPAS_CONTEUDO = 11;", `const TOTAL_ETAPAS_CONTEUDO = ${cfg.sections.length};`);
  controller = controller.replace("const TOTAL_ETAPAS = 12;", `const TOTAL_ETAPAS = ${totalEtapas};`);
  controller = controller.replace(/const respostasCorretas = \[[^\]]+\];/, `const respostasCorretas = [${Array(15).fill(0).join(", ")}];`);
  controller = controller.replace("Atendimento e Registros de Eventos, Ocorrências e Investigações", cfg.title);
  write(`backend/src/controllers/treinamentoPocSep${code}.controller.ts`, controller);

  let route = routeTemplate;
  route = rep(route, "PocSep001", `PocSep${code}`);
  route = rep(route, "poc-sep-001", slug(code));
  route = rep(route, "treinamentos-poc-sep-001", `treinamentos-${slug(code)}`);
  route = rep(route, "treinamentoPocSep001.controller", `treinamentoPocSep${code}.controller`);
  write(`backend/src/routes/treinamentoPocSep${code}.routes.ts`, route);

  let publico = publicTemplate;
  publico = rep(publico, "PocSep001", `PocSep${code}`);
  publico = rep(publico, "poc-sep-001", slug(code));
  publico = rep(publico, "POC-SEP-001", `POC-SEP-${code}`);
  publico = rep(publico, "Atendimento e Registros de Eventos, Ocorrências e Investigações", cfg.title);
  publico = replaceBlock(publico, "const secoes: SecaoTreinamento[] = ", "const quizBase: PerguntaQuiz[] = ", makeArray("secoes: SecaoTreinamento[]", cfg.sections));
  publico = replaceBlock(publico, "const quizBase: PerguntaQuiz[] = ", "const fundoMobileUrl", makeArray("quizBase: PerguntaQuiz[]", questions));
  publico = publico.replace("disabled={(treinamento?.etapaAtual || 1) < 12}", `disabled={(treinamento?.etapaAtual || 1) < ${totalEtapas}}`);
  write(`frontend/src/pages/TreinamentoPocSep${code}Publico.tsx`, publico);

  let admin = adminTemplate;
  admin = rep(admin, "PocSep001", `PocSep${code}`);
  admin = rep(admin, "poc-sep-001", slug(code));
  admin = rep(admin, "POC-SEP-001", `POC-SEP-${code}`);
  admin = rep(admin, "treinamentos-poc-sep-001", `treinamentos-${slug(code)}`);
  admin = rep(admin, "treinamento-poc-sep-001", `treinamento-${slug(code)}`);
  admin = rep(admin, "Controle de progresso, avaliação e conclusão do treinamento de atendimento e registros de eventos, ocorrências e investigações.", cfg.description);
  admin = admin.replace(/Math\.min\(item\.etapaAtual, 12\)} de 12/g, `Math.min(item.etapaAtual, ${totalEtapas})} de ${totalEtapas}`);
  write(`frontend/src/pages/TreinamentosPocSep${code}.tsx`, admin);
}

let schema = read("backend/prisma/schema.prisma");
const modelStart = schema.indexOf("model TreinamentoPocSep001 {");
const modelEnd = schema.indexOf("\n}\n", modelStart) + 3;
const modelTemplate = schema.slice(modelStart, modelEnd);
for (const code of Object.keys(pocs)) {
  if (!schema.includes(`model ${className(code)} {`)) {
    schema += "\n" + rep(modelTemplate, "TreinamentoPocSep001", className(code));
  }
}
write("backend/prisma/schema.prisma", schema);

mkdir("backend/prisma/migrations/20260730170000_treinamentos_poc_sep_002_006");
let migration = "";
for (const code of Object.keys(pocs)) {
  const model = className(code);
  migration += `CREATE TABLE "${model}" (
  "id" SERIAL NOT NULL,
  "token" TEXT NOT NULL,
  "usuarioId" INTEGER,
  "codigo" TEXT,
  "nomeCompleto" TEXT NOT NULL,
  "cpf" TEXT,
  "email" TEXT NOT NULL,
  "cargo" TEXT,
  "departamento" TEXT,
  "unidade" TEXT,
  "empresa" TEXT,
  "etapaAtual" INTEGER NOT NULL DEFAULT 1,
  "status" TEXT NOT NULL DEFAULT 'Em andamento',
  "porcentagem" INTEGER NOT NULL DEFAULT 0,
  "nota" DOUBLE PRECISION,
  "tentativas" INTEGER NOT NULL DEFAULT 0,
  "respostasQuiz" TEXT,
  "assinaturaDataUrl" TEXT,
  "certificadoArquivo" TEXT,
  "emailStatus" TEXT,
  "emailEnviadoEm" TIMESTAMP(3),
  "ipInicio" TEXT,
  "navegador" TEXT,
  "sistema" TEXT,
  "dataInicio" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "dataConclusao" TIMESTAMP(3),
  "ultimoAcessoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "${model}_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "${model}_token_key" ON "${model}"("token");
CREATE UNIQUE INDEX "${model}_codigo_key" ON "${model}"("codigo");
CREATE INDEX "${model}_email_idx" ON "${model}"("email");
CREATE INDEX "${model}_cpf_idx" ON "${model}"("cpf");
CREATE INDEX "${model}_status_updatedAt_idx" ON "${model}"("status", "updatedAt");

`;
}
write("backend/prisma/migrations/20260730170000_treinamentos_poc_sep_002_006/migration.sql", migration);

console.log(`Gerados: ${Object.keys(pocs).join(", ")}`);
