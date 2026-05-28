import { Response } from "express";
import path from "path";
import PDFDocument from "pdfkit";
import { prisma } from "../lib/prisma";
import { AuthRequest, PERFIS } from "../middlewares/auth";
import { registrarLog } from "../services/auditoria.service";

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
      const nome = chave(item) || "NÃ£o informado";
      acc[nome] = (acc[nome] || 0) + 1;
      return acc;
    }, {})
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
  return { ano, numero, codigo: `CHK${String(numero).padStart(3, "0")}/${ano}` };
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
  return perfil === PERFIS.SUPER_ADMIN || perfil === PERFIS.ADMINISTRADOR || perfil === PERFIS.ANALISTA;
}

async function usuarioSolicitante(id?: number) {
  if (!id) return null;
  return prisma.usuario.findUnique({
    where: { id },
    select: { id: true, nome: true, apelido: true, equipe: true, unidade: true, perfilAcesso: true },
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

function serializarPassagem(passagem: any) {
  return { ...passagem, colaboradoresIds: idsColaboradores(passagem.colaboradoresIds) };
}

async function indicadoresPassagem(unidade: string) {
  const [cameras, containers] = await Promise.all([
    prisma.cameraMonitoramento.findMany({ where: { unidade }, select: { status: true } }),
    prisma.quadraSegurancaContainer.count({
      where: { unidade, statusOperacional: { in: ["No terminal", "Dentro do terminal"] } },
    }),
  ]);
  return {
    cftvConectadas: cameras.filter((item) => item.status === "Conectada").length,
    cftvDesconectadas: cameras.filter((item) => item.status === "Desconectada").length,
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
      prisma.ocorrencia.findMany({ where: { unidade }, orderBy: { dataOcorrencia: "desc" }, take: 200 }),
      prisma.evento.findMany({ where: { unidade }, orderBy: { dataEvento: "desc" }, take: 200 }),
      prisma.investigacao.findMany({ where: { unidade }, orderBy: { createdAt: "desc" }, take: 100 }),
      prisma.cameraMonitoramento.findMany({ where: { unidade }, orderBy: { updatedAt: "desc" } }),
      prisma.quadraSegurancaContainer.findMany({ where: { unidade }, orderBy: { dataHoraEntrada: "desc" }, take: 200 }),
      prisma.planejamentoCard.findMany({
        where: { unidade, status: "Ativo" },
        include: { coluna: true, responsavel: { select: { nome: true, apelido: true } } },
        orderBy: { updatedAt: "desc" },
        take: 50,
      }),
      prisma.checklistInspecao.findMany({
        where: { unidade, ...(equipeFiltro ? { responsavel: { equipe: equipeFiltro } } : {}) },
        include: { responsavel: { select: { nome: true, apelido: true, equipe: true } }, itens: true },
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
        include: { responsavel: { select: { nome: true, apelido: true, equipe: true } }, postos: true },
        orderBy: { updatedAt: "desc" },
        take: 12,
      }),
    ]);

    const registros = [
      ...ocorrencias.map((item) => ({
        modulo: "OcorrÃªncia",
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

    const containersNoTerminal = containers.filter((item) => !item.dataHoraSaida && ["No terminal", "Dentro do terminal"].includes(item.statusOperacional));

    return res.json({
      unidade,
      filtroEquipe: equipeFiltro || null,
      equipes: ["Equipe A", "Equipe B", "Equipe C", "Equipe D"],
      atualizadoEm: new Date().toISOString(),
      soc: {
        ocorrenciasAbertas: ocorrencias.filter((item) => item.status !== "ConcluÃ­do").length,
        eventosAbertos: eventos.filter((item) => item.status !== "ConcluÃ­do").length,
        investigacoesAbertas: investigacoes.filter((item) => item.status !== "ConcluÃ­do").length,
        camerasOffline: cameras.filter((item) => item.status === "Desconectada").length,
        containersCriticos: containersNoTerminal.length,
        tarefasAbertas: tarefas.length,
        checklistsHoje: checklists.filter((item) => item.dataHora >= hoje).length,
      },
      checklistTurno: checklists.find((item) => item.tipo === "Checklist de Turno") || null,
      passagensServico: checklists.filter((item) => item.tipo === "Passagem de ServiÃ§o").slice(0, 6),
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
          titulo: `CÃ¢mera ${item.camera?.numeroCamera || "-"} - ${item.statusNovo}`,
          detalhe: `${item.camera?.areaMonitorada || "Ãrea nÃ£o informada"} | ${item.observacao || "Sem observaÃ§Ã£o"}`,
          data: item.iniciadoEm,
        })),
      ].sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime()).slice(0, 30),
      reincidencia: {
        porLocal: agrupar(registros, (item) => item.local).slice(0, 8),
        porNatureza: agrupar(registros, (item) => item.natureza).slice(0, 8),
        porHorario: agrupar(registros, (item) => horaRegistro(item.data)).slice(0, 8),
        porUnidade: agrupar(registros, (item) => item.unidade).slice(0, 8),
      },
      indicadoresMensais: {
        ocorrencias: ocorrencias.filter((item) => item.dataOcorrencia >= mes).length,
        eventos: eventos.filter((item) => item.dataEvento >= mes).length,
        investigacoes: investigacoes.filter((item) => item.createdAt >= mes).length,
        camerasOffline: cameras.filter((item) => item.status === "Desconectada").length,
        containersNoTerminal: containersNoTerminal.length,
      },
      relatoriosExecutivosAutomaticos: [
        "Resumo diÃ¡rio operacional por unidade",
        "RelatÃ³rio semanal de reincidÃªncia por local e natureza",
        "RelatÃ³rio mensal executivo com indicadores por unidade",
      ],
      tarefas: tarefas.map((item) => ({
        id: item.id,
        titulo: item.titulo,
        status: item.coluna?.titulo || item.status,
        prioridade: item.prioridade,
        prazo: item.prazo,
        responsavel: item.responsavel?.apelido || item.responsavel?.nome || "Sem responsÃ¡vel",
      })),
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro ao carregar painel SOC operacional" });
  }
}

export async function listarUsuariosMesmaEquipe(req: AuthRequest, res: Response) {
  try {
    const usuario = await usuarioSolicitante(req.usuarioId);
    const equipe = String(req.query.equipe || usuario?.equipe || "");
    const unidade = req.unidadeAtiva || usuario?.unidade || "GJA-T1";
    const usuarios = await prisma.usuario.findMany({
      where: { unidade, ...(equipe ? { equipe } : {}), statusUsuario: "ATIVO" },
      select: { id: true, nome: true, apelido: true, email: true, equipe: true },
      orderBy: { nome: "asc" },
    });
    return res.json(usuarios);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro ao listar usuÃ¡rios da equipe" });
  }
}

export async function listarPassagensTurno(req: AuthRequest, res: Response) {
  try {
    const usuario = await usuarioSolicitante(req.usuarioId);
    const unidade = req.unidadeAtiva || "GJA-T1";
    const where = podeGerenciarPassagem(req.usuarioPerfil) ? { unidade } : { unidade, equipe: usuario?.equipe || "" };
    const passagens = await prisma.passagemTurno.findMany({
      where,
      include: { responsavel: { select: { id: true, nome: true, apelido: true, equipe: true } }, postos: true },
      orderBy: { updatedAt: "desc" },
    });
    return res.json(passagens.map(serializarPassagem));
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro ao listar passagens de turno" });
  }
}

export async function criarPassagemTurno(req: AuthRequest, res: Response) {
  try {
    const usuario = await usuarioSolicitante(req.usuarioId);
    if (!usuario || !req.usuarioId) return res.status(401).json({ error: "UsuÃ¡rio nÃ£o autenticado" });
    const unidade = req.unidadeAtiva || usuario.unidade || "GJA-T1";
    const equipe = String(req.body.equipe || usuario.equipe || "").trim();
    if (!equipe) return res.status(400).json({ error: "UsuÃ¡rio sem equipe definida para abertura da passagem." });
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
        responsavelId: req.usuarioId,
        dataPassagem: req.body.dataPassagem ? new Date(req.body.dataPassagem) : new Date(),
        colaboradoresIds: JSON.stringify(idsColaboradores(req.body.colaboradoresIds)),
        statusPostoGocil: req.body.statusPostoGocil || "Completo",
        observacaoPostoGocil: req.body.observacaoPostoGocil || null,
        statusPostoScanner: req.body.statusPostoScanner || "Completo",
        observacaoPostoScanner: req.body.observacaoPostoScanner || null,
        informacoesComplementares: req.body.informacoesComplementares || "",
        postos: { create: normalizarPostos(req.body.postos || []) },
      },
      include: { responsavel: true, postos: true },
    });
    await registrarLog({ req, acao: `Abertura da passagem de turno ${passagem.codigo}`, tipoRegistro: "PassagemTurno", registroId: passagem.id, dadosNovos: passagem });
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
    if (!anterior) return res.status(404).json({ error: "Passagem nÃ£o encontrada" });
    if (anterior.status !== "Aberto" && !podeGerenciarPassagem(req.usuarioPerfil)) return res.status(403).json({ error: "RelatÃ³rio finalizado nÃ£o pode ser editado por este perfil." });
    if (!podeGerenciarPassagem(req.usuarioPerfil) && anterior.equipe !== usuario?.equipe) return res.status(403).json({ error: "Apenas integrantes da equipe podem editar esta passagem." });
    const passagem = await prisma.$transaction(async (tx) => {
      await tx.passagemTurnoPosto.deleteMany({ where: { passagemId: anterior.id } });
      return tx.passagemTurno.update({
        where: { id: anterior.id },
        data: {
          dataPassagem: req.body.dataPassagem ? new Date(req.body.dataPassagem) : anterior.dataPassagem,
          colaboradoresIds: JSON.stringify(idsColaboradores(req.body.colaboradoresIds)),
          statusPostoGocil: req.body.statusPostoGocil || "Completo",
          observacaoPostoGocil: req.body.observacaoPostoGocil || null,
          statusPostoScanner: req.body.statusPostoScanner || "Completo",
          observacaoPostoScanner: req.body.observacaoPostoScanner || null,
          informacoesComplementares: req.body.informacoesComplementares || "",
          postos: { create: normalizarPostos(req.body.postos || []) },
        },
        include: { responsavel: { select: { id: true, nome: true, apelido: true, equipe: true } }, postos: true },
      });
    });
    await registrarLog({ req, acao: `AtualizaÃ§Ã£o da passagem de turno ${passagem.codigo}`, tipoRegistro: "PassagemTurno", registroId: passagem.id, dadosAnteriores: anterior, dadosNovos: passagem });
    return res.json(serializarPassagem(passagem));
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro ao atualizar passagem de turno" });
  }
}

export async function finalizarPassagemTurno(req: AuthRequest, res: Response) {
  try {
    const anterior = await prisma.passagemTurno.findFirst({
      where: { id: Number(req.params.id), unidade: req.unidadeAtiva },
      include: { postos: true },
    });
    if (!anterior) return res.status(404).json({ error: "Passagem nÃ£o encontrada" });
    const usuario = await usuarioSolicitante(req.usuarioId);
    if (!podeGerenciarPassagem(req.usuarioPerfil) && anterior.equipe !== usuario?.equipe) return res.status(403).json({ error: "Apenas integrantes da equipe podem finalizar esta passagem." });
    const passagem = await prisma.passagemTurno.update({
      where: { id: anterior.id },
      data: { status: "Enviado", horaEncerramento: new Date(), ...(await indicadoresPassagem(anterior.unidade)) },
      include: { responsavel: { select: { id: true, nome: true, apelido: true, equipe: true } }, postos: true },
    });
    await registrarLog({ req, acao: `FinalizaÃ§Ã£o da passagem de turno ${passagem.codigo}`, tipoRegistro: "PassagemTurno", registroId: passagem.id, dadosAnteriores: anterior, dadosNovos: passagem });
    return res.json(serializarPassagem(passagem));
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro ao finalizar passagem de turno" });
  }
}

export async function adicionarInformacaoPassagem(req: AuthRequest, res: Response) {
  try {
    const usuario = await usuarioSolicitante(req.usuarioId);
    const passagem = await prisma.passagemTurno.findFirst({
      where: { unidade: req.unidadeAtiva || usuario?.unidade || "GJA-T1", equipe: usuario?.equipe || "", status: "Aberto" },
      orderBy: { createdAt: "desc" },
    });
    if (!passagem) return res.status(404).json({ error: "Nenhuma passagem de turno aberta para sua equipe." });
    const texto = String(req.body.informacao || "").trim();
    const atualizada = await prisma.passagemTurno.update({
      where: { id: passagem.id },
      data: { informacoesComplementares: [passagem.informacoesComplementares, texto].filter(Boolean).join("\n\n") },
      include: { responsavel: true, postos: true },
    });
    return res.json(serializarPassagem(atualizada));
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro ao vincular informaÃ§Ã£o Ã  passagem" });
  }
}

export async function gerarPdfPassagemTurno(req: AuthRequest, res: Response) {
  try {
    const passagem = await prisma.passagemTurno.findFirst({
      where: { id: Number(req.params.id), unidade: req.unidadeAtiva },
      include: { responsavel: { select: { nome: true, apelido: true, equipe: true } }, postos: true },
    });
    if (!passagem) return res.status(404).json({ error: "Passagem nÃ£o encontrada" });
    const colaboradores = idsColaboradores(passagem.colaboradoresIds).length
      ? await prisma.usuario.findMany({ where: { id: { in: idsColaboradores(passagem.colaboradoresIds) } }, select: { nome: true, apelido: true } })
      : [];
    const indicadores = passagem.status === "Aberto" ? await indicadoresPassagem(passagem.unidade) : {
      cftvConectadas: passagem.cftvConectadas || 0,
      cftvDesconectadas: passagem.cftvDesconectadas || 0,
      containersArmazenados: passagem.containersArmazenados || 0,
    };
    const doc = new PDFDocument({
      size: "A4",
      bufferPages: true,
      margins: { top: 118, left: 42, right: 42, bottom: 70 },
    });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename=passagem-turno-${passagem.codigo.replace("/", "-")}.pdf`);
    doc.pipe(res);
    const logoPath = path.resolve(process.cwd(), "assets", "movecta-logo.png");
    const responsavel = passagem.responsavel.apelido || passagem.responsavel.nome;
    const cabecalho = () => {
      doc.image(logoPath, 42, 34, { width: 135 });
      doc.font("Helvetica-Bold").fontSize(17).fillColor("#0f172a").text("RelatÃ³rio de Passagem de Turno", 210, 38, { align: "right", width: 343 });
      doc.font("Helvetica").fontSize(9.5).fillColor("#475569").text(`CÃ³digo: ${passagem.codigo}`, 210, 61, { align: "right", width: 343 });
      doc.text(`Unidade: ${passagem.unidade} | Equipe: ${passagem.equipe}`, 210, 76, { align: "right", width: 343 });
      doc.moveTo(42, 103).lineTo(553, 103).strokeColor("#dbe4ef").lineWidth(0.8).stroke();
    };
    const rodape = (pagina: number, total: number) => {
      doc.moveTo(42, 760).lineTo(553, 760).strokeColor("#dbe4ef").lineWidth(0.8).stroke();
      doc.font("Helvetica").fontSize(8).fillColor("#64748b")
        .text(`Emitido em ${new Date().toLocaleString("pt-BR")} por ${responsavel}`, 42, 770, { align: "left", width: 360 })
        .text(`PÃ¡gina ${pagina} de ${total}`, 430, 770, { align: "right", width: 123 });
    };
    cabecalho();
    doc.y = 118;
    doc.on("pageAdded", () => {
      cabecalho();
      doc.y = 118;
    });
    const secao = (titulo: string) => {
      if (doc.y > 705) doc.addPage();
      doc.moveDown(0.5).font("Helvetica-Bold").fontSize(13).fillColor("#0f172a").text(titulo, 42, doc.y, { align: "left", width: 511 });
      doc.moveTo(42, doc.y + 3).lineTo(553, doc.y + 3).strokeColor("#cbd5e1").stroke();
      doc.moveDown(0.8);
    };
    const linha = (rotulo: string, valor: unknown) => {
      doc.font("Helvetica-Bold").fontSize(9).fillColor("#64748b").text(rotulo.toUpperCase(), 42, doc.y, { align: "left", width: 511 });
      doc.font("Helvetica").fontSize(10.5).fillColor("#111827").text(String(valor || "Não informado"), 42, doc.y, { align: "left", width: 511 });
      doc.moveDown(0.45);
    };
    const campoResumo = (x: number, y: number, rotulo: string, valor: unknown) => {
      doc.roundedRect(x, y, 244, 45, 6).strokeColor("#dbe4ef").lineWidth(0.8).stroke();
      doc.font("Helvetica-Bold").fontSize(8).fillColor("#64748b").text(rotulo.toUpperCase(), x + 12, y + 9, { align: "left", width: 220 });
      doc.font("Helvetica").fontSize(10.2).fillColor("#111827").text(String(valor || "Não informado"), x + 12, y + 23, { align: "left", width: 220 });
    };
    secao("Cabeçalho");
    const yResumo = doc.y;
    campoResumo(42, yResumo, "Data", passagem.dataPassagem.toLocaleDateString("pt-BR"));
    campoResumo(309, yResumo, "Hora de abertura", passagem.horaAbertura.toLocaleString("pt-BR"));
    campoResumo(42, yResumo + 55, "Hora de encerramento", passagem.horaEncerramento?.toLocaleString("pt-BR") || "Em aberto");
    campoResumo(309, yResumo + 55, "Unidade / Equipe", `${passagem.unidade} | ${passagem.equipe}`);
    campoResumo(42, yResumo + 110, "Responsável", responsavel);
    campoResumo(309, yResumo + 110, "Colaboradores", colaboradores.map((item) => item.apelido || item.nome).join(", ") || "Não informado");
    doc.y = yResumo + 165;
    secao("Postos Operacionais");
    passagem.postos.forEach((posto) => linha(posto.posto, `Colaborador: ${posto.colaborador} | R.E: ${posto.re || "-"} | Escala: ${posto.escala}`));
    secao("Status dos Postos");
    linha("Posto Gocil", passagem.statusPostoGocil);
    if (passagem.statusPostoGocil === "Incompleto") linha("ObservaÃ§Ãµes do Posto Gocil", passagem.observacaoPostoGocil);
    linha("Posto Scanner", passagem.statusPostoScanner);
    if (passagem.statusPostoScanner === "Incompleto") linha("ObservaÃ§Ãµes do Posto Scanner", passagem.observacaoPostoScanner);
    secao("InformaÃ§Ãµes Complementares");
    linha("ObservaÃ§Ãµes gerais", passagem.informacoesComplementares || "Sem observaÃ§Ãµes");
    secao("SituaÃ§Ã£o Atual");
    linha("CFTV", `Conectadas: ${indicadores.cftvConectadas} | Desconectadas: ${indicadores.cftvDesconectadas}`);
    linha("ContÃªineres na Quadra", indicadores.containersArmazenados);
    const paginas = doc.bufferedPageRange();
    for (let pagina = paginas.start; pagina < paginas.start + paginas.count; pagina++) {
      doc.switchToPage(pagina);
      rodape(pagina - paginas.start + 1, paginas.count);
    }
    doc.end();
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro ao gerar PDF da passagem de turno" });
  }
}

export async function criarRegistroOperacional(req: AuthRequest, res: Response) {
  try {
    const unidade = req.unidadeAtiva || "GJA-T1";
    const tiposPermitidos = ["Informação do Plantão", "Checklist de Turno", "Passagem de Serviço"];
    const tipo = tiposPermitidos.includes(String(req.body.tipo)) ? String(req.body.tipo) : "Informação do Plantão";
    const titulo = String(req.body.titulo || tipo).trim();
    const local = String(req.body.local || "Centro de OperaÃ§Ãµes").trim();
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
        setor: "OperaÃ§Ã£o",
        responsavelId: req.usuarioId!,
        status: req.body.status || "Aberto",
        observacoes,
        itens: {
          create: itens.length ? itens.map((item: any) => ({
            categoria: String(item.categoria || tipo),
            descricao: String(item.descricao || "Item operacional"),
            conformidade: String(item.conformidade || "Conforme"),
            criticidade: String(item.criticidade || "Media"),
            observacao: item.observacao ? String(item.observacao) : undefined,
          })) : [{ categoria: tipo, descricao: observacoes || titulo, conformidade: "Conforme", criticidade: "Media" }],
        },
      },
      include: { itens: true, responsavel: { select: { nome: true, apelido: true, equipe: true } } },
    });
    if (req.body.adicionarPassagem === true || req.body.adicionarPassagem === "true") {
      await adicionarInformacaoPassagem({ ...req, body: { informacao: `${tipo}: ${titulo}\n${observacoes}` } } as AuthRequest, { json: () => undefined, status: () => ({ json: () => undefined }) } as any);
    }
    await registrarLog({ req, acao: `Registro operacional - ${tipo}`, tipoRegistro: "Operacao", registroId: checklist.id, dadosNovos: checklist });
    return res.status(201).json(checklist);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro ao criar registro operacional" });
  }
}
