import type { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";

/**
 * Serializa a geração de numeração sequencial dentro de uma transação.
 * Substitui o pg_advisory_xact_lock do Postgres (sem equivalente direto no
 * MySQL): usa a tabela SequenciaControle como linha de lock via
 * `SELECT ... FOR UPDATE`, liberado automaticamente ao fim da transação.
 *
 * O INSERT IGNORE roda fora da transação (autocommit), garantindo que a
 * linha já exista, commitada, antes do FOR UPDATE. Rodar as duas coisas
 * dentro da mesma transação causa deadlock no InnoDB quando várias
 * transações disputam simultaneamente a criação da mesma linha nova
 * (insert-intention lock) — confirmado em teste de concorrência local.
 */
export async function travarSequencia(
  tx: Prisma.TransactionClient,
  chave: string,
) {
  await prisma.$executeRaw`INSERT IGNORE INTO SequenciaControle (chave) VALUES (${chave})`;
  await tx.$queryRaw`SELECT chave FROM SequenciaControle WHERE chave = ${chave} FOR UPDATE`;
}
