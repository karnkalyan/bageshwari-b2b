import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getTenantContext } from "@/lib/tenant";
import { PortalShell } from "@/components/layout/portal-shell";
export default async function DispatchLayout({ children }: { children: React.ReactNode }) { const [ctx, session] = await Promise.all([getTenantContext("bageshwari"), auth()]); if (!ctx.roles.some((role) => ["ADMIN", "SELLER_OWNER", "SELLER_ADMIN", "DISPATCH_USER"].includes(role))) redirect("/unauthorized"); return <PortalShell title="Dispatch" user={session?.user} items={[{ label: "Dispatch queue", href: "/dispatch/dashboard" }, { label: "Transport", href: "/dispatch/transport" }]}>{children}</PortalShell>; }
