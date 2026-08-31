import { Request, Response } from "express";
import PDFDocument from "pdfkit";
import { prisma } from "../lib/prisma";
import { AuthRequest } from "../middlewares/auth";
import { registrarLog } from "../services/auditoria.service";
import {
  assinarDocumento,
  assinaturaValidaDocumento,
  criarUrlValidacaoAssinatura,
  exigirSenhaAssinatura,
} from "../services/assinaturaDocumento.service";
import {
  criarQrCodeValidacao,
  desenharCabecalhoPadrao,
  desenharRodapeAssinaturaPadrao,
  pdfTheme,
} from "../services/documentoPdfBase.service";
import { equipeDoHorario, equipeFixaValida } from "../config/equipes";

type RegistroResumo = {
  codigo: string;
  titulo: string;
  status: string;
  horario: string;
  usuario?: string;
  equipe?: string;
};

type InformacaoPlantao = {
  horario: string;
  titulo: string;
  local: string;
  descricao: string;
  usuario?: string;
};

type TurnoResumo = {
  chave: string;
  nome: string;
  escala: string;
  inicio: string;
  fim: string;
  equipe: string;
  ccos?: {
    id: number;
    codigo: string;
    status: string;
    responsavel: string;
    colaboradores: string[];
    abertura: string;
    encerramento?: string | null;
  };
  operadores: Array<{ horario: string; nome: string; acao: string }>;
  informacoes: InformacaoPlantao[];
  ocorrencias: RegistroResumo[];
  eventos: RegistroResumo[];
  tarefas: RegistroResumo[];
};

type DadosRelatorioDiario = {
  dataOperacional: string;
  unidade: string;
  inicioPeriodo: string;
  fimPeriodo: string;
  indicadores: {
    turnos: number;
    informacoes: number;
    ocorrencias: number;
    eventos: number;
    tarefasConcluidas: number;
    tarefasPendentes: number;
  };
  turnos: TurnoResumo[];
};

function dataLocal(valor: string) {
  const partes = valor.split("-").map(Number);
  if (partes.length !== 3 || partes.some((item) => !Number.isFinite(item)))
    return null;
  const data = new Date(partes[0], partes[1] - 1, partes[2], 0, 0, 0, 0);
  return Number.isNaN(data.getTime()) ? null : data;
}

function formatarData(data: Date) {
  return data.toLocaleDateString("pt-BR");
}

function formatarHorario(data: Date) {
  return data.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatarDataHora(data: Date) {
  return data.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function parseJson<T>(valor?: string | null, fallback: T = [] as T): T {
  if (!valor) return fallback;
  try {
    return JSON.parse(valor) as T;
  } catch {
    return fallback;
  }
}

function separarInformacoes(texto?: string | null) {
  return String(texto || "")
    .split(/\n\n---\n\n|\n{2,}/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function lerInformacao(
  texto: string,
  horario: string,
  usuario?: string,
): InformacaoPlantao {
  const campo = (nome: string) =>
    texto.match(new RegExp(`^${nome}:\\s*(.*)$`, "im"))?.[1]?.trim() || "";
  return {
    horario,
    titulo: campo("Título") || "Informação do Plantão",
    local: campo("Local") || "Centro de Operações",
    descricao: campo("Descrição") || texto,
    usuario,
  };
}

function diferencaInformacoes(anterior?: string | null, novo?: string | null) {
  const existentes = new Set(separarInformacoes(anterior));
  return separarInformacoes(novo).filter((item) => !existentes.has(item));
}

function limitesOperacionais(dataBase: Date) {
  const inicio = new Date(dataBase);
  inicio.setHours(7, 0, 0, 0);
  const fim = new Date(dataBase);
  fim.setDate(fim.getDate() + 1);
  fim.setHours(7, 20, 0, 0);
  return { inicio, fim };
}

function intervalosTurno(dataBase: Date) {
  const criar = (dia: number, hora: number, minuto: number) => {
    const data = new Date(dataBase);
    data.setDate(data.getDate() + dia);
    data.setHours(hora, minuto, 0, 0);
    return data;
  };

  return [
    {
      chave: "equipe-a",
      nome: "Turno da Equipe A",
      equipeReferencia: "Equipe A",
      escala: "07:00 às 15:20",
      inicio: criar(0, 7, 0),
      fim: criar(0, 15, 0),
    },
    {
      chave: "equipe-b",
      nome: "Turno da Equipe B",
      equipeReferencia: "Equipe B",
      escala: "15:00 às 23:20",
      inicio: criar(0, 15, 0),
      fim: criar(0, 23, 0),
    },
    {
      chave: "equipe-c",
      nome: "Turno da Equipe C",
      equipeReferencia: "Equipe C",
      escala: "23:00 às 07:20",
      inicio: criar(0, 23, 0),
      fim: criar(1, 7, 20),
    },
  ];
}

function dentro(data: Date, inicio: Date, fim: Date) {
  return data >= inicio && data < fim;
}

function nomeUsuario(
  usuario?: { nome: string; apelido: string | null } | null,
) {
  return usuario?.apelido || usuario?.nome || "Não informado";
}

function statusTarefaConcluida(tituloColuna?: string | null) {
  return /conclu|finaliz|feito/i.test(tituloColuna || "");
}

async function montarDadosRelatorio(
  dataBase: Date,
  unidade: string,
): Promise<DadosRelatorioDiario> {
  const { inicio, fim } = limitesOperacionais(dataBase);
  const [
    passagens,
    ocorrencias,
    eventos,
    tarefas,
    logsCcos,
    logsOcorrencias,
    logsEventos,
  ] = await Promise.all([
    prisma.passagemTurno.findMany({
      where: {
        unidade,
        OR: [
          { horaAbertura: { gte: inicio, lt: fim } },
          {
            dataPassagem: {
              gte: new Date(
                dataBase.getFullYear(),
                dataBase.getMonth(),
                dataBase.getDate(),
              ),
              lt: new Date(
                dataBase.getFullYear(),
                dataBase.getMonth(),
                dataBase.getDate() + 1,
              ),
            },
          },
        ],
      },
      include: {
        responsavel: { select: { nome: true, apelido: true } },
        postos: true,
      },
      orderBy: { horaAbertura: "asc" },
    }),
    prisma.ocorrencia.findMany({
      where: { unidade, createdAt: { gte: inicio, lt: fim } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.evento.findMany({
      where: { unidade, createdAt: { gte: inicio, lt: fim } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.planejamentoCard.findMany({
      where: { unidade, updatedAt: { gte: inicio, lt: fim } },
      include: {
        coluna: true,
        responsavel: { select: { nome: true, apelido: true, equipe: true } },
        criadoPor: { select: { nome: true, apelido: true, equipe: true } },
      },
      orderBy: { updatedAt: "asc" },
    }),
    prisma.logAuditoria.findMany({
      where: {
        tipoRegistro: "PassagemTurno",
        createdAt: { gte: inicio, lt: fim },
      },
      include: {
        usuario: { select: { nome: true, apelido: true, equipe: true } },
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.logAuditoria.findMany({
      where: {
        tipoRegistro: "Ocorrencia",
        createdAt: { gte: inicio, lt: fim },
      },
      include: {
        usuario: { select: { nome: true, apelido: true, equipe: true } },
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.logAuditoria.findMany({
      where: { tipoRegistro: "Evento", createdAt: { gte: inicio, lt: fim } },
      include: {
        usuario: { select: { nome: true, apelido: true, equipe: true } },
      },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  const idsColaboradores = Array.from(
    new Set(
      passagens.flatMap((item) => parseJson<number[]>(item.colaboradoresIds)),
    ),
  );
  const colaboradores = idsColaboradores.length
    ? await prisma.usuario.findMany({
        where: { id: { in: idsColaboradores } },
        select: { id: true, nome: true, apelido: true },
      })
    : [];
  const mapaColaboradores = new Map(
    colaboradores.map((item) => [item.id, nomeUsuario(item)]),
  );

  const autorRegistro = (logs: typeof logsOcorrencias, id: number) =>
    logs.find(
      (log) => log.registroId === id && /registrou|cria/i.test(log.acao),
    ) || logs.find((log) => log.registroId === id);

  const intervalos = intervalosTurno(dataBase);
  const turnos = intervalos.map<TurnoResumo>((intervalo) => {
    const passagensTurno = passagens.filter((item) => {
      const equipeReferencia =
        item.equipe === "Equipe D"
          ? equipeFixaValida(item.equipeCoberta)
            ? item.equipeCoberta
            : equipeDoHorario(item.horaAbertura)
          : item.equipe;
      return equipeReferencia === intervalo.equipeReferencia;
    });
    const passagem = passagensTurno[0];
    const equipe = passagem
      ? passagem.equipe === "Equipe D"
        ? `Equipe D - cobertura da ${passagem.equipeCoberta || intervalo.equipeReferencia}`
        : passagem.equipe
      : intervalo.equipeReferencia;
    const logsPassagem = passagem
      ? logsCcos.filter((log) => log.registroId === passagem.id)
      : [];
    const operadores: TurnoResumo["operadores"] = [];
    const usuariosVistos = new Set<string>();

    if (passagem) {
      const responsavel = nomeUsuario(passagem.responsavel);
      operadores.push({
        horario: formatarHorario(passagem.horaAbertura),
        nome: responsavel,
        acao: `abriu o Relatório CCOS ${passagem.codigo}`,
      });
      usuariosVistos.add(responsavel);
    }

    logsPassagem.forEach((log) => {
      const nome = log.usuarioNome || nomeUsuario(log.usuario);
      if (!usuariosVistos.has(nome)) {
        operadores.push({
          horario: formatarHorario(log.createdAt),
          nome,
          acao: `assumiu a continuidade do Relatório CCOS ${passagem?.codigo || ""}`.trim(),
        });
        usuariosVistos.add(nome);
      }
    });

    const informacoes: InformacaoPlantao[] = [];
    logsPassagem.forEach((log) => {
      const anterior = parseJson<Record<string, unknown>>(
        log.dadosAnteriores,
        {},
      );
      const novo = parseJson<Record<string, unknown>>(log.dadosNovos, {});
      diferencaInformacoes(
        typeof anterior.informacoesComplementares === "string"
          ? anterior.informacoesComplementares
          : "",
        typeof novo.informacoesComplementares === "string"
          ? novo.informacoesComplementares
          : "",
      ).forEach((texto) =>
        informacoes.push(
          lerInformacao(
            texto,
            formatarDataHora(log.createdAt),
            log.usuarioNome,
          ),
        ),
      );
    });

    if (passagem && informacoes.length === 0) {
      separarInformacoes(passagem.informacoesComplementares).forEach(
        (texto) => {
          informacoes.push(
            lerInformacao(
              texto,
              formatarDataHora(passagem.updatedAt),
              nomeUsuario(passagem.responsavel),
            ),
          );
        },
      );
    }

    const ocorrenciasTurno = ocorrencias
      .filter((item) => {
        const log = autorRegistro(logsOcorrencias, item.id);
        return equipeFixaValida(log?.usuario?.equipe)
          ? log.usuario.equipe === intervalo.equipeReferencia
          : dentro(item.createdAt, intervalo.inicio, intervalo.fim);
      })
      .map((item) => {
        const log = autorRegistro(logsOcorrencias, item.id);
        return {
          codigo: item.codigo,
          titulo: item.assunto,
          status: item.status,
          horario: formatarDataHora(item.createdAt),
          usuario: log?.usuarioNome,
          equipe: log?.usuario?.equipe || equipe,
        };
      });

    const eventosTurno = eventos
      .filter((item) => {
        const log = autorRegistro(logsEventos, item.id);
        return equipeFixaValida(log?.usuario?.equipe)
          ? log.usuario.equipe === intervalo.equipeReferencia
          : dentro(item.createdAt, intervalo.inicio, intervalo.fim);
      })
      .map((item) => {
        const log = autorRegistro(logsEventos, item.id);
        return {
          codigo: item.codigo,
          titulo: item.assunto,
          status: item.status,
          horario: formatarDataHora(item.createdAt),
          usuario: log?.usuarioNome,
          equipe: log?.usuario?.equipe || equipe,
        };
      });

    const tarefasTurno = tarefas
      .filter((item) => {
        const equipeRegistro =
          item.responsavel?.equipe || item.criadoPor?.equipe;
        return equipeFixaValida(equipeRegistro)
          ? equipeRegistro === intervalo.equipeReferencia
          : dentro(item.updatedAt, intervalo.inicio, intervalo.fim);
      })
      .map((item) => ({
        codigo: item.codigoRegistro || `Tarefa ${item.id}`,
        titulo: item.titulo,
        status: item.coluna?.titulo || item.status,
        horario: formatarDataHora(item.updatedAt),
        usuario: nomeUsuario(item.responsavel || item.criadoPor),
        equipe: item.responsavel?.equipe || item.criadoPor?.equipe || equipe,
      }));

    return {
      chave: intervalo.chave,
      nome: intervalo.nome,
      escala: intervalo.escala,
      inicio: intervalo.inicio.toISOString(),
      fim: intervalo.fim.toISOString(),
      equipe,
      ccos: passagem
        ? {
            id: passagem.id,
            codigo: passagem.codigo,
            status: passagem.status,
            responsavel: nomeUsuario(passagem.responsavel),
            colaboradores: parseJson<number[]>(passagem.colaboradoresIds)
              .map((id) => mapaColaboradores.get(id))
              .filter(Boolean) as string[],
            abertura: passagem.horaAbertura.toISOString(),
            encerramento: passagem.horaEncerramento?.toISOString() || null,
          }
        : undefined,
      operadores,
      informacoes,
      ocorrencias: ocorrenciasTurno,
      eventos: eventosTurno,
      tarefas: tarefasTurno,
    };
  });

  const todasTarefas = turnos.flatMap((turno) => turno.tarefas);
  return {
    dataOperacional: dataBase.toISOString(),
    unidade,
    inicioPeriodo: inicio.toISOString(),
    fimPeriodo: fim.toISOString(),
    indicadores: {
      turnos: turnos.filter((turno) => turno.ccos).length,
      informacoes: turnos.reduce(
        (total, turno) => total + turno.informacoes.length,
        0,
      ),
      ocorrencias: ocorrencias.length,
      eventos: eventos.length,
      tarefasConcluidas: todasTarefas.filter((item) =>
        statusTarefaConcluida(item.status),
      ).length,
      tarefasPendentes: todasTarefas.filter(
        (item) => !statusTarefaConcluida(item.status),
      ).length,
    },
    turnos,
  };
}

function resumoLocal(dados: DadosRelatorioDiario) {
  const data = new Date(dados.dataOperacional);
  const linhas = [
    `Na data operacional de ${formatarData(data)}, a unidade ${dados.unidade} registrou ${dados.indicadores.turnos} turno(s) com Relatório CCOS, ${dados.indicadores.informacoes} informação(ões) de plantão, ${dados.indicadores.ocorrencias} ocorrência(s), ${dados.indicadores.eventos} evento(s) e ${dados.indicadores.tarefasConcluidas} tarefa(s) concluída(s).`,
  ];

  dados.turnos.forEach((turno) => {
    if (
      !turno.ccos &&
      !turno.ocorrencias.length &&
      !turno.eventos.length &&
      !turno.tarefas.length
    )
      return;
    const colaboradores = turno.ccos
      ? Array.from(
          new Set([turno.ccos.responsavel, ...turno.ccos.colaboradores]),
        ).join(" e ")
      : "colaboradores não identificados";
    linhas.push(
      `${turno.nome} (${turno.escala}): ${turno.equipe}, conduzida por ${colaboradores}. ` +
        `${turno.ccos ? `Relatório CCOS ${turno.ccos.codigo} ${turno.ccos.status.toLowerCase()}.` : "Não houve Relatório CCOS localizado."} ` +
        `Foram registradas ${turno.informacoes.length} informação(ões) de plantão, ${turno.ocorrencias.length} ocorrência(s), ${turno.eventos.length} evento(s) e ${turno.tarefas.length} movimentação(ões) de tarefas.`,
    );
  });

  if (dados.indicadores.tarefasPendentes > 0) {
    linhas.push(
      `Ao encerramento do período, ${dados.indicadores.tarefasPendentes} tarefa(s) permaneceram pendentes ou em andamento e devem ser acompanhadas pela equipe subsequente.`,
    );
  } else {
    linhas.push(
      "Não foram identificadas tarefas pendentes entre as movimentações registradas no período.",
    );
  }

  return linhas.join("\n\n");
}

async function aprimorarResumoOpenAi(
  resumo: string,
  dados: DadosRelatorioDiario,
) {
  const configuracao = await prisma.configuracaoSistema.findUnique({
    where: { chave: "global" },
  });
  const apiKey = configuracao?.openaiApiKey || process.env.OPENAI_API_KEY;
  const modelo =
    configuracao?.openaiOcrModel ||
    process.env.OPENAI_OCR_MODEL ||
    "gpt-4.1-mini";
  if (!apiKey)
    return {
      texto: resumo,
      aprimorado: false,
      aviso:
        "OpenAI não configurada. Foi utilizado o resumo seguro do MoveSecurity.",
    };

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: modelo,
        input: [
          {
            role: "user",
            content: [
              {
                type: "input_text",
                text: [
                  "Você é um redator corporativo de segurança patrimonial.",
                  "Aprimore o resumo operacional abaixo em português do Brasil.",
                  "Não invente fatos, pessoas, horários, conclusões ou números.",
                  "Preserve protocolos, equipes, nomes, status e quantidades.",
                  "Use linguagem executiva, objetiva e auditável, em até 7 parágrafos.",
                  "",
                  resumo,
                  "",
                  `Dados estruturados para conferência: ${JSON.stringify(dados)}`,
                ].join("\n"),
              },
            ],
          },
        ],
        temperature: 0.1,
        max_output_tokens: 1600,
      }),
    });
    if (!response.ok)
      return {
        texto: resumo,
        aprimorado: false,
        aviso:
          "A OpenAI não respondeu. Foi utilizado o resumo seguro do MoveSecurity.",
      };
    const retorno = (await response.json()) as {
      output_text?: string;
      output?: Array<{ content?: Array<{ text?: string }> }>;
    };
    const texto =
      retorno.output_text ||
      retorno.output
        ?.flatMap((item) => item.content || [])
        .map((item) => item.text || "")
        .join("\n")
        .trim();
    return texto
      ? { texto, aprimorado: true, modelo }
      : {
          texto: resumo,
          aprimorado: false,
          aviso:
            "A IA não retornou texto. Foi utilizado o resumo seguro do MoveSecurity.",
        };
  } catch {
    return {
      texto: resumo,
      aprimorado: false,
      aviso:
        "A OpenAI estava indisponível. Foi utilizado o resumo seguro do MoveSecurity.",
    };
  }
}

async function configuracaoAprimoramentoOpenAi() {
  const configuracao = await prisma.configuracaoSistema.findUnique({
    where: { chave: "global" },
  });
  return Boolean(configuracao?.openaiAprimoramentoTextoAtivo);
}

export async function previsualizarRelatorioDiario(
  req: AuthRequest,
  res: Response,
) {
  try {
    const data = dataLocal(String(req.query.data || ""));
    if (!data)
      return res
        .status(400)
        .json({ error: "Informe uma data operacional válida." });
    const dados = await montarDadosRelatorio(
      data,
      req.unidadeAtiva || "GJA-T1",
    );
    const resumoBase = resumoLocal(dados);
    const usarIa = await configuracaoAprimoramentoOpenAi();
    const resumo = usarIa
      ? await aprimorarResumoOpenAi(resumoBase, dados)
      : { texto: resumoBase, aprimorado: false };
    return res.json({
      dados,
      resumoExecutivo: resumo.texto,
      aprimoradoPorIa: resumo.aprimorado,
      aprimoramentoOpenAiAtivo: usarIa,
      modeloIa: "modelo" in resumo ? resumo.modelo : null,
      aviso: "aviso" in resumo ? resumo.aviso : null,
    });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ error: "Erro ao preparar o relatório diário executivo." });
  }
}

export async function consolidarRelatorioDiario(
  req: AuthRequest,
  res: Response,
) {
  try {
    if (!req.usuarioId)
      return res.status(401).json({ error: "Usuário não autenticado." });
    await exigirSenhaAssinatura(req);
    const data = dataLocal(String(req.body.data || ""));
    if (!data)
      return res
        .status(400)
        .json({ error: "Informe uma data operacional válida." });
    const unidade = req.unidadeAtiva || "GJA-T1";
    const dados = await montarDadosRelatorio(data, unidade);
    const resumoBase = resumoLocal(dados);
    const usarIa = await configuracaoAprimoramentoOpenAi();
    const resumo = usarIa
      ? await aprimorarResumoOpenAi(resumoBase, dados)
      : { texto: resumoBase, aprimorado: false };
    const ano = data.getFullYear();
    const existente = await prisma.relatorioDiarioExecutivo.findUnique({
      where: { dataOperacional_unidade: { dataOperacional: data, unidade } },
    });
    const ultimo = existente
      ? null
      : await prisma.relatorioDiarioExecutivo.findFirst({
          where: { ano, unidade },
          orderBy: { numero: "desc" },
        });
    const numero = existente?.numero || (ultimo?.numero || 0) + 1;
    const codigo =
      existente?.codigo || `RDE${String(numero).padStart(3, "0")}/${ano}`;
    const relatorio = await prisma.relatorioDiarioExecutivo.upsert({
      where: { dataOperacional_unidade: { dataOperacional: data, unidade } },
      update: {
        resumoExecutivo: resumo.texto,
        dadosJson: JSON.stringify(dados),
        aprimoradoPorIa: resumo.aprimorado,
        modeloIa: "modelo" in resumo ? resumo.modelo : null,
        responsavelId: req.usuarioId,
      },
      create: {
        numero,
        ano,
        codigo,
        dataOperacional: data,
        unidade,
        resumoExecutivo: resumo.texto,
        dadosJson: JSON.stringify(dados),
        aprimoradoPorIa: resumo.aprimorado,
        modeloIa: "modelo" in resumo ? resumo.modelo : null,
        responsavelId: req.usuarioId,
      },
      include: { responsavel: { select: { nome: true, apelido: true } } },
    });

    await assinarDocumento({
      req,
      modulo: "RelatorioDiario",
      registroId: relatorio.id,
      codigoRegistro: relatorio.codigo,
      unidade,
      acao: "Consolidação do Relatório Diário Executivo CCOS",
      dados: relatorio,
    });
    await registrarLog({
      req,
      acao: `Consolidação do Relatório Diário Executivo ${relatorio.codigo}`,
      tipoRegistro: "RelatorioDiario",
      registroId: relatorio.id,
      dadosNovos: relatorio,
    });
    return res
      .status(existente ? 200 : 201)
      .json({ ...relatorio, aviso: "aviso" in resumo ? resumo.aviso : null });
  } catch (error) {
    console.error(error);
    const status = (error as Error & { status?: number }).status;
    return res
      .status(status || 500)
      .json({
        error: status
          ? (error as Error).message
          : "Erro ao consolidar o relatório diário executivo.",
      });
  }
}

export async function listarRelatoriosDiarios(req: AuthRequest, res: Response) {
  try {
    const relatorios = await prisma.relatorioDiarioExecutivo.findMany({
      where: { unidade: req.unidadeAtiva || "GJA-T1" },
      include: { responsavel: { select: { nome: true, apelido: true } } },
      orderBy: { dataOperacional: "desc" },
      take: 90,
    });
    return res.json(relatorios);
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ error: "Erro ao listar relatórios diários executivos." });
  }
}

function garantirEspaco(doc: PDFKit.PDFDocument, altura = 80) {
  if (doc.y + altura > doc.page.height - 135) doc.addPage();
}

function tituloSecao(doc: PDFKit.PDFDocument, titulo: string) {
  garantirEspaco(doc, 42);
  doc.roundedRect(42, doc.y, doc.page.width - 84, 27, 5).fill("#eaf2ff");
  doc
    .fillColor(pdfTheme.primary)
    .font("Helvetica-Bold")
    .fontSize(10)
    .text(titulo, 52, doc.y + 8, { width: doc.page.width - 104 });
  doc.y += 38;
}

function textoPdf(
  doc: PDFKit.PDFDocument,
  texto: string,
  opcoes?: PDFKit.Mixins.TextOptions,
) {
  garantirEspaco(doc, 40);
  doc
    .fillColor("#334155")
    .font("Helvetica")
    .fontSize(9)
    .text(texto, { width: doc.page.width - 84, lineGap: 3, ...opcoes });
  doc.moveDown(0.55);
}

function linhaRegistro(doc: PDFKit.PDFDocument, registro: RegistroResumo) {
  garantirEspaco(doc, 48);
  const y = doc.y;
  doc
    .roundedRect(42, y, doc.page.width - 84, 40, 5)
    .fill("#f8fafc")
    .strokeColor("#e2e8f0")
    .stroke();
  doc
    .fillColor(pdfTheme.primary)
    .font("Helvetica-Bold")
    .fontSize(8.5)
    .text(`${registro.codigo} | ${registro.titulo}`, 52, y + 7, {
      width: 350,
      ellipsis: true,
    });
  doc
    .fillColor("#475569")
    .font("Helvetica")
    .fontSize(7.5)
    .text(
      `${registro.horario} | ${registro.usuario || "Usuário não identificado"} | ${registro.equipe || "Equipe não identificada"}`,
      52,
      y + 23,
      { width: 390, ellipsis: true },
    );
  doc
    .fillColor("#0b74ff")
    .font("Helvetica-Bold")
    .fontSize(7.5)
    .text(registro.status, doc.page.width - 145, y + 15, {
      width: 90,
      align: "right",
    });
  doc.y = y + 48;
}

async function emitirPdfRelatorioDiario(
  req: Pick<Request, "protocol" | "get">,
  res: Response,
  relatorio: any,
) {
  const dados = parseJson<DadosRelatorioDiario>(
    relatorio.dadosJson,
    {} as DadosRelatorioDiario,
  );
  const assinatura = await assinaturaValidaDocumento(
    "RelatorioDiario",
    relatorio.id,
  );
  const validacaoUrl = criarUrlValidacaoAssinatura(req, assinatura?.token);
  const qrCode = validacaoUrl ? await criarQrCodeValidacao(validacaoUrl) : null;
  const doc = new PDFDocument({
    size: "A4",
    margin: 42,
    bufferPages: true,
    margins: { top: 130, left: 42, right: 42, bottom: 135 },
  });
  const nome = `${relatorio.codigo.replace("/", "-")} - Relatório Diário Executivo - ${formatarData(relatorio.dataOperacional)}.pdf`;
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `inline; filename="${nome}"`);
  doc.pipe(res);

  const cabecalho = () =>
    desenharCabecalhoPadrao(doc, {
      titulo: "Relatório Diário Executivo CCOS",
      subtitulo: `Data operacional: ${formatarData(relatorio.dataOperacional)}`,
      codigo: relatorio.codigo,
      unidade: relatorio.unidade,
      emitidoEm: relatorio.createdAt,
    });
  doc.on("pageAdded", cabecalho);
  cabecalho();

  tituloSecao(doc, "Resumo executivo");
  textoPdf(doc, relatorio.resumoExecutivo, { align: "justify" });

  tituloSecao(doc, "Indicadores consolidados");
  textoPdf(
    doc,
    `Turnos com CCOS: ${dados.indicadores.turnos}   |   Informações do plantão: ${dados.indicadores.informacoes}   |   Ocorrências: ${dados.indicadores.ocorrencias}   |   Eventos: ${dados.indicadores.eventos}   |   Tarefas concluídas: ${dados.indicadores.tarefasConcluidas}   |   Tarefas pendentes: ${dados.indicadores.tarefasPendentes}`,
  );

  dados.turnos.forEach((turno) => {
    tituloSecao(doc, `${turno.nome} | ${turno.escala} | ${turno.equipe}`);
    if (turno.ccos) {
      const equipe = Array.from(
        new Set([turno.ccos.responsavel, ...turno.ccos.colaboradores]),
      ).join(", ");
      textoPdf(
        doc,
        `${turno.ccos.codigo} | Status: ${turno.ccos.status} | Abertura: ${formatarDataHora(new Date(turno.ccos.abertura))}${turno.ccos.encerramento ? ` | Encerramento: ${formatarDataHora(new Date(turno.ccos.encerramento))}` : ""}`,
      );
      textoPdf(doc, `Equipe registrada: ${equipe || "Não informada"}.`);
    } else {
      textoPdf(doc, "Nenhum Relatório CCOS foi localizado neste turno.");
    }

    if (turno.operadores.length) {
      doc
        .fillColor(pdfTheme.primary)
        .font("Helvetica-Bold")
        .fontSize(9)
        .text("Linha do tempo de operadores");
      doc.moveDown(0.35);
      turno.operadores.forEach((item) =>
        textoPdf(doc, `${item.horario} - ${item.nome} ${item.acao}.`),
      );
    }

    if (turno.informacoes.length) {
      doc
        .fillColor(pdfTheme.primary)
        .font("Helvetica-Bold")
        .fontSize(9)
        .text("Informações do plantão");
      doc.moveDown(0.35);
      turno.informacoes.forEach((item) => {
        garantirEspaco(doc, 58);
        textoPdf(
          doc,
          `${item.horario} | ${item.titulo} | ${item.local}\n${item.descricao}${item.usuario ? `\nRegistrado por: ${item.usuario}` : ""}`,
        );
      });
    }

    if (turno.ocorrencias.length) {
      doc
        .fillColor(pdfTheme.primary)
        .font("Helvetica-Bold")
        .fontSize(9)
        .text("Ocorrências abertas no turno");
      doc.moveDown(0.35);
      turno.ocorrencias.forEach((item) => linhaRegistro(doc, item));
    }
    if (turno.eventos.length) {
      doc
        .fillColor(pdfTheme.primary)
        .font("Helvetica-Bold")
        .fontSize(9)
        .text("Eventos abertos no turno");
      doc.moveDown(0.35);
      turno.eventos.forEach((item) => linhaRegistro(doc, item));
    }
    if (turno.tarefas.length) {
      doc
        .fillColor(pdfTheme.primary)
        .font("Helvetica-Bold")
        .fontSize(9)
        .text("Tarefas movimentadas no turno");
      doc.moveDown(0.35);
      turno.tarefas.forEach((item) => linhaRegistro(doc, item));
    }
  });

  const range = doc.bufferedPageRange();
  for (let indice = 0; indice < range.count; indice += 1) {
    doc.switchToPage(indice);
    desenharRodapeAssinaturaPadrao(doc, {
      assinatura: assinatura
        ? {
            token: assinatura.token,
            usuarioNome: assinatura.usuarioNome,
            createdAt: assinatura.createdAt,
          }
        : null,
      qrCode,
      pagina: indice + 1,
      totalPaginas: range.count,
    });
  }
  doc.end();
}

export async function gerarPdfRelatorioDiario(req: AuthRequest, res: Response) {
  try {
    const relatorio = await prisma.relatorioDiarioExecutivo.findFirst({
      where: {
        id: Number(req.params.id),
        unidade: req.unidadeAtiva || "GJA-T1",
      },
    });
    if (!relatorio)
      return res
        .status(404)
        .json({ error: "Relatório diário não encontrado." });
    return emitirPdfRelatorioDiario(req, res, relatorio);
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ error: "Erro ao gerar PDF do relatório diário." });
  }
}

export async function gerarPdfPublicoRelatorioDiario(
  req: Request,
  res: Response,
) {
  try {
    const token = String(req.query.token || "");
    const assinatura = await prisma.assinaturaDocumento.findUnique({
      where: { token },
    });
    if (
      !assinatura ||
      assinatura.status !== "VALIDA" ||
      assinatura.modulo !== "RelatorioDiario" ||
      assinatura.registroId !== Number(req.params.id)
    ) {
      return res.status(403).json({ error: "Token de validação inválido." });
    }
    const relatorio = await prisma.relatorioDiarioExecutivo.findUnique({
      where: { id: Number(req.params.id) },
    });
    if (!relatorio)
      return res
        .status(404)
        .json({ error: "Relatório diário não encontrado." });
    return emitirPdfRelatorioDiario(req, res, relatorio);
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ error: "Erro ao gerar PDF público do relatório diário." });
  }
}
