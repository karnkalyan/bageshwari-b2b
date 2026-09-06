import LegacyDealerLayout from "@/app/s/[sellerSlug]/dealer/layout";

export default async function DealerPortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <LegacyDealerLayout params={Promise.resolve({ sellerSlug: "bageshwari" })}>
      {children}
    </LegacyDealerLayout>
  );
}
