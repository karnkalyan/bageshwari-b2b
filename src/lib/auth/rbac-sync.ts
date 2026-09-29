import { prisma } from "@/lib/db";

export const ALL_PERMISSIONS = [
  // User & Roles
  { code: "user.create", name: "Create User", module: "user", description: "Create internal user accounts" },
  { code: "user.read", name: "Read User", module: "user", description: "View user directory and profiles" },
  { code: "user.edit", name: "Edit User", module: "user", description: "Edit user profile, name, contact details and status" },
  { code: "user.update", name: "Update User", module: "user", description: "Update user details and credentials" },
  { code: "user.disable", name: "Disable User", module: "user", description: "Deactivate or suspend user accounts" },
  { code: "user.manage", name: "Manage Users", module: "user", description: "Full user management privileges" },
  { code: "role.manage", name: "Manage Roles", module: "role", description: "Manage RBAC roles and permissions matrix" },
  // Dealers
  { code: "dealer.create", name: "Create Dealer", module: "dealer", description: "Register new dealer profiles" },
  { code: "dealer.read", name: "Read Dealer", module: "dealer", description: "View dealer directory and accounts" },
  { code: "dealer.approve", name: "Approve Dealer", module: "dealer", description: "Approve pending dealer applications" },
  { code: "dealer.update", name: "Update Dealer", module: "dealer", description: "Edit dealer details and settings" },
  { code: "dealer.assign_salesperson", name: "Assign Salesperson", module: "dealer", description: "Assign reps to dealers" },
  { code: "dealer.manage_credit", name: "Manage Credit", module: "dealer", description: "Configure credit limits and terms" },
  // Products & Inventory
  { code: "product.create", name: "Create Product", module: "product", description: "Add new products to catalogue" },
  { code: "product.read", name: "Read Product", module: "product", description: "View catalogue and product details" },
  { code: "product.update", name: "Update Product", module: "product", description: "Modify product pricing, category, specs" },
  { code: "product.archive", name: "Archive Product", module: "product", description: "Archive or delete products" },
  { code: "product.manage_media", name: "Manage Product Media", module: "product", description: "Upload and organize product photos" },
  { code: "product.manage_price", name: "Manage Prices", module: "product", description: "Configure dealer pricing tiers" },
  { code: "inventory.read", name: "Read Inventory", module: "inventory", description: "View warehouse inventory levels" },
  { code: "inventory.adjust", name: "Adjust Inventory", module: "inventory", description: "Perform manual stock adjustments" },
  { code: "inventory.transfer", name: "Transfer Inventory", module: "inventory", description: "Stock transfers between warehouses" },
  // Orders
  { code: "order.create", name: "Create Order", module: "order", description: "Create sales orders" },
  { code: "order.read", name: "Read Order", module: "order", description: "View order manifests and tracking" },
  { code: "order.submit", name: "Submit Order", module: "order", description: "Submit orders for accounts verification" },
  { code: "order.review", name: "Review Order", module: "order", description: "Review and accept orders" },
  { code: "order.revise", name: "Revise Order", module: "order", description: "Edit quantities and line items on orders" },
  { code: "order.confirm", name: "Confirm Order", module: "order", description: "Confirm finalized orders" },
  { code: "order.cancel", name: "Cancel Order", module: "order", description: "Cancel orders" },
  // Proforma & Billing
  { code: "proforma.generate", name: "Generate Proforma", module: "proforma", description: "Generate PI documents" },
  { code: "proforma.confirm", name: "Confirm Proforma", module: "proforma", description: "Confirm PI approvals" },
  { code: "invoice.generate", name: "Generate Invoice", module: "invoice", description: "Issue tax invoices" },
  { code: "invoice.read", name: "Read Invoice", module: "invoice", description: "View invoices and statements" },
  { code: "payment.record", name: "Record Payment", module: "payment", description: "Log incoming dealer payments" },
  { code: "payment.read", name: "Read Payment", module: "payment", description: "View payment history" },
  { code: "credit.approve", name: "Approve Credit", module: "credit", description: "Approve credit sales and extensions" },
  // Warehouse, Packing & Logistics
  { code: "picklist.generate", name: "Generate Pick List", module: "picklist", description: "Generate pick lists for warehouse" },
  { code: "picklist.assign", name: "Assign Pick List", module: "picklist", description: "Assign pickers to pick lists" },
  { code: "picklist.complete", name: "Complete Pick List", module: "picklist", description: "Fulfill and confirm picked items" },
  { code: "packing.manage", name: "Manage Packing", module: "packing", description: "Carton packing and package labelling" },
  { code: "shipment.dispatch", name: "Dispatch Shipment", module: "shipment", description: "Issue dispatch challans and dispatch" },
  { code: "shipment.read", name: "Read Shipment", module: "shipment", description: "View shipments and tracking" },
  { code: "delivery.update", name: "Update Delivery", module: "delivery", description: "Log transit and delivery events" },
  // Reports & Audits
  { code: "report.view", name: "View Reports", module: "report", description: "Access business reports and dashboards" },
  { code: "report.export", name: "Export Reports", module: "report", description: "Export excel / CSV reports" },
  { code: "audit.view", name: "View Audit Logs", module: "audit", description: "Audit trails and change history" },
  { code: "theme.manage", name: "Manage Themes", module: "theme", description: "Configure storefront branding" },
  { code: "homepage.manage", name: "Manage Homepage", module: "homepage", description: "Edit homepage banners and sections" },
];

export const ROLE_PERMISSION_MAP: Record<string, string[]> = {
  SUPER_ADMIN: ALL_PERMISSIONS.map((p) => p.code),
  PLATFORM_ADMIN: ALL_PERMISSIONS.map((p) => p.code),
  SELLER_OWNER: ALL_PERMISSIONS.map((p) => p.code),
  SELLER_ADMIN: ALL_PERMISSIONS.map((p) => p.code),
  ADMIN: ALL_PERMISSIONS.map((p) => p.code),

  ACCOUNTS_MANAGER: [
    "dealer.read", "dealer.manage_credit", "product.read", "inventory.read", "order.read",
    "order.review", "order.revise", "proforma.generate", "proforma.confirm", "invoice.generate",
    "invoice.read", "payment.record", "payment.read", "credit.approve", "report.view", "report.export",
  ],
  ACCOUNT_MANAGER: [
    "dealer.read", "dealer.manage_credit", "product.read", "inventory.read", "order.read",
    "order.review", "order.revise", "proforma.generate", "proforma.confirm", "invoice.generate",
    "invoice.read", "payment.record", "payment.read", "credit.approve", "report.view", "report.export",
  ],
  ACCOUNTANT: [
    "dealer.read", "product.read", "inventory.read", "order.read", "order.review", "order.revise",
    "proforma.generate", "invoice.generate", "invoice.read", "payment.record", "payment.read",
    "report.view", "report.export",
  ],
  ACCOUNTS_USER: [
    "dealer.read", "product.read", "inventory.read", "order.read", "order.review", "order.revise",
    "proforma.generate", "invoice.generate", "invoice.read", "payment.record", "payment.read",
  ],

  WAREHOUSE_MANAGER: [
    "product.read", "product.update", "inventory.read", "inventory.adjust", "inventory.transfer",
    "order.read", "picklist.generate", "picklist.assign", "picklist.complete", "packing.manage",
    "shipment.read", "report.view",
  ],
  WAREHOUSE_USER: [
    "product.read", "inventory.read", "order.read", "picklist.complete", "packing.manage",
  ],
  WAREHOUSE_PICKER: [
    "product.read", "inventory.read", "order.read", "picklist.complete",
  ],
  PACKING_USER: [
    "order.read", "packing.manage", "shipment.read",
  ],
  DISPATCH_USER: [
    "order.read", "packing.manage", "shipment.dispatch", "shipment.read", "delivery.update",
  ],

  SALES_MANAGER: [
    "dealer.create", "dealer.read", "dealer.update", "dealer.assign_salesperson",
    "product.read", "order.create", "order.read", "order.submit", "order.revise",
    "report.view", "report.export",
  ],
  SALESPERSON: [
    "dealer.read", "product.read", "order.create", "order.read", "order.submit",
  ],
  SALES_REP: [
    "dealer.read", "product.read", "order.create", "order.read", "order.submit",
  ],

  PRODUCT_MANAGER: [
    "product.create", "product.read", "product.update", "product.archive",
    "product.manage_media", "product.manage_price", "inventory.read", "report.view",
  ],
  PRICING_MANAGER: [
    "product.read", "product.manage_price", "dealer.read", "report.view",
  ],
  DEALER_MANAGER: [
    "dealer.create", "dealer.read", "dealer.approve", "dealer.update",
    "dealer.assign_salesperson", "dealer.manage_credit", "report.view",
  ],

  STAFF: [
    "product.read", "dealer.read", "order.read", "invoice.read", "shipment.read", "report.view",
  ],
  READ_ONLY: [
    "product.read", "dealer.read", "order.read", "invoice.read", "shipment.read", "report.view",
  ],
  REPORT_VIEWER: [
    "report.view", "report.export",
  ],
  SELLER_AUDITOR: [
    "order.read", "invoice.read", "payment.read", "report.view", "audit.view",
  ],
};

/**
 * Ensures standard RBAC permissions exist in the database and are linked to all roles.
 * Runs idempotently during role/user administration page requests to ensure database consistency.
 */
export async function ensureRbacPermissions(sellerId?: string) {
  try {
    // 1. Upsert all permissions
    for (const p of ALL_PERMISSIONS) {
      await prisma.permission.upsert({
        where: { code: p.code },
        update: { name: p.name, module: p.module, description: p.description },
        create: p,
      });
    }

    const allPerms = await prisma.permission.findMany();
    const permMap = new Map(allPerms.map((p) => [p.code, p.id]));

    // 2. Fetch all roles in seller scope and platform scope
    const roles = await prisma.role.findMany({
      where: sellerId ? { OR: [{ sellerId }, { sellerId: null }] } : {},
    });

    // 3. For each role, ensure its permissions are attached
    for (const role of roles) {
      const allowedCodes = ROLE_PERMISSION_MAP[role.code] || [];
      for (const code of allowedCodes) {
        const permId = permMap.get(code);
        if (permId) {
          await prisma.rolePermission.upsert({
            where: { roleId_permissionId: { roleId: role.id, permissionId: permId } },
            update: {},
            create: { roleId: role.id, permissionId: permId },
          });
        }
      }
    }

    // 4. Normalize any legacy fractional VAT values (e.g. 0.13 -> 13.00) in database
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

