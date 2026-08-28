import ProductPage from "@/app/s/[sellerSlug]/products/[sku]/page";

export default async function ProductDetailsPage({ params }: { params: Promise<{ sku: string }> }) {
  const { sku } = await params;
  return ProductPage({ params: Promise.resolve({ sellerSlug: "bageshwari", sku }) });
}
