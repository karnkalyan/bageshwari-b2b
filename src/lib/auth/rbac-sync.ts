import { prisma } from "@/lib/db";

/**
 * Ensures standard RBAC permissions exist in the database and are linked to administrative roles.
 * Runs idempotently during role/user administration page requests to ensure database consistency.
 */
export async function ensureRbacPermissions(sellerId?: string) {
  try {
    const standardPermissions = [
      { code: "user.create", name: "Create User", module: "user", description: "Create internal user accounts" },
      { code: "user.read", name: "Read User", module: "user", description: "View user directory and profiles" },
      { code: "user.edit", name: "Edit User", module: "user", description: "Edit user profile, name, contact details and status" },
      { code: "user.update", name: "Update User", module: "user", description: "Update user details and credentials" },
      { code: "user.disable", name: "Disable User", module: "user", description: "Deactivate or suspend user accounts" },
      { code: "user.manage", name: "Manage Users", module: "user", description: "Full user management privileges" },
      { code: "role.manage", name: "Manage Roles", module: "role", description: "Manage RBAC roles and permissions matrix" },
    ];

    for (const p of standardPermissions) {
      await prisma.permission.upsert({
        where: { code: p.code },
        update: { name: p.name, module: p.module, description: p.description },
        create: p,
      });
    }

    // Now assign to admin/owner roles if they exist
    const adminRoles = await prisma.role.findMany({
      where: {
        code: { in: ["SUPER_ADMIN", "PLATFORM_ADMIN", "SELLER_OWNER", "SELLER_ADMIN", "ADMIN"] },
        ...(sellerId ? { OR: [{ sellerId }, { sellerId: null }] } : {}),
      },
    });

    const allUserPerms = await prisma.permission.findMany({
      where: { code: { in: standardPermissions.map((sp) => sp.code) } },
    });

    for (const role of adminRoles) {
      for (const perm of allUserPerms) {
        await prisma.rolePermission.upsert({
          where: { roleId_permissionId: { roleId: role.id, permissionId: perm.id } },
          update: {},
          create: { roleId: role.id, permissionId: perm.id },
        });
      }
    }

    // Normalize any legacy fractional VAT values (e.g. 0.13 -> 13.00) in database
    try {
      await prisma.$executeRawUnsafe(`UPDATE Product SET taxPercent = taxPercent * 100 WHERE taxPercent > 0 AND taxPercent <= 1.0`);
      await prisma.$executeRawUnsafe(`UPDATE ProductCategory SET taxPercent = taxPercent * 100 WHERE taxPercent > 0 AND taxPercent <= 1.0`);
      await prisma.$executeRawUnsafe(`UPDATE CompanyProfile SET defaultVatPercent = defaultVatPercent * 100 WHERE defaultVatPercent > 0 AND defaultVatPercent <= 1.0`);
    } catch {
      // ignore
    }
  } catch (err) {
    console.warn("Failed to ensure RBAC permissions:", err);
  }
}
