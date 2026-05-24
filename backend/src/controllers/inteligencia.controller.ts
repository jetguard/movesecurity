import { Response } from "express";
import { prisma } from "../lib/prisma";
import { AuthRequest } from "../middlewares/auth";

function contarPor<T>(itens: T[], chave: (item: T) => string | null | undefined) {
  return Object.entries(
    itens.reduce<Record<string, number>>((acc, item) => {
      const nome = chave(item) || "Nao informado";
      acc[nome] = (acc[nome] || 0) + 1;
      return acc;
    }, {})
  )
    .map(([nome, total]) => ({ nome, total }))
    .sort((a, b) => b.total - a.total);
}

function porMes(data: Date) {
  return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, "0")}`;
}

export async function obterInteligencia(req: AuthRequest, res: Response) {
  try {
    const [ocorrencias, eventos, riscos, investigacoes, estrategicas] = await Promise.all([
      prisma.ocorrencia.findMany({ where: { unidade: req.unidadeAtiva } }),
      prisma.evento.findMany({ where: { unidade: req.unidadeAtiva } }),
      prisma.analiseRisco.findMany({ where: { unidade: req.unidadeAtiva } }),
      prisma.investigacao.findMany({ where: { unidade: req.unidadeAtiva } }),
      prisma.analiseEstrategica.findMany({ where: { unidade: req.unidadeAtiva } }),
    ]);

    const registros = [
      ...ocorrencias.map((item) => ({ modulo: "Ocorrencia", local: item.local, natureza: item.natureza, data: item.dataOcorrencia, status: item.status })),
      ...eventos.map((item) => ({ modulo: "Evento", local: item.local, natureza: item.natureza, data: item.dataEvento, status: item.status })),
    ];

    const porLocal = contarPor(registros, (item) => item.local).slice(0, 8);
    const porNatureza = contarPor(registros, (item) => item.natureza).slice(0, 8);
    const porStatus = contarPor(registros, (item) => item.status);
    const riscosCriticos = riscos.filter((item) => ["Critico", "Crítico", "Alto"].includes(item.nivelRisco));
    const investigacoesAbertas = investigacoes.filter((item) => !["Concluido", "Concluído"].includes(item.status));

    const temporal = contarPor(registros, (item) => porMes(new Date(item.data))).sort((a, b) => a.nome.localeCompare(b.nome));
    const locaisCriticos = porLocal.filter((item) => item.total >= 3);
    const naturezasCriticas = porNatureza.filter((item) => item.total >= 3);

    const insights = [
      ...locaisCriticos.map((item) => ({
        tipo: "Local critico",
        titulo: `${item.nome} concentra ${item.total} registros`,
        recomendacao: "Avaliar reforco de controle, ronda, iluminacao, CFTV e procedimento local.",
        severidade: item.total >= 5 ? "alta" : "media",
      })),
      ...naturezasCriticas.map((item) => ({
        tipo: "Natureza recorrente",
        titulo: `${item.nome} aparece em ${item.total} registros`,
        recomendacao: "Criar plano preventivo especifico e acompanhar reincidencia no mes seguinte.",
        severidade: item.total >= 5 ? "alta" : "media",
      })),
      ...riscosCriticos.slice(0, 5).map((item) => ({
        tipo: "Risco relevante",
        titulo: `${item.codigo} - ${item.naturezaRisco} classificado como ${item.nivelRisco}`,
        recomendacao: "Priorizar plano de acao e validar prazo/responsavel.",
        severidade: item.nivelRisco.includes("Crit") ? "alta" : "media",
      })),
    ];

    return res.json({
      totais: {
        ocorrencias: ocorrencias.length,
        eventos: eventos.length,
        riscos: riscos.length,
        investigacoes: investigacoes.length,
        analisesEstrategicas: estrategicas.length,
        riscosCriticos: riscosCriticos.length,
        investigacoesAbertas: investigacoesAbertas.length,
      },
      porLocal,
      porNatureza,
      porStatus,
      temporal,
      insights,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro ao gerar inteligencia operacional" });
  }
}

