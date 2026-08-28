import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getTenantContext } from "@/lib/tenant";
import { PortalShell } from "@/components/layout/portal-shell";
export default async function WarehouseLayout({ children }: { children: React.ReactNode }) { const [ctx, session] = await Promise.all([getTenantContext("bageshwari"), auth()]); if (!ctx.roles.some((role) => ["ADMIN", "SELLER_OWNER", "SELLER_ADMIN", "WAREHOUSE_MANAGER", "WAREHOUSE_USER", "WAREHOUSE_PICKER", "PACKING_USER"].includes(role))) redirect("/unauthorized"); return <PortalShell title="Warehouse" user={session?.user} items={[{ label: "Pick queue", href: "/warehouse/dashboard" }, { label: "Packing", href: "/warehouse/packing" }]}>{children}</PortalShell>; }
