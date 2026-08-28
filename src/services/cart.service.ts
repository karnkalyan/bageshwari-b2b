import "server-only";
import { prisma } from "@/lib/db";
import { resolveDealerPrice } from "@/services/pricing.service";
import { nextDocumentNumber } from "@/services/number-sequence.service";

export type AddToCartInput = {
  sellerId: string;
  dealerId: string;
  userId: string;
  productId: string;
  variantId?: string;
  quantity?: number;
};

export async function getDealerCart(sellerId: string, dealerId: string) {
  const draft = await prisma.order.findFirst({
    where: { sellerId, dealerId, status: "DRAFT" },
    include: {
      items: {
        where: { status: "ACTIVE" },
        include: {
          product: {
            select: {
              id: true,
              name: true,
              sku: true,
              unitCode: true,
              minimumOrderQuantity: true,
              images: { where: { isPrimary: true }, take: 1, select: { url: true } },
            },
          },
        },
        orderBy: { createdAt: "asc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return draft;
}

export async function getDealerCartItemCount(sellerId: string, dealerId?: string | null): Promise<number> {
  if (!dealerId) return 0;
  const draft = await prisma.order.findFirst({
    where: { sellerId, dealerId, status: "DRAFT" },
    select: {
      _count: {
        select: { items: { where: { status: "ACTIVE" } } },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return draft?._count.items ?? 0;
}

export async function addItemToDealerCart(input: AddToCartInput) {
  const quantity = Math.max(1, Number(input.quantity) || 1);

  const [product, dealer] = await Promise.all([
    prisma.product.findUnique({
      where: { id: input.productId, sellerId: input.sellerId },
      include: {
        variants: { where: { status: "ACTIVE", deletedAt: null } },
        prices: { where: { active: true } },
      },
    }),
    prisma.dealer.findFirst({
      where: { id: input.dealerId, sellerId: input.sellerId, status: "ACTIVE" },
      select: { id: true, dealerGroupId: true, pricingGroupId: true },
    }),
  ]);

  if (!product || !dealer) {
    throw new Error("Product or dealer not found");
  }

  const variant = input.variantId
    ? product.variants.find((v) => v.id === input.variantId) || product.variants[0]
    : product.variants.find((v) => v.isDefault) || product.variants[0];

  if (!variant) {
    throw new Error("Product variant not found");
  }

  const mrpVal = Number(variant.mrp);
  const dpVal = resolveDealerPrice(
    product.prices,
    {
      dealerId: dealer.id,
      dealerGroupId: dealer.dealerGroupId,
      pricingGroupId: dealer.pricingGroupId,
      quantity,
    },
    mrpVal
  );

  const rawTax = Number(product.taxPercent ?? 13);
  const taxRate = rawTax > 1 ? rawTax / 100 : rawTax > 0 ? rawTax : 0.13;

  return prisma.$transaction(async (tx) => {
    let draft = await tx.order.findFirst({
      where: { sellerId: input.sellerId, dealerId: input.dealerId, status: "DRAFT" },
      include: { items: true },
      orderBy: { createdAt: "desc" },
    });

    if (!draft) {
      const orderNumber = await nextDocumentNumber(tx, input.sellerId, "ORDER", "ORD");
      draft = await tx.order.create({
        data: {
          sellerId: input.sellerId,
          orderNumber,
          dealerId: input.dealerId,
          source: "DEALER_PORTAL",
          status: "DRAFT",
          currencyCode: "NPR",
          subtotal: 0,
          taxTotal: 0,
          grandTotal: 0,
          createdById: input.userId,
        },
        include: { items: true },
      });

      await tx.orderStatusHistory.create({
        data: {
          sellerId: input.sellerId,
          orderId: draft.id,
          toStatus: "DRAFT",
          changedById: input.userId,
          remarks: "Draft cart initiated",
        },
      });
    }

    const existingItem = draft.items.find(
      (item) => item.status === "ACTIVE" && (item.variantId === variant.id || item.productId === product.id)
    );

    if (existingItem) {
      const updatedQty = Number(existingItem.originalQuantity) + quantity;
      const updatedLineSubtotal = dpVal * updatedQty;
      const updatedLineTax = updatedLineSubtotal * taxRate;
      const updatedLineTotal = updatedLineSubtotal + updatedLineTax;

      await tx.orderItem.update({
        where: { id: existingItem.id },
        data: {
          originalQuantity: updatedQty,
          mrp: mrpVal,
          dealerPrice: dpVal,
          taxAmount: updatedLineTax,
          lineTotal: updatedLineTotal,
        },
      });
    } else {
      const lineSubtotal = dpVal * quantity;
      const lineTax = lineSubtotal * taxRate;
      const lineTotal = lineSubtotal + lineTax;

      await tx.orderItem.create({
        data: {
          sellerId: input.sellerId,
          orderId: draft.id,
          productId: product.id,
          variantId: variant.id,
          sku: variant.sku,
          productName: product.name,
          variantName: variant.name,
          originalQuantity: quantity,
          mrp: mrpVal,
          dealerPrice: dpVal,
          taxAmount: lineTax,
          lineTotal,
          status: "ACTIVE",
        },
      });
    }

    // Recalculate totals
    const allItems = await tx.orderItem.findMany({
      where: { orderId: draft.id, status: "ACTIVE" },
    });

    const subtotal = allItems.reduce(
      (acc, item) => acc + Number(item.dealerPrice) * Number(item.originalQuantity),
      0
    );
    const taxTotal = allItems.reduce((acc, item) => acc + Number(item.taxAmount), 0);
    const grandTotal = subtotal + taxTotal;

    const updatedDraft = await tx.order.update({
      where: { id: draft.id },
      data: { subtotal, taxTotal, grandTotal },
      include: { items: true },
    });

    return updatedDraft;
  });
}

export async function updateCartItemQuantity(input: {
  sellerId: string;
  dealerId: string;
  itemId: string;
  quantity: number;
}) {
  const { sellerId, dealerId, itemId, quantity } = input;

  return prisma.$transaction(async (tx) => {
    const item = await tx.orderItem.findFirst({
      where: {
        id: itemId,
        order: { sellerId, dealerId, status: "DRAFT" },
      },
      include: { order: true },
    });

    if (!item) throw new Error("Item not found");

    if (quantity <= 0) {
      await tx.orderItem.delete({ where: { id: itemId } });
    } else {
      const unitDp = Number(item.dealerPrice);
      const lineSubtotal = unitDp * quantity;
      let effectiveTaxRate = 0.13;
      if (item.productId) {
        const prod = await tx.product.findUnique({ where: { id: item.productId }, select: { taxPercent: true } });
        if (prod?.taxPercent !== null && prod?.taxPercent !== undefined) {
          const raw = Number(prod.taxPercent);
          effectiveTaxRate = raw > 1 ? raw / 100 : raw > 0 ? raw : 0.13;
        }
      }
      const lineTax = Number((lineSubtotal * effectiveTaxRate).toFixed(2));
      const lineTotal = Number((lineSubtotal + lineTax).toFixed(2));

      await tx.orderItem.update({
        where: { id: itemId },
        data: {
          originalQuantity: quantity,
          taxAmount: lineTax,
          lineTotal,
        },
      });
    }

    const allItems = await tx.orderItem.findMany({
      where: { orderId: item.orderId, status: "ACTIVE" },
    });

    const subtotal = allItems.reduce(
      (acc, i) => acc + Number(i.dealerPrice) * Number(i.originalQuantity),
      0
    );
    const taxTotal = allItems.reduce((acc, i) => acc + Number(i.taxAmount), 0);
    const grandTotal = subtotal + taxTotal;

    return tx.order.update({
      where: { id: item.orderId },
      data: { subtotal, taxTotal, grandTotal },
      include: { items: true },
    });
  });
}

export async function removeCartItem(input: {
  sellerId: string;
  dealerId: string;
  itemId: string;
}) {
  return updateCartItemQuantity({ ...input, quantity: 0 });
}

export async function clearDealerCart(input: { sellerId: string; dealerId: string }) {
  return prisma.$transaction(async (tx) => {
    await tx.orderItem.deleteMany({
      where: {
        order: {
          sellerId: input.sellerId,
          dealerId: input.dealerId,
          status: "DRAFT",
        },
      },
    });
    await tx.order.deleteMany({
      where: {
        sellerId: input.sellerId,
        dealerId: input.dealerId,
        status: "DRAFT",
      },
    });
  });
}
