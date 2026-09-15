import type { Prisma } from "@prisma/client";

/**
 * Serializa a geração de numeração sequencial dentro de uma transação.
 * Usa advisory lock transacional do PostgreSQL; o lock é liberado
 * automaticamente ao final da transação.
 */
export async function travarSequencia(
  tx: Prisma.TransactionClient,
  chave: string,
) {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${chave})::bigint)`;
}
