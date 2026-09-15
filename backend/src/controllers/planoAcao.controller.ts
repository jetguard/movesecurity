import { Response } from "express";
import { prisma } from "../lib/prisma";
import { AuthRequest } from "../middlewares/auth";
import { registrarLog } from "../services/auditoria.service";

function normalizarId(valor: unknown): number | null {
  const numero = Number(valor);
  return Number.isFinite(numero) && numero > 0 ? numero : null;
}

function textoObrigatorio(valor: unknown) {
  return String(valor || "").trim();
}

function normalizarStatusPlano(valor: unknown) {
  const status = textoObrigatorio(valor);
  if (status === "Concluído") return "Concluido";
  if (status === "Em Andamento") return "Em andamento";
  if (["Pendente", "Em andamento", "Concluido"].includes(status)) {
    return status;
  }
  return "Pendente";
}

function parseListaJson<T>(valor: string | null | undefined): T[] {
  try {
    const lista = JSON.parse(valor || "[]");
    return Array.isArray(lista) ? lista : [];
  } catch {
    return [];
  }
}

type FatorRiscoPlano = {
  id?: number | null;
  codigo?: string | null;
  nome: string;
};

type MediadorPlano = {
  id: number;
  nome: string;
  email?: string | null;
  setor?: string | null;
  cargo?: string | null;
};

type ResponsavelPlano = MediadorPlano;

type ConclusaoMediadorPlano = {
  mediadorId: number;
  mediadorNome: string;
  conclusao: string;
  concluidoEm: string;
};

type TratamentoCustosPlano = {
  houveCusto: boolean;
  tipo: string | null;
  valorEstimado: string | null;
  valorRealizado: string | null;
  observacao: string | null;
  atualizadoPorId?: number | null;
  atualizadoEm?: string | null;
};

async function fatorRiscoDaArc(req: AuthRequest) {
  if (req.body.origemModulo !== "AnaliseRisco") {
    return {
      fatorRiscoId: null,
      fatorRiscoCodigo: null,
      fatorRiscoNome: null,
    };
  }

  const origemId = normalizarId(req.body.origemId);
  if (!origemId) throw new Error("Selecione a ARC da análise de risco.");

  const fatorRiscoId = normalizarId(req.body.fatorRiscoId);
  if (!fatorRiscoId) {
    throw new Error("Selecione o fator de risco que será tratado no plano.");
  }

  const analise = await prisma.analiseRiscoCompleta.findFirst({
    where: { id: origemId, unidade: req.unidadeAtiva },
    select: { fatoresRiscoJson: true },
  });
  if (!analise) throw new Error("ARC da análise de risco não encontrada.");

  const fator = parseListaJson<FatorRiscoPlano>(analise.fatoresRiscoJson).find(
    (item) => normalizarId(item.id) === fatorRiscoId,
  );
  if (!fator) {
    throw new Error("O fator de risco selecionado não pertence a esta ARC.");
  }

  return {
    fatorRiscoId,
    fatorRiscoCodigo: textoObrigatorio(fator.codigo),
    fatorRiscoNome: textoObrigatorio(fator.nome),
  };
}

async function validarFatorAindaDisponivel(
  req: AuthRequest,
  fatorRiscoId: number | null,
  ignorarPlanoId?: number,
) {
  if (req.body.origemModulo !== "AnaliseRisco" || !fatorRiscoId) return;
  const origemId = normalizarId(req.body.origemId);
  if (!origemId) return;

  const existente = await prisma.planoAcaoCorporativo.findFirst({
    where: {
      unidade: req.unidadeAtiva,
      origemModulo: "AnaliseRisco",
      origemId,
      fatorRiscoId,
      ...(ignorarPlanoId ? { id: { not: ignorarPlanoId } } : {}),
    },
    select: { codigo: true },
  });

  if (existente) {
    throw new Error(
      `Este fator de risco já possui o plano de ação ${existente.codigo}. Selecione outro fator.`,
    );
  }
}

async function usuariosDoPlanoPorIds(req: AuthRequest, idsRecebidos: unknown[]) {
  const ids: number[] = idsRecebidos
    .map(normalizarId)
    .filter((id): id is number => Boolean(id));
  const unicos = Array.from(new Set(ids));
  if (!unicos.length) return [];

  const usuarios = await prisma.usuario.findMany({
    where: {
      id: { in: unicos },
      statusUsuario: "ATIVO",
      OR: [
        { unidade: req.unidadeAtiva },
        { unidade: null },
        { unidadesPermitidas: { contains: req.unidadeAtiva || "" } },
      ],
    },
    orderBy: { nome: "asc" },
    select: {
      id: true,
      nome: true,
      email: true,
      setor: true,
      cargo: true,
    },
  });

  if (usuarios.length !== unicos.length) {
    throw new Error("Um ou mais usuários selecionados não foram encontrados.");
  }

  return usuarios;
}

async function responsaveisDoPlano(req: AuthRequest) {
  const idsRecebidos: unknown[] = Array.isArray(req.body.responsaveisIds)
    ? req.body.responsaveisIds
    : req.body.responsavelId
      ? [req.body.responsavelId]
      : [];
  const responsaveis = await usuariosDoPlanoPorIds(req, idsRecebidos);
  const principal = responsaveis[0];

  if (!principal) {
    return {
      responsavelId: null,
      responsavelNome: textoObrigatorio(req.body.responsavelNome) || null,
      responsaveisJson: JSON.stringify([]),
    };
  }

  return {
    responsavelId: principal.id,
    responsavelNome: responsaveis.map((item) => item.nome).join(", "),
    responsaveisJson: JSON.stringify(responsaveis),
  };
}

async function mediadoresDoPlano(req: AuthRequest) {
  const mediadoresIdsRecebidos: unknown[] = Array.isArray(
    req.body.mediadoresIds,
  )
    ? req.body.mediadoresIds
    : [];
  const ids: number[] = mediadoresIdsRecebidos
    .map(normalizarId)
    .filter((id): id is number => Boolean(id));
  const unicos = Array.from(new Set(ids));
  if (!unicos.length) return [];

  const mediadores = await prisma.usuario.findMany({
    where: {
      id: { in: unicos },
      statusUsuario: "ATIVO",
      OR: [
        { unidade: req.unidadeAtiva },
        { unidade: null },
        { unidadesPermitidas: { contains: req.unidadeAtiva || "" } },
      ],
    },
    orderBy: { nome: "asc" },
    select: {
      id: true,
      nome: true,
      email: true,
      setor: true,
      cargo: true,
    },
  });

  if (mediadores.length !== unicos.length) {
    throw new Error(
      "Um ou mais mediadores selecionados não foram encontrados.",
    );
  }

  return mediadores;
}

function apresentarPlano(plano: any) {
  const responsaveis = parseListaJson<ResponsavelPlano>(
    plano.responsaveisJson,
  );
  const mediadores = parseListaJson<MediadorPlano>(plano.mediadoresJson);
  const conclusoesMediadores = parseListaJson<ConclusaoMediadorPlano>(
    plano.mediadoresConclusoesJson,
  );
  return {
    ...plano,
    status: normalizarStatusPlano(plano.status),
    responsaveis: responsaveis.length
      ? responsaveis
      : plano.responsavelId
        ? [
            {
              id: plano.responsavelId,
              nome: plano.responsavelNome || "Responsável",
            },
          ]
        : [],
    mediadores: mediadores.map((mediador) => ({
      ...mediador,
      conclusao: conclusoesMediadores.find(
        (item) => item.mediadorId === mediador.id,
      ),
    })),
    conclusoesMediadores,
    tratamentoExecucaoStatus: normalizarStatusPlano(
      plano.tratamentoExecucaoStatus || plano.status,
    ),
    anexosTratamento: parseListaJson<AnexoTratamentoPlano>(plano.evidencia),
    tratamentoCustos: parseTratamentoCustos(plano.tratamentoCustosJson),
  };
}

function parseTratamentoCustos(
  valor: string | null | undefined,
): TratamentoCustosPlano {
  try {
    const dados = JSON.parse(valor || "{}");
    return {
      houveCusto: Boolean(dados.houveCusto),
      tipo: textoObrigatorio(dados.tipo) || null,
      valorEstimado: textoObrigatorio(dados.valorEstimado) || null,
      valorRealizado: textoObrigatorio(dados.valorRealizado) || null,
      observacao: textoObrigatorio(dados.observacao) || null,
      atualizadoPorId: normalizarId(dados.atualizadoPorId),
      atualizadoEm: textoObrigatorio(dados.atualizadoEm) || null,
    };
  } catch {
    return {
      houveCusto: false,
      tipo: null,
      valorEstimado: null,
      valorRealizado: null,
      observacao: null,
    };
  }
}

function usuarioResponsavelPelaExecucao(
  plano: { responsavelId?: number | null; responsaveisJson?: string | null },
  usuarioId?: number,
) {
  if (!usuarioId) return false;
  if (plano.responsavelId === usuarioId) return true;
  return parseListaJson<ResponsavelPlano>(plano.responsaveisJson).some(
    (responsavel) => responsavel.id === usuarioId,
  );
}

function tratamentoCustosDoRequest(
  req: AuthRequest,
): TratamentoCustosPlano {
  return {
    houveCusto: ["true", "1", "sim", "on"].includes(
      String(req.body.houveCusto || "").trim().toLowerCase(),
    ),
    tipo: textoObrigatorio(req.body.tipoCusto) || null,
    valorEstimado: textoObrigatorio(req.body.valorEstimado) || null,
    valorRealizado: textoObrigatorio(req.body.valorRealizado) || null,
    observacao: textoObrigatorio(req.body.observacaoCusto) || null,
    atualizadoPorId: req.usuarioId || null,
    atualizadoEm: new Date().toISOString(),
  };
}

async function sincronizarMencoesPlanoAcao(
  req: AuthRequest,
  plano: {
    id: number;
    codigo: string;
    titulo: string;
    prazo?: Date | null;
  },
  responsaveis: ResponsavelPlano[],
  mediadores: MediadorPlano[],
) {
  const alvos = new Map<
    number,
    { tipoMencao: string; observacao: string }
  >();

  responsaveis.forEach((responsavel) => {
    alvos.set(responsavel.id, {
      tipoMencao: "Responsável pela execução",
      observacao:
        "Você foi marcado como responsável pela execução deste plano de ação.",
    });
  });

  mediadores.forEach((mediador) => {
    if (alvos.has(mediador.id)) {
      alvos.set(mediador.id, {
        tipoMencao: "Responsável e mediador",
        observacao:
          "Você foi marcado como responsável pela execução e mediador deste plano de ação.",
      });
      return;
    }

    alvos.set(mediador.id, {
      tipoMencao: "Mediador",
      observacao: "Você foi marcado como mediador deste plano de ação.",
    });
  });

  const idsMencionados = Array.from(alvos.keys());

  await prisma.mencao.deleteMany({
    where: {
      modulo: "PlanoAcao",
      registroId: plano.id,
      usuarioMencionadoId: {
        notIn: idsMencionados.length ? idsMencionados : [0],
      },
    },
  });

  if (!idsMencionados.length) return;

  const existentes = await prisma.mencao.findMany({
    where: {
      modulo: "PlanoAcao",
      registroId: plano.id,
      usuarioMencionadoId: { in: idsMencionados },
    },
    select: { usuarioMencionadoId: true },
  });
  const idsExistentes = new Set(
    existentes.map((mencao) => mencao.usuarioMencionadoId),
  );

  const novasMencoes = idsMencionados
    .filter((id) => !idsExistentes.has(id))
    .map((id) => {
      const dados = alvos.get(id)!;
      return {
        modulo: "PlanoAcao",
        registroId: plano.id,
        codigoRegistro: plano.codigo,
        tituloRegistro: plano.titulo,
        unidade: req.unidadeAtiva || "GJA-T1",
        usuarioMencionadoId: id,
        autorId: req.usuarioId || null,
        tipoMencao: dados.tipoMencao,
        prazo: plano.prazo || null,
        observacao: dados.observacao,
      };
    });

  if (novasMencoes.length) {
    await prisma.mencao.createMany({ data: novasMencoes });
  }

  await Promise.all(
    idsMencionados.map((id) => {
      const dados = alvos.get(id)!;
      return prisma.mencao.updateMany({
        where: {
          modulo: "PlanoAcao",
          registroId: plano.id,
          usuarioMencionadoId: id,
        },
        data: {
          codigoRegistro: plano.codigo,
          tituloRegistro: plano.titulo,
          unidade: req.unidadeAtiva || "GJA-T1",
          tipoMencao: dados.tipoMencao,
          prazo: plano.prazo || null,
          observacao: dados.observacao,
        },
      });
    }),
  );
}

type AnexoTratamentoPlano = {
  nomeOriginal: string;
  nomeArquivo: string;
  caminho: string;
  tipo: string;
  tamanho: number;
  criadoEm: string;
};

function anexosDoRequest(req: AuthRequest): AnexoTratamentoPlano[] {
  const arquivos = (req.files || []) as Express.Multer.File[];
  return arquivos.map((arquivo) => ({
    nomeOriginal: arquivo.originalname,
    nomeArquivo: arquivo.filename,
    caminho: arquivo.path.replace(/\\/g, "/"),
    tipo: arquivo.mimetype,
    tamanho: arquivo.size,
    criadoEm: new Date().toISOString(),
  }));
}

function evidenciaComAnexos(
  anterior: string | null | undefined,
  novos: AnexoTratamentoPlano[],
) {
  const anexosAtuais = parseListaJson<AnexoTratamentoPlano>(anterior);
  if (!novos.length) return JSON.stringify(anexosAtuais);
  return JSON.stringify([...anexosAtuais, ...novos]);
}

function progressoDoPlano(
  mediadores: MediadorPlano[],
  conclusoes: ConclusaoMediadorPlano[],
  tratamentoExecucaoStatus?: string | null,
) {
  const statusExecucao = normalizarStatusPlano(tratamentoExecucaoStatus);
  const idsMediadores = new Set(mediadores.map((mediador) => mediador.id));
  const totalConcluido = conclusoes.filter((item) =>
    idsMediadores.has(item.mediadorId),
  ).length;
  const execucaoConcluida = statusExecucao === "Concluido";
  const totalEtapas = mediadores.length + 1;
  const percentual = Math.round(
    ((totalConcluido + (execucaoConcluida ? 1 : 0)) / totalEtapas) * 100,
  );

  return {
    percentual,
    status:
      percentual >= 100
        ? "Concluido"
        : percentual > 0 || statusExecucao === "Em andamento"
          ? "Em andamento"
          : "Pendente",
    concluidoEm: percentual >= 100 ? new Date() : null,
  };
}

function perfilPrivilegiadoPlano(req: AuthRequest) {
  const perfil = String(req.usuarioPerfil || "").toUpperCase();
  return ["SUPER_ADMIN", "ADMINISTRADOR", "T_I"].includes(perfil);
}

function filtroPlanosVisiveis(req: AuthRequest) {
  if (perfilPrivilegiadoPlano(req)) return {};
  if (!req.usuarioId) return { id: -1 };
  const marcadorUsuario = `"id":${req.usuarioId}`;
  const nomeUsuario = textoObrigatorio(req.usuarioNome);
  const emailUsuario = textoObrigatorio(req.usuarioEmail);
  const filtrosTexto = [
    ...(nomeUsuario
      ? [
          { responsavelNome: { contains: nomeUsuario } },
          { responsaveisJson: { contains: nomeUsuario } },
          { mediadoresJson: { contains: nomeUsuario } },
        ]
      : []),
    ...(emailUsuario
      ? [
          { responsaveisJson: { contains: emailUsuario } },
          { mediadoresJson: { contains: emailUsuario } },
        ]
      : []),
  ];

  return {
    OR: [
      { responsavelId: req.usuarioId },
      { responsaveisJson: { contains: marcadorUsuario } },
      { mediadoresJson: { contains: marcadorUsuario } },
      ...filtrosTexto,
    ],
  };
}

export async function listarPlanosAcao(req: AuthRequest, res: Response) {
  try {
    const planos = await prisma.planoAcaoCorporativo.findMany({
      where: { unidade: req.unidadeAtiva, ...filtroPlanosVisiveis(req) },
      orderBy: { createdAt: "desc" },
      include: {
        responsavel: { select: { id: true, nome: true, apelido: true } },
      },
    });
    return res.json(planos.map(apresentarPlano));
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro ao listar planos de acao" });
  }
}

export async function buscarPlanoAcao(req: AuthRequest, res: Response) {
  try {
    const plano = await prisma.planoAcaoCorporativo.findFirst({
      where: {
        id: Number(req.params.id),
        unidade: req.unidadeAtiva,
        ...filtroPlanosVisiveis(req),
      },
      include: {
        responsavel: { select: { id: true, nome: true, apelido: true } },
      },
    });
    if (!plano) {
      return res.status(404).json({ error: "Plano de acao nao encontrado" });
    }

    let arc: any = null;
    if (plano.origemModulo === "AnaliseRisco" && plano.origemId) {
      arc = await prisma.analiseRiscoCompleta.findFirst({
        where: { id: plano.origemId, unidade: req.unidadeAtiva },
      });
    }

    return res.json({ plano: apresentarPlano(plano), arc });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro ao buscar plano de acao" });
  }
}

export async function listarResponsaveisPlanoAcao(
  req: AuthRequest,
  res: Response,
) {
  try {
    const responsaveis = await prisma.usuario.findMany({
      where: {
        statusUsuario: "ATIVO",
        OR: [
          { unidade: req.unidadeAtiva },
          { unidade: null },
          { unidadesPermitidas: { contains: req.unidadeAtiva || "" } },
        ],
      },
      orderBy: { nome: "asc" },
      select: {
        id: true,
        nome: true,
        email: true,
        setor: true,
        cargo: true,
        perfilAcesso: true,
      },
    });

    return res.json(responsaveis);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro ao listar responsáveis." });
  }
}

export async function listarOrigensPlanoAcao(req: AuthRequest, res: Response) {
  try {
    const unidade = req.unidadeAtiva;
    const [ocorrencias, eventos, investigacoes, riscos, analisesEstrategicas] =
      await Promise.all([
        prisma.ocorrencia.findMany({
          where: { unidade },
          orderBy: { createdAt: "desc" },
          select: { id: true, codigo: true, assunto: true, status: true },
        }),
        prisma.evento.findMany({
          where: { unidade },
          orderBy: { createdAt: "desc" },
          select: { id: true, codigo: true, assunto: true, status: true },
        }),
        prisma.investigacao.findMany({
          where: { unidade },
          orderBy: { createdAt: "desc" },
          select: { id: true, codigo: true, titulo: true, status: true },
        }),
        prisma.analiseRiscoCompleta.findMany({
          where: { unidade },
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            codigo: true,
            riscoCodigo: true,
            riscoNome: true,
            setorNome: true,
            classificacaoRisco: true,
            fatoresRiscoJson: true,
            status: true,
          },
        }),
        prisma.analiseEstrategica.findMany({
          where: { unidade },
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            codigo: true,
            titulo: true,
            tipo: true,
            status: true,
          },
        }),
      ]);

    return res.json({
      Ocorrencia: ocorrencias.map((item) => ({
        id: item.id,
        codigo: item.codigo,
        titulo: item.assunto,
        status: item.status,
      })),
      Evento: eventos.map((item) => ({
        id: item.id,
        codigo: item.codigo,
        titulo: item.assunto,
        status: item.status,
      })),
      Investigacao: investigacoes.map((item) => ({
        id: item.id,
        codigo: item.codigo || `R.I. ${item.id}`,
        titulo: item.titulo,
        status: item.status,
      })),
      AnaliseRisco: riscos.map((item) => ({
        id: item.id,
        codigo: item.codigo,
        titulo: `${item.riscoCodigo} - ${item.riscoNome}`,
        status: item.status,
        complemento: `${item.setorNome} | ${item.classificacaoRisco}`,
        fatoresRisco: parseListaJson<FatorRiscoPlano>(item.fatoresRiscoJson),
      })),
      AnaliseEstrategica: analisesEstrategicas.map((item) => ({
        id: item.id,
        codigo: item.codigo,
        titulo: item.titulo,
        status: item.status,
        complemento: item.tipo,
      })),
    });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ error: "Erro ao listar registros de origem do plano de acao" });
  }
}

export async function criarPlanoAcao(req: AuthRequest, res: Response) {
  try {
    const { titulo, prazo } = req.body;
    if (!titulo || !prazo) {
      return res.status(400).json({ error: "Informe titulo e prazo." });
    }
    const comentarios = textoObrigatorio(req.body.comentarios);
    const descricao =
      textoObrigatorio(req.body.descricao) || comentarios || titulo;

    const ano = new Date().getFullYear();
    const ultimo = await prisma.planoAcaoCorporativo.findFirst({
      where: { ano, unidade: req.unidadeAtiva },
      orderBy: { numero: "desc" },
    });
    const numero = ultimo ? ultimo.numero + 1 : 1;
    const codigo = `PA${String(numero).padStart(4, "0")}/${ano}`;
    const status = normalizarStatusPlano(req.body.status);
    const fatorRisco = await fatorRiscoDaArc(req);
    await validarFatorAindaDisponivel(req, fatorRisco.fatorRiscoId);
    const responsavel = await responsaveisDoPlano(req);
    const mediadores = await mediadoresDoPlano(req);
    const responsaveis = parseListaJson<ResponsavelPlano>(
      responsavel.responsaveisJson,
    );
    const tratamentoExecucaoStatus = status;
    const progressoInicial = progressoDoPlano(
      mediadores,
      [],
      tratamentoExecucaoStatus,
    );

    const plano = await prisma.planoAcaoCorporativo.create({
      data: {
        numero,
        ano,
        codigo,
        titulo,
        unidade: req.unidadeAtiva || "GJA-T1",
        origemModulo: req.body.origemModulo,
        origemId: normalizarId(req.body.origemId),
        ...fatorRisco,
        prioridade: req.body.prioridade || "Media",
        status: progressoInicial.status,
        percentual: progressoInicial.percentual,
        descricao,
        acaoCorretiva: req.body.acaoCorretiva,
        acaoPreventiva: req.body.acaoPreventiva,
        ...responsavel,
        mediadoresJson: JSON.stringify(mediadores),
        mediadoresConclusoesJson: JSON.stringify([]),
        tratamentoExecucaoStatus,
        prazo: new Date(prazo),
        concluidoEm: progressoInicial.concluidoEm,
        evidencia: req.body.evidencia,
        comentarios,
      },
      include: {
        responsavel: { select: { id: true, nome: true, apelido: true } },
      },
    });

    await sincronizarMencoesPlanoAcao(req, plano, responsaveis, mediadores);

    const origemId = normalizarId(req.body.origemId);
    if (req.body.origemModulo === "AnaliseRisco" && origemId) {
      await prisma.analiseRiscoCompleta.updateMany({
        where: {
          id: origemId,
          unidade: req.unidadeAtiva,
          finalizadaEm: null,
          finalizacaoStatus: { not: "Anulada" },
        },
        data: {
          finalizacaoStatus: "Em Andamento",
          tratativaStatus: "Em andamento",
        },
      });
    }

    await registrarLog({
      req,
      acao: `Criacao de plano de acao ${plano.codigo}`,
      tipoRegistro: "PlanoAcao",
      registroId: plano.id,
      dadosNovos: plano,
    });
    return res.status(201).json(apresentarPlano(plano));
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      error:
        error instanceof Error ? error.message : "Erro ao criar plano de acao",
    });
  }
}

export async function atualizarPlanoAcao(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const anterior = await prisma.planoAcaoCorporativo.findFirst({
      where: {
        id: Number(id),
        unidade: req.unidadeAtiva,
        ...filtroPlanosVisiveis(req),
      },
    });
    if (!anterior)
      return res.status(404).json({ error: "Plano de acao nao encontrado" });

    const status = normalizarStatusPlano(req.body.status || anterior.status);
    const fatorRisco = await fatorRiscoDaArc(req);
    await validarFatorAindaDisponivel(
      req,
      fatorRisco.fatorRiscoId,
      anterior.id,
    );
    const responsavel = await responsaveisDoPlano(req);
    const mediadores = await mediadoresDoPlano(req);
    const responsaveis = parseListaJson<ResponsavelPlano>(
      responsavel.responsaveisJson,
    );
    const conclusoesAtuais = parseListaJson<ConclusaoMediadorPlano>(
      anterior.mediadoresConclusoesJson,
    ).filter((conclusao) =>
      mediadores.some((mediador) => mediador.id === conclusao.mediadorId),
    );
    const tratamentoExecucaoStatus =
      anterior.tratamentoExecucaoStatus || anterior.status || status;
    const progresso = progressoDoPlano(
      mediadores,
      conclusoesAtuais,
      tratamentoExecucaoStatus,
    );
    const plano = await prisma.planoAcaoCorporativo.update({
      where: { id: Number(id) },
      data: {
        titulo: req.body.titulo,
        origemModulo: req.body.origemModulo,
        origemId: normalizarId(req.body.origemId),
        ...fatorRisco,
        prioridade: req.body.prioridade,
        status: progresso.status,
        percentual: progresso.percentual,
        descricao:
          textoObrigatorio(req.body.descricao) ||
          textoObrigatorio(req.body.comentarios) ||
          anterior.descricao,
        acaoCorretiva: req.body.acaoCorretiva,
        acaoPreventiva: req.body.acaoPreventiva,
        ...responsavel,
        mediadoresJson: JSON.stringify(mediadores),
        mediadoresConclusoesJson: JSON.stringify(conclusoesAtuais),
        tratamentoExecucaoStatus,
        prazo: req.body.prazo ? new Date(req.body.prazo) : anterior.prazo,
        concluidoEm: progresso.concluidoEm,
        evidencia: req.body.evidencia,
        comentarios: textoObrigatorio(req.body.comentarios),
      },
      include: {
        responsavel: { select: { id: true, nome: true, apelido: true } },
      },
    });

    await sincronizarMencoesPlanoAcao(req, plano, responsaveis, mediadores);

    await registrarLog({
      req,
      acao: `Atualizacao de plano de acao ${plano.codigo}`,
      tipoRegistro: "PlanoAcao",
      registroId: plano.id,
      dadosAnteriores: anterior,
      dadosNovos: plano,
    });
    return res.json(apresentarPlano(plano));
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      error:
        error instanceof Error
          ? error.message
          : "Erro ao atualizar plano de acao",
    });
  }
}

export async function tratarPlanoAcao(req: AuthRequest, res: Response) {
  try {
    const id = Number(req.params.id);
    const anterior = await prisma.planoAcaoCorporativo.findFirst({
      where: { id, unidade: req.unidadeAtiva, ...filtroPlanosVisiveis(req) },
    });
    if (!anterior) {
      return res.status(404).json({ error: "Plano de acao nao encontrado" });
    }
    if (!usuarioResponsavelPelaExecucao(anterior, req.usuarioId)) {
      return res.status(403).json({
        error:
          "Somente responsáveis pela execução podem registrar o tratamento deste plano.",
      });
    }

    const mediadores = parseListaJson<MediadorPlano>(anterior.mediadoresJson);
    const conclusoesMediadores = parseListaJson<ConclusaoMediadorPlano>(
      anterior.mediadoresConclusoesJson,
    );
    const tratamentoExecucaoStatus = normalizarStatusPlano(
      req.body.status || anterior.tratamentoExecucaoStatus || anterior.status,
    );
    const progresso = progressoDoPlano(
      mediadores,
      conclusoesMediadores,
      tratamentoExecucaoStatus,
    );
    const comentarios = textoObrigatorio(req.body.comentarios);
    const anexos = anexosDoRequest(req);
    const tratamentoCustos = tratamentoCustosDoRequest(req);

    const plano = await prisma.planoAcaoCorporativo.update({
      where: { id },
      data: {
        status: progresso.status,
        percentual: progresso.percentual,
        comentarios: comentarios || anterior.comentarios,
        evidencia: evidenciaComAnexos(anterior.evidencia, anexos),
        tratamentoExecucaoStatus,
        tratamentoCustosJson: JSON.stringify(tratamentoCustos),
        concluidoEm: progresso.concluidoEm,
      },
      include: {
        responsavel: { select: { id: true, nome: true, apelido: true } },
      },
    });

    if (plano.origemModulo === "AnaliseRisco" && plano.origemId) {
      await prisma.analiseRiscoCompleta.updateMany({
        where: {
          id: plano.origemId,
          unidade: req.unidadeAtiva,
          finalizadaEm: null,
          finalizacaoStatus: { not: "Anulada" },
        },
        data: {
          finalizacaoStatus: "Em Andamento",
          tratativaStatus: "Em andamento",
        },
      });
    }

    await registrarLog({
      req,
      acao: `Tratamento de plano de acao ${plano.codigo}`,
      tipoRegistro: "PlanoAcao",
      registroId: plano.id,
      dadosAnteriores: anterior,
      dadosNovos: plano,
    });

    return res.json(apresentarPlano(plano));
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      error:
        error instanceof Error ? error.message : "Erro ao tratar plano de acao",
    });
  }
}

export async function concluirAnaliseMediadorPlanoAcao(
  req: AuthRequest,
  res: Response,
) {
  try {
    const id = Number(req.params.id);
    const anterior = await prisma.planoAcaoCorporativo.findFirst({
      where: { id, unidade: req.unidadeAtiva, ...filtroPlanosVisiveis(req) },
    });
    if (!anterior) {
      return res.status(404).json({ error: "Plano de acao nao encontrado" });
    }

    if (!req.usuarioId) {
      return res.status(401).json({ error: "Usuário não autenticado." });
    }

    const mediadores = parseListaJson<MediadorPlano>(anterior.mediadoresJson);
    if (!mediadores.length) {
      return res.status(400).json({
        error: "Este plano não possui mediadores para análise.",
      });
    }

    const mediador = mediadores.find((item) => item.id === req.usuarioId);
    if (!mediador) {
      return res.status(403).json({
        error: "Somente mediadores deste plano podem concluir esta análise.",
      });
    }

    const conclusao = textoObrigatorio(req.body.conclusao);
    if (!conclusao) {
      return res
        .status(400)
        .json({ error: "Informe a conclusão da análise do mediador." });
    }

    const conclusoesAtuais = parseListaJson<ConclusaoMediadorPlano>(
      anterior.mediadoresConclusoesJson,
    ).filter((item) => item.mediadorId !== mediador.id);
    const conclusoes = [
      ...conclusoesAtuais,
      {
        mediadorId: mediador.id,
        mediadorNome: mediador.nome,
        conclusao,
        concluidoEm: new Date().toISOString(),
      },
    ];
    const progresso = progressoDoPlano(
      mediadores,
      conclusoes,
      anterior.tratamentoExecucaoStatus || anterior.status,
    );

    const plano = await prisma.planoAcaoCorporativo.update({
      where: { id },
      data: {
        mediadoresConclusoesJson: JSON.stringify(conclusoes),
        percentual: progresso.percentual,
        status: progresso.status,
        concluidoEm: progresso.concluidoEm,
        comentarios:
          textoObrigatorio(req.body.comentarios) || anterior.comentarios,
      },
      include: {
        responsavel: { select: { id: true, nome: true, apelido: true } },
      },
    });

    if (plano.origemModulo === "AnaliseRisco" && plano.origemId) {
      await prisma.analiseRiscoCompleta.updateMany({
        where: {
          id: plano.origemId,
          unidade: req.unidadeAtiva,
          finalizadaEm: null,
          finalizacaoStatus: { not: "Anulada" },
        },
        data: {
          finalizacaoStatus: "Em Andamento",
          tratativaStatus:
            progresso.percentual >= 100 ? "Concluída" : "Em andamento",
          tratativaConcluidaEm:
            progresso.percentual >= 100 ? new Date() : null,
        },
      });
    }

    await registrarLog({
      req,
      acao: `Conclusão de análise de mediador no plano ${plano.codigo}`,
      tipoRegistro: "PlanoAcao",
      registroId: plano.id,
      dadosAnteriores: anterior,
      dadosNovos: plano,
    });

    return res.json(apresentarPlano(plano));
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      error:
        error instanceof Error
          ? error.message
          : "Erro ao concluir análise do mediador.",
    });
  }
}

export async function excluirPlanoAcao(req: AuthRequest, res: Response) {
  try {
    const id = Number(req.params.id);
    const anterior = await prisma.planoAcaoCorporativo.findFirst({
      where: { id, unidade: req.unidadeAtiva, ...filtroPlanosVisiveis(req) },
    });
    if (!anterior)
      return res.status(404).json({ error: "Plano de acao nao encontrado" });

    await prisma.planoAcaoCorporativo.delete({ where: { id } });

    await registrarLog({
      req,
      acao: `Exclusao de plano de acao ${anterior.codigo}`,
      tipoRegistro: "PlanoAcao",
      registroId: anterior.id,
      dadosAnteriores: anterior,
    });

    return res.status(204).send();
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      error:
        error instanceof Error
          ? error.message
          : "Erro ao excluir plano de acao",
    });
  }
}
