import { z } from "zod";
import { auth } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/api-response";
import { getOrderPickListDetails, updateOrderPickList } from "@/services/pick-list.service";

const pickListItemUpdateSchema = z.object({
  id: z.string().optional(),
  orderItemId: z.string().optional(),
  sku: z.string(),
  pickedQuantity: z.coerce.number().min(0),
  rackLocation: z.string().trim().max(50).optional().nullable(),
  binLocation: z.string().trim().max(50).optional().nullable(),
  remarks: z.string().trim().max(255).optional().nullable(),
});

const updatePickListBodySchema = z.object({
  items: z.array(pickListItemUpdateSchema).min(1),
  notes: z.string().trim().max(1000).optional().nullable(),
  assignedToId: z.string().trim().max(50).optional().nullable(),
  markCompleted: z.boolean().optional().default(false),
  status: z.enum(["GENERATED", "ASSIGNED", "PICKING_IN_PROGRESS", "PARTIALLY_PICKED", "COMPLETED", "EXCEPTION", "CANCELLED"]).optional(),
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
    const details = await getOrderPickListDetails(session.sellerId, id);
    if (!details) {
      return apiError("ORDER_NOT_FOUND", "Order or pick list could not be located.", 404);
    }
    return apiSuccess(details);
  } catch (err: any) {
    return apiError("FETCH_FAILED", err?.message || "Failed to load pick list.", 500);
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return handleUpdate(request, params);
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return handleUpdate(request, params);
}

async function handleUpdate(
  request: Request,
  params: Promise<{ id: string }>
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
    permissions.includes("picklist.manage") ||
    permissions.includes("picklist.complete") ||
    permissions.includes("warehouse.manage") ||
    permissions.includes("orders.manage") ||
    permissions.includes("order.manage");

  if (!isAuthorized) {
    return apiError("FORBIDDEN", "You do not have permission to update pick lists.", 403);
  }

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = updatePickListBodySchema.safeParse(body);
  if (!parsed.success) {
    return apiError("VALIDATION_ERROR", "Invalid pick list data.", 422, parsed.error.format());
  }

  try {
    const updated = await updateOrderPickList({
      sellerId: session.sellerId,
      orderId: id,
      items: parsed.data.items,
      notes: parsed.data.notes,
      assignedToId: parsed.data.assignedToId,
      markCompleted: parsed.data.markCompleted,
      status: parsed.data.status,
      actor: {
        userId: session.user.id,
        roles: session.roles || [],
        permissions: session.permissions || [],
      },
    });

    return apiSuccess(updated, { status: 200 });
  } catch (err: any) {
    return apiError("PICK_LIST_UPDATE_FAILED", err?.message || "Failed to update pick list.", 409);
  }
}
