import { auth } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/api-response";
import { getTenantContext, hasRole, hasPermission } from "@/lib/tenant";
import { createSalesOrderForDealer } from "@/services/sales-order-create.service";
import { OrderSource } from "@prisma/client";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id || !session.sellerId) {
    return apiError("UNAUTHORIZED", "Authentication required.", 401);
  }

  const ctx = await getTenantContext(session.sellerSlug || "bageshwari");
  const isDealerUser = Boolean(ctx.dealerId) || hasRole(ctx, "DEALER", "DEALER_USER", "DEALER_OWNER");

  const isAuthorized =
    isDealerUser ||
    hasRole(
      ctx,
      "SUPER_ADMIN",
      "PLATFORM_ADMIN",
      "SELLER_OWNER",
      "ADMIN",
      "STAFF",
      "SALESPERSON",
      "SALES_REP",
      "SALES_MANAGER",
      "ACCOUNTANT",
      "ACCOUNTS_MANAGER"
    ) ||
    hasPermission(ctx, "order.submit") ||
    hasPermission(ctx, "order.manage");

  if (!isAuthorized) {
    return apiError("FORBIDDEN", "You do not have permission to create sales orders.", 403);
  }

  try {
    const body = await request.json();
    const { dealerId, items, notes, freightTotal, submitForReview } = body;

    // If dealer user, force order to be for their own dealership
    const targetDealerId = isDealerUser && ctx.dealerId ? ctx.dealerId : dealerId;

    if (!targetDealerId || !Array.isArray(items) || items.length === 0) {
      return apiError("BAD_REQUEST", "Dealer and at least one item are required.", 400);
    }

    const order = await createSalesOrderForDealer({
      sellerId: ctx.sellerId,
      dealerId: targetDealerId,
      createdById: ctx.userId,
      actor: {
        userId: ctx.userId,
        permissions: ctx.permissions,
        roles: ctx.roles,
      },
      items,
      notes,
      freightTotal: freightTotal ? Number(freightTotal) : 0,
      submitForReview: Boolean(submitForReview),
      source: isDealerUser ? OrderSource.DEALER_PORTAL : OrderSource.SALESPERSON_PORTAL,
    });

    return apiSuccess({
      orderId: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
    });
  } catch (error) {
    console.error("Failed to create sales order:", error);
    return apiError("ORDER_CREATION_FAILED", error instanceof Error ? error.message : "Failed to create order.", 500);
  }
}
