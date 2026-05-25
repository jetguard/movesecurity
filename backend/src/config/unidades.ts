export const UNIDADES_SISTEMA = [
  "GJA-T1",
  "GJA-T2",
  "ITAJAÍ-SC",
  "SUAPE-T1",
  "SUAPE-T2",
  "ANHANGUERA",
];

export function normalizarUnidadesPermitidas(unidades: unknown, unidadePadrao?: string | null) {
  let lista: string[] = [];

  if (Array.isArray(unidades)) {
    lista = unidades.map(String);
  } else if (typeof unidades === "string" && unidades.trim()) {
    try {
      const parsed = JSON.parse(unidades);
      lista = Array.isArray(parsed) ? parsed.map(String) : [unidades];
    } catch {
      lista = unidades.split(",").map((unidade) => unidade.trim());
    }
  }

  const normalizadas = lista
    .map((unidade) => unidade.trim() === "ITAJAI-SC" ? "ITAJAÍ-SC" : unidade.trim())
    .filter((unidade) => UNIDADES_SISTEMA.includes(unidade));

  if (normalizadas.length === 0 && unidadePadrao) {
    normalizadas.push(unidadePadrao === "ITAJAI-SC" ? "ITAJAÍ-SC" : unidadePadrao);
  }

  return Array.from(new Set(normalizadas.length > 0 ? normalizadas : ["GJA-T1"]));
}

export function serializarUnidadesPermitidas(unidades: unknown, unidadePadrao?: string | null) {
  return JSON.stringify(normalizarUnidadesPermitidas(unidades, unidadePadrao));
}
