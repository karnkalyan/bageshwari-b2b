"use server";

import { getTenantContext } from "@/lib/tenant";
import { updateCartItemQuantity, removeCartItem, clearDealerCart } from "@/services/cart.service";
import { executeOrderWorkflowAction } from "@/services/order-workflow.service";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function updateQuantityAction(formData: FormData) {
  const actionCtx = await getTenantContext("bageshwari", "/dealer/login");
  if (!actionCtx.dealerId) redirect("/dealer/login");
  const itemId = String(formData.get("itemId") || "");
  const qty = Number(formData.get("quantity") || 1);
  if (!itemId) return;

  await updateCartItemQuantity({
    sellerId: actionCtx.sellerId,
    dealerId: actionCtx.dealerId,
    itemId,
    quantity: qty,
  });
  revalidatePath("/dealer/cart");
}

export async function removeItemAction(formData: FormData) {
  const actionCtx = await getTenantContext("bageshwari", "/dealer/login");
  if (!actionCtx.dealerId) redirect("/dealer/login");
  const itemId = String(formData.get("itemId") || "");
  if (!itemId) return;

  await removeCartItem({
    sellerId: actionCtx.sellerId,
    dealerId: actionCtx.dealerId,
    itemId,
  });
  revalidatePath("/dealer/cart");
}

export async function clearCartAction() {
  const actionCtx = await getTenantContext("bageshwari", "/dealer/login");
  if (!actionCtx.dealerId) redirect("/dealer/login");

  await clearDealerCart({
    sellerId: actionCtx.sellerId,
    dealerId: actionCtx.dealerId,
  });
  revalidatePath("/dealer/cart");
}

export async function submitDraft(formData: FormData) {
  const actionCtx = await getTenantContext("bageshwari", "/dealer/login");
  const orderId = String(formData.get("orderId") || "");
  if (!orderId) return;

  await executeOrderWorkflowAction({
    sellerId: actionCtx.sellerId,
    orderId,
    targetStatus: "PENDING_ACCOUNTS_REVIEW",
    actor: {
      userId: actionCtx.userId,
      permissions: actionCtx.permissions,
      roles: actionCtx.roles,
    },
    reason: "Draft submitted as active dealer sales order from cart page",
  });
  redirect("/dealer/orders");
}
