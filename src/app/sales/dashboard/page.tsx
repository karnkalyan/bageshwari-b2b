import Page from "@/app/s/[sellerSlug]/admin/page";
export default function SalesDashboardPage() { return Page({ params: Promise.resolve({ sellerSlug: "bageshwari" }) }); }
