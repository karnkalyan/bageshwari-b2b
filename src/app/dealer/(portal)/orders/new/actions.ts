"use server";

import { getTenantContext } from "@/lib/tenant";
import { addItemToDealerCart } from "@/services/cart.service";
import { revalidatePath } from "next/cache";

export async function syncQuickOrderItemToCart(formData: FormData) {
  const ctx = await getTenantContext("bageshwari", "/dealer/login");
  if (!ctx.dealerId) return { error: "Not authenticated" };

  const productId = String(formData.get("productId") || "");
  const quantity = Number(formData.get("quantity") || 1);

  if (!productId || !Number.isFinite(quantity) || quantity <= 0) {
    return { error: "Invalid product or quantity" };
  }

  try {
    await addItemToDealerCart({
      sellerId: ctx.sellerId,
      dealerId: ctx.dealerId,
      userId: ctx.userId,
      productId,
      variantId: String(formData.get("variantId") || "") || undefined,
      quantity,
    });

    revalidatePath("/dealer/cart");
    revalidatePath("/dealer/products");
    revalidatePath("/dealer", "layout");

    return { success: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to sync to cart" };
  }
}
