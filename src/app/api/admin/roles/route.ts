import { NextRequest } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/api-response";
import { prisma } from "@/lib/db";

const createRoleSchema = z.object({
  code: z.string().trim().min(2).max(50),
  name: z.string().trim().min(2).max(100),
  description: z.string().trim().max(255).optional(),
  permissionIds: z.array(z.string()).optional(),
});

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return apiError("UNAUTHORIZED", "Authentication required.", 401);
  }

  const sellerId = session.sellerId || "bageshwari-tractors";

  const [roles, permissions] = await Promise.all([
    prisma.role.findMany({
      where: { OR: [{ sellerId }, { sellerId: null }] },
      include: {
        permissions: { select: { permissionId: true } },
        _count: { select: { userRoles: true } },
      },
      orderBy: [{ systemRole: "desc" }, { name: "asc" }],
    }),
    prisma.permission.findMany({
      orderBy: [{ module: "asc" }, { code: "asc" }],
    }),
  ]);

  return apiSuccess({
    roles: roles.map((r) => ({
      id: r.id,
      code: r.code,
      name: r.name,
      description: r.description,
      systemRole: r.systemRole,
      scope: r.scope,
      userCount: r._count.userRoles,
      permissionIds: r.permissions.map((p) => p.permissionId),
    })),
    permissions: permissions.map((p) => ({
      id: p.id,
      code: p.code,
      name: p.name,
      description: p.description,
      module: p.module,
    })),
  });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return apiError("UNAUTHORIZED", "Authentication required.", 401);
  }

  const sellerId = session.sellerId || "bageshwari-tractors";

  let body: any;
  try {
    body = await req.json();
  } catch {
    return apiError("INVALID_INPUT", "Invalid JSON payload.", 400);
  }

  const parsed = createRoleSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("VALIDATION_FAILED", "Invalid fields provided.", 422, parsed.error.format());
  }

  const { code, name, description, permissionIds = [] } = parsed.data;
  const normalizedCode = code.toUpperCase().replace(/\s+/g, "_");

  // Check duplicate
  const existing = await prisma.role.findFirst({
    where: { code: normalizedCode, OR: [{ sellerId }, { sellerId: null }] },
  });
  if (existing) {
    return apiError("DUPLICATE", `Role with code "${normalizedCode}" already exists.`, 400);
  }

  const createdRole = await prisma.$transaction(async (tx) => {
    const role = await tx.role.create({
      data: {
        code: normalizedCode,
        name,
        description: description || null,
        sellerId,
        scope: "SELLER",
        systemRole: false,
        isActive: true,
      },
    });

    if (permissionIds.length > 0) {
      await tx.rolePermission.createMany({
        data: permissionIds.map((pId) => ({
          roleId: role.id,
          permissionId: pId,
        })),
        skipDuplicates: true,
      });
    }

    return role;
  });

  return apiSuccess({
    message: `Role "${name}" created successfully.`,
    role: createdRole,
  }, { status: 201 });
}
