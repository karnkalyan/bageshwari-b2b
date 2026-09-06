"use server";

import { getTenantContext, hasRole } from "@/lib/tenant";
import { executeOrderWorkflowAction, assignOrderWarehouseUser } from "@/services/order-workflow.service";
import { OrderStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
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

  revalidatePath(`/s/${sellerSlug}/admin/orders/${orderId}`);
  revalidatePath(`/s/${sellerSlug}/admin/warehouse`);
  redirect(`/s/${sellerSlug}/admin/orders/${orderId}`);
}

export async function assignWarehouseUserAction(formData: FormData) {
  const orderId = String(formData.get("orderId") || "");
  const sellerSlug = String(formData.get("sellerSlug") || "bageshwari");
  const assignedWarehouseUserId = String(formData.get("assignedWarehouseUserId") || "");
  const notes = String(formData.get("notes") || "");

  if (!orderId || !assignedWarehouseUserId) {
    return;
  }

  const actionContext = await getTenantContext(sellerSlug);
  const isPrivileged = hasRole(actionContext, "SUPER_ADMIN", "PLATFORM_ADMIN", "SELLER_OWNER", "ADMIN", "STAFF");
  const isAccounts = isPrivileged || hasRole(actionContext, "ACCOUNTANT", "ACCOUNTS_MANAGER", "FINANCE");
  const isWarehouseManager = isPrivileged || hasRole(actionContext, "WAREHOUSE_MANAGER");

  if (!isAccounts && !isWarehouseManager) {
    throw new Error("Unauthorized to assign warehouse user.");
  }

  try {
    await assignOrderWarehouseUser({
      sellerId: actionContext.sellerId,
      orderId,
      assignedWarehouseUserId,
      actor: {
        userId: actionContext.userId,
        permissions: actionContext.permissions,
        roles: actionContext.roles,
      },
      notes: notes || undefined,
    });
  } catch (err: any) {
    console.warn("Assign warehouse user failed:", err?.message);
  }

  revalidatePath(`/s/${sellerSlug}/admin/orders/${orderId}`);
  revalidatePath(`/s/${sellerSlug}/admin/warehouse`);
  redirect(`/s/${sellerSlug}/admin/orders/${orderId}`);
}
