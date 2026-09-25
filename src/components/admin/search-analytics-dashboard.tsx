"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Search,
  TrendingUp,
  BarChart3,
  Calendar,
  RefreshCw,
  AlertCircle,
  ExternalLink,
  Flame,
  HelpCircle,
  Clock,
  Layers,
  Sparkles,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-md bg-slate-200 dark:bg-slate-800", className)} />;
}

interface TopSearchItem {
  query: string;
  normalizedQuery: string;
  count: number;
  lastSearchedAt: string;
  avgResults: number;
  sourceBreakdown: Record<string, number>;
}

interface TrendPoint {
  date: string;
  count: number;
}

interface SearchLogItem {
  id: string;
  query: string;
  userName?: string | null;
  userEmail?: string | null;
  source: string;
  resultCount: number;
  createdAt: string;
}

interface SearchAnalyticsData {
  timeframe: string;
  summary: {
    totalSearches: number;
    uniqueQueries: number;
    topQuery: string | null;
    zeroResultCount: number;
  };
  topSearches: TopSearchItem[];
  trendChart: TrendPoint[];
  recentLogs: SearchLogItem[];
}

export function SearchAnalyticsDashboard({ sellerSlug }: { sellerSlug: string }) {
  const [timeframe, setTimeframe] = useState<"today" | "7d" | "30d" | "all">("7d");
  const [data, setData] = useState<SearchAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async (selectedTimeframe = timeframe) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/search-analytics?timeframe=${selectedTimeframe}`);
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json?.message || "Failed to load search analytics");
      }
      setData(json.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error loading data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(timeframe);
  }, [timeframe]);

  const maxTrendCount = data?.trendChart.reduce((max, p) => Math.max(max, p.count), 0) || 1;
  const maxSearchCount = data?.topSearches[0]?.count || 1;

  return (
    <div className="space-y-6">
      {/* Top Header & Range Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-red-600 uppercase tracking-widest">
            <Flame className="h-4 w-4" /> Market Demand Intelligence
          </div>
          <h1 className="text-2xl font-black text-[#0b2d55]">Search History & Analytics</h1>
          <p className="text-xs text-slate-500 mt-1">
            Real-time tracking of top searched products, dealer keywords, search frequencies, and trends.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1 shadow-2xs">
            {(["today", "7d", "30d", "all"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTimeframe(t)}
                className={`px-3 py-1 text-xs font-bold rounded-md transition ${
                  timeframe === t
                    ? "bg-[#0b2d55] text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {t === "today" ? "Today" : t === "7d" ? "7 Days" : t === "30d" ? "30 Days" : "All Time"}
              </button>
            ))}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchData()}
            disabled={loading}
            className="h-8 text-xs font-bold gap-1.5"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl border border-red-200 bg-red-50 text-red-700 text-xs flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="shadow-xs border-slate-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
              <span>Total Searches</span>
              <Search className="h-4 w-4 text-blue-500" />
            </div>
            <div className="mt-2 text-2xl font-black text-[#0b2d55]">
              {loading ? <Skeleton className="h-8 w-20" /> : data?.summary.totalSearches.toLocaleString() || "0"}
            </div>
            <div className="mt-1 text-[11px] text-slate-400">Total catalogue search events</div>
          </CardContent>
        </Card>

        <Card className="shadow-xs border-slate-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
              <span>Unique Keywords</span>
              <Layers className="h-4 w-4 text-purple-500" />
            </div>
            <div className="mt-2 text-2xl font-black text-[#0b2d55]">
              {loading ? <Skeleton className="h-8 w-20" /> : data?.summary.uniqueQueries.toLocaleString() || "0"}
            </div>
            <div className="mt-1 text-[11px] text-slate-400">Distinct products & SKUs queried</div>
          </CardContent>
        </Card>

        <Card className="shadow-xs border-slate-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
              <span>Top Searched Item</span>
              <Flame className="h-4 w-4 text-red-500" />
            </div>
            <div className="mt-2 text-xl font-black text-red-600 truncate" title={data?.summary.topQuery || "None"}>
              {loading ? <Skeleton className="h-8 w-24" /> : data?.summary.topQuery || "No searches yet"}
            </div>
            <div className="mt-1 text-[11px] text-slate-400">Highest search frequency query</div>
          </CardContent>
        </Card>

        <Card className="shadow-xs border-slate-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
              <span>Zero Results Found</span>
              <HelpCircle className="h-4 w-4 text-amber-500" />
            </div>
            <div className="mt-2 text-2xl font-black text-amber-600">
              {loading ? <Skeleton className="h-8 w-16" /> : data?.summary.zeroResultCount || "0"}
            </div>
            <div className="mt-1 text-[11px] text-slate-400">Unmet product demand / missing stock</div>
          </CardContent>
        </Card>
      </div>

      {/* Visual Chart Section: Top Search Frequency & Volume */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart 1: Top Search Keywords Frequency Bar Chart */}
        <Card className="lg:col-span-2 shadow-xs border-slate-200">
          <CardHeader className="pb-2 border-b">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold flex items-center gap-2 text-[#0b2d55]">
                  <BarChart3 className="h-4 w-4 text-red-600" /> Top Searched Products & Keywords Chart
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Relative demand and frequency of the most queried products
                </CardDescription>
              </div>
              <Badge variant="outline" className="text-[10px] font-bold">
                Frequency Graph
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-5">
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-7 w-full" />
                ))}
              </div>
            ) : !data?.topSearches.length ? (
              <div className="py-12 text-center text-xs text-slate-400">
                <Search className="h-8 w-8 mx-auto text-slate-300 mb-2" />
                No product searches recorded for this timeframe yet.
              </div>
            ) : (
              <div className="space-y-3">
                {data.topSearches.slice(0, 8).map((item, idx) => {
                  const percentage = Math.round((item.count / maxSearchCount) * 100);
                  const colors = [
                    "from-red-600 to-red-500",
                    "from-blue-600 to-blue-500",
                    "from-purple-600 to-purple-500",
                    "from-emerald-600 to-emerald-500",
                    "from-amber-600 to-amber-500",
                    "from-indigo-600 to-indigo-500",
                    "from-teal-600 to-teal-500",
                    "from-slate-600 to-slate-500",
                  ];
                  const barGradient = colors[idx % colors.length];

                  return (
                    <div key={item.normalizedQuery} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[11px] font-bold text-slate-400 w-5">
                            #{idx + 1}
                          </span>
                          <span className="font-bold text-slate-800 truncate max-w-[240px] sm:max-w-md">
                            &quot;{item.query}&quot;
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-slate-400">
                            Avg {item.avgResults} results
                          </span>
                          <span className="font-extrabold text-[#0b2d55] tabular-nums">
                            {item.count} searches
                          </span>
                        </div>
                      </div>
                      <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden flex">
                        <div
                          className={`h-full rounded-full bg-gradient-to-r ${barGradient} transition-all duration-500`}
                          style={{ width: `${Math.max(percentage, 4)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Chart 2: Daily Activity Trend */}
        <Card className="shadow-xs border-slate-200">
          <CardHeader className="pb-2 border-b">
            <CardTitle className="text-sm font-bold flex items-center gap-2 text-[#0b2d55]">
              <TrendingUp className="h-4 w-4 text-emerald-600" /> Search Activity Trend
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Daily query volume over time
            </CardDescription>
          </CardHeader>
          <CardContent className="p-5">
            {loading ? (
              <Skeleton className="h-48 w-full" />
            ) : !data?.trendChart.length ? (
              <div className="py-12 text-center text-xs text-slate-400">No trend data available</div>
            ) : (
              <div className="space-y-4">
                <div className="h-40 flex items-end justify-between gap-1 pt-6 px-1 border-b border-slate-200">
                  {data.trendChart.map((point) => {
                    const heightPercent = Math.max(Math.round((point.count / maxTrendCount) * 100), 6);
                    return (
                      <div key={point.date} className="flex-1 flex flex-col items-center gap-1 group relative">
                        {/* Tooltip on hover */}
                        <div className="absolute -top-7 bg-slate-900 text-white text-[9px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition pointer-events-none whitespace-nowrap z-10">
                          {point.date}: {point.count} searches
                        </div>
                        <div
                          className="w-full bg-blue-500 hover:bg-blue-600 rounded-t transition-all"
                          style={{ height: `${heightPercent}%` }}
                        />
                        <span className="text-[8px] text-slate-400 font-mono -rotate-45 origin-top-left mt-1 hidden sm:block">
                          {point.date.slice(5)}
                        </span>
                      </div>
                    );
                  })}
                </div>
                <div className="text-[11px] text-slate-500 text-center font-medium">
                  {timeframe === "today"
                    ? "Searches today"
                    : `Volume breakdown across last ${data.trendChart.length} days`}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Main Table: Top Search Records List */}
      <Card className="shadow-xs border-slate-200">
        <CardHeader className="pb-3 border-b">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <CardTitle className="text-sm font-bold flex items-center gap-2 text-[#0b2d55]">
                <Search className="h-4 w-4 text-primary" /> Top Searched Product Records
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Ranked table of all recorded search phrases, total hits, and catalog match rates
              </CardDescription>
            </div>
            <span className="text-xs font-bold text-slate-400">
              {data?.topSearches.length || 0} unique queries
            </span>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4 w-14">Rank</th>
                  <th className="py-3 px-4">Search Query Term</th>
                  <th className="py-3 px-4 text-center">Total Searches</th>
                  <th className="py-3 px-4 text-center">Avg Results Found</th>
                  <th className="py-3 px-4">Channels</th>
                  <th className="py-3 px-4">Last Searched</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  [1, 2, 3, 4, 5].map((i) => (
                    <tr key={i}>
                      <td colSpan={7} className="py-3 px-4">
                        <Skeleton className="h-5 w-full" />
                      </td>
                    </tr>
                  ))
                ) : !data?.topSearches.length ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      No search records logged yet. Searches performed in the dealer catalogue and storefront will automatically appear here.
                    </td>
                  </tr>
                ) : (
                  data.topSearches.map((item, idx) => (
                    <tr key={item.normalizedQuery} className="hover:bg-slate-50/80 transition">
                      <td className="py-3 px-4 font-mono font-bold text-slate-400">
                        {idx === 0 ? (
                          <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-black">
                            1
                          </span>
                        ) : idx === 1 ? (
                          <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-slate-200 text-slate-700 text-[10px] font-black">
                            2
                          </span>
                        ) : idx === 2 ? (
                          <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-amber-50 text-amber-700 text-[10px] font-black">
                            3
                          </span>
                        ) : (
                          `#${idx + 1}`
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-bold text-slate-900">&quot;{item.query}&quot;</span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <Badge className="bg-blue-50 text-blue-700 hover:bg-blue-50 font-bold border-blue-200">
                          {item.count} hits
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`font-semibold ${
                            item.avgResults === 0 ? "text-red-600 font-bold" : "text-slate-700"
                          }`}
                        >
                          {item.avgResults} {item.avgResults === 0 && "(0 matches)"}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex gap-1 flex-wrap">
                          {Object.keys(item.sourceBreakdown).map((src) => (
                            <span
                              key={src}
                              className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200"
                            >
                              {src === "DEALER_PORTAL"
                                ? "Dealer"
                                : src === "QUICK_ORDER"
                                ? "Quick Order"
                                : src === "STAFF_PORTAL"
                                ? "Staff"
                                : "Store"}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                        {new Date(item.lastSearchedAt).toLocaleString([], {
                          dateStyle: "short",
                          timeStyle: "short",
                        })}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Link
                          href={`/products?search=${encodeURIComponent(item.query)}`}
                          target="_blank"
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-red-600 hover:underline"
                        >
                          <span>Test Search</span>
                          <ExternalLink className="h-3 w-3" />
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Real-time Search Activity Stream */}
      <Card className="shadow-xs border-slate-200">
        <CardHeader className="pb-3 border-b">
          <CardTitle className="text-sm font-bold flex items-center gap-2 text-[#0b2d55]">
            <Clock className="h-4 w-4 text-blue-600" /> Recent Search Stream
          </CardTitle>
          <CardDescription className="text-xs text-slate-500">
            Chronological audit of recent search queries across all channels
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto max-h-80">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 sticky top-0">
                <tr>
                  <th className="py-2.5 px-4">Time</th>
                  <th className="py-2.5 px-4">Query Phrase</th>
                  <th className="py-2.5 px-4">User / Dealer</th>
                  <th className="py-2.5 px-4">Source</th>
                  <th className="py-2.5 px-4 text-right">Items Returned</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {!data?.recentLogs.length ? (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-slate-400">
                      No search logs recorded yet.
                    </td>
                  </tr>
                ) : (
                  data.recentLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/60">
                      <td className="py-2 px-4 text-slate-400 font-mono text-[11px]">
                        {new Date(log.createdAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                        })}
                      </td>
                      <td className="py-2 px-4 font-bold text-slate-900">&quot;{log.query}&quot;</td>
                      <td className="py-2 px-4 text-slate-600">
                        {log.userName || log.userEmail || "Anonymous / Public Visitor"}
                      </td>
                      <td className="py-2 px-4">
                        <Badge variant="outline" className="text-[9px] font-semibold">
                          {log.source}
                        </Badge>
                      </td>
                      <td className="py-2 px-4 text-right font-mono font-bold text-slate-700">
                        {log.resultCount}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
