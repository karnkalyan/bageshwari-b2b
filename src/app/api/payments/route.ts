import { PaymentMethod } from "@prisma/client";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/api-response";
import { recordAndVerifyPayment } from "@/services/payment.service";
const schema = z.object({ orderId: z.string().min(1), invoiceId: z.string().min(1), method: z.enum(Object.values(PaymentMethod) as [PaymentMethod, ...PaymentMethod[]]), amount: z.coerce.number().positive(), transactionRef: z.string().trim().max(100).optional(), remarks: z.string().trim().max(1000).optional() });
export async function POST(request: Request) { const session = await auth(); if (!session?.user?.id || !session.sellerId || !(session.permissions || []).includes("payment.record")) return apiError("FORBIDDEN", "Payment permission required.", 403); const parsed = schema.safeParse(await request.json().catch(() => null)); if (!parsed.success) return apiError("VALIDATION_ERROR", "Invalid payment details.", 422); try { return apiSuccess(await recordAndVerifyPayment({ sellerId: session.sellerId, actor: { userId: session.user.id, roles: session.roles || [], permissions: session.permissions || [] }, ...parsed.data }), { status: 201 }); } catch (error) { return apiError(error instanceof Error ? error.message : "PAYMENT_FAILED", "Payment could not be recorded.", 409); } }
