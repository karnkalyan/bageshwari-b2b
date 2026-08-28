export type PublicVariantInput = {
  id: string;
  name: string;
  sku: string;
  mrp: unknown;
  isDefault: boolean;
};

export function toPublicVariant(variant: PublicVariantInput) {
  return {
    id: variant.id,
    name: variant.name,
    sku: variant.sku,
    mrp: Number(variant.mrp),
    isDefault: variant.isDefault,
  };
}

export function toDealerVariant(
  variant: PublicVariantInput,
  dealerPrice: number,
  availableStock: number,
) {
  const publicVariant = toPublicVariant(variant);
  const mrp = Number(publicVariant.mrp);
  return {
    ...publicVariant,
    dealerPrice,
    discountPercent: mrp > 0 ? Math.max(0, ((mrp - dealerPrice) / mrp) * 100) : 0,
    availableStock,
  };
}
