import type { Prisma } from "@prisma/client";

export async function nextDocumentNumber(
  tx: Prisma.TransactionClient,
  sellerId: string,
  entityType: string,
  prefix: string,
) {
  const year = new Date().getFullYear();
  const cleanBasePrefix = prefix.replace(/[-_\s]+$/g, "");
  const sequence = await tx.numberSequence.upsert({
    where: { sellerId_entityType: { sellerId, entityType: `${entityType}-${year}` } },
    update: { lastNumber: { increment: 1 }, prefix: cleanBasePrefix, padLength: 6 },
    create: { sellerId, entityType: `${entityType}-${year}`, prefix: cleanBasePrefix, lastNumber: 1, padLength: 6 },
  });
  const cleanPrefix = (sequence.prefix || cleanBasePrefix || "DOC").replace(/[-_\s]+$/g, "");
  return `${cleanPrefix}-${year}-${String(sequence.lastNumber).padStart(sequence.padLength, "0")}`;
}
