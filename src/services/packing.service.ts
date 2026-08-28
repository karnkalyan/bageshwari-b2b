import "server-only";
import { prisma } from "@/lib/db";
import { transitionOrderStatusInTransaction, type TransitionActor } from "@/modules/orders/order-transition.service";
import { nextDocumentNumber } from "@/services/number-sequence.service";

export async function createPackage(input: { sellerId: string; orderId: string; weight: number; length?: number; width?: number; height?: number; packageType?: string; handlingInstructions?: string; items?: unknown; finalize?: boolean; actor: TransitionActor }) {
  if (!Number.isFinite(input.weight) || input.weight <= 0) throw new Error("PACKAGE_WEIGHT_INVALID");
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findFirst({ where: { id: input.orderId, sellerId: input.sellerId } });
    if (!order) throw new Error("ORDER_NOT_FOUND");
    if (["PAID", "CREDIT_APPROVED"].includes(order.status)) await transitionOrderStatusInTransaction(tx, { sellerId: input.sellerId, orderId: order.id, targetStatus: "PACKING_IN_PROGRESS", actor: input.actor, reason: "Packing started" });
    else if (order.status !== "PACKING_IN_PROGRESS") throw new Error("ORDER_NOT_READY_FOR_PACKING");
    const packageNumber = await nextDocumentNumber(tx, input.sellerId, "PACKAGE", "PKG");
    const packed = await tx.package.create({ data: { sellerId: input.sellerId, orderId: order.id, packageNumber, packageType: input.packageType, length: input.length, width: input.width, height: input.height, weight: input.weight, status: "LABELLED", packedById: input.actor.userId, packingDate: new Date(), barcodeData: packageNumber, qrCodeData: `${order.orderNumber}:${packageNumber}`, handlingInstructions: input.handlingInstructions, itemsJson: input.items ? JSON.stringify(input.items) : null } });
    await tx.auditLog.create({ data: { sellerId: input.sellerId, userId: input.actor.userId, action: "package.created", entity: "Package", entityId: packed.id, newValue: JSON.stringify({ packageNumber, weight: input.weight }), severity: "LOW" } });
    if (input.finalize) {
      await transitionOrderStatusInTransaction(tx, { sellerId: input.sellerId, orderId: order.id, targetStatus: "PACKED", actor: input.actor, reason: "Packing completed" });
      await transitionOrderStatusInTransaction(tx, { sellerId: input.sellerId, orderId: order.id, targetStatus: "PACKED_AND_LABELLED", actor: input.actor, reason: "Package labels generated" });
    }
    return packed;
  });
}
