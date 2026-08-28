import { auth } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/api-response";
import { listVehicles, createVehicle, updateVehicle } from "@/services/transportation.service";
import { z } from "zod";

const createSchema = z.object({
  transportCompanyId: z.string().min(1),
  vehicleNumber: z.string().trim().min(1).max(50),
  vehicleType: z.string().trim().max(50).optional(),
  capacity: z.coerce.number().min(0).optional(),
  driverId: z.string().min(1).optional(),
});

const updateSchema = z.object({
  id: z.string().min(1),
  vehicleNumber: z.string().trim().min(1).max(50).optional(),
  vehicleType: z.string().trim().max(50).optional(),
  capacity: z.coerce.number().min(0).optional(),
  driverId: z.string().min(1).optional(),
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
});

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id || !session.sellerId) return apiError("UNAUTHORIZED", "Authentication required.", 401);

  const { searchParams } = new URL(request.url);
  const transportCompanyId = searchParams.get("transportCompanyId") || undefined;

  try {
    const vehicles = await listVehicles(session.sellerId, transportCompanyId);
    return apiSuccess(vehicles);
  } catch (error) {
    return apiError("FETCH_FAILED", "Could not fetch vehicles.", 500);
  }
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id || !session.sellerId) return apiError("UNAUTHORIZED", "Authentication required.", 401);

  const body = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return apiError("VALIDATION_ERROR", "Invalid vehicle details.", 422, parsed.error.format());

  try {
    const vehicle = await createVehicle({ sellerId: session.sellerId, ...parsed.data });
    return apiSuccess(vehicle, { status: 201 });
  } catch (error) {
    return apiError("CREATE_FAILED", error instanceof Error ? error.message : "Could not create vehicle.", 409);
  }
}

export async function PUT(request: Request) {
  const session = await auth();
  if (!session?.user?.id || !session.sellerId) return apiError("UNAUTHORIZED", "Authentication required.", 401);

  const body = await request.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return apiError("VALIDATION_ERROR", "Invalid update data.", 422, parsed.error.format());

  const { id, ...data } = parsed.data;
  try {
    const updated = await updateVehicle(session.sellerId, id, data);
    return apiSuccess(updated);
  } catch (error) {
    return apiError("UPDATE_FAILED", error instanceof Error ? error.message : "Could not update vehicle.", 409);
  }
}
