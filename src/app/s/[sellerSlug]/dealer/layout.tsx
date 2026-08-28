import { getTenantContext } from "@/lib/tenant";
import { DealerShell } from "./_components/dealer-sidebar";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

interface DealerLayoutProps {
  children: React.ReactNode;
  params: Promise<{ sellerSlug: string }>;
}

export default async function DealerLayout({ children, params }: DealerLayoutProps) {
  const { sellerSlug } = await params;
  const ctx = await getTenantContext(sellerSlug, "/dealer/login");
  const session = await auth();
  if (!ctx.dealerId) redirect("/admin/dashboard");

  return (
      <DealerShell
        sellerSlug={ctx.sellerSlug}
        sellerName={ctx.sellerName}
        user={session?.user}
      >{children}</DealerShell>
  );
}
