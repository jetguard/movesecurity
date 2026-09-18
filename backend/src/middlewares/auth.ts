import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { prisma } from "../lib/prisma";
import { jwtSecret } from "../config/security";
import {
  normalizarUnidadesPermitidas,
  UNIDADES_SISTEMA,
} from "../config/unidades";

export type AuthRequest = Request & {
  usuarioId?: number;
  usuarioNome?: string | null;
  usuarioEmail?: string | null;
  usuarioPerfil?: string;
  usuarioPermissoes?: string[];
  usuarioPermissoesAcoes?: PermissaoModulo[];
  usuarioUnidade?: string | null;
  usuarioValidadorOperacional?: boolean;
  usuarioMediadorOperacional?: boolean;
  unidadeAtiva?: string;
  unidadesPermitidas?: string[];
  sessaoId?: string;
};

type TokenPayload = {
  id: number;
  sessaoId?: string;
};

function perfilPrivilegiado(perfil?: string | null) {
  const normalizado = String(perfil || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

  return normalizado === PERFIS.SUPER_ADMIN || normalizado === PERFIS.TI || normalizado === "TI";
}

function lerCookie(req: Request, nome: string) {
  const cookies = String(req.headers.cookie || "");
  return cookies
    .split(";")
    .map((item) => item.trim())
    .find((item) => item.startsWith(`${nome}=`))
    ?.slice(nome.length + 1);
}

type PermissaoModulo = {
  modulo: string;
  leitura: boolean;
  indicadores?: boolean;
  criar: boolean;
  editar: boolean;
  excluir: boolean;
};

const ACOES_ACESSO = ["leitura", "indicadores", "criar", "editar", "excluir"];

function permissoesCompletas(modulos: string[]) {
  return Array.from(new Set(modulos))
    .filter((modulo) => MODULOS_ACESSO.some((item) => item.chave === modulo))
    .map((modulo) => ({
      modulo,
      leitura: true,
      indicadores: true,
      criar: true,
      editar: true,
      excluir: true,
    }));
}

function normalizarPermissoes(valor: unknown): PermissaoModulo[] {
  const normalizarLista = (lista: unknown[]) => {
    if (lista.every((item) => typeof item === "string")) {
      return permissoesCompletas(lista.map((item) => String(item)));
    }

    return lista
      .map((item: any) => {
        const modulo = String(item?.modulo || item?.chave || "").trim();
        if (!MODULOS_ACESSO.some((opcao) => opcao.chave === modulo)) return null;
        const permissoes = {
          modulo,
          leitura: Boolean(item.leitura),
          indicadores: Boolean(item.indicadores),
          criar: Boolean(item.criar),
          editar: Boolean(item.editar),
          excluir: Boolean(item.excluir),
        };
        if (
          permissoes.indicadores ||
          permissoes.criar ||
          permissoes.editar ||
          permissoes.excluir
        ) {
          permissoes.leitura = true;
        }
        return ACOES_ACESSO.some((acao) =>
          Boolean(permissoes[acao as keyof PermissaoModulo]),
        )
          ? permissoes
          : null;
      })
      .filter(Boolean) as PermissaoModulo[];
  };

  if (Array.isArray(valor)) {
    return normalizarLista(valor);
  }
  if (typeof valor === "string") {
    try {
      const parsed = JSON.parse(valor);
      return Array.isArray(parsed) ? normalizarLista(parsed) : [];
    } catch {
      return [];
    }
  }
  return [];
}

async function permissoesDoPerfil(codigo?: string | null) {
  if (!codigo) return [];
  if (perfilPrivilegiado(codigo)) {
    return permissoesCompletas(MODULOS_ACESSO.map((item) => item.chave));
  }
  const perfil = await prisma.perfilAcesso.findUnique({
    where: { codigo },
    select: { permissoesJson: true, status: true },
  });
  if (!perfil || perfil.status !== "ATIVO") return [];
  return normalizarPermissoes(perfil.permissoesJson);
}

function acaoDaRequisicao(req: AuthRequest) {
  const rota = req.originalUrl || req.path || "";
  if (
    req.method === "POST" &&
    rota.startsWith("/api/planos-acao/") &&
    (rota.includes("/tratamento") || rota.includes("/mediadores/concluir"))
  ) {
    return "editar";
  }
  if (req.method === "GET") return "leitura";
  if (req.method === "POST") return "criar";
  if (req.method === "PUT" || req.method === "PATCH") return "editar";
  if (req.method === "DELETE") return "excluir";
  return "leitura";
}

function modulosDaRota(req: AuthRequest) {
  const rota = req.originalUrl || req.path || "";
  if (rota.startsWith("/api/usuarios")) return ["usuarios"];
  if (rota.startsWith("/api/auth")) return undefined;
  if (rota.startsWith("/api/indicadores-seguranca-empresarial")) return ["indicadores_seguranca_empresarial"];
  if (rota.startsWith("/api/financeiro/fornecedores")) return ["financeiro_fornecedores", "financeiro"];
  if (rota.startsWith("/api/financeiro/contas")) return ["financeiro_contas", "financeiro"];
  if (rota.startsWith("/api/financeiro/resumo")) return ["financeiro_indicadores", "financeiro"];
  if (rota.startsWith("/api/financeiro/requisicoes")) return ["financeiro_compras", "financeiro"];
  if (rota.startsWith("/api/treinamentos-visitantes")) return ["treinamentos_visitantes"];
  if (
    rota.startsWith("/api/treinamentos-dinamicos/anexo") ||
    rota.startsWith("/api/treinamentos-dinamicos/video") ||
    (rota.startsWith("/api/treinamentos-dinamicos") && req.method !== "GET")
  ) {
    return ["treinamentos_criador"];
  }
  if (rota.startsWith("/api/treinamentos-dinamicos")) {
    return ["treinamentos_criados", "treinamentos_criador"];
  }
  if (rota.startsWith("/api/treinamentos") || rota.includes("treinamento")) return ["treinamentos"];
  if (rota.startsWith("/api/riscos")) return ["analise_riscos"];
  if (rota.startsWith("/api/planos-acao")) return ["plano_acao"];
  if (rota.startsWith("/api/solicitacoes-imagens")) return ["solicitacoes_imagens"];
  if (rota.startsWith("/api/cameras")) return ["cftv"];
  if (rota.startsWith("/api/ordens-servico")) return ["operacao_ordens_servico", "cftv"];
  if (rota.startsWith("/api/planejamento")) return ["operacao_planejamento", "operacao"];
  if (rota.startsWith("/api/alertas-operacionais")) return ["operacao_alertas", "operacao"];
  if (rota.startsWith("/api/operacao/scanner")) return ["operacao_scanner", "operacao"];
  if (rota.startsWith("/api/operacao/indicadores/")) {
    const modulo = rota.split("/api/operacao/indicadores/")[1]?.split(/[/?#]/)[0];
    return modulo ? [modulo, "operacao"] : ["operacao"];
  }
  if (rota.startsWith("/api/operacao")) return ["operacao"];
  if (rota.startsWith("/api/quadra")) return ["quadra_seguranca"];
  if (rota.startsWith("/api/locais") && req.method === "GET") {
    return ["cadastros", "cftv", "solicitacoes_imagens", "relatorios", "analise_riscos"];
  }
  if (rota.startsWith("/api/naturezas") || rota.startsWith("/api/locais")) return ["cadastros"];
  if (rota.startsWith("/api/logs") || rota.startsWith("/api/sessoes")) return ["logs"];
  if (rota.startsWith("/api/configuracoes") || rota.startsWith("/api/apis")) return ["configuracoes"];
  if (
    rota.startsWith("/api/ocorrencias") ||
    rota.startsWith("/api/eventos") ||
    rota.startsWith("/api/investigacao") ||
    rota.startsWith("/api/relatorios") ||
    rota.startsWith("/api/relatos-campo")
  ) {
    return ["relatorios"];
  }
  return undefined;
}

function moduloCorresponde(permissaoModulo: string, moduloRota: string) {
  return (
    permissaoModulo === moduloRota ||
    (permissaoModulo === "operacao" && moduloRota.startsWith("operacao_")) ||
    (permissaoModulo === "treinamentos" &&
      moduloRota.startsWith("treinamentos_"))
  );
}

export async function autenticarUsuario(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
  const authHeader = req.headers.authorization;
  const cookieToken = lerCookie(req, "jetguard_access");

  if (!authHeader && !cookieToken) {
    return res.status(401).json({
      error: "Token não informado",
    });
  }

  const token = cookieToken || authHeader?.split(" ")[1] || "";

  try {
    const payload = jwt.verify(token, jwtSecret()) as TokenPayload;
    const unidadeSolicitada = String(req.headers["x-unidade-ativa"] || "");
    let unidadeSessao: string | null | undefined = null;
    const usuario = await prisma.usuario.findUnique({
      where: {
        id: payload.id,
      },
      select: {
        id: true,
        nome: true,
        email: true,
        perfilAcesso: true,
        validadorOperacional: true,
        mediadorOperacional: true,
        statusUsuario: true,
        unidade: true,
        unidadesPermitidas: true,
        deveAlterarSenha: true,
      },
    });

    if (!usuario) {
      return res.status(401).json({
        error: "Usuário não encontrado",
      });
    }

    if (usuario.statusUsuario !== "ATIVO") {
      return res.status(403).json({
        error: "Usuário sem acesso ao sistema",
      });
    }

    if (payload.sessaoId) {
      const sessao = await prisma.sessaoUsuario.findUnique({
        where: { id: payload.sessaoId },
        select: {
          id: true,
          usuarioId: true,
          status: true,
          unidadeAtiva: true,
        },
      });

      if (
        !sessao ||
        sessao.usuarioId !== usuario.id ||
        sessao.status !== "ATIVA"
      ) {
        return res.status(401).json({
          error: "Sessão encerrada. Faça login novamente.",
          code: "SESSAO_ENCERRADA",
        });
      }

      req.sessaoId = sessao.id;
      unidadeSessao = sessao.unidadeAtiva;

      await prisma.sessaoUsuario.update({
        where: { id: sessao.id },
        data: {
          ultimaAtividadeEm: new Date(),
          ipUltimaAtividade: req.ip,
        },
      });
    }

    req.usuarioId = usuario.id;
    req.usuarioNome = usuario.nome;
    req.usuarioEmail = usuario.email;
    req.usuarioPerfil = usuario.perfilAcesso;
    req.usuarioValidadorOperacional = Boolean(usuario.validadorOperacional);
    req.usuarioMediadorOperacional = Boolean(usuario.mediadorOperacional);
    req.usuarioPermissoesAcoes = await permissoesDoPerfil(usuario.perfilAcesso);
    req.usuarioPermissoes = req.usuarioPermissoesAcoes.map(
      (permissao) => permissao.modulo,
    );
    req.usuarioUnidade = usuario.unidade;

    const rotaLiberadaParaTrocaSenha = [
      "/api/auth/alterar-senha",
      "/api/auth/logout",
    ].includes(req.originalUrl);

    if (usuario.deveAlterarSenha && !rotaLiberadaParaTrocaSenha) {
      return res.status(403).json({
        error: "Alteração de senha obrigatória no primeiro acesso.",
        code: "TROCA_SENHA_OBRIGATORIA",
      });
    }

    const unidadesPermitidas =
      perfilPrivilegiado(usuario.perfilAcesso)
        ? UNIDADES_SISTEMA
        : normalizarUnidadesPermitidas(
            usuario.unidadesPermitidas,
            usuario.unidade,
          );
    req.unidadesPermitidas = unidadesPermitidas;

    if (unidadeSolicitada && !unidadesPermitidas.includes(unidadeSolicitada)) {
      return res.status(403).json({
        error: "Usuário não possui acesso a esta unidade",
      });
    }

    req.unidadeAtiva =
      unidadeSolicitada ||
      unidadeSessao ||
      usuario.unidade ||
      unidadesPermitidas[0] ||
      "GJA-T1";

    if (req.sessaoId && unidadeSolicitada) {
      await prisma.sessaoUsuario.update({
        where: { id: req.sessaoId },
        data: { unidadeAtiva: unidadeSolicitada },
      });
    }

    return next();
  } catch (error) {
    return res.status(401).json({
      error: "Token inválido",
    });
  }
}

export function autorizarPerfis(perfisPermitidos: string[]) {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    if (perfilPrivilegiado(req.usuarioPerfil)) {
      return next();
    }

    if (
      perfisPermitidos.length === 1 &&
      perfisPermitidos[0] === PERFIS.SUPER_ADMIN
    ) {
      return res.status(403).json({
        error: "Acesso não autorizado para este perfil",
      });
    }

    const modulosRota = modulosDaRota(req);
    const acessoPorPerfil =
      !modulosRota && req.usuarioPerfil
        ? perfisPermitidos.includes(req.usuarioPerfil)
        : false;
    const acao = acaoDaRequisicao(req);
    const acessoPorModulo =
      Boolean(modulosRota?.length) &&
      (req.usuarioPermissoesAcoes || []).some(
        (permissao) =>
          modulosRota?.some((moduloRota) =>
            moduloCorresponde(permissao.modulo, moduloRota),
          ) &&
          Boolean(permissao[acao as keyof PermissaoModulo]),
      );
    const acessoValidadorOperacional =
      Boolean(req.usuarioValidadorOperacional) &&
      (acao === "criar" || acao === "editar") &&
      Boolean(modulosRota?.length) &&
      (req.usuarioPermissoesAcoes || []).some(
        (permissao) =>
          modulosRota?.some((moduloRota) =>
            moduloCorresponde(permissao.modulo, moduloRota),
          ) && permissao.leitura,
      );

    if (!acessoPorPerfil && !acessoPorModulo && !acessoValidadorOperacional) {
      return res.status(403).json({
        error: "Acesso não autorizado para este perfil",
      });
    }

    return next();
  };
}

export const PERFIS = {
  SUPER_ADMIN: "SUPER_ADMIN",
  TI: "T_I",
  ADMINISTRADOR: "ADMINISTRADOR",
  GESTOR: "GESTOR",
  COORDENADOR: "COORDENADOR",
  SUPERVISOR: "SUPERVISOR",
  ANALISTA: "ANALISTA",
  OPERADOR: "OPERADOR",
  PORTARIA: "PORTARIA",
  CADASTRO: "CADASTRO",
  TECNICO_MANUTENCAO: "TECNICO_MANUTENCAO",
};

export const MODULOS_ACESSO = [
  { chave: "dashboard", nome: "Dashboard" },
  { chave: "indicadores_seguranca_empresarial", nome: "Indicadores Segurança Empresarial" },
  { chave: "financeiro", nome: "Financeiro" },
  { chave: "financeiro_fornecedores", nome: "Fornecedores" },
  { chave: "financeiro_contas", nome: "Contas contábeis" },
  { chave: "financeiro_indicadores", nome: "Indicadores financeiros" },
  { chave: "financeiro_compras", nome: "Requisições de compras" },
  { chave: "relatorios", nome: "Relatórios" },
  { chave: "documentos", nome: "Central de documentos" },
  { chave: "treinamentos", nome: "Treinamentos" },
  { chave: "treinamentos_criador", nome: "Criador de Treinamentos" },
  { chave: "treinamentos_criados", nome: "Treinamentos Criados" },
  { chave: "treinamentos_visitantes", nome: "Cadastro de Visitantes" },
  { chave: "operacao", nome: "Operação" },
  { chave: "operacao_planejamento", nome: "Quadro de Tarefas" },
  { chave: "operacao_mapa", nome: "Mapa Operacional" },
  { chave: "operacao_alertas", nome: "Alertas Operacionais" },
  { chave: "controle_operacional", nome: "Controle Operacional" },
  { chave: "operacao_entrada_saida", nome: "Entrada e Saída" },
  { chave: "operacao_vigilancia", nome: "Vigilância Patrimonial" },
  { chave: "operacao_balanca", nome: "Balança" },
  { chave: "operacao_ocr", nome: "OCR" },
  { chave: "operacao_scanner", nome: "Scanner" },
  { chave: "operacao_equipe_scanner", nome: "Equipe do Scanner" },
  { chave: "operacao_acesso", nome: "Acesso de Pessoas e Veículos Leves" },
  { chave: "operacao_motoristas", nome: "Cadastro de Motoristas" },
  { chave: "operacao_filas", nome: "Filas e Paradas de Sistema" },
  { chave: "cftv", nome: "Câmeras e manutenção" },
  { chave: "operacao_ordens_servico", nome: "Ordens de Serviço" },
  { chave: "solicitacoes_imagens", nome: "Solicitações de Imagens" },
  { chave: "quadra_seguranca", nome: "Quadra de Segurança" },
  { chave: "analise_riscos", nome: "Análise de riscos" },
  { chave: "plano_acao", nome: "Plano de ação" },
  { chave: "cadastros", nome: "Cadastros" },
  { chave: "usuarios", nome: "Usuários" },
  { chave: "configuracoes", nome: "Configurações" },
  { chave: "sistema", nome: "Sistema" },
  { chave: "logs", nome: "Logs" },
];

const PERFIS_POR_MODULO: Record<string, string[]> = {
  [PERFIS.TI]: MODULOS_ACESSO.map((item) => item.chave),
  [PERFIS.ADMINISTRADOR]: [
    "dashboard",
    "indicadores_seguranca_empresarial",
    "relatorios",
    "documentos",
    "treinamentos",
    "operacao",
    "controle_operacional",
    "cftv",
    "solicitacoes_imagens",
    "quadra_seguranca",
    "analise_riscos",
    "plano_acao",
    "cadastros",
    "usuarios",
    "configuracoes",
    "sistema",
    "logs",
  ],
  [PERFIS.GESTOR]: ["dashboard", "treinamentos", "relatorios", "documentos"],
  [PERFIS.COORDENADOR]: [
    "dashboard",
    "treinamentos",
    "relatorios",
    "documentos",
  ],
  [PERFIS.SUPERVISOR]: [
    "dashboard",
    "treinamentos",
    "relatorios",
    "documentos",
  ],
  [PERFIS.ANALISTA]: [
    "dashboard",
    "relatorios",
    "documentos",
    "treinamentos",
    "operacao",
    "cftv",
    "solicitacoes_imagens",
    "quadra_seguranca",
    "analise_riscos",
    "plano_acao",
    "cadastros",
    "sistema",
    "logs",
  ],
  [PERFIS.OPERADOR]: [
    "dashboard",
    "relatorios",
    "documentos",
    "operacao",
    "controle_operacional",
    "cftv",
    "solicitacoes_imagens",
    "quadra_seguranca",
    "cadastros",
    "sistema",
  ],
  [PERFIS.PORTARIA]: ["treinamentos"],
  [PERFIS.CADASTRO]: ["treinamentos"],
  [PERFIS.TECNICO_MANUTENCAO]: ["cftv"],
};

export const acessoTotal = [PERFIS.SUPER_ADMIN, PERFIS.ADMINISTRADOR];
export const acessoAnalise = [
  PERFIS.SUPER_ADMIN,
  PERFIS.ADMINISTRADOR,
  PERFIS.ANALISTA,
];
export const acessoTreinamentosTerminal = [
  PERFIS.SUPER_ADMIN,
  PERFIS.ADMINISTRADOR,
  PERFIS.ANALISTA,
  PERFIS.PORTARIA,
];
export const acessoIntegracoesTerminal = [
  PERFIS.SUPER_ADMIN,
  PERFIS.ADMINISTRADOR,
  PERFIS.ANALISTA,
  PERFIS.PORTARIA,
  PERFIS.CADASTRO,
];
export const acessoPainelTreinamentos = [
  PERFIS.SUPER_ADMIN,
  PERFIS.ADMINISTRADOR,
  PERFIS.GESTOR,
  PERFIS.COORDENADOR,
  PERFIS.SUPERVISOR,
];
export const acessoRelatorios = [
  PERFIS.SUPER_ADMIN,
  PERFIS.ADMINISTRADOR,
  PERFIS.ANALISTA,
  PERFIS.OPERADOR,
  PERFIS.TECNICO_MANUTENCAO,
];
export const acessoCftvOperacional = [
  PERFIS.SUPER_ADMIN,
  PERFIS.ADMINISTRADOR,
  PERFIS.ANALISTA,
  PERFIS.OPERADOR,
];
export const acessoManutencao = [
  PERFIS.SUPER_ADMIN,
  PERFIS.ADMINISTRADOR,
  PERFIS.TECNICO_MANUTENCAO,
];
