import { auth } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/api-response";
import { createShipment } from "@/services/transportation.service";
import { createShipmentSchema } from "@/validators/shipment.schema";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id || !session.sellerId || !(session.permissions || []).includes("shipment.dispatch")) return apiError("FORBIDDEN", "Dispatch permission required.", 403);
  const parsed = createShipmentSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return apiError("VALIDATION_ERROR", "Invalid shipment details.", 422);
  try {
    const shipment = await createShipment({ ...parsed.data, sellerId: session.sellerId, userId: session.user.id });
    return apiSuccess(shipment, { status: 201 });
  } catch (error) {
    return apiError(error instanceof Error ? error.message : "SHIPMENT_CREATE_FAILED", "Shipment could not be created.", 409);
  }
}
