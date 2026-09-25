import "server-only";
import { prisma } from "@/lib/db";

export interface RecordSearchInput {
  query: string;
  sellerId?: string | null;
  userId?: string | null;
  source?: "DEALER_PORTAL" | "PUBLIC_CATALOGUE" | "STAFF_PORTAL" | "QUICK_ORDER";
  resultCount?: number;
  ipAddress?: string | null;
}

export interface TopSearchItem {
  query: string;
  normalizedQuery: string;
  count: number;
  lastSearchedAt: Date;
  avgResults: number;
  sourceBreakdown: Record<string, number>;
}

export interface SearchTrendPoint {
  date: string;
  count: number;
}

export interface SearchLogItem {
  id: string;
  query: string;
  userName?: string | null;
  userEmail?: string | null;
  source: string;
  resultCount: number;
  createdAt: Date;
}

export interface SearchAnalyticsResult {
  timeframe: string;
  summary: {
    totalSearches: number;
    uniqueQueries: number;
    topQuery: string | null;
    zeroResultCount: number;
  };
  topSearches: TopSearchItem[];
  trendChart: SearchTrendPoint[];
  recentLogs: SearchLogItem[];
}

/**
 * Asynchronously logs a search query into the AuditLog table with action "PRODUCT_SEARCH".
 * Non-blocking so search response latency is unaffected.
 */
export async function recordSearchQuery(input: RecordSearchInput): Promise<void> {
  const trimmed = input.query.trim();
  if (trimmed.length < 2) return;

  const normalized = trimmed.toLowerCase();

  try {
    // If sellerId isn't provided, lookup default active seller
    let sellerId = input.sellerId;
    if (!sellerId) {
      const defaultSeller = await prisma.seller.findFirst({
        where: { status: "ACTIVE" },
        select: { id: true },
      });
      sellerId = defaultSeller?.id || null;
    }

    await prisma.auditLog.create({
      data: {
        action: "PRODUCT_SEARCH",
        entity: "ProductSearch",
        entityId: normalized.slice(0, 50),
        sellerId: sellerId || undefined,
        userId: input.userId || undefined,
        ipAddress: input.ipAddress || null,
        severity: "LOW",
        metadata: JSON.stringify({
          originalQuery: trimmed,
          normalizedQuery: normalized,
          source: input.source || "PUBLIC_CATALOGUE",
          resultCount: typeof input.resultCount === "number" ? input.resultCount : null,
          searchedAt: new Date().toISOString(),
        }),
      },
    });
  } catch (error) {
    // Silently continue so user search is never interrupted
    console.error("Non-critical search recording error:", error);
  }
}

/**
 * Aggregates search analytics across a given timeframe for admin display.
 */
export async function getSearchAnalytics(
  sellerId?: string | null,
  timeframe: "today" | "7d" | "30d" | "all" = "7d"
): Promise<SearchAnalyticsResult> {
  const now = new Date();
  let startDate: Date | undefined;

  if (timeframe === "today") {
    startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  } else if (timeframe === "7d") {
    startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  } else if (timeframe === "30d") {
    startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  }

  const whereClause: any = {
    action: "PRODUCT_SEARCH",
    entity: "ProductSearch",
    ...(startDate ? { createdAt: { gte: startDate } } : {}),
  };

  if (sellerId) {
    whereClause.OR = [{ sellerId }, { sellerId: null }];
  }

  const logs = await prisma.auditLog.findMany({
    where: whereClause,
    orderBy: { createdAt: "desc" },
    take: 1000,
    include: {
      user: {
        select: {
          name: true,
          email: true,
        },
      },
    },
  });

  const queryMap = new Map<
    string,
    {
      query: string;
      normalized: string;
      count: number;
      lastSearchedAt: Date;
      totalResults: number;
      sources: Record<string, number>;
    }
  >();

  const dateMap = new Map<string, number>();
  let zeroResultCount = 0;

  for (const log of logs) {
    let meta: any = {};
    if (log.metadata) {
      try {
        meta = JSON.parse(log.metadata);
      } catch {}
    }

    const originalQuery = meta.originalQuery || log.entityId || "search";
    const normalized = (meta.normalizedQuery || originalQuery).toLowerCase().trim();
    const resultCount = typeof meta.resultCount === "number" ? meta.resultCount : 1;
    const source = meta.source || "PUBLIC_CATALOGUE";

    if (resultCount === 0) {
      zeroResultCount++;
    }

    // Top query aggregation
    const existing = queryMap.get(normalized);
    if (existing) {
      existing.count++;
      existing.totalResults += resultCount;
      if (log.createdAt > existing.lastSearchedAt) {
        existing.lastSearchedAt = log.createdAt;
      }
      existing.sources[source] = (existing.sources[source] || 0) + 1;
    } else {
      queryMap.set(normalized, {
        query: originalQuery,
        normalized,
        count: 1,
        lastSearchedAt: log.createdAt,
        totalResults: resultCount,
        sources: { [source]: 1 },
      });
    }

    // Trend chart aggregation (YYYY-MM-DD)
    const dateStr = log.createdAt.toISOString().slice(0, 10);
    dateMap.set(dateStr, (dateMap.get(dateStr) || 0) + 1);
  }

  // Sorted list of top searched queries
  const topSearches: TopSearchItem[] = Array.from(queryMap.values())
    .map((item) => ({
      query: item.query,
      normalizedQuery: item.normalized,
      count: item.count,
      lastSearchedAt: item.lastSearchedAt,
      avgResults: Math.round(item.totalResults / item.count),
      sourceBreakdown: item.sources,
    }))
    .sort((a, b) => b.count - a.count);

  // Generate trend line (last 7 or 14 days sorted ascending)
  const days = timeframe === "today" ? 1 : timeframe === "30d" ? 30 : 7;
  const trendChart: SearchTrendPoint[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const key = d.toISOString().slice(0, 10);
    trendChart.push({
      date: key,
      count: dateMap.get(key) || 0,
    });
  }

  // Recent logs (take up to 50 latest)
  const recentLogs: SearchLogItem[] = logs.slice(0, 50).map((log) => {
    let meta: any = {};
    if (log.metadata) {
      try {
        meta = JSON.parse(log.metadata);
      } catch {}
    }
    return {
      id: log.id,
      query: meta.originalQuery || log.entityId || "search",
      userName: log.user?.name || null,
      userEmail: log.user?.email || null,
      source: meta.source || "PUBLIC_CATALOGUE",
      resultCount: typeof meta.resultCount === "number" ? meta.resultCount : 0,
      createdAt: log.createdAt,
    };
  });

  return {
    timeframe,
    summary: {
      totalSearches: logs.length,
      uniqueQueries: queryMap.size,
      topQuery: topSearches[0]?.query || null,
      zeroResultCount,
    },
    topSearches,
    trendChart,
    recentLogs,
  };
}
