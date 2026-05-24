export const PERFIS = {
  SUPER_ADMIN: "SUPER_ADMIN",
  ADMINISTRADOR: "ADMINISTRADOR",
  ANALISTA: "ANALISTA",
  OPERADOR: "OPERADOR",
};

export type UsuarioLocal = {
  id: number;
  nome: string;
  apelido?: string;
  email: string;
  perfilAcesso?: string;
  unidade?: string;
  fotoPerfil?: string;
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

export const podeAnalisar = () =>
  temPerfil([PERFIS.SUPER_ADMIN, PERFIS.ADMINISTRADOR, PERFIS.ANALISTA]);

export const podeVerLogs = () =>
  temPerfil([PERFIS.SUPER_ADMIN, PERFIS.ADMINISTRADOR, PERFIS.ANALISTA]);

export const podeGerenciarRiscos = () =>
  temPerfil([PERFIS.SUPER_ADMIN, PERFIS.ADMINISTRADOR, PERFIS.ANALISTA]);

export const podeTrocarAmbiente = () =>
  temPerfil([PERFIS.SUPER_ADMIN, PERFIS.ADMINISTRADOR, PERFIS.ANALISTA]);

