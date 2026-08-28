import { auth } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/api-response";
import { listDrivers, createDriver, updateDriver } from "@/services/transportation.service";
import { z } from "zod";

const createSchema = z.object({
  transportCompanyId: z.string().min(1),
  name: z.string().trim().min(1).max(100),
  phone: z.string().trim().max(20).optional(),
  licenseNumber: z.string().trim().max(50).optional(),
});

const updateSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1).max(100).optional(),
  phone: z.string().trim().max(20).optional(),
  licenseNumber: z.string().trim().max(50).optional(),
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
});

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id || !session.sellerId) return apiError("UNAUTHORIZED", "Authentication required.", 401);

  const { searchParams } = new URL(request.url);
  const transportCompanyId = searchParams.get("transportCompanyId") || undefined;

  try {
    const drivers = await listDrivers(session.sellerId, transportCompanyId);
    return apiSuccess(drivers);
  } catch (error) {
    return apiError("FETCH_FAILED", "Could not fetch drivers.", 500);
  }
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id || !session.sellerId) return apiError("UNAUTHORIZED", "Authentication required.", 401);

  const body = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return apiError("VALIDATION_ERROR", "Invalid driver details.", 422, parsed.error.format());

  try {
    const driver = await createDriver({ sellerId: session.sellerId, ...parsed.data });
    return apiSuccess(driver, { status: 201 });
  } catch (error) {
    return apiError("CREATE_FAILED", error instanceof Error ? error.message : "Could not create driver.", 409);
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
    const updated = await updateDriver(session.sellerId, id, data);
    return apiSuccess(updated);
  } catch (error) {
    return apiError("UPDATE_FAILED", error instanceof Error ? error.message : "Could not update driver.", 409);
  }
}
