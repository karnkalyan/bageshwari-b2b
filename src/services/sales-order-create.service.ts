import "server-only";

import { Prisma, OrderStatus, OrderSource } from "@prisma/client";
import { prisma } from "@/lib/db";
import { TransitionActor } from "@/modules/orders/order-transition.service";
import { sendWorkflowNotification } from "@/services/notification.service";
import { formatCurrency } from "@/lib/utils";
import { resolveProductVat } from "@/services/vat.service";

async function nextOrderNumber(tx: Prisma.TransactionClient, sellerId: string) {
  const sequence = await tx.numberSequence.upsert({
    where: { sellerId_entityType: { sellerId, entityType: "ORDER" } },
    update: { lastNumber: { increment: 1 } },
    create: { sellerId, entityType: "ORDER", prefix: "SO", lastNumber: 1, padLength: 5 },
  });

  return `${sequence.prefix}-${String(sequence.lastNumber).padStart(sequence.padLength, "0")}`;
}

export type SalesOrderItemInput = {
  productId: string;
  variantId?: string | null;
  sku: string;
  productName: string;
  variantName?: string | null;
  quantity: number;
  unitPrice: number;
  mrp?: number;
  discountAmount?: number;
  remarks?: string;
};

export type CreateSalesOrderInput = {
  sellerId: string;
  dealerId: string;
  createdById: string;
  actor: TransitionActor;
  items: SalesOrderItemInput[];
  notes?: string;
  freightTotal?: number;
  submitForReview?: boolean;
  source?: OrderSource;
};

export async function createSalesOrderForDealer(input: CreateSalesOrderInput) {
  return prisma.$transaction(async (tx) => {
    // 1. Verify dealer
    const dealer = await tx.dealer.findFirst({
      where: { id: input.dealerId, sellerId: input.sellerId },
      include: {
        creditProfile: true,
        addresses: { where: { isDefault: true }, take: 1 },
      },
    });

    if (!dealer) throw new Error("DEALER_NOT_FOUND");
    if (input.items.length === 0) throw new Error("NO_ITEMS_SPECIFIED");

    // 2. Generate Order Number
    const orderNumber = await nextOrderNumber(tx, input.sellerId);

    // 3. Compute Line Items & Totals with verified variant IDs & MRPs
    const processedItems: any[] = [];
    let subtotal = 0;
    let discountTotal = 0;

    for (const it of input.items) {
      let resolvedVariantId = it.variantId;

      if (!resolvedVariantId) {
        const product = await tx.product.findUnique({
          where: { id: it.productId },
          include: { variants: { take: 1 } },
        });
        if (product && product.variants[0]) {
          resolvedVariantId = product.variants[0].id;
        } else {
          // If no variant exists, create a default variant for product
          const defaultVar = await tx.productVariant.create({
            data: {
              sellerId: input.sellerId,
              productId: it.productId,
              name: "Default",
              sku: `${it.sku}-DEF`,
              mrp: new Prisma.Decimal(it.mrp || it.unitPrice),
            },
          });
          resolvedVariantId = defaultVar.id;
        }
      }

      const vatInfo = await resolveProductVat(input.sellerId, it.productId);
      const effectiveVatRate = (vatInfo?.vatPercent ?? 13.0) / 100;
      const itemMrp = it.mrp !== undefined && it.mrp > 0 ? it.mrp : it.unitPrice;
      const lineSubtotal = it.unitPrice * it.quantity - (it.discountAmount || 0);
      const lineTax = Number((lineSubtotal * effectiveVatRate).toFixed(2));
      const lineTotal = Number((lineSubtotal + lineTax).toFixed(2));

      subtotal += it.unitPrice * it.quantity;
      discountTotal += it.discountAmount || 0;

      processedItems.push({
        sellerId: input.sellerId,
        productId: it.productId,
        variantId: resolvedVariantId,
        sku: it.sku,
        productName: it.productName,
        variantName: it.variantName || null,
        status: "ACTIVE",
        originalQuantity: new Prisma.Decimal(it.quantity),
        approvedQuantity: new Prisma.Decimal(it.quantity),
        mrp: new Prisma.Decimal(itemMrp),
        dealerPrice: new Prisma.Decimal(it.unitPrice),
        discountAmount: new Prisma.Decimal(it.discountAmount || 0),
        taxAmount: new Prisma.Decimal(lineTax),
        lineTotal: new Prisma.Decimal(lineTotal),
        accountsRemarks: it.remarks || null,
      });
    }

    const netSubtotal = subtotal - discountTotal;
    const taxTotal = processedItems.reduce((sum, item) => sum + Number(item.taxAmount), 0);
    const freightTotal = input.freightTotal || 0;
    const grandTotal = Number((netSubtotal + taxTotal + freightTotal).toFixed(2));

    const initialStatus: OrderStatus = input.submitForReview
      ? "PENDING_ACCOUNTS_REVIEW"
      : "DRAFT";

    // 4. Create Order
    const order = await tx.order.create({
      data: {
        sellerId: input.sellerId,
        dealerId: input.dealerId,
        orderNumber,
        source: input.source || OrderSource.SALESPERSON_PORTAL,
        status: initialStatus,
        currencyCode: "NPR",
        subtotal: new Prisma.Decimal(subtotal),
        discountTotal: new Prisma.Decimal(discountTotal),
        taxTotal: new Prisma.Decimal(taxTotal),
        freightTotal: new Prisma.Decimal(freightTotal),
        grandTotal: new Prisma.Decimal(grandTotal),
        salespersonNotes: input.notes,
        createdById: input.createdById,
        items: {
          create: processedItems,
        },
      },
      include: {
        dealer: true,
        items: true,
      },
    });

    // 5. Record History
    await tx.orderStatusHistory.create({
      data: {
        sellerId: input.sellerId,
        orderId: order.id,
        toStatus: initialStatus,
        changedById: input.createdById,
        remarks: input.submitForReview
          ? "Sales order created and submitted for Accounts review by sales representative."
          : "Sales order created as draft by sales representative.",
      },
    });

    // 6. Send Cross-Role Notifications
    const seller = await tx.seller.findUnique({
      where: { id: input.sellerId },
      select: { slug: true },
    });
    const sellerSlug = seller?.slug || "bageshwari";

    if (input.submitForReview) {
      // Notify Accounts & Sales Management
      await sendWorkflowNotification({
        sellerId: input.sellerId,
        targetRoles: ["ACCOUNTANT", "ACCOUNTS_MANAGER", "ADMIN", "SUPER_ADMIN", "SALES_MANAGER"],
        title: `Sales Order Created: ${orderNumber}`,
        message: `Sales representative created order ${orderNumber} for ${dealer.tradingName || dealer.legalName} (${formatCurrency(grandTotal)}). Ready for review.`,
        linkUrl: `/s/${sellerSlug}/admin/orders/${order.id}`,
        excludeUserId: input.createdById,
      });

      // Notify Dealer
      await sendWorkflowNotification({
        sellerId: input.sellerId,
        targetDealerId: order.dealerId,
        title: `New Sales Order Placed: ${orderNumber}`,
        message: `A new order ${orderNumber} has been placed for your dealership by the sales team for ${formatCurrency(grandTotal)}.`,
        linkUrl: `/dealer/orders/${order.id}`,
        excludeUserId: input.createdById,
      });
    }

    return order;
  });
}
