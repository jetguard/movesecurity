import { Response } from "express";
import { prisma } from "../lib/prisma";
import { AuthRequest } from "../middlewares/auth";

const niveis = ["Baixa", "Media", "Alta", "Critica"];

function normalizar(valor: string) {
  return valor
    .replace("Média", "Media")
    .replace("Crítica", "Critica")
    .replace("Crítica", "Critica")
    .replace("Média", "Media");
}

export async function obterMatrizRisco(req: AuthRequest, res: Response) {
  try {
    const riscos = await prisma.analiseRisco.findMany({
      where: { unidade: req.unidadeAtiva },
      orderBy: { createdAt: "desc" },
    });

    const matriz = niveis.flatMap((probabilidade) =>
      niveis.map((severidade) => {
        const itens = riscos.filter(
          (risco) =>
            normalizar(risco.probabilidade) === probabilidade &&
            normalizar(risco.severidade) === severidade,
        );
        return {
          probabilidade,
          severidade,
          total: itens.length,
          riscos: itens.map((risco) => ({
            id: risco.id,
            codigo: risco.codigo,
            naturezaRisco: risco.naturezaRisco,
            local: risco.local,
            nivelRisco: risco.nivelRisco,
            status: risco.status,
          })),
        };
      }),
    );

    return res.json({ niveis, matriz });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro ao gerar matriz de risco" });
  }
}
