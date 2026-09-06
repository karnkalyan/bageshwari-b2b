import Page from "@/app/s/[sellerSlug]/admin/warehouse/page";

export default function WarehousePackingPage() {
  return Page({ params: Promise.resolve({ sellerSlug: "bageshwari" }) });
}
