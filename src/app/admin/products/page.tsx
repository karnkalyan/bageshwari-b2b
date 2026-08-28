import Page from "@/app/s/[sellerSlug]/admin/products/page";
export default function ProductsPage(props: { searchParams: Promise<{ search?: string; page?: string; status?: string }> }) {
  return Page({ params: Promise.resolve({ sellerSlug: "bageshwari" }), searchParams: props.searchParams });
}
