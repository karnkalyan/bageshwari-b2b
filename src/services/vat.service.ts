import "server-only";

import { prisma } from "@/lib/db";

export interface VatResolutionResult {
  vatPercent: number;
  source: "PRODUCT" | "CATEGORY" | "GLOBAL_SETTING";
  pricesIncludeVat: boolean;
}

export function normalizeVatRate(rate: number | null | undefined, defaultRate = 13.0): number {
  if (rate === null || rate === undefined || isNaN(Number(rate))) return defaultRate;
  const num = Number(rate);
  if (num > 0 && num <= 1.0) {
    return Number((num * 100).toFixed(2));
  }
  return num;
}

/**
 * 3-Tier Hierarchical VAT Resolution:
 * 1. Product-level override (Product.taxPercent)
 * 2. Category-level override (ProductCategory.taxPercent)
 * 3. Global Admin Company Setting (CompanyProfile.defaultVatPercent, default: 13.00%)
 */
export async function getCompanyVatSetting(sellerId?: string): Promise<{
  defaultVatPercent: number;
  pricesIncludeVat: boolean;
  companyName: string;
  tradingName: string;
  panNumber: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  district: string | null;
}> {
  try {
    let profile = sellerId
      ? await prisma.companyProfile.findUnique({ where: { sellerId } }).catch(() => null)
      : null;

    if (!profile) {
      profile = await prisma.companyProfile.findUnique({
        where: { id: "bageshwari-tractors" },
      }).catch(() => null);
    }

    if (!profile) {
      profile = await prisma.companyProfile.findFirst().catch(() => null);
    }

    if (profile) {
      return {
        defaultVatPercent: normalizeVatRate(Number(profile.defaultVatPercent), 13.0),
        pricesIncludeVat: Boolean(profile.pricesIncludeVat),
        companyName: profile.companyName || "Bageshwari Tractors Pvt. Ltd.",
        tradingName: profile.tradingName || "Bageshwari Tractor",
        panNumber: profile.panNumber || profile.vatNumber || null,
        phone: profile.phone || "+977-81-520123",
        address: profile.address || "Nepalgunj, Banke",
        city: profile.city || "Nepalgunj",
        district: profile.district || "Banke",
      };
    }
  } catch {}
  return {
    defaultVatPercent: 13.0,
    pricesIncludeVat: false,
    companyName: "Bageshwari Tractors Pvt. Ltd.",
    tradingName: "Bageshwari Tractor",
    panNumber: null,
    phone: "+977-81-520123",
    address: "Nepalgunj, Banke",
    city: "Nepalgunj",
    district: "Banke",
  };
}

export function calculateDealerPriceWithVat(basePrice: number, vatPercent: number) {
  const normalizedVat = normalizeVatRate(vatPercent, 13.0);
  const vatAmount = Number((basePrice * (normalizedVat / 100)).toFixed(2));
  const dealerPrice = Number((basePrice + vatAmount).toFixed(2));
  return {
    basePrice,
    vatPercent: normalizedVat,
    vatAmount,
    dealerPrice,
    formulaText: `${basePrice} + ${normalizedVat}% = ${dealerPrice}`,
  };
}
export async function resolveProductVat(
  sellerId: string,
  productId: string
): Promise<VatResolutionResult> {
  let productTax: number | null = null;
  let categoryTax: number | null = null;
  let globalVat = 13.0;
  let pricesIncludeVat = false;

  try {
    const productRows = await prisma.$queryRaw<any[]>`
      SELECT p.taxPercent as productTax, c.taxPercent as categoryTax
      FROM Product p
      LEFT JOIN ProductCategory c ON p.categoryId = c.id
      WHERE p.id = ${productId}
      LIMIT 1
    `;
    if (productRows && productRows.length > 0) {
      if (productRows[0].productTax !== null && productRows[0].productTax !== undefined) {
        productTax = normalizeVatRate(productRows[0].productTax);
      }
      if (productRows[0].categoryTax !== null && productRows[0].categoryTax !== undefined) {
        categoryTax = normalizeVatRate(productRows[0].categoryTax);
      }
    }
  } catch {
    // fallback if columns don't exist yet
  }

  try {
    const companyRows = await prisma.$queryRaw<any[]>`
      SELECT defaultVatPercent, pricesIncludeVat
      FROM CompanyProfile
      WHERE id = 'bageshwari-tractors'
      LIMIT 1
    `;
    if (companyRows && companyRows.length > 0) {
      if (companyRows[0].defaultVatPercent !== null && companyRows[0].defaultVatPercent !== undefined) {
        globalVat = normalizeVatRate(companyRows[0].defaultVatPercent, 13.0);
      }
      pricesIncludeVat = Boolean(companyRows[0].pricesIncludeVat);
    }
  } catch {
    // fallback if columns don't exist yet
  }

  // Tier 1: Product-level override
  if (productTax !== null) {
    return {
      vatPercent: normalizeVatRate(productTax, 13.0),
      source: "PRODUCT",
      pricesIncludeVat,
    };
  }

  // Tier 2: Category-level override
  if (categoryTax !== null) {
    return {
      vatPercent: normalizeVatRate(categoryTax, 13.0),
      source: "CATEGORY",
      pricesIncludeVat,
    };
  }

  // Tier 3: Global Admin setting
  return {
    vatPercent: normalizeVatRate(globalVat, 13.0),
    source: "GLOBAL_SETTING",
    pricesIncludeVat,
  };
}

/**
 * Calculates line amounts with VAT breakdown
 */
export function calculateVatBreakdown(
  basePrice: number,
  quantity: number,
  vatPercent: number,
  pricesIncludeVat: boolean = false
) {
  let netUnitPrice: number;
  let vatUnitPrice: number;
  let grossUnitPrice: number;

  if (pricesIncludeVat) {
    // Base price already contains VAT
    grossUnitPrice = basePrice;
    netUnitPrice = basePrice / (1 + vatPercent / 100);
    vatUnitPrice = grossUnitPrice - netUnitPrice;
  } else {
    // Base price is exclusive of VAT
    netUnitPrice = basePrice;
    vatUnitPrice = basePrice * (vatPercent / 100);
    grossUnitPrice = basePrice + vatUnitPrice;
  }

  const subtotal = netUnitPrice * quantity;
  const vatTotal = vatUnitPrice * quantity;
  const grandTotal = grossUnitPrice * quantity;

  return {
    vatPercent,
    netUnitPrice: Number(netUnitPrice.toFixed(2)),
    vatUnitPrice: Number(vatUnitPrice.toFixed(2)),
    grossUnitPrice: Number(grossUnitPrice.toFixed(2)),
    subtotal: Number(subtotal.toFixed(2)),
    vatTotal: Number(vatTotal.toFixed(2)),
    grandTotal: Number(grandTotal.toFixed(2)),
  };
}
