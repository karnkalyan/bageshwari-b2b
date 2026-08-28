import Page from "@/app/s/[sellerSlug]/admin/accounts/page";
export default function AccountsDashboardPage() { return Page({ params: Promise.resolve({ sellerSlug: "bageshwari" }) }); }
