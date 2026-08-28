import { z } from "zod";
import { auth } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/api-response";
import { reviseOrderBulk } from "@/services/accounts-review.service";

const bulkRevisionSchema = z.object({
  generalRemarks: z.string().trim().min(1).max(2000),
  sendToDealer: z.boolean().default(true),
  items: z.array(
    z.object({
      orderItemId: z.string().min(1),
      quantity: z.coerce.number().min(0),
      unitPrice: z.coerce.number().min(0).optional(),
      discountAmount: z.coerce.number().min(0).optional(),
      accountsRemarks: z.string().trim().max(1000).optional(),
    })
  ).min(1),
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
  const parsed = bulkRevisionSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("VALIDATION_ERROR", "Invalid revision details.", 422, parsed.error.format());
  }

  try {
    const revision = await reviseOrderBulk({
      sellerId: session.sellerId,
      orderId: id,
      userId: session.user.id,
      actor: {
        userId: session.user.id,
        permissions: session.permissions || [],
        roles: session.roles || [],
      },
      ...parsed.data,
    });

    return apiSuccess(revision, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Order revision failed.";
    return apiError("REVISION_FAILED", message, 409);
  }
}
