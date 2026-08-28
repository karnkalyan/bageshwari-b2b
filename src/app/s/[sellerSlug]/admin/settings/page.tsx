import { prisma } from "@/lib/db";
import { getTenantContext, hasRole, hasPermission } from "@/lib/tenant";
import { redirect } from "next/navigation";
import {
  AdminSettingsClient,
  SerializedCompanyProfile,
  SerializedCategoryTax,
} from "@/components/admin/admin-settings-client";

interface AdminSettingsPageProps {
  params: Promise<{ sellerSlug: string }>;
}

export default async function AdminSettingsPage({ params }: AdminSettingsPageProps) {
  const { sellerSlug } = await params;
  const ctx = await getTenantContext(sellerSlug);

  const isAuthorized =
    hasRole(
      ctx,
      "SUPER_ADMIN",
      "PLATFORM_ADMIN",
      "SELLER_OWNER",
      "SELLER_ADMIN",
      "ADMIN",
      "STAFF",
      "ACCOUNTANT",
      "ACCOUNTS_MANAGER",
      "ACCOUNT_MANAGER",
      "SALES_MANAGER",
      "SALES_REP",
      "SALESPERSON",
      "PRODUCT_MANAGER"
    ) ||
    hasPermission(ctx, "settings.manage") ||
    hasPermission(ctx, "vat.manage") ||
    hasPermission(ctx, "dealer.manage");

  if (!isAuthorized) {
    redirect(`/s/${sellerSlug}/admin`);
  }

  const [seller, categoriesRaw] = await Promise.all([
    prisma.seller.findUnique({
      where: { id: ctx.sellerId },
    }),
    prisma.productCategory.findMany({
      where: { sellerId: ctx.sellerId },
      orderBy: { name: "asc" },
      include: { _count: { select: { products: true } } },
    }).catch(() => []),
  ]);

  let companyRaw: any = null;
  try {
    const rows = await prisma.$queryRaw<any[]>`SELECT * FROM CompanyProfile WHERE id = 'bageshwari-tractors' LIMIT 1`.catch(() => []);
    companyRaw = rows?.[0] || null;
  } catch {
    // fallback
  }

  const serializedCompany: SerializedCompanyProfile = {
    companyName: seller?.legalName || companyRaw?.companyName || "Bageshwari Tractors Pvt. Ltd.",
    tradingName: seller?.tradingName || companyRaw?.tradingName || "Bageshwari Tractors",
    contactPerson: companyRaw?.contactPerson || "Managing Director",
    email: seller?.email || companyRaw?.email || "info@bageshwari.com.np",
    phone: seller?.phone || companyRaw?.phone || "+977-81-520123",
    website: seller?.website || companyRaw?.website || "https://bageshwari.com.np",
    country: seller?.country || companyRaw?.country || "Nepal",
    province: seller?.province || companyRaw?.province || "Lumbini Province",
    district: seller?.district || companyRaw?.district || "Banke",
    city: seller?.city || companyRaw?.city || "Nepalgunj",
    address: seller?.addressLine1 || companyRaw?.address || "Main Highway Road, Nepalgunj",
    panNumber: seller?.taxNumber || companyRaw?.panNumber || "302918239",
    vatNumber: seller?.taxNumber || companyRaw?.vatNumber || companyRaw?.panNumber || "302918239",
    registrationNumber: seller?.registrationNumber || companyRaw?.registrationNumber || "29384/078/079",
    defaultVatPercent: companyRaw?.defaultVatPercent
      ? Number(companyRaw.defaultVatPercent) > 0 && Number(companyRaw.defaultVatPercent) <= 1.0
        ? Number(companyRaw.defaultVatPercent) * 100
        : Number(companyRaw.defaultVatPercent)
      : 13.0,
    pricesIncludeVat: Boolean(companyRaw?.pricesIncludeVat),
    bankName: companyRaw?.bankName || "NIC ASIA Bank Ltd.",
    bankAccountName: companyRaw?.bankAccountName || "Bageshwari Tractors Pvt. Ltd.",
    bankAccountNumber: companyRaw?.bankAccountNumber || "0194291823901928",
    bankBranch: companyRaw?.bankBranch || "Nepalgunj Main Branch",
    bankSwiftCode: companyRaw?.bankSwiftCode || "NICA-NP",
    enableDealerCredit: companyRaw?.enableDealerCredit !== undefined ? Boolean(companyRaw.enableDealerCredit) : true,
    defaultCreditLimit: companyRaw?.defaultCreditLimit ? Number(companyRaw.defaultCreditLimit) : 500000,
    defaultCreditPeriodDays: companyRaw?.defaultCreditPeriodDays ? Number(companyRaw.defaultCreditPeriodDays) : 30,
    maxCreditLimit: companyRaw?.maxCreditLimit ? Number(companyRaw.maxCreditLimit) : 5000000,
    creditTermsPolicy: companyRaw?.creditTermsPolicy || "Standard 30-Day Net B2B Commercial Credit Facility subject to approved limit and periodic account reconciliation.",
  };

  const serializedCategories: SerializedCategoryTax[] = categoriesRaw.map((c) => ({
    id: c.id,
    name: c.name,
    code: c.code,
    taxPercent: c.taxPercent !== null && c.taxPercent !== undefined ? Number(c.taxPercent) : null,
    productCount: c._count ? c._count.products : 0,
  }));

  return (
    <div className="mx-auto w-full max-w-[1500px] space-y-6 p-4 md:p-7">
      <div>
        <div className="section-kicker">System & Legal Configuration</div>
        <h1 className="text-2xl font-black text-[#0b2d55]">Company Profile, VAT & Tax Settings</h1>
        <p className="text-sm text-slate-500 mt-1">
          Manage seller company details, statutory PAN/VAT registration, global VAT rates, banking coordinates, and category tax rates.
        </p>
      </div>

      <AdminSettingsClient
        initialCompany={serializedCompany}
        initialCategories={serializedCategories}
        sellerSlug={sellerSlug}
      />
    </div>
  );
}
