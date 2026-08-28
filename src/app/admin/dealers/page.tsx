import Page from "@/app/s/[sellerSlug]/admin/dealers/page";
export default function DealersPage() { return Page({ params: Promise.resolve({ sellerSlug: "bageshwari" }) }); }
