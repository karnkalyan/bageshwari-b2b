import "server-only";

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  TransitionActor,
  transitionOrderStatusInTransaction,
} from "@/modules/orders/order-transition.service";
import { sendWorkflowNotification } from "@/services/notification.service";

export type ReviseOrderItemInput = {
  orderItemId: string;
  revisedQuantity?: number;
  revisedPrice?: number;
  discountAmount?: number;
  accountsRemarks?: string;
};

export type ReviseOrderBulkInput = {
  sellerId: string;
  orderId: string;
  userId: string;
  actor: TransitionActor;
  items: ReviseOrderItemInput[];
  generalRemarks?: string;
  sendToDealer?: boolean;
};

export async function reviseOrderBulk(input: ReviseOrderBulkInput) {
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findFirst({
      where: { id: input.orderId, sellerId: input.sellerId },
      include: {
        items: true,
        revisions: { orderBy: { version: "desc" }, take: 1 },
      },
    });

    if (!order) throw new Error("ORDER_NOT_FOUND");

    const latestRevision = order.revisions[0];
    const revisionVersion = (latestRevision?.version || 0) + 1;
    const revisionStatus = input.sendToDealer ? "SENT_TO_DEALER" : "PENDING";

    const revisionItemsData: any[] = [];

    // Process each item modification
    for (const itemInput of input.items) {
      const existingItem = order.items.find((it) => it.id === itemInput.orderItemId);
      if (!existingItem) continue;

      const previousQuantity = Number(existingItem.approvedQuantity ?? existingItem.originalQuantity);
      const revisedQuantity = itemInput.revisedQuantity !== undefined ? itemInput.revisedQuantity : previousQuantity;
      const previousPrice = existingItem.dealerPrice;
      const revisedPrice = itemInput.revisedPrice !== undefined ? new Prisma.Decimal(itemInput.revisedPrice) : previousPrice;
      const discount = itemInput.discountAmount !== undefined ? new Prisma.Decimal(itemInput.discountAmount) : existingItem.discountAmount;

      const lineSubtotal = Number(revisedPrice) * revisedQuantity - Number(discount);
      const lineTax = lineSubtotal * 0.13;
      const lineTotal = lineSubtotal + lineTax;

      let changeType = "MODIFIED";
      if (revisedQuantity === 0) changeType = "REMOVED";
      else if (revisedQuantity !== previousQuantity && Number(revisedPrice) !== Number(previousPrice)) changeType = "QTY_AND_PRICE_CHANGED";
      else if (revisedQuantity !== previousQuantity) changeType = "QUANTITY_CHANGED";
      else if (Number(revisedPrice) !== Number(previousPrice)) changeType = "PRICE_CHANGED";

      revisionItemsData.push({
        sellerId: input.sellerId,
        orderItemId: existingItem.id,
        previousQuantity: new Prisma.Decimal(previousQuantity),
        revisedQuantity: new Prisma.Decimal(revisedQuantity),
        previousPrice,
        revisedPrice,
        changeType,
        reason: itemInput.accountsRemarks || input.generalRemarks || "Revised during accounts review",
      });

      await tx.orderItem.update({
        where: { id: existingItem.id },
        data: {
          approvedQuantity: new Prisma.Decimal(revisedQuantity),
          dealerPrice: revisedPrice,
          discountAmount: discount,
          taxAmount: new Prisma.Decimal(lineTax),
          lineTotal: new Prisma.Decimal(lineTotal),
          status: revisedQuantity === 0 ? "REMOVED" : "REVISED",
          accountsRemarks: itemInput.accountsRemarks || existingItem.accountsRemarks,
        },
      });
    }

    // Recalculate order totals from updated items
    const allCurrentItems = await tx.orderItem.findMany({
      where: { orderId: order.id, sellerId: input.sellerId },
    });

    const activeItems = allCurrentItems.filter((it) => it.status !== "REMOVED");
    const subtotal = activeItems.reduce((acc, it) => acc + Number(it.dealerPrice) * Number(it.approvedQuantity ?? it.originalQuantity), 0);
    const discountTotal = activeItems.reduce((acc, it) => acc + Number(it.discountAmount), 0);
    const taxTotal = activeItems.reduce((acc, it) => acc + Number(it.taxAmount), 0);
    const freightTotal = Number(order.freightTotal);
    const grandTotal = Number((subtotal - discountTotal + taxTotal + freightTotal).toFixed(2));

    const revision = await tx.orderRevision.create({
      data: {
        sellerId: input.sellerId,
        orderId: order.id,
        version: revisionVersion,
        status: revisionStatus,
        previousSubtotal: order.subtotal,
        previousGrandTotal: order.grandTotal,
        revisedSubtotal: new Prisma.Decimal(subtotal),
        revisedGrandTotal: new Prisma.Decimal(grandTotal),
        generalRemarks: input.generalRemarks,
        createdById: input.userId,
        sentToDealerAt: input.sendToDealer ? new Date() : null,
        items: { create: revisionItemsData },
      },
      include: { items: true },
    });

    await tx.order.update({
      where: { id: order.id },
      data: {
        subtotal: new Prisma.Decimal(subtotal),
        discountTotal: new Prisma.Decimal(discountTotal),
        taxTotal: new Prisma.Decimal(taxTotal),
        grandTotal: new Prisma.Decimal(grandTotal),
        accountsNotes: input.generalRemarks,
      },
    });

    // If sendToDealer is requested, advance status to WAITING_FOR_DEALER_CONFIRMATION
    if (input.sendToDealer && order.status !== "WAITING_FOR_DEALER_CONFIRMATION") {
      await transitionOrderStatusInTransaction(tx, {
        sellerId: input.sellerId,
        orderId: order.id,
        targetStatus: "WAITING_FOR_DEALER_CONFIRMATION",
        actor: input.actor,
        reason: input.generalRemarks || "Order revised by accounts and sent for dealer confirmation.",
      });
    }

    // Send notifications
    if (input.sendToDealer) {
      await sendWorkflowNotification({
        sellerId: input.sellerId,
        targetDealerId: order.dealerId,
        title: `Order Revision: ${order.orderNumber}`,
        message: `Accounts team revised order ${order.orderNumber}. Please review the updated quantities & rates and re-confirm.`,
        linkUrl: `/dealer/orders/${order.id}`,
        excludeUserId: input.userId,
      });
    }

    return {
      orderId: order.id,
      revisionId: revision.id,
      version: revision.version,
      subtotal,
      taxTotal,
      grandTotal,
      status: revision.status,
    };
  });
}
