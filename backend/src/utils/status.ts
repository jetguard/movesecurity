export const STATUS_REGISTRO = {
  ABERTO: "Aberto",
  EM_ANALISE: "Em Analise",
  CONCLUIDO: "Concluido",
  CANCELADO: "Cancelado",
};

export const STATUS_WORKFLOW = {
  EM_ELABORACAO: "Em Elaboracao",
  AGUARDANDO_REVISAO: "Aguardando Revisao",
  EM_REVISAO: "Em Revisao",
  APROVADO: "Aprovado",
  DEVOLVIDO: "Devolvido",
};

export const STATUS_TAREFA = {
  PENDENTE: "Pendente",
  EM_ANDAMENTO: "Em andamento",
  CONCLUIDO: "Concluido",
  ATRASADO: "Atrasado",
};

export function estaAprovado(registro: { fluxoStatus?: string | null }) {
  return registro.fluxoStatus === STATUS_WORKFLOW.APROVADO;
}

