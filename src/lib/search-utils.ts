import { Prisma } from "@prisma/client";

/**
 * Builds a flexible multi-token LIKE / contains search filter for Prisma Product queries.
 * Supports tokenized matching (e.g. searching "bearing 11949 10" matches "11949/10 ARB BEARING")
 * across product name, sku, description, brand name, category name, and variants.
 */
export function buildProductSearchFilter(query?: string): Prisma.ProductWhereInput | undefined {
  if (!query) return undefined;
  const raw = query.trim();
  if (!raw) return undefined;

  // Split by whitespace and common punctuation (comma, slash, dash, underscore)
  const tokens = Array.from(
    new Set(
      raw
        .split(/[\s,]+/)
        .map((t) => t.trim())
        .filter((t) => t.length > 0)
    )
  );

  if (tokens.length === 0) return undefined;

  // Helper for a single token condition
  const makeTokenCondition = (token: string): Prisma.ProductWhereInput => {
    // If token has slashes or dashes like 11949/10, also allow matching subparts
    const subParts = token.split(/[/\\-_]+/).filter((p) => p.length > 0 && p !== token);

    const tokenFields: Prisma.ProductWhereInput[] = [
      { name: { contains: token } },
      { sku: { contains: token } },
      { description: { contains: token } },
      { brand: { name: { contains: token } } },
      { category: { name: { contains: token } } },
      {
        variants: {
          some: {
            OR: [
              { name: { contains: token } },
              { sku: { contains: token } },
              { barcode: { contains: token } },
            ],
          },
        },
      },
    ];

    if (subParts.length > 1) {
      // Also match if subparts are present
      tokenFields.push({
        AND: subParts.map((part) => ({
          OR: [
            { name: { contains: part } },
            { sku: { contains: part } },
          ],
        })),
      });
    }

    return { OR: tokenFields };
  };

  // If query is a single token, return condition for it
  if (tokens.length === 1) {
    return makeTokenCondition(tokens[0]);
  }

  // Exact phrase match condition
  const exactPhraseCondition: Prisma.ProductWhereInput = {
    OR: [
      { name: { contains: raw } },
      { sku: { contains: raw } },
      { description: { contains: raw } },
    ],
  };

  // All tokens must match condition (AND across tokens)
  const allTokensCondition: Prisma.ProductWhereInput = {
    AND: tokens.map((token) => makeTokenCondition(token)),
  };

  return {
    OR: [exactPhraseCondition, allTokensCondition],
  };
}

/**
 * Ranks an array of product items based on multi-factor search query relevance.
 *
 * Prioritizes:
 * 1. Exact full query phrase match in name or SKU (+50,000 / +35,000).
 * 2. Prefix match (name starts with query: +20,000).
 * 3. Substring match (name contains exact query phrase: +12,000).
 * 4. Exact measurement & dimension match (e.g. searching "8 mm" gives a huge +15,000 boost
 *    to items specifically containing "8 mm" or "8mm" in title, prioritizing them over "10 mm", "12 mm", etc.).
 * 5. Standalone number token match (e.g. searching "8" strictly matches "\b8\b" +8,000
 *    over incidental digits inside serial codes like "03348").
 * 6. Whole-word token boundary matching (+2,000 per whole word match) vs partial substring (+200).
 * 7. All query tokens matched as distinct words in product name (+10,000).
 */
export function rankProductsBySearchRelevance<
  T extends {
    name: string;
    sku: string;
    category?: { name?: string | null } | null;
    brand?: { name?: string | null } | null;
  }
>(items: T[], query?: string): T[] {
  if (!query || !query.trim()) return items;

  const raw = query.trim().toLowerCase();
  const tokens = Array.from(
    new Set(
      raw
        .split(/[\s,]+/)
        .map((t) => t.trim().toLowerCase())
        .filter((t) => t.length > 0)
    )
  );

  if (tokens.length === 0) return items;

  // Extract explicit dimensions/measurements from query like "8 mm", "8mm", "19mm", "2lb", etc.
  const queryDimensions = Array.from(
    raw.matchAll(/\b(\d+(?:\.\d+)?)\s*(mm|inch|cm|m|v|w|kg|g|lb|tsp|sae)?\b/gi)
  ).map((m) => ({
    full: m[0].trim(),
    num: m[1],
    unit: m[2] || "",
  }));

  const escapeRegex = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  const scoreItem = (item: T): number => {
    const name = (item.name || "").toLowerCase();
    const sku = (item.sku || "").toLowerCase();
    const cat = (item.category?.name || "").toLowerCase();
    const brand = (item.brand?.name || "").toLowerCase();

    let score = 0;

    // 1. Exact string matches
    if (name === raw) score += 50000;
    else if (name.startsWith(raw)) score += 20000;
    else if (name.includes(raw)) score += 12000;

    if (sku === raw) score += 35000;
    else if (sku.includes(raw)) score += 8000;

    // Normalized phrase match (collapsing multiple spaces)
    const normRaw = raw.replace(/\s+/g, " ");
    const normName = name.replace(/\s+/g, " ");
    if (normName.includes(normRaw)) score += 6000;

    // 2. Specific dimension / measurement match (e.g. "8 mm" or "8mm")
    for (const dim of queryDimensions) {
      if (dim.unit) {
        // e.g. "8 mm" or "8mm"
        const dimPattern = new RegExp(`\\b${escapeRegex(dim.num)}\\s*${escapeRegex(dim.unit)}\\b`, "i");
        if (dimPattern.test(name)) {
          score += 15000; // Big boost for matching the exact dimension in name
        } else if (dimPattern.test(sku)) {
          score += 7000;
        }
      } else {
        // Standalone number without unit e.g. "8"
        const numPattern = new RegExp(`\\b${escapeRegex(dim.num)}\\b`);
        if (numPattern.test(name)) {
          score += 8000;
        } else if (numPattern.test(sku)) {
          score += 4000;
        }
      }
    }

    // 3. Token-level matching
    let allTokensAsWholeWords = true;
    for (const token of tokens) {
      const isNumber = /^\d+$/.test(token);
      const wordRegex = new RegExp(`\\b${escapeRegex(token)}\\b`, "i");

      if (wordRegex.test(name)) {
        score += isNumber ? 3000 : 2000;
      } else if (name.includes(token)) {
        score += isNumber ? 200 : 400;
        allTokensAsWholeWords = false;
      } else {
        allTokensAsWholeWords = false;
      }

      if (wordRegex.test(sku)) {
        score += 1500;
      } else if (sku.includes(token)) {
        score += 200;
      }

      if (brand && wordRegex.test(brand)) {
        score += 500;
      }
      if (cat && wordRegex.test(cat)) {
        score += 300;
      }
    }

    if (allTokensAsWholeWords) {
      score += 10000;
    }

    return score;
  };

  return [...items].sort((a, b) => scoreItem(b) - scoreItem(a));
}

/**
 * Builds a flexible multi-token LIKE / contains search filter for Prisma Order queries.
 * Supports tokenized matching across orderNumber, dealer tradingName, and dealer code.
 */
export function buildOrderSearchFilter(query?: string): Prisma.OrderWhereInput | undefined {
  if (!query) return undefined;
  const raw = query.trim();
  if (!raw) return undefined;

  const tokens = Array.from(
    new Set(
      raw
        .split(/[\s,]+/)
        .map((t) => t.trim())
        .filter((t) => t.length > 0)
    )
  );

  if (tokens.length === 0) return undefined;

  const makeTokenCondition = (token: string): Prisma.OrderWhereInput => ({
    OR: [
      { orderNumber: { contains: token } },
      { dealer: { tradingName: { contains: token } } },
      { dealer: { code: { contains: token } } },
    ],
  });

  if (tokens.length === 1) {
    return makeTokenCondition(tokens[0]);
  }

  const exactPhraseCondition: Prisma.OrderWhereInput = {
    OR: [
      { orderNumber: { contains: raw } },
      { dealer: { tradingName: { contains: raw } } },
      { dealer: { code: { contains: raw } } },
    ],
  };

  const allTokensCondition: Prisma.OrderWhereInput = {
    AND: tokens.map((token) => makeTokenCondition(token)),
  };

  return {
    OR: [exactPhraseCondition, allTokensCondition],
  };
}
