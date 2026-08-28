import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getTenantContext } from "@/lib/tenant";
import { PortalShell } from "@/components/layout/portal-shell";
export default async function AccountsLayout({ children }: { children: React.ReactNode }) { const [ctx, session] = await Promise.all([getTenantContext("bageshwari"), auth()]); if (!ctx.roles.some((role) => ["ADMIN", "SELLER_OWNER", "SELLER_ADMIN", "ACCOUNT_MANAGER", "ACCOUNTANT", "ACCOUNTS_MANAGER", "ACCOUNTS_USER"].includes(role))) redirect("/unauthorized"); return <PortalShell title="Accounts" user={session?.user} items={[{ label: "Review queue", href: "/accounts/dashboard" }, { label: "Orders", href: "/accounts/orders" }]}>{children}</PortalShell>; }
