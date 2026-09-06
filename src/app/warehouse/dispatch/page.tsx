import Page from "@/app/s/[sellerSlug]/admin/dispatch/page";

export default function WarehouseDispatchPage() {
  return Page({ params: Promise.resolve({ sellerSlug: "bageshwari" }) });
}
