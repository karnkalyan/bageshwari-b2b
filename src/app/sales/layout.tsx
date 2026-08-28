import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getTenantContext } from "@/lib/tenant";
import { PortalShell } from "@/components/layout/portal-shell";

export default async function SalesLayout({ children }: { children: React.ReactNode }) {
  const [ctx, session] = await Promise.all([getTenantContext("bageshwari"), auth()]);
  if (!ctx.roles.some((role) => ["ADMIN", "SELLER_OWNER", "SELLER_ADMIN", "SALES_MANAGER", "SALES_REP", "SALESPERSON"].includes(role))) redirect("/unauthorized");
  return <PortalShell title="Sales" user={session?.user} items={[{ label: "Dashboard", href: "/sales/dashboard" }, { label: "Dealers", href: "/sales/dealers" }, { label: "Orders", href: "/sales/orders" }]}>{children}</PortalShell>;
}
