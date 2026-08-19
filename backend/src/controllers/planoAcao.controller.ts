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

async function responsavelDoPlano(req: AuthRequest) {
  const responsavelId = normalizarId(req.body.responsavelId);
  if (!responsavelId) {
    return {
      responsavelId: null,
      responsavelNome: textoObrigatorio(req.body.responsavelNome) || null,
    };
  }

  const responsavel = await prisma.usuario.findFirst({
    where: {
      id: responsavelId,
      statusUsuario: "ATIVO",
      OR: [
        { unidade: req.unidadeAtiva },
        { unidade: null },
        { unidadesPermitidas: { contains: req.unidadeAtiva || "" } },
      ],
    },
    select: { id: true, nome: true },
  });

  if (!responsavel) {
    throw new Error("Responsável selecionado não encontrado ou inativo.");
  }

  return {
    responsavelId: responsavel.id,
    responsavelNome: responsavel.nome,
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
  return {
    ...plano,
    status: normalizarStatusPlano(plano.status),
    mediadores: parseListaJson<MediadorPlano>(plano.mediadoresJson),
    anexosTratamento: parseListaJson<AnexoTratamentoPlano>(plano.evidencia),
  };
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

export async function listarPlanosAcao(req: AuthRequest, res: Response) {
  try {
    const planos = await prisma.planoAcaoCorporativo.findMany({
      where: { unidade: req.unidadeAtiva },
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
      where: { id: Number(req.params.id), unidade: req.unidadeAtiva },
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
    const responsavel = await responsavelDoPlano(req);
    const mediadores = await mediadoresDoPlano(req);
    const percentual =
      status === "Concluido" || status === "Concluído" ? 100 : 0;

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
        status,
        percentual,
        descricao,
        acaoCorretiva: req.body.acaoCorretiva,
        acaoPreventiva: req.body.acaoPreventiva,
        ...responsavel,
        mediadoresJson: JSON.stringify(mediadores),
        prazo: new Date(prazo),
        concluidoEm: status === "Concluido" ? new Date() : null,
        evidencia: req.body.evidencia,
        comentarios,
      },
      include: {
        responsavel: { select: { id: true, nome: true, apelido: true } },
      },
    });

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
      where: { id: Number(id), unidade: req.unidadeAtiva },
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
    const responsavel = await responsavelDoPlano(req);
    const mediadores = await mediadoresDoPlano(req);
    const percentual =
      status === "Concluido" || status === "Concluído" ? 100 : 0;
    const plano = await prisma.planoAcaoCorporativo.update({
      where: { id: Number(id) },
      data: {
        titulo: req.body.titulo,
        origemModulo: req.body.origemModulo,
        origemId: normalizarId(req.body.origemId),
        ...fatorRisco,
        prioridade: req.body.prioridade,
        status,
        percentual,
        descricao:
          textoObrigatorio(req.body.descricao) ||
          textoObrigatorio(req.body.comentarios) ||
          anterior.descricao,
        acaoCorretiva: req.body.acaoCorretiva,
        acaoPreventiva: req.body.acaoPreventiva,
        ...responsavel,
        mediadoresJson: JSON.stringify(mediadores),
        prazo: req.body.prazo ? new Date(req.body.prazo) : anterior.prazo,
        concluidoEm: status === "Concluido" ? new Date() : null,
        evidencia: req.body.evidencia,
        comentarios: textoObrigatorio(req.body.comentarios),
      },
      include: {
        responsavel: { select: { id: true, nome: true, apelido: true } },
      },
    });

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
      where: { id, unidade: req.unidadeAtiva },
    });
    if (!anterior) {
      return res.status(404).json({ error: "Plano de acao nao encontrado" });
    }

    const status = normalizarStatusPlano(req.body.status || anterior.status);
    const percentual = status === "Concluido" ? 100 : 0;
    const comentarios = textoObrigatorio(req.body.comentarios);
    const anexos = anexosDoRequest(req);

    const plano = await prisma.planoAcaoCorporativo.update({
      where: { id },
      data: {
        status,
        percentual,
        comentarios: comentarios || anterior.comentarios,
        evidencia: evidenciaComAnexos(anterior.evidencia, anexos),
        concluidoEm: status === "Concluido" ? new Date() : null,
      },
      include: {
        responsavel: { select: { id: true, nome: true, apelido: true } },
      },
    });

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

export async function excluirPlanoAcao(req: AuthRequest, res: Response) {
  try {
    const id = Number(req.params.id);
    const anterior = await prisma.planoAcaoCorporativo.findFirst({
      where: { id, unidade: req.unidadeAtiva },
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
