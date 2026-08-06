import { Response } from "express";
import PDFDocument from "pdfkit";
import { prisma } from "../lib/prisma";
import { AuthRequest, PERFIS } from "../middlewares/auth";
import { UNIDADES_SISTEMA } from "../config/unidades";
import { registrarLog } from "../services/auditoria.service";
import { registrarMudancaStatus } from "./camera.controller";
import {
  criarQrCodeValidacao,
  desenharCabecalhoPadrao,
  desenharRodapeAssinaturaPadrao,
  pdfTheme,
} from "../services/documentoPdfBase.service";

const STATUS_ABERTO = "EM_ABERTO";
const STATUS_ATENDIMENTO = "EM_ATENDIMENTO";
const STATUS_CONCLUIDO = "CONCLUIDA";
const STATUS_OS_ATIVAS = [STATUS_ABERTO, STATUS_ATENDIMENTO];
const STATUS_CAMERA_ATENDIMENTO = "Em atendimento";
const STATUS_CAMERA_CONECTADA = "Conectada";

const includeOrdemServico = {
  camera: true,
  abertaPor: { select: { id: true, nome: true, apelido: true, email: true } },
  atendidoPor: { select: { id: true, nome: true, apelido: true, email: true } },
};

function booleano(valor: unknown) {
  return (
    valor === true || valor === "true" || valor === "Sim" || valor === "SIM"
  );
}

function podeTratar(perfil?: string) {
  return [
    PERFIS.SUPER_ADMIN,
    PERFIS.ADMINISTRADOR,
    PERFIS.TECNICO_MANUTENCAO,
  ].includes(perfil || "");
}

function codigoOrdemServico(numero: number, ano: number) {
  return `OS${String(numero).padStart(4, "0")}/${ano}`;
}

function texto(valor?: string | number | boolean | null) {
  if (valor === true) return "Sim";
  if (valor === false) return "Não";
  const normalizado = String(valor ?? "").trim();
  return normalizado || "Não informado";
}

function data(valor?: Date | string | null) {
  if (!valor) return "Não informado";
  return new Date(valor).toLocaleString("pt-BR");
}

function garantirEspaco(doc: PDFKit.PDFDocument, altura = 70) {
  if (doc.y + altura > doc.page.height - 130) {
    doc.addPage();
  }
}

function secao(doc: PDFKit.PDFDocument, titulo: string) {
  garantirEspaco(doc, 46);
  const y = doc.y;
  doc
    .roundedRect(42, y, doc.page.width - 84, 25, 6)
    .fillColor(pdfTheme.accent)
    .fill();
  doc
    .fillColor("#ffffff")
    .font("Helvetica-Bold")
    .fontSize(10)
    .text(titulo.toUpperCase(), 54, y + 7, { width: doc.page.width - 108 });
  doc.y = y + 36;
}

function campo(
  doc: PDFKit.PDFDocument,
  rotulo: string,
  valor?: string | number | boolean | null,
  x = 42,
  width = 245,
) {
  const y = doc.y;
  doc
    .roundedRect(x, y, width, 40, 6)
    .fillColor(pdfTheme.soft)
    .fill()
    .strokeColor(pdfTheme.line)
    .lineWidth(0.6)
    .stroke();
  doc
    .fillColor(pdfTheme.accent)
    .font("Helvetica-Bold")
    .fontSize(7.4)
    .text(rotulo.toUpperCase(), x + 10, y + 7, {
      width: width - 20,
      height: 10,
      ellipsis: true,
    });
  doc
    .fillColor(pdfTheme.primary)
    .font("Helvetica")
    .fontSize(9)
    .text(texto(valor), x + 10, y + 22, {
      width: width - 20,
      height: 13,
      ellipsis: true,
    });
  doc.x = 42;
  doc.y = y;
}

function paragrafo(doc: PDFKit.PDFDocument, conteudo?: string | null) {
  garantirEspaco(doc, 80);
  doc
    .fillColor(pdfTheme.primary)
    .font("Helvetica")
    .fontSize(9.2)
    .text(texto(conteudo), 42, doc.y, {
      width: doc.page.width - 84,
      align: "justify",
    });
  doc.moveDown(0.8);
}

function unidadesDoUsuario(req: AuthRequest) {
  if (req.usuarioPerfil === PERFIS.TECNICO_MANUTENCAO) {
    return UNIDADES_SISTEMA;
  }

  return Array.from(
    new Set(
      [
        ...(req.unidadesPermitidas || []),
        req.unidadeAtiva || "",
        req.usuarioUnidade || "",
      ].filter(Boolean),
    ),
  );
}

export async function listarOrdensServico(req: AuthRequest, res: Response) {
  try {
    const unidades = unidadesDoUsuario(req);

    const ordens = await prisma.ordemServicoCamera.findMany({
      where: {
        unidade: {
          in: unidades.length ? unidades : [req.unidadeAtiva || "GJA-T1"],
        },
      },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      include: includeOrdemServico,
    });

    return res.json(ordens);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro ao listar ordens de servico" });
  }
}

export async function abrirOrdemServico(req: AuthRequest, res: Response) {
  try {
    const cameraId = Number(req.body.cameraId);
    if (!cameraId) {
      return res
        .status(400)
        .json({ error: "Informe a camera para abrir a ordem de servico." });
    }

    const unidades = unidadesDoUsuario(req);
    const camera = await prisma.cameraMonitoramento.findFirst({
      where: {
        id: cameraId,
        unidade: {
          in: unidades.length ? unidades : [req.unidadeAtiva || "GJA-T1"],
        },
        statusCadastro: "Ativa",
      },
    });
    if (!camera) {
      return res.status(404).json({ error: "Camera nao encontrada." });
    }

    const unidade = camera.unidade || req.unidadeAtiva || "GJA-T1";
    const existente = await prisma.ordemServicoCamera.findFirst({
      where: {
        cameraId: camera.id,
        unidade,
        status: { in: STATUS_OS_ATIVAS },
      },
      orderBy: { createdAt: "desc" },
      include: includeOrdemServico,
    });
    if (existente) {
      return res.json({ ordem: existente, existente: true });
    }

    const ano = new Date().getFullYear();
    const ordem = await prisma.$transaction(async (tx) => {
      const ultima = await tx.ordemServicoCamera.findFirst({
        where: { ano, unidade },
        orderBy: { numero: "desc" },
      });
      const numero = (ultima?.numero || 0) + 1;

      return tx.ordemServicoCamera.create({
        data: {
          numero,
          ano,
          codigo: codigoOrdemServico(numero, ano),
          cameraId: camera.id,
          unidade,
          status: STATUS_ABERTO,
          origem: "CAMERA_DESCONECTADA",
          descricao:
            req.body.descricao ||
            "Camera marcada como desconectada pelo operador.",
          abertaPorId: req.usuarioId,
          desconectadaEm: camera.desconectadaDesde || new Date(),
        },
        include: includeOrdemServico,
      });
    });

    await registrarLog({
      req,
      acao: `Abertura de OS para camera ${camera.numeroCamera}`,
      tipoRegistro: "OrdemServicoCamera",
      registroId: ordem.id,
      dadosNovos: ordem,
    });

    return res.status(201).json({ ordem, existente: false });
  } catch (error) {
    console.error(error);
    const mensagem =
      error instanceof Error ? error.message : "Erro desconhecido";
    return res
      .status(500)
      .json({ error: `Erro ao abrir ordem de servico: ${mensagem}` });
  }
}

export async function tratarOrdemServico(req: AuthRequest, res: Response) {
  try {
    if (!podeTratar(req.usuarioPerfil)) {
      return res
        .status(403)
        .json({
          error: "Somente manutencao ou administradores podem tratar a OS.",
        });
    }

    const ordem = await prisma.ordemServicoCamera.findFirst({
      where: {
        id: Number(req.params.id),
        unidade: { in: unidadesDoUsuario(req) },
      },
      include: { camera: true },
    });
    if (!ordem) {
      return res
        .status(404)
        .json({ error: "Ordem de servico nao encontrada." });
    }

    const statusSolicitado = String(req.body.status || STATUS_ATENDIMENTO);
    const concluir = statusSolicitado === STATUS_CONCLUIDO;
    const statusCamera = String(
      req.body.statusCamera || STATUS_CAMERA_ATENDIMENTO,
    );
    const agora = new Date();

    const atualizada = await prisma.ordemServicoCamera.update({
      where: { id: ordem.id },
      data: {
        status: concluir ? STATUS_CONCLUIDO : STATUS_ATENDIMENTO,
        atendidoPorId: req.usuarioId,
        atendimentoIniciadoEm: ordem.atendimentoIniciadoEm || agora,
        concluidoEm: concluir ? agora : null,
        tratativa: req.body.tratativa,
        houveDano: booleano(req.body.houveDano),
        descricaoDano: req.body.descricaoDano,
        requerTrocaCamera: booleano(req.body.requerTrocaCamera),
        requerCompra: booleano(req.body.requerCompra),
        itensNecessarios: req.body.itensNecessarios,
        observacoesTecnicas: req.body.observacoesTecnicas,
      },
      include: includeOrdemServico,
    });

    if (
      statusCamera === STATUS_CAMERA_CONECTADA &&
      statusCamera !== ordem.camera.status
    ) {
      await registrarMudancaStatus({
        cameraId: ordem.cameraId,
        unidade: ordem.unidade,
        statusAnterior: ordem.camera.status,
        statusNovo: STATUS_CAMERA_CONECTADA,
        responsavelId: req.usuarioId,
        observacao: req.body.observacoesTecnicas || req.body.tratativa,
      });
    } else if (statusCamera && statusCamera !== ordem.camera.status) {
      await prisma.cameraMonitoramento.update({
        where: { id: ordem.cameraId },
        data: {
          status: statusCamera,
          desconectadaDesde:
            statusCamera === STATUS_CAMERA_CONECTADA
              ? null
              : ordem.camera.desconectadaDesde,
          observacoesTecnicas:
            req.body.observacoesTecnicas ?? ordem.camera.observacoesTecnicas,
        },
      });
    }

    await registrarLog({
      req,
      acao: `Tratativa de OS ${ordem.id}`,
      tipoRegistro: "OrdemServicoCamera",
      registroId: ordem.id,
      dadosAnteriores: ordem,
      dadosNovos: atualizada,
    });

    return res.json(atualizada);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro ao tratar ordem de servico" });
  }
}

export async function gerarPdfOrdemServico(req: AuthRequest, res: Response) {
  try {
    const ordem = await prisma.ordemServicoCamera.findFirst({
      where: {
        id: Number(req.params.id),
        unidade: { in: unidadesDoUsuario(req) },
      },
      include: includeOrdemServico,
    });

    if (!ordem) {
      return res
        .status(404)
        .json({ error: "Ordem de servico nao encontrada." });
    }

    const urlValidacao = `${req.protocol}://${req.get("host")}/api/ordens-servico/${ordem.id}/pdf`;
    const qrCode = await criarQrCodeValidacao(urlValidacao);
    const doc = new PDFDocument({
      size: "A4",
      margin: 42,
      bufferPages: true,
      margins: { top: 130, left: 42, right: 42, bottom: 128 },
    });
    const nomeArquivo = `ordem-servico-cftv-${ordem.codigo.replace("/", "-")}.pdf`;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename=${nomeArquivo}`);
    doc.pipe(res);

    desenharCabecalhoPadrao(doc, {
      titulo: "Ordem de Serviço CFTV",
      subtitulo: `${ordem.camera.numeroCamera} | ${ordem.camera.areaMonitorada}`,
      codigo: ordem.codigo,
      unidade: ordem.unidade,
      emitidoEm: new Date(),
    });

    secao(doc, "Dados do chamado");
    campo(doc, "Status", labelStatusPdf(ordem.status), 42, 160);
    campo(doc, "Aberto por", ordem.abertaPor?.nome, 214, 165);
    campo(doc, "Abertura", data(ordem.createdAt), 391, 162);
    doc.y += 48;
    campo(doc, "Desconexão", data(ordem.desconectadaEm), 42, 245);
    campo(
      doc,
      "Início atendimento",
      data(ordem.atendimentoIniciadoEm),
      308,
      245,
    );
    doc.y += 52;

    secao(doc, "Dados da cÃ¢mera");
    campo(doc, "Nomenclatura", `CÃ¢mera ${ordem.camera.numeroCamera}`, 42, 160);
    campo(doc, "Nome", ordem.camera.nomeCamera, 214, 165);
    campo(doc, "Tipo", ordem.camera.tipoCamera, 391, 162);
    doc.y += 48;
    campo(doc, "Área", ordem.camera.areaMonitorada, 42, 245);
    campo(doc, "Local instalado", ordem.camera.localInstalado, 308, 245);
    doc.y += 52;

    secao(doc, "Descrição inicial");
    paragrafo(doc, ordem.descricao);

    secao(doc, "Tratativa técnica");
    campo(doc, "Atendido por", ordem.atendidoPor?.nome, 42, 245);
    campo(doc, "Conclusão", data(ordem.concluidoEm), 308, 245);
    doc.y += 52;
    campo(doc, "Houve dano", ordem.houveDano, 42, 160);
    campo(doc, "Troca de cÃ¢mera", ordem.requerTrocaCamera, 214, 165);
    campo(doc, "Necessita compra", ordem.requerCompra, 391, 162);
    doc.y += 52;
    doc
      .fillColor(pdfTheme.primary)
      .font("Helvetica-Bold")
      .fontSize(9)
      .text("Tratativa", 42, doc.y);
    doc.moveDown(0.25);
    paragrafo(doc, ordem.tratativa);
    doc
      .fillColor(pdfTheme.primary)
      .font("Helvetica-Bold")
      .fontSize(9)
      .text("Dano identificado", 42, doc.y);
    doc.moveDown(0.25);
    paragrafo(doc, ordem.descricaoDano);
    doc
      .fillColor(pdfTheme.primary)
      .font("Helvetica-Bold")
      .fontSize(9)
      .text("Itens necessários", 42, doc.y);
    doc.moveDown(0.25);
    paragrafo(doc, ordem.itensNecessarios);
    doc
      .fillColor(pdfTheme.primary)
      .font("Helvetica-Bold")
      .fontSize(9)
      .text("Observações técnicas", 42, doc.y);
    doc.moveDown(0.25);
    paragrafo(doc, ordem.observacoesTecnicas);

    const range = doc.bufferedPageRange();
    for (let i = range.start; i < range.start + range.count; i += 1) {
      doc.switchToPage(i);
      desenharRodapeAssinaturaPadrao(doc, {
        assinatura: null,
        qrCode,
        pagina: i + 1,
        totalPaginas: range.count,
      });
    }

    await registrarLog({
      req,
      acao: `Emissao de PDF da OS ${ordem.codigo}`,
      tipoRegistro: "OrdemServicoCamera",
      registroId: ordem.id,
      dadosNovos: ordem,
    });

    doc.end();
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ error: "Erro ao gerar PDF da ordem de servico" });
  }
}

function labelStatusPdf(status: string) {
  const mapa: Record<string, string> = {
    EM_ABERTO: "Em aberto",
    EM_ATENDIMENTO: "Em atendimento",
    CONCLUIDA: "Concluída",
  };
  return mapa[status] || status;
}
