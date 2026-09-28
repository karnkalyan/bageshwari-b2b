import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🧹 Starting full cleanup...\n");

  // 1. Identify Admin User
  const adminUser = await prisma.user.findUnique({
    where: { email: "admin@bageshwarib2b.local" },
  });

  if (!adminUser) {
    throw new Error("Admin user admin@bageshwarib2b.local not found!");
  }
  console.log(`👤 Admin found: ${adminUser.email} (ID: ${adminUser.id})`);

  // Ensure Admin has Seller Membership and Seller Admin Role
  const seller = await prisma.seller.findFirst({ where: { status: "ACTIVE" } });
  const branch = await prisma.sellerBranch.findFirst();
  const sellerAdminRole = await prisma.role.findFirst({
    where: { code: { in: ["ADMIN", "SELLER_ADMIN", "SELLER_OWNER"] } },
  });

  if (seller && branch && sellerAdminRole) {
    const membership = await prisma.userSellerMembership.upsert({
      where: {
        userId_sellerId: {
          userId: adminUser.id,
          sellerId: seller.id,
        },
      },
      update: {
        status: "active",
        isDefault: true,
        branchId: branch.id,
        dealerId: null,
      },
      create: {
        userId: adminUser.id,
        sellerId: seller.id,
        branchId: branch.id,
        status: "active",
        isDefault: true,
      },
    });

    await prisma.userRole.upsert({
      where: {
        userId_roleId_sellerId: {
          userId: adminUser.id,
          roleId: sellerAdminRole.id,
          sellerId: seller.id,
        },
      },
      update: {},
      create: {
        userId: adminUser.id,
        roleId: sellerAdminRole.id,
        sellerId: seller.id,
        membershipId: membership.id,
      },
    });
    console.log("✅ Admin assigned seller membership & admin role.");
  }

  // 2. Delete Orders and Transactional Chains
  console.log("🗑️ Deleting orders, picklists, invoices, payments...");
  await prisma.payment.deleteMany({});
  await prisma.deliveryEvent.deleteMany({});
  await prisma.package.deleteMany({});
  await prisma.shipment.deleteMany({});
  await prisma.creditApproval.deleteMany({});
  await prisma.finalInvoiceItem.deleteMany({});
  await prisma.finalInvoice.deleteMany({});
  await prisma.pickListException.deleteMany({});
  await prisma.pickListItem.deleteMany({});
  await prisma.pickList.deleteMany({});
  await prisma.proformaInvoiceRevision.deleteMany({});
  await prisma.proformaInvoiceItem.deleteMany({});
  await prisma.proformaInvoice.deleteMany({});
  await prisma.dealerConfirmation.deleteMany({});
  await prisma.orderRemark.deleteMany({});
  await prisma.orderStatusHistory.deleteMany({});
  await prisma.orderRevisionItem.deleteMany({});
  await prisma.orderRevision.deleteMany({});
  await prisma.orderItem.deleteMany({});
  await prisma.order.deleteMany({});
  await prisma.inquiryFollowUp.deleteMany({});
  await prisma.inquiry.deleteMany({});

  // 3. Delete Inventory and Stock Transactions
  console.log("🗑️ Deleting inventory items and stock movements...");
  await prisma.stockReservation.deleteMany({});
  await prisma.stockAdjustment.deleteMany({});
  await prisma.inventoryTransaction.deleteMany({});
  await prisma.inventory.deleteMany({});

  // 4. Delete Products and Product-related Tables
  console.log("🗑️ Deleting products, prices, variants, media, categories, brands...");
  await prisma.productPrice.deleteMany({});
  await prisma.productImage.deleteMany({});
  await prisma.productDocument.deleteMany({});
  await prisma.productVariantAttribute.deleteMany({});
  await prisma.productVariant.deleteMany({});
  await prisma.productAttributeValue.deleteMany({});
  await prisma.productAttribute.deleteMany({});
  await prisma.product.deleteMany({});
  await prisma.productBrand.deleteMany({});
  await prisma.productCategory.deleteMany({});

  // Clean all search queries and audit logs
  await prisma.auditLog.deleteMany({});

  // 5. Delete Dealers and Dealer-related Tables
  console.log("🗑️ Deleting dealers, dealer users, credit limits...");
  await prisma.dealerDocument.deleteMany({});
  await prisma.dealerCreditProfile.deleteMany({});
  await prisma.dealerAddress.deleteMany({});
  await prisma.dealerApplication.deleteMany({});
  await prisma.dealerEmployee.deleteMany({});

  // Disassociate any dealer from memberships before deleting dealer
  await prisma.userSellerMembership.updateMany({
    data: { dealerId: null },
  });

  await prisma.salespersonDealerAssignment.deleteMany({});
  await prisma.dealer.deleteMany({});

  // 6. Delete other users except Admin
  console.log("🗑️ Deleting all other users (keeping only admin)...");
  await prisma.loginHistory.deleteMany({
    where: { userId: { not: adminUser.id } },
  });
  await prisma.auditLog.deleteMany({
    where: { userId: { not: adminUser.id } },
  });
  await prisma.notification.deleteMany({
    where: { userId: { not: adminUser.id } },
  });
  await prisma.userAppearancePreference.deleteMany({
    where: { userId: { not: adminUser.id } },
  });
  await prisma.account.deleteMany({
    where: { userId: { not: adminUser.id } },
  });
  await prisma.session.deleteMany({
    where: { userId: { not: adminUser.id } },
  });
  await prisma.passwordResetToken.deleteMany({
    where: { userId: { not: adminUser.id } },
  });
  await prisma.twoFactorToken.deleteMany({
    where: { userId: { not: adminUser.id } },
  });
  await prisma.userRole.deleteMany({
    where: { userId: { not: adminUser.id } },
  });
  await prisma.userSellerMembership.deleteMany({
    where: { userId: { not: adminUser.id } },
  });

  const deletedUsers = await prisma.user.deleteMany({
    where: { id: { not: adminUser.id } },
  });
  console.log(`Deleted ${deletedUsers.count} non-admin users.`);

  // 7. Verify Remaining Counts
  const remainingUsers = await prisma.user.count();
  const remainingProducts = await prisma.product.count();
  const remainingDealers = await prisma.dealer.count();
  const remainingOrders = await prisma.order.count();
  const remainingInventory = await prisma.inventory.count();

  console.log("\n✨ Cleanup finished successfully!");
  console.log({
    remainingUsers,
    remainingProducts,
    remainingDealers,
    remainingOrders,
    remainingInventory,
  });
}

main()
  .catch((e) => {
    console.error("Cleanup error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
