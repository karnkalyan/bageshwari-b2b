import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import ExcelJS from "exceljs";
import * as path from "path";
import * as fs from "fs";

const prisma = new PrismaClient();

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

function generateSku(name: string, index: number): string {
  const prefix = name
    .replace(/[^A-Z0-9\s]/gi, "")
    .split(/\s+/)
    .slice(0, 3)
    .map((w) => w.substring(0, 3).toUpperCase())
    .join("");
  return `${prefix}-${String(index).padStart(5, "0")}`;
}

async function main() {
  console.log("🌱 Starting Bageshwari B2B seed...\n");

  // ============================================================
  // 2. PERMISSIONS
  // ============================================================
  console.log("🔐 Creating permissions...");
  const permissionData = [
    // Theme & Content
    { code: "theme.manage", name: "Manage Themes", module: "theme" },
    { code: "homepage.manage", name: "Manage Homepage", module: "homepage" },
    // Users
    { code: "user.create", name: "Create User", module: "user" },
    { code: "user.read", name: "Read User", module: "user" },
    { code: "user.update", name: "Update User", module: "user" },
    { code: "user.disable", name: "Disable User", module: "user" },
    { code: "role.manage", name: "Manage Roles", module: "role" },
    // Dealers
    { code: "dealer.create", name: "Create Dealer", module: "dealer" },
    { code: "dealer.read", name: "Read Dealer", module: "dealer" },
    { code: "dealer.approve", name: "Approve Dealer", module: "dealer" },
    { code: "dealer.update", name: "Update Dealer", module: "dealer" },
    { code: "dealer.assign_salesperson", name: "Assign Salesperson", module: "dealer" },
    { code: "dealer.manage_credit", name: "Manage Credit", module: "dealer" },
    // Products
    { code: "product.create", name: "Create Product", module: "product" },
    { code: "product.read", name: "Read Product", module: "product" },
    { code: "product.update", name: "Update Product", module: "product" },
    { code: "product.archive", name: "Archive Product", module: "product" },
    { code: "product.manage_media", name: "Manage Product Media", module: "product" },
    { code: "product.manage_price", name: "Manage Prices", module: "product" },
    // Inventory
    { code: "inventory.read", name: "Read Inventory", module: "inventory" },
    { code: "inventory.adjust", name: "Adjust Inventory", module: "inventory" },
    { code: "inventory.transfer", name: "Transfer Inventory", module: "inventory" },
    // Orders
    { code: "order.create", name: "Create Order", module: "order" },
    { code: "order.read", name: "Read Order", module: "order" },
    { code: "order.submit", name: "Submit Order", module: "order" },
    { code: "order.review", name: "Review Order", module: "order" },
    { code: "order.revise", name: "Revise Order", module: "order" },
    { code: "order.confirm", name: "Confirm Order", module: "order" },
    { code: "order.cancel", name: "Cancel Order", module: "order" },
    // Proforma
    { code: "proforma.generate", name: "Generate Proforma", module: "proforma" },
    { code: "proforma.confirm", name: "Confirm Proforma", module: "proforma" },
    // Pick List
    { code: "picklist.generate", name: "Generate Pick List", module: "picklist" },
    { code: "picklist.assign", name: "Assign Pick List", module: "picklist" },
    { code: "picklist.complete", name: "Complete Pick List", module: "picklist" },
    // Invoice
    { code: "invoice.generate", name: "Generate Invoice", module: "invoice" },
    { code: "invoice.read", name: "Read Invoice", module: "invoice" },
    // Payment
    { code: "payment.record", name: "Record Payment", module: "payment" },
    { code: "payment.read", name: "Read Payment", module: "payment" },
    { code: "credit.approve", name: "Approve Credit", module: "credit" },
    // Packing & Dispatch
    { code: "packing.manage", name: "Manage Packing", module: "packing" },
    { code: "shipment.dispatch", name: "Dispatch Shipment", module: "shipment" },
    { code: "shipment.read", name: "Read Shipment", module: "shipment" },
    { code: "delivery.update", name: "Update Delivery", module: "delivery" },
    // Reports
    { code: "report.view", name: "View Reports", module: "report" },
    { code: "report.export", name: "Export Reports", module: "report" },
    { code: "audit.view", name: "View Audit Logs", module: "audit" },
  ];

  const permissions: Record<string, string> = {};
  for (const p of permissionData) {
    const perm = await prisma.permission.upsert({
      where: { code: p.code },
      update: { name: p.name, module: p.module },
      create: p,
    });
    permissions[p.code] = perm.id;
  }

  // ============================================================
  // 3. PLATFORM ROLES
  // ============================================================
  console.log("👥 Creating roles...");
  const superAdminRole = await prisma.role.upsert({
    where: { id: "role-platform-super-admin" },
    update: { name: "Super Admin", description: "Bageshwari B2B platform super administrator" },
    create: {
      id: "role-platform-super-admin",
      sellerId: null,
      code: "SUPER_ADMIN",
      name: "Super Admin",
      description: "Bageshwari B2B platform super administrator",
      scope: "PLATFORM",
      systemRole: true,
    },
  });
  // Assign all permissions to super admin
  for (const permId of Object.values(permissions)) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: superAdminRole.id, permissionId: permId } },
      update: {},
      create: { roleId: superAdminRole.id, permissionId: permId },
    });
  }

  const platformAdminRole = await prisma.role.upsert({
    where: { id: "role-platform-administrator" },
    update: { name: "Platform Administrator" },
    create: {
      id: "role-platform-administrator",
      sellerId: null,
      code: "PLATFORM_ADMIN",
      name: "Platform Administrator",
      scope: "PLATFORM",
      systemRole: true,
    },
  });

  // ============================================================
  // 4. PLATFORM SUPER ADMIN USER
  // ============================================================
  console.log("👤 Creating platform super admin...");
  const seedPassword = process.env.SEED_PASSWORD || process.env.NEXTAUTH_SECRET;
  if (!seedPassword || seedPassword.length < 12) {
    throw new Error("Set SEED_PASSWORD to at least 12 characters before seeding development users.");
  }
  const passwordHash = await bcrypt.hash(seedPassword, 12);

  const superAdmin = await prisma.user.upsert({
    where: { email: "admin@bageshwarib2b.local" },
    update: { name: "Bageshwari B2B Admin", passwordHash },
    create: {
      name: "Bageshwari B2B Admin",
      email: "admin@bageshwarib2b.local",
      passwordHash,
      status: "ACTIVE",
      emailVerified: new Date(),
    },
  });

  await prisma.userRole.upsert({
    where: { id: "user-role-platform-super-admin" },
    update: {},
    create: {
      id: "user-role-platform-super-admin",
      userId: superAdmin.id,
      roleId: superAdminRole.id,
    },
  });

  // ============================================================
  // 5. BAGESHWARI TRACTORS SELLER
  // ============================================================
  console.log("🏢 Creating Bageshwari Tractors seller...");
  const seller = await prisma.seller.upsert({
    where: { slug: "bageshwari" },
    update: {
      legalName: "Bageshwari Tractors",
      tradingName: "Bageshwari Tractors",
      email: null,
      phone: null,
      website: null,
      taxNumber: null,
      registrationNumber: null,
    },
    create: {
      code: "BAGESHWARI",
      slug: "bageshwari",
      legalName: "Bageshwari Tractors",
      tradingName: "Bageshwari Tractors",
      description:
        "Authorized dealer and distributor of tractors, agricultural equipment, spare parts, implements, accessories, lubricants, and workshop tools in Nepal.",
      industry: "Agricultural Equipment & Machinery",
      countryCode: "+977",
      country: "Nepal",
      province: "Lumbini Province",
      district: "Banke",
      city: "Nepalgunj",
      addressLine1: "Nepalgunj, Banke",
      currencyCode: "NPR",
      timeZone: "Asia/Kathmandu",
      defaultLanguage: "en",
      status: "ACTIVE",
      activeFrom: new Date(),
      createdById: superAdmin.id,
    },
  });

  // Remove obsolete SaaS-era development records. This application has one
  // company and no seller subscriptions or seller-management permissions.
  await prisma.sellerSubscription.deleteMany({ where: { sellerId: seller.id } });
  await prisma.seller.update({ where: { id: seller.id }, data: { subscriptionPlanId: null } });
  await prisma.rolePermission.deleteMany({
    where: {
      permission: {
        code: { in: ["platform.manage", "seller.create", "seller.read", "seller.update", "seller.suspend", "seller.impersonate", "subscription.manage"] },
      },
    },
  });
  await prisma.permission.deleteMany({
    where: { code: { in: ["platform.manage", "seller.create", "seller.read", "seller.update", "seller.suspend", "seller.impersonate", "subscription.manage"] } },
  });
  await prisma.subscriptionPlan.deleteMany();

  await (prisma.companyProfile as any).upsert({
    where: { id: "bageshwari-tractors" },
    update: {
      companyName: "Bageshwari Tractors Pvt. Ltd.",
      tradingName: "Bageshwari Tractors",
      contactPerson: "Managing Director",
      email: "info@bageshwari.com.np",
      phone: "+977-81-520123",
      website: "https://bageshwari.com.np",
      country: "Nepal",
      province: "Lumbini Province",
      district: "Banke",
      city: "Nepalgunj",
      address: "Main Highway Road, Nepalgunj, Banke, Nepal",
      panNumber: "302918239",
      vatNumber: "302918239",
      registrationNumber: "29384/078/079",
      defaultVatPercent: 13.0,
      pricesIncludeVat: false,
      bankName: "NIC ASIA Bank Ltd.",
      bankAccountName: "Bageshwari Tractors Pvt. Ltd.",
      bankAccountNumber: "0194291823901928",
      bankBranch: "Nepalgunj Main Branch",
      bankSwiftCode: "NICA-NP",
      currencyCode: "NPR",
      timeZone: "Asia/Kathmandu",
    },
    create: {
      id: "bageshwari-tractors",
      sellerId: seller.id,
      companyName: "Bageshwari Tractors Pvt. Ltd.",
      tradingName: "Bageshwari Tractors",
      contactPerson: "Managing Director",
      email: "info@bageshwari.com.np",
      phone: "+977-81-520123",
      website: "https://bageshwari.com.np",
      country: "Nepal",
      province: "Lumbini Province",
      district: "Banke",
      city: "Nepalgunj",
      address: "Main Highway Road, Nepalgunj, Banke, Nepal",
      panNumber: "302918239",
      vatNumber: "302918239",
      registrationNumber: "29384/078/079",
      defaultVatPercent: 13.0,
      pricesIncludeVat: false,
      bankName: "NIC ASIA Bank Ltd.",
      bankAccountName: "Bageshwari Tractors Pvt. Ltd.",
      bankAccountNumber: "0194291823901928",
      bankBranch: "Nepalgunj Main Branch",
      bankSwiftCode: "NICA-NP",
      currencyCode: "NPR",
      timeZone: "Asia/Kathmandu",
      footerText: "B2B agricultural machinery, parts and fulfilment for authorized dealers across Nepal.",
    },
  });

  // Domain
  await prisma.sellerDomain.upsert({
    where: { hostname: "bageshwari.localhost" },
    update: { sellerId: seller.id, isPrimary: true, verificationStatus: "VERIFIED", status: "ACTIVE" },
    create: {
      sellerId: seller.id,
      hostname: "bageshwari.localhost",
      isPrimary: true,
      verificationStatus: "VERIFIED",
      verifiedAt: new Date(),
      status: "ACTIVE",
    },
  });

  // Branch
  const mainBranch = await prisma.sellerBranch.upsert({
    where: { sellerId_code: { sellerId: seller.id, code: "HQ" } },
    update: { email: null, phone: null },
    create: {
      sellerId: seller.id,
      code: "HQ",
      name: "Nepalgunj Head Office",
      addressLine1: "Main Road, Nepalgunj",
      city: "Nepalgunj",
      district: "Banke",
      province: "Lumbini Province",
      country: "Nepal",
      isHeadOffice: true,
      isActive: true,
    },
  });

  // Warehouse
  const mainWarehouse = await prisma.warehouse.upsert({
    where: { sellerId_code: { sellerId: seller.id, code: "WH-NPG-01" } },
    update: { contactName: null, phone: null, email: null },
    create: {
      sellerId: seller.id,
      branchId: mainBranch.id,
      code: "WH-NPG-01",
      name: "Nepalgunj Main Warehouse",
      addressLine1: "Industrial Area, Nepalgunj",
      city: "Nepalgunj",
      district: "Banke",
      isActive: true,
    },
  });

  const transporters = [
    { code: "EVT", name: "Everest Transport", driver: "Arjun Thapa", vehicle: "BHE-1-KHA-2041" },
    { code: "BHL", name: "Bheri Logistics", driver: "Milan KC", vehicle: "BHE-2-KHA-1187" },
    { code: "NCS", name: "Nepalgunj Cargo Service", driver: "Dinesh Yadav", vehicle: "LUM-1-KHA-7712" },
    { code: "KFR", name: "Karnali Freight", driver: "Tek Bahadur Shahi", vehicle: "KAR-1-KHA-3305" },
  ];

  for (const item of transporters) {
    const company = await prisma.transportCompany.upsert({
      where: { sellerId_code: { sellerId: seller.id, code: item.code } },
      update: { name: item.name, status: "ACTIVE" },
      create: {
        sellerId: seller.id,
        code: item.code,
        name: item.name,
        address: "Nepalgunj, Banke, Nepal",
        status: "ACTIVE",
      },
    });
    const driver = await prisma.transportDriver.upsert({
      where: { id: `driver-${item.code.toLowerCase()}` },
      update: { name: item.driver, transportCompanyId: company.id, status: "ACTIVE" },
      create: {
        id: `driver-${item.code.toLowerCase()}`,
        sellerId: seller.id,
        transportCompanyId: company.id,
        name: item.driver,
        licenseNumber: `NP-${item.code}-2026`,
        status: "ACTIVE",
      },
    });
    await prisma.transportVehicle.upsert({
      where: { sellerId_vehicleNumber: { sellerId: seller.id, vehicleNumber: item.vehicle } },
      update: { transportCompanyId: company.id, driverId: driver.id, status: "ACTIVE" },
      create: {
        sellerId: seller.id,
        transportCompanyId: company.id,
        driverId: driver.id,
        vehicleNumber: item.vehicle,
        vehicleType: "Cargo truck",
        capacity: 8000,
        status: "ACTIVE",
      },
    });
  }

  // ============================================================
  // 6. SELLER ROLES
  // ============================================================
  console.log("👥 Creating seller roles...");
  const sellerRoleData = [
    { code: "ADMIN", name: "Administrator", scope: "SELLER" as const },
    { code: "SALES_REP", name: "Sales Representative", scope: "SELLER" as const },
    { code: "ACCOUNT_MANAGER", name: "Account Manager", scope: "SELLER" as const },
    { code: "ACCOUNTANT", name: "Accountant", scope: "SELLER" as const },
    { code: "WAREHOUSE_USER", name: "Warehouse User", scope: "SELLER" as const },
    { code: "READ_ONLY", name: "Read Only", scope: "SELLER" as const },
    { code: "SELLER_OWNER", name: "Seller Owner", scope: "SELLER" as const },
    { code: "SELLER_ADMIN", name: "Seller Administrator", scope: "SELLER" as const },
    { code: "BRANCH_ADMIN", name: "Branch Administrator", scope: "SELLER" as const },
    { code: "PRODUCT_MANAGER", name: "Product Manager", scope: "SELLER" as const },
    { code: "PRICING_MANAGER", name: "Pricing Manager", scope: "SELLER" as const },
    { code: "DEALER_MANAGER", name: "Dealer Manager", scope: "SELLER" as const },
    { code: "SALES_MANAGER", name: "Sales Manager", scope: "SELLER" as const },
    { code: "SALESPERSON", name: "Salesperson", scope: "SELLER" as const },
    { code: "ACCOUNTS_MANAGER", name: "Accounts Manager", scope: "SELLER" as const },
    { code: "ACCOUNTS_USER", name: "Accounts User", scope: "SELLER" as const },
    { code: "WAREHOUSE_MANAGER", name: "Warehouse Manager", scope: "SELLER" as const },
    { code: "WAREHOUSE_PICKER", name: "Warehouse Picker", scope: "SELLER" as const },
    { code: "PACKING_USER", name: "Packing User", scope: "SELLER" as const },
    { code: "DISPATCH_USER", name: "Dispatch User", scope: "SELLER" as const },
    { code: "REPORT_VIEWER", name: "Report Viewer", scope: "SELLER" as const },
    { code: "SELLER_AUDITOR", name: "Seller Auditor", scope: "SELLER" as const },
  ];

  const sellerRoles: Record<string, string> = {};
  for (const rd of sellerRoleData) {
    const role = await prisma.role.upsert({
      where: { sellerId_code: { sellerId: seller.id, code: rd.code } },
      update: {},
      create: { sellerId: seller.id, ...rd, systemRole: true },
    });
    sellerRoles[rd.code] = role.id;
  }

  const assignPermissions = async (roleId: string, permissionCodes: string[]) => {
    for (const permissionCode of permissionCodes) {
      const permissionId = permissions[permissionCode];
      if (!permissionId) continue;
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId, permissionId } },
        update: {},
        create: { roleId, permissionId },
      });
    }
  };

  // Assign permissions to seller roles
  const sellerOwnerPerms = Object.values(permissions);
  for (const permId of sellerOwnerPerms) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: sellerRoles.SELLER_OWNER, permissionId: permId } },
      update: {},
      create: { roleId: sellerRoles.SELLER_OWNER, permissionId: permId },
    });
  }

  const sellerPermissionCodes = Object.keys(permissions).filter((code) =>
    !code.startsWith("platform.") && !["seller.create", "seller.suspend", "seller.impersonate"].includes(code)
  );
  await assignPermissions(sellerRoles.SELLER_ADMIN, sellerPermissionCodes);
  await assignPermissions(sellerRoles.ADMIN, sellerPermissionCodes);
  await assignPermissions(sellerRoles.PRODUCT_MANAGER, [
    "product.create", "product.read", "product.update", "product.archive", "product.manage_media",
    "inventory.read", "report.view",
  ]);
  await assignPermissions(sellerRoles.PRICING_MANAGER, ["product.read", "product.manage_price", "dealer.read", "report.view"]);
  await assignPermissions(sellerRoles.DEALER_MANAGER, [
    "dealer.create", "dealer.read", "dealer.approve", "dealer.update", "dealer.assign_salesperson", "dealer.manage_credit",
  ]);
  await assignPermissions(sellerRoles.SALES_MANAGER, [
    "dealer.read", "dealer.assign_salesperson", "product.read", "order.create", "order.read", "order.submit", "report.view",
  ]);
  await assignPermissions(sellerRoles.SALESPERSON, ["dealer.read", "product.read", "order.create", "order.read", "order.submit"]);
  await assignPermissions(sellerRoles.SALES_REP, ["dealer.read", "product.read", "order.create", "order.read", "order.submit"]);
  await assignPermissions(sellerRoles.ACCOUNTS_MANAGER, [
    "dealer.read", "dealer.manage_credit", "product.read", "inventory.read", "order.read", "order.review", "order.revise",
    "proforma.generate", "proforma.confirm", "invoice.generate", "invoice.read", "payment.record", "payment.read",
    "credit.approve", "report.view",
  ]);
  await assignPermissions(sellerRoles.ACCOUNTS_USER, [
    "dealer.read", "product.read", "inventory.read", "order.read", "order.review", "order.revise",
    "proforma.generate", "invoice.generate", "invoice.read", "payment.record", "payment.read",
  ]);
  await assignPermissions(sellerRoles.ACCOUNT_MANAGER, [
    "dealer.read", "dealer.manage_credit", "product.read", "inventory.read", "order.read", "order.review", "order.revise",
    "proforma.generate", "proforma.confirm", "invoice.generate", "invoice.read", "payment.record", "payment.read",
    "credit.approve", "report.view",
  ]);
  await assignPermissions(sellerRoles.ACCOUNTANT, [
    "dealer.read", "product.read", "inventory.read", "order.read", "order.review", "order.revise",
    "proforma.generate", "invoice.generate", "invoice.read", "payment.record", "payment.read",
  ]);
  await assignPermissions(sellerRoles.WAREHOUSE_MANAGER, [
    "product.read", "inventory.read", "inventory.adjust", "inventory.transfer", "order.read",
    "picklist.generate", "picklist.assign", "picklist.complete", "packing.manage", "shipment.read",
  ]);
  await assignPermissions(sellerRoles.WAREHOUSE_PICKER, ["product.read", "inventory.read", "order.read", "picklist.complete"]);
  await assignPermissions(sellerRoles.WAREHOUSE_USER, ["product.read", "inventory.read", "order.read", "picklist.complete", "packing.manage"]);
  await assignPermissions(sellerRoles.READ_ONLY, ["product.read", "dealer.read", "order.read", "invoice.read", "shipment.read", "report.view"]);
  await assignPermissions(sellerRoles.PACKING_USER, ["order.read", "packing.manage", "shipment.read"]);
  await assignPermissions(sellerRoles.DISPATCH_USER, ["order.read", "packing.manage", "shipment.dispatch", "shipment.read", "delivery.update"]);
  await assignPermissions(sellerRoles.REPORT_VIEWER, ["report.view"]);
  await assignPermissions(sellerRoles.SELLER_AUDITOR, ["seller.read", "order.read", "invoice.read", "payment.read", "report.view", "audit.view"]);

  // Dealer roles
  const dealerRoleData = [
    { code: "DEALER_OWNER", name: "Dealer Owner", scope: "DEALER" as const },
    { code: "DEALER_ADMIN", name: "Dealer Administrator", scope: "DEALER" as const },
    { code: "DEALER_BUYER", name: "Dealer Buyer", scope: "DEALER" as const },
    { code: "DEALER_ACCOUNTS_USER", name: "Dealer Accounts User", scope: "DEALER" as const },
    { code: "DEALER_VIEWER", name: "Dealer Viewer", scope: "DEALER" as const },
  ];

  const dealerRoles: Record<string, string> = {};
  for (const rd of dealerRoleData) {
    const role = await prisma.role.upsert({
      where: { sellerId_code: { sellerId: seller.id, code: rd.code } },
      update: {},
      create: { sellerId: seller.id, ...rd, systemRole: true },
    });
    dealerRoles[rd.code] = role.id;
  }

  await assignPermissions(dealerRoles.DEALER_OWNER, [
    "product.read", "order.create", "order.read", "order.submit", "order.confirm", "order.cancel",
    "proforma.confirm", "invoice.read", "payment.read", "shipment.read",
  ]);
  await assignPermissions(dealerRoles.DEALER_ADMIN, [
    "product.read", "order.create", "order.read", "order.submit", "order.confirm", "order.cancel",
    "proforma.confirm", "invoice.read", "payment.read", "shipment.read",
  ]);
  await assignPermissions(dealerRoles.DEALER_BUYER, ["product.read", "order.create", "order.read", "order.submit", "order.confirm", "shipment.read"]);
  await assignPermissions(dealerRoles.DEALER_ACCOUNTS_USER, ["order.read", "proforma.confirm", "invoice.read", "payment.read"]);
  await assignPermissions(dealerRoles.DEALER_VIEWER, ["product.read", "order.read", "invoice.read", "shipment.read"]);

  // ============================================================
  // 7. SELLER USERS
  // ============================================================
  console.log("👤 Creating seller users...");
  const userPassword = await bcrypt.hash(seedPassword, 12);

  const createSellerUser = async (
    name: string,
    email: string,
    roleCode: string,
    dealerId?: string
  ) => {
    const user = await prisma.user.upsert({
      where: { email },
      update: {
        name,
        passwordHash: userPassword,
        status: "ACTIVE",
        emailVerified: new Date(),
        loginAttempts: 0,
        lockedUntil: null,
        deletedAt: null,
      },
      create: {
        name,
        email,
        passwordHash: userPassword,
        status: "ACTIVE",
        emailVerified: new Date(),
      },
    });

    const membership = await prisma.userSellerMembership.upsert({
      where: { userId_sellerId: { userId: user.id, sellerId: seller.id } },
      update: {},
      create: {
        userId: user.id,
        sellerId: seller.id,
        branchId: mainBranch.id,
        dealerId: dealerId || undefined,
        isDefault: true,
      },
    });

    const roleId = sellerRoles[roleCode] || dealerRoles[roleCode];
    if (roleId) {
      await prisma.userRole.upsert({
        where: { userId_roleId_sellerId: { userId: user.id, roleId, sellerId: seller.id } },
        update: {},
        create: { userId: user.id, roleId, sellerId: seller.id, membershipId: membership.id },
      });
    }

    return user;
  };

  const sellerOwner = await createSellerUser("Rajesh Agrawal", "owner@bageshwari.com.np", "SELLER_OWNER");
  const sellerAdmin = await createSellerUser("Sita Sharma", "admin@bageshwari.com.np", "ADMIN");
  const productManager = await createSellerUser("Krishna Poudel", "products@bageshwari.com.np", "PRODUCT_MANAGER");
  const accountsManager = await createSellerUser("Laxmi Thapa", "accounts@bageshwari.com.np", "ACCOUNTANT");
  const warehouseManager = await createSellerUser("Ram Bahadur Rana", "warehouse@bageshwari.com.np", "WAREHOUSE_USER");
  const salesperson1 = await createSellerUser("Bikram KC", "bikram@bageshwari.com.np", "SALES_REP");
  const salesperson2 = await createSellerUser("Sunita Adhikari", "sunita@bageshwari.com.np", "SALES_REP");
  const salesperson3 = await createSellerUser("Nabin Tharu", "nabin@bageshwari.com.np", "SALES_REP");
  const dispatchUser = await createSellerUser("Gopal Shrestha", "dispatch@bageshwari.com.np", "DISPATCH_USER");

  // ============================================================
  // 8. DEALER GROUPS & PRICING GROUPS
  // ============================================================
  console.log("📊 Creating dealer groups...");
  const premiumGroup = await prisma.dealerGroup.upsert({
    where: { sellerId_code: { sellerId: seller.id, code: "PREMIUM" } },
    update: {},
    create: {
      sellerId: seller.id,
      code: "PREMIUM",
      name: "Premium Dealers",
      description: "High-volume dealers with best pricing",
    },
  });

  const standardGroup = await prisma.dealerGroup.upsert({
    where: { sellerId_code: { sellerId: seller.id, code: "STANDARD" } },
    update: {},
    create: {
      sellerId: seller.id,
      code: "STANDARD",
      name: "Standard Dealers",
      description: "Regular dealers with standard pricing",
    },
  });

  const newDealerGroup = await prisma.dealerGroup.upsert({
    where: { sellerId_code: { sellerId: seller.id, code: "NEW" } },
    update: {},
    create: {
      sellerId: seller.id,
      code: "NEW",
      name: "New Dealers",
      description: "Recently onboarded dealers",
    },
  });

  const pricingGroupA = await prisma.pricingGroup.upsert({
    where: { sellerId_code: { sellerId: seller.id, code: "TIER_A" } },
    update: {},
    create: {
      sellerId: seller.id,
      code: "TIER_A",
      name: "Tier A Pricing",
      description: "Best dealer pricing tier",
      priority: 1,
    },
  });

  const pricingGroupB = await prisma.pricingGroup.upsert({
    where: { sellerId_code: { sellerId: seller.id, code: "TIER_B" } },
    update: {},
    create: {
      sellerId: seller.id,
      code: "TIER_B",
      name: "Tier B Pricing",
      description: "Standard dealer pricing tier",
      priority: 2,
    },
  });

  // ============================================================
  // 9. DEALERS
  // ============================================================
  console.log("🏪 Creating dealers...");
  const dealerData = [
    {
      code: "DLR-001",
      legalName: "Nepalgunj Agro Traders",
      tradingName: "Nepalgunj Agro Traders",
      contactName: "Suresh Bhandari",
      email: "dealer1@bageshwari.local",
      phone: undefined,
      district: "Banke",
      city: "Nepalgunj",
      province: "Lumbini Province",
      group: premiumGroup.id,
      pricing: pricingGroupA.id,
      salesperson: salesperson1.id,
      creditLimit: 1500000,
    },
    {
      code: "DLR-002",
      legalName: "Bheri Agriculture House",
      tradingName: "Bheri Agriculture House",
      contactName: "Madan Poudel",
      email: "dealer2@bageshwari.local",
      phone: undefined,
      district: "Banke",
      city: "Nepalgunj",
      province: "Lumbini Province",
      group: standardGroup.id,
      pricing: pricingGroupB.id,
      salesperson: salesperson2.id,
      creditLimit: 800000,
    },
    {
      code: "DLR-003",
      legalName: "Banke Farm Solutions",
      tradingName: "Banke Farm Solutions",
      contactName: "Naresh Chaudhary",
      email: "dealer3@bageshwari.local",
      phone: undefined,
      district: "Banke",
      city: "Khajura",
      province: "Lumbini Province",
      group: premiumGroup.id,
      pricing: pricingGroupA.id,
      salesperson: salesperson3.id,
      creditLimit: 1200000,
    },
    {
      code: "DLR-004",
      legalName: "Kohalpur Tractor Traders",
      tradingName: "Kohalpur Tractor Traders",
      contactName: "Deepak Yadav",
      email: "dealer4@bageshwari.local",
      phone: undefined,
      district: "Banke",
      city: "Kohalpur",
      province: "Lumbini Province",
      group: standardGroup.id,
      pricing: pricingGroupB.id,
      salesperson: salesperson2.id,
      creditLimit: 600000,
    },
    {
      code: "DLR-005",
      legalName: "Western Agro Machinery",
      tradingName: "Western Agro Machinery",
      contactName: "Bhim Shahi",
      email: "dealer5@bageshwari.local",
      phone: undefined,
      district: "Dang",
      city: "Ghorahi",
      province: "Lumbini Province",
      group: newDealerGroup.id,
      pricing: pricingGroupB.id,
      salesperson: salesperson1.id,
      creditLimit: 400000,
    },
  ];

  const dealers: Record<string, { id: string; user: { id: string } }> = {};
  for (const dd of dealerData) {
    const dealer = await prisma.dealer.upsert({
      where: { sellerId_code: { sellerId: seller.id, code: dd.code } },
      update: {},
      create: {
        sellerId: seller.id,
        code: dd.code,
        legalName: dd.legalName,
        tradingName: dd.tradingName,
        contactName: dd.contactName,
        email: dd.email,
        phone: dd.phone,
        dealerGroupId: dd.group,
        pricingGroupId: dd.pricing,
        assignedSalespersonId: dd.salesperson,
        status: "ACTIVE",
        creditEligible: true,
        approvedAt: new Date(),
        approvedById: sellerOwner.id,
      },
    });

    // Create dealer address
    await prisma.dealerAddress.upsert({
      where: { id: `addr-${dd.code}` },
      update: {},
      create: {
        id: `addr-${dd.code}`,
        sellerId: seller.id,
        dealerId: dealer.id,
        type: "BOTH",
        label: "Main Office",
        contactName: dd.contactName,
        phone: dd.phone,
        addressLine1: `Main Road, ${dd.city}`,
        city: dd.city,
        district: dd.district,
        province: dd.province,
        country: "Nepal",
        isDefault: true,
      },
    });

    // Create credit profile
    await prisma.dealerCreditProfile.upsert({
      where: { dealerId: dealer.id },
      update: {},
      create: {
        sellerId: seller.id,
        dealerId: dealer.id,
        creditEligible: true,
        creditLimit: dd.creditLimit,
        currentOutstanding: 0,
        availableCredit: dd.creditLimit,
        creditPeriodDays: 30,
        approvedById: accountsManager.id,
        approvedAt: new Date(),
      },
    });

    // Create dealer user
    const dealerUser = await createSellerUser(
      dd.contactName,
      dd.email,
      "DEALER_OWNER",
      dealer.id
    );

    // Salesperson assignment
    await prisma.salespersonDealerAssignment.upsert({
      where: {
        sellerId_salespersonId_dealerId: {
          sellerId: seller.id,
          salespersonId: dd.salesperson,
          dealerId: dealer.id,
        },
      },
      update: {},
      create: {
        sellerId: seller.id,
        salespersonId: dd.salesperson,
        dealerId: dealer.id,
        isPrimary: true,
      },
    });

    dealers[dd.code] = { ...dealer, user: dealerUser };
  }

  // ============================================================
  // 10. CATEGORIES
  // ============================================================
  console.log("📁 Creating product categories...");
  const categoryMap: Record<string, string> = {};
  const mainCategories = [
    {
      code: "TRACTORS",
      name: "Tractors",
      slug: "tractors",
      description: "Agricultural tractors and utility vehicles",
      order: 1,
    },
    {
      code: "SPARE_PARTS",
      name: "Spare Parts",
      slug: "spare-parts",
      description: "Genuine and aftermarket tractor spare parts",
      order: 2,
    },
    {
      code: "IMPLEMENTS",
      name: "Agricultural Implements",
      slug: "agricultural-implements",
      description: "Rotavators, ploughs, harrows, and other farm implements",
      order: 3,
    },
    {
      code: "ACCESSORIES",
      name: "Accessories",
      slug: "accessories",
      description: "Tractor and farm accessories",
      order: 4,
    },
    {
      code: "LUBRICANTS",
      name: "Lubricants & Oils",
      slug: "lubricants-oils",
      description: "Engine oils, hydraulic fluids, gear oils, and greases",
      order: 5,
    },
    {
      code: "TOOLS",
      name: "Workshop Tools",
      slug: "workshop-tools",
      description: "Hand tools, power tools, and workshop equipment",
      order: 6,
    },
    {
      code: "TYRES",
      name: "Tyres & Tubes",
      slug: "tyres-tubes",
      description: "Agricultural tyres and tubes for tractors and trolleys",
      order: 7,
    },
    {
      code: "BATTERIES",
      name: "Batteries",
      slug: "batteries",
      description: "Automotive and tractor batteries",
      order: 8,
    },
    {
      code: "BEARINGS",
      name: "Bearings",
      slug: "bearings",
      description: "Ball bearings, roller bearings, and bearing accessories",
      order: 9,
    },
    {
      code: "FILTERS",
      name: "Filters",
      slug: "filters",
      description: "Oil filters, air filters, fuel filters, and hydraulic filters",
      order: 10,
    },
    {
      code: "ELECTRICAL",
      name: "Lights & Electricals",
      slug: "lights-electricals",
      description: "LED lights, switches, wiring, and electrical components",
      order: 11,
    },
    {
      code: "FASTENERS",
      name: "Fasteners",
      slug: "fasteners",
      description: "Nuts, bolts, washers, and fastener accessories",
      order: 12,
    },
  ];

  for (const cat of mainCategories) {
    const created = await prisma.productCategory.upsert({
      where: { sellerId_code: { sellerId: seller.id, code: cat.code } },
      update: {},
      create: {
        sellerId: seller.id,
        code: cat.code,
        name: cat.name,
        slug: cat.slug,
        description: cat.description,
        displayOrder: cat.order,
        status: "ACTIVE",
      },
    });
    categoryMap[cat.code] = created.id;
  }

  // Map product groups from Excel to our categories
  const groupToCategoryMap: Record<string, string> = {
    "SBJ ROTAVATER PARTS": "IMPLEMENTS",
    "ARISTO ROTAVATOR PARTS": "IMPLEMENTS",
    "AGRICULTURE SPARE PARTS": "SPARE_PARTS",
    "SWARAJ SPARE PARTS": "SPARE_PARTS",
    "EVEREST TRACTOR PARTS": "SPARE_PARTS",
    "ENGINE PARTS": "SPARE_PARTS",
    "CLUTCH BRAKE PARTS": "SPARE_PARTS",
    "POWER TILLER PARTS": "SPARE_PARTS",
    "TROLLY PARTS": "SPARE_PARTS",
    "MNP TS1 LUDHIANA ITEMS": "SPARE_PARTS",
    "OIL SEAL": "SPARE_PARTS",
    "FANBELT": "SPARE_PARTS",
    "BEARING": "BEARINGS",
    "ARB BEARING": "BEARINGS",
    "BEARING CAA": "BEARINGS",
    "DLT BEARING": "BEARINGS",
    "DPI BEARING": "BEARINGS",
    "SKF BEARING": "BEARINGS",
    "XGB HYB BEARING": "BEARINGS",
    "FILTER": "FILTERS",
    "BOSCH FILTER": "FILTERS",
    "EVEREST FILTER": "FILTERS",
    "ZENITH FILTER": "FILTERS",
    "LUBRICANTS": "LUBRICANTS",
    "DUCKHAM LUBRICANTS": "LUBRICANTS",
    "DUCKHAMS LUBRICANTS": "LUBRICANTS",
    "GULF LUBRICANTS": "LUBRICANTS",
    "PLO LUBRICANTS": "LUBRICANTS",
    "TYRE": "TYRES",
    "MRF TYRE": "TYRES",
    "JK TYRE": "TYRES",
    "GOODYEAR TYRE": "TYRES",
    "DELTA TYRE": "TYRES",
    "POWERMAX TYRE": "TYRES",
    "CHINEESE TYRE": "TYRES",
    "TUBE": "TYRES",
    "FRIL TUBE": "TYRES",
    "JYOTI TUBE": "TYRES",
    "TAISON TUBE": "TYRES",
    "BATTERY": "BATTERIES",
    "ASIAN BATTERY": "BATTERIES",
    "CAMEL BATTERY": "BATTERIES",
    "EXIDE BATTERY": "BATTERIES",
    "SF BATTERY": "BATTERIES",
    "BATTERY OTHER BRANDS": "BATTERIES",
    "TOOLS": "TOOLS",
    "TAPARIA TOOLS": "TOOLS",
    "TATA TOOLS": "TOOLS",
    "MANSAROVAR TOOLS": "TOOLS",
    "VSC TOOLS": "TOOLS",
    "LIGHTS AND ELECTRICALS": "ELECTRICAL",
    "MINDA LIGHTS AND SWITCHES": "ELECTRICAL",
    "NUTBOLT WASHER": "FASTENERS",
    "KG NUTBOLT": "FASTENERS",
    "POOJA NUTBOLT": "FASTENERS",
    "STL NUTBOLT": "FASTENERS",
    "UNBRAKO NUTBOLT": "FASTENERS",
    "ADHESIVE": "ACCESSORIES",
    "ASTRAL RESIBOND ADHESIVE": "ACCESSORIES",
  };

  // ============================================================
  // 11. BRANDS
  // ============================================================
  console.log("🏷️ Creating brands...");
  const brandData = [
    { code: "swaraj", name: "Swaraj", slug: "swaraj" },
    { code: "mahindra", name: "Mahindra", slug: "mahindra" },
    { code: "sonalika", name: "Sonalika", slug: "sonalika" },
    { code: "shaktiman", name: "Shaktiman", slug: "shaktiman" },
    { code: "sbj", name: "SBJ", slug: "sbj" },
    { code: "aristo", name: "Aristo", slug: "aristo" },
    { code: "mrf", name: "MRF", slug: "mrf" },
    { code: "jk", name: "JK Tyre", slug: "jk-tyre" },
    { code: "goodyear", name: "Goodyear", slug: "goodyear" },
    { code: "exide", name: "Exide", slug: "exide" },
    { code: "skf", name: "SKF", slug: "skf" },
    { code: "bosch", name: "Bosch", slug: "bosch" },
    { code: "gulf", name: "Gulf", slug: "gulf" },
    { code: "duckhams", name: "Duckhams", slug: "duckhams" },
    { code: "taparia", name: "Taparia", slug: "taparia" },
    { code: "minda", name: "Minda", slug: "minda" },
    { code: "everest", name: "Everest", slug: "everest" },
    { code: "generic", name: "Generic", slug: "generic" },
  ];

  const brands: Record<string, string> = {};
  for (const b of brandData) {
    const brand = await prisma.productBrand.upsert({
      where: { sellerId_slug: { sellerId: seller.id, slug: b.slug } },
      update: {},
      create: {
        sellerId: seller.id,
        name: b.name,
        slug: b.slug,
        status: "ACTIVE",
      },
    });
    brands[b.code] = brand.id;
  }

  // Map group names to brands
  const groupToBrandMap: Record<string, string> = {
    "SBJ ROTAVATER PARTS": "sbj",
    "ARISTO ROTAVATOR PARTS": "aristo",
    "SWARAJ SPARE PARTS": "swaraj",
    "EVEREST TRACTOR PARTS": "everest",
    "EVEREST FILTER": "everest",
    "BOSCH FILTER": "bosch",
    "ZENITH FILTER": "generic",
    "MRF TYRE": "mrf",
    "JK TYRE": "jk",
    "GOODYEAR TYRE": "goodyear",
    "EXIDE BATTERY": "exide",
    "SKF BEARING": "skf",
    "GULF LUBRICANTS": "gulf",
    "DUCKHAMS LUBRICANTS": "duckhams",
    "DUCKHAM LUBRICANTS": "duckhams",
    "TAPARIA TOOLS": "taparia",
    "MINDA LIGHTS AND SWITCHES": "minda",
  };

  // ============================================================
  // 12. IMPORT PRODUCTS FROM XLSX
  // ============================================================
  console.log("📦 Importing products from product.xlsx...");
  const localXlsxPath = path.resolve(process.cwd(), "product.xlsx");

  const rows: Record<string, unknown>[] = [];
  if (fs.existsSync(localXlsxPath)) {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(localXlsxPath);
    const sheet = workbook.worksheets[0];
    if (sheet) {
      const headers = new Map<number, string>();
      sheet.getRow(1).eachCell({ includeEmpty: true }, (cell, column) => {
        headers.set(column, String(cell.value ?? "").trim());
      });
      sheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return;
        const record: Record<string, unknown> = {};
        row.eachCell({ includeEmpty: true }, (cell, column) => {
          const header = headers.get(column);
          if (!header) return;
          const value = cell.value;
          record[header] = value && typeof value === "object" && "result" in value
            ? value.result
            : value;
        });
        rows.push(record);
      });
    }
  } else {
    console.log("⚠️  product.xlsx not found, creating sample products instead.");
  }

  let productCount = 0;

  if (rows.length > 0) {
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const name = String(row["NAME"] || "").trim();
      if (!name) continue;

      const group = String(row["GROUP"] || "").trim();
      const salePrice = parseFloat(String(row["SALE price"] || "0").replace(/,/g, ""));
      const mrp = parseFloat(String(row["MRP"] || "0").replace(/,/g, ""));
      const costPrice = parseFloat(String(row["PUR"] || "0").replace(/,/g, ""));
      const taxPercent = parseFloat(String(row["TAX"] || "0").replace(/%/g, ""));
      const hsnCode = String(row["HSN"] || "").trim();
      const unit = String(row["MAIN UNIT"] || "Pcs.").trim();
      const altUnit = String(row["ALTERNATE UNIT"] || "").trim();
      const rol = parseInt(String(row["ROL"] || "0")) || 0;
      const moq = parseInt(String(row["MOQ"] || "1")) || 1;
      const maxQty = parseInt(String(row["MAX"] || "0")) || undefined;

      const categoryCode = groupToCategoryMap[group] || "SPARE_PARTS";
      const categoryId = categoryMap[categoryCode];
      const brandCode = groupToBrandMap[group] || "generic";
      const brandId = brands[brandCode] || brands["generic"];

      const sku = generateSku(name, i + 1);
      const slug = slugify(name).substring(0, 190) + "-" + (i + 1);

      try {
        const product = await prisma.product.upsert({
          where: { sellerId_sku: { sellerId: seller.id, sku } },
          update: {},
          create: {
            sellerId: seller.id,
            categoryId,
            brandId,
            name,
            slug,
            sku,
            shortDescription: `${name} - ${group}`,
            description: `${name}. Category: ${group}. HSN: ${hsnCode}. Unit: ${unit}.`,
            status: "ACTIVE",
            publishStatus: "PUBLISHED",
            featured: i < 20,
            newArrival: i >= 20 && i < 50,
            bestSeller: i < 30 && i % 3 === 0,
            minimumOrderQuantity: moq,
            maximumOrderQuantity: maxQty || 9999,
            quantityIncrement: 1,
            unitCode: unit,
            alternateUnit: altUnit || undefined,
            taxPercent: taxPercent,
            hsnCode: hsnCode || undefined,
            publishedAt: new Date(),
            createdById: productManager.id,
          },
        });

        // Create default variant
        const variant = await prisma.productVariant.upsert({
          where: { sellerId_sku: { sellerId: seller.id, sku: `${sku}-DEF` } },
          update: {},
          create: {
            sellerId: seller.id,
            productId: product.id,
            name: "Default",
            sku: `${sku}-DEF`,
            status: "ACTIVE",
            mrp: mrp || salePrice * 1.5,
            costPrice: costPrice || undefined,
            isDefault: true,
          },
        });

        // Default dealer price (sale price = DP)
        if (salePrice > 0) {
          await prisma.productPrice.upsert({
            where: { id: `price-def-${sku}` },
            update: {},
            create: {
              id: `price-def-${sku}`,
              sellerId: seller.id,
              productId: product.id,
              variantId: variant.id,
              priceType: "DEFAULT_DEALER",
              amount: salePrice,
              currencyCode: "NPR",
              priority: 0,
              active: true,
              createdById: productManager.id,
            },
          });
        }

        // Create inventory for this variant
        const availableQty = Math.floor(Math.random() * 200) + (rol || 10);
        await prisma.inventory.upsert({
          where: {
            sellerId_warehouseId_variantId: {
              sellerId: seller.id,
              warehouseId: mainWarehouse.id,
              variantId: variant.id,
            },
          },
          update: {},
          create: {
            sellerId: seller.id,
            warehouseId: mainWarehouse.id,
            productId: product.id,
            variantId: variant.id,
            availableQuantity: availableQty,
            reorderLevel: rol || 10,
            lowStockThreshold: Math.ceil((rol || 10) * 1.5),
          },
        });

        productCount++;
        if (productCount % 100 === 0) {
          console.log(`   Imported ${productCount} products...`);
        }
      } catch (error) {
        // Skip duplicate or error products
        continue;
      }
    }
  }

  console.log(`✅ Imported ${productCount} products from Excel.`);

  // ============================================================
  // 13. SAMPLE ORDERS
  // ============================================================
  console.log("📋 Creating sample orders...");

  // Create number sequences
  await prisma.numberSequence.upsert({
    where: { sellerId_entityType: { sellerId: seller.id, entityType: "ORDER" } },
    update: {},
    create: { sellerId: seller.id, entityType: "ORDER", prefix: "ORD-", lastNumber: 5, padLength: 5 },
  });

  await prisma.numberSequence.upsert({
    where: { sellerId_entityType: { sellerId: seller.id, entityType: "PROFORMA" } },
    update: {},
    create: { sellerId: seller.id, entityType: "PROFORMA", prefix: "PI-", lastNumber: 3, padLength: 5 },
  });

  await prisma.numberSequence.upsert({
    where: { sellerId_entityType: { sellerId: seller.id, entityType: "INVOICE" } },
    update: {},
    create: { sellerId: seller.id, entityType: "INVOICE", prefix: "INV-", lastNumber: 2, padLength: 5 },
  });

  await prisma.numberSequence.upsert({
    where: { sellerId_entityType: { sellerId: seller.id, entityType: "PICKLIST" } },
    update: {},
    create: { sellerId: seller.id, entityType: "PICKLIST", prefix: "PL-", lastNumber: 2, padLength: 5 },
  });

  await prisma.numberSequence.upsert({
    where: { sellerId_entityType: { sellerId: seller.id, entityType: "SHIPMENT" } },
    update: {},
    create: { sellerId: seller.id, entityType: "SHIPMENT", prefix: "SHP-", lastNumber: 1, padLength: 5 },
  });

  await prisma.numberSequence.upsert({
    where: { sellerId_entityType: { sellerId: seller.id, entityType: "PAYMENT" } },
    update: {},
    create: { sellerId: seller.id, entityType: "PAYMENT", prefix: "PAY-", lastNumber: 1, padLength: 5 },
  });

  // Get some products for orders
  const sampleProducts = await prisma.product.findMany({
    where: { sellerId: seller.id },
    take: 10,
    include: {
      variants: { where: { isDefault: true } },
      prices: { where: { priceType: "DEFAULT_DEALER" } },
    },
  });

  if (sampleProducts.length > 0) {
    const dealer1 = dealers["DLR-001"];
    const dealer1Address = await prisma.dealerAddress.findFirst({
      where: { dealerId: dealer1.id },
    });

    // Order 1: Draft
    const order1 = await prisma.order.upsert({
      where: { sellerId_orderNumber: { sellerId: seller.id, orderNumber: "ORD-00001" } },
      update: {},
      create: {
        sellerId: seller.id,
        orderNumber: "ORD-00001",
        dealerId: dealer1.id,
        salespersonId: salesperson1.id,
        source: "DEALER_PORTAL",
        status: "DRAFT",
        currencyCode: "NPR",
        billingAddressJson: JSON.stringify(dealer1Address),
        shippingAddressJson: JSON.stringify(dealer1Address),
        subtotal: 25000,
        taxTotal: 3250,
        grandTotal: 28250,
        createdById: dealers["DLR-001"].user.id,
      },
    });

    // Add items to order 1
    for (let j = 0; j < Math.min(3, sampleProducts.length); j++) {
      const p = sampleProducts[j];
      const v = p.variants[0];
      const price = p.prices[0];
      if (!v || !price) continue;
      const qty = Math.floor(Math.random() * 10) + 2;
      const dp = Number(price.amount);
      const mrpVal = Number(v.mrp);
      const tax = dp * qty * 0.13;

      await prisma.orderItem.upsert({
        where: { id: `seed-order-1-item-${j}` },
        update: {},
        create: {
          id: `seed-order-1-item-${j}`,
          sellerId: seller.id,
          orderId: order1.id,
          productId: p.id,
          variantId: v.id,
          sku: v.sku,
          productName: p.name,
          variantName: v.name,
          originalQuantity: qty,
          mrp: mrpVal,
          dealerPrice: dp,
          taxAmount: tax,
          lineTotal: dp * qty + tax,
          status: "ACTIVE",
        },
      });
    }

    // Order 2: Submitted for accounts review
    const dealer2 = dealers["DLR-002"];
    const order2 = await prisma.order.upsert({
      where: { sellerId_orderNumber: { sellerId: seller.id, orderNumber: "ORD-00002" } },
      update: {},
      create: {
        sellerId: seller.id,
        orderNumber: "ORD-00002",
        dealerId: dealer2.id,
        salespersonId: salesperson2.id,
        source: "SALESPERSON_PORTAL",
        status: "PENDING_ACCOUNTS_REVIEW",
        currencyCode: "NPR",
        subtotal: 45000,
        taxTotal: 5850,
        grandTotal: 50850,
        submittedAt: new Date(),
        currentDepartment: "accounts",
        createdById: salesperson2.id,
      },
    });

    for (let j = 3; j < Math.min(6, sampleProducts.length); j++) {
      const p = sampleProducts[j];
      const v = p.variants[0];
      const price = p.prices[0];
      if (!v || !price) continue;
      const qty = Math.floor(Math.random() * 20) + 5;
      const dp = Number(price.amount);
      const mrpVal = Number(v.mrp);
      const tax = dp * qty * 0.13;

      await prisma.orderItem.upsert({
        where: { id: `seed-order-2-item-${j}` },
        update: {},
        create: {
          id: `seed-order-2-item-${j}`,
          sellerId: seller.id,
          orderId: order2.id,
          productId: p.id,
          variantId: v.id,
          sku: v.sku,
          productName: p.name,
          variantName: v.name,
          originalQuantity: qty,
          mrp: mrpVal,
          dealerPrice: dp,
          taxAmount: tax,
          lineTotal: dp * qty + tax,
          status: "ACTIVE",
        },
      });
    }

    // Order 3: Final confirmed
    const dealer3 = dealers["DLR-003"];
    const order3 = await prisma.order.upsert({
      where: { sellerId_orderNumber: { sellerId: seller.id, orderNumber: "ORD-00003" } },
      update: {},
      create: {
        sellerId: seller.id,
        orderNumber: "ORD-00003",
        dealerId: dealer3.id,
        salespersonId: salesperson1.id,
        source: "DEALER_PORTAL",
        status: "FINAL_ORDER_CONFIRMED",
        currencyCode: "NPR",
        subtotal: 120000,
        taxTotal: 15600,
        grandTotal: 135600,
        submittedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        finalConfirmedAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
        finalConfirmedById: accountsManager.id,
        currentDepartment: "warehouse",
        createdById: dealers["DLR-003"].user.id,
      },
    });

    // Order 4: Shipped
    const order4 = await prisma.order.upsert({
      where: { sellerId_orderNumber: { sellerId: seller.id, orderNumber: "ORD-00004" } },
      update: {},
      create: {
        sellerId: seller.id,
        orderNumber: "ORD-00004",
        dealerId: dealer1.id,
        salespersonId: salesperson1.id,
        source: "DEALER_PORTAL",
        status: "SHIPPED",
        currencyCode: "NPR",
        subtotal: 85000,
        taxTotal: 11050,
        grandTotal: 96050,
        submittedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        finalConfirmedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        finalConfirmedById: accountsManager.id,
        currentDepartment: "dispatch",
        createdById: dealers["DLR-001"].user.id,
      },
    });

    // Order 5: Completed
    const order5 = await prisma.order.upsert({
      where: { sellerId_orderNumber: { sellerId: seller.id, orderNumber: "ORD-00005" } },
      update: {},
      create: {
        sellerId: seller.id,
        orderNumber: "ORD-00005",
        dealerId: dealer2.id,
        salespersonId: salesperson2.id,
        source: "DEALER_PORTAL",
        status: "COMPLETED",
        currencyCode: "NPR",
        subtotal: 65000,
        taxTotal: 8450,
        grandTotal: 73450,
        submittedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
        finalConfirmedAt: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000),
        finalConfirmedById: accountsManager.id,
        currentDepartment: "completed",
        createdById: dealers["DLR-002"].user.id,
      },
    });

    const additionalStages = [
      "WAITING_FOR_DEALER_CONFIRMATION",
      "PROFORMA_INVOICE_GENERATED",
      "READY_FOR_WAREHOUSE",
      "PICKING_IN_PROGRESS",
      "PICK_LIST_COMPLETED",
      "FINAL_INVOICE_ISSUED",
      "PACKED",
      "DELIVERED",
    ] as const;
    for (const [index, status] of additionalStages.entries()) {
      const number = `ORD-${String(index + 6).padStart(5, "0")}`;
      const dealer = dealers[`DLR-00${(index % 5) + 1}`];
      await prisma.order.upsert({
        where: { sellerId_orderNumber: { sellerId: seller.id, orderNumber: number } },
        update: { status },
        create: {
          sellerId: seller.id,
          orderNumber: number,
          dealerId: dealer.id,
          salespersonId: [salesperson1.id, salesperson2.id, salesperson3.id][index % 3],
          source: "ADMIN_PANEL",
          status,
          currencyCode: "NPR",
          subtotal: 30000 + index * 5000,
          taxTotal: 3900 + index * 650,
          grandTotal: 33900 + index * 5650,
          submittedAt: new Date(Date.now() - (index + 2) * 24 * 60 * 60 * 1000),
          createdById: sellerAdmin.id,
        },
      });
    }
  }

  // ============================================================
  // 14. SELLER THEME
  // ============================================================
  console.log("🎨 Creating Bageshwari Tractors theme...");
  await prisma.sellerTheme.upsert({
    where: { id: `theme-${seller.id}` },
    update: {},
    create: {
      id: `theme-${seller.id}`,
      sellerId: seller.id,
      name: "Bageshwari Default",
      status: "PUBLISHED",
      publishedAt: new Date(),
      tokensJson: JSON.stringify({
        primary: "222 47% 21%",
        secondary: "0 72% 51%",
        accent: "213 94% 56%",
        background: "0 0% 100%",
        surface: "210 20% 98%",
        text: "222 47% 11%",
        muted: "215 16% 47%",
        border: "214 32% 91%",
        success: "142 71% 45%",
        warning: "38 92% 50%",
        danger: "0 84% 60%",
        radiusCard: "0.75rem",
        radiusButton: "0.5rem",
        radiusInput: "0.5rem",
        fontHeading: "Inter",
        fontBody: "Inter",
      }),
      createdById: sellerOwner.id,
    },
  });

  // ============================================================
  // 15. HOMEPAGE SECTIONS
  // ============================================================
  console.log("🏠 Creating homepage sections...");
  const homepageSections = [
    {
      type: "UTILITY_BAR" as const,
      title: "B2B Dealer Platform",
      order: 1,
      content: JSON.stringify({
        items: [
          "B2B Dealer Platform",
          "Bulk Orders",
          "Exclusive Dealer Pricing",
          "Tax Invoice Support",
          "Secure Dealer Accounts",
          "Dispatch Tracking",
          "Dedicated Support",
        ],
      }),
    },
    {
      type: "HERO" as const,
      title: "Powering Nepal's Dealers with Smarter Tractor Ordering",
      subtitle:
        "Bageshwari Tractors provides authorized dealers across Nepal with a complete B2B platform for tractors, spare parts, agricultural implements, accessories and workshop products. Browse products, view dealer pricing after login, create bulk orders, confirm Proforma Invoices and track dispatches through one secure portal.",
      order: 2,
      content: JSON.stringify({
        cta1: { label: "Explore Products", link: "/products" },
        cta2: { label: "Seller Login", link: "/s/bageshwari/login" },
        cta3: { label: "Request Dealership", link: "/request-dealership" },
        previewCards: [
          { label: "Active Orders", value: "12", icon: "ShoppingCart" },
          { label: "Proforma Invoices", value: "8", icon: "FileText" },
          { label: "Final Invoices", value: "5", icon: "Receipt" },
          { label: "Shipments in Transit", value: "3", icon: "Truck" },
        ],
      }),
    },
    {
      type: "DEALER_BENEFITS" as const,
      title: "Dealer Benefits",
      order: 3,
      content: JSON.stringify({
        items: [
          { title: "Exclusive B2B Pricing", description: "Access special dealer prices on all products", icon: "Tag" },
          { title: "Bulk Order Discounts", description: "Volume-based pricing for large orders", icon: "Package" },
          { title: "Credit Facility", description: "Flexible credit terms for trusted dealers", icon: "CreditCard" },
          { title: "Priority Support", description: "Dedicated support line for dealers", icon: "Headphones" },
          { title: "Fast Dispatch", description: "Priority processing and dispatch for dealer orders", icon: "Zap" },
          { title: "Digital Invoicing", description: "Automated proforma and final invoices", icon: "FileText" },
        ],
      }),
    },
    {
      type: "FEATURED_CATEGORIES" as const,
      title: "Shop by Category",
      subtitle: "Browse our comprehensive range of agricultural products",
      order: 4,
      content: JSON.stringify({ maxItems: 6 }),
    },
    {
      type: "FEATURED_PRODUCTS" as const,
      title: "Featured Products",
      subtitle: "Our most popular products across all categories",
      order: 5,
      content: JSON.stringify({ maxItems: 8, filter: "featured" }),
    },
    {
      type: "NEW_ARRIVALS" as const,
      title: "New Arrivals",
      subtitle: "Latest products added to our catalogue",
      order: 6,
      content: JSON.stringify({ maxItems: 8, filter: "newArrival" }),
    },
    {
      type: "BEST_SELLERS" as const,
      title: "Best Sellers",
      subtitle: "Top selling products across all dealers",
      order: 7,
      content: JSON.stringify({ maxItems: 8, filter: "bestSeller" }),
    },
    {
      type: "HOW_IT_WORKS" as const,
      title: "How It Works",
      subtitle: "Getting started as an authorized dealer",
      order: 8,
      content: JSON.stringify({
        steps: [
          { title: "Apply for Dealership", description: "Submit your business details and documentation for review", step: 1 },
          { title: "Account Approval", description: "Our team verifies your application and sets up your dealer account", step: 2 },
          { title: "Browse & Order", description: "Access exclusive dealer pricing, create bulk orders, and manage your purchases", step: 3 },
          { title: "Receive & Grow", description: "Track shipments, manage invoices, and grow your business with Bageshwari", step: 4 },
        ],
      }),
    },
    {
      type: "PLATFORM_FEATURES" as const,
      title: "Platform Features",
      subtitle: "Everything you need to manage your dealer business",
      order: 9,
      content: JSON.stringify({
        features: [
          { title: "Product Catalogue", description: "Browse thousands of products with detailed specifications" },
          { title: "Dealer Pricing", description: "View exclusive B2B pricing after login" },
          { title: "Order Management", description: "Create, track, and manage orders from a single dashboard" },
          { title: "Invoice Management", description: "Access proforma and final invoices digitally" },
          { title: "Shipment Tracking", description: "Real-time tracking of all dispatched orders" },
          { title: "Credit Management", description: "View credit limits, outstanding balances, and payment history" },
        ],
      }),
    },
    {
      type: "DEALER_CTA" as const,
      title: "Become an Authorized Dealer",
      subtitle:
        "Join our growing network of authorized dealers across Nepal. Get access to exclusive B2B pricing, credit facilities, and dedicated support.",
      order: 10,
      content: JSON.stringify({
        cta: { label: "Apply for Dealership", link: "/request-dealership" },
      }),
    },
    {
      type: "BUSINESS_STATS" as const,
      title: "Our Reach",
      order: 11,
      content: JSON.stringify({
        stats: [
          { label: "Products", value: "3,500+", icon: "Package" },
          { label: "Categories", value: "12", icon: "Grid" },
          { label: "Active Dealers", value: "50+", icon: "Users" },
          { label: "Districts Covered", value: "25+", icon: "MapPin" },
        ],
      }),
    },
    {
      type: "SERVICE_CONTACT" as const,
      title: "Nepalgunj Service Center",
      subtitle: "Visit our showroom and service center in Nepalgunj",
      order: 12,
      content: JSON.stringify({
        address: "Main Road, Nepalgunj, Banke, Nepal",
        phone: null,
        email: "info@bageshwaritractors.com.np",
        hours: "Sun-Fri: 9:00 AM - 6:00 PM",
      }),
    },
  ];

  for (const section of homepageSections) {
    await prisma.sellerHomepageSection.upsert({
      where: { id: `hp-${seller.id}-${section.type}` },
      update: {},
      create: {
        id: `hp-${seller.id}-${section.type}`,
        sellerId: seller.id,
        sectionType: section.type,
        title: section.title,
        subtitle: section.subtitle || null,
        displayOrder: section.order,
        enabled: true,
        audience: "PUBLIC",
        contentJson: section.content,
        publishedAt: new Date(),
      },
    });
  }

  // ============================================================
  // 16. DEALER APPLICATION SAMPLE
  // ============================================================
  console.log("📝 Creating sample dealer applications...");
  await prisma.dealerApplication.upsert({
    where: { id: "app-sample-1" },
    update: {},
    create: {
      id: "app-sample-1",
      sellerId: seller.id,
      businessName: "Lumbini Agriculture House",
      contactName: "Hari Prasad Oli",
      email: "hari@lumbiniagri.com.np",
      phone: null,
      city: "Bhairahawa",
      district: "Rupandehi",
      province: "Lumbini Province",
      country: "Nepal",
      monthlyOrderEstimate: 500000,
      creditRequested: true,
      status: "REVIEW_PENDING",
    },
  });

  await prisma.dealerApplication.upsert({
    where: { id: "app-sample-2" },
    update: {},
    create: {
      id: "app-sample-2",
      sellerId: seller.id,
      businessName: "Eastern Agri Supplies",
      contactName: "Prakash Limbu",
      email: "prakash@easternagri.com.np",
      phone: null,
      city: "Biratnagar",
      district: "Morang",
      province: "Province No. 1",
      country: "Nepal",
      monthlyOrderEstimate: 300000,
      creditRequested: false,
      status: "SUBMITTED",
    },
  });

  console.log("\n✅ Seed completed successfully!");
  console.log("\n📊 Summary:");
  console.log(`   Company: Bageshwari Tractors`);
  console.log(`   Products: ${productCount}`);
  console.log(`   Categories: ${mainCategories.length}`);
  console.log(`   Brands: ${brandData.length}`);
  console.log(`   Dealers: ${Object.keys(dealers).length}`);
  console.log(`   Orders: 13 (various workflow stages)`);
  console.log(`   Homepage Sections: ${homepageSections.length}`);

  console.log("\n🔑 Login Credentials:");
  console.log("   Seed users use SEED_PASSWORD (or the documented development fallback).");
  console.log("   Seller Owner:   owner@bageshwari.com.np");
  console.log("   Seller Admin:   admin@bageshwari.com.np");
  console.log("   Accounts:       accounts@bageshwari.com.np");
  console.log("   Warehouse:      warehouse@bageshwari.com.np");
  console.log("   Salesperson:    bikram@bageshwari.com.np");
  console.log("   Dealer 1:       dealer1@bageshwari.local");
  console.log("   Dealer 2:       dealer2@bageshwari.local");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
