import CataloguePage from "@/app/s/[sellerSlug]/products/page";

export default function ProductsPage(props: {
  searchParams: Promise<{ search?: string; category?: string; brand?: string; sort?: string; page?: string }>;
}) {
  return CataloguePage({ params: Promise.resolve({ sellerSlug: "bageshwari" }), searchParams: props.searchParams });
}
