import Page from "@/app/s/[sellerSlug]/dealer/page";

export default async function DealerDashboardPage() {
  return <Page params={Promise.resolve({ sellerSlug: "bageshwari" })} />;
}
