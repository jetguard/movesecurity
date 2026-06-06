import { randomUUID } from "node:crypto";
import { Response } from "express";
import { prisma } from "../lib/prisma";
import { AuthRequest } from "../middlewares/auth";
import { registrarLog } from "../services/auditoria.service";
import { ErroTranscricaoAudio, transcreverAudioBuffer } from "../services/audioTranscricao.service";
import { calcularHashArquivo } from "../utils/arquivoHash";

function urlBase(req: AuthRequest) {
  const origem = req.headers.origin || `${req.protocol}://${req.get("host")}`;
  return String(origem).replace(/\/$/, "");
}

function parseJson<T>(valor: unknown, fallback: T): T {
  if (typeof valor !== "string") return (valor as T) || fallback;
  try {
    return JSON.parse(valor) as T;
  } catch {
    return fallback;
  }
}

async function validarLocalAtivo(local: string, unidade?: string) {
  const nome = String(local || "").trim();
  if (!nome) return null;

  return prisma.localTerminal.findFirst({
    where: {
      nome,
      unidade,
      status: "Ativo",
    },
  });
}

async function proximoCodigoOcorrencia(unidade: string) {
  const ano = new Date().getFullYear();
  const ultima = await prisma.ocorrencia.findFirst({
    where: { ano, unidade },
    orderBy: { numero: "desc" },
  });
  const numero = ultima ? ultima.numero + 1 : 1;
  return { ano, numero, codigo: `${String(numero).padStart(4, "0")}/${ano}` };
}

async function proximoCodigoEvento(unidade: string) {
  const ano = new Date().getFullYear();
  const ultimo = await prisma.evento.findFirst({
    where: { ano, unidade },
    orderBy: { numero: "desc" },
  });
  const numero = ultimo ? ultimo.numero + 1 : 1;
  return { ano, numero, codigo: `${String(numero).padStart(4, "0")}/${ano}` };
}

export async function gerarLinkRelatoCampo(req: AuthRequest, res: Response) {
  try {
    const token = randomUUID().replace(/-/g, "");
    const expiraEm = new Date(Date.now() + 6 * 60 * 60 * 1000);
    const relato = await prisma.relatoCampo.create({
      data: {
        token,
        expiraEm,
        unidade: req.unidadeAtiva || "GJA-T1",
        geradoPorId: req.usuarioId,
      },
      include: { geradoPor: { select: { nome: true, apelido: true } } },
    });

    await registrarLog({
      req,
      acao: "Geração de link de coleta de dados para relatório",
      tipoRegistro: "RelatoCampo",
      registroId: relato.id,
      dadosNovos: { id: relato.id, expiraEm: relato.expiraEm, unidade: relato.unidade },
    });

    return res.status(201).json({
      ...relato,
      link: `${urlBase(req)}/coleta-dados/${token}`,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro ao gerar link de coleta." });
  }
}

export async function listarRelatosCampo(req: AuthRequest, res: Response) {
  try {
    const relatos = await prisma.relatoCampo.findMany({
      where: { unidade: req.unidadeAtiva },
      orderBy: { createdAt: "desc" },
      include: {
        geradoPor: { select: { nome: true, apelido: true } },
        envolvidos: true,
        anexos: true,
      },
    });

    return res.json(relatos.map((relato) => ({
      ...relato,
      link: `${urlBase(req)}/coleta-dados/${relato.token}`,
      expirado: relato.status === "Link Gerado" && relato.expiraEm < new Date(),
    })));
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro ao listar relatos de campo." });
  }
}

export async function buscarRelatoCampoPublico(req: AuthRequest, res: Response) {
  try {
    const token = String(req.params.token || "");
    const relato = await prisma.relatoCampo.findUnique({
      where: { token },
      select: {
        token: true,
        status: true,
        unidade: true,
        expiraEm: true,
        enviadoEm: true,
        finalizadoEm: true,
      },
    });

    if (!relato) return res.status(404).json({ error: "Link de coleta não encontrado." });
    if (relato.finalizadoEm || relato.enviadoEm || relato.status !== "Link Gerado") {
      return res.status(410).json({ error: "Este link de coleta já foi finalizado." });
    }
    if (relato.expiraEm < new Date()) {
      return res.status(410).json({ error: "Este link de coleta expirou." });
    }

    const locais = await prisma.localTerminal.findMany({
      where: {
        unidade: relato.unidade,
        status: "Ativo",
      },
      orderBy: [{ areaSensivel: "desc" }, { nome: "asc" }],
      select: {
        id: true,
        nome: true,
        tipo: true,
        areaSensivel: true,
      },
    });

    return res.json({ ...relato, locais });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro ao validar link de coleta." });
  }
}

export async function enviarRelatoCampoPublico(req: AuthRequest, res: Response) {
  try {
    const token = String(req.params.token || "");
    const relato = await prisma.relatoCampo.findUnique({
      where: { token },
      include: { envolvidos: true },
    });

    if (!relato) return res.status(404).json({ error: "Link de coleta não encontrado." });
    if (relato.enviadoEm || relato.finalizadoEm || relato.status !== "Link Gerado") {
      return res.status(410).json({ error: "Este link de coleta já foi finalizado." });
    }
    if (relato.expiraEm < new Date()) {
      return res.status(410).json({ error: "Este link de coleta expirou." });
    }

    const envolvidos = parseJson<Array<{
      tipoEnvolvimento: string;
      nome: string;
      tipoDocumento: string;
      documento?: string;
      empresa?: string;
      possuiVeiculo?: boolean;
      placa?: string;
      reboque?: string;
      relato: string;
    }>>(req.body.envolvidos, []);

    if (!req.body.titulo || !req.body.local || !req.body.dataOcorrido || envolvidos.length === 0) {
      return res.status(400).json({ error: "Preencha título, local, data do ocorrido e pelo menos um envolvido." });
    }

    const localCadastro = await validarLocalAtivo(String(req.body.local), relato.unidade);
    if (!localCadastro) {
      return res.status(400).json({ error: "Selecione um local ativo cadastrado para esta unidade." });
    }

    const arquivos = (req.files as Express.Multer.File[]) || [];
    const anexos = arquivos.filter((arquivo) => !arquivo.fieldname.startsWith("audio_"));
    const audios = arquivos.filter((arquivo) => arquivo.fieldname.startsWith("audio_"));

    const atualizado = await prisma.relatoCampo.update({
      where: { id: relato.id },
      data: {
        titulo: String(req.body.titulo),
        setor: String(req.body.setor || ""),
        local: localCadastro.nome,
        responsavelColeta: String(req.body.responsavelColeta || ""),
        dataOcorrido: new Date(String(req.body.dataOcorrido)),
        observacoes: String(req.body.observacoes || ""),
        status: "Enviado",
        enviadoEm: new Date(),
        finalizadoEm: new Date(),
        envolvidos: {
          deleteMany: {},
          create: envolvidos.map((envolvido, index) => {
            const audio = audios.find((arquivo) => arquivo.fieldname === `audio_${index}`);
            return {
              tipoEnvolvimento: envolvido.tipoEnvolvimento || "Envolvido",
              nome: envolvido.nome,
              tipoDocumento: envolvido.tipoDocumento || "CPF",
              documento: envolvido.documento || "",
              empresa: envolvido.empresa || "",
              possuiVeiculo: Boolean(envolvido.possuiVeiculo),
              placa: envolvido.placa || "",
              reboque: envolvido.reboque || "",
              relato: envolvido.relato,
              audioCaminho: audio?.path,
              audioNome: audio?.originalname,
              audioTipo: audio?.mimetype,
            };
          }),
        },
        anexos: {
          create: anexos.map((arquivo) => ({
            nomeOriginal: arquivo.originalname,
            nomeArquivo: arquivo.filename,
            caminho: arquivo.path,
            tipo: arquivo.mimetype,
            categoria: "Evidencia",
            hashArquivo: calcularHashArquivo(arquivo.path),
          })),
        },
      },
      include: { envolvidos: true, anexos: true },
    });

    return res.status(201).json({
      mensagem: "Relato de campo enviado com sucesso.",
      relato: atualizado,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro ao enviar relato de campo." });
  }
}

export async function transcreverAudioRelatoCampoPublico(req: AuthRequest, res: Response) {
  try {
    const token = String(req.params.token || "");
    const relato = await prisma.relatoCampo.findUnique({
      where: { token },
      select: {
        status: true,
        expiraEm: true,
        enviadoEm: true,
        finalizadoEm: true,
      },
    });

    if (!relato) return res.status(404).json({ error: "Link de coleta não encontrado." });
    if (relato.enviadoEm || relato.finalizadoEm || relato.status !== "Link Gerado") {
      return res.status(410).json({ error: "Este link de coleta já foi finalizado." });
    }
    if (relato.expiraEm < new Date()) {
      return res.status(410).json({ error: "Este link de coleta expirou." });
    }
    if (!req.file) {
      return res.status(400).json({ error: "Grave ou anexe um áudio para transcrição." });
    }

    const transcricao = await transcreverAudioBuffer(req.file);
    return res.json({
      transcricao,
      aviso: "Transcrição gerada automaticamente. Revise o texto antes de enviar a coleta.",
    });
  } catch (error) {
    if (error instanceof ErroTranscricaoAudio) {
      return res.status(error.status).json({ error: error.message, detalhe: error.detalhe });
    }

    console.error(error);
    return res.status(500).json({ error: "Erro ao transcrever áudio do relato." });
  }
}

export async function converterRelatoCampo(req: AuthRequest, res: Response) {
  try {
    const relato = await prisma.relatoCampo.findFirst({
      where: { id: Number(req.params.id), unidade: req.unidadeAtiva },
      include: { envolvidos: true, anexos: true },
    });

    if (!relato) return res.status(404).json({ error: "Relato de campo não encontrado." });
    if (relato.status === "Convertido") return res.status(400).json({ error: "Este relato já foi convertido." });
    if (relato.status !== "Enviado") return res.status(400).json({ error: "Somente relatos enviados podem ser convertidos." });

    const tipo = String(req.body.tipo || "");
    const assunto = String(req.body.assunto || relato.titulo || "");
    const natureza = String(req.body.natureza || "");
    const subNatureza = String(req.body.subNatureza || "");
    const relatoSeguranca = String(req.body.relatoSeguranca || relato.observacoes || "");
    const localInformado = String(req.body.local || relato.local || "");

    if (!["Ocorrencia", "Evento"].includes(tipo)) {
      return res.status(400).json({ error: "Escolha se o relato será Ocorrência ou Evento." });
    }
    if (!assunto || !localInformado || !natureza || !subNatureza) {
      return res.status(400).json({ error: "Preencha assunto, local, natureza e subnatureza para converter." });
    }

    const localCadastro = await validarLocalAtivo(localInformado, req.unidadeAtiva);
    if (!localCadastro) {
      return res.status(400).json({ error: "Selecione um local ativo cadastrado para esta unidade." });
    }

    const envolvidos = relato.envolvidos.map((envolvido) => ({
      tipoEnvolvimento: envolvido.tipoEnvolvimento,
      nome: envolvido.nome,
      tipoDocumento: envolvido.tipoDocumento,
      documento: envolvido.documento || "",
      empresa: envolvido.empresa || "",
      possuiVeiculo: envolvido.possuiVeiculo,
      placa: envolvido.placa || "",
      reboque: envolvido.reboque || "",
      relato: envolvido.audioNome
        ? `${envolvido.relato}\n\nÁudio coletado em campo: ${envolvido.audioNome}`
        : envolvido.relato,
    }));

    if (tipo === "Ocorrencia") {
      const sequencia = await proximoCodigoOcorrencia(relato.unidade);
      const ocorrencia = await prisma.ocorrencia.create({
        data: {
          ...sequencia,
          codigo: sequencia.codigo,
          assunto,
          local: localCadastro.nome,
          unidade: relato.unidade,
          natureza,
          subNatureza,
          dataOcorrencia: relato.dataOcorrido || new Date(),
          relatoSeguranca,
          envolvidos: { create: envolvidos },
          anexos: {
            create: relato.anexos.map((arquivo) => ({
              nomeOriginal: arquivo.nomeOriginal,
              nomeArquivo: arquivo.nomeArquivo,
              caminho: arquivo.caminho,
              tipo: arquivo.tipo,
              hashArquivo: arquivo.hashArquivo,
            })),
          },
        },
        include: { envolvidos: true, anexos: true },
      });

      await prisma.relatoCampo.update({
        where: { id: relato.id },
        data: {
          status: "Convertido",
          convertidoTipo: "Ocorrencia",
          convertidoRegistroId: ocorrencia.id,
          convertidoCodigo: ocorrencia.codigo,
        },
      });

      await registrarLog({ req, acao: `Conversão de relato de campo em ocorrência ${ocorrencia.codigo}`, tipoRegistro: "RelatoCampo", registroId: relato.id, dadosNovos: { relatoId: relato.id, ocorrencia } });
      return res.json({ tipo: "Ocorrencia", registro: ocorrencia });
    }

    const sequencia = await proximoCodigoEvento(relato.unidade);
    const evento = await prisma.evento.create({
      data: {
        ...sequencia,
        codigo: sequencia.codigo,
        assunto,
        local: localCadastro.nome,
        unidade: relato.unidade,
        natureza,
        subNatureza,
        dataEvento: relato.dataOcorrido || new Date(),
        relatoSeguranca,
        envolvidos: { create: envolvidos },
        anexos: {
          create: relato.anexos.map((arquivo) => ({
            nomeOriginal: arquivo.nomeOriginal,
            nomeArquivo: arquivo.nomeArquivo,
            caminho: arquivo.caminho,
            tipo: arquivo.tipo,
            hashArquivo: arquivo.hashArquivo,
          })),
        },
      },
      include: { envolvidos: true, anexos: true },
    });

    await prisma.relatoCampo.update({
      where: { id: relato.id },
      data: {
        status: "Convertido",
        convertidoTipo: "Evento",
        convertidoRegistroId: evento.id,
        convertidoCodigo: evento.codigo,
      },
    });

    await registrarLog({ req, acao: `Conversão de relato de campo em evento ${evento.codigo}`, tipoRegistro: "RelatoCampo", registroId: relato.id, dadosNovos: { relatoId: relato.id, evento } });
    return res.json({ tipo: "Evento", registro: evento });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro ao converter relato de campo." });
  }
}
