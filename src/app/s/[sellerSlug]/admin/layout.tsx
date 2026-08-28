import { getTenantContext } from "@/lib/tenant";
import { AdminShell } from "./_components/admin-shell";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

interface AdminLayoutProps {
  children: React.ReactNode;
  params: Promise<{ sellerSlug: string }>;
}

export default async function AdminLayout({ children, params }: AdminLayoutProps) {
  const { sellerSlug } = await params;
  const ctx = await getTenantContext(sellerSlug);
  const session = await auth();

  const adminRoles = [
    "SUPER_ADMIN", "PLATFORM_ADMIN", "SELLER_OWNER", "SELLER_ADMIN",
    "PRODUCT_MANAGER", "ACCOUNTS_MANAGER", "WAREHOUSE_MANAGER",
    "SALESPERSON", "DISPATCH_USER", "ADMIN", "SALES_REP", "ACCOUNT_MANAGER",
    "ACCOUNTANT", "WAREHOUSE_USER", "WAREHOUSE_PICKER", "PACKING_USER",
    "LOGISTICS_MANAGER", "SALES_MANAGER", "STAFF", "READ_ONLY",
  ];

  if (!ctx.roles.some((role) => adminRoles.includes(role))) {
    redirect(ctx.dealerId ? "/dealer/dashboard" : "/unauthorized");
  }

  return (
    <AdminShell
      sellerSlug={ctx.sellerSlug}
      sellerName={ctx.sellerName}
      user={session?.user}
      roles={ctx.roles}
      permissions={ctx.permissions}
    >
      {children}
    </AdminShell>
  );
}
