import Page from "@/app/s/[sellerSlug]/admin/accounts/page";
export default function AccountsPage() { return Page({ params: Promise.resolve({ sellerSlug: "bageshwari" }) }); }
