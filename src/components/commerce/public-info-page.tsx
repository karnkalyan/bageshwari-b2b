import Link from "next/link";
import { connection } from "next/server";
import { prisma } from "@/lib/db";
import { PublicHeader } from "@/app/s/[sellerSlug]/_components/public-header";
import { PublicFooter } from "@/app/s/[sellerSlug]/_components/public-footer";
import { UtilityBar } from "@/app/s/[sellerSlug]/_components/utility-bar";

export interface CompanyInfoType {
  companyName: string;
  tradingName: string;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  panNumber?: string | null;
  vatNumber?: string | null;
  seller: {
    tradingName: string;
    description?: string | null;
    phone?: string | null;
    email?: string | null;
    addressLine1?: string | null;
    city?: string | null;
    district?: string | null;
    country?: string | null;
    taxNumber?: string | null;
    registrationNumber?: string | null;
  };
}

export async function PublicInfoPage({
  title,
  eyebrow,
  children,
}: {
  title: string;
  eyebrow: string;
  children: (company: CompanyInfoType) => React.ReactNode;
}) {
  await connection();
  const company = await loadCompany();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <UtilityBar content={null} />
      <PublicHeader seller={company.seller} sellerSlug="bageshwari" />
      <main>
        <section className="border-b border-border bg-card py-12">
          <div className="site-container">
            <Link
              href="/"
              className="text-xs font-bold text-red-600 dark:text-red-400"
            >
              ← Back to storefront
            </Link>
            <div className="mt-6 text-xs font-black uppercase tracking-[.18em] text-red-600 dark:text-red-400">
              {eyebrow}
            </div>
            <h1 className="mt-2 max-w-3xl text-4xl font-black text-foreground">
              {title}
            </h1>
          </div>
        </section>
        <section className="site-container py-10">{children(company)}</section>
      </main>
      <PublicFooter seller={company.seller} sellerSlug="bageshwari" />
    </div>
  );
}

async function loadCompany(): Promise<CompanyInfoType> {
  const company = await prisma.companyProfile.findUnique({
    where: { id: "bageshwari-tractors" },
    include: { seller: true },
  });

  if (!company) {
    throw new Error(
      "Company profile is not initialized. Run the Prisma seed before starting the application.",
    );
  }

  return company;
}
