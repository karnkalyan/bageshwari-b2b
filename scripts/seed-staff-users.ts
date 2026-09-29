import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { ensureRbacPermissions } from "../src/lib/auth/rbac-sync";

const prisma = new PrismaClient();

const staffUsersToSeed = [
  {
    name: "GOKARNA DEVKOTA",
    email: "gokarna@btnepal.com.np",
    phone: "9801209260",
    roleCodes: ["SALESPERSON", "SALES_REP"],
  },
  {
    name: "JOGINDER KASHYAP",
    email: "joginder@btnepal.com.np",
    phone: null,
    roleCodes: ["WAREHOUSE_MANAGER"],
  },
  {
    name: "RAM BACHAN",
    email: "ram@btnepal.com.np",
    phone: null,
    roleCodes: ["WAREHOUSE_USER"],
  },
  {
    name: "ANURAG AWASTHI",
    email: "anurag@btnepal.com.np",
    phone: null,
    roleCodes: ["WAREHOUSE_MANAGER"],
  },
  {
    name: "DILIP PASI",
    email: "dilip@btnepal.com.np",
    phone: "9704588504",
    roleCodes: ["DISPATCH_USER"],
  },
  {
    name: "ABHISHEK MISHRA",
    email: "abhishek@btnepal.com.np",
    phone: null,
    roleCodes: ["ACCOUNTANT"],
  },
  {
    name: "PRAJWAL BUDATHOKI",
    email: "prajwal@btnepal.com.np",
    phone: "9704588501",
    roleCodes: ["ACCOUNT_MANAGER", "ACCOUNTS_MANAGER"],
  },
  {
    name: "Bageshwari B2B Admin",
    email: "admin@bageshwarib2b.local",
    phone: null,
    roleCodes: ["ADMIN", "SUPER_ADMIN"],
  },
];

async function main() {
  console.log("🚀 Seeding and verifying staff users & permissions...");

  const seller = await prisma.seller.findFirst({
    where: { status: "ACTIVE" },
  });

  if (!seller) {
    throw new Error("No active seller found.");
  }

  const branch = await prisma.sellerBranch.findFirst({
    where: { sellerId: seller.id },
  });

  // 1. Ensure all RBAC roles & permissions are in sync
  await ensureRbacPermissions(seller.id);

  // Also ensure STAFF role exists
  await prisma.role.upsert({
    where: { sellerId_code: { sellerId: seller.id, code: "STAFF" } },
    update: { name: "Staff", description: "General workspace staff" },
    create: {
      sellerId: seller.id,
      code: "STAFF",
      name: "Staff",
      description: "General workspace staff",
      scope: "SELLER",
      systemRole: true,
    },
  });

  const defaultPassword = process.env.SEED_PASSWORD || "ChangeMe-Bageshwari-2026!";
  const passwordHash = await bcrypt.hash(defaultPassword, 12);

  for (const item of staffUsersToSeed) {
    const existing = await prisma.user.findUnique({ where: { email: item.email.toLowerCase().trim() } });
    const user = await prisma.user.upsert({
      where: { email: item.email.toLowerCase().trim() },
      update: {
        name: item.name,
        phone: item.phone ?? existing?.phone,
        status: "ACTIVE",
        emailVerified: new Date(),
        loginAttempts: 0,
        lockedUntil: null,
        deletedAt: null,
      },
      create: {
        name: item.name,
        email: item.email.toLowerCase().trim(),
        phone: item.phone,
        passwordHash,
        status: "ACTIVE",
        emailVerified: new Date(),
      },
    });

    // Ensure Seller Membership
    const membership = await prisma.userSellerMembership.upsert({
      where: {
        userId_sellerId: {
          userId: user.id,
          sellerId: seller.id,
        },
      },
      update: {
        status: "active",
        branchId: branch?.id || null,
        isDefault: true,
      },
      create: {
        userId: user.id,
        sellerId: seller.id,
        branchId: branch?.id || null,
        status: "active",
        isDefault: true,
      },
    });

    // Assign Roles
    for (const rCode of item.roleCodes) {
      let role = await prisma.role.findFirst({
        where: {
          code: rCode,
          OR: [{ sellerId: seller.id }, { sellerId: null }],
        },
      });

      if (!role) {
        role = await prisma.role.create({
          data: {
            code: rCode,
            name: rCode.replace(/_/g, " "),
            sellerId: rCode === "SUPER_ADMIN" || rCode === "PLATFORM_ADMIN" ? null : seller.id,
            scope: rCode === "SUPER_ADMIN" || rCode === "PLATFORM_ADMIN" ? "PLATFORM" : "SELLER",
            systemRole: true,
          },
        });
      }

      await prisma.userRole.upsert({
        where: {
          userId_roleId_sellerId: {
            userId: user.id,
            roleId: role.id,
            sellerId: role.sellerId || seller.id,
          },
        },
        update: {
          membershipId: membership.id,
        },
        create: {
          userId: user.id,
          roleId: role.id,
          sellerId: role.sellerId || seller.id,
          membershipId: membership.id,
        },
      });
    }

    console.log(`✅ Seeded/Updated User: ${item.name} (${item.email}) -> Roles: [${item.roleCodes.join(", ")}]`);
  }

  // Re-run permission sync to link all role permissions
  await ensureRbacPermissions(seller.id);
  console.log("🎉 All staff users successfully seeded with full permissions!");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
