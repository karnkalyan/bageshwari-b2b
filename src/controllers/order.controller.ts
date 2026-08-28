import "server-only";
import { auth } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/api-response";
import { executeOrderWorkflowAction } from "@/services/order-workflow.service";
import { transitionOrderSchema } from "@/validators/order.schema";

export async function transitionOrder(request: Request, orderId: string) {
  const session = await auth();
  if (!session?.user?.id || !session.sellerId) return apiError("UNAUTHORIZED", "Authentication required.", 401);
  const body: unknown = await request.json().catch(() => null);
  const parsed = transitionOrderSchema.safeParse(body);
  if (!parsed.success) return apiError("VALIDATION_ERROR", "Invalid order transition.", 422);
  try {
    const order = await executeOrderWorkflowAction({
      sellerId: session.sellerId,
      orderId,
      targetStatus: parsed.data.targetStatus,
      reason: parsed.data.reason,
      actor: { userId: session.user.id, permissions: session.permissions || [], roles: session.roles || [] },
    });
    return apiSuccess(order);
  } catch (error) {
    const code = error instanceof Error && "code" in error ? String(error.code) : "ORDER_WORKFLOW_ERROR";
    const message = error instanceof Error ? error.message : "The order transition failed.";
    return apiError(code, message, code === "ORDER_NOT_FOUND" ? 404 : 409);
  }
}
