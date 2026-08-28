import { auth } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/api-response";
import { executeOrderWorkflowAction } from "@/services/order-workflow.service";
import { prisma } from "@/lib/db";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id || !session.sellerId) {
    return apiError("UNAUTHORIZED", "Authentication required.", 401);
  }

  const { id } = await params;
  const order = await prisma.order.findFirst({
    where: {
      id,
      sellerId: session.sellerId,
      ...(session.dealerId ? { dealerId: session.dealerId } : {}),
    },
    select: { id: true, status: true },
  });

  if (!order) {
    return apiError("ORDER_NOT_FOUND", "Order not found.", 404);
  }

  if (order.status !== "PROFORMA_INVOICE_GENERATED" && order.status !== "WAITING_FOR_DEALER_CONFIRMATION") {
    return apiError("INVALID_STATE", "Order is not awaiting proforma confirmation.", 400);
  }

  try {
    const updated = await executeOrderWorkflowAction({
      sellerId: session.sellerId,
      orderId: id,
      targetStatus: "PROFORMA_INVOICE_CONFIRMED",
      actor: {
        userId: session.user.id,
        permissions: session.permissions || [],
        roles: session.roles || [],
      },
      reason: "Dealer confirmed proforma invoice via portal.",
    });

    return apiSuccess(updated);
  } catch (error) {
    return apiError(error instanceof Error ? error.message : "PROFORMA_CONFIRM_FAILED", "Could not confirm proforma invoice.", 409);
  }
}
