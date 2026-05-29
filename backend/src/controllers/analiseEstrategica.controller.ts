import { Response } from "express";
import { prisma } from "../lib/prisma";
import { AuthRequest } from "../middlewares/auth";
import { registrarLog } from "../services/auditoria.service";

const prefixos: Record<string, string> = {
  "Causa Raiz": "ACR",
  Reincidencia: "ARE",
  Vulnerabilidade: "AVU",
  Perdas: "APE",
  Conformidade: "ACO",
  Preventiva: "APR",
  "Por Unidade": "AUN",
};

function normalizarId(valor: unknown) {
  const numero = Number(valor);
  return Number.isFinite(numero) && numero > 0 ? numero : null;
}

function normalizarData(valor: unknown) {
  return valor ? new Date(String(valor)) : null;
}

export async function listarAnalisesEstrategicas(req: AuthRequest, res: Response) {
  try {
    const analises = await prisma.analiseEstrategica.findMany({
      where: {
        unidade: req.unidadeAtiva,
      },
      orderBy: {
        createdAt: "desc",
      },
      include: {
        responsavel: {
          select: {
            id: true,
            nome: true,
            apelido: true,
          },
        },
      },
    });

    return res.json(analises);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro ao listar análises estratégicas" });
  }
}

export async function buscarVinculoAnaliseEstrategica(req: AuthRequest, res: Response) {
  try {
    const ocorrenciaId = normalizarId(req.query.ocorrenciaId);
    const eventoId = normalizarId(req.query.eventoId);
    const investigacaoId = normalizarId(req.query.investigacaoId);

    if (!ocorrenciaId && !eventoId && !investigacaoId) {
      return res.status(400).json({ error: "Informe o ID da ocorrência, evento ou investigação." });
    }

    if (investigacaoId) {
      const investigacao = await prisma.investigacao.findFirst({
        where: { id: investigacaoId, unidade: req.unidadeAtiva },
        include: {
          ocorrencia: {
            select: {
              id: true,
              codigo: true,
              assunto: true,
              local: true,
              natureza: true,
              subNatureza: true,
              relatoSeguranca: true,
            },
          },
        },
      });

      if (!investigacao) {
        return res.status(404).json({ error: "Investigação não encontrada para esta unidade." });
      }

      return res.json({
        origem: "Investigação",
        titulo: `Análise estratégica da investigação ${investigacao.codigo || investigacao.numeroOcorrencia}`,
        local: investigacao.local,
        unidade: investigacao.unidade,
        natureza: investigacao.natureza,
        subNatureza: investigacao.subNatureza,
        ocorrenciaId: investigacao.ocorrenciaId,
        investigacaoId: investigacao.id,
        contexto: {
          codigo: investigacao.codigo,
          assunto: investigacao.assunto,
          descricaoInvestigacao: investigacao.descricaoInvestigacao,
          conclusaoFatos: investigacao.conclusaoFatos,
          ocorrencia: investigacao.ocorrencia,
        },
      });
    }

    if (ocorrenciaId) {
      const ocorrencia = await prisma.ocorrencia.findFirst({
        where: { id: ocorrenciaId, unidade: req.unidadeAtiva },
        include: {
          investigacao: {
            select: {
              id: true,
              codigo: true,
              descricaoInvestigacao: true,
              conclusaoFatos: true,
              status: true,
            },
          },
        },
      });

      if (!ocorrencia) {
        return res.status(404).json({ error: "Ocorrência não encontrada para esta unidade." });
      }

      return res.json({
        origem: "Ocorrência",
        titulo: `Análise estratégica da ocorrência ${ocorrencia.codigo}`,
        local: ocorrencia.local,
        unidade: ocorrencia.unidade,
        natureza: ocorrencia.natureza,
        subNatureza: ocorrencia.subNatureza,
        ocorrenciaId: ocorrencia.id,
        investigacaoId: ocorrencia.investigacao?.id || null,
        contexto: {
          codigo: ocorrencia.codigo,
          assunto: ocorrencia.assunto,
          relatoSeguranca: ocorrencia.relatoSeguranca,
          investigacao: ocorrencia.investigacao,
        },
      });
    }

    if (eventoId) {
      const evento = await prisma.evento.findFirst({
        where: { id: eventoId, unidade: req.unidadeAtiva },
      });

      if (!evento) {
        return res.status(404).json({ error: "Evento não encontrado para esta unidade." });
      }

      return res.json({
        origem: "Evento",
        titulo: `Análise estratégica do evento ${evento.codigo}`,
        local: evento.local,
        unidade: evento.unidade,
        natureza: evento.natureza,
        subNatureza: evento.subNatureza,
        eventoId: evento.id,
        contexto: {
          codigo: evento.codigo,
          assunto: evento.assunto,
          relatoSeguranca: evento.relatoSeguranca,
        },
      });
    }

    return res.status(400).json({ error: "Vínculo inválido." });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro ao buscar dados vinculados" });
  }
}

export async function criarAnaliseEstrategica(req: AuthRequest, res: Response) {
  try {
    const { tipo, titulo, descricao } = req.body;

    if (!tipo || !titulo || !descricao) {
      return res.status(400).json({ error: "Informe tipo, título e descrição da análise." });
    }

    const ano = new Date().getFullYear();
    const ultima = await prisma.analiseEstrategica.findFirst({
      where: {
        ano,
        unidade: req.unidadeAtiva,
      },
      orderBy: {
        numero: "desc",
      },
    });

    const numero = ultima ? ultima.numero + 1 : 1;
    const prefixo = prefixos[tipo] || "AES";
    const codigo = `${prefixo}${String(numero).padStart(3, "0")}/${ano}`;

    const analise = await prisma.analiseEstrategica.create({
      data: {
        numero,
        ano,
        codigo,
        tipo,
        titulo,
        unidade: req.unidadeAtiva || "GJA-T1",
        setor: req.body.setor,
        local: req.body.local,
        dataHora: req.body.dataHora ? new Date(req.body.dataHora) : new Date(),
        responsavelId: req.usuarioId!,
        status: req.body.status || "Aberta",
        descricao,
        diagnostico: req.body.diagnostico,
        impacto: req.body.impacto,
        recomendacoes: req.body.recomendacoes,
        planoAcao: req.body.planoAcao,
        responsavelAcao: req.body.responsavelAcao,
        prazo: normalizarData(req.body.prazo),
        ocorrenciaId: normalizarId(req.body.ocorrenciaId),
        eventoId: normalizarId(req.body.eventoId),
        investigacaoId: normalizarId(req.body.investigacaoId),
        analiseRiscoId: normalizarId(req.body.analiseRiscoId),
      },
      include: {
        responsavel: {
          select: {
            id: true,
            nome: true,
            apelido: true,
          },
        },
      },
    });

    await registrarLog({
      req,
      acao: `Criação de análise estratégica ${analise.codigo}`,
      tipoRegistro: "AnaliseEstrategica",
      registroId: analise.id,
      dadosNovos: analise,
    });

    return res.status(201).json(analise);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro ao criar análise estratégica" });
  }
}

export async function atualizarAnaliseEstrategica(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const anterior = await prisma.analiseEstrategica.findFirst({
      where: {
        id: Number(id),
        unidade: req.unidadeAtiva,
      },
    });

    if (!anterior) {
      return res.status(404).json({ error: "Análise estratégica não encontrada" });
    }

    const analise = await prisma.analiseEstrategica.update({
      where: {
        id: Number(id),
      },
      data: {
        tipo: req.body.tipo,
        titulo: req.body.titulo,
        setor: req.body.setor,
        local: req.body.local,
        dataHora: req.body.dataHora ? new Date(req.body.dataHora) : anterior.dataHora,
        status: req.body.status || anterior.status,
        descricao: req.body.descricao,
        diagnostico: req.body.diagnostico,
        impacto: req.body.impacto,
        recomendacoes: req.body.recomendacoes,
        planoAcao: req.body.planoAcao,
        responsavelAcao: req.body.responsavelAcao,
        prazo: normalizarData(req.body.prazo),
        ocorrenciaId: normalizarId(req.body.ocorrenciaId),
        eventoId: normalizarId(req.body.eventoId),
        investigacaoId: normalizarId(req.body.investigacaoId),
        analiseRiscoId: normalizarId(req.body.analiseRiscoId),
      },
      include: {
        responsavel: {
          select: {
            id: true,
            nome: true,
            apelido: true,
          },
        },
      },
    });

    await registrarLog({
      req,
      acao: `Atualização de análise estratégica ${analise.codigo}`,
      tipoRegistro: "AnaliseEstrategica",
      registroId: analise.id,
      dadosAnteriores: anterior,
      dadosNovos: analise,
    });

    return res.json(analise);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro ao atualizar análise estratégica" });
  }
}

