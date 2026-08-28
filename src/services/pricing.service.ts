import type { PriceType, ProductPrice } from "@prisma/client";

const rank: Record<PriceType, number> = {
  DEALER_SPECIFIC: 600,
  DEALER_GROUP: 500,
  PRICING_GROUP: 400,
  QUANTITY_BASED: 300,
  PROMOTIONAL: 200,
  DEFAULT_DEALER: 100,
};

export type PricingContext = {
  dealerId: string;
  dealerGroupId: string | null;
  pricingGroupId: string | null;
  quantity?: number;
};

export function resolveDealerPrice(
  prices: readonly ProductPrice[],
  context: PricingContext,
  mrp: number,
): number {
  const quantity = context.quantity ?? 1;
  const eligible = prices.filter((price) => {
    if (price.priceType === "DEALER_SPECIFIC") return price.dealerId === context.dealerId;
    if (price.priceType === "DEALER_GROUP") return price.dealerGroupId === context.dealerGroupId;
    if (price.priceType === "PRICING_GROUP") return price.pricingGroupId === context.pricingGroupId;
    if (price.priceType === "QUANTITY_BASED") {
      return Number(price.minimumQuantity ?? 0) <= quantity
        && (price.maximumQuantity === null || Number(price.maximumQuantity) >= quantity);
    }
    return price.priceType === "PROMOTIONAL" || price.priceType === "DEFAULT_DEALER";
  });
  eligible.sort((a, b) => (rank[b.priceType] + b.priority) - (rank[a.priceType] + a.priority));
  return eligible.length ? Number(eligible[0].amount) : mrp;
}
