import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    include: {
      userRoles: {
        include: {
          role: {
            include: {
              permissions: {
                include: { permission: true },
              },
            },
          },
        },
      },
      memberships: true,
    },
  });

  console.log("TOTAL USERS:", users.length);
  for (const u of users) {
    const roles = u.userRoles.map((ur) => ur.role.code).join(", ");
    const perms = u.userRoles.flatMap((ur) => ur.role.permissions.map((rp) => rp.permission.code));
    console.log(`- ${u.name} <${u.email}> (${u.status})`);
    console.log(`  Roles: [${roles}]`);
    console.log(`  Permissions count: ${perms.length}`);
    if (perms.length <= 5) {
      console.log(`  Permissions: ${perms.join(", ")}`);
    }
  }

  const allRoles = await prisma.role.findMany({
    include: {
      permissions: { include: { permission: true } },
    },
  });
  console.log("\nALL ROLES:");
  for (const r of allRoles) {
    console.log(`- Role: ${r.code} (${r.name}), SellerId: ${r.sellerId}, Perms: ${r.permissions.length}`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
