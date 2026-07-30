export const PERFIS = {
  SUPER_ADMIN: "SUPER_ADMIN",
  ADMINISTRADOR: "ADMINISTRADOR",
  GESTOR: "GESTOR",
  COORDENADOR: "COORDENADOR",
  SUPERVISOR: "SUPERVISOR",
  ANALISTA: "ANALISTA",
  OPERADOR: "OPERADOR",
  PORTARIA: "PORTARIA",
  TECNICO_MANUTENCAO: "TECNICO_MANUTENCAO",
};

export type UsuarioLocal = {
  id: number;
  nome: string;
  apelido?: string;
  email: string;
  perfilAcesso?: string;
  equipe?: string;
  unidade?: string;
  unidadesPermitidas?: string[];
  fotoPerfil?: string;
  deveAlterarSenha?: boolean;
};

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

export function temPerfil(perfis: string[]) {
  return perfis.includes(perfilAtual());
}

export const podeAdministrar = () =>
  temPerfil([PERFIS.SUPER_ADMIN, PERFIS.ADMINISTRADOR]);

export const podeSuperAdmin = () => temPerfil([PERFIS.SUPER_ADMIN]);

export const podeAnalisar = () =>
  temPerfil([PERFIS.SUPER_ADMIN, PERFIS.ADMINISTRADOR, PERFIS.ANALISTA]);

export const podeVerLogs = () =>
  temPerfil([PERFIS.SUPER_ADMIN, PERFIS.ADMINISTRADOR, PERFIS.ANALISTA]);

export const podeGerenciarRiscos = () =>
  temPerfil([PERFIS.SUPER_ADMIN, PERFIS.ADMINISTRADOR, PERFIS.ANALISTA]);

export const podeVerNaturezas = () =>
  temPerfil([
    PERFIS.SUPER_ADMIN,
    PERFIS.ADMINISTRADOR,
    PERFIS.ANALISTA,
    PERFIS.OPERADOR,
  ]);

export const podeAtenderManutencao = () =>
  temPerfil([
    PERFIS.SUPER_ADMIN,
    PERFIS.ADMINISTRADOR,
    PERFIS.TECNICO_MANUTENCAO,
  ]);

export const somenteTecnicoManutencao = () =>
  temPerfil([PERFIS.TECNICO_MANUTENCAO]);

export function unidadesPermitidasUsuario() {
  const usuario = usuarioAtual();
  if (!usuario) return ["GJA-T1"];

  if (usuario.perfilAcesso === PERFIS.SUPER_ADMIN) {
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
