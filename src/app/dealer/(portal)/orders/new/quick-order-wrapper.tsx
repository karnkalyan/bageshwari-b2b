"use client";

import { SalesOrderCreator, SerializedDealer, SerializedProduct } from "@/components/admin/sales-order-creator";
import { syncQuickOrderItemToCart } from "./actions";

interface QuickOrderCartSyncWrapperProps {
  sellerSlug: string;
  dealers: SerializedDealer[];
  products: SerializedProduct[];
  initialDealerId: string;
  initialCategories: string[];
  vatPercent: number;
  initialOrderItems: any[];
  initialNotes: string;
}

export function QuickOrderCartSyncWrapper({
  sellerSlug,
  dealers,
  products,
  initialDealerId,
  initialCategories,
  vatPercent,
  initialOrderItems,
  initialNotes,
}: QuickOrderCartSyncWrapperProps) {
  const handleCartSync = async (productId: string, variantId: string | null, quantity: number) => {
    const formData = new FormData();
    formData.set("productId", productId);
    formData.set("quantity", String(quantity));
    if (variantId) {
      formData.set("variantId", variantId);
    }
    await syncQuickOrderItemToCart(formData);
  };

  return (
    <SalesOrderCreator
      sellerSlug={sellerSlug}
      dealers={dealers}
      products={products}
      initialDealerId={initialDealerId}
      isDealer={true}
      initialCategories={initialCategories}
      vatPercent={vatPercent}
      initialOrderItems={initialOrderItems}
      initialNotes={initialNotes}
      onCartSync={handleCartSync}
    />
  );
}
