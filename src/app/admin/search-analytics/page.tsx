import Page from "@/app/s/[sellerSlug]/admin/search-analytics/page";

export default function AdminSearchAnalyticsPage() {
  return <Page params={Promise.resolve({ sellerSlug: "bageshwari" })} />;
}
