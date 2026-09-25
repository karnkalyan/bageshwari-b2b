import { getTenantContext, requireRole } from "@/lib/tenant";
import { SearchAnalyticsDashboard } from "@/components/admin/search-analytics-dashboard";

const ALL_PRIVILEGED_ROLES = ["SUPER_ADMIN", "PLATFORM_ADMIN", "SELLER_OWNER", "ADMIN", "STAFF"];

interface SearchAnalyticsPageProps {
  params: Promise<{ sellerSlug: string }>;
}

export default async function SearchAnalyticsPage({ params }: SearchAnalyticsPageProps) {
  const { sellerSlug } = await params;
  const ctx = await getTenantContext(sellerSlug);
  requireRole(ctx, ...ALL_PRIVILEGED_ROLES, "PRODUCT_MANAGER", "SALES_MANAGER", "ACCOUNTANT", "WAREHOUSE_MANAGER");

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      <SearchAnalyticsDashboard sellerSlug={sellerSlug} />
    </div>
  );
}
