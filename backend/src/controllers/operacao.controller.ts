import { Response } from "express";
import crypto from "crypto";
import path from "path";
import PDFDocument from "pdfkit";
import QRCode from "qrcode";
import { Request } from "express";
import { prisma } from "../lib/prisma";
import { AuthRequest, PERFIS } from "../middlewares/auth";
import { jwtSecret } from "../config/security";
import { registrarLog } from "../services/auditoria.service";
import {
  assinarDocumento,
  assinaturaValidaDocumento,
  criarUrlValidacaoAssinatura,
  exigirSenhaAssinatura,
} from "../services/assinaturaDocumento.service";
import { emitirRealtime } from "../services/realtime.service";
import { equipeFixaValida, escalaEquipe } from "../config/equipes";

function inicioDia(data = new Date()) {
  const inicio = new Date(data);
  inicio.setHours(0, 0, 0, 0);
  return inicio;
}

function inicioMes(data = new Date()) {
  return new Date(data.getFullYear(), data.getMonth(), 1);
}

function horaRegistro(data: Date) {
  return `${String(data.getHours()).padStart(2, "0")}:00`;
}

function agrupar<T>(itens: T[], chave: (item: T) => string | null | undefined) {
  return Object.entries(
    itens.reduce<Record<string, number>>((acc, item) => {
      const nome = chave(item) || "Não informado";
      acc[nome] = (acc[nome] || 0) + 1;
      return acc;
    }, {}),
  )
    .map(([nome, total]) => ({ nome, total }))
    .sort((a, b) => b.total - a.total);
}

async function proximoCodigoChecklist(unidade: string) {
  const ano = new Date().getFullYear();
  const ultimo = await prisma.checklistInspecao.findFirst({
    where: { ano, unidade },
    orderBy: { numero: "desc" },
  });
  const numero = (ultimo?.numero || 0) + 1;
  return {
    ano,
    numero,
    codigo: `CHK${String(numero).padStart(3, "0")}/${ano}`,
  };
}

async function proximoCodigoPassagem(unidade: string) {
  const ano = new Date().getFullYear();
  const ultimo = await prisma.passagemTurno.findFirst({
    where: { ano, unidade },
    orderBy: { numero: "desc" },
  });
  const numero = (ultimo?.numero || 0) + 1;
  return { ano, numero, codigo: `PT${String(numero).padStart(3, "0")}/${ano}` };
}

function podeGerenciarPassagem(perfil?: string) {
  return (
    perfil === PERFIS.SUPER_ADMIN ||
    perfil === PERFIS.ADMINISTRADOR ||
    perfil === PERFIS.ANALISTA
  );
}

function desenharAssinaturaDigitalCcos(
  doc: PDFKit.PDFDocument,
  params: {
    responsavel: string;
    unidade: string;
    equipe: string;
    token: string;
    qrCode: string;
  },
) {
  const x = 36;
  const y = 725;
  const width = 523;
  const height = 54;
  const qrSize = 46;
  const qrX = x + width - qrSize - 10;
  const qrY = y + 4;
  const textoX = x + 18;
  const textoWidth = width - qrSize - 42;

  doc
    .roundedRect(x, y, width, height, 7)
    .fillColor("#f8fbff")
    .fill()
    .roundedRect(x, y, width, height, 7)
    .lineWidth(0.7)
    .strokeColor("#dbeafe")
    .stroke();

  doc.roundedRect(x, y, 6, height, 7).fillColor("#0b74ff").fill();

  doc
    .font("Helvetica-Bold")
    .fontSize(8.4)
    .fillColor("#0f172a")
    .text("Assinatura digital JetGuard", textoX, y + 8, { width: textoWidth });

  doc
    .font("Helvetica")
    .fontSize(7.2)
    .fillColor("#334155")
    .text(`Relatório CCOS validado por ${params.responsavel}`, textoX, y + 22, {
      width: textoWidth,
    })
    .text(
      `Unidade: ${params.unidade} | Equipe: ${params.equipe}`,
      textoX,
      y + 34,
      { width: textoWidth },
    );

  doc
    .font("Helvetica-Bold")
    .fontSize(6.8)
    .fillColor("#0b74ff")
    .text(`Código: ${params.token}`, textoX, y + 45, { width: textoWidth });

  doc.image(params.qrCode, qrX, qrY, { width: qrSize });
  doc
    .font("Helvetica")
    .fontSize(6.2)
    .fillColor("#64748b")
    .text("Validar", qrX - 5, y + height - 9, {
      width: qrSize + 10,
      align: "center",
    });
}

export function criarTokenAcessoCcos(params: {
  id: number;
  codigo: string;
  unidade: string;
}) {
  return crypto
    .createHmac("sha256", jwtSecret())
    .update(`ccos:${params.id}:${params.codigo}:${params.unidade}`)
    .digest("hex")
    .slice(0, 32);
}

export function validarTokenAcessoCcos(params: {
  id: number;
  codigo: string;
  unidade: string;
  token?: string | null;
}) {
  if (!params.token) return false;
  const esperado = criarTokenAcessoCcos(params);
  const recebido = String(params.token);
  if (recebido.length !== esperado.length) return false;
  return crypto.timingSafeEqual(Buffer.from(recebido), Buffer.from(esperado));
}

export function criarUrlPublicaCcos(
  req: Pick<Request, "protocol" | "get">,
  params: {
    id: number;
    codigo: string;
    unidade: string;
  },
) {
  const token = criarTokenAcessoCcos(params);
  return `${req.protocol}://${req.get("host")}/api/public/ccos/passagens-turno/${params.id}/pdf?token=${token}`;
}

async function usuarioSolicitante(id?: number) {
  if (!id) return null;
  return prisma.usuario.findUnique({
    where: { id },
    select: {
      id: true,
      nome: true,
      apelido: true,
      equipe: true,
      unidade: true,
      perfilAcesso: true,
    },
  });
}

function normalizarPostos(postos: any[]) {
  return postos
    .filter((item) => item?.posto && item?.colaborador && item?.escala)
    .map((item) => ({
      posto: String(item.posto),
      colaborador: String(item.colaborador),
      re: item.re ? String(item.re) : undefined,
      escala: String(item.escala),
    }));
}

function idsColaboradores(valor: unknown) {
  if (Array.isArray(valor)) return valor.map(Number).filter(Boolean);
  if (!valor) return [];
  try {
    const parsed = JSON.parse(String(valor));
    return Array.isArray(parsed) ? parsed.map(Number).filter(Boolean) : [];
  } catch {
    return [];
  }
}

function normalizarChecklistEquipamentos(valor: unknown) {
  if (Array.isArray(valor)) return JSON.stringify(valor);
  if (!valor) return null;
  try {
    const parsed = JSON.parse(String(valor));
    return Array.isArray(parsed) ? JSON.stringify(parsed) : null;
  } catch {
    return null;
  }
}

function normalizarRondas(valor: unknown) {
  if (Array.isArray(valor)) return JSON.stringify(valor);
  if (!valor) return null;
  try {
    const parsed = JSON.parse(String(valor));
    return Array.isArray(parsed) ? JSON.stringify(parsed) : null;
  } catch {
    return null;
  }
}

function checklistEquipamentos(
  valor: unknown,
): Array<{
  categoria: string;
  nome: string;
  funcionando: string;
  observacao?: string;
  chamado?: string;
}> {
  if (!valor) return [];
  try {
    const parsed = Array.isArray(valor) ? valor : JSON.parse(String(valor));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function rondasPassagem(
  valor: unknown,
): Array<{
  ponto: string;
  horaInicio?: string;
  horaTermino?: string;
  nome?: string;
  alteracao?: string;
  observacoes?: string;
}> {
  if (!valor) return [];
  try {
    const parsed = Array.isArray(valor) ? valor : JSON.parse(String(valor));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function serializarPassagem(passagem: any) {
  return {
    ...passagem,
    colaboradoresIds: idsColaboradores(passagem.colaboradoresIds),
    checklistEquipamentos: checklistEquipamentos(
      passagem.checklistEquipamentos,
    ),
    rondas: rondasPassagem(passagem.rondas),
  };
}

async function indicadoresPassagem(unidade: string) {
  const [cameras, containers] = await Promise.all([
    prisma.cameraMonitoramento.findMany({
      where: { unidade, statusCadastro: "Ativa" },
      select: { status: true },
    }),
    prisma.quadraSegurancaContainer.count({
      where: {
        unidade,
        statusOperacional: { in: ["No terminal", "Dentro do terminal"] },
      },
    }),
  ]);
  return {
    cftvConectadas: cameras.filter((item) => item.status === "Conectada")
      .length,
    cftvDesconectadas: cameras.filter((item) => item.status === "Desconectada")
      .length,
    containersArmazenados: containers,
  };
}

export async function painelOperacionalSoc(req: AuthRequest, res: Response) {
  try {
    const unidade = req.unidadeAtiva || "GJA-T1";
    const equipeFiltro = String(req.query.equipe || "");
    const hoje = inicioDia();
    const mes = inicioMes();

    const [
      ocorrencias,
      eventos,
      investigacoes,
      cameras,
      containers,
      tarefas,
      checklists,
      cameraEventos,
      passagensTurno,
    ] = await Promise.all([
      prisma.ocorrencia.findMany({
        where: { unidade },
        orderBy: { dataOcorrencia: "desc" },
        take: 200,
      }),
      prisma.evento.findMany({
        where: { unidade },
        orderBy: { dataEvento: "desc" },
        take: 200,
      }),
      prisma.investigacao.findMany({
        where: { unidade },
        orderBy: { createdAt: "desc" },
        take: 100,
      }),
      prisma.cameraMonitoramento.findMany({
        where: { unidade, statusCadastro: "Ativa" },
        orderBy: { updatedAt: "desc" },
      }),
      prisma.quadraSegurancaContainer.findMany({
        where: { unidade },
        orderBy: { dataHoraEntrada: "desc" },
        take: 200,
      }),
      prisma.planejamentoCard.findMany({
        where: { unidade, status: "Ativo" },
        include: {
          coluna: true,
          responsavel: { select: { nome: true, apelido: true } },
        },
        orderBy: { updatedAt: "desc" },
        take: 50,
      }),
      prisma.checklistInspecao.findMany({
        where: {
          unidade,
          ...(equipeFiltro ? { responsavel: { equipe: equipeFiltro } } : {}),
        },
        include: {
          responsavel: { select: { nome: true, apelido: true, equipe: true } },
          itens: true,
        },
        orderBy: { dataHora: "desc" },
        take: 30,
      }),
      prisma.cameraEventoStatus.findMany({
        where: { unidade },
        include: { camera: true },
        orderBy: { iniciadoEm: "desc" },
        take: 100,
      }),
      prisma.passagemTurno.findMany({
        where: { unidade, ...(equipeFiltro ? { equipe: equipeFiltro } : {}) },
        include: {
          responsavel: { select: { nome: true, apelido: true, equipe: true } },
          postos: true,
        },
        orderBy: { updatedAt: "desc" },
        take: 12,
      }),
    ]);

    const registros = [
      ...ocorrencias.map((item) => ({
        modulo: "Ocorrência",
        codigo: item.codigo,
        titulo: item.assunto,
        local: item.local,
        natureza: item.natureza,
        unidade: item.unidade,
        data: item.dataOcorrencia,
        status: item.status,
      })),
      ...eventos.map((item) => ({
        modulo: "Evento",
        codigo: item.codigo,
        titulo: item.assunto,
        local: item.local,
        natureza: item.natureza,
        unidade: item.unidade,
        data: item.dataEvento,
        status: item.status,
      })),
    ];

    const containersNoTerminal = containers.filter(
      (item) =>
        !item.dataHoraSaida &&
        ["No terminal", "Dentro do terminal"].includes(item.statusOperacional),
    );

    return res.json({
      unidade,
      filtroEquipe: equipeFiltro || null,
      equipes: [
        "Equipe A",
        "Equipe B",
        "Equipe C",
        "Equipe D",
        "Administrativo",
      ],
      atualizadoEm: new Date().toISOString(),
      soc: {
        ocorrenciasAbertas: ocorrencias.filter(
          (item) => item.status !== "Concluído",
        ).length,
        eventosAbertos: eventos.filter((item) => item.status !== "Concluído")
          .length,
        investigacoesAbertas: investigacoes.filter(
          (item) => item.status !== "Concluído",
        ).length,
        camerasOffline: cameras.filter((item) => item.status === "Desconectada")
          .length,
        containersCriticos: containersNoTerminal.length,
        tarefasAbertas: tarefas.length,
        checklistsHoje: checklists.filter((item) => item.dataHora >= hoje)
          .length,
      },
      checklistTurno:
        checklists.find((item) => item.tipo === "Checklist de Turno") || null,
      passagensServico: checklists
        .filter((item) => item.tipo === "Passagem de Serviço")
        .slice(0, 6),
      passagensTurno: passagensTurno.map(serializarPassagem),
      livroEletronico: [
        ...registros.slice(0, 20).map((item) => ({
          tipo: item.modulo,
          titulo: `${item.codigo} - ${item.titulo}`,
          detalhe: `${item.local} | ${item.natureza} | ${item.status}`,
          data: item.data,
        })),
        ...cameraEventos.slice(0, 20).map((item) => ({
          tipo: "CFTV",
          titulo: `Câmera ${item.camera?.numeroCamera || "-"} - ${item.statusNovo}`,
          detalhe: `${item.camera?.areaMonitorada || "Área não informada"} | ${item.observacao || "Sem observação"}`,
          data: item.iniciadoEm,
        })),
      ]
        .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime())
        .slice(0, 30),
      reincidencia: {
        porLocal: agrupar(registros, (item) => item.local).slice(0, 8),
        porNatureza: agrupar(registros, (item) => item.natureza).slice(0, 8),
        porHorario: agrupar(registros, (item) => horaRegistro(item.data)).slice(
          0,
          8,
        ),
        porUnidade: agrupar(registros, (item) => item.unidade).slice(0, 8),
      },
      indicadoresMensais: {
        ocorrencias: ocorrencias.filter((item) => item.dataOcorrencia >= mes)
          .length,
        eventos: eventos.filter((item) => item.dataEvento >= mes).length,
        investigacoes: investigacoes.filter((item) => item.createdAt >= mes)
          .length,
        camerasOffline: cameras.filter((item) => item.status === "Desconectada")
          .length,
        containersNoTerminal: containersNoTerminal.length,
      },
      relatoriosExecutivosAutomaticos: [
        "Resumo diário operacional por unidade",
        "Relatório semanal de reincidência por local e natureza",
        "Relatório mensal executivo com indicadores por unidade",
      ],
      tarefas: tarefas.map((item) => ({
        id: item.id,
        titulo: item.titulo,
        status: item.coluna?.titulo || item.status,
        prioridade: item.prioridade,
        prazo: item.prazo,
        responsavel:
          item.responsavel?.apelido ||
          item.responsavel?.nome ||
          "Sem responsável",
      })),
    });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ error: "Erro ao carregar painel SOC operacional" });
  }
}

export async function listarUsuariosMesmaEquipe(
  req: AuthRequest,
  res: Response,
) {
  try {
    const usuario = await usuarioSolicitante(req.usuarioId);
    const equipe = String(req.query.equipe || usuario?.equipe || "");
    const unidade = req.unidadeAtiva || usuario?.unidade || "GJA-T1";
    const usuarios = await prisma.usuario.findMany({
      where: { unidade, ...(equipe ? { equipe } : {}), statusUsuario: "ATIVO" },
      select: {
        id: true,
        nome: true,
        apelido: true,
        email: true,
        equipe: true,
      },
      orderBy: { nome: "asc" },
    });
    return res.json(usuarios);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro ao listar usuários da equipe" });
  }
}

export async function listarPassagensTurno(req: AuthRequest, res: Response) {
  try {
    const usuario = await usuarioSolicitante(req.usuarioId);
    const unidade = req.unidadeAtiva || "GJA-T1";
    const where = podeGerenciarPassagem(req.usuarioPerfil)
      ? { unidade }
      : { unidade, equipe: usuario?.equipe || "" };
    const passagens = await prisma.passagemTurno.findMany({
      where,
      include: {
        responsavel: {
          select: { id: true, nome: true, apelido: true, equipe: true },
        },
        postos: true,
      },
      orderBy: { updatedAt: "desc" },
    });
    return res.json(passagens.map(serializarPassagem));
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro ao listar passagens de turno" });
  }
}

export async function ultimoChecklistEquipamentosPassagem(
  req: AuthRequest,
  res: Response,
) {
  try {
    const usuario = await usuarioSolicitante(req.usuarioId);
    const unidade = req.unidadeAtiva || usuario?.unidade || "GJA-T1";
    const equipe = String(req.query.equipe || usuario?.equipe || "").trim();
    if (!equipe)
      return res
        .status(400)
        .json({
          error: "Equipe não informada para buscar o checklist anterior.",
        });

    const passagem = await prisma.passagemTurno.findFirst({
      where: {
        unidade,
        equipe,
        checklistEquipamentos: { not: null },
        ...(req.query.ignorarId
          ? { id: { not: Number(req.query.ignorarId) } }
          : {}),
      },
      orderBy: [{ horaEncerramento: "desc" }, { updatedAt: "desc" }],
      select: {
        id: true,
        codigo: true,
        dataPassagem: true,
        equipe: true,
        status: true,
        checklistEquipamentos: true,
      },
    });

    if (!passagem)
      return res
        .status(404)
        .json({
          error: "Nenhum checklist anterior encontrado para esta equipe.",
        });

    return res.json({
      ...passagem,
      checklistEquipamentos: checklistEquipamentos(
        passagem.checklistEquipamentos,
      ),
    });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ error: "Erro ao buscar último checklist de equipamentos" });
  }
}

export async function criarPassagemTurno(req: AuthRequest, res: Response) {
  try {
    const usuario = await usuarioSolicitante(req.usuarioId);
    if (!usuario || !req.usuarioId)
      return res.status(401).json({ error: "Usuário não autenticado" });
    const unidade = req.unidadeAtiva || usuario.unidade || "GJA-T1";
    const equipe = String(req.body.equipe || usuario.equipe || "").trim();
    if (!equipe)
      return res
        .status(400)
        .json({
          error: "Usuário sem equipe definida para abertura da passagem.",
        });
    const equipeCoberta =
      equipe === "Equipe D" ? String(req.body.equipeCoberta || "").trim() : "";
    if (equipe === "Equipe D" && !equipeFixaValida(equipeCoberta)) {
      return res
        .status(400)
        .json({ error: "Informe qual equipe/turno a Equipe D está cobrindo." });
    }
    const aberta = await prisma.passagemTurno.findFirst({
      where: { unidade, equipe, status: "Aberto" },
      include: { responsavel: true, postos: true },
    });
    if (aberta) return res.status(200).json(serializarPassagem(aberta));
    const codigo = await proximoCodigoPassagem(unidade);
    const passagem = await prisma.passagemTurno.create({
      data: {
        ...codigo,
        unidade,
        equipe,
        equipeCoberta: equipe === "Equipe D" ? equipeCoberta : null,
        responsavelId: req.usuarioId,
        dataPassagem: req.body.dataPassagem
          ? new Date(req.body.dataPassagem)
          : new Date(),
        colaboradoresIds: JSON.stringify(
          idsColaboradores(req.body.colaboradoresIds),
        ),
        statusPostoGocil: req.body.statusPostoGocil || "Completo",
        observacaoPostoGocil: req.body.observacaoPostoGocil || null,
        statusPostoScanner: req.body.statusPostoScanner || "Completo",
        observacaoPostoScanner: req.body.observacaoPostoScanner || null,
        informacoesComplementares: req.body.informacoesComplementares || "",
        checklistEquipamentos: normalizarChecklistEquipamentos(
          req.body.checklistEquipamentos,
        ),
        rondas: normalizarRondas(req.body.rondas),
        postos: { create: normalizarPostos(req.body.postos || []) },
      },
      include: { responsavel: true, postos: true },
    });
    await registrarLog({
      req,
      acao: `Abertura da passagem de turno ${passagem.codigo}`,
      tipoRegistro: "PassagemTurno",
      registroId: passagem.id,
      dadosNovos: passagem,
    });
    emitirRealtime({
      tipo: "ccos.aberto",
      titulo: `Relatório CCOS ${passagem.codigo} aberto`,
      mensagem: `${usuario.apelido || usuario.nome} abriu o relatório da ${passagem.equipe} - ${escalaEquipe(passagem.equipe, passagem.equipeCoberta)}`,
      severidade: "media",
      unidade: passagem.unidade,
      link: "/operacoes-soc",
      payload: { id: passagem.id, codigo: passagem.codigo },
    });
    return res.status(201).json(serializarPassagem(passagem));
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro ao abrir passagem de turno" });
  }
}

export async function atualizarPassagemTurno(req: AuthRequest, res: Response) {
  try {
    const usuario = await usuarioSolicitante(req.usuarioId);
    const anterior = await prisma.passagemTurno.findFirst({
      where: { id: Number(req.params.id), unidade: req.unidadeAtiva },
      include: { postos: true },
    });
    if (!anterior)
      return res.status(404).json({ error: "Passagem não encontrada" });
    if (
      anterior.status !== "Aberto" &&
      !podeGerenciarPassagem(req.usuarioPerfil)
    )
      return res
        .status(403)
        .json({
          error: "Relatório finalizado não pode ser editado por este perfil.",
        });
    if (
      !podeGerenciarPassagem(req.usuarioPerfil) &&
      anterior.equipe !== usuario?.equipe
    )
      return res
        .status(403)
        .json({
          error: "Apenas integrantes da equipe podem editar esta passagem.",
        });
    const equipeCoberta =
      anterior.equipe === "Equipe D"
        ? String(req.body.equipeCoberta || anterior.equipeCoberta || "").trim()
        : "";
    if (anterior.equipe === "Equipe D" && !equipeFixaValida(equipeCoberta)) {
      return res
        .status(400)
        .json({ error: "Informe qual equipe/turno a Equipe D está cobrindo." });
    }
    const passagem = await prisma.$transaction(async (tx) => {
      await tx.passagemTurnoPosto.deleteMany({
        where: { passagemId: anterior.id },
      });
      return tx.passagemTurno.update({
        where: { id: anterior.id },
        data: {
          dataPassagem: req.body.dataPassagem
            ? new Date(req.body.dataPassagem)
            : anterior.dataPassagem,
          equipeCoberta: anterior.equipe === "Equipe D" ? equipeCoberta : null,
          colaboradoresIds: JSON.stringify(
            idsColaboradores(req.body.colaboradoresIds),
          ),
          statusPostoGocil: req.body.statusPostoGocil || "Completo",
          observacaoPostoGocil: req.body.observacaoPostoGocil || null,
          statusPostoScanner: req.body.statusPostoScanner || "Completo",
          observacaoPostoScanner: req.body.observacaoPostoScanner || null,
          informacoesComplementares: req.body.informacoesComplementares || "",
          checklistEquipamentos: normalizarChecklistEquipamentos(
            req.body.checklistEquipamentos,
          ),
          rondas: normalizarRondas(req.body.rondas),
          postos: { create: normalizarPostos(req.body.postos || []) },
        },
        include: {
          responsavel: {
            select: { id: true, nome: true, apelido: true, equipe: true },
          },
          postos: true,
        },
      });
    });
    await registrarLog({
      req,
      acao: `Atualização da passagem de turno ${passagem.codigo}`,
      tipoRegistro: "PassagemTurno",
      registroId: passagem.id,
      dadosAnteriores: anterior,
      dadosNovos: passagem,
    });
    return res.json(serializarPassagem(passagem));
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ error: "Erro ao atualizar passagem de turno" });
  }
}

export async function finalizarPassagemTurno(req: AuthRequest, res: Response) {
  try {
    const anterior = await prisma.passagemTurno.findFirst({
      where: { id: Number(req.params.id), unidade: req.unidadeAtiva },
      include: { postos: true },
    });
    if (!anterior)
      return res.status(404).json({ error: "Passagem não encontrada" });
    const usuario = await usuarioSolicitante(req.usuarioId);
    if (
      !podeGerenciarPassagem(req.usuarioPerfil) &&
      anterior.equipe !== usuario?.equipe
    )
      return res
        .status(403)
        .json({
          error: "Apenas integrantes da equipe podem finalizar esta passagem.",
        });
    await exigirSenhaAssinatura(req);
    const passagem = await prisma.passagemTurno.update({
      where: { id: anterior.id },
      data: {
        status: "Enviado",
        horaEncerramento: new Date(),
        ...(await indicadoresPassagem(anterior.unidade)),
      },
      include: {
        responsavel: {
          select: { id: true, nome: true, apelido: true, equipe: true },
        },
        postos: true,
      },
    });
    await assinarDocumento({
      req,
      modulo: "PassagemTurno",
      registroId: passagem.id,
      codigoRegistro: passagem.codigo,
      unidade: passagem.unidade,
      acao: "Envio e consolidação do Relatório CCOS",
      dados: passagem,
    });
    await registrarLog({
      req,
      acao: `Finalização da passagem de turno ${passagem.codigo}`,
      tipoRegistro: "PassagemTurno",
      registroId: passagem.id,
      dadosAnteriores: anterior,
      dadosNovos: passagem,
    });
    emitirRealtime({
      tipo: "ccos.enviado",
      titulo: `Relatório CCOS ${passagem.codigo} enviado`,
      mensagem: `${usuario?.apelido || usuario?.nome || "Usuário"} consolidou o relatório da ${passagem.equipe}`,
      severidade: "alta",
      unidade: passagem.unidade,
      link: "/operacoes-soc",
      payload: { id: passagem.id, codigo: passagem.codigo },
    });
    return res.json(serializarPassagem(passagem));
  } catch (error) {
    console.error(error);
    const status = (error as Error & { status?: number }).status;
    if (status)
      return res.status(status).json({ error: (error as Error).message });
    return res
      .status(500)
      .json({ error: "Erro ao finalizar passagem de turno" });
  }
}

export async function excluirPassagemTurno(req: AuthRequest, res: Response) {
  try {
    const passagem = await prisma.passagemTurno.findFirst({
      where: { id: Number(req.params.id), unidade: req.unidadeAtiva },
      include: {
        postos: true,
        responsavel: { select: { nome: true, apelido: true, equipe: true } },
      },
    });
    if (!passagem)
      return res.status(404).json({ error: "Relatório CCOS não encontrado" });

    await prisma.passagemTurno.delete({ where: { id: passagem.id } });
    await registrarLog({
      req,
      acao: `Exclusão do Relatório CCOS ${passagem.codigo}`,
      tipoRegistro: "PassagemTurno",
      registroId: passagem.id,
      dadosAnteriores: passagem,
    });

    return res.status(204).send();
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro ao excluir Relatório CCOS" });
  }
}

export async function adicionarInformacaoPassagem(
  req: AuthRequest,
  res: Response,
) {
  try {
    const usuario = await usuarioSolicitante(req.usuarioId);
    const passagem = await prisma.passagemTurno.findFirst({
      where: {
        unidade: req.unidadeAtiva || usuario?.unidade || "GJA-T1",
        equipe: usuario?.equipe || "",
        status: "Aberto",
      },
      orderBy: { createdAt: "desc" },
    });
    if (!passagem)
      return res
        .status(404)
        .json({ error: "Nenhuma passagem de turno aberta para sua equipe." });
    const texto = String(req.body.informacao || "").trim();
    const atualizada = await prisma.passagemTurno.update({
      where: { id: passagem.id },
      data: {
        informacoesComplementares: [passagem.informacoesComplementares, texto]
          .filter(Boolean)
          .join("\n\n"),
      },
      include: { responsavel: true, postos: true },
    });
    return res.json(serializarPassagem(atualizada));
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ error: "Erro ao vincular informação à passagem" });
  }
}

export async function gerarPdfPassagemTurno(req: AuthRequest, res: Response) {
  try {
    const passagem = await prisma.passagemTurno.findFirst({
      where: { id: Number(req.params.id), unidade: req.unidadeAtiva },
      include: {
        responsavel: { select: { nome: true, apelido: true, equipe: true } },
        postos: true,
      },
    });
    if (!passagem)
      return res.status(404).json({ error: "Passagem não encontrada" });

    const colaboradoresIds = idsColaboradores(passagem.colaboradoresIds);
    const colaboradores = colaboradoresIds.length
      ? await prisma.usuario.findMany({
          where: { id: { in: colaboradoresIds } },
          select: { nome: true, apelido: true },
        })
      : [];
    const indicadores =
      passagem.status === "Aberto"
        ? await indicadoresPassagem(passagem.unidade)
        : {
            cftvConectadas: passagem.cftvConectadas || 0,
            cftvDesconectadas: passagem.cftvDesconectadas || 0,
            containersArmazenados: passagem.containersArmazenados || 0,
          };
    const equipamentos = checklistEquipamentos(passagem.checklistEquipamentos);
    const rondas = rondasPassagem(passagem.rondas);

    const doc = new PDFDocument({
      size: "A4",
      bufferPages: true,
      margins: { top: 98, left: 36, right: 36, bottom: 58 },
    });
    const dataArquivo = passagem.dataPassagem
      .toLocaleDateString("pt-BR")
      .replace(/\//g, ".");
    const codigoArquivo = passagem.codigo.replace("/", "-");
    const nomeArquivo = `${codigoArquivo} - Relatorio Operacional de passagem de Turno - ${dataArquivo} - ${passagem.equipe}.pdf`;
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="${nomeArquivo}"`);
    doc.pipe(res);

    const logoPath = path.resolve(process.cwd(), "assets", "movecta-logo.png");
    const watermarkPath = path.resolve(
      process.cwd(),
      "assets",
      "jetguard-watermark.png",
    );
    const responsavel =
      passagem.responsavel.apelido || passagem.responsavel.nome;
    const colaboradoresTexto =
      colaboradores.map((item) => item.apelido || item.nome).join(", ") ||
      "Não informado";
    const tokenAssinatura = crypto
      .createHash("sha256")
      .update(
        `CCOS:${passagem.codigo}:${responsavel}:${passagem.horaEncerramento?.toISOString() || passagem.updatedAt.toISOString()}`,
      )
      .digest("hex")
      .slice(0, 16)
      .toUpperCase();
    const assinatura = await assinaturaValidaDocumento(
      "PassagemTurno",
      passagem.id,
    );
    const pdfUrl = criarUrlPublicaCcos(req, {
      id: passagem.id,
      codigo: passagem.codigo,
      unidade: passagem.unidade,
    });
    const validacaoUrl = assinatura
      ? criarUrlValidacaoAssinatura(req, assinatura.token)
      : pdfUrl;
    const qrCodePdf = await QRCode.toDataURL(validacaoUrl, {
      margin: 1,
      width: 112,
    });
    const tokenRodape = assinatura?.token || tokenAssinatura;
    const pageBottom = 708;

    const watermark = (opacity = 0.052) => {
      const largura = 270;
      const x = (doc.page.width - largura) / 2;
      const y = (doc.page.height - largura) / 2;
      doc
        .save()
        .opacity(opacity)
        .image(watermarkPath, x, y, { width: largura })
        .restore();
    };

    const header = () => {
      doc.roundedRect(36, 28, 523, 72, 10).fill("#0f172a");
      doc.roundedRect(48, 42, 126, 38, 8).fill("#ffffff");
      doc.image(logoPath, 56, 50, { width: 110, height: 22, fit: [110, 22] });
      doc
        .font("Helvetica")
        .fontSize(8)
        .fillColor("#dbeafe")
        .text("RELATÓRIO CCOS", 184, 42, { width: 230 });
      doc
        .font("Helvetica-Bold")
        .fontSize(18)
        .fillColor("#ffffff")
        .text(passagem.codigo, 184, 56, { width: 230 });
      doc
        .font("Helvetica")
        .fontSize(8)
        .fillColor("#cbd5e1")
        .text(
          `${passagem.unidade} | ${passagem.equipe} | ${escalaEquipe(passagem.equipe, passagem.equipeCoberta)}`,
          184,
          79,
          { width: 250 },
        );
      doc
        .font("Helvetica")
        .fontSize(8.5)
        .fillColor("#bfdbfe")
        .text(`Emitido em ${new Date().toLocaleString("pt-BR")}`, 370, 52, {
          align: "right",
          width: 174,
        });
      doc
        .font("Helvetica-Bold")
        .fontSize(10)
        .fillColor("#ffffff")
        .text(passagem.status, 370, 74, { align: "right", width: 174 });
      doc
        .moveTo(36, 114)
        .lineTo(559, 114)
        .strokeColor("#dbe4ef")
        .lineWidth(0.8)
        .stroke();
    };

    const footer = (pagina: number, total: number) => {
      desenharAssinaturaDigitalCcos(doc, {
        responsavel,
        unidade: passagem.unidade,
        equipe: passagem.equipe,
        token: tokenRodape,
        qrCode: qrCodePdf,
      });
      doc
        .moveTo(36, 715)
        .lineTo(559, 715)
        .strokeColor("#dbe4ef")
        .lineWidth(0.8)
        .stroke();
      doc
        .font("Helvetica")
        .fontSize(7.8)
        .fillColor("#64748b")
        .text(`Página ${pagina} de ${total}`, 468, 745, {
          align: "right",
          width: 91,
        });
    };

    const decorarPagina = () => {
      watermark();
      header();
      doc.y = 128;
    };

    doc.on("pageAdded", decorarPagina);

    const ensure = (height: number) => {
      if (doc.y + height > pageBottom) doc.addPage();
    };

    const section = (title: string) => {
      ensure(34);
      doc.moveDown(0.6);
      doc
        .roundedRect(36, doc.y, 523, 24, 5)
        .fillAndStroke("#0b74ff", "#0b74ff");
      doc
        .font("Helvetica-Bold")
        .fontSize(10)
        .fillColor("#ffffff")
        .text(title.toUpperCase(), 46, doc.y + 7, {
          align: "left",
          width: 497,
        });
      doc.y += 28;
    };

    const summaryBox = (
      x: number,
      y: number,
      w: number,
      label: string,
      value: unknown,
    ) => {
      doc.roundedRect(x, y, w, 42, 6).fillAndStroke("#f8fafc", "#dbe4ef");
      doc
        .font("Helvetica-Bold")
        .fontSize(7.5)
        .fillColor("#0b74ff")
        .text(label.toUpperCase(), x + 10, y + 8, { width: w - 20 });
      doc
        .font("Helvetica")
        .fontSize(9.4)
        .fillColor("#111827")
        .text(String(value || "Não informado"), x + 10, y + 22, {
          width: w - 20,
          height: 16,
        });
    };

    const paragraph = (text: string) => {
      const clean = text?.trim() || "Sem informações registradas.";
      const height =
        doc.heightOfString(clean, { width: 507, align: "left" }) + 18;
      ensure(height);
      doc
        .roundedRect(36, doc.y, 523, height, 5)
        .fillAndStroke("#f8fafc", "#e2e8f0");
      doc
        .font("Helvetica")
        .fontSize(9.2)
        .fillColor("#111827")
        .text(clean, 46, doc.y + 10, { width: 503, align: "left" });
      doc.y += height + 4;
    };

    decorarPagina();

    section("Dados do turno");
    const yResumo = doc.y;
    summaryBox(
      36,
      yResumo,
      168,
      "Data",
      passagem.dataPassagem.toLocaleDateString("pt-BR"),
    );
    summaryBox(
      214,
      yResumo,
      168,
      "Hora de abertura",
      passagem.horaAbertura.toLocaleString("pt-BR"),
    );
    summaryBox(
      392,
      yResumo,
      167,
      "Hora de encerramento",
      passagem.horaEncerramento?.toLocaleString("pt-BR") || "Em aberto",
    );
    summaryBox(
      36,
      yResumo + 50,
      168,
      "Unidade / equipe",
      passagem.equipe === "Equipe D"
        ? `${passagem.unidade} | D cobre ${passagem.equipeCoberta || "turno não informado"}`
        : `${passagem.unidade} | ${passagem.equipe}`,
    );
    summaryBox(214, yResumo + 50, 168, "Responsável", responsavel);
    summaryBox(392, yResumo + 50, 167, "Colaboradores", colaboradoresTexto);
    doc.y = yResumo + 98;

    section("Postos operacionais");
    if (!passagem.postos.length) {
      paragraph("Nenhum posto operacional registrado.");
    } else {
      const gap = 12;
      const colW = (523 - gap) / 2;
      const desenharPosto = (
        posto: (typeof passagem.postos)[number],
        x: number,
        y: number,
      ) => {
        doc.roundedRect(x, y, colW, 50, 5).fillAndStroke("#f8fafc", "#dbe4ef");
        doc
          .font("Helvetica-Bold")
          .fontSize(9.2)
          .fillColor("#0f172a")
          .text(posto.posto, x + 9, y + 8, { width: colW - 18 });
        doc
          .font("Helvetica")
          .fontSize(8.2)
          .fillColor("#334155")
          .text(`Colaborador: ${posto.colaborador}`, x + 9, y + 22, {
            width: colW - 18,
          })
          .text(
            `R.E: ${posto.re || "-"} | Escala: ${posto.escala}`,
            x + 9,
            y + 34,
            { width: colW - 18 },
          );
      };

      for (let index = 0; index < passagem.postos.length; index += 2) {
        ensure(58);
        const y = doc.y;
        desenharPosto(passagem.postos[index], 36, y);
        if (passagem.postos[index + 1]) {
          desenharPosto(passagem.postos[index + 1], 36 + colW + gap, y);
        }
        doc.y = y + 58;
      }
    }

    section("Status dos postos");
    const yStatus = doc.y;
    summaryBox(36, yStatus, 255, "Posto Vigilante", passagem.statusPostoGocil);
    summaryBox(304, yStatus, 255, "Posto Scanner", passagem.statusPostoScanner);
    doc.y = yStatus + 50;
    if (passagem.statusPostoGocil === "Incompleto")
      paragraph(
        `Observações do Posto Vigilante:\n${passagem.observacaoPostoGocil || "Não informado"}`,
      );
    if (passagem.statusPostoScanner === "Incompleto")
      paragraph(
        `Observações do Posto Scanner:\n${passagem.observacaoPostoScanner || "Não informado"}`,
      );

    if (!rondas.length) {
      if (doc.y + 86 > pageBottom) doc.addPage();
      section("Rondas operacionais");
      paragraph("Nenhuma ronda registrada no plantão.");
    } else {
      const alturaRondas = 34 + 20 + rondas.length * 32 + 10;
      if (doc.y + Math.min(alturaRondas, 220) > pageBottom) {
        doc.addPage();
      }

      const desenharCabecalhoRondas = () => {
        section("Rondas operacionais");
        const yTableHeader = doc.y;
        doc
          .roundedRect(36, yTableHeader, 523, 21, 4)
          .fillAndStroke("#0f172a", "#0f172a");
        headers.forEach((headerItem, i) => {
          doc
            .font("Helvetica-Bold")
            .fontSize(7.2)
            .fillColor("#ffffff")
            .text(headerItem, xs[i] + 4, yTableHeader + 7, {
              width: widths[i] - 8,
            });
        });
        doc.y = yTableHeader + 21;
      };

      const widths = [92, 60, 60, 120, 72, 119];
      const xs = [36, 128, 188, 248, 368, 440];
      const headers = [
        "Ponto",
        "Início",
        "Término",
        "Responsável",
        "Alteração",
        "Observações",
      ];
      desenharCabecalhoRondas();
      rondas.forEach((ronda, index) => {
        if (doc.y + 32 > pageBottom) {
          doc.addPage();
          desenharCabecalhoRondas();
        }
        const y = doc.y;
        doc
          .rect(36, y, 523, 32)
          .fillAndStroke(index % 2 === 0 ? "#ffffff" : "#f8fafc", "#cbd5e1");
        xs.slice(1).forEach((xLine) =>
          doc
            .moveTo(xLine, y)
            .lineTo(xLine, y + 32)
            .strokeColor("#cbd5e1")
            .stroke(),
        );
        [
          ronda.ponto || "-",
          ronda.horaInicio || "-",
          ronda.horaTermino || "-",
          ronda.nome || "-",
          ronda.alteracao || "Não",
          ronda.observacoes || "-",
        ].forEach((valor, i) => {
          doc
            .font(i === 0 ? "Helvetica-Bold" : "Helvetica")
            .fontSize(7.2)
            .fillColor("#111827")
            .text(String(valor), xs[i] + 4, y + 7, {
              width: widths[i] - 8,
              height: 22,
            });
        });
        doc.y = y + 32;
      });
      doc.moveDown(0.6);
    }

    if (!equipamentos.length) {
      section("Checklist de equipamentos da portaria e segurança");
      paragraph("Nenhum equipamento avaliado no plantão.");
    } else {
      const categorias = Array.from(
        new Set(equipamentos.map((item) => item.categoria || "Equipamentos")),
      );
      const alturaChecklist = categorias.reduce((total, categoria) => {
        const itens = equipamentos.filter(
          (item) => (item.categoria || "Equipamentos") === categoria,
        );
        return total + 18 + 18 + itens.length * 18 + 10;
      }, 34);

      if (doc.y + Math.min(alturaChecklist, 360) > pageBottom) {
        doc.addPage();
      }

      section("Checklist de equipamentos da portaria e segurança");

      categorias.forEach((categoria) => {
        const itens = equipamentos.filter(
          (item) => (item.categoria || "Equipamentos") === categoria,
        );
        if (doc.y + 42 + itens.length * 18 > pageBottom) {
          doc.addPage();
          section("Checklist de equipamentos da portaria e segurança");
        }
        doc
          .font("Helvetica-Bold")
          .fontSize(9.5)
          .fillColor("#0f172a")
          .text(categoria, 36, doc.y, { width: 523 });
        doc.y += 14;
        const yTable = doc.y;
        const widths = [165, 74, 204, 80];
        const xs = [36, 201, 275, 479];
        doc
          .roundedRect(36, yTable, 523, 19, 4)
          .fillAndStroke("#0f172a", "#0f172a");
        ["Equipamento", "Status", "Observação", "Nº chamado"].forEach(
          (h, i) => {
            doc
              .font("Helvetica-Bold")
              .fontSize(7.5)
              .fillColor("#ffffff")
              .text(h, xs[i] + 4, yTable + 6, { width: widths[i] - 8 });
          },
        );
        doc.y = yTable + 19;
        itens.forEach((item, index) => {
          ensure(18);
          const y = doc.y;
          doc
            .rect(36, y, 523, 18)
            .fillAndStroke(index % 2 === 0 ? "#ffffff" : "#f8fafc", "#cbd5e1");
          xs.slice(1).forEach((xLine) =>
            doc
              .moveTo(xLine, y)
              .lineTo(xLine, y + 18)
              .strokeColor("#cbd5e1")
              .stroke(),
          );
          doc
            .font("Helvetica")
            .fontSize(7.5)
            .fillColor("#111827")
            .text(item.nome || "-", xs[0] + 4, y + 5, { width: widths[0] - 8 })
            .text(item.funcionando || "N/A", xs[1] + 4, y + 5, {
              width: widths[1] - 8,
            })
            .text(item.observacao || "-", xs[2] + 4, y + 5, {
              width: widths[2] - 8,
            })
            .text(item.chamado || "-", xs[3] + 4, y + 5, {
              width: widths[3] - 8,
            });
          doc.y = y + 18;
        });
        doc.moveDown(0.6);
      });
    }

    section("Informações complementares");
    paragraph(passagem.informacoesComplementares || "Sem observações.");

    section("Situação operacional automática");
    const yAuto = doc.y;
    summaryBox(36, yAuto, 168, "CFTV conectadas", indicadores.cftvConectadas);
    summaryBox(
      214,
      yAuto,
      168,
      "CFTV desconectadas",
      indicadores.cftvDesconectadas,
    );
    summaryBox(
      392,
      yAuto,
      167,
      "Contêineres na quadra",
      indicadores.containersArmazenados,
    );
    doc.y = yAuto + 52;

    const paginas = doc.bufferedPageRange();
    for (
      let pagina = paginas.start;
      pagina < paginas.start + paginas.count;
      pagina++
    ) {
      doc.switchToPage(pagina);
      watermark(0.028);
      footer(pagina - paginas.start + 1, paginas.count);
    }
    doc.end();
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ error: "Erro ao gerar PDF da passagem de turno" });
  }
}
export async function criarRegistroOperacional(
  req: AuthRequest,
  res: Response,
) {
  try {
    const unidade = req.unidadeAtiva || "GJA-T1";
    const tiposPermitidos = [
      "Informação do Plantão",
      "Checklist de Turno",
      "Passagem de Serviço",
    ];
    const tipo = tiposPermitidos.includes(String(req.body.tipo))
      ? String(req.body.tipo)
      : "Informação do Plantão";
    const titulo = String(req.body.titulo || tipo).trim();
    const local = String(req.body.local || "Centro de Operações").trim();
    const observacoes = String(req.body.observacoes || "").trim();
    const itens = Array.isArray(req.body.itens) ? req.body.itens : [];
    const codigo = await proximoCodigoChecklist(unidade);
    const checklist = await prisma.checklistInspecao.create({
      data: {
        ...codigo,
        titulo,
        unidade,
        local,
        tipo,
        setor: "Operação",
        responsavelId: req.usuarioId!,
        status: req.body.status || "Aberto",
        observacoes,
        itens: {
          create: itens.length
            ? itens.map((item: any) => ({
                categoria: String(item.categoria || tipo),
                descricao: String(item.descricao || "Item operacional"),
                conformidade: String(item.conformidade || "Conforme"),
                criticidade: String(item.criticidade || "Media"),
                observacao: item.observacao
                  ? String(item.observacao)
                  : undefined,
              }))
            : [
                {
                  categoria: tipo,
                  descricao: observacoes || titulo,
                  conformidade: "Conforme",
                  criticidade: "Media",
                },
              ],
        },
      },
      include: {
        itens: true,
        responsavel: { select: { nome: true, apelido: true, equipe: true } },
      },
    });
    if (
      req.body.adicionarPassagem === true ||
      req.body.adicionarPassagem === "true"
    ) {
      await adicionarInformacaoPassagem(
        {
          ...req,
          body: { informacao: `${tipo}: ${titulo}\n${observacoes}` },
        } as AuthRequest,
        {
          json: () => undefined,
          status: () => ({ json: () => undefined }),
        } as any,
      );
    }
    await registrarLog({
      req,
      acao: `Registro operacional - ${tipo}`,
      tipoRegistro: "Operacao",
      registroId: checklist.id,
      dadosNovos: checklist,
    });
    return res.status(201).json(checklist);
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ error: "Erro ao criar registro operacional" });
  }
}
