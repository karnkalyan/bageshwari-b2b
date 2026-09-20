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
    companyRaw = await prisma.companyProfile.findFirst({
      where: {
        OR: [
          ...(ctx.sellerId ? [{ sellerId: ctx.sellerId }] : []),
          { id: "bageshwari-tractors" },
        ],
      },
    }).catch(() => null);

    if (!companyRaw) {
      companyRaw = await prisma.companyProfile.findFirst().catch(() => null);
    }
  } catch {
    // fallback
  }

  const serializedCompany: SerializedCompanyProfile = {
    companyName: companyRaw?.companyName || seller?.legalName || "Bageshwari Tractors",
    tradingName: companyRaw?.tradingName || seller?.tradingName || "Bageshwari Tractors",
    contactPerson: companyRaw?.contactPerson || "Managing Director",
    email: companyRaw?.email || seller?.email || "info@bageshwari.com.np",
    phone: companyRaw?.phone || seller?.phone || "+977-81-520123",
    website: companyRaw?.website || seller?.website || "https://bageshwari.com.np",
    country: companyRaw?.country || seller?.country || "Nepal",
    province: companyRaw?.province || seller?.province || "Lumbini Province",
    district: companyRaw?.district || seller?.district || "Banke",
    city: companyRaw?.city || seller?.city || "Nepalgunj",
    address: companyRaw?.address || seller?.addressLine1 || "Nepalgunj, Banke",
    panNumber: companyRaw?.panNumber || seller?.taxNumber || "302918239",
    vatNumber: companyRaw?.vatNumber || companyRaw?.panNumber || seller?.taxNumber || "302918239",
    registrationNumber: companyRaw?.registrationNumber || seller?.registrationNumber || "29384/078/079",
    defaultVatPercent: companyRaw?.defaultVatPercent
      ? Number(companyRaw.defaultVatPercent) > 0 && Number(companyRaw.defaultVatPercent) <= 1.0
        ? Number(companyRaw.defaultVatPercent) * 100
        : Number(companyRaw.defaultVatPercent)
      : 13.0,
    pricesIncludeVat: Boolean(companyRaw?.pricesIncludeVat),
    bankName: companyRaw?.bankName || "NIC ASIA Bank Ltd.",
    bankAccountName: companyRaw?.bankAccountName || companyRaw?.companyName || "Bageshwari Tractors",
    bankAccountNumber: companyRaw?.bankAccountNumber || "0194291823901928",
    bankBranch: companyRaw?.bankBranch || "Nepalgunj Main Branch",
    bankSwiftCode: companyRaw?.bankSwiftCode || "NICA-NP",
    bankAccountType: (() => {
      if (companyRaw?.socialLinksJson) {
        try {
          const parsed = JSON.parse(companyRaw.socialLinksJson);
          if (parsed.bankAccountType) return parsed.bankAccountType;
        } catch {}
      }
      return "Current Account";
    })(),
    merchantQrUrl: (() => {
      if (companyRaw?.socialLinksJson) {
        try {
          const parsed = JSON.parse(companyRaw.socialLinksJson);
          if (parsed.merchantQrUrl) return parsed.merchantQrUrl;
        } catch {}
      }
      return null;
    })(),
    upiId: (() => {
      if (companyRaw?.socialLinksJson) {
        try {
          const parsed = JSON.parse(companyRaw.socialLinksJson);
          if (parsed.upiId) return parsed.upiId;
        } catch {}
      }
      return null;
    })(),
    paymentInstructions: (() => {
      if (companyRaw?.socialLinksJson) {
        try {
          const parsed = JSON.parse(companyRaw.socialLinksJson);
          if (parsed.paymentInstructions) return parsed.paymentInstructions;
        } catch {}
      }
      return null;
    })(),
    enableDealerCredit: companyRaw?.enableDealerCredit !== undefined ? Boolean(companyRaw.enableDealerCredit) : true,
    defaultCreditLimit: companyRaw?.defaultCreditLimit ? Number(companyRaw.defaultCreditLimit) : 500000,
    defaultCreditPeriodDays: companyRaw?.defaultCreditPeriodDays ? Number(companyRaw.defaultCreditPeriodDays) : 30,
    maxCreditLimit: companyRaw?.maxCreditLimit ? Number(companyRaw.maxCreditLimit) : 5000000,
    creditTermsPolicy: companyRaw?.creditTermsPolicy || "Standard 30-Day Net B2B Commercial Credit Facility subject to approved limit and periodic account reconciliation.",
    themeConfig: (() => {
      if (companyRaw?.socialLinksJson) {
        try {
          return JSON.parse(companyRaw.socialLinksJson);
        } catch {}
      }
      return {
        primaryColor: "#0b2d55",
        accentColor: "#d97706",
        themeMode: "light",
        headerStyle: "dark",
        brandTagline: "Authorized B2B Tractor Parts & Agricultural Machinery Distributor",
        cardRadius: "rounded-xl",
        tableDensity: "standard",
      };
    })(),
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
