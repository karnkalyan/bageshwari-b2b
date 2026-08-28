import type { Prisma } from "@prisma/client";

export async function nextDocumentNumber(
  tx: Prisma.TransactionClient,
  sellerId: string,
  entityType: string,
  prefix: string,
) {
  const year = new Date().getFullYear();
  const sequence = await tx.numberSequence.upsert({
    where: { sellerId_entityType: { sellerId, entityType: `${entityType}-${year}` } },
    update: { lastNumber: { increment: 1 }, prefix, padLength: 6 },
    create: { sellerId, entityType: `${entityType}-${year}`, prefix, lastNumber: 1, padLength: 6 },
  });
  return `${prefix}-${year}-${String(sequence.lastNumber).padStart(sequence.padLength, "0")}`;
}
