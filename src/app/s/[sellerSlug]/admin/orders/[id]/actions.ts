"use server";

import { getTenantContext } from "@/lib/tenant";
import { executeOrderWorkflowAction } from "@/services/order-workflow.service";
import { OrderStatus } from "@prisma/client";
import { redirect } from "next/navigation";

export async function advanceWorkflowAction(formData: FormData) {
  const orderId = String(formData.get("orderId") || "");
  const sellerSlug = String(formData.get("sellerSlug") || "bageshwari");
  const rawTarget = formData.get("nextStatus");
  const assignedWarehouseUserId = formData.get("assignedWarehouseUserId");

  if (!orderId || typeof rawTarget !== "string" || !Object.values(OrderStatus).includes(rawTarget as OrderStatus)) {
    return;
  }

  const actionContext = await getTenantContext(sellerSlug);
  try {
    await executeOrderWorkflowAction({
      sellerId: actionContext.sellerId,
      orderId,
      targetStatus: rawTarget as OrderStatus,
      assignedWarehouseUserId:
        typeof assignedWarehouseUserId === "string" && assignedWarehouseUserId ? assignedWarehouseUserId : undefined,
      actor: {
        userId: actionContext.userId,
        permissions: actionContext.permissions,
        roles: actionContext.roles,
      },
      reason: "Workflow action from operations portal",
    });
  } catch (err: any) {
    console.warn("Advance workflow action failed:", err?.message);
  }

  redirect(`/s/${sellerSlug}/admin/orders/${orderId}`);
}
