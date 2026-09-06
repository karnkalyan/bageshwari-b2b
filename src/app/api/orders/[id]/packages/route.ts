import { z } from "zod";
import { auth } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/api-response";
import { getOrderPackingDetails, saveOrderCartonPackaging } from "@/services/packing.service";

const cartonItemSchema = z.object({
  orderItemId: z.string(),
  sku: z.string(),
  productName: z.string(),
  quantity: z.coerce.number().min(0),
  unitCode: z.string().optional(),
});

const cartonSchema = z.object({
  id: z.string().optional(),
  packageNumber: z.string().trim().max(100).optional(),
  packageType: z.string().trim().max(100).optional(),
  length: z.coerce.number().positive().optional(),
  width: z.coerce.number().positive().optional(),
  height: z.coerce.number().positive().optional(),
  weight: z.coerce.number().positive(),
  handlingInstructions: z.string().trim().max(500).optional(),
  items: z.array(cartonItemSchema).default([]),
});

const saveCartonsBodySchema = z.object({
  packages: z.array(cartonSchema).min(1),
  finalize: z.boolean().optional().default(false),
});

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id || !session.sellerId) {
    return apiError("UNAUTHORIZED", "Authentication required.", 401);
  }

  const { id } = await params;
  try {
    const details = await getOrderPackingDetails(session.sellerId, id);
    if (!details) {
      return apiError("ORDER_NOT_FOUND", "Order could not be located.", 404);
    }
    return apiSuccess(details);
  } catch (err: any) {
    return apiError("FETCH_FAILED", err?.message || "Failed to load packing configuration.", 500);
  }
}

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
  const isAuthorized =
    isPrivileged ||
    roles.some((r) =>
      [
        "WAREHOUSE_MANAGER",
        "WAREHOUSE_USER",
        "WAREHOUSE_PICKER",
        "PACKING_USER",
        "DISPATCH_USER",
        "LOGISTICS_MANAGER",
        "ACCOUNTANT",
        "ACCOUNTS_MANAGER",
      ].includes(r)
    ) ||
    permissions.includes("packing.manage") ||
    permissions.includes("picklist.complete");

  if (!isAuthorized) {
    return apiError("FORBIDDEN", "You do not have permission to manage carton packaging.", 403);
  }

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = saveCartonsBodySchema.safeParse(body);
  if (!parsed.success) {
    return apiError("VALIDATION_ERROR", "Invalid carton packaging data.", 422, parsed.error.format());
  }

  try {
    const result = await saveOrderCartonPackaging({
      sellerId: session.sellerId,
      orderId: id,
      packages: parsed.data.packages,
      finalize: parsed.data.finalize,
      actor: {
        userId: session.user.id,
        roles: session.roles || [],
        permissions: session.permissions || [],
      },
    });

    return apiSuccess(result, { status: 200 });
  } catch (err: any) {
    return apiError("PACKING_FAILED", err?.message || "Failed to save carton packaging.", 409);
  }
}
