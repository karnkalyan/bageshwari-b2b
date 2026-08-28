import Page from "@/app/s/[sellerSlug]/admin/orders/[id]/page";
export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return Page({ params: Promise.resolve({ sellerSlug: "bageshwari", id }) });
}
