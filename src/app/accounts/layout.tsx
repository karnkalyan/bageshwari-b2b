import LegacyAdminLayout from "@/app/s/[sellerSlug]/admin/layout";

export default function AccountsLayout({ children }: { children: React.ReactNode }) {
  return LegacyAdminLayout({ children, params: Promise.resolve({ sellerSlug: "bageshwari" }) });
}
