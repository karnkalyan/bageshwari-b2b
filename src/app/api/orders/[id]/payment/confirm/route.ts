import { z } from "zod";
import { auth } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/api-response";
import { confirmPaymentAndAdvancePipeline } from "@/services/order-workflow.service";

const paymentConfirmSchema = z.object({
  action: z.enum(["APPROVE", "REJECT", "RECORD_ON_BEHALF"]).optional().default("APPROVE"),
  method: z
    .enum([
      "CREDIT",
      "CHEQUE",
      "CASH",
      "ONLINE",
      "BANK_TRANSFER",
      "MOBILE_PAYMENT",
      "OTHER",
    ])
    .optional(),
  amount: z.coerce.number().min(0).optional(),
  transactionRef: z.string().trim().max(100).optional(),
  remarks: z.string().trim().max(1000).optional(),
  assignedWarehouseUserId: z.string().trim().optional(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id || !session.sellerId) {
    return apiError("UNAUTHORIZED", "Authentication required.", 401);
  }

  const roles = session.roles || [];
  const permissions = session.permissions || [];
  const isPrivileged = roles.some((r) =>
    ["SUPER_ADMIN", "PLATFORM_ADMIN", "SELLER_OWNER", "ADMIN", "STAFF"].includes(r)
  );
  const isAccounts =
    isPrivileged ||
    roles.some((r) => ["ACCOUNTANT", "ACCOUNTS_MANAGER", "FINANCE"].includes(r)) ||
    permissions.includes("payment.record") ||
    permissions.includes("order.confirm");
  const isSales =
    roles.some((r) => ["SALES_REP", "SALES_MANAGER"].includes(r)) ||
    permissions.includes("order.create");

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = paymentConfirmSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("VALIDATION_ERROR", "Invalid payment parameters.", 422, parsed.error.format());
  }

  const { action } = parsed.data;

  // Authorization check based on requested action
  if (action === "RECORD_ON_BEHALF") {
    if (!isSales && !isPrivileged) {
      return apiError("FORBIDDEN", "Only Sales personnel can record payment on behalf of dealer.", 403);
    }
  } else {
    // APPROVE or REJECT: strictly Accounts or Privileged
    if (!isAccounts) {
      return apiError("FORBIDDEN", "Only Accounts personnel can verify or approve payment references.", 403);
    }
  }

  try {
    const updated = await confirmPaymentAndAdvancePipeline({
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
    const message = error instanceof Error ? error.message : "Payment processing failed.";
    return apiError("PAYMENT_CONFIRM_FAILED", message, 409);
  }
}
