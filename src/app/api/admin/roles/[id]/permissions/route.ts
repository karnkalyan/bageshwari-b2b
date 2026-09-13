import { NextRequest } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/api-response";
import { prisma } from "@/lib/db";

const updatePermissionsSchema = z.object({
  permissionIds: z.array(z.string()),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return apiError("UNAUTHORIZED", "Authentication required.", 401);
  }

  const { id: roleId } = await params;
  const sellerId = session.sellerId || "bageshwari-tractors";

  const role = await prisma.role.findFirst({
    where: { id: roleId, OR: [{ sellerId }, { sellerId: null }] },
  });

  if (!role) {
    return apiError("NOT_FOUND", "Role not found.", 404);
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return apiError("INVALID_INPUT", "Invalid JSON payload.", 400);
  }

  const parsed = updatePermissionsSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("VALIDATION_FAILED", "Invalid permissions payload.", 422);
  }

  const { permissionIds } = parsed.data;

  await prisma.$transaction(async (tx) => {
    // Delete existing permissions for role
    await tx.rolePermission.deleteMany({
      where: { roleId },
    });

    // Insert new permissions
    if (permissionIds.length > 0) {
      await tx.rolePermission.createMany({
        data: permissionIds.map((pid) => ({
          roleId,
          permissionId: pid,
        })),
        skipDuplicates: true,
      });
    }
  });

  return apiSuccess({
    message: `Updated permissions for role "${role.name}".`,
    roleId,
    assignedCount: permissionIds.length,
  });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return apiError("UNAUTHORIZED", "Authentication required.", 401);
  }

  const { id: roleId } = await params;
  const sellerId = session.sellerId || "bageshwari-tractors";

  const role = await prisma.role.findFirst({
    where: { id: roleId, sellerId },
  });

  if (!role) {
    return apiError("NOT_FOUND", "Role not found or cannot be deleted.", 404);
  }

  if (role.systemRole) {
    return apiError("FORBIDDEN", "System default roles cannot be deleted.", 403);
  }

  await prisma.role.delete({
    where: { id: roleId },
  });

  return apiSuccess({
    message: `Role "${role.name}" deleted successfully.`,
  });
}
