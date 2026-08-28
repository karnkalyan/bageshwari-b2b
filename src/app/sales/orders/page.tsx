import Page from "@/app/s/[sellerSlug]/admin/orders/page";
export default function SalesOrdersPage(props: { searchParams: Promise<{ status?: string; page?: string }> }) { return Page({ params: Promise.resolve({ sellerSlug: "bageshwari" }), searchParams: props.searchParams }); }
