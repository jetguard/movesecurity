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

export type UsuarioLocal = {
  id: number;
  nome: string;
  apelido?: string;
  email: string;
  perfilAcesso?: string;
  validadorOperacional?: boolean;
  mediadorOperacional?: boolean;
  equipe?: string;
  unidade?: string;
  unidadesPermitidas?: string[];
  permissoesModulos?: string[];
  permissoesAcoes?: PermissaoModulo[];
  fotoPerfil?: string;
  deveAlterarSenha?: boolean;
};

export type AcaoAcesso =
  | "leitura"
  | "indicadores"
  | "criar"
  | "editar"
  | "excluir";

export type PermissaoModulo = {
  modulo: string;
  leitura: boolean;
  indicadores?: boolean;
  criar: boolean;
  editar: boolean;
  excluir: boolean;
};

export const MODULOS_ACESSO = [
  { chave: "dashboard", nome: "Dashboard" },
  { chave: "indicadores_seguranca_empresarial", nome: "Indicadores Segurança Empresarial" },
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
  [PERFIS.ADMINISTRADOR]: MODULOS_ACESSO.map((item) => item.chave),
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
    "controle_operacional",
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

export function usuarioAtual(): UsuarioLocal | null {
  const raw = localStorage.getItem("usuario");
  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function perfilAtual() {
  return usuarioAtual()?.perfilAcesso || PERFIS.OPERADOR;
}

export function usuarioValidadorOperacional() {
  return Boolean(usuarioAtual()?.validadorOperacional);
}

export function temPerfil(perfis: string[]) {
  return perfis.includes(perfilAtual());
}

export function permissoesModulosAtual() {
  const usuario = usuarioAtual();
  if (!usuario) return [];
  if (
    usuario.perfilAcesso === PERFIS.SUPER_ADMIN ||
    usuario.perfilAcesso === PERFIS.TI
  ) {
    return MODULOS_ACESSO.map((item) => item.chave);
  }
  if (Array.isArray(usuario.permissoesAcoes)) {
    return usuario.permissoesAcoes.map((permissao) => permissao.modulo);
  }
  if (Array.isArray(usuario.permissoesModulos)) {
    return usuario.permissoesModulos;
  }
  return [];
}

function moduloCorresponde(permissaoModulo: string, moduloSolicitado: string) {
  return (
    permissaoModulo === moduloSolicitado ||
    (permissaoModulo === "operacao" &&
      moduloSolicitado.startsWith("operacao_")) ||
    (permissaoModulo === "treinamentos" &&
      moduloSolicitado.startsWith("treinamentos_"))
  );
}

export function permissoesAcoesAtual() {
  const usuario = usuarioAtual();
  if (!usuario) return [];
  if (
    usuario.perfilAcesso === PERFIS.SUPER_ADMIN ||
    usuario.perfilAcesso === PERFIS.TI
  ) {
    return permissoesCompletas(MODULOS_ACESSO.map((item) => item.chave));
  }
  if (Array.isArray(usuario.permissoesAcoes)) {
    return usuario.permissoesAcoes;
  }
  return [];
}

export function temModulo(modulo: string) {
  if (perfilAtual() === PERFIS.SUPER_ADMIN || perfilAtual() === PERFIS.TI)
    return true;
  return permissoesModulosAtual().some((permissaoModulo) =>
    moduloCorresponde(permissaoModulo, modulo),
  );
}

export function podeNoModulo(modulo: string, acao: AcaoAcesso = "leitura") {
  if (perfilAtual() === PERFIS.SUPER_ADMIN || perfilAtual() === PERFIS.TI)
    return true;
  return permissoesAcoesAtual().some(
    (permissao) =>
      moduloCorresponde(permissao.modulo, modulo) && Boolean(permissao[acao]),
  );
}

export function modulosDosPerfis(perfis: string[]) {
  const modulos = new Set<string>();
  for (const perfil of perfis) {
    (PERFIS_POR_MODULO[perfil] || []).forEach((modulo) =>
      modulos.add(modulo),
    );
  }
  return Array.from(modulos);
}

export function temPerfilOuModulo(perfis: string[], modulo?: string) {
  if (perfilAtual() === PERFIS.SUPER_ADMIN || perfilAtual() === PERFIS.TI)
    return true;
  if (modulo && podeNoModulo(modulo, "leitura")) return true;
  if (!modulo && temPerfil(perfis)) return true;
  return false;
}

export const podeAdministrar = () =>
  temPerfil([PERFIS.SUPER_ADMIN]) ||
  podeNoModulo("usuarios", "criar") ||
  podeNoModulo("usuarios", "editar") ||
  podeNoModulo("usuarios", "excluir") ||
  podeNoModulo("configuracoes", "editar");

export const podeSuperAdmin = () => temPerfil([PERFIS.SUPER_ADMIN, PERFIS.TI]);

export const podeAnalisar = () =>
  temPerfil([PERFIS.SUPER_ADMIN]) ||
  podeNoModulo("analise_riscos", "criar") ||
  podeNoModulo("analise_riscos", "editar") ||
  podeNoModulo("analise_riscos", "excluir");

export const podeVerLogs = () =>
  temPerfil([PERFIS.SUPER_ADMIN]) || podeNoModulo("logs", "leitura");

export const podeGerenciarRiscos = () =>
  temPerfil([PERFIS.SUPER_ADMIN]) ||
  temModulo("analise_riscos") ||
  temModulo("plano_acao");

export const podeVerNaturezas = () =>
  temPerfil([PERFIS.SUPER_ADMIN]) || temModulo("cadastros");

export const podeAtenderManutencao = () =>
  temPerfil([PERFIS.SUPER_ADMIN]) ||
  podeNoModulo("cftv", "criar") ||
  podeNoModulo("cftv", "editar") ||
  podeNoModulo("cftv", "excluir");

export const somenteTecnicoManutencao = () =>
  temPerfil([PERFIS.TECNICO_MANUTENCAO]);

export function unidadesPermitidasUsuario() {
  const usuario = usuarioAtual();
  if (!usuario) return ["GJA-T1"];

  if (
    usuario.perfilAcesso === PERFIS.SUPER_ADMIN ||
    usuario.perfilAcesso === PERFIS.TI
  ) {
    return [
      "GJA-T1",
      "GJA-T2",
      "ITAJAÍ-SC",
      "SUAPE-T1",
      "SUAPE-T2",
      "ANHANGUERA",
    ];
  }

  const unidades =
    Array.isArray(usuario.unidadesPermitidas) &&
    usuario.unidadesPermitidas.length > 0
      ? usuario.unidadesPermitidas
      : [usuario.unidade || "GJA-T1"];

  return Array.from(
    new Set(
      unidades.map((unidade) =>
        unidade === "ITAJAI-SC" ? "ITAJAÍ-SC" : unidade,
      ),
    ),
  );
}

export const podeTrocarAmbiente = () => unidadesPermitidasUsuario().length > 1;
