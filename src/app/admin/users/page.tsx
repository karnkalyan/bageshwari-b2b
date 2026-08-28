import Page from "@/app/s/[sellerSlug]/admin/users/page";
export default function UsersPage() { return Page({ params: Promise.resolve({ sellerSlug: "bageshwari" }) }); }
