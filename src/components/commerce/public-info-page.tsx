import Link from "next/link";
import { prisma } from "@/lib/db";
import { PublicHeader } from "@/app/s/[sellerSlug]/_components/public-header";
import { PublicFooter } from "@/app/s/[sellerSlug]/_components/public-footer";
import { UtilityBar } from "@/app/s/[sellerSlug]/_components/utility-bar";

export async function PublicInfoPage({
  title,
  eyebrow,
  children,
}: {
  title: string;
  eyebrow: string;
  children: (company: NonNullable<Awaited<ReturnType<typeof loadCompany>>>) => React.ReactNode;
}) {
  const company = await loadCompany();
  if (!company) return <main className="p-10 text-center">Company profile not initialized.</main>;
  return (
    <div className="min-h-screen bg-slate-50">
      <UtilityBar content={null} />
      <PublicHeader seller={company.seller} sellerSlug="bageshwari" />
      <main>
        <section className="border-b border-slate-200 bg-white py-12">
          <div className="site-container">
            <Link href="/" className="text-xs font-bold text-red-600">← Back to storefront</Link>
            <div className="mt-6 text-xs font-black uppercase tracking-[.18em] text-red-600">{eyebrow}</div>
            <h1 className="mt-2 max-w-3xl text-4xl font-black text-[#092f5c]">{title}</h1>
          </div>
        </section>
        <section className="site-container py-10">{children(company)}</section>
      </main>
      <PublicFooter seller={company.seller} sellerSlug="bageshwari" />
    </div>
  );
}

async function loadCompany() {
  return prisma.companyProfile.findUnique({
    where: { id: "bageshwari-tractors" },
    include: { seller: true },
  });
}
