import { Response } from "express";
import { prisma } from "../lib/prisma";
import { AuthRequest } from "../middlewares/auth";

function numero(valor: unknown) {
  const parsed = Number(valor || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function moedaNumero(valor: unknown) {
  const texto = String(valor || "0")
    .replace(/R\$/gi, "")
    .replace(/\s/g, "");
  const normalizado = texto.includes(",")
    ? texto.replace(/\./g, "").replace(",", ".")
    : texto.replace(/[^0-9.-]/g, "");
  const parsed = Number(normalizado);
  return Number.isFinite(parsed) ? parsed : 0;
}

function dados(registro: { dadosJson?: string | null }) {
  try {
    return registro.dadosJson ? JSON.parse(registro.dadosJson) : {};
  } catch {
    return {};
  }
}

function percentual(parte: number, total: number) {
  return total > 0 ? Number(((parte / total) * 100).toFixed(1)) : 0;
}

function minutos(valor: number) {
  const total = Math.max(0, Math.round(valor || 0));
  const horas = Math.floor(total / 60);
  const mins = total % 60;
  if (!horas) return `${mins}min`;
  return `${horas}h ${String(mins).padStart(2, "0")}min`;
}

function agruparPor<T>(lista: T[], seletor: (item: T) => string | null | undefined) {
  const mapa = new Map<string, number>();
  lista.forEach((item) => {
    const chave = seletor(item)?.trim() || "Não informado";
    mapa.set(chave, (mapa.get(chave) || 0) + 1);
  });
  return Array.from(mapa.entries())
    .map(([label, valor]) => ({ label, valor }))
    .sort((a, b) => b.valor - a.valor || a.label.localeCompare(b.label));
}

function somarDados(registros: Array<{ dadosJson?: string | null }>, chave: string) {
  return registros.reduce((total, registro) => total + numero(dados(registro)[chave]), 0);
}

function textosPrincipais(registros: Array<{ dadosJson?: string | null }>, chave: string) {
  return agruparPor(registros, (item) => String(dados(item)[chave] || "")).slice(0, 8);
}

function diasAte(data?: Date | null) {
  if (!data) return null;
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const alvo = new Date(data);
  alvo.setHours(0, 0, 0, 0);
  return Math.round((alvo.getTime() - hoje.getTime()) / 86400000);
}

function resumir(texto?: string | null, limite = 280) {
  const limpo = String(texto || "")
    .replace(/\s+/g, " ")
    .trim();
  if (!limpo) return "Sem resumo informado";
  return limpo.length > limite ? `${limpo.slice(0, limite).trim()}...` : limpo;
}

export async function indicadoresSegurancaEmpresarial(req: AuthRequest, res: Response) {
  try {
    const unidade = req.unidadeAtiva || req.usuarioUnidade || "GJA-T1";
    const unidadesPermitidas = req.unidadesPermitidas?.length
      ? req.unidadesPermitidas
      : [unidade];
    const [
      ocorrencias,
      eventos,
      ocorrenciasBi,
      eventosBi,
      investigacoesBi,
      scanner,
      operacionais,
      vigilanciaBi,
      equipeScannerBi,
      solicitacoes,
      cameras,
      cameraEventos,
    ] = await Promise.all([
      prisma.ocorrencia.findMany({
        where: { unidade },
        select: { status: true, natureza: true, subNatureza: true, local: true, createdAt: true },
        orderBy: { createdAt: "desc" },
        take: 2000,
      }),
      prisma.evento.findMany({
        where: { unidade },
        select: { status: true, natureza: true, subNatureza: true, local: true, createdAt: true },
        orderBy: { createdAt: "desc" },
        take: 2000,
      }),
      prisma.ocorrencia.findMany({
        where: { unidade: { in: unidadesPermitidas } },
        select: {
          id: true,
          codigo: true,
          assunto: true,
          unidade: true,
          natureza: true,
          subNatureza: true,
          local: true,
          status: true,
          dataOcorrencia: true,
          relatoSeguranca: true,
          acoesTomadas: true,
          createdAt: true,
          analise: {
            select: {
              id: true,
              responsavel: { select: { nome: true, apelido: true } },
              concluidoEm: true,
              status: true,
              houveDanoPrejuizo: true,
              tipoImpactoFinanceiro: true,
              valorPrejuizo: true,
              valorRecuperado: true,
            },
          },
        },
        orderBy: { dataOcorrencia: "desc" },
        take: 5000,
      }),
      prisma.evento.findMany({
        where: { unidade: { in: unidadesPermitidas } },
        select: {
          id: true,
          codigo: true,
          assunto: true,
          unidade: true,
          natureza: true,
          subNatureza: true,
          local: true,
          status: true,
          dataEvento: true,
          relatoSeguranca: true,
          acoesTomadas: true,
          createdAt: true,
          analise: {
            select: {
              id: true,
              responsavel: { select: { nome: true, apelido: true } },
              concluidoEm: true,
              status: true,
              houveDanoPrejuizo: true,
              tipoImpactoFinanceiro: true,
              valorPrejuizo: true,
              valorRecuperado: true,
            },
          },
        },
        orderBy: { dataEvento: "desc" },
        take: 5000,
      }),
      prisma.investigacao.findMany({
        where: { unidade: { in: unidadesPermitidas } },
        select: {
          id: true,
          codigo: true,
          numeroOcorrencia: true,
          titulo: true,
          assunto: true,
          unidade: true,
          natureza: true,
          subNatureza: true,
          local: true,
          status: true,
          dataOcorrencia: true,
          descricao: true,
          descricaoInvestigacao: true,
          conclusaoFatos: true,
          updatedAt: true,
          responsavel: { select: { nome: true, apelido: true } },
        },
        orderBy: { dataOcorrencia: "desc" },
        take: 5000,
      }),
      prisma.scannerPassagem.findMany({
        where: { unidade },
        orderBy: { data: "desc" },
        take: 2000,
      }),
      prisma.operacaoIndicadorRegistro.findMany({
        where: {
          unidade,
          modulo: {
            in: [
              "operacao_entrada_saida",
              "operacao_vigilancia",
              "operacao_balanca",
              "operacao_ocr",
              "operacao_acesso",
              "operacao_motoristas",
              "operacao_filas",
            ],
          },
        },
        orderBy: { dataReferencia: "desc" },
        take: 2000,
      }),
      prisma.operacaoIndicadorRegistro.findMany({
        where: {
          unidade: { in: unidadesPermitidas },
          modulo: "operacao_vigilancia",
          statusValidacao: "Validado",
        },
        include: {
          criadoPor: { select: { nome: true, apelido: true } },
          validadoPor: { select: { nome: true, apelido: true } },
        },
        orderBy: { dataReferencia: "desc" },
        take: 5000,
      }),
      prisma.operacaoIndicadorRegistro.findMany({
        where: {
          unidade: { in: unidadesPermitidas },
          modulo: "operacao_equipe_scanner",
          statusValidacao: "Validado",
        },
        include: {
          criadoPor: { select: { nome: true, apelido: true } },
          validadoPor: { select: { nome: true, apelido: true } },
        },
        orderBy: { dataReferencia: "desc" },
        take: 5000,
      }),
      prisma.solicitacaoImagem.findMany({
        where: { unidade, excluidoEm: null },
        include: { anexos: true },
        orderBy: { createdAt: "desc" },
        take: 2000,
      }),
      prisma.cameraMonitoramento.findMany({
        where: { unidade: { in: unidadesPermitidas }, statusCadastro: "Ativa" },
        select: {
          id: true,
          numeroCamera: true,
          nomeCamera: true,
          numeroServidor: true,
          unidade: true,
          status: true,
          tipoCamera: true,
          tecnologia: true,
          localInstalado: true,
          areaMonitorada: true,
          totalFalhas: true,
          totalIndisponibilidade: true,
          desconectadaDesde: true,
        },
        orderBy: [{ unidade: "asc" }, { numeroCamera: "asc" }],
      }),
      prisma.cameraEventoStatus.findMany({
        where: { unidade: { in: unidadesPermitidas } },
        select: { statusNovo: true, iniciadoEm: true, encerradoEm: true, camera: { select: { areaMonitorada: true } } },
        orderBy: { iniciadoEm: "desc" },
        take: 2000,
      }),
    ]);

    const todosRelatorios = [...ocorrencias, ...eventos];
    const registrosOcorrenciasEventos = [
      ...ocorrenciasBi.map((item) => ({
        id: `RO-${item.id}`,
        registroId: item.id,
        tipo: "RO",
        codigo: item.codigo,
        unidade: item.unidade,
        resumo: resumir(item.relatoSeguranca || item.assunto),
        assunto: item.assunto,
        local: item.local,
        natureza: item.natureza,
        subNatureza: item.subNatureza,
        data: item.dataOcorrencia,
        acoesTomadas: resumir(item.acoesTomadas, 220),
        responsavelTratativas:
          item.analise?.responsavel?.apelido || item.analise?.responsavel?.nome || "",
        dataResolucao: item.analise?.concluidoEm || null,
        status: item.analise?.status || item.status,
        diasParaResolucao: diasAte(item.analise?.concluidoEm),
        analisado: Boolean(item.analise?.id),
        impactoFinanceiro: item.analise?.houveDanoPrejuizo || "Não informado",
        tipoImpactoFinanceiro: item.analise?.tipoImpactoFinanceiro || "Não informado",
        valorPrejuizo: moedaNumero(item.analise?.valorPrejuizo),
        valorRecuperado: moedaNumero(item.analise?.valorRecuperado),
      })),
      ...eventosBi.map((item) => ({
        id: `RE-${item.id}`,
        registroId: item.id,
        tipo: "RE",
        codigo: item.codigo,
        unidade: item.unidade,
        resumo: resumir(item.relatoSeguranca || item.assunto),
        assunto: item.assunto,
        local: item.local,
        natureza: item.natureza,
        subNatureza: item.subNatureza,
        data: item.dataEvento,
        acoesTomadas: resumir(item.acoesTomadas, 220),
        responsavelTratativas:
          item.analise?.responsavel?.apelido || item.analise?.responsavel?.nome || "",
        dataResolucao: item.analise?.concluidoEm || null,
        status: item.analise?.status || item.status,
        diasParaResolucao: diasAte(item.analise?.concluidoEm),
        analisado: Boolean(item.analise?.id),
        impactoFinanceiro: item.analise?.houveDanoPrejuizo || "Não informado",
        tipoImpactoFinanceiro: item.analise?.tipoImpactoFinanceiro || "Não informado",
        valorPrejuizo: moedaNumero(item.analise?.valorPrejuizo),
        valorRecuperado: moedaNumero(item.analise?.valorRecuperado),
      })),
      ...investigacoesBi.map((item) => ({
        id: `RI-${item.id}`,
        registroId: item.id,
        tipo: "RI",
        codigo: item.codigo || item.numeroOcorrencia || `RI-${item.id}`,
        unidade: item.unidade,
        resumo: resumir(item.descricaoInvestigacao || item.descricao || item.assunto),
        assunto: item.titulo || item.assunto,
        local: item.local,
        natureza: item.natureza,
        subNatureza: item.subNatureza,
        data: item.dataOcorrencia,
        acoesTomadas: resumir(item.conclusaoFatos, 220),
        responsavelTratativas:
          item.responsavel?.apelido || item.responsavel?.nome || "",
        dataResolucao: item.updatedAt || null,
        status: item.status,
        diasParaResolucao: null,
        analisado: false,
        impactoFinanceiro: "Não se aplica",
        tipoImpactoFinanceiro: "Não se aplica",
        valorPrejuizo: 0,
        valorRecuperado: 0,
      })),
    ].sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());
    const totalScanner = scanner.reduce((total, item) => total + item.total, 0);
    const falhasScanner = scanner.reduce(
      (total, item) => total + item.leituraComFalha + item.insatisfatoria + item.falhasEquipamento,
      0,
    );
    const indisponibilidadeScanner = scanner.reduce(
      (total, item) => total + item.indisponibilidadeMinutos,
      0,
    );
    const ocr = operacionais.filter((item) => item.modulo === "operacao_ocr");
    const entradaSaida = operacionais.filter((item) => item.modulo === "operacao_entrada_saida");
    const vigilancia = operacionais.filter((item) => item.modulo === "operacao_vigilancia");
    const balanca = operacionais.filter((item) => item.modulo === "operacao_balanca");
    const acesso = operacionais.filter((item) => item.modulo === "operacao_acesso");
    const motoristas = operacionais.filter((item) => item.modulo === "operacao_motoristas");
    const filas = operacionais.filter((item) => item.modulo === "operacao_filas");
    const totalLeiturasOcr = somarDados(ocr, "totalLeituras");
    const leiturasCorretasOcr = somarDados(ocr, "leiturasCorretas");
    const falhasOcr = somarDados(ocr, "falhas");
    const totalProcessosEntrada = somarDados(entradaSaida, "totalProcessos");
    const desviosEntrada =
      somarDados(entradaSaida, "falhasRegistro") + somarDados(entradaSaida, "naoConformidades");
    const diasBalanca = Math.max(
      1,
      new Set(balanca.map((item) => item.dataReferencia.toISOString().slice(0, 10))).size,
    );
    const minutosPeriodoBalanca = diasBalanca * 24 * 60;
    const atendimentosAcesso = somarDados(acesso, "atendimentos");
    const desviosAcesso = somarDados(acesso, "bloqueios") + somarDados(acesso, "irregularidades");
    const totalMotoristas = somarDados(motoristas, "novosCadastros") + somarDados(motoristas, "recadastros");
    const desviosMotoristas =
      somarDados(motoristas, "documentosInvalidos") +
      somarDados(motoristas, "cnhInconsistente") +
      somarDados(motoristas, "divergenciaDocumental");
    const eventosFila = somarDados(filas, "eventosFila");

    const solicitacoesConcluidas = solicitacoes.filter((item) => item.status === "Concluído" || item.status === "Finalizado");
    const camerasConectadas = cameras.filter((item) => item.status === "Conectada");
    const camerasDesconectadas = cameras.filter((item) => item.status === "Desconectada");

    return res.json({
      atualizadoEm: new Date(),
      unidade,
      ocorrenciasEventos: {
        cards: [
          { titulo: "Ocorrências", valor: ocorrencias.length },
          { titulo: "Eventos", valor: eventos.length },
          { titulo: "Registros abertos", valor: todosRelatorios.filter((item) => item.status === "ABERTO").length },
          { titulo: "Concluídos", valor: todosRelatorios.filter((item) => item.status === "CONCLUIDO" || item.status === "Concluído").length },
          { titulo: "Naturezas", valor: agruparPor(todosRelatorios, (item) => item.natureza).length },
          { titulo: "Locais mapeados", valor: agruparPor(todosRelatorios, (item) => item.local).length },
        ],
        rankings: {
          naturezas: agruparPor(todosRelatorios, (item) => item.natureza).slice(0, 8),
          subNaturezas: agruparPor(todosRelatorios, (item) => item.subNatureza).slice(0, 8),
          locais: agruparPor(todosRelatorios, (item) => item.local).slice(0, 8),
          status: agruparPor(todosRelatorios, (item) => item.status).slice(0, 8),
        },
        unidades: unidadesPermitidas,
        registros: registrosOcorrenciasEventos,
      },
      valores: {
        cards: [],
        rankings: {},
        unidades: unidadesPermitidas,
        registros: registrosOcorrenciasEventos.filter(
          (item) => item.analisado && item.tipo !== "RI",
        ),
      },
      scanner: {
        cards: [
          { titulo: "Contêineres scanneados", valor: totalScanner },
          { titulo: "% imagens suspeitas", valor: `${percentual(scanner.reduce((t, i) => t + i.areaSuspeita, 0), totalScanner)}%` },
          { titulo: "Aberturas por suspeita", valor: scanner.reduce((t, i) => t + i.aberturasSuspeita, 0) },
          { titulo: "% falhas", valor: `${percentual(falhasScanner, totalScanner)}%` },
          { titulo: "Disponibilidade", valor: `${percentual(Math.max(0, scanner.length * 1440 - indisponibilidadeScanner), scanner.length * 1440)}%` },
          { titulo: "Reprocessamentos", valor: scanner.reduce((t, i) => t + i.reprocessamentos, 0) },
        ],
        rankings: {
          tiposSuspeita: agruparPor(scanner, (item) => item.tiposSuspeita).slice(0, 8),
          scanners: agruparPor(scanner, (item) => item.scanner).slice(0, 8),
        },
      },
      ocr: {
        cards: [
          { titulo: "Total de leituras", valor: totalLeiturasOcr },
          { titulo: "Leituras corretas", valor: leiturasCorretasOcr },
          { titulo: "Assertividade", valor: `${percentual(leiturasCorretasOcr, totalLeiturasOcr)}%` },
          { titulo: "% falhas", valor: `${percentual(falhasOcr, totalLeiturasOcr)}%` },
          { titulo: "Intervenções manuais", valor: somarDados(ocr, "intervencoesManuais") },
          { titulo: "Indisponibilidade", valor: `${somarDados(ocr, "indisponibilidadeMinutos")} min` },
        ],
        rankings: {
          causas: agruparPor(ocr, (item) => String(dados(item).motivoFalha || "")).slice(0, 8),
        },
      },
      entradaSaida: {
        cards: [
          { titulo: "Processos auditáveis", valor: totalProcessosEntrada },
          { titulo: "Veículos auditados", valor: somarDados(entradaSaida, "veiculosAuditados") },
          { titulo: "Registro fotográfico", valor: `${percentual(somarDados(entradaSaida, "conteineresFotoCompleta"), totalProcessosEntrada)}%` },
          { titulo: "Divergências", valor: somarDados(entradaSaida, "divergencias") },
          { titulo: "Não conformidades", valor: somarDados(entradaSaida, "naoConformidades") },
          { titulo: "Conformidade", valor: `${percentual(Math.max(0, totalProcessosEntrada - desviosEntrada), totalProcessosEntrada)}%` },
        ],
        rankings: {
          observacoes: textosPrincipais(entradaSaida, "observacoes"),
        },
      },
      vigilancia: {
        unidades: unidadesPermitidas,
        registros: vigilanciaBi.map((item) => ({
          id: item.id,
          unidade: item.unidade,
          dataReferencia: item.dataReferencia,
          criadoPor: item.criadoPor?.apelido || item.criadoPor?.nome || "Não informado",
          validadoPor: item.validadoPor?.apelido || item.validadoPor?.nome || "Não informado",
          efetivoPrevisto: numero(dados(item).efetivoPrevisto),
          efetivoPresente: numero(dados(item).efetivoPresente),
          faltas: numero(dados(item).faltas),
          postosDescobertos: numero(dados(item).postosDescobertos),
          coberturas: numero(dados(item).coberturas),
          servicosExtras: numero(dados(item).servicosExtras),
          horasPostoDescoberto: numero(dados(item).horasPostoDescoberto),
          rondas: numero(dados(item).rondas),
          desviosRonda: numero(dados(item).desviosRonda),
          desviosTratados: numero(dados(item).desviosTratados),
          ocorrencias: String(dados(item).ocorrencias || ""),
        })),
        cards: [
          { titulo: "Efetivo previsto", valor: somarDados(vigilancia, "efetivoPrevisto") },
          { titulo: "Efetivo presente", valor: somarDados(vigilancia, "efetivoPresente") },
          { titulo: "Cobertura dos postos", valor: `${percentual(somarDados(vigilancia, "efetivoPresente"), somarDados(vigilancia, "efetivoPrevisto"))}%` },
          { titulo: "Absenteísmo", valor: `${percentual(somarDados(vigilancia, "faltas"), somarDados(vigilancia, "efetivoPrevisto"))}%` },
          { titulo: "Rondas realizadas", valor: somarDados(vigilancia, "rondas") },
          { titulo: "Desvios tratados", valor: `${percentual(somarDados(vigilancia, "desviosTratados"), somarDados(vigilancia, "desviosRonda"))}%` },
        ],
        rankings: {
          ocorrencias: textosPrincipais(vigilancia, "ocorrencias"),
        },
      },
      equipeScanner: {
        unidades: unidadesPermitidas,
        registros: equipeScannerBi.map((item) => ({
          id: item.id,
          unidade: item.unidade,
          dataReferencia: item.dataReferencia,
          criadoPor: item.criadoPor?.apelido || item.criadoPor?.nome || "Não informado",
          validadoPor: item.validadoPor?.apelido || item.validadoPor?.nome || "Não informado",
          efetivoPrevisto: numero(dados(item).efetivoPrevisto),
          efetivoPresente: numero(dados(item).efetivoPresente),
          faltas: numero(dados(item).faltas),
          atrasoMinutos: numero(dados(item).atrasoMinutos),
          atrasoInicio: String(dados(item).atrasoInicio || ""),
          atrasoFim: String(dados(item).atrasoFim || ""),
          observacoes: String(dados(item).observacoes || ""),
        })),
        cards: [],
        rankings: {},
      },
      balanca: {
        cards: [
          { titulo: "Atendimentos", valor: somarDados(balanca, "atendimentos") },
          { titulo: "Pesagens", valor: somarDados(balanca, "pesagens") },
          { titulo: "Paradas", valor: somarDados(balanca, "paradas") },
          { titulo: "Disponibilidade", valor: `${percentual(Math.max(0, minutosPeriodoBalanca - somarDados(balanca, "horasIndisponibilidade")), minutosPeriodoBalanca)}%` },
          { titulo: "Tempo médio recuperação", valor: minutos(somarDados(balanca, "tempoNormalizacao") / Math.max(1, somarDados(balanca, "paradas"))) },
          { titulo: "Contingências", valor: somarDados(balanca, "contingencias") },
        ],
        rankings: {
          motivosParada: textosPrincipais(balanca, "motivoParada"),
        },
      },
      acesso: {
        cards: [
          { titulo: "Volume de acessos", valor: somarDados(acesso, "pessoas") + somarDados(acesso, "veiculosLeves") },
          { titulo: "Pessoas", valor: somarDados(acesso, "pessoas") },
          { titulo: "Veículos leves", valor: somarDados(acesso, "veiculosLeves") },
          { titulo: "Bloqueios", valor: somarDados(acesso, "bloqueios") },
          { titulo: "Irregularidades", valor: somarDados(acesso, "irregularidades") },
          { titulo: "Conformidade", valor: `${percentual(Math.max(0, atendimentosAcesso - desviosAcesso), atendimentosAcesso)}%` },
        ],
        rankings: {
          observacoes: textosPrincipais(acesso, "observacoes"),
        },
      },
      motoristas: {
        cards: [
          { titulo: "Novos cadastros", valor: somarDados(motoristas, "novosCadastros") },
          { titulo: "Recadastros", valor: somarDados(motoristas, "recadastros") },
          { titulo: "Bloqueios preventivos", valor: somarDados(motoristas, "bloqueados") },
          { titulo: "Irregularidades", valor: somarDados(motoristas, "irregularidades") },
          { titulo: "Tentativas irregulares", valor: somarDados(motoristas, "tentativasIrregulares") },
          { titulo: "Conformidade documental", valor: `${percentual(Math.max(0, totalMotoristas - desviosMotoristas), totalMotoristas)}%` },
        ],
        rankings: {
          observacoes: textosPrincipais(motoristas, "observacoes"),
        },
      },
      filas: {
        cards: [
          { titulo: "Eventos de fila", valor: eventosFila },
          { titulo: "Horas totais em fila", valor: minutos(somarDados(filas, "tempoTotalImpactoMin")) },
          { titulo: "Tempo médio por evento", valor: minutos(somarDados(filas, "tempoTotalImpactoMin") / Math.max(1, eventosFila)) },
          { titulo: "Veículos impactados", valor: somarDados(filas, "veiculosImpactados") },
          { titulo: "Contingências", valor: somarDados(filas, "contingencias") },
          { titulo: "% reincidência", valor: `${percentual(somarDados(filas, "reincidencias"), eventosFila)}%` },
        ],
        rankings: {
          principaisCausas: textosPrincipais(filas, "motivoFila"),
          areasResponsaveis: textosPrincipais(filas, "areaResponsavel"),
        },
      },
      solicitacoesImagens: {
        cards: [
          { titulo: "Solicitações", valor: solicitacoes.length },
          { titulo: "Concluídas", valor: solicitacoesConcluidas.length },
          { titulo: "Em atendimento", valor: solicitacoes.filter((item) => item.status === "Em Atendimento").length },
          { titulo: "Pausadas", valor: solicitacoes.filter((item) => item.status === "Pausado").length },
          { titulo: "Críticas", valor: solicitacoes.filter((item) => item.prioridade === "Crítica").length },
          { titulo: "Evidências", valor: solicitacoes.reduce((total, item) => total + item.anexos.filter((anexo) => anexo.origem === "Evidencia").length, 0) },
        ],
        rankings: {
          locais: agruparPor(solicitacoes, (item) => item.local).slice(0, 8),
          status: agruparPor(solicitacoes, (item) => item.status).slice(0, 8),
          prioridades: agruparPor(solicitacoes, (item) => item.prioridade).slice(0, 8),
        },
      },
      camerasCftv: {
        unidades: unidadesPermitidas,
        cameras,
        cards: [
          { titulo: "Câmeras cadastradas", valor: cameras.length },
          { titulo: "Conectadas", valor: camerasConectadas.length },
          { titulo: "Desconectadas", valor: camerasDesconectadas.length },
          { titulo: "Disponibilidade atual", valor: `${percentual(camerasConectadas.length, cameras.length)}%` },
          { titulo: "Falhas acumuladas", valor: cameras.reduce((total, item) => total + item.totalFalhas, 0) },
          { titulo: "Indisponibilidade acumulada", valor: `${cameras.reduce((total, item) => total + item.totalIndisponibilidade, 0)} min` },
        ],
        rankings: {
          areas: agruparPor(cameras, (item) => item.areaMonitorada).slice(0, 8),
          tipos: agruparPor(cameras, (item) => item.tipoCamera).slice(0, 8),
          tecnologias: agruparPor(cameras, (item) => item.tecnologia).slice(0, 8),
          eventosOffline: agruparPor(cameraEventos, (item) => item.camera?.areaMonitorada).slice(0, 8),
        },
      },
    });
  } catch (error) {
    console.error("Erro ao carregar indicadores empresariais:", error);
    return res.status(500).json({ error: "Erro ao carregar indicadores empresariais." });
  }
}
