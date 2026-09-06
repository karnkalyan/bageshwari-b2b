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
