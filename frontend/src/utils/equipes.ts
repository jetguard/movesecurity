export const ESCALAS_EQUIPES = {
  "Equipe A": "07:00 às 15:20",
  "Equipe B": "15:00 às 23:20",
  "Equipe C": "23:00 às 07:20",
  "Equipe D": "Escala rotativa para cobertura de folgas",
  Administrativo: "Jornada administrativa",
} as const;

export const EQUIPES_FIXAS = ["Equipe A", "Equipe B", "Equipe C"] as const;

export function descricaoEquipe(equipe?: string | null, equipeCoberta?: string | null) {
  if (equipe === "Equipe D") {
    return equipeCoberta
      ? `Cobertura da ${equipeCoberta} - ${ESCALAS_EQUIPES[equipeCoberta as keyof typeof ESCALAS_EQUIPES]}`
      : ESCALAS_EQUIPES["Equipe D"];
  }

  return equipe && equipe in ESCALAS_EQUIPES
    ? ESCALAS_EQUIPES[equipe as keyof typeof ESCALAS_EQUIPES]
    : "Horário não definido";
}
