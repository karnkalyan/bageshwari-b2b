import Page from "@/app/s/[sellerSlug]/admin/orders/page";
export default function OrdersPage(props: { searchParams: Promise<{ status?: string; page?: string }> }) {
  return Page({ params: Promise.resolve({ sellerSlug: "bageshwari" }), searchParams: props.searchParams });
}
