import { randomUUID } from "node:crypto";
import fs from "node:fs";
import { Response } from "express";
import PDFDocument from "pdfkit";
import { prisma } from "../lib/prisma";
import { AuthRequest } from "../middlewares/auth";
import { registrarLog } from "../services/auditoria.service";
import { ErroTranscricaoAudio, transcreverAudioBuffer } from "../services/audioTranscricao.service";
import { desenharCabecalhoPadrao, desenharRodapeAssinaturaPadrao, pdfTheme } from "../services/documentoPdfBase.service";
import { validarPinOperacional } from "../services/pinOperacional.service";
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

function textoChecklistColeta(valor?: string | null) {
  const checklist = parseJson<Record<string, boolean>>(valor, {});
  const rotulos: Record<string, string> = {
    fotosLocal: "Fotos do local anexadas",
    relatoPrincipal: "Relato do envolvido principal coletado",
    testemunha: "Existe testemunha",
    veiculoEnvolvido: "Existe veículo envolvido",
    danoMaterial: "Existe dano material visível",
    horarioAproximado: "Horário aproximado informado",
    localExato: "Local exato informado",
    audioGravado: "Existe áudio gravado",
    acionouCcos: "CCOS acionado",
    cameraCftv: "Há câmera CFTV próxima",
  };

  const linhas = Object.entries(rotulos).map(([chave, rotulo]) => `- ${rotulo}: ${checklist[chave] ? "Sim" : "Não"}`);
  return linhas.length ? `\n\nChecklist de coleta:\n${linhas.join("\n")}` : "";
}

function formatarData(valor?: Date | string | null) {
  if (!valor) return "NÃ£o informado";
  return new Date(valor).toLocaleString("pt-BR");
}

function valorChecklistColeta(valor?: string | null) {
  const checklist = parseJson<Record<string, boolean>>(valor, {});
  return [
    ["Fotos do local anexadas", checklist.fotosLocal],
    ["Relato principal coletado", checklist.relatoPrincipal],
    ["Existe testemunha", checklist.testemunha],
    ["Existe veÃ­culo envolvido", checklist.veiculoEnvolvido],
    ["Dano material visÃ­vel", checklist.danoMaterial],
    ["HorÃ¡rio aproximado informado", checklist.horarioAproximado],
    ["Local exato informado", checklist.localExato],
    ["Ãudio gravado", checklist.audioGravado],
    ["CCOS acionado", checklist.acionouCcos],
    ["CÃ¢mera CFTV prÃ³xima", checklist.cameraCftv],
  ];
}

function garantirEspaco(doc: PDFKit.PDFDocument, altura = 80) {
  if (doc.y + altura > doc.page.height - 132) {
    doc.addPage();
    desenharCabecalhoPadrao(doc, {
      titulo: "Relato de campo",
      subtitulo: "Coleta de dados patrimonial",
      codigo: "ContinuaÃ§Ã£o",
      unidade: "",
    });
  }
}

function secaoPdf(doc: PDFKit.PDFDocument, titulo: string) {
  garantirEspaco(doc, 44);
  doc.moveDown(0.4);
  doc.fillColor(pdfTheme.primary).fontSize(13).text(titulo, 42, doc.y, { width: 511 });
  doc.moveTo(42, doc.y + 6).lineTo(553, doc.y + 6).strokeColor(pdfTheme.line).lineWidth(0.8).stroke();
  doc.moveDown(1.1);
}

function linhaInfo(doc: PDFKit.PDFDocument, label: string, valor?: string | null, x = 42, y?: number, width = 240) {
  const atualY = y ?? doc.y;
  doc.roundedRect(x, atualY, width, 42, 8).fill("#f8fafc").strokeColor("#dbe4f0").stroke();
  doc.fillColor("#64748b").fontSize(7).text(label.toUpperCase(), x + 10, atualY + 8, { width: width - 20, lineBreak: false });
  doc.fillColor("#0f172a").fontSize(9).text(valor || "NÃ£o informado", x + 10, atualY + 22, { width: width - 20, lineBreak: false, ellipsis: true });
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

export async function excluirLinkRelatoCampo(req: AuthRequest, res: Response) {
  try {
    const relato = await prisma.relatoCampo.findFirst({
      where: {
        id: Number(req.params.id),
        unidade: req.unidadeAtiva,
      },
      include: {
        geradoPor: { select: { nome: true, apelido: true } },
      },
    });

    if (!relato) return res.status(404).json({ error: "Link de coleta não encontrado." });
    if (relato.geradoPorId !== req.usuarioId) {
      return res.status(403).json({ error: "Somente o usuário que criou o link pode excluir este link de coleta." });
    }
    if (relato.status !== "Link Gerado" || relato.enviadoEm || relato.finalizadoEm) {
      return res.status(400).json({ error: "Este link já possui envio ou conversão e não pode ser excluído." });
    }

    await validarPinOperacional(req.usuarioId!, String(req.body?.pinOperacional || ""));

    await prisma.relatoCampo.delete({ where: { id: relato.id } });

    await registrarLog({
      req,
      acao: `Exclusão de link de coleta de dados ${relato.id}`,
      tipoRegistro: "RelatoCampo",
      registroId: relato.id,
      dadosAnteriores: {
        id: relato.id,
        unidade: relato.unidade,
        expiraEm: relato.expiraEm,
        geradoPor: relato.geradoPor?.apelido || relato.geradoPor?.nome,
      },
    });

    return res.status(204).send();
  } catch (error: any) {
    const status = error?.status || 500;
    if (status !== 500) return res.status(status).json({ error: error.message || "PIN operacional inválido." });

    console.error(error);
    return res.status(500).json({ error: "Erro ao excluir link de coleta." });
  }
}

export async function baixarAnexoRelatoCampo(req: AuthRequest, res: Response) {
  try {
    const anexo = await prisma.anexoRelatoCampo.findFirst({
      where: {
        id: Number(req.params.anexoId),
        relatoCampo: { unidade: req.unidadeAtiva },
      },
    });

    if (!anexo) return res.status(404).json({ error: "Anexo nao encontrado." });
    if (!fs.existsSync(anexo.caminho)) return res.status(404).json({ error: "Arquivo nao encontrado no servidor." });

    res.setHeader("Content-Type", anexo.tipo || "application/octet-stream");
    res.setHeader("Content-Disposition", `inline; filename="${encodeURIComponent(anexo.nomeOriginal)}"`);
    return fs.createReadStream(anexo.caminho).pipe(res);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro ao abrir anexo do relato." });
  }
}

export async function gerarPdfRelatoCampo(req: AuthRequest, res: Response) {
  try {
    const relato = await prisma.relatoCampo.findFirst({
      where: { id: Number(req.params.id), unidade: req.unidadeAtiva },
      include: {
        geradoPor: { select: { nome: true, apelido: true } },
        envolvidos: true,
        anexos: true,
      },
    });

    if (!relato) return res.status(404).json({ error: "Relato de campo nao encontrado." });

    const doc = new PDFDocument({ size: "A4", margin: 42, bufferPages: true });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename=relato-campo-RC${String(relato.id).padStart(4, "0")}.pdf`);
    doc.pipe(res);

    desenharCabecalhoPadrao(doc, {
      titulo: "Relato de campo",
      subtitulo: relato.titulo || "Coleta de dados patrimonial",
      codigo: `RC${String(relato.id).padStart(4, "0")}`,
      unidade: relato.unidade,
    });

    secaoPdf(doc, "Dados da coleta");
    const y1 = doc.y;
    linhaInfo(doc, "Status", relato.status, 42, y1, 120);
    linhaInfo(doc, "Unidade", relato.unidade, 174, y1, 110);
    linhaInfo(doc, "Local", relato.local, 296, y1, 257);
    doc.y = y1 + 54;
    const y2 = doc.y;
    linhaInfo(doc, "Responsavel pela coleta", relato.responsavelColeta || relato.geradoPor?.apelido || relato.geradoPor?.nome, 42, y2, 240);
    linhaInfo(doc, "Data do ocorrido", formatarData(relato.dataOcorrido), 294, y2, 259);
    doc.y = y2 + 58;

    if (relato.convertidoCodigo) {
      doc.roundedRect(42, doc.y, 511, 42, 8).fill("#ecfdf5").strokeColor("#a7f3d0").stroke();
      doc.fillColor("#047857").fontSize(9).text(`Convertido para ${relato.convertidoTipo} ${relato.convertidoCodigo}`, 56, doc.y + 14, { width: 480 });
      doc.y += 56;
    }

    if (relato.observacoes) {
      secaoPdf(doc, "Observacoes gerais");
      doc.fillColor("#0f172a").fontSize(10).text(relato.observacoes, 42, doc.y, { width: 511, align: "justify" });
      doc.moveDown(1);
    }

    secaoPdf(doc, "Partes envolvidas");
    relato.envolvidos.forEach((envolvido, index) => {
      garantirEspaco(doc, 110);
      doc.roundedRect(42, doc.y, 511, 28, 8).fill("#0f172a");
      doc.fillColor("#ffffff").fontSize(9).text(`${index + 1}. ${envolvido.nome} - ${envolvido.tipoEnvolvimento}`, 54, doc.y + 9, { width: 480 });
      doc.y += 38;
      doc.fillColor("#475569").fontSize(8).text(
        `Documento: ${envolvido.tipoDocumento} ${envolvido.documento || "N/I"} | Empresa: ${envolvido.empresa || "N/I"} | Veiculo: ${envolvido.possuiVeiculo ? `${envolvido.placa || "N/I"} ${envolvido.reboque ? `/ ${envolvido.reboque}` : ""}` : "Nao"}`,
        42,
        doc.y,
        { width: 511 }
      );
      doc.moveDown(0.5);
      doc.fillColor("#0f172a").fontSize(10).text(envolvido.relato || "Sem relato informado.", 42, doc.y, { width: 511, align: "justify" });
      if (envolvido.audioNome) {
        doc.moveDown(0.4);
        doc.fillColor("#2563eb").fontSize(8).text(`Audio anexado: ${envolvido.audioNome}`, 42, doc.y, { width: 511 });
      }
      doc.moveDown(1);
    });

    secaoPdf(doc, "Checklist inteligente");
    valorChecklistColeta(relato.checklistColeta).forEach(([label, valor]) => {
      garantirEspaco(doc, 22);
      doc.fillColor(valor ? "#047857" : "#b45309").fontSize(9).text(`${valor ? "Sim" : "Nao"} - ${label}`, 54, doc.y, { width: 480 });
      doc.moveDown(0.4);
    });

    secaoPdf(doc, "Evidencias anexadas");
    if (relato.anexos.length === 0) {
      doc.fillColor("#64748b").fontSize(9).text("Nenhuma evidencia anexada.", 42, doc.y, { width: 511 });
    } else {
      relato.anexos.forEach((anexo) => {
        garantirEspaco(doc, 22);
        doc.fillColor("#0f172a").fontSize(9).text(`- ${anexo.nomeOriginal} (${anexo.tipo})`, 54, doc.y, { width: 480 });
        doc.moveDown(0.35);
      });
    }

    const range = doc.bufferedPageRange();
    for (let i = range.start; i < range.start + range.count; i += 1) {
      doc.switchToPage(i);
      desenharRodapeAssinaturaPadrao(doc, {
        assinatura: null,
        qrCode: null,
        pagina: i + 1,
        totalPaginas: range.count,
      });
    }

    doc.end();
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro ao gerar PDF do relato de campo." });
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
        checklistColeta: String(req.body.checklistColeta || "{}"),
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
    const relatoSeguranca = `${String(req.body.relatoSeguranca || relato.observacoes || "")}${textoChecklistColeta(relato.checklistColeta)}`;
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
