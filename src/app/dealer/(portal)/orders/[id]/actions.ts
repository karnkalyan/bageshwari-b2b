"use server";

import { getTenantContext } from "@/lib/tenant";
import { executeOrderWorkflowAction } from "@/services/order-workflow.service";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function placeOrderAction(formData: FormData) {
  const orderId = String(formData.get("orderId") || "");
  if (!orderId) return;

  const actionCtx = await getTenantContext("bageshwari", "/dealer/login");
  if (!actionCtx.dealerId) redirect("/dealer/login");

  await executeOrderWorkflowAction({
    sellerId: actionCtx.sellerId,
    orderId,
    targetStatus: "PENDING_ACCOUNTS_REVIEW",
    actor: {
      userId: actionCtx.userId,
      permissions: actionCtx.permissions,
      roles: actionCtx.roles,
    },
    reason: "Sales order placed by dealer from order details page",
  });

  revalidatePath(`/dealer/orders/${orderId}`);
  revalidatePath("/dealer/orders");
  revalidatePath("/dealer/cart");
  revalidatePath("/dealer/dashboard");
}
