import Link from "next/link";
import { prisma } from "@/lib/db";
import { PublicHeader } from "@/app/s/[sellerSlug]/_components/public-header";
import { PublicFooter } from "@/app/s/[sellerSlug]/_components/public-footer";
import { UtilityBar } from "@/app/s/[sellerSlug]/_components/utility-bar";

export const dynamic = "force-dynamic";

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

const fallbackCompany: CompanyInfoType = {
  companyName: "Bageshwari Tractors",
  tradingName: "Bageshwari Tractors",
  address: "Surkhet Road, Nepalgunj, Banke, Nepal",
  phone: "+977-81-520123",
  email: "info@bageshwari.com.np",
  panNumber: "609670271",
  vatNumber: "609670271",
  seller: {
    tradingName: "Bageshwari Tractors",
    description: "Agricultural commerce for tractors, genuine spare parts, implements, lubricants and workshop tools.",
    phone: "+977-81-520123",
    email: "info@bageshwari.com.np",
    addressLine1: "Surkhet Road",
    city: "Nepalgunj",
    district: "Banke",
    country: "Nepal",
    taxNumber: "609670271",
    registrationNumber: "2900988",
  },
};

export async function PublicInfoPage({
  title,
  eyebrow,
  children,
}: {
  title: string;
  eyebrow: string;
  children: (company: CompanyInfoType) => React.ReactNode;
}) {
  const company = await loadCompany();
  const currentCompany = company || fallbackCompany;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <UtilityBar content={null} />
      <PublicHeader seller={currentCompany.seller} sellerSlug="bageshwari" />
      <main>
        <section className="border-b border-border bg-card py-12">
          <div className="site-container">
            <Link href="/" className="text-xs font-bold text-red-600 dark:text-red-400">← Back to storefront</Link>
            <div className="mt-6 text-xs font-black uppercase tracking-[.18em] text-red-600 dark:text-red-400">{eyebrow}</div>
            <h1 className="mt-2 max-w-3xl text-4xl font-black text-foreground">{title}</h1>
          </div>
        </section>
        <section className="site-container py-10">{children(currentCompany)}</section>
      </main>
      <PublicFooter seller={currentCompany.seller} sellerSlug="bageshwari" />
    </div>
  );
}

async function loadCompany(): Promise<CompanyInfoType> {
  try {
    if (!process.env.DATABASE_URL) return fallbackCompany;
    const res = await prisma.companyProfile.findUnique({
      where: { id: "bageshwari-tractors" },
      include: { seller: true },
    });
    if (!res || !res.seller) return fallbackCompany;
    return {
      companyName: res.companyName,
      tradingName: res.tradingName,
      address: res.address || fallbackCompany.address,
      phone: res.phone || fallbackCompany.phone,
      email: res.email || fallbackCompany.email,
      panNumber: res.panNumber,
      vatNumber: res.vatNumber,
      seller: res.seller,
    };
  } catch {
    return fallbackCompany;
  }
}
