import { z } from "zod";
import { auth } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/api-response";
import { dealerConfirmOrder } from "@/services/order-workflow.service";

const dealerConfirmSchema = z.object({
  method: z.enum([
    "CREDIT",
    "CHEQUE",
    "CASH",
    "ONLINE",
    "BANK_TRANSFER",
    "MOBILE_PAYMENT",
    "OTHER",
  ]),
  transactionRef: z.string().trim().max(100).optional(),
  remarks: z.string().trim().max(1000).optional(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id || !session.sellerId) {
    return apiError("UNAUTHORIZED", "Authentication required.", 401);
  }

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = dealerConfirmSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("VALIDATION_ERROR", "Invalid confirmation details.", 422, parsed.error.format());
  }

  try {
    const updated = await dealerConfirmOrder({
      sellerId: session.sellerId,
      orderId: id,
      actor: {
        userId: session.user.id,
        permissions: session.permissions || [],
        roles: session.roles || [],
      },
      ...parsed.data,
    });

    return apiSuccess(updated, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Dealer order confirmation failed.";
    return apiError("DEALER_CONFIRM_FAILED", message, 409);
  }
}
