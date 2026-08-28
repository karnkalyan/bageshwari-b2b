import { z } from "zod";
import { auth } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/api-response";
import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";

const updateSettingsSchema = z.object({
  companyName: z.string().trim().min(1).max(255).optional(),
  tradingName: z.string().trim().min(1).max(255).optional(),
  contactPerson: z.string().trim().max(100).optional().nullable(),
  email: z.string().trim().email().optional().nullable(),
  phone: z.string().trim().max(50).optional().nullable(),
  website: z.string().trim().url().optional().nullable().or(z.literal("")),
  country: z.string().trim().max(50).optional(),
  province: z.string().trim().max(50).optional().nullable(),
  district: z.string().trim().max(50).optional().nullable(),
  city: z.string().trim().max(50).optional().nullable(),
  address: z.string().trim().max(255).optional().nullable(),
  panNumber: z.string().trim().max(50).optional().nullable(),
  vatNumber: z.string().trim().max(50).optional().nullable(),
  registrationNumber: z.string().trim().max(50).optional().nullable(),
  defaultVatPercent: z.coerce.number().min(0).max(100).optional(),
  pricesIncludeVat: z.boolean().optional(),
  bankName: z.string().trim().max(100).optional().nullable(),
  bankAccountName: z.string().trim().max(100).optional().nullable(),
  bankAccountNumber: z.string().trim().max(50).optional().nullable(),
  bankBranch: z.string().trim().max(100).optional().nullable(),
  bankSwiftCode: z.string().trim().max(20).optional().nullable(),
  enableDealerCredit: z.boolean().optional(),
  defaultCreditLimit: z.coerce.number().min(0).optional(),
  defaultCreditPeriodDays: z.coerce.number().int().min(0).max(365).optional(),
  maxCreditLimit: z.coerce.number().min(0).optional(),
  creditTermsPolicy: z.string().trim().max(2000).optional().nullable(),
  categories: z.array(
    z.object({
      id: z.string(),
      taxPercent: z.coerce.number().min(0).max(100).optional().nullable(),
    })
  ).optional(),
});

export async function GET() {
  const session = await auth();
  if (!session?.sellerId) return apiError("UNAUTHORIZED", "Authentication required.", 401);

  let company: any = null;
  try {
    company = await prisma.companyProfile.findUnique({ where: { id: "bageshwari-tractors" } });
  } catch {
    const rows = await prisma.$queryRaw<any[]>`SELECT * FROM CompanyProfile WHERE id = 'bageshwari-tractors' LIMIT 1`.catch(() => []);
    company = rows?.[0] || null;
  }

  let categories: any[] = [];
  try {
    categories = await prisma.productCategory.findMany({
      where: { sellerId: session.sellerId },
      orderBy: { name: "asc" },
      include: { _count: { select: { products: true } } },
    });
  } catch {
    categories = await prisma.$queryRaw<any[]>`
      SELECT c.*, COUNT(p.id) as productCount
      FROM ProductCategory c
      LEFT JOIN Product p ON p.categoryId = c.id
      WHERE c.sellerId = ${session.sellerId}
      GROUP BY c.id
      ORDER BY c.name ASC
    `.catch(() => []);
  }

  return apiSuccess({
    company,
    categories: categories.map((c) => ({
      ...c,
      taxPercent: c.taxPercent !== null && c.taxPercent !== undefined ? Number(c.taxPercent) : null,
      _count: c._count || { products: c.productCount || 0 },
    })),
  });
}

export async function PUT(request: Request) {
  const session = await auth();
  if (!session?.user?.id || !session.sellerId) {
    return apiError("UNAUTHORIZED", "Authentication required.", 401);
  }

  const isPrivileged = (session.roles || []).some((r) =>
    [
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
      "PRODUCT_MANAGER",
    ].includes(r)
  );
  if (!isPrivileged) {
    return apiError("FORBIDDEN", "Administrative privilege required.", 403);
  }

  const body = await request.json().catch(() => null);
  const parsed = updateSettingsSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("VALIDATION_ERROR", "Invalid settings parameters.", 422, parsed.error.format());
  }

  const { categories, ...companyData } = parsed.data;

  try {
    const updated = await prisma.$transaction(async (tx) => {
      // 1. Update Core Seller entity
      if (session.sellerId) {
        await tx.seller.update({
          where: { id: session.sellerId },
          data: {
            ...(companyData.companyName ? { legalName: companyData.companyName } : {}),
            ...(companyData.tradingName ? { tradingName: companyData.tradingName } : {}),
            ...(companyData.email !== undefined ? { email: companyData.email } : {}),
            ...(companyData.phone !== undefined ? { phone: companyData.phone } : {}),
            ...(companyData.website !== undefined ? { website: companyData.website || null } : {}),
            ...(companyData.country ? { country: companyData.country } : {}),
            ...(companyData.province !== undefined ? { province: companyData.province } : {}),
            ...(companyData.district !== undefined ? { district: companyData.district } : {}),
            ...(companyData.city !== undefined ? { city: companyData.city } : {}),
            ...(companyData.address !== undefined ? { addressLine1: companyData.address } : {}),
            ...(companyData.panNumber !== undefined ? { taxNumber: companyData.panNumber } : {}),
            ...(companyData.registrationNumber !== undefined ? { registrationNumber: companyData.registrationNumber } : {}),
          },
        });
      }

      // 2. Upsert Company Profile if table exists
      try {
        await (tx.companyProfile as any).upsert({
          where: { id: "bageshwari-tractors" },
          update: {
            ...(companyData.companyName ? { companyName: companyData.companyName } : {}),
            ...(companyData.tradingName ? { tradingName: companyData.tradingName } : {}),
            ...(companyData.contactPerson !== undefined ? { contactPerson: companyData.contactPerson } : {}),
            ...(companyData.email !== undefined ? { email: companyData.email } : {}),
            ...(companyData.phone !== undefined ? { phone: companyData.phone } : {}),
            ...(companyData.website !== undefined ? { website: companyData.website || null } : {}),
            ...(companyData.country ? { country: companyData.country } : {}),
            ...(companyData.province !== undefined ? { province: companyData.province } : {}),
            ...(companyData.district !== undefined ? { district: companyData.district } : {}),
            ...(companyData.city !== undefined ? { city: companyData.city } : {}),
            ...(companyData.address !== undefined ? { address: companyData.address } : {}),
            ...(companyData.panNumber !== undefined ? { panNumber: companyData.panNumber } : {}),
            ...(companyData.vatNumber !== undefined ? { vatNumber: companyData.vatNumber } : {}),
            ...(companyData.registrationNumber !== undefined ? { registrationNumber: companyData.registrationNumber } : {}),
            ...(companyData.defaultVatPercent !== undefined ? { defaultVatPercent: new Prisma.Decimal(companyData.defaultVatPercent) } : {}),
            ...(companyData.pricesIncludeVat !== undefined ? { pricesIncludeVat: companyData.pricesIncludeVat } : {}),
            ...(companyData.bankName !== undefined ? { bankName: companyData.bankName } : {}),
            ...(companyData.bankAccountName !== undefined ? { bankAccountName: companyData.bankAccountName } : {}),
            ...(companyData.bankAccountNumber !== undefined ? { bankAccountNumber: companyData.bankAccountNumber } : {}),
            ...(companyData.bankBranch !== undefined ? { bankBranch: companyData.bankBranch } : {}),
            ...(companyData.bankSwiftCode !== undefined ? { bankSwiftCode: companyData.bankSwiftCode } : {}),
            ...(companyData.enableDealerCredit !== undefined ? { enableDealerCredit: companyData.enableDealerCredit } : {}),
            ...(companyData.defaultCreditLimit !== undefined ? { defaultCreditLimit: new Prisma.Decimal(companyData.defaultCreditLimit) } : {}),
            ...(companyData.defaultCreditPeriodDays !== undefined ? { defaultCreditPeriodDays: companyData.defaultCreditPeriodDays } : {}),
            ...(companyData.maxCreditLimit !== undefined ? { maxCreditLimit: new Prisma.Decimal(companyData.maxCreditLimit) } : {}),
            ...(companyData.creditTermsPolicy !== undefined ? { creditTermsPolicy: companyData.creditTermsPolicy } : {}),
          },
          create: {
            id: "bageshwari-tractors",
            sellerId: session.sellerId!,
            companyName: companyData.companyName || "Bageshwari Tractors Pvt. Ltd.",
            tradingName: companyData.tradingName || "Bageshwari Tractors",
            contactPerson: companyData.contactPerson || "Managing Director",
            email: companyData.email || "info@bageshwari.com.np",
            phone: companyData.phone || "+977-81-520123",
            country: companyData.country || "Nepal",
            city: companyData.city || "Nepalgunj",
            district: companyData.district || "Banke",
            address: companyData.address || "Main Highway Road",
            panNumber: companyData.panNumber || "302918239",
            vatNumber: companyData.vatNumber || "302918239",
            defaultVatPercent: new Prisma.Decimal(companyData.defaultVatPercent ?? 13.0),
            pricesIncludeVat: companyData.pricesIncludeVat ?? false,
            bankName: companyData.bankName || "NIC ASIA Bank Ltd.",
            bankAccountName: companyData.bankAccountName || "Bageshwari Tractors Pvt. Ltd.",
            bankAccountNumber: companyData.bankAccountNumber || "0194291823901928",
            bankBranch: companyData.bankBranch || "Nepalgunj Main Branch",
            enableDealerCredit: companyData.enableDealerCredit ?? true,
            defaultCreditLimit: new Prisma.Decimal(companyData.defaultCreditLimit ?? 500000),
            defaultCreditPeriodDays: companyData.defaultCreditPeriodDays ?? 30,
            maxCreditLimit: new Prisma.Decimal(companyData.maxCreditLimit ?? 5000000),
            creditTermsPolicy: companyData.creditTermsPolicy || null,
          },
        });
      } catch {
        // table might not exist
      }

      // 2. Update Category-Based VAT Overrides
      if (categories && categories.length > 0) {
        for (const cat of categories) {
          try {
            await (tx.productCategory as any).update({
              where: { id: cat.id },
              data: {
                taxPercent: cat.taxPercent !== null && cat.taxPercent !== undefined ? new Prisma.Decimal(cat.taxPercent) : null,
              },
            });
          } catch {
            await tx.$executeRaw`
              UPDATE ProductCategory
              SET taxPercent = ${cat.taxPercent !== null && cat.taxPercent !== undefined ? cat.taxPercent : null}
              WHERE id = ${cat.id}
            `.catch(() => null);
          }
        }
      }

      return { success: true, ...companyData };
    });

    return apiSuccess(updated, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update settings.";
    return apiError("SETTINGS_UPDATE_FAILED", message, 500);
  }
}
