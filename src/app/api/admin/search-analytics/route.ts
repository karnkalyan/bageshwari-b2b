import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/api-response";
import { getSearchAnalytics } from "@/services/search-analytics.service";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return apiError("UNAUTHORIZED", "Authentication required.", 401);
  }

  const userRoles = session.roles || [];
  const isAuthorized = userRoles.some((role) =>
    [
      "SUPER_ADMIN",
      "PLATFORM_ADMIN",
      "SELLER_OWNER",
      "ADMIN",
      "STAFF",
      "PRODUCT_MANAGER",
      "SALES_MANAGER",
      "SALESPERSON",
      "ACCOUNTANT",
      "ACCOUNTS_MANAGER",
      "WAREHOUSE_MANAGER",
    ].includes(role)
  );

  if (!isAuthorized) {
    return apiError("FORBIDDEN", "You do not have permission to view search analytics.", 403);
  }

  const { searchParams } = new URL(request.url);
  const timeframe = (searchParams.get("timeframe") || "7d") as "today" | "7d" | "30d" | "all";

  try {
    const analytics = await getSearchAnalytics(session.sellerId, timeframe);
    return apiSuccess(analytics);
  } catch (error) {
    console.error("Search analytics API error:", error);
    return apiError("INTERNAL_ERROR", "Failed to retrieve search analytics.", 500);
  }
}
