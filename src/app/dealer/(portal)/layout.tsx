import LegacyDealerLayout from "@/app/s/[sellerSlug]/dealer/layout";
export default function DealerPortalLayout({ children }: { children: React.ReactNode }) {
  return LegacyDealerLayout({ children, params: Promise.resolve({ sellerSlug: "bageshwari" }) });
}
