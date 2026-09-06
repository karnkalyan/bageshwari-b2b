import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getTenantContext } from "@/lib/tenant";
import { PortalShell } from "@/components/layout/portal-shell";

export default async function WarehouseLayout({ children }: { children: React.ReactNode }) {
  const [ctx, session] = await Promise.all([getTenantContext("bageshwari"), auth()]);
  const allowedRoles = [
    "SUPER_ADMIN",
    "PLATFORM_ADMIN",
    "ADMIN",
    "SELLER_OWNER",
    "SELLER_ADMIN",
    "WAREHOUSE_MANAGER",
    "WAREHOUSE_USER",
    "WAREHOUSE_PICKER",
    "PACKING_USER",
    "DISPATCH_USER",
    "LOGISTICS_MANAGER",
  ];

  if (!ctx.roles.some((role) => allowedRoles.includes(role))) {
    redirect("/unauthorized");
  }

  return (
    <PortalShell
      title="Warehouse & Logistics"
      user={session?.user}
      items={[
        { label: "Pick Queue & Picking", href: "/warehouse/dashboard" },
        { label: "Packaging & Cartons", href: "/warehouse/packing" },
        { label: "Dispatch & Challans", href: "/warehouse/dispatch" },
      ]}
    >
      {children}
    </PortalShell>
  );
}
