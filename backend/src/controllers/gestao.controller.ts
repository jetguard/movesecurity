import { Response } from "express";
import crypto from "crypto";
import fs from "fs";
import { prisma } from "../lib/prisma";
import { AuthRequest } from "../middlewares/auth";

function contem(valor: unknown, termo: string) {
  return String(valor || "").toLowerCase().includes(termo.toLowerCase());
}

function diasAte(data?: Date | string | null) {
  if (!data) return null;
  const alvo = new Date(data).getTime();
  return Math.ceil((alvo - Date.now()) / 86400000);
}

function hashArquivo(caminho: string) {
  try {
    if (!fs.existsSync(caminho)) return null;
    const buffer = fs.readFileSync(caminho);
    return crypto.createHash("sha256").update(buffer).digest("hex");
  } catch {
    return null;
  }
}

export async function listarEvidencias(req: AuthRequest, res: Response) {
  try {
    const [ocorrencias, eventos, riscos] = await Promise.all([
      prisma.ocorrencia.findMany({
        where: { unidade: req.unidadeAtiva },
        include: { anexos: true },
        orderBy: { createdAt: "desc" },
      }),
      prisma.evento.findMany({
        where: { unidade: req.unidadeAtiva },
        include: { anexos: true },
        orderBy: { createdAt: "desc" },
      }),
      prisma.analiseRisco.findMany({
        where: { unidade: req.unidadeAtiva },
        include: { fotos: true },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    const evidencias = [
      ...ocorrencias.flatMap((registro) =>
        registro.anexos.map((anexo) => ({
          id: `ocorrencia-${anexo.id}`,
          modulo: "Ocorrencia",
          registroId: registro.id,
          codigo: registro.codigo,
          titulo: registro.assunto,
          unidade: registro.unidade,
          nomeOriginal: anexo.nomeOriginal,
          tipo: anexo.tipo,
          url: `/${anexo.caminho.replace(/\\/g, "/")}`,
          hashSha256: hashArquivo(anexo.caminho),
          createdAt: anexo.createdAt,
        }))
      ),
      ...eventos.flatMap((registro) =>
        registro.anexos.map((anexo) => ({
          id: `evento-${anexo.id}`,
          modulo: "Evento",
          registroId: registro.id,
          codigo: registro.codigo,
          titulo: registro.assunto,
          unidade: registro.unidade,
          nomeOriginal: anexo.nomeOriginal,
          tipo: anexo.tipo,
          url: `/${anexo.caminho.replace(/\\/g, "/")}`,
          hashSha256: hashArquivo(anexo.caminho),
          createdAt: anexo.createdAt,
        }))
      ),
      ...riscos.flatMap((registro) =>
        registro.fotos.map((foto) => ({
          id: `risco-${foto.id}`,
          modulo: "Analise de Risco",
          registroId: registro.id,
          codigo: registro.codigo,
          titulo: registro.naturezaRisco,
          unidade: registro.unidade,
          nomeOriginal: foto.nomeOriginal,
          tipo: foto.tipo,
          url: `/${foto.caminho.replace(/\\/g, "/")}`,
          hashSha256: hashArquivo(foto.caminho),
          createdAt: foto.createdAt,
        }))
      ),
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return res.json(evidencias);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro ao listar evidencias" });
  }
}

export async function listarPendencias(req: AuthRequest, res: Response) {
  try {
    const [investigacoes, riscos, analisesEstrategicas, analisesOcorrencia, analisesEvento] = await Promise.all([
      prisma.investigacao.findMany({ where: { unidade: req.unidadeAtiva }, include: { responsavel: true } }),
      prisma.analiseRisco.findMany({ where: { unidade: req.unidadeAtiva }, include: { responsavel: true } }),
      prisma.analiseEstrategica.findMany({ where: { unidade: req.unidadeAtiva }, include: { responsavel: true } }),
      prisma.analiseOcorrencia.findMany({
        where: { ocorrencia: { unidade: req.unidadeAtiva } },
        include: { ocorrencia: true, responsavel: true },
      }),
      prisma.analiseEvento.findMany({
        where: { evento: { unidade: req.unidadeAtiva } },
        include: { evento: true, responsavel: true },
      }),
    ]);

    const pendencias = [
      ...investigacoes
        .filter((item) => item.status !== "Concluido" && item.status !== "Concluído")
        .map((item) => ({
          id: `investigacao-${item.id}`,
          modulo: "Investigacao",
          codigo: item.numeroOcorrencia,
          titulo: item.titulo,
          status: item.status,
          responsavel: item.responsavel?.apelido || item.responsavel?.nome || "Nao informado",
          prazo: null,
          dias: null,
          prioridade: "Media",
        })),
      ...riscos
        .filter((item) => item.status !== "Concluido" && item.status !== "Concluído")
        .map((item) => ({
          id: `risco-${item.id}`,
          modulo: "Analise de Risco",
          codigo: item.codigo,
          titulo: item.naturezaRisco,
          status: item.status,
          responsavel: item.responsavel?.apelido || item.responsavel?.nome || "Nao informado",
          prazo: item.prazo,
          dias: diasAte(item.prazo),
          prioridade: item.nivelRisco,
        })),
      ...analisesEstrategicas
        .filter((item) => item.status !== "Concluida")
        .map((item) => ({
          id: `estrategica-${item.id}`,
          modulo: "Analise Estrategica",
          codigo: item.codigo,
          titulo: item.titulo,
          status: item.status,
          responsavel: item.responsavel?.apelido || item.responsavel?.nome || "Nao informado",
          prazo: item.prazo,
          dias: diasAte(item.prazo),
          prioridade: item.tipo,
        })),
      ...analisesOcorrencia
        .filter((item) => item.status !== "Concluido" && item.status !== "Concluído")
        .map((item) => ({
          id: `analise-ocorrencia-${item.id}`,
          modulo: "Analise de Ocorrencia",
          codigo: item.ocorrencia.codigo,
          titulo: item.ocorrencia.assunto,
          status: item.status,
          responsavel: item.responsavel.apelido || item.responsavel.nome,
          prazo: null,
          dias: null,
          prioridade: "Em Analise",
        })),
      ...analisesEvento
        .filter((item) => item.status !== "Concluido" && item.status !== "Concluído")
        .map((item) => ({
          id: `analise-evento-${item.id}`,
          modulo: "Analise de Evento",
          codigo: item.evento.codigo,
          titulo: item.evento.assunto,
          status: item.status,
          responsavel: item.responsavel.apelido || item.responsavel.nome,
          prazo: null,
          dias: null,
          prioridade: "Em Analise",
        })),
    ].sort((a, b) => (a.dias ?? 9999) - (b.dias ?? 9999));

    return res.json(pendencias);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro ao listar pendencias" });
  }
}

export async function listarNotificacoes(req: AuthRequest, res: Response) {
  try {
    const incluirLidas = String(req.query.incluirLidas || "") === "true";
    const pendenciasReq = { ...req } as AuthRequest;
    const buffer: unknown[] = [];
    const fakeRes = {
      json: (payload: unknown) => {
        if (Array.isArray(payload)) buffer.push(...payload);
        return fakeRes;
      },
      status: () => fakeRes,
    } as unknown as Response;

    const [camerasOffline, checklistsCamera, planos] = await Promise.all([
      prisma.cameraMonitoramento.findMany({
        where: { unidade: req.unidadeAtiva, status: "Desconectada", statusCadastro: "Ativa" },
        orderBy: { desconectadaDesde: "asc" },
      }),
      prisma.cameraMonitoramento.findMany({
        where: { unidade: req.unidadeAtiva, statusCadastro: "Ativa" },
        include: { checklists: { orderBy: { createdAt: "desc" }, take: 1 } },
      }),
      prisma.planoAcaoCorporativo.findMany({
        where: { unidade: req.unidadeAtiva, status: { not: "Concluido" } },
        orderBy: { prazo: "asc" },
        take: 20,
      }),
    ]);

    await listarPendencias(pendenciasReq, fakeRes);
    const pendencias = buffer as Array<{ id: string; modulo: string; codigo: string; titulo: string; dias: number | null; prioridade: string }>;

    const notificacoesPendencias = pendencias
      .filter((item) => item.dias === null || item.dias <= 7 || ["Critico", "Crítico", "Alto"].includes(item.prioridade))
      .slice(0, 12)
      .map((item) => ({
        id: item.id,
        tipo: "Pendência",
        titulo: item.dias !== null && item.dias < 0 ? "Prazo vencido" : "Pendência em aberto",
        mensagem: `${item.modulo} ${item.codigo} - ${item.titulo}`,
        severidade: item.dias !== null && item.dias < 0 ? "alta" : "media",
        link: "/pendencias",
        createdAt: new Date(),
      }));

    const notificacoesCameras = camerasOffline.map((camera) => ({
      id: `camera-offline-${camera.id}`,
      tipo: "CFTV",
      titulo: `Câmera ${camera.numeroCamera} desconectada`,
      mensagem: `${camera.areaMonitorada} | Servidor ${camera.numeroServidor}`,
      severidade: "alta",
      link: "/cameras",
      createdAt: camera.desconectadaDesde || camera.updatedAt,
    }));

    const notificacoesChecklist = checklistsCamera
      .filter((camera) => {
        const ultimo = camera.checklists[0]?.createdAt;
        if (!ultimo) return true;
        return diasAte(new Date(Date.now() + 7 * 86400000)) !== null && Date.now() - ultimo.getTime() > 7 * 86400000;
      })
      .map((camera) => ({
        id: `checklist-camera-${camera.id}`,
        tipo: "Checklist CFTV",
        titulo: `Checklist pendente da câmera ${camera.numeroCamera}`,
        mensagem: `${camera.areaMonitorada} | último checklist não encontrado ou vencido`,
        severidade: "media",
        link: "/cameras",
        createdAt: camera.updatedAt,
      }));

    const notificacoesPlanos = planos
      .filter((plano) => diasAte(plano.prazo) !== null && (diasAte(plano.prazo) as number) <= 7)
      .map((plano) => ({
        id: `plano-${plano.id}`,
        tipo: "Plano de Ação",
        titulo: diasAte(plano.prazo)! < 0 ? "Plano de ação vencido" : "Plano de ação próximo do prazo",
        mensagem: `${plano.codigo} - ${plano.titulo}`,
        severidade: diasAte(plano.prazo)! < 0 ? "alta" : "media",
        link: "/planos-acao",
        createdAt: plano.prazo,
      }));

    const notificacoes = [
      ...notificacoesCameras,
      ...notificacoesChecklist,
      ...notificacoesPlanos,
      ...notificacoesPendencias,
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const lidas = await prisma.notificacaoLida.findMany({
      where: { usuarioId: req.usuarioId },
      select: { notificacaoId: true, lidaEm: true },
    });
    const mapaLidas = new Map(lidas.map((item) => [item.notificacaoId, item.lidaEm]));

    const resultado = notificacoes
      .map((item) => ({
        ...item,
        lida: mapaLidas.has(item.id),
        lidaEm: mapaLidas.get(item.id) || null,
      }))
      .filter((item) => incluirLidas || !item.lida);

    return res.json(resultado.slice(0, 50));
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro ao listar notificações" });
  }
}

export async function marcarNotificacaoLida(req: AuthRequest, res: Response) {
  try {
    const id = String(req.params.id);

    await prisma.notificacaoLida.upsert({
      where: {
        usuarioId_notificacaoId: {
          usuarioId: req.usuarioId!,
          notificacaoId: id,
        },
      },
      update: {
        lidaEm: new Date(),
      },
      create: {
        usuarioId: req.usuarioId!,
        notificacaoId: id,
      },
    });

    return res.status(204).send();
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro ao marcar notificação como lida" });
  }
}

export async function marcarTodasNotificacoesLidas(req: AuthRequest, res: Response) {
  try {
    const notificacoesReq = { ...req, query: { ...req.query, incluirLidas: "false" } } as unknown as AuthRequest;
    const buffer: unknown[] = [];
    const fakeRes = {
      json: (payload: unknown) => {
        if (Array.isArray(payload)) buffer.push(...payload);
        return fakeRes;
      },
      status: () => fakeRes,
    } as unknown as Response;

    await listarNotificacoes(notificacoesReq, fakeRes);
    const notificacoes = buffer as Array<{ id: string }>;

    await prisma.$transaction(
      notificacoes.map((item) =>
        prisma.notificacaoLida.upsert({
          where: {
            usuarioId_notificacaoId: {
              usuarioId: req.usuarioId!,
              notificacaoId: item.id,
            },
          },
          update: { lidaEm: new Date() },
          create: { usuarioId: req.usuarioId!, notificacaoId: item.id },
        })
      )
    );

    return res.status(204).send();
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro ao marcar notificações como lidas" });
  }
}

export async function buscaGlobal(req: AuthRequest, res: Response) {
  try {
    const termo = String(req.query.q || "").trim();
    if (termo.length < 2) return res.json([]);

    const [ocorrencias, eventos, investigacoes, riscos, estrategicas] = await Promise.all([
      prisma.ocorrencia.findMany({ where: { unidade: req.unidadeAtiva }, take: 100 }),
      prisma.evento.findMany({ where: { unidade: req.unidadeAtiva }, take: 100 }),
      prisma.investigacao.findMany({ where: { unidade: req.unidadeAtiva }, take: 100 }),
      prisma.analiseRisco.findMany({ where: { unidade: req.unidadeAtiva }, take: 100 }),
      prisma.analiseEstrategica.findMany({ where: { unidade: req.unidadeAtiva }, take: 100 }),
    ]);

    const resultados = [
      ...ocorrencias.map((item) => ({ tipo: "Ocorrencia", id: item.id, codigo: item.codigo, titulo: item.assunto, texto: `${item.local} ${item.natureza} ${item.subNatureza} ${item.relatoSeguranca}` })),
      ...eventos.map((item) => ({ tipo: "Evento", id: item.id, codigo: item.codigo, titulo: item.assunto, texto: `${item.local} ${item.natureza} ${item.subNatureza} ${item.relatoSeguranca}` })),
      ...investigacoes.map((item) => ({ tipo: "Investigacao", id: item.id, codigo: item.numeroOcorrencia, titulo: item.titulo, texto: `${item.local} ${item.natureza} ${item.descricaoInvestigacao} ${item.conclusaoFatos}` })),
      ...riscos.map((item) => ({ tipo: "Analise de Risco", id: item.id, codigo: item.codigo, titulo: item.naturezaRisco, texto: `${item.local} ${item.setor} ${item.tipoRisco} ${item.descricaoRisco} ${item.planoAcao}` })),
      ...estrategicas.map((item) => ({ tipo: "Analise Estrategica", id: item.id, codigo: item.codigo, titulo: item.titulo, texto: `${item.tipo} ${item.local} ${item.descricao} ${item.diagnostico} ${item.planoAcao}` })),
    ].filter((item) => [item.tipo, item.codigo, item.titulo, item.texto].some((valor) => contem(valor, termo)));

    return res.json(resultados.slice(0, 30));
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro na busca global" });
  }
}

export async function timelineRegistro(req: AuthRequest, res: Response) {
  try {
    const { tipo, id } = req.params;
    const tipoNormalizado = String(tipo).toLowerCase();
    const registroId = Number(id);

    const logs = await prisma.logAuditoria.findMany({
      where: {
        registroId,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const eventos = logs
      .filter((log) => log.tipoRegistro.toLowerCase().includes(tipoNormalizado) || tipoNormalizado.includes(log.tipoRegistro.toLowerCase()))
      .map((log) => ({
        id: log.id,
        data: log.createdAt,
        usuario: log.usuarioNome,
        acao: log.acao,
        tipo: log.tipoRegistro,
      }));

    return res.json(eventos);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro ao carregar timeline" });
  }
}

export async function centralTarefas(req: AuthRequest, res: Response) {
  try {
    const [mencoes, planos, workflow, pendencias, anulacoes] = await Promise.all([
      prisma.mencao.findMany({
        where: { usuarioMencionadoId: req.usuarioId },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
      prisma.planoAcaoCorporativo.findMany({
        where: { unidade: req.unidadeAtiva },
        orderBy: { prazo: "asc" },
        take: 50,
      }),
      Promise.all([
        prisma.ocorrencia.findMany({ where: { unidade: req.unidadeAtiva, fluxoStatus: { not: "Aprovado" } }, take: 50 }),
        prisma.evento.findMany({ where: { unidade: req.unidadeAtiva, fluxoStatus: { not: "Aprovado" } }, take: 50 }),
        prisma.investigacao.findMany({ where: { unidade: req.unidadeAtiva, fluxoStatus: { not: "Aprovado" } }, take: 50 }),
      ]),
      prisma.analiseRisco.findMany({
        where: { unidade: req.unidadeAtiva, status: { not: "Concluido" } },
        orderBy: { prazo: "asc" },
        take: 50,
      }),
      prisma.solicitacaoAnulacaoRelatorio.findMany({
        where: {
          unidade: req.unidadeAtiva,
          status: "Pendente",
          OR: [
            { solicitanteId: req.usuarioId },
            { acordos: { some: { analistaId: req.usuarioId, status: "Pendente" } } },
          ],
        },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
    ]);

    const [ocorrencias, eventos, investigacoes] = workflow;
    const tarefas = [
      ...mencoes.map((item) => ({
        id: `mencao-${item.id}`,
        origem: "Mencao",
        modulo: item.modulo,
        codigo: item.codigoRegistro,
        titulo: item.tituloRegistro,
        status: item.lidaEm ? "Lida" : "Pendente",
        prazo: item.prazo,
        prioridade: item.tipoMencao,
        link: "/mencoes",
      })),
      ...planos.filter((item) => item.status !== "Concluido").map((item) => ({
        id: `plano-${item.id}`,
        origem: "Plano de Acao",
        modulo: item.origemModulo || "Plano",
        codigo: item.codigo,
        titulo: item.titulo,
        status: item.status,
        prazo: item.prazo,
        prioridade: item.prioridade,
        link: "/planos-acao",
      })),
      ...pendencias.map((item) => ({
        id: `risco-${item.id}`,
        origem: "Risco",
        modulo: "Analise de Risco",
        codigo: item.codigo,
        titulo: item.naturezaRisco,
        status: item.status,
        prazo: item.prazo,
        prioridade: item.nivelRisco,
        link: "/riscos",
      })),
      ...anulacoes.map((item) => ({
        id: `anulacao-${item.id}`,
        origem: "Anulacao",
        modulo: item.modulo,
        codigo: item.codigoRegistro,
        titulo: item.tituloRegistro,
        status: item.status,
        prazo: null,
        prioridade: "Acordo/Decisao",
        link: "/anulacoes",
      })),
      ...ocorrencias.map((item) => ({
        id: `workflow-ocorrencia-${item.id}`,
        origem: "Aprovacao",
        modulo: "Ocorrencia",
        codigo: item.codigo,
        titulo: item.assunto,
        status: item.fluxoStatus,
        prazo: null,
        prioridade: "Revisao",
        link: "/documentos",
      })),
      ...eventos.map((item) => ({
        id: `workflow-evento-${item.id}`,
        origem: "Aprovacao",
        modulo: "Evento",
        codigo: item.codigo,
        titulo: item.assunto,
        status: item.fluxoStatus,
        prazo: null,
        prioridade: "Revisao",
        link: "/documentos",
      })),
      ...investigacoes.map((item) => ({
        id: `workflow-investigacao-${item.id}`,
        origem: "Aprovacao",
        modulo: "Investigacao",
        codigo: item.numeroOcorrencia,
        titulo: item.titulo,
        status: item.fluxoStatus,
        prazo: null,
        prioridade: "Revisao",
        link: "/documentos",
      })),
    ].sort((a, b) => (diasAte(a.prazo) ?? 9999) - (diasAte(b.prazo) ?? 9999));

    return res.json(tarefas);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro ao listar central de tarefas" });
  }
}

function parseJson(valor?: string | null) {
  if (!valor) return null;
  try {
    return JSON.parse(valor);
  } catch {
    return null;
  }
}

function resumirValor(valor: unknown) {
  if (valor === null || valor === undefined) return "";
  if (typeof valor === "object") return "[objeto]";
  return String(valor);
}

export async function historicoLegivel(req: AuthRequest, res: Response) {
  try {
    const { tipo, id } = req.params;
    const tipoNormalizado = String(tipo).toLowerCase();
    const registroId = Number(id);

    const logs = await prisma.logAuditoria.findMany({
      where: { registroId },
      orderBy: { createdAt: "desc" },
    });

    const historico = logs
      .filter((log) => log.tipoRegistro.toLowerCase().includes(tipoNormalizado) || tipoNormalizado.includes(log.tipoRegistro.toLowerCase()))
      .map((log) => {
        const anterior = parseJson(log.dadosAnteriores);
        const novo = parseJson(log.dadosNovos);
        const campos = anterior && novo
          ? Object.keys({ ...anterior, ...novo })
              .filter((campo) => !["updatedAt", "createdAt"].includes(campo))
              .filter((campo) => JSON.stringify(anterior[campo]) !== JSON.stringify(novo[campo]))
              .slice(0, 30)
              .map((campo) => ({
                campo,
                anterior: resumirValor(anterior[campo]),
                novo: resumirValor(novo[campo]),
              }))
          : [];

        return {
          id: log.id,
          usuario: log.usuarioNome,
          acao: log.acao,
          data: log.createdAt,
          campos,
        };
      });

    return res.json(historico);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro ao listar historico legivel" });
  }
}

