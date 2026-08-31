import { PERFIS, perfilAtual } from "./permissoes";

export function apenasDigitosCpf(valor?: string | null) {
  return String(valor || "").replace(/\D/g, "");
}

export function formatarCpf(valor?: string | null) {
  const digitos = apenasDigitosCpf(valor).slice(0, 11);
  return digitos
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}

export function ocultarCpf(valor?: string | null) {
  const digitos = apenasDigitosCpf(valor);
  if (!digitos) return "";
  if (digitos.length !== 11) return "***";
  return `${digitos.slice(0, 3)}.***.***-${digitos.slice(9)}`;
}

export function cpfVisivelPorPerfil(valor?: string | null) {
  if (perfilAtual() === PERFIS.SUPER_ADMIN) {
    return formatarCpf(valor) || valor || "";
  }
  return ocultarCpf(valor);
}
