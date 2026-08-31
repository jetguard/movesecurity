import fs from "node:fs";
import { Writable } from "node:stream";
import { gerarAnaliseCompletaPdf } from "../backend/src/services/analiseCompletaPdf.service";

class PdfResponse extends Writable {
  private output = fs.createWriteStream("tmp/arc-pdf-test.pdf");

  setHeader() {
    return this;
  }

  _write(chunk: Buffer, encoding: BufferEncoding, callback: (error?: Error | null) => void) {
    this.output.write(chunk, encoding, callback);
  }

  _final(callback: (error?: Error | null) => void) {
    this.output.end(callback);
  }
}

const item = (codigo: string, nome: string) => ({ codigo, nome });
const analise = {
  id: 1,
  codigo: "ARC-0001/2026",
  unidade: "GJA-T1",
  macroProcessoCodigo: "MP001",
  macroProcessoNome: "Segurança Patrimonial",
  setorNome: "Balança",
  riscoCodigo: "R001",
  riscoNome: "Liberação indevida de contêiner",
  fatoresRisco: [
    { ...item("FR001", "Falha no sistema"), percentualTratativa: 100, planosTratativa: 1, planosConcluidos: 1 },
    { ...item("FR002", "Falta de controle"), percentualTratativa: 0, planosTratativa: 1, planosConcluidos: 0 },
  ],
  preventivos: [item("001", "Instalação de câmeras")],
  detectivos: [item("001", "Ronda operacional")],
  corretivos: [item("001", "Plano de resposta")],
  planosAcao: [
    {
      codigo: "PA0001/2026",
      titulo: "Tratar falha no sistema",
      fatorRiscoCodigo: "FR001",
      fatorRiscoNome: "Falha no sistema",
      prioridade: "Alta",
      status: "Concluido",
      percentual: 100,
      descricao: "Tratativa registrada para o fator de risco.",
      responsavelNome: "Administrador",
      mediadores: [item("", "Segurança Patrimonial")],
      prazo: new Date(),
      concluidoEm: new Date(),
      comentarios: "Evidências anexadas e ação concluída.",
    },
  ],
  totalFatoresTratativa: 2,
  fatoresConcluidosTratativa: 1,
  percentualConclusaoTratativa: 50,
  sc: 3,
  fe: 4,
  intervalo: 3,
  sse: 4,
  ope: 3,
  fin: 2,
  adm: 2,
  img: 3,
  lc: 2,
  notaProbabilidade: 40,
  mediaProbabilidade: 3.33,
  percentualProbabilidade: 0.67,
  nivelProbabilidade: "POSSÍVEL",
  notaConsequencia: 48,
  mediaConsequencia: 2.82,
  nivelConsequencia: "MAIOR",
  resultadoInerente: 9.39,
  classificacaoRisco: "MENOR",
  periodicidadeAcao: "Revisão a cada 12 meses",
  estrategiaTratamento: null,
  finalizacaoStatus: "Em Andamento",
  finalizacaoDecisao: "Mitigar",
  finalizacaoJustificativa: "Acompanhar planos vinculados antes da decisão final.",
  finalizacaoAprovadorNome: "Administrador",
  finalizadaEm: new Date(),
  notaProbabilidadeResidual: 37,
  probabilidadeResidual: 3.08,
  percentualProbabilidadeResidual: 0.62,
  nivelProbabilidadeResidual: "POSSÍVEL",
  notaConsequenciaResidual: 42,
  consequenciaResidual: 2.47,
  nivelConsequenciaResidual: "MODERADO",
  resultadoResidual: 7.61,
  classificacaoResidual: "MENOR",
  desempenhoProbabilidade: -0.08,
  desempenhoConsequencia: -0.12,
  desempenhoNivelRisco: -0.19,
  createdAt: new Date(),
  updatedAt: new Date(),
};

gerarAnaliseCompletaPdf(new PdfResponse() as any, analise);
