import "server-only";

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  TransitionActor,
  transitionOrderStatusInTransaction,
} from "@/modules/orders/order-transition.service";
import { sendWorkflowNotification } from "@/services/notification.service";

async function nextDocumentNumber(
  tx: Prisma.TransactionClient,
  sellerId: string,
  entityType: string,
  prefix: string,
) {
  const sequence = await tx.numberSequence.upsert({
    where: { sellerId_entityType: { sellerId, entityType } },
    update: { lastNumber: { increment: 1 } },
    create: { sellerId, entityType, prefix, lastNumber: 1, padLength: 5 },
  });

  return `${sequence.prefix}-${String(sequence.lastNumber).padStart(sequence.padLength, "0")}`;
}

export type ReviseOrderItemInput = {
  orderItemId: string;
  quantity?: number;
  revisedQuantity?: number;
  unitPrice?: number;
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
      const inputQty = itemInput.revisedQuantity !== undefined ? itemInput.revisedQuantity : itemInput.quantity;
      const revisedQuantity = inputQty !== undefined ? Number(inputQty) : previousQuantity;

      const previousPrice = existingItem.dealerPrice;
      const inputPrice = itemInput.revisedPrice !== undefined ? itemInput.revisedPrice : itemInput.unitPrice;
      const revisedPrice = inputPrice !== undefined ? new Prisma.Decimal(inputPrice) : previousPrice;

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
          originalQuantity: new Prisma.Decimal(revisedQuantity),
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

    // Also synchronize any existing Proforma Invoices to prevent stale rates/totals
    const existingProformas = await tx.proformaInvoice.findMany({
      where: { orderId: order.id, sellerId: input.sellerId },
      select: { id: true },
    });
    for (const pi of existingProformas) {
      await tx.proformaInvoice.update({
        where: { id: pi.id },
        data: {
          status: input.sendToDealer ? "GENERATED" : undefined,
          confirmedAt: input.sendToDealer ? null : undefined,
          confirmedById: input.sendToDealer ? null : undefined,
          subtotal: new Prisma.Decimal(subtotal),
          discountTotal: new Prisma.Decimal(discountTotal),
          taxTotal: new Prisma.Decimal(taxTotal),
          grandTotal: new Prisma.Decimal(grandTotal),
        },
      });
      await tx.proformaInvoiceItem.deleteMany({
        where: { proformaInvoiceId: pi.id },
      });
      if (activeItems.length > 0) {
        await tx.proformaInvoiceItem.createMany({
          data: activeItems.map((item) => ({
            sellerId: input.sellerId,
            proformaInvoiceId: pi.id,
            orderItemId: item.id,
            productId: item.productId,
            variantId: item.variantId,
            sku: item.sku,
            description: `${item.productName}${item.variantName ? ` - ${item.variantName}` : ""}`,
            quantity: item.approvedQuantity ?? item.originalQuantity,
            unitPrice: item.dealerPrice,
            discountAmount: item.discountAmount,
            taxAmount: item.taxAmount,
            lineTotal: item.lineTotal,
          })),
        });
      }
    }

    if (input.sendToDealer && existingProformas.length === 0) {
      const proformaNumber = await nextDocumentNumber(tx, input.sellerId, "PROFORMA", "PI");
      await tx.proformaInvoice.create({
        data: {
          sellerId: input.sellerId,
          orderId: order.id,
          proformaNumber,
          status: "GENERATED",
          subtotal: new Prisma.Decimal(subtotal),
          discountTotal: new Prisma.Decimal(discountTotal),
          taxTotal: new Prisma.Decimal(taxTotal),
          freightTotal: order.freightTotal,
          grandTotal: new Prisma.Decimal(grandTotal),
          paymentTerms: "Standard B2B Terms",
          generatedById: input.actor.userId,
          remarks: input.generalRemarks || "Updated Proforma Invoice generated for revised order resend.",
          items: {
            create: activeItems.map((item) => ({
              sellerId: input.sellerId,
              orderItemId: item.id,
              productId: item.productId,
              variantId: item.variantId,
              sku: item.sku,
              description: `${item.productName}${item.variantName ? ` - ${item.variantName}` : ""}`,
              quantity: item.approvedQuantity ?? item.originalQuantity,
              unitPrice: item.dealerPrice,
              discountAmount: item.discountAmount,
              taxAmount: item.taxAmount,
              lineTotal: item.lineTotal,
            })),
          },
        },
      });
    }

    // Synchronize existing Pick Lists if any item quantities changed
    const existingPickLists = await tx.pickList.findMany({
      where: { orderId: order.id, sellerId: input.sellerId },
      include: { items: true },
    });
    for (const pl of existingPickLists) {
      for (const plItem of pl.items) {
        const matchingOrderItem = allCurrentItems.find((oi) => oi.sku === plItem.sku || oi.variantId === plItem.variantId);
        if (matchingOrderItem) {
          const newQty = matchingOrderItem.approvedQuantity ?? matchingOrderItem.originalQuantity;
          await tx.pickListItem.update({
            where: { id: plItem.id },
            data: { approvedQuantity: newQty },
          });
        }
      }
    }

    // Synchronize pending Payment amount if it was generated for the old grand total
    await tx.payment.updateMany({
      where: { orderId: order.id, sellerId: input.sellerId, status: "PENDING" },
      data: { amount: new Prisma.Decimal(grandTotal) },
    });

    // If sendToDealer is requested, advance status to WAITING_FOR_DEALER_CONFIRMATION
    if (input.sendToDealer && order.status !== "WAITING_FOR_DEALER_CONFIRMATION") {
      try {
        await transitionOrderStatusInTransaction(tx, {
          sellerId: input.sellerId,
          orderId: order.id,
          targetStatus: "WAITING_FOR_DEALER_CONFIRMATION",
          actor: input.actor,
          reason: input.generalRemarks || "Order revised by accounts and sent for dealer confirmation.",
        });
      } catch {
        // Safe fallback direct update if status transition map does not directly connect
        await tx.order.update({
          where: { id: order.id },
          data: { status: "WAITING_FOR_DEALER_CONFIRMATION" },
        });
      }
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
