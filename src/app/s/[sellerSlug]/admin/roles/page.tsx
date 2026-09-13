import { prisma } from "@/lib/db";
import { getTenantContext, hasRole } from "@/lib/tenant";
import { redirect } from "next/navigation";
import { RbacMatrixClient, type SerializedRole, type SerializedPermission } from "@/components/admin/rbac-matrix-client";

interface RolesPageProps {
  params: Promise<{ sellerSlug: string }>;
}

export default async function AdminRolesPage({ params }: RolesPageProps) {
  const { sellerSlug } = await params;
  const ctx = await getTenantContext(sellerSlug);

  if (!hasRole(ctx, "SUPER_ADMIN", "PLATFORM_ADMIN", "SELLER_OWNER", "ADMIN", "STAFF")) {
    redirect("/admin");
  }

  const [roles, permissions] = await Promise.all([
    prisma.role.findMany({
      where: { OR: [{ sellerId: ctx.sellerId }, { sellerId: null }] },
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

  const serializedRoles: SerializedRole[] = roles.map((r) => ({
    id: r.id,
    code: r.code,
    name: r.name,
    description: r.description,
    systemRole: r.systemRole,
    userCount: r._count.userRoles,
    permissionIds: r.permissions.map((p) => p.permissionId),
  }));

  const serializedPermissions: SerializedPermission[] = permissions.map((p) => ({
    id: p.id,
    code: p.code,
    name: p.name,
    description: p.description,
    module: p.module,
  }));

  return (
    <div className="mx-auto w-full max-w-[1500px] p-4 md:p-7">
      <RbacMatrixClient
        initialRoles={serializedRoles}
        permissions={serializedPermissions}
        sellerSlug={sellerSlug}
      />
    </div>
  );
}
