import Page from "@/app/s/[sellerSlug]/admin/orders/new/page";

export default async function AdminNewOrderPage({
  searchParams,
}: {
  searchParams: Promise<{ dealerId?: string }>;
}) {
  return Page({
    params: Promise.resolve({ sellerSlug: "bageshwari" }),
    searchParams,
  });
}
