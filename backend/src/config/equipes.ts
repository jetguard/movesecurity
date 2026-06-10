export const ESCALAS_EQUIPES = {
  "Equipe A": {
    inicio: "07:00",
    fim: "15:20",
    escala: "07:00 às 15:20",
    tipo: "Fixa",
  },
  "Equipe B": {
    inicio: "15:00",
    fim: "23:20",
    escala: "15:00 às 23:20",
    tipo: "Fixa",
  },
  "Equipe C": {
    inicio: "23:00",
    fim: "07:20",
    escala: "23:00 às 07:20",
    tipo: "Fixa",
  },
  "Equipe D": {
    inicio: null,
    fim: null,
    escala: "Escala rotativa",
    tipo: "Rotativa",
  },
} as const;

export type EquipeOperacional = keyof typeof ESCALAS_EQUIPES;
export type EquipeFixa = Exclude<EquipeOperacional, "Equipe D">;

export function equipeFixaValida(equipe?: string | null): equipe is EquipeFixa {
  return equipe === "Equipe A" || equipe === "Equipe B" || equipe === "Equipe C";
}

export function escalaEquipe(equipe?: string | null, equipeCoberta?: string | null) {
  if (equipe === "Equipe D") {
    if (equipeFixaValida(equipeCoberta)) {
      return `Escala rotativa cobrindo ${equipeCoberta} (${ESCALAS_EQUIPES[equipeCoberta].escala})`;
    }
    return "Escala rotativa para cobertura de folgas";
  }

  if (equipe && equipe in ESCALAS_EQUIPES) {
    return ESCALAS_EQUIPES[equipe as EquipeOperacional].escala;
  }

  return "Horário não identificado";
}

export function equipeDoHorario(data: Date): EquipeFixa {
  const minutos = data.getHours() * 60 + data.getMinutes();
  if (minutos >= 15 * 60 && minutos < 23 * 60) return "Equipe B";
  if (minutos >= 23 * 60 || minutos < 7 * 60) return "Equipe C";
  return "Equipe A";
}
