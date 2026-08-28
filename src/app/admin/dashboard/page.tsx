import Dashboard from "@/app/s/[sellerSlug]/admin/page";
export default function AdminDashboardPage() {
  return Dashboard({ params: Promise.resolve({ sellerSlug: "bageshwari" }) });
}
