import { z } from "zod";
import { auth } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/api-response";
import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";

const updateSettingsSchema = z.object({
  companyName: z.string().trim().min(1).max(255).optional(),
  tradingName: z.string().trim().min(1).max(255).optional(),
  contactPerson: z.string().trim().max(100).optional().nullable(),
  email: z.string().trim().optional().nullable(),
  phone: z.string().trim().max(50).optional().nullable(),
  website: z.string().trim().optional().nullable(),
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
  bankAccountType: z.string().trim().max(50).optional().nullable(),
  merchantQrUrl: z.string().trim().optional().nullable(),
  merchantQrs: z.array(
    z.object({
      id: z.string(),
      title: z.string().trim().min(1),
      qrUrl: z.string().trim().min(1),
      accountName: z.string().trim().optional().nullable(),
      accountNumber: z.string().trim().optional().nullable(),
      isActive: z.boolean().default(true),
      createdAt: z.string().optional(),
    }).passthrough()
  ).optional(),
  upiId: z.string().trim().max(100).optional().nullable(),
  paymentInstructions: z.string().trim().max(1000).optional().nullable(),
  enableDealerCredit: z.boolean().optional(),
  defaultCreditLimit: z.coerce.number().min(0).optional(),
  defaultCreditPeriodDays: z.coerce.number().int().min(0).max(365).optional(),
  maxCreditLimit: z.coerce.number().min(0).optional(),
  creditTermsPolicy: z.string().trim().max(2000).optional().nullable(),
  themeConfig: z
    .object({
      primaryColor: z.string().optional(),
      accentColor: z.string().optional(),
      themeMode: z.enum(["light", "dark", "system"]).optional(),
      headerStyle: z.string().optional(),
      brandTagline: z.string().optional(),
      cardRadius: z.string().optional(),
      tableDensity: z.string().optional(),
    })
    .passthrough()
    .optional(),
  categories: z.array(
    z.object({
      id: z.string(),
      taxPercent: z.coerce.number().min(0).max(100).optional().nullable(),
    }).passthrough()
  ).optional(),
}).passthrough();

export async function GET() {
  const session = await auth();
  let sellerId = session?.sellerId;
  if (!sellerId) {
    const activeSeller = await prisma.seller.findFirst({ where: { status: "ACTIVE" } });
    sellerId = activeSeller?.id;
  }
  if (!sellerId) return apiError("UNAUTHORIZED", "Authentication required.", 401);

  let company: any = null;
  try {
    company = await prisma.companyProfile.findFirst({
      where: {
        OR: [
          { sellerId },
          { id: "bageshwari-tractors" },
        ],
      },
    });
  } catch {
    const rows = await prisma.$queryRaw<any[]>`
      SELECT * FROM CompanyProfile 
      WHERE id = 'bageshwari-tractors' OR sellerId = ${sellerId} 
      LIMIT 1
    `.catch(() => []);
    company = rows?.[0] || null;
  }

  let categories: any[] = [];
  try {
    categories = await prisma.productCategory.findMany({
      where: { sellerId },
      orderBy: { name: "asc" },
      include: { _count: { select: { products: true } } },
    });
  } catch {
    categories = await prisma.$queryRaw<any[]>`
      SELECT c.*, COUNT(p.id) as productCount
      FROM ProductCategory c
      LEFT JOIN Product p ON p.categoryId = c.id
      WHERE c.sellerId = ${sellerId}
      GROUP BY c.id
      ORDER BY c.name ASC
    `.catch(() => []);
  }

  let meta: any = {};
  if (company?.socialLinksJson) {
    try {
      meta = JSON.parse(company.socialLinksJson);
    } catch {}
  }

  const enrichedCompany = company
    ? {
        ...company,
        merchantQrUrl: meta.merchantQrUrl || null,
        merchantQrs: Array.isArray(meta.merchantQrs)
          ? meta.merchantQrs
          : meta.merchantQrUrl
          ? [
              {
                id: "default-qr",
                title: "Primary Merchant QR",
                qrUrl: meta.merchantQrUrl,
                accountName: company.companyName || "Bageshwari Tractors",
                accountNumber: meta.upiId || "",
                isActive: true,
              },
            ]
          : [],
        bankAccountType: meta.bankAccountType || "Current Account",
        upiId: meta.upiId || null,
        paymentInstructions: meta.paymentInstructions || null,
        enableDealerCredit: meta.enableDealerCredit !== undefined ? Boolean(meta.enableDealerCredit) : true,
        defaultCreditLimit: meta.defaultCreditLimit !== undefined ? Number(meta.defaultCreditLimit) : 500000,
        defaultCreditPeriodDays: meta.defaultCreditPeriodDays !== undefined ? Number(meta.defaultCreditPeriodDays) : 30,
        maxCreditLimit: meta.maxCreditLimit !== undefined ? Number(meta.maxCreditLimit) : 5000000,
        creditTermsPolicy: meta.creditTermsPolicy || "Standard 30-Day Net B2B Commercial Credit Facility subject to approved limit and periodic account reconciliation.",
        themeConfig: {
          primaryColor: meta.primaryColor || "#0b2d55",
          accentColor: meta.accentColor || "#d97706",
          themeMode: meta.themeMode || "light",
          headerStyle: meta.headerStyle || "dark",
          brandTagline: meta.brandTagline || "Authorized B2B Tractor Parts & Agricultural Machinery Distributor",
          cardRadius: meta.cardRadius || "rounded-xl",
          tableDensity: meta.tableDensity || "standard",
        },
      }
    : null;

  return apiSuccess({
    company: enrichedCompany,
    categories: categories.map((c) => ({
      ...c,
      taxPercent: c.taxPercent !== null && c.taxPercent !== undefined ? Number(c.taxPercent) : null,
      _count: c._count || { products: c.productCount || 0 },
    })),
  });
}

export async function PUT(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return apiError("UNAUTHORIZED", "Authentication required.", 401);
  }

  let sellerId = session.sellerId;
  if (!sellerId) {
    const activeSeller = await prisma.seller.findFirst({ where: { status: "ACTIVE" } });
    sellerId = activeSeller?.id;
  }
  if (!sellerId) {
    const anySeller = await prisma.seller.findFirst();
    sellerId = anySeller?.id;
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
    const formatted = parsed.error.format();
    const fieldIssues = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    return apiError(
      "VALIDATION_ERROR",
      `Invalid settings: ${fieldIssues || "Please check your inputs."}`,
      422,
      formatted
    );
  }

  const { categories, ...companyData } = parsed.data;

  try {
    const updated = await prisma.$transaction(async (tx) => {
      // 1. Update Core Seller entity
      if (sellerId) {
        await tx.seller.update({
          where: { id: sellerId },
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
        }).catch((err) => {
          console.warn("Seller update notice:", err);
        });
      }

      // 2. Update or Create Company Profile
      const existingProfile = await (tx.companyProfile as any).findFirst({
        where: {
          OR: [
            ...(sellerId ? [{ sellerId }] : []),
            { id: "bageshwari-tractors" },
          ],
        },
      }).catch(() => null);

      let existingMeta: any = {};
      if (existingProfile?.socialLinksJson) {
        try {
          existingMeta = JSON.parse(existingProfile.socialLinksJson);
        } catch {}
      }

      const activeQr = companyData.merchantQrs?.find((q: any) => q.isActive);
      const primaryQr = activeQr?.qrUrl || companyData.merchantQrUrl || companyData.merchantQrs?.[0]?.qrUrl || existingMeta.merchantQrUrl || null;

      const mergedMeta = {
        ...existingMeta,
        ...(companyData.themeConfig || {}),
        merchantQrUrl: primaryQr,
        ...(companyData.merchantQrs !== undefined ? { merchantQrs: companyData.merchantQrs } : {}),
        ...(companyData.bankAccountType !== undefined ? { bankAccountType: companyData.bankAccountType } : {}),
        ...(companyData.upiId !== undefined ? { upiId: companyData.upiId } : {}),
        ...(companyData.paymentInstructions !== undefined ? { paymentInstructions: companyData.paymentInstructions } : {}),
        ...(companyData.enableDealerCredit !== undefined ? { enableDealerCredit: companyData.enableDealerCredit } : {}),
        ...(companyData.defaultCreditLimit !== undefined ? { defaultCreditLimit: Number(companyData.defaultCreditLimit) } : {}),
        ...(companyData.defaultCreditPeriodDays !== undefined ? { defaultCreditPeriodDays: Number(companyData.defaultCreditPeriodDays) } : {}),
        ...(companyData.maxCreditLimit !== undefined ? { maxCreditLimit: Number(companyData.maxCreditLimit) } : {}),
        ...(companyData.creditTermsPolicy !== undefined ? { creditTermsPolicy: companyData.creditTermsPolicy } : {}),
      };

      const profilePayload: Record<string, any> = {
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
        socialLinksJson: JSON.stringify(mergedMeta),
      };

      if (existingProfile) {
        try {
          await (tx.companyProfile as any).update({
            where: { id: existingProfile.id },
            data: profilePayload,
          });
        } catch (updateErr) {
          console.warn("Prisma companyProfile.update failed, using raw SQL fallback:", updateErr);
          const finalCompanyName = profilePayload.companyName ?? existingProfile.companyName;
          const finalTradingName = profilePayload.tradingName ?? existingProfile.tradingName;
          const finalContactPerson = profilePayload.contactPerson ?? existingProfile.contactPerson;
          const finalEmail = profilePayload.email ?? existingProfile.email;
          const finalPhone = profilePayload.phone ?? existingProfile.phone;
          const finalWebsite = profilePayload.website ?? existingProfile.website;
          const finalCountry = profilePayload.country ?? existingProfile.country ?? "Nepal";
          const finalProvince = profilePayload.province ?? existingProfile.province;
          const finalDistrict = profilePayload.district ?? existingProfile.district;
          const finalCity = profilePayload.city ?? existingProfile.city;
          const finalAddress = profilePayload.address ?? existingProfile.address;
          const finalPan = profilePayload.panNumber ?? existingProfile.panNumber;
          const finalVat = profilePayload.vatNumber ?? existingProfile.vatNumber;
          const finalReg = profilePayload.registrationNumber ?? existingProfile.registrationNumber;
          const finalVatPct = companyData.defaultVatPercent !== undefined ? companyData.defaultVatPercent : 13.00;
          const finalPricesInc = companyData.pricesIncludeVat !== undefined ? (companyData.pricesIncludeVat ? 1 : 0) : (existingProfile.pricesIncludeVat ? 1 : 0);
          const finalBankName = profilePayload.bankName ?? existingProfile.bankName;
          const finalBankAccName = profilePayload.bankAccountName ?? existingProfile.bankAccountName;
          const finalBankAccNo = profilePayload.bankAccountNumber ?? existingProfile.bankAccountNumber;
          const finalBankBranch = profilePayload.bankBranch ?? existingProfile.bankBranch;
          const finalBankSwift = profilePayload.bankSwiftCode ?? existingProfile.bankSwiftCode;
          const finalSocialJson = JSON.stringify(mergedMeta);

          await tx.$executeRawUnsafe(
            `UPDATE CompanyProfile SET 
              companyName = ?,
              tradingName = ?,
              contactPerson = ?,
              email = ?,
              phone = ?,
              website = ?,
              country = ?,
              province = ?,
              district = ?,
              city = ?,
              address = ?,
              panNumber = ?,
              vatNumber = ?,
              registrationNumber = ?,
              defaultVatPercent = ?,
              pricesIncludeVat = ?,
              bankName = ?,
              bankAccountName = ?,
              bankAccountNumber = ?,
              bankBranch = ?,
              bankSwiftCode = ?,
              socialLinksJson = ?,
              updatedAt = NOW()
            WHERE id = ?`,
            finalCompanyName,
            finalTradingName,
            finalContactPerson,
            finalEmail,
            finalPhone,
            finalWebsite,
            finalCountry,
            finalProvince,
            finalDistrict,
            finalCity,
            finalAddress,
            finalPan,
            finalVat,
            finalReg,
            finalVatPct,
            finalPricesInc,
            finalBankName,
            finalBankAccName,
            finalBankAccNo,
            finalBankBranch,
            finalBankSwift,
            finalSocialJson,
            existingProfile.id
          );
        }
      } else {
        const resolvedSellerId = sellerId || "seller-bageshwari";
        try {
          await (tx.companyProfile as any).create({
            data: {
              id: "bageshwari-tractors",
              sellerId: resolvedSellerId,
              companyName: companyData.companyName || "Bageshwari Tractors",
              tradingName: companyData.tradingName || "Bageshwari Tractors",
              contactPerson: companyData.contactPerson || "Managing Director",
              email: companyData.email || "info@bageshwari.com.np",
              phone: companyData.phone || "+977-81-520123",
              country: companyData.country || "Nepal",
              city: companyData.city || "Nepalgunj",
              district: companyData.district || "Banke",
              address: companyData.address || "Nepalgunj, Banke",
              panNumber: companyData.panNumber || "302918239",
              vatNumber: companyData.vatNumber || "302918239",
              registrationNumber: companyData.registrationNumber || "29384/078/079",
              defaultVatPercent: new Prisma.Decimal(companyData.defaultVatPercent ?? 13.0),
              pricesIncludeVat: companyData.pricesIncludeVat ?? false,
              bankName: companyData.bankName || "NIC ASIA Bank Ltd.",
              bankAccountName: companyData.bankAccountName || "Bageshwari Tractors",
              bankAccountNumber: companyData.bankAccountNumber || "0194291823901928",
              bankBranch: companyData.bankBranch || "Nepalgunj Main Branch",
              bankSwiftCode: companyData.bankSwiftCode || "NICA-NP",
              socialLinksJson: JSON.stringify(mergedMeta),
            },
          });
        } catch (createErr) {
          console.warn("Prisma companyProfile.create failed, using raw SQL fallback:", createErr);
          await tx.$executeRawUnsafe(
            `INSERT INTO CompanyProfile (
              id, sellerId, companyName, tradingName, contactPerson, email, phone, website,
              country, province, district, city, address, panNumber, vatNumber, registrationNumber,
              defaultVatPercent, pricesIncludeVat, bankName, bankAccountName, bankAccountNumber,
              bankBranch, bankSwiftCode, socialLinksJson, createdAt, updatedAt
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
            ON DUPLICATE KEY UPDATE
              companyName = VALUES(companyName),
              tradingName = VALUES(tradingName),
              phone = VALUES(phone),
              email = VALUES(email),
              socialLinksJson = VALUES(socialLinksJson),
              updatedAt = NOW()`,
            "bageshwari-tractors",
            resolvedSellerId,
            companyData.companyName || "Bageshwari Tractors",
            companyData.tradingName || "Bageshwari Tractors",
            companyData.contactPerson || "Managing Director",
            companyData.email || "info@bageshwari.com.np",
            companyData.phone || "+977-81-520123",
            companyData.website || null,
            companyData.country || "Nepal",
            companyData.province || null,
            companyData.district || "Banke",
            companyData.city || "Nepalgunj",
            companyData.address || "Nepalgunj, Banke",
            companyData.panNumber || "302918239",
            companyData.vatNumber || "302918239",
            companyData.registrationNumber || "29384/078/079",
            companyData.defaultVatPercent ?? 13.0,
            companyData.pricesIncludeVat ? 1 : 0,
            companyData.bankName || "NIC ASIA Bank Ltd.",
            companyData.bankAccountName || "Bageshwari Tractors",
            companyData.bankAccountNumber || "0194291823901928",
            companyData.bankBranch || "Nepalgunj Main Branch",
            companyData.bankSwiftCode || "NICA-NP",
            JSON.stringify(mergedMeta)
          );
        }
      }

      // 3. Update Category-Based VAT Overrides
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
    console.error("Settings update critical error:", error);
    const message = error instanceof Error ? error.message : "Failed to update settings.";
    return apiError("SETTINGS_UPDATE_FAILED", message, 500);
  }
}
