import Page from "@/app/s/[sellerSlug]/dealer/products/page";
export default function DealerProductsPage(props: { searchParams: Promise<{ search?: string; page?: string }> }) {
  return Page({ params: Promise.resolve({ sellerSlug: "bageshwari" }), searchParams: props.searchParams });
}
